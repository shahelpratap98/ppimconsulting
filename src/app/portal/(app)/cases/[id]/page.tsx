import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/portal/action-form";
import { CaseStatusChip } from "@/components/portal/case-status-chip";
import { InvoiceStatusChip } from "@/components/portal/invoice-status-chip";
import { StatusChip } from "@/components/portal/status-chip";
import { isAdmin, isAdviser, requireProfile } from "@/lib/portal/auth";
import { formatDay, formatHours } from "@/lib/portal/dates";
import { formatMoney } from "@/lib/portal/money";
import { pathwayByKey, pathwayLabel } from "@/lib/portal/pathways";
import { createClient } from "@/lib/portal/supabase/server";
import type { CaseView, ChecklistItem, EntryView, InvoiceStatus } from "@/lib/portal/types";
import { deleteStage, saveFee, saveStage, updateCase } from "../actions";
import { Checklist } from "./checklist";

export const metadata: Metadata = { title: "Case" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const short = (iso: string) => formatDay(iso, { day: "numeric", month: "short", year: "numeric" });

type Stage = {
  id: string;
  label: string;
  amount: number;
  sort_order: number;
  invoice: { id: string; invoice_no: string; status: InvoiceStatus } | null;
};
type Finance = { agreed_fee: number | null; staged: number; unbilled: number; invoiced: number; paid: number; hours: number; fee_per_hour: number | null };
type CaseInvoice = { id: string; invoice_no: string; issued_on: string; due_on: string; total: number; status: InvoiceStatus };

export default async function CasePage({ params }: { params: Promise<{ id: string }> }) {
  const profile = await requireProfile();
  const adviser = isAdviser(profile.role);
  const admin = isAdmin(profile.role);
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const supabase = await createClient();
  const [caseRes, itemsRes, entriesRes, clientRes, advisersRes, feeRes, stagesRes, financeRes, invoicesRes] = await Promise.all([
    supabase.from("v_cases").select("*").eq("id", id).maybeSingle(),
    supabase.from("checklist_items").select("id, label, status, note, sort_order, updated_at").eq("case_id", id).order("sort_order").order("created_at"),
    supabase.from("v_entries").select("id, entry_date, employee, work_type, hours, description, status").eq("case_id", id).order("entry_date", { ascending: false }).limit(200),
    supabase.from("cases").select("client:clients!cases_client_id_fkey(id, full_name, email, phone, country)").eq("id", id).maybeSingle(),
    adviser
      ? supabase.from("profiles").select("user_id, display_name").in("role", ["adviser", "admin"]).eq("is_active", true).order("display_name")
      : Promise.resolve({ data: [] as { user_id: string; display_name: string }[] }),
    adviser ? supabase.from("case_fees").select("agreed_fee, fee_note").eq("case_id", id).maybeSingle() : Promise.resolve({ data: null }),
    adviser
      ? supabase.from("fee_stages").select("id, label, amount, sort_order, invoice:invoices!fee_stages_invoice_id_fkey(id, invoice_no, status)").eq("case_id", id).order("sort_order")
      : Promise.resolve({ data: [] }),
    adviser ? supabase.from("v_case_finance").select("agreed_fee, staged, unbilled, invoiced, paid, hours, fee_per_hour").eq("case_id", id).maybeSingle() : Promise.resolve({ data: null }),
    adviser
      ? supabase.from("invoices").select("id, invoice_no, issued_on, due_on, total, status").eq("case_id", id).order("issued_on", { ascending: false })
      : Promise.resolve({ data: [] }),
  ]);

  const c = caseRes.data as CaseView | null;
  if (!c) notFound();
  const items = (itemsRes.data ?? []) as ChecklistItem[];
  const entries = (entriesRes.data ?? []) as Pick<EntryView, "id" | "entry_date" | "employee" | "work_type" | "hours" | "description" | "status">[];
  const client = (clientRes.data as unknown as { client: { id: string; full_name: string; email: string | null; phone: string | null; country: string | null } | null } | null)?.client ?? null;
  const advisers = advisersRes.data ?? [];
  const fee = feeRes.data as { agreed_fee: number | null; fee_note: string } | null;
  const stages = (stagesRes.data ?? []) as unknown as Stage[];
  const finance = financeRes.data as Finance | null;
  const invoices = (invoicesRes.data ?? []) as CaseInvoice[];
  const pathway = pathwayByKey(c.pathway);
  const entryHours = entries.reduce((sum, e) => sum + Number(e.hours ?? 0), 0);
  const stagedMismatch = finance && finance.agreed_fee !== null && Number(finance.staged) !== Number(finance.agreed_fee);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/portal/cases" className="text-sm font-semibold text-accent-600 hover:underline">← Cases</Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-semibold">{c.case_no}</h1>
          <CaseStatusChip status={c.status} outcome={c.outcome} />
          <span className="chip bg-surface-2 text-ink">{c.jurisdiction} · {pathwayLabel(c.pathway)}</span>
        </div>
        <p className="mt-1 text-lg text-ink">{c.client ?? "Internal"} <span className="text-muted">· {c.title}</span></p>
        <p className="mt-1 text-sm text-muted">
          Opened {short(c.opened_on)}
          {c.lodged_on ? <> · Lodged {short(c.lodged_on)}</> : null}
          {c.decided_on ? <> · Decided {short(c.decided_on)}</> : null}
          {c.adviser ? <> · Adviser {c.adviser}</> : null}
        </p>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex min-w-0 flex-col gap-6">
          {c.is_internal ? (
            <p className="rounded-xl border border-line bg-surface p-5 text-sm text-muted">
              This is the internal case for office time. It has no client, checklist or fees.
            </p>
          ) : (
            <Checklist
              caseId={c.id}
              caseNo={c.case_no}
              items={items}
              clientName={c.client}
              clientEmail={c.client_email}
              adviserName={c.adviser}
              pathwayName={pathway?.name ?? pathwayLabel(c.pathway)}
            />
          )}

          {adviser && !c.is_internal ? (
            <section className="rounded-xl border border-line bg-surface" aria-labelledby="fees-heading">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line p-5">
                <div>
                  <h2 id="fees-heading" className="text-xl font-semibold">Fees &amp; payment stages</h2>
                  <p className="mt-0.5 text-sm text-muted">The agreed fee is split into stages. Each stage is invoiced once. Amounts exclude GST.</p>
                </div>
                {admin && Number(finance?.unbilled ?? 0) > 0 ? (
                  <Link href={`/portal/invoices/new?case=${c.id}`} className="btn btn-primary">Invoice stages</Link>
                ) : null}
              </div>

              {finance ? (
                <dl className="grid grid-cols-2 gap-px border-b border-line bg-line sm:grid-cols-4">
                  {[
                    ["Agreed fee", finance.agreed_fee === null ? "Not set" : formatMoney(finance.agreed_fee)],
                    ["Invoiced", formatMoney(finance.invoiced)],
                    ["Paid", formatMoney(finance.paid)],
                    ["Fee per hour", finance.fee_per_hour === null ? "—" : formatMoney(finance.fee_per_hour)],
                  ].map(([label, value]) => (
                    <div key={label} className="bg-surface px-5 py-3">
                      <dt className="text-xs font-semibold tracking-wide text-muted uppercase">{label}</dt>
                      <dd className="mt-0.5 text-lg font-semibold text-ink tabular-nums">{value}</dd>
                    </div>
                  ))}
                </dl>
              ) : null}

              <div className="flex flex-col gap-5 p-5">
                <ActionForm action={saveFee} submitLabel="Save fee" quiet className="grid gap-3 sm:grid-cols-[12rem_minmax(0,1fr)] sm:items-end">
                  <input type="hidden" name="case_id" value={c.id} />
                  <div>
                    <label htmlFor="agreed-fee" className="field-label">Agreed fee</label>
                    <input id="agreed-fee" name="agreed_fee" type="number" min="0" step="0.01" inputMode="decimal" defaultValue={fee?.agreed_fee ?? ""} className="field" />
                  </div>
                  <div>
                    <label htmlFor="fee-note" className="field-label">Fee note (internal)</label>
                    <input id="fee-note" name="fee_note" maxLength={500} defaultValue={fee?.fee_note ?? ""} placeholder="e.g. Fixed fee per service agreement signed 3 Oct" className="field" />
                  </div>
                </ActionForm>

                <div>
                  <h3 className="text-sm font-semibold text-ink">Payment stages</h3>
                  {stagedMismatch ? (
                    <p className="mt-1 rounded-lg bg-warn-bg px-3 py-2 text-sm text-warn">
                      Stages add up to {formatMoney(finance!.staged)}, but the agreed fee is {formatMoney(finance!.agreed_fee)}.
                    </p>
                  ) : null}
                  {stages.length === 0 ? (
                    <p className="mt-1 text-sm text-muted">No stages yet. A common split is a deposit on signing, then the balance at lodgement.</p>
                  ) : (
                    <ul className="mt-2 divide-y divide-line rounded-lg border border-line">
                      {stages.map((s) =>
                        s.invoice ? (
                          <li key={s.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
                            <span className="min-w-0 flex-1">{s.label}</span>
                            <span className="tabular-nums">{formatMoney(s.amount)}</span>
                            <Link href={`/portal/invoices/${s.invoice.id}`} className="font-semibold text-accent-600 hover:underline">{s.invoice.invoice_no}</Link>
                            <InvoiceStatusChip status={s.invoice.status} />
                          </li>
                        ) : (
                          <li key={s.id} className="flex flex-wrap items-end gap-2 px-4 py-3">
                            <ActionForm action={saveStage} submitLabel="Save" quiet className="flex min-w-0 flex-1 flex-wrap items-end gap-2 [&>div:last-child]:flex-none">
                              <input type="hidden" name="case_id" value={c.id} />
                              <input type="hidden" name="id" value={s.id} />
                              <div className="min-w-0 flex-1 basis-48">
                                <label htmlFor={`st-l-${s.id}`} className="sr-only">Stage</label>
                                <input id={`st-l-${s.id}`} name="label" required maxLength={200} defaultValue={s.label} className="field" />
                              </div>
                              <div className="w-32">
                                <label htmlFor={`st-a-${s.id}`} className="sr-only">Amount</label>
                                <input id={`st-a-${s.id}`} name="amount" type="number" required min="0" step="0.01" inputMode="decimal" defaultValue={s.amount} className="field" />
                              </div>
                            </ActionForm>
                            <ActionForm action={deleteStage} submitLabel="Remove" pendingLabel="Removing…" quiet>
                              <input type="hidden" name="case_id" value={c.id} />
                              <input type="hidden" name="id" value={s.id} />
                            </ActionForm>
                          </li>
                        ),
                      )}
                    </ul>
                  )}
                  <ActionForm action={saveStage} submitLabel="Add stage" quiet className="mt-3 flex flex-wrap items-end gap-2 [&>div:last-child]:flex-none">
                    <input type="hidden" name="case_id" value={c.id} />
                    <div className="min-w-0 flex-1 basis-48">
                      <label htmlFor="new-stage-label" className="field-label">New stage</label>
                      <input id="new-stage-label" name="label" required maxLength={200} placeholder="e.g. Deposit on signing" className="field" />
                    </div>
                    <div className="w-32">
                      <label htmlFor="new-stage-amount" className="field-label">Amount</label>
                      <input id="new-stage-amount" name="amount" type="number" required min="0" step="0.01" inputMode="decimal" className="field" />
                    </div>
                  </ActionForm>
                </div>

                {invoices.length ? (
                  <div>
                    <h3 className="text-sm font-semibold text-ink">Invoices</h3>
                    <ul className="mt-2 divide-y divide-line rounded-lg border border-line text-sm">
                      {invoices.map((inv) => (
                        <li key={inv.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
                          <Link href={`/portal/invoices/${inv.id}`} className="font-semibold text-accent-600 hover:underline">{inv.invoice_no}</Link>
                          <span className="text-muted">{short(inv.issued_on)}</span>
                          <span className="ml-auto tabular-nums">{formatMoney(inv.total)}</span>
                          <InvoiceStatusChip status={inv.status} dueOn={inv.due_on} />
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            </section>
          ) : null}

          <section className="rounded-xl border border-line bg-surface" aria-labelledby="time-heading">
            <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-line p-5">
              <div>
                <h2 id="time-heading" className="text-xl font-semibold">Time on this case</h2>
                <p className="mt-0.5 text-sm text-muted">{adviser ? "Everyone's time, most recent first." : "Your time on this case."}</p>
              </div>
              <p className="text-lg font-semibold text-ink tabular-nums">{formatHours(entryHours)} h</p>
            </div>
            {entries.length === 0 ? (
              <p className="px-5 py-6 text-sm text-muted">
                No time logged yet. Log it from <Link href="/portal/my/day" className="font-semibold text-accent-600 underline">My day</Link>.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[620px] text-left text-sm">
                  <thead className="border-b border-line text-xs tracking-wide text-muted uppercase">
                    <tr>
                      <th className="px-5 py-2 font-semibold">Date</th>
                      {adviser ? <th className="px-3 py-2 font-semibold">Who</th> : null}
                      <th className="px-3 py-2 font-semibold">Work</th>
                      <th className="px-3 py-2 text-right font-semibold">Hours</th>
                      <th className="px-5 py-2 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {entries.map((e) => (
                      <tr key={e.id}>
                        <td className="px-5 py-2 whitespace-nowrap">{formatDay(e.entry_date, { day: "numeric", month: "short" })}</td>
                        {adviser ? <td className="px-3 py-2">{e.employee}</td> : null}
                        <td className="px-3 py-2">
                          {e.work_type ?? "—"}
                          {e.description ? <span className="block text-xs text-muted">{e.description}</span> : null}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">{formatHours(Number(e.hours ?? 0))}</td>
                        <td className="px-5 py-2"><StatusChip status={e.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        <aside className="flex flex-col gap-6">
          {client ? (
            <section className="rounded-xl border border-line bg-surface p-5">
              <h2 className="text-lg font-semibold">Client</h2>
              <p className="mt-2 font-semibold text-ink">{client.full_name}</p>
              <dl className="mt-1 flex flex-col gap-1 text-sm">
                {client.email ? <dd><a href={`mailto:${client.email}`} className="text-accent-600 hover:underline">{client.email}</a></dd> : null}
                {client.phone ? <dd><a href={`tel:${client.phone.replace(/[^\d+]/g, "")}`} className="text-accent-600 hover:underline">{client.phone}</a></dd> : null}
                {client.country ? <dd className="text-muted">{client.country}</dd> : null}
              </dl>
              {adviser ? (
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                  <Link href="/portal/admin/clients" className="font-semibold text-accent-600 hover:underline">Edit client</Link>
                  <Link href={`/portal/cases/new?client=${client.id}`} className="font-semibold text-accent-600 hover:underline">Open another case</Link>
                </div>
              ) : null}
            </section>
          ) : null}

          <section className="rounded-xl border border-line bg-surface p-5">
            <h2 className="text-lg font-semibold">Case details</h2>
            {adviser ? (
              <ActionForm action={updateCase} submitLabel="Save details" className="mt-3 flex flex-col gap-3">
                <input type="hidden" name="id" value={c.id} />
                <div>
                  <label htmlFor="cd-title" className="field-label">Title</label>
                  <input id="cd-title" name="title" required maxLength={120} defaultValue={c.title} className="field" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="cd-status" className="field-label">Status</label>
                    <select id="cd-status" name="status" defaultValue={c.status} className="field">
                      <option value="enquiry">Enquiry</option>
                      <option value="active">Active</option>
                      <option value="lodged">Lodged</option>
                      <option value="decided">Decided</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="cd-outcome" className="field-label">Outcome</label>
                    <select id="cd-outcome" name="outcome" defaultValue={c.outcome ?? ""} className="field">
                      <option value="">—</option>
                      <option value="approved">Approved</option>
                      <option value="declined">Declined</option>
                      <option value="withdrawn">Withdrawn</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="cd-lodged" className="field-label">Lodged</label>
                    <input id="cd-lodged" name="lodged_on" type="date" defaultValue={c.lodged_on ?? ""} className="field" />
                  </div>
                  <div>
                    <label htmlFor="cd-decided" className="field-label">Decided</label>
                    <input id="cd-decided" name="decided_on" type="date" defaultValue={c.decided_on ?? ""} className="field" />
                  </div>
                </div>
                <div>
                  <label htmlFor="cd-adviser" className="field-label">Adviser</label>
                  <select id="cd-adviser" name="adviser_id" defaultValue={c.adviser_id ?? ""} className="field">
                    <option value="">— Not assigned —</option>
                    {advisers.map((a) => <option key={a.user_id} value={a.user_id}>{a.display_name}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="cd-notes" className="field-label">Case notes</label>
                  <textarea id="cd-notes" name="notes" rows={5} maxLength={5000} defaultValue={c.notes} className="field" />
                </div>
              </ActionForm>
            ) : (
              <dl className="mt-3 flex flex-col gap-2 text-sm">
                <div><dt className="text-muted">Status</dt><dd><CaseStatusChip status={c.status} outcome={c.outcome} /></dd></div>
                <div><dt className="text-muted">Adviser</dt><dd>{c.adviser ?? "Not assigned"}</dd></div>
                {c.notes ? <div><dt className="text-muted">Notes</dt><dd className="whitespace-pre-line">{c.notes}</dd></div> : null}
              </dl>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
