import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/portal/supabase/server";
import { FilterSubmit } from "@/components/portal/pending-buttons";

export const metadata: Metadata = { title: "Audit log" };

const PAGE = 100;
const TABLES: Record<string, string> = {
  time_entries: "Time entry",
  cases: "Case",
  case_fees: "Case fee",
  fee_stages: "Fee stage",
  checklist_items: "Checklist item",
  leave_requests: "Leave",
  clients: "Client",
  work_types: "Work type",
  profiles: "Staff",
  invoices: "Invoice",
  settings: "Settings",
  public_holidays: "Public holiday",
};
const VERB: Record<string, string> = { INSERT: "Added", UPDATE: "Changed", DELETE: "Deleted" };
const HIDDEN = new Set(["updated_at", "created_at"]);

type LogRow = { id: number; actor_id: string | null; table_name: string; row_id: string; action: string; before: Record<string, unknown> | null; after: Record<string, unknown> | null; at: string };

const show = (v: unknown) => (v === null || v === undefined || v === "" ? "blank" : typeof v === "object" ? JSON.stringify(v) : String(v));

// "hours: 2 → 3.5" for updates; a short summary for inserts and deletes.
function describe(row: LogRow): string {
  if (row.action === "UPDATE" && row.before && row.after) {
    const changes = Object.keys(row.after)
      .filter((k) => !HIDDEN.has(k) && show(row.before?.[k]) !== show(row.after?.[k]))
      .map((k) => `${k.replace(/_/g, " ")}: ${show(row.before?.[k])} → ${show(row.after?.[k])}`);
    return changes.join(" · ") || "No visible change";
  }
  const record = row.after ?? row.before ?? {};
  const keys = ["display_name", "full_name", "name", "case_no", "title", "label", "invoice_no", "entry_date", "hours", "description", "amount", "agreed_fee", "day", "status"];
  return keys.filter((k) => record[k] !== undefined && record[k] !== null && record[k] !== "").map((k) => `${k.replace(/_/g, " ")}: ${show(record[k])}`).join(" · ");
}

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const table = typeof params.table === "string" && TABLES[params.table] ? params.table : "";
  const page = Math.max(0, Number.parseInt(typeof params.page === "string" ? params.page : "0", 10) || 0);

  const supabase = await createClient();
  let query = supabase.from("audit_log").select("id, actor_id, table_name, row_id, action, before, after, at").order("at", { ascending: false }).range(page * PAGE, page * PAGE + PAGE);
  if (table) query = query.eq("table_name", table);
  const [{ data, error }, { data: people }] = await Promise.all([query, supabase.from("profiles").select("user_id, display_name")]);

  const rows = ((data ?? []) as LogRow[]).slice(0, PAGE);
  const hasMore = (data ?? []).length > PAGE;
  const names = new Map((people ?? []).map((p) => [p.user_id, p.display_name]));
  const when = new Intl.DateTimeFormat("en-NZ", { timeZone: "Pacific/Auckland", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false });
  const link = (p: number) => `/portal/admin/audit?${new URLSearchParams({ ...(table ? { table } : {}), page: String(p) })}`;

  return (
    <div className="flex flex-col gap-5">
      <form action={"/portal/admin/audit"} className="flex flex-wrap items-end gap-3">
        <div className="min-w-52">
          <label htmlFor="a-table" className="field-label">Show changes to</label>
          <select id="a-table" name="table" defaultValue={table} className="field">
            <option value="">Everything</option>
            {Object.entries(TABLES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>
        <FilterSubmit className="btn btn-quiet">Filter</FilterSubmit>
      </form>

      {error ? (
        <p role="alert" className="rounded-lg bg-bad-bg px-3 py-2 text-sm text-bad">Couldn&apos;t load the log: {error.message}</p>
      ) : rows.length === 0 ? (
        <p className="rounded-xl border border-line bg-surface px-5 py-8 text-center text-muted">No changes recorded yet.</p>
      ) : (
        <div className="relative overflow-x-auto rounded-xl border border-line bg-surface">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-line text-xs tracking-wide text-muted uppercase">
              <tr>
                <th className="px-4 py-2.5 font-semibold">When</th>
                <th className="px-4 py-2.5 font-semibold">Who</th>
                <th className="px-4 py-2.5 font-semibold">What</th>
                <th className="px-4 py-2.5 font-semibold">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((r) => (
                <tr key={r.id} className="align-top">
                  <td className="px-4 py-2.5 whitespace-nowrap tabular-nums">{when.format(new Date(r.at))}</td>
                  <td className="px-4 py-2.5 whitespace-nowrap">{r.actor_id ? names.get(r.actor_id) ?? "Unknown user" : "System"}</td>
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    <span className={r.action === "DELETE" ? "font-semibold text-bad" : "font-semibold text-ink"}>{VERB[r.action] ?? r.action}</span>{" "}
                    {(TABLES[r.table_name] ?? r.table_name).toLowerCase()}
                  </td>
                  <td className="px-4 py-2.5 text-muted">{describe(r)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex justify-between text-sm font-semibold text-accent-600">
        {page > 0 ? <Link href={link(page - 1)} className="hover:underline">← Newer</Link> : <span />}
        {hasMore ? <Link href={link(page + 1)} className="hover:underline">Older →</Link> : <span />}
      </div>
    </div>
  );
}
