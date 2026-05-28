"use client";

import Cookies from "js-cookie";
import { TOKEN_COOKIE, ACCESS_TOKEN_KEY } from "@/lib/utils/constants";

// Access token — in-memory only (never persisted to localStorage)
const _store: Record<string, string> = {};

export function setAccessToken(token: string): void {
  _store[ACCESS_TOKEN_KEY] = token;
}

export function getAccessToken(): string | undefined {
  return _store[ACCESS_TOKEN_KEY];
}

export function clearAccessToken(): void {
  delete _store[ACCESS_TOKEN_KEY];
}

// Refresh token — httpOnly-equivalent via js-cookie with secure + sameSite
export function setRefreshToken(token: string): void {
  Cookies.set(TOKEN_COOKIE, token, {
    expires: 30,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  });
}

export function getRefreshToken(): string | undefined {
  return Cookies.get(TOKEN_COOKIE);
}

export function clearRefreshToken(): void {
  Cookies.remove(TOKEN_COOKIE);
}

export function clearAllTokens(): void {
  clearAccessToken();
  clearRefreshToken();
}
