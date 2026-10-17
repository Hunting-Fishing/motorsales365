// @vitest-environment node
// Actual HMAC verifier -> planner -> preparation -> reservation/receipt parser.
// Synthetic input only; constructed receipts below are NOT database evidence.
import { createHash, createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { verifyStandardWebhook } from "../webhooks/standard-webhooks.server";
import {
  NATIVE_AUTH_EMAIL_PROJECT_REF,
  NATIVE_AUTH_EMAIL_SITE_ORIGIN,
  NATIVE_AUTH_EMAIL_SUPABASE_ORIGIN,
  planNativeAuthEmail,
  type NativeAuthEmailPlan,
} from "./native-auth-email-plan.server";
import {
  RESEND_AUTH_VERSION,
  RESEND_EMAIL_ENDPOINT,
  prepareNativeAuthResendEmail,
} from "./resend-auth-attempt.server";
import {
  NATIVE_AUTH_EMAIL_RESERVATION_VERSION,
  NativeAuthEmailReservationError,
  assertNativeAuthEmailQueued,
  createNativeAuthEmailReservation,
  type NativeAuthEmailReservation,
} from "./native-auth-email-reservation.server";

const key = Buffer.alloc(32, 0x64);
const secret = `v1,whsec_${key.toString("base64")}`;
const timestamp = 1_800_000_000;
const eventId = "synthetic_auth_outbox-42";
const subjectId = "12345678-1234-4234-8234-123456789abc";
const currentEmail = "current@example.invalid";
const newEmail = "new@example.invalid";
const privateToken = "SyntheticPrivateOtp_42";
const renderedSecret = "synthetic-private-rendered-secret";

function payload(action = "signup", changed = false) {
  return {
    user: {
      id: subjectId,
      email: currentEmail,
      ...(action === "email_change" ? { new_email: newEmail } : {}),
    },
    email_data: {
      site_url: NATIVE_AUTH_EMAIL_SUPABASE_ORIGIN,
      redirect_to: "",
      email_action_type: action,
      token: changed ? "ChangedSyntheticOtp_84" : privateToken,
      token_hash: "synthetic-token-hash-abcdef0123456789",
      token_new: action === "email_change" ? "SyntheticNewOtp_84" : "",
      token_hash_new: action === "email_change" ? "synthetic-new-hash-0123456789abcdef" : "",
    },
  };
}

async function actualPlan(action = "signup", changed = false, sourceId = eventId) {
  const body = JSON.stringify(payload(action, changed));
  const signature = createHmac("sha256", key)
    .update(`${sourceId}.${timestamp}.${body}`, "utf8")
    .digest("base64");
  const verifiedWebhook = await verifyStandardWebhook(
    new Request("https://example.invalid/synthetic-auth-hook", {
      method: "POST",
      headers: {
        "webhook-id": sourceId,
        "webhook-timestamp": String(timestamp),
        "webhook-signature": `v1,${signature}`,
      },
      body,
    }),
    secret,
  );
  return planNativeAuthEmail({
    verifiedWebhook,
    policy: {
      projectRef: NATIVE_AUTH_EMAIL_PROJECT_REF,
      siteOrigin: NATIVE_AUTH_EMAIL_SITE_ORIGIN,
      secureEmailChange: true,
    },
  });
}

async function actualPrepared(plan: NativeAuthEmailPlan, suffix = "") {
  return Promise.all(
    plan.commands.map((command) =>
      prepareNativeAuthResendEmail(
        plan,
        command.deliveryId,
        {
          subject: `Synthetic ${command.slot} confirmation${suffix}`,
          html: `<p>${renderedSecret} ${command.props.token} ${command.slot}${suffix}</p>`,
          text: `${renderedSecret} ${command.props.token} ${command.slot}${suffix}`,
        },
        { projectRef: NATIVE_AUTH_EMAIL_PROJECT_REF, from: "noreply@365motorsales.com" },
      ),
    ),
  );
}

async function fixture(action = "signup") {
  const plan = await actualPlan(action);
  const prepared = await actualPrepared(plan);
  const reservation = createNativeAuthEmailReservation(plan, prepared);
  return { plan, prepared, reservation };
}

function receipt(reservation: NativeAuthEmailReservation): Record<string, unknown> {
  return {
    version: reservation.version,
    projectRef: reservation.projectRef,
    sourceKind: reservation.sourceKind,
    planVersion: reservation.planVersion,
    subjectId: reservation.subjectId,
    sourceEventKey: reservation.sourceEventKey,
    bodyFingerprint: reservation.bodyFingerprint,
    planFingerprint: reservation.planFingerprint,
    state: "queued",
    slots: reservation.slots.map((slot, index) => ({
      deliveryId: slot.deliveryId,
      requestFingerprint: slot.requestFingerprint,
      idempotencyKey: slot.idempotencyKey,
      queueMessageId: String(index + 1),
      state: "queued",
    })),
  };
}

function slots(row: Record<string, unknown>): Record<string, unknown>[] {
  return row.slots as Record<string, unknown>[];
}

function rejects(operation: () => unknown) {
  try {
    operation();
  } catch (error) {
    expect(error).toBeInstanceOf(NativeAuthEmailReservationError);
    expect(error).toHaveProperty("message", "Auth email reservation failed.");
    expect(error).toHaveProperty("code", expect.any(String));
    expect(error).not.toHaveProperty("cause");
    for (const privateValue of [secret, privateToken, currentEmail, renderedSecret, eventId]) {
      expect(String(error)).not.toContain(privateValue);
    }
    return error;
  }
  throw new Error("Expected synthetic reservation boundary to reject");
}

beforeEach(() => {
  vi.spyOn(Date, "now").mockReturnValue(timestamp * 1000);
  vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Unexpected synthetic fetch"));
  vi.spyOn(console, "log").mockImplementation(() => undefined);
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  expect(globalThis.fetch).not.toHaveBeenCalled();
  expect(console.log).not.toHaveBeenCalled();
  expect(console.warn).not.toHaveBeenCalled();
  expect(console.error).not.toHaveBeenCalled();
  vi.restoreAllMocks();
});

describe("unwired native Auth reservation commands", () => {
  it("binds canonical original source identity independently of planner/provider versions", async () => {
    const { plan, reservation } = await fixture();
    expect(NATIVE_AUTH_EMAIL_RESERVATION_VERSION).toBe("365-auth-outbox/v1");
    expect(reservation.version).toBe("365-auth-outbox/v1");
    expect(reservation.projectRef).toBe(NATIVE_AUTH_EMAIL_PROJECT_REF);
    expect(reservation.sourceKind).toBe("supabase_auth");
    expect(reservation.planVersion).toBe(plan.version);
    expect(reservation.subjectId).toBe(subjectId);
    expect(reservation.sourceEventId).toBe(eventId);
    expect(reservation.sourceEventKey).toBe(
      JSON.stringify(["supabase_auth", NATIVE_AUTH_EMAIL_PROJECT_REF, eventId]),
    );
    expect(reservation.sourceEventKey).not.toContain(plan.version);
    expect(reservation.sourceEventKey).not.toContain(RESEND_AUTH_VERSION);
    expect(reservation.bodyFingerprint).toBe(plan.bodyFingerprint);
    expect(reservation.planFingerprint).toBe(plan.planFingerprint);
    expect(reservation).not.toHaveProperty("state");
    expect(reservation).not.toHaveProperty("queued");
  });

  it("retains exact prepared private bytes and independent provider fingerprint", async () => {
    const { plan, prepared, reservation } = await fixture();
    const item = prepared[0];
    const expectedFingerprint = createHash("sha256")
      .update(
        JSON.stringify([
          RESEND_AUTH_VERSION,
          NATIVE_AUTH_EMAIL_PROJECT_REF,
          RESEND_EMAIL_ENDPOINT,
          item.idempotencyKey,
          item.body,
        ]),
        "utf8",
      )
      .digest("hex");
    expect(reservation.slots).toEqual([
      {
        slot: plan.commands[0].slot,
        deliveryId: item.deliveryId,
        requestFingerprint: expectedFingerprint,
        idempotencyKey: item.idempotencyKey,
        provider: "resend",
        body: item.body,
      },
    ]);
    expect(reservation.slots[0].body).toContain(renderedSecret);
    expect(Object.isFrozen(reservation)).toBe(true);
    expect(Object.isFrozen(reservation.slots)).toBe(true);
    expect(Object.isFrozen(reservation.slots[0])).toBe(true);
  });

  it("puts both secure-change recipients in planner order even if preparation input is reversed", async () => {
    const { plan, prepared } = await fixture("email_change");
    const reversed = [...prepared].reverse();
    const reservation = createNativeAuthEmailReservation(plan, reversed);
    expect(reservation.slots.map((slot) => slot.slot)).toEqual(["current", "new"]);
    expect(reservation.slots.map((slot) => JSON.parse(slot.body).to)).toEqual([
      [currentEmail],
      [newEmail],
    ]);
    expect(reservation.slots.map((slot) => slot.deliveryId)).toEqual(
      plan.commands.map((command) => command.deliveryId),
    );
    expect(reversed).toEqual([...prepared].reverse());
  });

  it("keeps changed source content under the same original event identity but different fingerprints", async () => {
    const first = await fixture();
    const changedPlan = await actualPlan("signup", true);
    const changed = createNativeAuthEmailReservation(
      changedPlan,
      await actualPrepared(changedPlan),
    );
    expect(changed.sourceEventKey).toBe(first.reservation.sourceEventKey);
    expect(changed.slots[0].deliveryId).toBe(first.reservation.slots[0].deliveryId);
    expect(changed.bodyFingerprint).not.toBe(first.reservation.bodyFingerprint);
    expect(changed.planFingerprint).not.toBe(first.reservation.planFingerprint);
    expect(changed.slots[0].requestFingerprint).not.toBe(
      first.reservation.slots[0].requestFingerprint,
    );
    rejects(() => assertNativeAuthEmailQueued(changed, receipt(first.reservation)));
  });

  it("detects changed rendering under an unchanged source/plan identity through exact request fingerprint", async () => {
    const { plan, reservation } = await fixture();
    const changed = createNativeAuthEmailReservation(plan, await actualPrepared(plan, " changed"));
    expect(changed.sourceEventKey).toBe(reservation.sourceEventKey);
    expect(changed.bodyFingerprint).toBe(reservation.bodyFingerprint);
    expect(changed.planFingerprint).toBe(reservation.planFingerprint);
    expect(changed.slots[0].idempotencyKey).toBe(reservation.slots[0].idempotencyKey);
    expect(changed.slots[0].requestFingerprint).not.toBe(reservation.slots[0].requestFingerprint);
    rejects(() => assertNativeAuthEmailQueued(changed, receipt(reservation)));
  });

  it("distinguishes different upstream event IDs", async () => {
    const first = await fixture();
    const otherPlan = await actualPlan("signup", false, "synthetic_other_event");
    const other = createNativeAuthEmailReservation(otherPlan, await actualPrepared(otherPlan));
    expect(other.sourceEventKey).not.toBe(first.reservation.sourceEventKey);
    rejects(() => assertNativeAuthEmailQueued(other, receipt(first.reservation)));
  });

  it("requires the same actual originating plan instance even when all structural identities match", async () => {
    const first = await fixture();
    const secondPlan = await actualPlan();
    const secondPrepared = await actualPrepared(secondPlan);
    expect(secondPrepared).toEqual(first.prepared);
    rejects(() => createNativeAuthEmailReservation(first.plan, secondPrepared));
  });

  it("rejects fabricated, cloned and proxied planner/prepared capabilities", async () => {
    const { plan, prepared } = await fixture();
    for (const fakePlan of [
      null,
      {},
      { ...plan },
      JSON.parse(JSON.stringify(plan)),
      new Proxy(plan, {}),
    ]) {
      rejects(() => createNativeAuthEmailReservation(fakePlan, prepared));
    }
    for (const fakePrepared of [
      { ...prepared[0] },
      JSON.parse(JSON.stringify(prepared[0])),
      new Proxy(prepared[0], {}),
    ]) {
      rejects(() => createNativeAuthEmailReservation(plan, [fakePrepared]));
    }
  });

  it("requires all slots exactly once without missing, extra or duplicate preparations", async () => {
    const { plan, prepared } = await fixture("email_change");
    const other = await fixture();
    for (const items of [
      [],
      [prepared[0]],
      [prepared[1]],
      [prepared[0], prepared[0]],
      [...prepared, prepared[0]],
      [prepared[0], other.prepared[0]],
    ]) {
      rejects(() => createNativeAuthEmailReservation(plan, items));
    }
  });

  it("rejects sparse or non-array preparation containers without invoking element getters", async () => {
    const { plan, prepared } = await fixture();
    for (const malformed of [null, {}, { 0: prepared[0], length: 1 }, new Array(1)]) {
      rejects(() => createNativeAuthEmailReservation(plan, malformed as readonly unknown[]));
    }
    const getter = vi.fn(() => prepared[0]);
    const items: unknown[] = [prepared[0]];
    Object.defineProperty(items, "0", { get: getter });
    rejects(() => createNativeAuthEmailReservation(plan, items));
    expect(getter).not.toHaveBeenCalled();
  });

  it("rejects an oversized preparation array before enumerating indexed descriptors", async () => {
    const { plan, prepared } = await fixture();
    const indices = vi.fn();
    const keys = vi.fn((value: unknown[]) => Reflect.ownKeys(value));
    const oversized = new Proxy(Array(5).fill(prepared[0]), {
      ownKeys: keys,
      getOwnPropertyDescriptor(value, field) {
        if (field !== "length") indices();
        return Reflect.getOwnPropertyDescriptor(value, field);
      },
    });
    rejects(() => createNativeAuthEmailReservation(plan, oversized));
    expect(indices).not.toHaveBeenCalled();
    expect(keys).not.toHaveBeenCalled();
  });
});

describe("strict queued receipt comparison, not a durable database implementation", () => {
  it("accepts an exact comparison receipt and exposes no private bodies or provider-delivery claims", async () => {
    const { reservation } = await fixture("email_change");
    const parsed = assertNativeAuthEmailQueued(reservation, receipt(reservation));
    expect(parsed).toEqual({
      state: "queued",
      sourceEventKey: reservation.sourceEventKey,
      deliveryIds: reservation.slots.map((slot) => slot.deliveryId),
    });
    expect(Object.isFrozen(parsed)).toBe(true);
    expect(Object.isFrozen(parsed.deliveryIds)).toBe(true);
    expect(JSON.stringify(parsed)).not.toContain(renderedSecret);
    expect(parsed).not.toHaveProperty("providerMessageId");
    expect(parsed).not.toHaveProperty("delivered");
    expect(parsed).not.toHaveProperty("transactionCommitted");
  });

  it("matches receipt slots by exact delivery identity and returns planner order", async () => {
    const { reservation } = await fixture("email_change");
    const row = receipt(reservation);
    slots(row).reverse();
    expect(assertNativeAuthEmailQueued(reservation, row).deliveryIds).toEqual(
      reservation.slots.map((slot) => slot.deliveryId),
    );
  });

  it("does not mistake deterministic recreation/comparison for an in-memory durable reservation store", async () => {
    const { plan, prepared, reservation } = await fixture();
    const repeated = createNativeAuthEmailReservation(plan, prepared);
    expect(repeated).not.toBe(reservation);
    expect(repeated).toEqual(reservation);
    // A structural receipt can match without any database having been called.
    // Only a future trusted adapter may treat a committed RPC result as a receipt.
    expect(assertNativeAuthEmailQueued(repeated, receipt(reservation)).state).toBe("queued");
  });

  it("rejects fabricated/copied reservation capabilities before receipt parsing", async () => {
    const { reservation } = await fixture();
    for (const fake of [
      null,
      {},
      { ...reservation },
      JSON.parse(JSON.stringify(reservation)),
      new Proxy(reservation, {}),
    ]) {
      rejects(() =>
        assertNativeAuthEmailQueued(fake as NativeAuthEmailReservation, receipt(reservation)),
      );
    }
  });

  for (const field of [
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
  ]) {
    it("requires exact own top-level field " + field, async () => {
      const { reservation } = await fixture();
      const row = receipt(reservation);
      delete row[field];
      rejects(() => assertNativeAuthEmailQueued(reservation, row));
    });
  }

  for (const field of [
    "version",
    "projectRef",
    "sourceKind",
    "planVersion",
    "subjectId",
    "sourceEventKey",
    "bodyFingerprint",
    "planFingerprint",
  ]) {
    it("rejects changed top-level identity " + field, async () => {
      const { reservation } = await fixture();
      rejects(() =>
        assertNativeAuthEmailQueued(reservation, {
          ...receipt(reservation),
          [field]: "wrong-synthetic-identity",
        }),
      );
    });
  }

  for (const state of [
    "sent",
    "provider_accepted",
    "delivery_confirmed",
    "pending",
    "suppressed",
    "failed",
    "outcome_unknown",
    "dlq",
    null,
    true,
  ]) {
    it("rejects non-queued top-level state " + JSON.stringify(state), async () => {
      const { reservation } = await fixture();
      rejects(() => assertNativeAuthEmailQueued(reservation, { ...receipt(reservation), state }));
    });
  }

  for (const field of [
    "deliveryId",
    "requestFingerprint",
    "idempotencyKey",
    "queueMessageId",
    "state",
  ]) {
    it("requires exact own recipient field " + field, async () => {
      const { reservation } = await fixture();
      const row = receipt(reservation);
      delete slots(row)[0][field];
      rejects(() => assertNativeAuthEmailQueued(reservation, row));
    });
  }

  for (const field of ["deliveryId", "requestFingerprint", "idempotencyKey"]) {
    it("rejects changed recipient identity " + field, async () => {
      const { reservation } = await fixture();
      const row = receipt(reservation);
      slots(row)[0][field] = "wrong-synthetic-identity";
      rejects(() => assertNativeAuthEmailQueued(reservation, row));
    });
  }

  for (const state of [
    "sent",
    "provider_accepted",
    "delivery_confirmed",
    "pending",
    "suppressed",
    "failed",
    "outcome_unknown",
    "dlq",
    null,
    true,
  ]) {
    it("rejects non-queued recipient state " + JSON.stringify(state), async () => {
      const { reservation } = await fixture();
      const row = receipt(reservation);
      slots(row)[0].state = state;
      rejects(() => assertNativeAuthEmailQueued(reservation, row));
    });
  }

  for (const queueMessageId of ["1", "9007199254740993", "9223372036854775807"]) {
    it("preserves positive decimal int64 queue identity " + queueMessageId, async () => {
      const { reservation } = await fixture();
      const row = receipt(reservation);
      slots(row)[0].queueMessageId = queueMessageId;
      expect(assertNativeAuthEmailQueued(reservation, row).state).toBe("queued");
    });
  }

  for (const queueMessageId of [
    "",
    "0",
    "01",
    "+1",
    "-1",
    "1.0",
    "1e3",
    " 1",
    "1 ",
    "9223372036854775808",
    "99999999999999999999",
    "１２",
    1,
    Number("9007199254740993"),
    null,
    true,
  ]) {
    it(
      "rejects noncanonical/overflow/non-string queue identity " + JSON.stringify(queueMessageId),
      async () => {
        const { reservation } = await fixture();
        const row = receipt(reservation);
        slots(row)[0].queueMessageId = queueMessageId;
        rejects(() => assertNativeAuthEmailQueued(reservation, row));
      },
    );
  }

  it("requires every fanout acknowledgment once, with different queue IDs", async () => {
    const { reservation } = await fixture("email_change");
    for (const change of [
      (row: Record<string, unknown>) => {
        row.slots = [];
      },
      (row: Record<string, unknown>) => {
        slots(row).pop();
      },
      (row: Record<string, unknown>) => {
        slots(row).push(slots(row)[0]);
      },
      (row: Record<string, unknown>) => {
        slots(row)[1] = { ...slots(row)[0], queueMessageId: "2" };
      },
      (row: Record<string, unknown>) => {
        slots(row)[1].queueMessageId = slots(row)[0].queueMessageId;
      },
    ]) {
      const row = receipt(reservation);
      change(row);
      rejects(() => assertNativeAuthEmailQueued(reservation, row));
    }
  });

  it("rejects SDK result wrappers, errors, nulls and malformed top-level/slot containers", async () => {
    const { reservation } = await fixture();
    for (const malformed of [
      null,
      undefined,
      true,
      "queued",
      [],
      { data: receipt(reservation), error: null },
      { error: "synthetic SDK failure" },
    ]) {
      rejects(() => assertNativeAuthEmailQueued(reservation, malformed));
    }
    for (const malformed of [
      null,
      {},
      "queued",
      new Array(1),
      { 0: slots(receipt(reservation))[0], length: 1 },
    ]) {
      rejects(() =>
        assertNativeAuthEmailQueued(reservation, { ...receipt(reservation), slots: malformed }),
      );
    }
    for (const malformed of [null, [], "queued", true]) {
      rejects(() =>
        assertNativeAuthEmailQueued(reservation, { ...receipt(reservation), slots: [malformed] }),
      );
    }
  });

  it("rejects an oversized receipt array before enumerating indexed descriptors", async () => {
    const { reservation } = await fixture();
    const row = receipt(reservation);
    const indices = vi.fn();
    const keys = vi.fn((value: unknown[]) => Reflect.ownKeys(value));
    row.slots = new Proxy(Array(5).fill(slots(row)[0]), {
      ownKeys: keys,
      getOwnPropertyDescriptor(value, field) {
        if (field !== "length") indices();
        return Reflect.getOwnPropertyDescriptor(value, field);
      },
    });
    rejects(() => assertNativeAuthEmailQueued(reservation, row));
    expect(indices).not.toHaveBeenCalled();
    expect(keys).not.toHaveBeenCalled();
  });

  it("rejects extra string/symbol/nonenumerable fields at either record level or in the array", async () => {
    const { reservation } = await fixture();
    for (const field of ["unexpected", Symbol("unexpected")]) {
      const row = receipt(reservation);
      Object.defineProperty(row, field, { value: renderedSecret, enumerable: false });
      rejects(() => assertNativeAuthEmailQueued(reservation, row));
      const nested = receipt(reservation);
      Object.defineProperty(slots(nested)[0], field, { value: renderedSecret, enumerable: false });
      rejects(() => assertNativeAuthEmailQueued(reservation, nested));
      const array = receipt(reservation);
      Object.defineProperty(slots(array), field, { value: renderedSecret, enumerable: false });
      rejects(() => assertNativeAuthEmailQueued(reservation, array));
    }
  });

  it("requires fields to be own data properties, not inherited fields or accessors", async () => {
    const { reservation } = await fixture();
    const row = receipt(reservation);
    const inherited = Object.create(row);
    rejects(() => assertNativeAuthEmailQueued(reservation, inherited));
    const getter = vi.fn(() => row.projectRef);
    Object.defineProperty(row, "projectRef", { get: getter });
    rejects(() => assertNativeAuthEmailQueued(reservation, row));
    expect(getter).not.toHaveBeenCalled();
    const nested = receipt(reservation);
    const nestedGetter = vi.fn(() => "1");
    Object.defineProperty(slots(nested)[0], "queueMessageId", { get: nestedGetter });
    rejects(() => assertNativeAuthEmailQueued(reservation, nested));
    expect(nestedGetter).not.toHaveBeenCalled();
    const array = receipt(reservation);
    const elementGetter = vi.fn(() => slots(receipt(reservation))[0]);
    Object.defineProperty(slots(array), "0", { get: elementGetter });
    rejects(() => assertNativeAuthEmailQueued(reservation, array));
    expect(elementGetter).not.toHaveBeenCalled();
  });

  it("contains throwing/revoked proxy failures behind the constant generic error", async () => {
    const { plan, prepared, reservation } = await fixture();
    const throwing = new Proxy(receipt(reservation), {
      ownKeys() {
        throw new Error(renderedSecret);
      },
    });
    rejects(() => assertNativeAuthEmailQueued(reservation, throwing));
    const descriptorThrow = new Proxy(receipt(reservation), {
      getOwnPropertyDescriptor() {
        throw new Error(privateToken);
      },
    });
    rejects(() => assertNativeAuthEmailQueued(reservation, descriptorThrow));
    const revoked = Proxy.revocable(receipt(reservation), {});
    revoked.revoke();
    rejects(() => assertNativeAuthEmailQueued(reservation, revoked.proxy));
    const array = new Proxy(prepared, {
      getOwnPropertyDescriptor() {
        throw new Error(renderedSecret);
      },
    });
    rejects(() => createNativeAuthEmailReservation(plan, array));
  });
});
