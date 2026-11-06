import { describe, expect, it } from "vitest";
import {
  extractCreatedTables,
  extractRlsEnabledTables,
  findUnclassifiedTables,
  findUncoveredTables,
  stripSqlComments,
} from "./parts-rls-coverage";

describe("parts RLS coverage helpers", () => {
  it("extracts public tables and ignores other schemas and comments", () => {
    const sql = `
      -- CREATE TABLE public.commented_out (id int);
      CREATE TABLE IF NOT EXISTS public.parts_orders (id uuid);
      create table parts_notes(id int);
      CREATE TABLE shop_manager.inventory (id uuid);
      /* CREATE TABLE public.block_comment (id int); */
      CREATE TABLE "public"."quoted_table" (id int);
    `;
    expect(extractCreatedTables(sql)).toEqual(["parts_notes", "parts_orders", "quoted_table"]);
  });

  it("extracts RLS-enabled tables", () => {
    const sql = `
      ALTER TABLE public.parts_orders ENABLE ROW LEVEL SECURITY;
      alter table only parts_notes enable row level security;
      -- ALTER TABLE public.fake ENABLE ROW LEVEL SECURITY;
    `;
    expect(extractRlsEnabledTables(sql)).toEqual(["parts_notes", "parts_orders"]);
  });

  it("reports protected tables missing from the adversarial suite", () => {
    const suite = `
      SELECT 1 FROM public.parts_orders;
      -- public.parts_returns is only mentioned in a comment
      SELECT 1 FROM public.parts_order_lines_archive;
    `;
    expect(
      findUncoveredTables(["parts_orders", "parts_returns", "parts_order_lines"], suite),
    ).toEqual(["parts_returns", "parts_order_lines"]);
  });

  it("flags tables nobody has classified", () => {
    expect(findUnclassifiedTables(["parts_orders", "parts_fitment", "parts_brand_new"])).toEqual([
      "parts_brand_new",
    ]);
  });

  it("strips line and block comments", () => {
    expect(stripSqlComments("a -- b\nc /* d */ e").replace(/\s+/g, " ").trim()).toBe("a c e");
  });
});
