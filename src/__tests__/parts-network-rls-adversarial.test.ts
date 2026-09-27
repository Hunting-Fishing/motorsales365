import { readdirSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  extractCreatedTables,
  extractRlsEnabledTables,
  findUnclassifiedTables,
  findUncoveredTables,
  PARTS_NETWORK_MIGRATION_PATTERN,
  PARTS_NETWORK_PROTECTED_TABLES,
} from "@/lib/security/parts-rls-coverage";

const root = resolve(__dirname, "..", "..");
const read = (path: string) => readFileSync(resolve(root, path), "utf8");
const migrationsDir = resolve(root, "supabase/migrations");
const migrationFiles = readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort();
const allMigrations = migrationFiles.map((f) => read(`supabase/migrations/${f}`)).join("\n");

const SUITE_PATH = "supabase/tests/parts_network_adversarial_rls.sql";
const HARDENING = "supabase/migrations/20260927090000_parts_network_cross_org_rls_hardening.sql";

describe("Parts network adversarial RLS suite (P2 / G2)", () => {
  const suite = read(SUITE_PATH);

  it("covers every protected Parts network table", () => {
    expect(findUncoveredTables(PARTS_NETWORK_PROTECTED_TABLES, suite)).toEqual([]);
  });

  it("only protects tables that enable RLS in a migration", () => {
    const rls = new Set(extractRlsEnabledTables(allMigrations));
    expect(PARTS_NETWORK_PROTECTED_TABLES.filter((t) => !rls.has(t))).toEqual([]);
  });

  it("forces every table created by a Parts network migration to be classified", () => {
    const created = migrationFiles
      .filter((f) => PARTS_NETWORK_MIGRATION_PATTERN.test(f))
      .flatMap((f) => extractCreatedTables(read(`supabase/migrations/${f}`)));
    expect(created.length).toBeGreaterThan(10);
    expect(findUnclassifiedTables(created)).toEqual([]);
  });

  it("is non-destructive: one transaction, always rolled back", () => {
    expect(suite).toMatch(/^BEGIN;$/m);
    expect(suite.trimEnd()).toMatch(/ROLLBACK;$/);
    expect(suite).not.toMatch(/^\s*COMMIT\s*;/im);
    expect(suite).not.toMatch(/\bDROP\s+(TABLE|SCHEMA|DATABASE)\b/i);
    expect(suite).not.toMatch(/^\s*TRUNCATE\b/im);
  });

  it("fails loudly and includes positive controls", () => {
    expect(suite).toContain("assertions FAILED");
    expect(suite).toContain("recorded no assertions");
    expect(suite).toContain("Positive controls");
    for (const persona of ["anon", "outsider", "b_owner", "sm_b", "d_owner", "admin"]) {
      expect(suite).toContain(`'${persona}'`);
    }
  });

  it("exercises the plan's stop conditions", () => {
    expect(suite).toContain("base table hides cost/notes/bin/supplier of published item");
    expect(suite).toContain("network_stock hides suspended Associate stock");
    expect(suite).toContain("Revoked owner cannot self-approve exposure");
    expect(suite).toContain("Revoked partner stock disappears from network_stock");
    expect(suite).toContain("Anon cannot attribute an inquiry to another user");
  });

  it("ships an executable runner that refuses to run without a connection", () => {
    const runner = "scripts/test-parts-rls-adversarial.sh";
    expect(statSync(resolve(root, runner)).mode & 0o111).not.toBe(0);
    const body = read(runner);
    expect(body).toContain(SUITE_PATH);
    expect(body).toContain("ON_ERROR_STOP=1");
  });
});

