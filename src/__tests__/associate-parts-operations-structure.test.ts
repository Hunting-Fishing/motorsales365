import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(__dirname, "..", "..");
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("365 Associate parts operations expansion", () => {
  const catalogueMigration = read(
    "supabase/migrations/20260831041350_associate_parts_catalogue_operations.sql",
  );
  const lifecycleMigration = read(
    "supabase/migrations/20260831041834_associate_parts_order_lifecycle.sql",
  );
  const networkPage = read("src/routes/parts.network.tsx");
  const operationsPage = read("src/routes/dashboard.business.$businessId.parts-operations.tsx");

  it("extends the live catalogue and inventory instead of replacing them", () => {
    expect(catalogueMigration).toContain("ALTER TABLE public.parts_catalog");
    expect(catalogueMigration).toContain("ALTER TABLE public.business_inventory_items");
    expect(catalogueMigration).not.toMatch(/DROP\s+TABLE/i);
    expect(catalogueMigration).not.toMatch(/DROP\s+COLUMN/i);
    expect(lifecycleMigration).not.toMatch(/DROP\s+TABLE/i);
    expect(lifecycleMigration).not.toMatch(/DROP\s+COLUMN/i);
  });

  it("adds canonical numbers, Philippine chassis profiles, fitment, and locations", () => {
    for (const table of [
      "parts_product_numbers",
      "parts_vehicle_profiles",
      "parts_fitment",
      "business_inventory_locations",
    ]) {
      expect(catalogueMigration).toContain(`CREATE TABLE IF NOT EXISTS public.${table}`);
      expect(catalogueMigration).toContain(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY`);
    }
    expect(catalogueMigration).toContain("chassis_code text");
    expect(catalogueMigration).toContain("WITH (security_invoker = on)");
  });

  it("provides an atomic order, transfer, receipt, return, install, and warranty lifecycle", () => {
    for (const rpc of [
      "create_parts_network_order",
      "transition_parts_network_order",
      "receive_parts_network_order",
      "create_parts_return",
      "record_installed_component",
      "create_parts_warranty_claim",
    ]) {
      expect(lifecycleMigration).toContain(`FUNCTION public.${rpc}`);
      expect(lifecycleMigration).toContain(`REVOKE ALL ON FUNCTION public.${rpc}`);
    }
    expect(lifecycleMigration).toContain("INSERT INTO public.business_inventory_movements");
    expect(lifecycleMigration).toContain("INSERT INTO public.parts_order_events");
  });

  it("keeps quote requests while adding VIN/chassis, nearby stock, and direct ordering", () => {
    expect(networkPage).toContain("VIN or Philippine/JDM chassis number");
    expect(networkPage).toContain("Nearby stock");
    expect(networkPage).toContain("Request quote");
    expect(networkPage).toContain("<ShoppingCart");
  });

  it("exposes the lifecycle inside the existing business workspace", () => {
    expect(operationsPage).toContain("Orders & transfers");
    expect(operationsPage).toContain("Returns (");
    expect(operationsPage).toContain("Warranty (");
    expect(operationsPage).toContain('<TabsTrigger value="locations">Locations');
    expect(read("src/lib/business-workspace/modules.ts")).toContain('id: "parts_operations"');
  });
});
