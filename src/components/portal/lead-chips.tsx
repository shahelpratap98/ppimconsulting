import { formatDay, daysUntil } from "@/lib/portal/dates";
import { SOURCE_LABEL, STAGE_LABEL, STAGE_STYLE, urgency, type LeadSource, type LeadStage } from "@/lib/portal/crm";

export function LeadStageChip({ stage }: { stage: LeadStage }) {
  return <span className={`chip ${STAGE_STYLE[stage]}`}>{STAGE_LABEL[stage]}</span>;
}

export function SourceChip({ source }: { source: LeadSource }) {
  return <span className="chip bg-surface-2 text-muted">{SOURCE_LABEL[source] ?? source}</span>;
}

// A date with how close it is, coloured once it needs attention.
export function DueChip({ on, prefix = "" }: { on: string; prefix?: string }) {
  const u = urgency(daysUntil(on));
  return (
    <span className={`chip ${u.className}`}>
      {prefix}{formatDay(on, { day: "numeric", month: "short", year: "numeric" })} · {u.label}
    </span>
  );
}
