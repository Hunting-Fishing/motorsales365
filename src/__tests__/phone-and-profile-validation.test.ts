// Regression coverage for the two shared identity validators:
//   - validatePhone (per-country digit ranges + mobile prefixes, trunk strip,
//     E.164 output)
//   - getProfileMissingFields / isAddressValid / isPostalValid (the same
//     rules the signup form, /complete-profile, and the server functions
//     apply to phone + address completeness)
//
// If any of these break, both the client form and the server gate silently
// change behavior — keep the country matrix and address matrix representative.

import { describe, expect, it } from "vitest";
import { validatePhone, buildE164, formatNational } from "@/data/country-codes";
import {
  getProfileMissingFields,
  isAddressValid,
  isPostalValid,
  isE164Valid,
  isBusinessLike,
  type ProfileForCheck,
} from "@/lib/profile-validation";

describe("validatePhone", () => {
  it("rejects an unknown ISO code", () => {
    const r = validatePhone("ZZ", "9694343430");
    expect(r.valid).toBe(false);
    expect(r.message).toMatch(/pick a country/i);
  });

  it("rejects empty input", () => {
    expect(validatePhone("PH", "").valid).toBe(false);
    expect(validatePhone("PH", "   ").valid).toBe(false);
  });

  it("rejects non-digit input", () => {
    const r = validatePhone("PH", "abc-def");
    expect(r.valid).toBe(false);
    expect(r.message).toMatch(/digits only/i);
  });

  describe("Philippines (PH)", () => {
    it("accepts a bare 10-digit mobile", () => {
      const r = validatePhone("PH", "9694343430");
      expect(r).toEqual({ valid: true, e164: "+639694343430" });
    });

    it("strips the leading 0 trunk prefix", () => {
      const r = validatePhone("PH", "09694343430");
      expect(r).toEqual({ valid: true, e164: "+639694343430" });
    });

    it("accepts formatting characters (dashes, spaces, parens)", () => {
      const r = validatePhone("PH", "0969-434-3430");
      expect(r.valid).toBe(true);
      expect(r.e164).toBe("+639694343430");
    });

    it("rejects landline prefix (must start with 9)", () => {
      const r = validatePhone("PH", "2123456789");
      expect(r.valid).toBe(false);
      expect(r.message).toMatch(/start with 9/i);
    });

    it("rejects too-short numbers", () => {
      const r = validatePhone("PH", "96943434");
      expect(r.valid).toBe(false);
      expect(r.message).toMatch(/10 digits/);
    });

    it("rejects too-long numbers", () => {
      const r = validatePhone("PH", "96943434301");
      expect(r.valid).toBe(false);
    });
  });

  describe("United States (US)", () => {
    it("accepts a 10-digit number regardless of leading digit", () => {
      expect(validatePhone("US", "4155551234")).toEqual({
        valid: true,
        e164: "+14155551234",
      });
    });

    it("accepts (415) 555-1234 formatting", () => {
      const r = validatePhone("US", "(415) 555-1234");
      expect(r.valid).toBe(true);
      expect(r.e164).toBe("+14155551234");
    });

    it("rejects 9 digits", () => {
      expect(validatePhone("US", "415555123").valid).toBe(false);
    });
  });

  describe("United Kingdom (GB)", () => {
    it("accepts a mobile starting with 7 after trunk strip", () => {
      expect(validatePhone("GB", "07911123456")).toEqual({
        valid: true,
        e164: "+447911123456",
      });
    });

    it("rejects landline starting with 2", () => {
      const r = validatePhone("GB", "2079460000");
      expect(r.valid).toBe(false);
      expect(r.message).toMatch(/start with 7/);
    });
  });

  describe("Singapore (SG)", () => {
    it("accepts 8-digit mobile starting with 8", () => {
      expect(validatePhone("SG", "81234567")).toEqual({
        valid: true,
        e164: "+6581234567",
      });
    });

    it("accepts 8-digit mobile starting with 9", () => {
      expect(validatePhone("SG", "91234567").valid).toBe(true);
    });

    it("rejects landline starting with 6", () => {
      expect(validatePhone("SG", "61234567").valid).toBe(false);
    });
  });

  describe("Australia (AU)", () => {
    it("accepts 9-digit mobile starting with 4, trunk stripped", () => {
      expect(validatePhone("AU", "0412345678")).toEqual({
        valid: true,
        e164: "+61412345678",
      });
    });

    it("rejects wrong prefix", () => {
      expect(validatePhone("AU", "312345678").valid).toBe(false);
    });
  });

  describe("India (IN)", () => {
    it.each([
      ["6", "6123456789"],
      ["7", "7123456789"],
      ["8", "8123456789"],
      ["9", "9123456789"],
    ])("accepts mobile prefix %s", (_prefix, num) => {
      expect(validatePhone("IN", num)).toEqual({ valid: true, e164: "+91" + num });
    });

    it("rejects prefix 5", () => {
      expect(validatePhone("IN", "5123456789").valid).toBe(false);
    });
  });

  describe("Indonesia (ID) variable length", () => {
    it("accepts 9-digit mobile", () => {
      expect(validatePhone("ID", "812345678")).toEqual({
        valid: true,
        e164: "+62812345678",
      });
    });

    it("accepts 12-digit mobile (upper bound)", () => {
      expect(validatePhone("ID", "812345678901").valid).toBe(true);
    });

    it("rejects 13-digit (over bound)", () => {
      expect(validatePhone("ID", "8123456789012").valid).toBe(false);
    });
  });

  describe("countries without a mobilePrefix rule (e.g. JP)", () => {
    it("accepts any 10-digit number", () => {
      // JP has min:10,max:11 and no prefix constraint.
      expect(validatePhone("JP", "9012345678").valid).toBe(true);
      expect(validatePhone("JP", "3012345678").valid).toBe(true);
    });
  });

  it("buildE164 mirrors validatePhone output for the happy path", () => {
    expect(buildE164("PH", "09694343430")).toBe("+639694343430");
    expect(buildE164("US", "(415) 555-1234")).toBe("+14155551234");
  });

  it("formatNational groups PH digits as 3-3-4", () => {
    expect(formatNational("9694343430", "PH")).toBe("969-434-3430");
  });
});

