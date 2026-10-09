-- Workflow functions and report views.

-- ---------------------------------------------------------------- views
-- security_invoker: the caller's RLS applies, so staff see only their own
-- entries and fee columns come back null for them.

create view public.v_entries
with (security_invoker = true) as
select
  e.id, e.entry_date, e.user_id, p.display_name as employee,
  e.case_id, c.case_no, c.title as case_title, c.is_internal,
  cl.full_name as client,
  e.work_type_id, w.name as work_type,
  e.hours, e.description, e.status,
  e.approved_by, ap.display_name as approved_by_name, e.approved_at, e.return_note,
  e.created_at, e.updated_at
from public.time_entries e
join      public.profiles   p  on p.user_id = e.user_id
left join public.cases      c  on c.id = e.case_id
left join public.clients    cl on cl.id = c.client_id
left join public.work_types w  on w.id = e.work_type_id
left join public.profiles   ap on ap.user_id = e.approved_by;

-- One row per case with checklist progress and time.
create view public.v_cases
with (security_invoker = true) as
select
  c.*,
  cl.full_name as client, cl.email as client_email,
  a.display_name as adviser,
  coalesce(ck.total, 0)    as checklist_total,
  coalesce(ck.received, 0) as checklist_received,
  coalesce(ck.flagged, 0)  as checklist_flagged,
  coalesce(t.hours, 0)     as hours_logged
from public.cases c
left join public.clients  cl on cl.id = c.client_id
left join public.profiles a  on a.user_id = c.adviser_id
left join (
  select case_id,
         count(*) as total,
         count(*) filter (where status = 'received') as received,
         count(*) filter (where status = 'flagged')  as flagged
  from public.checklist_items group by case_id
) ck on ck.case_id = c.id
left join (
  select case_id, sum(hours) as hours
  from public.time_entries where status <> 'draft' group by case_id
) t on t.case_id = c.id;

-- Fee position per case, for advisers (RLS on case_fees / fee_stages /
-- invoices returns nothing to staff).
create view public.v_case_finance
with (security_invoker = true) as
select
  c.id as case_id, c.case_no, c.title, c.status, c.is_internal,
  cl.full_name as client,
  f.agreed_fee,
  coalesce(s.staged, 0)    as staged,
  coalesce(s.unbilled, 0)  as unbilled,
  coalesce(i.invoiced, 0)  as invoiced,
  coalesce(i.paid, 0)      as paid,
  coalesce(t.hours, 0)     as hours,
  case when coalesce(t.hours, 0) > 0 and f.agreed_fee is not null
       then round(f.agreed_fee / t.hours, 2) end as fee_per_hour
from public.cases c
left join public.clients   cl on cl.id = c.client_id
left join public.case_fees f  on f.case_id = c.id
left join (
  select case_id, sum(amount) as staged,
         sum(amount) filter (where invoice_id is null) as unbilled
  from public.fee_stages group by case_id
) s on s.case_id = c.id
left join (
  select case_id,
         sum(subtotal) filter (where status <> 'void') as invoiced,
         sum(subtotal) filter (where status = 'paid')  as paid
  from public.invoices group by case_id
) i on i.case_id = c.id
left join (
  select case_id, sum(hours) as hours
  from public.time_entries where status in ('submitted', 'approved') group by case_id
) t on t.case_id = c.id;

-- ---------------------------------------------------------------- cases

-- Create a case with the next case number and its starting checklist.
create or replace function public.create_case(
  p_client_id    uuid,
  p_title        text,
  p_pathway      text,
  p_jurisdiction text,
  p_adviser_id   uuid,
  p_checklist    text[] default '{}'
)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  s       public.settings%rowtype;
  v_case  uuid;
  i       integer;
