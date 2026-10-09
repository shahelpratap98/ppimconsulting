import type { Metadata } from "next";
import Link from "next/link";
import { StatusChip } from "@/components/portal/status-chip";
import { isAdmin, requireAdviser } from "@/lib/portal/auth";
import { formatDay, formatHours } from "@/lib/portal/dates";
import { ENTRY_STATUSES, entryFilterQuery, fetchEntryRows, parseEntryFilters } from "@/lib/portal/entry-filters";
import { createClient } from "@/lib/portal/supabase/server";
import { DownloadButton, FilterSubmit } from "@/components/portal/pending-buttons";
import { PrintButton } from "@/components/portal/print-button";
import { BULK_FORM_ID, BulkDeleteBar, SelectAllEntries } from "./bulk-delete";

export const metadata: Metadata = { title: "All time" };

const MAX_ROWS = 1000;

// Every timesheet line across the team.
export default async function EntriesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const profile = await requireAdviser();
  const admin = isAdmin(profile.role);
  const params = await searchParams;
  const f = parseEntryFilters((name) => (typeof params[name] === "string" ? (params[name] as string) : null));
  const { from, to, userId, caseId, status } = f;

  const supabase = await createClient();
  const [entriesRes, staffRes, casesRes] = await Promise.all([
    fetchEntryRows(supabase, f, MAX_ROWS),
    supabase.from("profiles").select("user_id, display_name").order("display_name"),
    supabase.from("v_cases").select("id, case_no, title, client, is_internal").order("is_internal", { ascending: false }).order("case_no", { ascending: false }),
  ]);

  const rows = entriesRes.rows;
  const totalHours = rows.reduce((s, r) => s + Number(r.hours ?? 0), 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">All time</h1>
          <p className="mt-1 text-muted">Every timesheet line across the team. Open one to correct it.{admin ? " Tick entries to delete them." : ""}</p>
        </div>
        <div className="flex flex-wrap items-start gap-2 print:hidden">
          {rows.length > 0 ? <DownloadButton href={`/portal/entries/export?${entryFilterQuery(f)}`} busyLabel="Building the file…">Download CSV</DownloadButton> : null}
          {rows.length > 0 ? <PrintButton /> : null}
          <Link href="/portal/entries/new" className="btn btn-primary">+ Add an entry for someone</Link>
        </div>
      </div>

      <form action={"/portal/entries"} className="grid grid-cols-2 gap-3 print:hidden rounded-xl border border-line bg-surface p-4 sm:grid-cols-3 lg:grid-cols-[repeat(5,minmax(0,1fr))_auto] [&>div:nth-child(n+3)]:col-span-2 sm:[&>div:nth-child(n+3)]:col-span-1">
        <div>
          <label htmlFor="f-from" className="field-label">From</label>
          <input id="f-from" name="from" type="date" defaultValue={from} className="field" />
        </div>
        <div>
          <label htmlFor="f-to" className="field-label">To</label>
          <input id="f-to" name="to" type="date" defaultValue={to} className="field" />
        </div>
        <div>
          <label htmlFor="f-user" className="field-label">Person</label>
          <select id="f-user" name="user" defaultValue={userId} className="field">
            <option value="">Everyone</option>
            {(staffRes.data ?? []).map((s) => <option key={s.user_id} value={s.user_id}>{s.display_name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="f-case" className="field-label">Case</label>
          <select id="f-case" name="case" defaultValue={caseId} className="field">
            <option value="">All cases</option>
            {(casesRes.data ?? []).map((c) => (
              <option key={c.id} value={c.id}>{c.is_internal ? c.title : `${c.case_no} · ${c.client ?? c.title}`}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="f-status" className="field-label">Status</label>
          <select id="f-status" name="status" defaultValue={status} className="field capitalize">
            <option value="">Any</option>
            {ENTRY_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="flex items-end gap-2">
          <FilterSubmit>Filter</FilterSubmit>
          <Link href="/portal/entries" className="btn btn-quiet">Reset</Link>
        </div>
      </form>

      <p className="text-sm text-muted tabular-nums" aria-live="polite">
        <span className="font-semibold text-ink">{rows.length}</span> {rows.length === 1 ? "entry" : "entries"} ·{" "}
        <span className="font-semibold text-ink">{formatHours(totalHours)} h</span>
        {rows.length === MAX_ROWS ? ` · showing the first ${MAX_ROWS}; narrow the dates to see the rest` : ""}
      </p>

      {entriesRes.error ? (
        <p role="alert" className="rounded-lg bg-bad-bg px-3 py-2 text-sm text-bad">Couldn&apos;t load entries: {entriesRes.error}</p>
      ) : rows.length === 0 ? (
        <p className="rounded-xl border border-line bg-surface px-5 py-8 text-center text-muted">No entries match those filters.</p>
      ) : (
        <>
          {admin ? <BulkDeleteBar /> : null}
          <div id="entries-table" className="relative overflow-x-auto rounded-xl border border-line bg-surface">
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead className="border-b border-line text-xs tracking-wide text-muted uppercase">
                <tr>
                  {admin ? <th className="w-10 py-2.5 pr-1 pl-3 print:hidden"><SelectAllEntries /></th> : null}
                  <th className="px-3 py-2.5 font-semibold">Date</th>
                  <th className="px-3 py-2.5 font-semibold">Person</th>
                  <th className="px-3 py-2.5 font-semibold">Case</th>
                  <th className="px-3 py-2.5 font-semibold">Work type</th>
                  <th className="px-3 py-2.5 font-semibold">Task</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Hours</th>
                  <th className="px-3 py-2.5 font-semibold">Status</th>
                  <th className="px-3 py-2.5 font-semibold">Approved by</th>
                  <th className="sticky right-0 bg-surface px-3 py-2.5 shadow-[-8px_0_8px_-8px_rgba(12,30,51,.15)]"><span className="sr-only">Open</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((r) => (
                  <tr key={r.id} className="align-top">
                    {admin ? (
                      <td className="py-2 pr-1 pl-3 print:hidden">
                        <input
                          type="checkbox"
                          name="ids"
                          value={r.id}
                          form={BULK_FORM_ID}
                          aria-label={`Select ${r.employee}, ${formatDay(r.entry_date, { day: "numeric", month: "short" })}, ${r.description || "no description"}`}
                          className="mt-0.5 size-4 accent-ink"
                        />
                      </td>
                    ) : null}
                    <td className="px-3 py-2 whitespace-nowrap">{formatDay(r.entry_date, { day: "2-digit", month: "short", year: "2-digit" })}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{r.employee}</td>
                    <td className="px-3 py-2 font-semibold text-ink">
                      {r.case_no ? (
                        <Link href={`/portal/cases/${r.case_id}`} className="hover:underline">{r.case_no} · {r.client ?? r.case_title}</Link>
                      ) : (
                        <span className="chip bg-warn-bg text-warn">No case</span>
                      )}
                    </td>
                    <td className="px-3 py-2">{r.work_type ?? "—"}</td>
                    <td className="max-w-[20rem] px-3 py-2 text-muted">{r.description}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatHours(Number(r.hours ?? 0))}</td>
                    <td className="px-3 py-2"><StatusChip status={r.status} /></td>
                    <td className="px-3 py-2 whitespace-nowrap">{r.approved_by_name ?? "—"}</td>
                    <td className="sticky right-0 bg-surface px-3 py-2 text-right shadow-[-8px_0_8px_-8px_rgba(12,30,51,.15)]">
                      <Link href={`/portal/entries/${r.id}`} className="font-semibold text-accent-600 hover:underline">Edit</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
