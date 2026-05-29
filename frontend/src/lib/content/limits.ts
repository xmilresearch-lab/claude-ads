import type { ContentPlatform } from "@/lib/api/content";

export const PLATFORM_CHAR_LIMITS: Record<ContentPlatform, number | null> = {
  twitter:   280,
  linkedin:  3000,
  instagram: 2200,
  facebook:  63206,
  tiktok:    2200,
  threads:   500,
  gmail:     null,
  sendgrid:  null,
};

export interface CharCountState {
  count: number;
  limit: number | null;
  remaining: number | null;
  isOverLimit: boolean;
  severity: "ok" | "warning" | "danger";
}

export function getCharCountState(
  text: string,
  platform: ContentPlatform,
): CharCountState {
  const count = text.length;
  const limit = PLATFORM_CHAR_LIMITS[platform];

  if (limit === null) {
    return { count, limit: null, remaining: null, isOverLimit: false, severity: "ok" };
  }

  const remaining = limit - count;
  const isOverLimit = remaining < 0;
  const pctUsed = count / limit;

  let severity: CharCountState["severity"] = "ok";
  if (isOverLimit) severity = "danger";
  else if (pctUsed >= 0.9) severity = "warning";

  return { count, limit, remaining, isOverLimit, severity };
}
