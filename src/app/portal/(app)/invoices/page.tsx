import type { Metadata } from "next";
import Link from "next/link";
import { InvoiceStatusChip } from "@/components/portal/invoice-status-chip";
import { isAdmin, requireAdviser } from "@/lib/portal/auth";
import { formatDay, todayNZ } from "@/lib/portal/dates";
import { formatMoney } from "@/lib/portal/money";
import { createClient } from "@/lib/portal/supabase/server";
import type { InvoiceStatus } from "@/lib/portal/types";

export const metadata: Metadata = { title: "Invoices" };

type ReadyRow = { case_id: string; case_no: string; title: string; client: string | null; agreed_fee: number | null; unbilled: number; invoiced: number };
type InvoiceRow = {
  id: string;
  invoice_no: string;
  issued_on: string;
  due_on: string;
  paid_on: string | null;
  total: number;
  status: InvoiceStatus;
  case: { id: string; case_no: string; title: string } | null;
  client: { full_name: string } | null;
};

export default async function InvoicesPage() {
  const profile = await requireAdviser();
  const admin = isAdmin(profile.role);
  const supabase = await createClient();
  const year = todayNZ().slice(0, 4);

  const [readyRes, invoicesRes] = await Promise.all([
    supabase.from("v_case_finance").select("case_id, case_no, title, client, agreed_fee, unbilled, invoiced").gt("unbilled", 0).order("case_no"),
    supabase
      .from("invoices")
      .select("id, invoice_no, issued_on, due_on, paid_on, total, status, case:cases!invoices_case_id_fkey(id, case_no, title), client:clients!invoices_client_id_fkey(full_name)")
      .order("created_at", { ascending: false })
      .limit(500),
  ]);
  const ready = (readyRes.data ?? []) as ReadyRow[];
  const invoices = (invoicesRes.data ?? []) as unknown as InvoiceRow[];

  const readyAmount = ready.reduce((s, r) => s + Number(r.unbilled), 0);
  const awaiting = invoices.filter((i) => i.status === "issued");
  const outstanding = awaiting.reduce((s, i) => s + Number(i.total), 0);
  const overdue = awaiting.filter((i) => i.due_on < todayNZ()).length;
  const paidThisYear = invoices.filter((i) => i.status === "paid" && i.paid_on?.startsWith(year)).reduce((s, i) => s + Number(i.total), 0);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Invoices</h1>
          <p className="mt-1 text-muted">Fee stages ready to bill, and every invoice raised. Amounts include GST unless marked otherwise.</p>
        </div>
        {admin ? <Link href="/portal/invoices/new" className="btn btn-primary">+ New invoice</Link> : null}
      </div>

      <dl className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-line bg-surface p-4">
          <dt className="text-sm text-muted">Fee stages not yet billed</dt>
          <dd className="font-display text-2xl font-semibold text-ink tabular-nums">{formatMoney(readyAmount)}</dd>
          <dd className="text-sm text-muted">across {ready.length} {ready.length === 1 ? "case" : "cases"} (excl. GST)</dd>
        </div>
        <div className="rounded-xl border border-line bg-surface p-4">
          <dt className="text-sm text-muted">Issued, awaiting payment</dt>
          <dd className="font-display text-2xl font-semibold text-ink tabular-nums">{formatMoney(outstanding)}</dd>
          <dd className={`text-sm ${overdue ? "font-semibold text-warn" : "text-muted"}`}>
            {awaiting.length} {awaiting.length === 1 ? "invoice" : "invoices"}{overdue ? ` · ${overdue} overdue` : ""}
          </dd>
        </div>
        <div className="rounded-xl border border-line bg-surface p-4">
          <dt className="text-sm text-muted">Paid in {year}</dt>
          <dd className="font-display text-2xl font-semibold text-ink tabular-nums">{formatMoney(paidThisYear)}</dd>
        </div>
      </dl>

      <section aria-labelledby="ready-heading">
        <h2 id="ready-heading" className="text-xl font-semibold">Ready to bill</h2>
        {ready.length === 0 ? (
          <p className="mt-3 rounded-xl border border-line bg-surface px-5 py-6 text-center text-muted">
            No unbilled fee stages. Add fee stages on a case to bill it.
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-xl border border-line bg-surface">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-line text-xs tracking-wide text-muted uppercase">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">Case</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Agreed fee</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Invoiced</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Not yet billed</th>
                  <th className="px-4 py-2.5"><span className="sr-only">Bill</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {ready.map((r) => (
                  <tr key={r.case_id}>
                    <td className="px-4 py-2.5">
                      <Link href={`/portal/cases/${r.case_id}`} className="font-semibold text-ink hover:underline">{r.case_no} · {r.client ?? r.title}</Link>
                      <span className="block text-xs text-muted">{r.title}</span>
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{formatMoney(r.agreed_fee)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{formatMoney(r.invoiced)}</td>
                    <td className="px-4 py-2.5 text-right font-semibold tabular-nums">{formatMoney(r.unbilled)}</td>
                    <td className="px-4 py-2.5 text-right">
                      {admin ? <Link href={`/portal/invoices/new?case=${r.case_id}`} className="font-semibold text-accent-600 hover:underline">Invoice →</Link> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section aria-labelledby="all-heading">
        <h2 id="all-heading" className="text-xl font-semibold">All invoices</h2>
        {invoices.length === 0 ? (
          <p className="mt-3 rounded-xl border border-line bg-surface px-5 py-6 text-center text-muted">No invoices yet.</p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-xl border border-line bg-surface">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-line text-xs tracking-wide text-muted uppercase">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">Invoice</th>
                  <th className="px-4 py-2.5 font-semibold">Client</th>
                  <th className="px-4 py-2.5 font-semibold">Case</th>
                  <th className="px-4 py-2.5 font-semibold">Issued</th>
                  <th className="px-4 py-2.5 font-semibold">Due</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Total</th>
                  <th className="px-4 py-2.5 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {invoices.map((i) => (
                  <tr key={i.id} className={i.status === "void" ? "text-muted" : ""}>
                    <td className="px-4 py-2.5">
                      <Link href={`/portal/invoices/${i.id}`} className="font-semibold text-accent-600 hover:underline">{i.invoice_no}</Link>
                    </td>
                    <td className="px-4 py-2.5">{i.client?.full_name ?? "—"}</td>
                    <td className="px-4 py-2.5">{i.case?.case_no ?? "—"}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap">{formatDay(i.issued_on, { day: "numeric", month: "short", year: "numeric" })}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap">{formatDay(i.due_on, { day: "numeric", month: "short", year: "numeric" })}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{formatMoney(i.total)}</td>
                    <td className="px-4 py-2.5"><InvoiceStatusChip status={i.status} dueOn={i.due_on} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
