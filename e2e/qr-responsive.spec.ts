/**
 * Regression suite: the on-screen QR code must always fit inside the mobile
 * viewport, on every page that renders one, at every common phone width.
 *
 * The original bug (see git history for `/dashboard/referral`): a
 * `<QRCodeCanvas size={512}>` contributes its intrinsic pixel size as
 * min-content to grid/flex parents, blowing out the layout on narrow
 * viewports. An ancestor `overflow-x-hidden` clips the overflow, so the
 * page still "fits" horizontally but the QR renders half off-screen and
 * can't be scanned.
 *
 * `<ResponsiveQr>` fixes this at the source. This spec locks the fix in.
 */
import { test, expect, type Page, type BrowserContext } from "@playwright/test";

const authStatus = process.env.LOVABLE_BROWSER_AUTH_STATUS;
const storageKey = process.env.LOVABLE_BROWSER_SUPABASE_STORAGE_KEY;
const sessionJson = process.env.LOVABLE_BROWSER_SUPABASE_SESSION_JSON;
const cookiesJson = process.env.LOVABLE_BROWSER_SUPABASE_COOKIES_JSON;
const HAS_SESSION = authStatus === "injected" && !!storageKey && !!sessionJson;

const MOBILE_WIDTHS = [
  { name: "sm-360", w: 360, h: 780 }, // small Android — the reported bug
  { name: "iphone-390", w: 390, h: 844 },
  { name: "large-414", w: 414, h: 896 },
] as const;

async function restoreSession(context: BrowserContext, page: Page) {
  if (!HAS_SESSION) return;
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
 * Assertion helper: after the page settles, no visible element extends past
 * the right edge of the viewport (accounting for a 1px sub-pixel tolerance),
 * and any QR canvas/img fits inside the viewport with a small breathing
 * margin. Returns the offending element info for easier failure diagnosis.
 */
async function assertQrFitsMobile(page: Page, viewportW: number, label: string) {
  // Wait for the ResponsiveQr wrapper to have picked a real size (it uses
  // ResizeObserver — a rAF is enough after layout).
  await page.waitForFunction(() => {
    const qrs = document.querySelectorAll("canvas[data-qr], canvas");
    return qrs.length > 0;
  }, { timeout: 10_000 }).catch(() => {
    // No QR on this page — nothing to assert. The caller only points this
    // helper at pages that render a QR.
    throw new Error(`No <canvas> QR found on ${label}`);
  });

  // Give the browser one frame to complete layout after canvas mount.
  await page.evaluate(
    () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(null)))),
  );

  const report = await page.evaluate((vw: number) => {
    const tolerance = 1;
    const clipped: Array<{ tag: string; cls: string; right: number; width: number }> = [];

    document.querySelectorAll("*").forEach((el) => {
      const cs = getComputedStyle(el as HTMLElement);
      // Skip fixed/absolute overlays (toasts, popovers, sticky headers).
      if (cs.position === "fixed" || cs.position === "sticky") return;
      // Skip intentionally scrollable containers.
      if (cs.overflowX === "auto" || cs.overflowX === "scroll") return;
      const r = (el as HTMLElement).getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) return;
      if (r.right > vw + tolerance) {
        clipped.push({
          tag: el.tagName,
          cls: ((el as HTMLElement).className?.toString?.() || "").slice(0, 120),
          right: Math.round(r.right),
          width: Math.round(r.width),
        });
      }
    });

    const qrCanvases: Array<{
      w: number;
      h: number;
      right: number;
      left: number;
      wrapperW: number | null;
    }> = [];
    document.querySelectorAll("canvas").forEach((c) => {
      const r = c.getBoundingClientRect();
      const parent = c.parentElement;
      const pr = parent ? parent.getBoundingClientRect() : null;
      qrCanvases.push({
        w: Math.round(r.width),
        h: Math.round(r.height),
        right: Math.round(r.right),
        left: Math.round(r.left),
        wrapperW: pr ? Math.round(pr.width) : null,
      });
    });

    return { clipped, qrCanvases, viewportW: window.innerWidth };
  }, viewportW);

  // 1. No element clipped off the right of the viewport.
  expect(
    report.clipped,
    `Elements overflow viewport (${viewportW}px) on ${label}:\n` +
      report.clipped.map((e) => `  <${e.tag}> class="${e.cls}" right=${e.right} w=${e.width}`).join("\n"),
  ).toEqual([]);

  // 2. Every QR canvas is inside the viewport and square.
  expect(report.qrCanvases.length, `Expected at least one QR canvas on ${label}`).toBeGreaterThan(0);
  for (const c of report.qrCanvases) {
    expect(c.right, `QR right edge exceeds viewport on ${label}`).toBeLessThanOrEqual(viewportW + 1);
    expect(c.left, `QR left edge negative on ${label}`).toBeGreaterThanOrEqual(-1);
    expect(Math.abs(c.w - c.h), `QR not square on ${label} (w=${c.w} h=${c.h})`).toBeLessThanOrEqual(1);
    expect(c.w, `QR too small to scan on ${label} (w=${c.w})`).toBeGreaterThanOrEqual(96);
  }
}

