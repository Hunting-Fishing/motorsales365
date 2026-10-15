// PREPARATORY, UNWIRED server-only-by-convention command codec. This file has
// no handler, client, RPC, database, network, environment or application imports.
// Parsing and supplied-actor equality are NOT authentication, trusted middleware
// attestation, fresh role/tenant authority, owner tenure/revision validation,
// confirmed mutation, a receipt or an idempotency ledger. No state-changing operation executes here.
// Node crypto runtime compatibility (including Cloudflare) remains unverified.
import { createHash } from "node:crypto";
import { z } from "zod";

export const CLAIM_REVIEW_VERSION = 1;
export const MAX_CLAIM_REVIEW_NOTES_LENGTH = 2_000;
export const CLAIM_REVIEW_CONTRACT_FAILURE = "Invalid claim review command.";

const uuid = z
  .string()
  .uuid()
  .transform((value) => value.toLowerCase());
function isPostgresText(value: string): boolean {
  // Preserve valid text exactly, but reject NUL and malformed UTF-16 before a
  // future JSON/UTF-8 database boundary can reject or replace its representation.
  for (let index = 0; index < value.length; index++) {
    const code = value.charCodeAt(index);
    if (code === 0) return false;
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(++index);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return false;
    } else if (code >= 0xdc00 && code <= 0xdfff) return false;
  }
  return true;
}
const requestSchema = z
  .object({
    version: z.literal(CLAIM_REVIEW_VERSION),
    requestId: uuid,
    expectedAccountId: uuid,
    claimId: uuid,
    businessId: uuid,
    // Required even when null. A prior owner is not an ownership revision token.
    expectedOwnerId: uuid.nullable(),
    decision: z.enum(["approve", "reject"]),
    // Exact text: no trimming, Unicode normalization or newline conversion.
    // The bound is JavaScript UTF-16 code units, not bytes or grapheme count.
    notes: z.string().max(MAX_CLAIM_REVIEW_NOTES_LENGTH).refine(isPostgresText).optional(),
  })
  .strict();

export type ClaimReviewRequest = Readonly<z.infer<typeof requestSchema>>;
export type ClaimReviewKey = Readonly<{ actorId: string; requestId: string }>;
export type ClaimReviewPayload = Readonly<{
  version: typeof CLAIM_REVIEW_VERSION;
  actorId: string;
  businessId: string;
  claimId: string;
  expectedOwnerId: string | null;
  decision: "approve" | "reject";
  notes: string | null;
}>;
export type PreparedClaimReviewCommand = Readonly<{
  key: ClaimReviewKey;
  payload: ClaimReviewPayload;
  canonicalPayload: string;
  payloadFingerprint: string;
}>;

const requestKeys = new Set([
  "version",
  "requestId",
  "expectedAccountId",
  "claimId",
  "businessId",
  "expectedOwnerId",
  "decision",
  "notes",
]);

function copyRequestData(raw: unknown): Record<string, unknown> {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) throw new Error();
  const prototype = Object.getPrototypeOf(raw);
  if (prototype !== Object.prototype && prototype !== null) throw new Error();
  const keys = Reflect.ownKeys(raw);
  if (keys.length > requestKeys.size) throw new Error();
  const entries = keys.map((key): [string, unknown] => {
    if (typeof key !== "string" || !requestKeys.has(key)) throw new Error();
    const descriptor = Object.getOwnPropertyDescriptor(raw, key);
    if (!descriptor || !descriptor.enumerable || !("value" in descriptor)) throw new Error();
    // Scalar values are validated below; don't invoke a property getter.
    return [key, descriptor.value];
  });
  // Required/optional schema fields must not fall back to Object.prototype.
  return Object.assign(Object.create(null) as Record<string, unknown>, Object.fromEntries(entries));
}

export function parseClaimReviewRequest(raw: unknown): ClaimReviewRequest {
  try {
    const request = requestSchema.parse(copyRequestData(raw));
    // All accepted fields are scalars. The new object shares no mutable values
    // with the caller and is not a trusted context/capability for later code.
    return Object.freeze({
      ...request,
      notes: Object.hasOwn(request, "notes") ? request.notes : undefined,
    });
  } catch {
    throw new Error(CLAIM_REVIEW_CONTRACT_FAILURE);
  }
}

export function prepareClaimReviewCommand(
  rawBrowserRequest: unknown,
  middlewareActorId: unknown,
): PreparedClaimReviewCommand {
  try {
    const request = parseClaimReviewRequest(rawBrowserRequest);
    const actorId = uuid.parse(middlewareActorId);
    if (actorId !== request.expectedAccountId) throw new Error();

    // actorId is derived from the SEPARATE supplied middleware value, not an
    // injected browser actor/reviewer field. Its provenance is NOT checked here.
    const key = Object.freeze({ actorId, requestId: request.requestId });
    const payload: ClaimReviewPayload = Object.freeze({
      version: request.version,
      actorId,
      businessId: request.businessId,
      claimId: request.claimId,
      expectedOwnerId: request.expectedOwnerId,
      decision: request.decision,
      notes: request.notes ?? null,
    });
    // Fixed-shape canonical JSON in the exact field order above, not a general
    // JSON canonicalization standard. SHA-256 hashes its UTF-8 serialization.
    // requestId belongs ONLY to the separate (actorId, requestId) key;
    // expectedAccountId is an equality assertion, not a second payload actor.
    // Same key + different fingerprint MUST be handled by a future atomic
    // ledger, which this codec neither implements nor authorizes.
    const canonicalPayload = JSON.stringify(payload);
    const payloadFingerprint = createHash("sha256").update(canonicalPayload, "utf8").digest("hex");
    return Object.freeze({ key, payload, canonicalPayload, payloadFingerprint });
  } catch {
    throw new Error(CLAIM_REVIEW_CONTRACT_FAILURE);
  }
}
