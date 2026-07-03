
# Clubs — accredited groups for Rides

Positioning: Clubs are curated, document-verified groups (LTO / SEC / DTI / other formal accreditation). Not open FB-style groups. Every club is admin-reviewed before it goes live. Future value: negotiated insurance rates, parts discounts, event partnerships.

## User-facing surfaces

- **`/clubs`** — public directory. Search, filter by type (riding club, car club, off-road, brand, region), verified-only toggle. Featured/curated rows on top.
- **`/clubs/$slug`** — public club page: cover, logo, verified badge, description, region, membership count, upcoming events, member rides, "Group perks — coming soon" section, Join / Request-to-join CTA.
- **`/clubs/apply`** — application form (must be signed in). Basic info + document upload. Goes to admin queue.
- **`/rides`** — add a **Clubs** tab alongside Rides, plus a "Featured Clubs" strip above the ride grid so discovery cross-flows.
- **`/dashboard/clubs`** — my clubs (owned + joined). Manage members, events, posts, application status.
- **`/dashboard/clubs/$id/*`** — owner/admin workspace: `members`, `events`, `settings`, `documents`.
- **`/admin/clubs`** — admin review queue for pending applications; approve / request changes / reject with note.

## Application & verification flow

1. User submits `/clubs/apply` with: name, type, region, description, logo, cover, contact email, and at least one accreditation document.
2. Row created in `clubs` with `status = 'pending'`. Not publicly listed.
3. Admin reviews at `/admin/clubs`, views documents (signed URLs), then approves → `status = 'active'` and `verified = true`, or rejects with reason (visible to applicant in `/dashboard/clubs`).
4. Approved club becomes publicly visible with a Verified badge and unlocks perks placeholder.

## v1 feature set (per approved club)

- **Members** — request-to-join; owner/admin approves. Roles: `owner`, `admin`, `member`.
- **Events / group rides** — title, date, meetup location, description, RSVP list.
- **Attached rides** — members can showcase Rides (from existing `rides` table) on the club page.
- **Perks placeholder** — static "Group perks coming soon: insurance, parts discounts, event access" block that admins can later populate.
- **Announcements** — owner/admin-only posts (keeps signal high, avoids FB-noise feed).

## Design & UX

- Reuse existing tokens (no new palette). Same card/grid rhythm as `rides.index.tsx` and `businesses.index.tsx`.
- Verified badge reuses `verified-badge.tsx` pattern.
- Club card: cover image, logo overlay, name, verified check, type/region chips, member count.

## Technical section

### Data model (migration)

Enums:
- `club_type`: `motorcycle_riding`, `car_club`, `off_road`, `truck_club`, `brand_owners`, `general_motoring`, `other`
- `club_status`: `pending`, `active`, `rejected`, `suspended`
- `club_member_role`: `owner`, `admin`, `member`
- `club_member_status`: `pending`, `active`, `banned`
- `club_document_kind`: `lto_accreditation`, `sec_incorporation`, `dti_business_permit`, `other`

Tables (all in `public`, with grants + RLS as per project rules):

- `clubs`: id, owner_id, slug (unique), name, type (club_type), description, region, city, logo_url, cover_url, contact_email, contact_phone, website_url, status, verified bool, member_count int, review_notes, reviewed_by, reviewed_at, created_at, updated_at.
- `club_documents`: id, club_id, kind (club_document_kind), storage_path, original_filename, uploaded_by, created_at. Private storage bucket.
- `club_members`: id, club_id, user_id, role, status, joined_at, created_at. Unique(club_id, user_id).
- `club_events`: id, club_id, created_by, title, description, starts_at, ends_at, meetup_location, meetup_lat, meetup_lng, cover_url, status, created_at, updated_at.
- `club_event_rsvps`: id, event_id, user_id, response (going/maybe/no), created_at. Unique(event_id, user_id).
- `club_rides`: id, club_id, ride_id, added_by, created_at. Unique(club_id, ride_id). Links to existing `rides`.
- `club_posts`: id, club_id, author_id, body, created_at (owner/admin only).

