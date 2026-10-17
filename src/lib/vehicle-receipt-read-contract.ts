import { z } from "zod";
import { categoryKeys, receiptEntrySchema, type VehicleReceipt } from "./vehicle-receipts";

export const RECEIPT_PAGE_SIZE = 25;
export const LINK_PAGE_SIZE = 100;
export const RECEIPT_ITEM_LIMIT = 100;
const failure = "Invalid receipt read response.";
type RecordData = Record<string, unknown>;

function invalid(): never {
  throw new Error(failure);
}
function snapshot(value: unknown, keys: readonly string[]): RecordData {
  if (typeof value !== "object" || value === null || Array.isArray(value)) invalid();
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) invalid();
  const result: RecordData = Object.create(null);
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== "string" || !keys.includes(key)) invalid();
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) invalid();
    result[key] = descriptor.value;
  }
  return result;
}
function arraySnapshot(value: unknown, max: number): unknown[] {
  if (!Array.isArray(value)) invalid();
  const lengthField = Object.getOwnPropertyDescriptor(value, "length");
  if (
    !lengthField ||
    !("value" in lengthField) ||
    !Number.isSafeInteger(lengthField.value) ||
    lengthField.value < 0 ||
    lengthField.value > max
  )
    invalid();
  const length = lengthField.value as number;
  const keys = Reflect.ownKeys(value);
  if (keys.length !== length + 1) invalid();
  const rows: unknown[] = [];
  for (let i = 0; i < length; i += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(i));
    if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) invalid();
    rows.push(descriptor.value);
  }
  return rows;
}
function ownRequest(keys: readonly string[]) {
  return (value: unknown, context: z.RefinementCtx) => {
    try {
      return snapshot(value, keys);
    } catch {
      context.addIssue({ code: "custom", message: "Invalid receipt read request." });
      return z.NEVER;
    }
  };
}
const uuid = z.string().uuid();
const pageSchema = z.number().int().min(0).max(1_000_000).default(0);
const receiptRequestKeys = ["expectedAccountId", "vehicleId", "shopVehicleId", "page"] as const;
const linkRequestKeys = ["expectedAccountId", "vehicleId", "page"] as const;
export const readReceiptRequestSchema = z.preprocess(
  ownRequest(receiptRequestKeys),
  z
    .object({
      expectedAccountId: uuid,
      vehicleId: uuid.optional(),
      shopVehicleId: uuid.optional(),
      page: pageSchema,
    })
    .strict()
    .refine((value) => {
      const vehicleId = Object.prototype.hasOwnProperty.call(value, "vehicleId")
        ? value.vehicleId
        : undefined;
      const shopVehicleId = Object.prototype.hasOwnProperty.call(value, "shopVehicleId")
        ? value.shopVehicleId
        : undefined;
      return Boolean(vehicleId) !== Boolean(shopVehicleId);
    }, "Choose exactly one vehicle"),
);
export const readLinkRequestSchema = z.preprocess(
  ownRequest(linkRequestKeys),
  z
    .object({
      expectedAccountId: uuid,
      vehicleId: uuid,
      page: pageSchema,
    })
    .strict(),
);
export type ReadReceiptRequest = z.infer<typeof readReceiptRequestSchema>;
export type ReadLinkRequest = z.infer<typeof readLinkRequestSchema>;

export const receiptReadProjections = {
  receipt:
    "id,vehicle_id,shop_vehicle_id,created_by,file_path,file_name,media_type,vendor,purchased_on,currency,total,status,share_with_shop,created_at",
  item: "id,receipt_id,description,category,brand,part_number,quantity,total,confidence,reviewed,installed_on,odometer_km,public_summary_allowed,sort_order,installed_by,installation_origin",
  link: "shop_vehicle_id,vehicle_id,shop_name,active",
  activeLink: "shop_vehicle_id,vehicle_id,active",
} as const;

function postgresText(value: string): boolean {
  for (let i = 0; i < value.length; i += 1) {
    const unit = value.charCodeAt(i);
    if (unit === 0 || (unit >= 0xdc00 && unit <= 0xdfff)) return false;
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = value.charCodeAt(i + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return false;
      i += 1;
    }
  }
  return true;
}
const text = z.string().refine(postgresText);
function codePointLength(value: string): number {
  let length = 0;
  for (const _point of value) length += 1;
  return length;
}
const nativeLength = (limit: number) => text.refine((value) => codePointLength(value) <= limit);
// SQL DATE/TSTZ are not entry dates. Preserve native infinity, expanded/BC years
// and received timestamp text; do not parse, shift time zones or impose expiry.
const nativeDateText = text.min(1);
const money = z.number().finite().min(0).max(99_999_999).nullable();
const headerSchema = z
  .object({
    id: uuid,
    vehicle_id: uuid.nullable(),
    shop_vehicle_id: uuid.nullable(),
    created_by: uuid,
    file_path: text.nullable(),
    file_name: text.nullable(),
    media_type: text.nullable(),
    vendor: nativeLength(200).nullable(),
    purchased_on: nativeDateText.nullable(),
    currency: text.regex(/^[A-Z]{3}$/),
    total: money,
    status: z.enum(["draft", "confirmed"]),
    share_with_shop: z.boolean(),
    created_at: nativeDateText,
  })
  .strict();
