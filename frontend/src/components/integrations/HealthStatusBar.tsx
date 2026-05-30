"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { ProviderIcon } from "./ProviderIcon";
import { PROVIDER_CONFIGS } from "@/lib/integrations/providers";
import { useIntegrations } from "@/hooks/useIntegrations";
import type { Integration } from "@/lib/api/integrations";

type PillState = {
  dot: string;
  text: string;
  label: string;
  animate?: boolean;
};

function computePill(integrations: Integration[]): PillState {
  const errors = integrations.filter((i) => i.status === "error").length;
  const expiring = integrations.filter((i) => i.status === "expiring").length;
  const active = integrations.filter((i) => i.status === "active").length;

  if (errors > 0) {
    return { dot: "bg-red-500", text: "text-red-400", label: `${errors} error${errors > 1 ? "s" : ""}` };
  }
  if (expiring > 0) {
    return { dot: "bg-amber-400", text: "text-amber-400", label: `${expiring} expiring` };
  }
  if (active > 0) {
    return { dot: "bg-emerald-400", text: "text-emerald-400", label: `${active} connected`, animate: true };
  }
  return { dot: "bg-[#374151]", text: "text-[#6B7280]", label: "No integrations" };
}

function rowStatus(status: Integration["status"]): { dot: string; text: string; label: string } {
  switch (status) {
    case "active":    return { dot: "bg-emerald-400 animate-pulse", text: "text-emerald-400", label: "Connected" };
    case "expiring":  return { dot: "bg-amber-400",                 text: "text-amber-400",   label: "Expiring" };
    case "error":     return { dot: "bg-red-500",                   text: "text-red-400",     label: "Error" };
    default:          return { dot: "bg-[#374151]",                 text: "text-[#6B7280]",   label: "Disconnected" };
  }
}

export function HealthStatusBar() {
  const { data: integrations = [] } = useIntegrations();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  const pill = computePill(integrations);
  const connected = integrations.filter((i) => i.status !== "disconnected");

  return (
    <div ref={containerRef} className="relative inline-block">
      {/* Pill */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#0D0E14] border border-[#1E2330] rounded-[4px] text-xs font-mono cursor-pointer hover:border-[#2D3447] transition-colors"
      >
        <span className={`w-1.5 h-1.5 rounded-full ${pill.dot}${pill.animate ? " animate-pulse" : ""}`} />
        <span className={pill.text}>{pill.label}</span>
      </button>

      {/* Popover */}
      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-64 bg-[#0D0E14] border border-[#1E2330] rounded-[6px] shadow-2xl z-50">
          <div className="px-3 pt-3 pb-2 border-b border-[#1E2330]">
            <p className="text-[10px] font-mono uppercase tracking-widest text-[#6B7280]">
              Integration Health
            </p>
          </div>

          {connected.length === 0 ? (
            <p className="text-xs text-[#6B7280] px-3 py-3">No integrations connected</p>
          ) : (
            connected.map((integration) => {
              const name = PROVIDER_CONFIGS[integration.provider]?.name ?? integration.provider;
              const s = rowStatus(integration.status);
              return (
                <div
                  key={integration.id}
                  className="px-3 py-2.5 flex items-center gap-2.5 border-b border-[#1A1D2B] last:border-0"
                >
                  <ProviderIcon provider={integration.provider} size="sm" />
                  <span className="text-xs text-white flex-1 truncate">{name}</span>
                  <span className={`inline-flex items-center gap-1 text-[10px] font-mono ${s.text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                    {s.label}
                  </span>
                </div>
              );
            })
          )}

          <div className="px-3 py-2.5 border-t border-[#1E2330]">
            <Link
              href="/integrations"
              onClick={() => setIsOpen(false)}
              className="text-[11px] text-amber-400 hover:text-amber-300 transition-colors"
            >
              Manage integrations →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
