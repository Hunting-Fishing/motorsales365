import { createClientOnlyFn } from "@tanstack/react-start";
import type {
  PDFDocumentLoadingTask,
  PDFDocumentProxy,
  PDFPageProxy,
  PDFWorker,
  RenderTask,
} from "pdfjs-dist";
import { receiptExtractionSchema, validateReceiptFile } from "./vehicle-receipts";
import type { ReceiptExtraction } from "./vehicle-receipts";

export const RECEIPT_PDF_ASSETS = "/receipt-pdf/6.4.299";
const MAX_PIXELS = 4_000_000;
const MAX_SIDE = 4000;
const MAX_SOURCE_PIXELS = 32_000_000;
const MAX_SOURCE_SIDE = 16_000;
const DEADLINE_MS = 180_000;
const CLEANUP_GRACE_MS = 2000;
const cancelled = () => new DOMException("Local PDF scan cancelled", "AbortError");
const resourceError = () =>
  new Error(
    "This PDF page is too large to read safely. Use a smaller PDF or enter the receipt manually.",
  );

type CanvasEntry = { canvas: HTMLCanvasElement | null; context: CanvasRenderingContext2D | null };
export type ReceiptPdfOptions = {
  signal?: AbortSignal;
  onProgress?: (stage: string, progress: number) => void;
  onPage: (
    canvas: HTMLCanvasElement,
    pageNumber: number,
    pageCount: number,
    signal: AbortSignal,
  ) => Promise<ReceiptExtraction>;
};

