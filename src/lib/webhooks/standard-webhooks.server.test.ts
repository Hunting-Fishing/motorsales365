// @vitest-environment node
import { createHmac, webcrypto } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  WEBHOOK_BODY_TIMEOUT_MS,
  WEBHOOK_MAX_BODY_BYTES,
  WEBHOOK_MAX_CLOCK_SKEW_SECONDS,
  WebhookVerificationError,
  verifyStandardWebhook,
} from "./standard-webhooks.server";

// Independent fixtures use Node HMAC, not the verifier's WebCrypto implementation.
// All addresses, message contents, keys and event IDs in this file are synthetic.
const target = "https://example.invalid/synthetic-hook";
const key = Buffer.alloc(32, 0x41);
const bareSecret = key.toString("base64");
const secret = `v1,whsec_${bareSecret}`;
const eventId = "synthetic_event-123";
const nowSeconds = 1_800_000_000;
const sample = '{"message":"synthetic-private-body"}';
let clockMs = nowSeconds * 1000;

function bytes(value: string | Uint8Array): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(typeof value === "string" ? Buffer.from(value, "utf8") : value);
}

function signature(
  body: string | Uint8Array = sample,
  timestamp = String(nowSeconds),
  id = eventId,
  signingKey = key,
): string {
  return createHmac("sha256", signingKey)
    .update(`${id}.${timestamp}.`, "utf8")
    .update(bytes(body))
    .digest("base64");
}

type FixtureOptions = {
  timestamp?: string;
  id?: string;
  signatures?: string;
  headers?: Record<string, string>;
  prefix?: "webhook" | "svix";
  method?: string;
  signingKey?: Buffer;
  signal?: AbortSignal;
};

function fixtureHeaders(body: string | Uint8Array, options: FixtureOptions = {}): Headers {
  const timestamp = options.timestamp ?? String(nowSeconds);
  const id = options.id ?? eventId;
  const prefix = options.prefix ?? "webhook";
  const headers = new Headers({
    [`${prefix}-id`]: id,
    [`${prefix}-timestamp`]: timestamp,
    [`${prefix}-signature`]:
      options.signatures ?? `v1,${signature(body, timestamp, id, options.signingKey)}`,
  });
  for (const [name, value] of Object.entries(options.headers ?? {})) headers.set(name, value);
  return headers;
}

function request(body: string | Uint8Array = sample, options: FixtureOptions = {}): Request {
  const method = options.method ?? "POST";
  return new Request(target, {
    method,
    headers: fixtureHeaders(body, options),
    ...(method === "GET" || method === "HEAD" ? {} : { body: bytes(body) }),
    ...(options.signal ? { signal: options.signal } : {}),
  });
}

function streamed(
  body: ReadableStream<Uint8Array>,
  signedBody: string | Uint8Array,
  options: FixtureOptions = {},
): Request {
  const init: RequestInit & { duplex: "half" } = {
    method: "POST",
    headers: fixtureHeaders(signedBody, options),
    body,
    duplex: "half",
    ...(options.signal ? { signal: options.signal } : {}),
  };
  return new Request(target, init);
}

async function rejection(promise: Promise<unknown>): Promise<WebhookVerificationError> {
  try {
    await promise;
  } catch (error) {
    expect(error).toBeInstanceOf(WebhookVerificationError);
    expect(error).toHaveProperty("code");
    expect((error as Error).message).toBe("Webhook verification failed.");
    expect((error as Error).message).not.toContain(sample);
    expect((error as Error).message).not.toContain(bareSecret);
    expect((error as Error).message).not.toContain(eventId);
    return error as WebhookVerificationError;
  }
  throw new Error("Expected webhook verification to reject");
}

function noncanonicalPadding(value: string): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  const index = value.length - 2;
  const digit = alphabet.indexOf(value[index]);
  expect(value.endsWith("=")).toBe(true);
  expect(digit % 4).toBe(0);
  const result = value.slice(0, index) + alphabet[digit + 1] + "=";
  expect(Buffer.from(result, "base64")).toEqual(Buffer.from(value, "base64"));
  return result;
}

