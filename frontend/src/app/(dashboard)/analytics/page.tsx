import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = { title: "Analytics — Automate" };

export default function AnalyticsPage() {
  return (
    <>
      <PageHeader
        title="Analytics"
        description="Run metrics, token usage, and platform performance"
      />
      <div className="card-command p-8 text-center text-text-muted text-sm">
        Analytics dashboard — Sprint F6
      </div>
    </>
  );
}
