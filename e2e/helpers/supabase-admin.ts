/**
 * Test-only helper for the Supabase Auth Admin API.
 *
 * Used by e2e specs to confirm test-user email addresses without going through
 * a real inbox, and to delete those users afterwards.
 *
 * Requires `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in the env.
 * Callers should `test.skip()` when these are missing.
 */

export const SUPABASE_URL = process.env.SUPABASE_URL;
export const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function adminEnvReady(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
}

async function adminFetch(path: string, init: RequestInit = {}): Promise<Response> {
  if (!adminEnvReady()) {
    throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set");
  }
  const url = `${SUPABASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
  const headers = new Headers(init.headers);
  headers.set("apikey", SUPABASE_SERVICE_ROLE_KEY!);
  headers.set("Authorization", `Bearer ${SUPABASE_SERVICE_ROLE_KEY!}`);
  if (init.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  return fetch(url, { ...init, headers });
}

export async function confirmEmail(userId: string): Promise<void> {
  const r = await adminFetch(`/auth/v1/admin/users/${userId}`, {
    method: "PUT",
    body: JSON.stringify({ email_confirm: true }),
  });
  if (!r.ok) {
    throw new Error(`confirmEmail(${userId}) failed: HTTP ${r.status} ${await r.text()}`);
  }
}

export async function deleteUser(userId: string): Promise<void> {
  await adminFetch(`/auth/v1/admin/users/${userId}`, { method: "DELETE" }).catch(() => {});
}
