/** Unwired Auth email commands only. No rendering, storage, queue or delivery. */
import {
  isVerifiedStandardWebhook,
  WEBHOOK_MAX_CLOCK_SKEW_SECONDS,
} from "../webhooks/standard-webhooks.server";

export const NATIVE_AUTH_EMAIL_PLAN_VERSION = "365-auth-email-plan/v1";
export const NATIVE_AUTH_EMAIL_PROJECT_REF = "wjxaajgvddtrxxtocxen";
export const NATIVE_AUTH_EMAIL_SITE_ORIGIN = "https://www.365motorsales.com";
export const NATIVE_AUTH_EMAIL_SUPABASE_ORIGIN = "https://wjxaajgvddtrxxtocxen.supabase.co";

export type NativeAuthEmailPolicy = Readonly<{
  projectRef: typeof NATIVE_AUTH_EMAIL_PROJECT_REF;
  siteOrigin: typeof NATIVE_AUTH_EMAIL_SITE_ORIGIN;
  secureEmailChange: boolean;
}>;
export type NativeAuthAction =
  | "signup"
  | "invite"
  | "magiclink"
  | "recovery"
  | "email_change"
  | "reauthentication";
type Slot = "primary" | "current" | "new";
export type NativeAuthEmailCommand = Readonly<{
  deliveryId: string;
  slot: Slot;
  action: NativeAuthAction;
  template: NativeAuthAction;
  recipient: string;
  purpose: "critical_auth";
  props: Readonly<Record<string, string>>;
}>;
export type NativeAuthEmailPlan = Readonly<{
  version: typeof NATIVE_AUTH_EMAIL_PLAN_VERSION;
  projectRef: typeof NATIVE_AUTH_EMAIL_PROJECT_REF;
  eventId: string;
  eventKey: string;
  subjectId: string;
  bodyFingerprint: string;
  planFingerprint: string;
  commands: readonly NativeAuthEmailCommand[];
}>;

type PlanErrorCode =
  | "invalid_verified_webhook"
  | "stale_event"
  | "invalid_policy"
  | "invalid_payload"
  | "unsupported_action"
  | "invalid_recipient"
  | "invalid_token"
  | "invalid_url"
  | "invalid_email_change"
  | "invalid_plan"
  | "invalid_record"
  | "event_conflict"
  | "planning_unavailable";

export class NativeAuthEmailPlanError extends Error {
  readonly code: PlanErrorCode;

  constructor(code: PlanErrorCode) {
    super("Auth email planning failed.");
    this.name = "NativeAuthEmailPlanError";
    this.code = code;
  }
}

const plans = new WeakSet<NativeAuthEmailPlan>();

/** Same-instance command provenance, not durable storage or delivery authority. */
export function isNativeAuthEmailPlan(value: unknown): value is NativeAuthEmailPlan {
  return typeof value === "object" && value !== null && plans.has(value as NativeAuthEmailPlan);
}

const actions = new Set<NativeAuthAction>([
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "reauthentication",
]);
const nestedDestinations = new Set(["/dashboard", "/businesses/submit", "/dashboard/profile"]);

function fail(code: PlanErrorCode): never {
  throw new NativeAuthEmailPlanError(code);
}

function object(value: unknown, code: PlanErrorCode = "invalid_payload") {
  if (typeof value !== "object" || value === null || Array.isArray(value)) fail(code);
  return value as Record<string, unknown>;
}

function assertFresh(timestamp: number) {
  const now = Math.floor(Date.now() / 1000);
  if (
    !Number.isSafeInteger(now) ||
    now <= 0 ||
    Math.abs(now - timestamp) > WEBHOOK_MAX_CLOCK_SKEW_SECONDS
  )
    fail("stale_event");
}

