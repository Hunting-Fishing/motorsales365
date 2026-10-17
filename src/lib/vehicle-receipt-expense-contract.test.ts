import { describe, expect, it, vi } from "vitest";
import {
  receiptExpenseRequestSchema,
  RECEIPT_EXPENSE_FAILURE,
  parseReceiptExpenseResponse as parseResponse,
  parseReceiptExpenseAcknowledgment as parseAcknowledgment,
  parseReceiptExpenseTargetResponse,
} from "./vehicle-receipt-expense-contract";

const receiptId = "a1234567-89ab-4cde-8f01-23456789abcd";
const expenseId = "b1234567-89ab-4cde-8f01-23456789abcd";
const accountId = "c1234567-89ab-4cde-8f01-23456789abcd";
const otherReceiptId = "d1234567-89ab-4cde-8f01-23456789abcd";
const shopVehicleId = "e1234567-89ab-4cde-8f01-23456789abcd";
const otherShopVehicleId = "f1234567-89ab-4cde-8f01-23456789abcd";
const request = () => ({
  expectedAccountId: accountId,
  id: receiptId,
  expectedShopVehicleId: shopVehicleId,
});
const acknowledgment = () => ({ receiptId, shopVehicleId, expenseId });
const response = () => ({ data: expenseId, error: null });
const targetResponse = () => ({
  data: { id: receiptId, shop_vehicle_id: shopVehicleId },
  error: null,
});
// Most fixtures intentionally bind one unchanged shop target; these wrappers
// still invoke the actual three-argument exported contract on every call.
const parseReceiptExpenseResponse = (
  value: unknown,
  expectedReceipt: string,
  ...expectedShop: [] | [string]
) =>
  parseResponse(
    value,
    expectedReceipt,
    expectedShop.length === 0 ? shopVehicleId : expectedShop[0],
  );
const parseReceiptExpenseAcknowledgment = (
  value: unknown,
  expectedReceipt: string,
  ...expectedShop: [] | [string]
) =>
  parseAcknowledgment(
    value,
    expectedReceipt,
    expectedShop.length === 0 ? shopVehicleId : expectedShop[0],
  );

function expectGenericFailure(run: () => unknown) {
  try {
    run();
    throw new Error("Expected contract rejection");
  } catch (error) {
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe(RECEIPT_EXPENSE_FAILURE);
    expect(error).not.toHaveProperty("cause");
    expect(String(error)).not.toContain("PRIVATE");
  }
}