describe("Parts network cross-organization hardening migration", () => {
  const hardening = read(HARDENING);

  it("is additive", () => {
    expect(hardening).not.toMatch(/\bDROP\s+(TABLE|COLUMN|SCHEMA)\b/i);
    expect(hardening).not.toMatch(/\bDELETE\s+FROM\b/i);
    expect(hardening).not.toMatch(/^\s*TRUNCATE\b/im);
  });

  it("gates network publication on exposure approval AND an active Associate", () => {
    expect(hardening).toContain(
      "FUNCTION public.is_network_publishable_business(_business_id uuid)",
    );
    expect(hardening).toContain("public.is_active_associate(_business_id)");
    expect(hardening).toContain("SET search_path = public, pg_temp");
    expect(hardening).toMatch(
      /REVOKE ALL ON FUNCTION public\.is_network_publishable_business\(uuid\) FROM PUBLIC;/,
    );
  });

  it("removes table-level anon SELECT and grants only projection columns", () => {
    expect(hardening).toContain("REVOKE ALL ON public.business_inventory_items FROM anon;");
    const grant = /GRANT SELECT \(([^)]*)\)\s+ON public\.business_inventory_items TO anon;/.exec(
      hardening,
    );
    expect(grant).not.toBeNull();
    const columns = grant![1].split(",").map((c) => c.trim());
    for (const secret of [
      "cost",
      "notes",
      "location",
      "supplier",
      "markup_percentage",
      "reorder_at",
    ]) {
      expect(columns).not.toContain(secret);
    }
  });

  it("limits the base-table network policy to anon and the publishable gate", () => {
    expect(hardening).toMatch(
      /CREATE POLICY "inv: public network read"\s+ON public\.business_inventory_items FOR SELECT\s+TO anon\s+USING/,
    );
    expect(hardening).toMatch(/AND public\.is_network_publishable_business\(b\.id\);/);
    expect(hardening).not.toMatch(/JOIN public\.business_associate_applications/);
  });

  it("keeps network_stock column-compatible with the previous projection", () => {
    const previous = read(
      "supabase/migrations/20260831114500_associate_privacy_customer_vehicle_ledger.sql",
    );
    const selectList = (sql: string) => {
      const view = sql.slice(sql.lastIndexOf("VIEW public.network_stock"));
      return view
        .slice(
          view.indexOf("SELECT") + "SELECT".length,
          view.indexOf("FROM public.business_inventory_items"),
        )
        .replace(/\s+/g, " ")
        .trim();
    };
    expect(selectList(hardening)).toBe(selectList(previous));
  });

  it("blocks owner self-approval of network exposure", () => {
    expect(hardening).toContain("CREATE TRIGGER trg_guard_business_network_exposure");
    expect(hardening).toContain("NOT IN ('pending', 'none')");
    expect(hardening).toContain("public.can_moderate((select auth.uid()))");
  });

  it("binds inquiry identity and empties lifecycle fields on insert", () => {
    expect(hardening).toContain('DROP POLICY IF EXISTS "npi: anyone insert"');
    expect(hardening).toMatch(/"npi: guest insert"[\s\S]*requester_user_id IS NULL/);
    expect(hardening).toMatch(
      /"npi: signed-in insert"[\s\S]*requester_user_id = \(select auth\.uid\(\)\)/,
    );
    expect(hardening).toContain("AND status = 'pending'");
  });

  it("makes RPC-only commercial tables read-only for API roles", () => {
    expect(hardening).toMatch(
      /REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER\s+ON public\.parts_orders/,
    );
    expect(hardening).toContain("REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon");
  });
});

describe("App code aligned with the hardened policies", () => {
  it("submits inquiries without RETURNING and with the caller's own session", () => {
    const fn = read("src/lib/network-stock.functions.ts");
    const handler = fn.slice(fn.indexOf("export const submitNetworkPartInquiry"));
    const body = handler.slice(0, handler.indexOf("export const NETWORK_INQUIRY_STATUSES"));
    expect(body).toContain("buildNetworkInquiryRow");
    expect(body).toContain("userClient(token)");
    expect(body).toContain("crypto.randomUUID()");
    expect(body).not.toContain(".select(");
  });

  it("keeps the public network feed fresh for signed-in users", () => {
    expect(read("src/routes/parts.network.tsx")).toContain("refetchInterval: 60_000");
  });
});
