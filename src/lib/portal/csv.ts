// CSV downloads that open cleanly in Excel: UTF-8 with a byte-order mark
// (so names like "Tāmaki" survive) and every field quoted.

type Cell = string | number | null | undefined;

// Cells starting with = + - @ are prefixed with ' so a spreadsheet never
// treats client-entered text as a formula.
function quote(value: Cell): string {
  if (value === null || value === undefined) return '""';
  let s = String(value);
  if (typeof value === "string" && /^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return '"' + s.replace(/"/g, '""') + '"';
}

export function toCsv(header: string[], rows: Cell[][]): string {
  return "﻿" + [header, ...rows].map((r) => r.map(quote).join(",")).join("\r\n") + "\r\n";
}

export function csvResponse(csv: string, filename: string): Response {
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename.replace(/[^\w.-]/g, "-")}"`,
      "Cache-Control": "no-store",
    },
  });
}