### RLS (summary, plain English)

- **clubs**: anyone can read rows where `status = 'active'`; owner + club admins can read their own regardless of status; owner + admins can update; only owner can delete; insert requires `auth.uid() = owner_id`. Admin role bypasses via `has_role`.
- **club_documents**: only owner/admins of the club, and platform admins, can read; only owner/admins can insert.
- **club_members**: public can see roster of active clubs; user can insert their own pending join request; owner/admins can update/approve/remove; user can delete their own membership.
- **club_events**: public read for active clubs; owner/admins insert/update/delete.
- **club_event_rsvps**: user manages their own; club members can read roster.
- **club_rides**: member self-adds their own ride; owner/admins can remove.
- **club_posts**: public read for active clubs; owner/admins write.

Helper SECURITY DEFINER function `is_club_admin(_user, _club)` to avoid recursive RLS.

Trigger: `club_members` insert/delete of `status = 'active'` updates `clubs.member_count`.

### Storage

- Bucket `club-docs` (private) — accreditation files. RLS on `storage.objects` limits SELECT to owner/admins + platform admins.
- Bucket `club-media` (public) — logos, covers, event images.

### Server functions (`src/lib/clubs.functions.ts`)

- `applyForClub` — validate input, insert `clubs` row (`status='pending'`) + `club_documents` rows referencing already-uploaded storage paths.
- `listPublicClubs` — public read via publishable server client for `status='active'` (safe columns).
- `getClub(slug)` — public detail for active clubs.
- `requestJoinClub`, `respondToJoinRequest`, `leaveClub`.
- `createEvent`, `updateEvent`, `rsvpEvent`.
- `attachRideToClub`, `detachRideFromClub`.
- `listMyClubs` (owned + joined).
- Admin-guarded (`has_role(admin)`): `listPendingClubs`, `reviewClubApplication(id, decision, notes)`.

### Routes to add

- `src/routes/clubs.index.tsx` (public + SSR + head meta)
- `src/routes/clubs.$slug.tsx` (public + head + og:image from cover)
- `src/routes/clubs.apply.tsx` (public route with sign-in CTA, or gated form)
- `src/routes/_authenticated/dashboard.clubs.tsx`
- `src/routes/_authenticated/dashboard.clubs_.$id.tsx` (+ `.members`, `.events`, `.documents`, `.settings` children)
- `src/routes/admin.clubs.tsx` (admin review queue)
- Rides tab integration: extend `rides.index.tsx` with a `Clubs` tab and a "Featured clubs" strip.

### Components (`src/components/clubs/`)

- `club-card.tsx`, `club-hero.tsx`, `club-directory-filters.tsx`
- `club-application-form.tsx` (with `club-document-uploader.tsx`)
- `club-members-list.tsx`, `join-request-button.tsx`
- `club-events-list.tsx`, `club-event-form.tsx`
- `club-rides-strip.tsx` (reuses `ride-card.tsx`)
- `admin-club-review-card.tsx`

### Policy touch-points

- Update `/terms`: add Clubs section (accreditation required, admin review, suspension, no MLM/political/religious recruitment, perks are future/negotiated separately).
- Update `/privacy`: uploaded accreditation documents are stored privately, retained while club is active, deleted on rejection/removal request.
- Bump "Last updated" on both.

### Out of scope for v1 (call out explicitly)

- Member-to-member chat/feed.
- Paid memberships or dues.
- Live activation of insurance/parts discounts (perks placeholder only).
- Multi-chapter hierarchy.
- Public event ticketing / payments.

## Rollout order

1. Migration (tables, enums, RLS, grants, trigger, helper fn) + storage buckets.
2. Server functions + admin review server functions.
3. Public routes (`/clubs`, `/clubs/$slug`, `/clubs/apply`).
4. Dashboard routes (my clubs, manage members/events/documents).
5. Admin review queue.
6. Rides tab integration + featured strip.
7. Terms & Privacy updates.
