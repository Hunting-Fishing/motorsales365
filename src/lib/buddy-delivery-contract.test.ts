// Pure unwired data-contract tests. No network, database, signature/provider,
// durable outbox/inbox, Auth, actual area/contact resolution or delivery policy.
import { describe, expect, it, vi } from "vitest";
import {
  BUDDY_DELIVERY_CONTRACT_FAILURE,
  BUDDY_DELIVERY_MAX_CANONICAL_BYTES,
  BUDDY_DELIVERY_MAX_SEQUENCE,
  createBuddyDeliveryRequestBinding,
  parseBuddyDeliveryOffer,
  parseBuddyDeliveryRequest,
  projectBuddyDeliveryOffer,
  serializeBuddyDeliveryRequest,
  type BuddyDeliveryRequest,
  type BuddyDeliveryScope,
} from "./buddy-delivery-contract";

const uuid = "12345678-1234-4123-8123-123456789abc";
const otherUuid = "abcdefab-cdef-4abc-8def-abcdefabcdef";
const ref = (kind: string, id = uuid) => `365:${kind}:${id}`;
function request(): BuddyDeliveryRequest {
  return {
    version: 1,
    sender: "365",
    receiver: "buddy",
    eventKind: "delivery.requested",
    operationId: ref("operation"),
    orderId: ref("order"),
    storeId: ref("store"),
    fulfillmentLegId: ref("leg"),
    sequence: 1,
    issuedAt: "2026-10-17T00:00:00.000Z",
    expiresAt: "2026-10-17T01:00:00.000Z",
    offer: {
      offerId: ref("offer"),
      pickupAreaRef: ref("area"),
      dropoffAreaRef: ref("area", otherUuid),
    },
    privateContactRef: ref("contact"),
  };
}
function scope(): BuddyDeliveryScope {
  return { storeId: ref("store"), orderId: ref("order"), fulfillmentLegId: ref("leg") };
}
function invalid(run: () => unknown) {
  expect(run).toThrowError(BUDDY_DELIVERY_CONTRACT_FAILURE);
}

