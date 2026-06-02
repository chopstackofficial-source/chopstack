import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/forgot-password")({ component: Forgot });

function Forgot() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Check your email for the reset link");
  };
  return (
    <div className="min-h-screen bg-background p-6 max-w-md mx-auto pt-16">
      <h1 className="text-2xl font-bold mb-2">Reset password</h1>
      <p className="text-muted-foreground mb-6 text-sm">We'll email you a link to reset it.</p>
      <form onSubmit={submit} className="space-y-4">
        <div><Label>Email</Label><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <Button type="submit" size="lg" className="w-full" disabled={loading}>{loading ? "Sending..." : "Send reset link"}</Button>
      </form>
      <p className="text-center text-sm text-muted-foreground mt-6">
        <Link to="/login" className="text-primary">Back to login</Link>
      </p>
    </div>
  );
}