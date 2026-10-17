// Returned-response contracts only. Not authentication, fresh role/session
// authority, atomic hierarchy checks, provisioning, revocation or an audit ledger.
import { z } from "zod";

export const STAFF_CHANGE_UNCONFIRMED =
  "Staff change could not be confirmed. Refresh the roster and inspect records before retrying.";
export const STAFF_DIRECTORY_UNAVAILABLE = "The internal team could not be loaded. Try again.";
export const STAFF_CREATION_UNKNOWN =
  "Account creation may be partial or its outcome unknown. Inspect account records before retrying. Creation controls remain locked for this mounted account session.";
export const STAFF_CREATION_ACKNOWLEDGED =
  "Account creation and profile update acknowledged. Role access, organization setup and audit were not confirmed.";
export const STAFF_SIGN_IN_ACKNOWLEDGED =
  "Sign-in restriction acknowledged. Existing sessions and related access were not verified as revoked.";

const uuid = z
  .string()
  .uuid()
  .transform((value) => value.toLowerCase());
export const staffManagerRowSchema = z
  .object({ id: uuid, manager_user_id: uuid.nullable() })
  .strict();
export const staffManagerAckSchema = z
  .object({ ok: z.literal(true), user_id: uuid, manager_user_id: uuid.nullable() })
  .strict();
export const staffSignInAckSchema = z
  .object({
    ok: z.literal(true),
    user_id: uuid,
    scope: z.literal("sign_in_restriction"),
    existingSessions: z.literal("unverified"),
  })
  .strict();
export const staffCreationAckSchema = z
  .object({ user_id: uuid, email: z.string().email(), profileConfirmed: z.boolean() })
  .strict();

export function managerChangeConfirmed(raw: unknown, userId: string, managerId: string | null) {
  const result = staffManagerAckSchema.safeParse(raw);
  return (
    result.success &&
    result.data.user_id === userId.toLowerCase() &&
    result.data.manager_user_id === (managerId?.toLowerCase() ?? null)
  );
}
export function signInRestrictionConfirmed(raw: unknown, userId: string) {
  const result = staffSignInAckSchema.safeParse(raw);
  return result.success && result.data.user_id === userId.toLowerCase();
}
