-- Complete Beet It scope data model and harden public database access.

-- Keep the public website API behind Edge Functions rather than exposing SECURITY DEFINER RPCs.
alter function public.get_available_slots(date) security invoker;
alter function public.submit_booking_request(text, text, text, text, text, timestamptz, date, text, boolean) security invoker;
alter function public.submit_contact_inquiry(text, text, text, text) security invoker;

revoke all on function public.get_available_slots(date) from public, anon, authenticated;
revoke all on function public.submit_booking_request(text, text, text, text, text, timestamptz, date, text, boolean) from public, anon, authenticated;
revoke all on function public.submit_contact_inquiry(text, text, text, text) from public, anon, authenticated;
grant execute on function public.get_available_slots(date) to service_role;
grant execute on function public.submit_booking_request(text, text, text, text, text, timestamptz, date, text, boolean) to service_role;
grant execute on function public.submit_contact_inquiry(text, text, text, text) to service_role;

-- One SELECT policy for services avoids duplicate permissive policy evaluation while allowing admins to see inactive rows.
drop policy if exists "Active services are public" on public.services;
drop policy if exists "Admins manage services" on public.services;
create policy "Services readable by public and admins"
on public.services for select to anon, authenticated
using (is_active or private.is_admin());
create policy "Admins insert services"
on public.services for insert to authenticated
with check (private.is_admin());
create policy "Admins update services"
on public.services for update to authenticated
using (private.is_admin()) with check (private.is_admin());
create policy "Admins delete services"
on public.services for delete to authenticated
using (private.is_admin());

-- Link enquiries to the client record created from them.
alter table public.contact_inquiries
  add column if not exists client_id uuid references public.clients(id) on delete set null;
create index if not exists contact_inquiries_client_id_idx on public.contact_inquiries(client_id);

-- Identity/DOB schema is included here so the repository can reproduce the live feature from migrations.
alter table public.clients add column if not exists date_of_birth date;
alter table public.clients add column if not exists dob_confirmed_at timestamptz;
alter table public.clients add column if not exists dob_confirmed_by uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'clients_dob_confirmed_by_fkey'
      and conrelid = 'public.clients'::regclass
  ) then
    alter table public.clients
      add constraint clients_dob_confirmed_by_fkey
      foreign key (dob_confirmed_by) references public.admin_users(id) on delete set null;
  end if;
end $$;

alter table public.client_documents
  add column if not exists document_type text not null default 'general';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'client_documents_document_type_check'
      and conrelid = 'public.client_documents'::regclass
  ) then
    alter table public.client_documents
      add constraint client_documents_document_type_check
      check (document_type in ('general', 'identity'));
  end if;
end $$;

create index if not exists client_documents_client_type_idx
  on public.client_documents(client_id, document_type);
create index if not exists clients_dob_confirmed_by_idx
  on public.clients(dob_confirmed_by);

create table if not exists public.client_upload_links (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_by uuid references public.admin_users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists client_upload_links_client_id_idx on public.client_upload_links(client_id);
create index if not exists client_upload_links_expires_at_idx on public.client_upload_links(expires_at);
create index if not exists client_upload_links_created_by_idx on public.client_upload_links(created_by);

alter table public.client_upload_links enable row level security;
drop policy if exists "Admins manage client upload links" on public.client_upload_links;
create policy "Admins manage client upload links"
on public.client_upload_links for all to authenticated
using (private.is_admin()) with check (private.is_admin());
revoke all on public.client_upload_links from anon;
grant select, insert, update, delete on public.client_upload_links to authenticated;
grant select, insert, update, delete on public.client_upload_links to service_role;

create or replace function private.enforce_dob_confirmation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.dob_confirmed_at is not null then
    if new.date_of_birth is null then
      raise exception 'A date of birth is required before it can be confirmed';
    end if;
    if not exists (
      select 1 from public.client_documents d
      where d.client_id = new.id and d.document_type = 'identity'
    ) then
      raise exception 'An identity document is required before date of birth can be confirmed';
    end if;
    if new.dob_confirmed_by is null then
      new.dob_confirmed_by := (select auth.uid());
    end if;
  else
    new.dob_confirmed_by := null;
  end if;
  return new;
end;
$$;

create or replace function private.reset_dob_confirmation_when_identity_removed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.document_type = 'identity'
     and not exists (
       select 1 from public.client_documents d
       where d.client_id = old.client_id and d.document_type = 'identity'
     ) then
    update public.clients
      set dob_confirmed_at = null, dob_confirmed_by = null
      where id = old.client_id;
  end if;
  return old;
end;
$$;

revoke all on function private.enforce_dob_confirmation() from public, anon, authenticated;
revoke all on function private.reset_dob_confirmation_when_identity_removed() from public, anon, authenticated;

drop trigger if exists enforce_dob_confirmation_on_clients on public.clients;
create trigger enforce_dob_confirmation_on_clients
before insert or update of date_of_birth, dob_confirmed_at, dob_confirmed_by on public.clients
for each row execute function private.enforce_dob_confirmation();

drop trigger if exists reset_dob_confirmation_on_identity_delete on public.client_documents;
create trigger reset_dob_confirmation_on_identity_delete
after delete on public.client_documents
for each row execute function private.reset_dob_confirmation_when_identity_removed();
