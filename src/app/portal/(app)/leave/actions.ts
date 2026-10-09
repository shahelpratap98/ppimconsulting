"use server";

import { APP_URL } from "@/lib/portal/paths";
import { revalidatePath } from "next/cache";
import type { ActionState } from "@/components/portal/action-form";
import { requireAdviser, requireProfile } from "@/lib/portal/auth";
import { isIsoDate } from "@/lib/portal/dates";
import { emailEnabled, sendEmail } from "@/lib/portal/email";
import { LEAVE_LABEL, LEAVE_TYPES, type HalfDay, type LeaveType } from "@/lib/portal/leave";
import { rateLimit, waitMessage } from "@/lib/portal/rate-limit";
import { createClient } from "@/lib/portal/supabase/server";

const text = (fd: FormData, name: string) => String(fd.get(name) ?? "").trim();
const nz = (iso: string) => iso.split("-").reverse().join("/");

function refresh() {
  revalidatePath("/portal/leave");
  revalidatePath("/portal/my/day");
  revalidatePath("/portal/reports/hours-check");
}

export async function requestLeave(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const me = await requireProfile();
  const limit = await rateLimit("saves", me.user_id);
  if (!limit.ok) return { ok: false, message: "Too many requests in a short time. " + waitMessage(limit.retryAfter) };

  const type = text(fd, "leave_type") as LeaveType;
  const from = text(fd, "start_date");
  const to = text(fd, "end_date") || from;
  const note = text(fd, "note");
  const halfRaw = text(fd, "half_day");
  const half: HalfDay | null = halfRaw === "am" || halfRaw === "pm" ? halfRaw : null;
  if (!LEAVE_TYPES.includes(type)) return { ok: false, message: "Pick a type of leave." };
  if (!isIsoDate(from) || !isIsoDate(to)) return { ok: false, message: "Pick the first and last day." };
  if (to < from) return { ok: false, message: "The last day is before the first day." };
  if (half && from !== to) return { ok: false, message: "A half day can only be a single day." };
  if (note.length > 300) return { ok: false, message: "Keep the note under 300 characters." };

  const supabase = await createClient();
  const { data: days, error: daysError } = await supabase.rpc("working_days", { p_from: from, p_to: to });
  if (daysError) return { ok: false, message: daysError.message };
  if (!days || Number(days) <= 0) return { ok: false, message: "Those dates contain no working days (weekends and public holidays don't need leave)." };
  const dayCount = half ? 0.5 : Number(days);

  // Overlap with an existing live request for the same person.
  const { data: clash } = await supabase
    .from("leave_requests")
    .select("start_date, end_date")
    .eq("user_id", me.user_id)
    .in("status", ["requested", "approved"])
    .lte("start_date", to)
    .gte("end_date", from)
    .limit(1);
  if (clash?.length) return { ok: false, message: `You already have leave from ${nz(clash[0].start_date)} to ${nz(clash[0].end_date)} covering those dates.` };

  const { error } = await supabase
    .from("leave_requests")
    .insert({ user_id: me.user_id, leave_type: type, start_date: from, end_date: to, half_day: half, days: dayCount, note });
  if (error) return { ok: false, message: error.message };

  // Let advisers know (only when email is set up).
  if (emailEnabled()) {
    const { data: advisers } = await supabase.from("profiles").select("email, display_name").in("role", ["adviser", "admin"]).eq("is_active", true).neq("user_id", me.user_id);
    await Promise.all(
      (advisers ?? []).map((a) =>
        sendEmail({
          to: a.email,
          subject: `Leave request from ${me.display_name}`,
          paragraphs: [
            `Hello ${a.display_name},`,
            `${me.display_name} has requested ${LEAVE_LABEL[type].toLowerCase()} from ${nz(from)} to ${nz(to)} (${dayCount} working ${dayCount === 1 ? "day" : "days"}).${note ? ` Note: "${note}"` : ""}`,
          ],
          button: { label: "Review in the portal", url: `${APP_URL}/portal/leave` },
        }),
      ),
    );
  }

  refresh();
  return { ok: true, message: `Requested ${dayCount} ${dayCount === 1 ? "day" : "days"} of ${LEAVE_LABEL[type].toLowerCase()}. It's waiting for approval.` };
}

export async function cancelLeave(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const me = await requireProfile();
  const id = text(fd, "id");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leave_requests")
    .update({ status: "cancelled" })
    .eq("id", id)
    .eq("user_id", me.user_id)
    .eq("status", "requested")
    .select("id");
  if (error) return { ok: false, message: error.message };
  if (!data?.length) return { ok: false, message: "That request can't be withdrawn any more. Ask an adviser to cancel it." };
  refresh();
  return { ok: true, message: "Request withdrawn." };
}

export async function decideLeave(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const me = await requireAdviser();
  const limit = await rateLimit("bulkActions", me.user_id);
  if (!limit.ok) return { ok: false, message: "Too many actions in a short time. " + waitMessage(limit.retryAfter) };

  const id = text(fd, "id");
  const approve = text(fd, "decision") === "approve";
  const note = text(fd, "decision_note");
  if (!approve && !note) return { ok: false, message: "Add a short note so the person knows why it was declined." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("decide_leave", { p_id: id, p_approve: approve, p_note: note || null });
  if (error) return { ok: false, message: error.message };

  if (emailEnabled()) {
    const { data: req } = await supabase
      .from("leave_requests")
      .select("leave_type, start_date, end_date, days, profile:profiles!leave_requests_user_id_fkey(email, display_name)")
      .eq("id", id)
      .maybeSingle();
    const person = (req as unknown as { profile: { email: string; display_name: string } } | null)?.profile;
    if (req && person) {
      await sendEmail({
        to: person.email,
        subject: approve ? "Leave approved" : "Leave request declined",
        paragraphs: [
          `Hello ${person.display_name},`,
          `Your ${LEAVE_LABEL[req.leave_type as LeaveType].toLowerCase()} from ${nz(req.start_date)} to ${nz(req.end_date)} has been ${approve ? "approved" : "declined"} by ${me.display_name}.${note ? ` Note: "${note}"` : ""}`,
        ],
        button: { label: "Open the leave calendar", url: `${APP_URL}/portal/leave` },
      });
    }
  }

  refresh();
  return { ok: true, message: approve ? "Approved." : "Declined." };
}

// An adviser cancels an approved request (plans changed). Releases the days.
export async function cancelApprovedLeave(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdviser();
  const id = text(fd, "id");
  const supabase = await createClient();
  const { data, error } = await supabase.from("leave_requests").update({ status: "cancelled" }).eq("id", id).in("status", ["requested", "approved"]).select("id");
  if (error) return { ok: false, message: error.message };
  if (!data?.length) return { ok: false, message: "Nothing to cancel." };
  refresh();
  return { ok: true, message: "Cancelled. The days are back in their balance." };
}
