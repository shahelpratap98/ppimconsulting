-- Starting data. Everything here can be changed later under Setup.

insert into public.settings (id) values (true) on conflict (id) do nothing;

insert into public.work_types (name, sort_order) values
  ('Initial consultation',             10),
  ('Client meeting or call',           20),
  ('Document collection and review',   30),
  ('Application preparation',          40),
  ('Lodgement',                        50),
  ('INZ / Home Affairs correspondence', 60),
  ('Client correspondence',            70),
  ('Research',                         80),
  ('Office admin',                     90),
  ('Training',                        100),
  ('Travel',                          110)
on conflict (name) do nothing;

-- Office time that isn't for a client goes against this internal case.
insert into public.cases (case_no, title, pathway, status, is_internal)
values ('OFFICE', 'Office & admin (not for a client)', 'internal', 'active', true)
on conflict (case_no) do nothing;

-- NZ national holidays plus Auckland Anniversary Day, on their observed
-- (Mondayised) dates. Fiji holidays can be added under Setup.
insert into public.public_holidays (day, region, name) values
  ('2026-01-01', 'NZ', 'New Year''s Day'),
  ('2026-01-02', 'NZ', 'Day after New Year''s Day'),
  ('2026-01-26', 'NZ', 'Auckland Anniversary Day'),
  ('2026-02-06', 'NZ', 'Waitangi Day'),
  ('2026-04-03', 'NZ', 'Good Friday'),
  ('2026-04-06', 'NZ', 'Easter Monday'),
  ('2026-04-27', 'NZ', 'ANZAC Day (observed)'),
  ('2026-06-01', 'NZ', 'King''s Birthday'),
  ('2026-07-10', 'NZ', 'Matariki'),
  ('2026-10-26', 'NZ', 'Labour Day'),
  ('2026-12-25', 'NZ', 'Christmas Day'),
  ('2026-12-28', 'NZ', 'Boxing Day (observed)'),
  ('2027-01-01', 'NZ', 'New Year''s Day'),
  ('2027-01-04', 'NZ', 'Day after New Year''s Day (observed)'),
  ('2027-02-01', 'NZ', 'Auckland Anniversary Day'),
  ('2027-02-08', 'NZ', 'Waitangi Day (observed)'),
  ('2027-03-26', 'NZ', 'Good Friday'),
  ('2027-03-29', 'NZ', 'Easter Monday'),
  ('2027-04-26', 'NZ', 'ANZAC Day (observed)'),
  ('2027-06-07', 'NZ', 'King''s Birthday'),
  ('2027-06-25', 'NZ', 'Matariki'),
  ('2027-10-25', 'NZ', 'Labour Day'),
  ('2027-12-27', 'NZ', 'Christmas Day (observed)'),
  ('2027-12-28', 'NZ', 'Boxing Day (observed)'),
  ('2028-01-03', 'NZ', 'New Year''s Day (observed)'),
  ('2028-01-04', 'NZ', 'Day after New Year''s Day (observed)'),
  ('2028-01-31', 'NZ', 'Auckland Anniversary Day'),
  ('2028-02-07', 'NZ', 'Waitangi Day (observed)'),
  ('2028-04-14', 'NZ', 'Good Friday'),
  ('2028-04-17', 'NZ', 'Easter Monday'),
  ('2028-04-25', 'NZ', 'ANZAC Day'),
  ('2028-06-05', 'NZ', 'King''s Birthday'),
  ('2028-07-14', 'NZ', 'Matariki'),
  ('2028-10-23', 'NZ', 'Labour Day'),
  ('2028-12-25', 'NZ', 'Christmas Day'),
  ('2028-12-26', 'NZ', 'Boxing Day')
on conflict (day, region) do nothing;
