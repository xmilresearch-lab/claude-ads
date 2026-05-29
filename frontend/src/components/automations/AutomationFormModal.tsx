"use client";

import { useEffect, useRef, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X } from "lucide-react";
import { toast } from "sonner";
import { cronToHuman, validateCron, CRON_PRESETS } from "@/lib/cron";
import { PLATFORM_CONFIGS } from "@/lib/automations/platforms";
import { useCreateAutomation, useUpdateAutomation } from "@/hooks/useAutomations";
import { useIntegrations } from "@/hooks/useIntegrations";
import type { Automation, AutomationPlatform } from "@/lib/api/automations";
import { cn } from "@/lib/utils/cn";

interface AutomationFormModalProps {
  open: boolean;
  automation?: Automation;
  onClose: () => void;
}

const PLATFORMS: AutomationPlatform[] = ["social", "email", "support", "crm"];

const schema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters").max(80),
  description: z.string().max(200).optional(),
  platform: z.enum(["social", "email", "support", "crm"]),
  cron_expression: z.string().refine(
    (val) => validateCron(val) === null,
    (val) => ({ message: validateCron(val) ?? "Invalid cron expression" }),
  ),
  integration_id: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export function AutomationFormModal({ open, automation, onClose }: AutomationFormModalProps) {
  const isEdit = !!automation;
  const [apiError, setApiError] = useState<string | null>(null);
  const cronInputRef = useRef<HTMLInputElement | null>(null);

  const createMutation = useCreateAutomation();
  const updateMutation = useUpdateAutomation();
  const { data: integrations = [] } = useIntegrations();
  const activeIntegrations = integrations.filter((i) => i.status === "active");

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      description: "",
      platform: "social",
      cron_expression: "0 9 * * *",
      integration_id: "",
    },
  });

  const cronValue = watch("cron_expression");
  const selectedPreset = CRON_PRESETS.find((p) => p.value === cronValue && p.value !== "");

  useEffect(() => {
    if (!open) return;
    setApiError(null);
    reset(
      automation
        ? {
            name: automation.name,
            description: automation.description ?? "",
            platform: automation.platform,
            cron_expression: automation.cron_expression,
            integration_id: automation.integration_id ?? "",
          }
        : {
            name: "",
            description: "",
            platform: "social",
            cron_expression: "0 9 * * *",
            integration_id: "",
          },
    );
  }, [open, automation, reset]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const onSubmit = async (values: FormValues) => {
    setApiError(null);
    try {
      const payload = {
        name: values.name,
        description: values.description || undefined,
        platform: values.platform,
        cron_expression: values.cron_expression,
        config: {},
        integration_id: values.integration_id || undefined,
      };
      if (isEdit && automation) {
        await updateMutation.mutateAsync({ id: automation.id, payload });
        toast.success("Automation updated");
      } else {
        await createMutation.mutateAsync(payload);
        toast.success("Automation created");
      }
      onClose();
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="relative bg-[#0D0E14] border border-[#1E2330] rounded-[6px] w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-[#1E2330] flex justify-between items-center">
          <h2 className="font-display text-base font-semibold text-white">
            {isEdit ? "Edit Automation" : "Create Automation"}
          </h2>
          <button
            onClick={onClose}
            className="text-[#6B7280] hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="px-6 py-5 space-y-5">
            {/* Name */}
            <div>
              <label className="text-xs font-mono text-[#9CA3AF] mb-1 block">
                Automation Name
              </label>
              <input
                type="text"
                placeholder="e.g. Daily LinkedIn post"
                className="input-command w-full px-3 py-2 rounded-[4px]"
                {...register("name")}
              />
              {errors.name && (
                <p className="text-xs text-red-400 mt-1">{errors.name.message}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="text-xs font-mono text-[#9CA3AF] mb-1 block">
                Description
              </label>
              <textarea
                rows={3}
                placeholder="What does this automation do?"
                className="input-command w-full px-3 py-2 rounded-[4px] resize-none"
                {...register("description")}
              />
              {errors.description && (
                <p className="text-xs text-red-400 mt-1">{errors.description.message}</p>
              )}
            </div>

            {/* Platform */}
            <div>
              <label className="text-xs font-mono text-[#9CA3AF] mb-1 block">
                Platform
              </label>
              <Controller
                name="platform"
                control={control}
                render={({ field }) => (
                  <div className="grid grid-cols-4 gap-1.5 bg-[#060709] p-1 rounded-[6px]">
                    {PLATFORMS.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => field.onChange(p)}
                        className={cn(
                          "px-2 py-2 rounded-[4px] text-xs font-mono transition-colors",
                          field.value === p
                            ? "bg-[#0D0E14] border border-[#1E2330] text-white"
                            : "text-[#6B7280] hover:text-white",
                        )}
                      >
                        {PLATFORM_CONFIGS[p].label}
                      </button>
                    ))}
                  </div>
                )}
              />
              {errors.platform && (
                <p className="text-xs text-red-400 mt-1">{errors.platform.message}</p>
              )}
            </div>

            {/* Schedule */}
            <div>
              <div className="flex items-center mb-1">
                <label className="text-xs font-mono text-[#9CA3AF]">Schedule</label>
                {cronValue && (
                  <span className="text-xs text-amber-400 ml-2">
                    {cronToHuman(cronValue)}
                  </span>
                )}
              </div>

              {/* Preset chips */}
              <div className="flex gap-1.5 overflow-x-auto pb-2 mb-2 scrollbar-none">
                {CRON_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      setValue("cron_expression", preset.value, { shouldValidate: true });
                      if (preset.value === "") {
                        setTimeout(() => cronInputRef.current?.focus(), 0);
                      }
                    }}
                    className={cn(
                      "shrink-0 px-2.5 py-1 text-[11px] font-mono rounded-[3px] border transition-colors",
                      selectedPreset?.label === preset.label || (preset.value === "" && !selectedPreset && cronValue === "")
                        ? "border-amber-500/50 text-amber-400 bg-amber-500/10"
                        : "border-[#1E2330] text-[#6B7280] bg-transparent hover:text-white",
                    )}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {/* Cron input */}
              <input
                type="text"
                placeholder="0 9 * * *"
                className="input-command w-full px-3 py-2 rounded-[4px] font-mono"
                {...register("cron_expression")}
                ref={(el) => {
                  register("cron_expression").ref(el);
                  cronInputRef.current = el;
                }}
              />
              {errors.cron_expression && (
                <p className="text-xs text-red-400 mt-1">{errors.cron_expression.message}</p>
              )}
            </div>

            {/* Integration */}
            <div>
              <label className="text-xs font-mono text-[#9CA3AF] mb-1 block">
                Connected Integration (optional)
              </label>
              <select
                className="input-command w-full px-3 py-2 rounded-[4px]"
                {...register("integration_id")}
              >
                <option value="">None — run without integration</option>
                {activeIntegrations.map((integration) => (
                  <option key={integration.id} value={integration.id}>
                    {integration.provider}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-[#1E2330] flex flex-col gap-2">
            {apiError && (
              <p className="text-xs text-red-400 text-center">{apiError}</p>
            )}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs text-[#6B7280] hover:text-white border border-[#1E2330] rounded-[4px] transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || createMutation.isPending || updateMutation.isPending}
                className="px-4 py-2 text-xs font-medium bg-amber-500 hover:bg-amber-400 text-black rounded-[4px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting || createMutation.isPending || updateMutation.isPending
                  ? "Saving…"
                  : isEdit
                    ? "Save Changes"
                    : "Create Automation"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
