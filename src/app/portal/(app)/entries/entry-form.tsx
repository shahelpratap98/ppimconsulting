import { ActionForm } from "@/components/portal/action-form";
import { createClient } from "@/lib/portal/supabase/server";
import { saveEntry } from "./actions";

export type EntryFormValues = {
  id: string;
  entry_date: string;
  case_id: string | null;
  work_type_id: string | null;
  hours: number | null;
  description: string;
};

// Shared by "add for someone" and "edit". With `entry` it edits; without, it
// creates and needs a person picked.
export async function EntryForm({ entry, defaultDate }: { entry?: EntryFormValues; defaultDate?: string }) {
  const supabase = await createClient();
  const [staffRes, casesRes, typesRes] = await Promise.all([
    entry ? Promise.resolve({ data: [] as { user_id: string; display_name: string }[] }) : supabase.from("profiles").select("user_id, display_name").eq("is_active", true).order("display_name"),
    supabase.from("v_cases").select("id, case_no, title, client, is_internal, status").order("is_internal", { ascending: false }).order("case_no", { ascending: false }),
    supabase.from("work_types").select("id, name, is_active").order("sort_order"),
  ]);

  // Keep closed cases / retired work types selectable when the entry already uses them.
  const cases = (casesRes.data ?? []).filter((c) => c.status !== "closed" || c.id === entry?.case_id);
  const types = (typesRes.data ?? []).filter((t) => t.is_active || t.id === entry?.work_type_id);

  return (
    <ActionForm action={saveEntry} submitLabel={entry ? "Save changes" : "Add entry"} className="flex flex-col gap-4">
      {entry ? <input type="hidden" name="id" value={entry.id} /> : null}
      <div className="grid gap-3 sm:grid-cols-2">
        {!entry ? (
          <div>
            <label htmlFor="e-user" className="field-label">Person</label>
            <select id="e-user" name="user_id" required defaultValue="" className="field">
              <option value="" disabled>Choose who this is for…</option>
              {(staffRes.data ?? []).map((s) => <option key={s.user_id} value={s.user_id}>{s.display_name}</option>)}
            </select>
          </div>
        ) : null}
        <div>
          <label htmlFor="e-date" className="field-label">Date</label>
          <input id="e-date" name="entry_date" type="date" required defaultValue={entry?.entry_date ?? defaultDate} className="field" />
        </div>
        <div>
          <label htmlFor="e-case" className="field-label">Case</label>
          <select id="e-case" name="case_id" required defaultValue={entry?.case_id ?? ""} className="field">
            <option value="" disabled>Choose a case…</option>
            {cases.map((c) => (
              <option key={c.id} value={c.id}>{c.is_internal ? c.title : `${c.case_no} · ${c.client ?? ""} · ${c.title}`}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="e-type" className="field-label">Work type</label>
          <select id="e-type" name="work_type_id" required defaultValue={entry?.work_type_id ?? ""} className="field">
            <option value="" disabled>Choose…</option>
            {types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="e-hours" className="field-label">Hours</label>
          <input id="e-hours" name="hours" type="number" required min={0.25} max={24} step={0.25} defaultValue={entry?.hours ?? ""} className="field tabular-nums" />
        </div>
      </div>
      <div>
        <label htmlFor="e-desc" className="field-label">Task description</label>
        <input id="e-desc" name="description" required maxLength={500} defaultValue={entry?.description} className="field" />
      </div>
    </ActionForm>
  );
}
