-- PPIM CRM: every enquiry, from first contact to a signed client.
--
-- Adapted from the BedRock CRM for an immigration practice. An enquiry moves
-- through consultation and the written agreement; signing it opens a case with
-- the pathway's document checklist. Website enquiries and (once the Microsoft
-- side is set up) mail to info@ fill it automatically.
--
-- Who can do what:
--   staff    work enquiries: contact people, book consultations, add notes.
--   adviser  also sees fees, records the eligibility assessment and signs up
--            the client. Staff doing clerical work must not give immigration
--            advice, so those fields are closed to them in the database.
-- Money lives in lead_fees, its own table, as it does for cases.

-- The keepalive route reads settings with the service role, which was never
-- granted that table ("auto-expose" is off), so it failed every day and the
-- free project was paused for inactivity.
grant usage on schema public to service_role;
grant select on public.settings to service_role;

create type public.lead_stage as enum (
  'new', 'contacted', 'consult_booked', 'consulted', 'agreement_sent', 'signed', 'not_proceeding'
);

-- ---------------------------------------------------------------------------
-- People, enquiries, mail, notes
-- ---------------------------------------------------------------------------

-- Anyone who has been in touch. Becomes a client (client_id) when signed.
create table public.contacts (
  id                uuid primary key default gen_random_uuid(),
  -- many enquiries arrive by WhatsApp or phone, so email is optional
  email             text unique check (email = lower(btrim(email)) and email like '%@%'),
  name              text,
  phone             text,
  nationality       text,
  country           text,
  language          text,
  client_id         uuid references public.clients (id) on delete set null,
  -- triage: emailed us, not an enquiry yet. active: has or had an enquiry, or
  -- is already a client. ignored: never create anything for this sender again.
  status            text not null default 'triage' check (status in ('triage', 'active', 'ignored')),
  first_seen_at     timestamptz not null default now(),
  last_inbound_at   timestamptz,
  last_outbound_at  timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint contact_reachable check (email is not null or phone is not null)
);
create index contacts_client_idx on public.contacts (client_id);

