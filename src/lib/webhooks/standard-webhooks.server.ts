/**
 * Bounded, server-only Standard Webhooks HMAC verification. Intentionally not
 * wired to an email route: authenticity is not authorization or durable dedupe.
 */
export const WEBHOOK_MAX_BODY_BYTES = 20_000;
export const WEBHOOK_MAX_CLOCK_SKEW_SECONDS = 300;
export const WEBHOOK_BODY_TIMEOUT_MS = 1_000;

type VerificationErrorCode =
  | "invalid_request"
  | "invalid_headers"
  | "invalid_timestamp"
  | "stale_timestamp"
  | "bad_secret"
  | "body_too_large"
  | "body_timeout"
  | "body_unavailable"
  | "invalid_signature"
  | "verification_unavailable"
  | "invalid_body";

export class WebhookVerificationError extends Error {
  readonly code: VerificationErrorCode;

  constructor(code: VerificationErrorCode) {
    super("Webhook verification failed.");
    this.name = "WebhookVerificationError";
    this.code = code;
  }
}

export type VerifiedWebhook = Readonly<{
  id: string;
  timestamp: number;
  body: string;
}>;

const BASE64 = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
const HEADER_NAMES = ["id", "timestamp", "signature"] as const;
const MAX_SIGNATURE_HEADER_LENGTH = 2_048;
const MAX_SIGNATURES = 8;
// Also bounds empty-chunk streams that could otherwise starve the timer task.
const MAX_BODY_READS = WEBHOOK_MAX_BODY_BYTES + 1;

function fail(code: VerificationErrorCode): never {
  throw new WebhookVerificationError(code);
}

function decodeBase64(value: string, code: VerificationErrorCode): Uint8Array<ArrayBuffer> {
  if (!value || !BASE64.test(value)) fail(code);
  try {
    const binary = atob(value);
    if (btoa(binary) !== value) fail(code);
    return Uint8Array.from(binary, (char) => char.charCodeAt(0));
  } catch {
    return fail(code);
  }
}

function decodeSecret(secret: string): Uint8Array<ArrayBuffer> {
  if (typeof secret !== "string" || secret.length > 100) fail("bad_secret");
  let encoded = secret;
  if (encoded.startsWith("v1,whsec_")) encoded = encoded.slice(9);
  else if (encoded.startsWith("whsec_")) encoded = encoded.slice(6);
  const decoded = decodeBase64(encoded, "bad_secret");
  if (decoded.byteLength < 24 || decoded.byteLength > 64) fail("bad_secret");
  return decoded;
}

function assertFresh(timestamp: number): void {
  const now = Math.floor(Date.now() / 1_000);
  if (!Number.isSafeInteger(now) || now <= 0) fail("invalid_timestamp");
  if (Math.abs(now - timestamp) > WEBHOOK_MAX_CLOCK_SKEW_SECONDS) {
    fail("stale_timestamp");
  }
}

function readHeaders(request: Request, prefix: "webhook" | "svix") {
  const otherPrefix = prefix === "webhook" ? "svix" : "webhook";
  if (HEADER_NAMES.some((name) => request.headers.has(`${otherPrefix}-${name}`))) {
    fail("invalid_headers");
  }
  const id = request.headers.get(`${prefix}-id`);
  const timestampText = request.headers.get(`${prefix}-timestamp`);
  const signatureText = request.headers.get(`${prefix}-signature`);
  if (!id || !/^[A-Za-z0-9_-]{1,128}$/.test(id)) fail("invalid_headers");
  if (!timestampText || !/^[1-9][0-9]{0,10}$/.test(timestampText)) {
    fail("invalid_timestamp");
  }
  const timestamp = Number(timestampText);
  if (!Number.isSafeInteger(timestamp)) fail("invalid_timestamp");
  assertFresh(timestamp);
  if (!signatureText || signatureText.length > MAX_SIGNATURE_HEADER_LENGTH) {
    fail("invalid_headers");
  }
  const entries = signatureText.split(" ");
  if (entries.length > MAX_SIGNATURES) fail("invalid_headers");
  const signatures: Uint8Array<ArrayBuffer>[] = [];
  for (const entry of entries) {
    const match = /^(v[1-9][0-9]{0,2}[a-z]?),([A-Za-z0-9+/]+={0,2})$/.exec(entry);
    if (!match) fail("invalid_headers");
    const decoded = decodeBase64(match[2], "invalid_headers");
    if (match[1] === "v1") {
      if (decoded.byteLength !== 32) fail("invalid_headers");
      signatures.push(decoded);
    }
  }
  if (!signatures.length) fail("invalid_signature");
  return { id, timestamp, timestampText, signatures };
}

