import { createClientOnlyFn } from "@tanstack/react-start";
import { scanReceiptImage } from "./receipt-ocr.client";
import type { ReceiptOcrProgress } from "./receipt-ocr.client";
import { validateReceiptFile } from "./vehicle-receipts";
import type { ReceiptExtraction } from "./vehicle-receipts";
import { mergeReceiptPages } from "./receipt-pages";
import { withReceiptAbort } from "./receipt-abort";

function rasterBlob(
  canvas: HTMLCanvasElement,
  signal: AbortSignal,
  type: "image/png" | "image/jpeg",
) {
  return new Promise<Blob>((resolve, reject) => {
    const abort = () => reject(new DOMException("Local scan cancelled", "AbortError"));
    if (signal.aborted) {
      abort();
      return;
    }
    signal.addEventListener("abort", abort, { once: true });
    try {
      canvas.toBlob(
        (blob) => {
          signal.removeEventListener("abort", abort);
          if (signal.aborted) {
            abort();
            return;
          }
          if (!blob) {
            reject(new Error("Could not read this PDF page. Please enter it manually."));
            return;
          }
          resolve(blob);
        },
        type,
        0.94,
      );
    } catch (error) {
      signal.removeEventListener("abort", abort);
      reject(error);
    }
  });
}

/** One receipt, all pages or no result. No server calls, uploads or auto-review. */
export const scanReceiptDocument = createClientOnlyFn(
  async (
    file: File,
    options: {
      signal?: AbortSignal;
      onProgress?: (progress: ReceiptOcrProgress) => void;
    } = {},
  ): Promise<ReceiptExtraction> => {
    validateReceiptFile(file);
    if (file.type !== "application/pdf") return scanReceiptImage(file, options);
    if (options.signal?.aborted) throw new DOMException("Local scan cancelled", "AbortError");
    const { processReceiptPdf } = await withReceiptAbort(
      import("./receipt-pdf.client"),
      options.signal,
    );
    if (options.signal?.aborted) throw new DOMException("Local scan cancelled", "AbortError");
    const pages = await processReceiptPdf(file, {
      signal: options.signal,
      onProgress: (stage, progress) => options.onProgress?.({ stage, progress }),
      onPage: async (canvas, page, total, signal) => {
        let blob = await rasterBlob(canvas, signal, "image/png");
        if (blob.size > 10 * 1024 * 1024) blob = await rasterBlob(canvas, signal, "image/jpeg");
        if (signal.aborted) throw new DOMException("Local scan cancelled", "AbortError");
        validateReceiptFile(blob);
        return scanReceiptImage(new File([blob], `receipt-page-${page}`, { type: blob.type }), {
          signal,
          onProgress: ({ stage, progress }) =>
            options.onProgress?.({
              stage: `Page ${page} of ${total}: ${stage}`,
              progress: (page - 1 + progress) / total,
            }),
        });
      },
    });
    if (options.signal?.aborted) throw new DOMException("Local scan cancelled", "AbortError");
    const conflicting = (
      [
        ["vendor", "supplier"],
        ["purchased_on", "date"],
        ["currency", "currency"],
        ["total", "total"],
      ] as const
    )
      .filter(
        ([field]) =>
          new Set(pages.flatMap((page) => (page[field] === null ? [] : [page[field]]))).size > 1,
      )
      .map(([, label]) => label);
    if (conflicting.length)
      throw new Error(
        `PDF pages have conflicting ${conflicting.join(", ")}. Your entries were kept; compare every page and enter these fields manually.`,
      );
    return mergeReceiptPages(pages);
  },
);
