# Beet It Solutions Web

Website and administration platform for Donna Pokere Phillips Legal Advocacy & Advisory Services, built and maintained by HAKT Industries.

## Current stack

React 19
TypeScript
Vite
React Router
Supabase
Vercel
GitHub Actions

## Public scope

Home
Services
Book
Contact
Privacy Policy
Website Terms

The About Donna content is part of Home rather than a separate main navigation page.

## Administration scope

Secure Donna login
Dashboard overview
Live calendar
Bookings
Client records
Private notes
Admin only document storage

Public document upload is deliberately excluded.

## Local development

```bash
npm install
npm run dev
```

## Production checks

Run the HAKT Production Agent locally with:

```bash
npm run agent
```

That runs lint, production build and the technical SEO audit.

Additional checks:

```bash
npm run security:audit
npm run health:check
```

`health:check` uses the `SITE_URL` environment variable. The scheduled GitHub workflow uses the repository variable with the same name.

## Environment

Copy `.env.example` to `.env.local` and add the Supabase project values when the backend is ready.

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Never commit service role keys, database passwords or private client information.

## HAKT Production Agent

`AGENTS.md` contains the operating rules for this project. The agent covers build health, technical SEO, accessibility, performance, security, dependency maintenance, uptime, Supabase operational controls, deployment and incident handling.

Routine automation is intentionally designed around GitHub Actions, Vercel and Supabase rather than n8n.

The scheduled workflow lives at `.github/workflows/hakt-agent.yml`.

## SEO

The project includes route metadata, canonical URLs, robots.txt, sitemap.xml, Open Graph metadata, structured data and an automated SEO baseline audit.

The preferred production domain currently configured is `https://freedom.kiwi`.

Before launch, confirm the final domain, connect Google Search Console and submit `sitemap.xml`.

## Ownership

HAKT Industries owns the underlying reusable software, code, architecture, database structures, deployment systems and technical components.

Beet It Solutions owns its business content, branding, client data, documents and professional material.

Cultural Impact Assessment methodology, templates, reports, research process and other proprietary professional material are not to be converted into reusable HAKT product logic unless separately authorised in writing.
