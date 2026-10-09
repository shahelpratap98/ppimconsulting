import { todayNZ } from "@/lib/portal/dates";
import type { InvoiceStatus } from "@/lib/portal/types";

const STYLES: Record<InvoiceStatus, { label: string; className: string }> = {
  issued: { label: "Awaiting payment", className: "bg-accent-100 text-accent-600" },
  paid: { label: "Paid", className: "bg-ok-bg text-ok" },
  void: { label: "Void", className: "bg-bad-bg text-bad" },
};

export function InvoiceStatusChip({ status, dueOn }: { status: InvoiceStatus; dueOn?: string }) {
  if (status === "issued" && dueOn && dueOn < todayNZ()) {
    return <span className="chip bg-warn-bg text-warn">Overdue</span>;
  }
  const s = STYLES[status];
  return <span className={`chip ${s.className}`}>{s.label}</span>;
}
