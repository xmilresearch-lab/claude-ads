import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = { title: "Content Queue — Automate" };

export default function ContentPage() {
  return (
    <>
      <PageHeader
        title="Content Queue"
        description="Review and approve AI-generated content before publishing"
      />
      <div className="card-command p-8 text-center text-text-muted text-sm">
        Content queue — Sprint F5
      </div>
    </>
  );
}
