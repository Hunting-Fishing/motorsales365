/**
 * Inactive native Auth provider boundary. No environment/default fetch, queue,
 * retry, logging or route registration. Injected transports are trusted server
 * dependencies; preparing an email does not authorize sending it.
 */
import {
  isNativeAuthEmailPlan,
  NATIVE_AUTH_EMAIL_PROJECT_REF,
} from "./native-auth-email-plan.server";

export const RESEND_AUTH_VERSION = "365-resend-auth/v1";
export const RESEND_EMAIL_ENDPOINT = "https://api.resend.com/emails";
export const RESEND_ATTEMPT_TIMEOUT_MS = 5_000;
export const RESEND_MAX_RESPONSE_BYTES = 4_096;
export const RESEND_MAX_SUBJECT_BYTES = 200;
export const RESEND_MAX_HTML_BYTES = 200_000;
export const RESEND_MAX_TEXT_BYTES = 64_000;
export const RESEND_MAX_REQUEST_BYTES = 300_000;

type BoundaryCode =
  | "invalid_plan"
  | "invalid_delivery"
  | "invalid_render"
  | "invalid_policy"
  | "invalid_prepared"
  | "invalid_api_key"
  | "invalid_transport"
  | "preparation_unavailable";

export class ResendEmailBoundaryError extends Error {
  constructor(readonly code: BoundaryCode) {
    super("Email provider boundary failed.");
    this.name = "ResendEmailBoundaryError";
  }
}

export type PreparedResendAuthEmail = Readonly<{
  version: typeof RESEND_AUTH_VERSION;
  projectRef: typeof NATIVE_AUTH_EMAIL_PROJECT_REF;
  deliveryId: string;
  idempotencyKey: string;
  requestFingerprint: string;
  /** Private rendered bytes: may contain Auth secrets. Never log or expose. */
  body: string;
}>;

export type ResendEmailTransport = (request: Request) => Promise<Response>;
type AttemptIdentity = Readonly<{
  provider: "resend";
  deliveryId: string;
  requestFingerprint: string;
}>;
export type ResendAttemptOutcome =
  | (AttemptIdentity & Readonly<{ state: "provider_accepted"; providerMessageId: string }>)
  | (AttemptIdentity &
      Readonly<{
        state: "outcome_unknown";
        reason: "timeout" | "transport_failure" | "invalid_response";
      }>)
  | (AttemptIdentity &
      Readonly<{
        state: "outcome_unknown";
        reason: "http_error";
        httpStatus: number;
        retryAfterSeconds: number | null;
      }>);

const preparedEmails = new WeakSet<PreparedResendAuthEmail>();
const originatingPlans = new WeakMap<PreparedResendAuthEmail, object>();

/** Same-instance provenance only. Neither this nor preparation grants dispatch authority. */
export function isPreparedResendAuthEmail(
  value: unknown,
  plan?: unknown,
): value is PreparedResendAuthEmail {
  return (
    typeof value === "object" &&
    value !== null &&
    preparedEmails.has(value as PreparedResendAuthEmail) &&
    (plan === undefined || originatingPlans.get(value as PreparedResendAuthEmail) === plan)
  );
}

const encoder = new TextEncoder();
const UUID =
  "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}";
// A narrow acknowledgment schema: unknown fields, duplicate/escaped names and
// alternate scalar representations fail closed, rather than last-key-wins.
const ACKNOWLEDGMENT = new RegExp(
  `^[\\t\\n\\r ]*\\{[\\t\\n\\r ]*"id"[\\t\\n\\r ]*:[\\t\\n\\r ]*"(${UUID})"[\\t\\n\\r ]*\\}[\\t\\n\\r ]*$`,
);

function fail(code: BoundaryCode): never {
  throw new ResendEmailBoundaryError(code);
}

function exactFields(value: unknown, fields: readonly string[], code: BoundaryCode) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) fail(code);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (
    Reflect.ownKeys(descriptors).length !== fields.length ||
    fields.some((field) => !Object.hasOwn(descriptors, field) || !("value" in descriptors[field]))
  )
    fail(code);
  return Object.fromEntries(fields.map((field) => [field, descriptors[field].value]));
}

function boundedText(value: unknown, max: number, code: BoundaryCode): string {
  if (
    typeof value !== "string" ||
    value.length > max ||
    !value.trim() ||
    encoder.encode(value).byteLength > max
  )
    fail(code);
  for (const char of value) {
    const point = char.codePointAt(0)!;
    if (point === 0 || (point >= 0xd800 && point <= 0xdfff)) fail(code);
  }
  return value;
}

