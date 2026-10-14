import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("Shop Manager employee operations", () => {
  const ledger = read("supabase/migrations/20260831124952_employee_operations_ledger.sql");
  const access = read("supabase/migrations/20260831130502_employee_module_access.sql");
  const page = read("src/routes/_authenticated/workspace.operations.tsx");

  it("adds shifts, breaks, approvals, and an append-only operating ledger", () => {
    for (const table of [
      "employee_work_locations",
      "employee_shifts",
      "employee_shift_events",
      "employee_approval_requests",
      "employee_operational_events",
    ]) {
      expect(ledger).toContain(`CREATE TABLE IF NOT EXISTS shop_manager.${table}`);
      expect(ledger).toContain(`ALTER TABLE shop_manager.${table} ENABLE ROW LEVEL SECURITY`);
    }
    expect(ledger).not.toMatch(/DROP\s+TABLE/i);
    expect(ledger).not.toMatch(/DROP\s+COLUMN/i);
  });

  it("attributes existing sales, payment, customer, work-order, and stock activity", () => {
    for (const table of [
      "payments",
      "invoices",
      "inventory_transactions",
      "inventory_purchase_orders",
      "stock_transfers",
      "customers",
      "work_orders",
      "work_order_discounts",
    ]) {
      expect(ledger).toContain(`'${table}'`);
    }
    expect(ledger).toContain("capture_employee_operation");
    expect(ledger).toContain("employee_daily_performance");
  });

  it("keeps mutations behind authenticated, state-validating RPCs", () => {
    for (const rpc of [
      "employee_shift_action",
      "request_employee_approval",
      "decide_employee_approval",
    ]) {
      expect(ledger).toContain(`FUNCTION shop_manager.${rpc}`);
      expect(ledger).toContain(`REVOKE ALL ON FUNCTION shop_manager.${rpc}`);
    }
    expect(ledger).toContain("Manager approval required");
    expect(ledger).toContain("one_open_per_user");
  });

  it("provides a role-aware module matrix with shop overrides", () => {
    expect(access).toContain("employee_allowed_modules");
    expect(access).toContain("shop_role_permissions");
    expect(access).toContain("parts_manager");
    expect(access).toContain("service_advisor");
    expect(access).toContain("technician");
    expect(access).toContain("allowed_modules");
  });

  it("ships the employee home screen and manager approval queue", () => {
    expect(page).toContain("365 Associate Operations");
    expect(page).toContain("Clock in");
    expect(page).toContain("Start break");
    expect(page).toContain("Request manager approval");
    expect(page).toContain("Approval queue");
    expect(read("src/routes/_authenticated/workspace.index.tsx")).toContain(
      'title: "Employee Operations"',
    );
  });
});
