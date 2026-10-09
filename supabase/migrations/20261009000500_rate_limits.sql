-- Shared rate-limit counters, so limits hold across every server instance.
-- Only the server (service role) can touch this; signed-in users and the
-- public key cannot read, write or call it. Keys are hashed by the app, so no
-- email address or IP is stored here in the clear.

create table if not exists public.rate_limits (
  key           text        not null,
  window_start  timestamptz not null,
  count         integer     not null default 1,
  primary key (key, window_start)
);

alter table public.rate_limits enable row level security;   -- and no policies: nobody gets in through the API
revoke all on public.rate_limits from anon, authenticated;

-- Count one hit for p_key in the current fixed window; true = still allowed.
create or replace function public.rate_limit_hit(p_key text, p_limit integer, p_window_seconds integer)
returns boolean
language plpgsql security definer set search_path = ''
as $$
declare
  v_window timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  v_count  integer;
begin
  insert into public.rate_limits as r (key, window_start)
  values (left(p_key, 200), v_window)
  on conflict (key, window_start) do update set count = r.count + 1
  returning r.count into v_count;

  -- tidy up roughly once every hundred calls
  if random() < 0.01 then
    delete from public.rate_limits where window_start < now() - interval '1 day';
  end if;

  return v_count <= p_limit;
end $$;

revoke all on function public.rate_limit_hit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.rate_limit_hit(text, integer, integer) to service_role;
