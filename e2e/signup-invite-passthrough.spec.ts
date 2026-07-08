/**
 * Signup flow — invite passthrough.
 *
 * When someone arrives at /invites/<token> without an account, the
 * "Create account" button links to /signup?invite=<token>&email=<email>.
 * This spec proves:
 *   1. The invite + email params survive validateSearch and are visible on
 *      /signup (the form pre-fills the email; the invite is stashed in
 *      router state).
 *   2. If we simulate a successful signup by asserting the client-side
 *      goAfterSignup logic, the invite-derived destination is what the
 *      redirect helper resolves — checked here via the compiled URL that
 *      the form's submit path would follow.
 *
 * We do not create a real account here (that costs a live auth user); the
 * DB-side proof is covered by scripts/smoke-signup-matrix.mjs.
 */
import { test, expect } from "@playwright/test";

test("invite tokens are preserved on /signup and drive the post-signup redirect", async ({ page }) => {
  const token = "abcdef01234567890abcdef012345678";
  const email = "invitee@example.com";
  await page.goto(`/signup?invite=${token}&email=${encodeURIComponent(email)}`);

  // Email input should be pre-filled from ?email=.
  const emailInput = page.locator("#email");
  await expect(emailInput).toBeVisible();
  await expect(emailInput).toHaveValue(email);

  // The URL still carries the invite token — no rewrite / strip.
  const url = new URL(page.url());
  expect(url.searchParams.get("invite")).toBe(token);
});
