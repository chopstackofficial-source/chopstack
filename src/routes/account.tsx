import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { MobileShell } from "@/components/app/BottomNav";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/account")({ component: Account });
function Account() {
  const { user, role, buyer, vendor, loading } = useAuth();
  const nav = useNavigate();
  if (loading) return <MobileShell><div className="p-6 text-sm text-muted-foreground">Loading…</div></MobileShell>;
  if (!user) return (
    <MobileShell>
      <div className="p-6 text-center space-y-3">
        <h1 className="text-lg font-bold">Your account</h1>
        <p className="text-sm text-muted-foreground">Sign in to manage your orders.</p>
        <Link to="/login"><Button className="w-full">Log in</Button></Link>
        <Link to="/signup"><Button variant="outline" className="w-full">Create account</Button></Link>
        <div className="pt-6 text-xs text-muted-foreground">
          Selling? <Link to="/vendor/signup" className="text-primary">Register as a vendor</Link>
        </div>
      </div>
    </MobileShell>
  );
  return (
    <MobileShell>
      <div className="p-6 space-y-4">
        <div className="bg-card border border-border rounded-2xl p-4">
          <div className="font-semibold">{buyer?.name || vendor?.name || user.email}</div>
          <div className="text-xs text-muted-foreground">{user.email}</div>
          <div className="text-xs mt-1 text-primary uppercase tracking-wider">{role}</div>
        </div>
        {role === "vendor" && <Link to="/vendor"><Button className="w-full">Vendor dashboard</Button></Link>}
        {role === "admin" && <Link to="/admin"><Button className="w-full">Admin dashboard</Button></Link>}
        <Button variant="outline" className="w-full" onClick={async () => { await supabase.auth.signOut(); nav({ to: "/" }); }}>Sign out</Button>
      </div>
    </MobileShell>
  );
}
