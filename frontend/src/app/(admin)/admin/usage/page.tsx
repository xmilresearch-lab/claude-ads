import { PageHeader } from "@/components/layout/page-header";

export default function AdminUsagePage() {
  return (
    <>
      <PageHeader title="Usage & Tokens" description="Platform-wide token and API usage" />
      <div className="card-command p-8 text-center text-text-muted text-sm font-mono">
        Coming in Sprint F7
      </div>
    </>
  );
}
