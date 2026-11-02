import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm } from "@/components/portal/action-form";
import { DueChip } from "@/components/portal/lead-chips";
import { requireProfile } from "@/lib/portal/auth";
import { DEADLINE_LABEL, type DeadlineKind } from "@/lib/portal/crm";
import { daysUntil } from "@/lib/portal/dates";
import { createClient } from "@/lib/portal/supabase/server";
import { completeDeadline } from "../enquiries/actions";

export const metadata: Metadata = { title: "Deadlines" };

type Row = {
  id: string; origin: "case" | "enquiry"; kind: DeadlineKind; due_on: string; note: string;
  person: string | null; reference: string; case_id: string | null; lead_id: string | null; adviser: string | null;
};

const GROUPS: { title: string; test: (days: number) => boolean }[] = [
  { title: "Overdue", test: (d) => d < 0 },
  { title: "Next 7 days", test: (d) => d >= 0 && d <= 7 },
  { title: "Next 30 days", test: (d) => d > 7 && d <= 30 },
  { title: "Later", test: (d) => d > 30 },
];

export default async function DeadlinesPage() {
  await requireProfile();
  const supabase = await createClient();
  const { data, error } = await supabase.from("v_deadlines").select("*").order("due_on").limit(1000);
  const rows = (data ?? []) as Row[];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-semibold">Deadlines</h1>
        <p className="mt-1 text-muted">Visa expiries, responses due and anything else with a date that can&apos;t be missed. Add them from a case.</p>
      </div>

      {error ? <p role="alert" className="rounded-lg bg-bad-bg px-3 py-2 text-sm text-bad">Couldn&apos;t load deadlines: {error.message}</p> : null}
      {!error && rows.length === 0 ? (
        <p className="rounded-xl border border-line bg-surface px-5 py-8 text-center text-muted">Nothing coming up.</p>
      ) : null}

      {GROUPS.map((group) => {
        const list = rows.filter((r) => group.test(daysUntil(r.due_on)));
        if (!list.length) return null;
        return (
          <section key={group.title}>
            <h2 className="mb-2 text-sm font-semibold text-ink">{group.title} <span className="font-normal text-muted">({list.length})</span></h2>
            <ul className="divide-y divide-line rounded-xl border border-line bg-surface">
              {list.map((r) => (
                <li key={r.id + r.origin} className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-4 py-3 text-sm">
                  <DueChip on={r.due_on} />
                  <span className="min-w-0 flex-1 basis-56">
                    <Link href={r.case_id ? `/portal/cases/${r.case_id}` : `/portal/enquiries/${r.lead_id}`} className="font-semibold text-accent-600 hover:underline">
                      {r.person ?? r.reference}
                    </Link>
                    <span className="text-muted"> · {r.reference}</span>
                    <span className="block text-ink">{DEADLINE_LABEL[r.kind]}{r.note ? <span className="text-muted"> · {r.note}</span> : null}</span>
                  </span>
                  <span className="text-muted">{r.adviser ?? "No adviser"}</span>
                  {r.origin === "case" ? (
                    <ActionForm action={completeDeadline} submitLabel="Done" pendingLabel="Saving…" quiet>
                      <input type="hidden" name="id" value={r.id} />
                    </ActionForm>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
