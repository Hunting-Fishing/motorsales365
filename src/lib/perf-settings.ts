// Frontend performance tuning controlled by admins. Persisted in localStorage
// so it can be tweaked per-device/region (e.g. Philippines connections) without
// a database round-trip. Subscribers are notified via a custom event.

export interface PerfSettings {
  /** IntersectionObserver rootMargin for image preloading, e.g. "400px". */
  rootMargin: string;
  /** Target width (px) for thumbnail/card images. */
  thumbWidth: number;
  /** Target width (px) for full-resolution gallery images. */
  fullWidth: number;
  /** Image quality 1-100 for transformed images. */
  quality: number;
}

export const DEFAULT_PERF_SETTINGS: PerfSettings = {
  rootMargin: "400px",
  thumbWidth: 480,
  fullWidth: 1280,
  quality: 75,
};

const STORAGE_KEY = "perf-settings:v1";
const EVENT = "perf-settings:change";

export function getPerfSettings(): PerfSettings {
  if (typeof window === "undefined") return DEFAULT_PERF_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PERF_SETTINGS;
    return { ...DEFAULT_PERF_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PERF_SETTINGS;
  }
}

export function setPerfSettings(patch: Partial<PerfSettings>) {
  const next = { ...getPerfSettings(), ...patch };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(EVENT, { detail: next }));
}

export function subscribePerfSettings(cb: (s: PerfSettings) => void): () => void {
  const handler = (e: Event) => cb((e as CustomEvent<PerfSettings>).detail);
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}

/**
 * Apply Supabase storage image transforms (width + quality) to a public
 * storage URL. Falls back to the original URL when not a Supabase asset.
 */
export function withImageTransform(url: string, width: number, quality: number): string {
  if (!url) return url;
  // Only Supabase public object URLs support /render/image/public/ transforms.
  const marker = "/storage/v1/object/public/";
  if (!url.includes(marker)) return url;
  const transformed = url.replace(marker, "/storage/v1/render/image/public/");
  const sep = transformed.includes("?") ? "&" : "?";
  return `${transformed}${sep}width=${width}&quality=${quality}&resize=contain`;
}