const itemSchema = z
  .object({
    id: uuid,
    receipt_id: uuid,
    // PostgreSQL trim(text) removes ordinary spaces, not JS's whole whitespace set.
    description: text.refine((value) => {
      const length = codePointLength(value.replace(/^ +| +$/g, ""));
      return length >= 1 && length <= 250;
    }),
    category: z.enum(categoryKeys).nullable(),
    brand: nativeLength(120).nullable(),
    part_number: nativeLength(120).nullable(),
    quantity: z.number().finite().positive().max(99_999).nullable(),
    total: money,
    confidence: z.number().finite().min(0).max(1),
    reviewed: z.boolean(),
    installed_on: nativeDateText.nullable(),
    odometer_km: z.number().int().min(0).max(2_000_000).nullable(),
    public_summary_allowed: z.boolean(),
    sort_order: z.number().int().min(-2_147_483_648).max(2_147_483_647),
    installed_by: uuid.nullable(),
    installation_origin: z.enum(["customer_entered", "business_attested"]).nullable(),
  })
  .strict();
const linkSchema = z
  .object({
    shop_vehicle_id: uuid,
    vehicle_id: uuid,
    shop_name: text.nullable(),
    active: z.boolean(),
  })
  .strict();
const activeLinkSchema = z
  .object({ shop_vehicle_id: uuid, vehicle_id: uuid, active: z.literal(true) })
  .strict();
const accessSchema = z.object({ can_write: z.boolean(), can_record_expense: z.boolean() }).strict();
export type ReceiptReadHeader = z.infer<typeof headerSchema>;
export type ReceiptReadItem = z.infer<typeof itemSchema>;
export type ReceiptReadDisplayItem = Omit<ReceiptReadItem, "installed_by" | "installation_origin">;
export type ReceiptReadRow = Omit<VehicleReceipt, "items"> & {
  created_at: string;
  items: ReceiptReadDisplayItem[];
  attachment_uploaded: boolean;
  can_write: boolean;
  items_complete: boolean;
  item_count: number;
  edit_eligible: boolean;
};
export type ReceiptReadWindow = {
  rows: ReceiptReadHeader[];
  page: number;
  totalCount: number;
  hasNext: boolean;
};
export type ReceiptReadPage = {
  receipts: ReceiptReadRow[];
  linkedVehicleId: string | null;
  canWrite: boolean;
  canRecordExpense: boolean;
  page: number;
  totalCount: number;
  hasNext: boolean;
};
export type LinkReadRow = z.infer<typeof linkSchema>;
export type LinkReadPage = {
  links: LinkReadRow[];
  page: number;
  totalCount: number;
  hasNext: boolean;
};
export type ReceiptReadItemSet = { receiptId: string; rows: unknown; count: unknown };
const sameId = (left: string, right: string) => left.toLowerCase() === right.toLowerCase();
function exactCount(value: unknown): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) invalid();
  return value;
}
function pageWindow(rows: unknown, count: unknown, page: number, size: number) {
  const totalCount = exactCount(count);
  const values = arraySnapshot(rows, size);
  const offset = page * size;
  if (values.length !== Math.min(size, Math.max(0, totalCount - offset))) invalid();
  return { values, page, totalCount, hasNext: offset + values.length < totalCount };
}
function uniqueIds(values: readonly string[]) {
  if (new Set(values.map((value) => value.toLowerCase())).size !== values.length) invalid();
}
function receiptRequest(value: ReadReceiptRequest) {
  const parsed = readReceiptRequestSchema.parse(value);
  // Detach optional values as own fields, never read inherited host properties.
  return {
    expectedAccountId: parsed.expectedAccountId,
    page: parsed.page,
    vehicleId: Object.prototype.hasOwnProperty.call(parsed, "vehicleId")
      ? parsed.vehicleId
      : undefined,
    shopVehicleId: Object.prototype.hasOwnProperty.call(parsed, "shopVehicleId")
      ? parsed.shopVehicleId
      : undefined,
  };
}

