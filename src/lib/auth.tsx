import { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type UserRole = "admin" | "vendor" | "buyer" | null;

export type BuyerProfile = { id: string; name: string; email: string; phone: string | null; zone_id: string | null };
export type VendorProfile = { id: string; name: string; email: string; phone: string; status: string; rejection_reason: string | null };

type AuthCtx = {
  user: User | null;
  role: UserRole;
  buyer: BuyerProfile | null;
  vendor: VendorProfile | null;
  loading: boolean;
  refresh: () => Promise<void>;
};

const Ctx = createContext<AuthCtx>({ user: null, role: null, buyer: null, vendor: null, loading: true, refresh: async () => {} });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole>(null);
  const [buyer, setBuyer] = useState<BuyerProfile | null>(null);
  const [vendor, setVendor] = useState<VendorProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (uid: string) => {
    const [rolesRes, buyerRes, vendorRes] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", uid),
      supabase.from("buyers").select("id,name,email,phone,zone_id").eq("id", uid).maybeSingle(),
      supabase.from("vendors").select("id,name,email,phone,status,rejection_reason").eq("id", uid).maybeSingle(),
    ]);
    const roles = (rolesRes.data ?? []).map((r) => r.role);
    setRole(roles.includes("admin") ? "admin" : roles.includes("vendor") ? "vendor" : "buyer");
    setBuyer((buyerRes.data as BuyerProfile) ?? null);
    setVendor((vendorRes.data as VendorProfile) ?? null);
  }, []);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) setTimeout(() => load(u.id).finally(() => setLoading(false)), 0);
      else { setRole(null); setBuyer(null); setVendor(null); setLoading(false); }
    });
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user ?? null;
      setUser(u);
      if (u) load(u.id).finally(() => setLoading(false));
      else setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, [load]);

  const refresh = async () => { if (user) await load(user.id); };
  return <Ctx.Provider value={{ user, role, buyer, vendor, loading, refresh }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
