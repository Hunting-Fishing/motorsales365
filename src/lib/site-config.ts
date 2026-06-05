/**
 * Canonical site URL helpers.
 *
 * The app is published at www.365motorsales.com (with the apex 365motorsales.com
 * redirecting to www). Preview/sandbox hosts (lovableproject.com, lovable.app,
 * localhost, etc.) must never leak into emails, share links, QR codes, or SEO
 * tags. Use siteOrigin() / siteUrl() anywhere you'd otherwise reach for
 * window.location.origin.
 */

export const SITE_URL = "https://www.365motorsales.com";

export const CANONICAL_HOSTS = [
  "www.365motorsales.com",
  "365motorsales.com",
];

function normalizeHost(host: string): string {
  return host.toLowerCase().replace(/\.$/, "");
}

/**
 * Returns the canonical origin for outbound URLs.
 * - On a canonical production host, mirrors window.location.origin.
 * - On any other host (preview, sandbox, localhost, SSR), returns SITE_URL.
 */
export function siteOrigin(): string {
  if (typeof window === "undefined" || !window.location) return SITE_URL;
  try {
    const host = normalizeHost(window.location.hostname);
    if (CANONICAL_HOSTS.includes(host)) {
      return window.location.origin;
    }
  } catch {
    // fall through
  }
  return SITE_URL;
}

/** Build a canonical absolute URL for a given path. */
export function siteUrl(path: string = "/"): string {
  const origin = siteOrigin();
  if (!path) return origin;
  return path.startsWith("/") ? `${origin}${path}` : `${origin}/${path}`;
}
