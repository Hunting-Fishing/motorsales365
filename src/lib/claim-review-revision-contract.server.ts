// PREPARATORY and UNWIRED. Syntax/equality/fingerprinting only, not authentication,
// session/role freshness, trusted original-actor custody, current locked revisions,
// ownership/evidence authority, an atomic executor, receipt or idempotency ledger.
// No handler, client, database, network or environment access. .server is a naming
// convention here, not an enforced import boundary. Node crypto on the deployed
// Cloudflare runtime is not verified by these local tests.
import { createHash } from "node:crypto";
import { z } from "zod";
import {
  parseClaimReviewRequest,
  type ClaimReviewRequest,
  type ClaimReviewKey,
} from "./claim-review-contract.server";

export const CLAIM_REVIEW_REVISION_VERSION = 2;
export const CLAIM_REVIEW_REVISION_FAILURE = "Invalid revision-fenced claim review command.";
export const MAX_CLAIM_REVIEW_REVISION = "9223372036854775807";

const uuid = z
  .string()
  .uuid()
  .transform((value) => value.toLowerCase());
// Canonical decimal strings avoid JavaScript number rounding and unbounded
// BigInt conversion. For 19 digits, lexical order equals numeric order.
const revision = z
  .string()
  .max(19)
  .regex(/^(?:0|[1-9][0-9]{0,18})$/)
  .refine(
    (value) => value.length < 19 || (value.length === 19 && value <= MAX_CLAIM_REVIEW_REVISION),
  );
const revisionFields = z
  .object({
    version: z.literal(CLAIM_REVIEW_REVISION_VERSION),
    expectedClaimAttemptId: uuid,
    expectedClaimAttemptRevision: revision,
    expectedEvidenceSetRevision: revision,
    expectedOwnershipTenureRevision: revision,
  })
  .strict();

export type ClaimReviewRevisionRequest = Readonly<
  Omit<ClaimReviewRequest, "version"> & z.infer<typeof revisionFields>
>;
export type ClaimReviewRevisionPayload = Readonly<{
  version: typeof CLAIM_REVIEW_REVISION_VERSION;
  actorId: string;
  businessId: string;
  claimId: string;
  expectedClaimAttemptId: string;
  expectedClaimAttemptRevision: string;
  expectedEvidenceSetRevision: string;
  expectedOwnerId: string | null;
  expectedOwnershipTenureRevision: string;
  decision: "approve" | "reject";
  notes: string | null;
}>;
export type PreparedClaimReviewRevisionCommand = Readonly<{
  key: ClaimReviewKey;
  payload: ClaimReviewRevisionPayload;
  canonicalPayload: string;
  payloadFingerprint: string;
}>;

const keys = new Set([
  "version",
  "requestId",
  "expectedAccountId",
  "claimId",
  "businessId",
  "expectedOwnerId",
  "decision",
  "notes",
  "expectedClaimAttemptId",
  "expectedClaimAttemptRevision",
  "expectedEvidenceSetRevision",
  "expectedOwnershipTenureRevision",
]);
function copyData(raw: unknown): Record<string, unknown> {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) throw new Error();
  const prototype = Object.getPrototypeOf(raw);
  if (prototype !== Object.prototype && prototype !== null) throw new Error();
  const ownKeys = Reflect.ownKeys(raw);
  if (ownKeys.length > keys.size) throw new Error();
  const entries = ownKeys.map((key): [string, unknown] => {
    if (typeof key !== "string" || !keys.has(key)) throw new Error();
    const descriptor = Object.getOwnPropertyDescriptor(raw, key);
    if (!descriptor || !descriptor.enumerable || !("value" in descriptor)) throw new Error();
    return [key, descriptor.value];
  });
  return Object.assign(Object.create(null) as Record<string, unknown>, Object.fromEntries(entries));
}

export function parseClaimReviewRevisionRequest(raw: unknown): ClaimReviewRevisionRequest {
  try {
    const data = copyData(raw);
    const revisions = revisionFields.parse({
      version: data.version,
      expectedClaimAttemptId: data.expectedClaimAttemptId,
      expectedClaimAttemptRevision: data.expectedClaimAttemptRevision,
      expectedEvidenceSetRevision: data.expectedEvidenceSetRevision,
      expectedOwnershipTenureRevision: data.expectedOwnershipTenureRevision,
    });
    // Reuse unchanged v1 scalar/text validation, never relax or auto-upgrade v1.
    // The actual browser version was checked above. This internal v1-shaped copy
    // does not accept a v1 browser command without all explicit v2 fields.
    const base = parseClaimReviewRequest({
      version: 1,
      requestId: data.requestId,
      expectedAccountId: data.expectedAccountId,
      claimId: data.claimId,
      businessId: data.businessId,
      expectedOwnerId: data.expectedOwnerId,
      decision: data.decision,
      notes: data.notes,
    });
    // All fields are scalar copies. Zero is syntactically valid only when
    // explicitly supplied; it is NOT a fallback for a missing/unknown binding.
    // These proposed companion revisions are not existing or verified DB state.
    return Object.freeze({ ...base, ...revisions });
  } catch {
    throw new Error(CLAIM_REVIEW_REVISION_FAILURE);
  }
}

export function prepareClaimReviewRevisionCommand(
  rawBrowserRequest: unknown,
  suppliedMiddlewareActorId: unknown,
): PreparedClaimReviewRevisionCommand {
  try {
    const request = parseClaimReviewRevisionRequest(rawBrowserRequest);
    const actorId = uuid.parse(suppliedMiddlewareActorId);
    if (actorId !== request.expectedAccountId) throw new Error();
    // Supplied-actor equality does NOT authenticate the original human or attest
    // how middleware obtained this value. No privileged positive is wired here.
    const key = Object.freeze({ actorId, requestId: request.requestId });
    const payload: ClaimReviewRevisionPayload = Object.freeze({
      version: request.version,
      actorId,
      businessId: request.businessId,
      claimId: request.claimId,
      expectedClaimAttemptId: request.expectedClaimAttemptId,
      expectedClaimAttemptRevision: request.expectedClaimAttemptRevision,
      expectedEvidenceSetRevision: request.expectedEvidenceSetRevision,
      expectedOwnerId: request.expectedOwnerId,
      expectedOwnershipTenureRevision: request.expectedOwnershipTenureRevision,
      decision: request.decision,
      notes: request.notes ?? null,
    });
    // Fixed-shape exact UTF-8 JSON, not a general canonicalization standard.
    // Key identifies a future request ledger; it is intentionally outside payload.
    // Same key/different fingerprint needs atomic conflict handling elsewhere.
    // Repeated equal bytes or matching revisions do not prove freshness/authority.
    const canonicalPayload = JSON.stringify(payload);
    const payloadFingerprint = createHash("sha256").update(canonicalPayload, "utf8").digest("hex");
    return Object.freeze({ key, payload, canonicalPayload, payloadFingerprint });
  } catch {
    throw new Error(CLAIM_REVIEW_REVISION_FAILURE);
  }
}
