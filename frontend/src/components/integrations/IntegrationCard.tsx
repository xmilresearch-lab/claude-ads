"use client";

import { Loader2 } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { ProviderIcon } from "./ProviderIcon";
import { PROVIDER_CONFIGS } from "@/lib/integrations/providers";
import { useInitiateOAuth, useDisconnectIntegration } from "@/hooks/useIntegrations";
import type { Integration } from "@/lib/api/integrations";
import { cn } from "@/lib/utils/cn";

interface IntegrationCardProps {
  provider: string;
  integration?: Integration;
  onApiKeyConnect: (provider: string) => void;
}

export function IntegrationCard({ provider, integration, onApiKeyConnect }: IntegrationCardProps) {
  const config = PROVIDER_CONFIGS[provider];
  const { mutate: initiateOAuth, isPending: isOAuthPending } = useInitiateOAuth();
  const { mutate: disconnect, isPending: isDisconnecting } = useDisconnectIntegration();

  const isComingSoon = Boolean(config?.comingSoon);
  const isLoading = isOAuthPending || isDisconnecting;
  const status =
    !integration || integration.status === "disconnected"
      ? "not_connected"
      : integration.status;

  const handleConnect = () => {
    if (config?.authType === "oauth") {
      initiateOAuth(provider);
    } else {
      onApiKeyConnect(provider);
    }
  };

  const handleDisconnect = () => {
    if (!integration) return;
    if (
      window.confirm(
        `Disconnect ${config?.name ?? provider}? This will stop all automations using it.`,
      )
    ) {
      disconnect(integration.id);
    }
  };

  return (
    <div
      className={cn(
        "bg-[#0D0E14] border border-[#1E2330] rounded-[6px] p-4 flex items-start gap-3",
        isComingSoon && "opacity-50",
      )}
    >
      <ProviderIcon provider={provider} size="lg" />

      <div className="flex-1 flex flex-col gap-2 min-w-0">
        {/* Name + description */}
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-display font-semibold text-sm text-white">
              {config?.name ?? provider}
            </p>
            {isComingSoon && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 bg-[#1E2330] text-[#6B7280] rounded-[3px] border border-[#2D3447]">
                Coming Soon
              </span>
            )}
          </div>
          <p className="text-xs text-[#6B7280] mt-0.5">{config?.description}</p>
          {!integration && config?.note && (
            <p className="text-[10px] text-[#6B7280]/70 font-mono mt-1.5 leading-relaxed">{config.note}</p>
          )}
        </div>

        {/* Status badge */}
        {status !== "not_connected" && (
          <div className="inline-flex items-center gap-1.5">
            {status === "active" && (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-mono text-emerald-400">
                  Connected {formatDistanceToNow(new Date(integration!.connected_at))} ago
                </span>
              </>
            )}
            {status === "expiring" && (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                <span className="text-xs font-mono text-amber-400">
                  Expiring soon
                  {integration?.expires_at
                    ? ` — ${format(new Date(integration.expires_at), "MMM d, yyyy")}`
                    : ""}
                </span>
              </>
            )}
            {status === "error" && (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                <span className="text-xs font-mono text-red-400">Connection error</span>
              </>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 flex-wrap">
          {status === "not_connected" && (
            <button
              onClick={handleConnect}
              disabled={isLoading || isComingSoon}
              className="bg-amber-500 hover:bg-amber-400 text-black text-xs font-medium px-3 py-1.5 rounded-[4px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
            >
              {isLoading && <Loader2 className="w-3 h-3 animate-spin" />}
              {config?.authType === "api_key" ? "Add API Key" : "Connect"}
            </button>
          )}

          {(status === "expiring" || status === "error") && (
            <>
              <button
                onClick={handleConnect}
                disabled={isLoading || isComingSoon}
                className="bg-amber-500 hover:bg-amber-400 text-black text-xs font-medium px-3 py-1.5 rounded-[4px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
              >
                {isOAuthPending && <Loader2 className="w-3 h-3 animate-spin" />}
                Reconnect
              </button>
              <button
                onClick={handleDisconnect}
                disabled={isLoading}
                className="text-xs text-[#6B7280] hover:text-red-400 transition-colors underline-offset-2 hover:underline disabled:opacity-50 inline-flex items-center gap-1"
              >
                {isDisconnecting && <Loader2 className="w-3 h-3 animate-spin" />}
                Disconnect
              </button>
            </>
          )}

          {status === "active" && (
            <button
              onClick={handleDisconnect}
              disabled={isLoading}
              className="text-xs text-[#6B7280] hover:text-red-400 transition-colors underline-offset-2 hover:underline disabled:opacity-50 inline-flex items-center gap-1"
            >
              {isDisconnecting && <Loader2 className="w-3 h-3 animate-spin" />}
              Disconnect
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
