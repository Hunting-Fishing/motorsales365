import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Structural test: the compliance disclosure strip in
 * dashboard.promoter-resources.tsx must render ABOVE the <Tabs>
 * (ad examples / placement / walkthrough). This guards against future
 * refactors that would push the mandatory FTC/DTI disclosure below
 * the fold or below the templates it applies to.
 */
describe("promoter resources — compliance strip placement", () => {
  const source = readFileSync(
    resolve(__dirname, "../routes/dashboard.promoter-resources.tsx"),
    "utf8",
  );

  it("renders the compliance strip before the <Tabs> block", () => {
    const stripIdx = source.indexOf("Disclosure required on every post");
    const tabsIdx = source.indexOf("<Tabs");
    expect(stripIdx, "compliance strip copy not found").toBeGreaterThan(-1);
    expect(tabsIdx, "<Tabs block not found").toBeGreaterThan(-1);
    expect(stripIdx).toBeLessThan(tabsIdx);
  });

  it("compliance strip includes the exact required snippet in its Copy button", () => {
    const required =
      "Disclosure: I may earn a commission if you sign up through my 365 Motor Sales link. #365MotorSalesPartner";
    expect(source).toContain(required);
  });

  it("every ad template body contains the exact required disclosure line", () => {
    const required =
      "Disclosure: I may earn a commission if you sign up through my 365 Motor Sales link. #365MotorSalesPartner";
    const block = source.split("const AD_EXAMPLES")[1]?.split("const PLACEMENT_TIPS")[0] ?? "";
    const bodies = block.split(/\{\s*\n\s*channel:/).slice(1);
    expect(bodies.length).toBeGreaterThanOrEqual(6);
    for (const body of bodies) {
      expect(body).toContain(required);
    }
  });
});
