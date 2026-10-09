import type { Metadata } from "next";
import { ActionForm } from "@/components/portal/action-form";
import { createClient } from "@/lib/portal/supabase/server";
import { saveWorkType } from "../actions";

export const metadata: Metadata = { title: "Work types" };

type WorkTypeRow = { id: string; name: string; sort_order: number; is_active: boolean };

export default async function WorkTypesPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("work_types").select("id, name, sort_order, is_active").order("sort_order").order("name");
  const types = (data ?? []) as WorkTypeRow[];
  const nextOrder = (types.at(-1)?.sort_order ?? 0) + 10;

  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby="new-type-heading" className="rounded-xl border border-line bg-surface p-5">
        <h2 id="new-type-heading" className="text-xl font-semibold">Add a work type</h2>
        <ActionForm action={saveWorkType} submitLabel="Add work type" className="mt-4 flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_8rem]">
            <div>
              <label htmlFor="wt-new-name" className="field-label">Name</label>
              <input id="wt-new-name" name="name" required maxLength={60} className="field" placeholder="e.g. Peer review" />
            </div>
            <div>
              <label htmlFor="wt-new-order" className="field-label">Order</label>
              <input id="wt-new-order" name="sort_order" type="number" min={0} step={1} defaultValue={nextOrder} className="field tabular-nums" />
            </div>
          </div>
        </ActionForm>
      </section>

      <section aria-labelledby="types-heading">
        <h2 id="types-heading" className="text-xl font-semibold">Work types ({types.length})</h2>
        <p className="mt-1 text-sm text-muted">Lower order numbers show first in the dropdown. Untick Active to retire one without touching past entries.</p>
        <ul className="mt-3 flex flex-col gap-2">
          {types.map((t) => (
            <li key={t.id} className="rounded-xl border border-line bg-surface px-4 py-3">
              <ActionForm action={saveWorkType} submitLabel="Save" quiet className="flex flex-wrap items-end gap-3">
                <input type="hidden" name="id" value={t.id} />
                <div className="min-w-0 flex-1 basis-56">
                  <label htmlFor={`wt-name-${t.id}`} className="field-label">Name</label>
                  <input id={`wt-name-${t.id}`} name="name" defaultValue={t.name} required maxLength={60} className="field" />
                </div>
                <div className="w-24">
                  <label htmlFor={`wt-order-${t.id}`} className="field-label">Order</label>
                  <input id={`wt-order-${t.id}`} name="sort_order" type="number" min={0} step={1} defaultValue={t.sort_order} className="field tabular-nums" />
                </div>
                <label className="flex items-center gap-2 pb-2.5 text-sm">
                  <input type="checkbox" name="is_active" defaultChecked={t.is_active} className="size-4 accent-ink" />
                  Active
                </label>
              </ActionForm>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
