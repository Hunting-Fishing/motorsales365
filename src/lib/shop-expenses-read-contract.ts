import { z } from "zod";

export const SHOP_EXPENSE_READ_PAGE_SIZE = 100;
export const SHOP_EXPENSE_READ_FAILURE =
  "Could not load this shop snapshot. Refresh and try again.";
export const shopExpenseReadProjections = {
  expenses:
    "id,shop_id,amount,tax_amount,expense_date,payment_method,reference_number,description,status,category_id,receipt_url,vehicle_id,vehicle_receipt_id",
  categories: "id,shop_id,name,is_active",
  // LEFT embed: never silently drop company/null-customer or hidden-join rows.
  // An unbound returned row refuses the page; no vehicle.shop_id is invented.
  vehicles:
    "id,customer_id,owner_type,make,model,license_plate,customers!fk_vehicles_customer(id,shop_id)",
} as const;
const uuid = z.string().regex(/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i);
const sameId = (left: string, right: string) => left.toLowerCase() === right.toLowerCase();
function invalid(): never {
  throw new Error(SHOP_EXPENSE_READ_FAILURE);
}
function record(value: unknown, keys?: readonly string[]) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    ![Object.prototype, null].includes(Object.getPrototypeOf(value))
  )
    invalid();
  const descriptors = Object.getOwnPropertyDescriptors(value),
    out: Record<string, unknown> = Object.create(null);
  for (const key of Reflect.ownKeys(descriptors)) {
    if (typeof key !== "string" || (keys && !keys.includes(key))) invalid();
    const field = descriptors[key];
    if (!("value" in field) || !field.enumerable) invalid();
    out[key] = field.value;
  }
  return out;
}
function preprocess(keys: readonly string[]) {
  return (value: unknown, context: z.RefinementCtx) => {
    try {
      return record(value, keys);
    } catch {
      context.addIssue({ code: "custom", message: "Invalid shop read request." });
      return z.NEVER;
    }
  };
}
const kindSchema = z.enum(["expenses", "categories", "vehicles"]);
export const shopExpenseScopeRequestSchema = z.preprocess(
  preprocess(["expectedAccountId"]),
  z.object({ expectedAccountId: uuid }).strict(),
);
export const shopExpenseReadRequestSchema = z.preprocess(
  preprocess(["expectedAccountId", "expectedShopId", "kind", "page"]),
  z
    .object({
      expectedAccountId: uuid,
      expectedShopId: uuid,
      kind: kindSchema,
      page: z.number().int().min(0).max(1_000_000).default(0),
    })
    .strict(),
);
export type ShopExpenseKind = z.infer<typeof kindSchema>;
export type ShopExpenseReadRequest = Readonly<z.infer<typeof shopExpenseReadRequestSchema>>;
export type ShopExpenseScope = Readonly<
  { available: false; shopId: null } | { available: true; shopId: string }
>;

function postgresText(value: string) {
  for (let i = 0; i < value.length; i++) {
    const unit = value.charCodeAt(i);
    if (unit === 0 || (unit >= 0xdc00 && unit <= 0xdfff)) return false;
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = value.charCodeAt(i + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return false;
      i++;
    }
  }
  return true;
}
const text = z.string().refine(postgresText);
// Supported native ISO DATE wire grammar, not a date-entry/today policy:
// YYYY-MM-DD (expanded AD years allowed), optional BC, and +/-infinity.
// Proleptic Gregorian calendar and Julian bounds follow PostgreSQL:
// https://www.postgresql.org/docs/17/datatype-datetime.html
// https://www.postgresql.org/docs/17/datetime-julian-dates.html
// date2j()/DATE_END_JULIAN: PostgreSQL datetime.c / datatype/timestamp.h.
export function parseShopExpenseNativeDate(value: string): number {
  if (value === "infinity") return Infinity;
  if (value === "-infinity") return -Infinity;
  const match = /^(\d{4}|[1-9]\d{4,6})-(\d{2})-(\d{2})( BC)?$/.exec(value);
  if (!match) invalid();
  const displayYear = Number(match[1]),
    month = Number(match[2]),
    day = Number(match[3]);
  if (displayYear === 0 || displayYear > (match[4] ? 4714 : 5874897) || month < 1 || month > 12)
    invalid();
  const year = match[4] ? 1 - displayYear : displayYear;
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (day < 1 || day > days[month - 1]) invalid();
  const shiftedYear = year + (month > 2 ? 4800 : 4799),
    shiftedMonth = month + (month > 2 ? 1 : 13);
  const century = Math.floor(shiftedYear / 100);
  const julian =
    shiftedYear * 365 -
    32167 +
    Math.floor(shiftedYear / 4) -
    century +
    Math.floor(century / 4) +
    Math.floor((7834 * shiftedMonth) / 256) +
    day;
  if (!Number.isSafeInteger(julian) || julian < 0 || julian >= 2147483494) invalid();
  return julian;
}
const nativeDate = text.refine((value) => {
  try {
    parseShopExpenseNativeDate(value);
    return true;
  } catch {
    return false;
  }
});
// Read compatibility with native NUMERIC(14,2), not a nonnegative/accounting
// policy. Keep received values; never round/coerce/add or turn null into zero.
// PostgreSQL's special NaN is read-visible but is not a usable financial amount.
function nativeAmount(value: unknown): value is string | number {
  if (value === "NaN") return true;
  if (typeof value !== "string" && (typeof value !== "number" || !Number.isFinite(value)))
    return false;
  const raw = String(value);
  if (raw.length > 128) return false;
  const match = /^[+-]?(\d+)(?:\.(\d{1,2}))?$/.exec(raw);
  return Boolean(match && match[1].replace(/^0+(?=\d)/, "").length <= 12);
}
const amount = z.custom<string | number>(nativeAmount);
const expenseSchema = z
  .object({
    id: uuid,
    shop_id: uuid,
    amount,
    tax_amount: amount,
    expense_date: nativeDate,
    payment_method: text.nullable(),
    reference_number: text.nullable(),
    description: text.nullable(),
    status: text,
    category_id: uuid.nullable(),
    receipt_url: text.nullable(),
    vehicle_id: uuid.nullable(),
    vehicle_receipt_id: uuid.nullable(),
  })
  .strict();
