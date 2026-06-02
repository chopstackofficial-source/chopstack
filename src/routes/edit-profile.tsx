import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/edit-profile")({ component: EditProfile });

function EditProfile() {
  const { user, profile, refresh, loading } = useAuth();
  const navigate = useNavigate();
  const [f, setF] = useState({ full_name: "", phone: "", delivery_address: "", state: "", lga: "" });
  const [busy, setBusy] = useState(false);

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
    </div>
  );
}