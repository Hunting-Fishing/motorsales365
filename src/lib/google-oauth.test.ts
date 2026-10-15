import { beforeEach, describe, expect, it, vi } from "vitest";
import { createClient } from "@supabase/supabase-js";
const mocks = vi.hoisted(() => ({ oauth: vi.fn(), origin: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { signInWithOAuth: mocks.oauth } },
}));
vi.mock("@/lib/site-config", () => ({ siteOrigin: mocks.origin }));
import {
  GOOGLE_AUTH_ORIGIN,
  GOOGLE_OAUTH_FAILED,
  confirmedGoogleAuthorizationUrl,
  googleOAuthReturnUrl,
  requestGoogleAuthorization,
  safeAuthInternalPath,
} from "./google-oauth";
const origin = "https://www.365motorsales.com";
const response = (callback = origin, change?: (url: URL) => void) => {
  const url = new URL("/auth/v1/authorize", GOOGLE_AUTH_ORIGIN);
  url.searchParams.set("provider", "google");
  url.searchParams.set("redirect_to", callback);
  change?.(url);
  return { data: { provider: "google", url: url.href }, error: null };
};
beforeEach(() => {
  vi.clearAllMocks();
  mocks.origin.mockReturnValue(origin);
  mocks.oauth.mockResolvedValue(response());
});