create table public.leads (
  id                   uuid primary key default gen_random_uuid(),
  contact_id           uuid not null references public.contacts (id) on delete restrict,
  title                text not null check (length(btrim(title)) > 0),
  pathway              text not null default 'other',
  jurisdiction         text not null default 'NZ' check (jurisdiction in ('NZ', 'AU')),
  source               text not null default 'website_form' check (source in
    ('website_form', 'google_ads', 'meta', 'whatsapp', 'phone', 'email', 'walk_in', 'referral', 'past_client', 'other')),
  referred_by          text,
  stage                public.lead_stage not null default 'new',
  office               text check (office in ('east_tamaki', 'nadi', 'suva', 'remote')),
  owner_id             uuid references public.profiles (user_id) on delete restrict,
  adviser_id           uuid references public.profiles (user_id) on delete restrict,
  -- where they stand today
  location             text check (location in ('onshore', 'offshore')),
  current_visa         text,
  visa_expiry_on       date,
  -- what happens next
  next_action          text,
  next_action_on       date,
  -- the consultation
  consult_at           timestamptz,
  consult_mode         text check (consult_mode in ('in_person', 'phone', 'video', 'whatsapp')),
  consulted_on         date,
  -- adviser only (see the guard trigger)
  eligibility          text not null default 'not_assessed'
                       check (eligibility in ('not_assessed', 'likely', 'uncertain', 'unlikely')),
  assessment           text not null default '',
  -- before the practice acts for someone
  conflict_checked_on  date,
  care_info_given_on   date,
  agreement_sent_on    date,
  agreement_signed_on  date,
  -- the outcome
  case_id              uuid references public.cases (id) on delete set null,
  lost_reason          text,
  first_contacted_at   timestamptz,
  closed_at            timestamptz,
  -- ad and page the enquiry came from, as recorded by the website form
  utm_source           text,
  utm_medium           text,
  utm_campaign         text,
  utm_term             text,
  gclid                text,
  fbclid               text,
  landing_page         text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index leads_contact_idx on public.leads (contact_id);
create index leads_stage_idx   on public.leads (stage);
create index leads_case_idx    on public.leads (case_id);

create table public.lead_fees (
  lead_id          uuid primary key references public.leads (id) on delete cascade,
  consult_fee      numeric(12,2) check (consult_fee >= 0),
  consult_paid_on  date,
  quoted_fee       numeric(12,2) check (quoted_fee >= 0),
  fee_note         text not null default '',
  updated_at       timestamptz not null default now()
);

create table public.messages (
  id                   uuid primary key default gen_random_uuid(),
  graph_id             text not null unique,
  internet_message_id  text,
  conversation_id      text,
  contact_id           uuid references public.contacts (id) on delete cascade,
  lead_id              uuid references public.leads (id) on delete set null,
  direction            text not null check (direction in ('in', 'out')),
  from_email           text,
  from_name            text,
  to_emails            text[] not null default '{}',
  subject              text not null default '',
  preview              text not null default '',
  body_text            text not null default '',
  received_at          timestamptz not null,
  has_attachments      boolean not null default false,
  created_at           timestamptz not null default now()
);
create index messages_contact_idx on public.messages (contact_id, received_at desc);
create index messages_lead_idx    on public.messages (lead_id);

create table public.activities (
  id          uuid primary key default gen_random_uuid(),
  lead_id     uuid not null references public.leads (id) on delete cascade,
  kind        text not null check (kind in ('note', 'call', 'whatsapp', 'stage', 'enquiry', 'system')),
  body        text not null check (length(btrim(body)) > 0),
  created_by  uuid references public.profiles (user_id) on delete set null,
  at          timestamptz not null default now()
);
create index activities_lead_idx on public.activities (lead_id, at desc);

-- Dates that can sink a case if they are missed.
create table public.deadlines (
  id          uuid primary key default gen_random_uuid(),
  case_id     uuid not null references public.cases (id) on delete cascade,
  kind        text not null default 'other' check (kind in
    ('visa_expiry', 'response_due', 'medical_expiry', 'police_expiry', 'passport_expiry', 'lodgement', 'other')),
  due_on      date not null,
  note        text not null default '',
  done_on     date,
  created_by  uuid references public.profiles (user_id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index deadlines_case_idx on public.deadlines (case_id);
create index deadlines_due_idx  on public.deadlines (due_on) where done_on is null;

-- One row: where the mailbox sync is up to.
create table public.mail_sync (
  id                    boolean primary key default true check (id),
  mailbox               text,
  inbox_delta           text,
  sent_delta            text,
  subscription_id       text,
  subscription_expires  timestamptz,
  last_run_at           timestamptz,
  last_ok_at            timestamptz,
  last_error            text,
  messages_seen         integer not null default 0
);
insert into public.mail_sync (id) values (true);

-- ---------------------------------------------------------------------------
-- Bookkeeping triggers
-- ---------------------------------------------------------------------------

create trigger touch before update on public.contacts  for each row execute function app.touch_updated_at();
create trigger touch before update on public.leads     for each row execute function app.touch_updated_at();
create trigger touch before update on public.lead_fees for each row execute function app.touch_updated_at();
create trigger touch before update on public.deadlines for each row execute function app.touch_updated_at();

create trigger audit after insert or update or delete on public.contacts  for each row execute function app.audit('id');
create trigger audit after insert or update or delete on public.leads     for each row execute function app.audit('id');
create trigger audit after insert or update or delete on public.lead_fees for each row execute function app.audit('lead_id');
create trigger audit after insert or update or delete on public.deadlines for each row execute function app.audit('id');

create or replace function app.lead_stage_label(s public.lead_stage)
returns text language sql immutable set search_path = ''
as $$
  select case s
    when 'new' then 'New'
    when 'contacted' then 'Contacted'
    when 'consult_booked' then 'Consultation booked'
    when 'consulted' then 'Consulted'
    when 'agreement_sent' then 'Agreement sent'
    when 'signed' then 'Signed'
    when 'not_proceeding' then 'Not proceeding'
  end
$$;

-- Rules that hold however a row is changed.
create or replace function app.lead_guard()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if new.stage = 'signed' and new.case_id is null then
    raise exception 'Sign up the client from the enquiry page, which opens their case' using errcode = '23514';
  end if;
  if old.stage = 'signed' and new.stage is distinct from old.stage then
    raise exception 'This enquiry already has a case. Change the case instead' using errcode = '23514';
  end if;
  -- Assessing eligibility is immigration advice, so it stays with advisers.
  -- auth.uid() is null for the server's own work (the mail sync).
  if auth.uid() is not null and not app.is_adviser()
     and (new.eligibility is distinct from old.eligibility
          or new.assessment is distinct from old.assessment
          or new.agreement_signed_on is distinct from old.agreement_signed_on) then
    raise exception 'Only an adviser can change the assessment or the signed agreement' using errcode = '42501';
  end if;
  return new;
end $$;

create trigger guard before update on public.leads
  for each row execute function app.lead_guard();

-- Stage dates fill themselves in, and every stage change is logged.
create or replace function app.lead_stage_changed()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  v_at timestamptz := coalesce(nullif(current_setting('app.event_at', true), '')::timestamptz, now());
begin
  if new.stage is distinct from old.stage then
    if old.stage = 'new' and new.first_contacted_at is null then new.first_contacted_at := v_at; end if;
    if new.stage = 'consulted' and new.consulted_on is null then new.consulted_on := app.today(); end if;
    if new.stage = 'agreement_sent' and new.agreement_sent_on is null then new.agreement_sent_on := app.today(); end if;
    if new.stage in ('signed', 'not_proceeding') then new.closed_at := coalesce(new.closed_at, now());
    else new.closed_at := null; new.lost_reason := null; end if;
    -- crm_ingest sets app.event_at to the email's own time, so a stage change
    -- caused by a backfilled reply is dated when it really happened.
    insert into public.activities (lead_id, kind, body, created_by, at)
    values (new.id, 'stage',
            'Moved from ' || app.lead_stage_label(old.stage) || ' to ' || app.lead_stage_label(new.stage)
              || case when new.lost_reason is not null then ' (' || new.lost_reason || ')' else '' end,
            auth.uid(), v_at);
  end if;
  return new;
end $$;

create trigger stage_changed before update of stage on public.leads
  for each row execute function app.lead_stage_changed();

-- ---------------------------------------------------------------------------
-- Enquiries arriving from outside. Only the server may call these.
-- ---------------------------------------------------------------------------

-- The open enquiry for a person, if they have one.
create or replace function app.open_lead(p_contact uuid)
returns uuid language sql stable set search_path = ''
as $$
  select id from public.leads
  where contact_id = p_contact and stage in ('new', 'contacted', 'consult_booked', 'consulted', 'agreement_sent')
  order by created_at desc limit 1
$$;

-- Website consultation form.
-- p: { name, email, phone, pathway, jurisdiction, title, message, service,
--      utm_source, utm_medium, utm_campaign, utm_term, gclid, fbclid, landing_page }
create or replace function public.crm_website_enquiry(p jsonb)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_email   text := lower(btrim(p ->> 'email'));
  v_name    text := nullif(btrim(p ->> 'name'), '');
  v_phone   text := nullif(btrim(p ->> 'phone'), '');
  v_contact public.contacts%rowtype;
  v_client  uuid;
  v_lead    uuid;
  v_source  text;
  v_body    text;
begin
  if v_name is null or v_email is null or v_email not like '%@%' then
    raise exception 'Name and email are required' using errcode = '22023';
  end if;

  select id into v_client from public.clients where lower(email) = v_email order by created_at limit 1;

  insert into public.contacts (email, name, phone, status, client_id)
  values (v_email, v_name, v_phone, 'active', v_client)
  on conflict (email) do update set
    -- fill gaps; never overwrite what someone typed in by hand
    name = coalesce(public.contacts.name, excluded.name),
    phone = coalesce(public.contacts.phone, excluded.phone),
    client_id = coalesce(public.contacts.client_id, excluded.client_id),
    status = 'active',
    last_inbound_at = now()
  returning * into v_contact;

  v_source := case
    when nullif(p ->> 'gclid', '') is not null or nullif(p ->> 'gbraid', '') is not null or nullif(p ->> 'wbraid', '') is not null
      or (lower(coalesce(p ->> 'utm_source', '')) = 'google' and lower(coalesce(p ->> 'utm_medium', '')) in ('cpc', 'ppc', 'paid'))
      then 'google_ads'
    when nullif(p ->> 'fbclid', '') is not null
      or lower(coalesce(p ->> 'utm_source', '')) in ('facebook', 'fb', 'instagram', 'ig', 'meta')
      then 'meta'
    when v_contact.client_id is not null then 'past_client'
    else 'website_form'
  end;

  v_body := 'Website enquiry: ' || coalesce(nullif(p ->> 'service', ''), 'Not sure yet')
    || E'\n' || coalesce(nullif(btrim(p ->> 'message'), ''), '(no message)');

  v_lead := app.open_lead(v_contact.id);
  if v_lead is null then
    insert into public.leads (contact_id, title, pathway, jurisdiction, source, utm_source, utm_medium,
                              utm_campaign, utm_term, gclid, fbclid, landing_page)
    values (
      v_contact.id, coalesce(nullif(btrim(p ->> 'title'), ''), 'Website enquiry'),
      coalesce(nullif(p ->> 'pathway', ''), 'other'), coalesce(nullif(p ->> 'jurisdiction', ''), 'NZ'), v_source,
      nullif(p ->> 'utm_source', ''), nullif(p ->> 'utm_medium', ''), nullif(p ->> 'utm_campaign', ''),
      nullif(p ->> 'utm_term', ''), nullif(p ->> 'gclid', ''), nullif(p ->> 'fbclid', ''), nullif(p ->> 'landing_page', '')
    )
    returning id into v_lead;
  end if;
  insert into public.activities (lead_id, kind, body) values (v_lead, 'enquiry', v_body);
  update public.messages set lead_id = v_lead where contact_id = v_contact.id and lead_id is null;
  return v_lead;
end $$;

-- One email from the info@ mailbox.
-- p: { graph_id, direction ('in'|'out'), from_email, from_name, to_emails[],
--      subject, preview, body_text, received_at, conversation_id,
--      internet_message_id, has_attachments, automated (bool) }
-- Returns what it did, for the sync log.
create or replace function public.crm_ingest(
  p jsonb,
  p_own_domains text[] default array['ppimconsulting.co.nz', 'priyaimmigration.co.nz']
)
returns text
language plpgsql security definer set search_path = ''
as $$
declare
  v_dir      text := p ->> 'direction';
  v_at       timestamptz := (p ->> 'received_at')::timestamptz;
  v_email    text;
  v_contact  public.contacts%rowtype;
  v_client   uuid;
  v_lead     uuid;
  v_outcome  text;
begin
  if exists (select 1 from public.messages where graph_id = p ->> 'graph_id') then
    return 'duplicate';
  end if;

  -- Who is the other party?
  if v_dir = 'in' then
    v_email := lower(btrim(p ->> 'from_email'));
  else
    select lower(btrim(e)) into v_email
    from jsonb_array_elements_text(coalesce(p -> 'to_emails', '[]'::jsonb)) as e
    where split_part(lower(btrim(e)), '@', 2) <> all (p_own_domains)
    limit 1;
  end if;

  if v_email is null or v_email not like '%@%' or split_part(v_email, '@', 2) = any (p_own_domains) then
    return 'skipped: internal or no address';
  end if;

  select * into v_contact from public.contacts where email = v_email;

  if v_contact.id is null then
    -- Newsletters, receipts and notifications never become contacts.
    if coalesce((p ->> 'automated')::boolean, false) then
      return 'skipped: automated';
    end if;
    -- Something we sent to someone who never wrote to us: not an enquiry.
    if v_dir = 'out' then
      return 'skipped: outbound to unknown';
    end if;
    -- An existing client is not a new enquiry, so they skip the inbox.
    select id into v_client from public.clients where lower(email) = v_email order by created_at limit 1;
    insert into public.contacts (email, name, status, client_id, first_seen_at)
    values (v_email, nullif(btrim(p ->> 'from_name'), ''),
            case when v_client is null then 'triage' else 'active' end, v_client, v_at)
    returning * into v_contact;
  elsif v_contact.status = 'ignored' then
    return 'skipped: ignored sender';
  elsif v_dir = 'in' then
    update public.contacts set name = coalesce(name, nullif(btrim(p ->> 'from_name'), ''))
    where id = v_contact.id
    returning * into v_contact;
  end if;

  v_lead := app.open_lead(v_contact.id);

  if v_dir = 'out' then
    -- Replying to a new enquiry means it has been contacted.
    if v_lead is not null then
      perform set_config('app.event_at', v_at::text, true);
      update public.leads set stage = 'contacted' where id = v_lead and stage = 'new';
      perform set_config('app.event_at', '', true);
    end if;
    v_outcome := 'sent';
  else
    v_outcome := case when v_lead is not null then 'email on open enquiry'
                      when v_contact.status = 'triage' then 'triage'
                      else 'email from known contact' end;
  end if;

  insert into public.messages (graph_id, internet_message_id, conversation_id, contact_id, lead_id, direction,
                               from_email, from_name, to_emails, subject, preview, body_text, received_at, has_attachments)
  values (
    p ->> 'graph_id', p ->> 'internet_message_id', p ->> 'conversation_id', v_contact.id, v_lead, v_dir,
    lower(p ->> 'from_email'), p ->> 'from_name',
    coalesce(array(select lower(e) from jsonb_array_elements_text(coalesce(p -> 'to_emails', '[]'::jsonb)) e), '{}'),
    coalesce(p ->> 'subject', ''), left(coalesce(p ->> 'preview', ''), 300), left(coalesce(p ->> 'body_text', ''), 20000),
    v_at, coalesce((p ->> 'has_attachments')::boolean, false)
  );

  if v_dir = 'in' then
    update public.contacts set last_inbound_at = greatest(coalesce(last_inbound_at, v_at), v_at) where id = v_contact.id;
  else
    update public.contacts set last_outbound_at = greatest(coalesce(last_outbound_at, v_at), v_at) where id = v_contact.id;
  end if;

  return v_outcome;
end $$;

-- ---------------------------------------------------------------------------
-- Actions from the portal
-- ---------------------------------------------------------------------------

-- An enquiry that did not arrive online: a call, a WhatsApp, someone at the
-- counter. Someone with an open enquiry keeps it, and this is noted on it.
create or replace function public.crm_add_lead(
  p_name text, p_email text, p_phone text, p_title text, p_pathway text, p_jurisdiction text,
  p_source text, p_office text default null, p_note text default null, p_referred_by text default null
)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_email   text := nullif(lower(btrim(p_email)), '');
  v_phone   text := nullif(btrim(p_phone), '');
  v_contact uuid;
  v_client  uuid;
  v_lead    uuid;
  v_note    text := nullif(btrim(p_note), '');
begin
  if not app.is_active() then raise exception 'Not allowed' using errcode = '42501'; end if;
  if length(btrim(coalesce(p_name, ''))) = 0 then raise exception 'Enter the person''s name' using errcode = '22023'; end if;
  if v_email is null and v_phone is null then
    raise exception 'Enter an email address or a phone number' using errcode = '22023';
  end if;

  if v_email is not null then
    select id into v_client from public.clients where lower(email) = v_email order by created_at limit 1;
    insert into public.contacts (email, name, phone, status, client_id)
    values (v_email, btrim(p_name), v_phone, 'active', v_client)
    on conflict (email) do update set
      name = coalesce(public.contacts.name, excluded.name),
      phone = coalesce(public.contacts.phone, excluded.phone),
      client_id = coalesce(public.contacts.client_id, excluded.client_id),
      status = 'active'
    returning id into v_contact;
  else
    insert into public.contacts (name, phone, status) values (btrim(p_name), v_phone, 'active')
    returning id into v_contact;
  end if;

  v_lead := app.open_lead(v_contact);
  if v_lead is not null then
    insert into public.activities (lead_id, kind, body, created_by)
    values (v_lead, 'system', 'Enquired again' || coalesce(': ' || v_note, ''), auth.uid());
    return v_lead;
  end if;

  insert into public.leads (contact_id, title, pathway, jurisdiction, source, office, referred_by)
  values (v_contact, coalesce(nullif(btrim(p_title), ''), 'Enquiry'), coalesce(nullif(p_pathway, ''), 'other'),
          coalesce(nullif(p_jurisdiction, ''), 'NZ'), coalesce(nullif(p_source, ''), 'phone'), nullif(p_office, ''),
          nullif(btrim(p_referred_by), ''))
  returning id into v_lead;
  update public.messages set lead_id = v_lead where contact_id = v_contact and lead_id is null;
  insert into public.activities (lead_id, kind, body, created_by)
  values (v_lead, 'enquiry', coalesce(v_note, 'Added by hand'), auth.uid());
  return v_lead;
end $$;

-- Turn someone from the inbox into an enquiry; their emails move onto it.
create or replace function public.crm_make_lead(p_contact_id uuid, p_title text)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare v_lead uuid; v_first timestamptz;
begin
  if not app.is_active() then raise exception 'Not allowed' using errcode = '42501'; end if;
  select min(received_at) into v_first from public.messages where contact_id = p_contact_id;
  insert into public.leads (contact_id, title, source, created_at)
  values (p_contact_id, coalesce(nullif(btrim(p_title), ''), 'Email enquiry'), 'email', coalesce(v_first, now()))
  returning id into v_lead;
  update public.messages set lead_id = v_lead where contact_id = p_contact_id and lead_id is null;
  update public.contacts set status = 'active' where id = p_contact_id;
  insert into public.activities (lead_id, kind, body, created_by)
  values (v_lead, 'system', 'Made into an enquiry from the inbox', auth.uid());
  return v_lead;
end $$;

-- Sign up the client: the enquiry becomes a client and an active case with its
-- checklist, agreed fee and visa expiry deadline. Needs a signed agreement.
create or replace function public.crm_sign_up(
  p_lead_id uuid, p_title text, p_adviser_id uuid, p_signed_on date,
  p_agreed_fee numeric default null, p_checklist text[] default '{}'
)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  l        public.leads%rowtype;
  c        public.contacts%rowtype;
  v_client uuid;
  v_case   uuid;
begin
  if not app.is_adviser() then
    raise exception 'Only an adviser can sign up a client' using errcode = '42501';
  end if;
  if p_signed_on is null then
    raise exception 'Enter the date the written agreement was signed' using errcode = '22023';
  end if;
  if p_adviser_id is null then
    raise exception 'Choose the responsible adviser' using errcode = '22023';
  end if;

  select * into l from public.leads where id = p_lead_id for update;
  if l.id is null then raise exception 'Enquiry not found' using errcode = 'P0002'; end if;
  if l.case_id is not null then raise exception 'This enquiry already has a case' using errcode = '23514'; end if;
  if l.stage = 'not_proceeding' then raise exception 'Reopen this enquiry first' using errcode = '23514'; end if;

  select * into c from public.contacts where id = l.contact_id;
  v_client := c.client_id;
  if v_client is null and c.email is not null then
    select id into v_client from public.clients where lower(email) = c.email order by created_at limit 1;
  end if;
  if v_client is null then
    insert into public.clients (full_name, email, phone, country)
    values (coalesce(nullif(btrim(c.name), ''), c.email, c.phone), c.email, c.phone, coalesce(c.country, c.nationality))
    returning id into v_client;
  end if;

  v_case := public.create_case(v_client, coalesce(nullif(btrim(p_title), ''), l.title), l.pathway, l.jurisdiction,
                               p_adviser_id, p_checklist);
  update public.cases set
    status = 'active',
    source = case when l.source in ('website_form', 'google_ads', 'meta') then 'website' else 'portal' end
  where id = v_case;

  update public.case_fees set agreed_fee = coalesce(
    p_agreed_fee, (select quoted_fee from public.lead_fees where lead_id = l.id)
  ) where case_id = v_case;

  if l.visa_expiry_on is not null then
    insert into public.deadlines (case_id, kind, due_on, note, created_by)
    values (v_case, 'visa_expiry', l.visa_expiry_on, coalesce('Current visa: ' || l.current_visa, ''), auth.uid());
  end if;

  update public.contacts set client_id = v_client where id = c.id;
  update public.leads set case_id = v_case, stage = 'signed', agreement_signed_on = p_signed_on where id = l.id;
  return v_case;
end $$;

-- ---------------------------------------------------------------------------
-- Read models
-- ---------------------------------------------------------------------------

-- No money here: staff read this view. Fees are in lead_fees.
create view public.v_leads with (security_invoker = true) as
select
  l.*,
  c.email       as contact_email,
  c.name        as contact_name,
  c.phone       as contact_phone,
  c.nationality as contact_nationality,
  c.country     as contact_country,
  c.language    as contact_language,
  c.client_id   as contact_client_id,
  ow.display_name as owner,
  ad.display_name as adviser,
  cs.case_no,
  m.message_count,
  m.last_message_at,
  m.last_message_direction
from public.leads l
join public.contacts c on c.id = l.contact_id
left join public.profiles ow on ow.user_id = l.owner_id
left join public.profiles ad on ad.user_id = l.adviser_id
left join public.cases cs on cs.id = l.case_id
left join lateral (
  select count(*)::int as message_count,
         max(received_at) as last_message_at,
         (array_agg(direction order by received_at desc))[1] as last_message_direction
  from public.messages where contact_id = c.id
) m on true;

create view public.v_triage with (security_invoker = true) as
select
  c.id, c.email, c.name, c.first_seen_at, c.last_inbound_at,
  m.message_count, m.last_subject, m.last_preview
from public.contacts c
join lateral (
  select count(*)::int as message_count,
         (array_agg(subject order by received_at desc))[1] as last_subject,
         (array_agg(preview order by received_at desc))[1] as last_preview
  from public.messages where contact_id = c.id and direction = 'in'
) m on true
where c.status = 'triage';

-- Everything with a date on it: open case deadlines, plus the visa expiry of
-- anyone still enquiring.
create view public.v_deadlines with (security_invoker = true) as
select
  d.id, 'case'::text as origin, d.kind, d.due_on, d.note,
  cl.full_name as person, c.case_no as reference, c.id as case_id, null::uuid as lead_id,
  a.display_name as adviser
from public.deadlines d
join public.cases c on c.id = d.case_id
left join public.clients cl on cl.id = c.client_id
left join public.profiles a on a.user_id = c.adviser_id
where d.done_on is null and c.status in ('enquiry', 'active', 'lodged')
union all
select
  l.id, 'enquiry'::text, 'visa_expiry', l.visa_expiry_on,
  coalesce('Current visa: ' || l.current_visa, ''),
  coalesce(ct.name, ct.email, ct.phone), 'Enquiry', null::uuid, l.id,
  a.display_name
from public.leads l
join public.contacts ct on ct.id = l.contact_id
left join public.profiles a on a.user_id = coalesce(l.adviser_id, l.owner_id)
where l.visa_expiry_on is not null
  and l.stage in ('new', 'contacted', 'consult_booked', 'consulted', 'agreement_sent');

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------

alter table public.contacts   enable row level security;
alter table public.leads      enable row level security;
alter table public.lead_fees  enable row level security;
alter table public.messages   enable row level security;
alter table public.activities enable row level security;
alter table public.deadlines  enable row level security;
alter table public.mail_sync  enable row level security;

create policy contacts_read   on public.contacts for select to authenticated using (app.is_active());
create policy contacts_update on public.contacts for update to authenticated using (app.is_active()) with check (app.is_active());
create policy contacts_delete on public.contacts for delete to authenticated using (app.is_admin());

create policy leads_read   on public.leads for select to authenticated using (app.is_active());
create policy leads_update on public.leads for update to authenticated using (app.is_active()) with check (app.is_active());
create policy leads_delete on public.leads for delete to authenticated using (app.is_admin());

create policy lead_fees_all on public.lead_fees for all to authenticated using (app.is_adviser()) with check (app.is_adviser());

create policy messages_read on public.messages for select to authenticated using (app.is_active());

create policy activities_read on public.activities for select to authenticated using (app.is_active());
create policy activities_add  on public.activities for insert to authenticated
  with check (app.is_active() and kind in ('note', 'call', 'whatsapp') and created_by = auth.uid());
create policy activities_remove on public.activities for delete to authenticated
  using (app.is_active() and kind in ('note', 'call', 'whatsapp') and created_by = auth.uid());

create policy deadlines_read   on public.deadlines for select to authenticated using (app.is_active());
create policy deadlines_insert on public.deadlines for insert to authenticated with check (app.is_active());
create policy deadlines_update on public.deadlines for update to authenticated using (app.is_active()) with check (app.is_active());
create policy deadlines_delete on public.deadlines for delete to authenticated using (app.is_adviser());

create policy mail_sync_read on public.mail_sync for select to authenticated using (app.is_active());

-- Explicit grants: "automatically expose new tables" is off, and nothing here
-- is reachable without a login. Enquiries are created through the functions
-- above rather than by inserting rows.
revoke all on public.contacts, public.leads, public.lead_fees, public.messages, public.activities,
              public.deadlines, public.mail_sync, public.v_leads, public.v_triage, public.v_deadlines from anon;
grant select, update, delete on public.contacts, public.leads to authenticated;
grant select, insert, update, delete on public.lead_fees, public.deadlines to authenticated;
grant select, insert, delete on public.activities to authenticated;
grant select on public.messages, public.mail_sync, public.v_leads, public.v_triage, public.v_deadlines to authenticated;

revoke all on function public.crm_website_enquiry(jsonb) from public, anon, authenticated;
revoke all on function public.crm_ingest(jsonb, text[]) from public, anon, authenticated;
revoke all on function public.crm_add_lead(text, text, text, text, text, text, text, text, text, text) from public, anon;
revoke all on function public.crm_make_lead(uuid, text) from public, anon;
revoke all on function public.crm_sign_up(uuid, text, uuid, date, numeric, text[]) from public, anon;
grant execute on function public.crm_add_lead(text, text, text, text, text, text, text, text, text, text) to authenticated;
grant execute on function public.crm_make_lead(uuid, text) to authenticated;
grant execute on function public.crm_sign_up(uuid, text, uuid, date, numeric, text[]) to authenticated;

-- The website form and the mailbox sync run as the server (service role).
grant execute on function public.crm_website_enquiry(jsonb) to service_role;
grant execute on function public.crm_ingest(jsonb, text[]) to service_role;
grant select, update on public.mail_sync to service_role;
