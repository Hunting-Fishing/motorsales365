import { z } from "zod";

export const NATIVE_CALLER_AUTH_WAIT_MS = 10_000;
export const NATIVE_REQUEST_CALLER_FAILURE =
  "Could not verify this request. Refresh and try again.";

type UnknownRecord = Record<string, unknown>;
type CallerRequest = { headers: Pick<Headers, "get">; signal: AbortSignal };
const uuid = z.string().uuid();

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

/**
 * Additional denial boundary for a middleware-verified request, not another
 * JWT verifier or a native-shop/role authorization resolver. Capture before
 * getRequest so replacing the middleware client/claims there cannot be adopted.
 */
export function captureNativeRequestCaller(context: unknown, expectedAccountId: string) {
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
    if (
      canonicalId(actor) !== accountId ||
      canonicalId(subject) !== accountId ||
      role !== "authenticated" ||
      typeof getUser !== "function"
    ) {
      throw new Error(NATIVE_REQUEST_CALLER_FAILURE);
    }

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
          // Shape only: JWT verification remains the existing auth middleware's
          // responsibility. No trimming, second credential or opaque fallback.
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
            const timer = setTimeout(() => finish(false), NATIVE_CALLER_AUTH_WAIT_MS);
            function finish(accepted: boolean) {
              if (settled) return;
              settled = true;
              clearTimeout(timer);
              signal.removeEventListener("abort", onAbort);
              if (accepted) resolve();
              else {
                lost = true;
                reject(new Error(NATIVE_REQUEST_CALLER_FAILURE));
              }
            }
            function onAbort() {
              finish(false);
            }
            try {
              signal.addEventListener("abort", onAbort, { once: true });
              assertCurrent();
              const pending: unknown = getUser.call(auth, token);
              // Always observe both settlements, including a rejection after
              // abort/timeout. The SDK has no per-call signal: this wait bound
              // does not cancel its network operation or revoke a session.
              Promise.resolve(pending).then(
                (response: unknown) => {
                  if (settled) return;
                  try {
                    assertCurrent();
                    const result = record(response);
                    if (own(result, "error") !== null) fail();
                    const user = record(own(record(own(result, "data")), "user"));
                    if (canonicalId(own(user, "id")) !== accountId) fail();
                    anonymousFlag(user);
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
            } catch {
              finish(false);
            }
          });
          assertCurrent();
          // Missing anonymous metadata was tolerated, not interpreted as proof
          // of a physical human. This assertion grants no tenant/delegation
          // authority and detects only context changes observed at its calls.
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
