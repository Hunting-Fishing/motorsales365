// Lightweight client-side metrics for image loading. Tracks:
// - preload hit rate: did the image finish loading BEFORE entering the visible viewport?
// - load duration: ms from request start to onLoad
// - failure count: onError occurrences
//
// Events are kept in a bounded in-memory ring and snapshotted to localStorage
// so the admin dashboard can read them across navigations.

export type ImageEventType = "load" | "error" | "visible";

export interface ImageEvent {
  t: number; // timestamp
  type: ImageEventType;
  durationMs?: number; // for "load"
  loadedBeforeVisible?: boolean; // for "visible"
  full?: boolean;
  rootMargin?: string;
  quality?: number;
  width?: number;
}

const STORAGE_KEY = "image-metrics:v1";
const MAX_EVENTS = 500;
const EVENT_NAME = "image-metrics:change";

let buffer: ImageEvent[] = [];
let loaded = false;

function ensureLoaded() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) buffer = JSON.parse(raw);
  } catch {
    buffer = [];
  }
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(buffer));
  } catch {
    /* ignore quota */
  }
  window.dispatchEvent(new CustomEvent(EVENT_NAME));
}

export function recordImageEvent(ev: Omit<ImageEvent, "t">) {
  if (typeof window === "undefined") return;
  ensureLoaded();
  buffer.push({ t: Date.now(), ...ev });
  if (buffer.length > MAX_EVENTS) buffer = buffer.slice(-MAX_EVENTS);
  persist();
}

export function getImageEvents(): ImageEvent[] {
  ensureLoaded();
  return buffer.slice();
}

export function clearImageMetrics() {
  buffer = [];
  persist();
}

export function subscribeImageMetrics(cb: () => void): () => void {
  window.addEventListener(EVENT_NAME, cb);
  return () => window.removeEventListener(EVENT_NAME, cb);
}

export interface MetricsSummary {
  total: number;
  loads: number;
  errors: number;
  errorRate: number;
  avgMs: number;
  p50Ms: number;
  p95Ms: number;
  visibleSamples: number;
  preloadHits: number;
  preloadHitRate: number;
}

export function summarize(events: ImageEvent[]): MetricsSummary {
  const loads = events.filter((e) => e.type === "load");
  const errors = events.filter((e) => e.type === "error");
  const visibles = events.filter((e) => e.type === "visible");
  const preloadHits = visibles.filter((e) => e.loadedBeforeVisible).length;
  const durations = loads
    .map((e) => e.durationMs ?? 0)
    .filter((n) => n > 0)
    .sort((a, b) => a - b);
  const pct = (p: number) =>
    durations.length
      ? durations[Math.min(durations.length - 1, Math.floor(p * durations.length))]
      : 0;
  const total = events.length;
  return {
    total,
    loads: loads.length,
    errors: errors.length,
    errorRate:
      loads.length + errors.length > 0 ? errors.length / (loads.length + errors.length) : 0,
    avgMs: durations.length ? durations.reduce((s, n) => s + n, 0) / durations.length : 0,
    p50Ms: pct(0.5),
    p95Ms: pct(0.95),
    visibleSamples: visibles.length,
    preloadHits,
    preloadHitRate: visibles.length ? preloadHits / visibles.length : 0,
  };
}
