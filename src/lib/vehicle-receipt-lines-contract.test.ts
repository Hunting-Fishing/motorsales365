// Pure display contract only; no SQL, Auth, storage or multi-page snapshot proof.
import { describe, expect, it, vi } from "vitest";
import {
  RECEIPT_LINES_PAGE_SIZE,
  RECEIPT_LINES_FAILURE,
  RECEIPT_LINES_ITEM_PROJECTION,
  RECEIPT_LINES_PARENT_PROJECTION,
  receiptLinesRequestSchema,
  parseReceiptLinesParentResponse,
  parseReceiptLinesPageResponse,
  parseReceiptLinesPage,
  parseReceiptLinesReadResponse,
} from "./vehicle-receipt-lines-contract";
import { receiptReadProjections } from "./vehicle-receipt-read-contract";
const uid = (n: number) => `00000000-aaaa-4000-8000-${String(n).padStart(12, "0")}`;
const account = uid(1),
  vehicle = uid(2),
  shop = uid(3),
  receiptId = uid(4);
const intent = (page = 0, isShop = false) =>
  receiptLinesRequestSchema.parse({
    expectedAccountId: account,
    receiptId,
    ...(isShop ? { shopVehicleId: shop } : { vehicleId: vehicle }),
    page,
  });
const parent = (changes: Record<string, unknown> = {}) => ({
  id: receiptId,
  vehicle_id: vehicle,
  shop_vehicle_id: null,
  share_with_shop: false,
  ...changes,
});
const line = (index = 0, changes: Record<string, unknown> = {}) => ({
  id: uid(100 + index),
  receipt_id: receiptId,
  description: `Retained line ${index}`,
  category: "fluids",
  brand: null,
  part_number: null,
  quantity: 1,
  total: 0.123456789012345,
  confidence: 1,
  reviewed: true,
  installed_on: null,
  odometer_km: null,
  public_summary_allowed: false,
  sort_order: index,
  installed_by: null,
  installation_origin: null,
  ...changes,
});
const response = (data: unknown, count?: unknown, error: unknown = null) => ({
  data,
  count,
  error,
});

describe("bounded display-only receipt line request", () => {
  it("pins page100, exact minimal parent and unchanged native item projection", () => {
    expect(RECEIPT_LINES_PAGE_SIZE).toBe(100);
    expect(RECEIPT_LINES_PARENT_PROJECTION).toBe("id,vehicle_id,shop_vehicle_id,share_with_shop");
    expect(RECEIPT_LINES_ITEM_PROJECTION).toBe(receiptReadProjections.item);
    expect(
      receiptLinesRequestSchema.parse({
        expectedAccountId: account,
        receiptId,
        vehicleId: vehicle,
      }),
    ).toEqual(intent());
  });
  it.each([
    null,
    {},
    { expectedAccountId: account, receiptId },
    { ...intent(), shopVehicleId: shop },
    { ...intent(), vehicleId: null },
    { ...intent(), receiptId: "opaque" },
    { ...intent(), expectedAccountId: "opaque" },
    { ...intent(), limit: 1000 },
    { ...intent(), page: -1 },
    { ...intent(), page: 0.5 },
    { ...intent(), page: "1" },
    { ...intent(), page: 1_000_001 },
    { ...intent(), page: Infinity },
  ])("rejects malformed or broadened input %j", (raw) => {
    expect(() => receiptLinesRequestSchema.parse(raw)).toThrow();
  });
  it("rejects inherited/accessor/hidden/symbol inputs without invoking getters", () => {
    const get = vi.fn(() => vehicle),
      accessor = { expectedAccountId: account, receiptId };
    Object.defineProperty(accessor, "vehicleId", { get, enumerable: true });
    const hidden = { ...intent() };
    Object.defineProperty(hidden, "receiptId", { value: receiptId, enumerable: false });
    for (const value of [
      Object.create(intent()),
      accessor,
      hidden,
      { ...intent(), [Symbol("hidden")]: true },
    ])
      expect(() => receiptLinesRequestSchema.parse(value)).toThrow();
    expect(get).not.toHaveBeenCalled();
  });
  it("does not adopt an absent target from Object.prototype", () => {
    const original = Object.getOwnPropertyDescriptor(Object.prototype, "shopVehicleId");
    try {
      Object.defineProperty(Object.prototype, "shopVehicleId", { value: shop, configurable: true });
      expect(
        receiptLinesRequestSchema.parse({
          expectedAccountId: account,
          receiptId,
          vehicleId: vehicle,
        }),
      ).toMatchObject({ vehicleId: vehicle });
      expect(() =>
        receiptLinesRequestSchema.parse({ expectedAccountId: account, receiptId }),
      ).toThrow();
    } finally {
      if (original) Object.defineProperty(Object.prototype, "shopVehicleId", original);
      else Reflect.deleteProperty(Object.prototype, "shopVehicleId");
    }
  });
});

