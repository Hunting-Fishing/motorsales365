## Goal

Build a global, admin-editable **Document Check** hub at `/document-check` covering vehicle import/export, transfer, insurance, and document requirements per country. Philippines ships with full content; ~15 other markets ship as flag stubs. Buyer Resources' "LTO & document check" link opens a per-country Quick Guide modal, with links to the full page and a downloadable PDF.

## Countries at launch

**Full content:** Philippines (LTO, DTI-FTEB, BOC, Insurance Commission).
**Stubs (flag + name + placeholder page + "Contribute" CTA):**
- ASEAN: Singapore, Malaysia, Thailand, Vietnam, Indonesia
- North America: United States, Canada
- Europe: UK, Germany, France, Netherlands, Spain, Italy (EU umbrella note)
- Asia-Pacific: Japan, South Korea, Australia, New Zealand

## Routes

```
src/routes/
  document-check.tsx              -> /document-check (hub layout, <Outlet />)
  document-check.index.tsx        -> world grid of country flags
  document-check.$country.tsx     -> per-country page (dynamic from DB)
  document-check.$country.quick-guide.pdf.tsx  -> PDF download endpoint
```

Per-country page is organized into five clearly-separated tabs/sections:
1. **Quick Guide** (collapsible summary — the buyer handbook)
2. **Buying & Transfer** (title/registration, ID, notarization, fees)
3. **Selling & Deregistration** (release of ownership, plate return)
4. **Import Laws** (age caps, homologation, duties, restricted vehicles)
5. **Export Laws** (clearance, customs, shipping docs)
6. **Insurance** (mandatory coverage, CTPL/TPL equivalents, providers)
7. **Document Reference** (OR/CR, deed of sale, PNP clearance, etc. — each with description + sample where allowed)

Every section has an "Agency links" list (official gov sources).

## Data model (Supabase, admin-editable)

New tables, all with narrow public `TO anon` SELECT on published rows, admin write via `has_role`:

- **`doc_check_countries`** — `code` (ISO-2, PK), `name`, `flag_emoji`, `region`, `slug`, `is_published`, `summary`, `currency`, `drives_on`, `sort_order`
- **`doc_check_sections`** — `country_code` FK, `kind` (`quick_guide`|`buying`|`selling`|`import`|`export`|`insurance`|`documents`), `title`, `body_md`, `sort_order`, `is_published`. Unique(country, kind, sort_order).
- **`doc_check_documents`** — `country_code`, `code` (e.g. `or_cr`), `name`, `description_md`, `who_issues`, `typical_cost`, `validity`, `sort_order`
- **`doc_check_agency_links`** — `country_code`, `section_kind`, `label`, `url`, `sort_order`
- **`doc_check_audit_log`** — who edited what, when

RLS: anon SELECT only where `is_published = true`; admin (`has_role(uid,'admin')`) full CRUD. GRANTs per policy: `SELECT` to `anon` and `authenticated` on published rows; `ALL` to `service_role`; admin writes gated by policy.

## Admin surface

New page `/admin/document-check` (admin-only) — country list, per-country editor with markdown fields for each section, document reference editor, agency links editor, publish toggle. Reuses existing admin shell and `has_role` gate.

## Quick Guide delivery (all three, as chosen)

1. **In-page collapsible** at the top of `/document-check/$country`.
2. **PDF download** — `/document-check/$country/quick-guide.pdf` server route renders the Quick Guide + Buying + Documents sections to PDF using `@react-pdf/renderer` (Worker-compatible, pure JS).
3. **Modal from Buyer Resources** — update `src/components/support/buyer-resources.tsx` (or wherever "LTO & document check" is linked in the listing sidebar) so the row opens a `QuickGuideModal` that fetches the Quick Guide for the listing's country (defaulting to PH). Modal has two CTAs: "Read full guide" → country page, "Download PDF" → PDF route.

## Philippines content (seeded via migration insert)

Seeded from existing knowledge in the codebase (`LTOVerificationForm`, `refund-policy`, `guidelines`) plus PH gov sources:
- Quick Guide: 10-step buyer checklist (verify OR/CR match, chassis/engine numbers, PNP-HPG clearance, deed of sale notarization, LTO transfer within 30 days, CTPL, etc.)
- Buying & Transfer: full LTO transfer flow with fees
- Selling: deed of sale template pointer, release of liability
- Import: age caps (5 years for used vehicles), BOC duties overview, homologation
- Export: BOC export declaration, ATA carnet notes
- Insurance: CTPL mandatory, comprehensive optional, PH providers list
- Documents: OR, CR, deed of sale, PNP-HPG clearance, macro-etching, valid IDs, TIN
- Agency links: lto.gov.ph, customs.gov.ph, insurance.gov.ph, dti.gov.ph

## Buyer Resources integration

Rewire the "LTO & document check" row so it:
- Detects the listing's country from `listings.region` / `attributes.country` (default `ph`).
- Opens `<QuickGuideModal country="ph" />` with the summary + top-10 checklist inline.
- Modal footer links to `/document-check/ph` and the PDF.

## Navigation & SEO

- Footer link: "Document Check" under Resources.
- Each country page has route-specific `head()` — title/description/OG mentioning the country and vehicle-law scope.
- Hub `/document-check` gets its own head() and a JSON-LD `ItemList` of countries.
- Sitemap includes hub + all published country pages.

## Terms & memory

- Update `/terms` "Last updated" note briefly ("Added country-specific Document Check reference pages").
- Add `mem://features/document-check` memory: scope, data model, PH-first rollout, admin-editable, Quick Guide is the buyer-resources handbook.

## Technical notes

- Content fetches: public read-only via server publishable client (server fn `getCountry`, `listCountries`, `getQuickGuide`), narrow anon SELECT policies.
- Markdown: render with existing markdown component (or `react-markdown` if not present) — no raw HTML injection.
- PDF: `@react-pdf/renderer` in a `/api/public/document-check/$country/quick-guide.pdf.ts` server route, streams `application/pdf`. Content pulled server-side via publishable client.
- No changes to existing LTO verification workflow — this is reference/education content, not verification.
- All new tables follow the standard GRANT-then-RLS structure; anon SELECT only where `is_published`.

## Out of scope for this pass

- Full content for non-PH countries (structure + stubs only; admin can fill later).
- Localization/translation (English only at launch).
- Country auto-detection by IP (default PH; user picks from the hub).