function parsePayload(body: string) {
  const parsed: unknown = JSON.parse(body);
  // JSON.parse alone is last-key-wins. Reject duplicate names (including escaped
  // aliases) without a recursive parser or a second interpretation of the body.
  const stack: (Set<string> | null)[] = [];
  for (let index = 0; index < body.length; index++) {
    const char = body[index];
    if (char === "{" || char === "[") {
      stack.push(char === "{" ? new Set<string>() : null);
      if (stack.length > 32) fail("invalid_payload");
    } else if (char === "}" || char === "]") stack.pop();
    else if (char === '"') {
      const start = index;
      for (index++; index < body.length; index++) {
        if (body[index] === "\\") index++;
        else if (body[index] === '"') break;
      }
      let next = index + 1;
      while (next < body.length && /\s/.test(body[next])) next++;
      if (body[next] === ":") {
        const name: string = JSON.parse(body.slice(start, index + 1));
        const names = stack[stack.length - 1];
        if (!names || names.has(name)) fail("invalid_payload");
        names.add(name);
      }
    }
  }
  return object(parsed);
}

function recipient(value: unknown): string {
  if (typeof value !== "string" || value.length > 254) fail("invalid_recipient");
  const parts = value.split("@");
  if (parts.length !== 2) fail("invalid_recipient");
  const [local, domain] = parts;
  if (
    !local ||
    local.length > 64 ||
    !/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+$/.test(local) ||
    local.startsWith(".") ||
    local.endsWith(".") ||
    local.includes("..")
  )
    fail("invalid_recipient");
  const labels = domain.split(".");
  if (
    labels.length < 2 ||
    labels.some((label) => !/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/.test(label))
  )
    fail("invalid_recipient");
  return value;
}

function token(value: unknown): string | undefined {
  if (value === undefined || value === "") return undefined;
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(value)) fail("invalid_token");
  return value;
}

function tokenHash(value: unknown): string | undefined {
  if (value === undefined || value === "") return undefined;
  if (
    typeof value !== "string" ||
    value.length > 256 ||
    !/^[\x21-\x7e]+$/.test(value) ||
    value.includes("\\")
  )
    fail("invalid_token");
  return value;
}

function canonicalUrl(raw: unknown, origin: string): URL {
  if (
    typeof raw !== "string" ||
    raw.length > 2048 ||
    !/^[\x21-\x7e]+$/.test(raw) ||
    raw.includes("\\") ||
    raw.includes("#") ||
    /%(?![0-9a-fA-F]{2})/.test(raw) ||
    !(raw === origin || raw.startsWith(`${origin}/`))
  )
    fail("invalid_url");
  const url = new URL(raw);
  const rawPath = raw.slice(origin.length).split("?")[0] || "/";
  if (
    url.origin !== origin ||
    url.username ||
    url.password ||
    url.port ||
    url.hash ||
    rawPath !== url.pathname ||
    rawPath.includes("%") ||
    (raw.includes("?") && !url.search)
  )
    fail("invalid_url");
  return url;
}

function callback(raw: unknown, action: NativeAuthAction): string {
  if (typeof raw !== "string") fail("invalid_url");
  const url = canonicalUrl(
    raw || `${NATIVE_AUTH_EMAIL_SITE_ORIGIN}/`,
    NATIVE_AUTH_EMAIL_SITE_ORIGIN,
  );
  const keys = [...url.searchParams.keys()];
  if (new Set(keys).size !== keys.length) fail("invalid_url");
  if (url.pathname === "/" && !url.search) return url.href;
  if (
    url.pathname === "/verify-email" &&
    (action === "signup" || action === "invite" || action === "magiclink")
  ) {
    if (keys.some((key) => key !== "intent" && key !== "redirect")) fail("invalid_url");
    const intent = url.searchParams.get("intent");
    const redirect = url.searchParams.get("redirect");
    if (intent !== null && !["buyer", "business", "service_provider"].includes(intent)) {
      fail("invalid_url");
    }
    if (redirect !== null && !nestedDestinations.has(redirect)) fail("invalid_url");
    return url.href;
  }
  if (
    !url.search &&
    ((url.pathname === "/dashboard/profile" &&
      (action === "email_change" || action === "reauthentication")) ||
      (url.pathname === "/reset-password" && action === "recovery"))
  )
    return url.href;
  return fail("invalid_url");
}

