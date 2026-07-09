/**
 * End-to-end: franchise apply → (simulated admin approve) → status shows
 * pending payment → (simulated Stripe webhook) → status shows active.
 *
 * The Stripe checkout iframe and webhook aren't driven for real. Instead we
 * simulate the server-side effects that the admin approval and webhook
 * handler would produce, then verify the applicant-facing UI reacts.
 *
 * Requires SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY:
 *   - to confirm the test user's email
 *   - to backfill user_id on the application (the public submit endpoint
 *     leaves it null and matches by email later)
 *   - to insert / mutate the franchise_memberships row that the real admin
 *     approval + Stripe webhook would produce.
 */
import { test, expect, type Page } from "@playwright/test";
import { randomBytes } from "node:crypto";
import {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  adminEnvReady,
  confirmEmail,
  deleteUser,
} from "./helpers/supabase-admin";

const BASE = "http://localhost:8080";
const SIGNUP_URL = `${BASE}/api/public/auth/signup`;

function synthEmail(): string {
  return `e2e-franchise+${Date.now()}-${randomBytes(3).toString("hex")}@365motorsales-smoke.example`;
}
function strongPassword(): string {
  return `Frn-${randomBytes(9).toString("base64url")}!1a`;
}

async function apiSignup(email: string, password: string): Promise<string> {
  const r = await fetch(SIGNUP_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      intent: "business",
      email,
      password,
      first_name: "E2E",
      last_name: "Franchise",
      phone_iso: "PH",
      phone_national: "9170000000",
      signup_region: "All Philippines",
      origin: `${BASE}/`,
      agreed: true,
      business_name: "E2E Franchise Shop",
      business_kind: "repair_shop",
      business_address: "1 Test Business Way",
      business_postal_code: "1000",
    }),
  });
  const body = (await r.json().catch(() => null)) as
    | { ok?: boolean; user_id?: string }
    | null;
  expect(r.status, `signup: ${JSON.stringify(body)}`).toBe(200);
  expect(body?.user_id).toBeTruthy();
  return body!.user_id!;
}

async function signInViaUI(page: Page, email: string, password: string) {
  await page.goto("/login");
  const submitBtn = page.locator('form button[type="submit"]');
  await expect(submitBtn).toBeEnabled({ timeout: 15_000 });
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await Promise.all([
    page.waitForURL((url) => url.pathname !== "/login", { timeout: 20_000 }),
    submitBtn.click(),
  ]);
}

async function pgrst(
  path: string,
  init: RequestInit & { returning?: boolean } = {},
): Promise<any> {
  const headers = new Headers(init.headers);
  headers.set("apikey", SUPABASE_SERVICE_ROLE_KEY!);
  headers.set("Authorization", `Bearer ${SUPABASE_SERVICE_ROLE_KEY!}`);
  if (init.body && !headers.has("content-type"))
    headers.set("content-type", "application/json");
  if (init.returning !== false) headers.set("Prefer", "return=representation");
  const r = await fetch(`${SUPABASE_URL}/rest/v1${path}`, { ...init, headers });
  if (!r.ok)
    throw new Error(`PostgREST ${init.method ?? "GET"} ${path} → ${r.status} ${await r.text()}`);
  return init.returning === false ? null : r.json();
}

const createdUserIds: string[] = [];

test.describe("@post-deploy franchise apply → payment → status update", () => {
  test.beforeAll(() => {
    if (!adminEnvReady()) {
      test.skip(
        true,
        "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required to simulate admin approval + Stripe webhook",
      );
    }
  });

  test.afterAll(async () => {
    if (!adminEnvReady()) return;
    for (const uid of createdUserIds) {
      // Cascade cleans applications + memberships via user_id FKs where set;
      // orphan application (contact_email match only) is fine for tests.
      await deleteUser(uid);
    }
  });

  test("applicant sees pending → complete membership → active flow", async ({ page }) => {
    const email = synthEmail();
    const password = strongPassword();

    // 1. Sign up + confirm the applicant, then sign in
    const userId = await apiSignup(email, password);
    createdUserIds.push(userId);
    await confirmEmail(userId);
    await signInViaUI(page, email, password);

    // 2. Submit the franchise application via the UI
    await page.goto("/franchise/apply");
    await expect(page.getByLabel(/your name/i)).toBeVisible({ timeout: 15_000 });
    await page.getByLabel(/your name/i).fill("E2E Applicant");
    await page.getByLabel(/^email/i).fill(email);
    await page.getByLabel(/business \/ shop name/i).fill("E2E Franchise Shop");
    await page.getByLabel(/city/i).fill("Manila");
    await page.getByLabel(/province/i).fill("NCR");
    await page.getByRole("button", { name: /submit application/i }).click();

    // Success toast → application row exists. Land on status page.
    await page.waitForURL("**/franchise/status", { timeout: 20_000 });
    await expect(page.getByText(/pending review/i)).toBeVisible({ timeout: 15_000 });

    // 3. Look up the application (matched by contact_email since public
    //    submit doesn't set user_id) and backfill user_id so the admin
    //    approval below would create a membership tied to this user.
    const apps = (await pgrst(
      `/franchise_applications?contact_email=eq.${encodeURIComponent(email.toLowerCase())}&select=id`,
    )) as Array<{ id: string }>;
    expect(apps.length, "application row was not created").toBe(1);
    const applicationId = apps[0].id;

    await pgrst(`/franchise_applications?id=eq.${applicationId}`, {
      method: "PATCH",
      body: JSON.stringify({
        user_id: userId,
        status: "approved",
        assigned_tier_slug: "partner",
        decided_at: new Date().toISOString(),
      }),
      returning: false,
    });

    // 4. Simulate admin approval creating the pending_payment membership row
    //    (mirrors adminDecideApplication's insert).
    const inserted = (await pgrst(`/franchise_memberships`, {
      method: "POST",
      body: JSON.stringify({
        user_id: userId,
        application_id: applicationId,
        tier_slug: "partner",
        pending_tier_slug: "partner",
        status: "pending_payment",
      }),
    })) as Array<{ id: string }>;
    const membershipId = inserted[0].id;

    // 5. Reload status page → "Complete your membership" is visible
    await page.goto("/franchise/status");
    await expect(
      page.getByRole("heading", { name: /complete your membership/i }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("button", { name: /complete payment/i })).toBeVisible();
    await expect(page.getByText(/approved — complete payment/i)).toBeVisible();

    // 6. Simulate Stripe webhook activating the membership.
    const memberNumber = `TEST-${Date.now().toString().slice(-6)}`;
    await pgrst(`/franchise_memberships?id=eq.${membershipId}`, {
      method: "PATCH",
      body: JSON.stringify({
        status: "active",
        member_number: memberNumber,
        ad_discount_code: "E2ETEST5",
        activated_at: new Date().toISOString(),
      }),
      returning: false,
    });

    // 7. Reload status page → "You're in." + member number + dashboard link
    await page.goto("/franchise/status");
    await expect(
      page.getByRole("heading", { name: /you're in\./i }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(memberNumber)).toBeVisible();
    await expect(page.getByText("E2ETEST5")).toBeVisible();
    await expect(
      page.getByRole("link", { name: /open partner dashboard/i }),
    ).toBeVisible();
  });
});