function declaredBodyLength(request: Request): number | null {
  const value = request.headers.get("content-length");
  if (value === null) return null;
  if (!/^(0|[1-9][0-9]{0,10})$/.test(value)) fail("invalid_headers");
  const length = Number(value);
  if (length > WEBHOOK_MAX_BODY_BYTES) fail("body_too_large");
  return length;
}

async function readBody(request: Request): Promise<Uint8Array<ArrayBuffer>> {
  if (request.signal.aborted || request.bodyUsed || request.body?.locked) {
    fail("body_unavailable");
  }
  const declaredLength = declaredBodyLength(request);
  if (!request.body) {
    if (declaredLength !== null && declaredLength !== 0) fail("invalid_body");
    return new Uint8Array();
  }

  const reader = request.body.getReader();
  const expiresAt = performance.now() + WEBHOOK_BODY_TIMEOUT_MS;
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let onAbort: (() => void) | undefined;
  const budget = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new WebhookVerificationError("body_timeout")),
      WEBHOOK_BODY_TIMEOUT_MS,
    );
    onAbort = () => reject(new WebhookVerificationError("body_unavailable"));
    request.signal.addEventListener("abort", onAbort, { once: true });
    if (request.signal.aborted) onAbort();
  });
  const collect = async () => {
    const chunks: Uint8Array[] = [];
    let length = 0;
    for (let reads = 0; reads < MAX_BODY_READS; reads++) {
      const { done, value } = await reader.read();
      if (stopped || request.signal.aborted) fail("body_unavailable");
      if (performance.now() >= expiresAt) fail("body_timeout");
      if (done) {
        if (declaredLength !== null && length !== declaredLength) {
          fail("invalid_body");
        }
        const bytes = new Uint8Array(length);
        let offset = 0;
        for (const chunk of chunks) {
          bytes.set(chunk, offset);
          offset += chunk.byteLength;
        }
        return bytes;
      }
      if (!(value instanceof Uint8Array)) fail("invalid_body");
      length += value.byteLength;
      if (length > WEBHOOK_MAX_BODY_BYTES) fail("body_too_large");
      // Do not retain a producer-mutable view across subsequent reads.
      if (value.byteLength) chunks.push(value.slice());
    }
    return fail("body_unavailable");
  };

  try {
    return await Promise.race([collect(), budget]);
  } catch (error) {
    stopped = true;
    // Cancellation is best effort: a hostile source may never settle cancel().
    void reader.cancel().catch(() => undefined);
    if (error instanceof WebhookVerificationError) throw error;
    return fail("body_unavailable");
  } finally {
    stopped = true;
    clearTimeout(timer);
    if (onAbort) request.signal.removeEventListener("abort", onAbort);
    reader.releaseLock();
  }
}

/**
 * Verifies exact raw bytes with one caller-configured secret/header family.
 * The returned event ID still needs durable dedupe and payload/schema validation
 * in a future adapter. Nothing is enqueued, sent, logged or persisted here.
 */
export async function verifyStandardWebhook(
  request: Request,
  secret: string,
  options?: { headerPrefix?: "webhook" | "svix" },
): Promise<VerifiedWebhook> {
  try {
    const prefix = options?.headerPrefix ?? "webhook";
    if (prefix !== "webhook" && prefix !== "svix") fail("invalid_headers");
    if (request.method !== "POST") fail("invalid_request");
    const encoding = request.headers.get("content-encoding");
    if (encoding !== null && encoding.toLowerCase() !== "identity") {
      fail("invalid_request");
    }
    const secretBytes = decodeSecret(secret);
    const { id, timestamp, timestampText, signatures } = readHeaders(request, prefix);
    if (!globalThis.crypto?.subtle) fail("verification_unavailable");
    const body = await readBody(request);
    assertFresh(timestamp);
    if (request.signal.aborted) fail("body_unavailable");
    const key = await crypto.subtle.importKey(
      "raw",
      secretBytes,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"],
    );
    const metadata = new TextEncoder().encode(`${id}.${timestampText}.`);
    const signedBytes = new Uint8Array(metadata.byteLength + body.byteLength);
    signedBytes.set(metadata);
    signedBytes.set(body, metadata.byteLength);
    let verified = false;
    for (const signature of signatures) {
      if (await crypto.subtle.verify("HMAC", key, signature, signedBytes)) {
        verified = true;
        break;
      }
    }
    assertFresh(timestamp);
    if (request.signal.aborted) fail("body_unavailable");
    if (!verified) fail("invalid_signature");
    let bodyText: string;
    try {
      // ignoreBOM=true preserves the BOM as part of the authenticated text.
      bodyText = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(body);
    } catch {
      return fail("invalid_body");
    }
    return Object.freeze({ id, timestamp, body: bodyText });
  } catch (error) {
    if (error instanceof WebhookVerificationError) throw error;
    return fail("verification_unavailable");
  }
}
