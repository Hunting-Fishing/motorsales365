import { afterEach, describe, expect, it, vi } from "vitest";
import {
  PRIVATE_RECEIPT_PATH_MAX_LENGTH,
  PRIVATE_RECEIPT_SIGN_WAIT_MS,
  PRIVATE_RECEIPT_URL_FAILURE,
  PRIVATE_RECEIPT_URL_MAX_LENGTH,
  parsePrivateReceiptPathResponse,
  parsePrivateReceiptSigningResponse,
  privateReceiptUrlRequestSchema,
  waitForPrivateReceiptSigning,
} from "./private-receipt-url.server";

// Synthetic SDK acknowledgments only; no live Storage/signature/TTL/RLS proof.
const account = "00000000-0000-4000-8000-000000000001";
const id = "00000000-0000-4000-8000-000000000002";
const key = `${account}/${id}/original.pdf`;
const base = "https://wjxaajgvddtrxxtocxen.supabase.co/storage/v1/object/sign/vehicle-receipts/";
const signed = (path = key) => `${base}${encodeURI(path)}?token=fixture.access.token`;
const response = (data: unknown) => ({ data, error: null });
const row = (path: unknown = key) => response({ id, file_path: path });
function deferred() {
  let resolve!: (value: unknown) => void;
  let reject!: (value: unknown) => void;
  const promise = new Promise<unknown>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("private receipt signing requests and acknowledgments", () => {
  it("accepts and detaches strict own UUID request fields", () => {
    const input = { expectedAccountId: account, id };
    const parsed = privateReceiptUrlRequestSchema.parse(input);
    input.id = account;
    expect(parsed).toEqual({ expectedAccountId: account, id });
  });
  it.each([
    null,
    [],
    {},
    { id },
    { expectedAccountId: account },
    { expectedAccountId: " ", id },
    { expectedAccountId: account, id, path: key },
    { expectedAccountId: account, id, [Symbol("extra")]: true },
    Object.create({ expectedAccountId: account, id }),
  ])("denies malformed requests %j", (input) => {
    expect(privateReceiptUrlRequestSchema.safeParse(input).success).toBe(false);
  });
  it("does not invoke request accessors", () => {
    const get = vi.fn(() => id);
    const input = {
      expectedAccountId: account,
      get id() {
        return get();
      },
    };
    expect(privateReceiptUrlRequestSchema.safeParse(input).success).toBe(false);
    expect(get).not.toHaveBeenCalled();
  });
  it.each([
    key,
    "different-uploader/legacy/Receipt 1 - 日本.pdf",
    "legacy/name(foo)&value=1;other:ok.pdf",
  ])("binds a structurally safe DB key without a reader prefix: %s", (path) => {
    expect(parsePrivateReceiptPathResponse(row(path), id)).toBe(path);
    expect(parsePrivateReceiptSigningResponse(response({ signedUrl: signed(path) }), path)).toBe(
      signed(path),
    );
  });
  it.each([
    null,
    "",
    "/a.pdf",
    "a.pdf/",
    "a//b",
    "a/./b",
    "a/../b",
    "a\\b",
    "a?b",
    "a#b",
    "a%2fb",
    "a\u0000b",
    "a\u007fb",
    "a\ud800b",
    "x".repeat(PRIVATE_RECEIPT_PATH_MAX_LENGTH + 1),
  ])("denies unsafe/unsupported DB keys %j", (path) => {
    expect(() => parsePrivateReceiptPathResponse(row(path), id)).toThrow(
      PRIVATE_RECEIPT_URL_FAILURE,
    );
  });
  it.each([undefined, false, "", { message: "PRIVATE cause" }])(
    "requires explicit null SDK error with valid data: %j",
    (error) => {
      expect(parsePrivateReceiptPathResponse(row(), id)).toBe(key);
      expect(() =>
        parsePrivateReceiptPathResponse({ data: { id, file_path: key }, error }, id),
      ).toThrow(PRIVATE_RECEIPT_URL_FAILURE);
      expect(parsePrivateReceiptSigningResponse(response({ signedUrl: signed() }), key)).toBe(
        signed(),
      );
      expect(() =>
        parsePrivateReceiptSigningResponse({ data: { signedUrl: signed() }, error }, key),
      ).toThrow(PRIVATE_RECEIPT_URL_FAILURE);
    },
  );
  it.each([
    null,
    [],
    {},
    { id: account, file_path: key },
    { id, file_path: key, vendor: "PRIVATE" },
    Object.create({ id, file_path: key }),
  ])("denies missing, foreign or overbroad rows %j", (data) => {
    expect(() => parsePrivateReceiptPathResponse(response(data), id)).toThrow(
      PRIVATE_RECEIPT_URL_FAILURE,
    );
  });
  it.each(["data", "error"])("never invokes SDK %s accessor", (field) => {
    const get = vi.fn(() => (field === "data" ? { id, file_path: key } : null));
    const sdk = row();
    Object.defineProperty(sdk, field, { enumerable: true, get });
    expect(() => parsePrivateReceiptPathResponse(sdk, id)).toThrow(PRIVATE_RECEIPT_URL_FAILURE);
    expect(get).not.toHaveBeenCalled();
  });
  it("never invokes a row path or signed URL accessor", () => {
    const getPath = vi.fn(() => key),
      getUrl = vi.fn(() => signed());
    expect(() =>
      parsePrivateReceiptPathResponse(
        response({
          id,
          get file_path() {
            return getPath();
          },
        }),
        id,
      ),
    ).toThrow(PRIVATE_RECEIPT_URL_FAILURE);
    expect(() =>
      parsePrivateReceiptSigningResponse(
        response({
          get signedUrl() {
            return getUrl();
          },
        }),
        key,
      ),
    ).toThrow(PRIVATE_RECEIPT_URL_FAILURE);
    expect(getPath).not.toHaveBeenCalled();
    expect(getUrl).not.toHaveBeenCalled();
  });
  it.each([
    "",
    null,
    12,
    "javascript:alert(1)",
    "/storage/v1/object/sign/vehicle-receipts/a?token=x",
    signed().replace("https:", "http:"),
    signed().replace("wjxaajgvddtrxxtocxen", "ujkizgblscqcejghxemb"),
    signed().replace("vehicle-receipts/", "other-bucket/"),
    signed(account + "/wrong.pdf"),
    signed() + "#fragment",
    signed() + "&token=second",
    signed() + "&download=true",
    signed().replace("token=fixture.access.token", "token="),
    signed().replace("token=fixture.access.token", "token=bad%20token"),
    signed().replace("token=fixture.access.token", "token=fixture..token"),
    signed().replace("https://", "https://user:password@"),
    signed().replace(".co/", ".co:443/"),
    signed().replace("wjxaajgvddtrxxtocxen", "WJXAAJGVDDTRXXTOCXEN"),
    " " + signed(),
    signed() + "\n",
    signed().replace("/storage/", "\\storage/"),
    signed().replace("/object/sign/", "/object/other/../sign/"),
    signed().replace("original.pdf", "%6Friginal.pdf"),
    base + "x".repeat(PRIVATE_RECEIPT_URL_MAX_LENGTH) + "?token=fixture",
  ])("rejects unbound or noncanonical URLs %j", (signedUrl) => {
    expect(() => parsePrivateReceiptSigningResponse(response({ signedUrl }), key)).toThrow(
      PRIVATE_RECEIPT_URL_FAILURE,
    );
  });
  it.each([
    {},
    { signedURL: signed() },
    { signedUrl: signed(), path: key },
    Object.create({ signedUrl: signed() }),
  ])("requires exactly one own signedUrl field %j", (data) => {
    expect(() => parsePrivateReceiptSigningResponse(response(data), key)).toThrow(
      PRIVATE_RECEIPT_URL_FAILURE,
    );
  });
  it("returns only generic errors without leaking provider/path/token causes", () => {
    for (const action of [
      () => parsePrivateReceiptPathResponse({ error: new Error("PRIVATE"), data: null }, id),
      () =>
        parsePrivateReceiptSigningResponse(response({ signedUrl: signed() + "&PRIVATE=1" }), key),
    ]) {
      try {
        action();
        throw new Error("Expected denial");
      } catch (error) {
        expect((error as Error).message).toBe(PRIVATE_RECEIPT_URL_FAILURE);
        expect(error).not.toHaveProperty("cause");
        expect(String(error)).not.toContain("PRIVATE");
      }
    }
  });
});

describe("bounded signing wait without mint cancellation", () => {
  it("resolves a current result once and cleans up timer/listener", async () => {
    vi.useFakeTimers();
    const controller = new AbortController(),
      check = vi.fn();
    const add = vi.spyOn(controller.signal, "addEventListener"),
      remove = vi.spyOn(controller.signal, "removeEventListener");
    const value = response({ signedUrl: signed() });
    const start = vi.fn(() => Promise.resolve(value));
    await expect(waitForPrivateReceiptSigning(start, controller.signal, check)).resolves.toBe(
      value,
    );
    expect(start).toHaveBeenCalledTimes(1);
    expect(check.mock.calls.length).toBeGreaterThanOrEqual(3);
    expect(vi.getTimerCount()).toBe(0);
    expect(remove).toHaveBeenCalledWith("abort", add.mock.calls[0][1]);
  });
  it.each(["aborted", "context"])("denies before SDK dispatch for %s", async (cause) => {
    vi.useFakeTimers();
    const controller = new AbortController(),
      start = vi.fn();
    if (cause === "aborted") controller.abort();
    const check = () => {
      if (cause === "context") throw new Error("PRIVATE caller");
    };
    await expect(waitForPrivateReceiptSigning(start, controller.signal, check)).rejects.toThrow(
      PRIVATE_RECEIPT_URL_FAILURE,
    );
    expect(start).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
  it.each(["resolve", "reject"])(
    "discards and observes late %s after request abort",
    async (outcome) => {
      vi.useFakeTimers();
      const controller = new AbortController(),
        pending = deferred();
      const wait = waitForPrivateReceiptSigning(
        () => pending.promise,
        controller.signal,
        () => {},
      );
      const denied = expect(wait).rejects.toThrow(PRIVATE_RECEIPT_URL_FAILURE);
      controller.abort(new Error("PRIVATE abort"));
      await denied;
      if (outcome === "resolve") pending.resolve(response({ signedUrl: signed() }));
      else pending.reject(new Error("PRIVATE late"));
      await Promise.resolve();
      await Promise.resolve();
      expect(vi.getTimerCount()).toBe(0);
    },
  );
  it.each(["resolve", "reject"])("times out once and observes late %s", async (outcome) => {
    vi.useFakeTimers();
    const controller = new AbortController(),
      pending = deferred();
    const wait = waitForPrivateReceiptSigning(
      () => pending.promise,
      controller.signal,
      () => {},
    );
    const denied = expect(wait).rejects.toThrow(PRIVATE_RECEIPT_URL_FAILURE);
    await vi.advanceTimersByTimeAsync(PRIVATE_RECEIPT_SIGN_WAIT_MS);
    await denied;
    if (outcome === "resolve") pending.resolve("PRIVATE late URL");
    else pending.reject(new Error("PRIVATE late cause"));
    await Promise.resolve();
    await Promise.resolve();
    expect(vi.getTimerCount()).toBe(0);
  });
  it("rejects an overdue microtask even if the timeout callback has not run", async () => {
    vi.useFakeTimers();
    let time = 0;
    vi.spyOn(performance, "now").mockImplementation(() => time);
    const controller = new AbortController(),
      pending = deferred();
    const wait = waitForPrivateReceiptSigning(
      () => pending.promise,
      controller.signal,
      () => {},
    );
    time = PRIVATE_RECEIPT_SIGN_WAIT_MS + 1;
    pending.resolve("PRIVATE late URL");
    await expect(wait).rejects.toThrow(PRIVATE_RECEIPT_URL_FAILURE);
    expect(vi.getTimerCount()).toBe(0);
  });
  it.each(["abort", "caller"])(
    "observes pending rejection if SDK dispatch changes %s synchronously",
    async (change) => {
      vi.useFakeTimers();
      const controller = new AbortController(),
        pending = deferred();
      let current = true;
      const wait = waitForPrivateReceiptSigning(
        () => {
          if (change === "abort") controller.abort();
          else current = false;
          return pending.promise;
        },
        controller.signal,
        () => {
          if (!current) throw new Error("PRIVATE");
        },
      );
      await expect(wait).rejects.toThrow(PRIVATE_RECEIPT_URL_FAILURE);
      pending.reject(new Error("PRIVATE late"));
      await Promise.resolve();
      await Promise.resolve();
      expect(vi.getTimerCount()).toBe(0);
    },
  );
  it("checks caller again when pending signing resolves", async () => {
    vi.useFakeTimers();
    const controller = new AbortController(),
      pending = deferred();
    let current = true;
    const wait = waitForPrivateReceiptSigning(
      () => pending.promise,
      controller.signal,
      () => {
        if (!current) throw new Error("PRIVATE");
      },
    );
    current = false;
    pending.resolve("PRIVATE URL");
    await expect(wait).rejects.toThrow(PRIVATE_RECEIPT_URL_FAILURE);
    expect(vi.getTimerCount()).toBe(0);
  });
  it.each(["sync", "async"])("redacts %s SDK failure and clears resources", async (kind) => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const start = () => {
      if (kind === "sync") throw new Error("PRIVATE SDK");
      return Promise.reject(new Error("PRIVATE SDK"));
    };
    await expect(waitForPrivateReceiptSigning(start, controller.signal, () => {})).rejects.toThrow(
      PRIVATE_RECEIPT_URL_FAILURE,
    );
    expect(vi.getTimerCount()).toBe(0);
  });
});
