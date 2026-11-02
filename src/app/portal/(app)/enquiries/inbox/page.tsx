import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm } from "@/components/portal/action-form";
import { isAdviser, requireProfile } from "@/lib/portal/auth";
import { formatDateTime } from "@/lib/portal/dates";
import { mailConfigured } from "@/lib/portal/mail-sync";
import { createClient } from "@/lib/portal/supabase/server";
import { checkMail, ignoreSender, makeEnquiry } from "../actions";

export const metadata: Metadata = { title: "Inbox" };

type TriageRow = {
  id: string; email: string; name: string | null; last_inbound_at: string | null;
  message_count: number; last_subject: string | null; last_preview: string | null;
};
type SyncRow = { last_ok_at: string | null; last_error: string | null };

// People who emailed info@ but aren't enquiries yet. Website enquiries skip
// this, existing clients skip it, and newsletters never get here at all.
export default async function InboxPage() {
  const profile = await requireProfile();
  const adviser = isAdviser(profile.role);
  const connected = mailConfigured().ok;

  const supabase = await createClient();
  const [rowsRes, syncRes] = await Promise.all([
    supabase.from("v_triage").select("*").order("last_inbound_at", { ascending: false }).limit(200),
    supabase.from("mail_sync").select("last_ok_at, last_error").maybeSingle(),
  ]);
  const rows = (rowsRes.data ?? []) as TriageRow[];
  const sync = syncRes.data as SyncRow | null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/portal/enquiries" className="text-sm font-semibold text-accent-600 hover:underline">← Enquiries</Link>
          <h1 className="mt-2 text-3xl font-semibold">Inbox</h1>
          <p className="mt-1 text-muted">New people who emailed info@. Make them an enquiry, or ignore the sender and their future emails stay out of here.</p>
        </div>
        {adviser && connected ? (
          <ActionForm action={checkMail} submitLabel="Check mail now" pendingLabel="Checking…" quiet />
        ) : null}
      </div>

      {!connected ? (
        <p className="rounded-xl border border-warn/30 bg-warn-bg px-4 py-3 text-sm text-warn">
          <span className="font-semibold">The info@ mailbox isn&apos;t connected yet.</span> Website enquiries still arrive on the Enquiries page. Emails will show here once the Microsoft connection is set up.
        </p>
      ) : sync?.last_error ? (
        <p role="alert" className="rounded-xl border border-bad/30 bg-bad-bg px-4 py-3 text-sm text-bad">
          <span className="font-semibold">The last mail check failed.</span> {sync.last_error}
        </p>
      ) : sync?.last_ok_at ? (
        <p className="text-sm text-muted">Mail last checked {formatDateTime(sync.last_ok_at)}.</p>
      ) : null}

      {rows.length === 0 ? (
        <p className="rounded-xl border border-line bg-surface px-5 py-8 text-center text-muted">Nothing to sort. New senders show up here.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((r) => (
            <li key={r.id} className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink">
                  {r.name || r.email}
                  {r.name ? <span className="ml-2 font-normal text-muted">{r.email}</span> : null}
                </p>
                <p className="truncate text-sm text-ink">{r.last_subject || "(no subject)"}</p>
                <p className="truncate text-sm text-muted">{r.last_preview}</p>
                <p className="mt-0.5 text-xs text-muted">
                  {r.message_count} email{r.message_count === 1 ? "" : "s"}{r.last_inbound_at ? ` · ${formatDateTime(r.last_inbound_at)}` : ""}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <ActionForm action={makeEnquiry} submitLabel="Make enquiry" pendingLabel="Adding…">
                  <input type="hidden" name="contact_id" value={r.id} />
                  <input type="hidden" name="title" value={r.last_subject ?? ""} />
                </ActionForm>
                <ActionForm action={ignoreSender} submitLabel="Ignore" pendingLabel="Ignoring…" quiet>
                  <input type="hidden" name="contact_id" value={r.id} />
                </ActionForm>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
