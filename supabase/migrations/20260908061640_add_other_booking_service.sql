insert into public.services (slug, name, description, sort_order)
values (
  'other-not-sure',
  'Other / Not sure',
  'For matters that do not clearly fit one of the listed service areas. Donna can confirm the best next step after reviewing the enquiry.',
  80
)
on conflict (slug) do update
set name = excluded.name,
    description = excluded.description,
    sort_order = excluded.sort_order,
    is_active = true,
    updated_at = now();
