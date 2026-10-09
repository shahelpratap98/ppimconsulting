"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { formatDay, formatHours } from "@/lib/portal/dates";
import type { EntryView } from "@/lib/portal/types";
import { approveEntries, returnEntries, type ApprovalResult } from "./actions";
import { Spinner } from "@/components/portal/spinner";

export function ApprovalQueue({ entries }: { entries: EntryView[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(() => new Set(entries.map((e) => e.id)));
  const [note, setNote] = useState("");
  const [result, setResult] = useState<ApprovalResult | null>(null);
  const [pending, startTransition] = useTransition();
  const [action, setAction] = useState<"approve" | "return">("approve"); // which button shows the wheel

  // person -> their submitted entries, in date order
  const groups = useMemo(() => {
    const map = new Map<string, { employee: string; entries: EntryView[] }>();
    for (const e of entries) {
      const g = map.get(e.user_id) ?? { employee: e.employee, entries: [] };
      g.entries.push(e);
      map.set(e.user_id, g);
    }
    return [...map.values()];
  }, [entries]);

  const toggle = (ids: string[], on: boolean) => {
    setResult(null);
    setSelected((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => (on ? next.add(id) : next.delete(id)));
      return next;
    });
  };

  const run = (action: () => Promise<ApprovalResult>) =>
    startTransition(async () => {
      const res = await action();
      setResult(res);
      if (res.ok) {
        setNote("");
        router.refresh();
      }
    });

  const ids = [...selected];
  const selectedHours = entries.filter((e) => selected.has(e.id)).reduce((s, e) => s + Number(e.hours ?? 0), 0);

  return (
    <div className="flex flex-col gap-6">
      {groups.map((group) => {
        const groupIds = group.entries.map((e) => e.id);
        const allOn = groupIds.every((id) => selected.has(id));
        const hours = group.entries.reduce((s, e) => s + Number(e.hours ?? 0), 0);
        const groupId = `group-${group.entries[0].user_id}`;
        return (
          <section key={groupId} aria-labelledby={groupId} className="overflow-hidden rounded-xl border border-line bg-surface">
            <div className="flex flex-wrap items-center gap-3 border-b border-line bg-surface-2 px-4 py-3">
              <input
                id={`${groupId}-all`}
                type="checkbox"
                className="size-4 accent-ink"
                checked={allOn}
                onChange={(e) => toggle(groupIds, e.target.checked)}
              />
              <label htmlFor={`${groupId}-all`} className="sr-only">Select all entries for {group.employee}</label>
              <h2 id={groupId} className="text-lg font-semibold">{group.employee}</h2>
              <span className="ml-auto text-sm text-muted tabular-nums">
                {group.entries.length} {group.entries.length === 1 ? "entry" : "entries"} · {formatHours(hours)} h
              </span>
            </div>
            <div className="relative overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="border-b border-line text-xs tracking-wide text-muted uppercase">
                  <tr>
                    <th className="w-10 px-4 py-2"><span className="sr-only">Select</span></th>
                    <th className="px-2 py-2 font-semibold">Date</th>
                    <th className="px-2 py-2 font-semibold">Case</th>
                    <th className="px-2 py-2 font-semibold">Work type</th>
                    <th className="px-2 py-2 font-semibold">Task</th>
                    <th className="px-4 py-2 text-right font-semibold">Hours</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {group.entries.map((e) => (
                    <tr key={e.id}>
                      <td className="px-4 py-2.5">
                        <input
                          id={`pick-${e.id}`}
                          type="checkbox"
                          className="size-4 accent-ink"
                          checked={selected.has(e.id)}
                          onChange={(ev) => toggle([e.id], ev.target.checked)}
                          aria-label={`${group.employee}, ${formatDay(e.entry_date, { day: "numeric", month: "short" })}, ${e.client ?? e.case_title ?? ""}`}
                        />
                      </td>
                      <td className="px-2 py-2.5 whitespace-nowrap">{formatDay(e.entry_date, { weekday: "short", day: "numeric", month: "short" })}</td>
                      <td className="px-2 py-2.5 font-semibold text-ink">{e.case_no} · {e.client ?? e.case_title}</td>
                      <td className="px-2 py-2.5">{e.work_type}</td>
                      <td className="px-2 py-2.5 text-muted">{e.description}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{formatHours(Number(e.hours ?? 0))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}

      <div className="sticky bottom-0 -mx-4 flex flex-col gap-3 border-t border-line bg-bg/95 px-4 py-4 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="flex flex-wrap items-end gap-3">
          <p className="text-sm text-muted tabular-nums">
            <span className="font-semibold text-ink">{ids.length}</span> selected · {formatHours(selectedHours)} h
          </p>
          <div className="min-w-0 flex-1 basis-64">
            <label htmlFor="return-note" className="field-label">Note (only needed when returning)</label>
            <input id="return-note" className="field" type="text" maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Wrong case — should be CASE-0012" />
          </div>
          <button type="button" disabled={pending || ids.length === 0} onClick={() => { setAction("return"); run(() => returnEntries(ids, note)); }} className="btn btn-quiet">
            {pending && action === "return" ? <><Spinner /> Returning…</> : "Return selected"}
          </button>
          <button type="button" disabled={pending || ids.length === 0} onClick={() => { setAction("approve"); run(() => approveEntries(ids)); }} className="btn btn-accent">
            {pending && action === "approve" ? <><Spinner /> Approving…</> : "Approve selected"}
          </button>
        </div>
        {result ? (
          <p role={result.ok ? "status" : "alert"} className={`rounded-lg px-3 py-2 text-sm font-semibold ${result.ok ? "bg-ok-bg text-ok" : "bg-bad-bg text-bad"}`}>
            {result.message}
          </p>
        ) : null}
      </div>
    </div>
  );
}
