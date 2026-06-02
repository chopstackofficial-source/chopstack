
drop policy if exists "System insert notifications" on public.notifications;
create policy "Auth insert notifications" on public.notifications for insert to authenticated with check (true);
