import type { Metadata } from "next";
import Link from "next/link";
import { requireAdviser } from "@/lib/portal/auth";
import { todayNZ } from "@/lib/portal/dates";
import { EntryForm } from "../entry-form";

export const metadata: Metadata = { title: "Add an entry" };

export default async function NewEntryPage() {
  await requireAdviser();

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <Link href="/portal/entries" className="text-sm font-semibold text-accent-600 hover:underline">← All time</Link>
        <h1 className="mt-2 text-3xl font-semibold">Add an entry for someone</h1>
        <p className="mt-1 text-muted">For when a person couldn&apos;t enter their own time. It goes into the approvals queue like any other entry.</p>
      </div>
      <section className="rounded-xl border border-line bg-surface p-5">
        <EntryForm defaultDate={todayNZ()} />
      </section>
    </div>
  );
}
