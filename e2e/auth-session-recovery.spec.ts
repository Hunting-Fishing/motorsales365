/**
 * End-to-end regression: when the Supabase client emits either a
 * refresh failure (TOKEN_REFRESHED with a null session) OR an unexpected
 * SIGNED_OUT the app was not the origin of, the app must:
 *
 *   1) surface a persistent red "session expired" toast,
 *   2) offer a working "Try again" button,
 *   3) clear the local Supabase session,
 *   4) redirect to /auth?next=<current path> so the user can re-authenticate.
 *
 * The app already unit-tests the AuthProvider in isolation
 * (src/__tests__/auth-refresh-failure-toast.test.tsx and
 * src/__tests__/auth-unexpected-signed-out-toast.test.tsx). This spec
 * exercises the same behavior against a real Vite build in a browser,
 * driving the supabase-js client's `_notifyAllSubscribers` hook to
 * synthesize the two failure modes without waiting for a real token TTL.
 *
 * Prereqs (Lovable sandbox provides all of these automatically):
 *   - Vite dev server running at http://localhost:8080
 *   - LOVABLE_BROWSER_AUTH_STATUS=injected
 *   - LOVABLE_BROWSER_SUPABASE_STORAGE_KEY / _SESSION_JSON / _COOKIES_JSON
 */
import { test, expect, type Page, type BrowserContext } from "@playwright/test";

const authStatus = process.env.LOVABLE_BROWSER_AUTH_STATUS;
const storageKey = process.env.LOVABLE_BROWSER_SUPABASE_STORAGE_KEY;
const sessionJson = process.env.LOVABLE_BROWSER_SUPABASE_SESSION_JSON;
const cookiesJson = process.env.LOVABLE_BROWSER_SUPABASE_COOKIES_JSON;

const HAS_SESSION =
  authStatus === "injected" && !!storageKey && !!sessionJson;

test.describe("auth session recovery (real browser)", () => {
  test.skip(
    !HAS_SESSION,
    "Requires an injected Supabase session (LOVABLE_BROWSER_AUTH_STATUS=injected).",
  );

  async function restoreSession(context: BrowserContext, page: Page) {
    if (cookiesJson) {
      const cookies = JSON.parse(cookiesJson).map((c: any) => ({
        ...c,
        url: "http://localhost:8080",
      }));
      await context.addCookies(cookies);
    }
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.evaluate(
      ([key, value]) => {
        window.localStorage.setItem(key as string, value as string);
      },
      [storageKey!, sessionJson!],
    );
  }

  /**
   * Import the app's supabase client via the Vite dev-server module graph
   * and invoke the internal `_notifyAllSubscribers` hook. This is the same
   * code path Supabase itself uses when the goTrue client detects a token
   * refresh failure or a revoked session — the app's onAuthStateChange
   * listener cannot tell the difference between "real" and "synthesized".
   */
  async function fireAuthEvent(
    page: Page,
    event: "TOKEN_REFRESHED" | "SIGNED_OUT",
  ) {
    const ok = await page.evaluate(async (ev) => {
      const mod: any = await import(
        /* @vite-ignore */ "/src/integrations/supabase/client.ts"
      );
      const auth = mod?.supabase?.auth;
      if (!auth || typeof auth._notifyAllSubscribers !== "function") {
        return false;
      }
      await auth._notifyAllSubscribers(ev, null);
      return true;
    }, event);
    expect(ok, "supabase._notifyAllSubscribers should be callable").toBe(true);
  }

  async function assertRecoveryFlow(page: Page, startPath: string) {
    // 1) Persistent red toast appears.
    const toast = page
      .locator('[data-sonner-toast][data-type="error"]')
      .filter({ hasText: /session expired/i })
      .first();
    await expect(toast).toBeVisible();

    // 2) "Try again" action is present and clickable.
    const tryAgain = toast.getByRole("button", { name: /try again/i });
    await expect(tryAgain).toBeVisible();

    // 3+4) Clicking it clears the session and redirects to /auth?next=…
    await tryAgain.click();

    await page.waitForURL(
      (url) =>
        url.pathname === "/auth" &&
        url.searchParams.get("next") === startPath,
      { timeout: 15_000 },
    );

    // Session cleared: no Supabase auth token left in localStorage.
    const remaining = await page.evaluate(
      (key) => window.localStorage.getItem(key as string),
      storageKey!,
    );
    expect(remaining).toBeNull();
  }

  test("refresh failure (TOKEN_REFRESHED, null) triggers toast + Try again + redirect", async ({
    context,
    page,
  }) => {
    await restoreSession(context, page);
    await page.goto("/?e2e=refresh", { waitUntil: "domcontentloaded" });

    // Wait for AuthProvider to bootstrap a signed-in user.
    await page.waitForFunction(
      (key) => !!window.localStorage.getItem(key as string),
      storageKey!,
    );

    await fireAuthEvent(page, "TOKEN_REFRESHED");
    await assertRecoveryFlow(page, "/");
  });

  test("unexpected SIGNED_OUT triggers toast + Try again + redirect", async ({
    context,
    page,
  }) => {
    await restoreSession(context, page);
    await page.goto("/?e2e=signout", { waitUntil: "domcontentloaded" });

    await page.waitForFunction(
      (key) => !!window.localStorage.getItem(key as string),
      storageKey!,
    );

    await fireAuthEvent(page, "SIGNED_OUT");
    await assertRecoveryFlow(page, "/");
  });
});
