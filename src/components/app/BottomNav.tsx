import { Link, useLocation } from "@tanstack/react-router";
import { Home, Search, ShoppingCart, Package, User } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { cartCount, subscribeCart } from "@/lib/cart";

export function BottomNav() {
  const loc = useLocation();
  const [count, setCount] = useState(0);
  useEffect(() => {
    const refresh = () => setCount(cartCount());
    refresh();
    return subscribeCart(refresh);
  }, []);

  const items = [
    { to: "/", label: "Home", icon: Home, match: (p: string) => p === "/" },
    { to: "/search", label: "Search", icon: Search, match: (p: string) => p.startsWith("/search") },
    { to: "/cart", label: "Cart", icon: ShoppingCart, badge: count, match: (p: string) => p.startsWith("/cart") },
    { to: "/orders", label: "Orders", icon: Package, match: (p: string) => p.startsWith("/orders") },
    { to: "/account", label: "Account", icon: User, match: (p: string) => p.startsWith("/account") || p.startsWith("/login") || p.startsWith("/signup") },
  ] as const;

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 bg-card border-t border-border">
      <div className="mx-auto max-w-md grid grid-cols-5">
        {items.map((it) => {
          const active = it.match(loc.pathname);
          const Icon = it.icon;
          return (
            <Link key={it.to} to={it.to} className={cn("flex flex-col items-center justify-center py-2 gap-1 text-xs", active ? "text-primary" : "text-muted-foreground")}>
              <span className="relative">
                <Icon className="h-5 w-5" />
                {"badge" in it && it.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                    {it.badge > 9 ? "9+" : it.badge}
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
