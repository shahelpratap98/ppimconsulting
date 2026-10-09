import type { Metadata } from "next";
import { ActionForm } from "@/components/portal/action-form";
import { requireProfile } from "@/lib/portal/auth";
import { changePassword } from "./actions";

export const metadata: Metadata = { title: "My account" };

export default async function AccountPage() {
  const profile = await requireProfile();

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <div>
        <h1 className="text-3xl font-semibold">My account</h1>
        <p className="mt-1 text-muted">
          Signed in as <span className="font-semibold text-ink">{profile.display_name}</span> ({profile.email}).
        </p>
      </div>

      <section aria-labelledby="password-heading" className="rounded-xl border border-line bg-surface p-5">
        <h2 id="password-heading" className="text-xl font-semibold">Change password</h2>
        <p className="mt-1 text-sm text-muted">At least 12 characters. Other devices stay signed in until their session expires.</p>
        <ActionForm action={changePassword} submitLabel="Change password" pendingLabel="Changing…" className="mt-4 flex flex-col gap-4">
          <div>
            <label htmlFor="current-password" className="field-label">Current password</label>
            <input id="current-password" name="current" type="password" autoComplete="current-password" required className="field" />
          </div>
          <div>
            <label htmlFor="account-new-password" className="field-label">New password</label>
            <input id="account-new-password" name="password" type="password" autoComplete="new-password" minLength={12} required className="field" />
          </div>
          <div>
            <label htmlFor="account-confirm-password" className="field-label">Type the new password again</label>
            <input id="account-confirm-password" name="confirm" type="password" autoComplete="new-password" minLength={12} required className="field" />
          </div>
        </ActionForm>
      </section>
    </div>
  );
}
