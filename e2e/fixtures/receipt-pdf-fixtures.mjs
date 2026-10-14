// In-memory synthetic software-test inputs, never customer documents.
const encode = (text) => new TextEncoder().encode(text);
const join = (chunks) => {
  const bytes = new Uint8Array(chunks.reduce((size, chunk) => size + chunk.length, 0));
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return bytes;
};
const literal = (text) => text.replace(/[\\()]/g, (char) => `\\${char}`);
function serialize(objects) {
  const chunks = [encode("%PDF-1.7\n")],
    offsets = [0];
  let length = chunks[0].length;
  for (let index = 1; index < objects.length; index++) {
    const object = join([
      encode(`${index} 0 obj\n`),
      typeof objects[index] === "string" ? encode(objects[index]) : objects[index],
      encode("\nendobj\n"),
    ]);
    offsets.push(length);
    chunks.push(object);
    length += object.length;
  }
  const xref = length;
  chunks.push(
    encode(
      `xref\n0 ${objects.length}\n0000000000 65535 f \n${offsets
        .slice(1)
        .map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`)
        .join("")}trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`,
    ),
  );
  return join(chunks);
}
export function textReceiptPdf(pages, { width = 612, height = 792 } = {}) {
  const objects = [
      null,
      "<< /Type /Catalog /Pages 2 0 R >>",
      "",
      "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    ],
    kids = [];
  for (const lines of pages) {
    const page = objects.length,
      content = page + 1;
    kids.push(`${page} 0 R`);
    const stream = `BT /F1 18 Tf 45 ${height - 65} Td ${lines.map((line, i) => `${i ? "0 -50 Td " : ""}(${literal(line)}) Tj`).join("\n")} ET`;
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Resources << /Font << /F1 3 0 R >> >> /Contents ${content} 0 R >>`,
    );
    objects.push(`<< /Length ${encode(stream).length} >>\nstream\n${stream}\nendstream`);
  }
  objects[2] = `<< /Type /Pages /Count ${pages.length} /Kids [${kids.join(" ")}] >>`;
  return serialize(objects);
}
export function imageReceiptPdf(jpegBytes, width, height) {
  const displayHeight = (552 * height) / width;
  const stream = `q 552 0 0 ${displayHeight} 30 ${762 - displayHeight} cm /ReceiptImage Do Q`;
  return serialize([
    null,
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Count 1 /Kids [3 0 R] >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /XObject << /ReceiptImage 5 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${encode(stream).length} >>\nstream\n${stream}\nendstream`,
    join([
      encode(
        `<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`,
      ),
      jpegBytes,
      encode("\nendstream"),
    ]),
  ]);
}
