-- UrbanIQ core Supabase setup.
-- Run this in the Supabase SQL editor before using auth-protected admin tools.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, role)
  values (
    new.id,
    new.email,
    case
      when coalesce(new.raw_app_meta_data ->> 'role', '') = 'admin' then 'admin'
      else 'user'
    end
  )
  on conflict (id) do update
  set email = excluded.email;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.current_user_role()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    (select role from public.profiles where id = auth.uid()),
    'guest'
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select public.current_user_role() = 'admin';
$$;

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin"
on public.profiles
for select
using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles_update_admin_only" on public.profiles;
create policy "profiles_update_admin_only"
on public.profiles
for update
using (public.is_admin())
with check (role in ('user', 'admin'));

create table if not exists public.aqi_data (
  id bigint generated always as identity primary key,
  state text not null,
  zone text not null,
  date date not null,
  aqi numeric not null check (aqi >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.accident_data (
  id bigint generated always as identity primary key,
  state text not null,
  zone text not null,
  date date not null,
  accident_count integer not null check (accident_count >= 0),
  severity text not null default 'Low' check (severity in ('Low', 'Medium', 'High')),
  created_at timestamptz not null default now()
);

create table if not exists public.water_data (
  id bigint generated always as identity primary key,
  zone text not null,
  ph numeric not null check (ph >= 0 and ph <= 14),
  hardness numeric not null default 185 check (hardness >= 0),
  solids numeric not null check (solids >= 0),
  chloramines numeric not null default 3.2 check (chloramines >= 0),
  sulfate numeric not null default 310 check (sulfate >= 0),
  conductivity numeric not null default 420 check (conductivity >= 0),
  organic_carbon numeric not null default 11.8 check (organic_carbon >= 0),
  temperature numeric not null default 24.4 check (temperature >= -5 and temperature <= 60),
  dissolved_oxygen numeric not null default 7.6 check (dissolved_oxygen >= 0),
  turbidity numeric not null check (turbidity >= 0),
  potability text not null,
  created_at timestamptz not null default now()
);

alter table public.water_data add column if not exists hardness numeric not null default 185 check (hardness >= 0);
alter table public.water_data add column if not exists chloramines numeric not null default 3.2 check (chloramines >= 0);
alter table public.water_data add column if not exists sulfate numeric not null default 310 check (sulfate >= 0);
alter table public.water_data add column if not exists conductivity numeric not null default 420 check (conductivity >= 0);
alter table public.water_data add column if not exists organic_carbon numeric not null default 11.8 check (organic_carbon >= 0);
alter table public.water_data add column if not exists temperature numeric not null default 24.4 check (temperature >= -5 and temperature <= 60);
alter table public.water_data add column if not exists dissolved_oxygen numeric not null default 7.6 check (dissolved_oxygen >= 0);

alter table public.aqi_data enable row level security;
alter table public.accident_data enable row level security;
alter table public.water_data enable row level security;

drop policy if exists "aqi_data_public_read" on public.aqi_data;
create policy "aqi_data_public_read"
on public.aqi_data
for select
using (true);

drop policy if exists "accident_data_public_read" on public.accident_data;
create policy "accident_data_public_read"
on public.accident_data
for select
using (true);

drop policy if exists "water_data_public_read" on public.water_data;
create policy "water_data_public_read"
on public.water_data
for select
using (true);

drop policy if exists "aqi_data_admin_insert" on public.aqi_data;
create policy "aqi_data_admin_insert"
on public.aqi_data
for insert
with check (public.is_admin());

drop policy if exists "accident_data_admin_insert" on public.accident_data;
create policy "accident_data_admin_insert"
on public.accident_data
for insert
with check (public.is_admin());

drop policy if exists "water_data_admin_insert" on public.water_data;
create policy "water_data_admin_insert"
on public.water_data
for insert
with check (public.is_admin());

drop policy if exists "aqi_data_admin_update" on public.aqi_data;
create policy "aqi_data_admin_update"
on public.aqi_data
for update
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "accident_data_admin_update" on public.accident_data;
create policy "accident_data_admin_update"
on public.accident_data
for update
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "water_data_admin_update" on public.water_data;
create policy "water_data_admin_update"
on public.water_data
for update
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "aqi_data_admin_delete" on public.aqi_data;
create policy "aqi_data_admin_delete"
on public.aqi_data
for delete
using (public.is_admin());

drop policy if exists "accident_data_admin_delete" on public.accident_data;
create policy "accident_data_admin_delete"
on public.accident_data
for delete
using (public.is_admin());

drop policy if exists "water_data_admin_delete" on public.water_data;
create policy "water_data_admin_delete"
on public.water_data
for delete
using (public.is_admin());

create index if not exists aqi_data_state_zone_date_idx on public.aqi_data (state, zone, date);
create index if not exists accident_data_state_zone_date_idx on public.accident_data (state, zone, date);
create index if not exists water_data_zone_idx on public.water_data (zone);

-- Promote an existing user after signup:
-- update public.profiles set role = 'admin' where email = 'admin@example.com';
