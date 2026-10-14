import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { File as NodeFile } from "node:buffer";
import * as pdfjs from "pdfjs-dist";
import { processReceiptPdf, RECEIPT_PDF_ASSETS } from "./receipt-pdf.client";
import type { ReceiptExtraction } from "./vehicle-receipts";

const mocks = vi.hoisted(() => ({
  getDocument: vi.fn(),
  workerCreate: vi.fn(),
  workerDestroy: vi.fn(),
  nativeTerminate: vi.fn(),
  nativeCreate: vi.fn(),
}));
vi.mock("@tanstack/react-start", () => ({ createClientOnlyFn: (fn: unknown) => fn }));
vi.mock("pdfjs-dist", () => ({
  version: "6.4.299",
  GlobalWorkerOptions: { workerSrc: "" },
  PDFWorker: { create: mocks.workerCreate },
  getDocument: mocks.getDocument,
  AnnotationMode: { DISABLE: 0 },
  AnnotationType: { LINK: 2, WIDGET: 20 },
  VerbosityLevel: { ERRORS: 0 },
}));

function deferred<T>() {
  let resolve!: (value: T) => void, reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
function page(width = 600, height = 800) {
  const task = { promise: Promise.resolve(), cancel: vi.fn() };
  return {
    getViewport: vi.fn(({ scale }: { scale: number }) => ({
      width: width * scale,
      height: height * scale,
    })),
    getAnnotations: vi.fn().mockResolvedValue([]),
    cleanup: vi.fn(() => true),
    render: vi.fn(
      (_options: {
        canvas: HTMLCanvasElement;
        viewport: { width: number; height: number };
        annotationMode: number;
        background: string;
      }) => task,
    ),
    task,
  };
}
const suggestion = (): ReceiptExtraction => ({
  vendor: "Parts shop",
  purchased_on: "2026-10-15",
  currency: "PHP",
  total: 250,
  items: [
    {
      description: "Oil filter",
      category: null,
      brand: null,
      part_number: null,
      quantity: null,
      total: null,
      confidence: 0.25,
      reviewed: false,
    },
  ],
});
const file = () => new File(["%PDF-1.7\nfixture"], "receipt.pdf", { type: "application/pdf" });
let pages: ReturnType<typeof page>[];
let doc: {
  numPages: number;
  isPureXfa: boolean;
  getPage: ReturnType<typeof vi.fn>;
  getMetadata: ReturnType<typeof vi.fn>;
  hasJSActions: ReturnType<typeof vi.fn>;
  cleanup: ReturnType<typeof vi.fn>;
};
let loading: {
  promise: Promise<typeof doc>;
  destroy: ReturnType<typeof vi.fn>;
  onPassword?: () => void;
};
let onPage: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("File", NodeFile);
  vi.stubGlobal(
    "Worker",
    class {
      constructor(url: string, options: WorkerOptions) {
        mocks.nativeCreate(url, options);
      }
      terminate = mocks.nativeTerminate;
      addEventListener = vi.fn();
      removeEventListener = vi.fn();
    },
  );
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
    {} as CanvasRenderingContext2D,
  );
  pages = [page()];
  doc = {
    numPages: 1,
    isPureXfa: false,
    getPage: vi.fn(async (number: number) => pages[number - 1]),
    getMetadata: vi.fn().mockResolvedValue({ info: {} }),
    hasJSActions: vi.fn().mockResolvedValue(false),
    cleanup: vi.fn().mockResolvedValue(undefined),
  };
  loading = { promise: Promise.resolve(doc), destroy: vi.fn().mockResolvedValue(undefined) };
  mocks.getDocument.mockImplementation(() => loading);
  mocks.workerCreate.mockReturnValue({ destroy: mocks.workerDestroy });
  onPage = vi.fn().mockResolvedValue(suggestion());
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("bounded, on-device PDF receipts", () => {
  it("uses byte input and only explicit same-origin resources with native-worker ownership", async () => {
    const result = await processReceiptPdf(file(), { onPage });
    expect(result).toEqual([suggestion()]);
    const options = mocks.getDocument.mock.calls[0][0];
    expect(options.data).toBeInstanceOf(Uint8Array);
    for (const key of ["url", "range", "docBaseUrl"]) expect(options).not.toHaveProperty(key);
    for (const key of ["cMapUrl", "standardFontDataUrl", "wasmUrl", "iccUrl"]) {
      expect(new URL(options[key]).origin).toBe(window.location.origin);
      expect(new URL(options[key]).pathname).toContain(RECEIPT_PDF_ASSETS);
      expect(options[key]).toMatch(/\/$/);
    }
    expect(mocks.nativeCreate).toHaveBeenCalledWith(
      new URL(`${RECEIPT_PDF_ASSETS}/pdf.worker.mjs`, window.location.origin).href,
      { type: "module", name: "365-receipt-pdf" },
    );
    expect(pdfjs.GlobalWorkerOptions.workerSrc).toContain(`${RECEIPT_PDF_ASSETS}/pdf.worker.mjs`);
    expect(options).toMatchObject({
      stopAtErrors: true,
      maxImageSize: 32_000_000,
      canvasMaxAreaInBytes: 16_000_000,
      enableXfa: false,
      disableRange: true,
      disableStream: true,
      disableAutoFetch: true,
      disableFontFace: true,
      useSystemFonts: false,
      useWorkerFetch: true,
    });
    expect(options).not.toHaveProperty("isEvalSupported");
    expect(pages[0].render).toHaveBeenCalledWith(expect.objectContaining({ annotationMode: 0 }));
    expect(pages[0].getAnnotations).toHaveBeenCalledWith({ intent: "any" });
    expect(loading.destroy).toHaveBeenCalled();
    expect(doc.cleanup).toHaveBeenCalled();
    expect(pages[0].cleanup).toHaveBeenCalled();
    expect(mocks.workerDestroy).toHaveBeenCalled();
    expect(mocks.nativeTerminate).toHaveBeenCalled();
    const canvas = onPage.mock.calls[0][0] as HTMLCanvasElement;
    expect(canvas.width).toBe(1);
    expect(canvas.height).toBe(1);
  });
  it("rejects zero, four or invalid page counts before loading pages or OCR", async () => {
    for (const count of [0, 4, NaN, 1.5]) {
      doc.numPages = count;
      await expect(processReceiptPdf(file(), { onPage })).rejects.toThrow("1 to 3 pages");
    }
    expect(onPage).not.toHaveBeenCalled();
    expect(doc.getPage).not.toHaveBeenCalled();
    expect(loading.destroy).toHaveBeenCalledTimes(4);
  });
  it("preflights all pages then awaits OCR sequentially before advancing", async () => {
    pages = [page(), page(), page()];
    doc.numPages = 3;
    const first = deferred<ReceiptExtraction>();
    onPage.mockReturnValueOnce(first.promise);
    const pending = processReceiptPdf(file(), { onPage });
    await vi.waitFor(() => expect(onPage).toHaveBeenCalledTimes(1));
    expect(doc.getPage).toHaveBeenCalledTimes(3);
    expect(pages[1].render).not.toHaveBeenCalled();
    expect(onPage.mock.calls[0].slice(1, 3)).toEqual([1, 3]);
    expect(onPage.mock.calls[0][3]).toBeInstanceOf(AbortSignal);
    first.resolve(suggestion());
    await expect(pending).resolves.toHaveLength(3);
    expect(onPage.mock.calls.map((call) => call[1])).toEqual([1, 2, 3]);
    for (const entry of pages) expect(entry.cleanup).toHaveBeenCalled();
  });
  it("caps each raster at four megapixels and 4000 pixels without clipping", async () => {
    pages = [page(5000, 5000)];
    onPage.mockImplementation(async (canvas: HTMLCanvasElement) => {
      expect(canvas.width * canvas.height).toBeLessThanOrEqual(4_000_000);
      expect(Math.max(canvas.width, canvas.height)).toBeLessThanOrEqual(4000);
      const viewport = pages[0].render.mock.calls[0][0].viewport;
      expect(canvas.width).toBeGreaterThanOrEqual(viewport.width);
      expect(canvas.height).toBeGreaterThanOrEqual(viewport.height);
      return suggestion();
    });
    await processReceiptPdf(file(), { onPage });
  });
  it("rejects huge or invalid original viewports before rendering or OCR", async () => {
    for (const [width, height] of [
      [20000, 1],
      [6000, 6000],
      [NaN, 800],
      [0, 800],
      [-1, 800],
    ]) {
      pages = [page(width, height)];
      await expect(processReceiptPdf(file(), { onPage })).rejects.toThrow("too large");
      expect(pages[0].render).not.toHaveBeenCalled();
      expect(pages[0].cleanup).toHaveBeenCalled();
    }
    expect(onPage).not.toHaveBeenCalled();
  });
  it("rejects widget/visible annotations on any page before any OCR, without following links", async () => {
    pages = [page(), page()];
    doc.numPages = 2;
    pages[0].getAnnotations.mockResolvedValue([
      { annotationType: 2, url: "https://private.example/track" },
    ]);
    pages[1].getAnnotations.mockResolvedValue([{ annotationType: 20 }]);
    await expect(processReceiptPdf(file(), { onPage })).rejects.toThrow("forms or annotations");
    expect(onPage).not.toHaveBeenCalled();
    expect(mocks.nativeTerminate).toHaveBeenCalled();
  });
  it("rejects XFA, AcroForm and JavaScript metadata without retrieving or running actions", async () => {
    for (const info of [{ IsXFAPresent: true }, { IsAcroFormPresent: true }]) {
      doc.getMetadata.mockResolvedValue({ info });
      await expect(processReceiptPdf(file(), { onPage })).rejects.toThrow("Interactive");
    }
    doc.getMetadata.mockResolvedValue({ info: {} });
    doc.hasJSActions.mockResolvedValue(true);
    await expect(processReceiptPdf(file(), { onPage })).rejects.toThrow("JavaScript");
    expect(doc.getPage).not.toHaveBeenCalled();
    expect(onPage).not.toHaveBeenCalled();
  });
  it("fails password requests immediately and destroys the loading task", async () => {
    loading.promise = new Promise(() => {});
    const pending = processReceiptPdf(file(), { onPage });
    await vi.waitFor(() => expect(loading.onPassword).toBeTypeOf("function"));
    const rejected = expect(pending).rejects.toThrow("Password-protected");
    loading.onPassword?.();
    await rejected;
    expect(loading.destroy).toHaveBeenCalled();
    expect(mocks.nativeTerminate).toHaveBeenCalled();
  });
  it("cleans up corrupt or malformed documents", async () => {
    loading.promise = Promise.reject(new Error("Malformed PDF"));
    await expect(processReceiptPdf(file(), { onPage })).rejects.toThrow("Malformed PDF");
    expect(loading.destroy).toHaveBeenCalled();
    expect(mocks.nativeTerminate).toHaveBeenCalled();
    expect(onPage).not.toHaveBeenCalled();
  });
  it("returns no partial results on a later render or embedded-image-limit error", async () => {
    pages = [page(), page()];
    doc.numPages = 2;
    pages[1].task.promise = Promise.reject(new Error("Image exceeded maximum allowed size"));
    // Attach before the render begins; real PDF.js creates this promise on render.
    void pages[1].task.promise.catch(() => {});
    await expect(processReceiptPdf(file(), { onPage })).rejects.toThrow("maximum allowed size");
    expect(onPage).toHaveBeenCalledTimes(1);
    expect(loading.destroy).toHaveBeenCalled();
    for (const entry of pages) expect(entry.cleanup).toHaveBeenCalled();
  });
  it("fails the whole scan if a later page is unreadable or its OCR callback fails", async () => {
    pages = [page(), page()];
    doc.numPages = 2;
    onPage.mockResolvedValueOnce(suggestion()).mockResolvedValueOnce({
      vendor: null,
      purchased_on: null,
      currency: null,
      total: null,
      items: [],
    });
    await expect(processReceiptPdf(file(), { onPage })).rejects.toThrow("page 2 could not be read");
    onPage.mockRejectedValueOnce(new Error("OCR failure"));
    await expect(processReceiptPdf(file(), { onPage })).rejects.toThrow("OCR failure");
    expect(loading.destroy).toHaveBeenCalledTimes(2);
  });
  it("does not start a worker for invalid files or an already cancelled request", async () => {
    await expect(
      processReceiptPdf(new File([], "empty.pdf", { type: "application/pdf" }), { onPage }),
    ).rejects.toThrow("between");
    await expect(
      processReceiptPdf(
        new File([new Uint8Array(10 * 1024 * 1024 + 1)], "large.pdf", { type: "application/pdf" }),
        { onPage },
      ),
    ).rejects.toThrow("10 MB");
    await expect(
      processReceiptPdf(new File(["photo"], "r.png", { type: "image/png" }), { onPage }),
    ).rejects.toThrow("Choose a PDF");
    const controller = new AbortController();
    controller.abort();
    await expect(
      processReceiptPdf(file(), { signal: controller.signal, onPage }),
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(mocks.nativeCreate).not.toHaveBeenCalled();
  });
  it("aborts during loading and releases the native worker without waiting for a document", async () => {
    loading.promise = new Promise(() => {});
    const controller = new AbortController();
    const pending = processReceiptPdf(file(), { signal: controller.signal, onPage });
    await vi.waitFor(() => expect(mocks.getDocument).toHaveBeenCalled());
    const rejected = expect(pending).rejects.toMatchObject({ name: "AbortError" });
    controller.abort();
    await rejected;
    expect(loading.destroy).toHaveBeenCalled();
    expect(mocks.nativeTerminate).toHaveBeenCalled();
  });
  it("cancels an active render and cleans pages/canvases on abort", async () => {
    const render = deferred<void>();
    pages[0].task.promise = render.promise;
    pages[0].task.cancel.mockImplementation(() => render.reject(new Error("render cancelled")));
    const controller = new AbortController();
    const pending = processReceiptPdf(file(), { signal: controller.signal, onPage });
    await vi.waitFor(() => expect(pages[0].render).toHaveBeenCalled());
    const rejected = expect(pending).rejects.toMatchObject({ name: "AbortError" });
    controller.abort();
    await rejected;
    expect(pages[0].task.cancel).toHaveBeenCalled();
    expect(pages[0].cleanup).toHaveBeenCalled();
    expect(onPage).not.toHaveBeenCalled();
    expect(mocks.nativeTerminate).toHaveBeenCalled();
  });
  it("passes a linked signal that stops OCR callbacks and prevents the next page after abort", async () => {
    pages = [page(), page()];
    doc.numPages = 2;
    onPage.mockImplementationOnce(
      (_canvas: HTMLCanvasElement, _number: number, _count: number, signal: AbortSignal) =>
        new Promise((_resolve, reject) =>
          signal.addEventListener("abort", () =>
            reject(new DOMException("cancelled", "AbortError")),
          ),
        ),
    );
    const controller = new AbortController();
    const pending = processReceiptPdf(file(), { signal: controller.signal, onPage });
    await vi.waitFor(() => expect(onPage).toHaveBeenCalledTimes(1));
    const rejected = expect(pending).rejects.toMatchObject({ name: "AbortError" });
    controller.abort();
    await rejected;
    expect(onPage.mock.calls[0][3].aborted).toBe(true);
    expect(pages[1].render).not.toHaveBeenCalled();
    expect(mocks.nativeTerminate).toHaveBeenCalled();
  });
  it("aborts the linked OCR signal at the 180-second deadline", async () => {
    vi.useFakeTimers();
    onPage.mockImplementationOnce(() => new Promise(() => {}));
    const pending = processReceiptPdf(file(), { onPage });
    await vi.waitFor(() => expect(onPage).toHaveBeenCalled());
    const rejected = expect(pending).rejects.toThrow("timed out");
    await vi.advanceTimersByTimeAsync(180_000);
    await rejected;
    expect(onPage.mock.calls[0][3].aborted).toBe(true);
    expect(mocks.nativeTerminate).toHaveBeenCalled();
    expect(loading.destroy).toHaveBeenCalled();
  });
  it("hard-terminates the native worker if graceful PDF cleanup hangs", async () => {
    vi.useFakeTimers();
    doc.cleanup.mockImplementationOnce(() => new Promise(() => {}));
    const pending = processReceiptPdf(file(), { onPage });
    await vi.waitFor(() => expect(doc.cleanup).toHaveBeenCalled());
    await vi.advanceTimersByTimeAsync(2000);
    await expect(pending).resolves.toHaveLength(1);
    expect(loading.destroy).toHaveBeenCalled();
    expect(mocks.nativeTerminate).toHaveBeenCalled();
  });
  it("bounds and releases PDF.js temporary canvas allocations too", async () => {
    await processReceiptPdf(file(), { onPage });
    const Factory = mocks.getDocument.mock.calls[0][0].CanvasFactory;
    const factory = new Factory();
    expect(() => factory.create(20000, 1)).toThrow("too large");
    expect(() => factory.create(6000, 6000)).toThrow("too large");
    const entry = factory.create(100, 100);
    expect(entry.canvas.width).toBe(100);
    const canvas = entry.canvas;
    factory.destroy(entry);
    expect(canvas.width).toBe(1);
    expect(entry.canvas).toBeNull();
    expect(entry.context).toBeNull();
  });
  it("guards unavailable native-worker environments before importing or opening the PDF", async () => {
    vi.stubGlobal("Worker", undefined);
    await expect(processReceiptPdf(file(), { onPage })).rejects.toThrow("unavailable");
    expect(mocks.getDocument).not.toHaveBeenCalled();
  });

  it("cleans a page that resolves after cancellation during preflight", async () => {
    const fetched = deferred<ReturnType<typeof page>>();
    doc.getPage.mockReturnValueOnce(fetched.promise);
    const controller = new AbortController();
    const pending = processReceiptPdf(file(), { signal: controller.signal, onPage });
    await vi.waitFor(() => expect(doc.getPage).toHaveBeenCalled());
    const rejected = expect(pending).rejects.toMatchObject({ name: "AbortError" });
    controller.abort();
    await rejected;
    fetched.resolve(pages[0]);
    await vi.waitFor(() => expect(pages[0].cleanup).toHaveBeenCalled());
    expect(onPage).not.toHaveBeenCalled();
    expect(mocks.nativeTerminate).toHaveBeenCalled();
  });

  it("does not let an OCR callback approve its own suggestions", async () => {
    const result = suggestion();
    result.items[0].reviewed = true;
    onPage.mockResolvedValueOnce(result);
    expect((await processReceiptPdf(file(), { onPage }))[0].items[0].reviewed).toBe(false);
  });

  it("still terminates the native worker when document/loading cleanup fails", async () => {
    doc.cleanup.mockRejectedValueOnce(new Error("cleanup failed"));
    loading.destroy.mockRejectedValueOnce(new Error("destroy failed"));
    await expect(processReceiptPdf(file(), { onPage })).resolves.toHaveLength(1);
    expect(mocks.workerDestroy).toHaveBeenCalled();
    expect(mocks.nativeTerminate).toHaveBeenCalled();
  });
});
