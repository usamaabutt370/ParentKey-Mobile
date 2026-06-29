-- Child account setup: parent–child links and profile fields
-- Run after 001_profiles.sql in Supabase Dashboard → SQL Editor

-- ---------------------------------------------------------------------------
-- Profile columns used when a parent creates a child account
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column if not exists parent_id uuid references public.profiles (id) on delete set null,
  add column if not exists age smallint,
  add column if not exists avatar_id text;

alter table public.profiles
  drop constraint if exists profiles_parent_role_check;

alter table public.profiles
  add constraint profiles_parent_role_check
  check (
    (role = 'parent' and parent_id is null)
    or role = 'child'
  );

alter table public.profiles
  drop constraint if exists profiles_age_check;

alter table public.profiles
  add constraint profiles_age_check
  check (age is null or (age >= 1 and age <= 17));

alter table public.profiles
  drop constraint if exists profiles_avatar_id_check;

alter table public.profiles
  add constraint profiles_avatar_id_check
  check (
    avatar_id is null
    or avatar_id in (
      'fox', 'bear', 'panda', 'lion', 'koala', 'unicorn', 'frog', 'octopus'
    )
  );

create index if not exists profiles_parent_id_idx
  on public.profiles (parent_id)
  where role = 'child';

-- ---------------------------------------------------------------------------
-- Sync auth metadata → profiles on signup (parent_id, age, avatar_id)
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  parsed_parent_id uuid;
  parsed_age smallint;
begin
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

  insert into public.profiles (
    id,
    email,
    first_name,
    last_name,
    full_name,
    role,
    parent_id,
    age,
    avatar_id
  )
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'last_name',
    new.raw_user_meta_data ->> 'full_name',
    coalesce(new.raw_user_meta_data ->> 'role', 'parent'),
    parsed_parent_id,
    parsed_age,
    new.raw_user_meta_data ->> 'avatar_id'
  );

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Prevent users from changing immutable identity fields on their own profile
-- ---------------------------------------------------------------------------

create or replace function public.protect_profile_identity()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() = old.id then
    new.id := old.id;
    new.email := old.email;
    new.role := old.role;
    new.parent_id := old.parent_id;
  end if;

  return new;
end;
$$;

drop trigger if exists on_profiles_protect_identity on public.profiles;

create trigger on_profiles_protect_identity
  before update on public.profiles
  for each row
  execute function public.protect_profile_identity();

-- ---------------------------------------------------------------------------
-- Row level security: parents can read and manage their linked children
-- ---------------------------------------------------------------------------

create policy "Parents can view linked children"
  on public.profiles
  for select
  using (
    role = 'child'
    and parent_id = auth.uid()
  );

create policy "Parents can update linked children"
  on public.profiles
  for update
  using (
    role = 'child'
    and parent_id = auth.uid()
  );

-- ---------------------------------------------------------------------------
-- Backfill existing child profiles from auth.users metadata (if any)
-- ---------------------------------------------------------------------------

update public.profiles p
set
  parent_id = case
    when u.raw_user_meta_data ? 'parent_id'
      and (u.raw_user_meta_data ->> 'parent_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then (u.raw_user_meta_data ->> 'parent_id')::uuid
    else p.parent_id
  end,
  age = case
    when u.raw_user_meta_data ? 'age'
      and (u.raw_user_meta_data ->> 'age') ~ '^\d+$'
    then (u.raw_user_meta_data ->> 'age')::smallint
    else p.age
  end,
  avatar_id = coalesce(
    u.raw_user_meta_data ->> 'avatar_id',
    p.avatar_id
  )
from auth.users u
where p.id = u.id
  and p.role = 'child';
