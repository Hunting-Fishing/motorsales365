import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  captureNativeCommandCaller,
  captureNativeRequestCaller,
  NATIVE_CALLER_AUTH_WAIT_MS,
  NATIVE_REQUEST_CALLER_FAILURE,
} from "./native-request-caller.server";

// Actual helper, synthetic middleware/SDK responses only. No JWT verification,
// auth.sessions lookup, physical-human/native-shop authority or network occurs.
const accountId = "a0000000-0000-4000-8000-000000000001";
const sessionId = "a0000000-0000-4000-8000-000000000002";
const otherId = "b0000000-0000-4000-8000-000000000003";
const issuer = "https://wjxaajgvddtrxxtocxen.supabase.co/auth/v1";
const token = "fixture.access.token";
const nowMs = Date.parse("2026-10-16T05:00:00.000Z");
const now = nowMs / 1_000;
const claims = (): Record<string, unknown> => ({
  sub: accountId,
  role: "authenticated",
  iss: issuer,
  aud: "authenticated",
  session_id: sessionId,
  exp: now + 3_600,
  iat: now - 60,
  is_anonymous: false,
  aal: "aal1",
});
const claimsResponse = (value: unknown = claims()) => ({ data: { claims: value }, error: null });
const userResponse = () => ({
  data: { user: { id: accountId, role: "authenticated", is_anonymous: false } },
  error: null,
});
function fixture() {
  const currentClaims = claims();
  const getClaims = vi.fn(
    (_token: string): Promise<unknown> =>
      Promise.resolve(
        claimsResponse({
          ...currentClaims,
          aud: Array.isArray(currentClaims.aud) ? [...currentClaims.aud] : currentClaims.aud,
        }),
      ),
  );
  const getUser = vi.fn((_token: string): Promise<unknown> => Promise.resolve(userResponse()));
  const client = { auth: { getClaims, getUser } };
  const context = { userId: accountId, claims: currentClaims, supabase: client };
  const controller = new AbortController();
  const request = {
    headers: new Headers({ authorization: `Bearer ${token}` }),
    signal: controller.signal,
  };
  return { context, client, getClaims, getUser, request, controller };
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((accept, decline) => {
    resolve = accept;
    reject = decline;
  });
  return { promise, resolve, reject };
}
async function denied(pending: Promise<unknown>) {
  await expect(pending).rejects.toThrow(NATIVE_REQUEST_CALLER_FAILURE);
}
async function expectUserStarted(setup: ReturnType<typeof fixture>) {
  // Flush this helper's sequential promise callbacks without advancing clocks
  // (waitFor's fake-timer polling would consume the shared Auth budget).
  for (let turn = 0; turn < 4; turn++) await Promise.resolve();
  expect(setup.getUser).toHaveBeenCalledOnce();
}
function captureDenied(value: unknown) {
  expect(() => captureNativeCommandCaller(value, accountId)).toThrow(NATIVE_REQUEST_CALLER_FAILURE);
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(nowMs);
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("command-strict caller custody", () => {
  it("uses the captured receiver and exact request token in ordered claims/current-user lookups", async () => {
    const setup = fixture();
    const order: string[] = [];
    setup.getClaims.mockImplementation(function (this: unknown, value: string) {
      expect(this).toBe(setup.client.auth);
      expect(value).toBe(token);
      expect(setup.getUser).not.toHaveBeenCalled();
      order.push("claims");
      return Promise.resolve(claimsResponse());
    });
    setup.getUser.mockImplementation(function (this: unknown, value: string) {
      expect(this).toBe(setup.client.auth);
      expect(value).toBe(token);
      order.push("user");
      return Promise.resolve(userResponse());
    });
    const guard = captureNativeCommandCaller(setup.context, accountId);
    expect(Object.isFrozen(guard)).toBe(true);
    expect(Object.keys(guard)).toEqual(["verify"]);
    const assertCurrent = await guard.verify(setup.request);
    expect(assertCurrent()).toBeUndefined();
    expect(order).toEqual(["claims", "user"]);
    expect(setup.getClaims).toHaveBeenCalledExactlyOnceWith(token);
    expect(setup.getUser).toHaveBeenCalledExactlyOnceWith(token);
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each(["aal1", "aal2"])("validates %s without introducing an MFA policy", async (aal) => {
    const setup = fixture();
    setup.context.claims.aal = aal;
    setup.context.claims.aud = ["authenticated"];
    setup.context.claims.nbf = now;
    await expect(
      captureNativeCommandCaller(setup.context, accountId).verify(setup.request),
    ).resolves.toBeTypeOf("function");
  });

  it("compares verified UUID aliases canonically but pins original middleware field values", async () => {
    const setup = fixture();
    setup.context.claims.sub = accountId.toUpperCase();
    setup.context.claims.session_id = sessionId.toUpperCase();
    setup.getClaims.mockResolvedValue(claimsResponse());
    const assertCurrent = await captureNativeCommandCaller(
      setup.context,
      accountId.toUpperCase(),
    ).verify(setup.request);
    setup.context.claims.session_id = sessionId;
    expect(assertCurrent).toThrow(NATIVE_REQUEST_CALLER_FAILURE);
  });

  it("preserves the old reader's absent anonymous/temporal metadata and never accesses getClaims", async () => {
    const setup = fixture();
    setup.context.claims = { sub: accountId, role: "authenticated" };
    setup.getUser.mockResolvedValue({ data: { user: { id: accountId } }, error: null });
    const getter = vi.fn(() => {
      throw new Error("PRIVATE unexpected claims method");
    });
    Object.defineProperty(setup.client.auth, "getClaims", { get: getter });
    const assertCurrent = await captureNativeRequestCaller(setup.context, accountId).verify(
      setup.request,
    );
    expect(assertCurrent()).toBeUndefined();
    expect(getter).not.toHaveBeenCalled();
    expect(setup.getUser).toHaveBeenCalledExactlyOnceWith(token);
  });

  const invalidFields: [string, unknown][] = [
    ["iss", undefined],
    ["iss", "https://other.supabase.co/auth/v1"],
    ["iss", `${issuer}/`],
    ["aud", undefined],
    ["aud", "anon"],
    ["aud", []],
    ["aud", ["authenticated", "anon"]],
    ["aud", ["authenticated", "authenticated"]],
    ["aud", { 0: "authenticated", length: 1 }],
    ["session_id", undefined],
    ["session_id", null],
    ["session_id", "not-uuid"],
    ["session_id", ` ${sessionId}`],
    ["is_anonymous", undefined],
    ["is_anonymous", true],
    ["is_anonymous", "false"],
    ["aal", undefined],
    ["aal", "aal3"],
    ["aal", ["aal1"]],
    ["exp", undefined],
    ["exp", `${now + 60}`],
    ["exp", now],
    ["exp", now - 1],
    ["exp", Number.NaN],
    ["exp", Number.POSITIVE_INFINITY],
    ["exp", Number.MAX_SAFE_INTEGER + 1],
    ["exp", now + 0.5],
    ["iat", undefined],
    ["iat", `${now}`],
    ["iat", 0],
    ["iat", -1],
    ["iat", now + 1],
    ["iat", now + 3_600],
    ["iat", now + 4_000],
    ["iat", Number.NaN],
    ["iat", Number.POSITIVE_INFINITY],
    ["iat", Number.MAX_SAFE_INTEGER + 1],
    ["iat", now - 0.5],
    ["nbf", undefined],
    ["nbf", null],
    ["nbf", `${now}`],
    ["nbf", 0],
    ["nbf", -1],
    ["nbf", now + 1],
    ["nbf", now + 3_600],
    ["nbf", Number.NaN],
    ["nbf", Number.POSITIVE_INFINITY],
    ["nbf", Number.MAX_SAFE_INTEGER + 1],
    ["nbf", now - 0.5],
  ];
  it.each(invalidFields)("denies malformed middleware %s=%j before Auth", (field, value) => {
    const setup = fixture();
    setup.context.claims[field] = value;
    captureDenied(setup.context);
    expect(setup.getClaims).not.toHaveBeenCalled();
    expect(setup.getUser).not.toHaveBeenCalled();
  });

  it.each(["sub", "role", "iss", "aud", "session_id", "exp", "iat", "is_anonymous", "aal", "nbf"])(
    "rejects inherited/accessor/nonenumerable security field %s without getter invocation",
    (field) => {
      for (const shape of ["inherited", "accessor", "nonenumerable"]) {
        const setup = fixture();
        const value = field === "nbf" ? now : setup.context.claims[field];
        const getter = vi.fn(() => value);
        if (shape === "inherited") {
          delete setup.context.claims[field];
          Object.setPrototypeOf(setup.context.claims, { [field]: value });
        } else {
          Object.defineProperty(
            setup.context.claims,
            field,
            shape === "accessor"
              ? { configurable: true, enumerable: true, get: getter }
              : { configurable: true, enumerable: false, value },
          );
        }
        captureDenied(setup.context);
        expect(getter).not.toHaveBeenCalled();
        expect(setup.getClaims).not.toHaveBeenCalled();
      }
    },
  );

  it("rejects audience element accessors/symbols and allows null-prototype claim records", async () => {
    const setup = fixture();
    const getter = vi.fn(() => "authenticated");
    const audience = ["authenticated"];
    Object.defineProperty(audience, "0", { get: getter, enumerable: true });
    setup.context.claims.aud = audience;
    captureDenied(setup.context);
    expect(getter).not.toHaveBeenCalled();
    const extra = ["authenticated"];
    Object.defineProperty(extra, Symbol("PRIVATE"), { value: "PRIVATE" });
    setup.context.claims.aud = extra;
    captureDenied(setup.context);
    setup.context.claims = Object.assign(Object.create(null), claims());
    await expect(
      captureNativeCommandCaller(setup.context, accountId).verify(setup.request),
    ).resolves.toBeTypeOf("function");
  });

  it.each([undefined, null, "not-function"])("requires captured getClaims method: %j", (value) => {
    const setup = fixture();
    Object.defineProperty(setup.client.auth, "getClaims", { value });
    captureDenied(setup.context);
    expect(setup.getUser).not.toHaveBeenCalled();
  });

  const mismatches: [string, unknown][] = [
    ["sub", otherId],
    ["session_id", otherId],
    ["iss", "https://other.supabase.co/auth/v1"],
    ["aud", "anon"],
    ["role", "service_role"],
    ["aal", "aal2"],
    ["is_anonymous", true],
    ["iat", now - 59],
    ["exp", now + 3_599],
    ["nbf", now - 10],
  ];
  it.each(mismatches)(
    "denies request-token/middleware %s mismatch before getUser",
    async (field, value) => {
      const setup = fixture();
      setup.getClaims.mockResolvedValue(claimsResponse({ ...claims(), [field]: value }));
      await denied(captureNativeCommandCaller(setup.context, accountId).verify(setup.request));
      expect(setup.getClaims).toHaveBeenCalledExactlyOnceWith(token);
      expect(setup.getUser).not.toHaveBeenCalled();
    },
  );

  it.each([undefined, false, "", {}, new Error("PRIVATE Auth error")])(
    "requires explicit getClaims error:null with otherwise valid claims: %j",
    async (error) => {
      const setup = fixture();
      setup.getClaims.mockResolvedValue({ ...claimsResponse(), error });
      await denied(captureNativeCommandCaller(setup.context, accountId).verify(setup.request));
      expect(setup.getUser).not.toHaveBeenCalled();
    },
  );

  it.each([
    undefined,
    null,
    {},
    { data: null, error: null },
    { data: {}, error: null },
    { data: { claims: null }, error: null },
    { data: { claims: [] }, error: null },
  ])("denies missing/malformed getClaims response: %j", async (response) => {
    const setup = fixture();
    setup.getClaims.mockResolvedValue(response);
    await denied(captureNativeCommandCaller(setup.context, accountId).verify(setup.request));
    expect(setup.getUser).not.toHaveBeenCalled();
  });

  it("rejects inherited/accessor SDK result authority without invoking getters", async () => {
    for (const field of ["error", "data", "claims", "session_id"]) {
      const setup = fixture();
      const getter = vi.fn(() => (field === "error" ? null : claims()));
      const response = claimsResponse();
      const target =
        field === "claims"
          ? response.data
          : field === "session_id"
            ? response.data.claims
            : response;
      Object.defineProperty(target, field, { get: getter, enumerable: true });
      setup.getClaims.mockResolvedValue(response);
      await denied(captureNativeCommandCaller(setup.context, accountId).verify(setup.request));
      expect(getter).not.toHaveBeenCalled();
      expect(setup.getUser).not.toHaveBeenCalled();
    }
    const setup = fixture();
    setup.getClaims.mockResolvedValue(Object.create(claimsResponse()));
    await denied(captureNativeCommandCaller(setup.context, accountId).verify(setup.request));
  });

  it.each([undefined, null, true, "false", 0])(
    "requires current user's explicit nonanonymous flag: %j",
    async (value) => {
      const setup = fixture();
      setup.getUser.mockResolvedValue({
        data: { user: { id: accountId, is_anonymous: value } },
        error: null,
      });
      await denied(captureNativeCommandCaller(setup.context, accountId).verify(setup.request));
      expect(setup.getClaims).toHaveBeenCalledOnce();
      expect(setup.getUser).toHaveBeenCalledOnce();
    },
  );

  const mutate = {
    session: (setup: ReturnType<typeof fixture>) => {
      setup.context.claims.session_id = otherId;
    },
    issuer: (setup: ReturnType<typeof fixture>) => {
      setup.context.claims.iss = "https://other.supabase.co/auth/v1";
    },
    audienceIdentity: (setup: ReturnType<typeof fixture>) => {
      setup.context.claims.aud = ["authenticated"];
    },
    audienceElement: (setup: ReturnType<typeof fixture>) => {
      (setup.context.claims.aud as string[])[0] = "anon";
    },
    expiry: (setup: ReturnType<typeof fixture>) => {
      setup.context.claims.exp = now + 3_599;
    },
    issueTime: (setup: ReturnType<typeof fixture>) => {
      setup.context.claims.iat = now - 59;
    },
    assurance: (setup: ReturnType<typeof fixture>) => {
      setup.context.claims.aal = "aal2";
    },
    notBeforePresence: (setup: ReturnType<typeof fixture>) => {
      setup.context.claims.nbf = now - 10;
    },
    claimsMethod: (setup: ReturnType<typeof fixture>) => {
      setup.client.auth.getClaims = vi.fn((value: string) => setup.getClaims(value));
    },
    userMethod: (setup: ReturnType<typeof fixture>) => {
      setup.client.auth.getUser = vi.fn((value: string) => setup.getUser(value));
    },
    authIdentity: (setup: ReturnType<typeof fixture>) => {
      setup.client.auth = { ...setup.client.auth };
    },
    clientIdentity: (setup: ReturnType<typeof fixture>) => {
      setup.context.supabase = { auth: { ...setup.client.auth } };
    },
    claimsIdentity: (setup: ReturnType<typeof fixture>) => {
      setup.context.claims = { ...setup.context.claims };
    },
    header: (setup: ReturnType<typeof fixture>) => {
      setup.request.headers.set("authorization", "Bearer another.access.token");
    },
    signal: (setup: ReturnType<typeof fixture>) => {
      setup.request.signal = new AbortController().signal;
    },
  };
  for (const [name, change] of Object.entries(mutate)) {
    it(`latches observed ${name} loss during supported capture/request checkpoints`, async () => {
      // Context/methods are captured now; headers/signal are first observed by
      // verify(request), so a prior request change is not an observed loss.
      const checkpoints =
        name === "header" || name === "signal"
          ? ["claims", "user", "after"]
          : ["before", "claims", "user", "after"];
      for (const at of checkpoints) {
        const setup = fixture();
        setup.context.claims.aud = ["authenticated"];
        const guard = captureNativeCommandCaller(setup.context, accountId);
        const originalClaims = { ...setup.context.claims, aud: setup.context.claims.aud };
        if (at === "before") {
          change(setup);
          await denied(guard.verify(setup.request));
          expect(setup.getClaims).not.toHaveBeenCalled();
        } else if (at === "after") {
          const assertCurrent = await guard.verify(setup.request);
          change(setup);
          expect(assertCurrent).toThrow(NATIVE_REQUEST_CALLER_FAILURE);
          setup.context.claims = originalClaims;
          expect(assertCurrent).toThrow(NATIVE_REQUEST_CALLER_FAILURE);
        } else {
          const pending = deferred<unknown>();
          (at === "claims" ? setup.getClaims : setup.getUser).mockReturnValue(pending.promise);
          const result = guard.verify(setup.request);
          const rejection = denied(result);
          if (at === "user") await expectUserStarted(setup);
          change(setup);
          pending.resolve(at === "claims" ? claimsResponse() : userResponse());
          await rejection;
          if (at === "claims") expect(setup.getUser).not.toHaveBeenCalled();
        }
        expect(vi.getTimerCount()).toBe(0);
      }
    });
  }

  it("first observes header/signal at verify and can accept an equivalent signed tuple from a different token", async () => {
    const setup = fixture();
    const guard = captureNativeCommandCaller(setup.context, accountId);
    setup.request.headers.set("authorization", "Bearer equivalent.valid.signature");
    setup.request.signal = new AbortController().signal;
    const assertCurrent = await guard.verify(setup.request);
    expect(setup.getClaims).toHaveBeenCalledExactlyOnceWith("equivalent.valid.signature");
    expect(setup.getUser).toHaveBeenCalledExactlyOnceWith("equivalent.valid.signature");
    expect(assertCurrent()).toBeUndefined();
    // No token bytes or request signal were carried by generated middleware.
    // Tuple equivalence is not proof of its original bearer credential.
  });

  it("permanently denies observed session ABA rather than adopting the restored tuple", async () => {
    const setup = fixture();
    const assertCurrent = await captureNativeCommandCaller(setup.context, accountId).verify(
      setup.request,
    );
    setup.context.claims.session_id = otherId;
    expect(assertCurrent).toThrow(NATIVE_REQUEST_CALLER_FAILURE);
    setup.context.claims.session_id = sessionId;
    expect(assertCurrent).toThrow(NATIVE_REQUEST_CALLER_FAILURE);
  });

  it.each(["claims", "user", "after"])("rechecks expiry at %s checkpoint", async (at) => {
    const setup = fixture();
    setup.context.claims.exp = now + 1;
    const guard = captureNativeCommandCaller(setup.context, accountId);
    if (at === "after") {
      const assertCurrent = await guard.verify(setup.request);
      vi.setSystemTime(nowMs + 1_000);
      expect(assertCurrent).toThrow(NATIVE_REQUEST_CALLER_FAILURE);
      return;
    }
    const pending = deferred<unknown>();
    (at === "claims" ? setup.getClaims : setup.getUser).mockReturnValue(pending.promise);
    const result = guard.verify(setup.request);
    const rejection = denied(result);
    if (at === "user") await expectUserStarted(setup);
    vi.setSystemTime(nowMs + 1_000);
    pending.resolve(
      at === "claims" ? claimsResponse({ ...claims(), exp: now + 1 }) : userResponse(),
    );
    await rejection;
  });

  it("shares one ten-second Auth budget across claims and user, observing late settlements", async () => {
    const setup = fixture();
    const claimWait = deferred<unknown>();
    const userWait = deferred<unknown>();
    setup.getClaims.mockReturnValue(claimWait.promise);
    setup.getUser.mockReturnValue(userWait.promise);
    const remove = vi.spyOn(setup.controller.signal, "removeEventListener");
    const result = captureNativeCommandCaller(setup.context, accountId).verify(setup.request);
    const rejection = denied(result);
    await vi.advanceTimersByTimeAsync(6_000);
    claimWait.resolve(claimsResponse());
    await expectUserStarted(setup);
    await vi.advanceTimersByTimeAsync(3_999);
    expect(vi.getTimerCount()).toBe(1);
    await vi.advanceTimersByTimeAsync(1);
    await rejection;
    expect(remove).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
    userWait.reject(new Error("PRIVATE late user failure"));
    await Promise.resolve();
    expect(setup.getClaims).toHaveBeenCalledOnce();
    expect(setup.getUser).toHaveBeenCalledOnce();
  });

  it("rejects a late claims settlement even when the deadline timer has not run", async () => {
    let elapsed = 0;
    vi.spyOn(performance, "now").mockImplementation(() => elapsed);
    const setup = fixture();
    const pending = deferred<unknown>();
    setup.getClaims.mockReturnValue(pending.promise);
    const result = captureNativeCommandCaller(setup.context, accountId).verify(setup.request);
    const rejection = denied(result);
    elapsed = NATIVE_CALLER_AUTH_WAIT_MS;
    pending.resolve(claimsResponse());
    await rejection;
    expect(setup.getUser).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("cannot widen the monotonic Auth budget by moving the wall clock backwards", async () => {
    let elapsed = 100;
    vi.spyOn(performance, "now").mockImplementation(() => elapsed);
    const setup = fixture();
    const pending = deferred<unknown>();
    setup.getClaims.mockReturnValue(pending.promise);
    const result = captureNativeCommandCaller(setup.context, accountId).verify(setup.request);
    const rejection = denied(result);
    vi.setSystemTime(nowMs - 30_000);
    elapsed += NATIVE_CALLER_AUTH_WAIT_MS;
    pending.resolve(claimsResponse());
    await rejection;
    expect(setup.getUser).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, -1])(
    "denies unsafe initial monotonic clock %j",
    async (value) => {
      vi.spyOn(performance, "now").mockReturnValue(value);
      const setup = fixture();
      await denied(captureNativeCommandCaller(setup.context, accountId).verify(setup.request));
      expect(setup.getClaims).not.toHaveBeenCalled();
      expect(setup.getUser).not.toHaveBeenCalled();
      expect(vi.getTimerCount()).toBe(0);
    },
  );

  it("does not turn the finished Auth budget into a ten-second business-command lifetime", async () => {
    const setup = fixture();
    const assertCurrent = await captureNativeCommandCaller(setup.context, accountId).verify(
      setup.request,
    );
    vi.setSystemTime(nowMs + NATIVE_CALLER_AUTH_WAIT_MS + 1_000);
    expect(assertCurrent()).toBeUndefined();
    expect(setup.getClaims).toHaveBeenCalledOnce();
    expect(setup.getUser).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each(["resolve", "reject"])(
    "does not start getUser after expired claims wait then late %s",
    async (settlement) => {
      const setup = fixture();
      const pending = deferred<unknown>();
      setup.getClaims.mockReturnValue(pending.promise);
      const result = captureNativeCommandCaller(setup.context, accountId).verify(setup.request);
      const rejection = denied(result);
      await vi.advanceTimersByTimeAsync(NATIVE_CALLER_AUTH_WAIT_MS);
      await rejection;
      if (settlement === "resolve") pending.resolve(claimsResponse());
      else pending.reject(new Error("PRIVATE late claims failure"));
      await Promise.resolve();
      expect(setup.getUser).not.toHaveBeenCalled();
      expect(vi.getTimerCount()).toBe(0);
    },
  );

  it.each(["claims", "user"])(
    "aborts during %s wait and handles late rejection without raw cause",
    async (at) => {
      const setup = fixture();
      const pending = deferred<unknown>();
      (at === "claims" ? setup.getClaims : setup.getUser).mockReturnValue(pending.promise);
      const result = captureNativeCommandCaller(setup.context, accountId).verify(setup.request);
      const rejection = denied(result);
      if (at === "user") await expectUserStarted(setup);
      setup.controller.abort(new Error("PRIVATE abort"));
      await rejection;
      pending.reject(new Error("PRIVATE late failure"));
      await Promise.resolve();
      if (at === "claims") expect(setup.getUser).not.toHaveBeenCalled();
      expect(vi.getTimerCount()).toBe(0);
    },
  );

  it.each(["claims", "user"])("redacts synchronous and rejected %s failures", async (at) => {
    for (const failure of ["throw", "reject"]) {
      const setup = fixture();
      (at === "claims" ? setup.getClaims : setup.getUser).mockImplementation(() => {
        if (failure === "throw") throw new Error("PRIVATE token and provider detail");
        return Promise.reject(new Error("PRIVATE token and provider detail"));
      });
      await denied(captureNativeCommandCaller(setup.context, accountId).verify(setup.request));
      expect(vi.getTimerCount()).toBe(0);
    }
  });

  it("ignores user-editable metadata as authority but does not claim exact JWT-byte custody", async () => {
    const setup = fixture();
    setup.context.claims.user_metadata = { role: "owner", shop_id: otherId };
    setup.getClaims.mockResolvedValue(
      claimsResponse({ ...claims(), user_metadata: { role: "admin" } }),
    );
    setup.request.headers.set("authorization", "Bearer different.valid.signature");
    const assertCurrent = await captureNativeCommandCaller(setup.context, accountId).verify(
      setup.request,
    );
    expect(setup.getClaims).toHaveBeenCalledExactlyOnceWith("different.valid.signature");
    expect(setup.getUser).toHaveBeenCalledExactlyOnceWith("different.valid.signature");
    expect(assertCurrent()).toBeUndefined();
  });
});
