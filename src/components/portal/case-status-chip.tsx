import type { CaseOutcome, CaseStatus } from "@/lib/portal/types";

const STYLES: Record<CaseStatus, { label: string; className: string }> = {
  enquiry: { label: "Enquiry", className: "bg-surface-2 text-muted" },
  active: { label: "Active", className: "bg-accent-100 text-accent-600" },
  lodged: { label: "Lodged", className: "bg-steel-100 text-steel" },
  decided: { label: "Decided", className: "bg-ok-bg text-ok" },
  closed: { label: "Closed", className: "bg-surface-2 text-muted" },
};

const OUTCOME: Record<CaseOutcome, { label: string; className: string }> = {
  approved: { label: "Approved", className: "bg-ok-bg text-ok" },
  declined: { label: "Declined", className: "bg-bad-bg text-bad" },
  withdrawn: { label: "Withdrawn", className: "bg-surface-2 text-muted" },
};

export function CaseStatusChip({ status, outcome }: { status: CaseStatus; outcome?: CaseOutcome | null }) {
  if ((status === "decided" || status === "closed") && outcome) {
    const o = OUTCOME[outcome];
    return <span className={`chip ${o.className}`}>{o.label}</span>;
  }
  const s = STYLES[status];
  return <span className={`chip ${s.className}`}>{s.label}</span>;
}

// "5 of 8" document progress, amber when anything is flagged.
export function ChecklistProgress({ total, received, flagged }: { total: number; received: number; flagged: number }) {
  if (!total) return <span className="text-xs text-muted">No checklist</span>;
  const pct = Math.round((received / total) * 100);
  return (
    <span className="inline-flex items-center gap-2">
      <span className="h-1.5 w-16 overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
        <span className={`block h-full rounded-full ${flagged ? "bg-warn" : "bg-ok"}`} style={{ width: `${pct}%` }} />
      </span>
      <span className="text-xs tabular-nums text-muted">
        {received}/{total}
        {flagged ? <span className="font-semibold text-warn"> · {flagged} flagged</span> : null}
      </span>
    </span>
  );
}
