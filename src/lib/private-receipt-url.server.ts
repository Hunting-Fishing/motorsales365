import { z } from "zod";

export const PRIVATE_RECEIPT_URL_FAILURE = "Could not open this receipt. Refresh and try again.";
export const PRIVATE_RECEIPT_SIGN_TTL_SECONDS = 300;
export const PRIVATE_RECEIPT_SIGN_WAIT_MS = 10_000;
export const PRIVATE_RECEIPT_PATH_MAX_LENGTH = 1024;
export const PRIVATE_RECEIPT_URL_MAX_LENGTH = 8192;
const origin = "https://wjxaajgvddtrxxtocxen.supabase.co";
const route = "/storage/v1/object/sign/vehicle-receipts/";
const uuid = z.string().uuid();

function fail(): never {
  throw new Error(PRIVATE_RECEIPT_URL_FAILURE);
}
function record(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) fail();
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) fail();
  return value as Record<string, unknown>;
}
function own(value: Record<string, unknown>, key: string): unknown {
  const field = Object.getOwnPropertyDescriptor(value, key);
  if (!field || !("value" in field) || !field.enumerable) fail();
  return field.value;
}
function exact(value: unknown, keys: readonly string[]): Record<string, unknown> {
  const source = record(value);
  const fields = Reflect.ownKeys(source);
  if (
    fields.length !== keys.length ||
    fields.some((key) => typeof key !== "string" || !keys.includes(key))
  )
    fail();
  return Object.fromEntries(keys.map((key) => [key, own(source, key)]));
}
export const privateReceiptUrlRequestSchema = z.preprocess(
  (value, context) => {
    try {
      return exact(value, ["expectedAccountId", "id"]);
    } catch {
      context.addIssue({ code: "custom", message: "Invalid receipt attachment request." });
      return z.NEVER;
    }
  },
  z.object({ expectedAccountId: uuid, id: uuid }).strict(),
);

function sdkData(response: unknown): unknown {
  const source = record(response);
  if (own(source, "error") !== null) fail();
  return own(source, "data");
}
function hasControl(value: string, includeSpace = false): boolean {
  for (let i = 0; i < value.length; i += 1) {
    const unit = value.charCodeAt(i);
    if (unit <= (includeSpace ? 32 : 31) || unit === 127) return true;
  }
  return false;
}
function safePath(value: unknown): string {
  // Operational read bound, not a new database invariant or a key migration.
  // Generated keys fit this contract. Never require reader == original uploader.
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > PRIVATE_RECEIPT_PATH_MAX_LENGTH ||
    hasControl(value) ||
    /[\\%?#]/.test(value)
  )
    fail();
  if (value.split("/").some((part) => part === "" || part === "." || part === "..")) fail();
  try {
    encodeURI(value);
  } catch {
    fail();
  }
  return value;
}
export function parsePrivateReceiptPathResponse(response: unknown, expectedId: string): string {
  try {
    const id = uuid.parse(expectedId);
    const row = exact(sdkData(response), ["id", "file_path"]);
    if (uuid.parse(row.id).toLowerCase() !== id.toLowerCase()) fail();
    return safePath(row.file_path);
  } catch {
    fail();
  }
}
export function parsePrivateReceiptSigningResponse(response: unknown, path: string): string {
  try {
    const key = safePath(path);
    const data = exact(sdkData(response), ["signedUrl"]);
    const value = data.signedUrl;
    if (
      typeof value !== "string" ||
      value.length > PRIVATE_RECEIPT_URL_MAX_LENGTH ||
      hasControl(value, true) ||
      value.includes("\\")
    )
      fail();
    const url = new URL(value);
    const tokens = url.searchParams.getAll("token");
    if (tokens.length !== 1 || [...url.searchParams.keys()].length !== 1) fail();
    const token = tokens[0];
    // Opaque acknowledgment shape only: no JWT payload, signature or TTL claim.
    if (!/^[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)*$/.test(token)) fail();
    if (
      url.origin !== origin ||
      url.username ||
      url.password ||
      url.port ||
      url.hash ||
      url.pathname !== route + encodeURI(key)
    )
      fail();
    // The installed SDK applies encodeURI. Require its canonical spelling, not
    // default-port, dot-segment, percent-escape or query-normalization aliases.
    if (value !== `${origin}${route}${encodeURI(key)}?token=${token}`) fail();
    return value;
  } catch {
    fail();
  }
}

/** Discard late results; the Storage SDK has no per-call signing abort/retry. */
export function waitForPrivateReceiptSigning(
  start: () => unknown,
  signal: AbortSignal,
  assertCurrent: () => void,
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let settled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onAbort = () => finish(false);
    function finish(accepted: boolean, value?: unknown) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal.removeEventListener("abort", onAbort);
      if (accepted) resolve(value);
      else reject(new Error(PRIVATE_RECEIPT_URL_FAILURE));
    }
    try {
      const now = performance.now.bind(performance);
      const deadline = now() + PRIVATE_RECEIPT_SIGN_WAIT_MS;
      function ready() {
        assertCurrent();
        if (signal.aborted || now() >= deadline) fail();
      }
      timer = setTimeout(() => finish(false), PRIVATE_RECEIPT_SIGN_WAIT_MS);
      signal.addEventListener("abort", onAbort, { once: true });
      ready();
      const pending = start();
      // Observe both settlements even if start itself changed the caller or
      // aborted the request. Cancellation does not cancel token minting.
      Promise.resolve(pending).then(
        (value) => {
          if (settled) return;
          try {
            ready();
            finish(true, value);
          } catch {
            finish(false);
          }
        },
        () => finish(false),
      );
      ready();
    } catch {
      finish(false);
    }
  });
}
