-- Leave: ported from the Stable Structure portal (migrations 0800 + 0900),
-- adapted for PPIM: adviser role, NZ public holidays only, and staff see
-- only their own Hours Check rows.

-- Leave: requests, approval, balances and a team calendar.
--
-- NZ Holidays Act 2003 defaults:
--   annual leave   4 weeks a year (20 days on a 5-day week); unused days carry
--                  over indefinitely
--   sick leave     10 days a year, carrying over to a maximum of 20 days
--   bereavement    3 days per bereavement (immediate family), not a yearly
--                  quota, so only "taken" is tracked
--   parental       up to 52 weeks' job-protected leave; tracked as taken only
-- Both yearly entitlements arise on the employment anniversary, so a person's
-- leave year runs from their start date (1 January when no start date is set).

create type public.leave_type   as enum ('annual', 'sick', 'bereavement', 'parental');
create type public.leave_status as enum ('requested', 'approved', 'declined', 'cancelled');
create type public.half_day     as enum ('am', 'pm');

alter table public.settings
  add column if not exists annual_leave_days   numeric(5,2) not null default 20 check (annual_leave_days >= 0),
  add column if not exists sick_leave_days     numeric(5,2) not null default 10 check (sick_leave_days >= 0),
  add column if not exists sick_leave_cap_days numeric(5,2) not null default 20 check (sick_leave_cap_days >= 0);

alter table public.profiles
  add column if not exists start_date          date,
  add column if not exists annual_leave_days   numeric(5,2) check (annual_leave_days >= 0),  -- null = company default
  add column if not exists sick_leave_days     numeric(5,2) check (sick_leave_days >= 0),
  -- Opening balances: what the person had "as of" a date, e.g. carried over
  -- from the old system. Leave recorded in the portal before that date is
  -- ignored; accruals after it are added at each anniversary.
  add column if not exists balance_as_of       date,
  add column if not exists annual_opening_days numeric(6,2) check (annual_opening_days >= 0),
  add column if not exists sick_opening_days   numeric(6,2) check (sick_opening_days >= 0);

create table public.leave_requests (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles (user_id) on delete restrict,
  leave_type     public.leave_type not null,
  start_date     date not null,
  end_date       date not null,
  half_day       public.half_day,                            -- single days only
  days           numeric(6,2) not null check (days > 0),     -- working days, frozen at request time
  note           text not null default '',
  status         public.leave_status not null default 'requested',
  decided_by     uuid references public.profiles (user_id),
  decided_at     timestamptz,
  decision_note  text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  check (end_date >= start_date),
  check (end_date - start_date < 400),
  check (half_day is null or start_date = end_date)
);
create index leave_requests_user_idx  on public.leave_requests (user_id, start_date);
create index leave_requests_dates_idx on public.leave_requests (start_date, end_date) where status in ('requested', 'approved');

create trigger touch before update on public.leave_requests for each row execute function app.touch_updated_at();
create trigger audit after insert or update or delete on public.leave_requests for each row execute function app.audit('id');

-- Working days between two dates: weekdays that are not public holidays.
create or replace function public.working_days(p_from date, p_to date)
returns numeric
language sql stable security invoker set search_path = ''
as $$
  select count(*)::numeric
  from generate_series(p_from, p_to, interval '1 day') d
  where extract(isodow from d) < 6
    and not exists (select 1 from public.public_holidays h where h.day = d::date and h.region = 'NZ')
$$;

-- The anniversary (or 1 January) on or before p_on.
create or replace function app.leave_year_start(p_user uuid, p_on date default current_date)
returns date
language sql stable security definer set search_path = ''
as $$
  select case
    when p.start_date is null then make_date(extract(year from p_on)::int, 1, 1)
    else (select max((p.start_date + (n || ' years')::interval)::date)
            from generate_series(0, 60) n
           where (p.start_date + (n || ' years')::interval)::date <= p_on)
  end
  from public.profiles p where p.user_id = p_user
$$;

