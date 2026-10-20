// Emit SQL only: no hosted connection, secret, deployment or migration registration.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
export function composeShopStockStagingRelease(base) {
  const native = fs.readFileSync(
    new URL("../../supabase/releases/shop-stock-operation-v1.sql", import.meta.url),
    "utf8",
  );
  const start = native.indexOf("\nBEGIN;\n");
  if (
    typeof base !== "string" ||
    !base.endsWith("\nCOMMIT;\n") ||
    start < 0 ||
    !native.endsWith("\nCOMMIT;\n") ||
    (base.match(/^BEGIN;$/gm) ?? []).length !== 1 ||
    (base.match(/^COMMIT;$/gm) ?? []).length !== 1 ||
    !base.includes("Required staff lifecycle compatibility and selected-shop preservation.")
  )
    throw Error("Complete business/staff staging package required");
  return (
    base.slice(0, -"COMMIT;\n".length) +
    "\n-- Connected native Shop Manager stock operations.\n" +
    native.slice(start + "\nBEGIN;\n".length)
  );
}
export async function buildShopStockStagingRelease() {
  if (arguments.length) throw Error("No staging options accepted");
  const { buildBusinessStockStagingRelease } =
    await import("./build-business-stock-staging-release.mjs");
  return composeShopStockStagingRelease(buildBusinessStockStagingRelease());
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.length !== 2) throw Error("No arguments accepted");
  process.stdout.write(await buildShopStockStagingRelease());
}
