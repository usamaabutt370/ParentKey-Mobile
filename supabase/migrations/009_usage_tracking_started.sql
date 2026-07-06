-- Track when ParentKey started collecting usage per device (ignore prior Android stats)

alter table public.child_devices
  add column if not exists usage_tracking_started_at timestamptz;
