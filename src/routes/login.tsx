import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import logo from "@/assets/logo.png";
import { ThemeToggle } from "@/components/app/ThemeToggle";
import { consumeAuthRedirect } from "@/lib/auth-guard";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Welcome back");
    if (typeof window !== "undefined") sessionStorage.setItem("cs_splash_shown", "1");
    const redirectTo = consumeAuthRedirect();
    if (redirectTo) return navigate({ to: redirectTo });
    const { data: prof } = await supabase
      .from("users")
      .select("account_type")
      .eq("id", data.user!.id)
      .maybeSingle();
    navigate({ to: prof?.account_type === "farmer" ? "/dashboard" : "/home" });
  };

  return (
    <div className="min-h-screen bg-background p-6 max-w-md mx-auto">
      <div className="flex justify-end">
        <ThemeToggle />
      </div>
      <div className="flex flex-col items-center mb-8 pt-10">
        <img src={logo} alt="CHOPSTACK" className="w-20 h-20 object-contain" />
        <h1 className="text-3xl font-black mt-3"><span className="text-foreground">CHOP</span><span className="text-primary">STACK</span></h1>
      </div>
      <h2 className="text-2xl font-bold mb-6">Welcome back</h2>
      <form onSubmit={submit} className="space-y-4">
        <div><Label>Email</Label><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div>
          <div className="flex justify-between">
            <Label>Password</Label>
            <Link to="/forgot-password" className="text-xs text-primary">Forgot?</Link>
          </div>
          <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <Button type="submit" size="lg" className="w-full" disabled={loading}>{loading ? "Logging in..." : "Log In"}</Button>
      </form>
      <p className="text-center text-sm text-muted-foreground mt-6">
        New here? <Link to="/signup" className="text-primary font-medium">Create account</Link>
      </p>
    </div>
  );
}