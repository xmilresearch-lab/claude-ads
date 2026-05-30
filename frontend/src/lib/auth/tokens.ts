import Cookies from "js-cookie";
import { API_URL, TOKEN_COOKIE } from "@/lib/utils/constants";

// ── Access token — in-memory only, never persisted ───────────────────────────

let _accessToken: string | null = null;

export const setAccessToken = (t: string | null): void => { _accessToken = t; };
export const getAccessToken = (): string | null => _accessToken;

// ── Refresh token — js-cookie, secure + sameSite strict ──────────────────────

const COOKIE_OPTIONS = {
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  expires: 30,
};

export function setRefreshToken(token: string): void {
  Cookies.set(TOKEN_COOKIE, token, COOKIE_OPTIONS);
}

export function getRefreshToken(): string | undefined {
  return Cookies.get(TOKEN_COOKIE);
}

// ── Convenience helpers ───────────────────────────────────────────────────────

export function storeTokens(accessToken: string, refreshToken: string): void {
  setAccessToken(accessToken);
  Cookies.set(TOKEN_COOKIE, refreshToken, COOKIE_OPTIONS);
}

export function clearTokens(): void {
  setAccessToken(null);
  Cookies.remove(TOKEN_COOKIE);
}

export const clearAllTokens = clearTokens;

// ── Token refresh — raw fetch to avoid circular dep with client.ts ───────────

let _refreshPromise: Promise<string | null> | null = null;

export async function refreshAccessToken(): Promise<string | null> {
  if (_refreshPromise) return _refreshPromise;

  const refresh = getRefreshToken();
  if (!refresh) return null;

  _refreshPromise = (async () => {
    try {
      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refresh }),
      });

      if (!res.ok) {
        clearTokens();
        return null;
      }

      const body = await res.json() as Record<string, Record<string, string>>;
      const payload = body.data ?? body;
      const newAccess = payload.access_token;
      const newRefresh = payload.refresh_token;

      setAccessToken(newAccess);
      if (newRefresh) Cookies.set(TOKEN_COOKIE, newRefresh, COOKIE_OPTIONS);
      return newAccess;
    } catch {
      clearTokens();
      return null;
    }
  })().finally(() => {
    _refreshPromise = null;
  });

  return _refreshPromise;
}
