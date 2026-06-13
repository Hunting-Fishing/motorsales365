// Server-only helpers for the Shop Manager SSO handoff.
// Filename has the .server.ts extension so the bundler refuses any
// client-side import of this module. Keep usage inside server fn handlers.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const PARTNER_RECEIVER_PATH = "/sso/365motorsales";

export type ShopManagerTier = "solo" | "pro";

function getEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not configured`);
  return v;
}

/** Returns the public origin of the All Business 365 deployment, no trailing slash. */
export function getShopManagerOrigin(): string {
  // Allow override via env later (e.g. for staging); default to the live deploy.
  return (
    process.env.SHOP_MANAGER_RECEIVER_ORIGIN?.replace(/\/$/, "") ||
    "https://mainrepairsoftware.lovable.app"
  );
}

/** Service-role client against the partner (All Business 365) Supabase project. */
let _partner: SupabaseClient | null = null;
export function partnerSupabase(): SupabaseClient {
  if (_partner) return _partner;
  _partner = createClient(
    getEnv("SHOP_MANAGER_SUPABASE_URL"),
    getEnv("SHOP_MANAGER_SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  return _partner;
}

// ---- HMAC SSO token (compact JWT-ish) -----------------------------------
// We don't reach for a JWT lib — Workers have Web Crypto. Token shape:
//   base64url(headerJson) + "." + base64url(payloadJson) + "." + base64url(sig)
// where sig = HMAC-SHA256(secret, header + "." + payload).

function b64url(input: ArrayBuffer | Uint8Array | string): string {
  const bytes =
    typeof input === "string"
      ? new TextEncoder().encode(input)
      : input instanceof Uint8Array
        ? input
        : new Uint8Array(input);
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}

async function hmacSign(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return b64url(sig);
}

export async function mintShopManagerSsoToken(claims: {
  sub: string; // partner-side user id (uuid)
  email: string;
  tier: ShopManagerTier;
  src: string; // issuer hint, e.g. "365motorsales"
}): Promise<string> {
  const secret = getEnv("SHOP_MANAGER_SSO_SECRET");
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "HS256", typ: "JWT" };
  const payload = {
    ...claims,
    iat: now,
    exp: now + 60, // 60-second handoff window
    nonce: crypto.randomUUID(),
  };
  const h = b64url(JSON.stringify(header));
  const p = b64url(JSON.stringify(payload));
  const sig = await hmacSign(secret, `${h}.${p}`);
  return `${h}.${p}.${sig}`;
}

export function buildShopManagerRedirect(token: string, returnPath?: string): string {
  const url = new URL(PARTNER_RECEIVER_PATH, getShopManagerOrigin());
  url.searchParams.set("token", token);
  if (returnPath) url.searchParams.set("next", returnPath);
  return url.toString();
}

/**
 * Find-or-create a Supabase Auth user on the partner project for this email.
 * Returns the partner user id. We never touch a password — the receiver app
 * generates a magic link the moment our token verifies, and signs the user in.
 */
export async function ensurePartnerAuthUser(email: string): Promise<string> {
  const partner = partnerSupabase();
  const normalized = email.toLowerCase();
  // gotrue-js does not expose an email filter on listUsers; getUserByEmail is the
  // documented lookup. Cast through `any` because the helper landed in newer
  // versions and may not be present in the installed type defs.
  const adminAny = (partner.auth as any).admin;
  let existingId: string | null = null;
  if (typeof adminAny.getUserByEmail === "function") {
    const { data, error } = await adminAny.getUserByEmail(normalized);
    if (error && error.status !== 404) {
      throw new Error(`Partner getUserByEmail failed: ${error.message}`);
    }
    existingId = data?.user?.id ?? null;
  } else {
    // Fallback: scan first page (small partner tenant) and match locally.
    const { data: list, error: listErr } = await partner.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });
    if (listErr) throw new Error(`Partner listUsers failed: ${listErr.message}`);
    existingId =
      list?.users?.find((u: any) => u.email?.toLowerCase() === normalized)?.id ?? null;
  }
  if (existingId) return existingId;

  const { data: created, error: createErr } = await partner.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { source: "365motorsales" },
  });
  if (createErr || !created.user) {
    throw new Error(`Partner createUser failed: ${createErr?.message ?? "unknown"}`);
  }
  return created.user.id;
}
