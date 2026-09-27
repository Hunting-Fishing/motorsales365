import { describe, expect, it } from "vitest";
import {
  bearerToken,
  buildNetworkInquiryRow,
  NETWORK_INQUIRY_BUYER_COLUMNS,
  NETWORK_INQUIRY_PARTNER_COLUMNS,
} from "./network-inquiry";

const input = {
  business_id: "11111111-1111-4111-8111-111111111111",
  part_name: "Front brake pad",
  contact_name: "Juan Dela Cruz",
  contact_email: "juan@example.test",
};

describe("buildNetworkInquiryRow", () => {
  it("builds a guest row with no requester and sensible defaults", () => {
    const row = buildNetworkInquiryRow(input, { id: "id-1", requesterUserId: null });
    expect(row).toEqual({
      id: "id-1",
      business_id: input.business_id,
      item_id: null,
      sku: null,
      part_name: "Front brake pad",
      quantity: 1,
      contact_name: "Juan Dela Cruz",
      contact_email: "juan@example.test",
      contact_phone: null,
      message: null,
      requester_user_id: null,
    });
  });

  it("attaches only the verified caller as requester", () => {
    const row = buildNetworkInquiryRow(
      { ...input, quantity: 4, sku: "BP-1", item_id: "item-1", message: "ETA?" },
      { id: "id-2", requesterUserId: "user-1" },
    );
    expect(row.requester_user_id).toBe("user-1");
    expect(row.quantity).toBe(4);
    expect(row.sku).toBe("BP-1");
    expect(row.item_id).toBe("item-1");
  });

  it("never emits partner-owned lifecycle columns, even if smuggled in", () => {
    const smuggled = {
      ...input,
      status: "accepted",
      fulfilled_price: 1,
      reserved_quantity: 99,
      requester_user_id: "someone-else",
    } as unknown as typeof input;
    const row = buildNetworkInquiryRow(smuggled, { id: "id-3", requesterUserId: null });
    for (const column of NETWORK_INQUIRY_PARTNER_COLUMNS) {
      expect(row).not.toHaveProperty(column);
    }
    expect(row.requester_user_id).toBeNull();
    expect(Object.keys(row).sort()).toEqual([...NETWORK_INQUIRY_BUYER_COLUMNS].sort());
  });

  it("keeps buyer and partner column sets disjoint", () => {
    const partner = new Set<string>(NETWORK_INQUIRY_PARTNER_COLUMNS);
    expect(NETWORK_INQUIRY_BUYER_COLUMNS.filter((c) => partner.has(c))).toEqual([]);
  });
});

describe("bearerToken", () => {
  it("extracts bearer tokens case-insensitively", () => {
    expect(bearerToken("Bearer abc.def")).toBe("abc.def");
    expect(bearerToken("bearer abc")).toBe("abc");
    expect(bearerToken("  Bearer   xyz  ")).toBe("xyz");
  });

  it("rejects missing or non-bearer values", () => {
    expect(bearerToken(undefined)).toBeNull();
    expect(bearerToken(null)).toBeNull();
    expect(bearerToken("")).toBeNull();
    expect(bearerToken("Basic abc")).toBeNull();
    expect(bearerToken("Bearer")).toBeNull();
    expect(bearerToken("Bearer a b")).toBeNull();
  });
});
