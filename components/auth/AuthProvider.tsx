"use client";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { auth } from "@/lib/firebase-client";
import type { StaffRole } from "@/types/auth";

interface AuthState { user: User | null; role: StaffRole | null; loading: boolean; logout: () => Promise<void>; }
const Context = createContext<AuthState>({ user: null, role: null, loading: true, logout: async () => undefined });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<StaffRole | null>(null);
  const [loading, setLoading] = useState(Boolean(auth));
  useEffect(() => {
    if (!auth) { setLoading(false); return; }
    return onAuthStateChanged(auth, async current => {
      setUser(current);
      if (current) {
        const token = await current.getIdTokenResult();
        setRole((token.claims.role as StaffRole) ?? "sales");
        await fetch("/api/auth/session", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ idToken: await current.getIdToken() }) });
      } else setRole(null);
      setLoading(false);
    });
  }, []);
  const value = useMemo(() => ({ user, role, loading, logout: async () => { if (auth) await signOut(auth); await fetch("/api/auth/logout", { method: "POST" }); location.href = "/login"; } }), [user, role, loading]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export const useAuth = () => useContext(Context);