describe("visible exact receipt/selected-target and linked consent", () => {
  it("preserves owner/direct shop dual-FK rows and requires explicit sharing only on linked path", () => {
    expect(parseReceiptLinesParentResponse(response(parent()), intent(), null)).toEqual(parent());
    const both = parent({ shop_vehicle_id: shop });
    expect(parseReceiptLinesParentResponse(response(both), intent(0, true), null)).toEqual(both);
    expect(
      parseReceiptLinesParentResponse(
        response(parent({ share_with_shop: true })),
        intent(0, true),
        vehicle,
      ),
    ).toMatchObject({ id: receiptId });
    expect(() =>
      parseReceiptLinesParentResponse(response(parent()), intent(0, true), vehicle),
    ).toThrow(RECEIPT_LINES_FAILURE);
  });
  it.each([
    null,
    [],
    parent({ id: uid(99) }),
    parent({ vehicle_id: uid(99) }),
    parent({ vehicle_id: null, shop_vehicle_id: null }),
    parent({ share_with_shop: "true" }),
    { ...parent(), private: true },
    { id: receiptId, vehicle_id: vehicle, shop_vehicle_id: null },
  ])("denies malformed/misbound parent %j", (row) => {
    expect(() => parseReceiptLinesParentResponse(response(row), intent(), null)).toThrow(
      RECEIPT_LINES_FAILURE,
    );
  });
  it("denies absent/wrong link and owner-with-link ambiguity without claiming ownership from visibility", () => {
    for (const linked of [null, uid(99)])
      expect(() =>
        parseReceiptLinesParentResponse(
          response(parent({ share_with_shop: true })),
          intent(0, true),
          linked,
        ),
      ).toThrow();
    expect(() => parseReceiptLinesParentResponse(response(parent()), intent(), vehicle)).toThrow();
  });
  it("accepts UUID case aliases as bindings but not arbitrary strings", () => {
    expect(
      parseReceiptLinesParentResponse(
        response(parent({ id: receiptId.toUpperCase(), vehicle_id: vehicle.toUpperCase() })),
        intent(),
        null,
      ).id,
    ).toBe(receiptId.toUpperCase());
  });
});

describe("strict counted100-line windows without writable completion flags", () => {
  it.each([0, 1, 99, 100, 101, 200, 201])("count%j remains a window at every page", (count) => {
    for (const page of [0, 1, 2, 3]) {
      const length = Math.min(100, Math.max(0, count - page * 100));
      const rows = Array.from({ length }, (_, i) => line(page * 100 + i));
      const parsed = parseReceiptLinesPageResponse(response(rows, count), intent(page));
      expect(parsed).toMatchObject({
        receiptId,
        vehicleId: vehicle,
        shopVehicleId: null,
        page,
        totalCount: count,
        hasNext: page * 100 + length < count,
      });
      expect(parsed.items).toHaveLength(length);
      expect(Object.keys(parsed).sort()).toEqual(
        [
          "receiptId",
          "vehicleId",
          "shopVehicleId",
          "page",
          "totalCount",
          "hasNext",
          "items",
        ].sort(),
      );
      expect(parsed).not.toHaveProperty("items_complete");
      expect(parsed).not.toHaveProperty("edit_eligible");
      expect(Object.isFrozen(parsed) && Object.isFrozen(parsed.items)).toBe(true);
      expect(parseReceiptLinesPage(parsed, intent(page))).toEqual(parsed);
      if (length) expect(Object.isFrozen(parsed.items[0])).toBe(true);
    }
  });
  it.each([undefined, null, "1", -1, 0.5, Infinity, NaN, Number.MAX_SAFE_INTEGER + 1])(
    "denies unknown/invalid count %j",
    (count) => {
      expect(() => parseReceiptLinesPageResponse(response([], count), intent())).toThrow(
        RECEIPT_LINES_FAILURE,
      );
    },
  );
  it.each([0, 1, 2])("denies missing/extra/lower-cap page rows at page%d", (page) => {
    const count = page * 100 + 2;
    for (const rows of [[], [line()], [line(0), line(1), line(2)]])
      expect(() => parseReceiptLinesPageResponse(response(rows, count), intent(page))).toThrow();
  });
  it("denies oversized, sparse, accessor, inherited and extra-property arrays", () => {
    const get = vi.fn(() => line()),
      accessor = new Array(1);
    Object.defineProperty(accessor, "0", { get, enumerable: true });
    for (const rows of [
      Array.from({ length: 101 }, (_, i) => line(i)),
      new Array(1),
      accessor,
      Object.assign([line()], { private: true }),
    ])
      expect(() =>
        parseReceiptLinesPageResponse(
          response(rows, Array.isArray(rows) ? rows.length : 1),
          intent(),
        ),
      ).toThrow();
    expect(get).not.toHaveBeenCalled();
  });
  it("binds every receipt, duplicate case alias and negative/tied sort-order with UUID tiebreak", () => {
    const first = line(0, { sort_order: -10 }),
      second = line(1, { sort_order: -10 });
    expect(
      parseReceiptLinesPageResponse(response([first, second], 2), intent()).items,
    ).toHaveLength(2);
    for (const rows of [
      [second, first],
      [first, { ...first, id: first.id.toUpperCase() }],
      [line(0, { receipt_id: uid(99) })],
      [line(0, { sort_order: 10 }), line(1, { sort_order: 0 })],
    ])
      expect(() => parseReceiptLinesPageResponse(response(rows, rows.length), intent())).toThrow();
  });
  it("preserves native retained values, strips installation internals and detaches SDK objects", () => {
    const raw = line(0, {
      description: "  retained  ",
      quantity: 1e-14,
      total: 1e-25,
      installed_on: "0001-01-01 BC",
      installed_by: account,
      installation_origin: "business_attested",
      odometer_km: 0,
    });
    const parsed = parseReceiptLinesPageResponse(response([raw], 101), intent(1));
    expect(parsed.items[0]).toMatchObject({
      description: "  retained  ",
      quantity: 1e-14,
      total: 1e-25,
      installed_on: "0001-01-01 BC",
      odometer_km: 0,
    });
    expect(parsed.items[0]).not.toHaveProperty("installed_by");
    expect(parsed.items[0]).not.toHaveProperty("installation_origin");
    raw.description = "Changed later";
    expect(parsed.items[0].description).toBe("  retained  ");
    expect(parseReceiptLinesPage(parsed, intent(1))).toEqual(parsed);
  });
  it.each([
    { id: "opaque" },
    { quantity: "1" },
    { quantity: 0 },
    { total: -1 },
    { total: Infinity },
    { installed_on: "" },
    { reviewed: 1 },
    { public_summary_allowed: "true" },
    { sort_order: null },
    { installed_by: "opaque" },
    { installation_origin: "verified" },
    { confidence: 2 },
    { description: "\u0000" },
  ])("denies malformed native line fields %j", (change) => {
    expect(() => parseReceiptLinesPageResponse(response([line(0, change)], 1), intent())).toThrow();
  });
});

