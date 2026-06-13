# Shop Manager SSO — partner-side integration (All Business 365)

This portal mints a short-lived HMAC-signed token, then redirects the buyer to
`https://mainrepairsoftware.lovable.app/sso/365motorsales?token=…&next=…`.

For the handoff to complete you need two things deployed in the **All Business
365** Lovable project:

## 1. Shared secret + env vars

In **All Business 365 → Cloud → Secrets**, add the same values you set here:

| Name | Value |
|---|---|
| `MOTORSALES_SSO_SECRET` | Same random hex as `SHOP_MANAGER_SSO_SECRET` here |
| `MOTORSALES_ISSUER` | `365motorsales` |

The token uses HS256 over `header.payload`. Payload shape:

```json
{
  "sub": "<partner auth user id>",
  "email": "buyer@example.com",
  "tier": "solo" | "pro",
  "src": "365motorsales",
  "iat": 1718304000,
  "exp": 1718304060,
  "nonce": "<uuid>"
}
```

Validate `exp` (within 60s), `src === "365motorsales"`, and the HMAC.

## 2. External entitlement table

Add this migration to All Business 365 so the receiver can record what the
buyer paid for:

```sql
CREATE TABLE IF NOT EXISTS public.external_entitlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source text NOT NULL,
  tier text NOT NULL,
  expires_at timestamptz,
  last_sso_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, source)
);
GRANT SELECT ON public.external_entitlements TO authenticated;
GRANT ALL    ON public.external_entitlements TO service_role;
ALTER TABLE public.external_entitlements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own row read" ON public.external_entitlements
  FOR SELECT TO authenticated USING (user_id = auth.uid());
```

Gate Shop Manager features behind:
```sql
SELECT EXISTS (
  SELECT 1 FROM external_entitlements
  WHERE user_id = auth.uid() AND source = '365motorsales'
);
```

## 3. Receiver route

Create `src/pages/sso/Motorsales.tsx` (or equivalent for this project's
router) that:

1. Reads `?token=…&next=…` from the URL.
2. Calls a server function that verifies the HMAC + freshness + issuer using
   `MOTORSALES_SSO_SECRET`.
3. If valid: upserts `external_entitlements (user_id=sub, source='365motorsales', tier)`.
4. Generates a magic link via the Supabase Auth Admin API:
   ```ts
   const { data } = await admin.auth.admin.generateLink({
     type: "magiclink",
     email,
   });
   // Redirect the browser to data.properties.action_link, which signs them in.
   ```
5. After sign-in, the receiver redirects to `next` (default `/dashboard`).

A reference implementation lives in this repo at
`src/lib/shop-manager-sso.server.ts` — the signing side; the All Business 365
receiver does the inverse.

## 4. Test plan

1. Subscribe to **Shop Manager Solo** with a sandbox card on
   `/shop-manager`.
2. Click **Open Shop Manager**.
3. Confirm you land at `mainrepairsoftware.lovable.app/dashboard` signed in
   as the same email.
4. Verify the `external_entitlements` row exists and Shop Manager features
   are unlocked.

## Failure modes

- **`Partner createUser failed: User already registered`** — fine, the
  `ensurePartnerAuthUser` helper falls back to lookup.
- **Token expired** — buyer waited > 60s between minting and the receiver
  loading. Refresh and click **Open Shop Manager** again.
- **No active subscription on next month** — webhook flipped status to
  `canceled`; the SSO route refuses to mint.
