-- Expired holds are marked expired (not deleted) so the business retains an
-- audit trail while the exclusion constraint immediately frees the court.
create extension if not exists pg_cron with schema extensions;

select cron.schedule(
  'expire-pickleball-holds',
  '* * * * *',
  'select public.expire_stale_holds();'
)
where not exists (
  select 1 from cron.job where jobname = 'expire-pickleball-holds'
);

-- Keep payment approval and reservation confirmation in one transaction. This
-- prevents a late payment from confirming a slot that was already released.
create or replace function public.review_payment(p_payment_id uuid, p_verifier_id uuid, p_approve boolean)
returns void language plpgsql security definer set search_path = public as $$
declare p public.payments%rowtype;
begin
  select * into p from public.payments where id = p_payment_id for update;
  if not found or p.status <> 'pending' then raise exception 'Payment is no longer pending'; end if;
  if p_approve then
    update public.reservations set status = 'confirmed', hold_expires_at = null
      where id = p.reservation_id and status = 'pending_payment' and hold_expires_at > now();
    if not found then raise exception 'The reservation hold has expired'; end if;
    update public.payments set status = 'verified', verified_by = p_verifier_id, verified_at = now() where id = p.id;
  else
    update public.reservations set status = 'cancelled', hold_expires_at = null where id = p.reservation_id and status = 'pending_payment';
    update public.payments set status = 'rejected', verified_by = p_verifier_id, verified_at = now() where id = p.id;
  end if;
end;
$$;
