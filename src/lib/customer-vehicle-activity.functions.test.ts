import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCustomerVehicleActivity } from "./customer-vehicle-activity.functions";
import { activityKinds, type ActivityKind } from "./customer-vehicle-activity";

// Mocked handler contracts only. No live Supabase, middleware/JWT execution,
// RLS/tenant authority, HTTP serialization or production acceptance is proved.
const mocks = vi.hoisted(() => ({
  authMiddleware: { name: "requireSupabaseAuth" },
  middlewares: [] as unknown[][],
  methods: [] as unknown[],
  privilegedRpc: vi.fn(),
}));
vi.mock("@tanstack/react-start", () => ({
  createServerFn: (options: unknown) => {
    mocks.methods.push(options);
    let validate = (data: unknown): unknown => data;
    const builder = {
      middleware: (middlewares: unknown[]) => {
        mocks.middlewares.push(middlewares);
        return builder;
      },
      inputValidator: (validator: (data: unknown) => unknown) => {
        validate = validator;
        return builder;
      },
      handler:
        (handler: (args: { data: unknown; context: unknown }) => unknown) =>
        (args: { data: unknown; context: unknown }) =>
          handler({ ...args, data: validate(args.data) }),
    };
    return builder;
  },
}));
vi.mock("@/integrations/supabase/auth-middleware", () => ({
  requireSupabaseAuth: mocks.authMiddleware,
}));
vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: { rpc: mocks.privilegedRpc },
}));

const uuid = (value: number) => `00000000-0000-4000-8000-${String(value).padStart(12, "0")}`;
const account = uuid(1);
const customer = uuid(2);
const vehicle = uuid(3);
const failure = "Could not load vehicle activity. Refresh and try again.";
const invalidInput = "Invalid vehicle activity request.";
const changedAccount = "Account changed. Refresh before loading vehicle activity.";
const names = {
  receipts: "crm_customer_vehicle_receipts",
  installations: "crm_customer_vehicle_installations",
  work_orders: "crm_customer_vehicle_work_orders",
} as const;
const rows = {
  receipts: {
    id: uuid(10),
    vendor: "Supplier",
    purchased_on: "2024-02-29",
    currency: "PHP",
    total: 42.75,
  },
  installations: {
    id: uuid(20),
    name_snapshot: "Oil filter",
    part_number_snapshot: "OF-1",
    installed_quantity: 1.25,
    installed_at: "2026-10-14T10:00:00+00:00",
    installed_odometer_km: 12345,
    work_order_id: uuid(21),
  },
  work_orders: {
    id: uuid(30),
    work_order_number: "WO-001",
    status: "open",
    created_at: "2026-10-14T18:00:00+08:00",
  },
} as const;
const request = (kind: ActivityKind = "receipts") => ({
  expectedAccountId: account,
  customerId: customer,
  shopVehicleId: vehicle,
  kind,
});
const payload = (kind: ActivityKind) => ({ available: true, rows: [{ ...rows[kind] }] });
function client(data: unknown = { available: true, rows: [] }, error: unknown = null) {
  return {
    rpc: vi.fn(async (_name: string, _args: unknown) => ({ data, error })),
    from: vi.fn(() => {
      throw new Error("Unexpected table fallback");
    }),
  };
}
const context = (supabase: ReturnType<typeof client>, userId: unknown = account) => ({
  supabase,
  userId,
});
async function call(data: unknown, callerContext: unknown) {
  return (
    getCustomerVehicleActivity as unknown as (args: {
      data: unknown;
      context: unknown;
    }) => Promise<unknown>
  )({ data, context: callerContext });
}
function assertOnlyRpc(supabase: ReturnType<typeof client>, kind: ActivityKind) {
  expect(supabase.rpc).toHaveBeenCalledExactlyOnceWith(names[kind], {
    _customer_id: customer,
    _shop_vehicle_id: vehicle,
  });
  expect(supabase.from).not.toHaveBeenCalled();
  expect(mocks.privilegedRpc).not.toHaveBeenCalled();
}
async function rejectPayload(kind: ActivityKind, data: unknown) {
  const supabase = client();
  // Preserve an explicitly undefined response; a helper default must not turn
  // malformed backend data into a legitimate visible-empty result.
  supabase.rpc.mockResolvedValueOnce({ data, error: null });
  await expect(call(request(kind), context(supabase))).rejects.toThrow(failure);
  assertOnlyRpc(supabase, kind);
}
beforeEach(() => {
  vi.clearAllMocks();
});

