"use server";

import { APP_URL } from "@/lib/portal/paths";
import { revalidatePath } from "next/cache";
import { requireAdviser } from "@/lib/portal/auth";
import { emailEnabled, sendEmail } from "@/lib/portal/email";
import { rateLimit, waitMessage } from "@/lib/portal/rate-limit";
import { createClient } from "@/lib/portal/supabase/server";

export type ApprovalResult = { ok: boolean; message: string };

const plural = (n: number) => (n === 1 ? "1 entry" : `${n} entries`);

// Both functions are enforced again inside the database (adviser role only).
const MAX_IDS = 500;

async function guard(userId: string, ids: string[]): Promise<ApprovalResult | null> {
  if (!Array.isArray(ids) || ids.length === 0) return { ok: false, message: "Tick at least one entry first." };
  if (ids.length > MAX_IDS) return { ok: false, message: `Select up to ${MAX_IDS} entries at a time.` };
  const limit = await rateLimit("bulkActions", userId);
  return limit.ok ? null : { ok: false, message: "Too many actions in a short time. " + waitMessage(limit.retryAfter) };
}

export async function approveEntries(ids: string[]): Promise<ApprovalResult> {
  const me = await requireAdviser();
  const blocked = await guard(me.user_id, ids);
  if (blocked) return blocked;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("approve_entries", { p_ids: ids });
  if (error) return { ok: false, message: error.message };

  revalidatePath("/portal/approvals");
  return { ok: true, message: `Approved ${plural(Number(data ?? 0))}.` };
}

export async function returnEntries(ids: string[], note: string): Promise<ApprovalResult> {
  const me = await requireAdviser();
  const blocked = await guard(me.user_id, ids);
  if (blocked) return blocked;
  if (typeof note !== "string" || note.length > 300) return { ok: false, message: "Keep the note under 300 characters." };
  if (!note.trim()) return { ok: false, message: "Add a note so the person knows what to fix." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("return_entries", { p_ids: ids, p_note: note });
  if (error) return { ok: false, message: error.message };

  // Tell each person their time came back (only when email is set up).
  if (emailEnabled()) {
    const { data: returned } = await supabase.from("time_entries").select("user_id, entry_date").in("id", ids).eq("status", "returned");
    const byUser = new Map<string, Set<string>>();
    (returned ?? []).forEach((e) => byUser.set(e.user_id, (byUser.get(e.user_id) ?? new Set<string>()).add(e.entry_date)));
    const { data: people } = await supabase.from("profiles").select("user_id, display_name, email").in("user_id", [...byUser.keys()]);
    await Promise.all(
      (people ?? []).map((person) => {
        const days = [...(byUser.get(person.user_id) ?? [])].sort();
        return sendEmail({
          to: person.email,
          subject: "Timesheet entry returned",
          paragraphs: [
            `Hello ${person.display_name},`,
            `Some of your time for ${days.map((d) => d.split("-").reverse().join("/")).join(", ")} was returned with this note: "${note.trim()}"`,
            "Open the day, fix the entry and submit it again.",
          ],
          button: { label: "Open my timesheet", url: `${APP_URL}/portal/my/day?date=${days[0]}` },
        });
      }),
    );
  }

  revalidatePath("/portal/approvals");
  return { ok: true, message: `Returned ${plural(Number(data ?? 0))}.` };
}
