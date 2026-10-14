import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";

export function verifyOcrAssets(publicRoot) {
  const root = path.resolve(publicRoot, "receipt-ocr/7.0.0");
  const manifest = JSON.parse(fs.readFileSync(path.join(root, "manifest.json"), "utf8"));
  if (manifest.version !== "7.0.0" || manifest.languagePackage !== "@tesseract.js-data/eng@1.0.0")
    throw new Error("Unexpected OCR asset version");
  const names = new Set(manifest.files.map((entry) => entry.file));
  const required = [
    "worker.min.js",
    "lang/eng.traineddata.gz",
    "LICENSE-APACHE-2.0.txt",
    "worker.min.js.LICENSE.txt",
    "tesseract.min.js.LICENSE.txt",
    ...["", "-lstm", "-simd", "-simd-lstm", "-relaxedsimd", "-relaxedsimd-lstm"].map(
      (variant) => `core/tesseract-core${variant}.wasm.js`,
    ),
  ];
  if (required.some((name) => !names.has(name)))
    throw new Error("OCR asset manifest is incomplete");
  for (const entry of manifest.files) {
    const target = path.resolve(root, entry.file);
    if (!target.startsWith(root + path.sep) || !/^[\w./-]+$/.test(entry.file))
      throw new Error("Invalid OCR asset path");
    const bytes = fs.readFileSync(target);
    if (
      bytes.length !== entry.bytes ||
      createHash("sha256").update(bytes).digest("hex") !== entry.sha256
    )
      throw new Error(`OCR asset hash mismatch: ${entry.file}`);
  }
  return manifest.files.length;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log(`OCR assets verified: ${verifyOcrAssets(process.argv[2] ?? "public")} files`);
}
