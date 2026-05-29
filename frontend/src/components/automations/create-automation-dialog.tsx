"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useCreateAutomation, useUpdateAutomation } from "@/lib/hooks/use-automations";
import { cn } from "@/lib/utils/cn";
import type { AutomationResponse, AutomationType } from "@/lib/api/types";

const TYPE_OPTIONS: { value: AutomationType; label: string; hint: string }[] = [
  { value: "social_post",    label: "Social Post",     hint: "Post to Twitter, LinkedIn, or Instagram on a schedule." },
  { value: "email_campaign", label: "Email Campaign",  hint: "Send emails via Gmail or SendGrid." },
  { value: "support_reply",  label: "Support Reply",   hint: "Auto-reply to Zendesk tickets with AI." },
  { value: "crm_update",     label: "CRM Update",      hint: "Update HubSpot or Salesforce records." },
  { value: "scheduled",      label: "Scheduled",       hint: "Run a custom workflow on a cron schedule." },
];

const CRON_EXAMPLES = [
  "0 9 * * 1-5  — weekdays at 9 am",
  "0 */6 * * *  — every 6 hours",
  "0 9 * * 1    — every Monday at 9 am",
];

const schema = z.object({
  name: z.string().min(1, "Name is required").max(120),
  type: z.enum(["social_post", "email_campaign", "support_reply", "crm_update", "scheduled"]),
  schedule: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: AutomationResponse;
}

export function CreateAutomationDialog({ open, onOpenChange, initial }: Props) {
  const isEdit = !!initial;
  const { mutateAsync: create, isPending: isCreating } = useCreateAutomation();
  const { mutateAsync: update, isPending: isUpdating } = useUpdateAutomation();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      type: "social_post",
      schedule: "",
    },
  });

  useEffect(() => {
    if (open) {
      reset(
        initial
          ? { name: initial.name, type: initial.type, schedule: initial.schedule ?? "" }
          : { name: "", type: "social_post", schedule: "" },
      );
    }
  }, [open, initial, reset]);

  const selectedType = watch("type");
  const typeHint = TYPE_OPTIONS.find((t) => t.value === selectedType)?.hint ?? "";
  const isBusy = isSubmitting || isCreating || isUpdating;

  const onSubmit = async (data: FormData) => {
    const payload = {
      name: data.name,
      type: data.type,
      schedule: data.schedule || null,
    };
    if (isEdit && initial) {
      await update({ id: initial.id, payload });
    } else {
      await create(payload);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Automation" : "New Automation"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update this automation's name, type, or schedule."
              : "Configure a new AI-powered automation workflow."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="px-5 pb-4 space-y-4">
            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="auto-name" className="text-xs text-text-muted">Name</Label>
              <Input
                id="auto-name"
                placeholder="e.g. Daily LinkedIn post"
                {...register("name")}
              />
              {errors.name && (
                <p className="text-2xs font-mono text-danger">{errors.name.message}</p>
              )}
            </div>

            {/* Type */}
            <div className="space-y-1.5">
              <Label className="text-xs text-text-muted">Type</Label>
              <div className="grid grid-cols-1 gap-1.5">
                {TYPE_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className={cn(
                      "flex items-center gap-3 rounded border px-3 py-2 cursor-pointer transition-colors",
                      selectedType === opt.value
                        ? "border-amber/50 bg-amber/5 text-text-primary"
                        : "border-border bg-bg-surface text-text-secondary hover:border-border-strong",
                    )}
                  >
                    <input
                      type="radio"
                      value={opt.value}
                      className="sr-only"
                      {...register("type")}
                    />
                    <span className={cn(
                      "h-2 w-2 rounded-full flex-shrink-0",
                      selectedType === opt.value ? "bg-amber" : "bg-border-strong",
                    )} />
                    <span className="text-xs font-medium">{opt.label}</span>
                  </label>
                ))}
              </div>
              {typeHint && (
                <p className="text-2xs text-text-muted pl-1">{typeHint}</p>
              )}
            </div>

            {/* Schedule */}
            <div className="space-y-1.5">
              <Label htmlFor="auto-schedule" className="text-xs text-text-muted">
                Schedule
                <span className="ml-1 font-mono text-text-muted">(cron, optional)</span>
              </Label>
              <Input
                id="auto-schedule"
                placeholder="0 9 * * 1-5"
                {...register("schedule")}
              />
              <div className="space-y-0.5">
                {CRON_EXAMPLES.map((ex) => (
                  <p key={ex} className="text-2xs font-mono text-text-muted pl-1">{ex}</p>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isBusy}>
              {isBusy ? "Saving…" : isEdit ? "Save changes" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
