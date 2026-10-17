# Mentora

**An expert marketplace for learning and leadership.** Organizations find and book vetted **trainers, facilitators, coaches, consultants and keynote speakers**, register for **paid workshops**, run **AI for Leaders** programs and check **verifiable certificates**. Every payment posts to a **revenue ledger** that splits the money between the expert, the platform operator and the technology partner.

- **Live clickable prototype:** <https://azaworld.github.io/mentora/> (in `docs/`, sample data only)
- **Production app:** this repository — Next.js, TypeScript, PostgreSQL

---

## What's in the app

| Area | What works today |
| --- | --- |
| Expert marketplace | Public profiles with packages; search and filters by role, topic, format and language; featured experts listed first |
| Training needs & proposals | Organizations post needs (open, or sent to one expert); experts send proposals; organizations accept and pay; the other proposals are declined automatically |
| Speakers bureau | Icon / Executive / Expert tiers, availability enquiries, and an admin pipeline (requested → quoted → paid) |
| Paid workshops | Experts submit workshops, admins publish them; guest checkout with seat limits and e-tickets; overselling is impossible |
| AI for Leaders | Program page with packages; in-house requests that admins mark as paid |
| Certification portal | Certificates with unique codes and QR codes; public verification page; revocation supported in the data model |
| Plans | Expert plans (Starter / Professional / Premier, each with its own commission) and organization plans (booking discount) |
| Payments | SSLCommerz (bKash, Nagad, Rocket, cards) with server-side validation and IPN; a test gateway for development |
| Revenue ledger | One entry per paid order, with gross, payout, platform, operator and tech-partner amounts; CSV export |
| Admin | Approvals, speaker and program pipelines, sponsorship sales, expert payouts, fee and split settings |
| Accounts | Email and password sign-in, three roles (expert, organization, admin), protected dashboards |

### Revenue streams (default rates, editable in Admin → Fees & split)

| Stream | Rule |
| --- | --- |
| Booking commission | 20% / 15% / 10% by expert plan |
| Workshop tickets | 15% platform fee |
| Speaker fees | 20% agency fee |
| AI for Leaders | Facilitator receives 60% |
| Certificates | ৳500 each |
| Expert subscriptions | ৳0 / ৳1,500 / ৳4,000 per month |
| Featured listing | ৳2,000 per 30 days |
| Organization plans | ৳1,50,000 / ৳4,00,000 per year, with a 10% booking discount |
| Sponsorship | Priced per package |

Platform revenue is split between the operator and the technology partner (default 30% to the tech partner). Each ledger entry stores the split it was posted with, so later rate changes never rewrite history.

## Principles built into the code

- **Consent before listing.** An expert or speaker appears publicly only when `consent_to_list` is true *and* the profile is approved. Admins cannot approve a profile without consent.
- **Money is integers.** All amounts are poisha (1 BDT = 100) and all rates are basis points. Splits always add up exactly (tested).
- **Payments are verified server-side.** A browser redirect alone never marks an order paid; SSLCommerz callbacks are re-validated with the gateway, and the amount must match.
- **Fulfilment happens exactly once.** The order row is locked, only a pending order is processed, and the ledger has one entry per order. If seats run out or a proposal is gone after payment, the order is flagged for refund rather than over-booked.
- **No test gateway in production** unless `ALLOW_MOCK_PAYMENTS=true` is set on purpose.

## Tech stack

Next.js 14 (App Router, server actions) · TypeScript (strict) · PostgreSQL 16 · Drizzle ORM · NextAuth (credentials, JWT sessions) · Zod validation · Vitest · GitHub Actions · Docker

## Getting started

```bash
cp .env.example .env            # then fill in the values
docker compose up -d db          # local PostgreSQL
npm install
npm run db:migrate
ADMIN_PASSWORD='choose-a-long-password' DEMO_PASSWORD='demo-password' npm run db:seed
npm run dev                      # http://localhost:3000
```

With `SEED_SAMPLE_DATA=true` the seed creates two demo logins (password from `DEMO_PASSWORD`):

| Role | Email |
| --- | --- |
| Expert | `expert@demo.mentora.local` |
| Organization | `org@demo.mentora.local` |
| Admin | `ADMIN_EMAIL` from your `.env` |

Sample profiles are marked "Sample" on screen. Set `SHOW_SAMPLE_DATA=false` in production to hide them.

### Scripts

| Command | Does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and server |
| `npm run typecheck` / `npm run lint` | Static checks |
| `npm test` | Unit tests; set `TEST_DATABASE_URL` to an empty database to also run the integration tests |
| `npm run db:generate` | Create a migration after changing `src/db/schema.ts` |
| `npm run db:migrate` / `npm run db:seed` | Apply migrations / seed data |

## Deploying

1. Create a PostgreSQL database (for example Neon, Supabase, AWS RDS or Railway).
2. Set the environment variables from `.env.example`. Use `PAYMENT_PROVIDER=sslcommerz` with your store credentials, `SSLCOMMERZ_LIVE=true` once approved, a strong `NEXTAUTH_SECRET`, and `SHOW_SAMPLE_DATA=false`.
3. Run `npm run db:migrate`, then `npm run db:seed` once with `SEED_SAMPLE_DATA=false`.
4. Deploy with the included `Dockerfile` (any container host) or to Vercel. Point SSLCommerz's IPN URL at `https://<your-domain>/api/payments/sslcommerz/ipn`.
5. Health check: `GET /api/health`.

## Project layout

```
src/
  app/            pages, dashboards, API routes and server actions
  components/     shared UI
  db/             Drizzle schema and connection
  lib/            revenue rules, orders and fulfilment, payments, auth, queries
drizzle/          SQL migrations
scripts/          migrate and seed
tests/            unit and integration tests
docs/             static clickable prototype (GitHub Pages)
```

## Before launch

- Get written consent from every real expert and speaker before turning on their listing. The seed includes a **draft** profile for Quazi M. Ahmed, built from his public website, that stays hidden until he consents.
- Add terms of service, a privacy policy and a refund policy.
- Add email delivery for tickets, receipts and password reset (not built yet).
- Have a security review and load test done before taking real payments.

## Built by

[Upward](https://www.upwardbd.com) and [AZAI Labs](https://azailabs.dev) · Arifuzzaman Antor ([azantor.xyz](https://azantor.xyz))

© 2026 Arifuzzaman Antor. All rights reserved.
