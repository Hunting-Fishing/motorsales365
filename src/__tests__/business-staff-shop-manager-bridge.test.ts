import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("business staff Shop Manager bridge", () => {
  const sql = read("supabase/migrations/20260901025424_business_staff_shop_manager_bridge.sql");

  it("provisions one shop and profile per source identity", () => {
    expect(sql).toContain("shops_one_per_business");
    expect(sql).toContain("profiles_one_per_auth_user");
    expect(sql).toContain("sync_business_staff_member");
    expect(sql).toContain("Front Counter");
  });

  it("maps business roles into Shop Manager roles", () => {
    for (const role of ["owner", "manager", "dispatch", "truck_driver", "technician", "office_admin"])
      expect(sql).toContain(`'${role}'`);
  });

  it("keeps business owners authoritative over stale staff roles", () => {
    expect(sql).toContain("v_business.owner_id = _user_id");
    expect(sql).toContain("THEN 'owner'");
  });

  it("cuts access and closes active work on deactivation", () => {
    expect(sql).toContain("Employee access deactivated");
    expect(sql).toContain("SET status='manager_closed'");
    expect(sql).toContain("SET status='clocked_out'");
    expect(sql).toContain("SET shop_id=NULL");
  });

  it("does not expose the internal provisioning function", () => {
    expect(sql).toContain("FROM PUBLIC, anon, authenticated");
    expect(sql).toContain("TO service_role");
  });

  it("keeps drivers out of counter-sale RPCs", () => {
    const counterSql = read("supabase/migrations/20260901025813_enforce_counter_operator_roles.sql");
    expect(counterSql).toContain("can_operate_counter");
    expect(counterSql).toContain("Counter permission required");
    expect(counterSql).not.toContain("'truck_driver'");
  });

  it("exposes Shop Manager and operations from authenticated navigation", () => {
    const header = read("src/components/site-header.tsx");
    const modules = read("src/lib/business-workspace/modules.ts");
    const businessRoute = read("src/routes/dashboard.business.$businessId.operations.tsx");
    expect(header).toContain("Open Shop Manager");
    expect(header).toContain("Employee operations");
    expect(modules).toContain("/dashboard/business/${id}/operations");
    expect(businessRoute).toContain("<EmployeeOperations embedded />");
  });

  it("provides a private, owner-resettable towing playground", () => {
    const demoSql = read("supabase/migrations/20260901032848_test_tow_company_demo_workspace.sql");
    const workspace = read("src/routes/dashboard.business.$businessId.tsx");
    expect(demoSql).toContain("network_visible=false");
    expect(demoSql).toContain("v_marker,true,false");
    expect(demoSql).toContain("owner_id=(SELECT auth.uid())");
    expect(demoSql).toContain("notes=v_marker");
    expect(workspace).toContain("Reset demo");
    expect(workspace).toContain("Playground");
  });
});
