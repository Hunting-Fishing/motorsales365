import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config for end-to-end tests. Assumes the Vite dev server is
 * already running at http://localhost:8080 (Lovable sandbox default).
 * Run with: `bunx playwright test`.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:8080",
    viewport: { width: 1280, height: 900 },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: {
          // Lovable sandbox ships a full Chromium at /chromium-*; prefer it
          // when present so tests don't require `playwright install`.
          executablePath:
            process.env.PLAYWRIGHT_CHROMIUM_PATH ||
            "/chromium-1194/chrome-linux/chrome",
        },
      },
    },
  ],
});
