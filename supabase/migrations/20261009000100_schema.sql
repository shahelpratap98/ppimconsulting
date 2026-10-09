-- PPIM Consulting staff portal: core schema.
-- Adapted from the Stable Structure timesheet portal for an immigration
-- practice: projects become client cases, hourly charge-out becomes a fixed
-- fee per case paid in stages, and each case carries a document checklist
-- (the "case assistant").
-- Money columns live in their own tables so row-level security can hide
-- fees and invoices from the staff role.

create schema if not exists app;

create type public.app_role       as enum ('staff', 'adviser', 'admin');
create type public.entry_status   as enum ('draft', 'submitted', 'returned', 'approved');
create type public.invoice_status as enum ('issued', 'paid', 'void');
create type public.case_status    as enum ('enquiry', 'active', 'lodged', 'decided', 'closed');
create type public.case_outcome   as enum ('approved', 'declined', 'withdrawn');
create type public.doc_status     as enum ('missing', 'received', 'flagged');

create table public.settings (
  id                  boolean primary key default true check (id),
  company_name        text    not null default 'Priya Pratap Immigration Consulting',
  trading_name        text    not null default 'PPIM Consulting',
  gst_number          text,
  address             text    not null default '155 Smales Road, East Tāmaki, Auckland, New Zealand',
  contact_line        text    not null default '+64 21 120 8592 · info@ppimconsulting.co.nz',
  bank_details        text,
  -- set to 0 if the practice is not GST registered
  gst_rate            numeric(5,4) not null default 0.15 check (gst_rate >= 0 and gst_rate < 1),
  standard_day_hours  numeric(4,2) not null default 8 check (standard_day_hours > 0 and standard_day_hours <= 24),
  invoice_prefix      text    not null default 'INV-',
  next_invoice_no     integer not null default 1 check (next_invoice_no > 0),
  payment_terms_days  integer not null default 7 check (payment_terms_days >= 0),
  case_prefix         text    not null default 'CASE-',
  next_case_no        integer not null default 1 check (next_case_no > 0),
  updated_at          timestamptz not null default now()
);

