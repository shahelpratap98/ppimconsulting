"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionState } from "@/components/portal/action-form";
import { requireAdmin, requireAdviser } from "@/lib/portal/auth";
import { isIsoDate } from "@/lib/portal/dates";
import { createClient } from "@/lib/portal/supabase/server";

const text = (fd: FormData, name: string) => String(fd.get(name) ?? "").trim();
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_BULK = 1000;
const CHUNK = 100; // keeps each request URL short

function refresh() {
  revalidatePath("/portal/entries");
  revalidatePath("/portal/approvals");
  revalidatePath("/portal/my/day");
}

// Adviser correction of any entry, or a new entry on someone's behalf. New
// entries go in as "submitted" so they still pass through Approvals.
export async function saveEntry(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdviser();

  const id = text(fd, "id");
  const userId = text(fd, "user_id");
  const date = text(fd, "entry_date");
  const caseId = text(fd, "case_id");
  const workTypeId = text(fd, "work_type_id");
  const hours = Number(text(fd, "hours"));
  const description = text(fd, "description");

  if (!id && !userId) return { ok: false, message: "Pick who the entry is for." };
  if (!isIsoDate(date)) return { ok: false, message: "Pick a valid date." };
  if (!UUID.test(caseId)) return { ok: false, message: "Pick a case." };
  if (!UUID.test(workTypeId)) return { ok: false, message: "Pick a work type." };
  if (!Number.isFinite(hours) || hours <= 0 || hours > 24) return { ok: false, message: "Hours must be more than 0 and no more than 24." };
  if (!description) return { ok: false, message: "Add a task description." };
  if (description.length > 500) return { ok: false, message: "Keep the description under 500 characters." };

  const supabase = await createClient();
  const values = { entry_date: date, case_id: caseId, work_type_id: workTypeId, hours, description };

  if (id) {
    const { data, error } = await supabase.from("time_entries").update(values).eq("id", id).select("id");
    if (error) return { ok: false, message: error.message };
    if (!data?.length) return { ok: false, message: "This entry couldn't be found. It may have been deleted." };
  } else {
    const { error } = await supabase.from("time_entries").insert({ ...values, user_id: userId, status: "submitted" });
    if (error) return { ok: false, message: error.message };
  }

  refresh();
  if (!id) redirect(`/portal/entries?from=${date}&to=${date}`);
  return { ok: true, message: "Saved." };
}

export async function deleteEntry(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdviser();
  const id = text(fd, "id");
  if (fd.get("confirm") !== "on") return { ok: false, message: "Tick the box to confirm you want to delete this entry." };

  const supabase = await createClient();
  const { data, error } = await supabase.from("time_entries").delete().eq("id", id).select("id");
  if (error) return { ok: false, message: error.message };
  if (!data?.length) return { ok: false, message: "This entry couldn't be deleted. It may already be gone." };

  refresh();
  redirect("/portal/entries");
}

// Admin bulk delete from All time. Every deleted row is recorded in full in
// the audit log.
export async function deleteEntries(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();

  const ids = [...new Set(fd.getAll("ids").map((v) => String(v)))].filter((id) => UUID.test(id));
  if (ids.length === 0) return { ok: false, message: "Tick at least one entry to delete." };
  if (ids.length > MAX_BULK) return { ok: false, message: `You can delete up to ${MAX_BULK} entries at a time. Narrow the filter and try again.` };
  if (fd.get("confirm") !== "on") return { ok: false, message: "Tick the box to confirm the deletion." };
  if (Number(text(fd, "expected")) !== ids.length) return { ok: false, message: "The selection changed while you were confirming. Check the ticked entries and try again." };

  const supabase = await createClient();
  let deleted = 0;
  for (let i = 0; i < ids.length; i += CHUNK) {
    const { data, error } = await supabase.from("time_entries").delete().in("id", ids.slice(i, i + CHUNK)).select("id");
    if (error) {
      refresh();
      return { ok: false, message: `Deleted ${deleted} before an error stopped it: ${error.message}` };
    }
    deleted += data?.length ?? 0;
  }

  refresh();
  const noun = (n: number) => (n === 1 ? "entry" : "entries");
  if (deleted === 0) return { ok: false, message: "Nothing was deleted. Those entries may already be gone." };
  return { ok: true, message: `Deleted ${deleted} ${noun(deleted)}.` };
}
