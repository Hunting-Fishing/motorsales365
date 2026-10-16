import { describe, expect, it, vi } from "vitest";
import {
  assembleReceiptReadPage,
  LINK_PAGE_SIZE,
  parseActiveReceiptLink,
  parseLinkWindow,
  parseReceiptAttachments,
  parseReceiptItems,
  parseReceiptWindow,
  parseReceiptWorkspaceAccess,
  readLinkRequestSchema,
  readReceiptRequestSchema,
  RECEIPT_ITEM_LIMIT,
  RECEIPT_PAGE_SIZE,
  receiptReadProjections,
  type ReadReceiptRequest,
  type ReceiptReadHeader,
  type ReceiptReadItem,
} from "./vehicle-receipt-read-contract";

// Pure synthetic transport-contract checks, not SQL/RLS/Auth/storage execution,
// production schema parity, a single consistent snapshot or a save receipt.
const uuid = (value: number) => `00000000-0000-4000-8000-${value.toString(16).padStart(12, "0")}`;
const accountId = uuid(1),
  vehicleId = uuid(2),
  shopVehicleId = uuid(3),
  receiptId = uuid(4);
const request = (patch: Partial<ReadReceiptRequest> = {}) =>
  readReceiptRequestSchema.parse({ expectedAccountId: accountId, vehicleId, ...patch });
const shopRequest = () =>
  readReceiptRequestSchema.parse({ expectedAccountId: accountId, shopVehicleId });
const linkRequest = (page = 0) =>
  readLinkRequestSchema.parse({ expectedAccountId: accountId, vehicleId, page });
function header(patch: Partial<ReceiptReadHeader> = {}): ReceiptReadHeader {
  return {
    id: receiptId,
    vehicle_id: vehicleId,
    shop_vehicle_id: null,
    created_by: accountId,
    file_path: null,
    file_name: null,
    media_type: null,
    vendor: "Supplier",
    purchased_on: "2026-10-16",
    currency: "PHP",
    total: null,
    status: "draft",
    share_with_shop: false,
    created_at: "2026-10-16T12:00:00+08:00",
    ...patch,
  };
}
function item(patch: Partial<ReceiptReadItem> = {}): ReceiptReadItem {
  return {
    id: uuid(10),
    receipt_id: receiptId,
    description: "Brake part",
    category: "brakes",
    brand: null,
    part_number: null,
    quantity: 1,
    total: null,
    confidence: 0.99,
    reviewed: true,
    installed_on: null,
    odometer_km: null,
    public_summary_allowed: false,
    sort_order: 0,
    installed_by: null,
    installation_origin: null,
    ...patch,
  };
}
const access = { can_write: true, can_record_expense: false };
function assembled(row = header(), rows: ReceiptReadItem[] = [item()], count = rows.length) {
  const window = parseReceiptWindow([row], 1, request(), null);
  return assembleReceiptReadPage(
    window,
    [{ receiptId: row.id, rows, count }],
    { [row.id]: false },
    access,
    request(),
    null,
  );
}
function missing(value: object, key: string) {
  const copy: Record<string, unknown> = { ...value };
  delete copy[key];
  return copy;
}

