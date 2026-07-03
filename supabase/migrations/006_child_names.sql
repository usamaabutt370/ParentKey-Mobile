-- Store child names on the children table (denormalized from profiles for easier querying)

alter table public.children
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists full_name text;

-- Backfill names from linked profiles
update public.children c
set
  first_name = p.first_name,
  last_name = p.last_name,
  full_name = coalesce(
    nullif(trim(p.full_name), ''),
    nullif(trim(concat_ws(' ', p.first_name, p.last_name)), '')
  )
from public.profiles p
where p.id = c.profile_id;

-- Keep children names in sync when a child profile is updated
create or replace function public.sync_child_names_from_profile()
returns trigger
language plpgsql
as $$
begin
  if new.role = 'child' then
    update public.children
    set
      first_name = new.first_name,
      last_name = new.last_name,
      full_name = coalesce(
        nullif(trim(new.full_name), ''),
        nullif(trim(concat_ws(' ', new.first_name, new.last_name)), '')
      ),
      updated_at = timezone('utc'::text, now())
    where profile_id = new.id;
  end if;

  return new;
end;
$$;

drop trigger if exists on_profile_sync_child_names on public.profiles;

create trigger on_profile_sync_child_names
  after update of first_name, last_name, full_name on public.profiles
  for each row
  execute function public.sync_child_names_from_profile();

-- Signup: store names on children row at creation
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
  end if;

  return new;
end;
$$;
