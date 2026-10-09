"use client";

import { useActionState, type ReactNode } from "react";
import { CopyField } from "@/components/portal/copy-field";
import { Spinner } from "@/components/portal/spinner";

export type ActionState = { ok: boolean; message: string; link?: string } | undefined;
export type FormAction = (prev: ActionState, formData: FormData) => Promise<ActionState>;

// A <form> wired to a server action, with its result shown underneath.
export function ActionForm({
  action,
  children,
  submitLabel,
  pendingLabel = "Saving…",
  className = "",
  quiet = false,
  hideSubmit = false,
}: {
  action: FormAction;
  children?: ReactNode;
  submitLabel: string;
  pendingLabel?: string;
  className?: string;
  quiet?: boolean;
  hideSubmit?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction} className={className}>
      {children}
      <div className="flex flex-col gap-2">
        {hideSubmit ? null : (
          <button type="submit" disabled={pending} className={`btn self-start ${quiet ? "btn-quiet" : "btn-primary"}`}>
            {pending ? <><Spinner /> {pendingLabel}</> : submitLabel}
          </button>
        )}
        {state ? (
          <p
            role={state.ok ? "status" : "alert"}
            className={`rounded-lg px-3 py-2 text-sm font-semibold ${state.ok ? "bg-ok-bg text-ok" : "bg-bad-bg text-bad"}`}
          >
            {state.message}
          </p>
        ) : null}
        {state?.link ? <CopyField value={state.link} /> : null}
      </div>
    </form>
  );
}
