"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Check } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useWorkspace, useUpdateWorkspace, useUpdateSettings } from "@/lib/hooks/use-workspace";
import { TIMEZONES, TIMEZONE_GROUPS } from "@/lib/utils/timezones";
import { cn } from "@/lib/utils/cn";

const workspaceSchema = z.object({
  name: z.string().min(1, "Workspace name is required").max(80),
});
type WorkspaceForm = z.infer<typeof workspaceSchema>;

const settingsSchema = z.object({
  default_timezone: z.string(),
  require_approval_default: z.boolean(),
  notification_email: z.string().email("Invalid email").or(z.literal("")).nullable(),
  content_language: z.string().min(1),
});
type SettingsForm = z.infer<typeof settingsSchema>;

function WorkspaceNameCard() {
  const { data: workspace } = useWorkspace();
  const { mutateAsync, isPending } = useUpdateWorkspace();
  const [saved, setSaved] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<WorkspaceForm>({
    resolver: zodResolver(workspaceSchema),
    defaultValues: { name: "" },
  });

  useEffect(() => {
    if (workspace?.name) reset({ name: workspace.name });
  }, [workspace?.name, reset]);

  const onSubmit = async (data: WorkspaceForm) => {
    await mutateAsync({ name: data.name });
    reset({ name: data.name });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const nameProps = register("name");

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    nameProps.onBlur(e);
    if (isDirty) handleSubmit(onSubmit)();
  };

  const isBusy = isSubmitting || isPending;

  return (
    <div className={cn(
      "card-command p-6 transition-colors duration-150",
      isDirty && !isBusy && "border-amber/30",
    )}>
      <h2 className="font-display text-sm font-semibold text-text-primary mb-4">
        Workspace
      </h2>
      <div className="space-y-4 max-w-md">
        <div className="space-y-1.5">
          <Label className="text-xs text-text-muted">Workspace ID</Label>
          <p className="font-mono text-xs text-amber">{workspace?.id ?? "—"}</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ws-name" className="text-xs text-text-muted">Display Name</Label>
          <div className="relative">
            <Input
              id="ws-name"
              placeholder="My Workspace"
              {...nameProps}
              onBlur={handleBlur}
              className={cn(isBusy && "pr-8")}
            />
            {isBusy && (
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-2xs font-mono text-text-muted">
                Saving…
              </span>
            )}
            {saved && !isBusy && (
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2">
                <Check className="h-3.5 w-3.5 text-success" />
              </span>
            )}
          </div>
          {errors.name && (
            <p className="text-2xs font-mono text-danger">{errors.name.message}</p>
          )}
          <p className="text-2xs text-text-muted">Saves automatically when you leave this field.</p>
        </div>
      </div>
    </div>
  );
}

function PreferencesCard() {
  const { data: workspace } = useWorkspace();
  const { mutateAsync, isPending } = useUpdateSettings();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<SettingsForm>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      default_timezone: "UTC",
      require_approval_default: true,
      notification_email: "",
      content_language: "en",
    },
  });

  useEffect(() => {
    const s = workspace?.settings;
    if (s) {
      reset({
        default_timezone: s.default_timezone ?? "UTC",
        require_approval_default: s.require_approval_default ?? true,
        notification_email: s.notification_email ?? "",
        content_language: s.content_language ?? "en",
      });
    }
  }, [workspace?.settings, reset]);

  const onSubmit = async (data: SettingsForm) => {
    await mutateAsync({
      default_timezone: data.default_timezone,
      require_approval_default: data.require_approval_default,
      notification_email: data.notification_email || null,
      content_language: data.content_language,
    });
    reset(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className={cn(
        "card-command p-6 transition-colors duration-150",
        isDirty && "border-amber/30",
      )}>
        <h2 className="font-display text-sm font-semibold text-text-primary mb-4">
          Preferences
        </h2>
        <div className="space-y-5 max-w-md">
          {/* Timezone */}
          <div className="space-y-1.5">
            <Label htmlFor="timezone" className="text-xs text-text-muted">Default Timezone</Label>
            <select
              id="timezone"
              className={cn(
                "flex h-9 w-full rounded bg-bg-surface border border-border px-3 py-1",
                "text-sm text-text-primary font-mono",
                "focus:outline-none focus:border-amber",
                "transition-colors duration-150",
              )}
              {...register("default_timezone")}
            >
              {TIMEZONE_GROUPS.map((group) => (
                <optgroup key={group} label={group}>
                  {TIMEZONES.filter((tz) => tz.group === group).map((tz) => (
                    <option key={tz.value} value={tz.value}>{tz.label}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {/* Content language */}
          <div className="space-y-1.5">
            <Label htmlFor="lang" className="text-xs text-text-muted">Content Language</Label>
            <Input id="lang" placeholder="en" {...register("content_language")} />
            {errors.content_language && (
              <p className="text-2xs font-mono text-danger">{errors.content_language.message}</p>
            )}
          </div>

          {/* Notification email */}
          <div className="space-y-1.5">
            <Label htmlFor="notif-email" className="text-xs text-text-muted">Notification Email</Label>
            <Input id="notif-email" type="email" placeholder="alerts@company.com" {...register("notification_email")} />
            {errors.notification_email && (
              <p className="text-2xs font-mono text-danger">{errors.notification_email.message}</p>
            )}
          </div>

          {/* Require approval */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-text-primary">Require approval by default</p>
              <p className="text-2xs text-text-muted mt-0.5">
                New automations require manual approval before publishing.
              </p>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                className="peer sr-only"
                {...register("require_approval_default")}
              />
              <div className={cn(
                "h-5 w-9 rounded-full border border-border bg-bg-elevated",
                "peer-checked:bg-amber peer-checked:border-amber",
                "after:absolute after:left-0.5 after:top-0.5",
                "after:h-4 after:w-4 after:rounded-full after:bg-bg-base",
                "after:transition-transform after:duration-150",
                "peer-checked:after:translate-x-4",
                "transition-colors duration-150",
              )} />
            </label>
          </div>

          <div className="flex items-center justify-between pt-2">
            {isDirty && (
              <p className="text-2xs font-mono text-amber">Unsaved changes</p>
            )}
            <Button
              type="submit"
              size="sm"
              disabled={!isDirty || isSubmitting || isPending}
              className="ml-auto"
            >
              {isSubmitting || isPending ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}

export default function WorkspacePage() {
  return (
    <>
      <PageHeader
        title="Workspace"
        description="Manage your workspace name and preferences"
        breadcrumb={[{ label: "Settings" }, { label: "Workspace" }]}
      />
      <div className="p-6 space-y-4 max-w-2xl">
        <WorkspaceNameCard />
        <PreferencesCard />
      </div>
    </>
  );
}