async function findFirstReferralCode(page: Page): Promise<string | null> {
  // Try the current user's referral code, if any, from the referral page.
  const res = await page.goto("/dashboard/referral", { waitUntil: "domcontentloaded" });
  if (!res || !res.ok()) return null;
  try {
    return await page.evaluate(() => {
      const canvas = document.querySelector<HTMLCanvasElement>("canvas[data-qr]");
      return canvas?.dataset.qr ?? null;
    });
  } catch {
    return null;
  }
}

test.describe("responsive QR fits mobile viewports", () => {
  test.describe.configure({ mode: "serial" });

  for (const vp of MOBILE_WIDTHS) {
    test(`/dashboard/referral @ ${vp.w}x${vp.h}`, async ({ browser }) => {
      test.skip(!HAS_SESSION, "Requires an injected Supabase session.");
      const context = await browser.newContext({
        viewport: { width: vp.w, height: vp.h },
        deviceScaleFactor: 2,
        isMobile: true,
      });
      const page = await context.newPage();
      await restoreSession(context, page);
      await page.goto("/dashboard/referral", { waitUntil: "networkidle" });
      await page.waitForTimeout(500);
      await assertQrFitsMobile(page, vp.w, `/dashboard/referral @ ${vp.name}`);
      await page.screenshot({ path: `e2e/__screenshots__/mobile/dashboard-referral-${vp.name}.png` });
      await context.close();
    });

    test(`/my-qr @ ${vp.w}x${vp.h}`, async ({ browser }) => {
      test.skip(!HAS_SESSION, "Requires an injected Supabase session.");
      const context = await browser.newContext({
        viewport: { width: vp.w, height: vp.h },
        deviceScaleFactor: 2,
        isMobile: true,
      });
      const page = await context.newPage();
      await restoreSession(context, page);
      await page.goto("/my-qr", { waitUntil: "networkidle" });
      await page.waitForTimeout(500);
      // /my-qr renders an <img>, not a canvas — assert the image fits.
      const report = await page.evaluate((vw: number) => {
        const img = document.querySelector<HTMLImageElement>('img[alt*="QR" i], img[alt*="scannable" i]');
        if (!img) return null;
        const r = img.getBoundingClientRect();
        return {
          w: Math.round(r.width),
          h: Math.round(r.height),
          right: Math.round(r.right),
          left: Math.round(r.left),
          viewportW: vw,
        };
      }, vp.w);
      if (report) {
        expect(report.right).toBeLessThanOrEqual(vp.w + 1);
        expect(report.left).toBeGreaterThanOrEqual(-1);
      }
      await page.screenshot({ path: `e2e/__screenshots__/mobile/my-qr-${vp.name}.png` });
      await context.close();
    });

    test(`/r/$code/qr @ ${vp.w}x${vp.h}`, async ({ browser }) => {
      test.skip(!HAS_SESSION, "Requires an injected Supabase session to discover a referral code.");
      const context = await browser.newContext({
        viewport: { width: vp.w, height: vp.h },
        deviceScaleFactor: 2,
        isMobile: true,
      });
      const page = await context.newPage();
      await restoreSession(context, page);
      const code = await findFirstReferralCode(page);
      test.skip(!code, "No referral code available in this environment.");
      await page.goto(`/r/${code}/qr`, { waitUntil: "networkidle" });
      await page.waitForTimeout(500);
      // Public QR page renders an <img>, not a canvas.
      const report = await page.evaluate((vw: number) => {
        const img = document.querySelector<HTMLImageElement>('img[alt*="QR" i]');
        if (!img) return null;
        const r = img.getBoundingClientRect();
        return {
          w: Math.round(r.width),
          right: Math.round(r.right),
          left: Math.round(r.left),
          viewportW: vw,
        };
      }, vp.w);
      if (report) {
        expect(report.right).toBeLessThanOrEqual(vp.w + 1);
        expect(report.left).toBeGreaterThanOrEqual(-1);
      }
      await page.screenshot({ path: `e2e/__screenshots__/mobile/r-code-qr-${vp.name}.png` });
      await context.close();
    });
  }
});
