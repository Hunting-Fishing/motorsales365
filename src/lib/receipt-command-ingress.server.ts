import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import {
  captureNativeCommandCaller,
  NATIVE_CALLER_AUTH_WAIT_MS,
  NATIVE_REQUEST_CALLER_FAILURE,
} from "./native-request-caller.server";

// Expense-only credential custody, not auth.sessions termination, physical-human,
// fresh native membership, financial posting, idempotency or recovery authority.
const origin = "https://wjxaajgvddtrxxtocxen.supabase.co";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type Row = Record<string, unknown>;
export type ReceiptCommandIngress = Readonly<{
  supabase: SupabaseClient<Database, "public", "public">;
  userId: string;
  claims: Row;
  receiptCommand: Readonly<object>;
}>;
type Custody = {
  request: Request;
  context: ReceiptCommandIngress;
  assertCurrent: () => void;
  deny: () => never;
  bind: (receiptId: string) => void;
};
const capabilities = new WeakMap<object, Custody>();
const failure = () => new Error(NATIVE_REQUEST_CALLER_FAILURE);
function record(value: unknown): Row {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw failure();
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) throw failure();
  return value as Row;
}
function own(value: object, name: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(value, name);
  if (!descriptor || !descriptor.enumerable || !("value" in descriptor)) throw failure();
  return descriptor.value;
}
function snapshotInit(value: RequestInit | undefined): Readonly<Row> {
  const source = record(value ?? {});
  const fields: Row = Object.create(null) as Row;
  const keys = Reflect.ownKeys(source);
  if (keys.length > 20 || keys.some((key) => typeof key !== "string")) throw failure();
  for (const key of keys) fields[key as string] = own(source, key as string);
  return Object.freeze(fields);
}
function method(object: object, name: string) {
  let owner: object | null = object;
  for (let depth = 0; owner && depth < 6; depth++, owner = Object.getPrototypeOf(owner)) {
    const descriptor = Object.getOwnPropertyDescriptor(owner, name);
    if (!descriptor) continue;
    if (!("value" in descriptor) || typeof descriptor.value !== "function") throw failure();
    return { owner, descriptor };
  }
  throw failure();
}
function sameMethod(object: object, name: string, saved: ReturnType<typeof method>) {
  const current = method(object, name);
  if (
    current.owner !== saved.owner ||
    current.descriptor.value !== saved.descriptor.value ||
    current.descriptor.enumerable !== saved.descriptor.enumerable ||
    current.descriptor.configurable !== saved.descriptor.configurable ||
    current.descriptor.writable !== saved.descriptor.writable
  )
    throw failure();
}
function dataPin(object: object, name: string) {
  const descriptor = Object.getOwnPropertyDescriptor(object, name);
  if (!descriptor || !("value" in descriptor)) throw failure();
  return descriptor;
}
function sameData(object: object, name: string, saved: PropertyDescriptor) {
  const current = dataPin(object, name);
  if (
    current.value !== saved.value ||
    current.enumerable !== saved.enumerable ||
    current.configurable !== saved.configurable ||
    current.writable !== saved.writable
  )
    throw failure();
}
function accessor(object: object, name: string) {
  let owner: object | null = object;
  for (let depth = 0; owner && depth < 6; depth++, owner = Object.getPrototypeOf(owner)) {
    const descriptor = Object.getOwnPropertyDescriptor(owner, name);
    if (!descriptor) continue;
    if (typeof descriptor.get !== "function" || "value" in descriptor) throw failure();
    return { owner, descriptor };
  }
  throw failure();
}
function sameAccessor(object: object, name: string, saved: ReturnType<typeof accessor>) {
  const current = accessor(object, name);
  if (
    current.owner !== saved.owner ||
    current.descriptor.get !== saved.descriptor.get ||
    current.descriptor.set !== saved.descriptor.set ||
    current.descriptor.enumerable !== saved.descriptor.enumerable ||
    current.descriptor.configurable !== saved.descriptor.configurable
  )
    throw failure();
}