beforeEach(() => {
  clockMs = nowSeconds * 1000;
  vi.spyOn(Date, "now").mockImplementation(() => clockMs);
  vi.stubGlobal("crypto", webcrypto);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("Standard Webhooks independent HMAC and raw-body correctness", () => {
  it("exports fixed body, freshness and read-deadline limits", () => {
    expect(WEBHOOK_MAX_BODY_BYTES).toBe(20_000);
    expect(WEBHOOK_MAX_CLOCK_SKEW_SECONDS).toBe(300);
    expect(WEBHOOK_BODY_TIMEOUT_MS).toBe(1000);
  });

  for (const body of [
    sample,
    "",
    "line one\r\nline two\r\n",
    '{ "spacing": true }\n',
    "車輛 🛠️ résumé e\u0301",
    "\uFEFFsynthetic BOM payload",
  ]) {
    it("verifies and preserves exact signed text " + JSON.stringify(body), async () => {
      const result = await verifyStandardWebhook(request(body), secret);
      expect(result).toEqual({ id: eventId, timestamp: nowSeconds, body });
    });
  }

  it("does not normalize Unicode before verification", async () => {
    const decomposed = "e\u0301";
    await rejection(
      verifyStandardWebhook(
        request(decomposed.normalize("NFC"), { signatures: `v1,${signature(decomposed)}` }),
        secret,
      ),
    );
  });

  it("does not normalize CRLF, whitespace or JSON before verification", async () => {
    for (const altered of [sample + " ", sample + "\n", '{ "message":"synthetic-private-body"}']) {
      await rejection(
        verifyStandardWebhook(request(altered, { signatures: `v1,${signature(sample)}` }), secret),
      );
    }
    await rejection(
      verifyStandardWebhook(request("a\nb", { signatures: `v1,${signature("a\r\nb")}` }), secret),
    );
  });

  it("rejects tampered event ID, timestamp, body and signing key", async () => {
    const good = `v1,${signature()}`;
    for (const req of [
      request(sample, { id: "synthetic_other_event", signatures: good }),
      request(sample, { timestamp: String(nowSeconds + 1), signatures: good }),
      request(sample + "tamper", { signatures: good }),
      request(sample, { signingKey: Buffer.alloc(32, 0x42) }),
    ]) {
      await rejection(verifyStandardWebhook(req, secret));
    }
  });

  it("verifies actual streamed bytes across UTF-8 sequence boundaries", async () => {
    const body = bytes("車🚗\r\n\uFEFFdone");
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        for (const byte of body) controller.enqueue(Uint8Array.of(byte));
        controller.close();
      },
    });
    expect((await verifyStandardWebhook(streamed(stream, body), secret)).body).toBe(
      "車🚗\r\n\uFEFFdone",
    );
  });

  it("rejects invalid UTF-8 even when the exact bytes have a valid HMAC", async () => {
    for (const body of [
      Uint8Array.of(0xc3, 0x28),
      Uint8Array.of(0xff),
      Uint8Array.of(0xe2, 0x82),
    ]) {
      await rejection(verifyStandardWebhook(request(body), secret));
    }
  });

  it("keeps two valid deliveries independent rather than claiming replay deduplication", async () => {
    expect(await verifyStandardWebhook(request(), secret)).toEqual(
      await verifyStandardWebhook(request(), secret),
    );
  });
});

