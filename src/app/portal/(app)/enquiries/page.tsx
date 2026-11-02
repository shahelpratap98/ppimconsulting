import type { Metadata } from "next";
import Link from "next/link";
import { DueChip, LeadStageChip, SourceChip } from "@/components/portal/lead-chips";
import { FilterSubmit } from "@/components/portal/pending-buttons";
import { requireProfile } from "@/lib/portal/auth";
import { CONSULT_MODE_LABEL, leadName, OPEN_STAGES, STAGE_LABEL, type LeadStage, type LeadView } from "@/lib/portal/crm";
import { daysUntil, formatDateTime, formatDay } from "@/lib/portal/dates";
import { pathwayLabel } from "@/lib/portal/pathways";
import { createClient } from "@/lib/portal/supabase/server";

export const metadata: Metadata = { title: "Enquiries" };

const VIEWS: { key: string; label: string; stages: LeadStage[] }[] = [
  { key: "open", label: "Open", stages: OPEN_STAGES },
  ...OPEN_STAGES.map((s) => ({ key: s, label: STAGE_LABEL[s], stages: [s] })),
  { key: "signed", label: "Signed", stages: ["signed"] },
  { key: "not_proceeding", label: "Not proceeding", stages: ["not_proceeding"] },
];

// Whatever needs doing soonest comes first: a follow-up or a visa running out.
function nextDate(l: LeadView): string {
  const soon = [l.next_action_on, l.visa_expiry_on].filter(Boolean) as string[];
  return soon.sort()[0] ?? "9999";
}