-- One row per auth user; deactivate, never delete.
create table public.profiles (
  user_id             uuid primary key references auth.users (id) on delete restrict,
  display_name        text not null check (length(btrim(display_name)) > 0),
  email               text not null,
  role                public.app_role not null default 'staff',
  standard_day_hours  numeric(4,2) check (standard_day_hours > 0 and standard_day_hours <= 24),
  is_active           boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- The people the practice acts for.
create table public.clients (
  id           uuid primary key default gen_random_uuid(),
  full_name    text not null check (length(btrim(full_name)) > 0),
  email        text,
  phone        text,
  country      text,
  notes        text not null default '',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- A client's visa matter. Internal cases (no client) hold office time such as
-- admin and training.
create table public.cases (
  id            uuid primary key default gen_random_uuid(),
  case_no       text not null unique check (length(btrim(case_no)) > 0),
  client_id     uuid references public.clients (id) on delete restrict,
  title         text not null check (length(btrim(title)) > 0),
  pathway       text not null default 'other',
  jurisdiction  text not null default 'NZ' check (jurisdiction in ('NZ', 'AU')),
  status        public.case_status not null default 'enquiry',
  adviser_id    uuid references public.profiles (user_id) on delete restrict,
  opened_on     date not null default current_date,
  lodged_on     date,
  decided_on    date,
  outcome       public.case_outcome,
  notes         text not null default '',
  is_internal   boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint client_unless_internal check (is_internal or client_id is not null)
);
create index cases_client_idx on public.cases (client_id);
create index cases_status_idx on public.cases (status);

-- The fee agreed in the written client agreement.
create table public.case_fees (
  case_id     uuid primary key references public.cases (id) on delete cascade,
  agreed_fee  numeric(12,2) check (agreed_fee >= 0),
  fee_note    text not null default '',
  updated_at  timestamptz not null default now()
);

-- Declared before fee_stages and invoice_lines for the FKs.
create table public.invoices (
  id           uuid primary key default gen_random_uuid(),
  invoice_no   text not null unique,
  case_id      uuid not null references public.cases (id) on delete restrict,
  client_id    uuid references public.clients (id) on delete restrict,
  issued_on    date not null default current_date,
  due_on       date not null,
  subtotal     numeric(12,2) not null default 0,
  gst_rate     numeric(5,4)  not null,
  gst          numeric(12,2) not null default 0,
  total        numeric(12,2) not null default 0,
  status       public.invoice_status not null default 'issued',
  paid_on      date,
  notes        text not null default '',
  created_by   uuid references public.profiles (user_id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint paid_has_date check ((status = 'paid') = (paid_on is not null))
);

-- Payment stages of the agreed fee, e.g. deposit / on lodgement / on decision.
-- invoice_id is set when the stage is billed.
create table public.fee_stages (
  id          uuid primary key default gen_random_uuid(),
  case_id     uuid not null references public.cases (id) on delete cascade,
  label       text not null check (length(btrim(label)) > 0),
  amount      numeric(12,2) not null check (amount >= 0),
  sort_order  integer not null default 0,
  invoice_id  uuid references public.invoices (id) on delete restrict,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index fee_stages_case_idx on public.fee_stages (case_id);

create table public.invoice_lines (
  id            uuid primary key default gen_random_uuid(),
  invoice_id    uuid not null references public.invoices (id) on delete cascade,
  fee_stage_id  uuid references public.fee_stages (id) on delete set null,
  description   text not null check (length(btrim(description)) > 0),
  amount        numeric(12,2) not null,
  sort_order    integer not null default 0
);
create index invoice_lines_invoice_idx on public.invoice_lines (invoice_id);

-- The case assistant: the document checklist for a case.
create table public.checklist_items (
  id          uuid primary key default gen_random_uuid(),
  case_id     uuid not null references public.cases (id) on delete cascade,
  label       text not null check (length(btrim(label)) > 0),
  status      public.doc_status not null default 'missing',
  note        text not null default '',
  sort_order  integer not null default 0,
  updated_by  uuid references public.profiles (user_id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index checklist_items_case_idx on public.checklist_items (case_id, sort_order);

create table public.work_types (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique check (length(btrim(name)) > 0),
  sort_order  integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- Drafts may be incomplete; anything past draft must be a complete entry.
create table public.time_entries (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles (user_id) on delete restrict,
  entry_date    date not null,
  case_id       uuid references public.cases (id) on delete restrict,
  work_type_id  uuid references public.work_types (id) on delete restrict,
  hours         numeric(5,2) check (hours >= 0 and hours <= 24),
  description   text not null default '',
  status        public.entry_status not null default 'draft',
  approved_by   uuid references public.profiles (user_id),
  approved_at   timestamptz,
  return_note   text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint complete_once_submitted check (
    status = 'draft'
    or (case_id is not null and work_type_id is not null
        and hours > 0 and length(btrim(description)) > 0)
  ),
  constraint approved_has_approver check (status <> 'approved' or approved_by is not null)
);
create index time_entries_user_date_idx on public.time_entries (user_id, entry_date);
create index time_entries_case_date_idx on public.time_entries (case_id, entry_date);
create index time_entries_status_idx    on public.time_entries (status);

-- Region NZ = office holidays used by the Hours Check; FJ is listed for the
-- Fiji offices' team calendar.
create table public.public_holidays (
  day         date not null,
  region      text not null default 'NZ' check (region in ('NZ', 'FJ')),
  name        text not null check (length(btrim(name)) > 0),
  created_at  timestamptz not null default now(),
  primary key (day, region)
);

create table public.audit_log (
  id          bigint generated always as identity primary key,
  actor_id    uuid,
  table_name  text not null,
  row_id      text not null,
  action      text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  before      jsonb,
  after       jsonb,
  at          timestamptz not null default now()
);
create index audit_log_row_idx on public.audit_log (table_name, row_id);
create index audit_log_at_idx  on public.audit_log (at desc);
