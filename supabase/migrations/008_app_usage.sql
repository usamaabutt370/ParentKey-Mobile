-- Per-app daily usage synced from child Android devices

create table if not exists public.child_app_usage_daily (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.profiles (id) on delete cascade,
  device_id uuid not null references public.child_devices (id) on delete cascade,
  package_name text not null,
  app_name text not null,
  usage_date date not null,
  foreground_seconds integer not null default 0 check (foreground_seconds >= 0),
  synced_at timestamptz not null default timezone('utc'::text, now()),
  constraint child_app_usage_daily_device_package_date unique (device_id, package_name, usage_date)
);

create index if not exists child_app_usage_daily_child_date_idx
  on public.child_app_usage_daily (child_id, usage_date desc);

create index if not exists child_app_usage_daily_child_package_idx
  on public.child_app_usage_daily (child_id, package_name);

alter table public.child_app_usage_daily enable row level security;

create policy "Children manage own app usage"
  on public.child_app_usage_daily
  for all
  using (child_id = auth.uid())
  with check (child_id = auth.uid());

create policy "Parents view child app usage"
  on public.child_app_usage_daily
  for select
  using (
    exists (
      select 1
      from public.children c
      where c.profile_id = child_app_usage_daily.child_id
        and c.parent_id = auth.uid()
    )
  );
