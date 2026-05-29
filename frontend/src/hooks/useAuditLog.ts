"use client";

import { useQuery, useMutation } from "@tanstack/react-query";
import {
  listAuditLog,
  exportAuditLogCSV,
  type AuditLogParams,
} from "@/lib/api/auditLog";

export const auditLogKeys = {
  all: ["audit-log"] as const,
  list: (params: AuditLogParams) => [...auditLogKeys.all, "list", params] as const,
};

export function useAuditLog(params: AuditLogParams = {}) {
  return useQuery({
    queryKey: auditLogKeys.list(params),
    queryFn: () => listAuditLog(params),
    staleTime: 60_000,
  });
}

export function useExportAuditLog() {
  return useMutation({
    mutationFn: (params: Omit<AuditLogParams, "limit" | "offset">) =>
      exportAuditLogCSV(params),
  });
}
