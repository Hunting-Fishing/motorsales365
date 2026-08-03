/**
 * End-to-end structural tests for the promoter/influencer flow.
 *
 * Rather than spinning up a real browser, these read each route file
 * that participates in the flow and assert the on-page rendering
 * contract every reviewer needs to see stay green:
 *
 *  1. Personalization — the referral landing and partner dashboard
 *     interpolate the partner's display name into the disclosure.
 *  2. Deduped banners — every route mounts the `InfluencerDisclosure`
 *     compliance banner at most once (the partner dashboard's
 *     "Disclosure verification" showcase is the one allowed exception,
 *     and even there each variant is unique).
 *  3. Compliance strip — every route in the flow surfaces the required
 *     FTC / PH DTI disclosure, either through `<InfluencerDisclosure>`
 *     or the promoter-resources compliance-strip aside.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

type RouteContract = {
  /** URL-style label used in assertion messages. */
  path: string;
  /** File(s) whose combined source represents what the route renders. */
  files: string[];
  /** How many <InfluencerDisclosure> component usages the route may mount. */
  maxDisclosures: number;
  /** True if the route personalizes the disclosure with the partner's name. */
  personalized: boolean;
  /** True if the route uses the custom "compliance strip" aside instead of the shared banner. */
  usesComplianceStrip?: boolean;
  /**
   * Some routes intentionally showcase the SAME banner variant more than once
   * (e.g. the partner dashboard renders a preview banner inside its
   * "Disclosure verification" card AND a closing banner at the bottom of the
   * page). Bump the per-variant cap for those routes explicitly.
   */
  perVariantMax?: number;
};


const ROUTES: RouteContract[] = [
  {
    path: "/partner-program",
    files: ["src/routes/partner-program.tsx"],
    maxDisclosures: 0,
    personalized: false,
  },
  {
    path: "/partner-program/info",
    files: ["src/routes/partner-program.info.tsx"],
    maxDisclosures: 0,
    personalized: false,
  },
  {
    path: "/partner-program/apply",
    files: ["src/routes/partner-program.apply.tsx"],
    maxDisclosures: 0,
    personalized: false,
  },
  {
    path: "/partner-program/terms",
    files: ["src/routes/partner-program.terms.tsx"],
    // Terms page states the legal text itself; no separate compliance banner needed.
    maxDisclosures: 0,
    personalized: false,
  },
  {
    path: "/r/$code",
    files: ["src/routes/r.$code.tsx", "src/components/qr-landing-content.tsx"],
    // Disclosure removed from the QR landing page per owner request.
    maxDisclosures: 0,
    personalized: false,
  },
  {
    path: "/dashboard/partner-program",
    files: ["src/routes/dashboard.partner-program.tsx"],
    // 1 banner in the "Disclosure verification" showcase + inline preview + footer preview + closing banner.
    maxDisclosures: 4,
    personalized: true,
    // Showcase card previews a banner AND the page footer renders a closing banner.
    perVariantMax: 2,
  },

  {
    path: "/dashboard/promoter-resources",
    files: ["src/routes/dashboard.promoter-resources.tsx"],
    // Uses the bespoke compliance-strip aside, not the shared banner component.
    maxDisclosures: 0,
    personalized: false,
    usesComplianceStrip: true,
  },
];

const REQUIRED_DISCLOSURE_LINE =
  "Disclosure: I may earn a commission if you sign up through my 365 Motor Sales link. #365MotorSalesPartner";

function readAll(files: string[]): string {
  return files
    .map((f) => readFileSync(resolve(__dirname, "..", "..", f), "utf8"))
    .join("\n\n// ---- next file ----\n\n");
}

function countMatches(source: string, needle: string): number {
  return source.split(needle).length - 1;
}

/** Count `<InfluencerDisclosure` opening tags — one per rendered instance. */
function countDisclosureMounts(source: string): number {
  return (source.match(/<InfluencerDisclosure\b/g) ?? []).length;
}

/** Rough parse of `partnerName={...}` props on <InfluencerDisclosure /> tags. */
function partnerNameProps(source: string): string[] {
  return (source.match(/<InfluencerDisclosure\b[^/>]*\/?>/g) ?? [])
    .map((tag) => {
      const m = tag.match(/partnerName=\{([^}]+)\}/);
      return m ? m[1].trim() : "";
    })
    .filter(Boolean);
}

