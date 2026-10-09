"use client";

import { useMemo, useState } from "react";
import { ActionForm } from "@/components/portal/action-form";
import { addDays, formatDay, isWeekend } from "@/lib/portal/dates";
import { LEAVE_LABEL, LEAVE_TONE, LEAVE_TYPES, monthEnd, workingDays, type HalfDay, type LeaveRequest, type LeaveType } from "@/lib/portal/leave";
import { requestLeave } from "./actions";

type Props = {
  month: string; // first of the month, YYYY-MM-DD
  today: string;
  myUserId: string;
  entries: LeaveRequest[];
  holidays: { day: string; name: string }[];
};

// Month grid. Click a first day, then a last day; the request form fills in
// underneath with the working-day count. Approved leave is a solid block,
// requests still waiting are dashed.
export function LeaveCalendar({ month, today, myUserId, entries, holidays }: Props) {
  const [start, setStart] = useState<string>("");
  const [end, setEnd] = useState<string>("");
  const [type, setType] = useState<LeaveType>("annual");
  const [half, setHalf] = useState<"" | HalfDay>("");

  const holidayMap = useMemo(() => new Map(holidays.map((h) => [h.day, h.name])), [holidays]);
  const holidaySet = useMemo(() => new Set(holidayMap.keys()), [holidayMap]);

  // Monday-first grid, padded to whole weeks.
  const days = useMemo(() => {
    const first = month;
    const last = monthEnd(month);
    const dow = new Date(first + "T00:00:00Z").getUTCDay(); // 0 = Sun
    const lead = (dow + 6) % 7;
    const out: string[] = [];
    for (let d = addDays(first, -lead); d <= last || out.length % 7 !== 0; d = addDays(d, 1)) out.push(d);
    return out;
  }, [month]);

  const onDay = (d: string) => {
    if (!start || (start && end)) {
      setStart(d);
      setEnd("");
    } else if (d < start) {
      setEnd(start);
      setStart(d);
    } else {
      setEnd(d);
    }
  };

  const selFrom = start;
  const selTo = end || start;
  const single = Boolean(selFrom) && selFrom === selTo;
  const halfActive = single && half !== "";
  const selected = selFrom ? (halfActive ? 0.5 : workingDays(selFrom, selTo, holidaySet)) : 0;
  const inSelection = (d: string) => selFrom && d >= selFrom && d <= selTo;

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-hidden rounded-xl border border-line bg-surface">
        <div className="grid grid-cols-7 border-b border-line bg-surface-2 text-center text-[11px] font-semibold tracking-wide text-muted uppercase">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <div key={d} className="py-2">{d}</div>)}
        </div>
        <div className="grid grid-cols-7">
          {days.map((d) => {
            const inMonth = d.slice(0, 7) === month.slice(0, 7);
            const weekend = isWeekend(d);
            const holiday = holidayMap.get(d);
            const away = entries.filter((e) => d >= e.start_date && d <= e.end_date);
            const sel = inSelection(d);
            const past = d < today;
            return (
              <button
                type="button"
                key={d}
                onClick={() => onDay(d)}
                aria-pressed={Boolean(sel)}
                aria-label={`${formatDay(d, { weekday: "long", day: "numeric", month: "long" })}${holiday ? `, ${holiday}` : ""}${away.length ? `, ${away.length} away` : ""}`}
                className={`flex min-h-[4.6rem] flex-col items-stretch gap-1 border-r border-b border-line p-1 text-left transition-colors sm:min-h-[5.5rem] ${
                  !inMonth ? "bg-surface-2/60 text-muted/50" : weekend || holiday ? "bg-surface-2/80" : "bg-surface hover:bg-accent-100/40"
                } ${sel ? "ring-2 ring-inset ring-ink" : ""}`}
              >
                <span className="flex items-center justify-between px-0.5">
                  <span className={`text-sm font-semibold tabular-nums ${d === today ? "rounded-full bg-ink px-1.5 text-white" : inMonth ? "text-ink" : ""} ${past && inMonth && !sel ? "opacity-60" : ""}`}>{Number(d.slice(8))}</span>
                  {holiday ? <span className="truncate text-[10px] text-steel" title={holiday}>Holiday</span> : null}
                </span>
                <span className="flex flex-col gap-0.5">
                  {away.slice(0, 3).map((e) => {
                    const tone = LEAVE_TONE[e.leave_type ?? "leave"].block;
                    const mine = e.user_id === myUserId;
                    return (
                      <span
                        key={e.id}
                        title={`${e.employee}: ${e.leave_type ? LEAVE_LABEL[e.leave_type] : "Leave"}${e.status === "requested" ? " (waiting for approval)" : ""}`}
                        className={`truncate rounded border px-1 text-[11px] leading-4 ${tone} ${e.status === "requested" ? "border-dashed opacity-80" : ""} ${mine ? "font-semibold" : ""}`}
                      >
                        {mine ? "You" : e.employee.split(" ")[0]}{e.half_day ? ` (${e.half_day})` : ""}
                      </span>
                    );
                  })}
                  {away.length > 3 ? <span className="px-1 text-[10px] text-muted">+{away.length - 3} more</span> : null}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
        <span><span className={`mr-1 inline-block size-3 rounded border align-middle ${LEAVE_TONE.annual.block}`} /> Annual</span>
        <span><span className={`mr-1 inline-block size-3 rounded border align-middle ${LEAVE_TONE.sick.block}`} /> Sick</span>
        <span><span className={`mr-1 inline-block size-3 rounded border align-middle ${LEAVE_TONE.bereavement.block}`} /> Bereavement</span>
        <span><span className={`mr-1 inline-block size-3 rounded border align-middle ${LEAVE_TONE.parental.block}`} /> Parental</span>
        <span><span className={`mr-1 inline-block size-3 rounded border align-middle ${LEAVE_TONE.leave.block}`} /> Away (type not shown)</span>
        <span><span className="mr-1 inline-block size-3 rounded border border-dashed border-muted align-middle" /> Waiting for approval</span>
      </div>

      <section aria-labelledby="request-heading" className="rounded-xl border border-line bg-surface p-4">
        <h2 id="request-heading" className="text-lg font-semibold">Request leave</h2>
        {!selFrom ? (
          <p className="mt-1 text-sm text-muted">Click the first day you&apos;ll be away on the calendar (then the last day, for more than one).</p>
        ) : (
          <p className="mt-1 text-sm text-muted">
            <span className="font-semibold text-ink">{formatDay(selFrom, { weekday: "short", day: "numeric", month: "short" })}</span>
            {selTo !== selFrom ? <> to <span className="font-semibold text-ink">{formatDay(selTo, { weekday: "short", day: "numeric", month: "short" })}</span></> : null}
            {" · "}
            <span className="font-semibold text-ink tabular-nums">{selected}</span> working {selected === 1 ? "day" : "days"}
            {selected === 0 ? <span className="text-warn"> (weekends and holidays don&apos;t need leave)</span> : null}
            {" · "}
            <button type="button" onClick={() => { setStart(""); setEnd(""); }} className="font-semibold text-accent-600 hover:underline">clear</button>
          </p>
        )}
        <ActionForm action={requestLeave} submitLabel="Send request" pendingLabel="Sending…" className="mt-3 flex flex-col gap-3">
          <div className="grid gap-3 sm:grid-cols-[10rem_10rem_minmax(0,1fr)]">
            <div>
              <label htmlFor="lv-start" className="field-label">First day</label>
              <input id="lv-start" name="start_date" type="date" required value={selFrom} onChange={(e) => { setStart(e.target.value); if (end && e.target.value > end) setEnd(""); }} className="field" />
            </div>
            <div>
              <label htmlFor="lv-end" className="field-label">Last day</label>
              <input id="lv-end" name="end_date" type="date" value={selTo} min={selFrom || undefined} onChange={(e) => setEnd(e.target.value)} className="field" />
            </div>
            <div>
              <label htmlFor="lv-type" className="field-label">Type</label>
              <select id="lv-type" name="leave_type" value={type} onChange={(e) => setType(e.target.value as LeaveType)} className="field">
                {LEAVE_TYPES.map((t) => <option key={t} value={t}>{LEAVE_LABEL[t]}</option>)}
              </select>
            </div>
          </div>
          {single ? (
            <div className="sm:w-56">
              <label htmlFor="lv-half" className="field-label">Half day?</label>
              <select id="lv-half" name="half_day" value={half} onChange={(e) => setHalf(e.target.value as "" | HalfDay)} className="field">
                <option value="">No, the whole day</option>
                <option value="am">Morning only</option>
                <option value="pm">Afternoon only</option>
              </select>
            </div>
          ) : (
            <input type="hidden" name="half_day" value="" />
          )}
          {type === "bereavement" || type === "parental" ? (
            <p className="text-sm text-muted">
              {type === "bereavement"
                ? "NZ law gives 3 days per bereavement of a close family member (1 day for others), on top of annual and sick leave; it isn't a yearly quota."
                : "Parental leave is job-protected time off (up to 52 weeks); payment comes from IRD, not the company. Record the dates here so the calendar and hours check know."}
            </p>
          ) : null}
          <div>
            <label htmlFor="lv-note" className="field-label">Note (optional)</label>
            <input id="lv-note" name="note" maxLength={300} className="field" placeholder={type === "sick" ? "e.g. Doctor's appointment" : "e.g. Family trip"} />
          </div>
        </ActionForm>
      </section>
    </div>
  );
}
