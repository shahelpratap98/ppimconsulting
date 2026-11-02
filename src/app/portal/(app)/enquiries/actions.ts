"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionState } from "@/components/portal/action-form";
import { requireAdviser, requireProfile } from "@/lib/portal/auth";
import {
  CONSULT_MODE_LABEL, DEADLINE_LABEL, ELIGIBILITY_LABEL, LOST_REASONS, OFFICE_LABEL, OPEN_STAGES, SOURCE_LABEL,
  STAGE_LABEL, type LeadStage,
} from "@/lib/portal/crm";
import { isIsoDate, nzLocalToIso, todayNZ } from "@/lib/portal/dates";
import { mailConfigured, runSync } from "@/lib/portal/mail-sync";
import { pathwayByKey } from "@/lib/portal/pathways";
import { createClient } from "@/lib/portal/supabase/server";

const text = (fd: FormData, name: string) => String(fd.get(name) ?? "").trim();
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// "" means cleared; anything else must be a real date.
function optionalDate(raw: string, label: string): { value: string | null } | { error: string } {
  if (raw === "") return { value: null };
  return isIsoDate(raw) ? { value: raw } : { error: `${label} isn't a valid date.` };
}

function money(raw: string, label: string): number | null | string {
  if (raw === "") return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0 || n > 1_000_000) return `${label} must be between 0 and 1,000,000.`;
  return Math.round(n * 100) / 100;
}

const oneOf = (value: string, list: object) => (value in list ? value : null);

function refresh(id?: string) {
  if (id) revalidatePath(`/portal/enquiries/${id}`);
  revalidatePath("/portal/enquiries");
  revalidatePath("/portal/deadlines");
}

// ------------------------------------------------------------------ add

