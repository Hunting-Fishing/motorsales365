#!/usr/bin/env node
// Sanity-check the Cloudflare Worker bundle produced by `npm run build`:
// correct Worker name (so a deploy can never hit another Worker) and a browser
// bundle bound to the production Supabase project.
import fs from "node:fs";
import path from "node:path";

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
