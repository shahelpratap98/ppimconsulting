-- Roles, row-level security, audit trail.
-- staff   : own time entries; works on cases and checklists; never sees fees or invoices.
-- adviser : all time, approves / returns; creates cases and clients; sees and sets fees.
-- admin   : adviser + staff accounts, settings, invoices, audit log.

-- ---------------------------------------------------------------- helpers
-- SECURITY DEFINER so policies can read profiles without recursing into
-- the profiles policies. An inactive user resolves to no role at all.

create or replace function app.current_role()
returns public.app_role
language sql stable security definer set search_path = ''
as $$
  select p.role from public.profiles p
  where p.user_id = auth.uid() and p.is_active
$$;

create or replace function app.is_active()
returns boolean language sql stable security definer set search_path = ''
as $$ select app.current_role() is not null $$;

create or replace function app.is_adviser()
returns boolean language sql stable security definer set search_path = ''
as $$ select coalesce(app.current_role() in ('adviser', 'admin'), false) $$;

create or replace function app.is_admin()
returns boolean language sql stable security definer set search_path = ''
as $$ select coalesce(app.current_role() = 'admin', false) $$;

grant usage on schema app to authenticated;
revoke all on all functions in schema app from public, anon;
grant execute on all functions in schema app to authenticated;

-- ---------------------------------------------------------------- housekeeping triggers

create or replace function app.touch_updated_at()
returns trigger language plpgsql set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger touch before update on public.settings        for each row execute function app.touch_updated_at();
create trigger touch before update on public.profiles        for each row execute function app.touch_updated_at();
create trigger touch before update on public.clients         for each row execute function app.touch_updated_at();
create trigger touch before update on public.cases           for each row execute function app.touch_updated_at();
create trigger touch before update on public.case_fees       for each row execute function app.touch_updated_at();
create trigger touch before update on public.fee_stages      for each row execute function app.touch_updated_at();
create trigger touch before update on public.invoices        for each row execute function app.touch_updated_at();
create trigger touch before update on public.checklist_items for each row execute function app.touch_updated_at();
create trigger touch before update on public.time_entries    for each row execute function app.touch_updated_at();

