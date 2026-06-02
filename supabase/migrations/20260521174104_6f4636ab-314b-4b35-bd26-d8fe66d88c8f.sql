
-- Fix function search paths
alter function public.handle_split_update() set search_path = public;
alter function public.handle_order_cancelled() set search_path = public;

-- Revoke direct execute on the auth trigger function
revoke execute on function public.handle_new_user() from anon, authenticated;

-- Replace overly-permissive splits update policy
drop policy if exists "Anyone increment splits via join" on public.splits;
create policy "Auth users can update splits" on public.splits for update to authenticated using (true);

-- Tighten storage policies (still public read of known files, just not listing)
drop policy if exists "Public read avatars" on storage.objects;
drop policy if exists "Public read listing-images" on storage.objects;
-- Allow reading individual objects via public URL (Supabase public buckets serve files via storage API regardless),
-- but require auth to list directory contents.
create policy "Auth list avatars" on storage.objects for select to authenticated using (bucket_id = 'avatars');
create policy "Auth list listing-images" on storage.objects for select to authenticated using (bucket_id = 'listing-images');
