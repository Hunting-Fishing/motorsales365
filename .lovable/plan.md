# Continue Audit Repair — Next Sequential Steps

Picking up exactly where we left off, no jumps. Phase 0 + most of Phase 2 infrastructure are done. Next in strict order:

## Step 1 — Finish Phase 1: Type safety in money paths

Remove remaining `as any` casts in payment/webhook code.

Files:
- `src/routes/api/public/payment-events.tsx` — replace `as any` with `Stripe.Event` / `Stripe.PaymentIntent` / `Stripe.Charge` types from the stripe SDK.
- `src/utils/payments.functions.ts` — type the Stripe client responses and DB row shapes (use generated `Database` types).
- `src/lib/payments/provider.ts` — narrow provider union type instead of `any`.

Acceptance: 0 `as any` in those three files; `tsc` clean.

## Step 2 — Phase 1 residual: admin write guard sweep

Audit every server fn that performs admin writes for `requireAdminRoleAudited`. Confirm `admin.reports.tsx` loader has error boundary using the new `RouteError` component. Add 500-row pagination cursor to `dashboard.messages.tsx` query.

## Step 3 — Phase 2: Per-route `head()` sweep (highest SEO impact)

Add `head()` to public/shareable routes missing metadata. Per `tanstack-route-architecture` rules: title in `meta`, canonical on leaves only, og:url per-route, no og:image unless real asset exists.

Public routes to update (title + description + og:title + og:description + og:url + canonical):
- `/shop`, `/businesses`, `/learn`, `/rides`, `/map`, `/tow`, `/export`, `/checkout`
- `/passport/*` leaves, `/seller/*` leaves
- `/advertise`, `/partner-training`, `/my-qr`
- Dynamic: `/r/$code`, `/c/$code` — derive from loader data

Admin/dashboard routes get `meta: [{ name: "robots", content: "noindex,nofollow" }]`:
- `/admin/*`, `/dashboard/*`, `/account/*`

Acceptance: every route in `routeTree.gen.ts` has a `head()` or is explicitly noindex'd.

## Step 4 — Phase 2: Wire JSON-LD + sitemap completion

- Activate `use-dynamic-jsonld.ts` on `/shop/$id`, `/businesses/$id`, `/learn/$slug` (Product, LocalBusiness, Article).
- Extend `src/routes/sitemap[.]xml.ts` with `/export`, `/tow`, `/partner-training`, `/advertise`, `/passport`, `/seller`, plus dynamic `/r/*` and `/c/*` from DB.
- Attach `RouteError` / `RouteNotFound` to every route with a loader.

## Step 5 — Phase 2 close: orphan route nav links

Add nav entries (or remove the routes) for `/my-qr`, `/export`, `/partner-training`, `/r/$code/poster`. Default: link from dashboard sidebar.

---

After Step 5, Phases 1+2 are 100% closed. Phases 3 (payments abstraction), 4 (a11y/legal/localStorage), 5 (tests) come next as separate plans.

## Scope guarantees
- No new APIs, no new SaaS, no new providers — in-house only
- No business logic changes, only typing + metadata + nav wiring
- No edits to auto-generated files (`routeTree.gen.ts`, `types.ts`, `client.ts`)
- Legal page updates only if a touched route changes user-facing terms (none in steps 1–5)

Approve to execute Step 1 first.