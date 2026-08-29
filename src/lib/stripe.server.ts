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
 * Standalone Stripe client. Requests go directly to Stripe; there is no
 * Lovable connector/gateway fallback. Missing credentials fail closed.
 */
export function createStripeClient(env: StripeEnv): Stripe {
  return new Stripe(getConnectionApiKey(env), {
    apiVersion: "2026-03-25.dahlia",
  });
}

function allowedReturnOrigins(): Set<string> {
  const origins = new Set<string>([
    "https://www.365motorsales.com",
    "https://365motorsales.com",
    "http://localhost:8080",
    "http://127.0.0.1:8080",
  ]);

  // Permit an explicitly configured standalone preview/staging origin without
  // opening a wildcard host suffix. Invalid values are ignored here and will
  // still fail validation below.
  for (const value of [process.env.SITE_URL, process.env.PUBLIC_SITE_ORIGIN]) {
    if (!value) continue;
    try {
      origins.add(new URL(value).origin);
    } catch {
      // Ignore malformed configuration; do not broaden the allowlist.
    }
  }

  return origins;
}

/**
 * Validate a client-supplied `returnUrl` against an explicit origin allowlist
 * so an attacker cannot redirect a user to an external site after Stripe.
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

  const localDevelopment =
    parsed.protocol === "http:" &&
    (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1");
  if (parsed.protocol !== "https:" && !localDevelopment) {
    throw new Error("returnUrl must use HTTPS");
  }

  if (!allowedReturnOrigins().has(parsed.origin)) {
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
