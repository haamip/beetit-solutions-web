grant select, insert, update, delete on table public.client_upload_links to authenticated;
grant select, insert, update, delete on table public.client_upload_links to service_role;
revoke all on table public.client_upload_links from anon;
