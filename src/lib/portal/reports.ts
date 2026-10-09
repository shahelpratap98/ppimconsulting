import type { SupabaseClient } from "@supabase/supabase-js";
import { formatHours } from "@/lib/portal/dates";

// One definition per report, used by both the on-screen page and the CSV
// export so the two can never disagree.

export type ColumnType = "text" | "date" | "hours" | "money" | "int";
export type Column = { key: string; label: string; type: ColumnType };
export type Cell = string | number | null;
export type ReportTable = {
  name: string;
  columns: Column[];
  rows: Record<string, Cell>[];
  totals?: Record<string, Cell>;
  empty: string;
};
export type Report = { title: string; subtitle: string; tables: ReportTable[]; notice?: string };

export const REPORTS = [
  { slug: "hours-check", label: "Hours check", adviserOnly: false },
  { slug: "person", label: "Time by person", adviserOnly: false },
  { slug: "cases", label: "Time by case", adviserOnly: true },
  { slug: "matrix", label: "Case × person", adviserOnly: true },
  { slug: "profitability", label: "Case profitability", adviserOnly: true },
] as const;
export type ReportSlug = (typeof REPORTS)[number]["slug"];

export type ReportParams = {
  from: string;
  to: string;
  userId: string; // "" = everyone
  caseId: string; // "" = all cases
  selfId: string; // staff are pinned to themselves
};

type Entry = {
  id: string;
  entry_date: string;
  user_id: string;
  employee: string;
  case_id: string | null;
  case_no: string | null;
  case_title: string | null;
  client: string | null;
  is_internal: boolean | null;
  work_type: string | null;
  hours: number | null;
  description: string;
  status: string;
};

const ENTRY_COLUMNS = "id, entry_date, user_id, employee, case_id, case_no, case_title, client, is_internal, work_type, hours, description, status";

const num = (v: unknown) => Number(v ?? 0);
const round2 = (n: number) => Math.round(n * 100) / 100;
const daysBetween = (from: string, to: string) =>
  Math.round((Date.parse(to + "T00:00:00Z") - Date.parse(from + "T00:00:00Z")) / 86400000) + 1;
const period = (p: ReportParams) => `${p.from} to ${p.to}`;
const sum = <T>(rows: T[], f: (r: T) => number) => round2(rows.reduce((s, r) => s + f(r), 0));
const caseName = (e: Entry) => (e.is_internal ? "Office & admin" : [e.client, e.case_title].filter(Boolean).join(" · "));

// PostgREST returns at most 1000 rows per request; page through the rest.
async function fetchEntries(supabase: SupabaseClient, p: ReportParams): Promise<Entry[]> {
  const all: Entry[] = [];
  for (let page = 0; page < 20; page++) {
    let q = supabase
      .from("v_entries")
      .select(ENTRY_COLUMNS)
      .neq("status", "draft") // drafts haven't been sent
      .gte("entry_date", p.from)
      .lte("entry_date", p.to)
      .order("entry_date")
      .order("employee")
      .order("id")
      .range(page * 1000, page * 1000 + 999);
    if (p.userId) q = q.eq("user_id", p.userId);
    if (p.caseId) q = q.eq("case_id", p.caseId);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    all.push(...((data ?? []) as Entry[]));
    if (!data || data.length < 1000) break;
  }
  return all;
}

const statusLabel = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// ------------------------------------------------------------------ hours check

