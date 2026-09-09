alter table public.clients
  add column if not exists email_normalized text generated always as (lower(btrim(coalesce(email, '')))) stored,
  add column if not exists phone_normalized text generated always as (regexp_replace(coalesce(phone, ''), '[^0-9]+', '', 'g')) stored;

create index if not exists clients_email_normalized_idx on public.clients(email_normalized) where email_normalized <> '';
create index if not exists clients_phone_normalized_idx on public.clients(phone_normalized) where phone_normalized <> '';

alter table public.client_documents
  add column if not exists document_category text not null default 'general';

alter table public.client_documents drop constraint if exists client_documents_document_category_check;
alter table public.client_documents
  add constraint client_documents_document_category_check
  check (document_category in ('general','correspondence','court_tribunal','evidence','client_supplied','agreement_contract','research','identity','other'));

update public.client_documents set document_category = 'identity' where document_type = 'identity';

create index if not exists client_documents_issue_id_idx on public.client_documents(issue_id);
create index if not exists client_notes_issue_id_idx on public.client_notes(issue_id);
create index if not exists bookings_issue_id_idx on public.bookings(issue_id);
create index if not exists contact_inquiries_issue_id_idx on public.contact_inquiries(issue_id);

create or replace function private.enforce_issue_client_match()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_issue_client uuid;
begin
  if new.issue_id is null then
    return new;
  end if;

  if new.client_id is null then
    raise exception 'An issue cannot be linked without a client';
  end if;

  select ci.client_id into v_issue_client
  from public.client_issues ci
  where ci.id = new.issue_id;

  if v_issue_client is null or v_issue_client <> new.client_id then
    raise exception 'The selected issue does not belong to this client';
  end if;

  return new;
end;
$$;

revoke all on function private.enforce_issue_client_match() from public, anon, authenticated;

drop trigger if exists enforce_client_note_issue_match on public.client_notes;
create trigger enforce_client_note_issue_match
before insert or update of client_id, issue_id on public.client_notes
for each row execute function private.enforce_issue_client_match();

drop trigger if exists enforce_client_document_issue_match on public.client_documents;
create trigger enforce_client_document_issue_match
before insert or update of client_id, issue_id on public.client_documents
for each row execute function private.enforce_issue_client_match();

drop trigger if exists enforce_booking_issue_match on public.bookings;
create trigger enforce_booking_issue_match
before insert or update of client_id, issue_id on public.bookings
for each row execute function private.enforce_issue_client_match();

drop trigger if exists enforce_inquiry_issue_match on public.contact_inquiries;
create trigger enforce_inquiry_issue_match
before insert or update of client_id, issue_id on public.contact_inquiries
for each row execute function private.enforce_issue_client_match();

update public.client_notes n
set issue_id = (
  select ci.id from public.client_issues ci
  where ci.client_id = n.client_id
  order by ci.opened_at asc, ci.created_at asc
  limit 1
)
where n.issue_id is null;

update public.client_documents d
set issue_id = (
  select ci.id from public.client_issues ci
  where ci.client_id = d.client_id
  order by ci.opened_at asc, ci.created_at asc
  limit 1
)
where d.issue_id is null and d.document_type <> 'identity';

update public.bookings b
set issue_id = (
  select ci.id from public.client_issues ci
  where ci.client_id = b.client_id
  order by (ci.service_type = b.service) desc, ci.opened_at desc, ci.created_at desc
  limit 1
)
where b.client_id is not null and b.issue_id is null;

update public.contact_inquiries q
set issue_id = (
  select ci.id from public.client_issues ci
  where ci.client_id = q.client_id
  order by ci.opened_at desc, ci.created_at desc
  limit 1
)
where q.client_id is not null and q.issue_id is null;

create sequence if not exists public.support_request_number_seq start 1;

