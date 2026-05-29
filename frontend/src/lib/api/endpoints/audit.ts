import { api } from "@/lib/api/client";
import type { AuditLogResponse } from "@/lib/api/types";

export interface AuditParams {
  action?: string;
  from_date?: string;
  to_date?: string;
  limit?: number;
  offset?: number;
}

export function listAuditLogs(params: AuditParams = {}): Promise<AuditLogResponse[]> {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined) q.set(k, String(v));
  });
  return api.get<AuditLogResponse[]>(`/audit?${q}`);
}
