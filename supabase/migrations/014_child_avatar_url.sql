-- Child profile photo collected during device setup

alter table public.children
  add column if not exists avatar_url text;

comment on column public.children.avatar_url is
  'Public URL of the child profile photo uploaded during setup.';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'child-avatars',
  'child-avatars',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Children can upload own avatar" on storage.objects;
drop policy if exists "Children can update own avatar" on storage.objects;
drop policy if exists "Children can delete own avatar" on storage.objects;
drop policy if exists "Anyone can view child avatars" on storage.objects;

create policy "Children can upload own avatar"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'child-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Children can update own avatar"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'child-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'child-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Children can delete own avatar"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'child-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Anyone can view child avatars"
  on storage.objects
  for select
  using (bucket_id = 'child-avatars');
