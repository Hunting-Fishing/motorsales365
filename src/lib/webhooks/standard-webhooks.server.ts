/**
 * Verification for Standard Webhooks (https://www.standardwebhooks.com/),
 * used by Supabase Auth hooks and by Svix-backed senders such as Resend.
 *
 * Signature = base64(HMAC-SHA256(secret, `${id}.${timestamp}.${body}`)).
 * Accepts `webhook-*` or `svix-*` headers and secrets in the forms
 * "v1,whsec_<base64>", "whsec_<base64>" or raw base64.
 */

export class WebhookVerificationError extends Error {
  constructor(
    message: string,
    readonly code: "missing_headers" | "stale_timestamp" | "invalid_signature" | "bad_secret",
  ) {
    super(message);
    this.name = "WebhookVerificationError";
  }
}

function header(req: Request, name: string): string | null {
  return req.headers.get(`webhook-${name}`) ?? req.headers.get(`svix-${name}`);
}

function decodeSecret(secret: string): Uint8Array<ArrayBuffer> {
  const raw = secret.trim().replace(/^v1,/, "").replace(/^whsec_/, "");
  try {
    const bin = atob(raw);
    return Uint8Array.from(bin, (c) => c.charCodeAt(0));
  } catch {
    throw new WebhookVerificationError("Webhook secret is not valid base64", "bad_secret");
  }
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function computeStandardWebhookSignature(
  secret: string,
  id: string,
  timestamp: string,
  body: string,
): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    decodeSecret(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${id}.${timestamp}.${body}`),
  );
  return btoa(String.fromCharCode(...new Uint8Array(mac)));
}

/** Verify the request and return its raw body. Throws WebhookVerificationError. */
export async function verifyStandardWebhook(
  req: Request,
  secret: string,
  { toleranceSeconds = 300 }: { toleranceSeconds?: number } = {},
): Promise<string> {
  const id = header(req, "id");
  const timestamp = header(req, "timestamp");
  const signatures = header(req, "signature");
  if (!id || !timestamp || !signatures) {
    throw new WebhookVerificationError("Missing webhook signature headers", "missing_headers");
  }
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > toleranceSeconds) {
    throw new WebhookVerificationError("Webhook timestamp outside tolerance", "stale_timestamp");
  }

  const body = await req.text();
  const expected = await computeStandardWebhookSignature(secret, id, timestamp, body);
  const ok = signatures
    .split(" ")
    .map((s) => s.trim())
    .filter(Boolean)
    .some((s) => {
      const [version, sig] = s.split(",", 2);
      return version === "v1" && !!sig && timingSafeEqual(sig, expected);
    });
  if (!ok) throw new WebhookVerificationError("Invalid webhook signature", "invalid_signature");
  return body;
}
