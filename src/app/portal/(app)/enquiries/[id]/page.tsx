import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/portal/action-form";
import { DueChip, LeadStageChip, SourceChip } from "@/components/portal/lead-chips";
import { isAdviser, requireProfile } from "@/lib/portal/auth";
import {
  CONSULT_MODE_LABEL, ELIGIBILITY_LABEL, leadName, messageTemplates, OFFICE_LABEL, SOURCE_LABEL, whatsappNumber, type LeadView,
} from "@/lib/portal/crm";
import { formatDateTime, formatDay, isoToNzLocal, todayNZ } from "@/lib/portal/dates";
import { pathwayByKey, pathwayLabel, PATHWAYS } from "@/lib/portal/pathways";
import { createClient } from "@/lib/portal/supabase/server";
import {
  addActivity, saveAgreement, saveAssessment, saveConsultation, saveDetails, saveLeadFees, savePerson, signUpClient,
} from "../actions";
import { MessageComposer } from "./message-composer";
import { StageBar } from "./stage-bar";

export const metadata: Metadata = { title: "Enquiry" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const short = (iso: string) => formatDay(iso, { day: "numeric", month: "short", year: "numeric" });

type Activity = { id: string; kind: string; body: string; at: string; author: { display_name: string } | null };
type Message = {
  id: string; direction: "in" | "out"; from_email: string | null; subject: string; preview: string; body_text: string;
  received_at: string; has_attachments: boolean;
};
type Fees = { consult_fee: number | null; consult_paid_on: string | null; quoted_fee: number | null; fee_note: string };
type Person = { user_id: string; display_name: string; role: string };

const KIND_LABEL: Record<string, string> = { call: "Call", whatsapp: "WhatsApp", enquiry: "Enquiry" };

function Panel({ title, children, hint }: { title: string; children: React.ReactNode; hint?: string }) {
  return (
    <section className="rounded-xl border border-line bg-surface p-5">
      <h2 className="text-base font-semibold text-ink">{title}</h2>
      {hint ? <p className="mt-0.5 text-sm text-muted">{hint}</p> : null}
      <div className="mt-3">{children}</div>
    </section>
  );
}

export default async function EnquiryPage({ params }: { params: Promise<{ id: string }> }) {
  const profile = await requireProfile();
  const adviser = isAdviser(profile.role);
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const supabase = await createClient();
  const { data } = await supabase.from("v_leads").select("*").eq("id", id).maybeSingle();
  const l = data as LeadView | null;
  if (!l) notFound();

  const [activityRes, messagesRes, peopleRes, feesRes, pastRes] = await Promise.all([
    supabase.from("activities").select("id, kind, body, at, author:profiles(display_name)").eq("lead_id", id).order("at", { ascending: false }).limit(200),
    supabase.from("messages").select("id, direction, from_email, subject, preview, body_text, received_at, has_attachments").eq("contact_id", l.contact_id).order("received_at", { ascending: false }).limit(100),
    supabase.from("profiles").select("user_id, display_name, role").eq("is_active", true).order("display_name"),
    adviser ? supabase.from("lead_fees").select("consult_fee, consult_paid_on, quoted_fee, fee_note").eq("lead_id", id).maybeSingle() : Promise.resolve({ data: null }),
    supabase.from("leads").select("id, title, stage, created_at").eq("contact_id", l.contact_id).neq("id", id).order("created_at", { ascending: false }),
  ]);

  const activities = (activityRes.data ?? []) as unknown as Activity[];
  const messages = (messagesRes.data ?? []) as Message[];
  const people = (peopleRes.data ?? []) as Person[];
  const advisers = people.filter((p) => p.role !== "staff");
  const fees = feesRes.data as Fees | null;
  const past = pastRes.data ?? [];

  const name = leadName(l);
  const whatsapp = whatsappNumber(l.contact_phone);
  const office = l.office ? OFFICE_LABEL[l.office] : null;
  const closed = l.stage === "signed" || l.stage === "not_proceeding";
  const templates = messageTemplates({
    firstName: name.split(/[\s@]/)[0],
    sender: profile.display_name,
    consultWhen: l.consult_at ? formatDateTime(l.consult_at) : null,
    consultMode: l.consult_mode ? CONSULT_MODE_LABEL[l.consult_mode] : null,
    office: l.consult_mode === "in_person" ? office : null,
  });
  const adFacts = [
    ["Campaign", l.utm_campaign], ["Keyword", l.utm_term], ["Came from", [l.utm_source, l.utm_medium].filter(Boolean).join(" / ")],
    ["Landing page", l.landing_page], ["Google click", l.gclid], ["Meta click", l.fbclid],
  ].filter(([, v]) => v);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link href="/portal/enquiries" className="text-sm font-semibold text-accent-600 hover:underline">← Enquiries</Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-semibold">{name}</h1>
          <LeadStageChip stage={l.stage} />
          <span className="chip bg-surface-2 text-ink">{l.jurisdiction} · {pathwayLabel(l.pathway)}</span>
          <SourceChip source={l.source} />
          {l.contact_client_id ? <span className="chip bg-ok-bg text-ok">Existing client</span> : null}
        </div>
        <p className="mt-1 text-sm text-muted">
          {l.contact_email ? <a href={`mailto:${l.contact_email}`} className="underline-offset-4 hover:underline">{l.contact_email}</a> : "No email"}
          {l.contact_phone ? <> · <a href={`tel:${l.contact_phone.replace(/[^\d+]/g, "")}`} className="underline-offset-4 hover:underline">{l.contact_phone}</a></> : null}
          {" · "}Enquired {short(l.created_at.slice(0, 10))}
        </p>
        {l.visa_expiry_on && !closed ? <p className="mt-2"><DueChip on={l.visa_expiry_on} prefix="Visa expires " /></p> : null}
      </div>

      {l.case_id ? (
        <p className="rounded-xl border border-ok/30 bg-ok-bg px-4 py-3 text-sm text-ok">
          Signed{l.agreement_signed_on ? ` ${short(l.agreement_signed_on)}` : ""}. The work is now on case{" "}
          <Link href={`/portal/cases/${l.case_id}`} className="font-semibold underline">{l.case_no}</Link>.
        </p>
      ) : null}
      {l.stage === "not_proceeding" ? (
        <p className="rounded-xl border border-line bg-surface-2 px-4 py-3 text-sm text-muted">Not proceeding{l.lost_reason ? `: ${l.lost_reason}` : ""}. Choose a stage below to reopen.</p>
      ) : null}

      <StageBar id={l.id} stage={l.stage} />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex min-w-0 flex-col gap-6">
          {closed ? null : <MessageComposer templates={templates} email={l.contact_email} whatsapp={whatsapp} />}

          <section aria-labelledby="notes-heading" className="rounded-xl border border-line bg-surface p-5">
            <h2 id="notes-heading" className="text-xl font-semibold">Notes and calls</h2>
            <ActionForm action={addActivity} submitLabel="Add" pendingLabel="Adding…" quiet className="mt-3 flex flex-col gap-2">
              <input type="hidden" name="id" value={l.id} />
              <label htmlFor="note-body" className="sr-only">What happened?</label>
              <textarea id="note-body" name="body" rows={2} maxLength={5000} required placeholder="What happened? e.g. Called, will send passport copy on Friday" className="field" />
              <fieldset className="flex flex-wrap gap-4 text-sm">
                <legend className="sr-only">Type of note</legend>
                {[["note", "Note"], ["call", "Call"], ["whatsapp", "WhatsApp"]].map(([value, label], i) => (
                  <label key={value} className="inline-flex items-center gap-1.5">
                    <input type="radio" name="kind" value={value} defaultChecked={i === 0} /> {label}
                  </label>
                ))}
              </fieldset>
            </ActionForm>
            <ul className="mt-4 flex flex-col gap-3">
              {activities.map((a) => {
                const quiet = a.kind === "stage" || a.kind === "system";
                return (
                  <li key={a.id} className="border-l-2 border-line pl-3">
                    <p className={`whitespace-pre-wrap text-sm ${quiet ? "text-muted" : "text-ink"}`}>
                      {KIND_LABEL[a.kind] ? <span className="font-semibold">{KIND_LABEL[a.kind]}: </span> : null}{a.body}
                    </p>
                    <p className="text-xs text-muted">{formatDateTime(a.at)}{a.author ? ` · ${a.author.display_name}` : ""}</p>
                  </li>
                );
              })}
            </ul>
          </section>

          <section aria-labelledby="emails-heading" className="rounded-xl border border-line bg-surface p-5">
            <h2 id="emails-heading" className="text-xl font-semibold">Emails <span className="text-base font-normal text-muted">({messages.length})</span></h2>
            {messages.length === 0 ? (
              <p className="mt-2 text-sm text-muted">No emails with this person yet.</p>
            ) : (
              <ul className="mt-2 divide-y divide-line">
                {messages.map((m) => (
                  <li key={m.id} className="py-2.5">
                    <details>
                      <summary className="cursor-pointer text-sm">
                        <span className={`chip mr-2 ${m.direction === "out" ? "bg-ink text-white" : "bg-surface-2 text-ink"}`}>{m.direction === "out" ? "Sent" : "Received"}</span>
                        <span className="font-semibold text-ink">{m.subject || "(no subject)"}</span>
                        <span className="ml-2 text-xs text-muted">{formatDateTime(m.received_at)}{m.has_attachments ? " · attachment" : ""}</span>
                      </summary>
                      <p className="mt-2 whitespace-pre-wrap text-sm text-text">{m.body_text || m.preview}</p>
                    </details>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          {adviser && !l.case_id && l.stage !== "not_proceeding" ? (
            <Panel title="Sign up this client" hint="Opens an active case with the pathway's document checklist. Only once the written agreement is signed.">
              {!l.conflict_checked_on || !l.care_info_given_on ? (
                <p className="mb-3 rounded-lg bg-warn-bg px-3 py-2 text-sm text-warn">
                  Still to record below: {[!l.conflict_checked_on && "conflict check", !l.care_info_given_on && "client care information"].filter(Boolean).join(" and ")}.
                </p>
              ) : null}
              <ActionForm action={signUpClient} submitLabel="Sign up and open case" pendingLabel="Opening…" className="flex flex-col gap-3">
                <input type="hidden" name="id" value={l.id} />
                <div>
                  <label htmlFor="su-title" className="field-label">Case title</label>
                  <input id="su-title" name="title" required maxLength={120} defaultValue={`${pathwayByKey(l.pathway)?.name ?? "Visa"}: ${name}`} className="field" />
                </div>
                <div>
                  <label htmlFor="su-adviser" className="field-label">Responsible adviser</label>
                  <select id="su-adviser" name="adviser_id" required defaultValue={l.adviser_id ?? (adviser ? profile.user_id : "")} className="field">
                    <option value="">Choose</option>
                    {advisers.map((a) => <option key={a.user_id} value={a.user_id}>{a.display_name}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="su-date" className="field-label">Agreement signed</label>
                    <input id="su-date" name="signed_on" type="date" required defaultValue={todayNZ()} className="field" />
                  </div>
                  <div>
                    <label htmlFor="su-fee" className="field-label">Agreed fee</label>
                    <input id="su-fee" name="agreed_fee" type="number" min="0" step="0.01" inputMode="decimal" defaultValue={fees?.quoted_fee ?? ""} className="field" />
                  </div>
                </div>
              </ActionForm>
            </Panel>
          ) : null}

          <Panel title="About them">
            <ActionForm action={savePerson} submitLabel="Save" quiet className="flex flex-col gap-3">
              <input type="hidden" name="id" value={l.id} />
              <input type="hidden" name="contact_id" value={l.contact_id} />
              <div>
                <label htmlFor="p-name" className="field-label">Name</label>
                <input id="p-name" name="name" maxLength={120} defaultValue={l.contact_name ?? ""} className="field" />
              </div>
              <div>
                <label htmlFor="p-phone" className="field-label">Phone or WhatsApp</label>
                <input id="p-phone" name="phone" type="tel" maxLength={40} defaultValue={l.contact_phone ?? ""} className="field" />
              </div>
              <div>
                <label htmlFor="p-email" className="field-label">Email</label>
                <input id="p-email" name="email" type="email" maxLength={200} defaultValue={l.contact_email ?? ""} className="field" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="p-nat" className="field-label">Nationality</label>
                  <input id="p-nat" name="nationality" maxLength={80} defaultValue={l.contact_nationality ?? ""} className="field" />
                </div>
                <div>
                  <label htmlFor="p-country" className="field-label">Living in</label>
                  <input id="p-country" name="country" maxLength={80} defaultValue={l.contact_country ?? ""} className="field" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="p-lang" className="field-label">Language</label>
                  <input id="p-lang" name="language" maxLength={80} defaultValue={l.contact_language ?? ""} className="field" />
                </div>
                <div>
                  <label htmlFor="p-loc" className="field-label">Onshore?</label>
                  <select id="p-loc" name="location" defaultValue={l.location ?? ""} className="field">
                    <option value="">Not known</option>
                    <option value="onshore">Onshore</option>
                    <option value="offshore">Offshore</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="p-visa" className="field-label">Current visa</label>
                  <input id="p-visa" name="current_visa" maxLength={120} defaultValue={l.current_visa ?? ""} className="field" />
                </div>
                <div>
                  <label htmlFor="p-exp" className="field-label">Visa expires</label>
                  <input id="p-exp" name="visa_expiry_on" type="date" defaultValue={l.visa_expiry_on ?? ""} className="field" />
                </div>
              </div>
            </ActionForm>
          </Panel>

          <Panel title="Follow-up and details">
            <ActionForm action={saveDetails} submitLabel="Save" quiet className="flex flex-col gap-3">
              <input type="hidden" name="id" value={l.id} />
              <div>
                <label htmlFor="d-action" className="field-label">Next step</label>
                <input id="d-action" name="next_action" maxLength={300} defaultValue={l.next_action ?? ""} placeholder="e.g. Call to book consultation" className="field" />
              </div>
              <div>
                <label htmlFor="d-on" className="field-label">By when</label>
                <input id="d-on" name="next_action_on" type="date" defaultValue={l.next_action_on ?? ""} className="field" />
              </div>
              <div>
                <label htmlFor="d-owner" className="field-label">Looked after by</label>
                <select id="d-owner" name="owner_id" defaultValue={l.owner_id ?? ""} className="field">
                  <option value="">Unassigned</option>
                  {people.map((p) => <option key={p.user_id} value={p.user_id}>{p.display_name}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="d-path" className="field-label">Visa pathway</label>
                <select id="d-path" name="pathway" defaultValue={l.pathway} className="field">
                  {PATHWAYS.map((p) => <option key={p.key} value={p.key}>{p.jurisdiction} · {p.name}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="d-title" className="field-label">Title</label>
                <input id="d-title" name="title" maxLength={200} defaultValue={l.title} className="field" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="d-src" className="field-label">Source</label>
                  <select id="d-src" name="source" defaultValue={l.source} className="field">
                    {Object.entries(SOURCE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="d-ref" className="field-label">Referred by</label>
                  <input id="d-ref" name="referred_by" maxLength={200} defaultValue={l.referred_by ?? ""} className="field" />
                </div>
              </div>
            </ActionForm>
          </Panel>

          <Panel title="Consultation">
            <ActionForm action={saveConsultation} submitLabel="Save" quiet className="flex flex-col gap-3">
              <input type="hidden" name="id" value={l.id} />
              <div>
                <label htmlFor="c-at" className="field-label">Date and time (NZ time)</label>
                <input id="c-at" name="consult_at" type="datetime-local" defaultValue={l.consult_at ? isoToNzLocal(l.consult_at).slice(0, 16) : ""} className="field" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="c-mode" className="field-label">How</label>
                  <select id="c-mode" name="consult_mode" defaultValue={l.consult_mode ?? ""} className="field">
                    <option value="">Not set</option>
                    {Object.entries(CONSULT_MODE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="c-office" className="field-label">Office</label>
                  <select id="c-office" name="office" defaultValue={l.office ?? ""} className="field">
                    <option value="">Not set</option>
                    {Object.entries(OFFICE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label htmlFor="c-adv" className="field-label">Adviser</label>
                <select id="c-adv" name="adviser_id" defaultValue={l.adviser_id ?? ""} className="field">
                  <option value="">Not set</option>
                  {advisers.map((a) => <option key={a.user_id} value={a.user_id}>{a.display_name}</option>)}
                </select>
              </div>
            </ActionForm>
          </Panel>

          <Panel title="Adviser assessment" hint={adviser ? "Your notes from the consultation." : "Written by a licensed adviser. Please don't pass this on as advice."}>
            {adviser ? (
              <ActionForm action={saveAssessment} submitLabel="Save" quiet className="flex flex-col gap-3">
                <input type="hidden" name="id" value={l.id} />
                <div>
                  <label htmlFor="a-elig" className="field-label">Eligibility</label>
                  <select id="a-elig" name="eligibility" defaultValue={l.eligibility} className="field">
                    {Object.entries(ELIGIBILITY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="a-notes" className="field-label">Notes</label>
                  <textarea id="a-notes" name="assessment" rows={4} maxLength={10000} defaultValue={l.assessment} className="field" />
                </div>
              </ActionForm>
            ) : (
              <>
                <p className="text-sm font-semibold text-ink">{ELIGIBILITY_LABEL[l.eligibility]}</p>
                {l.assessment ? <p className="mt-1 whitespace-pre-wrap text-sm text-text">{l.assessment}</p> : null}
              </>
            )}
          </Panel>

          {adviser ? (
            <Panel title="Fees" hint="Not visible to staff. Amounts exclude GST.">
              <ActionForm action={saveLeadFees} submitLabel="Save" quiet className="flex flex-col gap-3">
                <input type="hidden" name="id" value={l.id} />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="f-cf" className="field-label">Consultation fee</label>
                    <input id="f-cf" name="consult_fee" type="number" min="0" step="0.01" inputMode="decimal" defaultValue={fees?.consult_fee ?? ""} className="field" />
                  </div>
                  <div>
                    <label htmlFor="f-paid" className="field-label">Paid on</label>
                    <input id="f-paid" name="consult_paid_on" type="date" defaultValue={fees?.consult_paid_on ?? ""} className="field" />
                  </div>
                </div>
                <div>
                  <label htmlFor="f-quote" className="field-label">Quoted fee for the application</label>
                  <input id="f-quote" name="quoted_fee" type="number" min="0" step="0.01" inputMode="decimal" defaultValue={fees?.quoted_fee ?? ""} className="field" />
                </div>
                <div>
                  <label htmlFor="f-note" className="field-label">Fee note (internal)</label>
                  <input id="f-note" name="fee_note" maxLength={500} defaultValue={fees?.fee_note ?? ""} className="field" />
                </div>
              </ActionForm>
            </Panel>
          ) : null}

          <Panel title="Before we act" hint="Record each step as it's done.">
            <ActionForm action={saveAgreement} submitLabel="Save" quiet className="flex flex-col gap-3">
              <input type="hidden" name="id" value={l.id} />
              <div>
                <label htmlFor="b-conflict" className="field-label">Conflict of interest checked</label>
                <input id="b-conflict" name="conflict_checked_on" type="date" defaultValue={l.conflict_checked_on ?? ""} className="field" />
              </div>
              <div>
                <label htmlFor="b-care" className="field-label">Client care &amp; complaints info given</label>
                <input id="b-care" name="care_info_given_on" type="date" defaultValue={l.care_info_given_on ?? ""} className="field" />
              </div>
              <div>
                <label htmlFor="b-sent" className="field-label">Written agreement sent</label>
                <input id="b-sent" name="agreement_sent_on" type="date" defaultValue={l.agreement_sent_on ?? ""} className="field" />
              </div>
              {l.agreement_signed_on ? <p className="text-sm text-muted">Agreement signed {short(l.agreement_signed_on)}.</p> : null}
            </ActionForm>
          </Panel>

          {past.length ? (
            <Panel title="Earlier enquiries">
              <ul className="flex flex-col gap-1.5 text-sm">
                {past.map((p) => (
                  <li key={p.id}><Link href={`/portal/enquiries/${p.id}`} className="text-accent-600 hover:underline">{p.title}</Link> <span className="text-muted">· {short(p.created_at.slice(0, 10))}</span></li>
                ))}
              </ul>
            </Panel>
          ) : null}

          {adFacts.length ? (
            <Panel title="Where they came from">
              <dl className="flex flex-col gap-1 text-sm">
                {adFacts.map(([label, value]) => (
                  <div key={label} className="flex gap-2"><dt className="shrink-0 text-muted">{label}</dt><dd className="min-w-0 break-words text-ink">{value}</dd></div>
                ))}
              </dl>
            </Panel>
          ) : null}
        </div>
      </div>
    </div>
  );
}
