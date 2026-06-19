import { describe, it, expect } from "vitest";
import { ADMIN_NAV, type AdminNavRole } from "@/lib/admin-nav";

const NON_ADMIN_ROLES: AdminNavRole[] = ["sales", "moderator", "support", "advertising"];

describe("ADMIN_NAV — non-admin gating", () => {
  it("every item declares at least one role", () => {
    for (const item of ADMIN_NAV) {
      expect(item.roles.length, `${item.to} has no roles`).toBeGreaterThan(0);
    }
  });

  it("admin-only items are not visible to any non-admin role", () => {
    const adminOnly = ADMIN_NAV.filter(
      (i) => i.roles.length === 1 && i.roles[0] === "admin",
    );
    for (const item of adminOnly) {
      for (const role of NON_ADMIN_ROLES) {
        expect(
          item.roles.includes(role),
          `${item.to} must not be accessible to ${role}`,
        ).toBe(false);
      }
    }
  });

  it("snapshot of role → accessible routes matrix", () => {
    const matrix: Record<string, string[]> = {};
    for (const role of ["admin", ...NON_ADMIN_ROLES] as AdminNavRole[]) {
      matrix[role] = ADMIN_NAV.filter((i) => i.roles.includes(role)).map((i) => i.to);
    }
    expect(matrix).toMatchSnapshot();
  });

  it("permission diagnostics is admin-only", () => {
    const diag = ADMIN_NAV.find((i) => i.to === "/admin/diagnostics");
    expect(diag).toBeDefined();
    expect(diag!.roles).toEqual(["admin"]);
  });
});
