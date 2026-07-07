/**
 * Quiet-zone auto-tuner for QR codes.
 *
 * The QR spec requires >= 4 modules of blank space around the symbol. In
 * practice, mobile cameras — especially at oblique angles or when the image
 * has been auto-cropped by messaging apps — need noticeably more margin at
 * small sizes and when the error-correction level is low. This helper
 * returns a module count that scales sensibly with the rendered pixel size
 * and the chosen ECC level.
 */
export type QrLevel = "L" | "M" | "Q" | "H";

/** Compute the number of quiet-zone MODULES to render around the QR. */
export function computeQuietZoneModules(renderedPx: number, level: QrLevel): number {
  const baseByLevel: Record<QrLevel, number> = { L: 6, M: 5, Q: 5, H: 4 };
  const base = baseByLevel[level] ?? 4;
  // Add up to +4 extra modules as the rendered size shrinks below ~256px.
  const sizeBoost = Math.max(0, Math.round((256 - renderedPx) / 48));
  const modules = base + Math.min(sizeBoost, 4);
  return Math.max(4, Math.min(modules, 10));
}

/** Human-readable summary for UI. */
export function quietZoneSummary(renderedPx: number, level: QrLevel): string {
  const m = computeQuietZoneModules(renderedPx, level);
  return `${m} modules (ECC ${level}, ${renderedPx}px)`;
}
