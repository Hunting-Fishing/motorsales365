// Server-only ops alerting helper. Posts to a Slack-compatible incoming
// webhook URL (Discord works too with the same shape). No-ops when
// OPS_ALERT_WEBHOOK_URL is not configured.

const DEDUPE_WINDOW_MS = 60_000;
const recent = new Map<string, number>();
let warnedMissing = false;

function shouldSend(key: string): boolean {
  const now = Date.now();
  // Light cleanup
  if (recent.size > 200) {
    for (const [k, t] of recent) if (now - t > DEDUPE_WINDOW_MS) recent.delete(k);
  }
  const last = recent.get(key);
  if (last && now - last < DEDUPE_WINDOW_MS) return false;
  recent.set(key, now);
  return true;
}

function serializeErr(v: unknown): unknown {
  if (v instanceof Error) {
    return { name: v.name, message: v.message, stack: v.stack };
  }
  return v;
}

export async function alertOps(
  event: string,
  details: Record<string, unknown> = {},
): Promise<void> {
  const url = process.env.OPS_ALERT_WEBHOOK_URL;
  if (!url) {
    if (!warnedMissing) {
      warnedMissing = true;
      console.warn("[alerting] OPS_ALERT_WEBHOOK_URL not set — alerts disabled");
    }
    return;
  }
  if (!shouldSend(event)) return;

  const env =
    process.env.NODE_ENV === "production" ? "prod" : process.env.NODE_ENV || "dev";

  const safeDetails: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(details)) safeDetails[k] = serializeErr(v);

  const body = JSON.stringify(safeDetails, null, 2).slice(0, 3500);
  const payload = {
    text: `[365MS][${env}] ${event}`,
    attachments: [{ title: event, text: "```\n" + body + "\n```" }],
  };

  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error("[alerting] failed to post alert", { event, err });
  }
}