-- Running balance of one leave type for one person as of p_on.
-- Walks forward from the opening balance: +entitlement at each anniversary
-- (sick capped), -days for each approved request, in date order.
create or replace function app.leave_balance(p_user uuid, p_type public.leave_type, p_on date)
returns numeric
language plpgsql stable security definer set search_path = ''
as $$
declare
  p        public.profiles%rowtype;
  s        public.settings%rowtype;
  ent      numeric;
  cap      numeric;
  bal      numeric;
  as_of    date;
  ev       record;
begin
  select * into p from public.profiles where user_id = p_user;
  select * into s from public.settings where id;
  if p_type = 'annual' then
    ent := coalesce(p.annual_leave_days, s.annual_leave_days); cap := null;
    bal := p.annual_opening_days;
  else
    ent := coalesce(p.sick_leave_days, s.sick_leave_days); cap := s.sick_leave_cap_days;
    bal := p.sick_opening_days;
  end if;

  -- No opening balance recorded: assume a full entitlement at the start of
  -- the current leave year (the simple, no-setup behaviour).
  as_of := p.balance_as_of;
  if as_of is null or bal is null then
    as_of := app.leave_year_start(p_user, p_on);
    bal   := ent;
  end if;

  for ev in
    select d as at, ent as delta from (
      select (case when p.start_date is null
                   then make_date(extract(year from p.balance_as_of)::int + n, 1, 1)
                   else (p.start_date + (n || ' years')::interval)::date end) as d
      from generate_series(0, 60) n
    ) a where d > as_of and d <= p_on and p.balance_as_of is not null and bal is not null
    union all
    select l.start_date, -l.days from public.leave_requests l
     where l.user_id = p_user and l.leave_type = p_type and l.status = 'approved'
       and l.start_date >= as_of and l.start_date <= p_on
    order by 1
  loop
    bal := bal + ev.delta;
    if cap is not null and ev.delta > 0 then bal := least(bal, cap); end if;
  end loop;
  return bal;
end $$;

-- ---------------------------------------------------------------- RLS
alter table public.leave_requests enable row level security;
revoke all on public.leave_requests from anon;
grant select, insert, update on public.leave_requests to authenticated;

create policy leave_read_own on public.leave_requests for select to authenticated
  using (user_id = auth.uid() and app.is_active());
create policy leave_read_all on public.leave_requests for select to authenticated
  using (app.is_adviser());
create policy leave_insert_own on public.leave_requests for insert to authenticated
  with check (user_id = auth.uid() and app.is_active() and status = 'requested'
              and decided_by is null and decided_at is null);
-- A person may only withdraw a request that is still waiting.
create policy leave_cancel_own on public.leave_requests for update to authenticated
  using (user_id = auth.uid() and app.is_active() and status = 'requested')
  with check (user_id = auth.uid() and status = 'cancelled');
create policy leave_update_adviser on public.leave_requests for update to authenticated
  using (app.is_adviser()) with check (app.is_adviser());

-- Team calendar: everyone sees who is away and when. The type is shown only
-- for your own rows and to advisers (sick, bereavement and parental leave
-- are personal). Definer view: staff cannot read other people's rows directly.
create view public.v_leave_calendar
with (security_invoker = false) as
select
  l.id, l.user_id, p.display_name as employee, l.start_date, l.end_date, l.half_day::text as half_day, l.days, l.status,
  case when l.user_id = auth.uid() or app.is_adviser() then l.leave_type::text end as leave_type,
  l.user_id = auth.uid() as is_mine
from public.leave_requests l
join public.profiles p on p.user_id = l.user_id
where l.status in ('requested', 'approved') and app.is_active();

revoke all on public.v_leave_calendar from anon;
grant select on public.v_leave_calendar to authenticated;

