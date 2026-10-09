import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm } from "@/components/portal/action-form";
import { LinkPending } from "@/components/portal/pending-buttons";
import { isAdviser, requireProfile } from "@/lib/portal/auth";
import { formatDay, formatHours, isIsoDate, todayNZ } from "@/lib/portal/dates";
import { addMonths, HAS_BALANCE, LEAVE_LABEL, LEAVE_TONE, monthEnd, monthStart, type LeaveBalance, type LeaveRequest } from "@/lib/portal/leave";
import { createClient } from "@/lib/portal/supabase/server";
import { cancelApprovedLeave, cancelLeave, decideLeave } from "./actions";
import { LeaveCalendar } from "./leave-calendar";

export const metadata: Metadata = { title: "Leave" };

const nz = (iso: string, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" }) => formatDay(iso, opts);
const range = (a: string, b: string, half?: string | null) => (a === b ? nz(a, { weekday: "short", day: "numeric", month: "short" }) + (half ? ` (${half === "am" ? "morning" : "afternoon"})` : "") : `${nz(a)} – ${nz(b, { day: "numeric", month: "short", year: "numeric" })}`);
const plural = (n: number) => `${formatHours(n)} ${n === 1 ? "day" : "days"}`;

function StatusChip({ status }: { status: LeaveRequest["status"] }) {
  const map = {
    requested: ["Waiting", "bg-accent-100 text-accent-600"],
    approved: ["Approved", "bg-ok-bg text-ok"],
    declined: ["Declined", "bg-bad-bg text-bad"],
    cancelled: ["Withdrawn", "bg-surface-2 text-muted"],
  } as const;
  const [label, cls] = map[status];
  return <span className={`chip ${cls}`}>{label}</span>;
}

function Balance({ b, who }: { b: LeaveBalance; who?: string }) {
  const rows = [
    { type: "annual" as const, ent: b.annual_entitlement, avail: b.annual_available, taken: b.annual_taken, pending: b.annual_pending },
    { type: "sick" as const, ent: b.sick_entitlement, avail: b.sick_available, taken: b.sick_taken, pending: b.sick_pending },
  ];
  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      {who ? <p className="font-semibold text-ink">{who}</p> : null}
      <p className={`text-xs text-muted ${who ? "mt-0.5" : ""}`}>Leave year {nz(b.leave_year_start)} – {nz(b.leave_year_end, { day: "numeric", month: "short", year: "numeric" })}</p>
      <dl className="mt-3 grid grid-cols-2 gap-3">
        {rows.map((r) => {
          const left = Number(r.avail);
          const carried = left + Number(r.taken) - Number(r.ent);
          return (
            <div key={r.type}>
              <dt className={`chip ${LEAVE_TONE[r.type].chip}`}>{LEAVE_LABEL[r.type]}</dt>
              <dd className="mt-1.5 font-display text-2xl font-semibold text-ink tabular-nums">{formatHours(left)}<span className="text-sm font-normal text-muted"> {left === 1 ? "day" : "days"} left</span></dd>
              <dd className="text-xs text-muted tabular-nums">
                {formatHours(Number(r.ent))}/yr{carried > 0.01 ? ` + ${formatHours(carried)} carried` : carried < -0.01 ? ` − ${formatHours(-carried)} owed` : ""} · {formatHours(Number(r.taken))} booked
                {Number(r.pending) > 0 ? ` · ${formatHours(Number(r.pending))} waiting` : ""}
              </dd>
            </div>
          );
        })}
      </dl>
      {Number(b.bereavement_taken) > 0 || Number(b.parental_taken) > 0 ? (
        <p className="mt-3 text-xs text-muted tabular-nums">
          This leave year: {Number(b.bereavement_taken) > 0 ? `${formatHours(Number(b.bereavement_taken))} bereavement` : ""}
          {Number(b.bereavement_taken) > 0 && Number(b.parental_taken) > 0 ? " · " : ""}
          {Number(b.parental_taken) > 0 ? `${formatHours(Number(b.parental_taken))} parental` : ""}
        </p>
      ) : null}
    </div>
  );
}

