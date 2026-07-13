-- Parent can allow uninstall of ParentKey Child by deactivating device admin

alter table public.children
  add column if not exists uninstall_allowed boolean not null default false;

comment on column public.children.uninstall_allowed is
  'When true, child app may deactivate device admin so ParentKey Child can be uninstalled.';
