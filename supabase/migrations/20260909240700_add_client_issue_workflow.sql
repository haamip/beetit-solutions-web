create table if not exists public.client_issues (
  id uuid primary key default gen_random_uuid(),
  issue_number bigint generated always as identity unique,
  client_id uuid not null references public.clients(id) on delete cascade,
  title text not null,
  service_type text,
  status text not null default 'open' check (status in ('open','on_hold','closed','archived')),
  summary text,
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  created_by uuid references public.admin_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.client_issues enable row level security;

drop policy if exists "Admins manage client issues" on public.client_issues;
create policy "Admins manage client issues"
on public.client_issues
for all
to authenticated
using (private.is_admin())
with check (private.is_admin());

grant select, insert, update, delete on public.client_issues to authenticated;
grant usage, select on all sequences in schema public to authenticated;

create index if not exists client_issues_client_id_idx on public.client_issues(client_id);
create index if not exists client_issues_status_idx on public.client_issues(status);
create index if not exists client_issues_service_type_idx on public.client_issues(service_type);
create index if not exists client_issues_created_by_idx on public.client_issues(created_by);

alter table public.client_notes add column if not exists issue_id uuid references public.client_issues(id) on delete set null;
alter table public.client_documents add column if not exists issue_id uuid references public.client_issues(id) on delete set null;
alter table public.bookings add column if not exists issue_id uuid references public.client_issues(id) on delete set null;
alter table public.contact_inquiries add column if not exists issue_id uuid references public.client_issues(id) on delete set null;

create index if not exists client_notes_issue_id_idx on public.client_notes(issue_id);
create index if not exists client_documents_issue_id_idx on public.client_documents(issue_id);
create index if not exists bookings_issue_id_idx on public.bookings(issue_id);
create index if not exists contact_inquiries_issue_id_idx on public.contact_inquiries(issue_id);

create or replace function private.set_client_issue_updated_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at := now();
  if new.status = 'closed' and old.status is distinct from 'closed' then
    new.closed_at := coalesce(new.closed_at, now());
  elsif new.status <> 'closed' then
    new.closed_at := null;
  end if;
  return new;
end;
$$;

revoke all on function private.set_client_issue_updated_at() from public, anon, authenticated;
drop trigger if exists client_issues_set_updated_at on public.client_issues;
create trigger client_issues_set_updated_at
before update on public.client_issues
for each row execute function private.set_client_issue_updated_at();

insert into public.client_issues (client_id, title, service_type, status, summary)
select c.id,
       coalesce(nullif(c.service_type, ''), 'General matter'),
       c.service_type,
       case when c.status in ('inactive','archived') then 'archived' else 'open' end,
       'Initial matter migrated from the client record.'
from public.clients c
where not exists (
  select 1 from public.client_issues ci where ci.client_id = c.id
);

update public.bookings b
set issue_id = (
  select i.id from public.client_issues i
  where i.client_id = b.client_id
  order by i.opened_at asc
  limit 1
)
where b.client_id is not null and b.issue_id is null;

update public.client_notes n
set issue_id = (
  select i.id from public.client_issues i
  where i.client_id = n.client_id
  order by i.opened_at asc
  limit 1
)
where n.issue_id is null;

update public.client_documents d
set issue_id = (
  select i.id from public.client_issues i
  where i.client_id = d.client_id
  order by i.opened_at asc
  limit 1
)
where d.issue_id is null;
