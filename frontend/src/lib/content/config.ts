import type { ContentStatus, ContentPlatform } from "@/lib/api/content";

export const CONTENT_STATUS_CONFIG: Record<
  ContentStatus,
  {
    label: string;
    color: string;
    bgColor: string;
    dotColor: string;
    pulse: boolean;
  }
> = {
  pending_review: {
    label: "Pending Review",
    color: "text-amber-400",
    bgColor: "bg-amber-400/10",
    dotColor: "bg-amber-400",
    pulse: true,
  },
  approved: {
    label: "Approved",
    color: "text-emerald-400",
    bgColor: "bg-emerald-400/10",
    dotColor: "bg-emerald-400",
    pulse: false,
  },
  rejected: {
    label: "Rejected",
    color: "text-red-400",
    bgColor: "bg-red-400/10",
    dotColor: "bg-red-400",
    pulse: false,
  },
  publishing: {
    label: "Publishing",
    color: "text-[#06B6D4]",
    bgColor: "bg-[#06B6D4]/10",
    dotColor: "bg-[#06B6D4]",
    pulse: true,
  },
  published: {
    label: "Published",
    color: "text-[#9CA3AF]",
    bgColor: "bg-[#1E2330]",
    dotColor: "bg-[#6B7280]",
    pulse: false,
  },
  failed: {
    label: "Failed",
    color: "text-red-400",
    bgColor: "bg-red-400/10",
    dotColor: "bg-red-400",
    pulse: false,
  },
};

export const CONTENT_PLATFORM_CONFIG: Record<
  ContentPlatform,
  {
    label: string;
    color: string;
    lettermark: string;
  }
> = {
  twitter:   { label: "X / Twitter", color: "#000000", lettermark: "X"  },
  linkedin:  { label: "LinkedIn",    color: "#0A66C2", lettermark: "in" },
  instagram: { label: "Instagram",   color: "#E1306C", lettermark: "IG" },
  facebook:  { label: "Facebook",    color: "#1877F2", lettermark: "Fb" },
  tiktok:    { label: "TikTok",      color: "#010101", lettermark: "Tk" },
  threads:   { label: "Threads",     color: "#101010", lettermark: "Th" },
  gmail:     { label: "Gmail",       color: "#EA4335", lettermark: "Gm" },
  sendgrid:  { label: "SendGrid",    color: "#1A82E2", lettermark: "SG" },
};

export const ACTIONABLE_STATUSES: ContentStatus[] = ["pending_review"];

export interface ContentFilterTab {
  key: ContentStatus | "all";
  label: string;
  showCount: boolean;
}

export const CONTENT_FILTER_TABS: ContentFilterTab[] = [
  { key: "all",            label: "All",          showCount: false },
  { key: "pending_review", label: "Needs Review",  showCount: true  },
  { key: "approved",       label: "Approved",      showCount: false },
  { key: "published",      label: "Published",     showCount: false },
  { key: "rejected",       label: "Rejected",      showCount: false },
];
