// Resumable-ish upload helper for Supabase Storage with progress + retry.
//
// Supabase JS does not expose XHR progress events for storage uploads, so we
// request a signed upload URL and PUT the file via XMLHttpRequest, which gives
// us real progress. Falls back to the SDK upload (no progress) on any error
// obtaining the signed URL.

import { supabase } from "@/integrations/supabase/client";

export type UploadProgressEvent = {
  loaded: number;
  total: number;
  percent: number; // 0-100
};

export type UploadOptions = {
  bucket: string;
  path: string;
  file: File;
  onProgress?: (e: UploadProgressEvent) => void;
  signal?: AbortSignal;
  contentType?: string;
};

export class UploadError extends Error {
  cause?: unknown;
  retriable: boolean;
  constructor(message: string, opts?: { cause?: unknown; retriable?: boolean }) {
    super(message);
    this.cause = opts?.cause;
    this.retriable = opts?.retriable ?? true;
  }
}

async function uploadViaSignedUrl({
  bucket,
  path,
  file,
  onProgress,
  signal,
  contentType,
}: UploadOptions): Promise<void> {
  const { data, error } = await supabase.storage.from(bucket).createSignedUploadUrl(path);
  if (error || !data) {
    throw new UploadError(error?.message ?? "Failed to create upload URL", {
      cause: error,
      retriable: true,
    });
  }

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", data.signedUrl, true);
    if (contentType) xhr.setRequestHeader("Content-Type", contentType);

    xhr.upload.onprogress = (ev) => {
      if (!onProgress) return;
      const total = ev.lengthComputable ? ev.total : file.size;
      const loaded = ev.loaded;
      onProgress({
        loaded,
        total,
        percent: total > 0 ? Math.min(100, Math.round((loaded / total) * 100)) : 0,
      });
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.({ loaded: file.size, total: file.size, percent: 100 });
        resolve();
      } else {
        reject(
          new UploadError(`Upload failed (${xhr.status})`, {
            retriable: xhr.status >= 500 || xhr.status === 0 || xhr.status === 408,
          }),
        );
      }
    };
    xhr.onerror = () => reject(new UploadError("Network error during upload", { retriable: true }));
    xhr.ontimeout = () => reject(new UploadError("Upload timed out", { retriable: true }));
    xhr.onabort = () => reject(new UploadError("Upload cancelled", { retriable: false }));

    if (signal) {
      if (signal.aborted) {
        xhr.abort();
        return;
      }
      signal.addEventListener("abort", () => xhr.abort(), { once: true });
    }

    xhr.send(file);
  });
}

async function uploadViaSdk({ bucket, path, file }: UploadOptions): Promise<void> {
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    upsert: false,
  });
  if (error) {
    throw new UploadError(error.message ?? "Upload failed", {
      cause: error,
      retriable: true,
    });
  }
}

/**
 * Upload a file with progress events and automatic retries (exponential backoff).
 * Throws UploadError on final failure. Returns the public URL.
 */
export async function uploadWithRetry(
  opts: UploadOptions & { maxAttempts?: number },
): Promise<{ publicUrl: string; path: string }> {
  const maxAttempts = opts.maxAttempts ?? 3;
  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      try {
        await uploadViaSignedUrl(opts);
      } catch (err) {
        if (err instanceof UploadError && !err.retriable) throw err;
        // Fall back to SDK upload (no progress) on signed-URL path failures.
        await uploadViaSdk(opts);
        opts.onProgress?.({
          loaded: opts.file.size,
          total: opts.file.size,
          percent: 100,
        });
      }
      const { data: pub } = supabase.storage.from(opts.bucket).getPublicUrl(opts.path);
      return { publicUrl: pub.publicUrl, path: opts.path };
    } catch (err) {
      lastErr = err;
      if (opts.signal?.aborted) throw err;
      const retriable = err instanceof UploadError ? err.retriable : true;
      if (!retriable || attempt === maxAttempts) break;
      const delay = Math.min(8000, 500 * Math.pow(2, attempt - 1));
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  if (lastErr instanceof UploadError) throw lastErr;
  throw new UploadError(lastErr instanceof Error ? lastErr.message : "Upload failed", {
    cause: lastErr,
    retriable: false,
  });
}