export function parseReceiptWorkspaceAccess(raw: unknown) {
  return accessSchema.parse(snapshot(raw, Object.keys(accessSchema.shape)));
}
export function parseActiveReceiptLink(raw: unknown, shopVehicleId: string): string | null {
  const expected = uuid.parse(shopVehicleId);
  if (raw === null) return null;
  const row = activeLinkSchema.parse(snapshot(raw, Object.keys(activeLinkSchema.shape)));
  if (!sameId(row.shop_vehicle_id, expected)) invalid();
  return row.vehicle_id;
}
export function parseReceiptWindow(
  raw: unknown,
  count: unknown,
  request: ReadReceiptRequest,
  linkedVehicleId: string | null,
): ReceiptReadWindow {
  const scope = receiptRequest(request);
  const linked = linkedVehicleId === null ? null : uuid.parse(linkedVehicleId);
  if (scope.vehicleId && linked !== null) invalid();
  const window = pageWindow(raw, count, scope.page, RECEIPT_PAGE_SIZE);
  const rows = window.values.map((rawRow) => {
    const row = headerSchema.parse(snapshot(rawRow, Object.keys(headerSchema.shape)));
    if (row.vehicle_id === null && row.shop_vehicle_id === null) invalid();
    const matches = scope.vehicleId
      ? row.vehicle_id !== null && sameId(row.vehicle_id, scope.vehicleId)
      : (row.shop_vehicle_id !== null && sameId(row.shop_vehicle_id, scope.shopVehicleId!)) ||
        (linked !== null && row.vehicle_id !== null && sameId(row.vehicle_id, linked));
    if (!matches) invalid();
    return row;
  });
  uniqueIds(rows.map((row) => row.id));
  return { rows, page: window.page, totalCount: window.totalCount, hasNext: window.hasNext };
}
export function parseReceiptItems(raw: unknown, count: unknown, receiptId: string) {
  const expected = uuid.parse(receiptId);
  const item_count = exactCount(count);
  const values = arraySnapshot(raw, RECEIPT_ITEM_LIMIT);
  if (values.length !== Math.min(item_count, RECEIPT_ITEM_LIMIT)) invalid();
  const items = values.map((value) =>
    itemSchema.parse(snapshot(value, Object.keys(itemSchema.shape))),
  );
  uniqueIds(items.map((item) => item.id));
  for (let i = 0; i < items.length; i += 1) {
    if (!sameId(items[i].receipt_id, expected)) invalid();
    const previous = items[i - 1];
    if (
      previous &&
      (previous.sort_order > items[i].sort_order ||
        (previous.sort_order === items[i].sort_order &&
          previous.id.toLowerCase() >= items[i].id.toLowerCase()))
    )
      invalid();
  }
  return { items, item_count, items_complete: item_count <= RECEIPT_ITEM_LIMIT };
}
export function parseReceiptAttachments(
  raw: unknown,
  receiptIds: readonly string[],
): Record<string, boolean> {
  const ids = arraySnapshot(receiptIds, RECEIPT_PAGE_SIZE).map((value) => uuid.parse(value));
  uniqueIds(ids);
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) invalid();
  const keys = Reflect.ownKeys(raw);
  if (keys.length !== ids.length || keys.some((key) => typeof key !== "string")) invalid();
  const source = snapshot(raw, keys as string[]);
  const byId = new Map<string, boolean>();
  for (const key of keys as string[]) {
    const id = uuid.parse(key).toLowerCase();
    if (byId.has(id) || typeof source[key] !== "boolean") invalid();
    byId.set(id, source[key] as boolean);
  }
  const result: Record<string, boolean> = Object.create(null);
  for (const id of ids) {
    const value = byId.get(id.toLowerCase());
    if (value === undefined) invalid();
    result[id] = value;
  }
  return result;
}
function editEligible(
  header: ReceiptReadHeader,
  set: ReturnType<typeof parseReceiptItems>,
): boolean {
  if (header.status !== "draft" || !set.items_complete || header.vendor === "") return false;
  if (
    set.items.some(
      (item) =>
        item.installed_on !== null ||
        item.installed_by !== null ||
        item.installation_origin !== null ||
        item.odometer_km !== null ||
        item.public_summary_allowed,
    )
  )
    return false;
  const fields = set.items.map((item) => ({
    description: item.description,
    category: item.category,
    brand: item.brand,
    part_number: item.part_number,
    quantity: item.quantity,
    total: item.total,
    confidence: item.confidence,
    reviewed: item.reviewed,
  }));
  // A zero-item draft deliberately opens the existing blank-line editor. No
  // persisted child is replaced; saving still requires its normal valid line.
  const placeholder = {
    description: "Placeholder",
    category: null,
    brand: null,
    part_number: null,
    quantity: 1,
    total: null,
    confidence: 0,
    reviewed: false,
  };
  const entry = {
    vendor: header.vendor,
    purchasedOn: header.purchased_on,
    currency: header.currency,
    total: header.total,
    items: fields.length ? fields : [placeholder],
    confirm: false,
  };
  const parsed = receiptEntrySchema.safeParse(entry);
  if (!parsed.success) return false;
  if (
    parsed.data.vendor !== entry.vendor ||
    parsed.data.purchasedOn !== entry.purchasedOn ||
    parsed.data.currency !== entry.currency ||
    !Object.is(parsed.data.total, entry.total) ||
    (header.total !== null && !Object.is(Number(header.total.toString()), header.total))
  )
    return false;
  for (let i = 0; i < fields.length; i += 1) {
    for (const key of Object.keys(fields[i]) as (keyof typeof placeholder)[]) {
      if (!Object.is(fields[i][key], parsed.data.items[i][key])) return false;
    }
  }
  // This is entry-field compatibility, not a lossless identity/save receipt:
  // the unchanged writer regenerates child IDs and normalizes sort_order.
  return true;
}
export function assembleReceiptReadPage(
  window: ReceiptReadWindow,
  itemSets: readonly ReceiptReadItemSet[],
  attachments: unknown,
  access: unknown,
  request: ReadReceiptRequest,
  linkedVehicleId: string | null,
): ReceiptReadPage {
  const scope = receiptRequest(request);
  const windowData = snapshot(window, ["rows", "page", "totalCount", "hasNext"]);
  const parsed = parseReceiptWindow(windowData.rows, windowData.totalCount, scope, linkedVehicleId);
  if (windowData.page !== parsed.page || windowData.hasNext !== parsed.hasNext) invalid();
  const workspace = parseReceiptWorkspaceAccess(access);
  const attachmentMap = parseReceiptAttachments(
    attachments,
    parsed.rows.map((row) => row.id),
  );
  const sets = arraySnapshot(itemSets, RECEIPT_PAGE_SIZE).map((value) =>
    snapshot(value, ["receiptId", "rows", "count"]),
  );
  if (sets.length !== parsed.rows.length) invalid();
  const byReceipt = new Map<string, ReturnType<typeof parseReceiptItems>>();
  for (const set of sets) {
    const id = uuid.parse(set.receiptId);
    const key = id.toLowerCase();
    if (byReceipt.has(key) || !parsed.rows.some((row) => sameId(row.id, id))) invalid();
    byReceipt.set(key, parseReceiptItems(set.rows, set.count, id));
  }
  uniqueIds([...byReceipt.values()].flatMap((set) => set.items.map((item) => item.id)));
  const receipts = parsed.rows.map((row): ReceiptReadRow => {
    const set = byReceipt.get(row.id.toLowerCase());
    if (!set) invalid();
    const items = set.items.map(
      ({ installed_by: _actor, installation_origin: _origin, ...item }) => item,
    );
    return {
      ...row,
      items,
      attachment_uploaded: attachmentMap[row.id],
      can_write:
        workspace.can_write &&
        Boolean(
          scope.vehicleId ||
          (row.shop_vehicle_id && sameId(row.shop_vehicle_id, scope.shopVehicleId!)),
        ),
      items_complete: set.items_complete,
      item_count: set.item_count,
      edit_eligible: editEligible(row, set),
    };
  });
  return {
    receipts,
    linkedVehicleId,
    canWrite: workspace.can_write,
    canRecordExpense: workspace.can_record_expense,
    page: parsed.page,
    totalCount: parsed.totalCount,
    hasNext: parsed.hasNext,
  };
}
export function parseLinkWindow(
  raw: unknown,
  count: unknown,
  request: ReadLinkRequest,
): LinkReadPage {
  const scope = readLinkRequestSchema.parse(request);
  const window = pageWindow(raw, count, scope.page, LINK_PAGE_SIZE);
  const links = window.values.map((value) => {
    const row = linkSchema.parse(snapshot(value, Object.keys(linkSchema.shape)));
    if (!sameId(row.vehicle_id, scope.vehicleId)) invalid();
    return row;
  });
  uniqueIds(links.map((row) => row.shop_vehicle_id));
  return { links, page: window.page, totalCount: window.totalCount, hasNext: window.hasNext };
}
