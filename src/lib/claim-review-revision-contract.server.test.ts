// Pure syntax/equality/fingerprint tests; no trusted actor, database, revision,
// storage custody, executor, receipt, ledger, session or role authority proof.
import { createHash } from "node:crypto";
import fs from "node:fs";
import { describe, it, expect } from "vitest";
import { parseClaimReviewRequest, prepareClaimReviewCommand } from "./claim-review-contract.server";
import {
  CLAIM_REVIEW_REVISION_VERSION,
  CLAIM_REVIEW_REVISION_FAILURE,
  MAX_CLAIM_REVIEW_REVISION,
  parseClaimReviewRevisionRequest,
  prepareClaimReviewRevisionCommand,
} from "./claim-review-revision-contract.server";
const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const actor = "00000000-0000-4000-8000-0000000000ab";
const request = {
  version: 2,
  requestId: uuid(1),
  expectedAccountId: actor,
  claimId: uuid(2),
  businessId: uuid(3),
  expectedOwnerId: null,
  expectedClaimAttemptId: uuid(4),
  expectedClaimAttemptRevision: "0",
  expectedEvidenceSetRevision: "0",
  expectedOwnershipTenureRevision: "0",
  decision: "approve",
};
const prepare = (raw: unknown = request, suppliedActor: unknown = actor) =>
  prepareClaimReviewRevisionCommand(raw, suppliedActor);
const invalid = (raw: unknown, suppliedActor: unknown = actor) =>
  expect(() => prepare(raw, suppliedActor)).toThrow(CLAIM_REVIEW_REVISION_FAILURE);
