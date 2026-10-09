import { formatDay, formatHours } from "@/lib/portal/dates";
import type { Cell, Column, ReportTable } from "@/lib/portal/reports";

const money = new Intl.NumberFormat("en-NZ", { style: "currency", currency: "NZD" });

function display(value: Cell | undefined, col: Column): string {
  if (value === null || value === undefined || value === "") return "";
  if (typeof value === "string" && col.type !== "date") return value;
  switch (col.type) {
    case "date":
      // Totals rows put a label ("TOTAL") in the date column.
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return String(value);
      return formatDay(String(value), { weekday: "short", day: "2-digit", month: "short", year: "2-digit" });
    case "hours":
      return Number(value) === 0 ? "–" : formatHours(Number(value));
    case "money":
      return money.format(Number(value));
    default:
      return String(value);
  }
}

const STATUS_TONE: [RegExp, string][] = [
  [/^SHORT/, "bg-bad-bg text-bad"],
  [/^Over/, "bg-warn-bg text-warn"],
  [/^OK/, "bg-ok-bg text-ok"],
  [/^Weekend/, "bg-steel-100 text-steel"],
  [/^Public holiday/, "bg-steel-100 text-steel"],
  [/^On leave/, "bg-accent-100 text-accent-600"],
];

export function ReportTableView({ table }: { table: ReportTable }) {
  const numeric = (c: Column) => c.type === "hours" || c.type === "money" || c.type === "int";

  return (
    <section aria-label={table.name}>
      <h2 className="text-xl font-semibold">{table.name}</h2>
      {table.rows.length === 0 ? (
        <p className="mt-3 rounded-xl border border-line bg-surface px-5 py-6 text-center text-muted">{table.empty}</p>
      ) : (
        <div className="mt-3 relative overflow-x-auto rounded-xl border border-line bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line text-xs tracking-wide text-muted uppercase">
              <tr>
                {table.columns.map((c) => (
                  <th key={c.key} scope="col" className={`px-3 py-2.5 font-semibold whitespace-nowrap ${numeric(c) ? "text-right" : ""}`}>{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {table.rows.map((row, i) => (
                <tr key={i} className="align-top">
                  {table.columns.map((c) => {
                    const text = display(row[c.key], c);
                    const tone = c.key === "status" ? STATUS_TONE.find(([re]) => re.test(text))?.[1] : undefined;
                    return (
                      <td
                        key={c.key}
                        className={`px-3 py-2 ${numeric(c) ? "text-right whitespace-nowrap tabular-nums" : ""} ${
                          c.key === "description" || c.key === "work_performed" ? "min-w-[16rem] text-muted" : c.type === "date" ? "whitespace-nowrap" : ""
                        }`}
                      >
                        {tone ? <span className={`chip ${tone}`}>{text}</span> : text}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
            {table.totals ? (
              <tfoot className="border-t-2 border-ink bg-surface-2 font-semibold text-ink">
                <tr>
                  {table.columns.map((c) => (
                    <td key={c.key} className={`px-3 py-2.5 ${numeric(c) ? "text-right whitespace-nowrap tabular-nums" : ""}`}>
                      {display(table.totals?.[c.key], c)}
                    </td>
                  ))}
                </tr>
              </tfoot>
            ) : null}
          </table>
        </div>
      )}
    </section>
  );
}
