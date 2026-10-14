import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { File as NodeFile } from "node:buffer";
import { scanReceiptImage, receiptImageSize, RECEIPT_OCR_ASSETS } from "./receipt-ocr.client";

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  recognize: vi.fn(),
  parameters: vi.fn(),
  terminate: vi.fn(),
}));
vi.mock("@tanstack/react-start", () => ({ createClientOnlyFn: (fn: unknown) => fn }));
vi.mock("tesseract.js", () => ({
  createWorker: mocks.create,
  OEM: { LSTM_ONLY: 1 },
  PSM: { AUTO: "3" },
}));
const text =
  "Supplier: Test Shop\nDate: 2026-10-15\nCurrency: PHP\nItems:\nOil filter 250.00\nGrand total: PHP 250.00";
function pngHeader(width = 1200, height = 800) {
  const bytes = new Uint8Array(33);
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10]);
  const view = new DataView(bytes.buffer);
  view.setUint32(8, 13);
  view.setUint32(12, 0x49484452);
  view.setUint32(16, width);
  view.setUint32(20, height);
  bytes[24] = 8;
  bytes[25] = 6;
  let crc = 0xffffffff;
  for (const byte of bytes.subarray(12, 29)) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  view.setUint32(29, (crc ^ 0xffffffff) >>> 0);
  return bytes;
}
const file = () => new File([pngHeader()], "receipt.png", { type: "image/png" });
const bitmap = { width: 1200, height: 800, close: vi.fn() };
const worker = () => ({
  recognize: mocks.recognize,
  setParameters: mocks.parameters,
  terminate: mocks.terminate,
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("File", NodeFile);
  vi.stubGlobal("Worker", class {});
  vi.stubGlobal("createImageBitmap", vi.fn().mockResolvedValue(bitmap));
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
    fillRect: vi.fn(),
    drawImage: vi.fn(),
  } as unknown as CanvasRenderingContext2D);
  mocks.create.mockResolvedValue(worker());
  mocks.parameters.mockResolvedValue({});
  mocks.terminate.mockResolvedValue({});
  mocks.recognize.mockResolvedValue({ data: { text } });
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("on-device receipt OCR", () => {
  it("rejects oversized or invalid encoded headers before image decoding", async () => {
    await expect(
      scanReceiptImage(new File([pngHeader(9000, 9000)], "big.png", { type: "image/png" })),
    ).rejects.toThrow("too large");
    await expect(
      scanReceiptImage(new File(["not an image"], "bad.png", { type: "image/png" })),
    ).rejects.toThrow("image header");
    expect(createImageBitmap).not.toHaveBeenCalled();
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("uses only explicit same-origin worker/core/language paths and returns unreviewed suggestions", async () => {
    const result = await scanReceiptImage(file());
    expect(result.vendor).toBe("Test Shop");
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      category: null,
      reviewed: false,
      quantity: null,
      total: null,
    });
    const options = mocks.create.mock.calls[0][2];
    for (const name of ["workerPath", "corePath", "langPath"]) {
      expect(new URL(options[name]).origin).toBe(window.location.origin);
      expect(new URL(options[name]).pathname).toContain(RECEIPT_OCR_ASSETS);
    }
    expect(options.workerBlobURL).toBe(false);
    expect(options.cacheMethod).toBe("none");
    expect(bitmap.close).toHaveBeenCalled();
    expect(mocks.terminate).toHaveBeenCalled();
  });
  it("rejects PDFs and unsupported files before decoding or creating a worker", async () => {
    await expect(
      scanReceiptImage(new File(["pdf"], "r.pdf", { type: "application/pdf" })),
    ).rejects.toThrow("currently supports");
    await expect(
      scanReceiptImage(new File(["svg"], "r.svg", { type: "image/svg+xml" })),
    ).rejects.toThrow("Use a JPG");
    expect(createImageBitmap).not.toHaveBeenCalled();
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("does not start after cancellation", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(scanReceiptImage(file(), { signal: controller.signal })).rejects.toMatchObject({
      name: "AbortError",
    });
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("cancels recognition, terminates the worker and permits a later scan", async () => {
    mocks.recognize.mockImplementationOnce(() => new Promise(() => {}));
    const controller = new AbortController();
    const pending = scanReceiptImage(file(), { signal: controller.signal });
    await vi.waitFor(() => expect(mocks.recognize).toHaveBeenCalled());
    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
    expect(mocks.terminate).toHaveBeenCalled();
    await expect(scanReceiptImage(file())).resolves.toMatchObject({ vendor: "Test Shop" });
  });
  it("closes a late initializer after cancellation and prevents parallel initialization", async () => {
    let ready!: (value: ReturnType<typeof worker>) => void;
    mocks.create.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          ready = resolve;
        }),
    );
    const controller = new AbortController();
    const pending = scanReceiptImage(file(), { signal: controller.signal });
    await vi.waitFor(() => expect(mocks.create).toHaveBeenCalled());
    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
    await expect(scanReceiptImage(file())).rejects.toThrow("still closing");
    ready(worker());
    await vi.waitFor(() => expect(mocks.terminate).toHaveBeenCalled());
    expect(mocks.recognize).not.toHaveBeenCalled();
    await expect(scanReceiptImage(file())).resolves.toMatchObject({ vendor: "Test Shop" });
  });
  it("terminates and releases the scanner on a recognition failure", async () => {
    mocks.recognize.mockRejectedValueOnce(new Error("unreadable photo"));
    await expect(scanReceiptImage(file())).rejects.toThrow("unreadable");
    expect(mocks.terminate).toHaveBeenCalled();
    await expect(scanReceiptImage(file())).resolves.toMatchObject({ vendor: "Test Shop" });
  });
  it("releases the scanner after initialization failure", async () => {
    mocks.create.mockRejectedValueOnce(new Error("missing language asset"));
    await expect(scanReceiptImage(file())).rejects.toThrow("missing language");
    await expect(scanReceiptImage(file())).resolves.toMatchObject({ vendor: "Test Shop" });
  });
  it("bounds the OCR raster and rejects extreme dimensions", () => {
    const size = receiptImageSize(6000, 4000);
    expect(size.width * size.height).toBeLessThanOrEqual(4_000_000);
    expect(size.width).toBeLessThanOrEqual(4000);
    expect(() => receiptImageSize(9000, 9000)).toThrow("too large");
    expect(() => receiptImageSize(0, 20)).toThrow("too large");
  });
});