describe("own SDK/error and browser envelope boundaries", () => {
  it.each([undefined, false, "", 0, { message: "PRIVATE" }])(
    "requires explicit error:null with otherwise valid data: %j",
    (error) => {
      expect(() =>
        parseReceiptLinesPageResponse({ data: [line()], count: 1, error }, intent()),
      ).toThrow(RECEIPT_LINES_FAILURE);
      expect(() =>
        parseReceiptLinesParentResponse({ data: parent(), error }, intent(), null),
      ).toThrow(RECEIPT_LINES_FAILURE);
    },
  );
  it("accepts inert SDK metadata but rejects inherited/accessor/nonenumerable consumed fields", () => {
    expect(
      parseReceiptLinesReadResponse({ data: [line()], count: 1, error: null, status: 200 }, true),
    ).toMatchObject({ error: null, count: 1 });
    const get = vi.fn(() => null);
    for (const field of ["data", "error", "count"]) {
      const value = response([line()], 1);
      Object.defineProperty(value, field, { get, enumerable: true });
      expect(() => parseReceiptLinesReadResponse(value, true)).toThrow();
      const hidden = response([line()], 1);
      Object.defineProperty(hidden, field, { value: null, enumerable: false });
      expect(() => parseReceiptLinesReadResponse(hidden, true)).toThrow();
    }
    expect(() =>
      parseReceiptLinesReadResponse(Object.create(response([line()], 1)), true),
    ).toThrow();
    expect(get).not.toHaveBeenCalled();
  });
  it("validates exact chosen target/page/count/hasNext and disallows writer/internal flags", () => {
    const valid = parseReceiptLinesPageResponse(response([line()], 101), intent(1));
    for (const change of [
      { receiptId: uid(99) },
      { vehicleId: uid(99) },
      { shopVehicleId: shop },
      { page: 0 },
      { totalCount: 200 },
      { hasNext: true },
      { items_complete: true },
      { edit_eligible: true },
      { can_write: true },
      { items: [{ ...valid.items[0], installed_by: account }] },
    ])
      expect(() => parseReceiptLinesPage({ ...valid, ...change }, intent(1))).toThrow(
        RECEIPT_LINES_FAILURE,
      );
    expect(() => parseReceiptLinesPage(valid, intent(1, true))).toThrow();
    const get = vi.fn(() => valid.items),
      accessor = { ...valid };
    Object.defineProperty(accessor, "items", { get, enumerable: true });
    expect(() => parseReceiptLinesPage(accessor, intent(1))).toThrow();
    expect(get).not.toHaveBeenCalled();
  });
});
