// Pure DTO tests, not native RLS/Auth, credential, ledger or financial acceptance.
import { describe, expect, it, vi } from "vitest";
import {
  SHOP_EXPENSE_READ_FAILURE,
  SHOP_EXPENSE_READ_PAGE_SIZE,
  shopExpenseReadProjections,
  shopExpenseScopeRequestSchema,
  shopExpenseReadRequestSchema,
  parseShopExpenseScope,
  parseShopExpenseObservedShop,
  parseShopExpensePageResponse,
  parseShopExpenseReadPage,
  parseShopExpenseSDKResponse,
  parseShopExpenseNativeDate,
  type ShopExpenseKind,
} from "./shop-expenses-read-contract";
const uid = (n: number) => `00000000-aaaa-4000-8000-${String(n).padStart(12, "0")}`;
const account = uid(1),
  shop = uid(2),
  customer = uid(3);
const request = (kind: ShopExpenseKind = "expenses", page = 0) => ({
  expectedAccountId: account,
  expectedShopId: shop,
  kind,
  page,
});
const expense = (index = 0, changes: Record<string, unknown> = {}) => ({
  id: uid(1000 - index),
  shop_id: shop,
  amount: "123456789012.34",
  tax_amount: -0.01,
  expense_date: "2026-10-16",
  payment_method: null,
  reference_number: null,
  description: "Retained expense",
  status: "recorded",
  category_id: null,
  receipt_url: null,
  vehicle_id: null,
  vehicle_receipt_id: null,
  ...changes,
});
const category = (index = 0, changes: Record<string, unknown> = {}) => ({
  id: uid(100 + index),
  shop_id: shop,
  name: `Category ${index}`,
  is_active: true,
  ...changes,
});
const vehicle = (index = 0, changes: Record<string, unknown> = {}) => ({
  id: uid(200 + index),
  customer_id: customer,
  owner_type: "customer",
  make: `Make ${index}`,
  model: "Model",
  license_plate: null,
  customers: { id: customer, shop_id: shop },
  ...changes,
});
const row = (kind: ShopExpenseKind, index = 0) =>
  kind === "expenses" ? expense(index) : kind === "categories" ? category(index) : vehicle(index);
