"use client";

import { useState, useMemo } from "react";
import { WifiOff } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { CardSkeleton } from "@/components/shared/loading-skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { IntegrationCard } from "@/components/integrations/IntegrationCard";
import { APIKeyModal } from "@/components/integrations/APIKeyModal";
import { Button } from "@/components/ui/button";
import { useIntegrations } from "@/hooks/useIntegrations";
import {
  CATEGORY_ORDER,
  CATEGORY_LABELS,
  getProvidersByCategory,
} from "@/lib/integrations/providers";
import type { Integration } from "@/lib/api/integrations";

export default function IntegrationsPage() {
  const [apiKeyModalProvider, setApiKeyModalProvider] = useState<string | null>(null);
  const { data, isLoading, isError, refetch } = useIntegrations();

  const integrationMap = useMemo(
    () =>
      (data ?? []).reduce<Record<string, Integration>>(
        (acc, i) => ({ ...acc, [i.provider]: i }),
        {},
      ),
    [data],
  );

  const connected = data?.filter((i) => i.status === "active").length ?? 0;
  const expiring = data?.filter((i) => i.status === "expiring").length ?? 0;
  const errored = data?.filter((i) => i.status === "error").length ?? 0;

  return (
    <>
      <PageHeader
        title="Integrations"
        subtitle="Connect your tools and platforms to automate workflows"
      />

      <div className="p-6">
        {/* Stat bar */}
        {!isLoading && !isError && (
          <div className="flex gap-6 items-center mb-6">
            <p className="font-mono text-sm">
              <span className={connected > 0 ? "text-[#06B6D4]" : "text-[#6B7280]"}>
                {connected}
              </span>
              <span className="text-[#6B7280] text-xs ml-1">Connected</span>
            </p>
            <p className="font-mono text-sm">
              <span className={expiring > 0 ? "text-amber-400" : "text-[#6B7280]"}>
                {expiring}
              </span>
              <span className="text-[#6B7280] text-xs ml-1">Expiring</span>
            </p>
            <p className="font-mono text-sm">
              <span className={errored > 0 ? "text-red-400" : "text-[#6B7280]"}>
                {errored}
              </span>
              <span className="text-[#6B7280] text-xs ml-1">Errors</span>
            </p>
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from({ length: 7 }).map((_, i) => (
              <CardSkeleton key={i} className="h-24" />
            ))}
          </div>
        )}

        {/* Error */}
        {isError && (
          <div className="card-command">
            <EmptyState
              icon={WifiOff}
              title="Failed to load integrations"
              description="Check your connection and try again"
              action={
                <Button size="sm" onClick={() => refetch()}>
                  Retry
                </Button>
              }
            />
          </div>
        )}

        {/* Category sections */}
        {!isLoading &&
          !isError &&
          CATEGORY_ORDER.map((category, idx) => {
            const providers = getProvidersByCategory(category);
            return (
              <div key={category}>
                <p
                  className={`text-xs font-mono uppercase tracking-widest text-[#6B7280] mb-3 ${
                    idx === 0 ? "mt-2" : "mt-8"
                  }`}
                >
                  {CATEGORY_LABELS[category]}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {providers.map((p) => (
                    <IntegrationCard
                      key={p.id}
                      provider={p.id}
                      integration={integrationMap[p.id]}
                      onApiKeyConnect={setApiKeyModalProvider}
                    />
                  ))}
                </div>
              </div>
            );
          })}
      </div>

      <APIKeyModal
        provider={apiKeyModalProvider}
        onClose={() => setApiKeyModalProvider(null)}
      />
    </>
  );
}
