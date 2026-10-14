// Real browser, WebWorker, WASM and bundled language assets. No production calls.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import { chromium } from "@playwright/test";
import { verifyOcrAssets } from "./verify-ocr-assets.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
verifyOcrAssets(path.join(root, "public"));
const server = await createServer({
  configFile: false,
  root,
  server: { host: "127.0.0.1", port: 0, hmr: false },
  // Bare Vite has no Start compiler. Its client-only helper is an identity
  // stub here; the full application build separately verifies SSR stripping.
  resolve: {
    alias: { "@": path.join(root, "src"), "@tanstack/react-start": "@tanstack/start-fn-stubs" },
  },
  optimizeDeps: { include: ["tesseract.js", "zod", "@tanstack/start-fn-stubs"], noDiscovery: true },
});
let browser;
try {
  await server.listen();
  const address = server.httpServer.address();
  const origin = `http://127.0.0.1:${address.port}`;
  const windowsBrowser = [
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  ].find((file) => fs.existsSync(file));
  browser = await chromium.launch({
    headless: true,
    executablePath:
      process.env.PLAYWRIGHT_CHROMIUM_PATH ??
      (process.platform === "win32" ? windowsBrowser : undefined),
  });
  const context = await browser.newContext({ serviceWorkers: "block" });
  const requests = [],
    failures = [],
    foreign = [];
  context.on("request", (request) => {
    requests.push(request.url());
    if (/^https?:/.test(request.url()) && new URL(request.url()).origin !== origin)
      foreign.push(request.url());
  });
  context.on("response", (response) => {
    if (response.status() >= 400) failures.push(`${response.status()} ${response.url()}`);
  });
  await context.route("**/*", async (route) => {
    const url = route.request().url();
    if (/^https?:/.test(url) && new URL(url).origin !== origin) {
      foreign.push(url);
      await route.abort();
    } else await route.continue();
  });
  const page = await context.newPage();
  page.on("pageerror", (error) => failures.push(error.message));
  await page.goto(`${origin}/e2e/fixtures/receipt-ocr.html`);
  const start = Date.now();
  const results = await page.evaluate(async () => {
    const { scanReceiptImage } = await import("/src/lib/receipt-ocr.client.ts");
    const canvas = document.createElement("canvas");
    canvas.width = 1400;
    canvas.height = 850;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "black";
    ctx.font = "40px Arial";
    [
      "Supplier: 365 TEST PARTS",
      "Date: 2026-10-15",
      "Currency: PHP",
      "Items:",
      "Oil filter 250.00",
      "Grand total: PHP 250.00",
    ].forEach((line, i) => ctx.fillText(line, 60, 100 + i * 95));
    const results = [];
    for (const mediaType of ["image/png", "image/jpeg", "image/webp"]) {
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, mediaType));
      const progress = [];
      const receipt = await scanReceiptImage(
        new File([blob], "synthetic-receipt", { type: mediaType }),
        { onProgress: (value) => progress.push(value.stage) },
      );
      results.push({ mediaType, receipt, progress });
    }
    return results;
  });
  for (const result of results) {
    assert.equal(result.receipt.vendor, "365 TEST PARTS");
    assert.equal(result.receipt.purchased_on, "2026-10-15");
    assert.equal(result.receipt.currency, "PHP");
    assert.equal(result.receipt.total, 250);
    assert.equal(result.receipt.items.length, 1);
    assert.match(result.receipt.items[0].description, /Oil filter/i);
    assert.equal(result.receipt.items[0].reviewed, false);
    assert.equal(result.receipt.items[0].category, null);
    assert.ok(result.progress.includes("Reading receipt"));
  }
  assert.deepEqual(foreign, [], "OCR must not request a third-party origin");
  assert.deepEqual(failures, [], "No missing assets or browser runtime errors");
  for (const part of ["worker.min.js", ".wasm.js", "eng.traineddata.gz"])
    assert.ok(
      requests.some((url) => url.includes(part)),
      `Browser must load bundled ${part}`,
    );
  console.log(
    JSON.stringify({
      passed: true,
      elapsedMs: Date.now() - start,
      assetRequests: requests
        .filter((url) => url.includes("/receipt-ocr/"))
        .map((url) => new URL(url).pathname),
      externalRequests: foreign.length,
      formats: results.map((result) => result.mediaType),
      reviewed: results.some((result) => result.receipt.items[0].reviewed),
    }),
  );
} finally {
  await browser?.close();
  await server.close();
}
