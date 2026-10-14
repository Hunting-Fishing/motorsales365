import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";

export function verifyPdfAssets(publicRoot) {
  const root = path.resolve(publicRoot, "receipt-pdf/6.4.299");
  const manifest = JSON.parse(fs.readFileSync(path.join(root, "manifest.json"), "utf8"));
  if (manifest.version !== "6.4.299") throw new Error("Unexpected PDF asset version");
  const names = new Set(manifest.files.map((entry) => entry.file));
  const required = [
    "pdf.worker.mjs",
    "LICENSE",
    "cmaps/Adobe-Japan1-0.bcmap",
    "cmaps/LICENSE",
    "standard_fonts/LiberationSans-Regular.ttf",
    "standard_fonts/LICENSE_FOXIT",
    "standard_fonts/LICENSE_LIBERATION",
    "wasm/openjpeg.wasm",
    "wasm/jbig2.wasm",
    "wasm/qcms_bg.wasm",
    "wasm/LICENSE_OPENJPEG",
    "iccs/CGATS001Compat-v2-micro.icc",
    "iccs/LICENSE",
  ];
  if (required.some((name) => !names.has(name)))
    throw new Error("PDF asset manifest is incomplete");
  for (const entry of manifest.files) {
    const target = path.resolve(root, entry.file);
    if (!target.startsWith(root + path.sep) || !/^[\w./-]+$/.test(entry.file))
      throw new Error("Invalid PDF asset path");
    const bytes = fs.readFileSync(target);
    if (
      bytes.length !== entry.bytes ||
      createHash("sha256").update(bytes).digest("hex") !== entry.sha256
    )
      throw new Error(`PDF asset hash mismatch: ${entry.file}`);
  }
  return manifest.files.length;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  console.log(`PDF assets verified: ${verifyPdfAssets(process.argv[2] ?? "public")} files`);
