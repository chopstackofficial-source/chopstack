import { Link, useLocation } from "@tanstack/react-router";
import { Home, Package, Bell, User, ShoppingBag } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

export function BottomNav() {
  const { profile, user } = useAuth();
  const loc = useLocation();
  const isFarmer = profile?.account_type === "farmer";
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!user) { setUnread(0); return; }
    const load = () =>
      supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("read", false)
        .then(({ count }) => setUnread(count ?? 0));
    load();
    const ch = supabase
      .channel(`notif-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => load(),
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, loc.pathname]);

  const items = isFarmer
    ? [
        { to: "/home", label: "Home", icon: Home },
        { to: "/my-listings", label: "Listings", icon: Package },
        { to: "/manage-orders", label: "Orders", icon: ShoppingBag },
        { to: "/notifications", label: "Alerts", icon: Bell },
        { to: "/profile", label: "Me", icon: User },
      ]
    : [
        { to: "/home", label: "Home", icon: Home },
        { to: "/bundles", label: "Bundles", icon: Package },
        { to: "/orders", label: "Orders", icon: ShoppingBag },
        { to: "/notifications", label: "Alerts", icon: Bell },
        { to: "/profile", label: "Me", icon: User },
      ];

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 bg-card border-t border-border">
      <div className="mx-auto max-w-md grid grid-cols-5">
        {items.map((it) => {
          const active = loc.pathname.startsWith(it.to);
          const Icon = it.icon;
          const showBadge = it.to === "/notifications" && unread > 0;
          return (
            <Link
              key={it.to}
              to={it.to}
              className={cn(
                "flex flex-col items-center justify-center py-2 gap-1 text-xs",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <span className="relative">
                <Icon className={cn("h-5 w-5", active && "drop-shadow-[0_0_8px_currentColor]")} />
                {showBadge && (
                  <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </span>
              <span>{it.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function MobileShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-md pb-20">{children}</div>
      <BottomNav />
    </div>
  );
}