describe("secret, header family and signature parsing boundaries", () => {
  it("copies producer-mutable chunk views before the next read", async () => {
    const view = bytes("ab");
    let first = true;
    const stream = new ReadableStream<Uint8Array>(
      {
        pull(controller) {
          if (first) {
            first = false;
            controller.enqueue(view);
          } else {
            view.fill(0x7a);
            controller.close();
          }
        },
      },
      { highWaterMark: 0 },
    );
    expect((await verifyStandardWebhook(streamed(stream, "ab"), secret)).body).toBe("ab");
    expect(Buffer.from(view).toString()).toBe("zz");
  });

  it("accepts a signed empty request with no body stream", async () => {
    const req = new Request(target, { method: "POST", headers: fixtureHeaders("") });
    expect(req.body).toBeNull();
    expect((await verifyStandardWebhook(req, secret)).body).toBe("");
  });

  it("accepts the 2048-character signature bound and rejects 2049 characters", async () => {
    const unknown = Buffer.alloc(1497).toString("base64");
    const maximum = `v22,${unknown} v1,${signature()}`;
    expect(maximum.length).toBe(2048);
    expect(
      (await verifyStandardWebhook(request(sample, { signatures: maximum }), secret)).body,
    ).toBe(sample);
    const oversized = `v222,${unknown} v1,${signature()}`;
    expect(oversized.length).toBe(2049);
    await rejection(verifyStandardWebhook(request(sample, { signatures: oversized }), secret));
  });

  for (const size of [24, 32, 64]) {
    for (const prefix of ["", "whsec_", "v1,whsec_"]) {
      it(`accepts canonical ${size}-byte synthetic key with ${prefix || "bare"} form`, async () => {
        const signingKey = Buffer.alloc(size, 0x43);
        const keyText = prefix + signingKey.toString("base64");
        expect((await verifyStandardWebhook(request(sample, { signingKey }), keyText)).body).toBe(
          sample,
        );
      });
    }
  }

  for (const value of [
    "",
    "not-base64!!",
    " " + bareSecret,
    bareSecret + " ",
    bareSecret.replace(/=+$/, ""),
    bareSecret + "=",
    "v2,whsec_" + bareSecret,
    "v1," + bareSecret,
    "whsec_whsec_" + bareSecret,
    "v1,whsec_" + bareSecret + ",v1,whsec_" + bareSecret,
    Buffer.alloc(23).toString("base64"),
    Buffer.alloc(65).toString("base64"),
    "----____",
  ]) {
    it("rejects malformed or out-of-bounds secret " + JSON.stringify(value), async () => {
      await rejection(verifyStandardWebhook(request(), value));
    });
  }

  it("rejects equivalent but noncanonical base64 unused bits in keys and signatures", async () => {
    await rejection(verifyStandardWebhook(request(), noncanonicalPadding(bareSecret)));
    await rejection(
      verifyStandardWebhook(
        request(sample, { signatures: `v1,${noncanonicalPadding(signature())}` }),
        secret,
      ),
    );
  });

  it("accepts Svix headers only with explicit svix selection", async () => {
    const result = await verifyStandardWebhook(request(sample, { prefix: "svix" }), secret, {
      headerPrefix: "svix",
    });
    expect(result).toEqual({ id: eventId, timestamp: nowSeconds, body: sample });
    await rejection(verifyStandardWebhook(request(sample, { prefix: "svix" }), secret));
    await rejection(verifyStandardWebhook(request(), secret, { headerPrefix: "svix" }));
  });

  for (const prefix of ["webhook", "svix"] as const) {
    for (const member of ["id", "timestamp", "signature"]) {
      it(`rejects ${prefix} request mixed with even one other-family ${member}`, async () => {
        const other = prefix === "webhook" ? "svix" : "webhook";
        await rejection(
          verifyStandardWebhook(
            request(sample, { prefix, headers: { [`${other}-${member}`]: "unexpected" } }),
            secret,
            { headerPrefix: prefix },
          ),
        );
      });
    }
  }

  for (const member of ["id", "timestamp", "signature"]) {
    it("requires header " + member, async () => {
      const req = request();
      req.headers.delete("webhook-" + member);
      await rejection(verifyStandardWebhook(req, secret));
    });
    it("rejects combined duplicate header " + member, async () => {
      const req = request();
      req.headers.append("webhook-" + member, req.headers.get("webhook-" + member)!);
      await rejection(verifyStandardWebhook(req, secret));
    });
  }

  for (const id of ["a", "A_0-z", "z".repeat(128)]) {
    it("accepts bounded ASCII event ID " + id.length, async () => {
      expect((await verifyStandardWebhook(request(sample, { id }), secret)).id).toBe(id);
    });
  }
  for (const id of ["", "a.b", "a b", "a/b", "a:b", "a,b", "a@b", "z".repeat(129)]) {
    it("rejects ambiguous event ID " + JSON.stringify(id), async () => {
      await rejection(verifyStandardWebhook(request(sample, { id }), secret));
    });
  }
  it("rejects non-ASCII event ID before crypto", async () => {
    await rejection(verifyStandardWebhook(request(sample, { id: "caf\u00e9" }), secret));
  });

  for (const timestamp of [
    "",
    "0",
    "01",
    "+1",
    "-1",
    "1.5",
    "1e9",
    "1800000000,1800000000",
    "999999999999",
    "9007199254740993",
  ]) {
    it("rejects noncanonical or overlong timestamp " + JSON.stringify(timestamp), async () => {
      await rejection(verifyStandardWebhook(request(sample, { timestamp }), secret));
    });
  }

  it("accepts matching known signature among well-formed unknown or nonmatching signatures", async () => {
    const wrong = signature(sample, String(nowSeconds), eventId, Buffer.alloc(32, 0x44));
    const signatures = `v2,${wrong} v1,${wrong} v1,${signature()}`;
    expect((await verifyStandardWebhook(request(sample, { signatures }), secret)).body).toBe(
      sample,
    );
  });

  it("accepts exactly eight well-formed signatures with a matching v1 last", async () => {
    const signatures = [...Array(7).fill(`v2,${signature()}`), `v1,${signature()}`].join(" ");
    expect((await verifyStandardWebhook(request(sample, { signatures }), secret)).body).toBe(
      sample,
    );
  });

  for (const signatures of [
    "",
    signature(),
    `v1:${signature()}`,
    `v1,${signature().replace(/=+$/, "")}`,
    "v1,not_base64!!",
    `v1,${Buffer.alloc(31).toString("base64")}`,
    `v1,${Buffer.alloc(33).toString("base64")}`,
    `v2,${signature()}`,
    `v2,not_base64!! v1,${signature()}`,
    `v1,${signature()} v1,not_base64!!`,
    `v1,${signature()}\tv2,${signature()}`,
    Array(9).fill(`v1,${signature()}`).join(" "),
    `v2,${Buffer.alloc(1500).toString("base64")} v1,${signature()}`,
  ]) {
    it(
      "rejects malformed, unknown-only or excessive signatures " + signatures.slice(0, 60),
      async () => {
        await rejection(verifyStandardWebhook(request(sample, { signatures }), secret));
      },
    );
  }
});

