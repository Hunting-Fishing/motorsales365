// Compose a cumulative unapplied transaction. No hosted connection or migration registration.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
export function appendShopSelectionRelease(base) {
  const next = fs.readFileSync(
    new URL("../../supabase/releases/shop-selection-v1.sql", import.meta.url),
    "utf8",
  );
  const start = next.indexOf("\nBEGIN;\n");
  if (
    typeof base !== "string" ||
    !base.endsWith("\nCOMMIT;\n") ||
    start < 0 ||
    !next.endsWith("\nCOMMIT;\n") ||
    (base.match(/^BEGIN;$/gm) ?? []).length !== 1 ||
    (base.match(/^COMMIT;$/gm) ?? []).length !== 1 ||
    !base.includes("Connected native Shop Manager stock operations.")
  )
    throw Error("Complete shop stock package required");
  return (
    base.slice(0, -"COMMIT;\n".length) +
    "\n-- Authorized multi-business shop selection.\n" +
    next.slice(start + "\nBEGIN;\n".length)
  );
}
export async function buildShopSelectionRelease() {
  if (arguments.length) throw Error("No build options accepted");
  const { buildShopStockStagingRelease } = await import("./build-shop-stock-staging-release.mjs");
  return appendShopSelectionRelease(await buildShopStockStagingRelease());
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.length !== 2) throw Error("No arguments accepted");
  process.stdout.write(await buildShopSelectionRelease());
}
