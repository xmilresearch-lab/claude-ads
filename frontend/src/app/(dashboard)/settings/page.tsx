import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = { title: "Settings — Automate" };

export default function SettingsPage() {
  return (
    <>
      <PageHeader
        title="Settings"
        description="Workspace configuration and preferences"
      />
      <div className="card-command p-8 text-center text-text-muted text-sm">
        Settings — Sprint F7
      </div>
    </>
  );
}
