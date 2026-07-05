import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { verifyPaystackPayment } from "@/lib/paystack.functions";
import { clearCart } from "@/lib/cart";
import { MobileShell } from "@/components/app/BottomNav";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

const Search = z.object({
  reference: z.string().optional(),
  trxref: z.string().optional(),
});

export const Route = createFileRoute("/checkout/callback")({
  validateSearch: (s) => Search.parse(s),
  component: Callback,
});

function Callback() {
  const nav = useNavigate();
  const search = useSearch({ from: "/checkout/callback" });
  const [msg, setMsg] = useState("Confirming payment…");
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    const reference = search.reference || search.trxref;
    if (!reference) {
      toast.error("Missing payment reference");
      nav({ to: "/cart" });
      return;
    }
    (async () => {
      try {
        const res = await verifyPaystackPayment({ data: { reference } });
        if (res.paid && res.orderIds.length > 0) {
          clearCart();
          toast.success("Payment received. Order confirmed.");
          nav({ to: "/orders/$id", params: { id: res.orderIds[0] } });
        } else {
          setMsg("Payment not completed.");
          toast.error("Payment not completed");
          setTimeout(() => nav({ to: "/cart" }), 1500);
        }
      } catch (e) {
        setMsg((e as Error).message);
        setTimeout(() => nav({ to: "/cart" }), 1800);
      }
    })();
  }, [nav, search]);

  return (
    <MobileShell>
      <div className="min-h-[60vh] grid place-items-center p-6 text-center">
        <div>
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary mb-3" />
          <p className="text-sm text-muted-foreground">{msg}</p>
        </div>
      </div>
    </MobileShell>
  );
}