const response = (data: unknown, count: unknown = 1, error: unknown = null) => ({
  data,
  count,
  error,
});
describe("strict account/observed-shop intent and envelopes", () => {
  it("pins fixed100-row windows and explicit LEFT native customer FK projection", () => {
    expect(SHOP_EXPENSE_READ_PAGE_SIZE).toBe(100);
    expect(shopExpenseReadProjections.expenses).toBe(
      "id,shop_id,amount,tax_amount,expense_date,payment_method,reference_number,description,status,category_id,receipt_url,vehicle_id,vehicle_receipt_id",
    );
    expect(shopExpenseReadProjections.categories).toBe("id,shop_id,name,is_active");
    expect(shopExpenseReadProjections.vehicles).toBe(
      "id,customer_id,owner_type,make,model,license_plate,customers!fk_vehicles_customer(id,shop_id)",
    );
    expect(shopExpenseReadProjections.vehicles).not.toContain("!inner");
    expect(
      shopExpenseReadRequestSchema.parse({
        expectedAccountId: account,
        expectedShopId: shop,
        kind: "expenses",
      }).page,
    ).toBe(0);
  });
  it.each([
    null,
    {},
    { ...request(), expectedAccountId: "opaque" },
    { ...request(), expectedShopId: null },
    { ...request(), kind: "all" },
    { ...request(), limit: 500 },
    { ...request(), page: -1 },
    { ...request(), page: 0.5 },
    { ...request(), page: "1" },
    { ...request(), page: Infinity },
    { ...request(), page: 1_000_001 },
  ])("rejects broadened/malformed request %j", (raw) => {
    expect(() => shopExpenseReadRequestSchema.parse(raw)).toThrow();
  });
  it("does not invoke getters or inherit/hide/symbol-carry private intent", () => {
    const get = vi.fn(() => account),
      value = { ...request() };
    Object.defineProperty(value, "expectedAccountId", { get, enumerable: true });
    const hidden = { ...request() };
    Object.defineProperty(hidden, "expectedShopId", { value: shop, enumerable: false });
    for (const raw of [
      value,
      hidden,
      Object.create(request()),
      { ...request(), [Symbol("extra")]: true },
    ])
      expect(() => shopExpenseReadRequestSchema.parse(raw)).toThrow();
    expect(get).not.toHaveBeenCalled();
    expect(() =>
      shopExpenseScopeRequestSchema.parse({ expectedAccountId: account, expectedShopId: shop }),
    ).toThrow();
  });
  it("scope availability only acknowledges an observed nullable native identifier", () => {
    expect(parseShopExpenseObservedShop(response(shop))).toBe(shop);
    expect(parseShopExpenseObservedShop(response(null))).toBe(null);
    expect(parseShopExpenseScope({ available: false, shopId: null })).toEqual({
      available: false,
      shopId: null,
    });
    expect(parseShopExpenseScope({ available: true, shopId: shop })).toEqual({
      available: true,
      shopId: shop,
    });
    for (const raw of [
      { available: true, shopId: null },
      { available: false, shopId: shop },
      { available: "true", shopId: shop },
      { available: true, shopId: shop, authority: true },
    ])
      expect(() => parseShopExpenseScope(raw)).toThrow();
  });
  it.each([undefined, false, "", 0, { message: "PRIVATE" }])(
    "requires explicit SDK error:null with otherwise valid response: %j",
    (error) => {
      expect(() => parseShopExpenseObservedShop({ ...response(shop), error })).toThrow(
        SHOP_EXPENSE_READ_FAILURE,
      );
      expect(() =>
        parseShopExpensePageResponse({ ...response([expense()]), error }, request()),
      ).toThrow(SHOP_EXPENSE_READ_FAILURE);
    },
  );
  it("accepts unconsumed SDK metadata but rejects missing/inherited/accessor/hidden consumed fields", () => {
    expect(
      parseShopExpenseSDKResponse({ ...response([expense()]), status: 200 }, true).data,
    ).toEqual([expense()]);
    const get = vi.fn(() => null);
    for (const key of ["data", "count", "error"]) {
      const accessor = response([expense()]);
      Object.defineProperty(accessor, key, { get, enumerable: true });
      const hidden = response([expense()]);
      Object.defineProperty(hidden, key, { value: null, enumerable: false });
      expect(() => parseShopExpenseSDKResponse(accessor, true)).toThrow();
      expect(() => parseShopExpenseSDKResponse(hidden, true)).toThrow();
    }
    expect(() => parseShopExpenseSDKResponse(Object.create(response([expense()])), true)).toThrow();
    expect(get).not.toHaveBeenCalled();
  });
});

