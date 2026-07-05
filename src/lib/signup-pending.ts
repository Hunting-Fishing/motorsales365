// Client-side helpers for the "signup.pending" localStorage stash. The
// signup form snapshots the required identity fields here BEFORE handing off
// to auth (email verify link, Google OAuth round-trip, etc.) so that once
// the user is authenticated we can persist those fields into `profiles`
// even if the auth handoff dropped them.
//
// Post-auth apply lives in applyPendingIfAny() below. It runs from the auth
// hook the moment a session appears and retries with exponential backoff so
// a transient network/DB error doesn't cost the user their data — the stash
// stays in localStorage until the server confirms success.

import { applyPendingSignupProfile, type PendingSignupPayload } from "./signup-pending.functions";

export const SIGNUP_PENDING_KEY = "signup.pending";

// The stash carries a few extra client-side fields (`saved_at`, `agreed`,
// `full_name`, `phone`, `ref_code`) that the server fn intentionally ignores.
// Keep them optional so old payloads still parse.
export type PendingStash = PendingSignupPayload & {
  saved_at?: number;
  agreed?: boolean;
  full_name?: string;
  phone?: string;
  ref_code?: string;
};

function safeStorage(): Storage | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

export function readPending(): PendingStash | null {
  const s = safeStorage();
  if (!s) return null;
  try {
    const raw = s.getItem(SIGNUP_PENDING_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PendingStash;
  } catch {
    return null;
  }
}

export function writePending(payload: PendingStash): void {
  const s = safeStorage();
  if (!s) return;
  try {
    s.setItem(SIGNUP_PENDING_KEY, JSON.stringify(payload));
  } catch {
    // best-effort — quota/private-mode failures are non-fatal
  }
}

export function clearPending(): void {
  const s = safeStorage();
  if (!s) return;
  try {
    s.removeItem(SIGNUP_PENDING_KEY);
  } catch {
    // ignore
  }
}

// Strip the client-only extras and undefined/empty values before shipping to
// the server function's strict validator.
function toServerPayload(p: PendingStash): PendingSignupPayload {
  const {
    saved_at: _sa,
    agreed: _ag,
    full_name: _fn,
    phone: _ph,
    ref_code: _rc,
    ...rest
  } = p;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(rest)) {
    if (v === undefined || v === null) continue;
    if (typeof v === "string" && v.trim() === "") continue;
    out[k] = v;
  }
  return out as PendingSignupPayload;
}

// Module-level guard so overlapping auth events (INITIAL_SESSION + SIGNED_IN
// on the same tab) don't fire concurrent appliers against the same stash.
let inFlightFor: string | null = null;

type ApplyOptions = {
  /** Max number of attempts including the first one. Default 4. */
  maxAttempts?: number;
  /** Base backoff delay in ms; doubled each attempt. Default 500. */
  baseDelayMs?: number;
};

export type ApplyResult =
  | { ok: true; updated: number }
  | { ok: false; reason: "no_pending" | "email_mismatch" | "in_flight" }
  | { ok: false; reason: "failed"; attempts: number; error: string };

/**
 * Read the pending stash, POST it to the applyPendingSignupProfile server
 * function, retry with exponential backoff on failure, and only clear the
 * stash after the server confirms success. Safe to call on every auth event.
 *
 * The stash is scoped to the just-signed-in user by matching its email
 * against the session's — a leftover stash from a different account never
 * writes to the current user's profile.
 */
export async function applyPendingIfAny(
  session: { user?: { id?: string | null; email?: string | null } | null } | null,
  opts: ApplyOptions = {},
): Promise<ApplyResult> {
  const uid = session?.user?.id ?? null;
  const userEmail = (session?.user?.email ?? "").toLowerCase();
  if (!uid) return { ok: false, reason: "no_pending" };

  const pending = readPending();
  if (!pending) return { ok: false, reason: "no_pending" };

  // Guard: only apply the stash to the account that filled the form.
  const pendingEmail = (pending.email ?? pending.personal_email ?? "").toLowerCase();
  if (pendingEmail && userEmail && pendingEmail !== userEmail) {
    return { ok: false, reason: "email_mismatch" };
  }

  if (inFlightFor === uid) return { ok: false, reason: "in_flight" };
  inFlightFor = uid;

  const maxAttempts = Math.max(1, opts.maxAttempts ?? 4);
  const baseDelayMs = Math.max(100, opts.baseDelayMs ?? 500);
  const payload = toServerPayload(pending);

  let lastError = "unknown";
  try {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const res = await applyPendingSignupProfile({ data: payload });
        if ((res as { ok?: boolean })?.ok) {
          clearPending();
          return { ok: true, updated: (res as { updated?: number }).updated ?? 0 };
        }
        lastError = "server_returned_not_ok";
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
      }
      if (attempt < maxAttempts) {
        const wait = baseDelayMs * 2 ** (attempt - 1);
        await new Promise((r) => setTimeout(r, wait));
      }
    }
    // Failure: keep the stash so a later auth event / page load can retry.
    return { ok: false, reason: "failed", attempts: maxAttempts, error: lastError };
  } finally {
    inFlightFor = null;
  }
}
