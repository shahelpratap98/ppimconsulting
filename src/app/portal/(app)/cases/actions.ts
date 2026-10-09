"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionState } from "@/components/portal/action-form";
import { requireAdviser, requireProfile } from "@/lib/portal/auth";
import { isIsoDate } from "@/lib/portal/dates";
import { pathwayByKey } from "@/lib/portal/pathways";
import { createClient } from "@/lib/portal/supabase/server";
import type { CaseOutcome, CaseStatus, DocStatus } from "@/lib/portal/types";

const text = (fd: FormData, name: string) => String(fd.get(name) ?? "").trim();
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STATUSES: CaseStatus[] = ["enquiry", "active", "lodged", "decided", "closed"];
const OUTCOMES: CaseOutcome[] = ["approved", "declined", "withdrawn"];
const DOC_STATUSES: DocStatus[] = ["missing", "received", "flagged"];

function money(raw: string, label: string): number | null | string {
  if (raw === "") return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0 || n > 1_000_000) return `${label} must be between 0 and 1,000,000.`;
  return Math.round(n * 100) / 100;
}

function refreshCase(id: string) {
  revalidatePath(`/portal/cases/${id}`);
  revalidatePath("/portal/cases");
}

// ------------------------------------------------------------------ open a case

export async function openCase(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdviser();
  const supabase = await createClient();

  let clientId = text(fd, "client_id");
  const newName = text(fd, "new_client_name");
  const title = text(fd, "title");
  const pathwayKey = text(fd, "pathway");
  const adviserId = text(fd, "adviser_id");
  const fee = money(text(fd, "agreed_fee"), "Agreed fee");
  const pathway = pathwayByKey(pathwayKey);

  if (!pathway) return { ok: false, message: "Pick a visa pathway." };
  if (!title) return { ok: false, message: "Give the case a short title, e.g. \"Partnership visa — onshore\"." };
  if (title.length > 120) return { ok: false, message: "Keep the title under 120 characters." };
  if (typeof fee === "string") return { ok: false, message: fee };
  if (adviserId && !UUID.test(adviserId)) return { ok: false, message: "Pick the responsible adviser." };

  // Either an existing client or a new one typed in.
  if (newName) {
    const email = text(fd, "new_client_email");
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, message: "The client's email address doesn't look right." };
    const { data, error } = await supabase
      .from("clients")
      .insert({
        full_name: newName,
        email: email || null,
        phone: text(fd, "new_client_phone") || null,
        country: text(fd, "new_client_country") || null,
      })
      .select("id")
      .single();
    if (error) return { ok: false, message: "Couldn't add the client: " + error.message };
    clientId = data.id;
  }
  if (!UUID.test(clientId)) return { ok: false, message: "Choose an existing client or type a new client's name." };

  const { data: caseId, error } = await supabase.rpc("create_case", {
    p_client_id: clientId,
    p_title: title,
    p_pathway: pathway.key,
    p_jurisdiction: pathway.jurisdiction,
    p_adviser_id: adviserId || null,
    p_checklist: pathway.items,
  });
  if (error) return { ok: false, message: error.message };

  if (fee !== null) {
    await supabase.from("case_fees").update({ agreed_fee: fee }).eq("case_id", caseId);
  }

  revalidatePath("/portal/cases");
  redirect(`/portal/cases/${caseId}`);
}

// ------------------------------------------------------------------ case details

export async function updateCase(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdviser();
  const id = text(fd, "id");
  const status = text(fd, "status") as CaseStatus;
  const outcome = text(fd, "outcome");
  const lodged = text(fd, "lodged_on");
  const decided = text(fd, "decided_on");
  const adviserId = text(fd, "adviser_id");
  const values = {
    title: text(fd, "title"),
    status,
    adviser_id: adviserId || null,
    lodged_on: lodged || null,
    decided_on: decided || null,
    outcome: outcome || null,
    notes: text(fd, "notes"),
  };
  if (!UUID.test(id)) return { ok: false, message: "Case not found." };
  if (!values.title) return { ok: false, message: "The title can't be blank." };
  if (!STATUSES.includes(status)) return { ok: false, message: "Pick a status." };
  if (outcome && !OUTCOMES.includes(outcome as CaseOutcome)) return { ok: false, message: "Pick an outcome." };
  if ((lodged && !isIsoDate(lodged)) || (decided && !isIsoDate(decided))) return { ok: false, message: "Check the dates." };
  if (adviserId && !UUID.test(adviserId)) return { ok: false, message: "Pick the adviser." };
  if (values.notes.length > 5000) return { ok: false, message: "Keep the notes under 5000 characters." };

  const supabase = await createClient();
  const { error } = await supabase.from("cases").update(values).eq("id", id);
  if (error) return { ok: false, message: error.message };
  refreshCase(id);
  return { ok: true, message: "Saved." };
}

// ------------------------------------------------------------------ checklist (the case assistant)
// Anyone working on cases can keep the checklist up to date.

