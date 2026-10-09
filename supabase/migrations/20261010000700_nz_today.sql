-- Database defaults used current_date, which is the UTC date. Before 1pm in
-- New Zealand that is still yesterday, so a case opened in the morning showed
-- the previous day. Defaults now use the date in Auckland.

create or replace function app.today()
returns date
language sql stable
set search_path = ''
as $$ select (now() at time zone 'Pacific/Auckland')::date $$;

grant execute on function app.today() to authenticated;

alter table public.cases    alter column opened_on set default app.today();
alter table public.invoices alter column issued_on set default app.today();
