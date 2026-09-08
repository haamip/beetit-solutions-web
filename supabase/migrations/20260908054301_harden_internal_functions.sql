create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

alter extension btree_gist set schema extensions;

alter function public.set_updated_at() set schema private;
alter function public.is_admin() set schema private;
alter function public.handle_authorized_admin() set schema private;
alter function public.notify_new_booking() set schema private;
alter function public.notify_new_inquiry() set schema private;

revoke all on function private.set_updated_at() from public, anon, authenticated;
revoke all on function private.handle_authorized_admin() from public, anon, authenticated;
revoke all on function private.notify_new_booking() from public, anon, authenticated;
revoke all on function private.notify_new_inquiry() from public, anon, authenticated;
revoke all on function private.is_admin() from public, anon, authenticated;
grant execute on function private.is_admin() to authenticated;

drop policy if exists "Active services are public" on public.services;
create policy "Active services are public"
on public.services
for select
to anon, authenticated
using (is_active);
