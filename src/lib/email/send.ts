import { supabase } from "@/integrations/supabase/client";

interface SendTransactionalEmailParams {
  templateName: string;
  recipientEmail: string;
  idempotencyKey?: string;
  templateData?: Record<string, any>;
}

/**
 * Sends a transactional email through the standalone email queue.
 * The server route validates the caller's Supabase JWT and enqueues into the
 * existing durable pgmq pipeline. Delivery is handled by the standalone
 * provider worker (Resend by default); there is no Lovable fallback.
 */
export async function sendTransactionalEmail(params: SendTransactionalEmailParams) {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const response = await fetch("/api/email/transactional/send", {
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
