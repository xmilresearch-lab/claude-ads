"use client";

import { PageHeader } from "@/components/layout/page-header";
import { AuditLogTable } from "@/components/audit/AuditLogTable";

export default function AdminAuditPage() {
  return (
    <>
      <PageHeader
        title="Audit Log"
        description="Platform-wide security and activity audit trail"
        breadcrumb={[{ label: "Admin" }, { label: "Audit Log" }]}
      />
      <div className="p-6">
        <AuditLogTable showWorkspaceColumn={true} />
      </div>
    </>
  );
}
