import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PrintButton } from "@/components/portal/print-button";
import { ReportTableView } from "@/components/portal/report-table";
import { isAdviser, requireProfile } from "@/lib/portal/auth";
import { findReport, parseReportParams, reportQuery } from "@/lib/portal/report-params";
import { buildReport, REPORTS, type Report } from "@/lib/portal/reports";
import { createClient } from "@/lib/portal/supabase/server";
import { DownloadButton, FilterSubmit, LinkPending } from "@/components/portal/pending-buttons";

export const metadata: Metadata = { title: "Reports" };

// Which filters each report uses.
const USES_PERSON = new Set(["hours-check", "person"]);
const USES_CASE = new Set(["cases"]);

export default async function ReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ report: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const profile = await requireProfile();
  const adviser = isAdviser(profile.role);
  const { report: slug } = await params;
  const def = findReport(slug);
  if (!def) notFound();
  if (def.adviserOnly && !adviser) redirect("/portal/reports/hours-check");

  const query = await searchParams;
  const p = parseReportParams(def.slug, (name) => (typeof query[name] === "string" ? (query[name] as string) : null), profile);

  const supabase = await createClient();
  const [staffRes, casesRes] = await Promise.all([
    adviser && USES_PERSON.has(def.slug)
      ? supabase.from("profiles").select("user_id, display_name").order("display_name")
      : Promise.resolve({ data: [] as { user_id: string; display_name: string }[] }),
    USES_CASE.has(def.slug)
      ? supabase.from("v_cases").select("id, case_no, client, title").order("case_no", { ascending: false }).limit(2000)
      : Promise.resolve({ data: [] as { id: string; case_no: string; client: string | null; title: string }[] }),
  ]);

  let report: Report | null = null;
  let failure = "";
  try {
    report = await buildReport(def.slug, supabase, p);
  } catch (e) {
    failure = e instanceof Error ? e.message : "Something went wrong building this report.";
  }

  const tabs = REPORTS.filter((r) => adviser || !r.adviserOnly);
  const hasRows = report?.tables.some((t) => t.rows.length > 0) ?? false;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-semibold">{report?.title ?? def.label}</h1>
        {report ? <p className="mt-1 text-muted">{report.subtitle}</p> : null}
      </div>

      <nav aria-label="Reports" className="-mb-px flex flex-wrap print:hidden gap-x-1 border-b border-line">
        {tabs.map((t) => (
          <Link
            key={t.slug}
            href={`/portal/reports/${t.slug}?from=${p.from}&to=${p.to}`}
            aria-current={t.slug === def.slug ? "page" : undefined}
            className={`inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-semibold whitespace-nowrap ${
              t.slug === def.slug ? "border-ink text-ink" : "border-transparent text-muted hover:text-ink"
            }`}
          >
            {adviser || t.slug !== "person" ? t.label : "My time"}
            <LinkPending />
          </Link>
        ))}
      </nav>

      <form action={`/portal/reports/${def.slug}`} className="flex flex-wrap items-end gap-3 rounded-xl border border-line bg-surface p-4 print:hidden">
        <div className="min-w-[calc(50%-0.375rem)] flex-1 sm:min-w-0 sm:flex-none">
          <label htmlFor="r-from" className="field-label">From</label>
          <input id="r-from" name="from" type="date" defaultValue={p.from} className="field" />
        </div>
        <div className="min-w-[calc(50%-0.375rem)] flex-1 sm:min-w-0 sm:flex-none">
          <label htmlFor="r-to" className="field-label">To</label>
          <input id="r-to" name="to" type="date" defaultValue={p.to} className="field" />
        </div>
        {adviser && USES_PERSON.has(def.slug) ? (
          <div className="min-w-44 flex-1 sm:flex-none">
            <label htmlFor="r-user" className="field-label">Person</label>
            <select id="r-user" name="user" defaultValue={p.userId} className="field">
              {def.slug === "hours-check" ? <option value="">Everyone</option> : null}
              {(staffRes.data ?? []).map((s) => <option key={s.user_id} value={s.user_id}>{s.display_name}</option>)}
            </select>
          </div>
        ) : null}
        {USES_CASE.has(def.slug) ? (
          <div className="min-w-56 flex-1 sm:flex-none">
            <label htmlFor="r-case" className="field-label">Case</label>
            <select id="r-case" name="case" defaultValue={p.caseId} className="field">
              <option value="">(All cases)</option>
              {(casesRes.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.case_no} · {c.client ?? c.title}</option>)}
            </select>
          </div>
        ) : null}
        <FilterSubmit>Update</FilterSubmit>
        <span className="flex-1" />
        {hasRows ? (
          <DownloadButton href={`/portal/reports/${def.slug}/export?${reportQuery(p)}`} busyLabel="Building the file…">Download CSV</DownloadButton>
        ) : null}
        {hasRows ? (
          <PrintButton />
        ) : null}
      </form>

      {failure ? <p role="alert" className="rounded-lg bg-bad-bg px-3 py-2 text-sm text-bad">Couldn&apos;t build this report: {failure}</p> : null}
      {report?.notice ? <p className="rounded-xl border border-line bg-surface px-5 py-8 text-center text-muted">{report.notice}</p> : null}
      {report?.tables.map((t) => <ReportTableView key={t.name} table={t} />)}
    </div>
  );
}