describe("freshness and request/body lifecycle", () => {
  for (const delta of [-300, -299, 0, 299, 300]) {
    it("accepts signed timestamp boundary delta " + delta, async () => {
      const timestamp = nowSeconds + delta;
      expect(
        (await verifyStandardWebhook(request(sample, { timestamp: String(timestamp) }), secret))
          .timestamp,
      ).toBe(timestamp);
    });
  }
  for (const delta of [-301, 301]) {
    it("rejects signed timestamp outside fixed window " + delta, async () => {
      await rejection(
        verifyStandardWebhook(request(sample, { timestamp: String(nowSeconds + delta) }), secret),
      );
    });
  }

  it("rechecks freshness after body read instead of accepting an aged request", async () => {
    const stream = new ReadableStream<Uint8Array>({
      async pull(controller) {
        await Promise.resolve();
        clockMs += 301_000;
        controller.enqueue(bytes(sample));
        controller.close();
      },
    });
    await rejection(verifyStandardWebhook(streamed(stream, sample), secret));
  });

  it("rechecks freshness after an actual successful cryptographic verification", async () => {
    const realVerify = webcrypto.subtle.verify.bind(webcrypto.subtle);
    const spy = vi.spyOn(webcrypto.subtle, "verify").mockImplementation(async (...args) => {
      const result = await realVerify(...args);
      clockMs += 301_000;
      return result;
    });
    await rejection(verifyStandardWebhook(request(), secret));
    expect(spy).toHaveBeenCalledOnce();
  });

  for (const method of ["GET", "HEAD", "PUT", "PATCH", "DELETE"]) {
    it("rejects non-POST method " + method, async () => {
      await rejection(verifyStandardWebhook(request(sample, { method }), secret));
    });
  }

  it("accepts identity content encoding only", async () => {
    expect(
      (
        await verifyStandardWebhook(
          request(sample, { headers: { "Content-Encoding": "identity" } }),
          secret,
        )
      ).body,
    ).toBe(sample);
    for (const value of ["gzip", "br", "deflate", "identity,gzip"]) {
      await rejection(
        verifyStandardWebhook(request(sample, { headers: { "Content-Encoding": value } }), secret),
      );
    }
  });

  it("rejects already consumed and reader-locked body", async () => {
    const consumed = request();
    await consumed.text();
    await rejection(verifyStandardWebhook(consumed, secret));
    const locked = request();
    const reader = locked.body!.getReader();
    await rejection(verifyStandardWebhook(locked, secret));
    await reader.cancel();
    reader.releaseLock();
  });

  it("rejects an already aborted request", async () => {
    const abort = new AbortController();
    abort.abort("synthetic-private-abort-reason");
    await rejection(verifyStandardWebhook(request(sample, { signal: abort.signal }), secret));
  });

  it("aborts a pending body read promptly and cancels without waiting on source cleanup", async () => {
    const abort = new AbortController();
    const cancel = vi.fn(() => new Promise<void>(() => {}));
    const stream = new ReadableStream<Uint8Array>({ cancel });
    const result = rejection(
      verifyStandardWebhook(streamed(stream, sample, { signal: abort.signal }), secret),
    );
    await Promise.resolve();
    abort.abort("synthetic-private-abort-reason");
    await result;
    expect(cancel).toHaveBeenCalledOnce();
  });

  it("rejects stream source errors without leaking their private details", async () => {
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        controller.error(new Error("synthetic-private-source-error"));
      },
    });
    const error = await rejection(verifyStandardWebhook(streamed(stream, sample), secret));
    expect(error.message).not.toContain("synthetic-private-source-error");
  });

  it("returns one constant generic error message across unrelated failures", async () => {
    const errors = await Promise.all([
      rejection(verifyStandardWebhook(request(), "synthetic-private-malformed-key")),
      rejection(
        verifyStandardWebhook(
          request(sample, { signatures: `v1,${signature("altered")}` }),
          secret,
        ),
      ),
      rejection(verifyStandardWebhook(request(sample, { timestamp: "0" }), secret)),
      rejection(verifyStandardWebhook(request(sample, { method: "GET" }), secret)),
      rejection(verifyStandardWebhook(request(Uint8Array.of(0xff)), secret)),
    ]);
    expect(new Set(errors.map((error) => error.message)).size).toBe(1);
    expect(errors[0].message.length).toBeLessThan(120);
    for (const error of errors) {
      expect(error.message).not.toContain("synthetic-private-malformed-key");
      expect(error.message).not.toContain("altered");
    }
  });

  it("rejects missing WebCrypto rather than accepting an unverifiable body", async () => {
    vi.stubGlobal("crypto", undefined);
    await rejection(verifyStandardWebhook(request(), secret));
  });

  it("rechecks abort after actual cryptographic verification", async () => {
    const abort = new AbortController();
    const realVerify = webcrypto.subtle.verify.bind(webcrypto.subtle);
    vi.spyOn(webcrypto.subtle, "verify").mockImplementation(async (...args) => {
      const result = await realVerify(...args);
      abort.abort("synthetic-private-late-abort");
      return result;
    });
    await rejection(verifyStandardWebhook(request(sample, { signal: abort.signal }), secret));
  });
});

