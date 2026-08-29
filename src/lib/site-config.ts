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

/**
 * Hosts that may receive an Auth redirect back from Supabase.
 *
 * This is deliberately separate from CANONICAL_HOSTS: staging must be able to
 * complete OAuth against the standalone project without making its Worker URL
 * canonical for SEO, share links, QR codes, or outbound email content.
 */
export const AUTH_RETURN_HOSTS = [
  ...CANONICAL_HOSTS,
  "motorsales365-standalone-staging.jordilwbailey.workers.dev",
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

/**
 * Returns a trusted browser origin for Auth round-trips.
 *
 * Production hosts and the isolated standalone staging Worker are accepted.
 * Localhost/127.0.0.1 are allowed only for local development. Any unknown host
 * falls back to the canonical production origin instead of becoming an open
 * redirect destination.
 */
export function authReturnOrigin(): string {
  if (typeof window === "undefined" || !window.location) return SITE_URL;
  try {
    const host = normalizeHost(window.location.hostname);
    const protocol = window.location.protocol;
    if (AUTH_RETURN_HOSTS.includes(host)) {
      return window.location.origin;
    }
    if (
      (host === "localhost" || host === "127.0.0.1") &&
      (protocol === "http:" || protocol === "https:")
    ) {
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