begin
  if not app.is_adviser() then
    raise exception 'Only an adviser can open a case' using errcode = '42501';
  end if;
  if p_client_id is null then
    raise exception 'Choose the client for this case';
  end if;

  select * into s from public.settings where id for update;

  insert into public.cases (case_no, client_id, title, pathway, jurisdiction, adviser_id)
  values (
    s.case_prefix || lpad(s.next_case_no::text, 4, '0'),
    p_client_id, btrim(p_title), coalesce(nullif(p_pathway, ''), 'other'),
    coalesce(nullif(p_jurisdiction, ''), 'NZ'), p_adviser_id
  )
  returning id into v_case;

  update public.settings set next_case_no = next_case_no + 1 where id;

  if p_checklist is not null then
    for i in 1 .. coalesce(array_length(p_checklist, 1), 0) loop
      if length(btrim(p_checklist[i])) > 0 then
        insert into public.checklist_items (case_id, label, sort_order, updated_by)
        values (v_case, btrim(p_checklist[i]), i, auth.uid());
      end if;
    end loop;
  end if;

  insert into public.case_fees (case_id) values (v_case);
  return v_case;
end $$;

-- ---------------------------------------------------------------- hours check
create or replace function app.fmt_hours(n numeric)
returns text language sql immutable set search_path = ''
as $$ select rtrim(rtrim(to_char(n, 'FM999990.00'), '0'), '.') $$;
grant execute on function app.fmt_hours(numeric) to authenticated;

-- ---------------------------------------------------------------- approve / return

create or replace function public.approve_entries(p_ids uuid[])
returns integer
language plpgsql security definer set search_path = ''
as $$
declare n integer;
begin
  if not app.is_adviser() then
    raise exception 'Only an adviser can approve time' using errcode = '42501';
  end if;
  update public.time_entries
     set status = 'approved', approved_by = auth.uid(), approved_at = now(), return_note = null
   where id = any (p_ids) and status = 'submitted';
  get diagnostics n = row_count;
  return n;
end $$;

create or replace function public.return_entries(p_ids uuid[], p_note text)
returns integer
language plpgsql security definer set search_path = ''
as $$
declare n integer;
begin
  if not app.is_adviser() then
    raise exception 'Only an adviser can return time' using errcode = '42501';
  end if;
  if length(btrim(coalesce(p_note, ''))) = 0 then
    raise exception 'A note is required so the person knows what to fix';
  end if;
  update public.time_entries
     set status = 'returned', approved_by = null, approved_at = null, return_note = btrim(p_note)
   where id = any (p_ids) and status in ('submitted', 'approved');
  get diagnostics n = row_count;
  return n;
end $$;

-- ---------------------------------------------------------------- invoicing
-- An invoice bills chosen fee stages of one case, plus an optional extra
-- line (e.g. a disbursement). GST = subtotal x GST rate. Numbers run
-- INV-0001, INV-0002, ... and are never reused.
create or replace function public.create_invoice(
  p_case_id      uuid,
  p_stage_ids    uuid[],
  p_extra_desc   text    default null,
  p_extra_amount numeric default null,
  p_issued_on    date    default current_date,
  p_notes        text    default ''
)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  s          public.settings%rowtype;
  v_subtotal numeric := 0;
  v_gst      numeric;
  v_invoice  uuid;
  v_client   uuid;
  v_n        integer;
