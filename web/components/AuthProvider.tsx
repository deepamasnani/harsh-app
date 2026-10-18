"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";

type User = {
  id: number;
  username: string;
  role: string;
  full_name: string;
};

const AuthCtx = createContext<any>(null);
const CACHE_KEY = "hh_user";

function readCachedUser(): User | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

function writeCachedUser(user: User | null) {
  if (typeof window === "undefined") return;
  if (user) sessionStorage.setItem(CACHE_KEY, JSON.stringify(user));
  else sessionStorage.removeItem(CACHE_KEY);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(readCachedUser);
  const [ready, setReady] = useState(() => readCachedUser() !== null);

  useEffect(() => {
    let cancelled = false;
    api("/api/auth/me")
      .then((u) => {
        if (cancelled) return;
        setUser(u);
        writeCachedUser(u);
      })
      .catch(() => {
        if (cancelled) return;
        setUser(null);
        writeCachedUser(null);
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo(
    () => ({
      user,
      ready,
      async login(username: string, password: string) {
        const data: any = await api("/api/auth/login", { method: "POST", body: { username, password } });
        setUser(data.user);
        writeCachedUser(data.user);
        return data.user;
      },
      async logout() {
        try {
          await api("/api/auth/logout", { method: "POST" });
        } catch {
          /* ignore */
        }
        setUser(null);
        writeCachedUser(null);
      },
    }),
    [user, ready]
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  return useContext(AuthCtx);
}