describe("isE164Valid", () => {
  it("returns true only when validatePhone accepts the pair", () => {
    expect(isE164Valid("PH", "9694343430")).toBe(true);
    expect(isE164Valid("PH", "1234567890")).toBe(false);
    expect(isE164Valid("", "9694343430")).toBe(false);
    expect(isE164Valid("PH", "")).toBe(false);
  });
});

describe("isPostalValid", () => {
  it.each([
    ["1000", true],
    ["94103", true],
    ["SW1A 1AA", true],
    ["K1A-0B1", true],
    ["", false],
    ["   ", false],
    ["ab", false], // too short (regex needs 3+ chars total)
    [" 1234567890123 ", false], // too long
    ["!!!", false], // disallowed chars
    ["-1234", false], // can't start with dash
  ])("isPostalValid(%p) === %s", (input, expected) => {
    expect(isPostalValid(input)).toBe(expected);
  });
});

describe("isAddressValid", () => {
  it.each([
    ["123 Rizal St", true],
    ["Unit 4, 88 Ortigas Ave.", true],
    ["9A EDSA", true],
    ["", false],
    ["Rizal Street", false], // missing number
    ["12345", false], // missing street name
    ["1 St", false], // too short overall (<5)
  ])("isAddressValid(%p) === %s", (input, expected) => {
    expect(isAddressValid(input)).toBe(expected);
  });
});

