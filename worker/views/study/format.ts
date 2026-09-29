// worker/views/study/format.ts
//
// Date and time wording for study pages. Calendar dates are `YYYY-MM-DD`
// strings (see worker/lib/dates.ts); they are formatted in UTC on purpose, so
// "2026-03-15" is always shown as the 15th whatever zone the Worker runs in.

import { daysUntil } from "@server/lib/dates";

const fmt = (locale: string, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat(locale, { timeZone: "UTC", ...options });

const asDate = (iso: string) => new Date(`${iso}T00:00:00Z`);

/** "Mon 3 Mar" */
export const formatDay = (iso: string, locale: string) =>
  fmt(locale, { weekday: "short", day: "numeric", month: "short" }).format(asDate(iso));

/** "3 Mar 2026" */
export const formatDate = (iso: string, locale: string) =>
  fmt(locale, { day: "numeric", month: "short", year: "numeric" }).format(asDate(iso));

/** "Monday" */
export const formatWeekday = (iso: string, locale: string) =>
  fmt(locale, { weekday: "long" }).format(asDate(iso));

/** "14:30" → "2:30 pm" in locales that use 12-hour time. */
export const formatTime = (hhmm: string, locale: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return fmt(locale, { hour: "numeric", minute: "2-digit" }).format(
    new Date(Date.UTC(2000, 0, 1, h, m)),
  );
};

/** "1h 30m", "45m" */
export const formatMinutes = (minutes: number) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
};

/** "today", "tomorrow", "in 5 days", "3 days ago" — relative to `from`. */
export const relativeDay = (iso: string, from: string) => {
  const days = daysUntil(iso, from);
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days === -1) return "yesterday";
  if (days < 0) return `${-days} days ago`;
  if (days < 14) return `in ${days} days`;
  return `in ${Math.round(days / 7)} weeks`;
};

/** "87.5%" — one decimal only when it says something. */
export const formatPercent = (value: number) =>
  `${Number.isInteger(Math.round(value * 10) / 10) ? Math.round(value) : (Math.round(value * 10) / 10).toFixed(1)}%`;

export const formatNumber = (value: number) =>
  Number.isInteger(value) ? String(value) : (Math.round(value * 100) / 100).toString();