begin
  if not app.is_admin() then
    raise exception 'Only an admin can create invoices' using errcode = '42501';
  end if;

  select count(*) into v_n
    from public.fee_stages
   where id = any (coalesce(p_stage_ids, '{}')) and case_id = p_case_id and invoice_id is null;
  if v_n <> coalesce(array_length(p_stage_ids, 1), 0) then
    raise exception 'One of the fee stages is already billed or belongs to another case';
  end if;
  if v_n = 0 and (p_extra_amount is null or p_extra_amount = 0) then
    raise exception 'Choose at least one fee stage or add a line to bill';
  end if;
  if p_extra_amount is not null and p_extra_amount <> 0 and length(btrim(coalesce(p_extra_desc, ''))) = 0 then
    raise exception 'Describe the extra line';
  end if;

  select * into s from public.settings where id for update;
  select client_id into v_client from public.cases where id = p_case_id;

  insert into public.invoices (invoice_no, case_id, client_id, issued_on, due_on, gst_rate, notes, created_by)
  values (
    s.invoice_prefix || lpad(s.next_invoice_no::text, 4, '0'),
    p_case_id, v_client, p_issued_on, p_issued_on + s.payment_terms_days, s.gst_rate,
    coalesce(p_notes, ''), auth.uid()
  )
  returning id into v_invoice;

  insert into public.invoice_lines (invoice_id, fee_stage_id, description, amount, sort_order)
  select v_invoice, f.id, f.label, f.amount, f.sort_order
    from public.fee_stages f
   where f.id = any (coalesce(p_stage_ids, '{}'));

  if p_extra_amount is not null and p_extra_amount <> 0 then
    insert into public.invoice_lines (invoice_id, description, amount, sort_order)
    values (v_invoice, btrim(p_extra_desc), round(p_extra_amount, 2), 1000);
  end if;

  update public.fee_stages set invoice_id = v_invoice where id = any (coalesce(p_stage_ids, '{}'));

  select sum(amount) into v_subtotal from public.invoice_lines where invoice_id = v_invoice;
  v_gst := round(v_subtotal * s.gst_rate, 2);
  update public.invoices
     set subtotal = v_subtotal, gst = v_gst, total = v_subtotal + v_gst
   where id = v_invoice;

  update public.settings set next_invoice_no = next_invoice_no + 1 where id;
  return v_invoice;
end $$;

-- Void an invoice and release its fee stages so they can be billed again.
create or replace function public.void_invoice(p_invoice_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not app.is_admin() then
    raise exception 'Only an admin can void invoices' using errcode = '42501';
  end if;
  if not exists (select 1 from public.invoices where id = p_invoice_id and status <> 'void') then
    raise exception 'Invoice not found or already void';
  end if;
  update public.fee_stages set invoice_id = null where invoice_id = p_invoice_id;
  update public.invoices set status = 'void', paid_on = null where id = p_invoice_id;
end $$;

-- Mark an invoice paid (p_paid_on) or back to unpaid (null).
create or replace function public.set_invoice_paid(p_invoice_id uuid, p_paid_on date)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not app.is_admin() then
    raise exception 'Only an admin can record payments' using errcode = '42501';
  end if;
  update public.invoices
     set status = case when p_paid_on is null then 'issued' else 'paid' end::public.invoice_status,
         paid_on = p_paid_on
   where id = p_invoice_id and status <> 'void';
  if not found then
    raise exception 'Invoice not found or void';
  end if;
end $$;

-- ---------------------------------------------------------------- grants

revoke all on function public.create_case(uuid, text, text, text, uuid, text[])            from public, anon;
revoke all on function public.approve_entries(uuid[])                                      from public, anon;
revoke all on function public.return_entries(uuid[], text)                                 from public, anon;
revoke all on function public.create_invoice(uuid, uuid[], text, numeric, date, text)     from public, anon;
revoke all on function public.void_invoice(uuid)                                           from public, anon;
revoke all on function public.set_invoice_paid(uuid, date)                                 from public, anon;
grant execute on function public.create_case(uuid, text, text, text, uuid, text[])        to authenticated;
grant execute on function public.approve_entries(uuid[])                                  to authenticated;
grant execute on function public.return_entries(uuid[], text)                             to authenticated;
grant execute on function public.create_invoice(uuid, uuid[], text, numeric, date, text) to authenticated;
grant execute on function public.void_invoice(uuid)                                       to authenticated;
grant execute on function public.set_invoice_paid(uuid, date)                             to authenticated;

revoke all on public.v_entries, public.v_cases, public.v_case_finance from anon;
grant select on public.v_entries, public.v_cases, public.v_case_finance to authenticated;
