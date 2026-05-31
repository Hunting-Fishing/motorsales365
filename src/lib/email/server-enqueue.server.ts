/**
 * Server-only helper to render and enqueue a transactional email from within
 * a server function, without requiring a Bearer token. Use this when an action
 * (e.g. guest booking) needs to fire emails server-to-server.
 */
import * as React from "react";
import { render } from "@react-email/components";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { TEMPLATES } from "@/lib/email-templates/registry";

const SITE_NAME = "motorsales365";
const SENDER_DOMAIN = "notify.365motorsales.com";
const FROM_DOMAIN = "365motorsales.com";

function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export interface ServerEnqueueParams {
  templateName: string;
  recipientEmail: string;
  templateData?: Record<string, any>;
  idempotencyKey?: string;
}

/** Render + enqueue a transactional email server-side. Fail-soft: logs and returns. */
export async function enqueueTransactionalEmailServer(params: ServerEnqueueParams) {
  try {
    const template = TEMPLATES[params.templateName];
    if (!template) {
      console.warn(`[email/server-enqueue] unknown template ${params.templateName}`);
      return { ok: false, reason: "unknown_template" as const };
    }
    const recipient = (template.to || params.recipientEmail || "").trim();
    if (!recipient) return { ok: false, reason: "no_recipient" as const };
    const normalized = recipient.toLowerCase();

    // suppression check
    const { data: suppressed } = await supabaseAdmin
      .from("suppressed_emails")
      .select("id")
      .eq("email", normalized)
      .maybeSingle();
    if (suppressed) return { ok: false, reason: "suppressed" as const };

    // unsubscribe token (reuse or create)
    let unsubscribeToken: string;
    const { data: existing } = await supabaseAdmin
      .from("email_unsubscribe_tokens")
      .select("token, used_at")
      .eq("email", normalized)
      .maybeSingle();
    if (existing && !(existing as any).used_at) {
      unsubscribeToken = (existing as any).token;
    } else {
      unsubscribeToken = generateToken();
      await supabaseAdmin
        .from("email_unsubscribe_tokens")
        .upsert({ token: unsubscribeToken, email: normalized }, { onConflict: "email", ignoreDuplicates: true });
      const { data: stored } = await supabaseAdmin
        .from("email_unsubscribe_tokens")
        .select("token")
        .eq("email", normalized)
        .maybeSingle();
      if (stored) unsubscribeToken = (stored as any).token;
    }

    const messageId = crypto.randomUUID();
    const idempotencyKey = params.idempotencyKey || messageId;
    const element = React.createElement(template.component, params.templateData ?? {});
    const html = await render(element);
    const text = await render(element, { plainText: true });
    const subject =
      typeof template.subject === "function"
        ? template.subject(params.templateData ?? {})
        : template.subject;

    await supabaseAdmin.from("email_send_log").insert({
      message_id: messageId,
      template_name: params.templateName,
      recipient_email: recipient,
      status: "pending",
    } as any);

    const { error } = await supabaseAdmin.rpc("enqueue_email", {
      queue_name: "transactional_emails",
      payload: {
        message_id: messageId,
        to: recipient,
        from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
        sender_domain: SENDER_DOMAIN,
        subject,
        html,
        text,
        purpose: "transactional",
        label: params.templateName,
        idempotency_key: idempotencyKey,
        unsubscribe_token: unsubscribeToken,
        queued_at: new Date().toISOString(),
      },
    } as any);

    if (error) {
      console.warn("[email/server-enqueue] enqueue failed", error.message);
      return { ok: false, reason: "enqueue_failed" as const };
    }
    return { ok: true as const };
  } catch (err) {
    console.warn("[email/server-enqueue] error", err);
    return { ok: false, reason: "exception" as const };
  }
}
