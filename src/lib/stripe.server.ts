import Stripe from "stripe";

const getEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) throw new Error(`${key} is not configured`);
  return value;
};

export type StripeEnv = "sandbox" | "live";

const GATEWAY_STRIPE_BASE = "https://connector-gateway.lovable.dev/stripe";

export function getConnectionApiKey(env: StripeEnv): string {
  return env === "sandbox" ? getEnv("STRIPE_SANDBOX_API_KEY") : getEnv("STRIPE_LIVE_API_KEY");
}

export function getWebhookSecret(env: StripeEnv): string {
  return env === "sandbox"
    ? getEnv("PAYMENTS_SANDBOX_WEBHOOK_SECRET")
    : getEnv("PAYMENTS_LIVE_WEBHOOK_SECRET");
}

export function createStripeClient(env: StripeEnv): Stripe {
  const connectionApiKey = getConnectionApiKey(env);
  const lovableApiKey = getEnv("LOVABLE_API_KEY");

  return new Stripe(connectionApiKey, {
    apiVersion: "2026-03-25.dahlia",
    httpClient: Stripe.createFetchHttpClient(((input: URL | RequestInfo, init?: RequestInit) => {
      const original =
        typeof input === "string" || input instanceof URL ? input.toString() : input.url;
      const gatewayUrl = original.replace("https://api.stripe.com", GATEWAY_STRIPE_BASE);
      return fetch(gatewayUrl, {
        ...init,
        headers: {
          ...Object.fromEntries(new Headers(init?.headers).entries()),
          "X-Connection-Api-Key": connectionApiKey,
          "Lovable-API-Key": lovableApiKey,
        },
      });
    }) as typeof fetch),
  });
}

const ALLOWED_RETURN_ORIGINS = new Set<string>([
  "https://www.365motorsales.com",
  "https://365motorsales.com",
  "https://motorsales365.lovable.app",
  "https://id-preview--0738c881-614d-4885-8d75-1b7c90e0835e.lovable.app",
  "https://project--0738c881-614d-4885-8d75-1b7c90e0835e.lovable.app",
  "https://project--0738c881-614d-4885-8d75-1b7c90e0835e-dev.lovable.app",
  "https://localhost:8080",
  "http://localhost:8080",
]);

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
  if (!ALLOWED_RETURN_ORIGINS.has(parsed.origin)) {
    throw new Error("returnUrl origin is not allowed");
  }
  return url;
}
