import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { writeLocation } from "@/lib/location";
import { LocationPicker } from "@/components/app/LocationPicker";
import { MapPin, Check } from "lucide-react";
import logo from "@/assets/logo.png";

export const Route = createFileRoute("/signup")({ component: Signup });

function Signup() {
  const nav = useNavigate();
  const [f, setF] = useState({ name: "", email: "", phone: "", password: "" });
  const [loc, setLoc] = useState<{ lat: number; lng: number; address: string } | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (f.password.length < 6) return toast.error("Password too short");
    if (!loc) return toast.error("Set your delivery location");
    setBusy(true);
    try {
      const { data: cur } = await supabase.auth.getUser();
      if (cur.user) await supabase.auth.signOut();

      const { data, error } = await supabase.auth.signUp({
        email: f.email,
        password: f.password,
        options: { emailRedirectTo: `${window.location.origin}/`, data: { name: f.name } },
      });
      if (error) throw new Error(error.message);
      if (!data.user) throw new Error("Sign up failed. Try again.");

      if (!data.session) {
        toast.success("Account created. Check your email to confirm, then log in.");
        nav({ to: "/login" });
        return;
      }

      const { error: bErr } = await supabase.from("buyers").insert({
        id: data.user.id,
        name: f.name,
        email: f.email,
        phone: f.phone || null,
        delivery_address: loc.address,
        latitude: loc.lat,
        longitude: loc.lng,
      });
      if (bErr) throw new Error(bErr.message);
      writeLocation(loc);
      toast.success("Welcome!");
      nav({ to: "/" });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
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
          <Label>Delivery location</Label>
          {loc && !showMap ? (
            <div className="rounded-xl border border-border p-3 flex items-start gap-2 bg-card">
              <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium line-clamp-2">{loc.address || `${loc.lat.toFixed(5)}, ${loc.lng.toFixed(5)}`}</div>
                <button type="button" onClick={() => setShowMap(true)} className="text-xs text-primary mt-1">Change</button>
              </div>
            </div>
          ) : showMap ? (
            <div className="mt-1">
              <LocationPicker initial={loc ? { lat: loc.lat, lng: loc.lng } : null} onConfirm={(l) => { setLoc(l); setShowMap(false); }} />
            </div>
          ) : (
            <button type="button" onClick={() => setShowMap(true)} className="w-full mt-1 h-24 rounded-xl border-2 border-dashed border-border grid place-items-center text-sm text-muted-foreground">
              <span className="flex items-center gap-2"><MapPin className="w-4 h-4" /> Pin your delivery spot</span>
            </button>
          )}
        </div>
        <Button type="submit" size="lg" className="w-full" disabled={busy}>{busy ? "Creating…" : "Sign up"}</Button>
      </form>
      <p className="text-center text-sm text-muted-foreground mt-4">Have an account? <Link to="/login" className="text-primary font-medium">Log in</Link></p>
      <p className="text-center text-xs text-muted-foreground mt-6">Selling produce? <Link to="/vendor/signup" className="text-primary">Register as a vendor</Link></p>
    </div>
  );
}