describe("counted independent pages and actual row bindings", () => {
  for (const kind of ["expenses", "categories", "vehicles"] as const) {
    it.each([0, 1, 99, 100, 101, 200, 201])(
      `${kind} count%j preserves exact windows without aggregate completeness`,
      (count) => {
        for (const page of [0, 1, 2, 3]) {
          const length = Math.min(100, Math.max(0, count - page * 100)),
            rows = Array.from({ length }, (_, index) => row(kind, index));
          const parsed = parseShopExpensePageResponse(response(rows, count), request(kind, page));
          expect(parsed).toMatchObject({
            kind,
            shopId: shop,
            page,
            totalCount: count,
            hasNext: page * 100 + length < count,
          });
          expect(parsed.rows).toHaveLength(length);
          expect(parsed).not.toHaveProperty("totalMTD");
          expect(Object.isFrozen(parsed.rows)).toBe(true);
          expect(parseShopExpenseReadPage(parsed, request(kind, page))).toEqual(parsed);
        }
      },
    );
    it.each([null, undefined, "1", -1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])(
      `${kind} refuses unknown/invalid count%j`,
      (count) => {
        expect(() =>
          parseShopExpensePageResponse({ ...response([], 0), count }, request(kind)),
        ).toThrow();
      },
    );
    it(`${kind} rejects missing/lower-cap/oversized/duplicate and accessor rows`, () => {
      for (const [rows, count] of [
        [[], 1],
        [[row(kind)], 2],
        [[row(kind)], 0],
        [Array.from({ length: 101 }, (_, index) => row(kind, index)), 101],
        [[row(kind), row(kind)], 2],
      ] as const)
        expect(() => parseShopExpensePageResponse(response(rows, count), request(kind))).toThrow();
      expect(() => parseShopExpensePageResponse(response([], 101), request(kind, 1))).toThrow();
      const raw = row(kind),
        get = vi.fn(() => uid(90));
      Object.defineProperty(raw, "id", { get, enumerable: true });
      expect(() => parseShopExpensePageResponse(response([raw]), request(kind))).toThrow();
      expect(get).not.toHaveBeenCalled();
    });
    it(`${kind} binds exact browser kind/shop/page/count/hasNext without accepting extra flags`, () => {
      const parsed = parseShopExpensePageResponse(response([row(kind)]), request(kind));
      for (const change of [
        { kind: "other" },
        { shopId: uid(99) },
        { page: 1 },
        { totalCount: 2 },
        { hasNext: true },
        { can_write: true },
      ])
        expect(() => parseShopExpenseReadPage({ ...parsed, ...change }, request(kind))).toThrow();
    });
  }
  it("checks UUID equality case-insensitively without imposing native version/variant", () => {
    expect(
      parseShopExpensePageResponse(
        response([
          expense(0, { shop_id: shop.toUpperCase(), id: "00000000-0000-0000-0000-000000000000" }),
        ]),
        request(),
      ).rows,
    ).toHaveLength(1);
    expect(() =>
      parseShopExpensePageResponse(
        response([expense(), expense(1, { id: expense().id.toUpperCase() })], 2),
        request(),
      ),
    ).toThrow();
  });
  it("rejects cross-shop expense/category rows without broadening fallback", () => {
    expect(() =>
      parseShopExpensePageResponse(response([expense(0, { shop_id: uid(99) })]), request()),
    ).toThrow();
    expect(() =>
      parseShopExpensePageResponse(
        response([category(0, { shop_id: uid(99) })]),
        request("categories"),
      ),
    ).toThrow();
  });
  it("keeps bound company/fleet vehicles but refuses the WHOLE page on null/hidden/wrong relations", () => {
    expect(
      parseShopExpensePageResponse(
        response([vehicle(0, { owner_type: "company" })]),
        request("vehicles"),
      ).rows,
    ).toHaveLength(1);
    for (const changes of [
      { owner_type: "company", customer_id: null, customers: null },
      { customers: null },
      { customers: [] },
      { customer_id: uid(99) },
      { customers: { id: customer, shop_id: uid(99) } },
      { customers: { id: uid(99), shop_id: shop } },
    ])
      expect(() =>
        parseShopExpensePageResponse(
          response([vehicle(), vehicle(1, changes)], 2),
          request("vehicles"),
        ),
      ).toThrow(SHOP_EXPENSE_READ_FAILURE);
  });
  it("preserves unrestricted required text/nullable fields and rejects inactive choices or invented enums", () => {
    expect(
      parseShopExpensePageResponse(
        response([
          expense(0, { status: "", payment_method: "retained-custom", description: null }),
        ]),
        request(),
      ).rows[0],
    ).toMatchObject({ status: "", description: null });
    expect(
      parseShopExpensePageResponse(response([category(0, { name: "" })]), request("categories"))
        .rows[0],
    ).toMatchObject({ name: "" });
    expect(() =>
      parseShopExpensePageResponse(
        response([category(0, { is_active: false })]),
        request("categories"),
      ),
    ).toThrow();
    expect(() =>
      parseShopExpensePageResponse(
        response([vehicle(0, { owner_type: "unproven" })]),
        request("vehicles"),
      ),
    ).toThrow();
  });
  it("checks exact-text UUID tiebreaks without using JS collation for different names/makes", () => {
    for (const [kind, key] of [
      ["categories", "name"],
      ["vehicles", "make"],
    ] as const) {
      const rows = [row(kind, 0), row(kind, 1)].map((value) => ({ ...value, [key]: "same" }));
      expect(parseShopExpensePageResponse(response(rows, 2), request(kind)).rows).toHaveLength(2);
      expect(() =>
        parseShopExpensePageResponse(response([...rows].reverse(), 2), request(kind)),
      ).toThrow();
      expect(
        parseShopExpensePageResponse(
          response(
            [
              { ...rows[0], [key]: "z" },
              { ...rows[1], [key]: "é" },
            ],
            2,
          ),
          request(kind),
        ).rows,
      ).toHaveLength(2);
    }
  });
});

