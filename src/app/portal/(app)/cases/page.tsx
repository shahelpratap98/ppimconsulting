import type { Metadata } from "next";
import Link from "next/link";
import { CaseStatusChip, ChecklistProgress } from "@/components/portal/case-status-chip";
import { FilterSubmit } from "@/components/portal/pending-buttons";
import { isAdviser, requireProfile } from "@/lib/portal/auth";
import { formatDay, formatHours } from "@/lib/portal/dates";
import { pathwayLabel } from "@/lib/portal/pathways";
import { createClient } from "@/lib/portal/supabase/server";
import type { CaseStatus, CaseView } from "@/lib/portal/types";

export const metadata: Metadata = { title: "Cases" };

const VIEWS: { key: string; label: string; statuses: CaseStatus[] }[] = [
  { key: "open", label: "Open", statuses: ["enquiry", "active", "lodged"] },
  { key: "decided", label: "Decided", statuses: ["decided"] },
  { key: "closed", label: "Closed", statuses: ["closed"] },
  { key: "all", label: "All", statuses: ["enquiry", "active", "lodged", "decided", "closed"] },
];

export default async function CasesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const profile = await requireProfile();
  const adviser = isAdviser(profile.role);
  const params = await searchParams;
  const view = VIEWS.find((v) => v.key === params.view) ?? VIEWS[0];
  const q = typeof params.q === "string" ? params.q.trim().slice(0, 80) : "";
  const mine = params.mine === "1";

  const supabase = await createClient();
  let query = supabase
    .from("v_cases")
    .select("*")
    .eq("is_internal", false)
    .in("status", view.statuses)
    .order("case_no", { ascending: false })
    .limit(500);
  if (mine) query = query.eq("adviser_id", profile.user_id);
  if (q) {
    // case number, client or title; PostgREST "or" with escaped wildcards
    const like = `%${q.replace(/[%_,()]/g, " ")}%`;
    query = query.or(`case_no.ilike.${like},client.ilike.${like},title.ilike.${like}`);
  }
  const { data, error } = await query;
  const cases = (data ?? []) as CaseView[];

  const link = (patch: Record<string, string | null>) => {
    const p = new URLSearchParams();
    const next = { view: view.key, q, mine: mine ? "1" : "", ...patch };
    Object.entries(next).forEach(([k, v]) => v && p.set(k, v));
    return `/portal/cases?${p.toString()}`;
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Cases</h1>
          <p className="mt-1 text-muted">Every client matter, with its document checklist. Open one to tick off documents as they arrive.</p>
        </div>
        {adviser ? <Link href="/portal/cases/new" className="btn btn-primary">+ Open a case</Link> : null}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <nav aria-label="Case status" className="flex flex-wrap gap-1 rounded-xl border border-line bg-surface p-1">
          {VIEWS.map((v) => (
            <Link
              key={v.key}
              href={link({ view: v.key })}
              aria-current={v.key === view.key ? "page" : undefined}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${v.key === view.key ? "bg-ink text-white" : "text-muted hover:bg-surface-2 hover:text-ink"}`}
            >
              {v.label}
            </Link>
          ))}
        </nav>
        <form action="/portal/cases" className="flex min-w-0 flex-1 basis-72 items-end gap-2">
          <input type="hidden" name="view" value={view.key} />
          {mine ? <input type="hidden" name="mine" value="1" /> : null}
          <div className="min-w-0 flex-1">
            <label htmlFor="case-search" className="sr-only">Search cases</label>
            <input id="case-search" name="q" defaultValue={q} placeholder="Search by client, case number or title" className="field" />
          </div>
          <FilterSubmit className="btn btn-quiet">Search</FilterSubmit>
        </form>
        {adviser ? (
          <Link href={link({ mine: mine ? null : "1" })} className={`btn ${mine ? "btn-primary" : "btn-quiet"}`}>
            {mine ? "✓ My cases" : "My cases"}
          </Link>
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="rounded-lg bg-bad-bg px-3 py-2 text-sm text-bad">Couldn&apos;t load cases: {error.message}</p>
      ) : cases.length === 0 ? (
        <p className="rounded-xl border border-line bg-surface px-5 py-8 text-center text-muted">
          {q ? "No cases match that search." : view.key === "open" ? "No open cases yet." : "Nothing here."}
          {adviser && view.key === "open" && !q ? <> <Link href="/portal/cases/new" className="font-semibold text-accent-600 underline">Open the first one</Link>.</> : null}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line bg-surface">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="border-b border-line text-xs tracking-wide text-muted uppercase">
              <tr>
                <th className="px-4 py-2.5 font-semibold">Case</th>
                <th className="px-4 py-2.5 font-semibold">Client</th>
                <th className="px-4 py-2.5 font-semibold">Pathway</th>
                <th className="px-4 py-2.5 font-semibold">Adviser</th>
                <th className="px-4 py-2.5 font-semibold">Documents</th>
                <th className="px-4 py-2.5 text-right font-semibold">Hours</th>
                <th className="px-4 py-2.5 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {cases.map((c) => (
                <tr key={c.id} className="hover:bg-surface-2/60">
                  <td className="px-4 py-2.5">
                    <Link href={`/portal/cases/${c.id}`} className="font-semibold text-accent-600 hover:underline">{c.case_no}</Link>
                    <span className="block text-xs text-muted">Opened {formatDay(c.opened_on, { day: "numeric", month: "short", year: "numeric" })}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="font-semibold text-ink">{c.client}</span>
                    <span className="block text-xs text-muted">{c.title}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="chip bg-surface-2 text-ink">{c.jurisdiction} · {pathwayLabel(c.pathway)}</span>
                  </td>
                  <td className="px-4 py-2.5">{c.adviser ?? <span className="text-muted">—</span>}</td>
                  <td className="px-4 py-2.5"><ChecklistProgress total={c.checklist_total} received={c.checklist_received} flagged={c.checklist_flagged} /></td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{formatHours(Number(c.hours_logged))}</td>
                  <td className="px-4 py-2.5"><CaseStatusChip status={c.status} outcome={c.outcome} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
