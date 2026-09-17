# Pickleball Court Reservation System

Next.js 14 (App Router, TypeScript) + Supabase (Postgres, Auth, Storage), styled with
Tailwind. Built against the 5-court reservation spec: online booking, temporary slot
holds, manual GCash/bank payment verification, and an admin dashboard.

## What's built and working

**Phase 1 — Foundation**
- Full Postgres schema (`supabase/migrations/0001_init.sql`): `profiles`, `courts`,
  `reservations`, `payments`, `blocked_slots`, `payment_methods`, `settings`.
- Row Level Security on every table: customers only ever see their own data; a public
  `court_availability` view exposes just court/time info to anonymous visitors, never
  names, phone numbers, or payment details.
- Auto-provisioning of a `profiles` row on signup via trigger.

**Phase 2 — Reservation engine (the hard part)**
- **Double-booking is prevented by the database itself**, not app code: `reservations`
  has a Postgres `EXCLUDE USING gist` constraint on `(court_id, during)` where `during`
  is a generated `tstzrange`. Two live reservations on the same court can never overlap
  — this holds even under a race condition (two people submitting the same slot at the
  same millisecond), which is something application-level checks alone cannot guarantee.
- Temporary slot hold: booking a court inserts a `pending_payment` reservation with a
  `hold_expires_at` (default 15 min, configurable in `settings`). `expire_stale_holds()`
  flips expired holds back to `expired`, freeing the slot — wire this to Supabase's
  pg_cron (commented at the bottom of the migration) or a scheduled Edge Function.
- Price calculation (`lib/pricing.ts`): Hourly Rate × Hours = Total, matching the spec.
- Working booking UI: date picker → 5 court cards (mobile-first, card-based per the
  spec) → time/duration picker → live hold with countdown timer → booking number.
- `POST /api/reservations` and `GET /api/courts` implement the create-hold and
  availability-read paths, including the friendly error when the DB rejects an overlap.

**Phase 4 — Admin (scaffolded)**
- `/admin` is gated in `middleware.ts` — only `profiles.role IN ('staff','admin')` gets
  past the redirect.
- Dashboard reads today's reservations per court directly from Supabase and renders the
  PAID/PENDING view from the spec. Sidebar nav stubs for Reservations, Calendar, Courts,
  Payments, Customers, Blocked Slots, Reports, Settings — pages not yet implemented.

## What's intentionally not built yet

This was scoped to get the foundation and booking engine solid and correct first,
since everything else depends on it. Still to do, in the order I'd tackle them:

- **Phase 3 — Payments**: payment method selection screen, proof-of-payment upload to
  Supabase Storage, and the admin verify/reject action that flips a `pending_payment`
  reservation to `confirmed` (and its `payments` row to `verified`).
- **Auth pages**: `/login`, `/signup`, magic-link or password flow via Supabase Auth.
- **Customer account**: `/my-bookings` (route already reserved in middleware).
- **Admin CRUD pages**: courts, blocked slots, customers, reports.
- **Booking confirmation card + QR code** (`qrcode.react` is already in
  `package.json` for this).
- **Email notifications** on booking/confirmation/expiry.
- **PWA service worker** — `public/manifest.json` is in place; needs a `sw.js` and
  install-prompt handling.
- Real app icons (`/public/icon-192.png`, `/public/icon-512.png` — currently referenced
  but not included).

## Setup

1. **Create a Supabase project** at supabase.com.
2. **Run the migration**: paste `supabase/migrations/0001_init.sql` into the Supabase
   SQL editor and run it (or `supabase db push` if you're using the CLI).
3. Copy `.env.local.example` to `.env.local` and fill in your project's URL and keys
   (Project Settings → API).
4. Install dependencies and run locally:
   ```bash
   npm install
   npm run dev
   ```
5. To promote a user to staff/admin (so they can access `/admin`), update their row:
   ```sql
   update public.profiles set role = 'admin' where id = '<their auth.users id>';
   ```
6. Optional but recommended once types stabilize:
   `npm run gen:types` regenerates `lib/supabase/database.types.ts` from your live
   schema instead of the hand-written version checked in here.

## Deploying

- **Frontend**: push to GitHub, connect the repo to Netlify (per the spec).
  Build command `next build`, and use the Next.js Runtime for Netlify so API routes
  and middleware work correctly.
- **Backend**: nothing to deploy — Supabase is already hosted. Just make sure the
  pg_cron job for `expire_stale_holds()` is scheduled (see the migration file), or slots
  will stay "held" past their 15-minute window.

## Project structure

```
app/
  page.tsx                 customer home/booking page
  api/reservations/route.ts   creates a slot hold
  api/courts/route.ts          courts + availability for a given date
  admin/                       staff dashboard (gated by middleware.ts)
components/
  BookingApp.tsx            date + court list orchestration
  CourtCard.tsx              single court status card
  BookingDrawer.tsx          time/duration picker, hold countdown, confirmation
lib/
  pricing.ts                 rate x hours = total
  availability.ts             client-side overlap pre-check + time-slot generation
  supabase/                   browser + server Supabase clients, DB types
supabase/migrations/0001_init.sql   full schema, RLS, exclusion constraint
middleware.ts                 session refresh + /admin route gate
```
