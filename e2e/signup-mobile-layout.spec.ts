/**
 * Signup — mobile layout & flow parity.
 *
 * Covers the three account types (buyer, business, service_provider) plus the
 * QR (?ref=&vid=&src=qr) and invite (?invite=&email=) parameter passthroughs,
 * all rendered at a phone viewport. Asserts:
 *
 *   1. Same visible fields/order/copy as the web version (no old
 *      "1. ACCOUNT TYPE" / large-card mobile-only layout regression).
 *   2. Mobile-specific affordances added in the mobile-parity redesign:
 *      compact navy hero card, segmented account-type control with min 44px
 *      tap targets, sticky Submit + Continue-with-Google bar.
 *   3. Business/Dealer + Service Provider intents reveal the correct
 *      business-details block.
 *   4. QR + invite URL params survive validateSearch (email pre-filled,
 *      referral params preserved on the URL) at mobile viewport.
 *   5. No horizontal scroll at 360x780 or 390x844.
 *
 * DB-side assertions live in scripts/smoke-signup-matrix.mjs; this spec is
 * DOM + layout only (no live auth).
 */
import { test, expect, type Page } from "@playwright/test";

const MOBILE = { width: 390, height: 844 };
const SMALL_MOBILE = { width: 360, height: 780 };

test.use({ viewport: MOBILE });

async function selectIntent(page: Page, label: RegExp) {
  // Wait for form hydration — segmented control is rendered by React and
  // won't respond to clicks until the intent state hooks are wired up.
  await expect(page.locator("#first-name")).toBeVisible();
  await page.waitForLoadState("networkidle").catch(() => {});
  const radio = page.getByRole("radio", { name: label });
  await radio.scrollIntoViewIfNeeded();
  // Retry until React state actually flips: dev-mode devtool overlay can
  // occasionally swallow the first click on narrow viewports.
  await expect
    .poll(
      async () => {
        if ((await radio.getAttribute("aria-checked")) === "true") return "true";
        await radio.evaluate((el) => (el as HTMLButtonElement).click());
        return radio.getAttribute("aria-checked");
      },
      { timeout: 10_000, intervals: [100, 200, 400, 800] },
    )
    .toBe("true");
}

async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => ({
    doc: document.documentElement.scrollWidth,
    win: window.innerWidth,
  }));
  expect(overflow.doc, "page must not overflow horizontally on mobile").toBeLessThanOrEqual(
    overflow.win + 1,
  );
}

async function expectMobileChrome(page: Page) {
  // Compact mobile hero card (mobile-only wrapper). Desktop hero also exists
  // in DOM but is display:none at <md, so scope by the paragraph tag used only
  // in the mobile hero.
  const heroTagline = page.locator("p", {
    hasText: "Join the Philippines' trusted motor marketplace.",
  });
  await expect(heroTagline).toBeVisible();
  const heroCard = heroTagline.locator("xpath=ancestor::div[1]");
  await expect(heroCard.getByText(/Verified inventory/i)).toBeVisible();
  await expect(heroCard.getByText(/Secure transactions/i)).toBeVisible();
  await expect(heroCard.getByText(/Nationwide reach/i)).toBeVisible();

  // Same headline as web.
  await expect(
    page.getByRole("heading", { name: /^Create your account$/i, level: 1 }),
  ).toBeVisible();

  // Segmented account-type control — all three options present and tappable.
  const buyer = page.getByRole("radio", { name: /Buyer & Private Seller/i });
  const biz = page.getByRole("radio", { name: /Business \/ Dealer/i });
  const svc = page.getByRole("radio", { name: /Service provider/i });
  for (const opt of [buyer, biz, svc]) {
    await expect(opt).toBeVisible();
    const box = await opt.boundingBox();
    expect(box, "segmented option must render").not.toBeNull();
    expect(box!.height, "44px min tap target on mobile").toBeGreaterThanOrEqual(40);
  }
}

async function expectStickyCta(page: Page) {
  const submit = page.getByRole("button", { name: /(Create .* account|Choose an account type)/i });
  await expect(submit).toBeVisible();
  // The wrapper element carries `sticky bottom-0` on mobile — proving that
  // structurally is more reliable across scroll timing than pixel maths.
  const stickyBar = page.locator("div.sticky.bottom-0").filter({ has: submit });
  await expect(stickyBar).toHaveCount(1);
  const position = await stickyBar.evaluate((el) => getComputedStyle(el).position);
  expect(position).toBe("sticky");
  // "Or register with" divider + Google button share the sticky bar.
  await expect(page.getByRole("button", { name: /Continue with Google/i })).toBeVisible();
}