const categorySchema = z
  .object({ id: uuid, shop_id: uuid, name: text, is_active: z.literal(true) })
  .strict();
const customerSchema = z.object({ id: uuid, shop_id: uuid }).strict();
const vehicleSchema = z
  .object({
    id: uuid,
    customer_id: uuid.nullable(),
    owner_type: z.enum(["customer", "company"]),
    make: text,
    model: text,
    license_plate: text.nullable(),
    customers: customerSchema.nullable(),
  })
  .strict();
export type ShopExpenseRow = Readonly<z.infer<typeof expenseSchema>>;
export type ShopExpenseCategory = Readonly<z.infer<typeof categorySchema>>;
export type ShopExpenseVehicle = Readonly<
  Omit<z.infer<typeof vehicleSchema>, "customer_id" | "customers"> & {
    customer_id: string;
    customers: Readonly<z.infer<typeof customerSchema>>;
  }
>;
type PageBase = Readonly<{ shopId: string; page: number; totalCount: number; hasNext: boolean }>;
export type ShopExpensePage = PageBase &
  (
    | { readonly kind: "expenses"; readonly rows: readonly ShopExpenseRow[] }
    | { readonly kind: "categories"; readonly rows: readonly ShopExpenseCategory[] }
    | { readonly kind: "vehicles"; readonly rows: readonly ShopExpenseVehicle[] }
  );
