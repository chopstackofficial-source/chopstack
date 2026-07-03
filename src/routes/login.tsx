import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { writeZoneId } from "@/lib/zone";
import logo from "@/assets/logo.png";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Welcome back");
    // Restore zone from buyer profile if any
    if (data.user) {
      const { data: b } = await supabase.from("buyers").select("zone_id").eq("id", data.user.id).maybeSingle();
      if (b?.zone_id) writeZoneId(b.zone_id);
    }
    nav({ to: "/" });
  };
  return (
    <div className="min-h-screen bg-background p-6 max-w-md mx-auto">
      <div className="flex flex-col items-center pt-10 mb-6">
        <img src={logo} alt="" className="w-16 h-16" />
        <h1 className="text-2xl font-black mt-2"><span>CHOP</span><span className="text-primary">STACK</span></h1>
      </div>
      <h2 className="text-xl font-bold mb-4">Welcome back</h2>
      <form onSubmit={submit} className="space-y-3">
        <div><Label>Email</Label><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div><Label>Password</Label><Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} /></div>
        <Button size="lg" className="w-full" type="submit" disabled={busy}>{busy ? "…" : "Log in"}</Button>
      </form>
      <p className="text-center text-sm text-muted-foreground mt-4">New? <Link to="/signup" className="text-primary font-medium">Create account</Link></p>
    </div>
  );
}
