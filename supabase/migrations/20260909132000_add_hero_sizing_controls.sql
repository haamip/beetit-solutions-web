alter table public.site_settings
  add column if not exists hero_image_scale numeric(4,2) not null default 1.00,
  add column if not exists hero_height integer not null default 410;

alter table public.site_settings
  drop constraint if exists site_settings_hero_image_scale_check,
  drop constraint if exists site_settings_hero_height_check;

alter table public.site_settings
  add constraint site_settings_hero_image_scale_check check (hero_image_scale between 0.70 and 1.50),
  add constraint site_settings_hero_height_check check (hero_height between 360 and 560);