/** Render locally, with no PDF URL, viewer, actions, scripts, XFA or annotation layer. */
export const processReceiptPdf = createClientOnlyFn(
  async (file: File, options: ReceiptPdfOptions): Promise<ReceiptExtraction[]> => {
    validateReceiptFile(file);
    if (file.type !== "application/pdf") throw new Error("Choose a PDF receipt.");
    if (
      typeof window === "undefined" ||
      typeof document === "undefined" ||
      typeof Worker === "undefined"
    )
      throw new Error(
        "On-device PDF scanning is unavailable in this browser. Manual entry is available.",
      );
    if (options.signal?.aborted) throw cancelled();

    const controller = new AbortController();
    let failure: Error | undefined;
    let stopped = false;
    let loading: PDFDocumentLoadingTask | undefined;
    let pdf: PDFDocumentProxy | undefined;
    let pdfWorker: PDFWorker | undefined;
    let nativeWorker: Worker | undefined;
    let rendering: RenderTask | undefined;
    const pages = new Set<PDFPageProxy>();
    const cleanedPages = new Set<PDFPageProxy>();
    const canvases = new Set<HTMLCanvasElement>();
    let rejectInterrupted!: (error: Error) => void;
    const interrupted = new Promise<never>((_, reject) => {
      rejectInterrupted = reject;
    });
    void interrupted.catch(() => {});
    const stop = (error: Error) => {
      if (stopped || controller.signal.aborted) return;
      failure = error;
      // Settle the public failure first: render.cancel() or an OCR abort listener
      // can synchronously reject their own promise with a different error.
      rejectInterrupted(error);
      controller.abort();
      try {
        rendering?.cancel();
      } catch {
        /* Destruction below is the fallback. */
      }
    };
    const abort = () => stop(cancelled());
    options.signal?.addEventListener("abort", abort, { once: true });
    const timer = setTimeout(
      () =>
        stop(
          new Error(
            "Local PDF scanning timed out. No partial results were applied. Try a smaller PDF or enter the receipt manually.",
          ),
        ),
      DEADLINE_MS,
    );
    const check = () => {
      if (controller.signal.aborted) throw failure ?? cancelled();
    };
    const progress = (stage: string, value: number) => {
      if (!stopped && !controller.signal.aborted)
        options.onProgress?.(stage, Math.max(0, Math.min(1, value)));
    };
    const cleanupPage = (page: PDFPageProxy) => {
      if (cleanedPages.has(page)) return;
      try {
        if (page.cleanup()) cleanedPages.add(page);
      } catch {
        /* Loading-task destruction remains authoritative. */
      }
    };
    const checkSourceSize = (width: number, height: number) => {
      if (
        !Number.isFinite(width * height) ||
        width <= 0 ||
        height <= 0 ||
        width * height > MAX_SOURCE_PIXELS ||
        Math.max(width, height) > MAX_SOURCE_SIDE
      )
        throw resourceError();
    };

    // PDF.js uses this factory for temporary main-thread masks/groups too. Keep
    // those allocations bounded and release them even when rendering fails.
    class BoundedCanvasFactory {
      create(width: number, height: number): CanvasEntry {
        const canvas = document.createElement("canvas");
        const entry: CanvasEntry = { canvas, context: null };
        this.reset(entry, width, height);
        entry.context = canvas.getContext("2d", { willReadFrequently: true });
        if (!entry.context)
          throw new Error("Could not prepare a PDF canvas. Manual entry is available.");
        return entry;
      }
      reset(entry: CanvasEntry, width: number, height: number) {
        const roundedWidth = Math.ceil(width),
          roundedHeight = Math.ceil(height);
        checkSourceSize(roundedWidth, roundedHeight);
        if (!entry.canvas) throw new Error("PDF canvas is unavailable.");
        entry.canvas.width = roundedWidth;
        entry.canvas.height = roundedHeight;
        canvases.add(entry.canvas);
      }
      destroy(entry: CanvasEntry) {
        if (entry.canvas) {
          entry.canvas.width = entry.canvas.height = 1;
          canvases.delete(entry.canvas);
        }
        entry.canvas = null;
        entry.context = null;
      }
    }

    let destroyPromise: Promise<unknown> | undefined;
    const destroyLoading = () => {
      destroyPromise ??= Promise.resolve()
        .then(() => loading?.destroy())
        .catch(() => {});
      return destroyPromise;
    };
    let workerFailed: (() => void) | undefined;
    try {
      progress("Opening PDF", 0);
      const buffer = await Promise.race([file.arrayBuffer(), interrupted]);
      check();
      if (!buffer.byteLength || buffer.byteLength > 10 * 1024 * 1024)
        throw new Error("PDF receipts must be between 1 byte and 10 MB.");
      const library = await Promise.race([import("pdfjs-dist"), interrupted]);
      check();
      if (library.version !== "6.4.299")
        throw new Error("The local PDF scanner assets need an update. Manual entry is available.");
      const asset = (part: string) =>
        new URL(`${RECEIPT_PDF_ASSETS}/${part}`, window.location.origin).href;
      library.GlobalWorkerOptions.workerSrc = asset("pdf.worker.mjs");
      // A caller-owned native worker avoids fake-worker fallback and gives the
      // deadline a hard termination path, including PDF.js initialization hangs.
      nativeWorker = new Worker(asset("pdf.worker.mjs"), {
        type: "module",
        name: "365-receipt-pdf",
      });
      workerFailed = () =>
        stop(new Error("Could not start the local PDF reader. Manual entry is available."));
      nativeWorker.addEventListener("error", workerFailed);
      nativeWorker.addEventListener("messageerror", workerFailed);
      pdfWorker = library.PDFWorker.create({ port: nativeWorker });
      loading = library.getDocument({
        data: new Uint8Array(buffer),
        worker: pdfWorker,
        cMapUrl: asset("cmaps/"),
        cMapPacked: true,
        standardFontDataUrl: asset("standard_fonts/"),
        wasmUrl: asset("wasm/"),
        iccUrl: asset("iccs/"),
        useWorkerFetch: true,
        useWasm: true,
        stopAtErrors: true,
        maxImageSize: MAX_SOURCE_PIXELS,
        canvasMaxAreaInBytes: MAX_PIXELS * 4,
        CanvasFactory: BoundedCanvasFactory,
        disableFontFace: true,
        useSystemFonts: false,
        isImageDecoderSupported: false,
        enableXfa: false,
        disableRange: true,
        disableStream: true,
        disableAutoFetch: true,
        verbosity: library.VerbosityLevel.ERRORS,
      });
      loading.onPassword = () =>
        stop(
          new Error(
            "Password-protected PDFs are not supported by the local scanner. Use an unlocked copy or enter the receipt manually.",
          ),
        );
      pdf = await Promise.race([loading.promise, interrupted]);
      check();
      if (!Number.isInteger(pdf.numPages) || pdf.numPages < 1 || pdf.numPages > 3)
        throw new Error(
          "Local scanning requires a complete PDF of 1 to 3 pages. No pages were scanned; use a shorter PDF or manual entry.",
        );
      // Inspect metadata only. Never obtain or execute script bodies, open links,
      // create a scripting sandbox, fill fields, or flatten interactive forms.
      const [metadata, scripts] = await Promise.race([
        Promise.all([pdf.getMetadata(), pdf.hasJSActions()]),
        interrupted,
      ]);
      check();
      const info = metadata.info as { IsXFAPresent?: boolean; IsAcroFormPresent?: boolean };
      if (pdf.isPureXfa || info.IsXFAPresent || info.IsAcroFormPresent || scripts)
        throw new Error(
          "Interactive, JavaScript or XFA PDFs are not supported locally. Use a plain PDF copy or enter the receipt manually.",
        );

      const prepared: Array<{
        page: PDFPageProxy;
        viewport: ReturnType<PDFPageProxy["getViewport"]>;
        width: number;
        height: number;
      }> = [];
      // Preflight every page before any OCR; an unsupported later page must not
      // turn this into a seemingly successful partial receipt scan.
      for (let number = 1; number <= pdf.numPages; number++) {
        progress(
          `Checking PDF page ${number} of ${pdf.numPages}`,
          ((number - 1) / pdf.numPages) * 0.1,
        );
        const pagePromise = pdf.getPage(number);
        void pagePromise.then(
          (page) => {
            pages.add(page);
            if (stopped || controller.signal.aborted) cleanupPage(page);
          },
          () => {},
        );
        const page = await Promise.race([pagePromise, interrupted]);
        check();
        const original = page.getViewport({ scale: 1 });
        checkSourceSize(original.width, original.height);
        const annotations = await Promise.race([
          page.getAnnotations({ intent: "any" }),
          interrupted,
        ]);
        check();
        // Links are left entirely unprocessed. Other annotations can contain
        // visible receipt values that DISABLE would omit, so fail conservatively.
        if (
          annotations.some(
            (annotation) => annotation.annotationType !== library.AnnotationType.LINK,
          )
        )
          throw new Error(
            `PDF page ${number} contains forms or annotations that cannot be safely included. Use a plain PDF copy or manual entry.`,
          );
        let scale = Math.min(
          2,
          MAX_SIDE / Math.max(original.width, original.height),
          Math.sqrt(MAX_PIXELS / (original.width * original.height)),
        );
        let viewport = page.getViewport({ scale });
        let width = Math.ceil(viewport.width),
          height = Math.ceil(viewport.height);
        // Ceil keeps the complete page visible; reduce slightly if rounding would
        // otherwise exceed the raster cap (no clipping to meet the budget).
        for (
          let attempt = 0;
          attempt < 3 && (width * height > MAX_PIXELS || Math.max(width, height) > MAX_SIDE);
          attempt++
        ) {
          scale *= 0.999;
          viewport = page.getViewport({ scale });
          width = Math.ceil(viewport.width);
          height = Math.ceil(viewport.height);
        }
        if (
          !Number.isFinite(width * height) ||
          width <= 0 ||
          height <= 0 ||
          width * height > MAX_PIXELS ||
          Math.max(width, height) > MAX_SIDE
        )
          throw resourceError();
        prepared.push({ page, viewport, width, height });
      }

      const results: ReceiptExtraction[] = [];
      for (const [index, plan] of prepared.entries()) {
        check();
        const number = index + 1;
        progress(
          `Rendering PDF page ${number} of ${pdf.numPages}`,
          0.1 + (index / pdf.numPages) * 0.9,
        );
        const canvas = document.createElement("canvas");
        canvas.width = plan.width;
        canvas.height = plan.height;
        canvases.add(canvas);
        if (!canvas.getContext("2d"))
          throw new Error("Could not render this PDF. Manual entry is available.");
        try {
          rendering = plan.page.render({
            canvas,
            viewport: plan.viewport,
            annotationMode: library.AnnotationMode.DISABLE,
            background: "rgb(255,255,255)",
          });
          await Promise.race([rendering.promise, interrupted]);
          rendering = undefined;
          check();
          progress(
            `Reading PDF page ${number} of ${pdf.numPages}`,
            0.1 + (index / pdf.numPages) * 0.9,
          );
          const result = receiptExtractionSchema.parse(
            await Promise.race([
              options.onPage(canvas, number, pdf.numPages, controller.signal),
              interrupted,
            ]),
          );
          check();
          if (
            !result.items.length &&
            !result.vendor &&
            !result.purchased_on &&
            result.total === null
          )
            throw new Error(
              `PDF page ${number} could not be read. No partial results were applied; use a clearer PDF or manual entry.`,
            );
          results.push({
            ...result,
            items: result.items.map((item) => ({ ...item, reviewed: false })),
          });
        } finally {
          if (!rendering) {
            cleanupPage(plan.page);
            canvas.width = canvas.height = 1;
            canvases.delete(canvas);
          }
        }
      }
      progress("PDF scan complete — review every page's suggestions", 1);
      return results;
    } finally {
      stopped = true;
      clearTimeout(timer);
      options.signal?.removeEventListener("abort", abort);
      try {
        rendering?.cancel();
      } catch {
        /* Worker termination below remains mandatory. */
      }
      // v6 has no PDFDocumentProxy.destroy(): loadingTask.destroy() owns document
      // destruction. Let cancellation/cleanup settle briefly, then terminate the
      // native worker even if an upstream promise cannot settle.
      const graceful = (async () => {
        if (rendering) await rendering.promise.catch(() => {});
        for (const page of pages) cleanupPage(page);
        if (pdf) {
          try {
            await pdf.cleanup();
          } catch {
            /* Destroy still runs. */
          }
        }
        await destroyLoading();
      })();
      let graceTimer: ReturnType<typeof setTimeout> | undefined;
      await Promise.race([
        graceful.catch(() => {}),
        new Promise<void>((resolve) => {
          graceTimer = setTimeout(resolve, CLEANUP_GRACE_MS);
        }),
      ]);
      if (graceTimer) clearTimeout(graceTimer);
      void destroyLoading();
      for (const page of pages) cleanupPage(page);
      if (nativeWorker && workerFailed) {
        nativeWorker.removeEventListener("error", workerFailed);
        nativeWorker.removeEventListener("messageerror", workerFailed);
      }
      try {
        pdfWorker?.destroy();
      } catch {
        /* Never skip native termination/canvas release. */
      }
      try {
        nativeWorker?.terminate();
      } catch {
        /* Remaining local resources still need release. */
      }
      for (const canvas of canvases) canvas.width = canvas.height = 1;
      canvases.clear();
    }
  },
);
