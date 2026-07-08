/**
 * End-to-end: sign up → confirm email → sign in → land on intent-specific
 * dashboard, for each of buyer / business / service_provider.
 *
 * Landing map (from src/routes/verify-email.tsx#POST_ROUTE and login.tsx):
 *   buyer            → /dashboard
 *   business         → /businesses/submit
 *   service_provider → /businesses/submit
 *
 * /login always routes to /dashboard directly; intent-based routing lives on
 * /verify-email, which auto-forwards once email_confirmed_at is set. This
 * spec mirrors the real flow: after admin-confirming the account, we sign in
 * on /login (buyer stays on /dashboard) or hop through /verify-email
 * (business + service_provider) to reach the correct destination.
 *
 * Skips cleanly when SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set —
 * the admin API is required to confirm test emails.
 */
import { test, expect, type Page } from "@playwright/test";
import { randomBytes } from "node:crypto";
import { adminEnvReady, confirmEmail, deleteUser } from "./helpers/supabase-admin";

const BASE = "http://localhost:8080";
const SIGNUP_URL = `${BASE}/api/public/auth/signup`;

type Intent = "buyer" | "business" | "service_provider";

function synthEmail(intent: Intent): string {
  const stamp = Date.now();
  const nonce = randomBytes(3).toString("hex");
  return `e2e-${intent}+${stamp}-${nonce}@365motorsales-smoke.example`;
}

function strongPassword(): string {
  return `Smk-${randomBytes(9).toString("base64url")}!1a`;
}

function buildSignupBody(intent: Intent, email: string, password: string) {
  const base = {
    intent,
    email,
    password,
    first_name: "E2E",
    last_name: intent,
    phone_iso: "PH",
    phone_national: "9170000000",
    signup_region: "All Philippines",
    origin: `${BASE}/`,
    agreed: true,
  };
  if (intent === "buyer") {
    return { ...base, street_address: "1 Test Street", postal_code: "1000" };
  }
  return {
    ...base,
    business_name: `E2E ${intent}`,
    business_kind: "repair_shop",
    business_address: "1 Test Business Way",
    business_postal_code: "1000",
  };
}

async function apiSignup(
  intent: Intent,
  email: string,
  password: string,
): Promise<string> {
  const r = await fetch(SIGNUP_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(buildSignupBody(intent, email, password)),
  });
  const body = (await r.json().catch(() => null)) as
    | { ok?: boolean; user_id?: string; needs_verify?: boolean; errors?: unknown }
    | null;
  expect(r.status, `signup HTTP for ${intent}: ${JSON.stringify(body)}`).toBe(200);
  expect(body?.ok, `signup ok for ${intent}`).toBe(true);
  expect(body?.user_id, `signup user_id for ${intent}`).toBeTruthy();
  return body!.user_id!;
}

async function signInViaUI(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await Promise.all([
    page.waitForURL((url) => url.pathname !== "/login", { timeout: 20_000 }),
    page.getByRole("button", { name: /sign in|log in/i }).first().click(),
  ]);
}

const createdUserIds: string[] = [];

test.describe("@post-deploy signup → login → intent-specific landing", () => {
  test.beforeAll(() => {
    if (!adminEnvReady()) {
      test.skip(
        true,
        "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required to confirm test users",
      );
    }
  });

  test.afterAll(async () => {
    if (!adminEnvReady()) return;
    for (const uid of createdUserIds) await deleteUser(uid);
  });

  for (const intent of ["buyer", "business", "service_provider"] as const) {
    test(`${intent} lands on the correct dashboard after login`, async ({ page }) => {
      const email = synthEmail(intent);
      const password = strongPassword();

      const userId = await apiSignup(intent, email, password);
      createdUserIds.push(userId);

      await confirmEmail(userId);

      await signInViaUI(page, email, password);

      if (intent === "buyer") {
        // /login sends everyone straight to /dashboard for the buyer flow.
        await page.waitForURL("**/dashboard", { timeout: 20_000 });
        expect(new URL(page.url()).pathname).toBe("/dashboard");
      } else {
        // Business intents land on /businesses/submit via /verify-email's
        // auto-forward. Signed-in + email_confirmed_at → immediate redirect.
        await page.goto(`/verify-email?intent=${intent}&email=${encodeURIComponent(email)}`);
        await page.waitForURL("**/businesses/submit", { timeout: 20_000 });
        expect(new URL(page.url()).pathname).toBe("/businesses/submit");
        await expect(
          page.getByRole("heading", { name: /tell us about your business/i }),
        ).toBeVisible();
      }
    });
  }
});