async function hoursCheck(supabase: SupabaseClient, p: ReportParams): Promise<Report> {
  const title = "Hours check";
  const subtitle = `${period(p)} · short, over and full days against the standard day`;
  if (!p.userId && daysBetween(p.from, p.to) > 62) {
    return { title, subtitle, tables: [], notice: "For everyone at once, keep the range to two months or less. Pick one person to look further back." };
  }

  type Day = { user_id: string; employee: string; day: string; is_weekend: boolean; holiday: string | null; leave?: string | null; hours: number; standard: number; overtime: number; status: string };
  let days: Day[] = [];
  for (let page = 0; page < 10; page++) {
    const { data, error } = await supabase.rpc("hours_check", { p_from: p.from, p_to: p.to }).range(page * 1000, page * 1000 + 999);
    if (error) throw new Error(error.message);
    days.push(...((data ?? []) as Day[]));
    if (!data || data.length < 1000) break;
  }
  if (p.userId) days = days.filter((d) => d.user_id === p.userId);

  const people = new Map<string, { employee: string; short: number; over: number; full: number; leave: number; overtime: number; total: number }>();
  for (const d of days) {
    const s = people.get(d.user_id) ?? { employee: d.employee, short: 0, over: 0, full: 0, leave: 0, overtime: 0, total: 0 };
    if (d.status.startsWith("SHORT")) s.short++;
    else if (d.status.startsWith("Over")) s.over++;
    else if (d.status.startsWith("OK")) s.full++;
    else if (d.status.startsWith("On leave")) s.leave++;
    s.overtime += num(d.overtime); // includes any weekend / public-holiday hours
    s.total += num(d.hours);
    people.set(d.user_id, s);
  }

  return {
    title,
    subtitle,
    tables: [
      {
        name: "By person",
        empty: "No active staff.",
        columns: [
          { key: "employee", label: "Person", type: "text" },
          { key: "short", label: "Short days", type: "int" },
          { key: "over", label: "Over days", type: "int" },
          { key: "full", label: "Full days", type: "int" },
          { key: "leave", label: "Leave days", type: "int" },
          { key: "overtime", label: "Overtime hrs", type: "hours" },
          { key: "total", label: "Total hrs", type: "hours" },
        ],
        rows: [...people.values()].map((s) => ({ ...s, overtime: round2(s.overtime), total: round2(s.total) })),
      },
      {
        name: "Daily",
        empty: "No days in this range.",
        columns: [
          { key: "employee", label: "Person", type: "text" },
          { key: "day", label: "Date", type: "date" },
          { key: "hours", label: "Hours", type: "hours" },
          { key: "standard", label: "Standard", type: "hours" },
          { key: "status", label: "Status", type: "text" },
        ],
        // Empty weekends are noise; public holidays always show so the gap is explained.
        rows: days
          .filter((d) => !d.is_weekend || d.holiday !== null || d.leave || num(d.hours) > 0)
          .map((d) => ({ employee: d.employee, day: d.day, hours: num(d.hours), standard: num(d.standard), status: d.status })),
      },
    ],
  };
}

// ------------------------------------------------------------------ time by person

async function personDetail(supabase: SupabaseClient, p: ReportParams): Promise<Report> {
  const title = "Time by person";
  if (!p.userId) return { title, subtitle: period(p), tables: [], notice: "Pick a person to see their time." };
  const entries = await fetchEntries(supabase, p);
  const name = entries[0]?.employee ?? "";
  const total = sum(entries, (e) => num(e.hours));

  const byCase = new Map<string, { case_no: string; case: string; hours: number; entries: number }>();
  for (const e of entries) {
    const key = e.case_id ?? "none";
    const s = byCase.get(key) ?? { case_no: e.case_no ?? "", case: caseName(e), hours: 0, entries: 0 };
    s.hours += num(e.hours);
    s.entries++;
    byCase.set(key, s);
  }

  return {
    title,
    subtitle: `${name ? name + " · " : ""}${period(p)} · ${formatHours(total)} hours across ${entries.length} entries`,
    tables: [
      {
        name: "By case",
        empty: "No submitted time in this period.",
        columns: [
          { key: "case_no", label: "Case", type: "text" },
          { key: "case", label: "Client · matter", type: "text" },
          { key: "hours", label: "Hours", type: "hours" },
          { key: "entries", label: "Entries", type: "int" },
        ],
        rows: [...byCase.values()].sort((a, b) => b.hours - a.hours).map((s) => ({ ...s, hours: round2(s.hours) })),
        totals: { case_no: "TOTAL", hours: total, entries: entries.length },
      },
      {
        name: "Daily detail",
        empty: "No submitted time in this period.",
        columns: [
          { key: "date", label: "Date", type: "date" },
          { key: "case_no", label: "Case", type: "text" },
          { key: "case", label: "Client · matter", type: "text" },
          { key: "work_type", label: "Work", type: "text" },
          { key: "hours", label: "Hours", type: "hours" },
          { key: "description", label: "Description", type: "text" },
          { key: "status", label: "Status", type: "text" },
        ],
        rows: entries.map((e) => ({
          date: e.entry_date,
          case_no: e.case_no,
          case: caseName(e),
          work_type: e.work_type,
          hours: num(e.hours),
          description: e.description,
          status: statusLabel(e.status),
        })),
        totals: { date: "TOTAL", hours: total },
      },
    ],
  };
}

// ------------------------------------------------------------------ time by case