-- Balances. Staff get their own row; advisers get everyone.
create or replace function public.leave_balances(p_on date default current_date)
returns table (
  user_id uuid, employee text, leave_year_start date, leave_year_end date,
  annual_entitlement numeric, annual_available numeric, annual_taken numeric, annual_pending numeric,
  sick_entitlement numeric, sick_available numeric, sick_taken numeric, sick_pending numeric,
  bereavement_taken numeric, parental_taken numeric
)
language sql stable security invoker set search_path = ''
as $$
  with people as (
    select p.user_id, p.display_name,
           app.leave_year_start(p.user_id, p_on) as ys,
           coalesce(p.annual_leave_days, s.annual_leave_days) as annual_ent,
           coalesce(p.sick_leave_days, s.sick_leave_days) as sick_ent
    from public.profiles p cross join public.settings s
    where p.is_active and (p.user_id = auth.uid() or app.is_adviser())
  )
  select
    pe.user_id, pe.display_name, pe.ys, (pe.ys + interval '1 year' - interval '1 day')::date,
    pe.annual_ent,
    app.leave_balance(pe.user_id, 'annual', p_on),
    coalesce(sum(l.days) filter (where l.leave_type = 'annual' and l.status = 'approved' and l.start_date >= pe.ys), 0),
    coalesce(sum(l.days) filter (where l.leave_type = 'annual' and l.status = 'requested'), 0),
    pe.sick_ent,
    app.leave_balance(pe.user_id, 'sick', p_on),
    coalesce(sum(l.days) filter (where l.leave_type = 'sick' and l.status = 'approved' and l.start_date >= pe.ys), 0),
    coalesce(sum(l.days) filter (where l.leave_type = 'sick' and l.status = 'requested'), 0),
    coalesce(sum(l.days) filter (where l.leave_type = 'bereavement' and l.status = 'approved' and l.start_date >= pe.ys), 0),
    coalesce(sum(l.days) filter (where l.leave_type = 'parental' and l.status = 'approved' and l.start_date >= pe.ys), 0)
  from people pe
  left join public.leave_requests l
    on l.user_id = pe.user_id and l.start_date < (pe.ys + interval '1 year')::date
  group by pe.user_id, pe.display_name, pe.ys, pe.annual_ent, pe.sick_ent
  order by pe.display_name
$$;

create or replace function public.decide_leave(p_id uuid, p_approve boolean, p_note text default null)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not app.is_adviser() then
    raise exception 'Only an adviser can decide leave' using errcode = '42501';
  end if;
  update public.leave_requests
     set status = case when p_approve then 'approved' else 'declined' end::public.leave_status,
         decided_by = auth.uid(), decided_at = now(), decision_note = nullif(btrim(coalesce(p_note, '')), '')
   where id = p_id and status in ('requested', 'approved');
  if not found then
    raise exception 'That request has already been withdrawn or declined';
  end if;
end $$;

-- ---------------------------------------------------------------- hours check
-- A day of approved leave is never "short"; it is listed as "On leave".
-- A half day lowers the standard for that day by half.
drop function if exists public.hours_check(date, date);

