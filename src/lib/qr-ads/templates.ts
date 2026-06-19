import type { ShareTemplate } from "./types";

/**
 * Built-in QR ad templates.
 *
 * Intentionally empty — all live templates are now uploaded by admins
 * through the QR Ads admin page and stored in `qr_ad_templates`.
 * The original hard-coded designs were testers and have been removed.
 */
export const TEMPLATES: ShareTemplate[] = [];

export function getTemplate(id: string): ShareTemplate | undefined {
  return TEMPLATES.find((t) => t.id === id);
}