async function byCase(supabase: SupabaseClient, p: ReportParams): Promise<Report> {
  const [entries, { data: types }] = await Promise.all([fetchEntries(supabase, p), supabase.from("work_types").select("name").order("sort_order")]);
  const used = (types ?? []).map((t) => t.name as string).filter((name) => entries.some((e) => e.work_type === name));

  const cases = new Map<string, { case_no: string; case: string; rows: Entry[] }>();
  for (const e of entries) {
    const key = e.case_id ?? "none";
    const s = cases.get(key) ?? { case_no: e.case_no ?? "", case: caseName(e), rows: [] };
    s.rows.push(e);
    cases.set(key, s);
  }

  const rows = [...cases.values()]
    .sort((a, b) => a.case_no.localeCompare(b.case_no))
    .map(({ case_no, case: name, rows: r }) => ({
      case_no,
      case: name,
      hours: sum(r, (e) => num(e.hours)),
      people: new Set(r.map((e) => e.user_id)).size,
      entries: r.length,
      ...Object.fromEntries(used.map((t) => ["wt:" + t, sum(r.filter((e) => e.work_type === t), (e) => num(e.hours))])),
    }) as Record<string, Cell>);

  const single = p.caseId && entries[0] ? `${entries[0].case_no} · ${caseName(entries[0])}` : "All cases";
  const total = sum(entries, (e) => num(e.hours));

  return {
    title: "Time by case",
    subtitle: `${single} · ${period(p)} · ${formatHours(total)} hours`,
    tables: [
      {
        name: "Summary",
        empty: "No submitted time in this period.",
        columns: [
          { key: "case_no", label: "Case", type: "text" },
          { key: "case", label: "Client · matter", type: "text" },
          { key: "hours", label: "Hours", type: "hours" },
          { key: "people", label: "People", type: "int" },
          { key: "entries", label: "Entries", type: "int" },
          ...used.map((t) => ({ key: "wt:" + t, label: t, type: "hours" }) as Column),
        ],
        rows,
        totals: {
          case_no: "TOTAL",
          hours: total,
          entries: entries.length,
          ...Object.fromEntries(used.map((t) => ["wt:" + t, sum(entries.filter((e) => e.work_type === t), (e) => num(e.hours))])),
        },
      },
      ...(p.caseId
        ? [
            {
              name: "Daily detail",
              empty: "No submitted time on this case in this period.",
              columns: [
                { key: "date", label: "Date", type: "date" },
                { key: "employee", label: "Person", type: "text" },
                { key: "work_type", label: "Work", type: "text" },
                { key: "hours", label: "Hours", type: "hours" },
                { key: "description", label: "Description", type: "text" },
                { key: "status", label: "Status", type: "text" },
              ] as Column[],
              rows: entries.map((e) => ({
                date: e.entry_date,
                employee: e.employee,
                work_type: e.work_type,
                hours: num(e.hours),
                description: e.description,
                status: statusLabel(e.status),
              })),
            },
          ]
        : []),
    ],
  };
}

// ------------------------------------------------------------------ case x person

async function matrix(supabase: SupabaseClient, p: ReportParams): Promise<Report> {
  const entries = await fetchEntries(supabase, { ...p, userId: "", caseId: "" });
  const staff = [...new Map(entries.map((e) => [e.user_id, e.employee])).entries()].sort((a, b) => a[1].localeCompare(b[1]));
  const cases = new Map<string, { case_no: string; case: string; rows: Entry[] }>();
  for (const e of entries) {
    const key = e.case_id ?? "none";
    const s = cases.get(key) ?? { case_no: e.case_no ?? "", case: caseName(e), rows: [] };
    s.rows.push(e);
    cases.set(key, s);
  }

  const rows = [...cases.values()]
    .sort((a, b) => a.case_no.localeCompare(b.case_no))
    .map(({ case_no, case: name, rows: r }) => ({
      case_no,
      case: name,
      ...Object.fromEntries(staff.map(([id]) => ["u:" + id, sum(r.filter((e) => e.user_id === id), (e) => num(e.hours))])),
      total: sum(r, (e) => num(e.hours)),
    }) as Record<string, Cell>);

  return {
    title: "Hours by case and person",
    subtitle: period(p),
    tables: [
      {
        name: "Case x person",
        empty: "No submitted time in this period.",
        columns: [
          { key: "case_no", label: "Case", type: "text" },
          { key: "case", label: "Client · matter", type: "text" },
          ...staff.map(([id, name]) => ({ key: "u:" + id, label: name, type: "hours" }) as Column),
          { key: "total", label: "Total", type: "hours" },
        ],
        rows,
        totals: {
          case_no: "TOTAL",
          ...Object.fromEntries(staff.map(([id]) => ["u:" + id, sum(entries.filter((e) => e.user_id === id), (e) => num(e.hours))])),
          total: sum(entries, (e) => num(e.hours)),
        },
      },
    ],
  };
}

