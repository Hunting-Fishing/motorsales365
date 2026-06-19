# Rename Share Kit → QR Advertisements + filter + expanded categories

## 1. End-to-end rename

### URLs (with redirects from old paths)
- `/dashboard/share-kit` → `/dashboard/qr-ads`
- `/admin/advertisements/share-kit` → `/admin/advertisements/qr-ads`
- Old route files stay as thin redirect routes (`beforeLoad: throw redirect(...)`) so existing bookmarks, emails, and the "My QR" buttons keep working forever.

### UI labels (everywhere the strings appear)
- Page titles, headings, meta tags, breadcrumbs: "QR Advertisements" / "Your QR ads"
- Admin nav item under Advertisements: "QR Ads" (was "My QR / Share Kit")
- Dashboard tile + "Open share kit" buttons → "QR Ads"
- Upload dialog, empty states, toasts, tooltips: "ad", "QR ad template", "ads", not "share kit"

### Code rename
| Old | New |
|---|---|
| `src/lib/share-kit/` | `src/lib/qr-ads/` |
| `src/components/share-kit/` | `src/components/qr-ads/` |
| `src/lib/share-kit-templates.functions.ts` | `src/lib/qr-ad-templates.functions.ts` |
| `src/lib/share-kit-classify.functions.ts` | `src/lib/qr-ad-classify.functions.ts` |
| `src/lib/share-kit-layouts.functions.ts` | `src/lib/qr-ad-layouts.functions.ts` |
| `src/lib/share-kit-vision.functions.ts` | `src/lib/qr-ad-vision.functions.ts` |
| Route files `*.share-kit.tsx` | `*.qr-ads.tsx` |
| Query keys `["share-kit-*"]` | `["qr-ads-*"]` |
| Storage bucket `share-kit-templates` | keep as-is (renaming buckets re-signs every URL and breaks every existing flyer) |
| `localStorage` keys `share-kit-open-cats-v2` | `qr-ads-open-cats-v1` |

### Database rename (migration)
| Old table | New table |
|---|---|
| `share_kit_custom_templates` | `qr_ad_templates` |
| `share_kit_builtin_categories` | `qr_ad_builtin_categories` |
| `share_kit_hidden_builtins` | `qr_ad_hidden_builtins` |
| `share_kit_layouts` | `qr_ad_layouts` |

Done as `ALTER TABLE ... RENAME TO ...` inside one migration so data, RLS policies, GRANTs, triggers, and foreign keys move with the tables. Generated Supabase types regenerate automatically.

## 2. Search filter

Single search box at the top of both the dashboard and admin QR Ads pages.

- Client-side filter; case-insensitive; matches `label`, `description`, category label, and subcategory label.
- Stored in the URL as `?q=...` (TanStack search params with Zod validator) so links and refreshes preserve the filter.
- When a query is active, empty categories collapse out of the list and a counter shows "12 of 59 ads".
- Clear (×) button inside the input.

Admin-only extras already on the page (Auto-categorize / Smart fit) keep working and operate on the **filtered** set so admins can target a batch.

## 3. Expanded, site-aware categories

The new taxonomy matches what 365 Motor Sales actually sells: a business directory, vehicle/parts marketplace, towing/dispatch, training, and brand/referral content. Categories collapse to keep the page short; subcategories drive the AI auto-classifier prompt.

```text
Repair & Service Shops
  Auto Repair / Mechanic
  Body & Paint
  Detailing & Carwash
  Upholstery & Interior
  Tire / Wheel / Alignment
  Glass & Windshield
  AC / Electrical
  Diesel & Heavy-Duty
  Motorcycle Service
  Inspection & Testing

Towing & Roadside
  24/7 Tow
  Roadside Assistance
  Fleet & Dispatch
  Heavy Recovery

Sales & Marketplace
  Cars For Sale
  Motorcycles For Sale
  Trucks & Vans
  Heavy Equipment
  Boats & Marine
  Parts & Accessories
  Fuel / Lubricants
  Tools & Equipment

Insurance & Finance
  Insurance
  Financing & Loans
  Warranty & Protection

Training & Certification
  Courses
  Instructor Referrals
  Workshops & Events

Membership & Referrals
  365 Member Promo
  Referral Code Card
  Member Perks

Brand & Format (generic templates)
  Social Posts (1:1)
  Stories & Reels (9:16)
  Landscape Banner
  Print & Wearables
  Stickers & Decals
  Business Cards

Other
  Other
```

- Existing tagged ads are remapped automatically in the same migration (e.g. `tow-roadside` → `tow-247`, `print-wearables` stays, `advertising-365` social posts → `brand-format/social-posts`). Old subcategory keys that map cleanly are rewritten; anything ambiguous becomes `other` so admins can review.
- The classifier prompt is regenerated from the new tree (no separate edit needed; it's derived from `CATEGORY_TREE`).
- Filter dropdown is intentionally NOT added — you only asked for search. Categories still act as collapsible groups.

## Technical notes (for the implementer)
- TanStack route rename: create new `*.qr-ads.tsx` files, then replace the old `*.share-kit.tsx` files with `beforeLoad: () => { throw redirect({ to: '/dashboard/qr-ads', ... }) }`. The redirect files have no component.
- Search wiring: `validateSearch: zodValidator(z.object({ q: fallback(z.string(), '').default('') }))`, `Route.useSearch()` in the component, `navigate({ search: prev => ({ ...prev, q }) })` on input change with a 150ms debounce.
- DB migration is a single `ALTER TABLE … RENAME TO …` block for the 4 tables, plus an `UPDATE` block to remap legacy `category`/`subcategory` strings on `qr_ad_templates` and `qr_ad_builtin_categories`. RLS/grants travel with the rename.
- Auto-generated `src/integrations/supabase/types.ts` regenerates on the migration; all `.from('share_kit_*')` call sites get updated to `.from('qr_ad_*')` in the same pass.
- Storage bucket name stays `share-kit-templates` to avoid invalidating every signed URL currently embedded in flyers; only the code symbol referring to it is renamed.

## Out of scope
- Category dropdown / format / status filters (only search was requested).
- Re-running auto-categorization on every existing ad (admins can click "Auto-categorize" after the migration if they want to refine).
- Renaming the storage bucket.
