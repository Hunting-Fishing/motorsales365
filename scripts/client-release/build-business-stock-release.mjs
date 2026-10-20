// Emits a forward-only release transaction; never connects to a database.
// The frozen historical migration replay is intentionally not modified.
import fs from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";
export function buildBusinessStockRelease() {
  const root = new URL("../../", import.meta.url);
  const boundary = fs.readFileSync(
    new URL("scripts/client-release/business-staff-boundary.sql", root),
    "utf8",
  );
  const hash = createHash("sha1")
    .update(`blob ${Buffer.byteLength(boundary)}\0`)
    .update(boundary)
    .digest("hex");
  if (hash !== "78ff333d42a87dae3bde86cbf246ddcc1e4d99fd")
    throw new Error("Review changed staff boundary before packaging");
  const stock = fs.readFileSync(
    new URL("supabase/releases/business-stock-operation-v1.sql", root),
    "utf8",
  );
  const inner = (text) => {
    const start = text.indexOf("\nBEGIN;\n"),
      end = text.lastIndexOf("\nCOMMIT;");
    if (start < 0 || end <= start) throw new Error("Incomplete release transaction");
    return text.slice(start + 8, end);
  };
  return (
    "-- Reviewed forward transaction: staff boundary + stock RPC. Apply to staging first.\nBEGIN;\n" +
    inner(boundary) +
    "\n" +
    inner(stock) +
    "\nCOMMIT;\n"
  );
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.length !== 2) throw new Error("No arguments accepted");
  process.stdout.write(buildBusinessStockRelease());
}
