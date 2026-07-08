## What I found

Yes — a Google Maps key is set up, but it's the **Lovable-managed** one (`GOOGLE_MAPS_API_KEY` / `GOOGLE_MAPS_BROWSER_KEY` / `GOOGLE_MAPS_TRACKING_ID` in your secrets, all "managed by connector").

That key is locked (referrer-restricted) to `*.lovable.app` and `*.lovableproject.com`. On your custom domain `365motorsales.com` (and `www.365motorsales.com`), every browser Maps call comes back as `REQUEST_DENIED` and the map renders blank — which is exactly what the "Will not load" warning on your Publish dialog is telling you, and why businesses aren't drawn on mobile.

The managed key's allowlist is not user-configurable, so the fix is to use **your own** Google Cloud API key on the custom domain. The managed key can stay for previews; the custom one will kick in once you connect it.

## What we'll do together (no code changes yet)

1. In Google Cloud Console, in a project with **billing enabled**:
   - Enable **Maps JavaScript API** and **Places API (New)** (plus Geocoding / Routes / Air Quality / Weather if you use them — I'll confirm which ones based on your code).
   - Create an **API key**.
   - Add **HTTP referrer restrictions** for your domains — all four patterns:
     - `https://365motorsales.com/*`
     - `https://*.365motorsales.com/*`
     - `https://www.365motorsales.com/*`
     - `https://365motorsales.lovable.app/*` (optional, keeps the preview working with the same key)
   - Restrict the key to the APIs you enabled above.

2. Once you have the key in hand, I'll run the connect flow (`google_maps` connector → **custom / bring-your-own** option) so you can paste the key into a secure form. This creates a second connection alongside the managed one and swaps in your `GOOGLE_MAPS_BROWSER_KEY` on the custom domain.

3. Republish. I'll then reload `/businesses` on mobile viewport (Playwright) and confirm markers render — no more `REQUEST_DENIED` in the console.

## What I need from you before step 2

Just reply once the API key is created with the referrer allowlist above, and I'll open the secure connect form. Don't paste the key into chat.

## Not doing

- No code changes — the app already reads `VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY`, which auto-switches to the custom connection when it's linked.
- Not disconnecting the managed connection — it can stay for `*.lovable.app` previews.
- Not rotating any Lovable keys — this isn't a Lovable-auth issue.
