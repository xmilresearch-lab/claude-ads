"use client";

import { useState } from "react";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { useWorkspace } from "@/lib/hooks/use-workspace";

function DeleteWorkspaceDialog({
  open,
  workspaceName,
  onOpenChange,
}: {
  open: boolean;
  workspaceName: string;
  onOpenChange: (open: boolean) => void;
}) {
  const [confirmValue, setConfirmValue] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const matches = confirmValue === workspaceName;

  const handleConfirm = async () => {
    if (!matches) return;
    setIsDeleting(true);
    try {
      // Stub — backend hotfix sprint will add /auth/delete-account
      console.info("[danger] delete-account requested for workspace:", workspaceName);
      toast.info("Account deletion coming soon");
      onOpenChange(false);
    } finally {
      setIsDeleting(false);
      setConfirmValue("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete workspace permanently?</DialogTitle>
          <DialogDescription>
            This will permanently delete{" "}
            <span className="font-mono text-text-primary">{workspaceName}</span>,
            all automations, integrations, content, and audit logs.
            This cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="px-5 pb-2 space-y-2">
          <p className="text-xs text-text-muted">
            Type your workspace name to confirm:
          </p>
          <Input
            value={confirmValue}
            onChange={(e) => setConfirmValue(e.target.value)}
            placeholder={workspaceName}
            autoComplete="off"
            spellCheck={false}
          />
          {confirmValue && !matches && (
            <p className="text-2xs font-mono text-danger">Name doesn't match</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="secondary" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="sm"
            disabled={!matches || isDeleting}
            onClick={handleConfirm}
          >
            {isDeleting ? "Deleting…" : "Delete workspace"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function DangerPage() {
  const { data: workspace } = useWorkspace();
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <PageHeader
        title="Danger Zone"
        description="Irreversible and destructive actions"
        breadcrumb={[{ label: "Settings" }, { label: "Danger Zone" }]}
      />
      <div className="p-6 max-w-2xl">
        <div className="rounded-md border border-danger/30 bg-danger/5 p-6">
          <div className="flex items-start gap-3 mb-5">
            <AlertTriangle className="h-5 w-5 shrink-0 text-danger mt-0.5" />
            <div>
              <h2 className="font-display text-sm font-semibold text-text-primary mb-1">
                Delete Workspace
              </h2>
              <p className="text-sm text-text-secondary">
                Permanently delete your workspace, all automations, integrations, and content.
                This cannot be undone.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="border-danger text-danger hover:bg-danger/10 hover:border-danger hover:text-danger"
            onClick={() => setDialogOpen(true)}
          >
            Delete workspace
          </Button>
        </div>
      </div>

      <DeleteWorkspaceDialog
        open={dialogOpen}
        workspaceName={workspace?.name ?? ""}
        onOpenChange={setDialogOpen}
      />
    </>
  );
}
