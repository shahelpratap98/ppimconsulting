// The enquiry pipeline: everything from first contact to a signed client.
// The database holds the rules (supabase/migrations/20261101000900_crm.sql);
// this file holds the words.

export type LeadStage = "new" | "contacted" | "consult_booked" | "consulted" | "agreement_sent" | "signed" | "not_proceeding";

export const OPEN_STAGES: LeadStage[] = ["new", "contacted", "consult_booked", "consulted", "agreement_sent"];

export const STAGE_LABEL: Record<LeadStage, string> = {
  new: "New",
  contacted: "Contacted",
  consult_booked: "Consultation booked",
  consulted: "Consulted",
  agreement_sent: "Agreement sent",
  signed: "Signed",
  not_proceeding: "Not proceeding",
};

export const STAGE_STYLE: Record<LeadStage, string> = {
  new: "bg-accent-100 text-accent-600",
  contacted: "bg-steel-100 text-steel",
  consult_booked: "bg-steel-100 text-steel",
  consulted: "bg-warn-bg text-warn",
  agreement_sent: "bg-warn-bg text-warn",
  signed: "bg-ok-bg text-ok",
  not_proceeding: "bg-surface-2 text-muted",
};

export const SOURCE_LABEL = {
  website_form: "Website form",
  google_ads: "Google Ads",
  meta: "Facebook / Instagram",
  whatsapp: "WhatsApp",
  phone: "Phone",
  email: "Email",
  walk_in: "Walk-in",
  referral: "Referral",
  past_client: "Past client",
  other: "Other",
} as const;
export type LeadSource = keyof typeof SOURCE_LABEL;

export const OFFICE_LABEL = {
  east_tamaki: "East Tāmaki",
  nadi: "Nadi",
  suva: "Suva",
  remote: "Remote",
} as const;
export type Office = keyof typeof OFFICE_LABEL;

export const CONSULT_MODE_LABEL = {
  in_person: "In person",
  phone: "Phone",
  video: "Video call",
  whatsapp: "WhatsApp call",
} as const;
export type ConsultMode = keyof typeof CONSULT_MODE_LABEL;

export const ELIGIBILITY_LABEL = {
  not_assessed: "Not assessed",
  likely: "Likely eligible",
  uncertain: "Uncertain",
  unlikely: "Unlikely",
} as const;
export type Eligibility = keyof typeof ELIGIBILITY_LABEL;

export const LOST_REASONS = [
  "Not eligible",
  "Fee too high",
  "Chose another adviser",
  "Applying themselves",
  "Not ready yet",
  "No response",
  "Referred elsewhere",
  "Other",
];

export const DEADLINE_LABEL = {
  visa_expiry: "Visa expires",
  response_due: "Response due (PPI / RFI)",
  medical_expiry: "Medical expires",
  police_expiry: "Police certificate expires",
  passport_expiry: "Passport expires",
  lodgement: "Lodgement target",
  other: "Other",
} as const;
export type DeadlineKind = keyof typeof DEADLINE_LABEL;

// A row of v_leads.
export type LeadView = {
  id: string;
  contact_id: string;
  title: string;
  pathway: string;
  jurisdiction: "NZ" | "AU";
  source: LeadSource;
  referred_by: string | null;
  stage: LeadStage;
  office: Office | null;
  owner_id: string | null;
  owner: string | null;
  adviser_id: string | null;
  adviser: string | null;
  location: "onshore" | "offshore" | null;
  current_visa: string | null;
  visa_expiry_on: string | null;
  next_action: string | null;
  next_action_on: string | null;
  consult_at: string | null;
  consult_mode: ConsultMode | null;
  consulted_on: string | null;
  eligibility: Eligibility;
  assessment: string;
  conflict_checked_on: string | null;
  care_info_given_on: string | null;
  agreement_sent_on: string | null;
  agreement_signed_on: string | null;
  case_id: string | null;
  case_no: string | null;
  lost_reason: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  gclid: string | null;
  fbclid: string | null;
  landing_page: string | null;
  created_at: string;
  contact_email: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_nationality: string | null;
  contact_country: string | null;
  contact_language: string | null;
  contact_client_id: string | null;
  message_count: number;
  last_message_at: string | null;
  last_message_direction: "in" | "out" | null;
};

export const leadName = (l: Pick<LeadView, "contact_name" | "contact_email" | "contact_phone">) =>
  l.contact_name || l.contact_email || l.contact_phone || "Unnamed";

// When a date needs someone's attention.
export function urgency(days: number): { label: string; className: string } {
  if (days < 0) return { label: `${-days} day${days === -1 ? "" : "s"} overdue`, className: "bg-bad-bg text-bad" };
  if (days === 0) return { label: "Today", className: "bg-bad-bg text-bad" };
  if (days <= 7) return { label: `${days} day${days === 1 ? "" : "s"}`, className: "bg-bad-bg text-bad" };
  if (days <= 30) return { label: `${days} days`, className: "bg-warn-bg text-warn" };
  return { label: `${days} days`, className: "bg-surface-2 text-muted" };
}

// wa.me needs the full international number with no plus or spaces. Local
// numbers: NZ starts with 0; Fiji is seven digits with no prefix.
export function whatsappNumber(phone: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (phone.trim().startsWith("+")) return digits;
  if (digits.startsWith("0")) return "64" + digits.slice(1);
  if (digits.length === 7) return "679" + digits;
  return digits || null;
}

// Starting points for the messages sent most often. These stay administrative
// on purpose: anything about eligibility must come from a licensed adviser.
export function messageTemplates(t: { firstName: string; sender: string; consultWhen: string | null; consultMode: string | null; office: string | null }) {
  const hi = `Hello ${t.firstName},`;
  const bye = `Kind regards,\n${t.sender}\nPPIM Consulting\n+64 21 120 8592`;
  return [
    {
      key: "first-reply",
      label: "First reply",
      subject: "Your enquiry to PPIM Consulting",
      body: `${hi}\n\nThank you for contacting PPIM Consulting. We have your enquiry and would like to learn a little more so the right adviser can help.\n\nWhen is a good time to talk? Please also let us know which country you are in now and, if you hold a visa, when it expires.\n\n${bye}`,
    },
    {
      key: "book-consult",
      label: "Offer a consultation",
      subject: "Booking your consultation",
      body: `${hi}\n\nOur licensed adviser can go through your situation and your options in a consultation. We can meet in person at our office, or by phone, video or WhatsApp.\n\nWhich days suit you best this week or next?\n\n${bye}`,
    },
    {
      key: "confirm-consult",
      label: "Confirm consultation",
      subject: "Your consultation is booked",
      body: `${hi}\n\nYour consultation is booked for ${t.consultWhen ?? "[date and time]"}${t.consultMode ? ` (${t.consultMode.toLowerCase()})` : ""}${t.office ? `, ${t.office} office` : ""}.\n\nPlease have these ready:\n• Passport\n• Your current visa, if you have one\n• Any letters from Immigration New Zealand or Home Affairs\n\nIf you need to change the time, just let us know.\n\n${bye}`,
    },
    {
      key: "nudge",
      label: "Follow up",
      subject: "Following up on your enquiry",
      body: `${hi}\n\nWe have not heard back from you and wanted to check whether you would still like our help. If so, reply here or call us and we will pick up where we left off.\n\n${bye}`,
    },
    {
      key: "agreement",
      label: "Agreement reminder",
      subject: "Your written agreement",
      body: `${hi}\n\nWe are ready to start once we have your signed agreement. Please read it carefully, and tell us if you have any questions before signing.\n\n${bye}`,
    },
  ];
}
