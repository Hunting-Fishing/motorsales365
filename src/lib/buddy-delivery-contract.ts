/**
 * UNWIRED 365 -> Buddy delivery-request data contract. No transport, secret,
 * database, outbox/inbox writer, assignment, contact resolver or activation.
 *
 * Canonical JSON is an immutable full-payload comparison value, not a signature,
 * durable dedupe/replay barrier or proof of sender/store/order authority. The
 * required expected tuple must come from a future independently authorized
 * store/order/leg lookup; this module cannot establish its provenance.
 *
 * Opaque area references do not prove coarse location. Their future resolver
 * needs reviewed precision/privacy rules. Private contact resolution remains
 * separately assignment/consent-gated; possession of a reference grants nothing.
 * Signature/clock/replay, atomic stock/order/outbox/inbox, operator eligibility,
 * coverage/hours, fees/payment/refunds, cancellation/reassignment, cross-app
 * identity, notifications and recovery remain explicit independent gates.
 */

export const BUDDY_DELIVERY_CONTRACT_FAILURE = "Invalid Buddy delivery contract.";
export const BUDDY_DELIVERY_REQUEST_VERSION = 1;
export const BUDDY_DELIVERY_MAX_SEQUENCE = 2_147_483_647;
export const BUDDY_DELIVERY_MAX_CANONICAL_BYTES = 4_096;

type ReferenceKind = "operation" | "order" | "store" | "leg" | "offer" | "area" | "contact";

export type BuddyDeliveryScope = Readonly<{
  storeId: string;
  orderId: string;
  fulfillmentLegId: string;
}>;

export type BuddyDeliveryRequest = Readonly<{
  version: 1;
  sender: "365";
  receiver: "buddy";
  eventKind: "delivery.requested";
  operationId: string;
  orderId: string;
  storeId: string;
  fulfillmentLegId: string;
  sequence: number;
  issuedAt: string;
  expiresAt: string;
  offer: Readonly<{
    offerId: string;
    pickupAreaRef: string;
    dropoffAreaRef: string;
  }>;
  privateContactRef: string;
}>;

/** Minimal display data only: not a live/eligible/accepted offer. */
export type BuddyDeliveryOffer = Readonly<{
  version: 1;
  offerId: string;
  expiresAt: string;
  pickupAreaRef: string;
  dropoffAreaRef: string;
}>;

export type BuddyDeliveryRequestBinding = Readonly<{
  operationId: string;
  canonicalPayload: string;
}>;

const requestKeys = [
  "version",
  "sender",
  "receiver",
  "eventKind",
  "operationId",
  "orderId",
  "storeId",
  "fulfillmentLegId",
  "sequence",
  "issuedAt",
  "expiresAt",
  "offer",
  "privateContactRef",
] as const;
const offerReferenceKeys = ["offerId", "pickupAreaRef", "dropoffAreaRef"] as const;
const scopeKeys = ["storeId", "orderId", "fulfillmentLegId"] as const;
const offerKeys = ["version", "offerId", "expiresAt", "pickupAreaRef", "dropoffAreaRef"] as const;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

function fail(): never {
  throw new Error(BUDDY_DELIVERY_CONTRACT_FAILURE);
}

/** Fixed two-level records only: no recursive walk or raw JSON/body parser. */
function exact(value: unknown, keys: readonly string[]): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) fail();
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) fail();
  const fields = Reflect.ownKeys(value);
  if (
    fields.length !== keys.length ||
    fields.some((key) => typeof key !== "string" || !keys.includes(key))
  )
    fail();
  const result = Object.create(null) as Record<string, unknown>;
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !Object.hasOwn(descriptor, "value") || !descriptor.enumerable) fail();
    result[key] = descriptor.value;
  }
  return result;
}

function reference(value: unknown, kind: ReferenceKind): string {
  const prefix = `365:${kind}:`;
  if (
    typeof value !== "string" ||
    value.length !== prefix.length + 36 ||
    !value.startsWith(prefix) ||
    !uuid.test(value.slice(prefix.length))
  )
    fail();
  return value;
}

function timestamp(value: unknown): string {
  // A format bound, not a chosen delivery TTL, current-clock or expiry policy.
  if (
    typeof value !== "string" ||
    value.length !== 24 ||
    !/^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$/.test(value) ||
    value.startsWith("0000-")
  )
    fail();
  const milliseconds = Date.parse(value);
  if (!Number.isFinite(milliseconds) || new Date(milliseconds).toISOString() !== value) fail();
  return value;
}

