// @vitest-environment node
// Actual verifier/planner/preparation, independent Node HMAC/hash fixtures, and
// injected fake transport only. No live provider, delivery, ledger or queue.
import { createHash, createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { verifyStandardWebhook } from "@/lib/webhooks/standard-webhooks.server";
import { planNativeAuthEmail } from "./native-auth-email-plan.server";
import {
  RESEND_ATTEMPT_TIMEOUT_MS,
  RESEND_MAX_RESPONSE_BYTES,
  RESEND_MAX_SUBJECT_BYTES,
  RESEND_MAX_HTML_BYTES,
  RESEND_MAX_TEXT_BYTES,
  RESEND_MAX_REQUEST_BYTES,
  ResendEmailBoundaryError,
  prepareNativeAuthResendEmail,
  attemptPreparedResendAuthEmail,
} from "./resend-auth-attempt.server";

const version = "365-resend-auth/v1";
const projectRef = "wjxaajgvddtrxxtocxen";
const endpoint = "https://api.resend.com/emails";
const from = "noreply@365motorsales.com";
const recipient = "synthetic@example.invalid";
const nowSeconds = 1_800_000_000;
const eventId = "synthetic_provider_event-123";
const providerId = "12345678-1234-4234-8234-123456789abc";
const apiKey = "re_SyntheticProviderKey_42";
const rendered = {
  subject: "Synthetic confirmation",
  html: "<p>Synthetic-private-html</p>",
  text: "Synthetic-private-text",
};
const senderPolicy = { projectRef, from };
const key = Buffer.alloc(32, 0x62);
const hookSecret = `v1,whsec_${key.toString("base64")}`;
const rawFailure = `Synthetic private diagnostic ${apiKey} ${recipient} ${rendered.html}`;
type Plan = Awaited<ReturnType<typeof planNativeAuthEmail>>;
type Prepared = Awaited<ReturnType<typeof prepareNativeAuthResendEmail>>;

function sha(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}
async function authPlan() {
  const body = JSON.stringify({
    user: { id: "12345678-1234-4234-8234-123456789abc", email: recipient },
    email_data: {
      site_url: "https://wjxaajgvddtrxxtocxen.supabase.co/auth/v1",
      redirect_to: "",
      email_action_type: "signup",
      token: "Synthetic_OTP-42",
      token_hash: "synthetic-opaque-hash",
    },
  });
  const timestamp = String(nowSeconds);
  const signature = createHmac("sha256", key)
    .update(`${eventId}.${timestamp}.`)
    .update(body)
    .digest("base64");
  const verifiedWebhook = await verifyStandardWebhook(
    new Request("https://example.invalid/synthetic-hook", {
      method: "POST",
      body,
      headers: {
        "webhook-id": eventId,
        "webhook-timestamp": timestamp,
        "webhook-signature": `v1,${signature}`,
      },
    }),
    hookSecret,
  );
  return planNativeAuthEmail({
    verifiedWebhook,
    policy: { projectRef, siteOrigin: "https://www.365motorsales.com", secureEmailChange: true },
  });
}
async function prepare(value?: Plan, output: unknown = rendered, policy: unknown = senderPolicy) {
  const plan = value ?? (await authPlan());
  return prepareNativeAuthResendEmail(plan, plan.commands[0].deliveryId, output, policy);
}
function accepted(id = providerId) {
  return Response.json({ id });
}
function streamed(body: ReadableStream<Uint8Array>, headers: Record<string, string> = {}) {
  return new Response(body, {
    status: 200,
    headers: { "content-type": "application/json", ...headers },
  });
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((onResolve) => {
    resolve = onResolve;
  });
  return { promise, resolve };
}
function assertGeneric(error: unknown) {
  expect(error).toBeInstanceOf(ResendEmailBoundaryError);
  expect(error).toHaveProperty("message", "Email provider boundary failed.");
  expect(error).toHaveProperty("code", expect.any(String));
  expect(error).not.toHaveProperty("cause");
  expect(String(error)).not.toContain(apiKey);
  expect(String(error)).not.toContain(rawFailure);
}
async function rejects(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (error) {
    assertGeneric(error);
    return;
  }
  throw new Error("Expected synthetic provider boundary input to reject");
}
function privateOutcome(outcome: unknown) {
  const body = JSON.stringify(outcome);
  for (const sensitive of [
    apiKey,
    recipient,
    rendered.subject,
    rendered.html,
    rendered.text,
    rawFailure,
  ]) {
    expect(body).not.toContain(sensitive);
  }
}
function identity(prepared: Prepared) {
  return {
    provider: "resend",
    deliveryId: prepared.deliveryId,
    requestFingerprint: prepared.requestFingerprint,
  };
}

beforeEach(() => {
  vi.spyOn(Date, "now").mockReturnValue(nowSeconds * 1000);
  vi.spyOn(globalThis, "fetch").mockRejectedValue(
    new Error("Unexpected synthetic network request"),
  );
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
  vi.spyOn(console, "log").mockImplementation(() => undefined);
});
afterEach(() => {
  expect(globalThis.fetch).not.toHaveBeenCalled();
  expect(console.error).not.toHaveBeenCalled();
  expect(console.warn).not.toHaveBeenCalled();
  expect(console.log).not.toHaveBeenCalled();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("inactive Resend auth preparation", () => {
  it("pins fixed request/response/time budgets", () => {
    expect(RESEND_ATTEMPT_TIMEOUT_MS).toBe(5000);
    expect(RESEND_MAX_RESPONSE_BYTES).toBe(4096);
    expect(RESEND_MAX_SUBJECT_BYTES).toBe(200);
    expect(RESEND_MAX_HTML_BYTES).toBe(200_000);
    expect(RESEND_MAX_TEXT_BYTES).toBe(64_000);
    expect(RESEND_MAX_REQUEST_BYTES).toBe(300_000);
  });

  it("independently verifies deterministic provider body, stable key and fingerprint", async () => {
    const plan = await authPlan();
    const prepared = await prepare(plan);
    const deliveryId = plan.commands[0].deliveryId;
    const body = JSON.stringify({
      from,
      to: [recipient],
      ...rendered,
      tags: [{ name: "delivery_id", value: deliveryId }],
    });
    const idempotencyKey = `365-auth-v1/${deliveryId}`;
    expect(prepared).toEqual({
      version,
      projectRef,
      deliveryId,
      idempotencyKey,
      body,
      requestFingerprint: sha(
        JSON.stringify([version, projectRef, endpoint, idempotencyKey, body]),
      ),
    });
    expect(Object.isFrozen(prepared)).toBe(true);
    expect(Reflect.set(prepared, "body", "changed")).toBe(false);
    expect(await prepare(plan)).toEqual(prepared);
  });

  it("snapshots rendered content and trusted policy before hashing", async () => {
    const plan = await authPlan();
    const mutableRender = { ...rendered };
    const mutablePolicy = { ...senderPolicy };
    const pending = prepareNativeAuthResendEmail(
      plan,
      plan.commands[0].deliveryId,
      mutableRender,
      mutablePolicy,
    );
    mutableRender.subject = "Changed after preparation started";
    mutableRender.html = "Changed";
    mutablePolicy.from = "different@365motorsales.com";
    const prepared = await pending;
    expect(JSON.parse(prepared.body)).toMatchObject({ from, ...rendered });
  });

  it("accepts Unicode render content and exact per-field UTF8 byte limits", async () => {
    const unicode = await prepare(undefined, {
      subject: "Confirm 🚘",
      html: "<p>車輛 🛠️</p>",
      text: "車輛 🛠️",
    });
    expect(JSON.parse(unicode.body)).toMatchObject({
      subject: "Confirm 🚘",
      html: "<p>車輛 🛠️</p>",
      text: "車輛 🛠️",
    });
    const bounded = await prepare(undefined, {
      subject: "é".repeat(100),
      html: "x".repeat(200_000),
      text: "x".repeat(64_000),
    });
    expect(Buffer.byteLength(bounded.body, "utf8")).toBeLessThanOrEqual(300_000);
  });

  it.each(["subject", "html", "text"])(
    "rejects blank, NUL and lone-surrogate %s without reflecting input",
    async (field) => {
      for (const value of ["", "   ", "synthetic\0private", "synthetic\ud800private"]) {
        await rejects(prepare(undefined, { ...rendered, [field]: value }));
      }
    },
  );

  it("distinguishes changed content while preserving the complete delivery idempotency key", async () => {
    const plan = await authPlan();
    const first = await prepare(plan);
    const changed = await prepare(plan, { ...rendered, subject: "Changed synthetic subject" });
    expect(changed.idempotencyKey).toBe(first.idempotencyKey);
    expect(changed.requestFingerprint).not.toBe(first.requestFingerprint);
    expect(first.idempotencyKey).toBe(`365-auth-v1/${plan.commands[0].deliveryId}`);
  });

  it("accepts frozen render/policy data and an owned subdomain mailbox", async () => {
    const prepared = await prepare(
      undefined,
      Object.freeze({ ...rendered }),
      Object.freeze({ projectRef, from: "sender@notify.365motorsales.com" }),
    );
    expect(JSON.parse(prepared.body).from).toBe("sender@notify.365motorsales.com");
  });

  it("rejects fabricated/cloned/serialized plans rather than trusting their fields", async () => {
    const plan = await authPlan();
    for (const impostor of [
      null,
      {},
      { ...plan },
      Object.freeze({ ...plan }),
      structuredClone(plan),
      JSON.parse(JSON.stringify(plan)),
    ]) {
      await rejects(
        prepareNativeAuthResendEmail(impostor, plan.commands[0].deliveryId, rendered, senderPolicy),
      );
    }
  });

  it.each([undefined, null, "", "bad", "a".repeat(64)])(
    "rejects a delivery ID not present in the actual plan: %j",
    async (deliveryId) => {
      const plan = await authPlan();
      await rejects(prepareNativeAuthResendEmail(plan, deliveryId, rendered, senderPolicy));
    },
  );

  it.each([
    null,
    [],
    "rendered",
    {},
    { ...rendered, extra: true },
    { subject: "Synthetic", html: "<p>Missing text</p>" },
    { ...rendered, subject: 42 },
  ])("rejects malformed rendered fields %j", async (output) => {
    await rejects(prepare(undefined, output));
  });

  it.each([
    { ...rendered, subject: "x".repeat(201) },
    { ...rendered, subject: "é".repeat(101) },
    { ...rendered, subject: "Header\r\nInjection" },
    { ...rendered, html: "x".repeat(200_001) },
    { ...rendered, html: "é".repeat(100_001) },
    { ...rendered, text: "x".repeat(64_001) },
  ])("rejects byte-oversized or unsafe rendered content", async (output) => {
    await rejects(prepare(undefined, output));
  });

  it("enforces the request byte budget after JSON escaping expands otherwise bounded content", async () => {
    await rejects(
      prepare(undefined, {
        subject: "Synthetic",
        html: '"'.repeat(200_000),
        text: "x".repeat(64_000),
      }),
    );
  });

  it.each([
    null,
    [],
    {},
    { projectRef, from, extra: true },
    { projectRef: "ujkizgblscqcejghxemb", from },
    { projectRef, from: "sender@attacker.invalid" },
    { projectRef, from: "Name <noreply@365motorsales.com>" },
    { projectRef, from: "a@365motorsales.com,b@365motorsales.com" },
    { projectRef, from: "sender@365motorsales.com.attacker.invalid" },
    { projectRef, from: "sender@365motorsales.com\r\n" },
  ])("rejects wrong project or malformed/unowned sender policy %j", async (policy) => {
    await rejects(prepare(undefined, rendered, policy));
  });

  it("rejects accessor/hidden-extra rendered data without invoking getters", async () => {
    const getter = vi.fn(() => {
      throw new Error(rawFailure);
    });
    const output = { ...rendered };
    Object.defineProperty(output, "html", { get: getter, enumerable: true });
    await rejects(prepare(undefined, output));
    expect(getter).not.toHaveBeenCalled();
    const hidden = { ...rendered };
    Object.defineProperty(hidden, Symbol("hidden"), { value: rawFailure });
    await rejects(prepare(undefined, hidden));
  });
});

describe("single injected Resend request and preflight", () => {
  it("dispatches one fixed-origin POST with complete stable key and no implicit credentials/redirects", async () => {
    const prepared = await prepare();
    const transport = vi.fn(async (request: Request) => {
      expect(request).toBeInstanceOf(Request);
      expect(request.url).toBe(endpoint);
      expect(request.method).toBe("POST");
      expect(request.redirect).toBe("error");
      expect(request.credentials).toBe("omit");
      expect(request.cache).toBe("no-store");
      expect(request.headers.get("authorization")).toBe(`Bearer ${apiKey}`);
      expect(request.headers.get("idempotency-key")).toBe(prepared.idempotencyKey);
      expect(request.headers.get("content-type")).toBe("application/json");
      expect(await request.text()).toBe(prepared.body);
      return accepted(providerId.toUpperCase());
    });
    const outcome = await attemptPreparedResendAuthEmail(prepared, apiKey, transport);
    expect(outcome).toEqual({
      state: "provider_accepted",
      ...identity(prepared),
      providerMessageId: providerId,
    });
    expect(Object.isFrozen(outcome)).toBe(true);
    expect(transport).toHaveBeenCalledOnce();
    privateOutcome(outcome);
  });

  it("preserves identical body/key on explicit caller repetition, without performing automatic retries", async () => {
    const prepared = await prepare();
    const requests: Request[] = [];
    const transport = vi.fn(async (request: Request) => {
      requests.push(request);
      return accepted();
    });
    await attemptPreparedResendAuthEmail(prepared, apiKey, transport);
    await attemptPreparedResendAuthEmail(prepared, apiKey, transport);
    expect(transport).toHaveBeenCalledTimes(2);
    expect(requests[0]).not.toBe(requests[1]);
    expect(requests.map((request) => request.headers.get("idempotency-key"))).toEqual([
      prepared.idempotencyKey,
      prepared.idempotencyKey,
    ]);
    expect(await requests[0].text()).toBe(await requests[1].text());
  });

  it("rejects forged/cloned prepared objects before transport", async () => {
    const prepared = await prepare();
    const transport = vi.fn(async () => accepted());
    for (const impostor of [
      null,
      {},
      { ...prepared },
      Object.freeze({ ...prepared }),
      structuredClone(prepared),
      JSON.parse(JSON.stringify(prepared)),
    ]) {
      await rejects(attemptPreparedResendAuthEmail(impostor, apiKey, transport));
    }
    expect(transport).not.toHaveBeenCalled();
  });

  it.each([
    undefined,
    null,
    "",
    "short",
    "re_short",
    "sk_another_provider_key",
    "re_has space",
    "re_has\nnewline",
    `re_${"x".repeat(201)}`,
  ])("rejects malformed API key %j before transport", async (invalidKey) => {
    const prepared = await prepare();
    const transport = vi.fn(async () => accepted());
    await rejects(attemptPreparedResendAuthEmail(prepared, invalidKey, transport));
    expect(transport).not.toHaveBeenCalled();
  });

  it.each([undefined, null, {}, "fetch"])(
    "requires an explicit callable injected transport %j",
    async (transport) => {
      const prepared = await prepare();
      await rejects(attemptPreparedResendAuthEmail(prepared, apiKey, transport as never));
    },
  );

  it("returns an unknown outcome on thrown transport errors without reflecting raw diagnostics", async () => {
    const prepared = await prepare();
    const transport = vi.fn(() => {
      throw new Error(rawFailure);
    });
    const outcome = await attemptPreparedResendAuthEmail(prepared, apiKey, transport);
    expect(outcome).toEqual({
      state: "outcome_unknown",
      ...identity(prepared),
      reason: "transport_failure",
    });
    expect(Object.isFrozen(outcome)).toBe(true);
    expect(transport).toHaveBeenCalledOnce();
    privateOutcome(outcome);
  });
});

describe("Resend status and acknowledgment classification", () => {
  it.each([201, 202, 204, 400, 401, 429, 500, 503])(
    "never calls HTTP %s a provider acceptance or delivery confirmation",
    async (status) => {
      const prepared = await prepare();
      const transport = vi.fn(
        async () =>
          new Response(
            status === 204 ? null : JSON.stringify({ id: providerId, private: rawFailure }),
            {
              status,
              headers: { "content-type": "application/json" },
            },
          ),
      );
      const outcome = await attemptPreparedResendAuthEmail(prepared, apiKey, transport);
      expect(outcome).toEqual({
        state: "outcome_unknown",
        ...identity(prepared),
        reason: "http_error",
        httpStatus: status,
        retryAfterSeconds: null,
      });
      expect(transport).toHaveBeenCalledOnce();
      privateOutcome(outcome);
    },
  );

  it.each([429, 503])(
    "extracts a bounded numeric retry hint only for HTTP %s without retrying",
    async (status) => {
      const prepared = await prepare();
      const transport = vi.fn(
        async () => new Response(rawFailure, { status, headers: { "retry-after": "3600" } }),
      );
      const outcome = await attemptPreparedResendAuthEmail(prepared, apiKey, transport);
      expect(outcome).toMatchObject({
        state: "outcome_unknown",
        reason: "http_error",
        httpStatus: status,
        retryAfterSeconds: 3600,
      });
      expect(transport).toHaveBeenCalledOnce();
      privateOutcome(outcome);
    },
  );

  it.each([
    "0",
    "3601",
    "-1",
    "1.5",
    "NaN",
    "Wed, 21 Oct 2026 07:28:00 GMT",
    "99999999999999999999",
  ])("does not trust malformed/unbounded Retry-After %s", async (retryAfter) => {
    const prepared = await prepare();
    const outcome = await attemptPreparedResendAuthEmail(
      prepared,
      apiKey,
      async () => new Response(rawFailure, { status: 429, headers: { "retry-after": retryAfter } }),
    );
    expect(outcome).toHaveProperty("retryAfterSeconds", null);
    privateOutcome(outcome);
  });

  it("does not use retry hints from other statuses", async () => {
    const prepared = await prepare();
    const outcome = await attemptPreparedResendAuthEmail(
      prepared,
      apiKey,
      async () => new Response(null, { status: 400, headers: { "retry-after": "10" } }),
    );
    expect(outcome).toHaveProperty("retryAfterSeconds", null);
  });

  it.each([
    "",
    "null",
    "[]",
    "{}",
    "{broken",
    JSON.stringify({ id: "not-a-uuid" }),
    JSON.stringify({ id: providerId, extra: rawFailure }),
    JSON.stringify({ id: 42 }),
    `{"id":"other","id":"${providerId}"}`,
    `{"\\u0069d":"other","id":"${providerId}"}`,
  ])("does not accept malformed or ambiguous HTTP200 acknowledgment %s", async (body) => {
    const prepared = await prepare();
    const outcome = await attemptPreparedResendAuthEmail(
      prepared,
      apiKey,
      async () =>
        new Response(body, { status: 200, headers: { "content-type": "application/json" } }),
    );
    expect(outcome).toEqual({
      state: "outcome_unknown",
      ...identity(prepared),
      reason: "invalid_response",
    });
    privateOutcome(outcome);
  });

  it.each([
    "text/html",
    "text/plain",
    "application/json; charset=latin1",
    "application/json; unexpected=value",
  ])("rejects unapproved response Content-Type %s", async (contentType) => {
    const prepared = await prepare();
    const outcome = await attemptPreparedResendAuthEmail(
      prepared,
      apiKey,
      async () =>
        new Response(JSON.stringify({ id: providerId }), {
          headers: { "content-type": contentType },
        }),
    );
    expect(outcome).toHaveProperty("reason", "invalid_response");
  });

  it.each(["application/json", "application/json; charset=utf-8"])(
    "accepts exact JSON acknowledgment with %s",
    async (contentType) => {
      const prepared = await prepare();
      const outcome = await attemptPreparedResendAuthEmail(
        prepared,
        apiKey,
        async () =>
          new Response(JSON.stringify({ id: providerId }), {
            headers: { "content-type": contentType },
          }),
      );
      expect(outcome).toHaveProperty("state", "provider_accepted");
    },
  );

  it.each(["gzip", "br"])("rejects compressed provider response %s", async (encoding) => {
    const prepared = await prepare();
    const outcome = await attemptPreparedResendAuthEmail(
      prepared,
      apiKey,
      async () =>
        new Response(JSON.stringify({ id: providerId }), {
          headers: { "content-type": "application/json", "content-encoding": encoding },
        }),
    );
    expect(outcome).toHaveProperty("reason", "invalid_response");
  });

  it("rejects a structural Response lookalike", async () => {
    const prepared = await prepare();
    const outcome = await attemptPreparedResendAuthEmail(
      prepared,
      apiKey,
      async () => ({ status: 200, json: async () => ({ id: providerId }) }) as Response,
    );
    expect(outcome).toHaveProperty("reason", "invalid_response");
  });

  it.each(["redirected", "foreign-url"])(
    "rejects native Response with %s provenance",
    async (kind) => {
      const prepared = await prepare();
      const response = accepted();
      Object.defineProperty(response, kind === "redirected" ? "redirected" : "url", {
        value: kind === "redirected" ? true : "https://attacker.invalid/emails",
      });
      const outcome = await attemptPreparedResendAuthEmail(prepared, apiKey, async () => response);
      expect(outcome).toHaveProperty("reason", "invalid_response");
    },
  );
});

describe("bounded provider response reads and whole-attempt timeout", () => {
  it("accepts a valid acknowledgment exactly at the 4096-byte response boundary", async () => {
    const prepared = await prepare();
    const json = JSON.stringify({ id: providerId });
    const body = json + " ".repeat(4096 - Buffer.byteLength(json, "utf8"));
    const outcome = await attemptPreparedResendAuthEmail(
      prepared,
      apiKey,
      async () =>
        new Response(body, {
          headers: {
            "content-type": "application/json",
            "content-length": "4096",
            "content-encoding": "identity",
          },
        }),
    );
    expect(outcome).toEqual({
      state: "provider_accepted",
      ...identity(prepared),
      providerMessageId: providerId,
    });
  });

  it("rejects a bounded but mismatched declared length", async () => {
    const prepared = await prepare();
    const outcome = await attemptPreparedResendAuthEmail(
      prepared,
      apiKey,
      async () =>
        new Response(JSON.stringify({ id: providerId }), {
          headers: { "content-type": "application/json", "content-length": "1" },
        }),
    );
    expect(outcome).toHaveProperty("reason", "invalid_response");
  });

  it.each(["consumed", "locked"])("rejects an already %s native response body", async (kind) => {
    const prepared = await prepare();
    const response = accepted();
    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
    if (kind === "consumed") await response.text();
    else reader = response.body!.getReader();
    const outcome = await attemptPreparedResendAuthEmail(prepared, apiKey, async () => response);
    expect(outcome).toHaveProperty("reason", "invalid_response");
    reader?.releaseLock();
  });
  it.each(["4097", "invalid", "-1", "1, 2"])(
    "rejects oversized/malformed declared Content-Length %s",
    async (contentLength) => {
      const prepared = await prepare();
      const outcome = await attemptPreparedResendAuthEmail(
        prepared,
        apiKey,
        async () =>
          new Response(JSON.stringify({ id: providerId }), {
            headers: { "content-type": "application/json", "content-length": contentLength },
          }),
      );
      expect(outcome).toHaveProperty("reason", "invalid_response");
    },
  );

  it("bounds actual streamed response size even with a false small Content-Length and cancels without waiting", async () => {
    const prepared = await prepare();
    const cancel = vi.fn(() => new Promise<void>(() => undefined));
    const body = new ReadableStream<Uint8Array>({
      start: (controller) => controller.enqueue(new Uint8Array(4097)),
      cancel,
    });
    const outcome = await attemptPreparedResendAuthEmail(prepared, apiKey, async () =>
      streamed(body, { "content-length": "1" }),
    );
    expect(outcome).toHaveProperty("reason", "invalid_response");
    expect(cancel).toHaveBeenCalledOnce();
  });

  it("bounds an endless empty-chunk response independently of the timer", async () => {
    const prepared = await prepare();
    let reads = 0;
    const cancel = vi.fn();
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        reads++;
        controller.enqueue(new Uint8Array());
      },
      cancel,
    });
    const outcome = await attemptPreparedResendAuthEmail(prepared, apiKey, async () =>
      streamed(body),
    );
    expect(outcome).toHaveProperty("reason", "invalid_response");
    expect(reads).toBeLessThanOrEqual(4098);
    expect(cancel).toHaveBeenCalledOnce();
  });

  it.each([
    Uint8Array.from([0xff]),
    Uint8Array.from([0xef, 0xbb, 0xbf, ...Buffer.from(JSON.stringify({ id: providerId }))]),
  ])("rejects signed-looking invalid UTF8 or BOM acknowledgment bytes", async (bytes) => {
    const prepared = await prepare();
    const outcome = await attemptPreparedResendAuthEmail(
      prepared,
      apiKey,
      async () => new Response(bytes, { headers: { "content-type": "application/json" } }),
    );
    expect(outcome).toHaveProperty("reason", "invalid_response");
  });

  it("times out and aborts a transport that ignores abort without retrying or waiting indefinitely", async () => {
    const prepared = await prepare();
    vi.useFakeTimers();
    const requests: Request[] = [];
    const transport = vi.fn((request: Request) => {
      requests.push(request);
      return new Promise<Response>(() => undefined);
    });
    const pending = attemptPreparedResendAuthEmail(prepared, apiKey, transport);
    await vi.advanceTimersByTimeAsync(5001);
    const outcome = await pending;
    expect(outcome).toEqual({ state: "outcome_unknown", ...identity(prepared), reason: "timeout" });
    expect(requests[0].signal.aborted).toBe(true);
    expect(transport).toHaveBeenCalledOnce();
    privateOutcome(outcome);
  });

  it("uses the same attempt deadline for headers and a body that never completes", async () => {
    const prepared = await prepare();
    vi.useFakeTimers();
    const cancel = vi.fn(() => new Promise<void>(() => undefined));
    const body = new ReadableStream<Uint8Array>({ cancel });
    const transport = vi.fn(async () => streamed(body));
    const pending = attemptPreparedResendAuthEmail(prepared, apiKey, transport);
    await vi.advanceTimersByTimeAsync(5001);
    expect(await pending).toEqual({
      state: "outcome_unknown",
      ...identity(prepared),
      reason: "timeout",
    });
    expect(cancel).toHaveBeenCalledOnce();
    expect(transport).toHaveBeenCalledOnce();
  });

  it("does not reset the body budget after headers consumed most of the attempt deadline", async () => {
    const prepared = await prepare();
    vi.useFakeTimers();
    const headers = deferred<Response>();
    const cancel = vi.fn();
    const pending = attemptPreparedResendAuthEmail(prepared, apiKey, () => headers.promise);
    await vi.advanceTimersByTimeAsync(4000);
    headers.resolve(streamed(new ReadableStream<Uint8Array>({ cancel })));
    await vi.advanceTimersByTimeAsync(1001);
    expect(await pending).toEqual({
      state: "outcome_unknown",
      ...identity(prepared),
      reason: "timeout",
    });
    expect(cancel).toHaveBeenCalledOnce();
  });

  it("cancels a late response body after the transport timeout has already returned", async () => {
    const prepared = await prepare();
    vi.useFakeTimers();
    const late = deferred<Response>();
    const cancel = vi.fn();
    const pending = attemptPreparedResendAuthEmail(prepared, apiKey, () => late.promise);
    await vi.advanceTimersByTimeAsync(5001);
    expect(await pending).toHaveProperty("reason", "timeout");
    late.resolve(streamed(new ReadableStream<Uint8Array>({ cancel })));
    await vi.advanceTimersByTimeAsync(0);
    expect(cancel).toHaveBeenCalledOnce();
  });
});
