import { describe, expect, it, vi } from "vitest";
import {
  receiptInstallationRequestSchema,
  RECEIPT_INSTALLATION_FAILURE,
  parseReceiptInstallationAcknowledgment,
  parseReceiptInstallationResponse,
  parseReceiptInstallationItemResponse,
  parseReceiptInstallationTargetResponse,
  type ReceiptInstallationRequest,
} from "./vehicle-receipt-installation-contract";

const id = (letter: string) => `${letter}1234567-89ab-4cde-8f01-23456789abcd`;
const intent = (shop = false): ReceiptInstallationRequest => ({
  expectedAccountId: id("a"),
  receiptId: id("b"),
  itemId: id("c"),
  expectedVehicleId: shop ? null : id("d"),
  expectedShopVehicleId: shop ? id("e") : null,
  installedOn: "2026-10-15",
  odometerKm: 12345,
});
const keys = Object.keys(intent()) as (keyof ReceiptInstallationRequest)[];
const itemResponse = () => ({ data: { id: id("c"), receipt_id: id("b") }, error: null });
const targetResponse = () => ({
  data: { id: id("b"), vehicle_id: id("d"), shop_vehicle_id: id("e") },
  error: null,
});
const rpcResponse = () => ({ data: null, error: null });
function failure(run: () => unknown) {
  try {
    run();
    throw new Error("Expected rejection");
  } catch (error) {
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe(RECEIPT_INSTALLATION_FAILURE);
    expect(error).not.toHaveProperty("cause");
    expect(String(error)).not.toContain("PRIVATE");
  }
}
describe("installation captured-intent transport contract", () => {
  it.each([false, true])(
    "accepts exact target mode shop=%s and preserves a dual-bound stored receipt",
    (shop) => {
      const request = intent(shop);
      expect(receiptInstallationRequestSchema.parse(request)).toEqual(request);
      expect(parseReceiptInstallationItemResponse(itemResponse(), request)).toBeUndefined();
      expect(parseReceiptInstallationTargetResponse(targetResponse(), request)).toBeUndefined();
      const ack = parseReceiptInstallationResponse(rpcResponse(), request);
      expect(ack).toEqual(request);
      expect(Object.isFrozen(ack)).toBe(true);
    },
  );
  it("accepts null-prototype requests and acknowledgments and detaches snapshots", () => {
    const request = Object.assign(Object.create(null), intent());
    const parsed = receiptInstallationRequestSchema.parse(request);
    const ack = parseReceiptInstallationAcknowledgment(request, intent());
    request.installedOn = "2026-10-16";
    expect(parsed).toEqual(intent());
    expect(ack).toEqual(intent());
  });
  it("matches UUID spelling case-insensitively while preserving acknowledged values", () => {
    const value = {
      ...intent(),
      expectedAccountId: id("a").toUpperCase(),
      receiptId: id("b").toUpperCase(),
      itemId: id("c").toUpperCase(),
      expectedVehicleId: id("d").toUpperCase(),
    };
    expect(parseReceiptInstallationAcknowledgment(value, intent())).toEqual(value);
  });
  it.each([
    null,
    undefined,
    [],
    "PRIVATE",
    {},
    { ...intent(), expectedAccountId: "PRIVATE" },
    { ...intent(), receiptId: "PRIVATE" },
    { ...intent(), itemId: "PRIVATE" },
    { ...intent(), expectedVehicleId: null },
    { ...intent(), expectedShopVehicleId: id("e") },
    { ...intent(), installedOn: "2026-02-30" },
    { ...intent(), odometerKm: -1 },
    { ...intent(), odometerKm: 1.5 },
    { ...intent(), odometerKm: 2000001 },
    { ...intent(), odometerKm: "12" },
    { ...intent(), odometerKm: Number.NaN },
    { ...intent(), extra: true },
  ])("rejects unsupported exact request shape/value: %j", (value) => {
    expect(receiptInstallationRequestSchema.safeParse(value).success).toBe(false);
  });
  for (const kind of ["request", "ack"] as const) {
    it.each(keys)(`${kind} never invokes own %s accessors`, (key) => {
      const value = intent(),
        get = vi.fn(() => "PRIVATE");
      Object.defineProperty(value, key, { enumerable: true, get });
      if (kind === "request")
        expect(receiptInstallationRequestSchema.safeParse(value).success).toBe(false);
      else failure(() => parseReceiptInstallationAcknowledgment(value, intent()));
      expect(get).not.toHaveBeenCalled();
    });
    it.each(["missing", "inherited", "nonenumerable", "symbol", "class"] as const)(
      `${kind} rejects %s evidence`,
      (shape) => {
        let value: unknown = intent();
        if (shape === "missing") {
          const copy: Partial<ReceiptInstallationRequest> = intent();
          delete copy.expectedShopVehicleId;
          value = copy;
        }
        if (shape === "inherited")
          value = Object.assign(Object.create({ expectedAccountId: id("a") }), {
            ...intent(),
            expectedAccountId: undefined,
          });
        if (shape === "nonenumerable")
          Object.defineProperty(value, "itemId", { enumerable: false });
        if (shape === "symbol") Object.defineProperty(value, Symbol("PRIVATE"), { value: true });
        if (shape === "class") value = Object.assign(new (class {})(), intent());
        if (kind === "request")
          expect(receiptInstallationRequestSchema.safeParse(value).success).toBe(false);
        else failure(() => parseReceiptInstallationAcknowledgment(value, intent()));
      },
    );
  }
  it.each([
    "expectedAccountId",
    "receiptId",
    "itemId",
    "expectedVehicleId",
    "installedOn",
    "odometerKm",
  ] as const)(
    "compares acknowledged %s without accepting an unrelated valid field value",
    (key) => {
      const value = {
        ...intent(),
        [key]: key === "installedOn" ? "2026-10-16" : key === "odometerKm" ? 12346 : id("f"),
      };
      failure(() => parseReceiptInstallationAcknowledgment(value, intent()));
    },
  );
  it("compares the selected shop target and refuses an otherwise-valid target-mode switch", () => {
    failure(() =>
      parseReceiptInstallationAcknowledgment(
        { ...intent(true), expectedShopVehicleId: id("f") },
        intent(true),
      ),
    );
    failure(() => parseReceiptInstallationAcknowledgment(intent(true), intent()));
  });
  it.each([null, 0, 2000000])("retains supported nullable/integer odometer %j", (odometerKm) => {
    const request = { ...intent(), odometerKm };
    expect(parseReceiptInstallationResponse(rpcResponse(), request)).toEqual(request);
  });
  for (const phase of ["item", "target", "rpc"] as const) {
    const parse = (response: unknown) =>
      phase === "item"
        ? parseReceiptInstallationItemResponse(response, intent())
        : phase === "target"
          ? parseReceiptInstallationTargetResponse(response, intent())
          : parseReceiptInstallationResponse(response, intent());
    const valid = () =>
      phase === "item" ? itemResponse() : phase === "target" ? targetResponse() : rpcResponse();
    it.each([undefined, false, "", { message: "PRIVATE" }])(
      `${phase} requires explicit error:null with otherwise-valid data: %j`,
      (error) => {
        expect(() => parse(valid())).not.toThrow();
        failure(() => parse({ ...valid(), error }));
      },
    );
    it.each(["data", "error"] as const)(`${phase} does not invoke SDK %s accessors`, (key) => {
      const response = valid(),
        get = vi.fn(() => "PRIVATE");
      Object.defineProperty(response, key, { enumerable: true, get });
      failure(() => parse(response));
      expect(get).not.toHaveBeenCalled();
    });
    it(`${phase} rejects inherited SDK fields and throwing reflection`, () => {
      failure(() => parse(Object.create(valid())));
      failure(() =>
        parse(
          new Proxy(valid(), {
            getPrototypeOf: () => {
              throw new Error("PRIVATE");
            },
          }),
        ),
      );
    });
  }
  it.each([undefined, false, true, 0, [], {}, id("f")])(
    "refuses non-null native void RPC data: %j",
    (data) => {
      failure(() => parseReceiptInstallationResponse({ data, error: null }, intent()));
    },
  );
  it.each([
    null,
    {},
    { id: id("f"), receipt_id: id("b") },
    { id: id("c"), receipt_id: id("f") },
    { ...itemResponse().data, extra: true },
  ])("refuses missing/misbound item row: %j", (data) => {
    failure(() => parseReceiptInstallationItemResponse({ data, error: null }, intent()));
  });
  it.each([
    null,
    {},
    { ...targetResponse().data, id: id("f") },
    { ...targetResponse().data, vehicle_id: id("f") },
    { ...targetResponse().data, vehicle_id: null },
    { ...targetResponse().data, shop_vehicle_id: 7 },
    { ...targetResponse().data, extra: true },
  ])("refuses missing/misbound owner target row: %j", (data) => {
    failure(() => parseReceiptInstallationTargetResponse({ data, error: null }, intent()));
  });
  it("does not authorize the selected shop solely through linked public-vehicle visibility", () => {
    failure(() =>
      parseReceiptInstallationTargetResponse(
        { data: { ...targetResponse().data, shop_vehicle_id: id("f") }, error: null },
        intent(true),
      ),
    );
  });
  it.each(["item-id", "item-parent", "receipt-id", "receipt-vehicle", "receipt-shop"] as const)(
    "never invokes projected %s getters",
    (field) => {
      const response = field.startsWith("item") ? itemResponse() : targetResponse();
      const key =
        field === "item-parent"
          ? "receipt_id"
          : field === "receipt-vehicle"
            ? "vehicle_id"
            : field === "receipt-shop"
              ? "shop_vehicle_id"
              : "id";
      const get = vi.fn(() => "PRIVATE");
      Object.defineProperty(response.data, key, { enumerable: true, get });
      failure(() =>
        field.startsWith("item")
          ? parseReceiptInstallationItemResponse(response, intent())
          : parseReceiptInstallationTargetResponse(response, intent()),
      );
      expect(get).not.toHaveBeenCalled();
    },
  );
});
