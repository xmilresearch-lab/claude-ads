import { PageHeader } from "@/components/layout/page-header";

export default function AdminOverviewPage() {
  return (
    <>
      <PageHeader
        title="Admin Overview"
        description="Platform health, user metrics, and system status"
      />
      <div className="card-command p-8 text-center text-text-muted text-sm">
        Admin dashboard — future sprint
      </div>
    </>
  );
}
