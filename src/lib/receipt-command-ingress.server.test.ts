import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  assertReceiptCommandIngress as assertBoundIngress,
  createReceiptCommandIngress,
} from "./receipt-command-ingress.server";
import { NATIVE_REQUEST_CALLER_FAILURE } from "./native-request-caller.server";

// Actual core/helper, SDK verification and transport doubled only. No JWT
// signature/Auth/session/native authority, private HTTP or financial proof.
const state = vi.hoisted(() => ({ factory: vi.fn(), fetch: vi.fn() }));
vi.mock("@supabase/supabase-js", () => ({
  createClient: (...args: unknown[]) => state.factory(...args),
}));
const origin = "https://wjxaajgvddtrxxtocxen.supabase.co";
const account = "a0000000-0000-4000-8000-000000000001";
const other = "b0000000-0000-4000-8000-000000000002";
const receipt = "c0000000-0000-4000-8000-000000000003";
const token = "original.request.token";
const key = "sb_publishable_fixture_key_1234567890";
const nowMs = Date.parse("2026-10-17T05:00:00.000Z");
const claims = () => ({
  sub: account,
  iss: origin + "/auth/v1",
  role: "authenticated",
  aud: "authenticated" as string | string[],
  session_id: other,
  exp: nowMs / 1000 + 3600,
  iat: nowMs / 1000 - 60,
  is_anonymous: false,
  aal: "aal1",
});
const response = (value: unknown) => ({ data: { claims: value }, error: null });
type Options = {
  global: { headers: Record<string, string>; fetch: typeof fetch };
  auth: Record<string, unknown>;
};
function fixture() {
  const controller = new AbortController();
  const request = new Request("https://www.365motorsales.com/_server/expense", {
    headers: { authorization: "Bearer " + token },
    signal: controller.signal,
  });
  const sourceClaims = claims();
  const getClaims = vi.fn(
    (_token: string): Promise<unknown> => Promise.resolve(response(sourceClaims)),
  );
  const getUser = vi.fn(
    (_token: string): Promise<unknown> =>
      Promise.resolve({
        data: { user: { id: account, role: "authenticated", is_anonymous: false } },
        error: null,
      }),
  );
  const client = {
    auth: { getClaims, getUser, url: origin + "/auth/v1", headers: credentials(), fetch: vi.fn() },
    from: vi.fn(),
    rpc: vi.fn(),
    fetch: vi.fn(),
    rest: {
      url: origin + "/rest/v1",
      schemaName: "public",
      headers: new Headers(credentials()),
      fetch: vi.fn(),
      from: vi.fn(),
      rpc: vi.fn(),
    },
  };
  state.factory.mockReturnValue(client);
  const outbound = () => (state.factory.mock.calls[0][2] as Options).global.fetch;
  return { controller, request, sourceClaims, getClaims, getUser, client, outbound };
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((accept, decline) => {
    resolve = accept;
    reject = decline;
  });
  return { promise, resolve, reject };
}
async function flush() {
  for (let step = 0; step < 16; step++) await Promise.resolve();
}
const credentials = () => ({ authorization: "Bearer " + token, apikey: key });
const readUrl = () =>
  origin + "/rest/v1/vehicle_receipts?select=id%2Cshop_vehicle_id&id=eq." + receipt;
const commandUrl = origin + "/rest/v1/rpc/record_vehicle_receipt_expense";
const readInit = (): RequestInit => ({ method: "GET", headers: credentials() });
const commandInit = (): RequestInit => ({
  method: "POST",
  headers: { ...credentials(), "Content-Type": "application/json" },
  body: JSON.stringify({ _id: receipt }),
});
const denied = (promise: Promise<unknown>) =>
  expect(promise).rejects.toThrow(NATIVE_REQUEST_CALLER_FAILURE);
