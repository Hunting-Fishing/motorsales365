import QRCode from "qrcode";
import { computeQuietZoneModules, type QrLevel } from "./qr-quiet-zone";

/**
 * Generate a QR code as a PNG data URL. Use this for "Download PNG",
 * poster/print exports, and anywhere a fixed-size image is needed —
 * `<ResponsiveQr>` is for on-screen rendering only.
 */
export async function renderQrPng(opts: {
  value: string;
  sizePx: number;
  level?: QrLevel;
  /** "auto" (default) uses computeQuietZoneModules, or set a module count. */
  quietZone?: "auto" | number;
  dark?: string;
  light?: string;
}): Promise<string> {
  const level = opts.level ?? "H";
  const margin =
    opts.quietZone == null || opts.quietZone === "auto"
      ? computeQuietZoneModules(opts.sizePx, level)
      : Math.max(0, opts.quietZone);
  return QRCode.toDataURL(opts.value, {
    errorCorrectionLevel: level,
    width: opts.sizePx,
    margin,
    color: {
      dark: opts.dark ?? "#000000",
      light: opts.light ?? "#ffffff",
    },
  });
}
