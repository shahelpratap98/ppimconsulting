"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/portal/auth";
import { isIsoDate } from "@/lib/portal/dates";
import { rateLimit, waitMessage } from "@/lib/portal/rate-limit";
import { createClient } from "@/lib/portal/supabase/server";

export type RowInput = {
  key: string; // client-side row key, echoed back on errors
  id: string | null;
  case_id: string | null;
  work_type_id: string | null;
  hours: number | null;
  description: string;
};

export type SaveDayResult =
  | { ok: true; message: string }
  | { ok: false; message: string; rowErrors?: Record<string, string> };

// A complete entry: case, work type, hours and a short description.
function rowProblem(row: RowInput): string | null {
  if (!row.case_id && !row.hours) return "Pick a case and enter hours, or remove this row.";
  if (!row.case_id) return "Hours entered but no case picked.";
  if (!row.hours || row.hours <= 0) return "Case picked but hours are missing.";
  if (row.hours > 24) return "Hours can't be more than 24.";
  if (!row.work_type_id) return "Pick a work type.";
  if (!row.description.trim()) return "Add a short task description.";
  return null;
}

const MAX_ROWS = 50;

const isBlank = (row: RowInput) =>
  !row.case_id && !row.work_type_id && !row.hours && !row.description.trim();

// Saves the editable rows for one day. With submit=true every row must be
// complete, then the whole day moves to "submitted" for approval.
export async function saveDay(date: string, rows: RowInput[], removedIds: string[], submit: boolean): Promise<SaveDayResult> {
  const profile = await requireProfile();
  if (!isIsoDate(date)) return { ok: false, message: "That date isn't valid." };

  // Bound the work one request can ask for.
  if (!Array.isArray(rows) || !Array.isArray(removedIds) || rows.length > MAX_ROWS || removedIds.length > MAX_ROWS) {
    return { ok: false, message: `A day can hold at most ${MAX_ROWS} entries.` };
  }
  if (rows.some((r) => typeof r.description !== "string" || r.description.length > 500)) {
    return { ok: false, message: "Task descriptions can be up to 500 characters." };
  }
  const limit = await rateLimit("saves", profile.user_id);
  if (!limit.ok) return { ok: false, message: "You're saving very quickly. " + waitMessage(limit.retryAfter) };

  const work = rows.filter((r) => r.id || !isBlank(r));

  for (const row of work) {
    if (row.hours !== null && (Number.isNaN(row.hours) || row.hours < 0 || row.hours > 24)) {
      return { ok: false, message: "Fix the highlighted row.", rowErrors: { [row.key]: "Hours must be between 0 and 24." } };
    }
  }

  if (submit) {
    if (work.length === 0) return { ok: false, message: "Add at least one entry before submitting." };
    const rowErrors: Record<string, string> = {};
    for (const row of work) {
      const problem = rowProblem(row);
      if (problem) rowErrors[row.key] = problem;
    }
    if (Object.keys(rowErrors).length > 0) {
      return { ok: false, message: "Some rows aren't complete yet. Nothing was submitted.", rowErrors };
    }
  }

  const supabase = await createClient();
  const status = submit ? "submitted" : "draft";

  // Hours already locked in for the day (submitted / approved).
  const { data: locked } = await supabase
    .from("time_entries")
    .select("hours")
    .eq("user_id", profile.user_id)
    .eq("entry_date", date)
    .in("status", ["submitted", "approved"]);
  const lockedHours = (locked ?? []).reduce((sum, e) => sum + Number(e.hours ?? 0), 0);
  const newHours = work.reduce((sum, r) => sum + (r.hours ?? 0), 0);
  if (lockedHours + newHours > 24) {
    return { ok: false, message: `That makes ${lockedHours + newHours} hours in one day. Check the hours.` };
  }

  if (removedIds.length > 0) {
    const { error } = await supabase.from("time_entries").delete().in("id", removedIds).eq("user_id", profile.user_id);
    if (error) return { ok: false, message: "Couldn't remove a row: " + error.message };
  }

  for (const row of work) {
    const values = {
      case_id: row.case_id,
      work_type_id: row.work_type_id,
      hours: row.hours,
      description: row.description.trim(),
      status,
    };
    const { error } = row.id
      ? await supabase.from("time_entries").update(values).eq("id", row.id).eq("user_id", profile.user_id)
      : await supabase.from("time_entries").insert({ ...values, user_id: profile.user_id, entry_date: date });
    if (error) {
      return { ok: false, message: "Couldn't save.", rowErrors: { [row.key]: error.message } };
    }
  }

  revalidatePath("/portal/my/day");
  revalidatePath("/portal/approvals");
  return {
    ok: true,
    message: submit ? "Submitted for approval." : "Draft saved.",
  };
}
