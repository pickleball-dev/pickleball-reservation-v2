-- `profiles_select_own_or_staff` calls `is_staff()`.  The original function
-- queried `profiles` as the caller, which made Postgres apply that policy
-- again and recurse until it raised "stack depth limit exceeded" whenever an
-- administrator/staff member requested another person's profile.
--
-- SECURITY DEFINER makes this small, fixed query run as the function owner,
-- bypassing RLS only inside the helper.  auth.uid() still identifies the
-- signed-in caller, so it cannot grant staff access to an ordinary customer.
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid() and role in ('staff', 'admin')
  );
$$;

-- Do not allow arbitrary users to call the definer function outside the RLS
-- policies.  Authenticated and anonymous clients need it for policy checks.
grant execute on function public.is_staff() to anon, authenticated;
