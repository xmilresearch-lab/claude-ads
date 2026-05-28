import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export const metadata: Metadata = { title: "Automations — Automate" };

export default function AutomationsPage() {
  return (
    <>
      <PageHeader
        title="Automations"
        description="Define, schedule, and trigger AI-powered automation workflows"
        action={
          <Button size="sm">
            <Plus className="h-4 w-4" />
            New Automation
          </Button>
        }
      />
      <div className="card-command p-8 text-center text-text-muted text-sm">
        Automations list — Sprint F4
      </div>
    </>
  );
}
