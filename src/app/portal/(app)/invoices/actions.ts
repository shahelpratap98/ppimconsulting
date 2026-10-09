"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionState } from "@/components/portal/action-form";
import { requireAdmin } from "@/lib/portal/auth";
import { isIsoDate } from "@/lib/portal/dates";
import { rateLimit, waitMessage } from "@/lib/portal/rate-limit";
import { createClient } from "@/lib/portal/supabase/server";

const text = (fd: FormData, name: string) => String(fd.get(name) ?? "").trim();
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function refresh(caseId?: string) {
  revalidatePath("/portal/invoices");
  if (caseId) revalidatePath(`/portal/cases/${caseId}`);
}

// Bills the ticked fee stages of one case (plus an optional extra line, e.g.
// a disbursement). Numbering, GST and the "billed once" rule are enforced in
// public.create_invoice.
export async function createInvoice(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const me = await requireAdmin();
  const limit = await rateLimit("bulkActions", me.user_id);
  if (!limit.ok) return { ok: false, message: "Too many actions in a short time. " + waitMessage(limit.retryAfter) };

  const caseId = text(fd, "case_id");
  const stageIds = fd.getAll("stage_ids").map(String).filter((id) => UUID.test(id));
  const extraDesc = text(fd, "extra_desc");
  const extraRaw = text(fd, "extra_amount");
  const extraAmount = extraRaw === "" ? null : Number(extraRaw);
  const issuedOn = text(fd, "issued_on");
  const notes = text(fd, "notes");

  if (!UUID.test(caseId)) return { ok: false, message: "Pick a case first." };
  if (!isIsoDate(issuedOn)) return { ok: false, message: "Pick the invoice date." };
  if (extraAmount !== null && (!Number.isFinite(extraAmount) || extraAmount < 0 || extraAmount > 1_000_000)) {
    return { ok: false, message: "The extra line amount must be between 0 and 1,000,000." };
  }
  if (extraAmount && !extraDesc) return { ok: false, message: "Describe the extra line." };
  if (stageIds.length === 0 && !extraAmount) return { ok: false, message: "Tick at least one fee stage, or add an extra line." };
  if (notes.length > 1000) return { ok: false, message: "Keep the note under 1000 characters." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_invoice", {
    p_case_id: caseId,
    p_stage_ids: stageIds,
    p_extra_desc: extraDesc || null,
    p_extra_amount: extraAmount,
    p_issued_on: issuedOn,
    p_notes: notes,
  });
  if (error) return { ok: false, message: error.message };

  refresh(caseId);
  redirect(`/portal/invoices/${data}`);
}

export async function setInvoicePaid(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = text(fd, "id");
  const paidOn = text(fd, "paid_on");
  const unpaid = fd.get("unpaid") === "1";
  if (!UUID.test(id)) return { ok: false, message: "Invoice not found." };
  if (!unpaid && !isIsoDate(paidOn)) return { ok: false, message: "Pick the date it was paid." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_invoice_paid", { p_invoice_id: id, p_paid_on: unpaid ? null : paidOn });
  if (error) return { ok: false, message: error.message };

  refresh();
  revalidatePath(`/portal/invoices/${id}`);
  return { ok: true, message: unpaid ? "Marked as unpaid." : "Marked as paid." };
}

export async function voidInvoice(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = text(fd, "id");
  if (!UUID.test(id)) return { ok: false, message: "Invoice not found." };
  if (fd.get("confirm") !== "on") return { ok: false, message: "Tick the box to confirm." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("void_invoice", { p_invoice_id: id });
  if (error) return { ok: false, message: error.message };

  refresh();
  revalidatePath(`/portal/invoices/${id}`);
  return { ok: true, message: "Voided. Its fee stages can be billed again; the number is not reused." };
}