describe("receipt read requests and fixed projections", () => {
  it("fixes bounded page sizes and exact non-star projections", () => {
    expect([RECEIPT_PAGE_SIZE, LINK_PAGE_SIZE, RECEIPT_ITEM_LIMIT]).toEqual([25, 100, 100]);
    expect(receiptReadProjections.receipt).toBe(
      "id,vehicle_id,shop_vehicle_id,created_by,file_path,file_name,media_type,vendor,purchased_on,currency,total,status,share_with_shop,created_at",
    );
    expect(receiptReadProjections.item).toBe(
      "id,receipt_id,description,category,brand,part_number,quantity,total,confidence,reviewed,installed_on,odometer_km,public_summary_allowed,sort_order,installed_by,installation_origin",
    );
    expect(receiptReadProjections.link).toBe("shop_vehicle_id,vehicle_id,shop_name,active");
    expect(receiptReadProjections.activeLink).toBe("shop_vehicle_id,vehicle_id,active");
    for (const projection of Object.values(receiptReadProjections))
      expect(projection).not.toContain("*");
  });
  it("defaults page0 and accepts exactly one selected UUID target and the page boundary", () => {
    expect(request()).toEqual({ expectedAccountId: accountId, vehicleId, page: 0 });
    expect(shopRequest()).toEqual({ expectedAccountId: accountId, shopVehicleId, page: 0 });
    expect(request({ page: 1_000_000 }).page).toBe(1_000_000);
    expect(readLinkRequestSchema.parse({ expectedAccountId: accountId, vehicleId }).page).toBe(0);
  });
  it.each([-1, 1_000_001, 0.5, "0", null, Infinity, NaN])(
    "rejects unsupported page %j without coercion",
    (page) => {
      expect(() =>
        readReceiptRequestSchema.parse({ expectedAccountId: accountId, vehicleId, page }),
      ).toThrow();
      expect(() =>
        readLinkRequestSchema.parse({ expectedAccountId: accountId, vehicleId, page }),
      ).toThrow();
    },
  );
  it.each([
    {},
    { expectedAccountId: accountId },
    { expectedAccountId: "owner", vehicleId },
    { expectedAccountId: accountId, vehicleId: "native-text-id" },
    { expectedAccountId: accountId, vehicleId, shopVehicleId },
    { expectedAccountId: accountId, vehicleId, limit: 200 },
    { expectedAccountId: accountId, vehicleId, accountId },
  ])("rejects missing, extra and invalid receipt input %j", (value) => {
    expect(() => readReceiptRequestSchema.parse(value)).toThrow();
  });
  it("rejects inherited, accessor, symbol and nonenumerable request values without invoking getters", () => {
    const getter = vi.fn(() => accountId);
    const value = { vehicleId };
    Object.defineProperty(value, "expectedAccountId", { enumerable: true, get: getter });
    const hidden = { expectedAccountId: accountId, vehicleId };
    Object.defineProperty(hidden, "page", { value: 0 });
    for (const raw of [
      Object.create({ expectedAccountId: accountId, vehicleId }),
      value,
      hidden,
      { expectedAccountId: accountId, vehicleId, [Symbol("hidden")]: true },
    ]) {
      expect(() => readReceiptRequestSchema.parse(raw)).toThrow();
    }
    expect(getter).not.toHaveBeenCalled();
  });
});

