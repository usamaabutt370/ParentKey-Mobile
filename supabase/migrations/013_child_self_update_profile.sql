-- Allow a linked child to set their own name and age during device setup

create policy "Children can update own child record"
  on public.children
  for update
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());
