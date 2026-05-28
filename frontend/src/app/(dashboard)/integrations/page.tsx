import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = { title: "Integrations — Automate" };

export default function IntegrationsPage() {
  return (
    <>
      <PageHeader
        title="Integrations"
        description="Connect external services via OAuth or API key"
      />
      <div className="card-command p-8 text-center text-text-muted text-sm">
        Integrations — Sprint F3
      </div>
    </>
  );
}
