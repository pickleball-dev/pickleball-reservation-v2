-- Complete the public booking workflow without exposing a guest's data.
alter table public.reservations
  add column if not exists checkout_token uuid not null default uuid_generate_v4() unique;

-- 24/7 operating hours. This updates installations that already ran 0001.
insert into public.settings (key, value) values
  ('open_time', '"00:00"'),
  ('close_time', '"24:00"')
on conflict (key) do update set value = excluded.value;

-- The exclusion constraints only protect rows within their own tables. These
-- triggers also prevent a maintenance block from colliding with a live booking.
create or replace function public.prevent_reservation_block_overlap()
returns trigger language plpgsql as $$
begin
  if exists (select 1 from public.blocked_slots b where b.court_id = new.court_id
    and tstzrange(b.starts_at, b.ends_at, '[)') && tstzrange(new.starts_at, new.ends_at, '[)')) then
    raise exception 'Reservation overlaps a blocked court slot' using errcode = '23P01';
  end if;
  return new;
end;
$$;

create or replace function public.prevent_block_reservation_overlap()
returns trigger language plpgsql as $$
begin
  if exists (select 1 from public.reservations r where r.court_id = new.court_id
    and r.status in ('pending_payment', 'confirmed')
    and tstzrange(r.starts_at, r.ends_at, '[)') && tstzrange(new.starts_at, new.ends_at, '[)')) then
    raise exception 'Blocked slot overlaps an active reservation' using errcode = '23P01';
  end if;
  return new;
end;
$$;

create trigger reservations_prevent_block_overlap before insert or update of court_id, starts_at, ends_at on public.reservations
  for each row when (new.status in ('pending_payment', 'confirmed')) execute procedure public.prevent_reservation_block_overlap();
create trigger blocked_slots_prevent_reservation_overlap before insert or update of court_id, starts_at, ends_at on public.blocked_slots
  for each row execute procedure public.prevent_block_reservation_overlap();

-- Replace these example account details before accepting real payments.
insert into public.payment_methods (type, label, details, sort_order)
select 'gcash', 'GCash', '{"account_name":"Pickleball Club","account_number":"0917 000 0000"}', 1
where not exists (select 1 from public.payment_methods where type = 'gcash');
insert into public.payment_methods (type, label, details, sort_order)
select 'bank_transfer', 'Bank transfer', '{"bank":"Your Bank","account_name":"Pickleball Club","account_number":"0000-0000-0000"}', 2
where not exists (select 1 from public.payment_methods where type = 'bank_transfer');

insert into storage.buckets (id, name, public) values ('payment-proofs', 'payment-proofs', false)
on conflict (id) do nothing;

create unique index if not exists payments_one_pending_per_reservation
  on public.payments (reservation_id) where status = 'pending';
