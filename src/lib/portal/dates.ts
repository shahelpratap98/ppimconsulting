// All dates are calendar dates in Auckland, passed around as "YYYY-MM-DD".
const TZ = "Pacific/Auckland";

export function todayNZ(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
}

export function isIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(value + "T00:00:00Z");
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

export function addDays(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// Monday of the week containing `iso`.
export function weekStart(iso: string): string {
  const dow = new Date(iso + "T00:00:00Z").getUTCDay(); // 0 = Sunday
  return addDays(iso, dow === 0 ? -6 : 1 - dow);
}

export function isWeekend(iso: string): boolean {
  const dow = new Date(iso + "T00:00:00Z").getUTCDay();
  return dow === 0 || dow === 6;
}

export function formatDay(iso: string, opts: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat("en-NZ", { timeZone: "UTC", ...opts }).format(
    new Date(iso + "T00:00:00Z"),
  );
}

// 2 -> "2", 0.5 -> "0.5", 7.25 -> "7.25"
export function formatHours(n: number): string {
  return String(Math.round(n * 100) / 100);
}

// A datetime-local value ("2026-11-05T14:30") typed by NZ staff, as a UTC ISO
// string. Run twice so a time either side of a daylight-saving change lands right.
export function nzLocalToIso(local: string): string | null {
  const guess = Date.parse(local + "Z");
  if (Number.isNaN(guess)) return null;
  const offsetAt = (t: number) => Date.parse(isoToNzLocal(new Date(t).toISOString()) + "Z") - t;
  return new Date(guess - offsetAt(guess - offsetAt(guess))).toISOString();
}

// The reverse, for filling a datetime-local input.
export function isoToNzLocal(iso: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Pacific/Auckland", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const p = (t: string) => parts.find((x) => x.type === t)?.value ?? "";
  return `${p("year")}-${p("month")}-${p("day")}T${p("hour")}:${p("minute")}:${p("second")}`;
}

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("en-NZ", {
    timeZone: "Pacific/Auckland", weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit",
  }).format(new Date(iso));
}

// Whole days from today (NZ) to a date; negative when it has passed.
export function daysUntil(iso: string): number {
  return Math.round((Date.parse(iso + "T00:00:00Z") - Date.parse(todayNZ() + "T00:00:00Z")) / 86400000);
}
