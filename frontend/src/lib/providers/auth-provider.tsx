"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { authApi, login, logout, register } from "@/lib/api/endpoints/auth";
import { clearAllTokens, getRefreshToken, refreshAccessToken } from "@/lib/auth/tokens";
import type { UserResponse } from "@/lib/api/types";
import type { LoginPayload, RegisterPayload } from "@/lib/api/endpoints/auth";

interface AuthContextValue {
  user: UserResponse | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!getRefreshToken()) {
      setIsLoading(false);
      return;
    }
    refreshAccessToken()
      .then((token) => (token ? authApi.me() : null))
      .then((me) => { if (me) setUser(me); })
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false));
  }, []);

  const handleLogin = useCallback(async (payload: LoginPayload) => {
    await login(payload);
    const me = await authApi.me();
    setUser(me);
    router.push("/automations");
  }, [router]);

  const handleRegister = useCallback(async (payload: RegisterPayload) => {
    await register(payload);
    const me = await authApi.me();
    setUser(me);
    router.push("/automations");
  }, [router]);

  const handleLogout = useCallback(async () => {
    await logout();
    clearAllTokens();
    setUser(null);
    router.push("/login");
  }, [router]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        isAdmin: user?.plan === "admin",
        login: handleLogin,
        register: handleRegister,
        logout: handleLogout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
