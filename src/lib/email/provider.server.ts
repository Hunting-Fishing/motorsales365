/**
 * Provider-agnostic transactional email delivery (server-only).
 *
 * EMAIL_PROVIDER selects the backend (default "resend"). Only the provider
 * adapter lives here; queueing, retries, suppression and templating are
 * handled by the queue processor and are provider independent.
 *
 * Environment:
 *   EMAIL_PROVIDER   optional, "resend" (default)
 *   RESEND_API_KEY   required for the resend provider
 */
import { unsubscribeUrl } from "./config";

export interface OutboundEmail {
  to: string;
  from: string;
  subject: string;
  html: string;
  text?: string;
  /** Tag used for analytics / log correlation (template name). */
  label?: string;
  idempotencyKey?: string;
  unsubscribeToken?: string;
}

/** Structured send error so the queue can distinguish 429/403/transient. */
export class EmailSendError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly retryAfterSeconds: number | null = null,
  ) {
    super(message);
    this.name = "EmailSendError";
  }
}

export function emailProviderName(): string {
  return (process.env.EMAIL_PROVIDER || "resend").toLowerCase();
}

export function isEmailProviderConfigured(): boolean {
  switch (emailProviderName()) {
    case "resend":
      return Boolean(process.env.RESEND_API_KEY);
    default:
      return false;
  }
}

function tagValue(v: string): string {
  return v.replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 256) || "email";
}

async function sendViaResend(msg: OutboundEmail): Promise<{ id: string | null }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new EmailSendError("RESEND_API_KEY is not configured", 500);

  const headers: Record<string, string> = {};
  if (msg.unsubscribeToken) {
    headers["List-Unsubscribe"] = `<${unsubscribeUrl(msg.unsubscribeToken)}>`;
    headers["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click";
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(msg.idempotencyKey ? { "Idempotency-Key": msg.idempotencyKey.slice(0, 256) } : {}),
    },
    body: JSON.stringify({
      from: msg.from,
      to: [msg.to],
      subject: msg.subject,
      html: msg.html,
      ...(msg.text ? { text: msg.text } : {}),
      ...(Object.keys(headers).length ? { headers } : {}),
      ...(msg.label ? { tags: [{ name: "template", value: tagValue(msg.label) }] } : {}),
    }),
  });

  if (!res.ok) {
    const retryAfter = Number(res.headers.get("retry-after"));
    const body = (await res.text()).slice(0, 500);
    throw new EmailSendError(
      `Email provider error ${res.status}: ${body}`,
      res.status,
      Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : null,
    );
  }
  const json = (await res.json().catch(() => ({}))) as { id?: string };
  return { id: json.id ?? null };
}

export async function sendEmail(msg: OutboundEmail): Promise<{ id: string | null }> {
  switch (emailProviderName()) {
    case "resend":
      return sendViaResend(msg);
    default:
      throw new EmailSendError(`Unsupported EMAIL_PROVIDER "${emailProviderName()}"`, 500);
  }
}
