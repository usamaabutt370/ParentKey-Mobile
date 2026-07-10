-- QR device pairing: parent creates a session, child scans to link without login

-- ---------------------------------------------------------------------------
-- pairing_sessions
-- ---------------------------------------------------------------------------

create table if not exists public.pairing_sessions (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  parent_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'claimed', 'expired', 'cancelled')),
  child_id uuid references public.profiles (id) on delete set null,
  device_key text,
  expires_at timestamptz not null,
  claimed_at timestamptz,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists pairing_sessions_parent_id_idx
  on public.pairing_sessions (parent_id);

create index if not exists pairing_sessions_pending_token_idx
  on public.pairing_sessions (token)
  where status = 'pending';

alter table public.pairing_sessions enable row level security;

create policy "Parents manage own pairing sessions"
  on public.pairing_sessions
  for all
  using (parent_id = auth.uid())
  with check (parent_id = auth.uid());

-- ---------------------------------------------------------------------------
-- RPC: parent creates a pairing session
-- ---------------------------------------------------------------------------

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

-- ---------------------------------------------------------------------------
-- RPC: child validates a scanned token before signup
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
    'parent_id', ps.parent_id
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
-- Signup: claim pairing session when child account is created via QR
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  user_role text;
  parsed_parent_id uuid;
  parsed_age smallint;
  parsed_first_name text;
  parsed_last_name text;
  parsed_full_name text;
  parsed_pairing_session_id uuid;
  parsed_device_key text;
begin
  user_role := coalesce(new.raw_user_meta_data ->> 'role', 'parent');
  parsed_first_name := new.raw_user_meta_data ->> 'first_name';
  parsed_last_name := new.raw_user_meta_data ->> 'last_name';
  parsed_full_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(trim(concat_ws(' ', parsed_first_name, parsed_last_name)), '')
  );

  if new.raw_user_meta_data ? 'parent_id'
    and (new.raw_user_meta_data ->> 'parent_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  then
    parsed_parent_id := (new.raw_user_meta_data ->> 'parent_id')::uuid;
  else
    parsed_parent_id := null;
  end if;

  if new.raw_user_meta_data ? 'age'
    and (new.raw_user_meta_data ->> 'age') ~ '^\d+$'
  then
    parsed_age := (new.raw_user_meta_data ->> 'age')::smallint;
  else
    parsed_age := null;
  end if;

  if new.raw_user_meta_data ? 'pairing_session_id'
    and (new.raw_user_meta_data ->> 'pairing_session_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  then
    parsed_pairing_session_id :=
      (new.raw_user_meta_data ->> 'pairing_session_id')::uuid;
  else
    parsed_pairing_session_id := null;
  end if;

  parsed_device_key := new.raw_user_meta_data ->> 'device_key';

  insert into public.profiles (
    id,
    email,
    first_name,
    last_name,
    full_name,
    role
  )
  values (
    new.id,
    new.email,
    parsed_first_name,
    parsed_last_name,
    parsed_full_name,
    user_role
  );

  if user_role = 'child' and parsed_parent_id is not null then
    insert into public.children (
      profile_id,
      parent_id,
      first_name,
      last_name,
      full_name,
      age,
      avatar_id
    )
    values (
      new.id,
      parsed_parent_id,
      parsed_first_name,
      parsed_last_name,
      parsed_full_name,
      parsed_age,
      new.raw_user_meta_data ->> 'avatar_id'
    );

    if parsed_pairing_session_id is not null then
      update public.pairing_sessions
      set
        status = 'claimed',
        child_id = new.id,
        device_key = parsed_device_key,
        claimed_at = timezone('utc'::text, now())
      where id = parsed_pairing_session_id
        and parent_id = parsed_parent_id
        and status = 'pending'
        and expires_at > timezone('utc'::text, now());

      if not found then
        raise exception 'Invalid or expired pairing session';
      end if;
    end if;
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Realtime: parent listens for pairing completion
-- ---------------------------------------------------------------------------

do $$
begin
  alter publication supabase_realtime add table public.pairing_sessions;
exception
  when duplicate_object then
    null;
end $$;
