export type Role = "staff" | "adviser" | "admin";
export type EntryStatus = "draft" | "submitted" | "returned" | "approved";
export type CaseStatus = "enquiry" | "active" | "lodged" | "decided" | "closed";
export type CaseOutcome = "approved" | "declined" | "withdrawn";
export type DocStatus = "missing" | "received" | "flagged";
export type InvoiceStatus = "issued" | "paid" | "void";

export type Profile = {
  user_id: string;
  display_name: string;
  email: string;
  role: Role;
  standard_day_hours: number | null;
  is_active: boolean;
};

// A case as offered in the time-entry picker.
export type CaseOption = {
  id: string;
  case_no: string;
  title: string;
  client: string | null;
  is_internal: boolean;
};

export type WorkTypeOption = { id: string; name: string };

export type TimeEntry = {
  id: string;
  entry_date: string;
  case_id: string | null;
  work_type_id: string | null;
  hours: number | null;
  description: string;
  status: EntryStatus;
  return_note: string | null;
};

// A row in v_entries.
export type EntryView = {
  id: string;
  entry_date: string;
  user_id: string;
  employee: string;
  case_id: string | null;
  case_no: string | null;
  case_title: string | null;
  client: string | null;
  work_type: string | null;
  hours: number | null;
  description: string;
  status: EntryStatus;
};

// A row in v_cases.
export type CaseView = {
  id: string;
  case_no: string;
  client_id: string | null;
  client: string | null;
  client_email: string | null;
  title: string;
  pathway: string;
  jurisdiction: "NZ" | "AU";
  status: CaseStatus;
  adviser_id: string | null;
  adviser: string | null;
  opened_on: string;
  lodged_on: string | null;
  decided_on: string | null;
  outcome: CaseOutcome | null;
  notes: string;
  is_internal: boolean;
  checklist_total: number;
  checklist_received: number;
  checklist_flagged: number;
  hours_logged: number;
};

export type ChecklistItem = {
  id: string;
  label: string;
  status: DocStatus;
  note: string;
  sort_order: number;
  updated_at: string;
};
