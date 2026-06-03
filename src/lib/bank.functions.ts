import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const PS = "https://api.paystack.co";

function secret(): string {
  const s = process.env.PAYSTACK_SECRET_KEY;
  if (!s) throw new Error("Payment provider not configured");
  return s;
}

/** Returns the list of Nigerian banks (name + code) for the dropdown. */
export const listNigerianBanks = createServerFn({ method: "GET" }).handler(async () => {
  const res = await fetch(`${PS}/bank?country=nigeria&perPage=200`, {
    headers: { Authorization: `Bearer ${secret()}` },
  });
  if (!res.ok) throw new Error(`Bank list failed (${res.status})`);
  const body = (await res.json()) as { status: boolean; data: Array<{ name: string; code: string }> };
  if (!body.status) throw new Error("Could not load banks");
  return body.data
    .map((b) => ({ name: b.name, code: b.code }))
    .sort((a, b) => a.name.localeCompare(b.name));
});

/** Verify the account, create a Paystack transfer recipient, save to profile. */
export const saveBankAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        bank_code: z.string().min(3).max(10),
        bank_name: z.string().min(2).max(100),
        account_number: z
          .string()
          .regex(/^\d{10}$/, "Account number must be 10 digits"),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const sk = secret();

    // 1. Resolve account name
    const resolveRes = await fetch(
      `${PS}/bank/resolve?account_number=${encodeURIComponent(data.account_number)}&bank_code=${encodeURIComponent(data.bank_code)}`,
      { headers: { Authorization: `Bearer ${sk}` } },
    );
    const resolveBody = (await resolveRes.json()) as {
      status: boolean;
      message?: string;
      data?: { account_name: string };
    };
    if (!resolveRes.ok || !resolveBody.status || !resolveBody.data) {
      throw new Error(resolveBody.message || "Could not verify account");
    }
    const account_name = resolveBody.data.account_name;

    // 2. Create transfer recipient
    const recRes = await fetch(`${PS}/transferrecipient`, {
      method: "POST",
      headers: { Authorization: `Bearer ${sk}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "nuban",
        name: account_name,
        account_number: data.account_number,
        bank_code: data.bank_code,
        currency: "NGN",
      }),
    });
    const recBody = (await recRes.json()) as {
      status: boolean;
      message?: string;
      data?: { recipient_code: string };
    };
    if (!recRes.ok || !recBody.status || !recBody.data) {
      throw new Error(recBody.message || "Could not save payout details");
    }

    // 3. Save on user profile (RLS allows users to update their own row)
    const { error } = await supabase
      .from("users")
      .update({
        bank_code: data.bank_code,
        bank_name: data.bank_name,
        account_number: data.account_number,
        account_name,
        paystack_recipient_code: recBody.data.recipient_code,
      })
      .eq("id", userId);
    if (error) throw new Error(error.message);

    return { account_name };
  });