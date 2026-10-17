/**
 * Unwired Auth outbox commands and strict queued-receipt comparison only.
 * There is no database, reservation, transaction, queue, dispatch or logging here.
 * A matching receipt is meaningful only when supplied by the future trusted,
 * canonical database adapter after its independently verified atomic commit.
 * That future RPC must reserve original source identity, compare immutable
 * fingerprints, persist all private recipient payloads and enqueue only their
 * references in one transaction. Lost acknowledgments require compatible replay;
 * neither this command nor a copied receipt proves that work was committed.
 */
import {
  isNativeAuthEmailPlan,
  NATIVE_AUTH_EMAIL_PROJECT_REF,
  type NativeAuthEmailPlan,
} from "./native-auth-email-plan.server";
import { isPreparedResendAuthEmail } from "./resend-auth-attempt.server";

export const NATIVE_AUTH_EMAIL_RESERVATION_VERSION = "365-auth-outbox/v1";

type ReservationCode =
  | "invalid_plan"
  | "invalid_prepared"
  | "invalid_reservation"
  | "invalid_receipt"
  | "reservation_unavailable";

export class NativeAuthEmailReservationError extends Error {
  constructor(readonly code: ReservationCode) {
    super("Auth email reservation failed.");
    this.name = "NativeAuthEmailReservationError";
  }
}

type ReservationSlot = Readonly<{
  slot: NativeAuthEmailPlan["commands"][number]["slot"];
  deliveryId: string;
  requestFingerprint: string;
  idempotencyKey: string;
  provider: "resend";
  /** Private provider request bytes may contain Auth secrets; never log/expose. */
  body: string;
}>;

export type NativeAuthEmailReservation = Readonly<{
  version: typeof NATIVE_AUTH_EMAIL_RESERVATION_VERSION;
  projectRef: typeof NATIVE_AUTH_EMAIL_PROJECT_REF;
  sourceKind: "supabase_auth";
  planVersion: NativeAuthEmailPlan["version"];
  subjectId: string;
  sourceEventKey: string;
  sourceEventId: string;
  bodyFingerprint: string;
  planFingerprint: string;
  /** Private outbox storage input, not a plain message-queue payload. */
  slots: readonly ReservationSlot[];
}>;

export type NativeAuthEmailQueued = Readonly<{
  state: "queued";
  sourceEventKey: string;
  deliveryIds: readonly string[];
}>;

const reservations = new WeakSet<NativeAuthEmailReservation>();
const MAX_INT64 = "9223372036854775807";

function fail(code: ReservationCode): never {
  throw new NativeAuthEmailReservationError(code);
}

function exactDataFields(
  value: unknown,
  fields: readonly string[],
  code: "invalid_prepared" | "invalid_receipt",
): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) fail(code);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (
    Reflect.ownKeys(descriptors).length !== fields.length ||
    fields.some((field) => !Object.hasOwn(descriptors, field) || !("value" in descriptors[field]))
  )
    fail(code);
  return Object.fromEntries(fields.map((field) => [field, descriptors[field].value]));
}

/** Snapshot a dense bounded array without invoking element getters/iterators. */
function arrayData(
  value: unknown,
  expectedLength: number,
  code: "invalid_prepared" | "invalid_receipt",
): readonly unknown[] {
  if (!Array.isArray(value)) fail(code);
  const length = Object.getOwnPropertyDescriptor(value, "length");
  if (!length || !("value" in length) || length.value !== expectedLength) fail(code);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (Reflect.ownKeys(descriptors).length !== expectedLength + 1) fail(code);
  const result: unknown[] = [];
  for (let index = 0; index < expectedLength; index++) {
    const descriptor = descriptors[String(index)];
    if (!descriptor || !("value" in descriptor)) fail(code);
    result.push(descriptor.value);
  }
  return result;
}

/**
 * Build private commit inputs from actual planner/preparation instances only.
 * Original source-event uniqueness deliberately excludes planner/provider
 * versions. Exact prepared bytes/key/fingerprint must persist together; a future
 * version or render change must conflict, not authorize a second source event.
 */
