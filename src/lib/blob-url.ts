// Stable object URLs keyed by File identity. Repeated calls in a render loop
// return the same URL instead of allocating (and immediately GC-ing) a new one,
// which was flooding the network log with `blob:…  ERR_FILE_NOT_FOUND`.
const cache = new WeakMap<File, string>();

export function fileUrl(file: File): string {
  const hit = cache.get(file);
  if (hit) return hit;
  const url = URL.createObjectURL(file);
  cache.set(file, url);
  return url;
}

export function releaseFileUrl(file: File) {
  const hit = cache.get(file);
  if (hit) {
    URL.revokeObjectURL(hit);
    cache.delete(file);
  }
}
