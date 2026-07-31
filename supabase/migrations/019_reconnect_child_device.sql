-- Reconnect an existing child to the same parent.
--
-- Scanning the normal pairing QR always creates a NEW child account, so a child
-- device that lost its local session ended up duplicated under the parent. A
-- reconnect session is bound to an existing child and hands that child's device
-- a fresh password so it can sign back into the same account.

alter table public.pairing_sessions
  add column if not exists mode text not null default 'pair';

do $$
begin
  alter table public.pairing_sessions
    add constraint pairing_sessions_mode_check
    check (mode in ('pair', 'reconnect'));
exception
  when duplicate_object then
    null;
end $$;

alter table public.pairing_sessions
  add column if not exists target_child_id uuid
    references public.profiles (id) on delete cascade;

comment on column public.pairing_sessions.mode is
  'pair = create a new child account; reconnect = re-attach an existing child.';

-- ---------------------------------------------------------------------------
-- RPC: parent creates a reconnect session for one of their children
-- ---------------------------------------------------------------------------

create or replace function public.create_reconnect_session(p_child_id uuid)
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
    from public.children c
    where c.profile_id = p_child_id
      and c.parent_id = auth.uid()
  ) then
    raise exception 'Child not found or you do not have permission to reconnect this device';
  end if;

  update public.pairing_sessions
  set status = 'cancelled'
  where parent_id = auth.uid()
    and status = 'pending';

  v_token := replace(gen_random_uuid()::text, '-', '')
    || replace(gen_random_uuid()::text, '-', '');
  v_expires := timezone('utc'::text, now()) + interval '15 minutes';

  insert into public.pairing_sessions (
    token,
    parent_id,
    expires_at,
    mode,
    target_child_id
  )
  values (v_token, auth.uid(), v_expires, 'reconnect', p_child_id)
  returning id into v_session_id;

  return jsonb_build_object(
    'session_id', v_session_id,
    'token', v_token,
    'expires_at', v_expires
  );
end;
$$;

revoke all on function public.create_reconnect_session(uuid) from public;
grant execute on function public.create_reconnect_session(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- RPC: child validates a scanned token (now reports the session mode)
-- ---------------------------------------------------------------------------

create or replace function public.validate_pairing_token(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  update public.pairing_sessions
  set status = 'expired'
  where status = 'pending'
    and expires_at <= timezone('utc'::text, now());

  select jsonb_build_object(
    'session_id', ps.id,
    'parent_id', ps.parent_id,
    'mode', ps.mode,
    'target_child_id', ps.target_child_id
  )
  into result
  from public.pairing_sessions ps
  where ps.token = p_token
    and ps.status = 'pending'
    and ps.expires_at > timezone('utc'::text, now());

  return result;
end;
$$;

revoke all on function public.validate_pairing_token(text) from public;
grant execute on function public.validate_pairing_token(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- RPC: child device redeems a reconnect token for sign-in credentials
-- ---------------------------------------------------------------------------

create or replace function public.redeem_reconnect_token(
  p_token text,
  p_device_key text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_session record;
  v_email text;
  v_password text;
begin
  update public.pairing_sessions
  set status = 'expired'
  where status = 'pending'
    and expires_at <= timezone('utc'::text, now());

  select ps.id, ps.parent_id, ps.target_child_id
  into v_session
  from public.pairing_sessions ps
  where ps.token = p_token
    and ps.status = 'pending'
    and ps.mode = 'reconnect'
    and ps.expires_at > timezone('utc'::text, now())
  for update;

  if v_session.id is null then
    raise exception 'Invalid or expired pairing session';
  end if;

  if not exists (
    select 1
    from public.children c
    where c.profile_id = v_session.target_child_id
      and c.parent_id = v_session.parent_id
  ) then
    raise exception 'This child is no longer linked to that parent';
  end if;

  select u.email
  into v_email
  from auth.users u
  where u.id = v_session.target_child_id;

  if v_email is null then
    raise exception 'Child account no longer exists';
  end if;

  -- Single-use rotation: the QR holder is the only party that learns this password.
  v_password := replace(gen_random_uuid()::text, '-', '')
    || replace(gen_random_uuid()::text, '-', '');

  update auth.users
  set
    encrypted_password = crypt(v_password, gen_salt('bf')),
    email_confirmed_at = coalesce(email_confirmed_at, timezone('utc'::text, now())),
    updated_at = timezone('utc'::text, now())
  where id = v_session.target_child_id;

  update public.pairing_sessions
  set
    status = 'claimed',
    child_id = v_session.target_child_id,
    device_key = coalesce(p_device_key, device_key),
    claimed_at = timezone('utc'::text, now())
  where id = v_session.id;

  return jsonb_build_object(
    'child_id', v_session.target_child_id,
    'parent_id', v_session.parent_id,
    'email', v_email,
    'password', v_password
  );
end;
$$;

revoke all on function public.redeem_reconnect_token(text, text) from public;
grant execute on function public.redeem_reconnect_token(text, text) to anon, authenticated;
