# Verify Shop Manager secrets

You're unsure whether the 3 secrets were entered correctly. Instead of asking you to re-enter them blindly, I'll add a small **admin-only diagnostic** that tests each one and tells you in plain English what's wrong (if anything).

## What the check does

For each secret, it runs a safe, read-only test:

| Secret | Test | Pass = | Fail tells us |
|---|---|---|---|
| `SHOP_MANAGER_SUPABASE_URL` | Is it a valid `https://*.supabase.co` URL? | Format is correct | You pasted a key or random string instead of a URL |
| `SHOP_MANAGER_SUPABASE_SERVICE_ROLE_KEY` | Decode the JWT and check the `role` claim | Claim says `service_role` | You pasted the **anon/publishable** key (claim would say `anon`) or it isn't a JWT at all |
| `SHOP_MANAGER_SSO_SECRET` | Length + entropy check, and confirm it is NOT identical to the service role key or URL | It's a distinct random string | You reused one of the other two values |

Then it does **one live call** to the partner backend: `auth.admin.listUsers({ perPage: 1 })`. If the URL + service role key are a matching valid pair, this returns `200 OK` with a user count. If not, the partner returns `401/403` and we surface the exact message.

No data is created, no users are touched.

## Where it lives

- New server fn `diagnoseShopManagerSecrets` in `src/lib/shop-manager.functions.ts` — gated to **admins only** (`has_role(auth.uid(), 'admin')`).
- New "Diagnostics" card on `/shop-manager` that only renders for admins, with a **"Run check"** button and a clear pass/fail readout per secret + the live partner ping result.

## What you'll see after running it

A simple table like:

```
SHOP_MANAGER_SUPABASE_URL              ✅ Valid Supabase URL
SHOP_MANAGER_SUPABASE_SERVICE_ROLE_KEY ❌ This is an ANON key, not a service role key
SHOP_MANAGER_SSO_SECRET                ⚠️  Same value as service role key — must be different
Partner connection                     ❌ 401 Invalid API key
```

…so you know exactly which one(s) to re-enter, and which are fine.

## After the diagnostic

- If all 3 pass → we move on to drafting the partner-side receiver route.
- If any fail → I'll open `secrets--update_secret` for **only** the wrong one(s), with a short note on what to paste.

## Technical notes

- JWT role check decodes the payload's middle segment only (no signature verification needed — we're just reading the `role` claim the partner project signs into its own keys).
- The listUsers ping uses `perPage: 1` and discards results; it's the cheapest valid admin call.
- Error messages from the partner are returned verbatim so you can see exactly what's wrong.
