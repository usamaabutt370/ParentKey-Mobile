-- Notify child devices when block rules or uninstall policy change.
-- Requires:
--   1) Edge Function `notify-child-sync` deployed
--   2) Database Webhook (Dashboard → Database → Webhooks) OR enable pg_net below
--   3) Secrets: FCM_SERVER_KEY (legacy) or FCM_SERVICE_ACCOUNT_JSON (HTTP v1)

-- Helper used by triggers (calls Edge Function via pg_net if available)
create or replace function public.notify_child_sync(p_child_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  edge_url text;
  service_role text;
begin
  -- Prefer project settings; fall back to no-op if secrets are not configured.
  edge_url := current_setting('app.settings.notify_child_sync_url', true);
  service_role := current_setting('app.settings.service_role_key', true);

  if edge_url is null or edge_url = '' or service_role is null or service_role = '' then
    -- Webhooks configured in the Supabase Dashboard are the recommended path.
    return;
  end if;

  -- pg_net may not be enabled on all projects; ignore if missing.
  begin
    perform net.http_post(
      url := edge_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_role
      ),
      body := jsonb_build_object('child_id', p_child_id)
    );
  exception
    when undefined_function then
      null;
    when undefined_table then
      null;
  end;
end;
$$;

create or replace function public.on_app_block_rules_notify()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.notify_child_sync(coalesce(NEW.child_id, OLD.child_id));
  return coalesce(NEW, OLD);
end;
$$;

drop trigger if exists trg_app_block_rules_notify on public.app_block_rules;
create trigger trg_app_block_rules_notify
  after insert or update or delete on public.app_block_rules
  for each row
  execute function public.on_app_block_rules_notify();

create or replace function public.on_children_uninstall_notify()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if NEW.uninstall_allowed is distinct from OLD.uninstall_allowed then
    perform public.notify_child_sync(NEW.profile_id);
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_children_uninstall_notify on public.children;
create trigger trg_children_uninstall_notify
  after update of uninstall_allowed on public.children
  for each row
  execute function public.on_children_uninstall_notify();
