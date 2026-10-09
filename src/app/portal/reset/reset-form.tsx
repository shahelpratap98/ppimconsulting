"use client";

import { useActionState } from "react";
import { requestReset } from "@/app/portal/auth-actions";
import { FormMessage } from "@/components/portal/auth-card";
import { Spinner } from "@/components/portal/spinner";

export function ResetForm() {
  const [state, action, pending] = useActionState(requestReset, undefined);

  return (
    <form action={action} className="flex flex-col gap-4">
      <div>
        <label htmlFor="reset-email" className="field-label">Email</label>
        <input id="reset-email" name="email" type="email" autoComplete="username" required className="field" />
      </div>
      {state?.error ? <FormMessage tone="error">{state.error}</FormMessage> : null}
      {state?.ok ? <FormMessage tone="ok">{state.ok}</FormMessage> : null}
      <button type="submit" disabled={pending} className="btn btn-primary mt-1">
        {pending ? <><Spinner /> Sending…</> : "Send reset link"}
      </button>
    </form>
  );
}
