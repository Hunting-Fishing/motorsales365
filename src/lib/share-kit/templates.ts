import type { ShareTemplate } from "./types";

/**
 * Built-in share-kit templates.
 *
 * Intentionally empty — all live templates are now uploaded by admins
 * through the Share Kit admin page and stored in `share_kit_custom_templates`.
 * The original hard-coded designs were testers and have been removed.
 */
export const TEMPLATES: ShareTemplate[] = [];

export function getTemplate(id: string): ShareTemplate | undefined {
  return TEMPLATES.find((t) => t.id === id);
}
