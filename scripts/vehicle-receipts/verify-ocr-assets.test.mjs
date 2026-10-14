import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { verifyOcrAssets } from "./verify-ocr-assets.mjs";

function fixture(t) {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "365-ocr-assets-"));
  t.after(() => {
    assert.equal(path.dirname(temp), path.resolve(os.tmpdir()));
    assert.ok(path.basename(temp).startsWith("365-ocr-assets-"));
    fs.rmSync(temp, { recursive: true });
  });
  const root = path.join(temp, "receipt-ocr/7.0.0");
  const names = [
    "worker.min.js",
    "lang/eng.traineddata.gz",
    "LICENSE-APACHE-2.0.txt",
    "worker.min.js.LICENSE.txt",
    "tesseract.min.js.LICENSE.txt",
    ...["", "-lstm", "-simd", "-simd-lstm", "-relaxedsimd", "-relaxedsimd-lstm"].map(
      (variant) => `core/tesseract-core${variant}.wasm.js`,
    ),
  ];
  const bytes = Buffer.from("synthetic asset fixture");
  const manifest = {
    version: "7.0.0",
    languagePackage: "@tesseract.js-data/eng@1.0.0",
    files: names.map((file) => ({
      file,
      bytes: bytes.length,
      sha256: createHash("sha256").update(bytes).digest("hex"),
    })),
  };
  for (const file of names) {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), bytes);
  }
  const save = () => fs.writeFileSync(path.join(root, "manifest.json"), JSON.stringify(manifest));
  save();
  return { temp, root, manifest, save };
}
test("complete asset manifest passes", (t) => {
  const f = fixture(t);
  assert.equal(verifyOcrAssets(f.temp), 11);
});
test("missing relaxed SIMD fallback blocks publication", (t) => {
  const f = fixture(t);
  f.manifest.files = f.manifest.files.filter((entry) => !entry.file.includes("relaxedsimd-lstm"));
  f.save();
  assert.throws(() => verifyOcrAssets(f.temp), /incomplete/);
});
test("changed language bytes block publication", (t) => {
  const f = fixture(t);
  fs.writeFileSync(path.join(f.root, "lang/eng.traineddata.gz"), "wrong model");
  assert.throws(() => verifyOcrAssets(f.temp), /hash mismatch/);
});
test("manifest cannot read outside its asset directory", (t) => {
  const f = fixture(t);
  f.manifest.files.push({ file: "../outside", bytes: 0, sha256: "" });
  f.save();
  assert.throws(() => verifyOcrAssets(f.temp), /Invalid OCR asset path/);
});
test("unexpected model version blocks publication", (t) => {
  const f = fixture(t);
  f.manifest.languagePackage = "unreviewed@2.0.0";
  f.save();
  assert.throws(() => verifyOcrAssets(f.temp), /Unexpected OCR asset version/);
});
