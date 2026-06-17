// Detect whether a URL points to a video by its file extension.
const VIDEO_EXT = /\.(mp4|webm|mov|m4v|ogv|ogg)(\?|#|$)/i;

export function isVideoUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return VIDEO_EXT.test(url);
}
