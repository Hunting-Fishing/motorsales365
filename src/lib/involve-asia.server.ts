/**
 * Involve Asia API helper (server-only).
 *
 * Docs: https://api.involve.asia/
 *
 * Flow:
 *  1) POST /api/authenticate with key + secret  -> bearer token (24h)
 *  2) POST /api/deeplink/generate with token + destination URL
 *     -> short tracked URL that attributes commission to our affiliate id.
 *
 * Token is cached in worker memory until ~30 min before expiry. Workers are
 * stateless so the cache resets on cold start; that's fine — auth is cheap.
 */

const IA_BASE = "https://api.involve.asia";

let cachedToken: { token: string; expiresAt: number } | null = null;

async function authenticate(): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 60_000) {
    return cachedToken.token;
  }
  const key = process.env.INVOLVE_ASIA_API_KEY_NAME;
  const secret = process.env.INVOLVE_ASIA_API_SECRET;
  if (!key || !secret) throw new Error("Involve Asia credentials not configured");

  const body = new URLSearchParams({ key, secret });
  const res = await fetch(`${IA_BASE}/api/authenticate`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body,
  });
  if (!res.ok) throw new Error(`Involve Asia auth failed: ${res.status}`);
  const json = (await res.json()) as { status?: string; data?: { token?: string } };
  const token = json?.data?.token;
  if (!token) throw new Error("Involve Asia auth returned no token");
  // Tokens last 24h per docs; refresh well before expiry.
  cachedToken = { token, expiresAt: now + 23 * 60 * 60 * 1000 };
  return token;
}

/**
 * Generate a tracked deeplink for a destination URL (e.g. a Shopee/Lazada
 * product search). Returns the tracked URL, or the original URL on failure
 * (fail-open so users still reach the merchant).
 */
export async function generateInvolveAsiaDeeplink(destinationUrl: string): Promise<string> {
  try {
    const token = await authenticate();
    const res = await fetch(`${IA_BASE}/api/deeplink/generate`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: new URLSearchParams({ url: destinationUrl }),
    });
    if (!res.ok) return destinationUrl;
    const json = (await res.json()) as {
      data?: { tracking_link?: string; short_link?: string };
    };
    return json?.data?.tracking_link ?? json?.data?.short_link ?? destinationUrl;
  } catch {
    return destinationUrl;
  }
}

/** Health check used by the admin tab. */
export async function pingInvolveAsia(): Promise<{ ok: boolean; message: string }> {
  try {
    await authenticate();
    return { ok: true, message: "Authenticated. Affiliate ID " + (process.env.INVOLVE_ASIA_AFFILIATE_ID ?? "—") };
  } catch (e: any) {
    return { ok: false, message: e?.message ?? "Unknown error" };
  }
}