describe("customer vehicle activity authenticated handler contract", () => {
  it("retains POST and the required authentication middleware registration", () => {
    expect(mocks.methods).toEqual([{ method: "POST" }]);
    expect(mocks.middlewares).toEqual([[mocks.authMiddleware]]);
  });

  for (const kind of activityKinds) {
    it(`${kind}: calls only its fixed RPC with exact customer/vehicle selectors on the current context client`, async () => {
      const supabase = client(payload(kind));
      await expect(call(request(kind), context(supabase))).resolves.toEqual({
        kind,
        ...payload(kind),
      });
      assertOnlyRpc(supabase, kind);
    });
    it(`${kind}: accepts visible empty and unavailable envelopes distinctly`, async () => {
      for (const available of [true, false]) {
        const supabase = client({ available, rows: [] });
        await expect(call(request(kind), context(supabase))).resolves.toEqual({
          kind,
          available,
          rows: [],
        });
        assertOnlyRpc(supabase, kind);
      }
    });
    it(`${kind}: accepts all 26 unique bounded rows`, async () => {
      const result = {
        available: true,
        rows: Array.from({ length: 26 }, (_, index) => ({ ...rows[kind], id: uuid(100 + index) })),
      };
      const supabase = client(result);
      await expect(call(request(kind), context(supabase))).resolves.toEqual({ kind, ...result });
      assertOnlyRpc(supabase, kind);
    });
    it(`${kind}: rejects duplicate IDs, including different letter case, and more than 26 rows`, async () => {
      const letterId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
      for (const result of [
        { available: true, rows: [rows[kind], rows[kind]] },
        {
          available: true,
          rows: [
            { ...rows[kind], id: letterId },
            { ...rows[kind], id: letterId.toUpperCase() },
          ],
        },
        {
          available: true,
          rows: Array.from({ length: 27 }, (_, index) => ({
            ...rows[kind],
            id: uuid(100 + index),
          })),
        },
      ])
        await rejectPayload(kind, result);
    });
    it(`${kind}: rejects wrong-kind rows, extra envelope fields and private row fields`, async () => {
      const wrongKind = kind === "receipts" ? "installations" : "receipts";
      await rejectPayload(kind, payload(wrongKind));
      for (const field of [
        "owner_user_id",
        "approved_by",
        "business_id",
        "created_by",
        "file_path",
        "attachments",
      ]) {
        await rejectPayload(kind, { ...payload(kind), [field]: "PRIVATE_VALUE" });
        await rejectPayload(kind, {
          available: true,
          rows: [{ ...rows[kind], [field]: "PRIVATE_VALUE" }],
        });
      }
      await rejectPayload(kind, { ...payload(kind), kind });
    });
    it(`${kind}: rejects null/malformed envelopes and unavailable with rows`, async () => {
      for (const result of [
        null,
        undefined,
        [],
        "PRIVATE_VALUE",
        {},
        { rows: [] },
        { available: true },
        { available: "true", rows: [] },
        { available: true, rows: null },
        { available: true, rows: [null] },
        { available: false, rows: [rows[kind]] },
      ])
        await rejectPayload(kind, result);
    });
    it(`${kind}: validates IDs and string bounds before exposing results`, async () => {
      for (const badId of [null, 5, "", "not-a-uuid"])
        await rejectPayload(kind, { available: true, rows: [{ ...rows[kind], id: badId }] });
      const field =
        kind === "receipts" ? "vendor" : kind === "installations" ? "name_snapshot" : "status";
      for (const value of [123, {}, "x".repeat(10_001)])
        await rejectPayload(kind, { available: true, rows: [{ ...rows[kind], [field]: value }] });
    });
  }

  it("does not reuse a previous account's client for another current context", async () => {
    const previous = client(payload("receipts"));
    const current = client({ available: true, rows: [] });
    await call(request(), context(previous));
    await expect(
      call({ ...request(), expectedAccountId: uuid(99) }, context(current, uuid(99))),
    ).resolves.toEqual({ kind: "receipts", available: true, rows: [] });
    expect(previous.rpc).toHaveBeenCalledTimes(1);
    expect(current.rpc).toHaveBeenCalledExactlyOnceWith(names.receipts, {
      _customer_id: customer,
      _shop_vehicle_id: vehicle,
    });
    expect(mocks.privilegedRpc).not.toHaveBeenCalled();
  });

  it("rejects mismatched or missing subjects before any RPC", async () => {
    for (const userId of [uuid(99), null, undefined, "", 123]) {
      const supabase = client(payload("receipts"));
      // Explicit object construction preserves an absent value, not helper default.
      await expect(call(request(), { supabase, userId })).rejects.toThrow(changedAccount);
      expect(supabase.rpc).not.toHaveBeenCalled();
    }
    const supabase = client();
    await expect(call(request(), { supabase })).rejects.toThrow(changedAccount);
    expect(supabase.rpc).not.toHaveBeenCalled();
  });
  it("absent/null context cannot dispatch or select a privileged fallback", async () => {
    for (const callerContext of [undefined, null, {}])
      await expect(call(request(), callerContext)).rejects.toThrow(changedAccount);
    expect(mocks.privilegedRpc).not.toHaveBeenCalled();
  });

  for (const field of ["expectedAccountId", "customerId", "shopVehicleId"] as const) {
    it(`${field}: rejects non-UUID input before dispatch`, async () => {
      const supabase = client();
      for (const value of [
        undefined,
        null,
        123,
        "",
        "not-a-uuid",
        "../vehicles",
        `${vehicle} trailing`,
      ])
        await expect(call({ ...request(), [field]: value }, context(supabase))).rejects.toThrow(
          invalidInput,
        );
      expect(supabase.rpc).not.toHaveBeenCalled();
    });
  }
  it("rejects unsupported kind and any extra input selector/actor before dispatch", async () => {
    const supabase = client();
    for (const kind of [undefined, null, "history", "RECEIPTS", "receipts;SELECT 1", 1])
      await expect(call({ ...request(), kind }, context(supabase))).rejects.toThrow(invalidInput);
    for (const extra of [
      { userId: account },
      { actorId: account },
      { businessId: uuid(8) },
      { table: "vehicles" },
      { columns: "*" },
    ])
      await expect(call({ ...request(), ...extra }, context(supabase))).rejects.toThrow(
        invalidInput,
      );
    for (const value of [undefined, null, [], "receipts", {}])
      await expect(call(value, context(supabase))).rejects.toThrow(invalidInput);
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it("preserves nullable receipt fields and uppercase currencies with numeric totals", async () => {
    for (const currency of ["PHP", "USD", "EUR"]) {
      const result = {
        available: true,
        rows: [{ ...rows.receipts, vendor: null, purchased_on: null, total: null, currency }],
      };
      const supabase = client(result);
      await expect(call(request(), context(supabase))).resolves.toEqual({
        kind: "receipts",
        ...result,
      });
      assertOnlyRpc(supabase, "receipts");
    }
  });
  it("preserves nullable installation/work-order fields and valid offset/fractional timestamps", async () => {
    for (const installed_at of [
      "2026-10-14T10:00:00Z",
      "2026-10-14T18:00:00.123456+08:00",
      "2026-10-14T05:00:00-05:00",
    ]) {
      const result = {
        available: true,
        rows: [
          {
            ...rows.installations,
            part_number_snapshot: null,
            installed_odometer_km: null,
            work_order_id: null,
            installed_at,
          },
        ],
      };
      const supabase = client(result);
      await expect(call(request("installations"), context(supabase))).resolves.toEqual({
        kind: "installations",
        ...result,
      });
      assertOnlyRpc(supabase, "installations");
    }
    const result = { available: true, rows: [{ ...rows.work_orders, work_order_number: null }] };
    const supabase = client(result);
    await expect(call(request("work_orders"), context(supabase))).resolves.toEqual({
      kind: "work_orders",
      ...result,
    });
  });
  it("rejects invalid calendar dates, timestamps, currencies and numeric/string shapes", async () => {
    for (const purchased_on of [
      "2025-02-29",
      "2026-02-30",
      "2026-13-01",
      "2026-01-32",
      "2026-01-01T00:00:00Z",
      1,
    ])
      await rejectPayload("receipts", {
        available: true,
        rows: [{ ...rows.receipts, purchased_on }],
      });
    for (const currency of [null, 1, "php", "PH", "PHPP", " PHP", "₱"])
      await rejectPayload("receipts", { available: true, rows: [{ ...rows.receipts, currency }] });
    for (const value of ["1.25", NaN, Infinity, -Infinity, {}, true]) {
      await rejectPayload("receipts", {
        available: true,
        rows: [{ ...rows.receipts, total: value }],
      });
      await rejectPayload("installations", {
        available: true,
        rows: [{ ...rows.installations, installed_quantity: value }],
      });
    }
    for (const installed_odometer_km of ["100", 1.5, Infinity, true])
      await rejectPayload("installations", {
        available: true,
        rows: [{ ...rows.installations, installed_odometer_km }],
      });
    for (const invalidTimestamp of [
      null,
      "2026-02-30T10:00:00Z",
      "2026-10-14",
      "2026-10-14T25:00:00Z",
      "2026-10-14T10:00:00",
      1,
    ]) {
      await rejectPayload("installations", {
        available: true,
        rows: [{ ...rows.installations, installed_at: invalidTimestamp }],
      });
      await rejectPayload("work_orders", {
        available: true,
        rows: [{ ...rows.work_orders, created_at: invalidTimestamp }],
      });
    }
    await rejectPayload("installations", {
      available: true,
      rows: [{ ...rows.installations, work_order_id: "wrong" }],
    });
    await rejectPayload("work_orders", {
      available: true,
      rows: [{ ...rows.work_orders, status: null }],
    });
  });

  it("sanitizes returned backend errors without using payload, retrying or falling back", async () => {
    const supabase = client(payload("receipts"), {
      code: "42501",
      message: "PRIVATE_OWNER_ID secret/path",
      details: "private attachment",
    });
    await expect(call(request(), context(supabase))).rejects.toThrow(new Error(failure));
    assertOnlyRpc(supabase, "receipts");
  });
  it("sanitizes synchronous throws, rejected backend promises and missing caller clients without retry", async () => {
    for (const mode of ["throws", "rejects"] as const) {
      const supabase = client();
      if (mode === "throws")
        supabase.rpc.mockImplementationOnce(() => {
          throw new Error("PRIVATE_OWNER_ID secret/path");
        });
      else supabase.rpc.mockRejectedValueOnce({ message: "PRIVATE_OWNER_ID secret/path" });
      await expect(call(request(), context(supabase))).rejects.toThrow(new Error(failure));
      assertOnlyRpc(supabase, "receipts");
    }
    await expect(call(request(), { userId: account })).rejects.toThrow(new Error(failure));
    expect(mocks.privilegedRpc).not.toHaveBeenCalled();
  });
});
