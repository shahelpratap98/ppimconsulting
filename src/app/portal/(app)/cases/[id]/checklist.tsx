"use client";

import { useOptimistic, useState, useTransition } from "react";
import { ActionForm } from "@/components/portal/action-form";
import type { ChecklistItem, DocStatus } from "@/lib/portal/types";
import { addChecklistItem, removeChecklistItem, setChecklistItem } from "../actions";

// The case assistant: the document checklist for one case. Click a chip to move
// a document along missing → received → flagged; changes save straight away.

const ORDER: DocStatus[] = ["missing", "received", "flagged"];
const CHIP: Record<DocStatus, { label: string; className: string }> = {
  missing: { label: "Missing", className: "border-line-2 bg-surface-2 text-muted" },
  received: { label: "Received", className: "border-ok/30 bg-ok-bg text-ok" },
  flagged: { label: "Flagged", className: "border-warn/30 bg-warn-bg text-warn" },
};

type Patch = { id: string; status?: DocStatus; note?: string; removed?: boolean };

export function Checklist({
  caseId,
  caseNo,
  items,
  clientName,
  clientEmail,
  adviserName,
  pathwayName,
}: {
  caseId: string;
  caseNo: string;
  items: ChecklistItem[];
  clientName: string | null;
  clientEmail: string | null;
  adviserName: string | null;
  pathwayName: string;
}) {
  const [list, apply] = useOptimistic(items, (state: ChecklistItem[], p: Patch) =>
    p.removed ? state.filter((i) => i.id !== p.id) : state.map((i) => (i.id === p.id ? { ...i, ...p } : i)),
  );
  const [, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);

  const save = (patch: Patch, run: () => Promise<{ ok: boolean; message?: string }>) => {
    setError("");
    startTransition(async () => {
      apply(patch);
      const res = await run();
      if (!res.ok) setError(res.message ?? "That change didn't save. Refresh and try again.");
    });
  };

  const cycle = (item: ChecklistItem) => {
    const next = ORDER[(ORDER.indexOf(item.status) + 1) % ORDER.length];
    save({ id: item.id, status: next }, () => setChecklistItem(caseId, item.id, { status: next }));
  };

  const saveNote = (item: ChecklistItem, note: string) => {
    setEditing(null);
    if (note.trim() === item.note) return;
    save({ id: item.id, note: note.trim() }, () => setChecklistItem(caseId, item.id, { note }));
  };

  const remove = (item: ChecklistItem) => {
    setConfirming(null);
    save({ id: item.id, removed: true }, () => removeChecklistItem(caseId, item.id));
  };

  const total = list.length;
  const received = list.filter((i) => i.status === "received").length;
  const flagged = list.filter((i) => i.status === "flagged").length;
  const pct = total ? Math.round((received / total) * 100) : 0;
  const complete = total > 0 && received === total;

  return (
    <section className="rounded-xl border border-line bg-surface" aria-labelledby="checklist-heading">
      <div className="flex flex-wrap items-center gap-5 border-b border-line p-5">
        <ProgressRing pct={pct} complete={complete} flagged={flagged > 0} />
        <div className="min-w-0 flex-1">
          <h2 id="checklist-heading" className="text-xl font-semibold">Document checklist</h2>
          <p className="mt-0.5 text-sm text-muted">
            {pathwayName} · {received} of {total} received
            {flagged ? <span className="font-semibold text-warn"> · {flagged} flagged</span> : null}
          </p>
          <p className="mt-1 text-xs text-muted">Click a status to change it. Check every list against current INZ / Home Affairs guidance.</p>
        </div>
      </div>

      {error ? <p role="alert" className="mx-5 mt-4 rounded-lg bg-bad-bg px-3 py-2 text-sm font-semibold text-bad">{error}</p> : null}

      {total === 0 ? (
        <p className="px-5 py-6 text-sm text-muted">No documents on this checklist yet. Add the first one below.</p>
      ) : (
        <ul className="divide-y divide-line">
          {list.map((item) => {
            const chip = CHIP[item.status];
            return (
              <li key={item.id} className="flex flex-wrap items-start gap-3 px-5 py-3">
                <button
                  type="button"
                  onClick={() => cycle(item)}
                  className={`chip w-24 shrink-0 justify-center border ${chip.className}`}
                  title="Click to change status"
                  aria-label={`${item.label}: ${chip.label}. Change status`}
                >
                  {chip.label}
                </button>
                <div className="min-w-0 flex-1 basis-60">
                  <p className={`text-sm ${item.status === "received" ? "text-muted" : "text-ink"}`}>{item.label}</p>
                  {editing === item.id ? (
                    <form
                      className="mt-1.5"
                      onSubmit={(e) => {
                        e.preventDefault();
                        saveNote(item, String(new FormData(e.currentTarget).get("note") ?? ""));
                      }}
                    >
                      <label htmlFor={`note-${item.id}`} className="sr-only">Note for {item.label}</label>
                      <input
                        id={`note-${item.id}`}
                        name="note"
                        defaultValue={item.note}
                        maxLength={500}
                        autoFocus
                        placeholder="e.g. Police certificate expired, new one requested"
                        onBlur={(e) => saveNote(item, e.currentTarget.value)}
                        onKeyDown={(e) => e.key === "Escape" && setEditing(null)}
                        className="field py-1.5 text-sm"
                      />
                    </form>
                  ) : item.note ? (
                    <p className={`mt-0.5 text-xs ${item.status === "flagged" ? "font-semibold text-warn" : "text-muted"}`}>{item.note}</p>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button type="button" onClick={() => setEditing(editing === item.id ? null : item.id)} className="rounded-md px-2 py-1 text-xs font-semibold text-muted hover:bg-surface-2 hover:text-ink">
                    {item.note ? "Edit note" : "Add note"}
                  </button>
                  {confirming === item.id ? (
                    <>
                      <button type="button" onClick={() => remove(item)} className="rounded-md bg-bad-bg px-2 py-1 text-xs font-semibold text-bad">Remove</button>
                      <button type="button" onClick={() => setConfirming(null)} className="rounded-md px-2 py-1 text-xs font-semibold text-muted hover:text-ink">Keep</button>
                    </>
                  ) : (
                    <button type="button" onClick={() => setConfirming(item.id)} className="rounded-md px-2 py-1 text-xs font-semibold text-muted hover:bg-bad-bg hover:text-bad" aria-label={`Remove ${item.label}`}>
                      ✕
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="border-t border-line p-5">
        <ActionForm action={addChecklistItem} submitLabel="Add document" pendingLabel="Adding…" quiet className="flex flex-col gap-2">
          <input type="hidden" name="case_id" value={caseId} />
          <label htmlFor="new-doc" className="field-label">Add a document to the checklist</label>
          <input id="new-doc" name="label" required maxLength={300} placeholder="e.g. Sponsor's payslips — last 3 months" className="field" />
        </ActionForm>
      </div>

      <FollowUp list={list} caseNo={caseNo} clientName={clientName} clientEmail={clientEmail} adviserName={adviserName} />
    </section>
  );
}

function ProgressRing({ pct, complete, flagged }: { pct: number; complete: boolean; flagged: boolean }) {
  const C = 2 * Math.PI * 26;
  return (
    <div className="relative size-20 shrink-0" role="img" aria-label={`File ${pct}% complete`}>
      <svg viewBox="0 0 64 64" className="size-full">
        <circle cx="32" cy="32" r="30" fill="none" className={complete ? "stroke-ok" : "stroke-line-2"} strokeWidth="1.5" strokeDasharray="3 3" />
        <circle cx="32" cy="32" r="26" fill="none" className="stroke-surface-2" strokeWidth="4" />
        <circle
          cx="32"
          cy="32"
          r="26"
          fill="none"
          className={`${flagged ? "stroke-accent" : "stroke-ok"} transition-[stroke-dasharray] duration-500 motion-reduce:transition-none`}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={`${(pct / 100) * C} ${C}`}
          transform="rotate(-90 32 32)"
        />
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <b className="text-base text-ink tabular-nums">{pct}%</b>
        <span className="mt-0.5 text-[9px] font-semibold tracking-wider text-muted uppercase">{complete ? "Complete" : "of file"}</span>
      </span>
    </div>
  );
}

// A plain follow-up email listing what's still needed. Nothing is sent from
// here: the adviser copies it or opens it in their own mail app to review.
function FollowUp({
  list,
  caseNo,
  clientName,
  clientEmail,
  adviserName,
}: {
  list: ChecklistItem[];
  caseNo: string;
  clientName: string | null;
  clientEmail: string | null;
  adviserName: string | null;
}) {
  const [copied, setCopied] = useState(false);
  const missing = list.filter((i) => i.status === "missing");
  const flagged = list.filter((i) => i.status === "flagged");

  const { subject, body } = (() => {
    const first = (clientName ?? "").trim().split(/\s+/)[0] || "there";
    const lines = [`Kia ora ${first},`, "", `Thank you for the documents you've sent so far for your application (our ref. ${caseNo}).`];
    if (missing.length) {
      lines.push("", "We still need the following:", ...missing.map((i) => `• ${i.label}`));
    }
    if (flagged.length) {
      lines.push("", "These need another look before we can use them:", ...flagged.map((i) => `• ${i.label}${i.note ? ` — ${i.note}` : ""}`));
    }
    lines.push(
      "",
      "You can reply to this email with the documents attached. If anything is hard to get, let us know and we'll talk through the options.",
      "",
      "Ngā mihi,",
      adviserName ?? "PPIM Consulting",
      "PPIM Consulting",
    );
    return { subject: `Documents still needed — ${caseNo}`, body: lines.join("\n") };
  })();

  if (!missing.length && !flagged.length) return null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Clipboard blocked: the text is selectable.
    }
  };
  const mailto = `mailto:${clientEmail ? encodeURIComponent(clientEmail) : ""}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  return (
    <details className="group border-t border-line">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 font-semibold text-ink hover:bg-surface-2/60">
        <span>
          Follow-up email
          <span className="ml-2 text-sm font-normal text-muted">
            {missing.length} missing{flagged.length ? `, ${flagged.length} flagged` : ""}
          </span>
        </span>
        <span aria-hidden="true" className="text-muted transition-transform group-open:rotate-180">⌄</span>
      </summary>
      <div className="flex flex-col gap-3 px-5 pb-5">
        <p className="text-xs text-muted">A starting draft. Read it through and adjust before sending. Nothing is sent from the portal.</p>
        <label htmlFor="followup-body" className="sr-only">Follow-up email text</label>
        <textarea id="followup-body" readOnly value={`Subject: ${subject}\n\n${body}`} rows={12} className="field font-mono text-xs leading-relaxed" />
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={copy} className="btn btn-quiet">{copied ? "Copied" : "Copy email"}</button>
          <a href={mailto} className="btn btn-primary">Open in mail app</a>
          {!clientEmail ? <span className="self-center text-xs text-muted">No email on file for this client.</span> : null}
        </div>
      </div>
    </details>
  );
}
