import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = { title: "Audit Log — Automate" };

export default function AuditPage() {
  return (
    <>
      <PageHeader
        title="Audit Log"
        description="Immutable, workspace-scoped activity log"
      />
      <div className="card-command p-8 text-center text-text-muted text-sm">
        Audit log — Sprint F7
      </div>
    </>
  );
}
