"use client";

import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ProviderIcon } from "./ProviderIcon";
import { PROVIDER_CONFIGS } from "@/lib/integrations/providers";
import { useConnectApiKey } from "@/hooks/useIntegrations";

interface APIKeyModalProps {
  provider: string | null;
  onClose: () => void;
}

type FormValues = Record<string, string>;

export function APIKeyModal({ provider, onClose }: APIKeyModalProps) {
  const config = provider ? PROVIDER_CONFIGS[provider] : null;
  const { mutateAsync: connectApiKey, isPending, error, reset: resetMutation } = useConnectApiKey();

  const schema = useMemo(() => {
    const shape: Record<string, z.ZodTypeAny> = {
      api_key: z.string().min(10, "API key must be at least 10 characters"),
    };
    for (const field of config?.extraFields ?? []) {
      shape[field.key] = field.required
        ? z.string().min(1, `${field.label} is required`)
        : z.string().optional() as z.ZodTypeAny;
    }
    return z.object(shape);
  }, [config]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (provider) {
      reset();
      resetMutation();
    }
  }, [provider, reset, resetMutation]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  if (!provider || !config) return null;

  const onSubmit = async (data: FormValues) => {
    const { api_key, ...rest } = data;
    try {
      await connectApiKey({
        provider,
        api_key,
        extra_fields: Object.keys(rest).length > 0 ? rest : undefined,
      });
      toast.success(`${config.name} connected successfully`);
      onClose();
    } catch {
      // error displayed via mutation state
    }
  };

  const apiError = error instanceof Error ? error.message : null;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="relative bg-[#0D0E14] border border-[#1E2330] rounded-[6px] w-full max-w-md mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#6B7280] hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2.5 mb-5">
          <ProviderIcon provider={provider} size="md" />
          <span className="font-display text-base font-semibold text-white">{config.name}</span>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="text-xs font-mono text-[#9CA3AF] mb-1 block">API Key</label>
            <input
              type="password"
              placeholder="sk-…"
              className="input-command w-full px-3 py-2 rounded-[4px]"
              {...register("api_key")}
            />
            {errors.api_key && (
              <p className="text-xs text-red-400 mt-1">{errors.api_key.message}</p>
            )}
          </div>

          {config.extraFields?.map((field) => (
            <div key={field.key}>
              <label className="text-xs font-mono text-[#9CA3AF] mb-1 block">{field.label}</label>
              <input
                type="text"
                placeholder={field.placeholder}
                className="input-command w-full px-3 py-2 rounded-[4px]"
                {...register(field.key)}
              />
              {errors[field.key] && (
                <p className="text-xs text-red-400 mt-1">{errors[field.key]?.message}</p>
              )}
            </div>
          ))}

          {apiError && (
            <p className="text-xs text-red-400 mt-3 text-center">{apiError}</p>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="w-full bg-amber-500 hover:bg-amber-400 text-black text-sm font-medium py-2 rounded-[4px] mt-4 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            {isPending ? "Connecting…" : "Connect"}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="text-xs text-[#6B7280] hover:text-white text-center mt-2 cursor-pointer block w-full transition-colors"
          >
            Cancel
          </button>
        </form>
      </div>
    </div>
  );
}
