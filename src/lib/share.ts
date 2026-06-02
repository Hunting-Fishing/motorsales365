/**
 * Web Share API helpers. Wraps `navigator.share` so callers don't need to
 * cast through `any` or duplicate the feature-detection guard.
 */

type NavigatorWithShare = Navigator & {
  share?: (data: { title?: string; text?: string; url?: string }) => Promise<void>;
};

export function canNativeShare(): boolean {
  if (typeof navigator === "undefined") return false;
  return typeof (navigator as NavigatorWithShare).share === "function";
}

export async function nativeShare(data: { title?: string; text?: string; url?: string }): Promise<boolean> {
  if (!canNativeShare()) return false;
  try {
    await (navigator as NavigatorWithShare).share!(data);
    return true;
  } catch {
    // User dismissed or share failed — treat as a no-op success path for callers.
    return false;
  }
}