function assertReceiptCommandIngress(
  context: unknown,
  request: Request,
  expectedAccountId: string,
  expectedReceiptId = receipt,
) {
  return assertBoundIngress(context, request, expectedAccountId, expectedReceiptId);
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(nowMs);
  vi.stubEnv("SUPABASE_URL", origin);
  vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", key);
  state.factory.mockReset();
  state.fetch
    .mockReset()
    .mockImplementation(() => Promise.resolve(new Response("{}", { status: 200 })));
  vi.stubGlobal("fetch", state.fetch);
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe("owned expense ingress custody", () => {
  it("constructs only canonical publishable SDK client and binds ordered exact-token verification", async () => {
    const f = fixture();
    const context = await createReceiptCommandIngress(f.request);
    expect(state.factory).toHaveBeenCalledOnce();
    const [url, configuredKey, options] = state.factory.mock.calls[0] as [string, string, Options];
    expect(url).toBe(origin);
    expect(configuredKey).toBe(key);
    expect(options.auth).toEqual({
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storage: undefined,
    });
    expect(options.global.headers).toEqual({ Authorization: "Bearer " + token });
    expect(f.getClaims).toHaveBeenCalledTimes(2);
    expect(f.getClaims.mock.calls).toEqual([[token], [token]]);
    expect(f.getUser).toHaveBeenCalledExactlyOnceWith(token);
    expect(f.getClaims.mock.contexts).toEqual([f.client.auth, f.client.auth]);
    expect(f.getUser.mock.contexts).toEqual([f.client.auth]);
    expect(Object.keys(context)).toEqual(["supabase", "userId", "claims", "receiptCommand"]);
    expect(Object.isFrozen(context)).toBe(true);
    expect(Object.isFrozen(context.claims)).toBe(true);
    expect(Object.isFrozen(context.receiptCommand)).toBe(true);
    expect(Reflect.ownKeys(context.receiptCommand)).toEqual([]);
    expect(() => assertReceiptCommandIngress(context, f.request, account)).not.toThrow();
    expect(() =>
      assertReceiptCommandIngress(
        Object.assign(Object.create(null), context, { framework: true }),
        f.request,
        account.toUpperCase(),
      ),
    ).not.toThrow();
    expect(f.getClaims).toHaveBeenCalledTimes(2);
    expect(f.getUser).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
    expect(state.fetch).not.toHaveBeenCalled();
  });

  it.each([
    undefined,
    "",
    origin + "/",
    origin + "/path",
    origin + "?x=1",
    "https://other.supabase.co",
    "https://wjxaajgvddtrxxtocxen.supabase.co:443",
  ])("refuses nonexact configured origin %s before SDK construction", async (value) => {
    fixture();
    vi.stubEnv("SUPABASE_URL", value);
    await denied(
      createReceiptCommandIngress(
        new Request("https://app.test", { headers: { authorization: "Bearer " + token } }),
      ),
    );
    expect(state.factory).not.toHaveBeenCalled();
    expect(state.fetch).not.toHaveBeenCalled();
  });
  it.each([
    undefined,
    "",
    "eyJ.legacy.key",
    "sb_secret_fixture_key_1234567890",
    "service_role",
    "sb_publishable_",
    "sb_publishable_" + "x".repeat(201),
    "sb_publishable_bad key",
  ])("refuses nonpublishable or malformed configured key without reflecting it", async (value) => {
    const f = fixture();
    vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", value);
    await denied(createReceiptCommandIngress(f.request));
    expect(state.factory).not.toHaveBeenCalled();
    expect(state.fetch).not.toHaveBeenCalled();
  });
  it.each([
    "",
    "Basic private",
    "Bearer missing",
    "bearer original.request.token",
    "Bearer original.request.token extra",
    "Bearer " + "x".repeat(8193),
  ])("refuses malformed original bearer before SDK construction", async (authorization) => {
    fixture();
    await denied(
      createReceiptCommandIngress(new Request("https://app.test", { headers: { authorization } })),
    );
    expect(state.factory).not.toHaveBeenCalled();
    expect(state.fetch).not.toHaveBeenCalled();
  });
  it("refuses fabricated request objects, already-aborted requests and own header accessors without reading them", async () => {
    const f = fixture();
    let getter = 0;
    await denied(
      createReceiptCommandIngress({
        headers: f.request.headers,
        signal: f.request.signal,
      } as Request),
    );
    Object.defineProperty(f.request, "headers", {
      get() {
        getter++;
        return new Headers({ authorization: "Bearer " + token });
      },
    });
    await denied(createReceiptCommandIngress(f.request));
    expect(getter).toBe(0);
    const otherFixture = fixture();
    otherFixture.controller.abort();
    await denied(createReceiptCommandIngress(otherFixture.request));
    expect(state.factory).not.toHaveBeenCalled();
  });
  it.each([
    "capability clone",
    "claims clone",
    "client replacement",
    "user replacement",
    "other request",
    "wrong account",
  ])("denies %s; known-cap observed drift never revives", async (kind) => {
    const f = fixture();
    const context = await createReceiptCommandIngress(f.request);
    let changed: unknown = { ...context };
    let request = f.request;
    let expected = account;
    if (kind === "capability clone")
      changed = { ...context, receiptCommand: { ...context.receiptCommand } };
    if (kind === "claims clone") changed = { ...context, claims: { ...context.claims } };
    if (kind === "client replacement") changed = { ...context, supabase: { ...context.supabase } };
    if (kind === "user replacement") changed = { ...context, userId: other };
    if (kind === "other request") request = new Request(f.request);
    if (kind === "wrong account") expected = other;
    expect(() => assertReceiptCommandIngress(changed, request, expected)).toThrow(
      NATIVE_REQUEST_CALLER_FAILURE,
    );
    if (kind === "capability clone")
      expect(() => assertReceiptCommandIngress(context, f.request, account)).not.toThrow();
    else
      expect(() => assertReceiptCommandIngress(context, f.request, account)).toThrow(
        NATIVE_REQUEST_CALLER_FAILURE,
      );
  });
  it("refuses inherited/getter security members and latches a known capability without invoking accessors", async () => {
    const f = fixture();
    const context = await createReceiptCommandIngress(f.request);
    let invoked = 0;
    expect(() => assertReceiptCommandIngress(Object.create(context), f.request, account)).toThrow(
      NATIVE_REQUEST_CALLER_FAILURE,
    );
    const changed = { ...context };
    Object.defineProperty(changed, "claims", {
      enumerable: true,
      get() {
        invoked++;
        return context.claims;
      },
    });
    expect(() => assertReceiptCommandIngress(changed, f.request, account)).toThrow(
      NATIVE_REQUEST_CALLER_FAILURE,
    );
    expect(invoked).toBe(0);
    expect(() => assertReceiptCommandIngress(context, f.request, account)).toThrow(
      NATIVE_REQUEST_CALLER_FAILURE,
    );
  });
  it.each(["header", "header getter", "auth", "getClaims", "getUser", "from", "rpc"])(
    "latches observed %s mutation after verification",
    async (kind) => {
      const f = fixture();
      const context = await createReceiptCommandIngress(f.request);
      const auth = f.client.auth;
      const saved =
        kind === "getClaims"
          ? auth.getClaims
          : kind === "getUser"
            ? auth.getUser
            : kind === "from"
              ? f.client.from
              : f.client.rpc;
      if (kind === "header") f.request.headers.set("authorization", "Bearer another.same.tuple");
      if (kind === "header getter")
        Object.defineProperty(f.request.headers, "get", {
          value: () => "Bearer " + token,
          configurable: true,
        });
      if (kind === "auth") Object.assign(f.client, { auth: { ...auth } });
      if (kind === "getClaims") Object.assign(auth, { getClaims: vi.fn() });
      if (kind === "getUser") Object.assign(auth, { getUser: vi.fn() });
      if (kind === "from") Object.assign(f.client, { from: vi.fn() });
      if (kind === "rpc") Object.assign(f.client, { rpc: vi.fn() });
      expect(() => assertReceiptCommandIngress(context, f.request, account)).toThrow(
        NATIVE_REQUEST_CALLER_FAILURE,
      );
      if (kind === "header") f.request.headers.set("authorization", "Bearer " + token);
      if (kind === "header getter")
        delete (f.request.headers as unknown as Record<string, unknown>).get;
      if (kind === "auth") Object.assign(f.client, { auth });
      if (kind === "getClaims") Object.assign(auth, { getClaims: saved });
      if (kind === "getUser") Object.assign(auth, { getUser: saved });
      if (kind === "from") Object.assign(f.client, { from: saved });
      if (kind === "rpc") Object.assign(f.client, { rpc: saved });
      expect(() => assertReceiptCommandIngress(context, f.request, account)).toThrow(
        NATIVE_REQUEST_CALLER_FAILURE,
      );
      expect(state.fetch).not.toHaveBeenCalled();
    },
  );
  it("does not adopt a changed bearer with identical claims during initial verification", async () => {
    const f = fixture();
    const pending = deferred<unknown>();
    f.getClaims.mockReturnValueOnce(pending.promise);
    const call = createReceiptCommandIngress(f.request);
    const rejection = denied(call);
    await flush();
    f.request.headers.set("authorization", "Bearer another.same.tuple");
    pending.resolve(response(claims()));
    await rejection;
    expect(f.getClaims).toHaveBeenCalledExactlyOnceWith(token);
    expect(f.getUser).not.toHaveBeenCalled();
  });
  it.each(["from", "rpc", "getClaims", "getUser", "rest.fetch", "auth.fetch"])(
    "pins %s before the first signed verification await",
    async (kind) => {
      const f = fixture();
      const pending = deferred<unknown>();
      f.getClaims.mockReturnValueOnce(pending.promise);
      const call = createReceiptCommandIngress(f.request);
      const rejection = denied(call);
      await flush();
      if (kind === "from") f.client.from = vi.fn();
      if (kind === "rpc") f.client.rpc = vi.fn();
      if (kind === "getClaims") Object.assign(f.client.auth, { getClaims: vi.fn() });
      if (kind === "getUser") Object.assign(f.client.auth, { getUser: vi.fn() });
      if (kind === "rest.fetch") f.client.rest.fetch = vi.fn();
      if (kind === "auth.fetch") f.client.auth.fetch = vi.fn();
      pending.resolve(response(claims()));
      await rejection;
      expect(f.getClaims).toHaveBeenCalledOnce();
      expect(f.getUser).not.toHaveBeenCalled();
      expect(state.fetch).not.toHaveBeenCalled();
    },
  );
  it.each([
    ["iss", "https://another.supabase.co/auth/v1"],
    ["role", "service_role"],
    ["aud", "anon"],
    ["session_id", "missing-session"],
    ["is_anonymous", true],
    ["aal", "aal3"],
    ["iat", nowMs / 1000 + 1],
    ["exp", nowMs / 1000],
    ["nbf", nowMs / 1000 + 1],
  ])(
    "refuses unsupported verified security field %s before helper Auth followup",
    async (field, value) => {
      const f = fixture();
      f.getClaims.mockResolvedValueOnce(response({ ...claims(), [field as string]: value }));
      await denied(createReceiptCommandIngress(f.request));
      expect(f.getClaims).toHaveBeenCalledOnce();
      expect(f.getUser).not.toHaveBeenCalled();
      expect(state.fetch).not.toHaveBeenCalled();
    },
  );
  it("checks expiry continuously but does not impose the Auth deadline on later command work", async () => {
    const f = fixture();
    const context = await createReceiptCommandIngress(f.request);
    await vi.advanceTimersByTimeAsync(11_000);
    expect(() => assertReceiptCommandIngress(context, f.request, account)).not.toThrow();
    vi.setSystemTime(nowMs + 3_600_000);
    expect(() => assertReceiptCommandIngress(context, f.request, account)).toThrow(
      NATIVE_REQUEST_CALLER_FAILURE,
    );
    vi.setSystemTime(nowMs);
    expect(() => assertReceiptCommandIngress(context, f.request, account)).toThrow(
      NATIVE_REQUEST_CALLER_FAILURE,
    );
  });
  it("uses one common10s deadline for initial claims plus helper claims, observes late settlements and stops followup", async () => {
    const f = fixture();
    const first = deferred<unknown>();
    const second = deferred<unknown>();
    f.getClaims.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const call = createReceiptCommandIngress(f.request);
    const rejection = denied(call);
    await flush();
    await vi.advanceTimersByTimeAsync(6_000);
    first.resolve(response(claims()));
    await flush();
    expect(f.getClaims).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(4_000);
    await rejection;
    await flush();
    expect(f.getUser).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
    second.resolve(response(claims()));
    await flush();
    expect(f.getUser).not.toHaveBeenCalled();
    expect(state.fetch).not.toHaveBeenCalled();
  });
  it.each(["resolve", "reject"])(
    "aborts an ignored current-user wait and observes its late %s",
    async (settle) => {
      const f = fixture();
      const pending = deferred<unknown>();
      f.getUser.mockReturnValue(pending.promise);
      const call = createReceiptCommandIngress(f.request);
      const rejection = denied(call);
      await flush();
      expect(f.getUser).toHaveBeenCalledOnce();
      f.controller.abort();
      await rejection;
      await flush();
      if (settle === "resolve")
        pending.resolve({ data: { user: { id: account, is_anonymous: false } }, error: null });
      else pending.reject(new Error("private SDK cause"));
      await flush();
      expect(vi.getTimerCount()).toBe(0);
      expect(state.fetch).not.toHaveBeenCalled();
    },
  );
  it.each([false, undefined, "", { message: "private provider response" }])(
    "requires explicit initial SDK error:null with valid claims, not %s",
    async (error) => {
      const f = fixture();
      f.getClaims.mockResolvedValueOnce({ ...response(claims()), error });
      await denied(createReceiptCommandIngress(f.request));
      expect(f.getClaims).toHaveBeenCalledOnce();
      expect(f.getUser).not.toHaveBeenCalled();
    },
  );
});

describe("final owned outbound transport", () => {
  it("dispatches a detached validated URL string, never coercing a mutable URL twice", async () => {
    const f = fixture();
    const context = await createReceiptCommandIngress(f.request);
    assertReceiptCommandIngress(context, f.request, account);
    const input = new URL(readUrl());
    let coercions = 0;
    Object.defineProperty(input, "toString", {
      value: () => (++coercions === 1 ? readUrl() : "https://private.invalid/collect"),
    });
    await f.outbound()(input, readInit());
    expect(coercions).toBe(1);
    expect(state.fetch).toHaveBeenCalledOnce();
    expect(state.fetch.mock.calls[0][0]).toBe(readUrl());
    expect(typeof state.fetch.mock.calls[0][0]).toBe("string");
  });
  it.each(["method", "body", "headers", "signal", "redirect", "credentials"])(
    "refuses an init %s accessor without invoking it or dispatching",
    async (field) => {
      const f = fixture();
      const context = await createReceiptCommandIngress(f.request);
      assertReceiptCommandIngress(context, f.request, account);
      const init = commandInit();
      let invoked = 0;
      Object.defineProperty(init, field, {
        enumerable: true,
        get: () => {
          invoked++;
          return JSON.stringify({ _id: other });
        },
      });
      await denied(f.outbound()(commandUrl, init));
      expect(invoked).toBe(0);
      expect(state.fetch).not.toHaveBeenCalled();
    },
  );
  it("never rereads validated method/body from init during later header assembly", async () => {
    const f = fixture();
    const context = await createReceiptCommandIngress(f.request);
    assertReceiptCommandIngress(context, f.request, account);
    const init = commandInit();
    const headerValues = { ...credentials() };
    let invoked = 0;
    Object.defineProperty(headerValues, "x-synthetic", {
      enumerable: true,
      get: () => {
        invoked++;
        init.method = "DELETE";
        init.body = JSON.stringify({ _id: other });
        return "synthetic";
      },
    });
    init.headers = headerValues;
    await f.outbound()(commandUrl, init);
    expect(invoked).toBe(1);
    expect(init.method).toBe("DELETE");
    expect(init.body).toBe(JSON.stringify({ _id: other }));
    expect(state.fetch).toHaveBeenCalledOnce();
    const dispatched = state.fetch.mock.calls[0][1] as RequestInit;
    expect(dispatched.method).toBe("POST");
    expect(dispatched.body).toBe(JSON.stringify({ _id: receipt }));
    expect(dispatched.cache).toBe("no-store");
  });
  it("refuses an inherited init prototype instead of adopting inherited request fields", async () => {
    const f = fixture();
    const context = await createReceiptCommandIngress(f.request);
    assertReceiptCommandIngress(context, f.request, account);
    const init = Object.assign(Object.create({ body: JSON.stringify({ _id: receipt }) }), {
      method: "POST",
      headers: credentials(),
    }) as RequestInit;
    await denied(f.outbound()(commandUrl, init));
    expect(state.fetch).not.toHaveBeenCalled();
  });
  it("allows SDK JWKS/user GET during Auth only, with exact original bearer/key and forced redirect/credential policy", async () => {
    const f = fixture();
    f.getClaims.mockImplementation(async () => {
      await f.outbound()(origin + "/auth/v1/.well-known/jwks.json", {
        method: "GET",
        headers: credentials(),
      });
      return response(claims());
    });
    f.getUser.mockImplementation(async () => {
      await f.outbound()(origin + "/auth/v1/user", { method: "GET", headers: credentials() });
      return { data: { user: { id: account, is_anonymous: false } }, error: null };
    });
    const context = await createReceiptCommandIngress(f.request);
    expect(state.fetch).toHaveBeenCalledTimes(3);
    for (const [, init] of state.fetch.mock.calls as [string, RequestInit][]) {
      expect(init.redirect).toBe("error");
      expect(init.credentials).toBe("omit");
      expect(init.signal).toBeInstanceOf(AbortSignal);
      expect(new Headers(init.headers).get("authorization")).toBe("Bearer " + token);
      expect(new Headers(init.headers).get("apikey")).toBe(key);
    }
    await denied(f.outbound()(origin + "/auth/v1/user", { headers: credentials() }));
    expect(() => assertReceiptCommandIngress(context, f.request, account)).toThrow(
      NATIVE_REQUEST_CALLER_FAILURE,
    );
  });
  it("allows only exact public receipt projection and one retained RPC after signed context admission", async () => {
    const f = fixture();
    const context = await createReceiptCommandIngress(f.request);
    assertReceiptCommandIngress(context, f.request, account);
    await f.outbound()(readUrl(), { ...readInit(), signal: f.request.signal });
    await f.outbound()(commandUrl, commandInit());
    expect(state.fetch).toHaveBeenCalledTimes(2);
    expect(() => assertReceiptCommandIngress(context, f.request, account)).not.toThrow();
    for (const [, init] of state.fetch.mock.calls as [string, RequestInit][])
      expect(init.signal).toBe(f.request.signal);
  });
  const invalid = () =>
    [
      ["other origin", "https://other.supabase.co/rest/v1/vehicle_receipts", readInit()],
      [
        "credentials URL",
        "https://user@wjxaajgvddtrxxtocxen.supabase.co/rest/v1/vehicle_receipts",
        readInit(),
      ],
      ["storage", origin + "/storage/v1/object/vehicle-receipts/private", readInit()],
      ["other RPC", origin + "/rest/v1/rpc/other", commandInit()],
      [
        "same tuple different bearer",
        readUrl(),
        {
          ...readInit(),
          headers: { ...credentials(), authorization: "Bearer another.same.tuple" },
        },
      ],
      [
        "different key",
        readUrl(),
        { ...readInit(), headers: { ...credentials(), apikey: "sb_publishable_another_key" } },
      ],
      ["missing key", readUrl(), { ...readInit(), headers: { authorization: "Bearer " + token } }],
      ["follow redirect", readUrl(), { ...readInit(), redirect: "follow" }],
      ["manual redirect", readUrl(), { ...readInit(), redirect: "manual" }],
      ["include credentials", readUrl(), { ...readInit(), credentials: "include" }],
      [
        "wrong schema",
        readUrl(),
        { ...readInit(), headers: { ...credentials(), "Accept-Profile": "shop_manager" } },
      ],
      [
        "wrong write schema",
        commandUrl,
        { ...commandInit(), headers: { ...credentials(), "Content-Profile": "shop_manager" } },
      ],
      ["wildcard select", readUrl().replace("id%2Cshop_vehicle_id", "*"), readInit()],
      ["duplicate select", readUrl() + "&select=id%2Cshop_vehicle_id", readInit()],
      ["unknown parameter", readUrl() + "&limit=1", readInit()],
      ["path alias", origin + "/auth/v1/../v1/user", readInit()],
      ["fragment", readUrl() + "#x", readInit()],
      ["other method", readUrl(), { ...readInit(), method: "DELETE" }],
      ["other signal", readUrl(), { ...readInit(), signal: new AbortController().signal }],
      [
        "extra RPC input",
        commandUrl,
        { ...commandInit(), body: JSON.stringify({ _id: receipt, other: true }) },
      ],
      [
        "duplicate RPC input",
        commandUrl,
        { ...commandInit(), body: '{"_id":"' + receipt + '","_id":"' + receipt + '"}' },
      ],
      ["invalid RPC id", commandUrl, { ...commandInit(), body: '{"_id":"private"}' }],
    ] as [string, string, RequestInit][];
  it.each(Array.from({ length: 22 }, (_, index) => index))(
    "rejects outbound mismatch case %s before native fetch and latches denial",
    async (index) => {
      const f = fixture();
      const context = await createReceiptCommandIngress(f.request);
      const [, url, init] = invalid()[index];
      assertReceiptCommandIngress(context, f.request, account);
      await denied(f.outbound()(url, init));
      expect(state.fetch).not.toHaveBeenCalled();
      expect(() => assertReceiptCommandIngress(context, f.request, account)).toThrow(
        NATIVE_REQUEST_CALLER_FAILURE,
      );
    },
  );
  it.each([
    "redirect status",
    "redirected flag",
    "other response URL",
    "non-Response",
    "rejected fetch",
  ])("rejects/redacts %s after dispatch", async (kind) => {
    const f = fixture();
    const context = await createReceiptCommandIngress(f.request);
    const value = new Response("private provider body");
    assertReceiptCommandIngress(context, f.request, account);
    if (kind === "redirect status")
      state.fetch.mockResolvedValue(new Response("private", { status: 302 }));
    if (kind === "redirected flag") {
      Object.defineProperty(value, "redirected", { value: true });
      state.fetch.mockResolvedValue(value);
    }
    if (kind === "other response URL") {
      Object.defineProperty(value, "url", { value: "https://private.invalid" });
      state.fetch.mockResolvedValue(value);
    }
    if (kind === "non-Response") state.fetch.mockResolvedValue({ status: 200, body: "private" });
    if (kind === "rejected fetch")
      state.fetch.mockRejectedValue(new Error("private provider cause"));
    await denied(f.outbound()(readUrl(), readInit()));
    expect(() => assertReceiptCommandIngress(context, f.request, account)).toThrow(
      NATIVE_REQUEST_CALLER_FAILURE,
    );
  });
  it.each(["resolve", "reject"])(
    "aborts an ignored business read, observes late %s, never grants renewed custody",
    async (settle) => {
      const f = fixture();
      const context = await createReceiptCommandIngress(f.request);
      const pending = deferred<Response>();
      state.fetch.mockReturnValue(pending.promise);
      assertReceiptCommandIngress(context, f.request, account);
      const read = f.outbound()(readUrl(), readInit());
      const rejection = denied(read);
      await flush();
      f.controller.abort();
      await rejection;
      if (settle === "resolve") pending.resolve(new Response("private"));
      else pending.reject(new Error("private late cause"));
      await flush();
      expect(() => assertReceiptCommandIngress(context, f.request, account)).toThrow(
        NATIVE_REQUEST_CALLER_FAILURE,
      );
      expect(state.fetch).toHaveBeenCalledOnce();
    },
  );
  it.each(["GET", "POST"])(
    "requires prior binding and rejects a different valid receipt in %s transport",
    async (methodName) => {
      const f = fixture();
      const context = await createReceiptCommandIngress(f.request);
      assertReceiptCommandIngress(context, f.request, account);
      const url = methodName === "GET" ? readUrl().replace(receipt, other) : commandUrl;
      const init =
        methodName === "GET"
          ? readInit()
          : { ...commandInit(), body: JSON.stringify({ _id: other }) };
      await denied(f.outbound()(url, init));
      expect(state.fetch).not.toHaveBeenCalled();
      expect(() => assertReceiptCommandIngress(context, f.request, account)).toThrow(
        NATIVE_REQUEST_CALLER_FAILURE,
      );
    },
  );
  it("does not dispatch an unbound command, and a known-cap receipt rebind latches failure", async () => {
    const first = fixture();
    const context = await createReceiptCommandIngress(first.request);
    await denied(first.outbound()(commandUrl, commandInit()));
    expect(state.fetch).not.toHaveBeenCalled();
    expect(() => assertReceiptCommandIngress(context, first.request, account)).toThrow(
      NATIVE_REQUEST_CALLER_FAILURE,
    );
    const second = fixture();
    const otherContext = await createReceiptCommandIngress(second.request);
    assertReceiptCommandIngress(otherContext, second.request, account);
    expect(() => assertReceiptCommandIngress(otherContext, second.request, account, other)).toThrow(
      NATIVE_REQUEST_CALLER_FAILURE,
    );
    expect(() => assertReceiptCommandIngress(otherContext, second.request, account)).toThrow(
      NATIVE_REQUEST_CALLER_FAILURE,
    );
  });
  it.each([
    "rest",
    "rest.fetch",
    "rest.from",
    "rest.rpc",
    "rest.url",
    "rest.schema",
    "rest.headers",
    "rest header contents",
    "auth.fetch",
    "auth.url",
    "auth.headers",
    "client.fetch",
  ])("pins %s before first Auth await and thereafter", async (kind) => {
    const f = fixture();
    const context = await createReceiptCommandIngress(f.request);
    if (kind === "rest") Object.assign(f.client, { rest: { ...f.client.rest } });
    if (kind === "rest.fetch") f.client.rest.fetch = vi.fn();
    if (kind === "rest.from") f.client.rest.from = vi.fn();
    if (kind === "rest.rpc") f.client.rest.rpc = vi.fn();
    if (kind === "rest.url") f.client.rest.url = "https://private.invalid";
    if (kind === "rest.schema") f.client.rest.schemaName = "shop_manager";
    if (kind === "rest.headers") f.client.rest.headers = new Headers(credentials());
    if (kind === "rest header contents")
      f.client.rest.headers.set("authorization", "Bearer other.same.tuple");
    if (kind === "auth.fetch") f.client.auth.fetch = vi.fn();
    if (kind === "auth.url") f.client.auth.url = "https://private.invalid";
    if (kind === "auth.headers") f.client.auth.headers = { ...credentials() };
    if (kind === "client.fetch") f.client.fetch = vi.fn();
    expect(() => assertReceiptCommandIngress(context, f.request, account)).toThrow(
      NATIVE_REQUEST_CALLER_FAILURE,
    );
    expect(state.fetch).not.toHaveBeenCalled();
  });
  it("composes actual installed SDK HS fallback and real builders with fake HTTP only, then denies rest.fetch replacement", async () => {
    // The fake Auth endpoint accepts this synthetic token; this is SDK/transport
    // composition, NOT a valid signature or real Auth/session authorization test.
    const sdk =
      await vi.importActual<typeof import("@supabase/supabase-js")>("@supabase/supabase-js");
    const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
    const actualToken = encode({ alg: "HS256", typ: "JWT" }) + "." + encode(claims()) + ".eHl6";
    const request = new Request("https://www.365motorsales.com/_server/expense", {
      headers: { authorization: "Bearer " + actualToken },
    });
    state.factory.mockImplementation(
      (url: string, publishable: string, options: Parameters<typeof sdk.createClient>[2]) =>
        sdk.createClient(url, publishable, options),
    );
    state.fetch.mockImplementation((input: string) => {
      if (input === origin + "/auth/v1/user")
        return Promise.resolve(
          Response.json({ id: account, role: "authenticated", is_anonymous: false }),
        );
      if (input.startsWith(origin + "/rest/v1/vehicle_receipts?"))
        return Promise.resolve(Response.json({ id: receipt, shop_vehicle_id: other }));
      if (input === commandUrl) return Promise.resolve(Response.json(other));
      throw new Error("Unexpected synthetic HTTP route");
    });
    const context = await createReceiptCommandIngress(request);
    assertReceiptCommandIngress(context, request, account);
    // Generated application type snapshot predates these retained native paths;
    // this test uses the SDK's generic client type, not invented table metadata.
    const db = context.supabase as unknown as SupabaseClient;
    const read = await db
      .from("vehicle_receipts")
      .select("id,shop_vehicle_id")
      .eq("id", receipt)
      .abortSignal(request.signal)
      .retry(false)
      .single();
    expect(read.error).toBeNull();
    expect(read.data).toEqual({ id: receipt, shop_vehicle_id: other });
    const write = await db
      .rpc("record_vehicle_receipt_expense", { _id: receipt })
      .abortSignal(request.signal)
      .retry(false);
    expect(write.error).toBeNull();
    expect(write.data).toBe(other);
    const before = state.fetch.mock.calls.length;
    for (const [, init] of state.fetch.mock.calls as [string, RequestInit][]) {
      expect(new Headers(init.headers).get("authorization")).toBe("Bearer " + actualToken);
      expect(new Headers(init.headers).get("apikey")).toBe(key);
      expect(init.redirect).toBe("error");
      expect(init.credentials).toBe("omit");
    }
    const raw = context.supabase as unknown as { rest: { fetch: typeof fetch } };
    const original = raw.rest.fetch;
    raw.rest.fetch = vi.fn();
    expect(() => assertReceiptCommandIngress(context, request, account)).toThrow(
      NATIVE_REQUEST_CALLER_FAILURE,
    );
    raw.rest.fetch = original;
    expect(() => assertReceiptCommandIngress(context, request, account)).toThrow(
      NATIVE_REQUEST_CALLER_FAILURE,
    );
    expect(state.fetch).toHaveBeenCalledTimes(before);
  });
});