export default async function LeavePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const profile = await requireProfile();
  const approver = isAdviser(profile.role);
  const params = await searchParams;
  const today = todayNZ();
  const month = monthStart(isIsoDate(params.month) ? params.month : today);
  const from = monthStart(addMonths(month, -1)); // a month either side so the strip can show neighbours
  const to = monthEnd(addMonths(month, 1));

  const supabase = await createClient();
  const [calRes, mineRes, balRes, holRes, pendingRes] = await Promise.all([
    supabase.from("v_leave_calendar").select("*").lte("start_date", to).gte("end_date", from).order("start_date"),
    supabase
      .from("leave_requests")
      .select("id, user_id, leave_type, start_date, end_date, half_day, days, note, status, decision_note, decided:profiles!leave_requests_decided_by_fkey(display_name)")
      .eq("user_id", profile.user_id)
      .order("start_date", { ascending: false })
      .limit(50),
    supabase.rpc("leave_balances", { p_on: today }),
    supabase.from("public_holidays").select("day, name").eq("region", "NZ").gte("day", from).lte("day", to),
    approver
      ? supabase
          .from("leave_requests")
          .select("id, user_id, leave_type, start_date, end_date, half_day, days, note, status, requester:profiles!leave_requests_user_id_fkey(display_name)")
          .eq("status", "requested")
          .order("start_date")
      : Promise.resolve({ data: [], error: null }),
  ]);

  const setupMissing = /leave_requests|v_leave_calendar|leave_balances|schema cache/i.test(calRes.error?.message ?? balRes.error?.message ?? "");
  const calendar = (calRes.data ?? []) as LeaveRequest[];
  const mine = ((mineRes.data ?? []) as unknown as (LeaveRequest & { decided: { display_name: string } | null })[]).map((r) => ({ ...r, employee: profile.display_name, decided_by_name: r.decided?.display_name ?? null }));
  const balances = (balRes.data ?? []) as LeaveBalance[];
  const myBalance = balances.find((b) => b.user_id === profile.user_id);
  const holidays = (holRes.data ?? []) as { day: string; name: string }[];
  const pending = ((pendingRes.data ?? []) as unknown as (LeaveRequest & { requester: { display_name: string } | null })[]).map((r) => ({ ...r, employee: r.requester?.display_name ?? "" }));

  if (setupMissing) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-3xl font-semibold">Leave</h1>
        <p className="rounded-xl border border-warn/30 bg-warn-bg px-4 py-3 text-warn">Leave needs a database update that hasn&apos;t been run yet (migration 0800). Ask BedRock IT.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Leave</h1>
          <p className="mt-1 max-w-[62ch] text-muted">
            Pick the days on the calendar to request annual or sick leave. Everyone can see when people are away; {approver ? "as an adviser you also see the type of leave." : "only you and the advisers see which type it is."}
          </p>
        </div>
        <nav aria-label="Month" className="flex w-full items-center justify-between gap-2 text-sm font-semibold sm:w-auto sm:justify-start">
          <Link href={`/portal/leave?month=${addMonths(month, -1)}`} className="btn btn-quiet">← <LinkPending /></Link>
          <span className="min-w-0 flex-1 text-center font-display text-lg text-ink sm:min-w-36 sm:flex-none">{nz(month, { month: "long", year: "numeric" })}</span>
          <Link href={`/portal/leave?month=${addMonths(month, 1)}`} className="btn btn-quiet"><LinkPending /> →</Link>
          {month !== monthStart(today) ? <Link href="/portal/leave" className="text-accent-600 hover:underline">Today</Link> : null}
        </nav>
      </div>

      {approver && pending.length > 0 ? (
        <section aria-labelledby="pending-heading" className="rounded-xl border border-accent/40 bg-surface">
          <div className="border-b border-line bg-accent-100/60 px-4 py-3">
            <h2 id="pending-heading" className="text-lg font-semibold">Waiting for your decision ({pending.length})</h2>
          </div>
          <ul className="divide-y divide-line">
            {pending.map((r) => (
              <li key={r.id} className="flex flex-col gap-3 px-4 py-4 lg:flex-row lg:items-start lg:gap-6">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-ink">{r.employee} <span className={`chip ml-1 ${LEAVE_TONE[r.leave_type ?? "leave"].chip}`}>{r.leave_type ? LEAVE_LABEL[r.leave_type] : "Leave"}</span></p>
                  <p className="text-sm">{range(r.start_date, r.end_date, r.half_day)} · {plural(Number(r.days))}</p>
                  {r.note ? <p className="mt-1 text-sm text-muted">&quot;{r.note}&quot;</p> : null}
                  {(() => {
                    const b = balances.find((x) => x.user_id === r.user_id);
                    if (!b || !r.leave_type || !HAS_BALANCE[r.leave_type]) return null;
                    const left = r.leave_type === "sick" ? Number(b.sick_available) : Number(b.annual_available);
                    return Number(r.days) > left ? (
                      <p className="mt-1 text-sm font-semibold text-warn">Exceeds their remaining balance by {formatHours(Number(r.days) - left)} {Number(r.days) - left === 1 ? "day" : "days"}.</p>
                    ) : (
                      <p className="mt-1 text-xs text-muted">{formatHours(left)} {left === 1 ? "day" : "days"} left this leave year.</p>
                    );
                  })()}
                </div>
                <ActionForm action={decideLeave} submitLabel="Approve" pendingLabel="Saving…" className="flex flex-wrap items-end gap-2">
                  <input type="hidden" name="id" value={r.id} />
                  <input type="hidden" name="decision" value="approve" />
                </ActionForm>
                <ActionForm action={decideLeave} submitLabel="Decline" pendingLabel="Saving…" quiet className="flex flex-wrap items-end gap-2">
                  <input type="hidden" name="id" value={r.id} />
                  <input type="hidden" name="decision" value="decline" />
                  <div>
                    <label htmlFor={`dn-${r.id}`} className="field-label">Reason (required to decline)</label>
                    <input id={`dn-${r.id}`} name="decision_note" maxLength={300} className="field" placeholder="e.g. Two people already away that week" />
                  </div>
                </ActionForm>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <LeaveCalendar
          key={month}
          month={month}
          today={today}
          myUserId={profile.user_id}
          entries={calendar}
          holidays={holidays}
        />
        <div className="flex flex-col gap-4">
          {myBalance ? <Balance b={myBalance} /> : null}
          <div className="rounded-xl border border-line bg-surface p-4 text-sm">
            <p className="font-semibold text-ink">How it works</p>
            <ul className="mt-2 flex list-disc flex-col gap-1.5 pl-4 text-muted">
              <li>Click the first day, then the last day, then choose the type and send. A single day can be a half day.</li>
              <li>Weekends and public holidays are never counted.</li>
              <li>Unused annual leave carries over; sick leave carries over up to a cap. Approved days are never marked short in the hours check.</li>
              <li>You can withdraw a request while it&apos;s still waiting.</li>
            </ul>
          </div>
        </div>
      </div>

      <section aria-labelledby="mine-heading">
        <h2 id="mine-heading" className="text-xl font-semibold">My requests</h2>
        {mine.length === 0 ? (
          <p className="mt-3 rounded-xl border border-line bg-surface px-5 py-6 text-center text-muted">You haven&apos;t requested any leave yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line rounded-xl border border-line bg-surface">
            {mine.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                <span className={`chip ${LEAVE_TONE[r.leave_type ?? "leave"].chip}`}>{r.leave_type ? LEAVE_LABEL[r.leave_type] : "Leave"}</span>
                <span className="font-semibold text-ink">{range(r.start_date, r.end_date, r.half_day)}</span>
                <span className="text-sm text-muted tabular-nums">{plural(Number(r.days))}</span>
                <StatusChip status={r.status} />
                {r.note ? <span className="text-sm text-muted">&quot;{r.note}&quot;</span> : null}
                {r.status === "declined" && r.decision_note ? <span className="text-sm text-bad">Declined{r.decided_by_name ? ` by ${r.decided_by_name}` : ""}: {r.decision_note}</span> : null}
                {r.status === "approved" && r.decided_by_name ? <span className="text-xs text-muted">Approved by {r.decided_by_name}</span> : null}
                <span className="flex-1" />
                {r.status === "requested" ? (
                  <ActionForm action={cancelLeave} submitLabel="Withdraw" pendingLabel="Withdrawing…" quiet>
                    <input type="hidden" name="id" value={r.id} />
                  </ActionForm>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      {approver ? (
        <section aria-labelledby="team-heading" className="flex flex-col gap-4">
          <h2 id="team-heading" className="text-xl font-semibold">Team balances</h2>
          <div className="overflow-x-auto rounded-xl border border-line bg-surface">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-line text-xs tracking-wide text-muted uppercase">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">Employee</th>
                  <th className="px-4 py-2.5 font-semibold">Leave year</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Annual left</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Annual booked</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Sick left</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Sick booked</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Bereavement</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Parental</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {balances.map((b) => (
                  <tr key={b.user_id}>
                    <td className="px-4 py-2.5 font-semibold text-ink">{b.employee}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-muted">{nz(b.leave_year_start, { day: "numeric", month: "short", year: "2-digit" })} – {nz(b.leave_year_end, { day: "numeric", month: "short", year: "2-digit" })}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{formatHours(Number(b.annual_available))} <span className="text-muted">({formatHours(Number(b.annual_entitlement))}/yr)</span></td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{formatHours(Number(b.annual_taken))}{Number(b.annual_pending) > 0 ? <span className="text-muted"> (+{formatHours(Number(b.annual_pending))} waiting)</span> : null}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{formatHours(Number(b.sick_available))} <span className="text-muted">({formatHours(Number(b.sick_entitlement))}/yr)</span></td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{formatHours(Number(b.sick_taken))}{Number(b.sick_pending) > 0 ? <span className="text-muted"> (+{formatHours(Number(b.sick_pending))} waiting)</span> : null}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{Number(b.bereavement_taken) > 0 ? formatHours(Number(b.bereavement_taken)) : "–"}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{Number(b.parental_taken) > 0 ? formatHours(Number(b.parental_taken)) : "–"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted">&quot;Left&quot; is what remains after everything approved, including leave booked for later; &quot;booked&quot; is this leave year only. Entitlements, start dates and opening balances are set per person under Setup → Staff; company defaults and the sick-leave cap under Setup → Company &amp; GST. A leave year runs from the person&apos;s start-date anniversary (1 January if no start date is set).</p>

          {calendar.some((r) => r.status === "approved") ? (
            <div>
              <h3 className="text-sm font-semibold text-ink">Approved leave around this month</h3>
              <ul className="mt-2 flex flex-wrap gap-2">
                {calendar.filter((r) => r.status === "approved").map((r) => (
                  <li key={r.id} className="flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-1.5 text-sm">
                    <span className="font-semibold text-ink">{r.employee}</span>
                    <span className={`chip ${LEAVE_TONE[r.leave_type ?? "leave"].chip}`}>{r.leave_type ? LEAVE_LABEL[r.leave_type] : "Leave"}</span>
                    <span className="text-muted">{range(r.start_date, r.end_date, r.half_day)}</span>
                    <ActionForm action={cancelApprovedLeave} submitLabel="Cancel" pendingLabel="…" quiet className="[&_button]:px-2 [&_button]:py-1 [&_button]:text-xs">
                      <input type="hidden" name="id" value={r.id} />
                    </ActionForm>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