export async function setChecklistItem(caseId: string, itemId: string, patch: { status?: DocStatus; note?: string }): Promise<{ ok: boolean; message?: string }> {
  await requireProfile();
  if (!UUID.test(itemId) || !UUID.test(caseId)) return { ok: false, message: "Item not found." };
  const values: { status?: DocStatus; note?: string; updated_by?: string } = {};
  if (patch.status !== undefined) {
    if (!DOC_STATUSES.includes(patch.status)) return { ok: false, message: "Unknown status." };
    values.status = patch.status;
  }
  if (patch.note !== undefined) {
    if (typeof patch.note !== "string" || patch.note.length > 500) return { ok: false, message: "Keep notes under 500 characters." };
    values.note = patch.note.trim();
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  values.updated_by = user?.id;
  const { error } = await supabase.from("checklist_items").update(values).eq("id", itemId).eq("case_id", caseId);
  if (error) return { ok: false, message: error.message };
  refreshCase(caseId);
  return { ok: true };
}

export async function addChecklistItem(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const me = await requireProfile();
  const caseId = text(fd, "case_id");
  const label = text(fd, "label");
  if (!UUID.test(caseId)) return { ok: false, message: "Case not found." };
  if (!label) return { ok: false, message: "Describe the document." };
  if (label.length > 300) return { ok: false, message: "Keep it under 300 characters." };

  const supabase = await createClient();
  const { data: last } = await supabase.from("checklist_items").select("sort_order").eq("case_id", caseId).order("sort_order", { ascending: false }).limit(1);
  const { error } = await supabase
    .from("checklist_items")
    .insert({ case_id: caseId, label, sort_order: (last?.[0]?.sort_order ?? 0) + 1, updated_by: me.user_id });
  if (error) return { ok: false, message: error.message };
  refreshCase(caseId);
  return { ok: true, message: "Added." };
}

export async function removeChecklistItem(caseId: string, itemId: string): Promise<{ ok: boolean; message?: string }> {
  await requireProfile();
  if (!UUID.test(itemId) || !UUID.test(caseId)) return { ok: false, message: "Item not found." };
  const supabase = await createClient();
  const { error } = await supabase.from("checklist_items").delete().eq("id", itemId).eq("case_id", caseId);
  if (error) return { ok: false, message: error.message };
  refreshCase(caseId);
  return { ok: true };
}

// ------------------------------------------------------------------ fees (advisers)

export async function saveFee(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdviser();
  const caseId = text(fd, "case_id");
  const fee = money(text(fd, "agreed_fee"), "Agreed fee");
  const note = text(fd, "fee_note");
  if (!UUID.test(caseId)) return { ok: false, message: "Case not found." };
  if (typeof fee === "string") return { ok: false, message: fee };
  if (note.length > 500) return { ok: false, message: "Keep the note under 500 characters." };

  const supabase = await createClient();
  const { error } = await supabase.from("case_fees").upsert({ case_id: caseId, agreed_fee: fee, fee_note: note }, { onConflict: "case_id" });
  if (error) return { ok: false, message: error.message };
  refreshCase(caseId);
  revalidatePath("/portal/invoices");
  return { ok: true, message: "Fee saved." };
}

export async function saveStage(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdviser();
  const caseId = text(fd, "case_id");
  const id = text(fd, "id");
  const label = text(fd, "label");
  const amount = money(text(fd, "amount"), "Amount");
  if (!UUID.test(caseId)) return { ok: false, message: "Case not found." };
  if (!label) return { ok: false, message: "Name the stage, e.g. \"Deposit on signing\"." };
  if (label.length > 200) return { ok: false, message: "Keep the stage name under 200 characters." };
  if (amount === null || typeof amount === "string") return { ok: false, message: typeof amount === "string" ? amount : "Enter the amount (excl. GST)." };

  const supabase = await createClient();
  if (id) {
    const { data, error } = await supabase.from("fee_stages").update({ label, amount }).eq("id", id).eq("case_id", caseId).select("id");
    if (error) return { ok: false, message: error.message };
    if (!data?.length) return { ok: false, message: "That stage has been billed, so it can't be changed. Void the invoice first." };
  } else {
    const { data: last } = await supabase.from("fee_stages").select("sort_order").eq("case_id", caseId).order("sort_order", { ascending: false }).limit(1);
    const { error } = await supabase.from("fee_stages").insert({ case_id: caseId, label, amount, sort_order: (last?.[0]?.sort_order ?? 0) + 1 });
    if (error) return { ok: false, message: error.message };
  }
  refreshCase(caseId);
  revalidatePath("/portal/invoices");
  return { ok: true, message: id ? "Saved." : "Stage added." };
}

export async function deleteStage(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdviser();
  const caseId = text(fd, "case_id");
  const id = text(fd, "id");
  const supabase = await createClient();
  const { data, error } = await supabase.from("fee_stages").delete().eq("id", id).eq("case_id", caseId).select("id");
  if (error) return { ok: false, message: error.message };
  if (!data?.length) return { ok: false, message: "That stage has been billed, so it can't be removed." };
  refreshCase(caseId);
  revalidatePath("/portal/invoices");
  return { ok: true, message: "Removed." };
}
