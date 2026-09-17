-- ============================================================================
-- Pickleball Court Reservation System — Initial Schema
-- ============================================================================
-- Run this in the Supabase SQL editor, or via `supabase db push`.
-- Order matters: extensions -> enums -> tables -> constraints -> RLS -> jobs.

-- ----------------------------------------------------------------------------
-- 0. Extensions
-- ----------------------------------------------------------------------------
create extension if not exists "uuid-ossp";
create extension if not exists "btree_gist"; -- required for the EXCLUDE constraint below

-- ----------------------------------------------------------------------------
-- 1. Enums
-- ----------------------------------------------------------------------------
create type user_role as enum ('customer', 'staff', 'admin');
create type court_status as enum ('active', 'maintenance', 'disabled');
create type reservation_status as enum ('pending_payment', 'confirmed', 'cancelled', 'expired');
create type payment_status as enum ('pending', 'verified', 'rejected');
create type payment_method_type as enum ('gcash', 'bank_transfer', 'online');
create type block_reason as enum ('maintenance', 'private_event', 'other');

-- ----------------------------------------------------------------------------
-- 2. profiles  (1:1 with auth.users)
-- ----------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text,
  role user_role not null default 'customer',
  created_at timestamptz not null default now()
);

-- Auto-create a profile row whenever a new auth user signs up.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ----------------------------------------------------------------------------
-- 3. courts
-- ----------------------------------------------------------------------------
create table public.courts (
  id uuid primary key default uuid_generate_v4(),
  name text not null,                 -- e.g. "Court 1"
  sort_order int not null default 0,
  hourly_rate numeric(10,2) not null check (hourly_rate >= 0),
  status court_status not null default 'active',
  created_at timestamptz not null default now()
);

insert into public.courts (name, sort_order, hourly_rate) values
  ('Court 1', 1, 350),
  ('Court 2', 2, 350),
  ('Court 3', 3, 350),
  ('Court 4', 4, 350),
  ('Court 5', 5, 350);

-- ----------------------------------------------------------------------------
-- 4. settings  (key/value store for business config)
-- ----------------------------------------------------------------------------
create table public.settings (
  key text primary key,
  value jsonb not null
);

insert into public.settings (key, value) values
  ('business_name', '"Pickleball Club"'),
  ('hold_duration_minutes', '15'),
  ('open_time', '"00:00"'),
  ('close_time', '"24:00"');

-- ----------------------------------------------------------------------------
-- 5. payment_methods (admin-configurable GCash / bank details shown at checkout)
-- ----------------------------------------------------------------------------
create table public.payment_methods (
  id uuid primary key default uuid_generate_v4(),
  type payment_method_type not null,
  label text not null,           -- "GCash - Business Name"
  details jsonb not null,        -- { "account_name": "...", "account_number": "...", "bank": "..." }
  is_active boolean not null default true,
  sort_order int not null default 0
);

