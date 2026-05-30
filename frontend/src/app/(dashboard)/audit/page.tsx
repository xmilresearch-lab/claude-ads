"use client";

import { PageHeader } from "@/components/layout/page-header";
import { AuditLogTable } from "@/components/audit/AuditLogTable";

export default function AuditLogPage() {
  return (
    <>
      <PageHeader
        title="Audit Log"
        description="Security and activity audit trail for your workspace"
        breadcrumb={[{ label: "Audit Log" }]}
      />
      <div className="p-6">
        <AuditLogTable showWorkspaceColumn={false} />
      </div>
    </>
  );
}
