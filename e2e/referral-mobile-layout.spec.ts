/**
 * Regression suite: on `/dashboard/referral`, at common mobile widths, the
 * three primary regions — QR card, referral-link card, and promoter-resource
 * cards — must fit inside the viewport and must not overlap each other.
 */
import { test, expect, type Page, type BrowserContext } from "@playwright/test";

const authStatus = process.env.LOVABLE_BROWSER_AUTH_STATUS;
const storageKey = process.env.LOVABLE_BROWSER_SUPABASE_STORAGE_KEY;
const sessionJson = process.env.LOVABLE_BROWSER_SUPABASE_SESSION_JSON;
const cookiesJson = process.env.LOVABLE_BROWSER_SUPABASE_COOKIES_JSON;
const HAS_SESSION = authStatus === "injected" && !!storageKey && !!sessionJson;

const MOBILE_WIDTHS = [
  { name: "sm-360", w: 360, h: 780 },
  { name: "iphone-390", w: 390, h: 844 },
  { name: "large-414", w: 414, h: 896 },
] as const;

const PROMOTER_TITLES = [
  "Promoter resources",
  "Preview scanner view",
  "QR Ads & print",
  "Test QR scanability",
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

type Rect = { name: string; x: number; y: number; w: number; h: number; right: number; bottom: number };

function rectsOverlap(a: Rect, b: Rect, tol = 1) {
  return (
    a.x + tol < b.right &&
    b.x + tol < a.right &&
    a.y + tol < b.bottom &&
    b.y + tol < a.bottom
  );
}

async function collectRegions(page: Page, promoterTitles: readonly string[]) {
  return page.evaluate((titles) => {
    function toRect(name: string, el: Element | null) {
      if (!el) return null;
      const r = (el as HTMLElement).getBoundingClientRect();
      return {
        name,
        x: Math.round(r.left),
        y: Math.round(r.top),
        w: Math.round(r.width),
        h: Math.round(r.height),
        right: Math.round(r.right),
        bottom: Math.round(r.bottom),
      };
    }

    const canvas = document.querySelector<HTMLCanvasElement>("canvas[data-qr]");
    const qrCard = canvas?.closest("[data-referral-qr-card]") ?? null;
    const qrRect = toRect("QR card", qrCard);

    // Referral-link card: find the label text, then walk up to the .rounded-xl card.
    let linkCardEl: Element | null = null;
    const labels = Array.from(document.querySelectorAll("div"));
    for (const el of labels) {
      if (el.textContent?.trim() === "Your referral link") {
        linkCardEl = (el as HTMLElement).closest(".rounded-xl");
        break;
      }
    }
    const linkRect = toRect("Referral link card", linkCardEl);

    const linkCode = linkCardEl?.querySelector("code") ?? null;
    const linkCodeRect = linkCode ? toRect("Referral link <code>", linkCode) : null;

    const promoterRects: ReturnType<typeof toRect>[] = [];
    for (const title of titles) {
      const heading = Array.from(document.querySelectorAll("h3")).find(
        (h) => h.textContent?.trim() === title,
      );
      const card = heading?.closest("a");
      const rect = toRect(`Promoter: ${title}`, card ?? null);
      if (rect) promoterRects.push(rect);
    }

    return {
      viewportW: window.innerWidth,
      pageScrollW: document.documentElement.scrollWidth,
      qr: qrRect,
      canvasSize: canvas
        ? { w: Math.round(canvas.getBoundingClientRect().width), h: Math.round(canvas.getBoundingClientRect().height) }
        : null,
      link: linkRect,
      linkCode: linkCodeRect,
      linkCardInnerW: linkCardEl ? Math.round((linkCardEl as HTMLElement).clientWidth) : null,
      promoters: promoterRects.filter(Boolean) as Rect[],
    };
  }, promoterTitles as unknown as string[]);
}

test.describe("referral page mobile layout", () => {
  test.describe.configure({ mode: "serial" });

  for (const vp of MOBILE_WIDTHS) {
    test(`/dashboard/referral no overflow/overlap @ ${vp.w}x${vp.h}`, async ({ browser }) => {
      test.skip(!HAS_SESSION, "Requires an injected Supabase session.");
      const context = await browser.newContext({
        viewport: { width: vp.w, height: vp.h },
        deviceScaleFactor: 2,
        isMobile: true,
      });
      const page = await context.newPage();
      await restoreSession(context, page);
      await page.goto("/dashboard/referral", { waitUntil: "networkidle" });
      await page.waitForSelector("canvas[data-qr]", { timeout: 10_000 });
      // Let ResponsiveQr's ResizeObserver settle.
      await page.evaluate(
        () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(null)))),
      );
      await page.waitForTimeout(300);

      const report = await collectRegions(page, PROMOTER_TITLES);

      const dump = () => JSON.stringify(report, null, 2);

      // 1. No horizontal page overflow.
      expect(
        report.pageScrollW,
        `Page horizontally overflows at ${vp.w}px (scrollWidth=${report.pageScrollW}).\n${dump()}`,
      ).toBeLessThanOrEqual(vp.w + 1);

      // 2. QR card + canvas fit and are square.
      expect(report.qr, `QR card not found @ ${vp.name}`).not.toBeNull();
      expect(report.qr!.right, `QR card overflows viewport @ ${vp.name}`).toBeLessThanOrEqual(vp.w + 1);
      expect(report.qr!.x, `QR card starts off-screen @ ${vp.name}`).toBeGreaterThanOrEqual(-1);
      expect(report.canvasSize, `QR canvas missing @ ${vp.name}`).not.toBeNull();
      expect(
        Math.abs(report.canvasSize!.w - report.canvasSize!.h),
        `QR canvas not square @ ${vp.name} (${report.canvasSize!.w}x${report.canvasSize!.h})`,
      ).toBeLessThanOrEqual(1);

      // 3. Referral-link card fits, and its <code> respects the card width.
      expect(report.link, `Referral-link card not found @ ${vp.name}`).not.toBeNull();
      expect(report.link!.right, `Referral-link card overflows viewport @ ${vp.name}`).toBeLessThanOrEqual(vp.w + 1);
      expect(report.linkCode, `Referral <code> not found @ ${vp.name}`).not.toBeNull();
      expect(
        report.linkCode!.w,
        `Referral <code> wider than its card @ ${vp.name} (code=${report.linkCode!.w} > card inner=${report.linkCardInnerW})`,
      ).toBeLessThanOrEqual((report.linkCardInnerW ?? vp.w) + 1);

      // 4. Promoter resource cards fit.
      expect(report.promoters.length, `Missing promoter cards @ ${vp.name}`).toBeGreaterThan(0);
      for (const p of report.promoters) {
        expect(p.right, `${p.name} overflows viewport @ ${vp.name}`).toBeLessThanOrEqual(vp.w + 1);
        expect(p.x, `${p.name} starts off-screen @ ${vp.name}`).toBeGreaterThanOrEqual(-1);
      }

      // 5. No overlap between the three regions (or between promoter cards themselves).
      const all: Rect[] = [report.qr!, report.link!, ...report.promoters];
      const overlaps: string[] = [];
      for (let i = 0; i < all.length; i++) {
        for (let j = i + 1; j < all.length; j++) {
          if (rectsOverlap(all[i], all[j])) {
            overlaps.push(
              `"${all[i].name}" overlaps "${all[j].name}" — ` +
                `a=(${all[i].x},${all[i].y},${all[i].w},${all[i].h}) ` +
                `b=(${all[j].x},${all[j].y},${all[j].w},${all[j].h})`,
            );
          }
        }
      }
      if (overlaps.length > 0) {
        await page.screenshot({ path: `e2e/__screenshots__/mobile/referral-overlap-${vp.name}.png` });
      }
      expect(overlaps, `Overlapping regions @ ${vp.name}:\n${overlaps.join("\n")}`).toEqual([]);

      await page.screenshot({ path: `e2e/__screenshots__/mobile/referral-${vp.name}.png` });
      await context.close();
    });
  }
});
