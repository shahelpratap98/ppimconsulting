"use client";

import { useState, useTransition } from "react";
import { Spinner } from "@/components/portal/spinner";
import { LOST_REASONS, OPEN_STAGES, STAGE_LABEL, type LeadStage } from "@/lib/portal/crm";
import { setStage } from "../actions";

// The stages in order, so the enquiry's progress is visible at a glance.
// "Signed" isn't here: signing up a client opens their case, from its own panel.
export function StageBar({ id, stage }: { id: string; stage: LeadStage }) {
  const [pending, start] = useTransition();
  const [going, setGoing] = useState<LeadStage | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const [reason, setReason] = useState("");

  const move = (next: LeadStage, why?: string) => {
    setMessage(null);
    setGoing(next);
    start(async () => {
      const result = await setStage(id, next, why);
      if (result && !result.ok) setMessage(result.message);
      else setAsking(false);
      setGoing(null);
    });
  };

  const current = OPEN_STAGES.indexOf(stage);

  if (stage === "signed") return null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {OPEN_STAGES.map((s, i) => {
          const here = s === stage;
          const passed = current > i;
          return (
            <button
              key={s}
              type="button"
              disabled={pending || here}
              aria-current={here ? "step" : undefined}
              onClick={() => move(s)}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-semibold ${
                here ? "border-ink bg-ink text-white" : passed ? "border-line bg-surface-2 text-ink hover:border-line-2" : "border-line bg-surface text-muted hover:border-line-2 hover:text-ink"
              }`}
            >
              {going === s ? <Spinner className="size-3.5" /> : null}
              {STAGE_LABEL[s]}
            </button>
          );
        })}
        {stage === "not_proceeding" ? (
          <span className="rounded-lg border border-ink bg-ink px-3 py-1.5 text-sm font-semibold text-white">Not proceeding</span>
        ) : (
          <button type="button" onClick={() => setAsking(!asking)} className="rounded-lg px-3 py-1.5 text-sm font-semibold text-muted underline-offset-4 hover:text-ink hover:underline">
            Not proceeding
          </button>
        )}
      </div>

      {asking ? (
        <div className="flex flex-wrap items-end gap-2 rounded-lg border border-line bg-surface p-3">
          <div className="min-w-0 flex-1 basis-56">
            <label htmlFor="lost-reason" className="field-label">Why not?</label>
            <select id="lost-reason" value={reason} onChange={(e) => setReason(e.target.value)} className="field">
              <option value="">Choose a reason</option>
              {LOST_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <button type="button" disabled={pending || !reason} onClick={() => move("not_proceeding", reason)} className="btn btn-primary">
            {going === "not_proceeding" ? <Spinner /> : null} Confirm
          </button>
        </div>
      ) : null}

      {message ? <p role="alert" className="rounded-lg bg-bad-bg px-3 py-2 text-sm font-semibold text-bad">{message}</p> : null}
    </div>
  );
}
