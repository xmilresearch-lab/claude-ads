import { formatDistanceToNow, parseISO } from "date-fns";

export const format = {
  // Numbers
  number:  (n: number) => new Intl.NumberFormat().format(n),
  compact: (n: number) => new Intl.NumberFormat("en", { notation: "compact" }).format(n),
  percent: (n: number) => `${(n * 100).toFixed(1)}%`,
  tokens:  (n: number) => `${format.compact(n)} tokens`,
  usd:     (n: number) => `$${n.toFixed(4)}`,

  // Dates
  date:     (s: string) =>
    new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
  time:     (s: string) =>
    new Date(s).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
  datetime: (s: string) => `${format.date(s)} ${format.time(s)}`,
  relative: (s: string) => formatDistanceToNow(parseISO(s), { addSuffix: true }),

  // Strings
  truncate:  (s: string, n = 40) => s.length > n ? `${s.slice(0, n)}…` : s,
  initials:  (email: string) => email[0]?.toUpperCase() ?? "?",
  planLabel: (plan: string) =>
    ({ free: "Free", pro: "Pro", admin: "Admin" } as Record<string, string>)[plan] ?? plan,
};
