import { isAdviser } from "@/lib/portal/auth";
import { addDays, isIsoDate, todayNZ, weekStart } from "@/lib/portal/dates";
import { REPORTS, type ReportParams, type ReportSlug } from "@/lib/portal/reports";
import type { Profile } from "@/lib/portal/types";

type Raw = (name: string) => string | null | undefined;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function findReport(slug: string) {
  return REPORTS.find((r) => r.slug === slug);
}

function defaultFrom(slug: ReportSlug, today: string): string {
  if (slug === "hours-check") return addDays(weekStart(today), -7);
  if (slug === "profitability") return today.slice(0, 5) + "01-01"; // year to date
  return today.slice(0, 8) + "01"; // month to date
}

// Same parsing for the page (searchParams) and the CSV route (URL query).
// Staff are always pinned to themselves, whatever the URL says; the database
// enforces the same thing.
export function parseReportParams(slug: ReportSlug, get: Raw, profile: Profile): ReportParams {
  const today = todayNZ();
  const adviser = isAdviser(profile.role);

  const from = get("from");
  const to = get("to");
  const safeFrom = isIsoDate(from) ? from : defaultFrom(slug, today);
  const safeTo = isIsoDate(to) && to >= safeFrom ? to : today >= safeFrom ? today : safeFrom;

  let userId = get("user") ?? "";
  if (!UUID.test(userId)) userId = "";
  if (!adviser) userId = profile.user_id;
  else if (slug === "person" && !userId) userId = profile.user_id;

  const caseId = get("case") ?? "";

  return { from: safeFrom, to: safeTo, userId, caseId: UUID.test(caseId) ? caseId : "", selfId: profile.user_id };
}

export function reportQuery(p: ReportParams): string {
  const q = new URLSearchParams({ from: p.from, to: p.to });
  if (p.userId) q.set("user", p.userId);
  if (p.caseId) q.set("case", p.caseId);
  return q.toString();
}
