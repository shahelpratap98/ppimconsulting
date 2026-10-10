-- Website enquiries become cases.
--
-- The consultation form on the public site still emails info@ through
-- FormSubmit, and now also posts to /api/enquiry, which calls
-- create_website_enquiry() with the service key. The enquiry is filed as a
-- client and a case with status 'enquiry', so nothing depends on an inbox.

alter table public.cases
  add column source text not null default 'portal' check (source in ('portal', 'website'));

-- v_cases selects c.*, which Postgres expands when the view is created, so it
-- has to be rebuilt to include the new column.
drop view public.v_cases;
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

revoke all on public.v_cases from anon;
grant select on public.v_cases to authenticated;

-- Files one website enquiry. An existing client with the same email is reused
-- so a returning client keeps one record. Only the server (service role) may
-- call this; signed-in staff open cases through create_case instead.
create or replace function public.create_website_enquiry(
  p_name         text,
  p_email        text,
  p_phone        text,
  p_pathway      text,
  p_jurisdiction text,
  p_title        text,
  p_notes        text,
  p_checklist    text[] default '{}'
)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  s         public.settings%rowtype;
  v_client  uuid;
  v_case    uuid;
  i         integer;
begin
  if length(btrim(coalesce(p_name, ''))) = 0 or length(btrim(coalesce(p_email, ''))) = 0 then
    raise exception 'Name and email are required';
  end if;

  select id into v_client
    from public.clients
   where lower(email) = lower(btrim(p_email))
   order by created_at
   limit 1;

  if v_client is null then
    insert into public.clients (full_name, email, phone)
    values (btrim(p_name), btrim(p_email), nullif(btrim(coalesce(p_phone, '')), ''))
    returning id into v_client;
  end if;

  select * into s from public.settings where id for update;

  insert into public.cases (case_no, client_id, title, pathway, jurisdiction, status, notes, source)
  values (
    s.case_prefix || lpad(s.next_case_no::text, 4, '0'),
    v_client, btrim(p_title), coalesce(nullif(p_pathway, ''), 'other'),
    coalesce(nullif(p_jurisdiction, ''), 'NZ'), 'enquiry', coalesce(p_notes, ''), 'website'
  )
  returning id into v_case;

  update public.settings set next_case_no = next_case_no + 1 where id;

  if p_checklist is not null then
    for i in 1 .. coalesce(array_length(p_checklist, 1), 0) loop
      if length(btrim(p_checklist[i])) > 0 then
        insert into public.checklist_items (case_id, label, sort_order)
        values (v_case, btrim(p_checklist[i]), i);
      end if;
    end loop;
  end if;

  insert into public.case_fees (case_id) values (v_case);
  return v_case;
end $$;

revoke all on function public.create_website_enquiry(text, text, text, text, text, text, text, text[]) from public, anon, authenticated;
grant execute on function public.create_website_enquiry(text, text, text, text, text, text, text, text[]) to service_role;
