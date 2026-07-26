-- Self-service account deletion for parent and child apps (App Store / Play requirement).
-- Parent deletion also removes all linked child auth users and cascaded data.
-- Child avatar objects in storage are cleaned best-effort before auth.users delete.

create or replace function public.delete_child_avatar_objects(target_child_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from storage.objects
  where bucket_id = 'child-avatars'
    and (storage.foldername(name))[1] = target_child_id::text;
exception
  when others then
    -- Storage cleanup is best-effort; account deletion must still proceed.
    null;
end;
$$;

create or replace function public.delete_child_account(target_child_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not exists (
    select 1
    from public.children c
    where c.profile_id = target_child_id
      and c.parent_id = auth.uid()
  ) then
    raise exception 'Child not found or you do not have permission to delete this account';
  end if;

  perform public.delete_child_avatar_objects(target_child_id);

  delete from auth.users
  where id = target_child_id;
end;
$$;

create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid := auth.uid();
  caller_role text;
  child_record record;
begin
  if caller_id is null then
    raise exception 'Not authenticated';
  end if;

  select p.role
  into caller_role
  from public.profiles p
  where p.id = caller_id;

  if caller_role is null then
    raise exception 'Profile not found';
  end if;

  if caller_role = 'parent' then
    for child_record in
      select c.profile_id
      from public.children c
      where c.parent_id = caller_id
    loop
      perform public.delete_child_avatar_objects(child_record.profile_id);
      delete from auth.users
      where id = child_record.profile_id;
    end loop;

    delete from auth.users
    where id = caller_id;
  elsif caller_role = 'child' then
    perform public.delete_child_avatar_objects(caller_id);

    delete from auth.users
    where id = caller_id;
  else
    raise exception 'Unsupported account role';
  end if;
end;
$$;

revoke all on function public.delete_child_avatar_objects(uuid) from public;
revoke all on function public.delete_own_account() from public;
grant execute on function public.delete_own_account() to authenticated;

-- Keep parent-initiated child delete available
revoke all on function public.delete_child_account(uuid) from public;
grant execute on function public.delete_child_account(uuid) to authenticated;
