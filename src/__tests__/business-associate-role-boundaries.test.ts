import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("business and Associate role boundaries", () => {
  it("does not mix legacy organization staff links into business navigation", () => {
    const dashboard = read("src/routes/dashboard.tsx");
    expect(dashboard).toContain("Shop Manager plans");
    expect(dashboard).not.toContain('to="/dashboard/team"');
    expect(dashboard).not.toContain('to="/dashboard/staff"');
  });

  it("labels Associate enrollment instead of implying membership", () => {
    const businesses = read("src/routes/dashboard.businesses.tsx");
    const workspace = read("src/routes/dashboard.business.$businessId.tsx");
    expect(businesses).toContain("Not a 365 Associate");
    expect(businesses).toContain("Join Associate Network");
    expect(workspace).toContain("Not a 365 Associate · Apply");
    expect(workspace).toContain('associateApproved={associateQ.data === "approved"}');
  });

  it("keeps Associate operations unavailable until approval", () => {
    const sidebar = read("src/components/business-workspace/sidebar.tsx");
    const operations = read("src/lib/parts-network-operations.functions.ts");
    expect(sidebar).toContain('m.id === "parts_operations" && !associateApproved');
    expect(operations).toContain("assertApprovedAssociate(context.supabase, data.businessId)");
    expect(operations).toContain('data?.status !== "approved"');
  });

  it("limits staff administration to managers and protects the owner", () => {
    const staff = read("src/lib/business-staff.functions.ts");
    expect(staff).toContain("await assertManager(supabase, userId, data.businessId)");
    expect(staff).toContain("The business owner already has full access and cannot be added as staff");
    expect(staff).toContain('.eq("business_id", data.businessId)');
    expect(staff).toContain('title: "Business owner"');
  });

  it("keeps owner access when redundant staff rows are changed or removed", () => {
    const sql = read(
      "supabase/migrations/20260901090422_correct_business_role_and_associate_boundaries.sql",
    );
    expect(sql).toContain("b.owner_id=OLD.user_id");
    expect(sql).toContain("OLD.business_id,OLD.user_id,true,'owner','Owner'");
    expect(sql).toContain("FROM PUBLIC,anon,authenticated");
  });
});
