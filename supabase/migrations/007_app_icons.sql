-- Store app icon snapshots synced from the child device (base64 PNG)

alter table public.child_installed_apps
  add column if not exists icon_base64 text;
