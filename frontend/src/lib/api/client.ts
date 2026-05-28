import { API_URL } from "@/lib/utils/constants";
import { getAccessToken, setAccessToken, getRefreshToken, clearAllTokens } from "@/lib/auth/tokens";

export class ApiError extends Error {
  constructor(
    public readonly errors: Array<{ code: string; message: string; field?: string | null }>,
    public readonly status: number,
  ) {
    super(errors[0]?.message ?? "API error");
    this.name = "ApiError";
  }
}

type RequestOptions = RequestInit & { skipAuth?: boolean };

let _refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  if (_refreshPromise) return _refreshPromise;

  _refreshPromise = (async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) throw new ApiError([{ code: "unauthorized", message: "No refresh token" }], 401);

    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!res.ok) {
      clearAllTokens();
      if (typeof window !== "undefined") window.location.href = "/login";
      throw new ApiError([{ code: "unauthorized", message: "Session expired" }], 401);
    }

    const body = await res.json();
    const newToken: string = body.data.access_token;
    setAccessToken(newToken);
    return newToken;
  })().finally(() => {
    _refreshPromise = null;
  });

  return _refreshPromise;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { skipAuth = false, ...init } = options;
  const token = getAccessToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string>),
  };

  if (!skipAuth && token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, { ...init, headers });

  // Auto-refresh on 401
  if (res.status === 401 && !skipAuth) {
    const newToken = await refreshAccessToken();
    headers["Authorization"] = `Bearer ${newToken}`;
    const retry = await fetch(`${API_URL}${path}`, { ...init, headers });
    return parseResponse<T>(retry);
  }

  return parseResponse<T>(res);
}

async function parseResponse<T>(res: Response): Promise<T> {
  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    const errors = body.errors ?? [{ code: "http_error", message: res.statusText }];
    throw new ApiError(errors, res.status);
  }

  // Unwrap envelope
  return (body.data ?? body) as T;
}

export const api = {
  get: <T>(path: string, opts?: RequestOptions) =>
    request<T>(path, { method: "GET", ...opts }),

  post: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body), ...opts }),

  patch: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body), ...opts }),

  put: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(path, { method: "PUT", body: JSON.stringify(body), ...opts }),

  delete: <T>(path: string, opts?: RequestOptions) =>
    request<T>(path, { method: "DELETE", ...opts }),
};
