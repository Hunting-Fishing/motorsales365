// Server-only ops alerting helper. Writes structured alerts to the
// `ops_alerts` table so admins can review failures in-app (Admin → Alerts).
// In-memory dedupe avoids spamming the table during burst failures.

import { supabaseAdmin } from "@/integrations/supabase/client.server";

const DEDUPE_WINDOW_MS = 60_000;
const recent = new Map<string, number>();

type Severity = "info" | "warning" | "error" | "critical";

function shouldSend(key: string): boolean {
  const now = Date.now();
  if (recent.size > 500) {
    for (const [k, t] of recent) if (now - t > DEDUPE_WINDOW_MS) recent.delete(k);
  }
  const last = recent.get(key);
  if (last && now - last < DEDUPE_WINDOW_MS) return false;
  recent.set(key, now);
  return true;
}

function serialize(v: unknown): unknown {
  if (v instanceof Error) return { name: v.name, message: v.message, stack: v.stack };
  return v;
}

export async function alertOps(
  event: string,
  details: Record<string, unknown> = {},
  opts: { severity?: Severity; source?: string } = {},
): Promise<void> {
  const severity = opts.severity ?? "error";
  const source = opts.source ?? "server";
  const dedupeKey = `${source}:${event}`;
  if (!shouldSend(dedupeKey)) return;

  const safeDetails: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(details)) safeDetails[k] = serialize(v);

  // Always log so it appears in worker logs too
  console.error(`[ops-alert][${severity}][${source}] ${event}`, safeDetails);

  try {
    const { error } = await supabaseAdmin.from("ops_alerts").insert({
      event,
      severity,
      source,
      details: safeDetails as never,
    });
    if (error) console.error("[alerting] failed to persist alert", { event, error });
  } catch (err) {
    console.error("[alerting] insert threw", { event, err });
  }
}