create function public.hours_check(p_from date, p_to date)
returns table (
  user_id uuid, employee text, day date, is_weekend boolean, holiday text, leave text,
  hours numeric, standard numeric, overtime numeric, status text
)
language sql stable security invoker set search_path = ''
as $$
  with days as (
    select d::date as day from generate_series(p_from, p_to, interval '1 day') d
  ),
  totals as (
    select e.user_id, e.entry_date, sum(e.hours) as hours
    from public.time_entries e
    where e.status <> 'draft' and e.entry_date between p_from and p_to
    group by e.user_id, e.entry_date
  ),
  grid as (
    select
      p.user_id, p.display_name, d.day,
      extract(isodow from d.day) >= 6 as is_weekend,
      h.name as holiday,
      lv.leave_type::text as leave,
      lv.half_day is not null as half,
      coalesce(t.hours, 0) as hours,
      coalesce(p.standard_day_hours, s.standard_day_hours) as standard
    from public.profiles p
    cross join days d
    cross join public.settings s
    left join public.public_holidays h on h.day = d.day and h.region = 'NZ'
    left join lateral (
      select l.leave_type, l.half_day from public.leave_requests l
       where l.user_id = p.user_id and l.status = 'approved' and d.day between l.start_date and l.end_date
       limit 1) lv on true
    left join totals t on t.user_id = p.user_id and t.entry_date = d.day
    where p.is_active and p_to >= p_from and p_to - p_from <= 370
      and (p.user_id = auth.uid() or app.is_adviser())
  ),
  g2 as (
    select *, case when half then standard / 2 else standard end as due from grid
  )
  select
    g.user_id, g.display_name, g.day, g.is_weekend, g.holiday, g.leave, g.hours, g.due,
    case when g.is_weekend or g.holiday is not null or (g.leave is not null and not g.half) then g.hours
         else greatest(g.hours - g.due, 0) end,
    case
      when g.holiday is not null then
        'Public holiday' || case when g.hours > 0 then ' - worked ' || app.fmt_hours(g.hours) || ' hrs' else '' end
      when g.is_weekend then
        case when g.hours > 0 then 'Weekend' else '' end
      when g.leave is not null and not g.half then
        'On leave (' || g.leave || ')' || case when g.hours > 0 then ' - worked ' || app.fmt_hours(g.hours) || ' hrs' else '' end
      when g.hours < g.due then 'SHORT by ' || app.fmt_hours(g.due - g.hours) || ' hrs' || case when g.half then ' (half day ' || g.leave || ' leave)' else '' end
      when g.hours > g.due then 'Over by ' || app.fmt_hours(g.hours - g.due) || ' hrs' || case when g.half then ' (half day ' || g.leave || ' leave)' else '' end
      else 'OK - full day' || case when g.half then ' (half day ' || g.leave || ' leave)' else '' end
    end
  from g2 g
  order by g.display_name, g.day
$$;

revoke all on function public.hours_check(date, date)                 from public, anon;
revoke all on function public.working_days(date, date)                from public, anon;
revoke all on function public.leave_balances(date)                    from public, anon;
revoke all on function public.decide_leave(uuid, boolean, text)       from public, anon;
grant execute on function public.hours_check(date, date)                to authenticated;
grant execute on function public.working_days(date, date)               to authenticated;
grant execute on function public.leave_balances(date)                   to authenticated;
grant execute on function public.decide_leave(uuid, boolean, text)      to authenticated;
grant execute on function app.leave_year_start(uuid, date)              to authenticated;
grant execute on function app.leave_balance(uuid, public.leave_type, date) to authenticated;

-- ---------------------------------------------------------------- balance includes future bookings
create or replace function app.leave_balance(p_user uuid, p_type public.leave_type, p_on date)
returns numeric
language plpgsql stable security definer set search_path = ''
as $$
declare
  p        public.profiles%rowtype;
  s        public.settings%rowtype;
  ent      numeric;
  cap      numeric;
  bal      numeric;
  as_of    date;
  ev       record;
begin
  select * into p from public.profiles where user_id = p_user;
  select * into s from public.settings where id;
  if p_type = 'annual' then
    ent := coalesce(p.annual_leave_days, s.annual_leave_days); cap := null;
    bal := p.annual_opening_days;
  else
    ent := coalesce(p.sick_leave_days, s.sick_leave_days); cap := s.sick_leave_cap_days;
    bal := p.sick_opening_days;
  end if;

  as_of := p.balance_as_of;
  if as_of is null or bal is null then
    as_of := app.leave_year_start(p_user, p_on);
    bal   := ent;
  end if;

  for ev in
    -- accruals: each anniversary after the opening date, up to today
    select d as at, ent as delta from (
      select (case when p.start_date is null
                   then make_date(extract(year from p.balance_as_of)::int + n, 1, 1)
                   else (p.start_date + (n || ' years')::interval)::date end) as d
      from generate_series(0, 60) n
    ) a where d > as_of and d <= p_on and p.balance_as_of is not null and bal is not null
    union all
    -- deductions: every approved request from the opening date on, including future ones
    select l.start_date, -l.days from public.leave_requests l
     where l.user_id = p_user and l.leave_type = p_type and l.status = 'approved'
       and l.start_date >= as_of
    order by 1
  loop
    bal := bal + ev.delta;
    if cap is not null and ev.delta > 0 then bal := least(bal, cap); end if;
  end loop;
  return bal;
end $$;
