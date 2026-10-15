import React, { type ComponentType, type ReactNode } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
const mocks = vi.hoisted(() => ({
  search: {} as { type?: "buyer"; redirect?: string },
  auth: { user: null as { id: string } | null, loading: false, refreshSession: vi.fn() },
  navigate: vi.fn(),
  preload: vi.fn(),
  oauth: vi.fn(),
  password: vi.fn(),
  rpc: vi.fn(),
  stash: vi.fn(),
  error: vi.fn(),
  success: vi.fn(),
  assign: vi.fn(),
  fetch: vi.fn(),
}));
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: Record<string, unknown>) => ({
    options,
    useSearch: () => mocks.search,
  }),
  useSearch: () => mocks.search,
  useNavigate: () => mocks.navigate,
  useRouter: () => ({ preloadRoute: mocks.preload }),
  Link: ({
    to,
    search: _search,
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { to: string; search?: unknown }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));
vi.mock("@/hooks/use-auth", () => ({ useAuth: () => mocks.auth }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { signInWithOAuth: mocks.oauth, signInWithPassword: mocks.password },
    rpc: mocks.rpc,
  },
}));
vi.mock("@/components/site-layout", () => ({
  SiteLayout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock("@/components/brand-logo", () => ({ BrandLogo: () => <span>365</span> }));
vi.mock("@/lib/site-config", () => ({ siteOrigin: () => "https://www.365motorsales.com" }));
vi.mock("@/lib/referral", () => ({
  getCreditedCode: () => null,
  getCreditedSource: () => null,
  getVisitorId: () => "00000000-0000-4000-8000-000000000001",
  recordTouch: vi.fn(),
}));
vi.mock("@/lib/signup-pending", () => ({
  readPending: () => null,
  writePending: mocks.stash,
  clearPending: vi.fn(),
}));
vi.mock("@/components/phone-input", () => ({
  PhoneInput: ({
    id,
    national,
    onChange,
  }: {
    id: string;
    national: string;
    onChange: (v: { iso: string; national: string }) => void;
  }) => (
    <input
      id={id}
      data-testid="synthetic-phone"
      value={national}
      onChange={(e) => onChange({ iso: "PH", national: e.target.value })}
    />
  ),
}));
vi.mock("@/components/location-picker", () => ({
  LocationPicker: ({
    onChange,
  }: {
    onChange: (v: { region: string; province: null; city: null; barangay: null }) => void;
  }) => (
    <button
      type="button"
      onClick={() =>
        onChange({ region: "All Philippines", province: null, city: null, barangay: null })
      }
    >
      Synthetic location
    </button>
  ),
}));
vi.mock("sonner", () => ({ toast: { error: mocks.error, success: mocks.success } }));
import { Route as LoginRoute } from "@/routes/login";
import { Route as SignupRoute } from "@/routes/signup";
const Login = LoginRoute.options.component as ComponentType;
const Signup = SignupRoute.options.component as ComponentType;
const origin = "https://www.365motorsales.com";
function oauthResponse(callback = origin) {
  const url = new URL("https://wjxaajgvddtrxxtocxen.supabase.co/auth/v1/authorize");
  url.searchParams.set("provider", "google");
  url.searchParams.set("redirect_to", callback);
  return { data: { provider: "google", url: url.href }, error: null };
}
function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (v: Error) => void;
  const promise = new Promise<T>((r, j) => {
    resolve = r;
    reject = j;
  });
  return { promise, resolve, reject };
}
const scrollDescriptor = Object.getOwnPropertyDescriptor(Element.prototype, "scrollIntoView");
beforeEach(() => {
  vi.clearAllMocks();
  mocks.search = {};
  mocks.auth.user = null;
  mocks.auth.loading = false;
  mocks.navigate.mockResolvedValue(undefined);
  mocks.preload.mockResolvedValue(undefined);
  mocks.oauth.mockResolvedValue(oauthResponse());
  vi.stubGlobal("location", { assign: mocks.assign });
  vi.stubGlobal("fetch", mocks.fetch);
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  Object.defineProperty(Element.prototype, "scrollIntoView", {
    configurable: true,
    value: vi.fn(),
  });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  if (scrollDescriptor)
    Object.defineProperty(Element.prototype, "scrollIntoView", scrollDescriptor);
  else Reflect.deleteProperty(Element.prototype, "scrollIntoView");
});
async function fillBuyer() {
  fireEvent.change(screen.getByLabelText(/First name/), { target: { value: "Synthetic" } });
  fireEvent.change(screen.getByLabelText(/Last name/), { target: { value: "Buyer" } });
  fireEvent.change(screen.getByLabelText(/^Email/), {
    target: { value: "synthetic@example.invalid" },
  });
  fireEvent.change(await screen.findByTestId("synthetic-phone"), {
    target: { value: "9171234567" },
  });
  fireEvent.click(await screen.findByRole("button", { name: "Synthetic location" }));
  const street = document.getElementById("street-address");
  const postal = document.getElementById("postal-code");
  expect(street).not.toBeNull();
  expect(postal).not.toBeNull();
  fireEvent.change(street!, { target: { value: "1 Synthetic Street" } });
  fireEvent.change(postal!, { target: { value: "1000" } });
  fireEvent.click(screen.getByRole("checkbox"));
}
it("both real route search validators reject backslash/scheme-relative redirects", () => {
  for (const route of [LoginRoute, SignupRoute]) {
    const validate = route.options.validateSearch as (v: Record<string, unknown>) => {
      redirect?: string;
    };
    for (const redirect of ["/\\example.invalid", "//example.invalid", "/\n/example.invalid"])
      expect(validate({ redirect }).redirect).toBeUndefined();
    expect(validate({ redirect: "/dashboard?tab=crm" }).redirect).toBe("/dashboard?tab=crm");
  }
});
it("real login requests native Google handoff, fences duplicate/password submits and does not claim login", async () => {
  const wait = deferred<ReturnType<typeof oauthResponse>>();
  mocks.oauth.mockReturnValue(wait.promise);
  const { container } = render(<Login />);
  const button = screen.getByRole("button", { name: "Continue with Google" });
  fireEvent.click(button);
  fireEvent.click(button);
  fireEvent.submit(container.querySelector("form")!);
  expect(mocks.oauth).toHaveBeenCalledExactlyOnceWith({
    provider: "google",
    options: { redirectTo: origin, skipBrowserRedirect: true },
  });
  expect(mocks.password).not.toHaveBeenCalled();
  await act(async () => {
    wait.resolve(oauthResponse());
  });
  expect(mocks.assign).toHaveBeenCalledExactlyOnceWith(oauthResponse().data.url);
  expect(mocks.navigate).not.toHaveBeenCalled();
  expect(mocks.success).not.toHaveBeenCalled();
  expect(screen.getByRole("button", { name: /Connecting to Google/ })).toBeDisabled();
});
it("real login keeps Google disabled until auth bootstrap is known", () => {
  mocks.auth.loading = true;
  render(<Login />);
  expect(screen.getByRole("button", { name: "Continue with Google" })).toBeDisabled();
  expect(mocks.oauth).not.toHaveBeenCalled();
});
it("real login masks provider errors, clears its busy state and does not navigate", async () => {
  mocks.oauth.mockRejectedValue(new Error("fixture-private-provider-detail"));
  render(<Login />);
  fireEvent.click(screen.getByRole("button", { name: "Continue with Google" }));
  await waitFor(() =>
    expect(mocks.error).toHaveBeenCalledExactlyOnceWith(
      "Could not start Google sign-in. Please try again.",
    ),
  );
  expect(screen.getByRole("button", { name: "Continue with Google" })).toBeEnabled();
  expect(mocks.assign).not.toHaveBeenCalled();
  expect(mocks.navigate).not.toHaveBeenCalled();
});
it("real login suppresses an old OAuth result after return-target changes", async () => {
  const wait = deferred<ReturnType<typeof oauthResponse>>();
  mocks.oauth.mockReturnValue(wait.promise);
  const { rerender } = render(<Login />);
  fireEvent.click(screen.getByRole("button", { name: "Continue with Google" }));
  mocks.search = { redirect: "/different" };
  rerender(<Login />);
  await act(async () => {
    wait.resolve(oauthResponse());
  });
  expect(mocks.assign).not.toHaveBeenCalled();
  expect(mocks.error).not.toHaveBeenCalled();
});
it("real signup cannot bypass required identity/terms validation through Google", async () => {
  mocks.search = { type: "buyer" };
  render(<Signup />);
  await screen.findByTestId("synthetic-phone");
  await screen.findByRole("button", { name: "Synthetic location" });
  fireEvent.click(screen.getByRole("button", { name: "Continue with Google" }));
  expect(mocks.error).toHaveBeenCalled();
  expect(mocks.oauth).not.toHaveBeenCalled();
  expect(mocks.stash).not.toHaveBeenCalled();
  expect(mocks.fetch).not.toHaveBeenCalled();
});
it("real signup snapshots the validated profile before handoff without account/provisioning success", async () => {
  mocks.search = { type: "buyer" };
  render(<Signup />);
  await fillBuyer();
  fireEvent.click(screen.getByRole("button", { name: "Continue with Google" }));
  await waitFor(() => expect(mocks.assign).toHaveBeenCalledTimes(1));
  expect(mocks.stash).toHaveBeenCalledTimes(1);
  expect(mocks.stash.mock.calls[0][0]).toMatchObject({
    intent: "buyer",
    email: "synthetic@example.invalid",
    agreed: true,
  });
  expect(mocks.stash.mock.invocationCallOrder[0]).toBeLessThan(
    mocks.oauth.mock.invocationCallOrder[0],
  );
  expect(mocks.fetch).not.toHaveBeenCalled();
  expect(mocks.navigate).not.toHaveBeenCalled();
  expect(mocks.success).not.toHaveBeenCalled();
});
it("real signup fences repeated Google/email dispatch and discards the result after identity edit", async () => {
  const wait = deferred<ReturnType<typeof oauthResponse>>();
  mocks.oauth.mockReturnValue(wait.promise);
  mocks.search = { type: "buyer" };
  const { container } = render(<Signup />);
  await fillBuyer();
  const button = screen.getByRole("button", { name: "Continue with Google" });
  fireEvent.click(button);
  fireEvent.click(button);
  fireEvent.submit(container.querySelector("form")!);
  expect(mocks.oauth).toHaveBeenCalledTimes(1);
  expect(mocks.fetch).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText(/^Email/), {
    target: { value: "different@example.invalid" },
  });
  await act(async () => {
    wait.resolve(oauthResponse());
  });
  expect(mocks.assign).not.toHaveBeenCalled();
  expect(mocks.success).not.toHaveBeenCalled();
  expect(screen.getByRole("button", { name: "Continue with Google" })).toBeEnabled();
});
