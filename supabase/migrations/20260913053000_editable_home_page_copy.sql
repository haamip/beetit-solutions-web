alter table public.site_settings
  add column if not exists hero_primary_button text not null default 'Book a consultation',
  add column if not exists hero_secondary_button text not null default 'View services',
  add column if not exists about_eyebrow text not null default 'About Donna',
  add column if not exists about_title text not null default 'Experience, clarity and a practical way forward.',
  add column if not exists about_body_one text not null default 'Donna holds an LLB, LLM (Hons) and BA, with more than 20 years of experience across governance, policy, advocacy and advisory work.',
  add column if not exists about_body_two text not null default 'Her approach is practical, respectful and culturally grounded, with a focus on helping people understand their options and move forward with confidence.',
  add column if not exists services_eyebrow text not null default 'Services',
  add column if not exists services_title text not null default 'Support across a range of matters.',
  add column if not exists services_link text not null default 'View all services',
  add column if not exists cta_eyebrow text not null default 'Ready to talk?',
  add column if not exists cta_title text not null default 'Start with a consultation.',
  add column if not exists cta_body text not null default 'Tell Donna what you need help with and choose a suitable consultation time.',
  add column if not exists cta_button text not null default 'Book now';
