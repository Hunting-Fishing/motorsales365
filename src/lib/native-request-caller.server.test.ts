import { afterEach, describe, expect, it, vi } from "vitest";
import {
  captureNativeRequestCaller,
  NATIVE_CALLER_AUTH_WAIT_MS,
  NATIVE_REQUEST_CALLER_FAILURE,
} from "./native-request-caller.server";

// Synthetic middleware context/Auth transport only. These tests do not verify
// JWTs, contact Auth, establish session revocation or grant native-shop authority.
const accountId = "a0000000-0000-4000-8000-000000000001";
const otherId = "b0000000-0000-4000-8000-000000000002";
const token = "fixture.access.token";
const userResponse = () => ({
  data: { user: { id: accountId, role: "authenticated", is_anonymous: false } },
  error: null,
});
function fixture() {
  const getUser = vi.fn((_token: string): Promise<unknown> => Promise.resolve(userResponse()));
  const client = { auth: { getUser } };
  const context = {
    userId: accountId,
    claims: { sub: accountId, role: "authenticated", is_anonymous: false },
    supabase: client,
  };
  const controller = new AbortController();
  const request = {
    headers: new Headers({ authorization: `Bearer ${token}` }),
    signal: controller.signal,
  };
  return { getUser, client, context, controller, request };
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
function expectCaptureDenied(context: unknown, expectedAccountId = accountId) {
  expect(() => captureNativeRequestCaller(context, expectedAccountId)).toThrow(
    NATIVE_REQUEST_CALLER_FAILURE,
  );
}
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("additional native request-caller denial guard", () => {
  it("uses exactly the captured caller Auth method and explicit token, with no user DTO returned", async () => {
    const setup = fixture();
    setup.getUser.mockImplementation(function (this: unknown, suppliedToken: string) {
      expect(this).toBe(setup.client.auth);
      expect(suppliedToken).toBe(token);
      return Promise.resolve(userResponse());
    });
    const guard = captureNativeRequestCaller(setup.context, accountId);
    expect(Object.isFrozen(guard)).toBe(true);
    expect(Object.keys(guard)).toEqual(["verify"]);
    const assertCurrent = await guard.verify(setup.request);
    expect(typeof assertCurrent).toBe("function");
    expect(assertCurrent()).toBeUndefined();
    expect(setup.getUser).toHaveBeenCalledExactlyOnceWith(token);
  });

  it("compares valid UUIDs canonically without accepting whitespace or a different account", async () => {
    const setup = fixture();
    setup.context.claims.sub = accountId.toUpperCase();
    setup.getUser.mockResolvedValue({
      data: { user: { id: accountId.toUpperCase() } },
      error: null,
    });
    await expect(
      captureNativeRequestCaller(setup.context, accountId.toUpperCase()).verify(setup.request),
    ).resolves.toBeTypeOf("function");
    expectCaptureDenied(setup.context, ` ${accountId}`);
    expectCaptureDenied(setup.context, otherId);
  });

  it.each([undefined, null, [], {}, { userId: accountId }])(
    "rejects missing/malformed middleware context: %j",
    (context) => expectCaptureDenied(context),
  );

  it.each([undefined, null, "", "not-uuid", ` ${accountId}`, otherId])(
    "rejects malformed or mismatched captured actor: %j",
    (userId) => {
      const setup = fixture();
      expectCaptureDenied({ ...setup.context, userId });
      expect(setup.getUser).not.toHaveBeenCalled();
    },
  );

  it.each([undefined, null, "", "not-uuid", ` ${accountId}`, otherId])(
    "rejects malformed or mismatched verified subject: %j",
    (sub) => {
      const setup = fixture();
      expectCaptureDenied({ ...setup.context, claims: { ...setup.context.claims, sub } });
      expect(setup.getUser).not.toHaveBeenCalled();
    },
  );

  it.each([undefined, null, "", "anon", "service_role", "admin", ["authenticated"]])(
    "rejects a verified role other than authenticated: %j",
    (role) => {
      const setup = fixture();
      expectCaptureDenied({ ...setup.context, claims: { ...setup.context.claims, role } });
      expect(setup.getUser).not.toHaveBeenCalled();
    },
  );

  it.each([true, null, "false", 0])(
    "rejects explicitly anonymous or malformed anonymous claims: %j",
    (is_anonymous) => {
      const setup = fixture();
      expectCaptureDenied({ ...setup.context, claims: { ...setup.context.claims, is_anonymous } });
      expect(setup.getUser).not.toHaveBeenCalled();
    },
  );

  it("does not interpret absent anonymous metadata as physical-human proof", async () => {
    const setup = fixture();
    const claims = { sub: accountId, role: "authenticated" };
    setup.getUser.mockResolvedValue({ data: { user: { id: accountId } }, error: null });
    await expect(
      captureNativeRequestCaller({ ...setup.context, claims }, accountId).verify(setup.request),
    ).resolves.toBeTypeOf("function");
  });

  it("rejects inherited/accessor identity claims instead of treating them as verified own data", () => {
    const setup = fixture();
    expectCaptureDenied({ ...setup.context, claims: Object.create(setup.context.claims) });
    const getter = vi.fn(() => accountId);
    const claims = { role: "authenticated" };
    Object.defineProperty(claims, "sub", { get: getter });
    expectCaptureDenied({ ...setup.context, claims });
    expect(getter).not.toHaveBeenCalled();
  });

  it.each([null, {}, { auth: null }, { auth: {} }, { auth: { getUser: "not-function" } }])(
    "rejects a missing caller Auth method: %j",
    (supabase) => {
      const setup = fixture();
      expectCaptureDenied({ ...setup.context, supabase });
    },
  );

  it.each([
    null,
    "",
    "Bearer",
    "Bearer ",
    "bearer fixture.access.token",
    "Basic fixture.access.token",
    "Bearer  fixture.access.token",
    "Bearer fixture.access.token other",
    "Bearer fixture.access.token,second",
    "Bearer opaque-token",
    "Bearer fixture.access.",
    "Bearer fixture.access.token=",
  ])("rejects unsupported Bearer shape before Auth: %j", async (authorization) => {
    const setup = fixture();
    // This synthetic header getter retains exact bytes, unlike Headers' outer
    // whitespace normalization. No raw HTTP parser behavior is claimed.
    const request = {
      ...setup.request,
      headers: { get: vi.fn(() => authorization) },
    };
    await expect(
      captureNativeRequestCaller(setup.context, accountId).verify(request),
    ).rejects.toThrow(NATIVE_REQUEST_CALLER_FAILURE);
    expect(setup.getUser).not.toHaveBeenCalled();
  });

  it("rejects an already-aborted request before Auth and does not expose its reason", async () => {
    vi.useFakeTimers();
    const setup = fixture();
    setup.controller.abort(new Error("PRIVATE abort reason"));
    const add = vi.spyOn(setup.controller.signal, "addEventListener");
    await expect(
      captureNativeRequestCaller(setup.context, accountId).verify(setup.request),
    ).rejects.toThrow(NATIVE_REQUEST_CALLER_FAILURE);
    expect(setup.getUser).not.toHaveBeenCalled();
    expect(add).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  const mutations = {
    actor: (setup: ReturnType<typeof fixture>) => {
      setup.context.userId = otherId;
    },
    subject: (setup: ReturnType<typeof fixture>) => {
      setup.context.claims.sub = otherId;
    },
    role: (setup: ReturnType<typeof fixture>) => {
      setup.context.claims.role = "service_role";
    },
    anonymous: (setup: ReturnType<typeof fixture>) => {
      setup.context.claims.is_anonymous = true;
    },
    claimsObject: (setup: ReturnType<typeof fixture>) => {
      setup.context.claims = { ...setup.context.claims };
    },
    client: (setup: ReturnType<typeof fixture>) => {
      setup.context.supabase = { auth: { ...setup.client.auth } };
    },
    authObject: (setup: ReturnType<typeof fixture>) => {
      setup.client.auth = { ...setup.client.auth };
    },
    getUserMethod: (setup: ReturnType<typeof fixture>) => {
      setup.client.auth.getUser = vi.fn((suppliedToken: string) => setup.getUser(suppliedToken));
      expect(setup.client.auth.getUser).not.toBe(setup.getUser);
    },
  };
  for (const [name, mutate] of Object.entries(mutations)) {
    it(`rejects ${name} replacement after capture but before request verification`, async () => {
      const setup = fixture();
      const guard = captureNativeRequestCaller(setup.context, accountId);
      mutate(setup);
      await expect(guard.verify(setup.request)).rejects.toThrow(NATIVE_REQUEST_CALLER_FAILURE);
      expect(setup.getUser).not.toHaveBeenCalled();
    });
    it(`rejects ${name} loss while Auth is pending`, async () => {
      const setup = fixture();
      const pending = deferred<unknown>();
      setup.getUser.mockReturnValue(pending.promise);
      const result = captureNativeRequestCaller(setup.context, accountId).verify(setup.request);
      mutate(setup);
      pending.resolve(userResponse());
      await expect(result).rejects.toThrow(NATIVE_REQUEST_CALLER_FAILURE);
    });
  }

  it("detects synchronous caller loss inside getUser and observes its later rejection", async () => {
    const setup = fixture();
    const pending = deferred<unknown>();
    setup.getUser.mockImplementation(() => {
      setup.context.claims.role = "service_role";
      return pending.promise;
    });
    await expect(
      captureNativeRequestCaller(setup.context, accountId).verify(setup.request),
    ).rejects.toThrow(NATIVE_REQUEST_CALLER_FAILURE);
    pending.reject(new Error("PRIVATE late transport failure"));
    await Promise.resolve();
  });

  it.each([
    undefined,
    null,
    {},
    { data: { user: { id: accountId } } },
    { data: null, error: null },
    { data: {}, error: null },
    { data: { user: null }, error: null },
    { data: { user: {} }, error: null },
    { data: { user: { id: "not-uuid" } }, error: null },
    { data: { user: { id: otherId } }, error: null },
    { data: { user: { id: accountId, is_anonymous: true } }, error: null },
    { data: { user: { id: accountId, is_anonymous: "false" } }, error: null },
    { data: { user: { id: accountId, role: "service_role" } }, error: null },
    { ...userResponse(), error: { message: "PRIVATE Auth error", token } },
  ])("rejects unavailable/malformed/mismatched Auth responses: %j", async (response) => {
    const setup = fixture();
    setup.getUser.mockResolvedValue(response);
    await expect(
      captureNativeRequestCaller(setup.context, accountId).verify(setup.request),
    ).rejects.toThrow(NATIVE_REQUEST_CALLER_FAILURE);
    expect(setup.getUser).toHaveBeenCalledTimes(1);
  });

  it.each(["throw", "reject"] as const)(
    "masks an Auth %s without a cause or retry",
    async (mode) => {
      const setup = fixture();
      setup.getUser.mockImplementation(() => {
        if (mode === "throw") throw new Error(`PRIVATE ${token}`);
        return Promise.reject(new Error(`PRIVATE ${token}`));
      });
      const error = await captureNativeRequestCaller(setup.context, accountId)
        .verify(setup.request)
        .catch((value: unknown) => value);
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBe(NATIVE_REQUEST_CALLER_FAILURE);
      expect(Object.prototype.hasOwnProperty.call(error, "cause")).toBe(false);
      expect(String(error)).not.toContain(token);
      expect(setup.getUser).toHaveBeenCalledTimes(1);
    },
  );

  it("ignores user metadata/email/native roles rather than using them for authorization", async () => {
    const setup = fixture();
    const readPrivate = vi.fn(() => {
      throw new Error("Must not inspect unrelated user values");
    });
    const user = { id: accountId, is_anonymous: false };
    for (const key of ["email", "user_metadata", "app_metadata", "shop_id", "roles"]) {
      Object.defineProperty(user, key, { get: readPrivate });
    }
    setup.getUser.mockResolvedValue({ data: { user }, error: null });
    await expect(
      captureNativeRequestCaller(setup.context, accountId).verify(setup.request),
    ).resolves.toBeTypeOf("function");
    expect(readPrivate).not.toHaveBeenCalled();
  });

  it.each(["header", "signal"] as const)(
    "rejects request %s replacement during Auth",
    async (kind) => {
      const setup = fixture();
      const pending = deferred<unknown>();
      setup.getUser.mockReturnValue(pending.promise);
      const result = captureNativeRequestCaller(setup.context, accountId).verify(setup.request);
      if (kind === "header")
        setup.request.headers.set("authorization", "Bearer another.access.token");
      else setup.request.signal = new AbortController().signal;
      pending.resolve(userResponse());
      await expect(result).rejects.toThrow(NATIVE_REQUEST_CALLER_FAILURE);
    },
  );

  it("returns a reusable assertion that permanently rejects an observed context loss", async () => {
    const setup = fixture();
    const assertCurrent = await captureNativeRequestCaller(setup.context, accountId).verify(
      setup.request,
    );
    setup.context.claims.role = "service_role";
    expect(assertCurrent).toThrow(NATIVE_REQUEST_CALLER_FAILURE);
    setup.context.claims.role = "authenticated";
    expect(assertCurrent).toThrow(NATIVE_REQUEST_CALLER_FAILURE);
  });

  for (const outcome of ["success", "error", "abort", "timeout"] as const) {
    it(`${outcome}: cleans the Auth wait timer and abort listener, without accepting late settlements`, async () => {
      vi.useFakeTimers();
      const setup = fixture();
      const pending = deferred<unknown>();
      setup.getUser.mockReturnValue(pending.promise);
      const add = vi.spyOn(setup.controller.signal, "addEventListener");
      const remove = vi.spyOn(setup.controller.signal, "removeEventListener");
      const result = captureNativeRequestCaller(setup.context, accountId).verify(setup.request);
      const assertion =
        outcome === "success"
          ? expect(result).resolves.toBeTypeOf("function")
          : expect(result).rejects.toThrow(NATIVE_REQUEST_CALLER_FAILURE);
      expect(vi.getTimerCount()).toBe(1);
      if (outcome === "success") pending.resolve(userResponse());
      if (outcome === "error") pending.reject(new Error(`PRIVATE ${token}`));
      if (outcome === "abort") setup.controller.abort(new Error("PRIVATE reason"));
      if (outcome === "timeout") {
        await vi.advanceTimersByTimeAsync(NATIVE_CALLER_AUTH_WAIT_MS - 1);
        expect(remove).not.toHaveBeenCalled();
        await vi.advanceTimersByTimeAsync(1);
      }
      await assertion;
      expect(add).toHaveBeenCalledExactlyOnceWith("abort", expect.any(Function), { once: true });
      expect(remove).toHaveBeenCalledExactlyOnceWith("abort", add.mock.calls[0][1]);
      expect(vi.getTimerCount()).toBe(0);
      if (outcome === "abort" || outcome === "timeout") {
        const readLate = vi.fn(() => {
          throw new Error("Late response must not be read");
        });
        pending.resolve(Object.defineProperty({}, "data", { get: readLate }));
        await Promise.resolve();
        expect(readLate).not.toHaveBeenCalled();
      }
    });
  }

  it("observes a rejection after timeout without retrying Auth", async () => {
    vi.useFakeTimers();
    const setup = fixture();
    const pending = deferred<unknown>();
    setup.getUser.mockReturnValue(pending.promise);
    const result = captureNativeRequestCaller(setup.context, accountId).verify(setup.request);
    const assertion = expect(result).rejects.toThrow(NATIVE_REQUEST_CALLER_FAILURE);
    await vi.advanceTimersByTimeAsync(NATIVE_CALLER_AUTH_WAIT_MS);
    await assertion;
    pending.reject(new Error(`PRIVATE ${token}`));
    await Promise.resolve();
    expect(setup.getUser).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });
});
