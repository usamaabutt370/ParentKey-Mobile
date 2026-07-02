-- Android app blocking: device registry, installed-app inventory, block rules

-- ---------------------------------------------------------------------------
-- child_devices
-- ---------------------------------------------------------------------------

create table if not exists public.child_devices (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.profiles (id) on delete cascade,
  device_key text not null,
  platform text not null check (platform in ('android', 'ios')),
  device_label text,
  last_seen_at timestamptz not null default timezone('utc'::text, now()),
  created_at timestamptz not null default timezone('utc'::text, now()),
  constraint child_devices_child_device_key unique (child_id, device_key)
);

create index if not exists child_devices_child_id_idx
  on public.child_devices (child_id);

-- ---------------------------------------------------------------------------
-- child_installed_apps
-- ---------------------------------------------------------------------------

create table if not exists public.child_installed_apps (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.profiles (id) on delete cascade,
  device_id uuid not null references public.child_devices (id) on delete cascade,
  package_name text not null,
  app_name text not null,
  is_system_app boolean not null default false,
  category text,
  scanned_at timestamptz not null default timezone('utc'::text, now()),
  constraint child_installed_apps_device_package unique (device_id, package_name)
);

create index if not exists child_installed_apps_child_id_idx
  on public.child_installed_apps (child_id);

-- ---------------------------------------------------------------------------
-- app_block_rules
-- ---------------------------------------------------------------------------

create table if not exists public.app_block_rules (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.profiles (id) on delete cascade,
  parent_id uuid not null references public.profiles (id) on delete cascade,
  package_name text not null,
  app_name text,
  rule_type text not null default 'block' check (rule_type in ('block', 'limit')),
  enabled boolean not null default true,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  constraint app_block_rules_child_package_type unique (child_id, package_name, rule_type)
);

create index if not exists app_block_rules_child_id_idx
  on public.app_block_rules (child_id)
  where enabled = true;

drop trigger if exists on_app_block_rules_updated on public.app_block_rules;

create trigger on_app_block_rules_updated
  before update on public.app_block_rules
  for each row
  execute function public.handle_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.child_devices enable row level security;
alter table public.child_installed_apps enable row level security;
alter table public.app_block_rules enable row level security;

create policy "Children manage own devices"
  on public.child_devices
  for all
  using (child_id = auth.uid())
  with check (child_id = auth.uid());

create policy "Parents view child devices"
  on public.child_devices
  for select
  using (
    exists (
      select 1
      from public.children c
      where c.profile_id = child_devices.child_id
        and c.parent_id = auth.uid()
    )
  );

create policy "Children manage own installed apps"
  on public.child_installed_apps
  for all
  using (child_id = auth.uid())
  with check (child_id = auth.uid());

create policy "Parents view child installed apps"
  on public.child_installed_apps
  for select
  using (
    exists (
      select 1
      from public.children c
      where c.profile_id = child_installed_apps.child_id
        and c.parent_id = auth.uid()
    )
  );

create policy "Children read own block rules"
  on public.app_block_rules
  for select
  using (child_id = auth.uid() and enabled = true);

create policy "Parents manage child block rules"
  on public.app_block_rules
  for all
  using (
    parent_id = auth.uid()
    and exists (
      select 1
      from public.children c
      where c.profile_id = app_block_rules.child_id
        and c.parent_id = auth.uid()
    )
  )
  with check (
    parent_id = auth.uid()
    and exists (
      select 1
      from public.children c
      where c.profile_id = app_block_rules.child_id
        and c.parent_id = auth.uid()
    )
  );

-- Realtime updates for child devices when parent changes rules
alter publication supabase_realtime add table public.app_block_rules;
