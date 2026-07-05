import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import logo from "@/assets/logo.png";

export const Route = createFileRoute("/vendor/signup")({ component: VendorSignup });

function VendorSignup() {
  const nav = useNavigate();
  const [f, setF] = useState({ name: "", email: "", phone: "", password: "", bank_name: "", account_number: "", account_name: "" });
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (f.password.length < 6) return toast.error("Password too short");
    if (!/^\d{10}$/.test(f.account_number)) return toast.error("Enter a valid 10-digit account number");
    setBusy(true);
    try {
      // If someone is already signed in, sign them out first — vendor accounts
      // must own their own auth user.
      const { data: cur } = await supabase.auth.getUser();
      if (cur.user) await supabase.auth.signOut();

      const { data, error } = await supabase.auth.signUp({
        email: f.email,
        password: f.password,
        options: { emailRedirectTo: `${window.location.origin}/vendor`, data: { name: f.name } },
      });
      if (error) throw new Error(error.message);
      if (!data.user) throw new Error("Sign up failed. Try again.");

      // If email confirmation is required, no session yet — instruct user.
      if (!data.session) {
        toast.success("Account created. Check your email to confirm, then log in.");
        nav({ to: "/login" });
        return;
      }

      const { error: vErr } = await supabase.from("vendors").insert({
        id: data.user.id,
        name: f.name,
        email: f.email,
        phone: f.phone,
        bank_name: f.bank_name,
        account_number: f.account_number,
        account_name: f.account_name,
        status: "active",
      });
      if (vErr) throw new Error(vErr.message);

      toast.success("You're live!");
      nav({ to: "/vendor" });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6 max-w-md mx-auto">
      <div className="flex flex-col items-center pt-4 mb-5">
        <img src={logo} alt="" className="w-14 h-14" />
        <h1 className="text-xl font-black mt-2">Sell on <span className="text-primary">Chopstack</span></h1>
      </div>
      <p className="text-sm text-muted-foreground mb-5">You go live the moment you sign up. Add stock and start receiving orders.</p>
      <form onSubmit={submit} className="space-y-3">
        <div><Label>Business / vendor name</Label><Input required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
        <div><Label>Phone</Label><Input required value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></div>
        <div><Label>Email</Label><Input type="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
        <div><Label>Password</Label><Input type="password" required value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></div>
        <div className="pt-2 border-t border-border" />
        <p className="text-xs text-muted-foreground">Payout account (Naira)</p>
        <div><Label>Bank name</Label><Input required value={f.bank_name} onChange={(e) => setF({ ...f, bank_name: e.target.value })} placeholder="e.g. GTBank" /></div>
        <div><Label>Account number</Label><Input required inputMode="numeric" maxLength={10} value={f.account_number} onChange={(e) => setF({ ...f, account_number: e.target.value.replace(/\D/g, "") })} /></div>
        <div><Label>Account name</Label><Input required value={f.account_name} onChange={(e) => setF({ ...f, account_name: e.target.value })} /></div>
        <Button type="submit" size="lg" className="w-full mt-2" disabled={busy}>{busy ? "Creating…" : "Create vendor account"}</Button>
      </form>
      <p className="text-center text-sm text-muted-foreground mt-4">
        Already selling? <Link to="/login" className="text-primary font-medium">Log in</Link>
      </p>
    </div>
  );
}
