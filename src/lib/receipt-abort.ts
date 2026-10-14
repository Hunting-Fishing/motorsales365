/** Stop waiting promptly; attach handlers so late chunk failures stay handled. */
export function withReceiptAbort<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const abort = () => reject(new DOMException("Local scan cancelled", "AbortError"));
    if (signal?.aborted) abort();
    else signal?.addEventListener("abort", abort, { once: true });
    promise.then(
      (value) => {
        signal?.removeEventListener("abort", abort);
        if (signal?.aborted) abort();
        else resolve(value);
      },
      (error) => {
        signal?.removeEventListener("abort", abort);
        reject(error);
      },
    );
  });
}
