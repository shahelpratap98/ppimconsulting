import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/portal/action-form";
import { StatusChip } from "@/components/portal/status-chip";
import { requireAdviser } from "@/lib/portal/auth";
import { formatDay } from "@/lib/portal/dates";
import { createClient } from "@/lib/portal/supabase/server";
import { deleteEntry } from "../actions";
import { EntryForm } from "../entry-form";

export const metadata: Metadata = { title: "Edit entry" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EditEntryPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdviser();
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const supabase = await createClient();
  const { data: e } = await supabase
    .from("v_entries")
    .select("id, entry_date, employee, case_id, work_type_id, hours, description, status, approved_by_name, return_note")
    .eq("id", id)
    .maybeSingle();
  if (!e) notFound();

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <Link href="/portal/entries" className="text-sm font-semibold text-accent-600 hover:underline">← All time</Link>
        <h1 className="mt-2 text-3xl font-semibold">{e.employee}, {formatDay(e.entry_date, { weekday: "short", day: "numeric", month: "long", year: "numeric" })}</h1>
        <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted">
          <StatusChip status={e.status} />
          {e.approved_by_name ? <span>Approved by {e.approved_by_name}</span> : null}
          {e.status === "returned" && e.return_note ? <span>· Returned: {e.return_note}</span> : null}
        </p>
      </div>

      <section className="rounded-xl border border-line bg-surface p-5">
        <EntryForm entry={e} />
      </section>

      <section aria-labelledby="delete-heading" className="rounded-xl border border-bad/30 bg-surface p-5">
          <h2 id="delete-heading" className="text-lg font-semibold">Delete this entry</h2>
          <p className="mt-1 text-sm text-muted">Removes it for good. The deletion is recorded in the audit log.</p>
          <ActionForm action={deleteEntry} submitLabel="Delete entry" pendingLabel="Deleting…" quiet className="mt-3 flex flex-col gap-3">
            <input type="hidden" name="id" value={e.id} />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="confirm" className="size-4 accent-ink" />
              Yes, delete this entry
            </label>
          </ActionForm>
      </section>
    </div>
  );
}
