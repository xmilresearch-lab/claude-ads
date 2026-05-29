import { api } from "@/lib/api/client";

// Admin endpoints — only accessible with plan="admin"
export function listUsers(params: { limit?: number; offset?: number } = {}) {
  const q = new URLSearchParams();
  if (params.limit) q.set("limit", String(params.limit));
  if (params.offset) q.set("offset", String(params.offset));
  return api.get(`/admin/users?${q}`);
}

export function listAllWorkspaces(params: { limit?: number; offset?: number } = {}) {
  const q = new URLSearchParams();
  if (params.limit) q.set("limit", String(params.limit));
  if (params.offset) q.set("offset", String(params.offset));
  return api.get(`/admin/workspaces?${q}`);
}

export function getPlatformStats() {
  return api.get("/admin/stats");
}
