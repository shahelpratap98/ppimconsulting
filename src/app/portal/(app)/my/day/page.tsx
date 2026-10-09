import type { Metadata } from "next";
import Link from "next/link";
import { StatusChip } from "@/components/portal/status-chip";
import { requireProfile } from "@/lib/portal/auth";
import { addDays, formatDay, formatHours, isIsoDate, isWeekend, todayNZ, weekStart } from "@/lib/portal/dates";
import { createClient } from "@/lib/portal/supabase/server";
import type { CaseOption, TimeEntry, WorkTypeOption } from "@/lib/portal/types";
import { DayEditor } from "./day-editor";
import { FilterSubmit, LinkPending } from "@/components/portal/pending-buttons";

export const metadata: Metadata = { title: "My day" };

export default async function MyDayPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const profile = await requireProfile();
  const params = await searchParams;
  const today = todayNZ();
  const date = isIsoDate(params.date) ? params.date : today;
  const monday = weekStart(date);
  const week = Array.from({ length: 7 }, (_, i) => addDays(monday, i));

  const supabase = await createClient();
  const [casesRes, workTypesRes, weekRes, settingsRes, holidaysRes, leaveRes] = await Promise.all([
    // Every open case; the internal OFFICE case first.
    supabase.from("v_cases").select("id, case_no, title, client, is_internal").neq("status", "closed").order("is_internal", { ascending: false }).order("case_no"),
    supabase.from("work_types").select("id, name").eq("is_active", true).order("sort_order"),
    supabase
      .from("time_entries")
      .select("id, entry_date, case_id, work_type_id, hours, description, status, return_note")
      .eq("user_id", profile.user_id)
      .gte("entry_date", week[0])
      .lte("entry_date", week[6])
      .order("created_at"),
    supabase.from("settings").select("standard_day_hours").maybeSingle(),
    supabase.from("public_holidays").select("day, name").eq("region", "NZ").gte("day", week[0]).lte("day", week[6]),
    supabase.from("leave_requests").select("start_date, end_date, leave_type").eq("user_id", profile.user_id).eq("status", "approved").lte("start_date", week[6]).gte("end_date", week[0]),
  ]);

  const cases = (casesRes.data ?? []) as CaseOption[];
  const workTypes = (workTypesRes.data ?? []) as WorkTypeOption[];
  const weekEntries = (weekRes.data ?? []) as TimeEntry[];
  const holidays = new Map((holidaysRes.data ?? []).map((h) => [h.day as string, h.name as string]));
  const onLeave = (d: string) => (leaveRes.data ?? []).find((l) => d >= l.start_date && d <= l.end_date)?.leave_type as string | undefined;
  const standard = Number(profile.standard_day_hours ?? settingsRes.data?.standard_day_hours ?? 8);

  const dayEntries = weekEntries.filter((e) => e.entry_date === date);
  const editable = dayEntries.filter((e) => e.status === "draft" || e.status === "returned");
  const locked = dayEntries.filter((e) => e.status !== "draft" && e.status !== "returned");
  const lockedHours = locked.reduce((sum, e) => sum + Number(e.hours ?? 0), 0);

  const caseLabel = (id: string | null) => {
    const c = cases.find((x) => x.id === id);
    return c ? `${c.case_no} · ${c.client ?? c.title}` : "—";
  };
  const workTypeLabel = (id: string | null) => workTypes.find((w) => w.id === id)?.name ?? "—";

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">{formatDay(date, { weekday: "long", day: "numeric", month: "long" })}</h1>
          <p className="mt-1 text-muted">
            {date === today ? "Today. " : ""}{holidays.has(date) ? `${holidays.get(date)} (public holiday). ` : onLeave(date) ? `You have approved ${onLeave(date)} leave on this day. ` : ""}Enter your time, then submit the day for approval.
          </p>
        </div>
        <form className="flex w-full items-end gap-2 sm:w-auto" action={"/portal/my/day"}>
          <div>
            <label htmlFor="day-picker" className="field-label">Go to date</label>
            <input id="day-picker" type="date" name="date" defaultValue={date} max={addDays(today, 31)} className="field" />
          </div>
          <FilterSubmit className="btn btn-quiet">Go</FilterSubmit>
        </form>
      </div>

      {/* Week strip: the personal Hours Check. */}
      <nav aria-label="This week" className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {week.map((d) => {
          const entries = weekEntries.filter((e) => e.entry_date === d);
          const sent = entries.filter((e) => e.status !== "draft").reduce((s, e) => s + Number(e.hours ?? 0), 0);
          const hasDraft = entries.some((e) => e.status === "draft");
          const hasReturned = entries.some((e) => e.status === "returned");
          const weekend = isWeekend(d) || holidays.has(d) || Boolean(onLeave(d));
          const past = d <= today;
          let tone = "border-line bg-surface text-muted";
          let note = "";
          if (hasReturned) { tone = "border-bad/40 bg-bad-bg text-bad"; note = "Returned"; }
          else if (sent >= standard) { tone = "border-ok/30 bg-ok-bg text-ok"; note = sent > standard ? `+${formatHours(sent - standard)}` : "Full day"; }
          else if (!weekend && past && sent < standard) { tone = "border-warn/30 bg-warn-bg text-warn"; note = `Short ${formatHours(standard - sent)}`; }
          if (!note && hasDraft) note = "Draft";
          if (!note && holidays.has(d)) note = "Holiday";
          if (!note && onLeave(d)) note = "Leave";
          return (
            <Link
              key={d}
              href={`/portal/my/day?date=${d}`}
              aria-current={d === date ? "date" : undefined}
              className={`relative flex min-w-0 flex-col items-center rounded-xl border px-1 py-2 text-center ${tone} ${
                d === date ? "ring-2 ring-ink ring-offset-2 ring-offset-bg" : "hover:border-ink/40"
              }`}
            >
              <span className="text-[11px] font-semibold tracking-wide uppercase">{formatDay(d, { weekday: "short" })}</span>
              <span className="font-display text-lg font-semibold text-ink">{formatDay(d, { day: "numeric" })}</span>
              <span className="text-xs font-semibold tabular-nums">{formatHours(sent)} h</span>
              <span className="hidden truncate text-[11px] sm:block">{note || " "}</span>
              <LinkPending className="absolute top-1 right-1 size-3" />
            </Link>
          );
        })}
      </nav>
      <div className="-mt-5 flex justify-between text-sm">
        <Link href={`/portal/my/day?date=${addDays(monday, -7)}`} className="inline-flex min-h-11 items-center gap-1.5 font-semibold text-accent-600 hover:underline sm:min-h-0">← Previous week <LinkPending /></Link>
        {date !== today ? <Link href="/portal/my/day" className="font-semibold text-accent-600 hover:underline">Today</Link> : null}
        <Link href={`/portal/my/day?date=${addDays(monday, 7)}`} className="inline-flex min-h-11 items-center gap-1.5 font-semibold text-accent-600 hover:underline sm:min-h-0"><LinkPending /> Next week →</Link>
      </div>

      {cases.length === 0 ? (
        <p className="rounded-xl border border-warn/30 bg-warn-bg px-4 py-3 text-warn">
          There are no open cases yet. An adviser needs to open a case before time can be entered.
        </p>
      ) : (
        <DayEditor
          key={date + ":" + editable.map((e) => e.id + e.status).join(",")}
          date={date}
          cases={cases}
          workTypes={workTypes}
          initial={editable}
          lockedHours={lockedHours}
          standard={standard}
        />
      )}

      {locked.length > 0 ? (
        <section aria-labelledby="sent-heading">
          <h2 id="sent-heading" className="text-xl font-semibold">Already submitted for this day</h2>
          <div className="mt-3 relative overflow-x-auto rounded-xl border border-line bg-surface">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-line text-xs tracking-wide text-muted uppercase">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">Case</th>
                  <th className="px-4 py-2.5 font-semibold">Work type</th>
                  <th className="px-4 py-2.5 font-semibold">Task</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Hours</th>
                  <th className="px-4 py-2.5 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {locked.map((e) => (
                  <tr key={e.id}>
                    <td className="px-4 py-2.5 font-semibold text-ink">{caseLabel(e.case_id)}</td>
                    <td className="px-4 py-2.5">{workTypeLabel(e.work_type_id)}</td>
                    <td className="px-4 py-2.5 text-muted">{e.description}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{formatHours(Number(e.hours ?? 0))}</td>
                    <td className="px-4 py-2.5"><StatusChip status={e.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}
