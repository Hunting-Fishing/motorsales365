import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(__dirname, "..", "..");
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("365 Associate Network public structure", () => {
  const page = read("src/routes/partners.index.tsx");

  it("keeps business membership separate from the promoter affiliate program", () => {
    expect(page).toContain("365 MotorSales Associate Network");
    expect(page).toContain("Promoter Program:");
    expect(page).toContain("a separate referral program");
  });

  it("routes parts suppliers and repair shops into their correct onboarding paths", () => {
    expect(page).toContain('to="/partners/parts/onboarding"');
    expect(page).toContain('to="/franchise/apply"');
    expect(page).toContain('search={{ tier: "partner" }}');
  });

  it("connects the program to the real network stock and Shop Manager surfaces", () => {
    expect(page).toContain('to="/parts/network"');
    expect(page).toContain('to="/shop-manager"');
    expect(page).toContain("VIN/chassis catalog and ordering");
    expect(page).toContain("Internal pilot");
  });

  it("uses the Associate Network name on the parts-supplier entry point", () => {
    expect(read("src/routes/partners.parts.tsx")).toContain("Supply the 365 Associate Network");
  });

  it("is discoverable from navigation, the parts hub, and the sitemap", () => {
    expect(read("src/components/site-header.tsx")).toContain(
      "365 Associate Network — shops & suppliers",
    );
    expect(read("src/components/site-footer.tsx")).toContain(
      "365 Associate Network — shops & suppliers",
    );
    expect(read("src/routes/parts.index.tsx")).toContain("Join the Associate Network");
    expect(read("src/routes/sitemap[.]xml.ts")).toContain('{ path: "/partners"');
  });
});
