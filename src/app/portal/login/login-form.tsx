"use client";

import { useActionState } from "react";
import { signIn } from "@/app/portal/auth-actions";
import { FormMessage } from "@/components/portal/auth-card";
import { Spinner } from "@/components/portal/spinner";

export function LoginForm({ next, notice }: { next: string; notice?: string }) {
  const [state, action, pending] = useActionState(signIn, undefined);
  const error = state?.error ?? notice;

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />
      <div>
        <label htmlFor="email" className="field-label">Email</label>
        <input id="email" name="email" type="email" autoComplete="username" required className="field" />
      </div>
      <div>
        <label htmlFor="password" className="field-label">Password</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required className="field" />
      </div>
      {error ? <FormMessage tone="error">{error}</FormMessage> : null}
      <button type="submit" disabled={pending} className="btn btn-primary mt-1">
        {pending ? <><Spinner /> Signing in…</> : "Sign in"}
      </button>
    </form>
  );
}
