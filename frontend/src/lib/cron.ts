export interface CronPreset {
  label: string;
  value: string;
  category: "minutes" | "hourly" | "daily" | "weekly" | "monthly";
}

export const CRON_PRESETS: CronPreset[] = [
  { label: "Every 15 minutes",      value: "*/15 * * * *",  category: "minutes" },
  { label: "Every 30 minutes",      value: "*/30 * * * *",  category: "minutes" },
  { label: "Every hour",            value: "0 * * * *",     category: "hourly"  },
  { label: "Every 6 hours",         value: "0 */6 * * *",   category: "hourly"  },
  { label: "Every day at 9am",      value: "0 9 * * *",     category: "daily"   },
  { label: "Every day at noon",     value: "0 12 * * *",    category: "daily"   },
  { label: "Every day at 6pm",      value: "0 18 * * *",    category: "daily"   },
  { label: "Weekdays at 9am",       value: "0 9 * * 1-5",   category: "weekly"  },
  { label: "Every Monday at 9am",   value: "0 9 * * 1",     category: "weekly"  },
  { label: "Every Sunday at 8am",   value: "0 8 * * 0",     category: "weekly"  },
  { label: "First of month at 9am", value: "0 9 1 * *",     category: "monthly" },
  { label: "Custom",                value: "",               category: "daily"   },
];

export function cronToHuman(expression: string): string {
  if (!expression || typeof expression !== "string") return "Invalid schedule";
  const trimmed = expression.trim();

  const preset = CRON_PRESETS.find((p) => p.value === trimmed && p.value !== "");
  if (preset) return preset.label;

  const parts = trimmed.split(" ");
  if (parts.length !== 5) return trimmed;

  const [minute, hour, dayOfMonth, , dayOfWeek] = parts;

  const everyMinMatch = minute.match(/^\*\/(\d+)$/);
  if (everyMinMatch && hour === "*") {
    return `Every ${everyMinMatch[1]} minutes`;
  }

  const everyHourMatch = hour.match(/^\*\/(\d+)$/);
  if (everyHourMatch && minute === "0") {
    return `Every ${everyHourMatch[1]} hours`;
  }

  const formatTime = (h: string, m: string): string => {
    const hNum = parseInt(h, 10);
    const mNum = parseInt(m, 10);
    if (isNaN(hNum) || isNaN(mNum)) return `${h}:${m}`;
    const period = hNum >= 12 ? "PM" : "AM";
    const h12 = hNum === 0 ? 12 : hNum > 12 ? hNum - 12 : hNum;
    const mStr = mNum.toString().padStart(2, "0");
    return `${h12}:${mStr} ${period}`;
  };

  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  if (/^\d+$/.test(minute) && /^\d+$/.test(hour)) {
    const timeStr = formatTime(hour, minute);

    if (/^\d$/.test(dayOfWeek)) {
      const dayName = dayNames[parseInt(dayOfWeek, 10)];
      return dayName ? `Every ${dayName} at ${timeStr}` : trimmed;
    }

    if (/^\d-\d$/.test(dayOfWeek)) {
      const [start, end] = dayOfWeek.split("-").map(Number);
      if (start === 1 && end === 5) return `Weekdays at ${timeStr}`;
      if (start === 0 && end === 6) return `Every day at ${timeStr}`;
      return `${dayNames[start]}–${dayNames[end]} at ${timeStr}`;
    }

    if (/^\d+$/.test(dayOfMonth)) {
      const d = parseInt(dayOfMonth, 10);
      const suffix = d === 1 ? "st" : d === 2 ? "nd" : d === 3 ? "rd" : "th";
      return `${d}${suffix} of month at ${timeStr}`;
    }

    if (dayOfMonth === "*" && dayOfWeek === "*") {
      return `Every day at ${timeStr}`;
    }
  }

  return trimmed;
}

export function validateCron(expression: string): string | null {
  if (!expression || !expression.trim()) return "Schedule is required";
  const parts = expression.trim().split(" ");
  if (parts.length !== 5) return "Must have exactly 5 parts (min hour dom month dow)";
  return null;
}
