import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
const mocks = vi.hoisted(() => ({
  request: vi.fn(),
  callback: vi.fn(),
  error: vi.fn(),
  assign: vi.fn(),
}));
vi.mock("@/lib/google-oauth", () => ({
  GOOGLE_OAUTH_FAILED: "Generic Google failure",
  requestGoogleAuthorization: mocks.request,
  googleOAuthReturnUrl: mocks.callback,
}));
vi.mock("sonner", () => ({ toast: { error: mocks.error } }));
import { useGoogleOAuth } from "./use-google-oauth";
const destination = "https://wjxaajgvddtrxxtocxen.supabase.co/auth/v1/authorize?fixture";
function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: Error) => void;
  const promise = new Promise<T>((r, j) => {
    resolve = r;
    reject = j;
  });
  return { promise, resolve, reject };
}
const options = () => ({
  redirect: "/dashboard",
  scopeKey: "account-none:/login",
  blocked: false,
  flight: { current: false },
});
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("location", { assign: mocks.assign });
  mocks.callback.mockReturnValue("https://www.365motorsales.com/login?redirect=%2Fdashboard");
  mocks.request.mockResolvedValue(destination);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it("only hands off the validated URL and stays single-flight while the browser leaves", async () => {
  const props = options();
  const { result } = renderHook(() => useGoogleOAuth(props));
  await act(async () => {
    await result.current.start();
    await result.current.start();
  });
  expect(mocks.request).toHaveBeenCalledTimes(1);
  expect(mocks.assign).toHaveBeenCalledExactlyOnceWith(destination);
  expect(mocks.error).not.toHaveBeenCalled();
  expect(props.flight.current).toBe(true);
  expect(result.current.busy).toBe(true);
});
it("fences synchronous repeated dispatch before React commits the busy state", async () => {
  const wait = deferred<string>();
  mocks.request.mockReturnValue(wait.promise);
  const { result } = renderHook(() => useGoogleOAuth(options()));
  let first!: Promise<void>;
  act(() => {
    first = result.current.start();
    void result.current.start();
  });
  expect(mocks.request).toHaveBeenCalledTimes(1);
  await act(async () => {
    wait.resolve(destination);
    await first;
  });
  expect(mocks.assign).toHaveBeenCalledTimes(1);
});
it("does not compete with an in-flight password/email request", async () => {
  const props = options();
  props.flight.current = true;
  const { result } = renderHook(() => useGoogleOAuth(props));
  const prepare = vi.fn(() => true);
  await act(async () => {
    await result.current.start(prepare);
  });
  expect(prepare).not.toHaveBeenCalled();
  expect(mocks.request).not.toHaveBeenCalled();
});
it("does not prepare or dispatch when auth loading/current-account guard blocks it", async () => {
  const props = { ...options(), blocked: true };
  const { result } = renderHook(() => useGoogleOAuth(props));
  const prepare = vi.fn(() => true);
  await act(async () => {
    await result.current.start(prepare);
  });
  expect(prepare).not.toHaveBeenCalled();
  expect(mocks.request).not.toHaveBeenCalled();
});
it("runs signup preparation before requesting a URL, with no auth-success callback", async () => {
  const order: string[] = [];
  mocks.request.mockImplementation(async () => {
    order.push("request");
    return destination;
  });
  const { result } = renderHook(() => useGoogleOAuth(options()));
  await act(async () => {
    await result.current.start(() => {
      order.push("prepare");
      return true;
    });
  });
  expect(order).toEqual(["prepare", "request"]);
  expect(mocks.assign).toHaveBeenCalledTimes(1);
});
it("failed validation does not call the provider and releases the local flight", async () => {
  const props = options();
  const { result } = renderHook(() => useGoogleOAuth(props));
  await act(async () => {
    await result.current.start(() => false);
  });
  expect(mocks.request).not.toHaveBeenCalled();
  expect(mocks.error).not.toHaveBeenCalled();
  expect(props.flight.current).toBe(false);
  expect(result.current.busy).toBe(false);
});
for (const stage of ["prepare", "callback", "request", "assign"] as const)
  it("masks " + stage + " exceptions, resets the live form and allows a manual retry", async () => {
    const props = options();
    const { result } = renderHook(() => useGoogleOAuth(props));
    const privateError = new Error("fixture-private-value");
    if (stage === "callback")
      mocks.callback.mockImplementationOnce(() => {
        throw privateError;
      });
    if (stage === "request") mocks.request.mockRejectedValueOnce(privateError);
    if (stage === "assign")
      mocks.assign.mockImplementationOnce(() => {
        throw privateError;
      });
    await act(async () => {
      await result.current.start(
        stage === "prepare"
          ? () => {
              throw privateError;
            }
          : undefined,
      );
    });
    expect(mocks.error).toHaveBeenCalledExactlyOnceWith("Generic Google failure");
    expect(props.flight.current).toBe(false);
    expect(result.current.busy).toBe(false);
    await act(async () => {
      await result.current.start();
    });
    expect(props.flight.current).toBe(true);
  });
for (const transition of ["scope", "blocked", "a-b-a", "blocked-a-b-a", "unmount"] as const)
  for (const outcome of ["resolve", "reject"] as const)
    it(
      "suppresses late " + outcome + " after " + transition + " without navigation/toast",
      async () => {
        const wait = deferred<string>();
        mocks.request.mockReturnValue(wait.promise);
        const props = options();
        const { result, rerender, unmount } = renderHook((p) => useGoogleOAuth(p), {
          initialProps: props,
        });
        let first!: Promise<void>;
        act(() => {
          first = result.current.start();
        });
        if (transition === "scope" || transition === "a-b-a")
          rerender({ ...props, scopeKey: "changed" });
        if (transition === "blocked" || transition === "blocked-a-b-a")
          rerender({ ...props, blocked: true });
        if (transition === "a-b-a" || transition === "blocked-a-b-a") rerender(props);
        if (transition === "unmount") unmount();
        await act(async () => {
          if (outcome === "resolve") wait.resolve(destination);
          else wait.reject(new Error("fixture-private-value"));
          await first;
        });
        expect(mocks.assign).not.toHaveBeenCalled();
        expect(mocks.error).not.toHaveBeenCalled();
        expect(props.flight.current).toBe(false);
      },
    );
it("an obsolete handler cannot dispatch after unmount", async () => {
  const { result, unmount } = renderHook(() => useGoogleOAuth(options()));
  const old = result.current.start;
  unmount();
  await old();
  expect(mocks.request).not.toHaveBeenCalled();
});
it("an old handler cannot dispatch after the mounted scope changes", async () => {
  const props = options();
  const { result, rerender } = renderHook((p) => useGoogleOAuth(p), { initialProps: props });
  const old = result.current.start;
  rerender({ ...props, scopeKey: "new-signup-draft" });
  await old();
  expect(mocks.request).not.toHaveBeenCalled();
});
it("a changed redirect invalidates pending navigation even if a caller reuses the scope key", async () => {
  const props = options();
  const wait = deferred<string>();
  mocks.request.mockReturnValue(wait.promise);
  const { result, rerender } = renderHook((p) => useGoogleOAuth(p), { initialProps: props });
  let first!: Promise<void>;
  act(() => {
    first = result.current.start();
  });
  rerender({ ...props, redirect: "/different-target" });
  await act(async () => {
    wait.resolve(destination);
    await first;
  });
  expect(mocks.assign).not.toHaveBeenCalled();
  expect(mocks.error).not.toHaveBeenCalled();
});
