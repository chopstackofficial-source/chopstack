import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { MobileShell } from "@/components/app/BottomNav";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/notifications")({ component: Notifications });

function Notifications() {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const load = () => user && supabase.from("notifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).then(({ data }) => setItems(data ?? []));
  useEffect(() => { load(); }, [user]);
  const markAll = async () => { if (!user) return; await supabase.from("notifications").update({ read: true }).eq("user_id", user.id); load(); };
  return (
    <MobileShell>
      <div className="p-4 space-y-3">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Alerts</h1>
          <Button variant="ghost" size="sm" onClick={markAll}>Mark all read</Button>
        </div>
        {items.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No notifications.</p>}
        {items.map((n) => {
          const className = `block p-3 rounded-xl border ${n.read ? "bg-card border-border" : "bg-primary/5 border-primary/30"}`;
          const inner = (
            <>
              <p className="font-semibold text-sm">{n.title}</p>
              <p className="text-sm text-muted-foreground">{n.body}</p>
              <p className="text-xs text-muted-foreground mt-1">{formatDate(n.created_at)}</p>
            </>
          );
          const markRead = async () => {
            if (!n.read) {
              await supabase.from("notifications").update({ read: true }).eq("id", n.id);
            }
          };
          if (n.type === "order" && n.reference_id) {
            return (
              <Link key={n.id} to="/orders/$id" params={{ id: n.reference_id }} className={className} onClick={markRead}>
                {inner}
              </Link>
            );
          }
          return <div key={n.id} className={className}>{inner}</div>;
        })}
      </div>
    </MobileShell>
  );
}