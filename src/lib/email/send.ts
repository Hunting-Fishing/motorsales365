import { supabase } from "@/integrations/supabase/client";

interface SendTransactionalEmailParams {
  templateName: string;
  recipientEmail: string;
  idempotencyKey?: string;
  templateData?: Record<string, any>;
}

/**
 * Sends a transactional email via the Lovable Emails infrastructure.
 * The send route validates the caller's Supabase JWT and enqueues
 * the email through the durable pgmq pipeline.
 *
 * NOTE: requires the email domain to be configured and email infrastructure
 * scaffolded — emails will fail-soft (logged) until that's done.
 */
export async function sendTransactionalEmail(params: SendTransactionalEmailParams) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const response = await fetch("/lovable/email/transactional/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      },
      body: JSON.stringify({
        templateName: params.templateName,
        recipientEmail: params.recipientEmail,
        idempotencyKey: params.idempotencyKey,
        templateData: params.templateData,
      }),
    });
    if (!response.ok) {
      console.warn(`[email] send failed: ${response.status} ${response.statusText}`);
      return { ok: false, status: response.status };
    }
    return await response.json();
  } catch (err) {
    console.warn("[email] send error", err);
    return { ok: false, error: String(err) };
  }
}
