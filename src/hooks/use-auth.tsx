import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "user" | "hotel_admin" | "super_owner";

type AuthCtx = {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshRole: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);

  // Patch fetch once to attach Supabase bearer token to TanStack server-fn calls
  useEffect(() => {
    if (typeof window === "undefined") return;
    const w = window as any;
    if (w.__sbFetchPatched) return;
    w.__sbFetchPatched = true;
    const origFetch = window.fetch.bind(window);
    window.fetch = async (input: any, init: any = {}) => {
      try {
        const url = typeof input === "string" ? input : input?.url ?? "";
        if (url.includes("/_serverFn/")) {
          const { data } = await supabase.auth.getSession();
          const token = data.session?.access_token;
          if (token) {
            const headers = new Headers(init.headers || (input?.headers as any));
            if (!headers.has("authorization")) headers.set("authorization", `Bearer ${token}`);
            init = { ...init, headers };
          }
        }
      } catch {}
      return origFetch(input, init);
    };
  }, []);

  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  const loadRole = async (uid: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", uid)
      .order("role", { ascending: true });
    if (!data || data.length === 0) {
      setRole(null);
      return;
    }
    // priority: super_owner > hotel_admin > user
    const roles = data.map((r) => r.role as AppRole);
    if (roles.includes("super_owner")) setRole("super_owner");
    else if (roles.includes("hotel_admin")) setRole("hotel_admin");
    else setRole("user");
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        setTimeout(() => loadRole(sess.user.id), 0);
      } else {
        setRole(null);
      }
    });

    supabase.auth.getSession().then(({ data: { session: sess } }) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) loadRole(sess.user.id);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setRole(null);
  };

  const refreshRole = async () => {
    if (user) await loadRole(user.id);
  };

  return (
    <Ctx.Provider value={{ user, session, role, loading, signOut, refreshRole }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
