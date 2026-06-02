import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import logo from "@/assets/logo.png";
import { ThemeToggle } from "@/components/app/ThemeToggle";
import { peekAuthMessage, consumeAuthRedirect } from "@/lib/auth-guard";

export const Route = createFileRoute("/signup")({ component: Signup });

function Signup() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ full_name: "", email: "", password: "", confirm: "" });
  const [accountType, setAccountType] = useState<"buyer" | "farmer">("buyer");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setMessage(peekAuthMessage());
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirm) return toast.error("Passwords do not match");
    if (form.password.length < 6) return toast.error("Password must be at least 6 characters");
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { full_name: form.full_name, account_type: accountType },
      },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    if (data.session) {
      toast.success("Welcome to CHOPSTACK!");
      const redirectTo = consumeAuthRedirect();
      navigate({ to: redirectTo ?? (accountType === "farmer" ? "/dashboard" : "/home") });
    } else {
      toast.success("Check your email to verify your account");
      navigate({ to: "/login" });
    }
  };

  return (
    <div className="min-h-screen bg-background p-6 max-w-md mx-auto">
      <div className="flex justify-end">
        <ThemeToggle />
      </div>
      <div className="flex flex-col items-center mb-6 pt-6">
        <img src={logo} alt="CHOPSTACK" className="w-16 h-16 object-contain" />
        <h1 className="text-2xl font-black mt-2"><span className="text-foreground">CHOP</span><span className="text-primary">STACK</span></h1>
      </div>
      <h2 className="text-2xl font-bold mb-6">Create your account</h2>
      {message && (
        <div className="mb-4 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-sm text-foreground">
          {message}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 mb-6 bg-card p-1 rounded-lg border border-border">
        {(["buyer", "farmer"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setAccountType(t)}
            className={`py-2.5 rounded-md text-sm font-medium capitalize transition ${
              accountType === t ? "bg-primary text-primary-foreground shadow-[var(--glow-primary)]" : "text-muted-foreground"
            }`}
          >
            {t === "farmer" ? "Farmer / Vendor" : "Buyer"}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="space-y-4">
        <div><Label>Full name</Label><Input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
        <div><Label>Email</Label><Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
        <div><Label>Password</Label><Input type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
        <div><Label>Confirm password</Label><Input type="password" required value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} /></div>
        <Button type="submit" size="lg" className="w-full" disabled={loading}>{loading ? "Creating..." : "Sign Up"}</Button>
      </form>
      <p className="text-center text-sm text-muted-foreground mt-6">
        Have an account? <Link to="/login" className="text-primary font-medium">Log in</Link>
      </p>
    </div>
  );
}