describe("exact receipt page windows and bindings", () => {
  it.each([0, 1, 24, 25, 26, 50, 51])(
    "uses count%j and page ranges rather than a guessed empty/full result",
    (count) => {
      for (const page of [0, 1, 2, 4]) {
        const length = Math.min(25, Math.max(0, count - page * 25));
        const rows = Array.from({ length }, (_, index) => header({ id: uuid(100 + index) }));
        expect(parseReceiptWindow(rows, count, request({ page }), null)).toEqual({
          rows,
          page,
          totalCount: count,
          hasNext: page * 25 + length < count,
        });
      }
    },
  );
  it.each([undefined, null, "1", -1, 0.25, Infinity, NaN, Number.MAX_SAFE_INTEGER + 1])(
    "rejects untrustworthy exact count %j",
    (count) => {
      expect(() => parseReceiptWindow([], count, request(), null)).toThrow();
      expect(() => parseReceiptItems([], count, receiptId)).toThrow();
      expect(() => parseLinkWindow([], count, linkRequest())).toThrow();
    },
  );
  it("rejects missing API rows, lower API caps, extra rows and duplicate UUIDs including case variants", () => {
    for (const [rows, count] of [
      [[], 1],
      [[header()], 0],
      [[header()], 2],
      [Array.from({ length: 26 }, (_, i) => header({ id: uuid(100 + i) })), 26],
      [[header(), header()], 2],
      [[header({ id: uuid(171) }), header({ id: uuid(171).toUpperCase() })], 2],
    ] as const)
      expect(() => parseReceiptWindow(rows, count, request(), null)).toThrow();
  });
  it("allows both native targets while preserving owner/direct-shop/linked-owner binding distinctions", () => {
    const both = header({ shop_vehicle_id: shopVehicleId });
    expect(parseReceiptWindow([both], 1, request(), null).rows).toEqual([both]);
    expect(parseReceiptWindow([both], 1, shopRequest(), null).rows).toEqual([both]);
    const linked = header({ shop_vehicle_id: uuid(99), vehicle_id: vehicleId.toUpperCase() });
    expect(parseReceiptWindow([linked], 1, shopRequest(), vehicleId).rows).toEqual([linked]);
    for (const bad of [
      header({ vehicle_id: null, shop_vehicle_id: null }),
      header({ vehicle_id: uuid(99) }),
    ]) {
      expect(() => parseReceiptWindow([bad], 1, request(), null)).toThrow();
    }
    expect(() => parseReceiptWindow([header()], 1, shopRequest(), null)).toThrow();
    expect(() => parseReceiptWindow([header()], 1, shopRequest(), uuid(99))).toThrow();
    expect(() => parseReceiptWindow([header()], 1, request(), vehicleId)).toThrow();
  });
  it("returns detached complete own-field headers and rejects unknown/missing/accessor shapes", () => {
    const row = header();
    const parsed = parseReceiptWindow([row], 1, request(), null);
    row.vendor = "Changed SDK object";
    expect(parsed.rows[0].vendor).toBe("Supplier");
    const getter = vi.fn(() => "PRIVATE");
    const accessor = header();
    Object.defineProperty(accessor, "vendor", { get: getter, enumerable: true });
    for (const raw of [
      missing(header(), "created_at"),
      { ...header(), items: [] },
      { ...header(), can_write: true },
      accessor,
      Object.create(header()),
    ]) {
      expect(() => parseReceiptWindow([raw], 1, request(), null)).toThrow();
    }
    expect(getter).not.toHaveBeenCalled();
    const sparse = new Array(1);
    expect(() => parseReceiptWindow(sparse, 1, request(), null)).toThrow();
    const extra = Object.assign([header()], { secret: true });
    expect(() => parseReceiptWindow(extra, 1, request(), null)).toThrow();
  });
  it.each(["infinity", "-infinity", "10000-01-01", "0001-01-01 BC"])(
    "preserves native DATE cohort %s read-only without Date conversion",
    (purchased_on) => {
      const result = assembled(header({ purchased_on, created_at: `${purchased_on} 00:00:00+00` }));
      expect(result.receipts[0].purchased_on).toBe(purchased_on);
      expect(result.receipts[0].created_at).toBe(`${purchased_on} 00:00:00+00`);
      expect(result.receipts[0].edit_eligible).toBe(false);
    },
  );
  it("preserves raw native text/unscaled numbers and uses PostgreSQL character/space constraints, not entry trimming", () => {
    const row = header({
      vendor: " Supplier ",
      total: 0.123456789012345,
      file_name: "unbounded ".repeat(1000),
    });
    const lines = [
      item({
        description: "  \t  ",
        brand: " B ",
        part_number: " P ",
        quantity: 0.00000000000001,
        total: 1e-25,
        confidence: 0.123456789,
      }),
    ];
    const result = assembled(row, lines).receipts[0];
    expect(result.vendor).toBe(row.vendor);
    expect(result.total).toBe(row.total);
    expect(result.items[0]).toMatchObject({
      description: "  \t  ",
      brand: " B ",
      part_number: " P ",
      quantity: 1e-14,
      total: 1e-25,
    });
    expect(result.edit_eligible).toBe(false);
    const unicode = assembled(header({ vendor: "🚗".repeat(200) }));
    expect(unicode.receipts[0].vendor).toBe("🚗".repeat(200));
    expect(unicode.receipts[0].edit_eligible).toBe(false); // entry's UTF-16 limit differs
  });
  it.each([
    { total: -1 },
    { total: 100_000_000 },
    { total: Infinity },
    { total: NaN },
    { total: "1.25" },
    { currency: "php" },
    { currency: "PHP " },
    { status: "paid" },
    { share_with_shop: 1 },
    { vendor: "x".repeat(201) },
    { vendor: "\u0000" },
    { vendor: "\ud800" },
    { purchased_on: "" },
    { created_at: null },
    { created_by: "owner" },
  ])("rejects header fields outside retained primitive/native constraints %j", (patch) => {
    expect(() => parseReceiptWindow([{ ...header(), ...patch }], 1, request(), null)).toThrow();
  });
});

