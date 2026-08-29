import * as React from "react";
import { render } from "@react-email/components";
import { createClient } from "@supabase/supabase-js";
import { createFileRoute } from "@tanstack/react-router";
import { TEMPLATES } from "@/lib/email-templates/registry";

const SITE_NAME = "365 Motor Sales";
const FROM_EMAIL = process.env.TRANSACTIONAL_FROM_EMAIL || "noreply@365motorsales.com";

function redactEmail(email: string | null | undefined): string {
  if (!email) return "***";
  const [localPart, domain] = email.split("@");
  if (!localPart || !domain) return "***";
  return `${localPart[0]}***@${domain}`;
}

function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export const Route = createFileRoute("/api/email/transactional/send")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!supabaseUrl || !supabaseServiceKey) {
          return Response.json({ error: "Server configuration error" }, { status: 500 });
        }

        const authHeader = request.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const accessToken = authHeader.slice("Bearer ".length).trim();
        const supabase = createClient(supabaseUrl, supabaseServiceKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser(accessToken);
        if (authError || !user) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        let templateName: string;
        let recipientEmail: string | undefined;
        let idempotencyKey: string;
        let messageId: string;
        let templateData: Record<string, any> = {};
        try {
          const body = await request.json();
          templateName = body.templateName || body.template_name;
          recipientEmail = body.recipientEmail || body.recipient_email;
          messageId = crypto.randomUUID();
          idempotencyKey = body.idempotencyKey || body.idempotency_key || messageId;
          if (body.templateData && typeof body.templateData === "object") {
            templateData = body.templateData;
          }
        } catch {
          return Response.json({ error: "Invalid JSON in request body" }, { status: 400 });
        }

        if (!templateName) {
          return Response.json({ error: "templateName is required" }, { status: 400 });
        }

        const template = TEMPLATES[templateName];
        if (!template) {
          return Response.json({ error: `Template '${templateName}' not found` }, { status: 404 });
        }

        const effectiveRecipient = template.to || recipientEmail;
        if (!effectiveRecipient) {
          return Response.json({ error: "recipientEmail is required" }, { status: 400 });
        }

        const normalizedEmail = effectiveRecipient.toLowerCase();
        const { data: suppressed, error: suppressionError } = await supabase
          .from("suppressed_emails")
          .select("id")
          .eq("email", normalizedEmail)
          .maybeSingle();
        if (suppressionError) {
          console.error("Suppression check failed", {
            error: suppressionError,
            recipient_redacted: redactEmail(effectiveRecipient),
          });
          return Response.json({ error: "Failed to verify suppression status" }, { status: 500 });
        }
        if (suppressed) {
          await supabase.from("email_send_log").insert({
            message_id: messageId,
            template_name: templateName,
            recipient_email: effectiveRecipient,
            status: "suppressed",
          });
          return Response.json({ success: false, reason: "email_suppressed" });
        }

        let unsubscribeToken: string;
        const { data: existingToken, error: tokenLookupError } = await supabase
          .from("email_unsubscribe_tokens")
          .select("token, used_at")
          .eq("email", normalizedEmail)
          .maybeSingle();
        if (tokenLookupError) {
          return Response.json({ error: "Failed to prepare email" }, { status: 500 });
        }

        if (existingToken && !existingToken.used_at) {
          unsubscribeToken = existingToken.token;
        } else if (!existingToken) {
          unsubscribeToken = generateToken();
          const { error: tokenError } = await supabase
            .from("email_unsubscribe_tokens")
            .upsert(
              { token: unsubscribeToken, email: normalizedEmail },
              { onConflict: "email", ignoreDuplicates: true },
            );
          if (tokenError) {
            return Response.json({ error: "Failed to prepare email" }, { status: 500 });
          }
          const { data: storedToken, error: reReadError } = await supabase
            .from("email_unsubscribe_tokens")
            .select("token")
            .eq("email", normalizedEmail)
            .maybeSingle();
          if (reReadError || !storedToken) {
            return Response.json({ error: "Failed to prepare email" }, { status: 500 });
          }
          unsubscribeToken = storedToken.token;
        } else {
          await supabase.from("email_send_log").insert({
            message_id: messageId,
            template_name: templateName,
            recipient_email: effectiveRecipient,
            status: "suppressed",
            error_message: "Unsubscribe token used but email missing from suppressed list",
          });
          return Response.json({ success: false, reason: "email_suppressed" });
        }

        const element = React.createElement(template.component, templateData);
        const html = await render(element);
        const plainText = await render(element, { plainText: true });
        const resolvedSubject =
          typeof template.subject === "function" ? template.subject(templateData) : template.subject;

        await supabase.from("email_send_log").insert({
          message_id: messageId,
          template_name: templateName,
          recipient_email: effectiveRecipient,
          status: "pending",
        });

        const { error: enqueueError } = await supabase.rpc("enqueue_email", {
          queue_name: "transactional_emails",
          payload: {
            message_id: messageId,
            to: effectiveRecipient,
            from: `${SITE_NAME} <${FROM_EMAIL}>`,
            subject: resolvedSubject,
            html,
            text: plainText,
            purpose: "transactional",
            label: templateName,
            idempotency_key: idempotencyKey,
            unsubscribe_token: unsubscribeToken,
            queued_at: new Date().toISOString(),
          },
        });

        if (enqueueError) {
          await supabase.from("email_send_log").insert({
            message_id: messageId,
            template_name: templateName,
            recipient_email: effectiveRecipient,
            status: "failed",
            error_message: "Failed to enqueue email",
          });
          return Response.json({ error: "Failed to enqueue email" }, { status: 500 });
        }

        return Response.json({ success: true, queued: true });
      },
    },
  },
});
