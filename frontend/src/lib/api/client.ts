import { API_URL } from "@/lib/utils/constants";
import { getAccessToken, refreshAccessToken, clearTokens } from "@/lib/auth/tokens";

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    public readonly message: string,
    public readonly status: number,
    public readonly field?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type RequestOptions = RequestInit & { skipAuth?: boolean };

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { skipAuth = false, ...init } = options;
  const token = getAccessToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Request-ID": crypto.randomUUID(),
    ...(init.headers as Record<string, string>),
  };

  if (!skipAuth && token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, { ...init, headers });

  if (res.status === 401 && !skipAuth) {
    const newToken = await refreshAccessToken();
    if (!newToken) {
      clearTokens();
      if (typeof window !== "undefined") window.location.href = "/login";
      throw new ApiError("unauthorized", "Session expired", 401);
    }
    headers["Authorization"] = `Bearer ${newToken}`;
    const retry = await fetch(`${API_URL}${path}`, { ...init, headers });
    return parseResponse<T>(retry);
  }

  return parseResponse<T>(res);
}

async function parseResponse<T>(res: Response): Promise<T> {
  const body = await res.json().catch(() => ({})) as Record<string, unknown>;

  if (!res.ok) {
    const err = (body.errors as Array<Record<string, unknown>> | undefined)?.[0]
      ?? (body.error as Record<string, unknown> | undefined)
      ?? {};
    throw new ApiError(
      (err.code as string) ?? "http_error",
      (err.message as string) ?? res.statusText,
      res.status,
      (err.field as string) ?? undefined,
    );
  }

  return ((body.data ?? body) as T);
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
