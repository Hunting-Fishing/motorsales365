import QRCode from "qrcode";
import type { ShareTemplate, TemplateContext } from "./types";
import { interpolate } from "./types";

// ----- Caches (module-level, last for the session) -------------------------

type DecodedImage = HTMLImageElement | ImageBitmap;

const baseImageCache = new Map<string, Promise<DecodedImage>>();
const qrImageCache = new Map<string, Promise<DecodedImage>>();

const QR_BUCKET_PX = 1024; // single high-res QR, scaled down on draw

function canUseImageBitmap(): boolean {
  return typeof createImageBitmap === "function" && typeof fetch === "function";
}

async function decodeFromUrl(src: string): Promise<DecodedImage> {
  if (canUseImageBitmap()) {
    try {
      const res = await fetch(src, { mode: "cors", credentials: "omit" });
      if (res.ok) {
        const blob = await res.blob();
        return await createImageBitmap(blob);
      }
    } catch {
      // fall through to <img> path
    }
  }
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

function imageWidth(img: DecodedImage): number {
  return (img as HTMLImageElement).naturalWidth || (img as ImageBitmap).width;
}
function imageHeight(img: DecodedImage): number {
  return (img as HTMLImageElement).naturalHeight || (img as ImageBitmap).height;
}

function loadBaseImageCached(url: string): Promise<DecodedImage> {
  let p = baseImageCache.get(url);
  if (!p) {
    p = decodeFromUrl(url).catch((e) => {
      baseImageCache.delete(url);
      throw e;
    });
    baseImageCache.set(url, p);
  }
  return p;
}

function loadQrCached(link: string): Promise<DecodedImage> {
  let p = qrImageCache.get(link);
  if (!p) {
    p = (async () => {
      const dataUrl = await QRCode.toDataURL(link, {
        errorCorrectionLevel: "H",
        margin: 1,
        width: QR_BUCKET_PX,
        color: { dark: "#0b2a6b", light: "#ffffff" },
      });
      return decodeFromUrl(dataUrl);
    })().catch((e) => {
      qrImageCache.delete(link);
      throw e;
    });
    qrImageCache.set(link, p);
  }
  return p;
}

export function prewarmBase(url: string): void {
  void loadBaseImageCached(url).catch(() => {});
}
export function prewarmQr(link: string): void {
  void loadQrCached(link).catch(() => {});
}

// ----- Drawing helpers ------------------------------------------------------

function svgToDataUrl(svg: string): string {
  const encoded =
    typeof window !== "undefined"
      ? window.btoa(unescape(encodeURIComponent(svg)))
      : Buffer.from(svg, "utf-8").toString("base64");
  return `data:image/svg+xml;base64,${encoded}`;
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

export type QrOverride = { cx: number; cy: number; size: number };

async function drawBaseLayer(
  c: CanvasRenderingContext2D,
  template: ShareTemplate,
  ctx: TemplateContext,
) {
  c.fillStyle = template.background || "#ffffff";
  c.fillRect(0, 0, template.width, template.height);
  if (template.kind === "image" && template.imageUrl) {
    const img = await loadBaseImageCached(template.imageUrl);
    const iw = imageWidth(img);
    const ih = imageHeight(img);
    const scale = Math.min(template.width / iw, template.height / ih);
    const w = iw * scale;
    const h = ih * scale;
    c.drawImage(img as CanvasImageSource, (template.width - w) / 2, (template.height - h) / 2, w, h);
  } else if (template.kind === "svg" && template.renderSvg) {
    const svg = template.renderSvg(ctx);
    // SVGs depend on context — don't cache cross-card; decode directly.
    const img = await decodeFromUrl(svgToDataUrl(svg));
    c.drawImage(img as CanvasImageSource, 0, 0, template.width, template.height);
  }
}

export async function composeBaseOnly(
  template: ShareTemplate,
  ctx: TemplateContext,
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement("canvas");
  canvas.width = template.width;
  canvas.height = template.height;
  const c = canvas.getContext("2d");
  if (!c) throw new Error("2D canvas context unavailable");
  await drawBaseLayer(c, template, ctx);
  return canvas;
}

export async function composeTemplate(
  template: ShareTemplate,
  ctx: TemplateContext,
  override?: QrOverride,
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement("canvas");
  canvas.width = template.width;
  canvas.height = template.height;
  const c = canvas.getContext("2d");
  if (!c) throw new Error("2D canvas context unavailable");

  // Base + QR in parallel — QR comes from a shared cache so most cards hit instantly.
  const [, qrImg] = await Promise.all([
    drawBaseLayer(c, template, ctx),
    loadQrCached(ctx.link),
  ]);

  const qrCxRel = override?.cx ?? template.qr.cx;
  const qrCyRel = override?.cy ?? template.qr.cy;
  const qrSizeRel = override?.size ?? template.qr.size;
  const qrSizePx = qrSizeRel * template.width;

  const qrCx = qrCxRel * template.width;
  const qrCy = qrCyRel * template.height;
  const qrX = qrCx - qrSizePx / 2;
  const qrY = qrCy - qrSizePx / 2;

  if (template.qr.platePadding && template.qr.platePadding > 0) {
    const pad = template.qr.platePadding * qrSizePx;
    const plateRadius = (template.qr.plateRadius ?? 0.04) * qrSizePx * 4;
    c.save();
    c.shadowColor = "rgba(0,0,0,0.18)";
    c.shadowBlur = qrSizePx * 0.06;
    c.shadowOffsetY = qrSizePx * 0.02;
    c.fillStyle = "#ffffff";
    roundedRect(c, qrX - pad, qrY - pad, qrSizePx + pad * 2, qrSizePx + pad * 2, plateRadius);
    c.fill();
    c.restore();
  }

  c.drawImage(qrImg as CanvasImageSource, qrX, qrY, qrSizePx, qrSizePx);

  if (template.qr.caption) {
    const cap = template.qr.caption;
    const text = interpolate(cap.text, ctx);
    const fontPx = (cap.fontPx / 1080) * template.width;
    c.fillStyle = cap.color;
    c.font = `${cap.weight} ${Math.round(fontPx)}px 'Plus Jakarta Sans','Inter',Arial,sans-serif`;
    c.textAlign = "center";
    c.textBaseline = "top";
    const y = qrY + qrSizePx + cap.offset * template.height;
    c.fillText(text, qrCx, y);
  }

  return canvas;
}

export function canvasToBlob(canvas: HTMLCanvasElement, type = "image/png"): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Canvas export failed"))), type, 0.95);
  });
}
