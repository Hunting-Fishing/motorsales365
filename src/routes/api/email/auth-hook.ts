import * as React from "react";
import { render } from "@react-email/components";
import { createClient } from "@supabase/supabase-js";
import { createFileRoute } from "@tanstack/react-router";
import { SignupEmail } from "@/lib/email-templates/signup";
import { InviteEmail } from "@/lib/email-templates/invite";
import { MagicLinkEmail } from "@/lib/email-templates/magic-link";
import { RecoveryEmail } from "@/lib/email-templates/recovery";
import { EmailChangeEmail } from "@/lib/email-templates/email-change";
import { ReauthenticationEmail } from "@/lib/email-templates/reauthentication";
import { alertOps } from "@/lib/alerting.server";
import { ROOT_DOMAIN, SITE_NAME, emailFrom } from "@/lib/email/config";
import { isEmailProviderConfigured, sendEmail } from "@/lib/email/provider.server";
import {
  WebhookVerificationError,
  verifyStandardWebhook,
} from "@/lib/webhooks/standard-webhooks.server";

/**
 * Supabase Auth "Send Email" hook.
 *
 * Configure in Supabase Dashboard → Authentication → Hooks → Send Email →
 * HTTPS, URL `https://www.365motorsales.com/api/email/auth-hook`, and store the
 * generated secret (format `v1,whsec_...`) as SEND_EMAIL_HOOK_SECRET.
 *
 * The hook renders our React Email templates and sends them immediately via
 * the configured provider (users are waiting on these). If the direct send
 * fails, the message is enqueued on the `auth_emails` pgmq queue so
 * /api/email/queue/process retries it with backoff.
 */

const EMAIL_SUBJECTS: Record<string, string> = {
  signup: "Confirm your email",
  invite: "You've been invited",
  magiclink: "Your login link",
  recovery: "Reset your password",
  email_change: "Confirm your new email",
  reauthentication: "Your verification code",
};

const EMAIL_TEMPLATES: Record<string, React.ComponentType<any>> = {
  signup: SignupEmail,
  invite: InviteEmail,
  magiclink: MagicLinkEmail,
  recovery: RecoveryEmail,
  email_change: EmailChangeEmail,
  reauthentication: ReauthenticationEmail,
};

type HookPayload = {
  user: { id: string; email: string; new_email?: string | null };
  email_data: {
    token: string;
    token_hash: string;
    redirect_to: string;
    email_action_type: string;
    site_url: string;
    token_new: string;
    token_hash_new: string;
    old_email?: string;
  };
};

type Outgoing = { to: string; token: string; tokenHash: string };

function verifyUrl(supabaseUrl: string, tokenHash: string, type: string, redirectTo: string) {
  const params = new URLSearchParams({ token: tokenHash, type });
  if (redirectTo) params.set("redirect_to", redirectTo);
  return `${supabaseUrl.replace(/\/+$/, "")}/auth/v1/verify?${params.toString()}`;
}

/**
 * Work out who receives which token. Supabase's email_change field names
 * are reversed for backward compatibility: token_hash_new pairs with the
 * CURRENT address, token_hash with the NEW address.
 */
function recipients(p: HookPayload): Outgoing[] {
  const d = p.email_data;
  if (d.email_action_type !== "email_change") {
    return [{ to: p.user.email, token: d.token, tokenHash: d.token_hash }];
  }
  const newEmail = p.user.new_email || p.user.email;
  if (d.token_hash && d.token_hash_new) {
    return [
      { to: p.user.email, token: d.token, tokenHash: d.token_hash_new },
      { to: newEmail, token: d.token_new, tokenHash: d.token_hash },
    ];
  }
  return [{ to: newEmail, token: d.token || d.token_new, tokenHash: d.token_hash }];
}

function redactEmail(email: string | null | undefined): string {
  if (!email) return "***";
  const [localPart, domain] = email.split("@");
  if (!localPart || !domain) return "***";
  return `${localPart[0]}***@${domain}`;
}

function hookError(status: number, message: string) {
  // Supabase surfaces { error: { http_code, message } } to the caller.
  return Response.json({ error: { http_code: status, message } }, { status });
}

