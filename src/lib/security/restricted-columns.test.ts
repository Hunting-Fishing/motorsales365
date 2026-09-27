import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  attachExposureReviewNotes,
  BUSINESS_EDITOR_COLUMNS,
  BUSINESS_PRIVATE_COLUMNS,
  INVENTORY_COST_COLUMNS,
  INVENTORY_MEMBER_COLUMNS,
  isInventoryCostRestricted,
  mergeInventoryCosts,
  sanitizeInventoryCostWrite,
} from "./restricted-columns";

const root = resolve(__dirname, "..", "..", "..");
const read = (path: string) => readFileSync(resolve(root, path), "utf8");
const MIGRATION = "supabase/migrations/20260927120000_parts_network_security_followups.sql";

/** Parse `v_name constant text[] := ARRAY['a', 'b'];` from the migration. */
function sqlArray(sql: string, name: string): string[] {
  const m = new RegExp(`${name} constant text\\[\\] := ARRAY\\[([^\\]]*)\\]`).exec(sql);
  if (!m) throw new Error(`array ${name} not found`);
  return [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
}

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return walk(full);
    return /\.(ts|tsx)$/.test(name) ? [full] : [];
  });
}

describe("restricted column lists", () => {
  const migration = read(MIGRATION);

  it("match the column privileges applied by the migration", () => {
    expect(sqlArray(migration, "v_business_private").sort()).toEqual(
      [...BUSINESS_PRIVATE_COLUMNS].sort(),
    );
    expect(sqlArray(migration, "v_inventory_cost").sort()).toEqual(
      [...INVENTORY_COST_COLUMNS].sort(),
    );
  });

  it("never include a restricted column in the member/editor projections", () => {
    for (const c of BUSINESS_PRIVATE_COLUMNS) expect(BUSINESS_EDITOR_COLUMNS).not.toContain(c);
    for (const c of INVENTORY_COST_COLUMNS) expect(INVENTORY_MEMBER_COLUMNS).not.toContain(c);
    expect(new Set(BUSINESS_EDITOR_COLUMNS).size).toBe(BUSINESS_EDITOR_COLUMNS.length);
    expect(new Set(INVENTORY_MEMBER_COLUMNS).size).toBe(INVENTORY_MEMBER_COLUMNS.length);
  });

  it("app code never selects restricted columns or '*' from the protected tables", () => {
    const offenders: string[] = [];
    const selectRe = /\.select\(\s*(["'`])([\s\S]*?)\1/g;
    for (const file of walk(resolve(root, "src"))) {
      const rel = relative(root, file);
      if (rel.startsWith("src/integrations/") || rel.includes(".test.")) continue;
      const src = readFileSync(file, "utf8");
      for (const m of src.matchAll(selectRe)) {
        const cols = m[2];
        const has = (c: string) => new RegExp(`(^|[\\s,(])${c}([\\s,)]|$)`).test(cols);
        // Private business column names are unique to public.businesses.
        const hitsPrivate = BUSINESS_PRIVATE_COLUMNS.some(has);
        // "supplier"/"cost" exist on other tables; only flag inventory selects.
        const before = src.slice(Math.max(0, m.index! - 200), m.index!).trimEnd();
        const onInventory = /from\(\s*"business_inventory_items"\s*\)$/.test(before);
        if (hitsPrivate || (onInventory && INVENTORY_COST_COLUMNS.some(has))) {
          offenders.push(`${rel}: ${cols}`);
        }
      }
      if (/from\(\s*"businesses"\s*\)\s*\.select\(\s*"\*/.test(src))
        offenders.push(`${rel}: businesses *`);
      if (/from\(\s*"business_inventory_items"\s*\)\s*\.select\(\s*"\*/.test(src)) {
        offenders.push(`${rel}: business_inventory_items *`);
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe("mergeInventoryCosts", () => {
  const rows = [
    { id: "a", name: "Pad", cost: 999, supplier: "leak", markup_percentage: 10 },
    { id: "b", name: "Rotor" },
  ];

  it("attaches RPC cost data for owners and managers", () => {
    const merged = mergeInventoryCosts(
      rows,
      [{ item_id: "a", cost: "111.11", supplier: "Acme", markup_percentage: "35" }],
      true,
    );
    expect(merged[0]).toMatchObject({
      id: "a",
      cost: 111.11,
      supplier: "Acme",
      markup_percentage: 35,
      cost_restricted: false,
    });
    expect(merged[1]).toMatchObject({
      id: "b",
      cost: null,
      supplier: null,
      markup_percentage: null,
    });
  });

  it("strips every cost key and flags the rows for other staff", () => {
    const merged = mergeInventoryCosts(rows, null, false);
    for (const row of merged) {
      expect(row).not.toHaveProperty("cost");
      expect(row).not.toHaveProperty("supplier");
      expect(row).not.toHaveProperty("markup_percentage");
      expect(row.cost_restricted).toBe(true);
      expect(isInventoryCostRestricted(row)).toBe(true);
    }
    expect(merged[0]).toMatchObject({ id: "a", name: "Pad" });
  });

  it("isInventoryCostRestricted is false for managers and new items", () => {
    expect(isInventoryCostRestricted(null)).toBe(false);
    expect(isInventoryCostRestricted({ cost_restricted: false })).toBe(false);
    expect(isInventoryCostRestricted({})).toBe(false);
  });
});

describe("sanitizeInventoryCostWrite", () => {
  it("drops cost keys that were not provided so updates never null them", () => {
    const out = sanitizeInventoryCostWrite({ name: "x", cost: undefined, supplier: "S" }, true);
    expect(out).toEqual({ name: "x", supplier: "S" });
  });

  it("keeps explicit nulls from privileged writers", () => {
    expect(sanitizeInventoryCostWrite({ cost: null }, true)).toEqual({ cost: null });
  });

  it("removes all cost keys for callers who may not write them", () => {
    expect(
      sanitizeInventoryCostWrite(
        { name: "x", cost: 1, supplier: "S", markup_percentage: 2 },
        false,
      ),
    ).toEqual({ name: "x" });
  });
});

describe("attachExposureReviewNotes", () => {
  it("adds notes by business id and defaults to null", () => {
    const out = attachExposureReviewNotes(
      [{ id: "a" }, { id: "b" }],
      [{ business_id: "a", network_exposure_review_note: "Needs docs" }],
    );
    expect(out).toEqual([
      { id: "a", network_exposure_review_note: "Needs docs" },
      { id: "b", network_exposure_review_note: null },
    ]);
    expect(attachExposureReviewNotes([{ id: "a" }], null)[0].network_exposure_review_note).toBe(
      null,
    );
  });
});
