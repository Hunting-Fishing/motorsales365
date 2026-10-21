// Generate the complete staging transaction. No connection, execution or migration registration.
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildBusinessStockRelease } from "./build-business-stock-release.mjs";
import { buildStaffLifecycleRepair } from "./business-staff-lifecycle.mjs";

export function buildBusinessStockStagingRelease() {
  if (arguments.length) throw new Error("No staging package options accepted");
  const stock = buildBusinessStockRelease();
  const lifecycle = buildStaffLifecycleRepair().installSql;
  if (
    !stock.endsWith("\nCOMMIT;\n") ||
    !lifecycle.startsWith("BEGIN;\n") ||
    !lifecycle.endsWith("\nCOMMIT;")
  ) {
    throw new Error("Incomplete staging transaction envelope");
  }
  // The original package is retained for isolated component tests. The actual
  // deployment artifact must also contain staff offboarding and shop preservation.
  // No partial package becomes visible: the lifecycle fingerprint check and both
  // function replacements commit in the SAME transaction as the stock endpoint.
  return (
    stock.slice(0, -"COMMIT;\n".length) +
    "\n-- Required staff lifecycle compatibility and selected-shop preservation.\n" +
    lifecycle.slice("BEGIN;\n".length, -"\nCOMMIT;".length) +
    "\nCOMMIT;\n"
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.length !== 2) throw new Error("No arguments accepted");
  process.stdout.write(buildBusinessStockStagingRelease());
}
