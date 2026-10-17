import { z } from "zod";

export const NATIVE_CALLER_AUTH_WAIT_MS = 10_000;
export const NATIVE_REQUEST_CALLER_FAILURE =
  "Could not verify this request. Refresh and try again.";

type UnknownRecord = Record<string, unknown>;
type CallerRequest = { headers: Pick<Headers, "get">; signal: AbortSignal };
const uuid = z.string().uuid();
const commandIssuer = "https://wjxaajgvddtrxxtocxen.supabase.co/auth/v1";
const commandFields = [
  "sub",
  "role",
  "iss",
  "aud",
  "session_id",
  "exp",
  "iat",
  "is_anonymous",
  "aal",
] as const;
type CommandTuple = Readonly<{
  subject: string;
  sessionId: string;
  issuer: string;
  audience: "authenticated";
  role: "authenticated";
  anonymous: false;
  aal: "aal1" | "aal2";
  expiresAt: number;
  issuedAt: number;
  hasNotBefore: boolean;
  notBefore: number | undefined;
}>;

function record(value: unknown): UnknownRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(NATIVE_REQUEST_CALLER_FAILURE);
  }
  return value as UnknownRecord;
}

function own(value: UnknownRecord, key: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  if (!descriptor || !("value" in descriptor)) {
    throw new Error(NATIVE_REQUEST_CALLER_FAILURE);
  }
  return descriptor.value;
}

function optionalOwn(value: UnknownRecord, key: string): unknown {
  return Object.prototype.hasOwnProperty.call(value, key) ? own(value, key) : undefined;
}

function canonicalId(value: unknown): string {
  const parsed = uuid.safeParse(value);
  if (!parsed.success) throw new Error(NATIVE_REQUEST_CALLER_FAILURE);
  return parsed.data.toLowerCase();
}

function anonymousFlag(value: UnknownRecord): unknown {
  const flag = optionalOwn(value, "is_anonymous");
  if (flag !== undefined && typeof flag !== "boolean") {
    throw new Error(NATIVE_REQUEST_CALLER_FAILURE);
  }
  if (flag === true) throw new Error(NATIVE_REQUEST_CALLER_FAILURE);
  return flag;
}

function commandOwn(value: UnknownRecord, key: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  if (!descriptor || !descriptor.enumerable || !("value" in descriptor)) {
    throw new Error(NATIVE_REQUEST_CALLER_FAILURE);
  }
  return descriptor.value;
}

function commandTuple(value: unknown): CommandTuple {
  const claims = record(value);
  const prototype = Object.getPrototypeOf(claims);
  if (prototype !== Object.prototype && prototype !== null) throw new Error();
  const issuer = commandOwn(claims, "iss");
  const audience = commandOwn(claims, "aud");
  if (audience !== "authenticated") {
    if (
      !Array.isArray(audience) ||
      Object.getPrototypeOf(audience) !== Array.prototype ||
      Reflect.ownKeys(audience).length !== 2 ||
      own(audience as unknown as UnknownRecord, "length") !== 1 ||
      commandOwn(audience as unknown as UnknownRecord, "0") !== "authenticated"
    ) {
      throw new Error();
    }
  }
  const role = commandOwn(claims, "role");
  const anonymous = commandOwn(claims, "is_anonymous");
  const aal = commandOwn(claims, "aal");
  const expiresAt = commandOwn(claims, "exp");
  const issuedAt = commandOwn(claims, "iat");
  const hasNotBefore = Object.hasOwn(claims, "nbf");
  const notBefore = hasNotBefore ? commandOwn(claims, "nbf") : undefined;
  const now = Math.floor(Date.now() / 1_000);
  if (
    issuer !== commandIssuer ||
    role !== "authenticated" ||
    anonymous !== false ||
    (aal !== "aal1" && aal !== "aal2") ||
    typeof expiresAt !== "number" ||
    !Number.isSafeInteger(expiresAt) ||
    typeof issuedAt !== "number" ||
    !Number.isSafeInteger(issuedAt) ||
    issuedAt <= 0 ||
    issuedAt >= expiresAt ||
    issuedAt > now ||
    expiresAt <= now ||
    !Number.isSafeInteger(now) ||
    (hasNotBefore &&
      (typeof notBefore !== "number" ||
        !Number.isSafeInteger(notBefore) ||
        notBefore <= 0 ||
        notBefore >= expiresAt ||
        notBefore > now))
  ) {
    throw new Error();
  }
  return Object.freeze({
    subject: canonicalId(commandOwn(claims, "sub")),
    sessionId: canonicalId(commandOwn(claims, "session_id")),
    issuer,
    audience: "authenticated",
    role,
    anonymous,
    aal,
    expiresAt,
    issuedAt,
    hasNotBefore,
    notBefore: notBefore as number | undefined,
  });
}