describe("receipt expense transport acknowledgment contract", () => {
  it.each(["plain", "null-prototype"] as const)(
    "parses a strict %s request into detached primitive intent",
    (prototype) => {
      const input =
        prototype === "plain" ? request() : Object.assign(Object.create(null), request());
      const parsed = receiptExpenseRequestSchema.parse(input);
      input.id = otherReceiptId;
      expect(parsed).toEqual(request());
    },
  );

  it.each([
    null,
    undefined,
    [],
    "PRIVATE input",
    {},
    { id: receiptId },
    { expectedAccountId: accountId },
    { ...request(), expectedAccountId: "PRIVATE account" },
    { ...request(), id: "PRIVATE receipt" },
    { ...request(), expectedShopVehicleId: "PRIVATE shop vehicle" },
    { expectedAccountId: accountId, id: receiptId },
    { ...request(), extra: "PRIVATE" },
  ])("rejects an incomplete/malformed/extra-field request: %j", (input) => {
    expect(receiptExpenseRequestSchema.safeParse(input).success).toBe(false);
  });

  it.each(["expectedAccountId", "id", "expectedShopVehicleId"] as const)(
    "never invokes request %s accessors",
    (key) => {
      const input = request();
      const get = vi.fn(() => input[key]);
      Object.defineProperty(input, key, { enumerable: true, get });
      expect(receiptExpenseRequestSchema.safeParse(input).success).toBe(false);
      expect(get).not.toHaveBeenCalled();
    },
  );

  it.each(["inherited", "nonenumerable", "symbol", "class"] as const)(
    "rejects a %s request shape",
    (shape) => {
      let input: unknown = request();
      if (shape === "inherited")
        input = Object.assign(Object.create({ id: receiptId }), {
          expectedAccountId: accountId,
          expectedShopVehicleId: shopVehicleId,
        });
      if (shape === "nonenumerable") Object.defineProperty(input, "id", { enumerable: false });
      if (shape === "symbol") Object.defineProperty(input, Symbol("PRIVATE"), { value: true });
      if (shape === "class")
        input = new (class {
          expectedAccountId = accountId;
          id = receiptId;
          expectedShopVehicleId = shopVehicleId;
        })();
      expect(receiptExpenseRequestSchema.safeParse(input).success).toBe(false);
    },
  );

  it("accepts own SDK metadata without requiring or evaluating it", () => {
    const sdk = { ...response(), status: 200, statusText: "OK", count: null };
    const get = vi.fn(() => {
      throw new Error("PRIVATE metadata");
    });
    Object.defineProperty(sdk, "ignoredMetadata", { enumerable: true, get });
    expect(parseReceiptExpenseResponse(sdk, receiptId)).toEqual(acknowledgment());
    expect(get).not.toHaveBeenCalled();
  });

  it.each(["plain", "null-prototype"] as const)(
    "accepts an own %s SDK UUID and creates a frozen acknowledgment",
    (prototype) => {
      const sdk =
        prototype === "plain" ? response() : Object.assign(Object.create(null), response());
      const parsed = parseReceiptExpenseResponse(sdk, receiptId);
      expect(parsed).toEqual(acknowledgment());
      expect(Object.isFrozen(parsed)).toBe(true);
      sdk.data = otherReceiptId;
      expect(parsed.expenseId).toBe(expenseId);
    },
  );

  it("preserves supplied UUID spelling while matching receipt identity case-insensitively", () => {
    const value = {
      receiptId: receiptId.toUpperCase(),
      shopVehicleId: shopVehicleId.toUpperCase(),
      expenseId: expenseId.toUpperCase(),
    };
    expect(parseReceiptExpenseAcknowledgment(value, receiptId, shopVehicleId)).toEqual(value);
    expect(
      parseReceiptExpenseResponse(
        { data: expenseId.toUpperCase(), error: null },
        receiptId.toUpperCase(),
        shopVehicleId.toUpperCase(),
      ),
    ).toEqual(value);
  });

  it.each([undefined, false, "", 0, { message: "PRIVATE provider" }])(
    "requires explicit SDK error:null with otherwise-valid UUID data: %j",
    (error) => {
      expect(parseReceiptExpenseResponse(response(), receiptId)).toEqual(acknowledgment());
      expectGenericFailure(() =>
        parseReceiptExpenseResponse({ data: expenseId, error }, receiptId),
      );
    },
  );

  it.each([null, undefined, true, 7, [], {}, { id: expenseId }, "PRIVATE uuid", ""])(
    "refuses non-UUID RPC data: %j",
    (data) =>
      expectGenericFailure(() => parseReceiptExpenseResponse({ data, error: null }, receiptId)),
  );

  it.each([null, undefined, [], "PRIVATE response", {}])(
    "refuses missing SDK evidence: %j",
    (sdk) => {
      expectGenericFailure(() => parseReceiptExpenseResponse(sdk, receiptId));
    },
  );

  it.each(["data", "error"] as const)("does not invoke SDK %s getters", (key) => {
    const sdk = response();
    const get = vi.fn(() => sdk[key]);
    Object.defineProperty(sdk, key, { enumerable: true, get });
    expectGenericFailure(() => parseReceiptExpenseResponse(sdk, receiptId));
    expect(get).not.toHaveBeenCalled();
  });

  it.each([
    "inherited-data",
    "inherited-error",
    "nonenumerable-data",
    "nonenumerable-error",
    "class",
  ] as const)("refuses unsupported SDK %s evidence", (shape) => {
    let sdk: unknown = response();
    if (shape === "inherited-data")
      sdk = Object.assign(Object.create({ data: expenseId }), { error: null });
    if (shape === "inherited-error")
      sdk = Object.assign(Object.create({ error: null }), { data: expenseId });
    if (shape === "nonenumerable-data") Object.defineProperty(sdk, "data", { enumerable: false });
    if (shape === "nonenumerable-error") Object.defineProperty(sdk, "error", { enumerable: false });
    if (shape === "class")
      sdk = new (class {
        data = expenseId;
        error = null;
      })();
    expectGenericFailure(() => parseReceiptExpenseResponse(sdk, receiptId));
  });

  it.each([
    null,
    undefined,
    [],
    "PRIVATE acknowledgment",
    {},
    { receiptId },
    { expenseId },
    { receiptId, expenseId },
    { ...acknowledgment(), extra: true },
    { ...acknowledgment(), receiptId: otherReceiptId },
    { ...acknowledgment(), shopVehicleId: otherShopVehicleId },
    { ...acknowledgment(), receiptId: "PRIVATE" },
    { ...acknowledgment(), expenseId: "PRIVATE" },
    { ...acknowledgment(), shopVehicleId: "PRIVATE" },
  ])("refuses malformed or wrong-receipt acknowledgment: %j", (value) =>
    expectGenericFailure(() => parseReceiptExpenseAcknowledgment(value, receiptId)),
  );

  it.each(["plain", "null-prototype"] as const)(
    "snapshots a strict %s acknowledgment",
    (prototype) => {
      const value =
        prototype === "plain"
          ? acknowledgment()
          : Object.assign(Object.create(null), acknowledgment());
      const parsed = parseReceiptExpenseAcknowledgment(value, receiptId);
      value.expenseId = otherReceiptId;
      expect(parsed).toEqual(acknowledgment());
      expect(Object.isFrozen(parsed)).toBe(true);
    },
  );

  it.each(["receiptId", "shopVehicleId", "expenseId"] as const)(
    "does not invoke acknowledgment %s getters",
    (key) => {
      const value = acknowledgment();
      const get = vi.fn(() => value[key]);
      Object.defineProperty(value, key, { enumerable: true, get });
      expectGenericFailure(() => parseReceiptExpenseAcknowledgment(value, receiptId));
      expect(get).not.toHaveBeenCalled();
    },
  );

  it.each(["inherited", "nonenumerable", "symbol", "class"] as const)(
    "rejects a %s acknowledgment shape",
    (shape) => {
      let value: unknown = acknowledgment();
      if (shape === "inherited")
        value = Object.assign(Object.create({ receiptId }), { shopVehicleId, expenseId });
      if (shape === "nonenumerable")
        Object.defineProperty(value, "receiptId", { enumerable: false });
      if (shape === "symbol") Object.defineProperty(value, Symbol("PRIVATE"), { value: true });
      if (shape === "class")
        value = new (class {
          receiptId = receiptId;
          shopVehicleId = shopVehicleId;
          expenseId = expenseId;
        })();
      expectGenericFailure(() => parseReceiptExpenseAcknowledgment(value, receiptId));
    },
  );

  it.each(["sdk", "acknowledgment", "request"] as const)(
    "redacts throwing Proxy evidence at %s admission",
    (kind) => {
      const value = new Proxy(
        kind === "sdk" ? response() : kind === "request" ? request() : acknowledgment(),
        {
          getPrototypeOf: () => {
            throw new Error("PRIVATE Proxy");
          },
        },
      );
      if (kind === "request")
        expect(receiptExpenseRequestSchema.safeParse(value).success).toBe(false);
      else
        expectGenericFailure(() =>
          kind === "sdk"
            ? parseReceiptExpenseResponse(value, receiptId)
            : parseReceiptExpenseAcknowledgment(value, receiptId),
        );
    },
  );

  it.each(["", "PRIVATE", null, undefined])(
    "refuses invalid expected receipt identity: %j",
    (expected) => {
      expectGenericFailure(() => parseReceiptExpenseResponse(response(), expected as string));
      expectGenericFailure(() =>
        parseReceiptExpenseAcknowledgment(acknowledgment(), expected as string),
      );
    },
  );

  it.each(["", "PRIVATE", null, undefined])(
    "refuses invalid expected shop vehicle identity: %j",
    (expected) => {
      expectGenericFailure(() =>
        parseReceiptExpenseResponse(response(), receiptId, expected as string),
      );
      expectGenericFailure(() =>
        parseReceiptExpenseAcknowledgment(acknowledgment(), receiptId, expected as string),
      );
      expectGenericFailure(() =>
        parseReceiptExpenseTargetResponse(targetResponse(), receiptId, expected as string),
      );
    },
  );

  it("accepts a matching own target row including case aliases without returning financial evidence", () => {
    expect(
      parseReceiptExpenseTargetResponse(targetResponse(), receiptId, shopVehicleId),
    ).toBeUndefined();
    expect(
      parseReceiptExpenseTargetResponse(
        {
          data: { id: receiptId.toUpperCase(), shop_vehicle_id: shopVehicleId.toUpperCase() },
          error: null,
          status: 200,
        },
        receiptId,
        shopVehicleId,
      ),
    ).toBeUndefined();
  });

  it.each([
    null,
    {},
    { id: receiptId },
    { id: receiptId, shop_vehicle_id: null },
    { id: receiptId, shop_vehicle_id: otherShopVehicleId },
    { id: otherReceiptId, shop_vehicle_id: shopVehicleId },
    { id: receiptId, shop_vehicle_id: shopVehicleId, extra: true },
  ])("refuses missing/misbound target rows: %j", (data) => {
    expectGenericFailure(() =>
      parseReceiptExpenseTargetResponse({ data, error: null }, receiptId, shopVehicleId),
    );
  });

  it.each([undefined, false, "", { message: "PRIVATE target" }])(
    "requires explicit target error:null with matching row evidence: %j",
    (error) => {
      expect(
        parseReceiptExpenseTargetResponse(targetResponse(), receiptId, shopVehicleId),
      ).toBeUndefined();
      expectGenericFailure(() =>
        parseReceiptExpenseTargetResponse({ ...targetResponse(), error }, receiptId, shopVehicleId),
      );
    },
  );

  it.each(["sdk-data", "sdk-error", "row-id", "row-shop"] as const)(
    "does not invoke target %s getters",
    (field) => {
      const target = targetResponse();
      const object = field.startsWith("sdk") ? target : target.data;
      const key =
        field === "sdk-data"
          ? "data"
          : field === "sdk-error"
            ? "error"
            : field === "row-id"
              ? "id"
              : "shop_vehicle_id";
      const get = vi.fn(() => "PRIVATE");
      Object.defineProperty(object, key, { enumerable: true, get });
      expectGenericFailure(() =>
        parseReceiptExpenseTargetResponse(target, receiptId, shopVehicleId),
      );
      expect(get).not.toHaveBeenCalled();
    },
  );
});
