import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({ component: Reset });

function Reset() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) return toast.error("At least 6 characters");
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Password updated");
    navigate({ to: "/login" });
  };
  return (
    <div className="min-h-screen bg-background p-6 max-w-md mx-auto pt-16">
      <h1 className="text-2xl font-bold mb-6">Set new password</h1>
      <form onSubmit={submit} className="space-y-4">
        <div><Label>New password</Label><Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} /></div>
        <Button type="submit" size="lg" className="w-full" disabled={loading}>{loading ? "Saving..." : "Update password"}</Button>
      </form>
    </div>
  );
}