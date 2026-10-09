"use client";

import { useActionState } from "react";
import { setPassword } from "@/app/portal/auth-actions";
import { FormMessage } from "@/components/portal/auth-card";
import { Spinner } from "@/components/portal/spinner";

export function SetPasswordForm() {
  const [state, action, pending] = useActionState(setPassword, undefined);

  return (
    <form action={action} className="flex flex-col gap-4">
      <div>
        <label htmlFor="new-password" className="field-label">New password</label>
        <input id="new-password" name="password" type="password" autoComplete="new-password" minLength={12} required className="field" />
      </div>
      <div>
        <label htmlFor="confirm-password" className="field-label">Type it again</label>
        <input id="confirm-password" name="confirm" type="password" autoComplete="new-password" minLength={12} required className="field" />
      </div>
      {state?.error ? <FormMessage tone="error">{state.error}</FormMessage> : null}
      <button type="submit" disabled={pending} className="btn btn-primary mt-1">
        {pending ? <><Spinner /> Saving…</> : "Save password and continue"}
      </button>
    </form>
  );
}
