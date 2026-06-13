// Parts-wanted match notifier. Invoked by pg_cron every 15 min.
// Sends one email per user batching all undelivered matches for their open
// requests, respecting alert_frequency (instant or daily).
//
// ────────────────────────────────────────────────────────────────────────
// CRON CONTRACT
//   URL:    https://project--0738c881-614d-4885-8d75-1b7c90e0835e.lovable.app/api/public/hooks/parts-wanted-digest
//   Method: POST (no body)
//   Auth:   verifyInternalCronToken (header `x-cron-token`)
// ────────────────────────────────────────────────────────────────────────

import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { enqueueTransactionalEmailServer } from "@/lib/email/server-enqueue.server";
import { verifyInternalCronToken } from "@/integrations/supabase/internal-secrets.server";

const SITE = "https://365motorsales.com";

export const Route = createFileRoute("/api/public/hooks/parts-wanted-digest")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const ok = await verifyInternalCronToken({
          jobName: "parts_wanted_digest",
          tokenHeader: request.headers.get("x-cron-token"),
        });
        if (!ok) return new Response("forbidden", { status: 403 });

        // Pull undelivered matches with wanted + listing context
        const { data: matches, error } = await supabaseAdmin
          .from("parts_wanted_matches")
          .select(
            "id, wanted_id, listing_id, score, matched_at, parts_wanted!inner(user_id, title, make, model, year, alert_frequency, status), listings!inner(id, title, price_php, region, city)",
          )
          .is("notified_at", null)
          .is("dismissed_at", null)
          .limit(500);
        if (error) {
          console.error("[parts-wanted-digest] query failed", error);
          return new Response("error", { status: 500 });
        }
        const rows = (matches ?? []).filter(
          (m: any) =>
            m.parts_wanted?.status === "open" &&
            m.parts_wanted?.alert_frequency !== "off",
        );

        // For daily, only send once per day per user
        const now = Date.now();
        const groupByUser = new Map<string, any[]>();
        for (const m of rows) {
          const uid = m.parts_wanted.user_id;
          if (!groupByUser.has(uid)) groupByUser.set(uid, []);
          groupByUser.get(uid)!.push(m);
        }

        let sent = 0;
        const ids: string[] = [];
        for (const [userId, userMatches] of groupByUser) {
          // Mixed frequency: if any "instant" present, send now; otherwise daily check
          const hasInstant = userMatches.some(
            (m) => m.parts_wanted.alert_frequency === "instant",
          );
          if (!hasInstant) {
            // Look up most recent notified_at within the user's wanted to throttle daily
            const wantedIds = Array.from(new Set(userMatches.map((m) => m.wanted_id)));
            const { data: prev } = await supabaseAdmin
              .from("parts_wanted_matches")
              .select("notified_at")
              .in("wanted_id", wantedIds)
              .not("notified_at", "is", null)
              .order("notified_at", { ascending: false })
              .limit(1);
            const last = prev?.[0]?.notified_at ? Date.parse(prev[0].notified_at) : 0;
            if (now - last < 22 * 60 * 60 * 1000) continue;
          }

          // Look up email
          let email: string | undefined;
          try {
            const { data } = await supabaseAdmin.auth.admin.getUserById(userId);
            email = data?.user?.email ?? undefined;
          } catch {
            /* noop */
          }
          if (!email) continue;

          const payload = {
            matches: userMatches.slice(0, 10).map((m) => ({
              title: m.listings.title,
              url: `${SITE}/listing/${m.listings.id}`,
              vehicle: `${m.parts_wanted.year ?? ""} ${m.parts_wanted.make} ${m.parts_wanted.model}`.trim(),
              price: m.listings.price_php ? `₱${Number(m.listings.price_php).toLocaleString()}` : "",
            })),
          };
          await enqueueTransactionalEmailServer({
            templateName: "parts-wanted-match",
            recipientEmail: email,
            idempotencyKey: `pwm-${userId}-${userMatches.map((m) => m.id).sort().join("-").slice(0, 60)}`,
            templateData: payload,
          });
          ids.push(...userMatches.map((m) => m.id));
          sent++;
        }

        if (ids.length) {
          await supabaseAdmin
            .from("parts_wanted_matches")
            .update({ notified_at: new Date().toISOString() } as never)
            .in("id", ids);
        }

        return new Response(JSON.stringify({ ok: true, users_notified: sent }), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
