-- Per-app hourly usage synced from child Android devices (time-of-day charts)

create table if not exists public.child_app_usage_hourly (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.profiles (id) on delete cascade,
  device_id uuid not null references public.child_devices (id) on delete cascade,
  package_name text not null,
  app_name text not null,
  usage_date date not null,
  hour smallint not null check (hour >= 0 and hour <= 23),
  foreground_seconds integer not null default 0 check (foreground_seconds >= 0),
  synced_at timestamptz not null default timezone('utc'::text, now()),
  constraint child_app_usage_hourly_device_package_date_hour
    unique (device_id, package_name, usage_date, hour)
);

create index if not exists child_app_usage_hourly_child_date_idx
  on public.child_app_usage_hourly (child_id, usage_date desc);

create index if not exists child_app_usage_hourly_child_date_package_idx
  on public.child_app_usage_hourly (child_id, usage_date, package_name);

alter table public.child_app_usage_hourly enable row level security;

create policy "Children manage own hourly app usage"
  on public.child_app_usage_hourly
  for all
  using (child_id = auth.uid())
  with check (child_id = auth.uid());

create policy "Parents view child hourly app usage"
  on public.child_app_usage_hourly
  for select
  using (
    exists (
      select 1
      from public.children c
      where c.profile_id = child_app_usage_hourly.child_id
        and c.parent_id = auth.uid()
    )
  );

-- Live updates on the parent dashboard while Home is open
do $$
begin
  alter publication supabase_realtime add table public.child_app_usage_hourly;
exception
  when duplicate_object then null;
end $$;
