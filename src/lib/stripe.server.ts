import Stripe from "stripe";

const getEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) throw new Error(`${key} is not configured`);
  return value;
};

export type StripeEnv = "sandbox" | "live";

export function getConnectionApiKey(env: StripeEnv): string {
  return env === "sandbox" ? getEnv("STRIPE_SANDBOX_API_KEY") : getEnv("STRIPE_LIVE_API_KEY");
}

export function getWebhookSecret(env: StripeEnv): string {
  return env === "sandbox"
    ? getEnv("PAYMENTS_SANDBOX_WEBHOOK_SECRET")
    : getEnv("PAYMENTS_LIVE_WEBHOOK_SECRET");
}

/**
 * Stripe client talking directly to https://api.stripe.com.
 * STRIPE_LIVE_API_KEY / STRIPE_SANDBOX_API_KEY must be real Stripe secret
 * (sk_live_/sk_test_) or restricted (rk_) keys from the Stripe dashboard.
 */
export function createStripeClient(env: StripeEnv): Stripe {
  return new Stripe(getConnectionApiKey(env), {
    apiVersion: "2026-03-25.dahlia",
    // Workers runtime: use fetch instead of Node's http module.
    httpClient: Stripe.createFetchHttpClient(),
  });
}

const ALLOWED_RETURN_ORIGINS = new Set<string>([
  "https://www.365motorsales.com",
  "https://365motorsales.com",
  "https://localhost:8080",
  "http://localhost:8080",
]);

// Extra trusted host suffixes (HTTPS only). Kept empty on purpose: preview
// deployments should use Stripe sandbox mode against an explicit origin.
const ALLOWED_RETURN_HOST_SUFFIXES: string[] = [];

/**
 * Validate a client-supplied `returnUrl` against an allowlist of trusted
 * origins so an attacker can't redirect a user back to an external phishing
 * page after a legitimate Stripe Checkout / Billing Portal flow.
 *
 * Throws if invalid. Returns the original URL string when allowed.
 * Pass `required: false` to allow undefined (used by Portal).
 */
export function validateReturnUrl(
  url: string | undefined,
  { required = true }: { required?: boolean } = {},
): string | undefined {
  if (!url) {
    if (required) throw new Error("returnUrl is required");
    return undefined;
  }
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("Invalid returnUrl");
  }
  const isHttps = parsed.protocol === "https:";
  const hostAllowed =
    isHttps &&
    ALLOWED_RETURN_HOST_SUFFIXES.some((suffix) => parsed.hostname.endsWith(suffix));
  if (!ALLOWED_RETURN_ORIGINS.has(parsed.origin) && !hostAllowed) {
    throw new Error("returnUrl origin is not allowed");
  }
  return url;
}

export function getStripeErrorMessage(error: unknown): string {
  if (error && typeof error === "object") {
    const e = error as { message?: string; raw?: { message?: string; code?: string }; code?: string };
    const msg = e.raw?.message ?? e.message;
    const code = e.raw?.code ?? e.code;
    if (msg) return code ? `${msg} (${code})` : msg;
  }
  return "Stripe request failed";
}
