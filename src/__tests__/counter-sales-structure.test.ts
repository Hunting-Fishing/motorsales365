import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");
describe("atomic counter sales", () => {
  const sql = read("supabase/migrations/20260831193523_counter_sales_registers_pricebook.sql");
  it("adds registers, sales, price books and commissions", () => {
    for (const t of [
      "cash_registers",
      "register_sessions",
      "counter_sales",
      "counter_sale_lines",
      "price_book_rules",
      "commission_rules",
      "commission_events",
    ])
      expect(sql).toContain(`CREATE TABLE shop_manager.${t}`);
  });
  it("locks stock and protects discounted sales", () => {
    expect(sql).toContain("FOR UPDATE");
    expect(sql).toContain("Insufficient stock");
    expect(sql).toContain("Manager approval required");
    expect(sql).toContain("UPDATE shop_manager.inventory_items SET quantity=quantity-q");
  });
  it("uses protected financial RPCs", () => {
    for (const f of ["open_register", "complete_counter_sale", "close_register"]) {
      expect(sql).toContain(`FUNCTION shop_manager.${f}`);
      expect(sql).toContain(`REVOKE ALL ON FUNCTION shop_manager.${f}`);
    }
  });
  it("ships the counter interface", () => {
    const page = read("src/routes/_authenticated/workspace.counter-sale.tsx");
    expect(page).toContain("Counter Sale");
    expect(page).toContain("Complete cash sale");
  });
});
