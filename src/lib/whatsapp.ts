/**
 * Free WhatsApp click-to-chat helpers.
 * Uses wa.me deep links — no API, no cost, works on web + mobile.
 * Docs: https://faq.whatsapp.com/5913398998672934
 */

/**
 * Normalize a phone string into E.164-digits-only form (no leading +, no spaces).
 * Assumes Philippine numbers when given a local 0-prefixed number.
 */
export function toWhatsAppDigits(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let digits = raw.replace(/[^\d+]/g, "");
  if (!digits) return null;

  if (digits.startsWith("+")) {
    digits = digits.slice(1);
  } else if (digits.startsWith("00")) {
    digits = digits.slice(2);
  } else if (digits.startsWith("0")) {
    // Default to PH country code for local numbers (e.g. 0917… -> 63917…)
    digits = "63" + digits.slice(1);
  } else if (digits.startsWith("9") && digits.length === 10) {
    // Bare mobile e.g. 9171234567
    digits = "63" + digits;
  }

  return /^\d{7,15}$/.test(digits) ? digits : null;
}

/**
 * Build a wa.me URL with an optional pre-filled message.
 * Returns null if the phone cannot be normalized.
 */
export function waMeUrl(phone: string | null | undefined, message?: string): string | null {
  const digits = toWhatsAppDigits(phone);
  if (!digits) return null;
  const base = `https://wa.me/${digits}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