describe("bounded raw-byte length and whole-body deadline", () => {
  it("bounds empty-chunk reads even when a source could starve the timeout task", async () => {
    let reads = 0;
    const cancel = vi.fn();
    const stream = new ReadableStream<Uint8Array>(
      {
        pull(controller) {
          reads++;
          controller.enqueue(new Uint8Array());
        },
        cancel,
      },
      { highWaterMark: 0 },
    );
    await rejection(verifyStandardWebhook(streamed(stream, ""), secret));
    expect(reads).toBeLessThanOrEqual(20_001);
    expect(cancel).toHaveBeenCalledOnce();
  });

  it("checks the absolute elapsed deadline when the timeout task has not run", async () => {
    const now = vi.spyOn(performance, "now").mockReturnValueOnce(0).mockReturnValue(1000);
    await rejection(verifyStandardWebhook(request(), secret));
    expect(now).toHaveBeenCalled();
  });

  for (const size of [0, 1, 19_999, 20_000]) {
    it("accepts actual signed byte count " + size, async () => {
      const body = "a".repeat(size);
      expect((await verifyStandardWebhook(request(body), secret)).body).toBe(body);
      expect(
        (
          await verifyStandardWebhook(
            request(body, { headers: { "Content-Length": String(size) } }),
            secret,
          )
        ).body,
      ).toBe(body);
    });
  }

  it("enforces UTF-8 bytes, not JavaScript character count", async () => {
    const body = "é".repeat(10_000);
    expect((await verifyStandardWebhook(request(body), secret)).body).toBe(body);
    await rejection(
      verifyStandardWebhook(
        request(body, { headers: { "Content-Length": String(body.length) } }),
        secret,
      ),
    );
    await rejection(verifyStandardWebhook(request(body + "é"), secret));
  });

  for (const length of [
    "",
    "00",
    "01",
    "-1",
    "+1",
    "1.0",
    "1e3",
    "20001",
    "99999999999999999999999",
    "1,1",
  ]) {
    it("rejects malformed or over-limit declared length " + JSON.stringify(length), async () => {
      await rejection(
        verifyStandardWebhook(request(sample, { headers: { "Content-Length": length } }), secret),
      );
    });
  }

  it("rejects smaller and larger false Content-Length declarations", async () => {
    for (const length of [
      "0",
      "1",
      String(bytes(sample).length - 1),
      String(bytes(sample).length + 1),
    ]) {
      await rejection(
        verifyStandardWebhook(request(sample, { headers: { "Content-Length": length } }), secret),
      );
    }
  });

  it("enforces actual size with no length or a deceptive small declaration", async () => {
    const declarations: Record<string, string>[] = [{}, { "Content-Length": "1" }];
    for (const headers of declarations) {
      await rejection(verifyStandardWebhook(request("a".repeat(20_001), { headers }), secret));
    }
  });

  it("cancels a stream immediately after aggregate chunks exceed the limit", async () => {
    const body = bytes("a".repeat(20_001));
    const cancel = vi.fn(() => new Promise<void>(() => {}));
    let chunk = 0;
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (chunk++ === 0) controller.enqueue(body.slice(0, 20_000));
        else controller.enqueue(body.slice(20_000));
      },
      cancel,
    });
    await rejection(verifyStandardWebhook(streamed(stream, body), secret));
    expect(cancel).toHaveBeenCalledOnce();
  });

  it("times out a never-ending body and does not await a hanging cancel", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const cancel = vi.fn(() => new Promise<void>(() => {}));
    const stream = new ReadableStream<Uint8Array>({ cancel });
    const result = rejection(verifyStandardWebhook(streamed(stream, sample), secret));
    await vi.advanceTimersByTimeAsync(WEBHOOK_BODY_TIMEOUT_MS - 1);
    expect(cancel).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    await result;
    expect(cancel).toHaveBeenCalledOnce();
  });

  it("uses one entire-body deadline, not a fresh timeout for every chunk", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const cancel = vi.fn();
    let chunk = 0;
    const stream = new ReadableStream<Uint8Array>({
      async pull(controller) {
        await new Promise((resolve) => setTimeout(resolve, 300));
        if (chunk++ < 4) controller.enqueue(bytes("a"));
        else controller.close();
      },
      cancel,
    });
    const result = rejection(verifyStandardWebhook(streamed(stream, "aaaa"), secret));
    await vi.advanceTimersByTimeAsync(WEBHOOK_BODY_TIMEOUT_MS);
    await result;
    expect(cancel).toHaveBeenCalledOnce();
  });
});
