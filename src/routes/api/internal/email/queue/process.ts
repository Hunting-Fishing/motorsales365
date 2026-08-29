import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createFileRoute } from "@tanstack/react-router";
import { sendStandaloneEmail } from "@/lib/email/provider.server";

const MAX_RETRIES = 5;
const DEFAULT_BATCH_SIZE = 10;
const DEFAULT_SEND_DELAY_MS = 200;
const DEFAULT_AUTH_TTL_MINUTES = 15;
const DEFAULT_TRANSACTIONAL_TTL_MINUTES = 60;

function isRateLimited(error: unknown): boolean {
  return Boolean(
    error &&
      typeof error === "object" &&
      "status" in error &&
      (error as { status?: number }).status === 429,
  );
}

function isForbidden(error: unknown): boolean {
  return Boolean(
    error &&
      typeof error === "object" &&
      "status" in error &&
      (error as { status?: number }).status === 403,
  );
}

function getRetryAfterSeconds(error: unknown): number {
  if (error && typeof error === "object" && "retryAfterSeconds" in error) {
    return (error as { retryAfterSeconds?: number | null }).retryAfterSeconds ?? 60;
  }
  return 60;
}

function siteOrigin(): string {
  const raw = process.env.PUBLIC_SITE_ORIGIN || process.env.SITE_URL || "https://365motorsales.com";
  try {
    return new URL(raw).origin;
  } catch {
    return "https://365motorsales.com";
  }
}

async function moveToDlq(
  supabase: SupabaseClient<any, any>,
  queue: string,
  msg: { msg_id: number; message: Record<string, any> },
  reason: string,
): Promise<void> {
  const payload = msg.message;
  await supabase.from("email_send_log").insert({
    message_id: payload.message_id,
    template_name: payload.label || queue,
    recipient_email: payload.to,
    status: "dlq",
    error_message: reason,
  });
  const { error } = await supabase.rpc("move_to_dlq", {
    source_queue: queue,
    dlq_name: `${queue}_dlq`,
    message_id: msg.msg_id,
    payload,
  });
  if (error) {
    console.error("Failed to move message to DLQ", { queue, msg_id: msg.msg_id, reason, error });
  }
}

