## Plan: finish the Advertiser inquiry channel

The `/advertise` page and `/admin/advertising` inbox already exist. Four follow-up tasks remain to make the channel production-ready:

### 1. Stricter form validation on `/advertise`
- Add a Zod schema in `src/routes/advertise.tsx`:
  - `contact_name`: trimmed, 1–100 chars
  - `company`: optional, ≤120 chars
  - `email`: valid email, ≤255 chars
  - `phone`: optional, ≤30 chars, basic digit/`+`/space regex
  - `placement`: enum from `PLACEMENTS`
  - `budget_range`: optional, ≤60 chars
  - `start_date`: optional ISO date, must be today or later
  - `message`: 10–2000 chars
- Show inline field errors (per-field state) and disable submit while invalid.
- Mirror length caps in a DB trigger on `ad_inquiries` so server-side enforcement matches client.

### 2. Inquiry status flow polish (admin panel)
The status select already exists; tighten it:
- Restrict valid transitions in a `BEFORE UPDATE` trigger on `ad_inquiries`:
  - `new → in_review | spam`
  - `in_review → quoted | lost | spam`
  - `quoted → won | lost`
  - `won`, `lost`, `spam` are terminal (admin override only)
- Auto-bump `new → in_review` already happens on first staff reply — keep it.
- Add an "Assign to me" button that sets `assigned_to = auth.uid()`; show assignee chip on each row.
- Add a small filter for "Assigned to me" alongside the status filter.

### 3. Email notifications
Two new templates registered in `src/lib/email-templates/registry.ts`:
- `ad-inquiry-received` — sent to the advertiser confirming submission (uses `contact_name`, `placement`, summary of next steps).
- `ad-inquiry-staff-notice` — sent to a staff distro (`partners@365motorsales.ph`) with submitter details + link to `/admin/advertising`.
- `ad-inquiry-reply` — sent to the advertiser whenever a staff reply is inserted into `ad_inquiry_messages`.

Wiring:
- On insert into `ad_inquiries`, a Postgres trigger calls `enqueue_email` (already exists) with both the confirmation and staff-notice payloads.
- On insert into `ad_inquiry_messages` where `from_staff = true`, a trigger enqueues the reply email to the inquiry's submitter email.
- Re-use the existing email queue worker — no new edge function needed.

### 4. Discoverability
- Add an "Advertise with us" link in `src/components/site-footer.tsx` (Partners column) and a subtle CTA card on the homepage's secondary section.
- Add the `/advertise` route to `src/routes/api/sitemap[.]xml.tsx`.

### Out of scope
- Ad serving, impression tracking, online ad-space checkout.
- Public advertiser self-serve dashboard beyond the existing "submitter reads own thread" RLS.

### Verification
- Manually submit an inquiry as anon and as a logged-in user; confirm both rows land and the confirmation email is queued.
- Flip statuses through the legal transitions and assert that invalid jumps are rejected by the trigger.
- Re-run `./scripts/verify-security.sh` (allow-list unchanged — no new SECURITY DEFINER functions are introduced beyond existing helpers).