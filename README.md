# Mentora — Expert Marketplace for Learning & Leadership

Mentora connects organizations with vetted **trainers, facilitators, coaches, consultants and keynote speakers**. In one place they can book in-house programs, register for paid workshops, run **AI for Leaders** programs and issue **verifiable certificates**. Every transaction feeds a built-in revenue ledger.

> **Status:** clickable MVP prototype (a single `index.html`, no backend). Apart from Arifuzzaman Antor's profile, every person, organization, price and record in it is sample data.

## Try it

Open `index.html` in a browser, or use the GitHub Pages link once Pages is turned on. Switch roles with **View as** in the header.

**5-minute demo path**

1. **Visitor** → Workshops → register for a seat and pay (demo checkout).
2. **Visitor** → open an expert profile → Request a proposal.
3. **Expert** → Leads & quotes → send a quote. The form shows your take-home after commission.
4. **Organization** → Needs & proposals → Accept & pay.
5. **Admin** → Revenue overview → see the split between the expert, the platform and the partners.

Demo data is saved only in your browser. Use **Reset demo** to start over.

## What's in the MVP

| Module | MVP features |
| --- | --- |
| Expert marketplace | Profiles with packages, ratings and reviews · filters by role, topic, format and language · proposal requests · quotes · accept-and-pay · subscription plans · featured boost · verified badge |
| Speakers bureau | Icon / Executive / Expert tiers · availability enquiries · admin pipeline (enquiry → quoted → confirmed) |
| Paid workshops | Online and onsite listings · seat limits · bKash / Nagad / card checkout (demo) · e-tickets · expert-created workshops with approval |
| AI for Leaders | Three packages (executive briefing, one-day intensive, cohort) · in-house requests · cohort enrolment |
| Certification portal | Certificates with a unique ID and QR code · public verification page |
| Organization dashboard | Needs, proposals, bookings, invoices, employee certificates, annual plans |
| Expert dashboard | Leads, quotes, workshops, certificates, earnings, payouts, plan and boost |
| Admin dashboard | Approvals · speaker and AI program pipelines · sponsorship inventory · payouts · full ledger with CSV export · fee, commission and partner-split settings |

The **Feature map** page in the app lists all 48 features (31 in the MVP, 11 in Phase 2, 6 in Phase 3), each with its revenue role.

## Revenue model (sample rates, all editable in Admin → Fees & split)

| Stream | Rate |
| --- | --- |
| Booking commission | 10–20 % by expert plan |
| Workshop tickets | 15 % platform fee |
| Speaker fees | 20 % agency fee |
| AI for Leaders | Program fee; 60 % to the facilitator |
| Certificates | ৳500 each |
| Expert subscriptions | ৳0 / ৳1,500 / ৳4,000 per month |
| Featured listings | ৳2,000 per 30 days |
| Organization plans | From ৳1,50,000 per year |
| Sponsorship | From ৳25,000 |

Platform revenue is split between the operating partner and the technology partner at a configurable rate.

## Recommended production stack

Next.js + TypeScript · PostgreSQL with role-based access · Bangladesh payment gateway (bKash, Nagad, cards) · AWS hosting with backups and monitoring · automated end-to-end, security and load testing before every release.

## Built by

[Upward](https://www.upwardbd.com) and [AZAI Labs](https://azailabs.dev) · Arifuzzaman Antor ([azantor.xyz](https://azantor.xyz))

© 2026 Arifuzzaman Antor. All rights reserved.
