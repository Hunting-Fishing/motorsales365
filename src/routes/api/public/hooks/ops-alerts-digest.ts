// Admin ops-alert digest. Invoked by pg_cron every 15 minutes.
// Emits one digest email per admin user when there are unacknowledged
// ops_alerts older than 15 minutes. Tracks "last notified at" in
// site_settings so we don't re-spam admins between cron ticks.
//
// ───────────────────────────────────────────────────────────────────────────
// CRON CONTRACT — do not change without updating the pg_cron schedule.
//   URL:    https://project--0738c881-614d-4885-8d75-1b7c90e0835e.lovable.app/api/public/hooks/ops-alerts-digest
//   Method: POST (no body)
//   Auth:   verifyInternalCronToken (header `x-cron-token`)
//   If you rename or move this route the cron job stops silently. Update the
//   pg_cron schedule in the Supabase project at the same time.
// ───────────────────────────────────────────────────────────────────────────

import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { enqueueTransactionalEmailServer } from "@/lib/email/server-enqueue.server";
import { verifyInternalCronToken } from "@/integrations/supabase/internal-secrets.server";

const STATE_KEY = "ops_alerts_digest_last_sent_at";
const MIN_INTERVAL_MS = 15 * 60_000;
const MIN_ALERT_AGE_MS = 15 * 60_000;

type AlertRow = {
  event: string;
  severity: string;
  source: string | null;
  created_at: string;
};

async function getLastSentAt(): Promise<number> {
  const { data } = await supabaseAdmin
    .from("site_settings")
    .select("value")
    .eq("key", STATE_KEY)
    .maybeSingle();
  const raw = (data as { value?: string } | null)?.value;
  const n = raw ? Number(raw) : 0;
  return Number.isFinite(n) ? n : 0;
}

async function setLastSentAt(ts: number) {
  await supabaseAdmin
    .from("site_settings")
    .upsert({ key: STATE_KEY, value: String(ts) } as never, { onConflict: "key" });
}

async function listAdminEmails(): Promise<string[]> {
  const { data: roles } = await supabaseAdmin
    .from("user_roles")
    .select("user_id")
    .eq("role", "admin");
  const ids = (roles ?? []).map((r: { user_id: string }) => r.user_id);
  if (ids.length === 0) return [];
  const emails: string[] = [];
  // auth.admin.getUserById is the only service-role path to auth.users.
  for (const id of ids) {
    try {
      const { data } = await supabaseAdmin.auth.admin.getUserById(id);
      const email = data?.user?.email;
      if (email) emails.push(email);
    } catch {
      // ignore individual lookup failures
    }
  }
  return Array.from(new Set(emails));
}

export const Route = createFileRoute("/api/public/hooks/ops-alerts-digest")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authed = await verifyInternalCronToken({
          jobName: "ops_alerts_digest",
          tokenHeader: request.headers.get("x-cron-token"),
        });
        if (!authed) return new Response("Unauthorized", { status: 401 });
        try {
          const cutoff = new Date(Date.now() - MIN_ALERT_AGE_MS).toISOString();
          const { data: alerts, error } = await supabaseAdmin
            .from("ops_alerts")
            .select("event, severity, source, created_at")
            .eq("acknowledged", false)
            .lte("created_at", cutoff)
            .order("created_at", { ascending: true })
            .limit(500);

          if (error) {
            return Response.json({ ok: false, error: error.message }, { status: 500 });
          }
          const rows = (alerts ?? []) as AlertRow[];
          if (rows.length === 0) {
            return Response.json({ ok: true, sent: 0, reason: "no_unacked_alerts" });
          }

          const lastSentAt = await getLastSentAt();
          const now = Date.now();
          if (lastSentAt && now - lastSentAt < MIN_INTERVAL_MS) {
            return Response.json({
              ok: true,
              sent: 0,
              reason: "throttled",
              next_in_ms: MIN_INTERVAL_MS - (now - lastSentAt),
            });
          }

          // Rollup by event + severity + source.
          const map = new Map<
            string,
            { event: string; severity: string; source: string | null; count: number; oldest_at: string }
          >();
          for (const r of rows) {
            const key = `${r.severity}::${r.event}::${r.source ?? ""}`;
            const existing = map.get(key);
            if (existing) {
              existing.count += 1;
              if (r.created_at < existing.oldest_at) existing.oldest_at = r.created_at;
            } else {
              map.set(key, {
                event: r.event,
                severity: r.severity,
                source: r.source,
                count: 1,
                oldest_at: r.created_at,
              });
            }
          }
          const grouped = Array.from(map.values()).sort((a, b) => {
            const sevOrder = ["critical", "error", "warning", "info"];
            const sa = sevOrder.indexOf(a.severity);
            const sb = sevOrder.indexOf(b.severity);
            if (sa !== sb) return sa - sb;
            return b.count - a.count;
          });

          const adminEmails = await listAdminEmails();
          if (adminEmails.length === 0) {
            return Response.json({ ok: true, sent: 0, reason: "no_admins" });
          }

          const oldestOverall = rows[0]?.created_at;
          const bucket = Math.floor(now / MIN_INTERVAL_MS);
          let sent = 0;
          for (const email of adminEmails) {
            const r = await enqueueTransactionalEmailServer({
              templateName: "ops-alerts-digest",
              recipientEmail: email,
              idempotencyKey: `ops-alerts-digest:${bucket}:${email}`,
              templateData: {
                total: rows.length,
                oldest_at: oldestOverall,
                alerts: grouped.slice(0, 25),
              },
            });
            if (r.ok) sent += 1;
          }

          await setLastSentAt(now);
          return Response.json({ ok: true, sent, total_alerts: rows.length, groups: grouped.length });
        } catch (err) {
          console.error("[ops-alerts-digest] failed", err);
          return Response.json({ ok: false, error: String(err) }, { status: 500 });
        }
      },
    },
  },
});