describe("complete counted item projections and edit compatibility", () => {
  it.each([0, 1, 99, 100, 101, 1000])(
    "displays min(count,100) for count%j without calling a truncated set complete",
    (count) => {
      const rows = Array.from({ length: Math.min(count, 100) }, (_, i) =>
        item({ id: uuid(100 + i), sort_order: i }),
      );
      const parsed = parseReceiptItems(rows, count, receiptId);
      expect(parsed).toEqual({ items: rows, item_count: count, items_complete: count <= 100 });
      expect(assembled(header(), rows, count).receipts[0].edit_eligible).toBe(count <= 100);
    },
  );
  it("requires all projected fields including hidden installation metadata and exact capped count", () => {
    for (const [rows, count] of [
      [[], 1],
      [[item()], 2],
      [[item()], 0],
      [[missing(item(), "installed_by")], 1],
      [[missing(item(), "installation_origin")], 1],
      [[{ ...item(), secret: true }], 1],
      [Array.from({ length: 101 }, (_, i) => item({ id: uuid(100 + i), sort_order: i })), 101],
    ] as const)
      expect(() => parseReceiptItems(rows, count, receiptId)).toThrow();
  });
  it("binds every item and verifies sort_order then UUID order and uniqueness", () => {
    const first = item({ id: uuid(171), sort_order: -10 }),
      second = item({ id: uuid(172), sort_order: -10 });
    expect(parseReceiptItems([first, second], 2, receiptId).items).toEqual([first, second]);
    for (const rows of [
      [second, first],
      [item({ sort_order: 1 }), item({ id: uuid(11), sort_order: 0 })],
      [first, { ...first, id: first.id.toUpperCase() }],
      [item({ receipt_id: uuid(99) })],
    ]) {
      expect(() => parseReceiptItems(rows, rows.length, receiptId)).toThrow();
    }
  });
  it.each([
    { quantity: 0 },
    { quantity: -1 },
    { quantity: 100000 },
    { quantity: "1" },
    { quantity: Infinity },
    { total: -1 },
    { confidence: null },
    { confidence: 1.01 },
    { reviewed: "true" },
    { category: "other" },
    { odometer_km: -1 },
    { odometer_km: 0.5 },
    { odometer_km: 2_000_001 },
    { sort_order: 2147483648 },
    { sort_order: -2147483649 },
    { sort_order: null },
    { description: "   " },
    { description: "x".repeat(251) },
    { brand: "x".repeat(121) },
    { public_summary_allowed: 1 },
    { installed_by: "opaque" },
    { installation_origin: "verified" },
  ])("rejects native-invalid item fields without coercion %j", (patch) => {
    expect(() => parseReceiptItems([{ ...item(), ...patch }], 1, receiptId)).toThrow();
  });
  it.each([
    { description: " Brake part" },
    { description: "Brake part\t" },
    { brand: " B " },
    { part_number: " P " },
    { installed_on: "infinity" },
    { installed_by: accountId },
    { installation_origin: "business_attested" as const },
    { odometer_km: 0 },
    { public_summary_allowed: true },
  ])("preserves a valid native item read but makes unsafe editor input ineligible %j", (patch) => {
    const result = assembled(header(), [item(patch)]).receipts[0];
    expect(result.edit_eligible).toBe(false);
    expect(result.items[0]).not.toHaveProperty("installed_by");
    expect(result.items[0]).not.toHaveProperty("installation_origin");
  });
  it("keeps zero-item draft resumption deliberate without changing later save min1 or confirmed rows", () => {
    expect(assembled(header(), []).receipts[0]).toMatchObject({
      items: [],
      item_count: 0,
      items_complete: true,
      edit_eligible: true,
    });
    expect(assembled(header({ status: "confirmed" }), []).receipts[0].edit_eligible).toBe(false);
    expect(assembled(header({ vendor: "" }), []).receipts[0].edit_eligible).toBe(false);
    expect(assembled(header({ vendor: " Supplier " }), []).receipts[0].edit_eligible).toBe(false);
    expect(assembled(header({ purchased_on: "infinity" }), []).receipts[0].edit_eligible).toBe(
      false,
    );
  });
  it("does not confuse editor compatibility with authority or promise retained item identity/sort metadata", () => {
    const row = header(),
      raw = item({ sort_order: -200, id: uuid(171), quantity: 0.00001, confidence: 0.123456 });
    const window = parseReceiptWindow([row], 1, request(), null);
    const parsedItems = parseReceiptItems([raw], 1, row.id);
    raw.description = "Changed SDK line";
    const result = assembleReceiptReadPage(
      window,
      [{ receiptId: row.id, rows: parsedItems.items, count: parsedItems.item_count }],
      { [row.id]: true },
      { can_write: false, can_record_expense: true },
      request(),
      null,
    );
    expect(result.receipts[0]).toMatchObject({
      can_write: false,
      edit_eligible: true,
      attachment_uploaded: true,
    });
    expect(result.canRecordExpense).toBe(true);
    expect(result.receipts[0].items[0]).toMatchObject({
      id: uuid(171),
      receipt_id: receiptId,
      description: "Brake part",
      sort_order: -200,
    });
  });
});

