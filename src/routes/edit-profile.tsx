import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowLeft, Landmark, CheckCircle2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { listNigerianBanks, saveBankAccount } from "@/lib/bank.functions";

export const Route = createFileRoute("/edit-profile")({ component: EditProfile });

function EditProfile() {
  const { user, profile, refresh, loading } = useAuth();
  const navigate = useNavigate();
  const [f, setF] = useState({ full_name: "", phone: "", delivery_address: "", state: "", lga: "" });
  const [busy, setBusy] = useState(false);
  const isFarmer = profile?.account_type === "farmer";
  const [bankInfo, setBankInfo] = useState<{ account_name?: string | null; bank_name?: string | null; account_number?: string | null }>({});
  const [banks, setBanks] = useState<Array<{ name: string; code: string }>>([]);
  const [bank, setBank] = useState({ bank_code: "", account_number: "" });
  const [bankBusy, setBankBusy] = useState(false);
  const fetchBanks = useServerFn(listNigerianBanks);
  const saveBank = useServerFn(saveBankAccount);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (profile) {
      setF({
        full_name: profile.full_name ?? "",
        phone: profile.phone ?? "",
        delivery_address: profile.delivery_address ?? "",
        state: profile.state ?? "",
        lga: profile.lga ?? "",
      });
    }
  }, [profile]);

  // Load current bank info + bank list for farmers
  useEffect(() => {
    if (!isFarmer || !user) return;
    supabase.from("users").select("bank_name, account_number, account_name, bank_code").eq("id", user.id).maybeSingle()
      .then(({ data }) => {
        if (data) {
          setBankInfo(data);
          if (data.bank_code) setBank({ bank_code: data.bank_code, account_number: data.account_number ?? "" });
        }
      });
    fetchBanks().then(setBanks).catch(() => {});
  }, [isFarmer, user, fetchBanks]);

  const submitBank = async () => {
    if (!bank.bank_code) return toast.error("Pick your bank");
    if (!/^\d{10}$/.test(bank.account_number)) return toast.error("Account number must be 10 digits");
    const bank_name = banks.find((b) => b.code === bank.bank_code)?.name ?? "";
    setBankBusy(true);
    try {
      const r = await saveBank({ data: { bank_code: bank.bank_code, bank_name, account_number: bank.account_number } });
      setBankInfo({ account_name: r.account_name, bank_name, account_number: bank.account_number });
      toast.success(`Saved: ${r.account_name}`);
    } catch (e: any) {
      toast.error(e?.message ?? "Could not save bank");
    } finally {
      setBankBusy(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    const { error } = await supabase.from("users").update(f).eq("id", user.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    await refresh();
    toast.success("Profile updated");
    navigate({ to: "/profile" });
  };

  return (
    <div className="min-h-screen bg-background max-w-md mx-auto pb-10">
      <div className="p-4 flex items-center gap-3 border-b border-border">
        <button onClick={() => history.back()}><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="font-bold">Edit Profile</h1>
      </div>
      <form onSubmit={submit} className="p-4 space-y-3">
        <div><Label>Full name</Label><Input required value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} /></div>
        <div><Label>Phone number</Label><Input type="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} placeholder="e.g. 080..." /></div>
        <div><Label>Delivery address</Label><Textarea value={f.delivery_address} onChange={(e) => setF({ ...f, delivery_address: e.target.value })} placeholder="House no, street, area" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>State</Label><Input value={f.state} onChange={(e) => setF({ ...f, state: e.target.value })} placeholder="e.g. Oyo" /></div>
          <div><Label>LGA</Label><Input value={f.lga} onChange={(e) => setF({ ...f, lga: e.target.value })} placeholder="e.g. Ibadan North" /></div>
        </div>
        <Button type="submit" size="lg" className="w-full" disabled={busy}>{busy ? "Saving..." : "Save changes"}</Button>
      </form>
      {isFarmer && (
        <div className="p-4 space-y-3 border-t border-border">
          <div className="flex items-center gap-2">
            <Landmark className="w-5 h-5 text-primary" />
            <h2 className="font-bold">Payout bank account</h2>
          </div>
          <p className="text-xs text-muted-foreground">Buyer payments are released to this account when an order completes. ChopStack keeps a 4% commission.</p>
          {bankInfo.account_name && (
            <div className="bg-green-500/10 border border-green-500/40 rounded-xl p-3 text-sm flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
              <div>
                <p className="font-semibold">{bankInfo.account_name}</p>
                <p className="text-xs text-muted-foreground">{bankInfo.bank_name} • {bankInfo.account_number}</p>
              </div>
            </div>
          )}
          <div>
            <Label>Bank</Label>
            <select className="w-full bg-input border border-border rounded-md h-10 px-3 mt-1" value={bank.bank_code} onChange={(e) => setBank({ ...bank, bank_code: e.target.value })}>
              <option value="">{banks.length ? "Select your bank" : "Loading banks..."}</option>
              {banks.map((b) => <option key={b.code} value={b.code}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <Label>Account number</Label>
            <Input inputMode="numeric" maxLength={10} placeholder="10-digit NUBAN" value={bank.account_number} onChange={(e) => setBank({ ...bank, account_number: e.target.value.replace(/\D/g, "").slice(0,10) })} />
          </div>
          <Button type="button" className="w-full" onClick={submitBank} disabled={bankBusy}>
            {bankBusy ? "Verifying..." : bankInfo.account_name ? "Update bank account" : "Save bank account"}
          </Button>
        </div>
      )}
    </div>
  );
}