-- Every invited auth user gets a staff profile. Role is never taken from
-- user-editable metadata; an admin promotes people afterwards.
create or replace function app.handle_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (user_id, display_name, email)
  values (
    new.id,
    coalesce(nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(new.email, '@', 1)),
    new.email
  )
  on conflict (user_id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function app.handle_new_user();

-- Audit: who changed what, before and after.
create or replace function app.audit()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  pk text := tg_argv[0];
  old_j jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end;
  new_j jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end;
begin
  if tg_op = 'UPDATE' and (old_j - 'updated_at') = (new_j - 'updated_at') then
    return new;
  end if;
  insert into public.audit_log (actor_id, table_name, row_id, action, before, after)
  values (auth.uid(), tg_table_name, coalesce(new_j ->> pk, old_j ->> pk), tg_op, old_j, new_j);
  return coalesce(new, old);
end $$;

create trigger audit after insert or update or delete on public.settings        for each row execute function app.audit('id');
create trigger audit after insert or update or delete on public.profiles        for each row execute function app.audit('user_id');
create trigger audit after insert or update or delete on public.clients         for each row execute function app.audit('id');
create trigger audit after insert or update or delete on public.cases           for each row execute function app.audit('id');
create trigger audit after insert or update or delete on public.case_fees       for each row execute function app.audit('case_id');
create trigger audit after insert or update or delete on public.fee_stages      for each row execute function app.audit('id');
create trigger audit after insert or update or delete on public.invoices        for each row execute function app.audit('id');
create trigger audit after insert or update or delete on public.checklist_items for each row execute function app.audit('id');
create trigger audit after insert or update or delete on public.work_types      for each row execute function app.audit('id');
create trigger audit after insert or update or delete on public.time_entries    for each row execute function app.audit('id');
create trigger audit after insert or update or delete on public.public_holidays for each row execute function app.audit('day');

-- ---------------------------------------------------------------- grants
-- Nothing is reachable without a login.

revoke all on all tables in schema public from anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
revoke insert, update, delete on public.audit_log from authenticated;
revoke insert, update, delete on public.invoices, public.invoice_lines from authenticated;

-- ---------------------------------------------------------------- RLS

alter table public.settings        enable row level security;
alter table public.profiles        enable row level security;
alter table public.clients         enable row level security;
alter table public.cases           enable row level security;
alter table public.case_fees       enable row level security;
alter table public.fee_stages      enable row level security;
alter table public.invoices        enable row level security;
alter table public.invoice_lines   enable row level security;
alter table public.checklist_items enable row level security;
alter table public.work_types      enable row level security;
alter table public.time_entries    enable row level security;
alter table public.public_holidays enable row level security;
alter table public.audit_log       enable row level security;

-- settings: everyone signed in reads; admin edits.
create policy settings_read  on public.settings for select to authenticated using (app.is_active());
create policy settings_admin on public.settings for update to authenticated using (app.is_admin()) with check (app.is_admin());

-- profiles: a small team, so everyone sees colleagues' names; only admin changes anyone.
create policy profiles_read  on public.profiles for select to authenticated using (app.is_active());
create policy profiles_admin on public.profiles for update to authenticated
  using (app.is_admin()) with check (app.is_admin());

-- clients and cases: everyone works on them; advisers create and edit; admin deletes.
create policy clients_read   on public.clients for select to authenticated using (app.is_active());
create policy clients_insert on public.clients for insert to authenticated with check (app.is_adviser());
create policy clients_update on public.clients for update to authenticated using (app.is_adviser()) with check (app.is_adviser());
create policy clients_delete on public.clients for delete to authenticated using (app.is_admin());

create policy cases_read   on public.cases for select to authenticated using (app.is_active());
create policy cases_insert on public.cases for insert to authenticated with check (app.is_adviser());
create policy cases_update on public.cases for update to authenticated using (app.is_adviser()) with check (app.is_adviser());
create policy cases_delete on public.cases for delete to authenticated using (app.is_admin());

-- fees: advisers only. A billed stage is frozen.
create policy fees_read  on public.case_fees for select to authenticated using (app.is_adviser());
create policy fees_write on public.case_fees for all    to authenticated using (app.is_adviser()) with check (app.is_adviser());

create policy stages_read   on public.fee_stages for select to authenticated using (app.is_adviser());
create policy stages_insert on public.fee_stages for insert to authenticated
  with check (app.is_adviser() and invoice_id is null);
create policy stages_update on public.fee_stages for update to authenticated
  using (app.is_adviser() and invoice_id is null)
  with check (app.is_adviser() and invoice_id is null);
create policy stages_delete on public.fee_stages for delete to authenticated
  using (app.is_adviser() and invoice_id is null);

-- invoices: advisers read; created, paid and voided only through functions.
create policy invoices_read on public.invoices      for select to authenticated using (app.is_adviser());
create policy lines_read    on public.invoice_lines for select to authenticated using (app.is_adviser());

-- the document checklist: anyone working on cases keeps it up to date.
create policy checklist_all on public.checklist_items for all to authenticated
  using (app.is_active()) with check (app.is_active());

-- pick-lists.
create policy work_types_read  on public.work_types      for select to authenticated using (app.is_active());
create policy work_types_admin on public.work_types      for all    to authenticated using (app.is_admin()) with check (app.is_admin());
create policy holidays_read    on public.public_holidays for select to authenticated using (app.is_active());
create policy holidays_admin   on public.public_holidays for all    to authenticated using (app.is_admin()) with check (app.is_admin());

-- time entries: own rows for staff, everything for advisers.
create policy entries_read_own on public.time_entries for select to authenticated
  using (user_id = auth.uid() and app.is_active());
create policy entries_read_all on public.time_entries for select to authenticated
  using (app.is_adviser());

create policy entries_insert_own on public.time_entries for insert to authenticated
  with check (
    user_id = auth.uid() and app.is_active()
    and status in ('draft', 'submitted')
    and approved_by is null and approved_at is null
  );

-- Staff can touch a row only while it is draft or returned, and can only
-- leave it as draft or submitted.
create policy entries_update_own on public.time_entries for update to authenticated
  using (user_id = auth.uid() and app.is_active() and status in ('draft', 'returned'))
  with check (
    user_id = auth.uid()
    and status in ('draft', 'submitted')
    and approved_by is null and approved_at is null
  );

create policy entries_delete_own on public.time_entries for delete to authenticated
  using (user_id = auth.uid() and app.is_active() and status in ('draft', 'returned'));

-- Advisers may enter on behalf of someone and correct any entry.
create policy entries_insert_adviser on public.time_entries for insert to authenticated
  with check (app.is_adviser());
create policy entries_update_adviser on public.time_entries for update to authenticated
  using (app.is_adviser()) with check (app.is_adviser());
create policy entries_delete_adviser on public.time_entries for delete to authenticated
  using (app.is_adviser());

create policy audit_read on public.audit_log for select to authenticated using (app.is_admin());
