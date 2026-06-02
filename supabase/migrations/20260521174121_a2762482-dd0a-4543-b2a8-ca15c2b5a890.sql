
drop policy if exists "Auth users can update splits" on public.splits;
create policy "Buyers can update splits" on public.splits for update to authenticated
  using (exists (select 1 from public.users u where u.id = auth.uid() and u.account_type = 'buyer'));

drop policy if exists "Auth list avatars" on storage.objects;
drop policy if exists "Auth list listing-images" on storage.objects;
