"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { ProviderIcon } from "@/components/integrations/ProviderIcon";
import { PROVIDER_CONFIGS } from "@/lib/integrations/providers";
import { completeOAuth } from "@/lib/api/integrations";
import { integrationKeys } from "@/hooks/useIntegrations";

type Status = "loading" | "success" | "error";

function CallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();

  const provider = searchParams.get("provider") ?? "";
  const code = searchParams.get("code") ?? "";
  const state = searchParams.get("state") ?? "";
  const oauthError = searchParams.get("error");

  const [status, setStatus] = useState<Status>(() =>
    oauthError ? "error" : "loading",
  );
  const [errorMessage, setErrorMessage] = useState(() =>
    oauthError ? "Authorization was denied or failed" : "",
  );

  useEffect(() => {
    if (oauthError) return;

    completeOAuth({ provider, code, state })
      .then(() => {
        queryClient.invalidateQueries({ queryKey: integrationKeys.list() });
        setStatus("success");
        setTimeout(() => router.replace("/integrations"), 1500);
      })
      .catch((err: Error) => {
        setStatus("error");
        setErrorMessage(err.message || "Something went wrong");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const config = PROVIDER_CONFIGS[provider];

  return (
    <div className="min-h-screen bg-[#0A0B0F] flex items-center justify-center">
      <div className="bg-[#0D0E14] border border-[#1E2330] rounded-[6px] p-8 w-full max-w-sm flex flex-col items-center text-center">
        {provider && <ProviderIcon provider={provider} size="lg" className="mb-3" />}
        {config && (
          <p className="text-xs font-mono text-[#6B7280] mb-6">{config.name}</p>
        )}

        {status === "loading" && (
          <>
            <Loader2 className="w-8 h-8 text-amber-400 animate-spin mb-4" />
            <p className="text-sm text-[#9CA3AF]">Connecting your account…</p>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mb-4" />
            <p className="font-display font-semibold text-white text-base">
              Connected successfully!
            </p>
            <p className="text-xs text-[#6B7280] mt-1">Redirecting you back…</p>
          </>
        )}

        {status === "error" && (
          <>
            <XCircle className="w-8 h-8 text-red-400 mb-4" />
            <p className="font-display font-semibold text-white text-base">Connection failed</p>
            <p className="text-xs text-[#9CA3AF] mt-1">{errorMessage}</p>
            <button
              onClick={() => router.replace("/integrations")}
              className="mt-4 bg-amber-500 hover:bg-amber-400 text-black text-sm font-medium px-4 py-2 rounded-[4px] transition-colors"
            >
              Go to Integrations
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function OAuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0A0B0F] flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
        </div>
      }
    >
      <CallbackContent />
    </Suspense>
  );
}
