create or replace function private.handle_authorized_admin()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_email text := lower(coalesce(new.email, ''));
  resolved_name text;
begin
  if normalized_email in (
    lower('beetit.solutions@gmail.com'),
    lower('haami@haktindustries.co.nz')
  ) then
    resolved_name := case
      when normalized_email = lower('haami@haktindustries.co.nz') then 'Haami Phillips'
      else coalesce(new.raw_user_meta_data ->> 'full_name', 'Donna Pokere Phillips')
    end;

    insert into public.admin_users (id, email, full_name)
    values (new.id, new.email, resolved_name)
    on conflict (id) do update
      set email = excluded.email,
          full_name = coalesce(public.admin_users.full_name, excluded.full_name),
          updated_at = now();
  end if;
  return new;
end;
$$;

drop trigger if exists on_authorized_admin_created on auth.users;
create trigger on_authorized_admin_created
after insert or update of email on auth.users
for each row execute function private.handle_authorized_admin();

insert into public.admin_users (id, email, full_name)
select
  id,
  email,
  case
    when lower(email) = lower('haami@haktindustries.co.nz') then 'Haami Phillips'
    else coalesce(raw_user_meta_data ->> 'full_name', 'Donna Pokere Phillips')
  end
from auth.users
where lower(email) in (
  lower('beetit.solutions@gmail.com'),
  lower('haami@haktindustries.co.nz')
)
on conflict (id) do update
set email = excluded.email,
    full_name = coalesce(public.admin_users.full_name, excluded.full_name),
    updated_at = now();