const revisionKeys = [
  "expectedClaimAttemptRevision",
  "expectedEvidenceSetRevision",
  "expectedOwnershipTenureRevision",
] as const;
const requiredKeys = [
  "version",
  "requestId",
  "expectedAccountId",
  "claimId",
  "businessId",
  "expectedOwnerId",
  "expectedClaimAttemptId",
  ...revisionKeys,
  "decision",
];
describe("unwired revision-fenced claim review syntax candidate", () => {
  it("pins immutable v1 codec/test and does not alter its accepted contract", () => {
    for (const [p, h] of [
      [
        "src/lib/claim-review-contract.server.ts",
        "5d4924fe8edc6ad1f6aff8b0c415df6d9927cdfbcaa662802da8066f8d563a02",
      ],
      [
        "src/lib/claim-review-contract.server.test.ts",
        "f40481ba5742cf9ff32e49cd2335ac5f6052551869dfe8a9c7b0ea99e80c402f",
      ],
    ]) {
      const s = fs.readFileSync(p, "utf8").replaceAll("\r\n", "\n");
      expect(createHash("sha256").update(s).digest("hex")).toBe(h);
    }
    expect(CLAIM_REVIEW_REVISION_VERSION).toBe(2);
    expect(MAX_CLAIM_REVIEW_REVISION).toBe("9223372036854775807");
    const v1 = {
      version: 1,
      requestId: uuid(1),
      expectedAccountId: actor,
      claimId: uuid(2),
      businessId: uuid(3),
      expectedOwnerId: null,
      decision: "approve",
    };
    expect(prepareClaimReviewCommand(v1, actor).payload.version).toBe(1);
    expect(() => parseClaimReviewRequest(request)).toThrow();
    invalid(v1);
    invalid({ ...request, version: 1 });
  });
  it("prepares all explicit expected revisions without inventing current bindings or a receipt", () => {
    const result = prepare();
    expect(result.key).toEqual({ actorId: actor, requestId: uuid(1) });
    expect(result.payload).toEqual({
      version: 2,
      actorId: actor,
      businessId: uuid(3),
      claimId: uuid(2),
      expectedClaimAttemptId: uuid(4),
      expectedClaimAttemptRevision: "0",
      expectedEvidenceSetRevision: "0",
      expectedOwnerId: null,
      expectedOwnershipTenureRevision: "0",
      decision: "approve",
      notes: null,
    });
    for (const key of [
      "confirmed",
      "receipt",
      "authenticated",
      "authorized",
      "fresh",
      "currentRevisions",
    ])
      expect(result).not.toHaveProperty(key);
  });
  for (const key of requiredKeys)
    it("rejects omitted/undefined/null required field " + key, () => {
      const missing: Record<string, unknown> = { ...request };
      delete missing[key];
      invalid(missing);
      invalid({ ...request, [key]: undefined });
      if (key !== "expectedOwnerId") invalid({ ...request, [key]: null });
    });
  for (const key of revisionKeys)
    it("accepts canonical explicit zero/large exact signed-bigint revisions for " + key, () => {
      for (const value of ["0", "1", "9007199254740993", MAX_CLAIM_REVIEW_REVISION])
        expect(prepare({ ...request, [key]: value }).payload[key]).toBe(value);
    });
  for (const key of revisionKeys)
    it("rejects coercions/noncanonical/negative/overflow/unbounded revisions for " + key, () => {
      for (const value of [
        0,
        1,
        9007199254740992,
        0n,
        true,
        false,
        {},
        [],
        "",
        " ",
        " 1",
        "1 ",
        "00",
        "01",
        "+1",
        "-1",
        "1.0",
        "1e3",
        "0x10",
        "１",
        "١",
        "NaN",
        "Infinity",
        "9223372036854775808",
        "9999999999999999999",
        "1".repeat(100000),
      ])
        invalid({ ...request, [key]: value });
    });
  it("each versioned expected revision/attempt changes fingerprint but is not checked against a database", () => {
    const before = prepare();
    for (const key of revisionKeys) {
      const changed = prepare({ ...request, [key]: "1" });
      expect(changed.key).toEqual(before.key);
      expect(changed.payloadFingerprint).not.toBe(before.payloadFingerprint);
    }
    expect(prepare({ ...request, expectedClaimAttemptId: uuid(5) }).payloadFingerprint).not.toBe(
      before.payloadFingerprint,
    );
    expect(prepare({ ...request, claimId: uuid(5) }).payloadFingerprint).not.toBe(
      before.payloadFingerprint,
    );
    expect(prepare({ ...request, businessId: uuid(5) }).payloadFingerprint).not.toBe(
      before.payloadFingerprint,
    );
  });
  it("owner ABA can have same owner but changed tenure revision; returning old bytes remains syntactically valid", () => {
    const first = prepare({
      ...request,
      expectedOwnerId: uuid(6),
      expectedOwnershipTenureRevision: "8",
    });
    const returned = prepare({
      ...request,
      expectedOwnerId: uuid(6),
      expectedOwnershipTenureRevision: "10",
    });
    expect(returned.key).toEqual(first.key);
    expect(returned.payloadFingerprint).not.toBe(first.payloadFingerprint);
    expect(
      prepare({ ...request, expectedOwnerId: uuid(6), expectedOwnershipTenureRevision: "8" }),
    ).toEqual(first);
    // This codec has no state and cannot prove either value is current/trusted.
  });
  it("attempt/evidence ABA changes fingerprint independently of same claim/business/owner IDs", () => {
    const first = prepare();
    const newAttempt = prepare({ ...request, expectedClaimAttemptId: uuid(7) });
    const evidenceChanged = prepare({ ...request, expectedEvidenceSetRevision: "2" });
    expect(newAttempt.payloadFingerprint).not.toBe(first.payloadFingerprint);
    expect(evidenceChanged.payloadFingerprint).not.toBe(first.payloadFingerprint);
    expect(prepare()).toEqual(first);
  });
  it("new request ID changes only future ledger key, not payload fingerprint", () => {
    const first = prepare(),
      next = prepare({ ...request, requestId: uuid(8) });
    expect(next.key).not.toEqual(first.key);
    expect(next.payload).toEqual(first.payload);
    expect(next.payloadFingerprint).toBe(first.payloadFingerprint);
    expect(first.payload).not.toHaveProperty("requestId");
    expect(first.payload).not.toHaveProperty("expectedAccountId");
  });
  it("same key/different payload exposes a future ledger conflict, without implementing resolution", () => {
    const first = prepare(),
      changed = prepare({ ...request, decision: "reject", notes: "Different" });
    expect(changed.key).toEqual(first.key);
    expect(changed.payloadFingerprint).not.toBe(first.payloadFingerprint);
    expect(prepare()).toEqual(first);
  });
  it("fixed canonical JSON has exact field order and UTF8 SHA256", () => {
    const result = prepare();
    expect(result.canonicalPayload).toBe(JSON.stringify(result.payload));
    expect(Object.keys(result.payload)).toEqual([
      "version",
      "actorId",
      "businessId",
      "claimId",
      "expectedClaimAttemptId",
      "expectedClaimAttemptRevision",
      "expectedEvidenceSetRevision",
      "expectedOwnerId",
      "expectedOwnershipTenureRevision",
      "decision",
      "notes",
    ]);
    expect(result.payloadFingerprint).toBe(
      createHash("sha256").update(result.canonicalPayload, "utf8").digest("hex"),
    );
  });
  it("reordered input keys normalize without changing exact notes", () => {
    const original = { ...request, notes: "  Café e\u0301 🛠️\r\n " },
      reordered = Object.fromEntries(Object.entries(original).reverse());
    expect(prepare(reordered)).toEqual(prepare(original));
    expect(prepare(original).payload.notes).toBe(original.notes);
  });
  it("preserves absent/undefined versus empty notes and original bounded Postgres text rules", () => {
    expect(prepare({ ...request, notes: undefined })).toEqual(prepare());
    expect(prepare({ ...request, notes: "" }).payload.notes).toBe("");
    expect(prepare({ ...request, notes: "" }).payloadFingerprint).not.toBe(
      prepare().payloadFingerprint,
    );
    expect(prepare({ ...request, notes: "x".repeat(2000) }).payload.notes).toHaveLength(2000);
    for (const notes of [null, 1, {}, "x".repeat(2001), "nul\0text", "\ud800", "\udc00"])
      invalid({ ...request, notes });
  });
  it("separate supplied actor must be a matching UUID, never browser actor/reviewer metadata", () => {
    for (const supplied of [null, undefined, "", uuid(9), { id: actor }, " " + actor])
      expect(() => prepareClaimReviewRevisionCommand(request, supplied)).toThrow(
        CLAIM_REVIEW_REVISION_FAILURE,
      );
    expect(
      prepare({ ...request, expectedAccountId: actor.toUpperCase() }, actor.toUpperCase()),
    ).toEqual(prepare());
    for (const key of [
      "actorId",
      "reviewerId",
      "userId",
      "claims",
      "metadata",
      "verified",
      "authorized",
    ])
      invalid({ ...request, [key]: actor });
  });
  it("normalizes all UUID fields without converting them into trusted identities", () => {
    const up = {
      ...request,
      expectedAccountId: actor.toUpperCase(),
      requestId: uuid(1).toUpperCase(),
      claimId: uuid(2).toUpperCase(),
      businessId: uuid(3).toUpperCase(),
      expectedClaimAttemptId: uuid(4).toUpperCase(),
    };
    expect(prepare(up, actor.toUpperCase())).toEqual(prepare());
    for (const key of [
      "requestId",
      "claimId",
      "businessId",
      "expectedClaimAttemptId",
      "expectedOwnerId",
    ])
      invalid({ ...request, [key]: "not-a-uuid" });
  });
  it("rejects unknown keys/symbols/nonenumerable/accessor/prototype data without invoking getters", () => {
    let reads = 0;
    const accessor = { ...request };
    Object.defineProperty(accessor, "expectedEvidenceSetRevision", {
      enumerable: true,
      get() {
        reads++;
        return "0";
      },
    });
    invalid(accessor);
    expect(reads).toBe(0);
    invalid({ ...request, extra: true });
    invalid({ ...request, [Symbol("hidden")]: 1 });
    const hidden = { ...request };
    Object.defineProperty(hidden, "expectedEvidenceSetRevision", { value: "0", enumerable: false });
    invalid(hidden);
    invalid(Object.assign(Object.create({ expectedEvidenceSetRevision: "0" }), request));
    invalid([]);
    invalid(null);
    invalid(new Date());
    expect(prepare(Object.assign(Object.create(null), request))).toEqual(prepare());
  });
  it("does not inherit missing revisions or optional notes from host prototype", () => {
    const oldRevision = Object.getOwnPropertyDescriptor(
        Object.prototype,
        "expectedEvidenceSetRevision",
      ),
      oldNotes = Object.getOwnPropertyDescriptor(Object.prototype, "notes");
    try {
      Object.defineProperty(Object.prototype, "expectedEvidenceSetRevision", {
        value: "0",
        configurable: true,
      });
      Object.defineProperty(Object.prototype, "notes", { value: "inherited", configurable: true });
      const missing: Record<string, unknown> = { ...request };
      delete missing.expectedEvidenceSetRevision;
      invalid(missing);
      expect(prepare().payload.notes).toBeNull();
    } finally {
      if (oldRevision)
        Object.defineProperty(Object.prototype, "expectedEvidenceSetRevision", oldRevision);
      else Reflect.deleteProperty(Object.prototype, "expectedEvidenceSetRevision");
      if (oldNotes) Object.defineProperty(Object.prototype, "notes", oldNotes);
      else Reflect.deleteProperty(Object.prototype, "notes");
    }
  });
  it("returns frozen detached scalar copies and hashes no mutable caller reference", () => {
    const input = { ...request, notes: "Exact" },
      saved = { ...input },
      parsed = parseClaimReviewRevisionRequest(input),
      prepared = prepare(input);
    input.expectedEvidenceSetRevision = "7";
    input.notes = "Changed";
    expect(parsed.expectedEvidenceSetRevision).toBe("0");
    expect(prepared.payload.notes).toBe("Exact");
    for (const object of [parsed, prepared, prepared.key, prepared.payload])
      expect(Object.isFrozen(object)).toBe(true);
    expect(prepare(saved)).toEqual(prepared);
  });
  it("a matching synthetic actor/revision can still be prepared repeatedly: no auth/freshness/ledger side effects", () => {
    const arbitrary = uuid(999),
      raw = {
        ...request,
        expectedAccountId: arbitrary,
        expectedClaimAttemptRevision: "99",
        expectedEvidenceSetRevision: "99",
        expectedOwnershipTenureRevision: "99",
      };
    const first = prepare(raw, arbitrary);
    expect(prepare(raw, arbitrary)).toEqual(first);
    expect(first.payload.actorId).toBe(arbitrary);
    expect(first).not.toHaveProperty("executed");
  });
});