describe("internal auth return destinations", () => {
  for (const value of [
    "/",
    "/dashboard",
    "/businesses/submit",
    "/mcp/consent?client_id=fixture&redirect_uri=https%3A%2F%2Fexample.invalid%2Fcallback",
    "/vehicles/a?view=parts#history",
  ])
    it("retains allowed internal path " + value, () =>
      expect(safeAuthInternalPath(value)).toBe(value),
    );
  for (const value of [
    null,
    1,
    {},
    [],
    "",
    "https://example.invalid",
    "javascript:alert(1)",
    "//example.invalid",
    "/\\example.invalid",
    "\\example.invalid",
    "/\t/example.invalid",
    "/a\n",
    "/a\u0000b",
    " /dashboard",
    "/a/..//example.invalid",
    "/%2e%2e//example.invalid",
    "/a ",
    "/" + "a".repeat(2048),
  ])
    it("rejects unsafe destination " + JSON.stringify(value), () =>
      expect(safeAuthInternalPath(value)).toBeUndefined(),
    );
  it("preserves existing root callback and encodes an internal redirect exactly once", () => {
    expect(googleOAuthReturnUrl()).toBe(origin);
    expect(googleOAuthReturnUrl("/dashboard?tab=crm#activity")).toBe(
      origin + "/login?redirect=%2Fdashboard%3Ftab%3Dcrm%23activity",
    );
  });
  for (const value of [
    "http://www.365motorsales.com",
    "https://example.invalid",
    "http://localhost:8080",
    origin + "/path",
    "https://www.365motorsales.com.example.invalid",
  ])
    it("does not build a callback for unapproved site origin " + value, () => {
      mocks.origin.mockReturnValue(value);
      expect(() => googleOAuthReturnUrl()).toThrow(GOOGLE_OAUTH_FAILED);
    });
  it("rejects invalid direct redirect input instead of manufacturing a valid callback", () =>
    expect(() => googleOAuthReturnUrl("/\\example.invalid")).toThrow(GOOGLE_OAUTH_FAILED));
});
describe("native provider response boundaries", () => {
  it("dispatches only to the existing browser client with automatic navigation disabled", async () => {
    const result = await requestGoogleAuthorization(origin);
    expect(mocks.oauth).toHaveBeenCalledExactlyOnceWith({
      provider: "google",
      options: { redirectTo: origin, skipBrowserRedirect: true },
    });
    expect(result).toBe(response().data.url);
  });
  it("matches a validated nested callback and supports the apex origin", async () => {
    const callback = "https://365motorsales.com/login?redirect=%2Fdashboard";
    mocks.oauth.mockResolvedValue(response(callback));
    expect(await requestGoogleAuthorization(callback)).toBe(response(callback).data.url);
  });
  const malformed = [
    undefined,
    null,
    {},
    { ok: true },
    { data: null, error: null },
    { data: { provider: "google", url: null }, error: null },
    { ...response(), error: { message: "fixture-private-provider-error" } },
    { ...response(), unexpected: true },
    { data: { provider: "apple", url: response().data.url }, error: null },
  ];
  for (const [index, raw] of malformed.entries())
    it("rejects unknown/malformed/error response " + index, async () => {
      mocks.oauth.mockResolvedValue(raw);
      await expect(requestGoogleAuthorization(origin)).rejects.toThrow(GOOGLE_OAUTH_FAILED);
    });
  const invalidUrls: ((url: URL) => void)[] = [
    (u) => {
      u.hostname = "ujkizgblscqcejghxemb.supabase.co";
    },
    (u) => {
      u.hostname = "wjxaajgvddtrxxtocxen.supabase.co.example.invalid";
    },
    (u) => {
      u.protocol = "http:";
    },
    (u) => {
      u.port = "8443";
    },
    (u) => {
      u.pathname = "/auth/v1/token";
    },
    (u) => {
      u.username = "fixture";
    },
    (u) => {
      u.hash = "fixture-private-token";
    },
    (u) => {
      u.searchParams.set("provider", "apple");
    },
    (u) => {
      u.searchParams.set("redirect_to", "https://example.invalid");
    },
    (u) => {
      u.searchParams.append("provider", "google");
    },
    (u) => {
      u.searchParams.append("redirect_to", origin);
    },
    (u) => {
      u.searchParams.set("access_token", "fixture-private-token");
    },
    (u) => {
      u.searchParams.set("scopes", "unrequested-privileges");
    },
    (u) => {
      u.searchParams.set("code_challenge_method", "plain");
      u.searchParams.set("code_challenge", "a".repeat(43));
    },
    (u) => {
      u.searchParams.set("code_challenge", "a".repeat(43));
    },
  ];
  for (const [index, mutate] of invalidUrls.entries())
    it("rejects another backend/unsafe or mismatched authorization URL " + index, () =>
      expect(() => confirmedGoogleAuthorizationUrl(response(origin, mutate), origin)).toThrow(
        GOOGLE_OAUTH_FAILED,
      ),
    );
  it("accepts a complete S256 URL without claiming this app implements a PKCE callback", () => {
    const raw = response(origin, (u) => {
      u.searchParams.set("code_challenge_method", "s256");
      u.searchParams.set("code_challenge", "a".repeat(43));
    });
    expect(confirmedGoogleAuthorizationUrl(raw, origin)).toBe(raw.data.url);
  });
  for (const callback of [
    "not-a-url",
    "https://example.invalid",
    origin + "/other",
    origin + "/login",
    origin + "/login?redirect=%2F%5Cexample.invalid",
    origin + "/login?redirect=%2Fdashboard&redirect=%2Fother",
    "https://fixture:secret@www.365motorsales.com/",
    origin + "/#access_token=fixture-private",
  ])
    it("denies invalid callbacks before any SDK call " + callback, async () => {
      await expect(requestGoogleAuthorization(callback)).rejects.toThrow(GOOGLE_OAUTH_FAILED);
      expect(mocks.oauth).not.toHaveBeenCalled();
      expect(() => confirmedGoogleAuthorizationUrl(response(callback), callback)).toThrow(
        GOOGLE_OAUTH_FAILED,
      );
    });
  it("masks thrown provider/transport details", async () => {
    mocks.oauth.mockRejectedValue(new Error("fixture-private-provider-error"));
    await expect(requestGoogleAuthorization(origin)).rejects.toThrow(
      new Error(GOOGLE_OAUTH_FAILED),
    );
  });
  it("accepts the real installed SDK's generated implicit URL without network or credentials", async () => {
    const fetch = vi.fn(() => {
      throw new Error("Network must not run");
    });
    const client = createClient(GOOGLE_AUTH_ORIGIN, "fixture-publishable-not-real", {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { fetch },
    });
    const raw = await client.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: origin, skipBrowserRedirect: true },
    });
    expect(confirmedGoogleAuthorizationUrl(raw, origin)).toBe(raw.data.url);
    expect(fetch).not.toHaveBeenCalled();
    await client.auth.stopAutoRefresh();
  });
});