function canonical(request: BuddyDeliveryRequest): string {
  // These objects are newly constructed in fixed v1 field order; all values
  // are bounded ASCII scalars, with one fixed nested record and no arrays.
  // Null prototypes prevent inherited toJSON from changing the comparison
  // bytes. The copies contain only our validated own data, never raw input.
  const safe = Object.assign(Object.create(null), request);
  safe.offer = Object.assign(Object.create(null), request.offer);
  const result = JSON.stringify(safe);
  if (new TextEncoder().encode(result).byteLength > BUDDY_DELIVERY_MAX_CANONICAL_BYTES) fail();
  return result;
}

/** Decodes structural data only; never labels the caller or payload trusted. */
export function parseBuddyDeliveryRequest(value: unknown): BuddyDeliveryRequest {
  try {
    const source = exact(value, requestKeys);
    if (
      source.version !== BUDDY_DELIVERY_REQUEST_VERSION ||
      source.sender !== "365" ||
      source.receiver !== "buddy" ||
      source.eventKind !== "delivery.requested"
    )
      fail();
    if (
      typeof source.sequence !== "number" ||
      !Number.isSafeInteger(source.sequence) ||
      source.sequence < 1 ||
      source.sequence > BUDDY_DELIVERY_MAX_SEQUENCE
    )
      fail();
    const offer = exact(source.offer, offerReferenceKeys);
    const issuedAt = timestamp(source.issuedAt);
    const expiresAt = timestamp(source.expiresAt);
    if (Date.parse(expiresAt) <= Date.parse(issuedAt)) fail();
    const result = Object.freeze({
      version: 1 as const,
      sender: "365" as const,
      receiver: "buddy" as const,
      eventKind: "delivery.requested" as const,
      operationId: reference(source.operationId, "operation"),
      orderId: reference(source.orderId, "order"),
      storeId: reference(source.storeId, "store"),
      fulfillmentLegId: reference(source.fulfillmentLegId, "leg"),
      sequence: source.sequence,
      issuedAt,
      expiresAt,
      offer: Object.freeze({
        offerId: reference(offer.offerId, "offer"),
        pickupAreaRef: reference(offer.pickupAreaRef, "area"),
        dropoffAreaRef: reference(offer.dropoffAreaRef, "area"),
      }),
      privateContactRef: reference(source.privateContactRef, "contact"),
    });
    canonical(result);
    return result;
  } catch {
    return fail();
  }
}

/** Fixed v1 JSON ordering, not a general JSON canonicalization/signing standard. */
export function serializeBuddyDeliveryRequest(value: unknown): string {
  return canonical(parseBuddyDeliveryRequest(value));
}

/**
 * Full immutable request binding. Same operation + different canonical payload
 * is a conflict for a future durable writer, not a successful duplicate here.
 * Missing/mismatched expected scope fails; no database authority is inferred.
 */
export function createBuddyDeliveryRequestBinding(
  value: unknown,
  expectedScope: BuddyDeliveryScope,
): BuddyDeliveryRequestBinding {
  try {
    const scope = exact(expectedScope, scopeKeys);
    const storeId = reference(scope.storeId, "store");
    const orderId = reference(scope.orderId, "order");
    const fulfillmentLegId = reference(scope.fulfillmentLegId, "leg");
    const request = parseBuddyDeliveryRequest(value);
    if (
      request.storeId !== storeId ||
      request.orderId !== orderId ||
      request.fulfillmentLegId !== fulfillmentLegId
    )
      fail();
    return Object.freeze({
      operationId: request.operationId,
      canonicalPayload: canonical(request),
    });
  } catch {
    return fail();
  }
}

/** Strictly minimizes request data; authorization/eligibility is not performed. */
export function projectBuddyDeliveryOffer(value: unknown): BuddyDeliveryOffer {
  const request = parseBuddyDeliveryRequest(value);
  return Object.freeze({
    version: 1 as const,
    offerId: request.offer.offerId,
    expiresAt: request.expiresAt,
    pickupAreaRef: request.offer.pickupAreaRef,
    dropoffAreaRef: request.offer.dropoffAreaRef,
  });
}

/** Structural offer decoding only; not an assignment or contact-access token. */
export function parseBuddyDeliveryOffer(value: unknown): BuddyDeliveryOffer {
  try {
    const source = exact(value, offerKeys);
    if (source.version !== BUDDY_DELIVERY_REQUEST_VERSION) fail();
    return Object.freeze({
      version: 1 as const,
      offerId: reference(source.offerId, "offer"),
      expiresAt: timestamp(source.expiresAt),
      pickupAreaRef: reference(source.pickupAreaRef, "area"),
      dropoffAreaRef: reference(source.dropoffAreaRef, "area"),
    });
  } catch {
    return fail();
  }
}
