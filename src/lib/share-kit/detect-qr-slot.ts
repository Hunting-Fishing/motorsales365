/**
 * Auto-detect the largest "near-white" axis-aligned rectangle in an image.
 *
 * Use case: flyers have a white "SCAN HERE" plate where the QR should land.
 * Run client-side at upload time (or on-demand by admins) to compute
 * normalized cx/cy/size that match the existing template schema.
 *
 * Algorithm: downscale → binary mask of near-white pixels → largest-rectangle
 * in a binary matrix via per-row histogram + monotonic stack. O(W*H), fast.
 */

export type DetectedQrSlot = {
  cx: number; // 0..1 (relative to image width)
  cy: number; // 0..1 (relative to image height)
  size: number; // 0..1 (relative to image WIDTH, matches template.qr.size)
  confidence: number; // 0..1 (white-rect area / total image area)
};

const DEFAULTS = { cx: 0.85, cy: 0.85, size: 0.18 };

// A rect is "detected" when it covers at least this share of the image.
// Tuned for typical flyers — a QR plate is usually 4–15% of the image.
const MIN_CONFIDENCE = 0.012;
// Treat a pixel as white when all 3 channels exceed this.
const WHITE_THRESHOLD = 232;
// Downscale long edge to this many px for speed.
const ANALYSIS_LONG_EDGE = 320;
// Shrink the detected rect by this factor so the QR has breathing room.
const FILL_RATIO = 0.9;
// Cap QR size so we never produce something larger than the panel allows.
const MAX_SIZE = 0.45;
const MIN_SIZE = 0.08;

export function defaultQrSlot(): DetectedQrSlot {
  return { ...DEFAULTS, confidence: 0 };
}

async function imageFromBlob(blob: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(blob);
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Could not decode image"));
      img.src = url;
    });
  } finally {
    // Revoke after the caller has used naturalWidth/Height — safe because
    // the decoded bitmap is already in memory.
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}

async function imageFromUrl(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load image"));
    img.src = url;
  });
}

/** Largest rectangle of 1s in a binary matrix (row-major Uint8Array). */
function largestRectInMask(
  mask: Uint8Array,
  w: number,
  h: number,
): { x: number; y: number; w: number; h: number; area: number } {
  const heights = new Int32Array(w);
  let best = { x: 0, y: 0, w: 0, h: 0, area: 0 };
  const stack: number[] = [];

  for (let row = 0; row < h; row++) {
    const base = row * w;
    for (let col = 0; col < w; col++) {
      heights[col] = mask[base + col] ? heights[col] + 1 : 0;
    }

    // Monotonic stack across this row's histogram.
    stack.length = 0;
    for (let col = 0; col <= w; col++) {
      const curHeight = col === w ? 0 : heights[col];
      while (stack.length && heights[stack[stack.length - 1]] > curHeight) {
        const topIdx = stack.pop()!;
        const topHeight = heights[topIdx];
        const left = stack.length ? stack[stack.length - 1] + 1 : 0;
        const width = col - left;
        const area = topHeight * width;
        if (area > best.area) {
          best = {
            x: left,
            y: row - topHeight + 1,
            w: width,
            h: topHeight,
            area,
          };
        }
      }
      stack.push(col);
    }
  }

  return best;
}

function analyseImage(img: HTMLImageElement): DetectedQrSlot {
  const srcW = img.naturalWidth || img.width;
  const srcH = img.naturalHeight || img.height;
  if (!srcW || !srcH) return defaultQrSlot();

  const longEdge = Math.max(srcW, srcH);
  const scale = Math.min(1, ANALYSIS_LONG_EDGE / longEdge);
  const w = Math.max(16, Math.round(srcW * scale));
  const h = Math.max(16, Math.round(srcH * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return defaultQrSlot();
  ctx.drawImage(img, 0, 0, w, h);

  let pixels: Uint8ClampedArray;
  try {
    pixels = ctx.getImageData(0, 0, w, h).data;
  } catch {
    // Tainted canvas (cross-origin without CORS). Caller should retry with a
    // proxy or signed URL with CORS — return defaults to keep flow alive.
    return defaultQrSlot();
  }

  const mask = new Uint8Array(w * h);
  for (let i = 0, p = 0; p < pixels.length; p += 4, i++) {
    const r = pixels[p];
    const g = pixels[p + 1];
    const b = pixels[p + 2];
    const a = pixels[p + 3];
    mask[i] =
      a > 200 &&
      r >= WHITE_THRESHOLD &&
      g >= WHITE_THRESHOLD &&
      b >= WHITE_THRESHOLD
        ? 1
        : 0;
  }

  const rect = largestRectInMask(mask, w, h);
  const confidence = rect.area / (w * h);
  if (confidence < MIN_CONFIDENCE) return defaultQrSlot();

  // Aspect-ratio sanity: scan plates are roughly square. Reject extreme
  // strips (e.g. a thin white background band) — they aren't the QR slot.
  const aspect = rect.w / Math.max(1, rect.h);
  if (aspect < 0.45 || aspect > 2.2) return defaultQrSlot();

  // Center + size in normalized image coordinates.
  const cxAbsPx = (rect.x + rect.w / 2) * (srcW / w);
  const cyAbsPx = (rect.y + rect.h / 2) * (srcH / h);
  const sidePx = Math.min(rect.w * (srcW / w), rect.h * (srcH / h));

  const cx = clamp01(cxAbsPx / srcW);
  const cy = clamp01(cyAbsPx / srcH);
  // template.qr.size is expressed relative to the template WIDTH.
  const size = clamp(
    (sidePx * FILL_RATIO) / srcW,
    MIN_SIZE,
    MAX_SIZE,
  );

  return { cx, cy, size, confidence };
}

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v));
}
function clamp01(v: number) {
  return clamp(v, 0, 1);
}

export async function detectQrSlotFromBlob(blob: Blob): Promise<DetectedQrSlot> {
  try {
    const img = await imageFromBlob(blob);
    return analyseImage(img);
  } catch {
    return defaultQrSlot();
  }
}

export async function detectQrSlotFromUrl(url: string): Promise<DetectedQrSlot> {
  try {
    const img = await imageFromUrl(url);
    return analyseImage(img);
  } catch {
    return defaultQrSlot();
  }
}

export function isDetected(slot: DetectedQrSlot): boolean {
  return slot.confidence >= MIN_CONFIDENCE;
}
