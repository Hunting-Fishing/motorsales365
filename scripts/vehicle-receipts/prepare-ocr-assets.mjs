// Generated build assets only. No receipt data, network calls or credentials.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const output = path.join(root, "public/receipt-ocr/7.0.0");
const modules = path.join(root, "node_modules");
for (const [name, version] of [
  ["tesseract.js", "7.0.0"],
  ["tesseract.js-core", "7.0.0"],
  ["@tesseract.js-data/eng", "1.0.0"],
]) {
  const actual = JSON.parse(
    fs.readFileSync(path.join(modules, name, "package.json"), "utf8"),
  ).version;
  if (actual !== version)
    throw new Error(
      `OCR assets require ${name}@${version}; found ${actual}. Review paths and licenses before upgrading.`,
    );
}
const files = [
  ["tesseract.js/dist/worker.min.js", "worker.min.js"],
  ["tesseract.js/dist/worker.min.js.LICENSE.txt", "worker.min.js.LICENSE.txt"],
  ["tesseract.js/dist/tesseract.min.js.LICENSE.txt", "tesseract.min.js.LICENSE.txt"],
  ["tesseract.js-core/LICENSE", "LICENSE-APACHE-2.0.txt"],
  ["regenerator-runtime/LICENSE", "LICENSE-regenerator-runtime.txt"],
  ["zlibjs/LICENSE", "LICENSE-zlibjs.txt"],
  ["@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz", "lang/eng.traineddata.gz"],
  // v7 also chooses relaxed SIMD where supported. Keep all device fallbacks.
  ...["", "-lstm", "-simd", "-simd-lstm", "-relaxedsimd", "-relaxedsimd-lstm"].map((variant) => [
    `tesseract.js-core/tesseract-core${variant}.wasm.js`,
    `core/tesseract-core${variant}.wasm.js`,
  ]),
];
files.push([
  path.relative(modules, path.join(root, "scripts/vehicle-receipts/licenses/buffer.txt")),
  "LICENSE-buffer.txt",
]);
files.push([
  path.relative(modules, path.join(root, "scripts/vehicle-receipts/licenses/ieee754.txt")),
  "LICENSE-ieee754.txt",
]);
const manifest = [];
for (const [source, target] of files) {
  const bytes = fs.readFileSync(path.join(modules, source));
  const dest = path.join(output, target);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, bytes);
  manifest.push({
    file: target,
    bytes: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  });
}
fs.writeFileSync(
  path.join(output, "manifest.json"),
  JSON.stringify(
    { version: "7.0.0", languagePackage: "@tesseract.js-data/eng@1.0.0", files: manifest },
    null,
    2,
  ) + "\n",
);
console.log(
  `Prepared ${manifest.length} same-origin OCR assets (${Math.round(manifest.reduce((n, f) => n + f.bytes, 0) / 1024 / 1024)} MB).`,
);