async function digest(value: string): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function confirmationUrl(action: NativeAuthAction, hash: string, redirect: string) {
  const url = new URL(
    action === "recovery"
      ? `${NATIVE_AUTH_EMAIL_SITE_ORIGIN}/reset-password`
      : `${NATIVE_AUTH_EMAIL_SUPABASE_ORIGIN}/auth/v1/verify`,
  );
  url.searchParams.set(action === "recovery" ? "token_hash" : "token", hash);
  url.searchParams.set("type", action);
  if (action !== "recovery") url.searchParams.set("redirect_to", redirect);
  return url.href;
}

/**
 * Requires the exact successful verifier result in this module instance. The
 * future ingress must still bind its configured secret to the owned 365 project.
 * Deterministic command keys are NOT durable reservation or exactly-once sends.
 */
export async function planNativeAuthEmail(input: {
  verifiedWebhook: unknown;
  policy: NativeAuthEmailPolicy;
}): Promise<NativeAuthEmailPlan> {
  try {
    const verified = input.verifiedWebhook;
    if (!isVerifiedStandardWebhook(verified)) fail("invalid_verified_webhook");
    assertFresh(verified.timestamp);
    const policy = object(input.policy, "invalid_policy");
    if (
      Object.keys(policy).length !== 3 ||
      policy.projectRef !== NATIVE_AUTH_EMAIL_PROJECT_REF ||
      policy.siteOrigin !== NATIVE_AUTH_EMAIL_SITE_ORIGIN ||
      typeof policy.secureEmailChange !== "boolean"
    )
      fail("invalid_policy");
    const secureEmailChange = policy.secureEmailChange;
    const payload = parsePayload(verified.body);
    const user = object(payload.user);
    const email = object(payload.email_data);
    if (
      typeof user.id !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(user.id)
    )
      fail("invalid_payload");
    const subjectId = user.id.toLowerCase();
    if (!actions.has(email.email_action_type as NativeAuthAction)) fail("unsupported_action");
    const action = email.email_action_type as NativeAuthAction;
    // Auth emits one token for a phone-only account adding its first address,
    // even when secure change is enabled. Only explicit empty current email is
    // this case; missing fields or incomplete secure pairs never downgrade it.
    const firstEmail = action === "email_change" && user.email === "";
    const currentEmail = firstEmail ? "" : recipient(user.email);
    // Native HookData.SiteURL is the Auth/API external base, not the website's
    // Site URL setting. Never build links from this payload-controlled value.
    const apiBase = canonicalUrl(email.site_url, NATIVE_AUTH_EMAIL_SUPABASE_ORIGIN);
    if (!["/", "/auth/v1", "/auth/v1/"].includes(apiBase.pathname) || apiBase.search) {
      fail("invalid_url");
    }
    const redirect = callback(email.redirect_to, action);
    const otp = token(email.token);
    const newOtp = token(email.token_new);
    const hash = tokenHash(email.token_hash);
    const newHash = tokenHash(email.token_hash_new);
    const drafts: { slot: Slot; recipient: string; token: string; hash?: string }[] = [];
    let newEmail: string | undefined;
    if (action === "email_change") {
      newEmail = recipient(user.new_email);
      if (newEmail.toLowerCase() === currentEmail.toLowerCase()) fail("invalid_email_change");
      if (
        email.old_email !== undefined &&
        email.old_email !== "" &&
        email.old_email !== currentEmail
      )
        fail("invalid_email_change");
      if (firstEmail) {
        if (!otp || !hash || newOtp || newHash) fail("invalid_email_change");
        drafts.push({ slot: "new", recipient: newEmail, token: otp, hash });
      } else if (secureEmailChange) {
        if (!otp || !newOtp || !hash || !newHash) fail("invalid_email_change");
        drafts.push({ slot: "current", recipient: currentEmail, token: otp, hash: newHash });
        drafts.push({ slot: "new", recipient: newEmail, token: newOtp, hash });
      } else {
        if (!hash || newHash || !!otp === !!newOtp) fail("invalid_email_change");
        drafts.push({ slot: "new", recipient: newEmail, token: (otp ?? newOtp)!, hash });
      }
    } else {
      if (!otp || newOtp || newHash || (action !== "reauthentication" && !hash)) {
        fail("invalid_token");
      }
      drafts.push({ slot: "primary", recipient: currentEmail, token: otp, hash });
    }

    const bodyFingerprint = await digest(verified.body);
    const identity = [NATIVE_AUTH_EMAIL_PLAN_VERSION, NATIVE_AUTH_EMAIL_PROJECT_REF, verified.id];
    const eventKey = await digest(JSON.stringify(identity));
    const planFingerprint = await digest(
      JSON.stringify([
        NATIVE_AUTH_EMAIL_PLAN_VERSION,
        NATIVE_AUTH_EMAIL_PROJECT_REF,
        NATIVE_AUTH_EMAIL_SITE_ORIGIN,
        secureEmailChange,
        bodyFingerprint,
      ]),
    );
    const commands: NativeAuthEmailCommand[] = [];
    for (const draft of drafts) {
      const props: Record<string, string> = { token: draft.token };
      if (action !== "reauthentication") {
        props.siteName = "365 MotorSales";
        props.confirmationUrl = confirmationUrl(action, draft.hash!, redirect);
        if (action === "signup" || action === "invite")
          props.siteUrl = NATIVE_AUTH_EMAIL_SITE_ORIGIN;
        if (action === "signup") props.recipient = draft.recipient;
        if (action === "email_change") {
          props.oldEmail = currentEmail;
          props.newEmail = newEmail!;
          props.email = draft.recipient;
        }
      }
      commands.push(
        Object.freeze({
          deliveryId: await digest(JSON.stringify([...identity, draft.slot])),
          slot: draft.slot,
          action,
          template: action,
          recipient: draft.recipient,
          purpose: "critical_auth",
          props: Object.freeze(props),
        }),
      );
    }
    assertFresh(verified.timestamp);
    const result: NativeAuthEmailPlan = Object.freeze({
      version: NATIVE_AUTH_EMAIL_PLAN_VERSION,
      projectRef: NATIVE_AUTH_EMAIL_PROJECT_REF,
      eventId: verified.id,
      eventKey,
      subjectId,
      bodyFingerprint,
      planFingerprint,
      commands: Object.freeze(commands),
    });
    plans.add(result);
    return result;
  } catch (error) {
    if (error instanceof NativeAuthEmailPlanError) throw error;
    if (error instanceof SyntaxError) return fail("invalid_payload");
    return fail("planning_unavailable");
  }
}

/** Comparison only. The future ledger must reserve/check these fields atomically. */
export function assertNativeAuthEmailEventCompatible(
  plan: NativeAuthEmailPlan,
  recorded: unknown,
): void {
  try {
    if (typeof plan !== "object" || plan === null || !plans.has(plan)) fail("invalid_plan");
    const row = object(recorded, "invalid_record");
    const fields = [
      "version",
      "projectRef",
      "eventId",
      "eventKey",
      "bodyFingerprint",
      "planFingerprint",
    ];
    const descriptors = Object.getOwnPropertyDescriptors(row);
    if (
      Reflect.ownKeys(descriptors).length !== fields.length ||
      fields.some((field) => !Object.hasOwn(descriptors, field) || !("value" in descriptors[field]))
    ) {
      fail("invalid_record");
    }
    if (
      fields.some((field) => descriptors[field].value !== plan[field as keyof NativeAuthEmailPlan])
    ) {
      fail("event_conflict");
    }
  } catch (error) {
    if (error instanceof NativeAuthEmailPlanError) throw error;
    return fail("invalid_record");
  }
}
