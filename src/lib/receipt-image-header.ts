const MAX_HEADER_BYTES = 1024 * 1024;
const MAX_JPEG_MARKERS = 4096;
const invalid = () =>
  new Error("Could not safely read this image header. Use another JPG, PNG or WebP photo.");

function dimensions(width: number, height: number) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0)
    throw invalid();
  return { width, height };
}

function png(bytes: Uint8Array, view: DataView) {
  // PNG 3, sections 5.3/5.5 and 11.2.1: first chunk is a 13-byte IHDR.
  // https://www.w3.org/TR/png-3/#11IHDR
  if (bytes.length < 33 || view.getUint32(8) !== 13 || view.getUint32(12) !== 0x49484452)
    throw invalid();
  const width = view.getUint32(16);
  const height = view.getUint32(20);
  const depth = bytes[24];
  const type = bytes[25];
  const depths: Record<number, number[]> = {
    0: [1, 2, 4, 8, 16],
    2: [8, 16],
    3: [1, 2, 4, 8],
    4: [8, 16],
    6: [8, 16],
  };
  if (
    width > 0x7fffffff ||
    height > 0x7fffffff ||
    !depths[type]?.includes(depth) ||
    bytes[26] !== 0 ||
    bytes[27] !== 0 ||
    bytes[28] > 1
  )
    throw invalid();
  let crc = 0xffffffff;
  for (let index = 12; index < 29; index++) {
    crc ^= bytes[index];
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  if ((crc ^ 0xffffffff) >>> 0 !== view.getUint32(29)) throw invalid();
  return dimensions(width, height);
}

function jpeg(bytes: Uint8Array, view: DataView) {
  // ITU-T T.81, B.1.1.4 and B.2.2: lengths include their own two bytes;
  // SOF stores precision, height, width, then Nf component records.
  // https://www.w3.org/Graphics/JPEG/itu-t81.pdf
  const frameMarkers = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc9, 0xca, 0xcb]);
  let offset = 2;
  for (let markers = 0; markers < MAX_JPEG_MARKERS && offset < bytes.length; markers++) {
    if (bytes[offset] !== 0xff) throw invalid();
    while (offset < bytes.length && bytes[offset] === 0xff) offset++;
    if (offset >= bytes.length) throw invalid();
    const marker = bytes[offset++];
    if (marker === 0x01) continue; // TEM is the only permitted standalone marker here.
    const tableOrMetadata =
      [0xc4, 0xcc, 0xdb, 0xdd, 0xfe].includes(marker) || (marker >= 0xe0 && marker <= 0xef);
    if (!frameMarkers.has(marker) && !tableOrMetadata) throw invalid();
    if (offset + 2 > bytes.length) throw invalid();
    const length = view.getUint16(offset);
    if (length < 2 || offset + length > bytes.length) throw invalid();
    if (frameMarkers.has(marker)) {
      if (length < 11) throw invalid();
      const precision = bytes[offset + 2];
      const height = view.getUint16(offset + 3);
      const width = view.getUint16(offset + 5);
      const components = bytes[offset + 7];
      const lossless = marker === 0xc3 || marker === 0xcb;
      if (
        !components ||
        length !== 8 + 3 * components ||
        (marker === 0xc0
          ? precision !== 8
          : lossless
            ? precision < 2 || precision > 16
            : ![8, 12].includes(precision))
      )
        throw invalid();
      const identifiers = new Set<number>();
      for (let component = 0; component < components; component++) {
        const base = offset + 8 + component * 3;
        const horizontal = bytes[base + 1] >>> 4;
        const vertical = bytes[base + 1] & 15;
        if (
          identifiers.has(bytes[base]) ||
          horizontal < 1 ||
          horizontal > 4 ||
          vertical < 1 ||
          vertical > 4 ||
          bytes[base + 2] > (lossless ? 0 : 3)
        )
          throw invalid();
        identifiers.add(bytes[base]);
      }
      // Deferred DNL heights and hierarchical/differential JPEG are deliberately
      // unsupported: their final raster cannot be bounded by this frame header.
      return dimensions(width, height);
    }
    offset += length;
  }
  throw invalid();
}

function webp(bytes: Uint8Array, view: DataView) {
  // RIFF fields are little-endian; VP8X uses 24-bit, minus-one canvas sizes.
  // https://developers.google.com/speed/webp/docs/riff_container
  if (bytes.length < 20) throw invalid();
  const end = view.getUint32(4, true) + 8;
  const size = view.getUint32(16, true);
  const chunkEnd = 20 + size;
  if (end < 20 || end > 0xfffffffe || end % 2 || chunkEnd + (size & 1) > end) throw invalid();
  if (chunkEnd <= bytes.length && size % 2 && bytes[chunkEnd] !== 0) throw invalid();
  const chunk = view.getUint32(12);
  if (chunk === 0x56503858) {
    // VP8X
    if (size < 10 || bytes.length < 30) throw invalid();
    const width = 1 + bytes[24] + bytes[25] * 256 + bytes[26] * 65536;
    const height = 1 + bytes[27] + bytes[28] * 256 + bytes[29] * 65536;
    if (width * height > 0xffffffff) throw invalid();
    return dimensions(width, height);
  }
  if (chunk === 0x5650384c) {
    // VP8L
    // https://developers.google.com/speed/webp/docs/webp_lossless_bitstream_specification#3_riff_header
    if (size < 5 || bytes.length < 25 || bytes[20] !== 0x2f) throw invalid();
    const bits = view.getUint32(21, true);
    if (bits >>> 29) throw invalid(); // Only lossless bitstream version zero is defined.
    return dimensions(1 + (bits & 0x3fff), 1 + ((bits >>> 14) & 0x3fff));
  }
  if (chunk === 0x56503820) {
    // VP8 (the fourth FourCC byte is a space)
    // RFC 6386 section 9.1: key-frame tag, sync code and 14-bit dimensions.
    // https://datatracker.ietf.org/doc/html/rfc6386#section-9.1
    if (size < 10 || bytes.length < 30) throw invalid();
    const tag = bytes[20] | (bytes[21] << 8) | (bytes[22] << 16);
    if (
      tag & 1 ||
      ((tag >>> 1) & 7) > 3 ||
      !(tag & 0x10) ||
      !(tag >>> 5) ||
      (tag >>> 5) + 10 > size ||
      bytes[23] !== 0x9d ||
      bytes[24] !== 0x01 ||
      bytes[25] !== 0x2a
    )
      throw invalid();
    return dimensions(view.getUint16(26, true) & 0x3fff, view.getUint16(28, true) & 0x3fff);
  }
  throw invalid();
}

/**
 * Read only a bounded encoded header, without decoding pixels or trusting MIME.
 * This is not whole-file validation: the browser must still validate the image,
 * and callers must apply their raster limits before AND after decoding it.
 */
export function readReceiptImageDimensions(bytes: Uint8Array): { width: number; height: number } {
  const header = bytes.subarray(0, MAX_HEADER_BYTES);
  const view = new DataView(header.buffer, header.byteOffset, header.byteLength);
  if (header.length >= 8 && view.getUint32(0) === 0x89504e47 && view.getUint32(4) === 0x0d0a1a0a)
    return png(header, view);
  if (header.length >= 2 && view.getUint16(0) === 0xffd8) return jpeg(header, view);
  if (header.length >= 12 && view.getUint32(0) === 0x52494646 && view.getUint32(8) === 0x57454250)
    return webp(header, view);
  throw invalid();
}
