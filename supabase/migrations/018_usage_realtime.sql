-- Stream usage uploads to the parent app while Activity is open.

do $$
begin
  alter publication supabase_realtime add table public.child_app_usage_daily;
exception
  when duplicate_object then
    null;
end $$;
