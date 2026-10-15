// Pure synthetic SYNTAX/equality/fingerprint tests only. No middleware, role,
// tenant/owner authority, JWT, SQL, review executor, receipt or ledger proof.
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  CLAIM_REVIEW_CONTRACT_FAILURE,
  CLAIM_REVIEW_VERSION,
  MAX_CLAIM_REVIEW_NOTES_LENGTH,
  parseClaimReviewRequest,
  prepareClaimReviewCommand,
} from "./claim-review-contract.server";

const actorId = "00000000-0000-4000-8000-0000000000ab";
const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const request = {
  version: 1,
  requestId: uuid(2),
  expectedAccountId: actorId,
  claimId: uuid(3),
  businessId: uuid(4),
  expectedOwnerId: null,
  decision: "approve",
};
const prepare = (input: unknown = request, suppliedActor: unknown = actorId) =>
  prepareClaimReviewCommand(input, suppliedActor);
const invalid = (input: unknown, suppliedActor: unknown = actorId) =>
  expect(() => prepareClaimReviewCommand(input, suppliedActor)).toThrow(
    CLAIM_REVIEW_CONTRACT_FAILURE,
  );

describe("unwired future claim review syntax contract", () => {
  it("exports only the fixed version and bounded notes contract", () => {
    expect(CLAIM_REVIEW_VERSION).toBe(1);
    expect(MAX_CLAIM_REVIEW_NOTES_LENGTH).toBe(2_000);
  });

  it("prepares syntactically valid approval with separately supplied actor and explicit null notes", () => {
    const result = prepare();
    expect(result.key).toEqual({ actorId, requestId: request.requestId });
    expect(result.payload).toEqual({
      version: 1,
      actorId,
      businessId: request.businessId,
      claimId: request.claimId,
      expectedOwnerId: null,
      decision: "approve",
      notes: null,
    });
    expect(result).not.toHaveProperty("confirmed");
    expect(result).not.toHaveProperty("receipt");
    expect(result.payload).not.toHaveProperty("expectedAccountId");
    expect(result.payload).not.toHaveProperty("requestId");
  });

  it("accepts rejection and an explicit prior owner UUID without treating it as a revision", () => {
    const result = prepare({ ...request, decision: "reject", expectedOwnerId: uuid(5) });
    expect(result.payload.decision).toBe("reject");
    expect(result.payload.expectedOwnerId).toBe(uuid(5));
  });

  it("requires expectedOwnerId even when the intended value is null", () => {
    const omitted: Record<string, unknown> = { ...request };
    delete omitted.expectedOwnerId;
    invalid(omitted);
    invalid({ ...request, expectedOwnerId: undefined });
    expect(prepare({ ...request, expectedOwnerId: null }).payload.expectedOwnerId).toBeNull();
  });

  it("does not invent a claim-attempt or ownership revision from matching values", () => {
    const original = prepare({ ...request, expectedOwnerId: uuid(5) });
    const changed = prepare({ ...request, expectedOwnerId: uuid(6) });
    const returned = prepare({ ...request, expectedOwnerId: uuid(5) });
    expect(changed.payloadFingerprint).not.toBe(original.payloadFingerprint);
    expect(returned).toEqual(original);
    expect(original.payload).not.toHaveProperty("claimAttemptId");
    expect(original.payload).not.toHaveProperty("ownershipRevision");
    // Equal bytes cannot attest that the claim/evidence/owner stayed unchanged.
    // A trusted attempt/revision protocol is required before any wiring.
  });

  it("maps absent and undefined optional notes to null but preserves empty notes", () => {
    expect(prepare().payload.notes).toBeNull();
    expect(prepare({ ...request, notes: undefined })).toEqual(prepare());
    expect(prepare({ ...request, notes: "" }).payload.notes).toBe("");
    expect(prepare({ ...request, notes: "" }).payloadFingerprint).not.toBe(
      prepare().payloadFingerprint,
    );
  });

  it("does not consume an inherited optional note from the host prototype", () => {
    const previous = Object.getOwnPropertyDescriptor(Object.prototype, "notes");
    try {
      Object.defineProperty(Object.prototype, "notes", {
        value: "not supplied by this request",
        configurable: true,
      });
      expect(prepare().payload.notes).toBeNull();
      const missingOwner: Record<string, unknown> = { ...request };
      delete missingOwner.expectedOwnerId;
      invalid(missingOwner);
    } finally {
      if (previous) Object.defineProperty(Object.prototype, "notes", previous);
      else Reflect.deleteProperty(Object.prototype, "notes");
    }
  });

  it("preserves exact whitespace, Unicode and line endings in notes", () => {
    const notes = "  Review\r\nCafé e\u0301 🛠️ \t ";
    expect(prepare({ ...request, notes }).payload.notes).toBe(notes);
    expect(prepare({ ...request, notes }).payloadFingerprint).not.toBe(
      prepare({ ...request, notes: notes.trim() }).payloadFingerprint,
    );
    expect(prepare({ ...request, notes: "é" }).payloadFingerprint).not.toBe(
      prepare({ ...request, notes: "e\u0301" }).payloadFingerprint,
    );
    expect(prepare({ ...request, notes: "line\r\nline" }).payloadFingerprint).not.toBe(
      prepare({ ...request, notes: "line\nline" }).payloadFingerprint,
    );
  });

  it("bounds notes to 2000 UTF-16 code units without truncation", () => {
    for (const notes of ["x".repeat(2_000), "😀".repeat(1_000)]) {
      expect(prepare({ ...request, notes }).payload.notes).toBe(notes);
    }
    for (const notes of ["x".repeat(2_001), "😀".repeat(1_001)]) invalid({ ...request, notes });
  });

  it("rejects NUL and unpaired surrogates without replacing otherwise valid text", () => {
    for (const notes of [
      "before\u0000after",
      "\ud800",
      "\udfff",
      "x\ud800y",
      "\udc00x",
      "\ud800\ud800",
      "\udc00\udc00",
    ])
      invalid({ ...request, notes });
    for (const notes of ["\ud800\udc00", "\udbff\udfff", "x😀y", "Café\r\n🛠️"])
      expect(prepare({ ...request, notes }).payload.notes).toBe(notes);
  });

  it("canonicalizes UUID casing including the separate actor before equality binding", () => {
    const values = {
      ...request,
      requestId: actorId.toUpperCase(),
      expectedAccountId: actorId.toUpperCase(),
      claimId: actorId.toUpperCase(),
      businessId: actorId.toUpperCase(),
      expectedOwnerId: actorId.toUpperCase(),
    };
    const result = prepare(values, actorId.toUpperCase());
    expect(result.key).toEqual({ actorId, requestId: actorId });
    expect(result.payload.actorId).toBe(actorId);
    expect(result.payload.claimId).toBe(actorId);
    expect(result.payload.businessId).toBe(actorId);
    expect(result.payload.expectedOwnerId).toBe(actorId);
    expect(result).toEqual(prepare({ ...values, expectedAccountId: actorId }, actorId));
  });

  it("uses deterministic fixed-field-order canonical JSON and a SHA256 UTF8 digest", () => {
    const canonical = `{"version":1,"actorId":"${actorId}","businessId":"${request.businessId}","claimId":"${request.claimId}","expectedOwnerId":null,"decision":"approve","notes":null}`;
    const reordered = Object.fromEntries(Object.entries(request).reverse());
    const result = prepare(reordered);
    expect(result.canonicalPayload).toBe(canonical);
    expect(result.payloadFingerprint).toBe(
      createHash("sha256").update(canonical, "utf8").digest("hex"),
    );
    expect(result.payloadFingerprint).toMatch(/^[0-9a-f]{64}$/);
    expect(result).toEqual(prepare());
  });

  it("excludes requestId from the payload fingerprint but keeps it in a separate actor-bound key", () => {
    const first = prepare();
    const second = prepare({ ...request, requestId: uuid(20) });
    expect(second.key).not.toEqual(first.key);
    expect(second.payload).toEqual(first.payload);
    expect(second.payloadFingerprint).toBe(first.payloadFingerprint);
  });

  it("exposes different fingerprints for reused keys with changed tuples, but implements no reuse enforcement", () => {
    const first = prepare();
    for (const change of [
      { businessId: uuid(40) },
      { claimId: uuid(30) },
      { expectedOwnerId: uuid(50) },
      { decision: "reject" },
      { notes: "Changed" },
    ]) {
      const changed = prepare({ ...request, ...change });
      expect(changed.key).toEqual(first.key);
      expect(changed.payloadFingerprint).not.toBe(first.payloadFingerprint);
    }
    // No state is retained: returning to the original input remains syntactically valid.
    expect(prepare()).toEqual(first);
  });

  it("includes the supplied actor in payload and key without asserting that caller is trusted", () => {
    const other = uuid(10);
    const result = prepare({ ...request, expectedAccountId: other }, other);
    expect(result.key.actorId).toBe(other);
    expect(result.payload.actorId).toBe(other);
    expect(result.payloadFingerprint).not.toBe(prepare().payloadFingerprint);
    // A matching supplied value is accepted as syntax, not middleware/role proof.
  });

  it("rejects mismatched or malformed separate actor values without private parser details", () => {
    for (const supplied of [
      uuid(10),
      null,
      undefined,
      1,
      {},
      { actorId },
      "private-invalid-actor",
    ]) {
      expect(() => prepareClaimReviewCommand(request, supplied)).toThrow(
        CLAIM_REVIEW_CONTRACT_FAILURE,
      );
      try {
        prepareClaimReviewCommand(request, supplied);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe(CLAIM_REVIEW_CONTRACT_FAILURE);
      }
    }
  });

  it("rejects any version other than the numeric literal1", () => {
    for (const version of [undefined, null, "1", 0, 2, true, NaN, Infinity])
      invalid({ ...request, version });
  });

  it("rejects missing required fields and malformed nonobject inputs", () => {
    for (const value of [null, undefined, [], "request", 1, true, new Date()]) invalid(value);
    for (const field of Object.keys(request)) {
      const omitted: Record<string, unknown> = { ...request };
      delete omitted[field];
      invalid(omitted);
    }
  });

  it("validates every UUID without coercion or whitespace trimming", () => {
    for (const field of [
      "requestId",
      "expectedAccountId",
      "claimId",
      "businessId",
      "expectedOwnerId",
    ]) {
      for (const value of [undefined, 1, false, {}, "legacy-id", ` ${uuid(1)} `]) {
        invalid({ ...request, [field]: value });
      }
    }
    for (const field of ["requestId", "expectedAccountId", "claimId", "businessId"])
      invalid({ ...request, [field]: null });
  });

  it("rejects coerced decision/notes and explicit null notes", () => {
    for (const decision of [null, undefined, true, "APPROVE", "approved", "reject "])
      invalid({ ...request, decision });
    for (const notes of [null, true, 1, {}, [], new String("notes")])
      invalid({ ...request, notes });
  });

  it("rejects injected authority, routing, digest and unrelated browser fields instead of stripping them", () => {
    for (const field of [
      "actorId",
      "actor",
      "reviewerId",
      "reviewed_by",
      "auto",
      "role",
      "tenantId",
      "shopId",
      "ownerId",
      "serviceRole",
      "middlewareActorId",
      "payloadFingerprint",
      "confirmed",
      "__proto__",
    ]) {
      invalid({ ...request, [field]: "untrusted-browser-value" });
    }
  });

  it("rejects accessors, symbols and nonenumerable fields without reading property getters", () => {
    let calls = 0;
    const accessor = { ...request };
    Object.defineProperty(accessor, "decision", {
      enumerable: true,
      get: () => {
        calls += 1;
        return "approve";
      },
    });
    invalid(accessor);
    expect(calls).toBe(0);
    const extraGetter = { ...request };
    Object.defineProperty(extraGetter, "actorId", {
      enumerable: true,
      get: () => {
        calls += 1;
        return actorId;
      },
    });
    invalid(extraGetter);
    expect(calls).toBe(0);
    const hidden = { ...request };
    Object.defineProperty(hidden, "notes", { value: "private-hidden-notes", enumerable: false });
    invalid(hidden);
    invalid({ ...request, [Symbol("actor")]: actorId });
  });

  it("rejects inherited request/authority fields but accepts plain null-prototype data", () => {
    invalid(Object.assign(Object.create({ actorId }), request));
    invalid(Object.create(request));
    expect(prepare(Object.assign(Object.create(null), request))).toEqual(prepare());
  });

  it("returns defensive frozen scalar data and never mutates caller input", () => {
    const input = { ...request, notes: "Original" };
    const original = { ...input };
    const parsed = parseClaimReviewRequest(input);
    const result = prepare(input);
    expect(input).toEqual(original);
    expect(parsed).not.toBe(input);
    expect(Object.isFrozen(parsed)).toBe(true);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.key)).toBe(true);
    expect(Object.isFrozen(result.payload)).toBe(true);
    input.notes = "Changed";
    input.claimId = uuid(90);
    expect(parsed.notes).toBe("Original");
    expect(result.payload.notes).toBe("Original");
    expect(result.payload.claimId).toBe(request.claimId);
    expect(Reflect.set(result.key, "actorId", uuid(99))).toBe(false);
    expect(Reflect.set(result.payload, "decision", "reject")).toBe(false);
    expect(Reflect.set(result, "payloadFingerprint", "forged")).toBe(false);
    expect(() => Object.defineProperty(result.payload, "actorId", { value: uuid(99) })).toThrow();
  });

  it("does not accept prepared output or caller-provided fingerprints as browser requests", () => {
    invalid(prepare());
    invalid({ ...request, canonicalPayload: prepare().canonicalPayload });
    invalid({ ...request, payloadFingerprint: prepare().payloadFingerprint });
    expect(Object.keys(prepare()).sort()).toEqual([
      "canonicalPayload",
      "key",
      "payload",
      "payloadFingerprint",
    ]);
  });
});