export async function addEnquiry(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireProfile();
  const name = text(fd, "name");
  const email = text(fd, "email");
  const phone = text(fd, "phone");
  const pathway = pathwayByKey(text(fd, "pathway"));
  if (!name) return { ok: false, message: "Enter the person's name." };
  if (email && !EMAIL.test(email)) return { ok: false, message: "That email address doesn't look right." };
  if (!email && !phone) return { ok: false, message: "Enter an email address or a phone number so we can reach them." };
  if (!pathway) return { ok: false, message: "Pick a visa pathway, or Other." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("crm_add_lead", {
    p_name: name,
    p_email: email,
    p_phone: phone,
    p_title: `${pathway.name}: ${name}`,
    p_pathway: pathway.key,
    p_jurisdiction: pathway.jurisdiction,
    p_source: oneOf(text(fd, "source"), SOURCE_LABEL) ?? "phone",
    p_office: oneOf(text(fd, "office"), OFFICE_LABEL),
    p_note: text(fd, "note").slice(0, 5000) || null,
    p_referred_by: text(fd, "referred_by").slice(0, 200) || null,
  });
  if (error) return { ok: false, message: "Couldn't add the enquiry: " + error.message };
  refresh();
  redirect(`/portal/enquiries/${data}`);
}

// ------------------------------------------------------------------ move through the pipeline

export async function setStage(id: string, stage: LeadStage, reason?: string): Promise<ActionState> {
  await requireProfile();
  if (!UUID.test(id) || !(stage in STAGE_LABEL) || stage === "signed") return { ok: false, message: "That move isn't available." };
  if (stage === "not_proceeding" && !LOST_REASONS.includes(reason ?? "")) return { ok: false, message: "Choose why they aren't proceeding." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("leads")
    .update(stage === "not_proceeding" ? { stage, lost_reason: reason } : { stage })
    .eq("id", id);
  if (error) return { ok: false, message: error.message };
  refresh(id);
  return { ok: true, message: `Moved to ${STAGE_LABEL[stage]}.` };
}

export async function saveDetails(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireProfile();
  const id = text(fd, "id");
  const pathway = pathwayByKey(text(fd, "pathway"));
  const ownerId = text(fd, "owner_id");
  const nextOn = optionalDate(text(fd, "next_action_on"), "The follow-up date");
  if (!UUID.test(id) || !pathway) return { ok: false, message: "Pick a visa pathway." };
  if ("error" in nextOn) return { ok: false, message: nextOn.error };
  if (ownerId && !UUID.test(ownerId)) return { ok: false, message: "Pick someone from the list." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("leads")
    .update({
      title: text(fd, "title").slice(0, 200) || "Enquiry",
      pathway: pathway.key,
      jurisdiction: pathway.jurisdiction,
      source: oneOf(text(fd, "source"), SOURCE_LABEL) ?? "other",
      referred_by: text(fd, "referred_by").slice(0, 200) || null,
      owner_id: ownerId || null,
      next_action: text(fd, "next_action").slice(0, 300) || null,
      next_action_on: nextOn.value,
    })
    .eq("id", id);
  if (error) return { ok: false, message: "Couldn't save: " + error.message };
  refresh(id);
  return { ok: true, message: "Saved." };
}

export async function savePerson(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireProfile();
  const id = text(fd, "id");
  const contactId = text(fd, "contact_id");
  const email = text(fd, "email").toLowerCase();
  const phone = text(fd, "phone");
  const expiry = optionalDate(text(fd, "visa_expiry_on"), "The visa expiry");
  const location = text(fd, "location");
  if (!UUID.test(id) || !UUID.test(contactId)) return { ok: false, message: "Something went wrong. Reload the page." };
  if (email && !EMAIL.test(email)) return { ok: false, message: "That email address doesn't look right." };
  if (!email && !phone) return { ok: false, message: "Keep an email address or a phone number." };
  if ("error" in expiry) return { ok: false, message: expiry.error };

  const supabase = await createClient();
  const person = await supabase
    .from("contacts")
    .update({
      name: text(fd, "name").slice(0, 120) || null,
      email: email || null,
      phone: phone || null,
      nationality: text(fd, "nationality").slice(0, 80) || null,
      country: text(fd, "country").slice(0, 80) || null,
      language: text(fd, "language").slice(0, 80) || null,
    })
    .eq("id", contactId);
  if (person.error) {
    return { ok: false, message: /duplicate key/i.test(person.error.message) ? "Another person already has that email address." : person.error.message };
  }
  const { error } = await supabase
    .from("leads")
    .update({
      location: location === "onshore" || location === "offshore" ? location : null,
      current_visa: text(fd, "current_visa").slice(0, 120) || null,
      visa_expiry_on: expiry.value,
    })
    .eq("id", id);
  if (error) return { ok: false, message: "Couldn't save: " + error.message };
  refresh(id);
  return { ok: true, message: "Saved." };
}

// Booking a time moves the enquiry on, so nobody has to do it twice.
export async function saveConsultation(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireProfile();
  const id = text(fd, "id");
  const when = text(fd, "consult_at");
  const adviserId = text(fd, "adviser_id");
  const consultAt = when ? nzLocalToIso(when) : null;
  if (!UUID.test(id)) return { ok: false, message: "Something went wrong. Reload the page." };
  if (when && !consultAt) return { ok: false, message: "That date and time isn't valid." };
  if (adviserId && !UUID.test(adviserId)) return { ok: false, message: "Pick an adviser from the list." };

  const supabase = await createClient();
  const { data: lead } = await supabase.from("leads").select("stage").eq("id", id).maybeSingle();
  if (!lead) return { ok: false, message: "Enquiry not found." };
  const moveOn = consultAt && (lead.stage === "new" || lead.stage === "contacted");

  const { error } = await supabase
    .from("leads")
    .update({
      consult_at: consultAt,
      consult_mode: oneOf(text(fd, "consult_mode"), CONSULT_MODE_LABEL),
      office: oneOf(text(fd, "office"), OFFICE_LABEL),
      adviser_id: adviserId || null,
      ...(moveOn ? { stage: "consult_booked" as const } : {}),
    })
    .eq("id", id);
  if (error) return { ok: false, message: "Couldn't save: " + error.message };
  refresh(id);
  return { ok: true, message: moveOn ? "Booked. Moved to Consultation booked." : "Saved." };
}

// ------------------------------------------------------------------ adviser

export async function saveAssessment(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdviser();
  const id = text(fd, "id");
  const eligibility = oneOf(text(fd, "eligibility"), ELIGIBILITY_LABEL);
  if (!UUID.test(id) || !eligibility) return { ok: false, message: "Choose an assessment." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("leads")
    .update({ eligibility, assessment: text(fd, "assessment").slice(0, 10000) })
    .eq("id", id);
  if (error) return { ok: false, message: "Couldn't save: " + error.message };
  refresh(id);
  return { ok: true, message: "Assessment saved." };
}

export async function saveLeadFees(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdviser();
  const id = text(fd, "id");
  const consultFee = money(text(fd, "consult_fee"), "Consultation fee");
  const quotedFee = money(text(fd, "quoted_fee"), "Quoted fee");
  const paidOn = optionalDate(text(fd, "consult_paid_on"), "The paid date");
  if (!UUID.test(id)) return { ok: false, message: "Something went wrong. Reload the page." };
  if (typeof consultFee === "string") return { ok: false, message: consultFee };
  if (typeof quotedFee === "string") return { ok: false, message: quotedFee };
  if ("error" in paidOn) return { ok: false, message: paidOn.error };

  const supabase = await createClient();
  const { error } = await supabase.from("lead_fees").upsert({
    lead_id: id,
    consult_fee: consultFee,
    consult_paid_on: paidOn.value,
    quoted_fee: quotedFee,
    fee_note: text(fd, "fee_note").slice(0, 500),
  }, { onConflict: "lead_id" });
  if (error) return { ok: false, message: "Couldn't save: " + error.message };
  refresh(id);
  return { ok: true, message: "Fees saved." };
}

export async function saveAgreement(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireProfile();
  const id = text(fd, "id");
  const conflict = optionalDate(text(fd, "conflict_checked_on"), "The conflict check date");
  const care = optionalDate(text(fd, "care_info_given_on"), "The client care date");
  const sent = optionalDate(text(fd, "agreement_sent_on"), "The agreement date");
  if (!UUID.test(id)) return { ok: false, message: "Something went wrong. Reload the page." };
  if ("error" in conflict) return { ok: false, message: conflict.error };
  if ("error" in care) return { ok: false, message: care.error };
  if ("error" in sent) return { ok: false, message: sent.error };

  const supabase = await createClient();
  const { data: lead } = await supabase.from("leads").select("stage").eq("id", id).maybeSingle();
  if (!lead) return { ok: false, message: "Enquiry not found." };
  const earlier = OPEN_STAGES.indexOf(lead.stage as LeadStage) >= 0 && OPEN_STAGES.indexOf(lead.stage as LeadStage) < OPEN_STAGES.indexOf("agreement_sent");
  const moveOn = sent.value !== null && earlier;

  const { error } = await supabase
    .from("leads")
    .update({
      conflict_checked_on: conflict.value,
      care_info_given_on: care.value,
      agreement_sent_on: sent.value,
      ...(moveOn ? { stage: "agreement_sent" as const } : {}),
    })
    .eq("id", id);
  if (error) return { ok: false, message: "Couldn't save: " + error.message };
  refresh(id);
  return { ok: true, message: moveOn ? "Saved. Moved to Agreement sent." : "Saved." };
}

export async function signUpClient(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdviser();
  const id = text(fd, "id");
  const adviserId = text(fd, "adviser_id");
  const signedOn = text(fd, "signed_on");
  const fee = money(text(fd, "agreed_fee"), "Agreed fee");
  if (!UUID.test(id)) return { ok: false, message: "Something went wrong. Reload the page." };
  if (!UUID.test(adviserId)) return { ok: false, message: "Choose the responsible adviser." };
  if (!isIsoDate(signedOn)) return { ok: false, message: "Enter the date the written agreement was signed." };
  if (typeof fee === "string") return { ok: false, message: fee };

  const supabase = await createClient();
  const { data: lead } = await supabase.from("leads").select("pathway").eq("id", id).maybeSingle();
  if (!lead) return { ok: false, message: "Enquiry not found." };

  const { data: caseId, error } = await supabase.rpc("crm_sign_up", {
    p_lead_id: id,
    p_title: text(fd, "title").slice(0, 120),
    p_adviser_id: adviserId,
    p_signed_on: signedOn,
    p_agreed_fee: fee,
    p_checklist: pathwayByKey(lead.pathway)?.items ?? [],
  });
  if (error) return { ok: false, message: error.message };
  refresh(id);
  revalidatePath("/portal/cases");
  redirect(`/portal/cases/${caseId}`);
}

// ------------------------------------------------------------------ notes

export async function addActivity(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const me = await requireProfile();
  const id = text(fd, "id");
  const kind = text(fd, "kind");
  const body = text(fd, "body").slice(0, 5000);
  if (!UUID.test(id) || !["note", "call", "whatsapp"].includes(kind)) return { ok: false, message: "Something went wrong. Reload the page." };
  if (!body) return { ok: false, message: "Write what happened first." };
  const supabase = await createClient();
  const { error } = await supabase.from("activities").insert({ lead_id: id, kind, body, created_by: me.user_id });
  if (error) return { ok: false, message: "Couldn't save: " + error.message };
  refresh(id);
  return { ok: true, message: "Added." };
}

// ------------------------------------------------------------------ inbox

export async function makeEnquiry(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireProfile();
  const contactId = text(fd, "contact_id");
  if (!UUID.test(contactId)) return { ok: false, message: "Something went wrong. Reload the page." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("crm_make_lead", {
    p_contact_id: contactId,
    p_title: text(fd, "title").replace(/^(re|fw|fwd):\s*/i, "").slice(0, 200) || "Email enquiry",
  });
  if (error) return { ok: false, message: error.message };
  refresh();
  revalidatePath("/portal/enquiries/inbox");
  redirect(`/portal/enquiries/${data}`);
}

export async function ignoreSender(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireProfile();
  const contactId = text(fd, "contact_id");
  if (!UUID.test(contactId)) return { ok: false, message: "Something went wrong. Reload the page." };
  const supabase = await createClient();
  const { error } = await supabase.from("contacts").update({ status: "ignored" }).eq("id", contactId);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/portal/enquiries/inbox");
  return { ok: true, message: "Ignored." };
}

export async function checkMail(): Promise<ActionState> {
  await requireAdviser();
  if (!mailConfigured().ok) return { ok: false, message: "The mailbox isn't connected yet." };
  const result = await runSync();
  revalidatePath("/portal/enquiries/inbox");
  revalidatePath("/portal/enquiries");
  return result.ok
    ? { ok: true, message: `Checked: ${result.inbox} received, ${result.sent} sent.` }
    : { ok: false, message: result.error };
}

// ------------------------------------------------------------------ deadlines

export async function addDeadline(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const me = await requireProfile();
  const caseId = text(fd, "case_id");
  const kind = oneOf(text(fd, "kind"), DEADLINE_LABEL);
  const dueOn = text(fd, "due_on");
  if (!UUID.test(caseId) || !kind) return { ok: false, message: "Choose what the deadline is." };
  if (!isIsoDate(dueOn)) return { ok: false, message: "Enter the date." };
  const supabase = await createClient();
  const { error } = await supabase.from("deadlines").insert({
    case_id: caseId, kind, due_on: dueOn, note: text(fd, "note").slice(0, 300), created_by: me.user_id,
  });
  if (error) return { ok: false, message: "Couldn't save: " + error.message };
  revalidatePath(`/portal/cases/${caseId}`);
  revalidatePath("/portal/deadlines");
  return { ok: true, message: "Deadline added." };
}

export async function completeDeadline(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireProfile();
  const id = text(fd, "id");
  if (!UUID.test(id)) return { ok: false, message: "Something went wrong. Reload the page." };
  const supabase = await createClient();
  const { data, error } = await supabase.from("deadlines").update({ done_on: todayNZ() }).eq("id", id).select("case_id").maybeSingle();
  if (error) return { ok: false, message: "Couldn't save: " + error.message };
  if (data) revalidatePath(`/portal/cases/${data.case_id}`);
  revalidatePath("/portal/deadlines");
  return { ok: true, message: "Done." };
}