-- ----------------------------------------------------------------------------
-- 6. reservations
-- ----------------------------------------------------------------------------
create table public.reservations (
  id uuid primary key default uuid_generate_v4(),
  booking_number text not null unique,   -- e.g. PB-260910-0042
  court_id uuid not null references public.courts(id) on delete restrict,
  customer_id uuid references public.profiles(id) on delete set null,
  guest_name text,               -- for reservations made without an account
  guest_phone text,
  starts_at timestamptz not null,
  ends_at timestamptz not null check (ends_at > starts_at),
  -- generated column used only by the EXCLUDE constraint below
  during tstzrange generated always as (tstzrange(starts_at, ends_at, '[)')) stored,
  total_amount numeric(10,2) not null check (total_amount >= 0),
  status reservation_status not null default 'pending_payment',
  hold_expires_at timestamptz,   -- null once confirmed/cancelled/expired
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- THE CORE PROTECTION: two reservations on the same court can never have
-- overlapping time ranges, as long as both are still "live"
-- (pending_payment or confirmed). This is enforced by Postgres itself at
-- the moment of INSERT/UPDATE — it is not possible for application code,
-- a race condition, or a bug in the frontend to create an overlapping
-- double-booking. Expired/cancelled reservations are excluded from the
-- check via the partial predicate so freed-up slots can be rebooked.
alter table public.reservations
  add constraint reservations_no_overlap
  exclude using gist (
    court_id with =,
    during with &&
  )
  where (status in ('pending_payment', 'confirmed'));

create index reservations_court_time_idx on public.reservations (court_id, starts_at);
create index reservations_customer_idx on public.reservations (customer_id);
create index reservations_status_hold_idx on public.reservations (status, hold_expires_at)
  where status = 'pending_payment';

-- ----------------------------------------------------------------------------
-- 7. payments
-- ----------------------------------------------------------------------------
create table public.payments (
  id uuid primary key default uuid_generate_v4(),
  reservation_id uuid not null references public.reservations(id) on delete cascade,
  method payment_method_type not null,
  reference_number text,
  proof_url text,                -- Supabase Storage path to uploaded screenshot
  amount numeric(10,2) not null,
  status payment_status not null default 'pending',
  verified_by uuid references public.profiles(id),
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

create index payments_reservation_idx on public.payments (reservation_id);

-- ----------------------------------------------------------------------------
-- 8. blocked_slots  (admin-blocked time ranges: maintenance, private events)
-- ----------------------------------------------------------------------------
create table public.blocked_slots (
  id uuid primary key default uuid_generate_v4(),
  court_id uuid not null references public.courts(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null check (ends_at > starts_at),
  during tstzrange generated always as (tstzrange(starts_at, ends_at, '[)')) stored,
  reason block_reason not null default 'maintenance',
  note text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

-- Blocked slots also can't overlap each other on the same court.
alter table public.blocked_slots
  add constraint blocked_slots_no_overlap
  exclude using gist (court_id with =, during with &&);

create index blocked_slots_court_time_idx on public.blocked_slots (court_id, starts_at);

-- ----------------------------------------------------------------------------
-- 9. updated_at maintenance trigger
-- ----------------------------------------------------------------------------
create function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger reservations_set_updated_at
  before update on public.reservations
  for each row execute procedure public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 10. Booking number generator (PB-YYMMDD-NNNN)
-- ----------------------------------------------------------------------------
create sequence if not exists public.booking_number_seq;

create function public.generate_booking_number()
returns text language sql as $$
  select 'PB-' || to_char(now(), 'YYMMDD') || '-' ||
         lpad(nextval('public.booking_number_seq')::text, 4, '0');
$$;

-- ----------------------------------------------------------------------------
-- 11. Expire stale holds (called by a scheduled Edge Function / pg_cron)
-- ----------------------------------------------------------------------------
create function public.expire_stale_holds()
returns void language sql as $$
  update public.reservations
     set status = 'expired', hold_expires_at = null
   where status = 'pending_payment'
     and hold_expires_at < now();
$$;

-- Requires the pg_cron extension (available on Supabase). Runs every minute.
-- select cron.schedule('expire-holds', '* * * * *', $$select public.expire_stale_holds();$$);

-- ----------------------------------------------------------------------------
-- 12. Row Level Security
-- ----------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.courts enable row level security;
alter table public.settings enable row level security;
alter table public.payment_methods enable row level security;
alter table public.reservations enable row level security;
alter table public.payments enable row level security;
alter table public.blocked_slots enable row level security;

-- Helper: is the current user staff or admin?
create function public.is_staff()
returns boolean language sql stable as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('staff', 'admin')
  );
$$;

-- profiles: users see/edit their own row; staff see all.
create policy "profiles_select_own_or_staff" on public.profiles
  for select using (id = auth.uid() or public.is_staff());
create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid());

-- courts: public read; only staff can write.
create policy "courts_public_read" on public.courts
  for select using (true);
create policy "courts_staff_write" on public.courts
  for all using (public.is_staff()) with check (public.is_staff());

-- settings & payment_methods: public read (needed at checkout), staff write.
create policy "settings_public_read" on public.settings
  for select using (true);
create policy "settings_staff_write" on public.settings
  for all using (public.is_staff()) with check (public.is_staff());

create policy "payment_methods_public_read" on public.payment_methods
  for select using (is_active or public.is_staff());
create policy "payment_methods_staff_write" on public.payment_methods
  for all using (public.is_staff()) with check (public.is_staff());

-- reservations: customers see their own; staff see everything.
-- Availability (which slots are taken) is exposed via a separate public
-- view below, so anonymous visitors never touch this table directly.
create policy "reservations_select_own_or_staff" on public.reservations
  for select using (customer_id = auth.uid() or public.is_staff());
create policy "reservations_insert_own_or_guest" on public.reservations
  for insert with check (customer_id = auth.uid() or customer_id is null);
create policy "reservations_update_own_or_staff" on public.reservations
  for update using (customer_id = auth.uid() or public.is_staff());

-- payments: customers see/insert payments on their own reservations; staff manage all.
create policy "payments_select_own_or_staff" on public.payments
  for select using (
    public.is_staff() or exists (
      select 1 from public.reservations r
      where r.id = reservation_id and r.customer_id = auth.uid()
    )
  );
create policy "payments_insert_own_or_staff" on public.payments
  for insert with check (
    public.is_staff() or exists (
      select 1 from public.reservations r
      where r.id = reservation_id and r.customer_id = auth.uid()
    )
  );
create policy "payments_update_staff_only" on public.payments
  for update using (public.is_staff());

-- blocked_slots: public read (so the UI can show "unavailable"), staff write.
create policy "blocked_slots_public_read" on public.blocked_slots
  for select using (true);
create policy "blocked_slots_staff_write" on public.blocked_slots
  for all using (public.is_staff()) with check (public.is_staff());

-- ----------------------------------------------------------------------------
-- 13. Public availability view
-- ----------------------------------------------------------------------------
-- Exposes only what an anonymous visitor needs (court + time range) without
-- leaking customer names, phone numbers, or payment info.
create view public.court_availability as
  select court_id, starts_at, ends_at, 'reservation'::text as kind
  from public.reservations
  where status in ('pending_payment', 'confirmed')
  union all
  select court_id, starts_at, ends_at, 'blocked'::text as kind
  from public.blocked_slots;

grant select on public.court_availability to anon, authenticated;
