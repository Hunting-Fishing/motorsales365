import { describe, expect, it } from "vitest";
import { readReceiptImageDimensions } from "./receipt-image-header";

function png(width: number, height: number) {
  const bytes = new Uint8Array(33);
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10]);
  const view = new DataView(bytes.buffer);
  view.setUint32(8, 13);
  view.setUint32(12, 0x49484452);
  view.setUint32(16, width);
  view.setUint32(20, height);
  bytes[24] = 8;
  bytes[25] = 6;
  return pngCrc(bytes);
}
function pngCrc(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of bytes.subarray(12, 29)) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  new DataView(bytes.buffer, bytes.byteOffset).setUint32(29, (crc ^ 0xffffffff) >>> 0);
  return bytes;
}
function jpeg(width: number, height: number, marker = 0xc0) {
  return new Uint8Array([
    0xff,
    0xd8,
    0xff,
    marker,
    0,
    17,
    8,
    height >>> 8,
    height & 255,
    width >>> 8,
    width & 255,
    3,
    1,
    0x11,
    0,
    2,
    0x11,
    1,
    3,
    0x11,
    1,
  ]);
}
function webp(kind: string, payload: Uint8Array) {
  const bytes = new Uint8Array(20 + payload.length + (payload.length & 1));
  const view = new DataView(bytes.buffer);
  bytes.set([82, 73, 70, 70]);
  view.setUint32(4, bytes.length - 8, true);
  bytes.set([87, 69, 66, 80], 8);
  bytes.set(
    Array.from(kind, (letter) => letter.charCodeAt(0)),
    12,
  );
  view.setUint32(16, payload.length, true);
  bytes.set(payload, 20);
  return bytes;
}
function vp8(width: number, height: number) {
  return webp(
    "VP8 ",
    new Uint8Array([
      0x30,
      0,
      0,
      0x9d,
      1,
      0x2a,
      width & 255,
      width >>> 8,
      height & 255,
      height >>> 8,
      0,
    ]),
  );
}
function vp8l(width: number, height: number) {
  const payload = new Uint8Array(5);
  payload[0] = 0x2f;
  new DataView(payload.buffer).setUint32(1, ((width - 1) | ((height - 1) << 14)) >>> 0, true);
  return webp("VP8L", payload);
}
function vp8x(width: number, height: number) {
  const payload = new Uint8Array(10);
  for (let index = 0; index < 3; index++) {
    payload[4 + index] = ((width - 1) >>> (8 * index)) & 255;
    payload[7 + index] = ((height - 1) >>> (8 * index)) & 255;
  }
  return webp("VP8X", payload);
}

