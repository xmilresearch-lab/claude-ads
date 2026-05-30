"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useWorkspace } from "@/lib/hooks/use-workspace";
import { useAuth } from "@/lib/hooks/use-auth";

const ONBOARDING_SESSION_KEY = "onboarding_redirected";

export function useOnboardingStatus() {
  const { data: workspace } = useWorkspace();

  const steps = {
    workspaceNamed:   !!workspace?.name,
    brandVoiceSet:    !!workspace?.brand_voice,
    integrationAdded: (workspace?.integrations_count ?? 0) > 0,
  };

  const completedCount = Object.values(steps).filter(Boolean).length;
  const isComplete = completedCount === 3;
  const progressPercent = (completedCount / 3) * 100;

  return { steps, isComplete, completedCount, progressPercent, workspace };
}

export function useOnboardingRedirect() {
  const { isComplete } = useOnboardingStatus();
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading || !isAuthenticated) return;
    if (isComplete) return;
    if (pathname.startsWith("/settings")) return;
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(ONBOARDING_SESSION_KEY)) return;

    sessionStorage.setItem(ONBOARDING_SESSION_KEY, "1");
    router.push("/settings/onboarding");
  }, [isComplete, isAuthenticated, isLoading, pathname, router]);
}
