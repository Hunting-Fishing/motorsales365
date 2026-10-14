/**
 * Shared email sender configuration.
 *
 * EMAIL_FROM (optional env) overrides the From header, e.g.
 *   EMAIL_FROM="365 MotorSales <noreply@365motorsales.com>"
 * The address's domain must be verified with the email provider
 * (SPF/DKIM/DMARC) before sending.
 */
export const SITE_NAME = "motorsales365";
export const ROOT_DOMAIN = "365motorsales.com";
export const SITE_ORIGIN = `https://www.${ROOT_DOMAIN}`;
export const DEFAULT_FROM = `${SITE_NAME} <noreply@${ROOT_DOMAIN}>`;

export function emailFrom(): string {
  return (typeof process !== "undefined" && process.env?.EMAIL_FROM) || DEFAULT_FROM;
}

/** RFC 8058 one-click unsubscribe endpoint for a token. */
export function unsubscribeUrl(token: string): string {
  return `${SITE_ORIGIN}/email/unsubscribe?token=${encodeURIComponent(token)}`;
}
