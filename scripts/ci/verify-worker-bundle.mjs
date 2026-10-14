#!/usr/bin/env node
// Sanity-check the Cloudflare Worker bundle produced by `npm run build`:
// correct Worker name (so a deploy can never hit another Worker) and a browser
// bundle bound to the production Supabase project.
import fs from "node:fs";
import path from "node:path";
import { verifyOcrAssets } from "../vehicle-receipts/verify-ocr-assets.mjs";
import { verifyPdfAssets } from "../vehicle-receipts/verify-pdf-assets.mjs";

const expectedName = process.env.WORKER_NAME ?? "motorsales365";
const expectedRef = process.env.SUPABASE_REF ?? "wjxaajgvddtrxxtocxen";
const configPath = ".output/server/wrangler.json";

if (!fs.existsSync(configPath)) {
  console.error(`${configPath} missing — did the build run?`);
  process.exit(1);
}
const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
if (config.name !== expectedName) {
  console.error(
    `Worker name is ${JSON.stringify(config.name)}, expected ${JSON.stringify(expectedName)}.`,
  );
  process.exit(1);
}
const assetsDir = path.resolve(
  path.dirname(configPath),
  config.assets?.directory ?? "../public",
  "assets",
);
const hit = fs
  .readdirSync(assetsDir)
  .filter((f) => f.endsWith(".js"))
  .some((f) => fs.readFileSync(path.join(assetsDir, f), "utf8").includes(expectedRef));
if (!hit) {
  console.error(`Browser bundle does not reference Supabase project ${expectedRef}.`);
  process.exit(1);
}
console.log(`Worker bundle OK: name=${config.name}, main=${config.main}, Supabase=${expectedRef}`);
console.log(`Same-origin OCR assets OK: ${verifyOcrAssets(path.dirname(assetsDir))} files`);
console.log(`Same-origin PDF assets OK: ${verifyPdfAssets(path.dirname(assetsDir))} files`);
// The OCR/PDF engines belong in the browser, never the Cloudflare server.
const serverDir = path.resolve(path.dirname(configPath));
for (const file of fs
  .readdirSync(serverDir, { recursive: true })
  .filter((name) => /\.(?:m?js)$/.test(name))) {
  const code = fs.readFileSync(path.join(serverDir, file), "utf8");
  if (
    [
      "TesseractCore",
      "tesseract.js-core",
      "worker-script/node",
      "GlobalWorkerOptions.workerSrc",
    ].some((marker) => code.includes(marker))
  ) {
    console.error(`Browser OCR/PDF engine leaked into server bundle: ${file}`);
    process.exit(1);
  }
}
console.log("OCR/PDF server boundary OK: no browser engine in the server package");
