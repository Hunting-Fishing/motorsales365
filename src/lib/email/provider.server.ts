export type StandaloneEmailMessage = {
  to: string;
  from: string;
  subject: string;
  html?: string | null;
  text?: string | null;
  idempotencyKey?: string | null;
  unsubscribeUrl?: string | null;
};

type ResendResponse = {
  id?: string;
  message?: string;
};

/**
 * Send through the independently configured email provider.
 *
 * Currently Resend is supported directly over HTTPS to keep the runtime small.
 * Missing credentials fail closed; there is intentionally no Lovable fallback.
 */
export async function sendStandaloneEmail(message: StandaloneEmailMessage): Promise<{ id: string | null }> {
  const provider = (process.env.EMAIL_PROVIDER || "resend").trim().toLowerCase();
  if (provider !== "resend") {
    throw new Error(`Unsupported EMAIL_PROVIDER: ${provider}`);
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) throw new Error("RESEND_API_KEY is not configured");

  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
  if (message.idempotencyKey) headers["Idempotency-Key"] = message.idempotencyKey;

  const emailHeaders: Record<string, string> = {};
  if (message.unsubscribeUrl) {
    emailHeaders["List-Unsubscribe"] = `<${message.unsubscribeUrl}>`;
    emailHeaders["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click";
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers,
    body: JSON.stringify({
      from: message.from,
      to: [message.to],
      subject: message.subject,
      html: message.html || undefined,
      text: message.text || undefined,
      headers: Object.keys(emailHeaders).length ? emailHeaders : undefined,
    }),
  });

  const json = (await response.json().catch(() => ({}))) as ResendResponse;
  if (!response.ok) {
    const err = new Error(json.message || `Email provider request failed (${response.status})`) as Error & {
      status?: number;
      retryAfterSeconds?: number | null;
    };
    err.status = response.status;
    const retryAfter = response.headers.get("retry-after");
    err.retryAfterSeconds = retryAfter && /^\d+$/.test(retryAfter) ? Number(retryAfter) : null;
    throw err;
  }

  return { id: json.id ?? null };
}