export function createNativeAuthEmailReservation(
  plan: unknown,
  prepared: readonly unknown[],
): NativeAuthEmailReservation {
  try {
    if (!isNativeAuthEmailPlan(plan)) fail("invalid_plan");
    const items = arrayData(prepared, plan.commands.length, "invalid_prepared");
    const byDelivery = new Map<string, ReservationSlot>();
    for (const item of items) {
      if (!isPreparedResendAuthEmail(item, plan)) fail("invalid_prepared");
      const command = plan.commands.find((entry) => entry.deliveryId === item.deliveryId);
      if (!command || byDelivery.has(item.deliveryId)) fail("invalid_prepared");
      byDelivery.set(
        item.deliveryId,
        Object.freeze({
          slot: command.slot,
          deliveryId: item.deliveryId,
          requestFingerprint: item.requestFingerprint,
          idempotencyKey: item.idempotencyKey,
          provider: "resend" as const,
          body: item.body,
        }),
      );
    }
    const slots = plan.commands.map((command) => {
      const slot = byDelivery.get(command.deliveryId);
      if (!slot) fail("invalid_prepared");
      return slot;
    });
    const result: NativeAuthEmailReservation = Object.freeze({
      version: NATIVE_AUTH_EMAIL_RESERVATION_VERSION,
      projectRef: NATIVE_AUTH_EMAIL_PROJECT_REF,
      sourceKind: "supabase_auth",
      planVersion: plan.version,
      subjectId: plan.subjectId,
      sourceEventKey: JSON.stringify(["supabase_auth", plan.projectRef, plan.eventId]),
      sourceEventId: plan.eventId,
      bodyFingerprint: plan.bodyFingerprint,
      planFingerprint: plan.planFingerprint,
      slots: Object.freeze(slots),
    });
    reservations.add(result);
    return result;
  } catch (error) {
    if (error instanceof NativeAuthEmailReservationError) throw error;
    return fail("reservation_unavailable");
  }
}

function positiveInt64(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[1-9][0-9]{0,18}$/.test(value) &&
    (value.length < MAX_INT64.length || value <= MAX_INT64)
  );
}

/**
 * Compare an exact queued receipt against private actual commit inputs. This is
 * not evidence of storage by itself: callers must reject SDK errors/unknown
 * outcomes and obtain this receipt from the trusted committed database RPC.
 * No hook success, provider acceptance, delivery, dedupe or atomicity is inferred.
 */
export function assertNativeAuthEmailQueued(
  reservation: NativeAuthEmailReservation,
  receipt: unknown,
): NativeAuthEmailQueued {
  try {
    if (typeof reservation !== "object" || reservation === null || !reservations.has(reservation))
      fail("invalid_reservation");
    const row = exactDataFields(
      receipt,
      [
        "version",
        "projectRef",
        "sourceKind",
        "planVersion",
        "subjectId",
        "sourceEventKey",
        "bodyFingerprint",
        "planFingerprint",
        "state",
        "slots",
      ],
      "invalid_receipt",
    );
    if (
      row.version !== reservation.version ||
      row.projectRef !== reservation.projectRef ||
      row.sourceKind !== reservation.sourceKind ||
      row.planVersion !== reservation.planVersion ||
      row.subjectId !== reservation.subjectId ||
      row.sourceEventKey !== reservation.sourceEventKey ||
      row.bodyFingerprint !== reservation.bodyFingerprint ||
      row.planFingerprint !== reservation.planFingerprint ||
      row.state !== "queued"
    )
      fail("invalid_receipt");
    const slots = arrayData(row.slots, reservation.slots.length, "invalid_receipt");
    const deliveries = new Set<string>();
    const queueIds = new Set<string>();
    for (const value of slots) {
      const slot = exactDataFields(
        value,
        ["deliveryId", "requestFingerprint", "idempotencyKey", "queueMessageId", "state"],
        "invalid_receipt",
      );
      const expected = reservation.slots.find((item) => item.deliveryId === slot.deliveryId);
      if (
        !expected ||
        deliveries.has(expected.deliveryId) ||
        slot.requestFingerprint !== expected.requestFingerprint ||
        slot.idempotencyKey !== expected.idempotencyKey ||
        !positiveInt64(slot.queueMessageId) ||
        queueIds.has(slot.queueMessageId) ||
        slot.state !== "queued"
      )
        fail("invalid_receipt");
      deliveries.add(expected.deliveryId);
      queueIds.add(slot.queueMessageId);
    }
    return Object.freeze({
      state: "queued" as const,
      sourceEventKey: reservation.sourceEventKey,
      deliveryIds: Object.freeze(reservation.slots.map((slot) => slot.deliveryId)),
    });
  } catch (error) {
    if (error instanceof NativeAuthEmailReservationError) throw error;
    return fail("invalid_receipt");
  }
}