// ------------------------------------------------------------------ case profitability
// Fixed fees against the time actually spent, for cases opened in the period.
// Hours are all time logged on the case (submitted or approved), not just the period.

async function profitability(supabase: SupabaseClient, p: ReportParams): Promise<Report> {
  const { data: cases, error } = await supabase
    .from("cases")
    .select("id, case_no, pathway, status, opened_on, adviser:profiles!cases_adviser_id_fkey(display_name)")
    .eq("is_internal", false)
    .gte("opened_on", p.from)
    .lte("opened_on", p.to)
    .order("case_no");
  if (error) throw new Error(error.message);
  const ids = (cases ?? []).map((c) => c.id as string);
  const { data: fin, error: finError } = ids.length
    ? await supabase.from("v_case_finance").select("case_id, client, title, agreed_fee, invoiced, paid, hours, fee_per_hour").in("case_id", ids)
    : { data: [], error: null };
  if (finError) throw new Error(finError.message);
  type Fin = { case_id: string; client: string | null; title: string; agreed_fee: number | null; invoiced: number; paid: number; hours: number; fee_per_hour: number | null };
  const byId = new Map(((fin ?? []) as Fin[]).map((f) => [f.case_id, f]));

  const rows = (cases ?? []).map((c) => {
    const f = byId.get(c.id as string);
    const adviser = (c.adviser as unknown as { display_name: string } | null)?.display_name ?? "";
    return {
      case_no: c.case_no as string,
      case: [f?.client, f?.title].filter(Boolean).join(" · "),
      adviser,
      status: statusLabel(c.status as string),
      agreed_fee: f?.agreed_fee === null || f?.agreed_fee === undefined ? null : num(f.agreed_fee),
      invoiced: num(f?.invoiced),
      paid: num(f?.paid),
      outstanding: round2(num(f?.invoiced) - num(f?.paid)),
      hours: num(f?.hours),
      fee_per_hour: f?.fee_per_hour === null || f?.fee_per_hour === undefined ? null : num(f.fee_per_hour),
    } as Record<string, Cell>;
  });

  const totalFee = sum(rows, (r) => num(r.agreed_fee));
  const totalHours = sum(rows, (r) => num(r.hours));
  const feeHours = sum(rows.filter((r) => r.agreed_fee !== null), (r) => num(r.hours));

  return {
    title: "Case profitability",
    subtitle: `Cases opened ${period(p)} · fees exclude GST · hours are all time logged on each case`,
    tables: [
      {
        name: "Cases",
        empty: "No cases opened in this period.",
        columns: [
          { key: "case_no", label: "Case", type: "text" },
          { key: "case", label: "Client · matter", type: "text" },
          { key: "adviser", label: "Adviser", type: "text" },
          { key: "status", label: "Status", type: "text" },
          { key: "agreed_fee", label: "Agreed fee", type: "money" },
          { key: "invoiced", label: "Invoiced", type: "money" },
          { key: "paid", label: "Paid", type: "money" },
          { key: "outstanding", label: "Owing", type: "money" },
          { key: "hours", label: "Hours", type: "hours" },
          { key: "fee_per_hour", label: "Fee per hour", type: "money" },
        ],
        rows,
        totals: {
          case_no: "TOTAL",
          agreed_fee: totalFee,
          invoiced: sum(rows, (r) => num(r.invoiced)),
          paid: sum(rows, (r) => num(r.paid)),
          outstanding: sum(rows, (r) => num(r.outstanding)),
          hours: totalHours,
          // Only cases with a fee set count towards the average.
          fee_per_hour: feeHours > 0 ? round2(totalFee / feeHours) : null,
        },
      },
    ],
  };
}

const BUILDERS: Record<ReportSlug, (s: SupabaseClient, p: ReportParams) => Promise<Report>> = {
  "hours-check": hoursCheck,
  person: personDetail,
  cases: byCase,
  matrix,
  profitability,
};

export function buildReport(slug: ReportSlug, supabase: SupabaseClient, params: ReportParams): Promise<Report> {
  return BUILDERS[slug](supabase, params);
}

// Every table of a report in one CSV, one block per table. The first row is
// the title, then the subtitle, then each table with its own header.
export function reportToRows(report: Report): Cell[][] {
  const rows: Cell[][] = [[report.title], [report.subtitle]];
  for (const t of report.tables) {
    rows.push([], [t.name], t.columns.map((c) => c.label));
    for (const r of t.rows) rows.push(t.columns.map((c) => r[c.key] ?? null));
    if (t.totals) rows.push(t.columns.map((c) => t.totals?.[c.key] ?? null));
  }
  return rows;
}
