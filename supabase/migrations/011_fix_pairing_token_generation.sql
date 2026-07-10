-- Fix pairing token generation: gen_random_bytes requires pgcrypto extension.
-- Use built-in gen_random_uuid() instead.

create or replace function public.create_pairing_session()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token text;
  v_expires timestamptz;
  v_session_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'parent'
  ) then
    raise exception 'Only parents can create pairing sessions';
  end if;

  update public.pairing_sessions
  set status = 'cancelled'
  where parent_id = auth.uid()
    and status = 'pending';

  v_token := replace(gen_random_uuid()::text, '-', '')
    || replace(gen_random_uuid()::text, '-', '');
  v_expires := timezone('utc'::text, now()) + interval '15 minutes';

  insert into public.pairing_sessions (token, parent_id, expires_at)
  values (v_token, auth.uid(), v_expires)
  returning id into v_session_id;

  return jsonb_build_object(
    'session_id', v_session_id,
    'token', v_token,
    'expires_at', v_expires
  );
end;
$$;

revoke all on function public.create_pairing_session() from public;
grant execute on function public.create_pairing_session() to authenticated;
