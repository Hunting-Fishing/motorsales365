
## Goal

Bring back the clean, compact "restaurant menu" service editor that already exists in the codebase as `src/components/business/services-table.tsx`. You were right — that exact format is still in the repo, just disconnected. The current Services tab is using a heavier picker + per‑service modal that doesn't match what we shipped originally.

## What lives in the codebase already (unused)

- `src/components/business/services-table.tsx` — `ServicesTable` component:
  - Single **"+ Add service" dropdown** (one‑line items, tailored to the business type via `listCatalogForType(typeSlug)`)
  - Spreadsheet table: **Service · Price (₱) · Unit · Notes · Market · Delete**
  - **Custom item** = small inline dialog (name, price, unit, description) → adds the row immediately AND submits to admin for review (`submitServiceSuggestion`). Row shows a "Pending review" badge until approved.
  - **Market** column = popover with `count · avg · min–max` from `getServicePriceStats`, plus a sample list once 3+ providers price it. This is exactly the data‑collection / cross‑business comparison angle you asked for.
- `src/lib/business-services-save.functions.ts` — `saveBusinessServices` server fn that persists the whole `DraftService[]` in one call (delete + insert, RLS‑enforced).

Both have been sitting idle since we switched to the catalog‑card UI.

## What to change

### 1. `src/routes/dashboard.businesses_.$id.edit.tsx` — `ServicesTab`

Replace the entire current body (the `showPicker` toggle, `CatalogPicker`, grouped `ServiceMenuRow` rendering, and the `ServiceEditor` modal mount) with the original table:

```tsx
import { ServicesTable, type DraftService } from "@/components/business/services-table";
import { saveBusinessServices } from "@/lib/business-services-save.functions";

function ServicesTab({ businessId, typeSlug, services, onChange }) {
  const save = useServerFn(saveBusinessServices);

  // Adapt existing DB rows -> DraftService shape the table expects
  const initial: DraftService[] = useMemo(
    () => services.map((s) => ({
      catalog_id: s.catalog_id ?? null,
      pending_suggestion_id: s.pending_suggestion_id ?? null,
      title: s.title,
      description: s.description ?? null,
      unit: s.unit ?? null,
      price_php: s.price_php ?? null,
      notes: s.price_label ?? null,
    })),
    [services],
  );

  const [draft, setDraft] = useState<DraftService[]>(initial);
  useEffect(() => setDraft(initial), [initial]);

  // Debounced autosave on any change (300–500ms)
  const dirty = draft !== initial;
  useDebouncedEffect(() => {
    if (!dirty) return;
    save({ data: { businessId, services: draft } })
      .then(() => onChange());
  }, [draft], 400);

  if (!typeSlug) return <Card>Choose a business type first.</Card>;

  return <ServicesTable typeSlug={typeSlug} businessId={businessId} value={draft} onChange={setDraft} />;
}
```

Delete from the file:
- `ServiceMenuRow` (lines ~1095–end of that function)
- `ServiceEditor` (lines ~1204–end of that function)
- The `CatalogPicker` import and the `showPicker` / grouped-by-category rendering

Keep `upsertBusinessService` / `deleteBusinessService` imports only if they are still used by other tabs in the file; otherwise drop them too.

### 2. Nothing else needs to change

- `services-table.tsx` already does the catalog dropdown, custom‑item dialog, market stats popover, and pending‑review badge — leave it alone.
- `business-services-save.functions.ts` already handles persistence — leave it alone.
- Public business page (`src/routes/businesses.$slug.tsx`) reads the same `business_services` rows and keeps working.

## Why this is the right call

- **Clean & compact** — one row per service, fits the screen, no nested cards or modals for the 95% case.
- **User‑friendly for non‑tech owners** — pick from a list, type a price, done. Custom item is a 3‑field dialog, not a full form.
- **Standardized across business types** — same UI for fuel stations, tow, repair, etc. Catalog is data‑driven per `typeSlug`.
- **Growth + data collection** — every custom item goes into `service_suggestions` for admin review and feeds the catalog over time.
- **Service / comparison** — the **Market** column shows real cross‑business pricing, which is the comparison feature you've wanted users to see when sorting/searching.

## Files to edit

- `src/routes/dashboard.businesses_.$id.edit.tsx` — replace `ServicesTab` body; delete `ServiceMenuRow` and `ServiceEditor`.

## Out of scope

- Catalog seed data (already populated for all business types last turn).
- Admin review screen for `service_suggestions` (already exists).
- Products tab.
- DB schema / migrations.