export default async function EnquiriesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const profile = await requireProfile();
  const params = await searchParams;
  const view = VIEWS.find((v) => v.key === params.view) ?? VIEWS[0];
  const q = typeof params.q === "string" ? params.q.trim().slice(0, 80) : "";
  const mine = params.mine === "1";

  const supabase = await createClient();
  let query = supabase.from("v_leads").select("*").in("stage", view.stages).order("created_at", { ascending: false }).limit(500);
  if (mine) query = query.or(`owner_id.eq.${profile.user_id},adviser_id.eq.${profile.user_id}`);
  if (q) {
    const like = `%${q.replace(/[%_,()]/g, " ")}%`;
    query = query.or(`contact_name.ilike.${like},contact_email.ilike.${like},contact_phone.ilike.${like},title.ilike.${like}`);
  }
  const [leadsRes, stagesRes, consultsRes, inboxRes] = await Promise.all([
    query,
    supabase.from("leads").select("stage").in("stage", OPEN_STAGES),
    supabase.from("v_leads").select("*").eq("stage", "consult_booked").gte("consult_at", new Date().toISOString()).order("consult_at").limit(6),
    supabase.from("v_triage").select("id", { count: "exact", head: true }),
  ]);

  const leads = [...((leadsRes.data ?? []) as LeadView[])].sort((a, b) => nextDate(a).localeCompare(nextDate(b)));
  const consults = (consultsRes.data ?? []) as LeadView[];
  const counts = (stagesRes.data ?? []).reduce<Record<string, number>>((all, l) => ({ ...all, [l.stage]: (all[l.stage] ?? 0) + 1 }), {});

  const link = (patch: Record<string, string | null>) => {
    const p = new URLSearchParams();
    const next = { view: view.key, q, mine: mine ? "1" : "", ...patch };
    Object.entries(next).forEach(([k, v]) => v && p.set(k, v));
    return `/portal/enquiries?${p.toString()}`;
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Enquiries</h1>
          <p className="mt-1 text-muted">Everyone who has been in touch, from first contact to a signed agreement.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/portal/enquiries/inbox" className="btn btn-quiet">Inbox{inboxRes.count ? ` (${inboxRes.count})` : ""}</Link>
          <Link href="/portal/enquiries/new" className="btn btn-primary">+ Add enquiry</Link>
        </div>
      </div>

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {OPEN_STAGES.map((s) => (
          <li key={s}>
            <Link
              href={link({ view: s })}
              aria-current={view.key === s ? "page" : undefined}
              className={`block h-full rounded-xl border bg-surface p-4 hover:border-line-2 ${view.key === s ? "border-ink" : "border-line"}`}
            >
              <span className="block text-xs font-semibold text-muted">{STAGE_LABEL[s]}</span>
              <span className="mt-1 block text-2xl font-semibold text-ink tabular-nums">{counts[s] ?? 0}</span>
            </Link>
          </li>
        ))}
      </ul>

      {consults.length ? (
        <section aria-labelledby="consults-heading" className="rounded-xl border border-line bg-surface">
          <h2 id="consults-heading" className="border-b border-line px-5 py-3 text-sm font-semibold text-ink">Upcoming consultations</h2>
          <ul className="divide-y divide-line">
            {consults.map((c) => (
              <li key={c.id}>
                <Link href={`/portal/enquiries/${c.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-2.5 text-sm hover:bg-surface-2/60">
                  <span className="font-semibold text-ink tabular-nums">{formatDateTime(c.consult_at!)}</span>
                  <span>{leadName(c)}</span>
                  <span className="text-muted">{pathwayLabel(c.pathway)}</span>
                  <span className="text-muted">{c.consult_mode ? CONSULT_MODE_LABEL[c.consult_mode] : ""}</span>
                  <span className="ml-auto text-muted">{c.adviser ?? "No adviser yet"}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="flex flex-wrap items-end gap-3">
        <nav aria-label="Enquiry stage" className="flex flex-wrap gap-1 rounded-xl border border-line bg-surface p-1">
          {[VIEWS[0], ...VIEWS.slice(-2)].map((v) => (
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
        <form action="/portal/enquiries" className="flex min-w-0 flex-1 basis-72 items-end gap-2">
          <input type="hidden" name="view" value={view.key} />
          {mine ? <input type="hidden" name="mine" value="1" /> : null}
          <div className="min-w-0 flex-1">
            <label htmlFor="enquiry-search" className="sr-only">Search enquiries</label>
            <input id="enquiry-search" name="q" defaultValue={q} placeholder="Search by name, email or phone" className="field" />
          </div>
          <FilterSubmit className="btn btn-quiet">Search</FilterSubmit>
        </form>
        <Link href={link({ mine: mine ? null : "1" })} className={`btn ${mine ? "btn-primary" : "btn-quiet"}`}>
          {mine ? "✓ Mine" : "Mine"}
        </Link>
      </div>

      {leadsRes.error ? (
        <p role="alert" className="rounded-lg bg-bad-bg px-3 py-2 text-sm text-bad">Couldn&apos;t load enquiries: {leadsRes.error.message}</p>
      ) : leads.length === 0 ? (
        <p className="rounded-xl border border-line bg-surface px-5 py-8 text-center text-muted">
          {q ? "No enquiries match that search." : view.key === "open" ? "No open enquiries. New ones from the website appear here." : "Nothing here."}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line bg-surface">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b border-line text-xs tracking-wide text-muted uppercase">
              <tr>
                <th className="px-4 py-2.5 font-semibold">Person</th>
                <th className="px-4 py-2.5 font-semibold">Pathway</th>
                <th className="px-4 py-2.5 font-semibold">Next step</th>
                <th className="px-4 py-2.5 font-semibold">Visa expiry</th>
                <th className="px-4 py-2.5 font-semibold">With</th>
                <th className="px-4 py-2.5 font-semibold">Stage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {leads.map((l) => (
                <tr key={l.id} className="hover:bg-surface-2/60">
                  <td className="px-4 py-2.5">
                    <Link href={`/portal/enquiries/${l.id}`} className="font-semibold text-accent-600 hover:underline">{leadName(l)}</Link>
                    <span className="block text-xs text-muted">
                      {[l.contact_country ?? l.contact_nationality, formatDay(l.created_at.slice(0, 10), { day: "numeric", month: "short" })].filter(Boolean).join(" · ")}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="chip bg-surface-2 text-ink">{l.jurisdiction} · {pathwayLabel(l.pathway)}</span>
                    <span className="mt-1 block"><SourceChip source={l.source} /></span>
                  </td>
                  <td className="px-4 py-2.5">
                    {l.next_action_on ? (
                      <span className={daysUntil(l.next_action_on) < 0 ? "font-semibold text-bad" : "text-ink"}>
                        {formatDay(l.next_action_on, { day: "numeric", month: "short" })}
                      </span>
                    ) : null}
                    <span className="block text-xs text-muted">{l.next_action ?? (l.next_action_on ? "" : "—")}</span>
                  </td>
                  <td className="px-4 py-2.5">{l.visa_expiry_on ? <DueChip on={l.visa_expiry_on} /> : <span className="text-muted">—</span>}</td>
                  <td className="px-4 py-2.5">{l.adviser ?? l.owner ?? <span className="font-semibold text-accent-600">Unassigned</span>}</td>
                  <td className="px-4 py-2.5"><LeadStageChip stage={l.stage} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
