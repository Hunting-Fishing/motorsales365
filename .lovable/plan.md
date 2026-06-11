## Why it's slow today

`src/routes/browse.$category.tsx` fetches everything client-side in a `useEffect` after hydration. The waterfall on each visit is roughly:

1. HTML loads with **no listings** (empty shell).
2. React hydrates, then fires a Supabase query with a wide embed (`listing_media`, `profiles`, `vehicles`, `vehicle_passport_verifications`) — one round trip.
3. A second await calls the `getActiveDealerStatus` server function — another round trip.
4. Only then are cards rendered.

The DB itself isn't the bottleneck (only ~22 rows; slowest query in pg_stat_statements is unrelated email/cron work), so the fix is on the **request pattern**, not Postgres sizing.

## Plan

### 1. Move the fetch into a TanStack Start server function + route loader (SSR)
- New `src/lib/browse-listings.functions.ts` exporting `getBrowseListings = createServerFn({ method: "GET" })` that takes `{ category, filters }`, validates with the existing Zod schema, and runs the Supabase query using `supabaseAdmin` (loaded inside the handler).
- Security: handler returns **only a safe projection** (the same columns the card needs) and re-applies the same `status IN ('active','pending_sale')` + `category_slug` filter — never returns full rows. Public-read semantics match today's RLS-allowed shape, so no policy widening.
- Route gets `loader: ({ context, params, deps }) => context.queryClient.ensureQueryData(browseQueryOptions(...))` plus `loaderDeps` returning the filter subset. Component switches to `useSuspenseQuery` so the first paint already has data (SSR-rendered HTML).

### 2. Parallelize dealer status
Inside the server-fn handler, run `Promise.all([listingsQuery, getActiveDealerStatusInternal(userIds?)])`. Today they're serial. For SSR we don't yet have `userIds`, so dealer status moves to a second `useQuery` (non-blocking) that overlays the dealer badge once it returns — listings show immediately.

### 3. Trim the embedded select
Replace the deep PostgREST embed with two flat queries inside the server fn (listings, then a single `profiles` + `vehicles` lookup keyed by the returned IDs). This avoids the join planner overhead per request and makes the response payload smaller.

### 4. Add one composite index
```sql
CREATE INDEX IF NOT EXISTS idx_listings_browse
  ON public.listings (category_slug, status, boost_until DESC NULLS LAST, published_at DESC NULLS LAST);
```
Plain `CREATE INDEX` in a migration (not `CONCURRENTLY`). Helps future growth even though current row count is small.

### 5. Quick wins in the component
- Remove the `JSON.stringify(...)` dep array (it allocates each render) in favor of `loaderDeps`.
- Keep the existing fuzzy-fallback path, but only run it when the first result is small AND a keyword is present (already does); move it into the server fn so it's one round trip total.

## Security notes
- No RLS policy changes. The server fn runs under service role but only returns a hard-coded allowlist of public columns already visible to anonymous browsing today.
- No new `anon` grants. No secret leakage — `supabaseAdmin` is `await import`-ed inside the handler.
- Auth-gated routes are unaffected; this route is public by design.

## Expected result
First contentful listings render with the SSR HTML (no post-hydration spinner). Subsequent filter changes hit the warmed query cache and one DB round trip instead of two serial ones.

## Files touched
- new: `src/lib/browse-listings.functions.ts`
- edit: `src/routes/browse.$category.tsx` (loader + `useSuspenseQuery`, drop client `useEffect` fetch)
- new migration: composite index above
