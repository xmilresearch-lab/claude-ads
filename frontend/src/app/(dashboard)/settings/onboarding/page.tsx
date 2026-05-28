"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Circle } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { useOnboardingStatus } from "@/lib/hooks/use-onboarding";
import { cn } from "@/lib/utils/cn";

const STEPS = [
  {
    key: "workspaceNamed" as const,
    title: "Name your workspace",
    description: "Give your workspace a display name.",
    href: "/settings/workspace",
    cta: "Go to Workspace →",
  },
  {
    key: "brandVoiceSet" as const,
    title: "Configure brand voice",
    description: "Define how your AI writes — tone, audience, and examples.",
    href: "/settings/brand-voice",
    cta: "Set up Brand Voice →",
  },
  {
    key: "integrationAdded" as const,
    title: "Connect an integration",
    description: "Link Twitter, Gmail, HubSpot, or another platform.",
    href: "/integrations",
    cta: "Add Integration →",
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { steps, isComplete, completedCount, progressPercent } = useOnboardingStatus();

  useEffect(() => {
    if (!isComplete) return;
    const timer = setTimeout(() => router.push("/automations"), 1500);
    return () => clearTimeout(timer);
  }, [isComplete, router]);

  return (
    <>
      <PageHeader
        title="Getting Started"
        description="Complete these steps to unlock the full platform"
        breadcrumb={[{ label: "Settings" }, { label: "Onboarding" }]}
      />
      <div className="p-6 max-w-2xl">
        {/* Progress summary */}
        <div className="card-command mb-6 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-text-primary">
              {isComplete ? "Setup complete!" : `${completedCount} of 3 steps complete`}
            </span>
            <span className="font-mono text-xs text-amber">{progressPercent.toFixed(0)}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-bg-elevated">
            <div
              className="h-full rounded-full bg-amber transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          {isComplete && (
            <p className="mt-3 text-sm text-success">
              All steps complete — redirecting to your dashboard…
            </p>
          )}
        </div>

        {/* Steps */}
        <div className="space-y-3">
          {STEPS.map((step, i) => {
            const done = steps[step.key];
            return (
              <div
                key={step.key}
                className={cn(
                  "card-command p-5 flex items-start gap-4",
                  done && "opacity-60",
                )}
              >
                <div className="mt-0.5 shrink-0">
                  {done ? (
                    <CheckCircle2 className="h-5 w-5 text-success" />
                  ) : (
                    <Circle className="h-5 w-5 text-text-muted" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-mono text-2xs text-text-muted">Step {i + 1}</span>
                    {done && (
                      <span className="font-mono text-2xs text-success">Done</span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-text-primary">{step.title}</p>
                  <p className="text-xs text-text-muted mt-0.5">{step.description}</p>
                </div>
                {!done && (
                  <Link
                    href={step.href}
                    className="shrink-0 text-xs font-medium text-amber hover:underline whitespace-nowrap"
                  >
                    {step.cta}
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
