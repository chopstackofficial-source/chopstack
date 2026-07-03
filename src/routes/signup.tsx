import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { writeZoneId } from "@/lib/zone";
import logo from "@/assets/logo.png";

export const Route = createFileRoute("/signup")({ component: Signup });

type Zone = { id: string; name: string };

function Signup() {
  const nav = useNavigate();
  const [f, setF] = useState({ name: "", email: "", phone: "", password: "", zone_id: "" });
  const [zones, setZones] = useState<Zone[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.from("zones").select("id,name").eq("active", true).order("name").then(({ data }) => {
      setZones((data ?? []) as Zone[]);
      if (data && data[0] && !f.zone_id) setF((p) => ({ ...p, zone_id: data[0].id }));
    });
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (f.password.length < 6) return toast.error("Password too short");
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email: f.email, password: f.password,
      options: { emailRedirectTo: `${window.location.origin}/`, data: { name: f.name } },
    });
    if (error) { setBusy(false); return toast.error(error.message); }
    if (data.user) {
      await supabase.from("buyers").insert({ id: data.user.id, name: f.name, email: f.email, phone: f.phone || null, zone_id: f.zone_id || null });
      if (f.zone_id) writeZoneId(f.zone_id);
    }
    setBusy(false);
    if (data.session) { toast.success("Welcome!"); nav({ to: "/" }); }
    else { toast.success("Check your email to verify"); nav({ to: "/login" }); }
  };

  return (
    <div className="min-h-screen bg-background p-6 max-w-md mx-auto">
      <div className="flex flex-col items-center pt-6 mb-6">
        <img src={logo} alt="" className="w-16 h-16" />
        <h1 className="text-2xl font-black mt-2"><span>CHOP</span><span className="text-primary">STACK</span></h1>
      </div>
      <h2 className="text-xl font-bold mb-4">Create your account</h2>
      <form onSubmit={submit} className="space-y-3">
        <div><Label>Full name</Label><Input required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
        <div><Label>Email</Label><Input type="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
        <div><Label>Phone</Label><Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></div>
        <div><Label>Password</Label><Input type="password" required value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></div>
        <div>
          <Label>Your delivery zone</Label>
          <select required className="w-full h-10 rounded-md bg-input border border-border px-3" value={f.zone_id} onChange={(e) => setF({ ...f, zone_id: e.target.value })}>
            {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
          </select>
          <p className="text-xs text-muted-foreground mt-1">You'll only see stock available in your zone.</p>
        </div>
        <Button type="submit" size="lg" className="w-full" disabled={busy}>{busy ? "Creating…" : "Sign up"}</Button>
      </form>
      <p className="text-center text-sm text-muted-foreground mt-4">Have an account? <Link to="/login" className="text-primary font-medium">Log in</Link></p>
      <p className="text-center text-xs text-muted-foreground mt-6">Selling produce? <Link to="/vendor/signup" className="text-primary">Register as a vendor</Link></p>
    </div>
  );
}