export function parseShopExpenseSDKResponse(value: unknown, counted = false) {
  try {
    if (
      !value ||
      typeof value !== "object" ||
      Array.isArray(value) ||
      ![Object.prototype, null].includes(Object.getPrototypeOf(value))
    )
      invalid();
    const descriptors = Object.getOwnPropertyDescriptors(value);
    for (const key of counted ? ["data", "error", "count"] : ["data", "error"])
      if (
        !Object.hasOwn(descriptors, key) ||
        !("value" in descriptors[key]) ||
        !descriptors[key].enumerable
      )
        invalid();
    if (descriptors.error.value !== null) invalid();
    return { data: descriptors.data.value, count: counted ? descriptors.count.value : undefined };
  } catch {
    invalid();
  }
}
export function parseShopExpenseObservedShop(value: unknown): string | null {
  try {
    return uuid.nullable().parse(parseShopExpenseSDKResponse(value).data);
  } catch {
    invalid();
  }
}
export function parseShopExpenseScope(value: unknown): ShopExpenseScope {
  try {
    const row = record(value, ["available", "shopId"]);
    if (row.available === false && row.shopId === null)
      return Object.freeze({ available: false, shopId: null });
    if (row.available === true)
      return Object.freeze({ available: true, shopId: uuid.parse(row.shopId) });
    invalid();
  } catch {
    invalid();
  }
}
function array(value: unknown) {
  if (!Array.isArray(value)) invalid();
  const size = Object.getOwnPropertyDescriptor(value, "length");
  if (
    !size ||
    !("value" in size) ||
    !Number.isSafeInteger(size.value) ||
    size.value < 0 ||
    size.value > SHOP_EXPENSE_READ_PAGE_SIZE ||
    Reflect.ownKeys(value).length !== size.value + 1
  )
    invalid();
  const values: unknown[] = [];
  for (let index = 0; index < size.value; index++) {
    const field = Object.getOwnPropertyDescriptor(value, String(index));
    if (!field || !("value" in field) || !field.enumerable) invalid();
    values.push(field.value);
  }
  return values;
}
function page(raw: unknown, count: unknown, request: ShopExpenseReadRequest): ShopExpensePage {
  const intent = shopExpenseReadRequestSchema.parse(request);
  if (typeof count !== "number" || !Number.isSafeInteger(count) || count < 0) invalid();
  const values = array(raw),
    offset = intent.page * SHOP_EXPENSE_READ_PAGE_SIZE;
  if (values.length !== Math.min(SHOP_EXPENSE_READ_PAGE_SIZE, Math.max(0, count - offset)))
    invalid();
  const base = {
    shopId: intent.expectedShopId,
    page: intent.page,
    totalCount: count,
    hasNext: offset + values.length < count,
  };
  const ids = new Set<string>();
  function distinct(id: string) {
    const key = id.toLowerCase();
    if (ids.has(key)) invalid();
    ids.add(key);
  }
  // Native TEXT collation and DATE rendering are not JS comparators. Only the
  // UUID tiebreak of an exactly identical received primary key is checked here.
  function ties<T extends { id: string }>(
    rows: readonly T[],
    key: (row: T) => string,
    descending = false,
  ) {
    for (let i = 1; i < rows.length; i++)
      if (key(rows[i - 1]) === key(rows[i])) {
        const before = rows[i - 1].id.toLowerCase(),
          after = rows[i].id.toLowerCase();
        if (descending ? before <= after : before >= after) invalid();
      }
  }
  if (intent.kind === "expenses") {
    const rows = values.map((raw) => {
      const row = expenseSchema.parse(record(raw, Object.keys(expenseSchema.shape)));
      if (!sameId(row.shop_id, intent.expectedShopId)) invalid();
      distinct(row.id);
      return Object.freeze(row);
    });
    for (let i = 1; i < rows.length; i++) {
      const before = parseShopExpenseNativeDate(rows[i - 1].expense_date),
        after = parseShopExpenseNativeDate(rows[i].expense_date);
      if (
        before < after ||
        (before === after && rows[i - 1].id.toLowerCase() <= rows[i].id.toLowerCase())
      )
        invalid();
    }
    return Object.freeze({ ...base, kind: "expenses", rows: Object.freeze(rows) });
  }
  if (intent.kind === "categories") {
    const rows = values.map((raw) => {
      const row = categorySchema.parse(record(raw, Object.keys(categorySchema.shape)));
      if (!sameId(row.shop_id, intent.expectedShopId)) invalid();
      distinct(row.id);
      return Object.freeze(row);
    });
    ties(rows, (row) => row.name);
    return Object.freeze({ ...base, kind: "categories", rows: Object.freeze(rows) });
  }
  const rows = values.map((raw): ShopExpenseVehicle => {
    const fields = record(raw, Object.keys(vehicleSchema.shape));
    if (fields.customers !== null)
      fields.customers = record(fields.customers, Object.keys(customerSchema.shape));
    const row = vehicleSchema.parse(fields);
    // A NULL/hidden/unmatched company/customer relation is unknown binding, not
    // an absent vehicle or a complete empty shop. Refuse the ENTIRE page.
    if (
      !row.customer_id ||
      !row.customers ||
      !sameId(row.customer_id, row.customers.id) ||
      !sameId(row.customers.shop_id, intent.expectedShopId)
    )
      invalid();
    distinct(row.id);
    return Object.freeze({
      ...row,
      customer_id: row.customer_id,
      customers: Object.freeze(row.customers),
    });
  });
  ties(rows, (row) => row.make);
  return Object.freeze({ ...base, kind: "vehicles", rows: Object.freeze(rows) });
}
export function parseShopExpensePageResponse(
  value: unknown,
  request: ShopExpenseReadRequest,
): ShopExpensePage {
  try {
    const response = parseShopExpenseSDKResponse(value, true);
    return page(response.data, response.count, request);
  } catch {
    invalid();
  }
}
export function parseShopExpenseReadPage(
  value: unknown,
  request: ShopExpenseReadRequest,
): ShopExpensePage {
  try {
    const intent = shopExpenseReadRequestSchema.parse(request),
      row = record(value, ["kind", "shopId", "page", "totalCount", "hasNext", "rows"]);
    if (
      row.kind !== intent.kind ||
      !sameId(uuid.parse(row.shopId), intent.expectedShopId) ||
      row.page !== intent.page
    )
      invalid();
    const parsed = page(row.rows, row.totalCount, intent);
    if (row.hasNext !== parsed.hasNext) invalid();
    return parsed;
  } catch {
    invalid();
  }
}
