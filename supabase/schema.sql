-- Crest Tours and Safaris: database schema
-- Run this entire file in Supabase Dashboard > SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_crest_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admin_users where user_id = auth.uid());
$$;

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null check (char_length(trim(customer_name)) between 2 and 80),
  phone text,
  email text,
  destination text not null check (char_length(trim(destination)) between 2 and 120),
  start_date date,
  travellers integer not null check (travellers between 1 and 30),
  experience text,
  message text,
  status text not null default 'pending' check (status in ('pending','confirmed','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Add/validate contact fields on both new and existing installations.
alter table public.bookings add column if not exists phone text;

alter table public.bookings drop constraint if exists bookings_phone_required_check;
alter table public.bookings add constraint bookings_phone_required_check
  check (phone is null or char_length(trim(phone)) between 7 and 24) not valid;

alter table public.bookings drop constraint if exists bookings_email_format_check;
alter table public.bookings add constraint bookings_email_format_check
  check (email is null or (char_length(email) <= 120 and email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$')) not valid;

alter table public.bookings drop constraint if exists bookings_message_length_check;
alter table public.bookings add constraint bookings_message_length_check
  check (message is null or char_length(message) <= 1200) not valid;

create table if not exists public.tour_packages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 120),
  description text,
  price_amount numeric(14,2) not null default 0 check (price_amount >= 0),
  currency text not null default 'UGX' check (currency = 'UGX'),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete restrict,
  amount numeric(14,2) not null check (amount > 0),
  currency text not null default 'UGX' check (currency = 'UGX'),
  method text not null check (method in ('cash','bank_transfer','mobile_money','other')),
  reference text,
  paid_at timestamptz not null default now(),
  recorded_by uuid references auth.users(id)
);

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists bookings_updated_at on public.bookings;
create trigger bookings_updated_at before update on public.bookings
for each row execute function public.set_updated_at();
drop trigger if exists packages_updated_at on public.tour_packages;
create trigger packages_updated_at before update on public.tour_packages
for each row execute function public.set_updated_at();

alter table public.admin_users enable row level security;
alter table public.bookings enable row level security;
alter table public.tour_packages enable row level security;
alter table public.payments enable row level security;

drop policy if exists "Admins can read their own admin record" on public.admin_users;
create policy "Admins can read their own admin record" on public.admin_users
for select to authenticated using (user_id = auth.uid());

-- Public submissions are accepted only by the Turnstile-verifying Edge Function.
drop policy if exists "Anyone can submit a booking request" on public.bookings;
revoke insert on public.bookings from anon;

drop policy if exists "Admins can manage bookings" on public.bookings;
create policy "Admins can manage bookings" on public.bookings
for all to authenticated using (public.is_crest_admin())
with check (public.is_crest_admin());

drop policy if exists "Visitors can view active packages" on public.tour_packages;
create policy "Visitors can view active packages" on public.tour_packages
for select to anon, authenticated using (is_active = true);

drop policy if exists "Admins can manage packages" on public.tour_packages;
create policy "Admins can manage packages" on public.tour_packages
for all to authenticated using (public.is_crest_admin())
with check (public.is_crest_admin());

drop policy if exists "Admins can manage payment records" on public.payments;
create policy "Admins can manage payment records" on public.payments
for all to authenticated using (public.is_crest_admin())
with check (public.is_crest_admin());

grant usage on schema public to anon, authenticated;
grant select on public.tour_packages to anon, authenticated;
grant select, insert, update, delete on public.bookings, public.tour_packages, public.payments to authenticated;
grant select on public.admin_users to authenticated;
