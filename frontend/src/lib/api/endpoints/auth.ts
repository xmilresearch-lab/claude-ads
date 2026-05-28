import { api } from "@/lib/api/client";
import { storeTokens } from "@/lib/auth/tokens";
import type { TokenResponse, UserResponse } from "@/lib/api/types";

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  workspace_name?: string;
}

export type LoginPayload = LoginRequest;
export type RegisterPayload = RegisterRequest;

export const authApi = {
  login: (data: LoginRequest) =>
    api.post<TokenResponse>("/auth/login", data, { skipAuth: true }),

  register: (data: RegisterRequest) =>
    api.post<TokenResponse>("/auth/register", data, { skipAuth: true }),

  refresh: (refreshToken: string) =>
    api.post<TokenResponse>("/auth/refresh", { refresh_token: refreshToken }, { skipAuth: true }),

  me: () => api.get<UserResponse>("/auth/me"),
};

export async function login(payload: LoginPayload): Promise<TokenResponse> {
  const data = await authApi.login(payload);
  storeTokens(data.access_token, data.refresh_token ?? "");
  return data;
}

export async function register(payload: RegisterPayload): Promise<TokenResponse> {
  const data = await authApi.register(payload);
  storeTokens(data.access_token, data.refresh_token ?? "");
  return data;
}

export function getMe(): Promise<UserResponse> {
  return authApi.me();
}

export function logout(): Promise<void> {
  return api.post<void>("/auth/logout").catch(() => undefined);
}
