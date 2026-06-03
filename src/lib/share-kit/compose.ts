import QRCode from "qrcode";
import type { ShareTemplate, TemplateContext } from "./types";
import { interpolate } from "./types";

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

function svgToDataUrl(svg: string): string {
  // Use UTF-8 safe base64 encoding
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

export async function composeTemplate(
  template: ShareTemplate,
  ctx: TemplateContext,
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement("canvas");
  canvas.width = template.width;
  canvas.height = template.height;
  const c = canvas.getContext("2d");
  if (!c) throw new Error("2D canvas context unavailable");

  // Background
  c.fillStyle = template.background || "#ffffff";
  c.fillRect(0, 0, template.width, template.height);

  // Base layer
  if (template.kind === "image" && template.imageUrl) {
    const img = await loadImage(template.imageUrl);
    // contain
    const scale = Math.min(template.width / img.width, template.height / img.height);
    const w = img.width * scale;
    const h = img.height * scale;
    c.drawImage(img, (template.width - w) / 2, (template.height - h) / 2, w, h);
  } else if (template.kind === "svg" && template.renderSvg) {
    const svg = template.renderSvg(ctx);
    const img = await loadImage(svgToDataUrl(svg));
    c.drawImage(img, 0, 0, template.width, template.height);
  }

  // QR
  const qrSizePx = template.qr.size * template.width;
  const qrPng = await QRCode.toDataURL(ctx.link, {
    errorCorrectionLevel: "H",
    margin: 1,
    width: Math.max(512, Math.round(qrSizePx * 2)),
    color: { dark: "#0b2a6b", light: "#ffffff" },
  });
  const qrImg = await loadImage(qrPng);

  const qrCx = template.qr.cx * template.width;
  const qrCy = template.qr.cy * template.height;
  const qrX = qrCx - qrSizePx / 2;
  const qrY = qrCy - qrSizePx / 2;

  // White plate
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

  c.drawImage(qrImg, qrX, qrY, qrSizePx, qrSizePx);

  // Caption under QR
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