export async function createReceiptCommandIngress(
  request: Request,
): Promise<ReceiptCommandIngress> {
  try {
    if (
      !(request instanceof Request) ||
      Object.hasOwn(request, "headers") ||
      Object.hasOwn(request, "signal")
    )
      throw failure();
    const headers = request.headers;
    const requestHeaders = accessor(request, "headers");
    const requestSignal = accessor(request, "signal");
    const readHeader = method(headers, "get");
    const signal = request.signal;
    const authorization = headers.get("authorization");
    if (typeof authorization !== "string" || authorization.length > 8192) throw failure();
    const match = /^Bearer ([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$/.exec(authorization);
    if (!match || signal.aborted) throw failure();
    const token = match[1];
    const configuredOrigin = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY;
    if (
      configuredOrigin !== origin ||
      typeof key !== "string" ||
      !/^sb_publishable_[A-Za-z0-9_-]{8,200}$/.test(key)
    )
      throw failure();
    const realFetch = globalThis.fetch;
    if (typeof realFetch !== "function") throw failure();
    const clock = performance;
    const readClock = clock.now;
    const startedAt = readClock.call(clock);
    if (!Number.isFinite(startedAt) || startedAt < 0) throw failure();
    const authAbort = new AbortController();
    let authPending = true;
    let lost = false;
    let result: ReceiptCommandIngress | undefined;
    let verifiedCurrent: (() => void) | undefined;
    let receiptIntent: string | undefined;
    function deny(): never {
      lost = true;
      throw failure();
    }
    function withinBudget() {
      const current = readClock.call(clock);
      return (
        Number.isFinite(current) &&
        current >= startedAt &&
        current - startedAt < NATIVE_CALLER_AUTH_WAIT_MS
      );
    }
    function assertBase() {
      try {
        sameAccessor(request, "headers", requestHeaders);
        sameAccessor(request, "signal", requestSignal);
        if (
          lost ||
          request.headers !== headers ||
          request.signal !== signal ||
          signal.aborted ||
          Object.hasOwn(request, "headers") ||
          Object.hasOwn(request, "signal")
        )
          deny();
        sameMethod(headers, "get", readHeader);
        if (headers.get("authorization") !== authorization || globalThis.fetch !== realFetch)
          deny();
        if (authPending && (!withinBudget() || authAbort.signal.aborted)) deny();
        if (!client || !authObject || !pinned || !authDescriptor) deny();
        const currentAuth = Object.getOwnPropertyDescriptor(client, "auth");
        if (
          !currentAuth ||
          !("value" in currentAuth) ||
          currentAuth.value !== authObject ||
          currentAuth.get ||
          currentAuth.set ||
          currentAuth.enumerable !== authDescriptor.enumerable ||
          currentAuth.configurable !== authDescriptor.configurable ||
          currentAuth.writable !== authDescriptor.writable
        )
          deny();
        sameMethod(client, "from", pinned.from);
        sameMethod(client, "rpc", pinned.rpc);
        sameMethod(authObject, "getClaims", pinned.getClaims);
        sameMethod(authObject, "getUser", pinned.getUser);
        transportWitness();
        verifiedCurrent?.();
      } catch {
        deny();
      }
    }
    const guardedFetch: typeof fetch = async (input, init) => {
      try {
        assertBase();
        if (typeof input !== "string" && !(input instanceof URL)) deny();
        const raw = String(input);
        if (/[\s\\#]/.test(raw) || /%(?:0[0-9a-f]|1[0-9a-f]|7f|5c|2f|2e)/i.test(raw.split("?")[0]))
          deny();
        const url = new URL(raw);
        if (url.origin !== origin || url.username || url.password || url.hash || url.href !== raw)
          deny();
        // SDK input is inert own data. Never validate a getter once and reread
        // it or a mutable URL/init during native dispatch.
        const fields = snapshotInit(init);
        const methodName = fields.method ?? "GET";
        const bodyValue = fields.body;
        if (typeof methodName !== "string") deny();
        if (bodyValue !== undefined && bodyValue !== null && typeof bodyValue !== "string") deny();
        if (fields.redirect !== undefined && fields.redirect !== "error") deny();
        if (fields.credentials !== undefined && fields.credentials !== "omit") deny();
        if (fields.signal !== undefined && fields.signal !== null && fields.signal !== signal)
          deny();
        const outgoing = new Headers(fields.headers as HeadersInit | undefined);
        if (outgoing.get("authorization") !== authorization || outgoing.get("apikey") !== key)
          deny();
        for (const name of ["accept-profile", "content-profile"]) {
          const value = outgoing.get(name);
          if (value !== null && value !== "public") deny();
        }
        const isAuth =
          methodName === "GET" &&
          ["/auth/v1/user", "/auth/v1/.well-known/jwks.json"].includes(url.pathname) &&
          !url.search;
        const isRead = methodName === "GET" && url.pathname === "/rest/v1/vehicle_receipts";
        const isCommand =
          methodName === "POST" &&
          url.pathname === "/rest/v1/rpc/record_vehicle_receipt_expense" &&
          !url.search;
        if (
          (!authPending && isAuth) ||
          (!isAuth && !isRead && !isCommand) ||
          (authPending && !isAuth)
        )
          deny();
        if (isRead) {
          if (
            url.searchParams.size !== 2 ||
            url.searchParams.getAll("select").length !== 1 ||
            url.searchParams.get("select") !== "id,shop_vehicle_id" ||
            url.searchParams.getAll("id").length !== 1 ||
            !uuid.test((url.searchParams.get("id") ?? "").replace(/^eq\./, "")) ||
            !url.searchParams.get("id")?.startsWith("eq.")
          )
            deny();
          if (
            !receiptIntent ||
            url.searchParams.get("id")?.slice(3).toLowerCase() !== receiptIntent
          )
            deny();
        }
        if (isCommand) {
          if (typeof bodyValue !== "string" || bodyValue.length > 128) deny();
          const body = record(JSON.parse(bodyValue));
          const id = own(body, "_id");
          if (
            Reflect.ownKeys(body).length !== 1 ||
            typeof id !== "string" ||
            !uuid.test(id) ||
            JSON.stringify({ _id: id }) !== bodyValue
          )
            deny();
          if (!receiptIntent || id.toLowerCase() !== receiptIntent) deny();
        } else if (bodyValue !== undefined && bodyValue !== null) deny();
        const transportSignal = authPending ? authAbort.signal : signal;
        const response = await new Promise<Response>((resolve, reject) => {
          let settled = false;
          const finish = (value?: Response) => {
            if (settled) return;
            settled = true;
            transportSignal.removeEventListener("abort", onAbort);
            if (value) resolve(value);
            else reject(failure());
          };
          const onAbort = () => finish();
          transportSignal.addEventListener("abort", onAbort, { once: true });
          try {
            assertBase();
            if (transportSignal.aborted) throw failure();
            Promise.resolve(
              realFetch(raw, {
                method: methodName,
                body: bodyValue,
                headers: outgoing,
                redirect: "error",
                credentials: "omit",
                signal: transportSignal,
                cache: "no-store",
              }),
            ).then(
              (value) => finish(value),
              () => finish(),
            );
          } catch {
            finish();
          }
        });
        assertBase();
        if (
          !(response instanceof Response) ||
          response.redirected ||
          (response.status >= 300 && response.status < 400) ||
          (response.url !== "" && response.url !== raw)
        )
          deny();
        return response;
      } catch {
        lost = true;
        throw failure();
      }
    };
    const client = createClient<Database, "public", "public">(origin, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
        storage: undefined,
      },
      global: { headers: { Authorization: authorization }, fetch: guardedFetch },
    });
    const authDescriptor = Object.getOwnPropertyDescriptor(client, "auth");
    if (
      !authDescriptor ||
      !("value" in authDescriptor) ||
      !authDescriptor.value ||
      typeof authDescriptor.value !== "object"
    )
      deny();
    const authObject = authDescriptor.value as object;
    // Private wrappers on this internally constructed client bound even an
    // ignored/late SDK Auth settlement to the SAME outer ingress deadline. SDK
    // getClaims may call this guarded getUser internally; receivers stay intact.
    for (const name of ["getClaims", "getUser"] as const) {
      const original = method(authObject, name).descriptor.value as (...args: unknown[]) => unknown;
      Object.defineProperty(authObject, name, {
        configurable: true,
        writable: true,
        enumerable: true,
        value: function (this: unknown, ...args: unknown[]) {
          return new Promise<unknown>((resolve, reject) => {
            let settled = false;
            const finish = (accepted: boolean, value?: unknown) => {
              if (settled) return;
              settled = true;
              authAbort.signal.removeEventListener("abort", onAbort);
              if (accepted) resolve(value);
              else reject(failure());
            };
            const onAbort = () => finish(false);
            authAbort.signal.addEventListener("abort", onAbort, { once: true });
            try {
              assertBase();
              if (this !== authObject || !authPending || args.length !== 1 || args[0] !== token)
                deny();
              Promise.resolve(original.call(authObject, ...args)).then(
                (value) => {
                  try {
                    assertBase();
                    finish(true, value);
                  } catch {
                    finish(false);
                  }
                },
                () => finish(false),
              );
            } catch {
              finish(false);
            }
          });
        },
      });
    }
    const pinned = {
      from: method(client, "from"),
      rpc: method(client, "rpc"),
      getClaims: method(authObject, "getClaims"),
      getUser: method(authObject, "getUser"),
    };
    const restDescriptor = dataPin(client, "rest");
    const rest = restDescriptor.value as object;
    if (!rest || typeof rest !== "object") deny();
    const restPins = {
      url: dataPin(rest, "url"),
      schemaName: dataPin(rest, "schemaName"),
      headers: dataPin(rest, "headers"),
    };
    const authPins = { url: dataPin(authObject, "url"), headers: dataPin(authObject, "headers") };
    if (
      restPins.url.value !== origin + "/rest/v1" ||
      restPins.schemaName.value !== "public" ||
      authPins.url.value !== origin + "/auth/v1"
    )
      deny();
    const restHeaders = restPins.headers.value;
    if (!(restHeaders instanceof Headers)) deny();
    const restHeaderEntries = method(restHeaders, "entries");
    const restHeaderValues = JSON.stringify([...restHeaders.entries()]);
    const authHeaders = record(authPins.headers.value);
    const authHeaderNames = Reflect.ownKeys(authHeaders);
    if (authHeaderNames.some((name) => typeof name !== "string")) deny();
    const authHeaderPins = authHeaderNames.map(
      (name) => [name as string, dataPin(authHeaders, name as string)] as const,
    );
    const dispatchPins = {
      clientFetch: method(client, "fetch"),
      authFetch: method(authObject, "fetch"),
      restFetch: method(rest, "fetch"),
      restFrom: method(rest, "from"),
      restRpc: method(rest, "rpc"),
    };
    const transportWitness = () => {
      sameData(client!, "rest", restDescriptor);
      for (const [name, pin] of Object.entries(restPins)) sameData(rest, name, pin);
      for (const [name, pin] of Object.entries(authPins)) sameData(authObject, name, pin);
      sameMethod(restHeaders, "entries", restHeaderEntries);
      if (
        JSON.stringify([...restHeaders.entries()]) !== restHeaderValues ||
        Reflect.ownKeys(authHeaders).length !== authHeaderNames.length
      )
        deny();
      for (const [name, pin] of authHeaderPins) sameData(authHeaders, name, pin);
      sameMethod(client!, "fetch", dispatchPins.clientFetch);
      sameMethod(authObject, "fetch", dispatchPins.authFetch);
      sameMethod(rest, "fetch", dispatchPins.restFetch);
      sameMethod(rest, "from", dispatchPins.restFrom);
      sameMethod(rest, "rpc", dispatchPins.restRpc);
    };
    assertBase();
    return await new Promise<ReceiptCommandIngress>((resolve, reject) => {
      let settled = false;
      const finish = (accepted: boolean) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        signal.removeEventListener("abort", onAbort);
        if (accepted && result && verifiedCurrent && withinBudget()) {
          authPending = false;
          capabilities.set(result.receiptCommand, {
            request,
            context: result,
            assertCurrent: assertBase,
            deny,
            bind: (id) => {
              if (
                !uuid.test(id) ||
                (receiptIntent !== undefined && receiptIntent !== id.toLowerCase())
              )
                deny();
              receiptIntent = id.toLowerCase();
            },
          });
          resolve(result);
        } else {
          lost = true;
          authAbort.abort();
          reject(failure());
        }
      };
      const onAbort = () => finish(false);
      const remaining = NATIVE_CALLER_AUTH_WAIT_MS - (readClock.call(clock) - startedAt);
      const timer = setTimeout(() => finish(false), Math.max(0, remaining));
      signal.addEventListener("abort", onAbort, { once: true });
      Promise.resolve()
        .then(async () => {
          assertBase();
          const response = record(
            await (authObject as { getClaims: (token: string) => Promise<unknown> }).getClaims(
              token,
            ),
          );
          assertBase();
          if (own(response, "error") !== null) deny();
          const claims = record(own(record(own(response, "data")), "claims"));
          const userId = own(claims, "sub");
          if (typeof userId !== "string" || !uuid.test(userId)) deny();
          const receiptCommand = Object.freeze(Object.create(null) as object);
          result = Object.freeze({ supabase: client!, userId, claims, receiptCommand });
          const caller = captureNativeCommandCaller(result, userId);
          const aud = own(claims, "aud");
          if (Array.isArray(aud)) Object.freeze(aud);
          Object.freeze(claims);
          verifiedCurrent = await caller.verify(request);
          assertBase();
        })
        .then(
          () => finish(true),
          () => finish(false),
        );
    });
  } catch {
    throw failure();
  }
}

export function assertReceiptCommandIngress(
  context: unknown,
  request: Request,
  expectedAccountId: string,
  expectedReceiptId: string,
): void {
  let saved: Custody | undefined;
  try {
    const value = record(context);
    const capability = own(value, "receiptCommand");
    if (!capability || typeof capability !== "object") throw failure();
    saved = capabilities.get(capability);
    if (!saved) throw failure();
    if (
      saved.request !== request ||
      typeof expectedAccountId !== "string" ||
      !uuid.test(expectedAccountId) ||
      expectedAccountId.toLowerCase() !== saved.context.userId.toLowerCase() ||
      own(value, "supabase") !== saved.context.supabase ||
      own(value, "userId") !== saved.context.userId ||
      own(value, "claims") !== saved.context.claims
    )
      saved.deny();
    saved.assertCurrent();
    if (typeof expectedReceiptId !== "string") saved.deny();
    saved.bind(expectedReceiptId);
    saved.assertCurrent();
  } catch {
    if (saved) saved.deny();
    throw failure();
  }
}
