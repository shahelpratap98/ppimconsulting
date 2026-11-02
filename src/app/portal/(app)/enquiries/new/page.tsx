import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm } from "@/components/portal/action-form";
import { requireProfile } from "@/lib/portal/auth";
import { OFFICE_LABEL, SOURCE_LABEL } from "@/lib/portal/crm";
import { PATHWAYS } from "@/lib/portal/pathways";
import { addEnquiry } from "../actions";

export const metadata: Metadata = { title: "Add an enquiry" };

// Sources a person can arrive by without the website filling them in.
const BY_HAND = ["phone", "whatsapp", "walk_in", "referral", "past_client", "email", "meta", "other"] as const;

export default async function NewEnquiryPage() {
  await requireProfile();
  const nz = PATHWAYS.filter((p) => p.jurisdiction === "NZ" && p.key !== "other");
  const au = PATHWAYS.filter((p) => p.jurisdiction === "AU");

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <Link href="/portal/enquiries" className="text-sm font-semibold text-accent-600 hover:underline">← Enquiries</Link>
        <h1 className="mt-2 text-3xl font-semibold">Add an enquiry</h1>
        <p className="mt-1 text-muted">For anyone who called, messaged on WhatsApp or came to an office. Website enquiries add themselves.</p>
      </div>

      <ActionForm action={addEnquiry} submitLabel="Add enquiry" pendingLabel="Adding…" className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-5">
        <div>
          <label htmlFor="name" className="field-label">Name</label>
          <input id="name" name="name" required maxLength={120} autoComplete="off" className="field" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="phone" className="field-label">Phone or WhatsApp</label>
            <input id="phone" name="phone" type="tel" maxLength={40} autoComplete="off" placeholder="+679 ..." className="field" />
          </div>
          <div>
            <label htmlFor="email" className="field-label">Email</label>
            <input id="email" name="email" type="email" maxLength={200} autoComplete="off" className="field" />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="pathway" className="field-label">Visa pathway</label>
            <select id="pathway" name="pathway" defaultValue="other" className="field">
              <option value="other">Not sure yet</option>
              <optgroup label="New Zealand">{nz.map((p) => <option key={p.key} value={p.key}>{p.name}</option>)}</optgroup>
              <optgroup label="Australia">{au.map((p) => <option key={p.key} value={p.key}>{p.name}</option>)}</optgroup>
            </select>
          </div>
          <div>
            <label htmlFor="source" className="field-label">How they found us</label>
            <select id="source" name="source" defaultValue="phone" className="field">
              {BY_HAND.map((s) => <option key={s} value={s}>{SOURCE_LABEL[s]}</option>)}
            </select>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="office" className="field-label">Office</label>
            <select id="office" name="office" defaultValue="" className="field">
              <option value="">Not set</option>
              {Object.entries(OFFICE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="referred_by" className="field-label">Referred by (if any)</label>
            <input id="referred_by" name="referred_by" maxLength={200} className="field" />
          </div>
        </div>
        <div>
          <label htmlFor="note" className="field-label">What they asked about</label>
          <textarea id="note" name="note" rows={4} maxLength={5000} className="field" />
        </div>
      </ActionForm>
    </div>
  );
}