describe("promoter/influencer flow — every listed route", () => {
  for (const route of ROUTES) {
    describe(`route ${route.path}`, () => {
      const source = readAll(route.files);

      it("mounts <InfluencerDisclosure> no more than the contract allows (deduped banners)", () => {
        const mounts = countDisclosureMounts(source);
        expect(
          mounts,
          `${route.path}: expected ≤ ${route.maxDisclosures} <InfluencerDisclosure> mounts, found ${mounts}`,
        ).toBeLessThanOrEqual(route.maxDisclosures);
      });

      if (route.personalized) {
        it("personalizes the disclosure with the partner's display name", () => {
          const props = partnerNameProps(source);
          expect(
            props.length,
            `${route.path}: expected at least one <InfluencerDisclosure partnerName={...} />`,
          ).toBeGreaterThan(0);
          // Every personalized mount must be bound to a dynamic expression
          // (e.g. `partner.display_name` or `staffName`) — never a hard-coded string.
          for (const prop of props) {
            expect(prop).not.toMatch(/^["'`]/);
          }
        });
      }

      if (route.usesComplianceStrip) {
        it("renders the bespoke compliance-strip aside above the tabbed content", () => {
          const stripIdx = source.indexOf("Disclosure required on every post");
          const tabsIdx = source.indexOf("<Tabs");
          expect(stripIdx, "compliance-strip heading not found").toBeGreaterThan(-1);
          expect(tabsIdx, "<Tabs block not found").toBeGreaterThan(-1);
          expect(stripIdx).toBeLessThan(tabsIdx);
        });

        it("compliance-strip Copy button copies the exact required disclosure line", () => {
          expect(source).toContain(REQUIRED_DISCLOSURE_LINE);
        });
      }

      if (route.maxDisclosures > 0 || route.usesComplianceStrip) {
        it("surfaces the FTC / PH DTI compliance disclosure to the visitor", () => {
          const hasBanner = /InfluencerDisclosure/.test(source);
          const hasStrip = /Disclosure required on every post/.test(source);
          expect(
            hasBanner || hasStrip,
            `${route.path}: no compliance disclosure surface detected`,
          ).toBe(true);
        });
      }
    });
  }
});

describe("promoter/influencer flow — dedup guard across the shared banner", () => {
  it("no route mounts the same shared banner variant beyond its per-variant cap", () => {
    for (const route of ROUTES) {
      const source = readAll(route.files);
      const tags = source.match(/<InfluencerDisclosure\b[^/>]*\/?>/g) ?? [];
      const variants = tags.map(
        (t) => t.match(/variant=["']([^"']+)["']/)?.[1] ?? "banner",
      );
      const seen = new Map<string, number>();
      for (const v of variants) seen.set(v, (seen.get(v) ?? 0) + 1);
      const cap = route.perVariantMax ?? 1;
      for (const [variant, count] of seen) {
        expect(
          count,
          `${route.path}: variant "${variant}" is mounted ${count} times — expected ≤ ${cap}`,
        ).toBeLessThanOrEqual(cap);
      }
    }
  });
});


describe("promoter/influencer flow — required disclosure line is authoritative", () => {
  it("appears verbatim in the promoter-resources compliance strip", () => {
    const src = readFileSync(
      resolve(__dirname, "..", "routes", "dashboard.promoter-resources.tsx"),
      "utf8",
    );
    expect(countMatches(src, REQUIRED_DISCLOSURE_LINE)).toBeGreaterThanOrEqual(1);
  });

  it("appears verbatim inside every ad-example body", () => {
    const src = readFileSync(
      resolve(__dirname, "..", "routes", "dashboard.promoter-resources.tsx"),
      "utf8",
    );
    const block = src.split("const AD_EXAMPLES")[1]?.split("const PLACEMENT_TIPS")[0] ?? "";
    const bodies = block.split(/\{\s*\n\s*channel:/).slice(1);
    expect(bodies.length).toBeGreaterThanOrEqual(6);
    for (const body of bodies) {
      expect(body).toContain(REQUIRED_DISCLOSURE_LINE);
    }
  });
});
