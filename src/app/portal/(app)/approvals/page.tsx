import type { Metadata } from "next";
import { requireAdviser } from "@/lib/portal/auth";
import { createClient } from "@/lib/portal/supabase/server";
import type { EntryView } from "@/lib/portal/types";
import { ApprovalQueue } from "./approval-queue";

export const metadata: Metadata = { title: "Approvals" };

export default async function ApprovalsPage() {
  await requireAdviser();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("v_entries")
    .select("id, entry_date, user_id, employee, case_id, case_no, case_title, client, work_type, hours, description, status")
    .eq("status", "submitted")
    .order("employee")
    .order("entry_date")
    .order("created_at");

  const entries = (data ?? []) as EntryView[];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-semibold">Approvals</h1>
        <p className="mt-1 text-muted">
          Submitted time waiting for sign-off. Check it is on the right case: it feeds each case&apos;s hours and profitability.
        </p>
      </div>
      {error ? (
        <p role="alert" className="rounded-lg bg-bad-bg px-3 py-2 text-sm text-bad">Couldn&apos;t load the queue: {error.message}</p>
      ) : entries.length === 0 ? (
        <p className="rounded-xl border border-line bg-surface px-5 py-8 text-center text-muted">
          Nothing waiting. Submitted days will show up here.
        </p>
      ) : (
        <ApprovalQueue key={entries.map((e) => e.id).join(",")} entries={entries} />
      )}
    </div>
  );
}