export const Route = createFileRoute("/api/internal/email/queue/process")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expectedCronToken = process.env.EMAIL_QUEUE_CRON_TOKEN?.trim();
        const suppliedCronToken = request.headers.get("x-cron-token")?.trim();
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!expectedCronToken || !supabaseUrl || !supabaseServiceKey) {
          console.error("Standalone email queue is not fully configured");
          return Response.json({ error: "Server configuration error" }, { status: 500 });
        }
        if (!suppliedCronToken || suppliedCronToken !== expectedCronToken) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const supabase: SupabaseClient<any, any> = createClient(supabaseUrl, supabaseServiceKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        });

        const { data: state } = await supabase
          .from("email_send_state")
          .select(
            "retry_after_until, batch_size, send_delay_ms, auth_email_ttl_minutes, transactional_email_ttl_minutes",
          )
          .single();

        if (state?.retry_after_until && new Date(state.retry_after_until) > new Date()) {
          return Response.json({ skipped: true, reason: "rate_limited" });
        }

        const batchSize = state?.batch_size ?? DEFAULT_BATCH_SIZE;
        const sendDelayMs = state?.send_delay_ms ?? DEFAULT_SEND_DELAY_MS;
        const ttlMinutes: Record<string, number> = {
          auth_emails: state?.auth_email_ttl_minutes ?? DEFAULT_AUTH_TTL_MINUTES,
          transactional_emails:
            state?.transactional_email_ttl_minutes ?? DEFAULT_TRANSACTIONAL_TTL_MINUTES,
        };

        let totalProcessed = 0;

        for (const queue of ["auth_emails", "transactional_emails"]) {
          const { data: messages, error: readError } = await supabase.rpc("read_email_batch", {
            queue_name: queue,
            batch_size: batchSize,
            vt: 30,
          });
          if (readError) {
            console.error("Failed to read email batch", { queue, error: readError });
            continue;
          }
          if (!messages?.length) continue;

          const messageIds = Array.from(
            new Set(
              messages
                .map((msg: any) =>
                  msg?.message?.message_id && typeof msg.message.message_id === "string"
                    ? msg.message.message_id
                    : null,
                )
                .filter((id: string | null): id is string => Boolean(id)),
            ),
          );
          const failedAttemptsByMessageId = new Map<string, number>();
          if (messageIds.length > 0) {
            const { data: failedRows } = await supabase
              .from("email_send_log")
              .select("message_id")
              .in("message_id", messageIds)
              .eq("status", "failed");
            for (const row of failedRows ?? []) {
              const messageId = row?.message_id;
              if (typeof messageId !== "string" || !messageId) continue;
              failedAttemptsByMessageId.set(
                messageId,
                (failedAttemptsByMessageId.get(messageId) ?? 0) + 1,
              );
            }
          }

          for (let i = 0; i < messages.length; i++) {
            const msg = messages[i] as any;
            const payload = msg.message ?? {};
            const failedAttempts =
              payload.message_id && typeof payload.message_id === "string"
                ? failedAttemptsByMessageId.get(payload.message_id) ?? 0
                : msg.read_ct ?? 0;

            const queuedAt = payload.queued_at ?? msg.enqueued_at;
            if (queuedAt) {
              const ageMs = Date.now() - new Date(queuedAt).getTime();
              const maxAgeMs = ttlMinutes[queue] * 60 * 1000;
              if (ageMs > maxAgeMs) {
                await moveToDlq(
                  supabase,
                  queue,
                  msg,
                  `TTL exceeded (${ttlMinutes[queue]} minutes)`,
                );
                continue;
              }
            }

            if (failedAttempts >= MAX_RETRIES) {
              await moveToDlq(
                supabase,
                queue,
                msg,
                `Max retries (${MAX_RETRIES}) exceeded (attempted ${failedAttempts} times)`,
              );
              continue;
            }

            if (payload.message_id) {
              const { data: alreadySent } = await supabase
                .from("email_send_log")
                .select("id")
                .eq("message_id", payload.message_id)
                .eq("status", "sent")
                .maybeSingle();
              if (alreadySent) {
                await supabase.rpc("delete_email", {
                  queue_name: queue,
                  message_id: msg.msg_id,
                });
                continue;
              }
            }

            try {
              const unsubscribeUrl = payload.unsubscribe_token
                ? `${siteOrigin()}/email/unsubscribe?token=${encodeURIComponent(payload.unsubscribe_token)}`
                : null;
              await sendStandaloneEmail({
                to: String(payload.to),
                from:
                  String(payload.from || "") ||
                  `365 Motor Sales <${process.env.TRANSACTIONAL_FROM_EMAIL || "noreply@365motorsales.com"}>`,
                subject: String(payload.subject || "365 Motor Sales"),
                html: typeof payload.html === "string" ? payload.html : null,
                text: typeof payload.text === "string" ? payload.text : null,
                idempotencyKey:
                  typeof payload.idempotency_key === "string"
                    ? payload.idempotency_key
                    : typeof payload.message_id === "string"
                      ? payload.message_id
                      : null,
                unsubscribeUrl,
              });

              await supabase.from("email_send_log").insert({
                message_id: payload.message_id,
                template_name: payload.label || queue,
                recipient_email: payload.to,
                status: "sent",
              });
              const { error: delError } = await supabase.rpc("delete_email", {
                queue_name: queue,
                message_id: msg.msg_id,
              });
              if (delError) {
                console.error("Failed to delete sent message from queue", {
                  queue,
                  msg_id: msg.msg_id,
                  error: delError,
                });
              }
              totalProcessed++;
            } catch (error) {
              const errorMsg = error instanceof Error ? error.message : String(error);
              console.error("Email send failed", {
                queue,
                msg_id: msg.msg_id,
                failed_attempts: failedAttempts,
                error: errorMsg,
              });

              if (isRateLimited(error)) {
                await supabase.from("email_send_log").insert({
                  message_id: payload.message_id,
                  template_name: payload.label || queue,
                  recipient_email: payload.to,
                  status: "failed",
                  error_message: errorMsg.slice(0, 1000),
                });
                const retryAfterSecs = getRetryAfterSeconds(error);
                await supabase
                  .from("email_send_state")
                  .update({
                    retry_after_until: new Date(Date.now() + retryAfterSecs * 1000).toISOString(),
                    updated_at: new Date().toISOString(),
                  })
                  .eq("id", 1);
                return Response.json({ processed: totalProcessed, stopped: "rate_limited" });
              }

              if (isForbidden(error)) {
                await moveToDlq(supabase, queue, msg, errorMsg.slice(0, 1000));
                return Response.json({ processed: totalProcessed, stopped: "forbidden" });
              }

              await supabase.from("email_send_log").insert({
                message_id: payload.message_id,
                template_name: payload.label || queue,
                recipient_email: payload.to,
                status: "failed",
                error_message: errorMsg.slice(0, 1000),
              });
              if (payload.message_id && typeof payload.message_id === "string") {
                failedAttemptsByMessageId.set(payload.message_id, failedAttempts + 1);
              }
            }

            if (i < messages.length - 1) {
              await new Promise((resolve) => setTimeout(resolve, sendDelayMs));
            }
          }
        }

        return Response.json({ processed: totalProcessed });
      },
    },
  },
});
