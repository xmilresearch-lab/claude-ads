import { api } from "@/lib/api/client";
import { setAccessToken, setRefreshToken } from "@/lib/auth/tokens";
import type { TokenResponse, UserResponse } from "@/lib/api/types";

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  workspace_name: string;
}

export async function login(payload: LoginPayload): Promise<TokenResponse> {
  const data = await api.post<TokenResponse>("/auth/login", payload, { skipAuth: true });
  setAccessToken(data.access_token);
  if (data.refresh_token) setRefreshToken(data.refresh_token);
  return data;
}

export async function register(payload: RegisterPayload): Promise<TokenResponse> {
  const data = await api.post<TokenResponse>("/auth/register", payload, { skipAuth: true });
  setAccessToken(data.access_token);
  if (data.refresh_token) setRefreshToken(data.refresh_token);
  return data;
}

export function getMe(): Promise<UserResponse> {
  return api.get<UserResponse>("/auth/me");
}

export function logout(): Promise<void> {
  return api.post<void>("/auth/logout").catch(() => undefined);
}
