## Support Center — `/support`

A single, professional support page for 365 Motor Sales with annotated screenshots, step-by-step how-tos, an FAQ, and contact options.

### Route & SEO
- New route: `src/routes/support.tsx` (mapped to `/support`)
- Unique `head()` metadata: title "Help & Support — 365 Motor Sales", description, og:title, og:description, canonical
- JSON-LD `FAQPage` schema embedded for SEO rich results
- Add a "Support" link to the site footer (`src/components/site-footer.tsx`)

### Page structure (single page, jump-anchored)

```text
┌──────────────────────────────────────────────┐
│  Hero: "How can we help?" + search box +     │
│        4 topic quick-link cards              │
├──────────────────────────────────────────────┤
│  Getting Started (sticky in-page nav)        │
├──────────────────────────────────────────────┤
│  Topic 1 — Buying a vehicle                  │
│    • How to search & filter [screenshot]     │
│    • Contacting a seller safely [screenshot] │
│    • Safe meetup checklist                   │
├──────────────────────────────────────────────┤
│  Topic 2 — Selling & boosting                │
│    • Create a listing (step-by-step)         │
│    • Photo tips                              │
│    • Boost your listing [screenshot]         │
│    • Mark as sold                            │
├──────────────────────────────────────────────┤
│  Topic 3 — Account & verification            │
│    • Sign up / log in                        │
│    • Reset password                          │
│    • Get the Verified badge [screenshot]     │
├──────────────────────────────────────────────┤
│  Topic 4 — Business, shop & payments         │
│    • Set up a business page [screenshot]     │
│    • Manage affiliate shop links             │
│    • Boost / business checkout & receipts    │
│    • Refunds                                 │
├──────────────────────────────────────────────┤
│  FAQ (accordion, ~12 questions)              │
├──────────────────────────────────────────────┤
│  Still need help? — Contact card             │
│    [Email support] [Contact form] [Messenger]│
└──────────────────────────────────────────────┘
```

### Annotated screenshots
- Capture each target page from the live preview at desktop and mobile widths using the browser tool: `/`, `/sell`, `/dashboard`, `/dashboard/businesses`, `/dashboard/verification`, `/admin/shop` (for shop-owner how-to), `/pricing`
- Save originals to `src/assets/support/` (webp, optimized)
- Build a reusable `<AnnotatedScreenshot>` component (`src/components/support/annotated-screenshot.tsx`) that overlays SVG arrows, numbered badges, and short callout labels on top of the image — keeps annotations crisp at any size and stays editable later
- Each how-to step pairs a numbered instruction with the matching numbered badge on the screenshot

### Components to create
- `src/components/support/annotated-screenshot.tsx` — image + SVG overlay (arrows, dots, labels)
- `src/components/support/support-step.tsx` — numbered step row (number, title, description)
- `src/components/support/topic-section.tsx` — section wrapper with anchor id + heading
- `src/components/support/faq-accordion.tsx` — wraps shadcn `Accordion` with FAQPage JSON-LD friendly markup

### Contact block
- Email: `mailto:support@365motorsales.com?subject=Support%20request`
- Existing contact form: link to `/contact`
- Messenger / WhatsApp: button placeholders wired to `#` with a TODO comment — you'll drop in the real URLs

### Design
- Matches the rest of the site (uses tokens from `src/styles.css`, shadcn `Card`, `Accordion`, `Button`, `Input`)
- Hero uses brand accent gradient; topic cards use subtle borders + icon (lucide: `Search`, `Tag`, `UserCheck`, `Store`)
- Screenshot frames use rounded corners, soft shadow, and a thin border so annotations read clearly on light backgrounds

### Out of scope (can add later)
- Per-article sub-routes (current scope: single page)
- Search backend — the hero search box scrolls/filters in-page only
- Live chat widget
