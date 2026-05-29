import { PageHeader } from "@/components/layout/page-header";

export default function AdminSystemPage() {
  return (
    <>
      <PageHeader title="System Health" description="Infrastructure health and configuration" />
      <div className="card-command p-8 text-center text-text-muted text-sm font-mono">
        Coming in Sprint F7
      </div>
    </>
  );
}
