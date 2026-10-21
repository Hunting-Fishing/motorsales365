// Build reviewed forward SQL only. Never connects, applies or registers a migration.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
export function appendQuoteWorkflowRelease(base) {
  const next = fs.readFileSync(
    new URL("../../supabase/releases/quote-workflow-v1.sql", import.meta.url),
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
    !base.includes("Authorized multi-business shop selection.")
  )
    throw Error("Complete shop-selection staging package required");
  return (
    base.slice(0, -"COMMIT;\n".length) +
    "\n-- Authorized quote approval and work-order conversion.\n" +
    next.slice(start + "\nBEGIN;\n".length)
  );
}
export async function buildQuoteWorkflowRelease() {
  if (arguments.length) throw Error("No build options accepted");
  const { buildShopSelectionRelease } = await import("./build-shop-selection-release.mjs");
  return appendQuoteWorkflowRelease(await buildShopSelectionRelease());
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.length !== 2) throw Error("No arguments accepted");
  process.stdout.write(await buildQuoteWorkflowRelease());
}
