/**
 * QR readability validator.
 *
 * Verifies that the rendered QR will scan reliably inside the Scan Here area
 * by checking two thresholds:
 *
 *  1. Module size — each QR module must render at >= MIN_MODULE_PX output
 *     pixels. Below ~3 px a camera autofocus + sensor noise can't resolve
 *     the cell pattern, and the QR becomes unscannable on print or screen.
 *
 *  2. Background contrast — the area sitting *behind* the QR must be light
 *     enough that the dark modules carry a WCAG contrast ratio of at least
 *     MIN_CONTRAST against it. Custom flyers draw the QR directly on the
 *     artwork (platePadding = 0), so a dim or colorful "Scan Here" panel
 *     silently kills scanability even when placement is correct.
 *
 * Pure client-side, ~10–30 ms per image.
 */
import QRCode from "qrcode";
import type { ShareTemplate } from "./types";

export type QrReadability = {
  modules: number; // module count per side (e.g. 33 for v4)
  modulePx: number; // output pixels per module
  bgLuminance: number; // 0..1 mean luminance under the QR
  contrast: number; // WCAG contrast ratio of QR dark vs bg
  ok: boolean;
  reasons: string[]; // empty when ok
};

// Tuned for print + on-screen sharing of A4/portrait flyers.
const MIN_MODULE_PX = 4;
const MIN_CONTRAST = 3.5;
const ANALYSIS_LONG_EDGE = 320;
// Default QR dark color used by composeTemplate.
const DEFAULT_QR_DARK = "#0b2a6b";

function hexToRgb(hex: string): [number, number, number] {
  const m = hex.replace("#", "");
  const v = m.length === 3
    ? m.split("").map((c) => c + c).join("")
    : m.padEnd(6, "0");
  const n = parseInt(v.slice(0, 6), 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

function relLuminance(r: number, g: number, b: number): number {
  const f = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function wcagContrast(l1: number, l2: number): number {
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

function loadImage(src: string | Blob): Promise<HTMLImageElement> {
  const url = typeof src === "string" ? src : URL.createObjectURL(src);
  const revoke = typeof src !== "string";
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (typeof src === "string") img.crossOrigin = "anonymous";
    img.onload = () => {
      if (revoke) setTimeout(() => URL.revokeObjectURL(url), 0);
      resolve(img);
    };
    img.onerror = () => {
      if (revoke) URL.revokeObjectURL(url);
      reject(new Error("Could not load image"));
    };
    img.src = url;
  });
}

/** Mean luminance of the rectangle (x..x+s, y..y+s) in normalized coords. */
function sampleAreaLuminance(
  img: HTMLImageElement,
  cx: number,
  cy: number,
  side: number,
  templateAspect: number, // template.width / template.height
): number | null {
  const srcW = img.naturalWidth || img.width;
  const srcH = img.naturalHeight || img.height;
  if (!srcW || !srcH) return null;

  const longEdge = Math.max(srcW, srcH);
  const scale = Math.min(1, ANALYSIS_LONG_EDGE / longEdge);
  const w = Math.max(16, Math.round(srcW * scale));
  const h = Math.max(16, Math.round(srcH * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, w, h);

  // The QR is square in template space; convert to source-image pixels.
  // Normalized side is relative to template WIDTH; height side scales by
  // the template aspect so the sampled box matches the rendered QR.
  const halfX = side / 2;
  const halfY = (side / templateAspect) / 2;
  const x0 = Math.max(0, Math.floor((cx - halfX) * w));
  const y0 = Math.max(0, Math.floor((cy - halfY) * h));
  const x1 = Math.min(w, Math.ceil((cx + halfX) * w));
  const y1 = Math.min(h, Math.ceil((cy + halfY) * h));
  const sw = x1 - x0;
  const sh = y1 - y0;
  if (sw < 2 || sh < 2) return null;

  let data: Uint8ClampedArray;
  try {
    data = ctx.getImageData(x0, y0, sw, sh).data;
  } catch {
    // Tainted canvas — caller can fall back to plate assumption.
    return null;
  }

  let sum = 0;
  let count = 0;
  for (let p = 0; p < data.length; p += 4) {
    if (data[p + 3] < 200) continue;
    sum += relLuminance(data[p], data[p + 1], data[p + 2]);
    count++;
  }
  return count > 0 ? sum / count : null;
}

export type AssessOptions = {
  link: string;
  template: Pick<ShareTemplate, "width" | "height" | "qr" | "background"> & {
    imageUrl?: string;
  };
  placement: { cx: number; cy: number; size: number };
  /** Pre-loaded image of the flyer (preferred — skips a fetch). */
  baseImage?: HTMLImageElement;
  /** Or the source the flyer can be loaded from. */
  baseImageSrc?: string | Blob;
  qrDark?: string;
};

export async function assessQrReadability(
  opts: AssessOptions,
): Promise<QrReadability> {
  const { link, template, placement } = opts;
  const dark = opts.qrDark ?? DEFAULT_QR_DARK;

  // 1) Module count via QRCode.create (matches composeTemplate's ECC level).
  let modules = 33;
  try {
    const q = QRCode.create(link, { errorCorrectionLevel: "H" });
    modules = q.modules.size;
  } catch {
    // Fall through with the conservative default.
  }

  const qrSidePx = placement.size * template.width;
  const modulePx = qrSidePx / modules;

  // 2) Background luminance under the QR.
  //    If a white plate is drawn, the QR sits on #ffffff — luminance = 1.
  //    Otherwise sample the base image at the placement rectangle.
  let bgLuminance = 1;
  const hasPlate = (template.qr.platePadding ?? 0) > 0;
  if (!hasPlate) {
    let img = opts.baseImage ?? null;
    if (!img) {
      const src = opts.baseImageSrc ?? template.imageUrl;
      if (src) {
        try {
          img = await loadImage(src);
        } catch {
          img = null;
        }
      }
    }
    if (img) {
      const sampled = sampleAreaLuminance(
        img,
        placement.cx,
        placement.cy,
        placement.size,
        template.width / template.height,
      );
      if (sampled != null) bgLuminance = sampled;
    }
  }

  const [r, g, b] = hexToRgb(dark);
  const darkL = relLuminance(r, g, b);
  const contrast = wcagContrast(darkL, bgLuminance);

  const reasons: string[] = [];
  if (modulePx < MIN_MODULE_PX) {
    reasons.push(
      `QR modules render at ${modulePx.toFixed(1)}px (need ≥ ${MIN_MODULE_PX}px) — increase QR size.`,
    );
  }
  if (contrast < MIN_CONTRAST) {
    reasons.push(
      `Background contrast ${contrast.toFixed(2)}:1 (need ≥ ${MIN_CONTRAST}:1) — place on a lighter panel.`,
    );
  }

  return {
    modules,
    modulePx,
    bgLuminance,
    contrast,
    ok: reasons.length === 0,
    reasons,
  };
}

export const QR_READABILITY_THRESHOLDS = {
  minModulePx: MIN_MODULE_PX,
  minContrast: MIN_CONTRAST,
};
