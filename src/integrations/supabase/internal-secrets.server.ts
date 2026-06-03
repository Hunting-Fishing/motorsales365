// Server-only helpers for in-house webhook + cron auth.
// Secrets live in DB tables that only service_role can read.
// Verifiers use timing-safe comparison.

import { createHmac, timingSafeEqual } from "node:crypto";
import { supabaseAdmin } from "./client.server";

// In-memory cache keeps DB hits off the hot path; secrets rotate via admin RPC,
// at which point a redeploy clears the cache.
const webhookKeyCache = new Map<string, string>();
const cronTokenCache = new Map<string, string>();

export async function getInternalWebhookSecret(name: string): Promise<string | null> {
  const cached = webhookKeyCache.get(name);
  if (cached) return cached;
  const { data, error } = await supabaseAdmin
    .from("internal_webhook_keys" as never)
    .select("secret")
    .eq("name", name)
    .maybeSingle();
  if (error || !data) return null;
  const secret = (data as { secret: string }).secret;
  webhookKeyCache.set(name, secret);
  return secret;
}

export async function getInternalCronToken(jobName: string): Promise<string | null> {
  const cached = cronTokenCache.get(jobName);
  if (cached) return cached;
  const { data, error } = await supabaseAdmin
    .from("internal_cron_tokens" as never)
    .select("token")
    .eq("job_name", jobName)
    .maybeSingle();
  if (error || !data) return null;
  const token = (data as { token: string }).token;
  cronTokenCache.set(jobName, token);
  return token;
}

function safeEqualStr(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

/**
 * Verify an internal HMAC-signed webhook request. The caller must compute
 * HMAC-SHA256(secret, rawBody) and send it as hex in `x-internal-signature`.
 */
export async function verifyInternalHmac(opts: {
  name: string;
  rawBody: string;
  signatureHeader: string | null;
}): Promise<boolean> {
  if (!opts.signatureHeader) return false;
  const secret = await getInternalWebhookSecret(opts.name);
  if (!secret) return false;
  const expected = createHmac("sha256", secret).update(opts.rawBody).digest("hex");
  return safeEqualStr(opts.signatureHeader.trim(), expected);
}

/**
 * Verify an internal cron token presented in `x-cron-token`.
 */
export async function verifyInternalCronToken(opts: {
  jobName: string;
  tokenHeader: string | null;
}): Promise<boolean> {
  if (!opts.tokenHeader) return false;
  const expected = await getInternalCronToken(opts.jobName);
  if (!expected) return false;
  return safeEqualStr(opts.tokenHeader.trim(), expected);
}
