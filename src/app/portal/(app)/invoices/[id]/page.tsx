import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/portal/action-form";
import { InvoiceStatusChip } from "@/components/portal/invoice-status-chip";
import { PrintButton } from "@/components/portal/print-button";
import { isAdmin, requireAdviser } from "@/lib/portal/auth";
import { formatDay, todayNZ } from "@/lib/portal/dates";
import { formatMoney } from "@/lib/portal/money";
import { createClient } from "@/lib/portal/supabase/server";
import type { InvoiceStatus } from "@/lib/portal/types";
import { setInvoicePaid, voidInvoice } from "../actions";

export const metadata: Metadata = { title: "Invoice" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const long = (iso: string) => formatDay(iso, { day: "numeric", month: "long", year: "numeric" });

type Invoice = {
  id: string;
  invoice_no: string;
  issued_on: string;
  due_on: string;
  paid_on: string | null;
  subtotal: number;
  gst_rate: number;
  gst: number;
  total: number;
  status: InvoiceStatus;
  notes: string;
  case: { id: string; case_no: string; title: string } | null;
  client: { full_name: string; email: string | null; phone: string | null; country: string | null } | null;
  lines: { id: string; description: string; amount: number; sort_order: number }[];
};

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const profile = await requireAdviser();
  const admin = isAdmin(profile.role);
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const supabase = await createClient();
  const [invRes, settingsRes] = await Promise.all([
    supabase
      .from("invoices")
      .select("*, case:cases!invoices_case_id_fkey(id, case_no, title), client:clients!invoices_client_id_fkey(full_name, email, phone, country), lines:invoice_lines(id, description, amount, sort_order)")
      .eq("id", id)
      .maybeSingle(),
    supabase.from("settings").select("company_name, trading_name, gst_number, address, contact_line, bank_details").maybeSingle(),
  ]);
  const inv = invRes.data as unknown as Invoice | null;
  if (!inv) notFound();
  const s = settingsRes.data;
  const lines = [...inv.lines].sort((a, b) => a.sort_order - b.sort_order);
  const gstPct = Number(inv.gst_rate) * 100;

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/portal/invoices" className="text-sm font-semibold text-accent-600 hover:underline">← Invoices</Link>
        <div className="flex items-center gap-3">
          <InvoiceStatusChip status={inv.status} dueOn={inv.due_on} />
          <PrintButton />
        </div>
      </div>

      {inv.status === "void" ? (
        <p className="rounded-xl border border-bad/30 bg-bad-bg px-4 py-3 text-sm font-semibold text-bad">This invoice is void. Its number is not reused.</p>
      ) : null}

      <article className="print-portrait rounded-xl border border-line bg-surface p-6 sm:p-10 print:border-0 print:p-0">
        <header className="flex flex-wrap items-start justify-between gap-6 border-b border-line pb-6">
          <div>
            <p className="font-display text-2xl font-semibold text-ink">{s?.company_name}</p>
            {s?.trading_name ? <p className="text-sm text-muted">Trading as {s.trading_name}</p> : null}
            <p className="mt-2 text-sm whitespace-pre-line text-muted">{s?.address}</p>
            <p className="text-sm text-muted">{s?.contact_line}</p>
            {s?.gst_number ? <p className="mt-1 text-sm text-muted">GST number {s.gst_number}</p> : null}
          </div>
          <div className="text-right">
            <p className="text-2xl font-semibold tracking-wide text-ink uppercase">{Number(inv.gst_rate) > 0 ? "Tax invoice" : "Invoice"}</p>
            <dl className="mt-2 grid grid-cols-[auto_auto] justify-end gap-x-4 gap-y-0.5 text-sm">
              <dt className="text-muted">Invoice no.</dt><dd className="font-semibold text-ink">{inv.invoice_no}</dd>
              <dt className="text-muted">Date</dt><dd>{long(inv.issued_on)}</dd>
              <dt className="text-muted">Due</dt><dd>{long(inv.due_on)}</dd>
              {inv.case ? <><dt className="text-muted">Our ref.</dt><dd>{inv.case.case_no}</dd></> : null}
            </dl>
          </div>
        </header>

        <section className="grid gap-6 py-6 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold tracking-wide text-muted uppercase">Bill to</p>
            <p className="mt-1 font-semibold text-ink">{inv.client?.full_name ?? "—"}</p>
            {inv.client?.email ? <p className="text-sm text-muted">{inv.client.email}</p> : null}
            {inv.client?.phone ? <p className="text-sm text-muted">{inv.client.phone}</p> : null}
            {inv.client?.country ? <p className="text-sm text-muted">{inv.client.country}</p> : null}
          </div>
          {inv.case ? (
            <div>
              <p className="text-xs font-semibold tracking-wide text-muted uppercase">Matter</p>
              <p className="mt-1 text-ink">{inv.case.title}</p>
            </div>
          ) : null}
        </section>

        <table className="w-full text-left text-sm">
          <thead className="border-y border-line text-xs tracking-wide text-muted uppercase">
            <tr>
              <th className="py-2.5 pr-4 font-semibold">Description</th>
              <th className="py-2.5 text-right font-semibold">Amount (excl. GST)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {lines.map((l) => (
              <tr key={l.id}>
                <td className="py-2.5 pr-4">{l.description}</td>
                <td className="py-2.5 text-right tabular-nums">{formatMoney(l.amount)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="text-sm">
            <tr className="border-t border-line">
              <td className="pt-3 pr-4 text-right text-muted">Subtotal</td>
              <td className="pt-3 text-right tabular-nums">{formatMoney(inv.subtotal)}</td>
            </tr>
            <tr>
              <td className="pt-1 pr-4 text-right text-muted">GST ({Number.isInteger(gstPct) ? gstPct : gstPct.toFixed(2)}%)</td>
              <td className="pt-1 text-right tabular-nums">{formatMoney(inv.gst)}</td>
            </tr>
            <tr>
              <td className="pt-2 pr-4 text-right font-semibold text-ink">Total (NZD)</td>
              <td className="pt-2 text-right text-lg font-semibold text-ink tabular-nums">{formatMoney(inv.total)}</td>
            </tr>
          </tfoot>
        </table>

        {inv.notes ? <p className="mt-6 text-sm text-muted">{inv.notes}</p> : null}

        <footer className="mt-8 border-t border-line pt-4 text-sm">
          {inv.status === "void" ? (
            <p className="font-semibold text-bad">Void. Nothing is owed on this invoice.</p>
          ) : inv.status === "paid" && inv.paid_on ? (
            <p className="font-semibold text-ok">Paid {long(inv.paid_on)}. Thank you.</p>
          ) : (
            <>
              <p className="font-semibold text-ink">Please pay by {long(inv.due_on)}, quoting {inv.invoice_no}.</p>
              {s?.bank_details ? <p className="mt-1 whitespace-pre-line text-muted">{s.bank_details}</p> : null}
            </>
          )}
        </footer>
      </article>

      {admin && inv.status !== "void" ? (
        <div className="grid gap-4 sm:grid-cols-2 print:hidden">
          <section className="rounded-xl border border-line bg-surface p-5">
            <h2 className="text-lg font-semibold">{inv.status === "paid" ? "Payment" : "Record payment"}</h2>
            {inv.status === "paid" ? (
              <ActionForm action={setInvoicePaid} submitLabel="Mark as unpaid" quiet className="mt-3 flex flex-col gap-3">
                <input type="hidden" name="id" value={inv.id} />
                <input type="hidden" name="unpaid" value="1" />
              </ActionForm>
            ) : (
              <ActionForm action={setInvoicePaid} submitLabel="Mark as paid" className="mt-3 flex flex-col gap-3">
                <input type="hidden" name="id" value={inv.id} />
                <div>
                  <label htmlFor="paid-on" className="field-label">Date paid</label>
                  <input id="paid-on" name="paid_on" type="date" required defaultValue={todayNZ()} className="field" />
                </div>
              </ActionForm>
            )}
          </section>
          <section className="rounded-xl border border-bad/30 bg-surface p-5">
            <h2 className="text-lg font-semibold">Void this invoice</h2>
            <p className="mt-1 text-sm text-muted">For a mistake. Its fee stages become billable again; the number is never reused.</p>
            <ActionForm action={voidInvoice} submitLabel="Void invoice" pendingLabel="Voiding…" quiet className="mt-3 flex flex-col gap-3">
              <input type="hidden" name="id" value={inv.id} />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="confirm" className="size-4 accent-ink" />
                Yes, void {inv.invoice_no}
              </label>
            </ActionForm>
          </section>
        </div>
      ) : null}
    </div>
  );
}
