// Session persistence policy: how long we keep users signed in on this device.
//
// - Web (regular browser tab): stay signed in as long as the refresh token is
//   valid AND the user was active in the last 7 days. If they've been away
//   longer, sign them out locally on next boot so a public device doesn't
//   stay logged in indefinitely.
// - PWA (installed to home screen / standalone display-mode): stay signed in
//   indefinitely — no idle timeout, and transient refresh failures show a
//   reconnect banner instead of bouncing to /auth.

export const IDLE_LIMIT_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const LAST_ACTIVE_KEY = "auth:lastActiveAt";

export function isStandalonePWA(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (window.matchMedia?.("(display-mode: standalone)").matches) return true;
    // iOS Safari home-screen apps expose navigator.standalone.
    const nav = window.navigator as Navigator & { standalone?: boolean };
    return nav.standalone === true;
  } catch {
    return false;
  }
}

export function markActive(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LAST_ACTIVE_KEY, String(Date.now()));
  } catch {
    // storage may be unavailable (private mode, quota) — safe to ignore.
  }
}

export function getLastActiveAt(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const v = window.localStorage.getItem(LAST_ACTIVE_KEY);
    if (!v) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

export function clearLastActive(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(LAST_ACTIVE_KEY);
  } catch {
    // ignore
  }
}

/** True when the (web) user has been idle past the 7-day threshold. */
export function isWebIdleExpired(): boolean {
  if (isStandalonePWA()) return false;
  const last = getLastActiveAt();
  if (last == null) return false; // no timestamp yet — don't punish a fresh install
  return Date.now() - last > IDLE_LIMIT_MS;
}

/**
 * Register lightweight activity listeners that refresh the "last active"
 * timestamp on focus / tab visibility / user interaction. Returns a cleanup
 * function.
 */
export function beginActivityTracking(): () => void {
  if (typeof window === "undefined") return () => {};
  const bump = () => markActive();
  const onVisibility = () => {
    if (document.visibilityState === "visible") bump();
  };
  window.addEventListener("focus", bump);
  window.addEventListener("pointerdown", bump, { passive: true });
  window.addEventListener("keydown", bump);
  document.addEventListener("visibilitychange", onVisibility);
  return () => {
    window.removeEventListener("focus", bump);
    window.removeEventListener("pointerdown", bump);
    window.removeEventListener("keydown", bump);
    document.removeEventListener("visibilitychange", onVisibility);
  };
}
