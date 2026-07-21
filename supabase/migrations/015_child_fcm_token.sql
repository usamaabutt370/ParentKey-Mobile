-- Background push sync: store FCM tokens + realtime for uninstall flag

alter table public.child_devices
  add column if not exists fcm_token text;

comment on column public.child_devices.fcm_token is
  'Firebase Cloud Messaging device token for silent parent→child sync pushes.';

create index if not exists child_devices_fcm_token_idx
  on public.child_devices (child_id)
  where fcm_token is not null;

-- Allow Realtime on children so uninstall_allowed updates can stream when app is open
do $$
begin
  alter publication supabase_realtime add table public.children;
exception
  when duplicate_object then
    null;
end $$;
