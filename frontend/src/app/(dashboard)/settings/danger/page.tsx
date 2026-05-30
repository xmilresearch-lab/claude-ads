import { AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";

export default function DangerPage() {
  return (
    <>
      <PageHeader
        title="Danger Zone"
        description="Irreversible and destructive actions"
        breadcrumb={[{ label: "Settings" }, { label: "Danger Zone" }]}
      />
      <div className="p-6 max-w-2xl">
        <div className="rounded-md border border-border bg-bg-surface p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0 text-text-muted mt-0.5" />
            <div>
              <h2 className="font-display text-sm font-semibold text-text-primary mb-1">
                Workspace Deletion
              </h2>
              <p className="text-sm text-text-secondary">
                To permanently delete your workspace and all associated data,
                contact support at{" "}
                <a
                  href="mailto:XMiLResearch@gmail.com"
                  className="text-amber underline underline-offset-2"
                >
                  XMiLResearch@gmail.com
                </a>
                . Deletion requests are processed within 5 business days.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
