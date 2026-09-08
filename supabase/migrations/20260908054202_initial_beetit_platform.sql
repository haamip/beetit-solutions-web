create extension if not exists pgcrypto;
create extension if not exists btree_gist;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.admin_users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  role text not null default 'admin' check (role in ('admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admin_users where id = (select auth.uid())
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

create policy "Admins can view admin users"
on public.admin_users
for select
to authenticated
using (public.is_admin());

create policy "Admins can update own admin profile"
on public.admin_users
for update
to authenticated
using (id = (select auth.uid()) and public.is_admin())
with check (id = (select auth.uid()) and public.is_admin());

create trigger admin_users_set_updated_at
before update on public.admin_users
for each row execute function public.set_updated_at();

create or replace function public.handle_authorized_admin()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if lower(coalesce(new.email, '')) = lower('beetit.solutions@gmail.com') then
    insert into public.admin_users (id, email, full_name)
    values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', 'Donna Pokere Phillips'))
    on conflict (id) do nothing;
  end if;
  return new;
end;
$$;

create trigger on_authorized_admin_created
after insert on auth.users
for each row execute function public.handle_authorized_admin();

insert into public.admin_users (id, email, full_name)
select id, email, coalesce(raw_user_meta_data ->> 'full_name', 'Donna Pokere Phillips')
from auth.users
where lower(email) = lower('beetit.solutions@gmail.com')
on conflict (id) do nothing;

create table public.services (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.services enable row level security;

create policy "Active services are public"
on public.services
for select
to anon, authenticated
using (is_active or public.is_admin());

create policy "Admins manage services"
on public.services
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create trigger services_set_updated_at
before update on public.services
for each row execute function public.set_updated_at();

insert into public.services (slug, name, description, sort_order) values
('cultural-impact-assessments', 'Cultural Impact Assessments', 'Independent cultural impact assessment support and reporting for relevant projects and processes.', 10),
('employment-advocacy', 'Employment Advocacy', 'Practical support with employment matters, workplace issues, correspondence and advocacy.', 20),
('maori-land-court-support', 'Māori Land Court Support', 'Assistance understanding processes, preparing information and navigating Māori Land Court matters.', 30),
('governance-and-compliance', 'Governance and Compliance', 'Support for governance responsibilities, policy, compliance and decision making.', 40),
('elderly-care-advocacy', 'Elderly Care Advocacy', 'Advocacy and support for older people and whānau navigating care, services and important decisions.', 50),
('insurance-claims-assistance', 'Insurance Claims Assistance', 'Help understanding, preparing and progressing insurance claims and related correspondence.', 60),
('te-tiriti-treaty-research-advisory', 'Te Tiriti and Treaty Research and Advisory', 'Research and advisory support relating to Te Tiriti o Waitangi and Treaty matters.', 70);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text,
  phone text,
  service_type text,
  important_date date,
  status text not null default 'active' check (status in ('prospect', 'active', 'inactive', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.clients enable row level security;
create policy "Admins manage clients" on public.clients for all to authenticated using (public.is_admin()) with check (public.is_admin());
create trigger clients_set_updated_at before update on public.clients for each row execute function public.set_updated_at();

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete set null,
  full_name text not null,
  email text not null,
  phone text not null,
  service text not null,
  consultation_type text not null check (consultation_type in ('Phone', 'Video', 'In Person')),
  start_at timestamptz not null,
  end_at timestamptz not null,
  important_date date,
  message text,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'rescheduled', 'cancelled', 'completed')),
  source text not null default 'public' check (source in ('public', 'admin')),
  privacy_consent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bookings_valid_range check (end_at = start_at + interval '1 hour'),
  constraint bookings_no_overlap exclude using gist (
    tstzrange(start_at, end_at, '[)') with &&
  ) where (status in ('pending', 'confirmed', 'rescheduled'))
);

create index bookings_start_at_idx on public.bookings(start_at);
create index bookings_status_idx on public.bookings(status);
create index bookings_client_id_idx on public.bookings(client_id);

alter table public.bookings enable row level security;
create policy "Admins manage bookings" on public.bookings for all to authenticated using (public.is_admin()) with check (public.is_admin());
create trigger bookings_set_updated_at before update on public.bookings for each row execute function public.set_updated_at();

create table public.blocked_times (
  id uuid primary key default gen_random_uuid(),
  start_at timestamptz not null,
  end_at timestamptz not null,
  reason text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint blocked_times_valid_range check (end_at > start_at)
);

create index blocked_times_start_at_idx on public.blocked_times(start_at);
alter table public.blocked_times enable row level security;
create policy "Admins manage blocked times" on public.blocked_times for all to authenticated using (public.is_admin()) with check (public.is_admin());

create table public.contact_inquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  message text not null,
  status text not null default 'unread' check (status in ('unread', 'read', 'converted', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index contact_inquiries_status_idx on public.contact_inquiries(status);
alter table public.contact_inquiries enable row level security;
create policy "Admins manage contact inquiries" on public.contact_inquiries for all to authenticated using (public.is_admin()) with check (public.is_admin());
create trigger contact_inquiries_set_updated_at before update on public.contact_inquiries for each row execute function public.set_updated_at();

create table public.client_notes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  note text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index client_notes_client_id_idx on public.client_notes(client_id);
alter table public.client_notes enable row level security;
create policy "Admins manage client notes" on public.client_notes for all to authenticated using (public.is_admin()) with check (public.is_admin());
create trigger client_notes_set_updated_at before update on public.client_notes for each row execute function public.set_updated_at();

create table public.client_documents (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  storage_path text not null unique,
  original_name text not null,
  mime_type text,
  size_bytes bigint check (size_bytes is null or size_bytes >= 0),
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index client_documents_client_id_idx on public.client_documents(client_id);
alter table public.client_documents enable row level security;
create policy "Admins manage client documents" on public.client_documents for all to authenticated using (public.is_admin()) with check (public.is_admin());

create table public.admin_notifications (
  id uuid primary key default gen_random_uuid(),
  notification_type text not null,
  title text not null,
  body text,
  booking_id uuid references public.bookings(id) on delete cascade,
  inquiry_id uuid references public.contact_inquiries(id) on delete cascade,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index admin_notifications_created_at_idx on public.admin_notifications(created_at desc);
create index admin_notifications_read_at_idx on public.admin_notifications(read_at);
alter table public.admin_notifications enable row level security;
create policy "Admins manage notifications" on public.admin_notifications for all to authenticated using (public.is_admin()) with check (public.is_admin());

create or replace function public.get_available_slots(p_date date)
returns table(start_at timestamptz, end_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  with candidate_slots as (
    select make_timestamptz(
      extract(year from p_date)::int,
      extract(month from p_date)::int,
      extract(day from p_date)::int,
      hour_value,
      0,
      0,
      'Pacific/Auckland'
    ) as slot_start
    from generate_series(10, 15) as hour_value
    where extract(isodow from p_date) between 1 and 4
  )
  select c.slot_start, c.slot_start + interval '1 hour'
  from candidate_slots c
  where c.slot_start > now()
    and not exists (
      select 1
      from public.bookings b
      where b.status in ('pending', 'confirmed', 'rescheduled')
        and tstzrange(b.start_at, b.end_at, '[)') && tstzrange(c.slot_start, c.slot_start + interval '1 hour', '[)')
    )
    and not exists (
      select 1
      from public.blocked_times bt
      where tstzrange(bt.start_at, bt.end_at, '[)') && tstzrange(c.slot_start, c.slot_start + interval '1 hour', '[)')
    )
  order by c.slot_start;
$$;

revoke all on function public.get_available_slots(date) from public;
grant execute on function public.get_available_slots(date) to anon, authenticated;

create or replace function public.submit_booking_request(
  p_full_name text,
  p_email text,
  p_phone text,
  p_service text,
  p_consultation_type text,
  p_start_at timestamptz,
  p_important_date date default null,
  p_message text default null,
  p_privacy_consent boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_booking_id uuid;
  slot_available boolean;
begin
  if not p_privacy_consent then raise exception 'Privacy consent is required'; end if;
  if length(trim(coalesce(p_full_name, ''))) < 2 then raise exception 'Full name is required'; end if;
  if position('@' in coalesce(p_email, '')) < 2 then raise exception 'A valid email address is required'; end if;
  if length(trim(coalesce(p_phone, ''))) < 6 then raise exception 'A valid phone number is required'; end if;
  if p_consultation_type not in ('Phone', 'Video', 'In Person') then raise exception 'Invalid consultation type'; end if;
  if not exists (select 1 from public.services s where s.name = p_service and s.is_active) then raise exception 'Invalid service'; end if;

  select exists (
    select 1
    from public.get_available_slots((p_start_at at time zone 'Pacific/Auckland')::date) s
    where s.start_at = p_start_at
  ) into slot_available;

  if not slot_available then raise exception 'That booking time is no longer available'; end if;

  begin
    insert into public.bookings (
      full_name, email, phone, service, consultation_type, start_at, end_at,
      important_date, message, status, source, privacy_consent_at
    ) values (
      trim(p_full_name), lower(trim(p_email)), trim(p_phone), p_service, p_consultation_type,
      p_start_at, p_start_at + interval '1 hour', p_important_date,
      nullif(trim(coalesce(p_message, '')), ''), 'pending', 'public', now()
    ) returning id into new_booking_id;
  exception when exclusion_violation then
    raise exception 'That booking time has just been taken';
  end;

  return new_booking_id;
end;
$$;

revoke all on function public.submit_booking_request(text, text, text, text, text, timestamptz, date, text, boolean) from public;
grant execute on function public.submit_booking_request(text, text, text, text, text, timestamptz, date, text, boolean) to anon, authenticated;

create or replace function public.submit_contact_inquiry(
  p_name text,
  p_email text,
  p_phone text default null,
  p_message text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_inquiry_id uuid;
begin
  if length(trim(coalesce(p_name, ''))) < 2 then raise exception 'Name is required'; end if;
  if position('@' in coalesce(p_email, '')) < 2 then raise exception 'A valid email address is required'; end if;
  if length(trim(coalesce(p_message, ''))) < 5 then raise exception 'Please enter a short message'; end if;

  insert into public.contact_inquiries (name, email, phone, message)
  values (trim(p_name), lower(trim(p_email)), nullif(trim(coalesce(p_phone, '')), ''), trim(p_message))
  returning id into new_inquiry_id;

  return new_inquiry_id;
end;
$$;

revoke all on function public.submit_contact_inquiry(text, text, text, text) from public;
grant execute on function public.submit_contact_inquiry(text, text, text, text) to anon, authenticated;

create or replace function public.notify_new_booking()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.admin_notifications (notification_type, title, body, booking_id)
  values (
    'booking',
    'New booking request',
    new.full_name || ' requested ' || new.service || ' for ' || to_char(new.start_at at time zone 'Pacific/Auckland', 'DD Mon YYYY HH12:MI AM'),
    new.id
  );
  return new;
end;
$$;

create trigger on_booking_created
after insert on public.bookings
for each row execute function public.notify_new_booking();

create or replace function public.notify_new_inquiry()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.admin_notifications (notification_type, title, body, inquiry_id)
  values ('inquiry', 'New contact enquiry', new.name || ' sent a website enquiry', new.id);
  return new;
end;
$$;

create trigger on_inquiry_created
after insert on public.contact_inquiries
for each row execute function public.notify_new_inquiry();

insert into storage.buckets (id, name, public)
values ('client-documents', 'client-documents', false)
on conflict (id) do update set public = false;

create policy "Admins can read client documents storage"
on storage.objects for select to authenticated
using (bucket_id = 'client-documents' and public.is_admin());

create policy "Admins can upload client documents storage"
on storage.objects for insert to authenticated
with check (bucket_id = 'client-documents' and public.is_admin());

create policy "Admins can update client documents storage"
on storage.objects for update to authenticated
using (bucket_id = 'client-documents' and public.is_admin())
with check (bucket_id = 'client-documents' and public.is_admin());

create policy "Admins can delete client documents storage"
on storage.objects for delete to authenticated
using (bucket_id = 'client-documents' and public.is_admin());

revoke all on public.admin_users, public.clients, public.bookings, public.blocked_times, public.contact_inquiries, public.client_notes, public.client_documents, public.admin_notifications from anon;
grant select, insert, update, delete on public.admin_users, public.clients, public.bookings, public.blocked_times, public.contact_inquiries, public.client_notes, public.client_documents, public.admin_notifications to authenticated;
grant select on public.services to anon, authenticated;
grant insert, update, delete on public.services to authenticated;
