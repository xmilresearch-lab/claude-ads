"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { useOnboardingStatus } from "@/lib/hooks/use-onboarding";

const DISMISSED_KEY = "onboarding_dismissed";

export function OnboardingBanner() {
  const pathname = usePathname();
  const { isComplete, completedCount, progressPercent } = useOnboardingStatus();

  const [dismissed, setDismissed] = useState(() =>
    typeof window !== "undefined" && !!sessionStorage.getItem(DISMISSED_KEY)
  );

  const onSettings = pathname.startsWith("/settings");

  if (isComplete || dismissed || onSettings) return null;

  return (
    <div className="fixed bottom-4 left-[256px] right-4 z-50">
      <div className="flex items-center gap-3 rounded-md border border-amber/30 bg-bg-surface px-4 py-3 shadow-lg shadow-amber/5">
        {/* Progress section */}
        <div className="flex flex-1 flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-text-secondary">
              {completedCount}/3 steps complete
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-bg-elevated">
            <div
              className="h-full rounded-full bg-amber transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* CTA */}
        <Link
          href="/settings/onboarding"
          className="shrink-0 rounded border border-amber/40 bg-amber/10 px-3 py-1 text-xs font-medium text-amber transition-colors hover:bg-amber/20"
        >
          Complete setup →
        </Link>

        {/* Dismiss */}
        <button
          onClick={() => {
            sessionStorage.setItem(DISMISSED_KEY, "1");
            setDismissed(true);
          }}
          className="shrink-0 rounded p-0.5 text-text-muted transition-colors hover:text-text-primary"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