export const Route = createFileRoute("/api/email/auth-hook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.SEND_EMAIL_HOOK_SECRET;
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!secret || !supabaseUrl || !supabaseServiceKey) {
          console.error("Send-email hook is not configured");
          void alertOps("email.auth.config_missing", {
            key: !secret ? "SEND_EMAIL_HOOK_SECRET" : "SUPABASE_SERVICE_ROLE_KEY",
          });
          return hookError(500, "Server configuration error");
        }

        let payload: HookPayload;
        try {
          const body = await verifyStandardWebhook(request, secret);
          payload = JSON.parse(body) as HookPayload;
        } catch (error) {
          if (error instanceof WebhookVerificationError) {
            console.error("Invalid auth hook signature", { code: error.code });
            return hookError(401, "Invalid signature");
          }
          console.error("Invalid auth hook payload", { error: String(error) });
          return hookError(400, "Invalid payload");
        }

        const emailType = payload?.email_data?.email_action_type;
        const EmailTemplate = emailType ? EMAIL_TEMPLATES[emailType] : undefined;
        if (!payload?.user?.email || !EmailTemplate) {
          console.error("Unsupported auth email", { emailType });
          return hookError(400, `Unsupported email type: ${String(emailType)}`);
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const d = payload.email_data;

        for (const out of recipients(payload)) {
          // Recovery uses the token_hash flow on our own reset page so the link
          // works from any device (PKCE would need the originating browser).
          const confirmationUrl =
            emailType === "recovery" && out.tokenHash
              ? `https://${ROOT_DOMAIN}/reset-password?token_hash=${encodeURIComponent(
                  out.tokenHash,
                )}&type=recovery`
              : verifyUrl(supabaseUrl, out.tokenHash, emailType, d.redirect_to);

          const element = React.createElement(EmailTemplate, {
            siteName: SITE_NAME,
            siteUrl: `https://${ROOT_DOMAIN}`,
            recipient: out.to,
            confirmationUrl,
            token: out.token,
            email: out.to,
            oldEmail: d.old_email || payload.user.email,
            newEmail: payload.user.new_email ?? undefined,
          });
          const html = await render(element);
          const text = await render(element, { plainText: true });
          const messageId = crypto.randomUUID();
          const subject = EMAIL_SUBJECTS[emailType] || "Notification";

          if (isEmailProviderConfigured()) {
            try {
              await sendEmail({
                to: out.to,
                from: emailFrom(),
                subject,
                html,
                text,
                label: emailType,
                idempotencyKey: messageId,
              });
              await supabase.from("email_send_log").insert({
                message_id: messageId,
                template_name: emailType,
                recipient_email: out.to,
                status: "sent",
              });
              continue;
            } catch (err) {
              console.warn("Direct auth email send failed; falling back to queue", {
                emailType,
                recipient_redacted: redactEmail(out.to),
                error: String(err).slice(0, 300),
              });
            }
          }

          await supabase.from("email_send_log").insert({
            message_id: messageId,
            template_name: emailType,
            recipient_email: out.to,
            status: "pending",
          });

          const { error: enqueueError } = await supabase.rpc("enqueue_email", {
            queue_name: "auth_emails",
            payload: {
              message_id: messageId,
              to: out.to,
              from: emailFrom(),
              subject,
              html,
              text,
              purpose: "transactional",
              label: emailType,
              idempotency_key: messageId,
              queued_at: new Date().toISOString(),
            },
          });

          if (enqueueError) {
            console.error("Failed to enqueue auth email", {
              error: enqueueError,
              emailType,
              recipient_redacted: redactEmail(out.to),
            });
            void alertOps("email.auth.enqueue_failed", { emailType, error: enqueueError });
            await supabase.from("email_send_log").insert({
              message_id: messageId,
              template_name: emailType,
              recipient_email: out.to,
              status: "failed",
              error_message: "Failed to enqueue email",
            });
            return hookError(500, "Failed to enqueue email");
          }
        }

        return Response.json({});
      },
    },
  },
});