describe("encoded receipt image dimensions", () => {
  it("reads PNG IHDR dimensions and accepts subarray-backed input", () => {
    expect(readReceiptImageDimensions(png(1200, 800))).toEqual({ width: 1200, height: 800 });
    const storage = new Uint8Array(50);
    storage.set(png(640, 480), 7);
    expect(readReceiptImageDimensions(storage.subarray(7, 40))).toEqual({
      width: 640,
      height: 480,
    });
  });
  it("rejects corrupt, misplaced, truncated and invalid PNG headers", () => {
    const badCrc = png(10, 20);
    badCrc[16] ^= 1;
    const wrongChunk = png(10, 20);
    wrongChunk[12] = 0;
    const wrongLength = png(10, 20);
    wrongLength[11] = 12;
    const wrongDepth = png(10, 20);
    wrongDepth[24] = 3;
    for (const bytes of [
      badCrc,
      wrongChunk,
      wrongLength,
      pngCrc(wrongDepth),
      png(0, 20),
      png(0x80000000, 1),
      png(10, 20).subarray(0, 32),
    ])
      expect(() => readReceiptImageDimensions(bytes)).toThrow(/header/);
  });
  it("exposes large declared PNG sizes for rejection before pixel decoding", () => {
    expect(readReceiptImageDimensions(png(20000, 20000))).toEqual({ width: 20000, height: 20000 });
  });
  it("reads baseline, progressive and extended JPEG frame dimensions", () => {
    for (const marker of [0xc0, 0xc1, 0xc2, 0xc9, 0xca])
      expect(readReceiptImageDimensions(jpeg(4032, 3024, marker))).toEqual({
        width: 4032,
        height: 3024,
      });
  });
  it("skips bounded JPEG metadata by length, not embedded fake markers, and permits fill bytes", () => {
    const frame = jpeg(1000, 500);
    const bytes = new Uint8Array(frame.length + 10);
    bytes.set([0xff, 0xd8, 0xff, 0xe1, 0, 8, 0xff, 0xc0, 0, 0, 1, 2]);
    bytes.set(frame.subarray(2), 12);
    expect(readReceiptImageDimensions(bytes)).toEqual({ width: 1000, height: 500 });
    const fill = new Uint8Array(frame.length + 2);
    fill.set([0xff, 0xd8, 0xff, 0xff]);
    fill.set(frame.subarray(2), 4);
    expect(readReceiptImageDimensions(fill)).toEqual({ width: 1000, height: 500 });
  });
  it("rejects missing/deferred JPEG dimensions, malformed lengths and incomplete frame records", () => {
    const badLength = jpeg(10, 20);
    badLength[5] = 16;
    const zeroComponents = jpeg(10, 20);
    zeroComponents[11] = 0;
    const badPrecision = jpeg(10, 20);
    badPrecision[6] = 12;
    for (const bytes of [
      new Uint8Array([0xff, 0xd8, 0xff, 0xda]),
      new Uint8Array([0xff, 0xd8, 0xff, 0xd9]),
      new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 1]),
      new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0xff, 0xff]),
      jpeg(0, 20),
      jpeg(10, 0),
      badLength,
      zeroComponents,
      badPrecision,
      jpeg(10, 20).subarray(0, 20),
    ])
      expect(() => readReceiptImageDimensions(bytes)).toThrow(/header/);
  });
  it("does not accept hierarchical/differential JPEG or scan indefinitely through markers", () => {
    expect(() => readReceiptImageDimensions(jpeg(10, 20, 0xc5))).toThrow(/header/);
    const bytes = new Uint8Array(2 + 4097 * 2 + 19);
    bytes.set([0xff, 0xd8]);
    for (let index = 0; index < 4097; index++) bytes.set([0xff, 1], 2 + index * 2);
    bytes.set(jpeg(10, 20).subarray(2), 2 + 4097 * 2);
    expect(() => readReceiptImageDimensions(bytes)).toThrow(/header/);
  });
  it("never scans past the first MiB even when later JPEG bytes contain a frame", () => {
    const bytes = new Uint8Array(17 * 65537 + 21);
    bytes.set([0xff, 0xd8]);
    let offset = 2;
    for (let segment = 0; segment < 17; segment++) {
      bytes.set([0xff, 0xe1, 0xff, 0xff], offset);
      offset += 65537;
    }
    bytes.set(jpeg(10, 20).subarray(2), offset);
    expect(() => readReceiptImageDimensions(bytes)).toThrow(/header/);
  });
  it("reads WebP VP8, VP8L and extended VP8X dimensions", () => {
    for (const bytes of [vp8(1200, 800), vp8l(1200, 800), vp8x(1200, 800)])
      expect(readReceiptImageDimensions(bytes)).toEqual({ width: 1200, height: 800 });
    expect(readReceiptImageDimensions(vp8l(16384, 16384))).toEqual({ width: 16384, height: 16384 });
    expect(readReceiptImageDimensions(vp8x(20000, 20000))).toEqual({ width: 20000, height: 20000 });
  });
  it("requires a VP8 key frame, valid sync code and nonzero dimensions", () => {
    const interFrame = vp8(10, 20);
    interFrame[20] |= 1;
    const badSync = vp8(10, 20);
    badSync[23] = 0;
    const badPartition = vp8(10, 20);
    badPartition[22] = 255;
    for (const bytes of [interFrame, badSync, badPartition, vp8(0, 20)])
      expect(() => readReceiptImageDimensions(bytes)).toThrow(/header/);
  });
  it("rejects bad lossless signatures/versions and impossible extended canvases", () => {
    const badSignature = vp8l(10, 20);
    badSignature[20] = 0;
    const badVersion = vp8l(10, 20);
    badVersion[24] |= 0x20;
    for (const bytes of [badSignature, badVersion, vp8x(16777216, 16777216)])
      expect(() => readReceiptImageDimensions(bytes)).toThrow(/header/);
  });
  it("rejects unknown, truncated and inconsistent RIFF/WebP chunk headers", () => {
    const outsideRiff = vp8x(10, 20);
    new DataView(outsideRiff.buffer).setUint32(4, 8, true);
    const wrongLength = vp8l(10, 20);
    new DataView(wrongLength.buffer).setUint32(16, 4, true);
    const badPadding = vp8l(10, 20);
    badPadding[25] = 1;
    for (const bytes of [
      outsideRiff,
      wrongLength,
      badPadding,
      webp("NOPE", new Uint8Array(10)),
      vp8(10, 20).subarray(0, 29),
      vp8l(10, 20).subarray(0, 24),
      vp8x(10, 20).subarray(0, 29),
    ])
      expect(() => readReceiptImageDimensions(bytes)).toThrow(/header/);
  });
  it("rejects unknown formats, empty input and partial signatures", () => {
    for (const bytes of [
      new Uint8Array(),
      new Uint8Array([0xff]),
      new TextEncoder().encode("GIF89a"),
      png(10, 20).subarray(0, 8),
    ])
      expect(() => readReceiptImageDimensions(bytes)).toThrow(/header/);
  });
});
