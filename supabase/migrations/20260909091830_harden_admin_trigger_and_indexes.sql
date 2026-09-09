revoke all on function public.handle_authorized_admin() from public;
revoke all on function public.handle_authorized_admin() from anon;
revoke all on function public.handle_authorized_admin() from authenticated;

create index if not exists admin_notifications_booking_id_idx on public.admin_notifications(booking_id);
create index if not exists admin_notifications_inquiry_id_idx on public.admin_notifications(inquiry_id);
create index if not exists blocked_times_created_by_idx on public.blocked_times(created_by);
create index if not exists client_documents_uploaded_by_idx on public.client_documents(uploaded_by);
create index if not exists client_notes_created_by_idx on public.client_notes(created_by);
