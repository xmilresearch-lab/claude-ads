export interface Timezone {
  value: string;
  label: string;
  group: "Americas" | "Europe" | "Asia/Pacific" | "UTC";
}

export const TIMEZONES: Timezone[] = [
  // UTC
  { value: "UTC",                    label: "UTC",                          group: "UTC" },
  // Americas
  { value: "America/New_York",       label: "Eastern Time (ET)",            group: "Americas" },
  { value: "America/Chicago",        label: "Central Time (CT)",            group: "Americas" },
  { value: "America/Denver",         label: "Mountain Time (MT)",           group: "Americas" },
  { value: "America/Los_Angeles",    label: "Pacific Time (PT)",            group: "Americas" },
  { value: "America/Toronto",        label: "Toronto (ET)",                 group: "Americas" },
  { value: "America/Sao_Paulo",      label: "Brasília Time (BRT)",          group: "Americas" },
  { value: "America/Mexico_City",    label: "Mexico City (CST)",            group: "Americas" },
  { value: "America/Vancouver",      label: "Vancouver (PT)",               group: "Americas" },
  { value: "America/Buenos_Aires",   label: "Buenos Aires (ART)",           group: "Americas" },
  // Europe
  { value: "Europe/London",          label: "London (GMT/BST)",             group: "Europe" },
  { value: "Europe/Paris",           label: "Paris (CET/CEST)",             group: "Europe" },
  { value: "Europe/Berlin",          label: "Berlin (CET/CEST)",            group: "Europe" },
  { value: "Europe/Amsterdam",       label: "Amsterdam (CET/CEST)",         group: "Europe" },
  { value: "Europe/Madrid",          label: "Madrid (CET/CEST)",            group: "Europe" },
  { value: "Europe/Rome",            label: "Rome (CET/CEST)",              group: "Europe" },
  { value: "Europe/Stockholm",       label: "Stockholm (CET/CEST)",         group: "Europe" },
  { value: "Europe/Warsaw",          label: "Warsaw (CET/CEST)",            group: "Europe" },
  { value: "Europe/Kyiv",            label: "Kyiv (EET/EEST)",              group: "Europe" },
  { value: "Europe/Helsinki",        label: "Helsinki (EET/EEST)",          group: "Europe" },
  { value: "Europe/Lisbon",          label: "Lisbon (WET/WEST)",            group: "Europe" },
  // Asia / Pacific
  { value: "Asia/Dubai",             label: "Dubai (GST)",                  group: "Asia/Pacific" },
  { value: "Asia/Kolkata",           label: "India (IST)",                  group: "Asia/Pacific" },
  { value: "Asia/Bangkok",           label: "Bangkok (ICT)",                group: "Asia/Pacific" },
  { value: "Asia/Singapore",         label: "Singapore (SGT)",              group: "Asia/Pacific" },
  { value: "Asia/Tokyo",             label: "Tokyo (JST)",                  group: "Asia/Pacific" },
  { value: "Asia/Seoul",             label: "Seoul (KST)",                  group: "Asia/Pacific" },
  { value: "Asia/Shanghai",          label: "China (CST)",                  group: "Asia/Pacific" },
  { value: "Asia/Hong_Kong",         label: "Hong Kong (HKT)",              group: "Asia/Pacific" },
  { value: "Australia/Sydney",       label: "Sydney (AEST/AEDT)",           group: "Asia/Pacific" },
  { value: "Pacific/Auckland",       label: "Auckland (NZST/NZDT)",         group: "Asia/Pacific" },
];

export const TIMEZONE_GROUPS = ["UTC", "Americas", "Europe", "Asia/Pacific"] as const;