describe("isBusinessLike", () => {
  it("detects business/service intents", () => {
    expect(isBusinessLike({ signup_intent: "business" })).toBe(true);
    expect(isBusinessLike({ signup_intent: "service_provider" })).toBe(true);
    expect(isBusinessLike({ signup_intent: "buyer" })).toBe(false);
  });

  it("detects business seller_type values", () => {
    expect(isBusinessLike({ seller_type: "dealer" })).toBe(true);
    expect(isBusinessLike({ seller_type: "repair_shop" })).toBe(true);
    expect(isBusinessLike({ seller_type: "insurance" })).toBe(true);
    expect(isBusinessLike({ seller_type: "private" })).toBe(false);
  });
});

describe("getProfileMissingFields", () => {
  const emptyBuyer: ProfileForCheck = {
    phone_e164: null,
    street_address: null,
    postal_code: null,
    business_address: null,
    business_postal_code: null,
    signup_intent: "buyer",
    seller_type: "private",
  };

  it("flags phone + street + postal for a fresh buyer profile", () => {
    const missing = getProfileMissingFields(emptyBuyer).map((m) => m.field);
    expect(missing).toEqual(
      expect.arrayContaining(["phone", "street-address", "postal-code"]),
    );
    expect(missing).not.toContain("business-address");
  });

  it("returns [] when a buyer profile has valid phone + street + postal", () => {
    const missing = getProfileMissingFields({
      ...emptyBuyer,
      phone_e164: "+639694343430",
      street_address: "123 Rizal St",
      postal_code: "1000",
    });
    expect(missing).toEqual([]);
  });

  it("rejects an invalid E.164 phone value", () => {
    const missing = getProfileMissingFields({
      ...emptyBuyer,
      phone_e164: "0639694343430", // no + prefix
      street_address: "123 Rizal St",
      postal_code: "1000",
    });
    expect(missing.map((m) => m.field)).toContain("phone");
  });

  it("rejects an address missing a house number", () => {
    const missing = getProfileMissingFields({
      ...emptyBuyer,
      phone_e164: "+639694343430",
      street_address: "Rizal Street",
      postal_code: "1000",
    });
    expect(missing.map((m) => m.field)).toContain("street-address");
  });

  it("rejects an invalid postal code", () => {
    const missing = getProfileMissingFields({
      ...emptyBuyer,
      phone_e164: "+639694343430",
      street_address: "123 Rizal St",
      postal_code: "!!!",
    });
    expect(missing.map((m) => m.field)).toContain("postal-code");
  });

  describe("business-like intents", () => {
    const emptyBusiness: ProfileForCheck = {
      phone_e164: null,
      street_address: null,
      postal_code: null,
      business_address: null,
      business_postal_code: null,
      signup_intent: "business",
      seller_type: "dealer",
    };

    it("checks business_address / business_postal_code instead of personal ones", () => {
      const missing = getProfileMissingFields(emptyBusiness).map((m) => m.field);
      expect(missing).toEqual(
        expect.arrayContaining(["phone", "business-address", "business-postal-code"]),
      );
      expect(missing).not.toContain("street-address");
      expect(missing).not.toContain("postal-code");
    });

    it("passes with valid business fields", () => {
      const missing = getProfileMissingFields({
        ...emptyBusiness,
        phone_e164: "+639694343430",
        business_address: "88 Ortigas Ave.",
        business_postal_code: "1600",
      });
      expect(missing).toEqual([]);
    });

    it("falls back to postal_code when business_postal_code is missing", () => {
      const missing = getProfileMissingFields({
        ...emptyBusiness,
        phone_e164: "+639694343430",
        business_address: "88 Ortigas Ave.",
        business_postal_code: null,
        postal_code: "1600",
      });
      // business-postal-code should be considered satisfied via postal_code fallback
      expect(missing.map((m) => m.field)).not.toContain("business-postal-code");
    });

    it("also treats service_provider intent as business-like", () => {
      const missing = getProfileMissingFields({
        ...emptyBusiness,
        signup_intent: "service_provider",
        seller_type: "private",
      }).map((m) => m.field);
      expect(missing).toContain("business-address");
    });
  });
});
