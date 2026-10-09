import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm } from "@/components/portal/action-form";
import { FilterSubmit } from "@/components/portal/pending-buttons";
import { requireAdmin } from "@/lib/portal/auth";
import { todayNZ } from "@/lib/portal/dates";
import { formatMoney } from "@/lib/portal/money";
import { createClient } from "@/lib/portal/supabase/server";
import { createInvoice } from "../actions";

export const metadata: Metadata = { title: "New invoice" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const caseId = typeof params.case === "string" && UUID.test(params.case) ? params.case : "";

  const supabase = await createClient();
  const [casesRes, stagesRes, settingsRes, caseRes] = await Promise.all([
    supabase.from("v_cases").select("id, case_no, title, client").eq("is_internal", false).order("case_no", { ascending: false }),
    caseId
      ? supabase.from("fee_stages").select("id, label, amount, sort_order").eq("case_id", caseId).is("invoice_id", null).order("sort_order")
      : Promise.resolve({ data: [] as { id: string; label: string; amount: number; sort_order: number }[] }),
    supabase.from("settings").select("gst_rate, payment_terms_days").maybeSingle(),
    caseId ? supabase.from("v_cases").select("case_no, title, client, client_email").eq("id", caseId).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const stages = stagesRes.data ?? [];
  const chosen = caseRes.data;
  const gst = Number(settingsRes.data?.gst_rate ?? 0.15);

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <Link href="/portal/invoices" className="text-sm font-semibold text-accent-600 hover:underline">← Invoices</Link>
        <h1 className="mt-2 text-3xl font-semibold">New invoice</h1>
        <p className="mt-1 text-muted">
          Bill one or more fee stages of a case. GST ({(gst * 100).toFixed(gst * 100 % 1 ? 2 : 0)}%) is added and the invoice is due in{" "}
          {settingsRes.data?.payment_terms_days ?? 7} days. Both can be changed under Setup → Company &amp; GST.
        </p>
      </div>

      <form action="/portal/invoices/new" className="flex flex-wrap items-end gap-3 rounded-xl border border-line bg-surface p-4">
        <div className="min-w-0 flex-1 basis-72">
          <label htmlFor="inv-case" className="field-label">Case</label>
          <select id="inv-case" name="case" defaultValue={caseId} className="field">
            <option value="" disabled>Choose a case…</option>
            {(casesRes.data ?? []).map((c) => (
              <option key={c.id} value={c.id}>{c.case_no} · {c.client} · {c.title}</option>
            ))}
          </select>
        </div>
        <FilterSubmit className="btn btn-quiet">Show fee stages</FilterSubmit>
      </form>

      {caseId && chosen ? (
        <section className="rounded-xl border border-line bg-surface p-5">
          <h2 className="text-xl font-semibold">{chosen.case_no} · {chosen.client}</h2>
          <p className="text-sm text-muted">{chosen.title}{chosen.client_email ? ` · ${chosen.client_email}` : ""}</p>
          <ActionForm action={createInvoice} submitLabel="Create invoice" pendingLabel="Creating…" className="mt-5 flex flex-col gap-5">
            <input type="hidden" name="case_id" value={caseId} />
            <fieldset>
              <legend className="field-label">Fee stages to bill</legend>
              {stages.length === 0 ? (
                <p className="rounded-lg bg-warn-bg px-3 py-2 text-sm text-warn">
                  Every fee stage on this case is already billed, or none have been set up.{" "}
                  <Link href={`/portal/cases/${caseId}#fees`} className="font-semibold underline">Add fee stages on the case</Link>, or bill an extra line below.
                </p>
              ) : (
                <ul className="divide-y divide-line rounded-lg border border-line">
                  {stages.map((s) => (
                    <li key={s.id}>
                      <label className="flex cursor-pointer items-center gap-3 px-3 py-2.5">
                        <input type="checkbox" name="stage_ids" value={s.id} defaultChecked={stages.length === 1} className="size-4 accent-ink" />
                        <span className="flex-1 text-ink">{s.label}</span>
                        <span className="tabular-nums">{formatMoney(s.amount)}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </fieldset>
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_10rem]">
              <div>
                <label htmlFor="inv-extra-desc" className="field-label">Extra line (optional)</label>
                <input id="inv-extra-desc" name="extra_desc" maxLength={200} placeholder="e.g. Courier and certified copies" className="field" />
              </div>
              <div>
                <label htmlFor="inv-extra-amount" className="field-label">Amount (excl. GST)</label>
                <input id="inv-extra-amount" name="extra_amount" type="number" min={0} step={0.01} className="field tabular-nums" />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-[12rem_minmax(0,1fr)]">
              <div>
                <label htmlFor="inv-date" className="field-label">Invoice date</label>
                <input id="inv-date" name="issued_on" type="date" required defaultValue={todayNZ()} className="field" />
              </div>
              <div>
                <label htmlFor="inv-notes" className="field-label">Note on the invoice (optional)</label>
                <input id="inv-notes" name="notes" maxLength={1000} className="field" placeholder="e.g. As per our client agreement dated …" />
              </div>
            </div>
          </ActionForm>
        </section>
      ) : null}
    </div>
  );
}
