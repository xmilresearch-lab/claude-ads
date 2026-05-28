import { PROVIDER_CONFIGS } from "@/lib/integrations/providers";
import { cn } from "@/lib/utils/cn";

interface ProviderIconProps {
  provider: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZE_MAP = {
  sm: { box: "w-6 h-6", text: "text-[9px]" },
  md: { box: "w-8 h-8", text: "text-[11px]" },
  lg: { box: "w-10 h-10", text: "text-[13px]" },
};

export function ProviderIcon({ provider, size = "md", className }: ProviderIconProps) {
  const config = PROVIDER_CONFIGS[provider];
  const { box, text } = SIZE_MAP[size];

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-[4px] font-bold font-mono shrink-0",
        box,
        className,
      )}
      style={{
        backgroundColor: config?.color ?? "#1E2330",
        color: "#ffffff",
      }}
    >
      <span className={text}>{config?.lettermark ?? "?"}</span>
    </div>
  );
}
