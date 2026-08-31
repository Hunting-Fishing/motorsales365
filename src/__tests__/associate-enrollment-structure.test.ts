import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("Associate enrollment structure", () => {
  const migration = read("supabase/migrations/20260831113000_business_associate_enrollment.sql");

  it("keeps approval separate from editable business profiles", () => {
    expect(migration).toContain("business_associate_applications");
    expect(migration).toContain("associate_businesses_public");
    expect(migration).toContain("WHERE status = 'approved'");
    expect(migration).toContain("GRANT SELECT (business_id, track, status, approved_at)");
  });

  it("ships an atomic cleanup-verified live acceptance migration", () => {
    const acceptance = read(
      "supabase/migrations/20260831113200_associate_enrollment_acceptance_test.sql",
    );
    expect(acceptance).toContain("cross_tenant_application_denied");
    expect(acceptance).toContain("approved_public_projection");
    expect(acceptance).toContain("suspension_removes_public_projection");
    expect(acceptance).toContain("Associate acceptance cleanup failed");
  });

  it("restricts application and review operations", () => {
    expect(migration).toContain("has_business_role");
    expect(migration).toContain("has_role");
    expect(migration).toContain("REVOKE ALL ON FUNCTION public.apply_business_associate");
    expect(migration).toContain(
      "REVOKE ALL ON FUNCTION public.review_business_associate_application",
    );
  });

  it("renders approved businesses with an Associate map identity", () => {
    const map = read("src/components/businesses/businesses-map-inner.tsx");
    const directory = read("src/routes/businesses.index.tsx");
    expect(map).toContain("#f59e0b");
    expect(map).toContain("365 Associate");
    expect(directory).toContain("associate_businesses_public");
  });

  it("provides new-user, existing-user, and admin routes", () => {
    expect(read("src/routes/partners.associate.apply.tsx")).toContain("Create business account");
    expect(read("src/routes/admin.associate-applications.tsx")).toContain("Approve");
  });
});
