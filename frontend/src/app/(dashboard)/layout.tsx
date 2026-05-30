import { DashboardShell } from "@/components/layout/dashboard-shell";
import { OnboardingBanner } from "@/components/layout/onboarding-banner";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <DashboardShell>{children}</DashboardShell>
      <OnboardingBanner />
    </>
  );
}
