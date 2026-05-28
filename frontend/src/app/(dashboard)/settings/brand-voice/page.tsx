"use client";

import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Trash2, Zap } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  useBrandVoice,
  useSetBrandVoice,
  useDeleteBrandVoice,
} from "@/lib/hooks/use-workspace";
import { cn } from "@/lib/utils/cn";

const schema = z.object({
  tone: z.string().min(1, "Required"),
  industry: z.string().min(1, "Required"),
  target_audience: z.string().min(1, "Required"),
  avoid: z.string(),
  examples: z.string(),
});
type FormData = z.infer<typeof schema>;

function toArray(s: string): string[] {
  return s.split(",").map((v) => v.trim()).filter(Boolean);
}

function fromArray(arr: string[]): string {
  return arr.join(", ");
}

function LivePreview({ control }: { control: ReturnType<typeof useForm<FormData>>["control"] }) {
  const values = useWatch({ control });
  const avoidList = toArray(values.avoid ?? "");
  const exampleList = toArray(values.examples ?? "");
  const hasContent = values.tone || values.industry || values.target_audience
    || avoidList.length > 0 || exampleList.length > 0;

  return (
    <div className="card-command p-5 space-y-4 h-fit">
      <p className="text-2xs font-mono text-text-muted uppercase tracking-widest">Live Preview</p>

      {!hasContent ? (
        <p className="text-xs text-text-muted">Fill in the form to see a preview.</p>
      ) : (
        <>
          {values.tone && (
            <div className="space-y-0.5">
              <p className="text-2xs text-text-muted uppercase tracking-wide">Tone</p>
              <p className="text-sm font-mono text-amber">{values.tone}</p>
            </div>
          )}

          {(values.industry || values.target_audience) && (
            <div className="flex gap-6">
              {values.industry && (
                <div className="space-y-0.5">
                  <p className="text-2xs text-text-muted uppercase tracking-wide">Industry</p>
                  <p className="text-xs font-mono text-text-primary">{values.industry}</p>
                </div>
              )}
              {values.target_audience && (
                <div className="space-y-0.5">
                  <p className="text-2xs text-text-muted uppercase tracking-wide">Audience</p>
                  <p className="text-xs font-mono text-text-primary">{values.target_audience}</p>
                </div>
              )}
            </div>
          )}

          {avoidList.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-2xs text-text-muted uppercase tracking-wide">Won&apos;t use</p>
              <div className="flex flex-wrap gap-1">
                {avoidList.map((word, i) => (
                  <span
                    key={i}
                    className="rounded-sm border border-danger/20 bg-danger/10 px-1.5 py-0.5 text-2xs font-mono text-danger"
                  >
                    {word}
                  </span>
                ))}
              </div>
            </div>
          )}

          {exampleList.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-2xs text-text-muted uppercase tracking-wide">
                Example{exampleList.length > 1 ? ` (1 of ${exampleList.length})` : ""}
              </p>
              <blockquote className="border-l-2 border-amber/40 pl-3 text-xs italic text-text-secondary">
                &ldquo;{exampleList[0]}&rdquo;
              </blockquote>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function BrandVoicePage() {
  const { data: brandVoice, isLoading } = useBrandVoice();
  const { mutateAsync: save, isPending: isSaving } = useSetBrandVoice();
  const { mutateAsync: remove, isPending: isDeleting } = useDeleteBrandVoice();

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { tone: "", industry: "", target_audience: "", avoid: "", examples: "" },
  });
  const { register, handleSubmit, reset, control, formState: { errors, isDirty, isSubmitting } } = form;

  useEffect(() => {
    if (brandVoice) {
      reset({
        tone: brandVoice.tone,
        industry: brandVoice.industry,
        target_audience: brandVoice.target_audience,
        avoid: fromArray(brandVoice.avoid),
        examples: fromArray(brandVoice.examples),
      });
    }
  }, [brandVoice, reset]);

  const onSubmit = async (data: FormData) => {
    await save({
      tone: data.tone,
      industry: data.industry,
      target_audience: data.target_audience,
      avoid: toArray(data.avoid),
      examples: toArray(data.examples),
    });
    reset(data);
  };

  const handleDelete = async () => {
    if (!confirm("Remove brand voice? This cannot be undone.")) return;
    await remove();
    reset({ tone: "", industry: "", target_audience: "", avoid: "", examples: "" });
  };

  if (isLoading) {
    return (
      <>
        <PageHeader
          title="Brand Voice"
          description="Define how your AI writes"
          breadcrumb={[{ label: "Settings" }, { label: "Brand Voice" }]}
        />
        <div className="p-6">
          <div className="card-command p-6 animate-pulse h-64" />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Brand Voice"
        description="Define how your AI writes — tone, style, and audience"
        breadcrumb={[{ label: "Settings" }, { label: "Brand Voice" }]}
      />
      <div className="p-6">
        {!brandVoice && (
          <div className="mb-4 flex items-center gap-2 rounded-md border border-amber/20 bg-amber/5 px-4 py-3 max-w-4xl">
            <Zap className="h-4 w-4 shrink-0 text-amber" />
            <p className="text-sm text-text-secondary">
              No brand voice configured. Fill in the form below to enable AI-powered style consistency.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_280px] max-w-4xl">
          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className={cn(
              "card-command p-6 transition-colors duration-150",
              isDirty && "border-amber/30",
            )}>
              <div className="space-y-5">
                <div className="space-y-1.5">
                  <Label htmlFor="tone" className="text-xs text-text-muted">Tone</Label>
                  <Input id="tone" placeholder="e.g. Professional yet approachable" {...register("tone")} />
                  {errors.tone && <p className="text-2xs font-mono text-danger">{errors.tone.message}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="industry" className="text-xs text-text-muted">Industry</Label>
                  <Input id="industry" placeholder="e.g. SaaS, E-commerce, Healthcare" {...register("industry")} />
                  {errors.industry && <p className="text-2xs font-mono text-danger">{errors.industry.message}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="audience" className="text-xs text-text-muted">Target Audience</Label>
                  <Input id="audience" placeholder="e.g. B2B decision-makers, 30-50" {...register("target_audience")} />
                  {errors.target_audience && (
                    <p className="text-2xs font-mono text-danger">{errors.target_audience.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="avoid" className="text-xs text-text-muted">
                    Words / Phrases to Avoid
                    <span className="ml-1 font-mono text-text-muted">(comma-separated)</span>
                  </Label>
                  <Input id="avoid" placeholder="synergy, leverage, disruptive" {...register("avoid")} />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="examples" className="text-xs text-text-muted">
                    Example Posts
                    <span className="ml-1 font-mono text-text-muted">(comma-separated)</span>
                  </Label>
                  <textarea
                    id="examples"
                    rows={4}
                    placeholder={"Excited to announce…, Today we're launching…"}
                    className={cn(
                      "flex w-full rounded bg-bg-surface border border-border px-3 py-2",
                      "text-sm text-text-primary placeholder:text-text-muted font-mono",
                      "focus:outline-none focus:border-amber",
                      "transition-all duration-150 resize-none",
                    )}
                    {...register("examples")}
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-3">
                    {isDirty && (
                      <p className="text-2xs font-mono text-amber">Unsaved changes</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {brandVoice && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={isDeleting}
                        onClick={handleDelete}
                        className="text-danger hover:text-danger"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        {isDeleting ? "Removing…" : "Remove"}
                      </Button>
                    )}
                    <Button
                      type="submit"
                      size="sm"
                      disabled={!isDirty || isSubmitting || isSaving}
                    >
                      {isSubmitting || isSaving ? "Saving…" : brandVoice ? "Save" : "Create"}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </form>

          {/* Live preview */}
          <LivePreview control={control} />
        </div>
      </div>
    </>
  );
}
