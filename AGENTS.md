# HAKT Production Agent

This repository is managed as a HAKT Industries production project. The agent exists to keep the application buildable, secure, maintainable, searchable and recoverable without relying on n8n.

## Product scope

Public website routes are Home, Services, Book and Contact. Privacy Policy and Website Terms live in the footer. There is no separate About page in the main navigation. About Donna content belongs on Home.

The private administration area will include secure Donna login, dashboard, live calendar, bookings, clients, private notes and admin only document storage.

Public client document upload is not part of scope. A client portal, lawyer portal, online payments, SMS notifications, native mobile app, accounting system and full legal practice management are not part of scope unless separately approved.

## HAKT ownership rules

HAKT Industries owns the reusable software, code, architecture, database structures, deployment systems, automation patterns and technical know how.

Beet It Solutions owns its business content, branding, client data, documents and professional material.

Do not copy, transform or reuse any Cultural Impact Assessment methodology, templates, reports, research process or professional material as HAKT product logic unless separately authorised in writing.

## Agent responsibilities

The agent must protect the following areas on every meaningful change.

### 1. Build and code quality

Run lint and production build checks before a change is considered complete.

Do not leave Vite, React starter, demo counter, placeholder logo or development boilerplate in production pages.

Do not commit secrets, service role keys, database passwords or private client data.

Keep TypeScript errors at zero.

### 2. Technical SEO

SEO is part of the agent's normal production responsibility, not a one off launch task.

Every public page must have a useful title, meta description, canonical URL and indexable heading structure.

Keep robots.txt and sitemap.xml accurate when public routes change.

Admin and other private routes must not be indexed.

Maintain Open Graph and Twitter metadata.

Maintain valid Organisation or ProfessionalService structured data without overstating Donna's professional status.

Use semantic HTML and one clear primary H1 per public page.

Keep internal links crawlable and descriptive.

Images must have useful alt text unless decorative.

Avoid duplicate page titles and duplicate descriptions.

Do not make claims about guaranteed Google rankings, traffic, leads or revenue.

Before launch, connect the production domain to Google Search Console and submit sitemap.xml.

### 3. Performance and accessibility

Keep the site responsive on phone, tablet and desktop.

Avoid oversized image assets and unnecessary dependencies.

Prefer accessible native controls and labels.

Maintain keyboard navigation, visible focus states and reasonable contrast.

Prevent avoidable layout shift and keep the public site lightweight.

### 4. Security

Use HTTPS only in production.

Use Supabase Auth for administrator access.

Use Row Level Security on all client, booking, note and document tables.

Never expose a Supabase service role key to the browser.

Private notes and admin documents must never be queryable by anonymous users.

Use private storage buckets for client documents and signed URLs where access is needed.

Keep privacy conscious logging. Never place sensitive client content in console logs or monitoring payloads.

Apply dependency and security updates routinely after testing.

If a material security incident affects Client Data, surface it to HAKT immediately so the Client can be notified without undue delay.

### 5. Deployment and recovery

Vercel is the deployment platform unless HAKT changes the architecture.

Use preview deployments for material changes before production where practical.

Production deploys must pass lint, build and SEO checks.

Maintain a simple rollback path through Git and Vercel deployments.

Supabase backups and restore capability must be verified once the production database is connected.

Never treat a backup as complete until restoration has been tested or otherwise verified.

### 6. Monitoring

The GitHub HAKT Agent workflow is the first layer of monitoring.

It checks build health, lint, technical SEO, dependency security and production uptime.

When the production URL is available, set the repository variable SITE_URL so scheduled health checks can run.

For production incidents, create or update a GitHub issue with the failed check and required action rather than silently ignoring the failure.

### 7. Dependencies

Dependabot is used for routine dependency and GitHub Actions update proposals.

Review updates before merge. Do not blindly auto merge major dependency changes.

High severity npm audit findings must be investigated promptly.

### 8. Supabase maintenance

Once Supabase is connected, the agent must account for authentication health, Row Level Security, database migrations, storage access rules, backup status and failed server side jobs.

Database schema changes must be committed as migrations rather than made only through the dashboard.

Keep development and production credentials separate.

### 9. Notifications and scheduled work

Do not add n8n as a dependency for normal Beet It workflows.

Use Supabase Edge Functions and scheduled database or platform jobs for server side booking automation and housekeeping.

Use an approved transactional email provider such as Resend for booking confirmations, new booking notices, reschedule notices and cancellation notices.

SMS is excluded unless separately approved.

Scheduled jobs must be idempotent so a retry does not send duplicate messages or duplicate data.

### 10. Logs and incidents

Errors should be actionable and contain enough technical context to diagnose the fault without exposing private client information.

Track recurring production faults as GitHub issues.

For major faults, record what happened, impact, fix and prevention action.

## SEO launch checklist

Before launch confirm all of the following.

1. Production domain and canonical URL are correct.
2. robots.txt is reachable and does not block public pages.
3. sitemap.xml contains every indexable public page and excludes admin.
4. Every public page has a unique title and description.
5. Structured data validates and does not make misleading professional claims.
6. No Vite or starter content remains.
7. Mobile navigation works.
8. Forms have labels and validation.
9. Admin routes are noindex and protected by authentication.
10. Google Search Console is connected and sitemap submitted.
11. Core pages are checked for performance and accessibility.
12. SITE_URL is set for scheduled HAKT Agent uptime checks.

## Definition of done

A feature is not done just because it works locally. It is done when the code is understandable, lint passes, production build passes, SEO impact is checked, security and privacy impact is checked, mobile behaviour is checked and any required operational automation is updated.
