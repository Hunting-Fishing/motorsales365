// Cron hook: pg_cron hits this daily at 00:00 UTC. The handler reads the
// configured interval from flashcard_content and only runs the GitHub pull
// if enough time has elapsed since the last successful run.

import { createFileRoute } from "@tanstack/react-router";
import { verifyInternalCronToken } from "@/integrations/supabase/internal-secrets.server";

export const Route = createFileRoute("/api/public/hooks/flashcards-autosync")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authed = await verifyInternalCronToken({
          jobName: "flashcards_autosync",
          tokenHeader: request.headers.get("x-cron-token"),
        });
        if (!authed) return new Response("Unauthorized", { status: 401 });


        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { runFlashcardSync, isAutoSyncDue } = await import(
          "@/lib/flashcards.server"
        );
        type AutoSyncInterval = "daily" | "weekly" | "biweekly" | "monthly";

        const { data: row, error: readErr } = await supabaseAdmin
          .from("flashcard_content")
          .select("auto_sync_enabled, auto_sync_interval, auto_sync_last_run_at, source_repo, source_ref")
          .eq("id", 1)
          .maybeSingle();

        if (readErr) {
          return Response.json({ ok: false, error: readErr.message }, { status: 500 });
        }
        if (!row?.auto_sync_enabled) {
          return Response.json({ ok: true, skipped: "disabled" });
        }

        const interval = (row.auto_sync_interval as AutoSyncInterval) ?? "daily";
        if (!isAutoSyncDue(interval, row.auto_sync_last_run_at)) {
          return Response.json({
            ok: true,
            skipped: "not-due",
            interval,
            lastRunAt: row.auto_sync_last_run_at,
          });
        }

        try {
          const result = await runFlashcardSync({
            supabaseAdmin,
            repo: row.source_repo ?? undefined,
            ref: row.source_ref ?? undefined,
            syncedBy: null,
          });
          await supabaseAdmin
            .from("flashcard_content")
            .update({
              auto_sync_last_run_at: result.syncedAt,
              auto_sync_last_status: "success",
              auto_sync_last_error: null,
            })
            .eq("id", 1);
          return Response.json({ ok: true, ran: true, result });
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          await supabaseAdmin
            .from("flashcard_content")
            .update({
              auto_sync_last_run_at: new Date().toISOString(),
              auto_sync_last_status: "error",
              auto_sync_last_error: message,
            })
            .eq("id", 1);
          return Response.json({ ok: false, ran: true, error: message }, { status: 200 });
        }
      },
    },
  },
});
