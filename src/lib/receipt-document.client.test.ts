import { beforeEach, describe, expect, it, vi } from "vitest";
import { scanReceiptDocument } from "./receipt-document.client";

const mocks = vi.hoisted(() => ({ image: vi.fn(), pdf: vi.fn() }));
vi.mock("@tanstack/react-start", () => ({ createClientOnlyFn: (fn: unknown) => fn }));
vi.mock("./receipt-ocr.client", () => ({ scanReceiptImage: mocks.image }));
vi.mock("./receipt-pdf.client", () => ({ processReceiptPdf: mocks.pdf }));
const extraction = {
  vendor: "Parts Shop",
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
};
const pdfFile = () => new File(["pdf"], "receipt.pdf", { type: "application/pdf" });
const canvas = (size = 50): HTMLCanvasElement =>
  ({
    toBlob: (callback: (blob: Blob) => void, type: string) =>
      callback(new Blob([new Uint8Array(size)], { type })),
  }) as unknown as HTMLCanvasElement;
beforeEach(() => {
  vi.clearAllMocks();
  mocks.image.mockResolvedValue(extraction);
  mocks.pdf.mockResolvedValue([extraction]);
});

describe("local receipt document routing", () => {
  it("routes images directly without loading PDF processing", async () => {
    const file = new File(["photo"], "r.png", { type: "image/png" });
    await expect(scanReceiptDocument(file)).resolves.toMatchObject({ vendor: "Parts Shop" });
    expect(mocks.image).toHaveBeenCalledWith(file, {});
    expect(mocks.pdf).not.toHaveBeenCalled();
  });
  it("merges ordered PDF pages with all suggestions still unreviewed", async () => {
    mocks.pdf.mockResolvedValueOnce([
      extraction,
      {
        ...extraction,
        items: [{ ...extraction.items[0], description: "Brake pads", reviewed: true }],
      },
    ]);
    const result = await scanReceiptDocument(pdfFile());
    expect(result.items.map((item) => item.description)).toEqual(["Oil filter", "Brake pads"]);
    expect(result.items.every((item) => !item.reviewed)).toBe(true);
    expect(result.total).toBe(250);
  });
  it("uses the renderer's deadline signal for each page OCR", async () => {
    const controller = new AbortController();
    mocks.pdf.mockImplementationOnce(async (_file, options) => [
      await options.onPage(canvas(), 1, 1, controller.signal),
    ]);
    await scanReceiptDocument(pdfFile());
    expect(mocks.image.mock.calls[0][1].signal).toBe(controller.signal);
    expect(mocks.image.mock.calls[0][0].type).toBe("image/png");
  });
  it("rejects the whole result when any page fails", async () => {
    mocks.pdf.mockRejectedValueOnce(new Error("Page 2 is unreadable"));
    await expect(scanReceiptDocument(pdfFile())).rejects.toThrow("Page 2");
  });
  it("reports conflicting metadata instead of silently preserving stale form values", async () => {
    mocks.pdf.mockResolvedValueOnce([
      extraction,
      { ...extraction, vendor: "Another Shop", total: 500 },
    ]);
    await expect(scanReceiptDocument(pdfFile())).rejects.toThrow("conflicting supplier, total");
  });
  it("never starts processing after cancellation", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      scanReceiptDocument(pdfFile(), { signal: controller.signal }),
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(mocks.pdf).not.toHaveBeenCalled();
  });
  it("cannot return a late PDF result after cancellation", async () => {
    const controller = new AbortController();
    mocks.pdf.mockImplementationOnce(async () => {
      controller.abort();
      return [extraction];
    });
    await expect(
      scanReceiptDocument(pdfFile(), { signal: controller.signal }),
    ).rejects.toMatchObject({ name: "AbortError" });
  });
  it("rejects a failed raster conversion without attempting OCR", async () => {
    mocks.pdf.mockImplementationOnce(async (_file, options) => [
      await options.onPage(
        { toBlob: (callback: (value: null) => void) => callback(null) },
        1,
        1,
        new AbortController().signal,
      ),
    ]);
    await expect(scanReceiptDocument(pdfFile())).rejects.toThrow("Could not read this PDF page");
    expect(mocks.image).not.toHaveBeenCalled();
  });
});
