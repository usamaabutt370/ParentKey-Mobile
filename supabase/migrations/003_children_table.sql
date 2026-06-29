-- Dedicated children table linked to profiles (one child row per child profile)
-- Run after 002_child_accounts.sql

-- ---------------------------------------------------------------------------
-- children table
-- ---------------------------------------------------------------------------

create table if not exists public.children (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  parent_id uuid not null references public.profiles (id) on delete cascade,
  age smallint,
  avatar_id text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  constraint children_age_check check (age is null or (age >= 1 and age <= 17)),
  constraint children_avatar_id_check check (
    avatar_id is null
    or avatar_id in (
      'fox', 'bear', 'panda', 'lion', 'koala', 'unicorn', 'frog', 'octopus'
    )
  ),
  constraint children_parent_not_self check (profile_id <> parent_id)
);

create index if not exists children_parent_id_idx
  on public.children (parent_id);

-- ---------------------------------------------------------------------------
-- Migrate existing child data from profiles → children
-- ---------------------------------------------------------------------------

insert into public.children (profile_id, parent_id, age, avatar_id, created_at, updated_at)
select
  p.id,
  p.parent_id,
  p.age,
  p.avatar_id,
  p.created_at,
  p.updated_at
from public.profiles p
where p.role = 'child'
  and p.parent_id is not null
on conflict (profile_id) do nothing;

-- Backfill from auth metadata when profiles columns were never populated
insert into public.children (profile_id, parent_id, age, avatar_id)
select
  p.id,
  (u.raw_user_meta_data ->> 'parent_id')::uuid,
  case
    when u.raw_user_meta_data ? 'age'
      and (u.raw_user_meta_data ->> 'age') ~ '^\d+$'
    then (u.raw_user_meta_data ->> 'age')::smallint
    else null
  end,
  u.raw_user_meta_data ->> 'avatar_id'
from public.profiles p
join auth.users u on u.id = p.id
where p.role = 'child'
  and u.raw_user_meta_data ? 'parent_id'
  and (u.raw_user_meta_data ->> 'parent_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and not exists (
    select 1 from public.children c where c.profile_id = p.id
  )
on conflict (profile_id) do nothing;

-- ---------------------------------------------------------------------------
-- Remove child-specific columns from profiles
-- ---------------------------------------------------------------------------

drop policy if exists "Parents can view linked children" on public.profiles;
drop policy if exists "Parents can update linked children" on public.profiles;

alter table public.profiles
  drop constraint if exists profiles_parent_role_check;

alter table public.profiles
  drop constraint if exists profiles_age_check;

alter table public.profiles
  drop constraint if exists profiles_avatar_id_check;

drop index if exists public.profiles_parent_id_idx;

alter table public.profiles
  drop column if exists parent_id,
  drop column if exists age,
  drop column if exists avatar_id;

alter table public.profiles
  add constraint profiles_parent_role_check
  check (role in ('parent', 'child'));

-- ---------------------------------------------------------------------------
-- Signup: create profile + children row for child accounts
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
begin
  user_role := coalesce(new.raw_user_meta_data ->> 'role', 'parent');

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
    role
  )
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'last_name',
    new.raw_user_meta_data ->> 'full_name',
    user_role
  );

  if user_role = 'child' and parsed_parent_id is not null then
    insert into public.children (profile_id, parent_id, age, avatar_id)
    values (
      new.id,
      parsed_parent_id,
      parsed_age,
      new.raw_user_meta_data ->> 'avatar_id'
    );
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Profile identity protection (no parent_id on profiles anymore)
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
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- children: RLS + updated_at
-- ---------------------------------------------------------------------------

alter table public.children enable row level security;

create policy "Children can view own child record"
  on public.children
  for select
  using (profile_id = auth.uid());

create policy "Parents can view their children"
  on public.children
  for select
  using (parent_id = auth.uid());

create policy "Parents can update their children"
  on public.children
  for update
  using (parent_id = auth.uid());

drop trigger if exists on_children_updated on public.children;

create trigger on_children_updated
  before update on public.children
  for each row
  execute function public.handle_updated_at();

-- Parents can read linked child profiles (name, email) via join queries
create policy "Parents can view child profiles"
  on public.profiles
  for select
  using (
    role = 'child'
    and exists (
      select 1
      from public.children c
      where c.profile_id = profiles.id
        and c.parent_id = auth.uid()
    )
  );