create table if not exists public.support_requests (
  id uuid primary key default gen_random_uuid(),
  ticket_number bigint not null default nextval('public.support_request_number_seq'),
  category text not null default 'general',
  priority text not null default 'normal',
  subject text not null,
  message text not null,
  status text not null default 'open',
  created_by uuid references public.admin_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint support_requests_ticket_number_key unique(ticket_number),
  constraint support_requests_category_check check (category in ('general','booking','client','documents','identity','website','email','other')),
  constraint support_requests_priority_check check (priority in ('low','normal','high','urgent')),
  constraint support_requests_status_check check (status in ('open','in_progress','resolved','closed'))
);

alter table public.support_requests enable row level security;
drop policy if exists "Admins manage support requests" on public.support_requests;
create policy "Admins manage support requests"
on public.support_requests for all to authenticated
using (private.is_admin()) with check (private.is_admin());

grant select, insert, update, delete on public.support_requests to authenticated;
grant usage, select on sequence public.support_request_number_seq to authenticated;

create index if not exists support_requests_status_idx on public.support_requests(status);
create index if not exists support_requests_created_at_idx on public.support_requests(created_at desc);

create trigger support_requests_set_updated_at
before update on public.support_requests
for each row execute function private.set_updated_at();

create or replace function private.notify_support_request()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.admin_notifications(notification_type, title, body)
  values (
    'support_request',
    'Support request SUP-' || lpad(new.ticket_number::text, 6, '0'),
    new.subject || ' · ' || initcap(replace(new.priority, '_', ' ')) || ' priority'
  );
  return new;
end;
$$;

revoke all on function private.notify_support_request() from public, anon, authenticated;
drop trigger if exists notify_support_request_on_insert on public.support_requests;
create trigger notify_support_request_on_insert
after insert on public.support_requests
for each row execute function private.notify_support_request();

create table if not exists public.site_settings (
  id smallint primary key default 1 check (id = 1),
  primary_color text not null default '#434a38',
  background_color text not null default '#f5f1e8',
  accent_color text not null default '#d6b76e',
  hero_image_path text,
  hero_position text not null default '72% center',
  hero_overlay_strength numeric(3,2) not null default 1.00,
  hero_eyebrow text not null default 'Donna Pokere Phillips',
  hero_title text not null default 'Clear, practical advocacy and advisory support.',
  hero_lead text not null default 'Professional and culturally grounded support for individuals, whānau, organisations and communities.',
  public_email text not null default 'beetit.solutions@gmail.com',
  public_phone text not null default '027 602 5011',
  public_location text not null default 'Tuakau, Waikato and South Auckland',
  updated_by uuid references public.admin_users(id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint site_settings_primary_color_check check (primary_color ~ '^#[0-9A-Fa-f]{6}$'),
  constraint site_settings_background_color_check check (background_color ~ '^#[0-9A-Fa-f]{6}$'),
  constraint site_settings_accent_color_check check (accent_color ~ '^#[0-9A-Fa-f]{6}$'),
  constraint site_settings_overlay_check check (hero_overlay_strength between 0.50 and 1.30)
);

insert into public.site_settings(id) values (1) on conflict (id) do nothing;

alter table public.site_settings enable row level security;
drop policy if exists "Public read site settings" on public.site_settings;
create policy "Public read site settings"
on public.site_settings for select to anon, authenticated
using (id = 1);

drop policy if exists "Admins update site settings" on public.site_settings;
create policy "Admins update site settings"
on public.site_settings for update to authenticated
using (private.is_admin()) with check (private.is_admin());

grant select on public.site_settings to anon, authenticated;
grant update on public.site_settings to authenticated;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('site-assets', 'site-assets', true, 10485760, array['image/jpeg','image/png','image/webp','image/avif'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Admins upload site assets" on storage.objects;
create policy "Admins upload site assets"
on storage.objects for insert to authenticated
with check (bucket_id = 'site-assets' and private.is_admin());

drop policy if exists "Admins update site assets" on storage.objects;
create policy "Admins update site assets"
on storage.objects for update to authenticated
using (bucket_id = 'site-assets' and private.is_admin())
with check (bucket_id = 'site-assets' and private.is_admin());

drop policy if exists "Admins delete site assets" on storage.objects;
create policy "Admins delete site assets"
on storage.objects for delete to authenticated
using (bucket_id = 'site-assets' and private.is_admin());
