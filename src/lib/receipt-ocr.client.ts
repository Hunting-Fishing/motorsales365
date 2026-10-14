import type { Worker as OcrWorker } from "tesseract.js";
import { createClientOnlyFn } from "@tanstack/react-start";
import { validateReceiptFile } from "./vehicle-receipts";
import { parseReceiptText } from "./receipt-text";
import { readReceiptImageDimensions } from "./receipt-image-header";

export type ReceiptOcrProgress = { stage: string; progress: number };
export const RECEIPT_OCR_ASSETS = "/receipt-ocr/7.0.0";
const TIMEOUT_MS = 90_000;
let active = false;
const cancelled = () => new DOMException("Local scan cancelled", "AbortError");

export function receiptImageSize(width: number, height: number) {
  if (
    !Number.isFinite(width * height) ||
    width <= 0 ||
    height <= 0 ||
    width * height > 32_000_000 ||
    Math.max(width, height) > 16_000
  ) {
    throw new Error("This image is too large. Use a receipt photo smaller than 32 megapixels.");
  }
  const scale = Math.min(
    1,
    4000 / Math.max(width, height),
    Math.sqrt(4_000_000 / (width * height)),
  );
  return {
    width: Math.max(1, Math.floor(width * scale)),
    height: Math.max(1, Math.floor(height * scale)),
  };
}

/** Browser-only OCR. Never uploads a file or sends text to a provider. */
export const scanReceiptImage = createClientOnlyFn(
  async (
    file: File,
    options: {
      signal?: AbortSignal;
      onProgress?: (progress: ReceiptOcrProgress) => void;
    } = {},
  ) => {
    validateReceiptFile(file);
    if (file.type === "application/pdf")
      throw new Error(
        "On-device scanning currently supports JPG, PNG and WebP. Enter this PDF manually or choose the separate AI option.",
      );
    if (
      typeof window === "undefined" ||
      typeof Worker === "undefined" ||
      typeof createImageBitmap === "undefined"
    ) {
      throw new Error(
        "Local scanning is unavailable in this browser. You can still enter the receipt manually.",
      );
    }
    if (options.signal?.aborted) throw cancelled();
    if (active)
      throw new Error("The previous local scanner is still closing. Please try again shortly.");
    active = true;
    const controller = new AbortController();
    const abort = () => controller.abort();
    options.signal?.addEventListener("abort", abort, { once: true });
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, TIMEOUT_MS);
    let worker: OcrWorker | undefined;
    let bitmap: ImageBitmap | undefined;
    let canvas: HTMLCanvasElement | undefined;
    let initializing: Promise<OcrWorker> | undefined;
    let stopped = false;
    let rejectAbort: ((reason: Error) => void) | undefined;
    const interrupted = new Promise<never>((_, reject) => {
      rejectAbort = reject;
    });
    // Always attach a rejection handler, including an abort during dynamic import.
    void interrupted.catch(() => {});
    const onAbort = () => {
      stopped = true;
      if (worker) void worker.terminate().catch(() => {});
      rejectAbort?.(
        timedOut
          ? new Error(
              "Local scanning timed out. Try a smaller, clearer photo or enter the receipt manually.",
            )
          : cancelled(),
      );
    };
    controller.signal.addEventListener("abort", onAbort, { once: true });
    const check = () => {
      if (controller.signal.aborted) throw cancelled();
    };
    const progress = (stage: string, value: number) => {
      if (!stopped) options.onProgress?.({ stage, progress: Math.max(0, Math.min(1, value)) });
    };
    try {
      progress("Preparing image", 0);
      const prefix = await Promise.race([file.slice(0, 1024 * 1024).arrayBuffer(), interrupted]);
      const header = readReceiptImageDimensions(new Uint8Array(prefix));
      receiptImageSize(header.width, header.height);
      check();
      const decoding = createImageBitmap(file);
      // A cancelled decode must close its eventual bitmap too.
      void decoding.then(
        (image) => {
          if (stopped) image.close();
        },
        () => {},
      );
      bitmap = await Promise.race([decoding, interrupted]);
      check();
      const size = receiptImageSize(bitmap.width, bitmap.height);
      canvas = document.createElement("canvas");
      canvas.width = size.width;
      canvas.height = size.height;
      const context = canvas.getContext("2d");
      if (!context)
        throw new Error("Could not prepare this photo. Please enter the receipt manually.");
      context.fillStyle = "white";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close();
      bitmap = undefined;
      const { createWorker, OEM, PSM } = await Promise.race([import("tesseract.js"), interrupted]);
      check();
      const origin = window.location.origin;
      const asset = (part: string) => new URL(`${RECEIPT_OCR_ASSETS}/${part}`, origin).href;
      initializing = createWorker("eng", OEM.LSTM_ONLY, {
        workerPath: asset("worker.min.js"),
        corePath: asset("core"),
        langPath: asset("lang"),
        workerBlobURL: false,
        cacheMethod: "none",
        logger: ({ status, progress: value }) =>
          progress(
            status === "recognizing text" ? "Reading receipt" : "Preparing English scanner",
            value,
          ),
        errorHandler: () => {},
      });
      // Tesseract exposes terminate only after initialization resolves. Keep one
      // initialization in flight and terminate its late result after cancellation.
      void initializing.then(
        (ready) => {
          if (stopped) {
            void ready.terminate().catch(() => {});
            active = false;
          }
        },
        () => {
          if (stopped) active = false;
        },
      );
      worker = await Promise.race([initializing, interrupted]);
      check();
      await Promise.race([
        worker.setParameters({ tessedit_pageseg_mode: PSM.AUTO, user_defined_dpi: "300" }),
        interrupted,
      ]);
      const result = await Promise.race([
        worker.recognize(canvas, {}, { text: true }),
        interrupted,
      ]);
      check();
      progress("Scan complete — review every suggestion", 1);
      return parseReceiptText(result.data.text);
    } finally {
      stopped = true;
      clearTimeout(timer);
      options.signal?.removeEventListener("abort", abort);
      controller.signal.removeEventListener("abort", onAbort);
      bitmap?.close();
      if (canvas) {
        canvas.width = 1;
        canvas.height = 1;
      }
      if (worker) {
        await worker.terminate().catch(() => {});
        active = false;
      } else if (!initializing) active = false;
      // When initialization rejects normally there is no late worker to close.
      else
        void initializing.then(
          () => {},
          () => {
            active = false;
          },
        );
    }
  },
);
