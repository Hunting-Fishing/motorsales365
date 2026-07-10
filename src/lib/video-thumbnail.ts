// Extract a poster-frame thumbnail from a video File (client-side, no upload).
// Returns a JPEG data URL, plus duration (seconds) and intrinsic size.

export type VideoThumbnail = {
  dataUrl: string;
  durationSec: number;
  width: number;
  height: number;
};

export async function extractVideoThumbnail(
  file: File,
  opts: { seekTo?: number; maxWidth?: number; quality?: number } = {},
): Promise<VideoThumbnail> {
  const seekTo = opts.seekTo ?? 0.5;
  const maxWidth = opts.maxWidth ?? 480;
  const quality = opts.quality ?? 0.72;

  const url = URL.createObjectURL(file);
  try {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = "anonymous";
    video.src = url;

    await new Promise<void>((resolve, reject) => {
      const onErr = () => reject(new Error("Could not read video metadata"));
      video.addEventListener("loadedmetadata", () => resolve(), { once: true });
      video.addEventListener("error", onErr, { once: true });
    });

    const target = Math.min(seekTo, Math.max(0, (video.duration || 1) - 0.05));
    await new Promise<void>((resolve, reject) => {
      const onErr = () => reject(new Error("Could not seek video"));
      video.addEventListener("seeked", () => resolve(), { once: true });
      video.addEventListener("error", onErr, { once: true });
      try {
        video.currentTime = target;
      } catch (e) {
        reject(e as Error);
      }
    });

    const iw = video.videoWidth || 640;
    const ih = video.videoHeight || 360;
    const scale = iw > maxWidth ? maxWidth / iw : 1;
    const cw = Math.round(iw * scale);
    const ch = Math.round(ih * scale);
    const canvas = document.createElement("canvas");
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D unavailable");
    ctx.drawImage(video, 0, 0, cw, ch);
    const dataUrl = canvas.toDataURL("image/jpeg", quality);
    return {
      dataUrl,
      durationSec: Number.isFinite(video.duration) ? video.duration : 0,
      width: iw,
      height: ih,
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function formatDuration(sec: number): string {
  if (!Number.isFinite(sec) || sec <= 0) return "";
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
