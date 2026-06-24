## Goal
Promote the Parts hub in primary navigation, lay the foundation for an OEM parts-ordering experience (VIN/chassis or make+model lookup) shown as a real, working *Coming Soon* interest-capture, and make sure the admin can see the demand. Used-parts browsing already lives at `/parts` and stays unchanged. The admin page `/admin/parts` already exists and is already listed in the admin sidebar — we extend it with an "Interest leads" tab.

## What changes for users

**Header & footer nav**
- `src/components/site-header.tsx` — add a `Parts` link in the desktop nav (between `Shop` and `Learn`), pointing to `/parts`.
- `src/components/site-footer.tsx` — add `Parts` under the existing marketplace column (verify position).
- Mobile tab bar already only has 5 slots and stays as-is; the header link covers mobile via the menu.

**`/parts` page — new tab "Order OEM parts"**
A third tab is added next to *Find a part (wizard)* and *Browse all*:

- Clear headline: **Online OEM parts ordering — coming soon**. No fake catalog, no fake prices.
- Two real input modes (toggle):
  1. **By VIN / chassis number** — single input, 11–17 chars, validated.
  2. **By vehicle** — make, model, year, optional trim/engine. Reuses the existing `VehiclePicker` pattern.
- Free-text "What part(s) do you need?" field, optional photo upload (skip in this pass — text only).
- Contact: email (required), phone (optional). If user is logged in, prefilled from profile.
- Submit → writes a row to a new `oem_parts_interest` table and shows a success state: "Thanks — we'll email you the moment OEM ordering goes live for your vehicle." No fake ETA.
- A small explainer card under the form: what OEM ordering will include (genuine parts sourced through partner dealers, fitment guaranteed, PH-wide shipping) — written as roadmap, not as live promises.

## What changes for admin

**`/admin/parts`** — already exists with tabs *Quotes / Catalog / Tires / Setup*. We add one more tab: **Interest leads**.
- Table of `oem_parts_interest` rows: created date, vehicle (VIN or make/model/year), parts requested, contact, status.
- Status workflow: `new` → `contacted` → `quoted` → `closed_won` / `closed_lost`. Admin can change status and add an internal note.
- Server fns live in `src/lib/parts-fulfillment.functions.ts` (extend existing file): `adminListPartsInterest`, `adminUpdatePartsInterest`. Both gated by `requireSupabaseAuth` + `has_role('admin')`.

## Database (one migration)

New table `public.oem_parts_interest`:
- `id uuid pk`, `user_id uuid null` (no FK to `auth.users`), `vin text null`, `make text null`, `model text null`, `year int null`, `trim text null`, `engine text null`, `parts_description text not null`, `contact_email text not null`, `contact_phone text null`, `status text not null default 'new' check (...)`, `admin_notes text null`, `source text default 'parts_page'`, `created_at`, `updated_at`, plus the standard updated-at trigger.
- GRANTs: `INSERT` to `anon, authenticated`; `SELECT/UPDATE` to `authenticated` (gated by admin policy); `ALL` to `service_role`.
- RLS: anyone (anon or auth) can insert their own lead; only `has_role(auth.uid(),'admin')` or `'moderator'` can select/update.

## Server functions
In `src/lib/parts-fulfillment.functions.ts`:
- `submitOemPartsInterest` — public `createServerFn`, Zod-validated (VIN regex OR make+model+year required; email required; description 5–1000 chars). Uses `supabaseAdmin` inside the handler. Lightweight rate limit by IP/email pair (best-effort: check for >5 in last hour).
- `adminListPartsInterest({ status? })` — admin-only.
- `adminUpdatePartsInterest({ id, status?, admin_notes? })` — admin-only.

## Files touched
- New: `supabase/migrations/<ts>_oem_parts_interest.sql`
- New: `src/components/parts/oem-order-form.tsx`
- Edited: `src/routes/parts.tsx` (add third tab)
- Edited: `src/routes/admin.parts.tsx` (add "Interest leads" tab)
- Edited: `src/lib/parts-fulfillment.functions.ts` (3 new server fns + types)
- Edited: `src/components/site-header.tsx` (add Parts link)
- Edited: `src/components/site-footer.tsx` (add Parts link)

## Out of scope (deliberate)
- No real OEM catalog, no live pricing, no checkout/payments. Those land in a follow-up once a dealer-supply partner is wired up.
- No VIN decoder API integration yet — we store the raw VIN; decoding can be added later.
- No customer-facing "my parts orders" dashboard yet.
