-- A 15-minute hold is the deadline for submitting a payment proof.  When the
-- deadline passes, release the court and remove any unreviewed payment from
-- the staff payment queue automatically.  The rejected payment row remains
-- in the database as an audit record.
create or replace function public.expire_stale_holds()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Reject first, while the related reservation still identifies the exact
  -- expired hold.  PaymentsPage only lists `pending`, so these vanish there.
  update public.payments p
     set status = 'rejected'
    from public.reservations r
   where p.reservation_id = r.id
     and p.status = 'pending'
     and r.status = 'pending_payment'
     and r.hold_expires_at < now();

  update public.reservations
     set status = 'expired', hold_expires_at = null
   where status = 'pending_payment'
     and hold_expires_at < now();
end;
$$;