describe("workspace, active-link, attachment and final page shapes", () => {
  it("requires exact own boolean workspace fields, not truthy values or role assumptions", () => {
    expect(parseReceiptWorkspaceAccess(access)).toEqual(access);
    for (const raw of [
      null,
      undefined,
      {},
      { ...access, extra: true },
      { ...access, can_write: 1 },
      { ...access, can_record_expense: "false" },
      Object.create(access),
    ]) {
      expect(() => parseReceiptWorkspaceAccess(raw)).toThrow();
    }
  });
  it("requires one exact active linked identity or null; inactive/malformed/mismatched is not guessed absent", () => {
    expect(parseActiveReceiptLink(null, shopVehicleId)).toBeNull();
    expect(
      parseActiveReceiptLink(
        { shop_vehicle_id: shopVehicleId.toUpperCase(), vehicle_id: vehicleId, active: true },
        shopVehicleId,
      ),
    ).toBe(vehicleId);
    for (const raw of [
      undefined,
      {},
      [],
      { shop_vehicle_id: shopVehicleId, vehicle_id: vehicleId, active: false },
      { shop_vehicle_id: uuid(99), vehicle_id: vehicleId, active: true },
      { shop_vehicle_id: shopVehicleId, vehicle_id: vehicleId, active: true, shop_id: uuid(99) },
    ]) {
      expect(() => parseActiveReceiptLink(raw, shopVehicleId)).toThrow();
    }
  });
  it("matches every attachment exactly with boolean own keys and UUID casefold, not truthy/default false", () => {
    const id = uuid(171);
    expect(parseReceiptAttachments({ [id.toUpperCase()]: false }, [id])).toEqual({ [id]: false });
    expect(parseReceiptAttachments({}, [])).toEqual({});
    const getter = vi.fn(() => true);
    const accessor = Object.defineProperty({}, id, { enumerable: true, get: getter });
    for (const raw of [
      null,
      undefined,
      [],
      {},
      { [id]: "true" },
      { [id]: 1 },
      { [id]: null },
      { [id]: true, [uuid(99)]: false },
      { [id]: true, [id.toUpperCase()]: false },
      accessor,
      Object.create({ [id]: true }),
    ]) {
      expect(() => parseReceiptAttachments(raw, [id])).toThrow();
    }
    expect(getter).not.toHaveBeenCalled();
  });
  it("requires exactly one counted item set per receipt, including cross-parent duplicate IDs", () => {
    const row = header(),
      second = header({ id: uuid(5) });
    const window = parseReceiptWindow([row, second], 2, request(), null);
    const map = { [row.id]: false, [second.id]: false };
    const first = { receiptId: row.id, rows: [item()], count: 1 };
    const other = { receiptId: second.id, rows: [item({ receipt_id: second.id })], count: 1 };
    for (const sets of [
      [],
      [first],
      [first, first],
      [first, { ...other, receiptId: uuid(99) }],
      [first, other],
    ]) {
      expect(() => assembleReceiptReadPage(window, sets, map, access, request(), null)).toThrow();
    }
    expect(() =>
      assembleReceiptReadPage(
        { ...window, hasNext: true },
        [first, { ...other, rows: [], count: 0 }],
        map,
        access,
        request(),
        null,
      ),
    ).toThrow();
  });
  it("assembles exact envelope, preserves native scope and only grants the existing direct-shop write flag", () => {
    const direct = header({ id: uuid(41), shop_vehicle_id: shopVehicleId, vehicle_id: null });
    const owner = header({ id: uuid(42), shop_vehicle_id: null });
    const req = shopRequest();
    const window = parseReceiptWindow([direct, owner], 2, req, vehicleId);
    const result = assembleReceiptReadPage(
      window,
      [
        { receiptId: direct.id, rows: [], count: 0 },
        { receiptId: owner.id, rows: [], count: 0 },
      ],
      { [direct.id]: false, [owner.id]: true },
      access,
      req,
      vehicleId,
    );
    expect(Object.keys(result).sort()).toEqual(
      [
        "receipts",
        "linkedVehicleId",
        "canWrite",
        "canRecordExpense",
        "page",
        "totalCount",
        "hasNext",
      ].sort(),
    );
    expect(result.receipts.map((row) => row.can_write)).toEqual([true, false]);
    expect(result.receipts.map((row) => row.attachment_uploaded)).toEqual([false, true]);
    expect(result).toMatchObject({
      linkedVehicleId: vehicleId,
      page: 0,
      totalCount: 2,
      hasNext: false,
    });
  });
});

