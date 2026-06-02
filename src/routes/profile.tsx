import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MobileShell } from "@/components/app/BottomNav";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { LogOut, User, Moon, Sun, Pencil, MapPin } from "lucide-react";
import { useTheme } from "@/lib/theme";

export const Route = createFileRoute("/profile")({ component: Profile });

function Profile() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();
  const isFarmer = profile?.account_type === "farmer";
  const [stats, setStats] = useState({ listings: 0, bundles: 0, active: 0, completed: 0 });
  useEffect(() => {
    if (!user || !isFarmer) return;
    Promise.all([
      supabase.from("listings").select("id", { count: "exact", head: true }).eq("farmer_id", user.id).eq("status", "active"),
      supabase.from("bundles").select("id", { count: "exact", head: true }).eq("farmer_id", user.id).eq("status", "active"),
      supabase.from("orders").select("id", { count: "exact", head: true }).eq("farmer_id", user.id).in("status", ["pending", "accepted"]),
      supabase.from("orders").select("id", { count: "exact", head: true }).eq("farmer_id", user.id).eq("status", "completed"),
    ]).then(([a, b, c, d]) => setStats({ listings: a.count || 0, bundles: b.count || 0, active: c.count || 0, completed: d.count || 0 }));
  }, [user, isFarmer]);
  const logout = async () => { await supabase.auth.signOut(); navigate({ to: "/login" }); };
  return (
    <MobileShell>
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Profile</h1>
          <Button variant="outline" size="icon" onClick={toggle} aria-label="Toggle theme">
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>
        </div>
        <div className="bg-card border border-border rounded-xl p-6 flex flex-col items-center">
          <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mb-3">
            {profile?.avatar_url ? <img src={profile.avatar_url} className="w-20 h-20 rounded-full object-cover" alt="" /> : <User className="w-10 h-10 text-primary" />}
          </div>
          <h2 className="font-bold text-lg">{profile?.full_name}</h2>
          <span className="text-xs uppercase px-2 py-0.5 rounded-full bg-primary/20 text-primary font-bold mt-1">{profile?.account_type}</span>
          <p className="text-sm text-muted-foreground mt-2">{profile?.email}</p>
        </div>
        <Link to="/edit-profile" className="block">
          <Button variant="outline" className="w-full"><Pencil className="w-4 h-4" /> Edit Profile</Button>
        </Link>
        <Link to="/edit-profile" className="flex items-center justify-between bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <MapPin className="w-5 h-5 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Location</p>
              <p className="font-medium text-sm">
                {profile?.state || profile?.lga
                  ? `${profile?.state ?? ""}${profile?.state && profile?.lga ? " · " : ""}${profile?.lga ?? ""}`
                  : "Not set"}
              </p>
            </div>
          </div>
          <span className="text-xs text-primary font-medium">Edit</span>
        </Link>
        {isFarmer && (
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wide px-1">My Dashboard</h3>
            <div className="grid grid-cols-2 gap-3">
              {[{ l: "Listings", v: stats.listings }, { l: "Bundles", v: stats.bundles }, { l: "Active orders", v: stats.active }, { l: "Completed", v: stats.completed }].map((s) => (
                <div key={s.l} className="bg-card border border-border rounded-xl p-4">
                  <p className="text-xs text-muted-foreground">{s.l}</p>
                  <p className="text-3xl font-black text-primary">{s.v}</p>
                </div>
              ))}
            </div>
          </div>
        )}
        <Button variant="outline" className="w-full" onClick={logout}><LogOut className="w-4 h-4" /> Log out</Button>
      </div>
    </MobileShell>
  );
}