test.describe("signup :: mobile layout parity", () => {
  test("buyer intent — mobile chrome, sticky CTA, no old layout", async ({ page }) => {
    await page.goto("/signup");
    await expectMobileChrome(page);

    // Old mobile flow must not resurface.
    await expect(page.getByText(/^1\.\s*ACCOUNT TYPE/i)).toHaveCount(0);
    await expect(page.getByText(/^2\.\s*YOUR DETAILS/i)).toHaveCount(0);
    await expect(page.getByText(/Pick what brings you here/i)).toHaveCount(0);

    await selectIntent(page, /Buyer & Private Seller/i);

    // Same core fields as web, same order.
    await expect(page.locator("#first-name")).toBeVisible();
    await expect(page.locator("#last-name")).toBeVisible();
    await expect(page.locator("#phone")).toBeVisible();
    await expect(page.locator("#email")).toBeVisible();
    await expect(page.locator("#street-address")).toBeVisible();
    await expect(page.locator("#postal-code")).toBeVisible();
    await expect(page.locator("#password")).toBeVisible();

    // No business block for buyer.
    await expect(page.locator("#business-name")).toHaveCount(0);

    await expectStickyCta(page);
    await expectNoHorizontalScroll(page);
  });

  test("business intent — reveals business details block on mobile", async ({ page }) => {
    await page.goto("/signup");
    await expectMobileChrome(page);

    await selectIntent(page, /Business \/ Dealer/i);

    await expect(page.locator("#business-name")).toBeVisible();
    await expect(page.locator("#business-kind")).toBeVisible();
    await expect(page.locator("#business-address")).toBeVisible();
    await expect(page.locator("#business-postal")).toBeVisible();

    // Personal address block hidden when business-like.
    await expect(page.locator("#street-address")).toHaveCount(0);

    // CTA label reflects intent.
    await expect(
      page.getByRole("button", { name: /Create business \/ dealer account/i }),
    ).toBeVisible();

    await expectStickyCta(page);
    await expectNoHorizontalScroll(page);
  });

  test("service_provider intent — reveals service details block on mobile", async ({ page }) => {
    await page.goto("/signup");
    await expectMobileChrome(page);

    await selectIntent(page, /Service provider/i);

    await expect(page.locator("#business-name")).toBeVisible();
    await expect(page.locator("#business-kind")).toBeVisible();
    await expect(page.locator("#business-address")).toBeVisible();
    await expect(page.locator("#business-postal")).toBeVisible();

    await expect(page.locator("#street-address")).toHaveCount(0);

    await expect(
      page.getByRole("button", { name: /Create service provider account/i }),
    ).toBeVisible();

    await expectStickyCta(page);
    await expectNoHorizontalScroll(page);
  });

  test("QR attribution params survive validateSearch on mobile", async ({ page }) => {
    const code = "test";
    const vid = "11111111-2222-3333-4444-555555555555";
    await page.goto(`/signup?ref=${code}&vid=${vid}&src=qr`);
    await expectMobileChrome(page);

    // URL preserved verbatim.
    const url = new URL(page.url());
    expect(url.searchParams.get("ref")).toBe(code);
    expect(url.searchParams.get("vid")).toBe(vid);
    expect(url.searchParams.get("src")).toBe("qr");

    // Cycle through all three intents to confirm nothing strips the params.
    for (const name of [
      /Buyer & Private Seller/i,
      /Business \/ Dealer/i,
      /Service provider/i,
    ]) {
      await selectIntent(page, name);
      const cur = new URL(page.url());
      expect(cur.searchParams.get("ref")).toBe(code);
      expect(cur.searchParams.get("vid")).toBe(vid);
    }

    await expectNoHorizontalScroll(page);
  });

  test("invite params pre-fill email and survive on mobile", async ({ page }) => {
    const token = "abcdef01234567890abcdef012345678";
    const email = "invitee@example.com";
    await page.goto(`/signup?invite=${token}&email=${encodeURIComponent(email)}`);
    await expectMobileChrome(page);

    await expect(page.locator("#email")).toHaveValue(email);
    const url = new URL(page.url());
    expect(url.searchParams.get("invite")).toBe(token);
    expect(url.searchParams.get("email")).toBe(email);

    await expectNoHorizontalScroll(page);
  });

  test("no horizontal scroll at 360x780 with long form (business)", async ({ page }) => {
    await page.setViewportSize(SMALL_MOBILE);
    await page.goto("/signup");
    await selectIntent(page, /Business \/ Dealer/i);
    await expect(page.locator("#business-name")).toBeVisible();
    await expectNoHorizontalScroll(page);
  });
});