describe("unwired 365 -> Buddy request decoding and full canonical binding", () => {
  it("fixes the request identity and produces exact deterministic v1 JSON", () => {
    const payload = request();
    const expected =
      '{"version":1,"sender":"365","receiver":"buddy","eventKind":"delivery.requested",' +
      `"operationId":"${ref("operation")}","orderId":"${ref("order")}",` +
      `"storeId":"${ref("store")}","fulfillmentLegId":"${ref("leg")}",` +
      '"sequence":1,"issuedAt":"2026-10-17T00:00:00.000Z","expiresAt":"2026-10-17T01:00:00.000Z",' +
      `"offer":{"offerId":"${ref("offer")}","pickupAreaRef":"${ref("area")}",` +
      `"dropoffAreaRef":"${ref("area", otherUuid)}"},"privateContactRef":"${ref("contact")}"}`;
    expect(parseBuddyDeliveryRequest(payload)).toEqual(payload);
    expect(serializeBuddyDeliveryRequest(payload)).toBe(expected);
    expect(new TextEncoder().encode(expected).byteLength).toBeLessThanOrEqual(
      BUDDY_DELIVERY_MAX_CANONICAL_BYTES,
    );
    expect(createBuddyDeliveryRequestBinding(payload, scope())).toEqual({
      operationId: payload.operationId,
      canonicalPayload: expected,
    });
  });

  it("canonicalizes field order only, including nested and null-prototype records", () => {
    const original = request();
    const reordered = Object.assign(
      Object.create(null),
      Object.fromEntries(Object.entries(original).reverse()),
    );
    reordered.offer = Object.assign(
      Object.create(null),
      Object.fromEntries(Object.entries(original.offer).reverse()),
    );
    expect(serializeBuddyDeliveryRequest(reordered)).toBe(serializeBuddyDeliveryRequest(original));
  });

  it("clones and freezes every accepted payload record without freezing caller input", () => {
    const original = request();
    const result = parseBuddyDeliveryRequest(original);
    const binding = createBuddyDeliveryRequestBinding(original, scope());
    expect(result).not.toBe(original);
    expect(result.offer).not.toBe(original.offer);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.offer)).toBe(true);
    expect(Object.isFrozen(binding)).toBe(true);
    expect(Object.isFrozen(original)).toBe(false);
    expect(Reflect.set(original, "sequence", 2)).toBe(true);
    expect(Reflect.set(original.offer, "pickupAreaRef", ref("area", otherUuid))).toBe(true);
    expect(result.sequence).toBe(1);
    expect(result.offer.pickupAreaRef).toBe(ref("area"));
    expect(binding.canonicalPayload).toBe(serializeBuddyDeliveryRequest(request()));
    expect(Reflect.set(result, "sequence", 3)).toBe(false);
    expect(Reflect.set(result.offer, "pickupAreaRef", ref("area", otherUuid))).toBe(false);
  });

  it("rejects other versions, directions and event kinds without normalization", () => {
    for (const [key, values] of [
      ["version", [0, 2, "1", null]],
      ["sender", ["buddy", "365 ", "366", "365\n"]],
      ["receiver", ["365", "Buddy", "buddy "]],
      ["eventKind", ["delivery.completed", "delivery.requested ", "order.created"]],
    ] as const)
      for (const value of values)
        invalid(() => parseBuddyDeliveryRequest({ ...request(), [key]: value }));
  });

  it("requires canonical namespaced non-nil UUID identities for all reference fields", () => {
    for (const [key, kind] of [
      ["operationId", "operation"],
      ["orderId", "order"],
      ["storeId", "store"],
      ["fulfillmentLegId", "leg"],
      ["privateContactRef", "contact"],
    ]) {
      for (const value of [
        uuid,
        ref(kind).toUpperCase(),
        `${ref(kind)} `,
        ref("user"),
        ref(kind, "00000000-0000-0000-0000-000000000000"),
        ref(kind, "ffffffff-ffff-ffff-ffff-ffffffffffff"),
        ref(kind, "12345678-1234-4123-7123-123456789abc"),
        "contact@example.invalid",
        null,
        123,
      ])
        invalid(() => parseBuddyDeliveryRequest({ ...request(), [key]: value }));
    }
  });

  it("rejects exchanged reference namespaces even when their UUID portion matches", () => {
    for (const [key, wrongKind] of [
      ["operationId", "order"],
      ["orderId", "store"],
      ["storeId", "leg"],
      ["fulfillmentLegId", "operation"],
      ["privateContactRef", "area"],
    ])
      invalid(() => parseBuddyDeliveryRequest({ ...request(), [key]: ref(wrongKind) }));
  });

  it("requires an independent complete expected store/order/leg tuple for binding", () => {
    for (const expected of [
      undefined,
      null,
      {},
      { storeId: ref("store") },
      { ...scope(), userId: uuid },
    ])
      invalid(() => createBuddyDeliveryRequestBinding(request(), expected as BuddyDeliveryScope));
    for (const key of ["storeId", "orderId", "fulfillmentLegId"] as const) {
      const changed = { ...scope(), [key]: scope()[key].replace(uuid, otherUuid) };
      invalid(() => createBuddyDeliveryRequestBinding(request(), changed));
    }
    expect(createBuddyDeliveryRequestBinding(request(), Object.freeze(scope())).operationId).toBe(
      ref("operation"),
    );
  });

  it("binds a cross-store/order/leg payload only against its own independently supplied tuple", () => {
    for (const key of ["storeId", "orderId", "fulfillmentLegId"] as const) {
      const altered = { ...request(), [key]: scope()[key].replace(uuid, otherUuid) };
      invalid(() => createBuddyDeliveryRequestBinding(altered, scope()));
      expect(
        createBuddyDeliveryRequestBinding(altered, { ...scope(), [key]: altered[key] }),
      ).toEqual({
        operationId: altered.operationId,
        canonicalPayload: serializeBuddyDeliveryRequest(altered),
      });
      // Matching caller-supplied values still do not prove actual ownership/FKs.
    }
  });

  it("binds every immutable field, not just an operation key", () => {
    const original = createBuddyDeliveryRequestBinding(request(), scope());
    const alterations = [
      { ...request(), sequence: 2 },
      { ...request(), issuedAt: "2026-10-17T00:00:00.001Z" },
      { ...request(), expiresAt: "2026-10-17T01:00:00.001Z" },
      { ...request(), privateContactRef: ref("contact", otherUuid) },
      { ...request(), offer: { ...request().offer, offerId: ref("offer", otherUuid) } },
      { ...request(), offer: { ...request().offer, pickupAreaRef: ref("area", otherUuid) } },
      { ...request(), offer: { ...request().offer, dropoffAreaRef: ref("area") } },
    ];
    for (const altered of alterations) {
      const binding = createBuddyDeliveryRequestBinding(altered, scope());
      expect(binding.operationId).toBe(original.operationId);
      expect(binding.canonicalPayload).not.toBe(original.canonicalPayload);
    }
    const otherOperation = { ...request(), operationId: ref("operation", otherUuid) };
    expect(createBuddyDeliveryRequestBinding(otherOperation, scope())).not.toEqual(original);
  });

  it("accepts only safe bounded positive integer sequences", () => {
    for (const sequence of [1, BUDDY_DELIVERY_MAX_SEQUENCE])
      expect(parseBuddyDeliveryRequest({ ...request(), sequence }).sequence).toBe(sequence);
    for (const sequence of [
      0,
      -0,
      -1,
      1.5,
      NaN,
      Infinity,
      -Infinity,
      BUDDY_DELIVERY_MAX_SEQUENCE + 1,
      Number.MAX_SAFE_INTEGER + 1,
      "1",
      null,
    ])
      invalid(() => parseBuddyDeliveryRequest({ ...request(), sequence }));
  });

  it("requires exact UTC millisecond timestamps and real calendar dates", () => {
    for (const value of [
      "2026-02-29T00:00:00.000Z",
      "2026-04-31T00:00:00.000Z",
      "2026-10-17T24:00:00.000Z",
      "2026-10-17T00:60:00.000Z",
      "2026-10-17T00:00:60.000Z",
      "2026-10-17T00:00:00Z",
      "2026-10-17T08:00:00.000+08:00",
      "2026-10-17t00:00:00.000z",
      "0000-01-01T00:00:00.000Z",
      "+010000-01-01T00:00:00.000Z",
      1_792_195_200_000,
      new Date("2026-10-17T00:00:00.000Z"),
      null,
    ])
      for (const key of ["issuedAt", "expiresAt"])
        invalid(() => parseBuddyDeliveryRequest({ ...request(), [key]: value }));
    expect(
      parseBuddyDeliveryRequest({ ...request(), issuedAt: "2024-02-29T00:00:00.000Z" }).issuedAt,
    ).toBe("2024-02-29T00:00:00.000Z");
  });

  it("bounds the calendar and orders expiry strictly without inventing TTL/current-clock policy", () => {
    for (const expiresAt of [request().issuedAt, "2026-10-16T23:59:59.999Z"])
      invalid(() => parseBuddyDeliveryRequest({ ...request(), expiresAt }));
    const broadWindow = {
      ...request(),
      issuedAt: "0001-01-01T00:00:00.000Z",
      expiresAt: "9999-12-31T23:59:59.999Z",
    };
    expect(parseBuddyDeliveryRequest(broadWindow).expiresAt).toBe(broadWindow.expiresAt);
    // This old payload is structurally valid, not a current/replay-safe offer.
    expect(
      parseBuddyDeliveryRequest({
        ...request(),
        issuedAt: "2000-01-01T00:00:00.000Z",
        expiresAt: "2000-01-01T00:00:00.001Z",
      }).sequence,
    ).toBe(1);
  });

  it("rejects unknown, missing, nested and array fields without traversing them", () => {
    for (const value of [null, [], "{}", 1, true, new Date()])
      invalid(() => parseBuddyDeliveryRequest(value));
    for (const key of Object.keys(request())) {
      const missing: Record<string, unknown> = { ...request() };
      delete missing[key];
      invalid(() => parseBuddyDeliveryRequest(missing));
    }
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    invalid(() => parseBuddyDeliveryRequest({ ...request(), extra: cyclic }));
    invalid(() => parseBuddyDeliveryRequest({ ...request(), sequence: cyclic }));
    invalid(() => parseBuddyDeliveryRequest({ ...request(), offer: [] }));
    invalid(() =>
      parseBuddyDeliveryRequest({ ...request(), offer: { ...request().offer, extra: cyclic } }),
    );
    invalid(() =>
      parseBuddyDeliveryRequest({
        ...request(),
        offer: { ...request().offer, pickupAreaRef: cyclic },
      }),
    );
  });

  it("rejects getters/non-enumerable/symbol/custom-prototype data with no getter execution", () => {
    const getter = vi.fn(() => request().operationId);
    const accessor = { ...request() };
    Object.defineProperty(accessor, "operationId", { enumerable: true, get: getter });
    invalid(() => parseBuddyDeliveryRequest(accessor));
    const offerGetter = vi.fn(() => request().offer.pickupAreaRef);
    const nested = { ...request().offer };
    Object.defineProperty(nested, "pickupAreaRef", { enumerable: true, get: offerGetter });
    invalid(() => parseBuddyDeliveryRequest({ ...request(), offer: nested }));
    const scopeGetter = vi.fn(() => scope().storeId);
    const expected = { ...scope() };
    Object.defineProperty(expected, "storeId", { enumerable: true, get: scopeGetter });
    invalid(() => createBuddyDeliveryRequestBinding(request(), expected));
    expect(getter).not.toHaveBeenCalled();
    expect(offerGetter).not.toHaveBeenCalled();
    expect(scopeGetter).not.toHaveBeenCalled();
    const hidden = { ...request() };
    Object.defineProperty(hidden, "sequence", { enumerable: false, value: 1 });
    invalid(() => parseBuddyDeliveryRequest(hidden));
    invalid(() => parseBuddyDeliveryRequest({ ...request(), [Symbol("hidden")]: true }));
    invalid(() =>
      parseBuddyDeliveryRequest(Object.assign(Object.create({ injected: true }), request())),
    );
  });

  it("rejects an accessor descriptor even when Object.prototype supplies a value", () => {
    const original = Object.getOwnPropertyDescriptor(Object.prototype, "value");
    const payload = { ...request() };
    let getterCalls = 0;
    let caught: unknown;
    Object.defineProperty(payload, "sequence", {
      enumerable: true,
      get() {
        getterCalls++;
        return 1;
      },
    });
    try {
      Object.defineProperty(Object.prototype, "value", { configurable: true, value: 1 });
      try {
        parseBuddyDeliveryRequest(payload);
      } catch (error) {
        caught = error;
      }
    } finally {
      if (original) Object.defineProperty(Object.prototype, "value", original);
      else Reflect.deleteProperty(Object.prototype, "value");
    }
    expect(caught).toBeInstanceOf(Error);
    expect((caught as Error).message).toBe(BUDDY_DELIVERY_CONTRACT_FAILURE);
    expect(getterCalls).toBe(0);
  });

  it("does not let inherited known-key setters/getters intercept copied request or scope data", () => {
    const payload = request();
    const expected = scope();
    const expectedPayload = serializeBuddyDeliveryRequest(payload);
    for (const [key, replacement] of [
      ["sequence", 99],
      ["storeId", ref("store", otherUuid)],
    ] as const) {
      const original = Object.getOwnPropertyDescriptor(Object.prototype, key);
      let inheritedCalls = 0;
      let canonicalPayload: string | undefined;
      let caught: unknown;
      try {
        Object.defineProperty(Object.prototype, key, {
          configurable: true,
          get() {
            inheritedCalls++;
            return replacement;
          },
          set() {
            inheritedCalls++;
          },
        });
        try {
          canonicalPayload = createBuddyDeliveryRequestBinding(payload, expected).canonicalPayload;
        } catch (error) {
          caught = error;
        }
      } finally {
        if (original) Object.defineProperty(Object.prototype, key, original);
        else Reflect.deleteProperty(Object.prototype, key);
      }
      expect(caught).toBeUndefined();
      expect(canonicalPayload).toBe(expectedPayload);
      expect(inheritedCalls).toBe(0);
    }
  });

  it("rejects payload-level toJSON without invoking it and sanitizes reflection failures", () => {
    const toJSON = vi.fn(() => request());
    invalid(() => serializeBuddyDeliveryRequest({ ...request(), toJSON }));
    expect(toJSON).not.toHaveBeenCalled();
    const proxy = new Proxy(
      {},
      {
        getPrototypeOf: () => {
          throw new Error("PRIVATE_SOURCE_DIAGNOSTIC");
        },
      },
    );
    invalid(() => parseBuddyDeliveryRequest(proxy));
  });

  it("keeps canonical bytes independent of an inherited toJSON callback", () => {
    const original = Object.getOwnPropertyDescriptor(Object.prototype, "toJSON");
    const expected = serializeBuddyDeliveryRequest(request());
    const inherited = vi.fn(() => "PRIVATE_INHERITED_TO_JSON");
    try {
      Object.defineProperty(Object.prototype, "toJSON", { configurable: true, value: inherited });
      expect(serializeBuddyDeliveryRequest(request())).toBe(expected);
      expect(createBuddyDeliveryRequestBinding(request(), scope()).canonicalPayload).toBe(expected);
      expect(inherited).not.toHaveBeenCalled();
    } finally {
      if (original) Object.defineProperty(Object.prototype, "toJSON", original);
      else Reflect.deleteProperty(Object.prototype, "toJSON");
    }
  });

  it("bounds every accepted string and rejects huge body-like/nested data", () => {
    const huge = "x".repeat(BUDDY_DELIVERY_MAX_CANONICAL_BYTES + 1);
    for (const key of [
      "operationId",
      "orderId",
      "storeId",
      "fulfillmentLegId",
      "issuedAt",
      "expiresAt",
      "privateContactRef",
    ])
      invalid(() => parseBuddyDeliveryRequest({ ...request(), [key]: huge }));
    invalid(() =>
      parseBuddyDeliveryRequest({
        ...request(),
        offer: { ...request().offer, pickupAreaRef: huge },
      }),
    );
    invalid(() => parseBuddyDeliveryRequest(huge));
    invalid(() =>
      parseBuddyDeliveryRequest({
        ...request(),
        offer: { ...request().offer, dropoffAreaRef: Array(100).fill("area") },
      }),
    );
  });
});

