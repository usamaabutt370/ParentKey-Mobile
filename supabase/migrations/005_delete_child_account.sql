-- Parent-initiated child account deletion (auth user + profile + children row + blocking data)

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

  delete from auth.users
  where id = target_child_id;
end;
$$;

revoke all on function public.delete_child_account(uuid) from public;
grant execute on function public.delete_child_account(uuid) to authenticated;
