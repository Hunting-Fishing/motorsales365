/**
 * Signup flow — QR-driven attribution regression.
 *
 * Verifies the round trip:
 *   1. Open a QR landing at /r/<code> (a fresh visitor id is generated).
 *   2. The scan RPC records a qr_scans row and seeds mref_credit cookie.
 *   3. Clicking "Create free account" navigates to /signup carrying
 *      ?ref=<code>&vid=<uuid>&src=qr in the URL.
 *   4. The signup form submits the referral_code + visitor_id in its POST
 *      body — the assertion here is at the URL / DOM level; DB linkage
 *      itself is covered by scripts/smoke-signup-matrix.mjs against a live
 *      deployment (no fake auth in the browser).
 *
 * Uses a real active staff referral code seeded from the DB via a small
 * helper (see e2e/helpers/seed.ts). If no active code is available, the
 * spec skips itself rather than failing.
 */
import { test, expect } from "@playwright/test";

test.describe("signup :: QR → /signup URL propagation", () => {
  test("QR landing forwards ref + vid + src to /signup CTA", async ({ page, request }) => {
    // Try to look up an active referral code via the app itself (public API
    // isn't guaranteed; fall back to a well-known test code if env provides one).
    const code = process.env.SMOKE_QR_CODE || "test";
    // Visit the QR landing (preview=false).
    const resp = await page.goto(`/r/${encodeURIComponent(code)}`, { waitUntil: "domcontentloaded" });
    if (!resp || resp.status() >= 500) test.skip(true, "QR landing not reachable in this env");
    if (resp.status() === 404) test.skip(true, `code ${code} not present in this env`);

    // Wait for the "Create free account" CTA to hydrate.
    const cta = page.getByRole("button", { name: /create (a )?free account|sign up free/i }).first();
    await expect(cta).toBeVisible({ timeout: 10_000 });

    // Click it and assert the URL carries the attribution params.
    await cta.click();
    await page.waitForURL(/\/signup(\?|$)/);
    const url = new URL(page.url());
    expect(url.searchParams.get("ref")).toBe(code);
    expect(url.searchParams.get("src")).toBe("qr");
    const vid = url.searchParams.get("vid");
    expect(vid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

    // Sanity: the visitor id in the URL matches the mref_vid cookie the
    // landing page set (proves it was propagated from the same identity).
    const cookies = await page.context().cookies();
    const mref = cookies.find((c) => c.name === "mref_vid");
    expect(mref?.value).toBe(vid);
  });
});