describe("privacy-minimized structural offers, not authorization or contact access", () => {
  it("projects only immutable opaque offer/area references and expiry", () => {
    const original = request();
    const offer = projectBuddyDeliveryOffer(original);
    expect(offer).toEqual({
      version: 1,
      offerId: original.offer.offerId,
      expiresAt: original.expiresAt,
      pickupAreaRef: original.offer.pickupAreaRef,
      dropoffAreaRef: original.offer.dropoffAreaRef,
    });
    expect(Object.isFrozen(offer)).toBe(true);
    expect(parseBuddyDeliveryOffer(offer)).toEqual(offer);
    expect(parseBuddyDeliveryOffer(offer)).not.toBe(offer);
    const serialized = JSON.stringify(offer);
    for (const key of [
      "operationId",
      "orderId",
      "storeId",
      "fulfillmentLegId",
      "privateContactRef",
      "canonicalPayload",
    ])
      expect(Object.hasOwn(offer, key)).toBe(false);
    for (const value of [
      original.operationId,
      original.orderId,
      original.storeId,
      original.fulfillmentLegId,
      original.privateContactRef,
    ])
      expect(serialized).not.toContain(value);
    expect(Reflect.set(offer, "offerId", ref("offer", otherUuid))).toBe(false);
  });

  it("rejects PII, shared Auth/credential and precise-location fields at request and offer levels", () => {
    const privateFields = {
      userId: uuid,
      authUserId: uuid,
      jwt: "header.payload.signature",
      authorization: "Bearer synthetic",
      name: "Synthetic Person",
      phone: "+639171234567",
      email: "synthetic@example.invalid",
      address: "123 Synthetic Road",
      pickupAddress: "123 Synthetic Road",
      dropoffAddress: "456 Synthetic Road",
      latitude: 14.5995,
      longitude: 120.9842,
      lat: 14.5995,
      lon: 120.9842,
      coordinates: [14.5995, 120.9842],
    };
    for (const [key, value] of Object.entries(privateFields)) {
      invalid(() => parseBuddyDeliveryRequest({ ...request(), [key]: value }));
      invalid(() =>
        parseBuddyDeliveryRequest({ ...request(), offer: { ...request().offer, [key]: value } }),
      );
      invalid(() =>
        parseBuddyDeliveryOffer({ ...projectBuddyDeliveryOffer(request()), [key]: value }),
      );
    }
  });

  it("does not permit free-text area names, contacts, addresses or coordinate strings in references", () => {
    for (const value of [
      "Synthetic Barangay",
      "14.5995,120.9842",
      "123 Synthetic Road",
      "synthetic@example.invalid",
      "+639171234567",
      ref("contact"),
      uuid,
    ]) {
      invalid(() =>
        parseBuddyDeliveryRequest({
          ...request(),
          offer: { ...request().offer, pickupAreaRef: value },
        }),
      );
      invalid(() =>
        parseBuddyDeliveryOffer({ ...projectBuddyDeliveryOffer(request()), dropoffAreaRef: value }),
      );
    }
  });

  it("requires exact offer keys and prevents a private contact/full binding from being accepted", () => {
    const offer = projectBuddyDeliveryOffer(request());
    for (const [key, value] of [
      ["privateContactRef", request().privateContactRef],
      ["orderId", request().orderId],
      ["canonicalPayload", serializeBuddyDeliveryRequest(request())],
    ])
      invalid(() => parseBuddyDeliveryOffer({ ...offer, [key]: value }));
    for (const key of Object.keys(offer)) {
      const missing: Record<string, unknown> = { ...offer };
      delete missing[key];
      invalid(() => parseBuddyDeliveryOffer(missing));
    }
    invalid(() => parseBuddyDeliveryOffer(request()));
    invalid(() => parseBuddyDeliveryOffer({ ...offer, version: 2 }));
    invalid(() => parseBuddyDeliveryOffer({ ...offer, offerId: ref("operation") }));
    invalid(() => parseBuddyDeliveryOffer({ ...offer, expiresAt: "2026-02-29T00:00:00.000Z" }));
  });

  it("rejects offer accessors, hidden and symbol keys without invoking values", () => {
    const offer = { ...projectBuddyDeliveryOffer(request()) };
    const getter = vi.fn(() => request().privateContactRef);
    Object.defineProperty(offer, "pickupAreaRef", { enumerable: true, get: getter });
    invalid(() => parseBuddyDeliveryOffer(offer));
    expect(getter).not.toHaveBeenCalled();
    const hidden = { ...projectBuddyDeliveryOffer(request()) };
    Object.defineProperty(hidden, "version", { enumerable: false, value: 1 });
    invalid(() => parseBuddyDeliveryOffer(hidden));
    invalid(() =>
      parseBuddyDeliveryOffer({
        ...projectBuddyDeliveryOffer(request()),
        [Symbol("private")]: true,
      }),
    );
  });
});