describe("native money and Gregorian DATE wire compatibility", () => {
  it.each([
    0,
    -0,
    -1.25,
    999999999999.99,
    -999999999999.99,
    "0.00",
    "-999999999999.99",
    "+00001.25",
    "NaN",
  ])("preserves signed/native amount %j without arithmetic", (amount) => {
    const parsed = parseShopExpensePageResponse(
      response([expense(0, { amount, tax_amount: amount })]),
      request(),
    );
    expect(parsed.rows[0]).toMatchObject({ amount, tax_amount: amount });
  });
  it.each([
    null,
    undefined,
    NaN,
    Infinity,
    -Infinity,
    "Infinity",
    "-Infinity",
    "garbage",
    "1.001",
    0.001,
    "1000000000000.00",
    {},
    true,
  ])("rejects impossible/unsupported native14,2 amount %j", (amount) => {
    expect(() =>
      parseShopExpensePageResponse(response([expense(0, { amount })]), request()),
    ).toThrow();
  });
  it.each([
    "4714-11-24 BC",
    "0001-02-29 BC",
    "0001-01-01",
    "1900-02-28",
    "2000-02-29",
    "10000-01-01",
    "5874897-12-31",
    "infinity",
    "-infinity",
  ])("preserves valid native DATE %s", (expense_date) => {
    expect(
      parseShopExpensePageResponse(response([expense(0, { expense_date })]), request()).rows[0],
    ).toMatchObject({ expense_date });
  });
  it.each([
    "",
    "garbage",
    "2026-02-29",
    "1900-02-29",
    "2026-13-01",
    "2026-00-01",
    "2026-01-00",
    "2026-01-32",
    "2026-04-31",
    "0000-01-01",
    "4714-11-23 BC",
    "4715-01-01 BC",
    "5874898-01-01",
    "1-01-01",
    "00001-01-01",
    "2026-10-16T00:00:00Z",
    " 2026-10-16",
    "INFINITY",
    "0001-01-01 AD",
  ])("refuses malformed/out-of-range DATE %s", (expense_date) => {
    expect(() =>
      parseShopExpensePageResponse(response([expense(0, { expense_date })]), request()),
    ).toThrow();
  });
  it("checks DATE ordering through native Julian day keys, not lexicographic strings or JS Date", () => {
    expect(parseShopExpenseNativeDate("4714-11-24 BC")).toBe(0);
    expect(parseShopExpenseNativeDate("5874897-12-31")).toBe(2147483493);
    const dates = [
      "infinity",
      "10000-01-01",
      "9999-12-31",
      "0001-01-01",
      "0001-12-31 BC",
      "4714-11-24 BC",
      "-infinity",
    ];
    const rows = dates.map((expense_date, index) => expense(index, { expense_date }));
    expect(parseShopExpensePageResponse(response(rows, rows.length), request()).rows).toHaveLength(
      rows.length,
    );
    expect(() =>
      parseShopExpensePageResponse(response([...rows].reverse(), rows.length), request()),
    ).toThrow();
    expect(() =>
      parseShopExpensePageResponse(response([expense(1), expense(0)], 2), request()),
    ).toThrow();
  });
});