function sameCommandTuple(left: CommandTuple, right: CommandTuple): boolean {
  return (Object.keys(left) as (keyof CommandTuple)[]).every((key) => left[key] === right[key]);
}

/**
 * Additional denial boundary for a middleware-verified request, not another
 * JWT verifier or a native-shop/role authorization resolver. Capture before
 * getRequest so replacing the middleware client/claims there cannot be adopted.
 */
export function captureNativeRequestCaller(context: unknown, expectedAccountId: string) {
  return captureCaller(context, expectedAccountId, false);
}

/**
 * Connected command custody denial, not native authorization or strict session
 * revocation. Rechecks the request bearer through the captured client's SDK,
 * comparing its security tuple with middleware claims. It does not attest exact
 * middleware token bytes, mutable SDK global headers or auth.sessions state.
 */
export function captureNativeCommandCaller(context: unknown, expectedAccountId: string) {
  return captureCaller(context, expectedAccountId, true);
}

function captureCaller(context: unknown, expectedAccountId: string, strictCommand: boolean) {
  try {
    const callerContext = record(context);
    const accountId = canonicalId(expectedAccountId);
    const actor = own(callerContext, "userId");
    const claims = record(own(callerContext, "claims"));
    const subject = own(claims, "sub");
    const role = own(claims, "role");
    const anonymous = anonymousFlag(claims);
    const hasAnonymous = Object.prototype.hasOwnProperty.call(claims, "is_anonymous");
    const client = record(own(callerContext, "supabase"));
    const auth = record(client.auth);
    const getUser = auth.getUser;
    const getClaims = strictCommand ? auth.getClaims : undefined;
    const tuple = strictCommand ? commandTuple(claims) : undefined;
    const securityValues = tuple
      ? Object.freeze(
          Object.fromEntries(commandFields.map((key) => [key, commandOwn(claims, key)])),
        )
      : undefined;
    const notBeforeValue = tuple?.hasNotBefore ? commandOwn(claims, "nbf") : undefined;
    if (
      canonicalId(actor) !== accountId ||
      canonicalId(subject) !== accountId ||
      role !== "authenticated" ||
      typeof getUser !== "function" ||
      (strictCommand && typeof getClaims !== "function")
    ) {
      throw new Error(NATIVE_REQUEST_CALLER_FAILURE);
    }
    // Preserve the checked callable type across the nested sequential wait.
    const readCurrentUser = getUser;

    let lost = false;
    function fail(): never {
      lost = true;
      throw new Error(NATIVE_REQUEST_CALLER_FAILURE);
    }
    function assertContext() {
      try {
        if (
          lost ||
          own(callerContext, "userId") !== actor ||
          own(callerContext, "supabase") !== client ||
          own(callerContext, "claims") !== claims ||
          own(claims, "sub") !== subject ||
          own(claims, "role") !== role ||
          Object.prototype.hasOwnProperty.call(claims, "is_anonymous") !== hasAnonymous ||
          anonymousFlag(claims) !== anonymous ||
          client.auth !== auth ||
          auth.getUser !== getUser
        ) {
          fail();
        }
        if (
          tuple &&
          (auth.getClaims !== getClaims ||
            !sameCommandTuple(commandTuple(claims), tuple) ||
            commandFields.some((key) => commandOwn(claims, key) !== securityValues?.[key]) ||
            Object.hasOwn(claims, "nbf") !== tuple.hasNotBefore ||
            (tuple.hasNotBefore && commandOwn(claims, "nbf") !== notBeforeValue))
        ) {
          fail();
        }
      } catch {
        fail();
      }
    }
    assertContext();

    return Object.freeze({
      async verify(request: CallerRequest): Promise<() => void> {
        try {
          assertContext();
          const headers = request.headers;
          const readHeader = headers.get;
          const signal = request.signal;
          const authorization = readHeader.call(headers, "authorization");
          // Shape only here: middleware verifies JWTs; strict commands also use
          // the captured SDK getClaims below. No trimming or opaque fallback.
          const match =
            typeof authorization === "string"
              ? /^Bearer ([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$/.exec(authorization)
              : null;
          if (!match) fail();
          const token = match[1];
          function assertCurrent() {
            try {
              assertContext();
              if (
                request.headers !== headers ||
                headers.get !== readHeader ||
                readHeader.call(headers, "authorization") !== authorization ||
                request.signal !== signal ||
                signal.aborted
              ) {
                fail();
              }
            } catch {
              fail();
            }
          }
          assertCurrent();

          await new Promise<void>((resolve, reject) => {
            let settled = false;
            const authClock = strictCommand ? performance : undefined;
            const readAuthClock = authClock?.now;
            const authStartedAt = readAuthClock?.call(authClock);
            if (
              strictCommand &&
              (typeof authStartedAt !== "number" ||
                !Number.isFinite(authStartedAt) ||
                authStartedAt < 0)
            )
              fail();
            function withinAuthBudget() {
              if (authStartedAt === undefined) return true;
              try {
                const current = readAuthClock?.call(authClock);
                return (
                  typeof current === "number" &&
                  Number.isFinite(current) &&
                  current >= authStartedAt &&
                  current - authStartedAt < NATIVE_CALLER_AUTH_WAIT_MS
                );
              } catch {
                return false;
              }
            }
            const timer = setTimeout(() => finish(false), NATIVE_CALLER_AUTH_WAIT_MS);
            function finish(accepted: boolean) {
              if (settled) return;
              settled = true;
              clearTimeout(timer);
              signal.removeEventListener("abort", onAbort);
              if (accepted && withinAuthBudget()) resolve();
              else {
                lost = true;
                reject(new Error(NATIVE_REQUEST_CALLER_FAILURE));
              }
            }
            function onAbort() {
              finish(false);
            }
            function assertAuthWait() {
              if (!withinAuthBudget()) fail();
            }
            try {
              signal.addEventListener("abort", onAbort, { once: true });
              assertCurrent();
              function verifyUser() {
                assertAuthWait();
                assertCurrent();
                const pending: unknown = readCurrentUser.call(auth, token);
                // Always observe both settlements, including a rejection after
                // abort/timeout. The SDK has no per-call signal: this wait bound
                // does not cancel its network operation or revoke a session.
                Promise.resolve(pending).then(
                  (response: unknown) => {
                    if (settled) return;
                    try {
                      assertAuthWait();
                      assertCurrent();
                      const result = record(response);
                      if (own(result, "error") !== null) fail();
                      const user = record(own(record(own(result, "data")), "user"));
                      if (canonicalId(own(user, "id")) !== accountId) fail();
                      anonymousFlag(user);
                      if (strictCommand && own(user, "is_anonymous") !== false) fail();
                      const userRole = optionalOwn(user, "role");
                      if (userRole !== undefined && userRole !== "authenticated") fail();
                      assertCurrent();
                      finish(true);
                    } catch {
                      finish(false);
                    }
                  },
                  () => finish(false),
                );
                assertCurrent();
              }
              if (tuple && typeof getClaims === "function") {
                const pending: unknown = getClaims.call(auth, token);
                Promise.resolve(pending).then(
                  (response: unknown) => {
                    if (settled) return;
                    try {
                      assertAuthWait();
                      assertCurrent();
                      const result = record(response);
                      if (own(result, "error") !== null) fail();
                      const verified = commandTuple(own(record(own(result, "data")), "claims"));
                      if (!sameCommandTuple(verified, tuple)) fail();
                      assertCurrent();
                      verifyUser();
                    } catch {
                      finish(false);
                    }
                  },
                  () => finish(false),
                );
                assertCurrent();
              } else {
                verifyUser();
              }
            } catch {
              finish(false);
            }
          });
          assertCurrent();
          // Only readers tolerate missing anonymous metadata. Commands require
          // explicit false in claims/current user, still not physical-human
          // proof. No tenant/delegation authority is granted; this assertion
          // detects only context changes observed at its calls. SDK getClaims
          // may itself call getUser in addition to our one explicit lookup.
          return assertCurrent;
        } catch {
          lost = true;
          throw new Error(NATIVE_REQUEST_CALLER_FAILURE);
        }
      },
    });
  } catch {
    throw new Error(NATIVE_REQUEST_CALLER_FAILURE);
  }
}