describe("strict counted link windows", () => {
  const link = (n = 10) => ({
    shop_vehicle_id: uuid(n),
    vehicle_id: vehicleId,
    shop_name: " Shop ",
    active: true,
  });
  it.each([0, 1, 100, 101, 200, 201])("validates exact count/page window for %j links", (count) => {
    for (const page of [0, 1, 2, 3]) {
      const length = Math.min(100, Math.max(0, count - page * 100));
      const rows = Array.from({ length }, (_, i) => link(100 + i));
      expect(parseLinkWindow(rows, count, linkRequest(page))).toEqual({
        links: rows,
        page,
        totalCount: count,
        hasNext: page * 100 + length < count,
      });
    }
  });
  it("preserves names/active=false/null names and rejects missing bindings/duplicate IDs/truncation", () => {
    const rows = [{ ...link(), shop_name: null, active: false }];
    expect(parseLinkWindow(rows, 1, linkRequest()).links).toEqual(rows);
    for (const raw of [
      [{ ...link(), vehicle_id: uuid(99) }],
      [{ ...link(), active: 1 }],
      [missing(link(), "vehicle_id")],
      [{ ...link(), shop_id: uuid(99) }],
      [link(171), { ...link(171), shop_vehicle_id: uuid(171).toUpperCase() }],
    ]) {
      expect(() => parseLinkWindow(raw, raw.length, linkRequest())).toThrow();
    }
    expect(() => parseLinkWindow([link()], 2, linkRequest())).toThrow();
    expect(() => parseLinkWindow([], 1, linkRequest())).toThrow();
    expect(() => parseLinkWindow([], 0, { ...linkRequest(), page: -1 })).toThrow();
  });
});
