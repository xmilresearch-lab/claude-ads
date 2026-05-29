import type { AutomationPlatform } from "@/lib/api/automations";

export interface PlatformConfig {
  id: AutomationPlatform;
  label: string;
  color: string;
  bgColor: string;
  description: string;
}

export const PLATFORM_CONFIGS: Record<AutomationPlatform, PlatformConfig> = {
  social: {
    id: "social",
    label: "Social Media",
    color: "text-sky-400",
    bgColor: "bg-sky-400/10",
    description: "Post content to Twitter, LinkedIn, Instagram",
  },
  email: {
    id: "email",
    label: "Email",
    color: "text-violet-400",
    bgColor: "bg-violet-400/10",
    description: "Send campaigns and transactional emails",
  },
  support: {
    id: "support",
    label: "Customer Support",
    color: "text-emerald-400",
    bgColor: "bg-emerald-400/10",
    description: "Auto-reply and triage support tickets",
  },
  crm: {
    id: "crm",
    label: "CRM",
    color: "text-amber-400",
    bgColor: "bg-amber-400/10",
    description: "Sync contacts and log CRM activity",
  },
};

export const RUN_STATUS_CONFIG = {
  pending:   { label: "Pending",   color: "text-[#6B7280]",   dot: "bg-[#6B7280]",   pulse: false },
  running:   { label: "Running",   color: "text-amber-400",   dot: "bg-amber-400",   pulse: true  },
  success:   { label: "Success",   color: "text-emerald-400", dot: "bg-emerald-400", pulse: false },
  failed:    { label: "Failed",    color: "text-red-400",     dot: "bg-red-400",     pulse: false },
  cancelled: { label: "Cancelled", color: "text-[#6B7280]",   dot: "bg-[#6B7280]",  pulse: false },
} as const;