function sender(value: unknown): string {
  const address = boundedText(value, 254, "invalid_policy");
  const match =
    /^([A-Za-z0-9!#$%&'*+/=?^_`{|}~.-]{1,64})@((?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)*365motorsales\.com)$/.exec(
      address,
    );
  if (!match || match[1].startsWith(".") || match[1].endsWith(".") || match[1].includes(".."))
    fail("invalid_policy");
  return address;
}

/**
 * Snapshot one actual planner command and trusted rendered output. Persist the
 * exact body, key and fingerprint together before any dispatch. Re-rendering or
 * changing the sender on retry must conflict, never generate another send key.
 */
export async function prepareNativeAuthResendEmail(
  plan: unknown,
  deliveryId: unknown,
  rendered: unknown,
  policy: unknown,
): Promise<PreparedResendAuthEmail> {
  try {
    if (!isNativeAuthEmailPlan(plan)) fail("invalid_plan");
    if (typeof deliveryId !== "string") fail("invalid_delivery");
    const command = plan.commands.find((item) => item.deliveryId === deliveryId);
    if (!command) fail("invalid_delivery");
    const settings = exactFields(policy, ["projectRef", "from"], "invalid_policy");
    if (settings.projectRef !== NATIVE_AUTH_EMAIL_PROJECT_REF) fail("invalid_policy");
    const from = sender(settings.from);
    const fields = exactFields(rendered, ["subject", "html", "text"], "invalid_render");
    const subject = boundedText(fields.subject, RESEND_MAX_SUBJECT_BYTES, "invalid_render");
    if (Array.from(subject).some((char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127))
      fail("invalid_render");
    const html = boundedText(fields.html, RESEND_MAX_HTML_BYTES, "invalid_render");
    const text = boundedText(fields.text, RESEND_MAX_TEXT_BYTES, "invalid_render");
    const body = JSON.stringify({
      from,
      to: [command.recipient],
      subject,
      html,
      text,
      tags: [{ name: "delivery_id", value: deliveryId }],
    });
    if (encoder.encode(body).byteLength > RESEND_MAX_REQUEST_BYTES) fail("invalid_render");
    const idempotencyKey = `365-auth-v1/${deliveryId}`;
    const fingerprintInput = JSON.stringify([
      RESEND_AUTH_VERSION,
      NATIVE_AUTH_EMAIL_PROJECT_REF,
      RESEND_EMAIL_ENDPOINT,
      idempotencyKey,
      body,
    ]);
    const hash = await crypto.subtle.digest("SHA-256", encoder.encode(fingerprintInput));
    const requestFingerprint = Array.from(new Uint8Array(hash), (byte) =>
      byte.toString(16).padStart(2, "0"),
    ).join("");
    const result = Object.freeze({
      version: RESEND_AUTH_VERSION,
      projectRef: NATIVE_AUTH_EMAIL_PROJECT_REF,
      deliveryId,
      idempotencyKey,
      requestFingerprint,
      body,
    });
    preparedEmails.add(result);
    originatingPlans.set(result, plan);
    return result;
  } catch (error) {
    if (error instanceof ResendEmailBoundaryError) throw error;
    return fail("preparation_unavailable");
  }
}

class InvalidProviderResponse extends Error {}

function cancelBody(response: Response) {
  try {
    if (response.body && !response.body.locked) void response.body.cancel().catch(() => undefined);
  } catch {
    // Cleanup cannot replace a generic outcome with transport diagnostics.
  }
}

function retryAfter(response: Response): number | null {
  if (response.status !== 429 && response.status !== 503) return null;
  const value = response.headers.get("retry-after");
  if (!value || !/^[1-9][0-9]{0,3}$/.test(value)) return null;
  const seconds = Number(value);
  return seconds <= 3_600 ? seconds : null;
}

/**
 * One bounded attempt only. HTTP acceptance is not delivered mail. Any ambiguous
 * result requires durable reconciliation; this function never retries or acks a
 * queue. Resend's 24-hour key retention is not an indefinite dedupe guarantee.
 */
export async function attemptPreparedResendAuthEmail(
  prepared: unknown,
  apiKey: unknown,
  transport: ResendEmailTransport,
): Promise<ResendAttemptOutcome> {
  if (
    typeof prepared !== "object" ||
    prepared === null ||
    !preparedEmails.has(prepared as PreparedResendAuthEmail)
  )
    fail("invalid_prepared");
  if (typeof apiKey !== "string" || !/^re_[A-Za-z0-9_-]{8,200}$/.test(apiKey))
    fail("invalid_api_key");
  if (typeof transport !== "function") fail("invalid_transport");
  const email = prepared as PreparedResendAuthEmail;
  const identity = {
    provider: "resend" as const,
    deliveryId: email.deliveryId,
    requestFingerprint: email.requestFingerprint,
  };
  const controller = new AbortController();
  const expiresAt = performance.now() + RESEND_ATTEMPT_TIMEOUT_MS;
  let stopped = false;
  let timedOut = false;
  let response: Response | undefined;
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const expired = () => timedOut || performance.now() >= expiresAt;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
      reject(new InvalidProviderResponse());
    }, RESEND_ATTEMPT_TIMEOUT_MS);
  });
  const operation = async (): Promise<ResendAttemptOutcome> => {
    const request = new Request(RESEND_EMAIL_ENDPOINT, {
      method: "POST",
      redirect: "error",
      credentials: "omit",
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": email.idempotencyKey,
      },
      body: email.body,
      signal: controller.signal,
    });
    response = await transport(request);
    if (!(response instanceof Response)) throw new InvalidProviderResponse();
    if (stopped || expired()) {
      cancelBody(response);
      throw new InvalidProviderResponse();
    }
    if (
      response.redirected ||
      (response.url && response.url !== RESEND_EMAIL_ENDPOINT) ||
      response.bodyUsed ||
      response.body?.locked ||
      response.status < 200 ||
      response.status > 599
    )
      throw new InvalidProviderResponse();
    if (response.status !== 200) {
      cancelBody(response);
      return Object.freeze({
        ...identity,
        state: "outcome_unknown",
        reason: "http_error",
        httpStatus: response.status,
        retryAfterSeconds: retryAfter(response),
      });
    }
    if (
      !/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(
        response.headers.get("content-type") ?? "",
      ) ||
      ![null, "identity"].includes(response.headers.get("content-encoding"))
    )
      throw new InvalidProviderResponse();
    const declared = response.headers.get("content-length");
    if (
      declared !== null &&
      (!/^(0|[1-9][0-9]{0,4})$/.test(declared) || Number(declared) > RESEND_MAX_RESPONSE_BYTES)
    )
      throw new InvalidProviderResponse();
    if (!response.body) throw new InvalidProviderResponse();
    reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let length = 0;
    for (let reads = 0; reads <= RESEND_MAX_RESPONSE_BYTES; reads++) {
      const { done, value } = await reader.read();
      if (stopped || expired()) throw new InvalidProviderResponse();
      if (done) {
        if (declared !== null && Number(declared) !== length) throw new InvalidProviderResponse();
        const bytes = new Uint8Array(length);
        let offset = 0;
        for (const chunk of chunks) {
          bytes.set(chunk, offset);
          offset += chunk.byteLength;
        }
        let body: string;
        try {
          body = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes);
        } catch {
          throw new InvalidProviderResponse();
        }
        const match = ACKNOWLEDGMENT.exec(body);
        if (!match) throw new InvalidProviderResponse();
        if (expired()) throw new InvalidProviderResponse();
        return Object.freeze({
          ...identity,
          state: "provider_accepted",
          providerMessageId: match[1].toLowerCase(),
        });
      }
      if (!(value instanceof Uint8Array)) throw new InvalidProviderResponse();
      length += value.byteLength;
      if (length > RESEND_MAX_RESPONSE_BYTES) throw new InvalidProviderResponse();
      if (value.byteLength) chunks.push(value.slice());
    }
    throw new InvalidProviderResponse();
  };
  try {
    return await Promise.race([operation(), deadline]);
  } catch (error) {
    return Object.freeze({
      ...identity,
      state: "outcome_unknown",
      reason: expired()
        ? "timeout"
        : error instanceof InvalidProviderResponse
          ? "invalid_response"
          : "transport_failure",
    });
  } finally {
    stopped = true;
    clearTimeout(timer);
    controller.abort();
    // Hostile/failed streams and transports must not hold the caller indefinitely.
    if (reader) {
      try {
        void reader.cancel().catch(() => undefined);
        reader.releaseLock();
      } catch {
        // Best effort; the attempt has already settled within its deadline.
      }
    } else if (response instanceof Response) cancelBody(response);
  }
}
