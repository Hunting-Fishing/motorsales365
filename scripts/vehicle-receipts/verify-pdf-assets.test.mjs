import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { verifyPdfAssets } from "./verify-pdf-assets.mjs";
function fixture(t) {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "365-pdf-assets-"));
  t.after(() => {
    assert.equal(path.dirname(temp), path.resolve(os.tmpdir()));
    assert.ok(path.basename(temp).startsWith("365-pdf-assets-"));
    fs.rmSync(temp, { recursive: true });
  });
  const root = path.join(temp, "receipt-pdf/6.4.299");
  const names = [
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
  const bytes = Buffer.from("synthetic PDF asset");
  const manifest = {
    version: "6.4.299",
    files: names.map((file) => ({
      file,
      bytes: bytes.length,
      sha256: createHash("sha256").update(bytes).digest("hex"),
    })),
  };
  for (const name of names) {
    fs.mkdirSync(path.dirname(path.join(root, name)), { recursive: true });
    fs.writeFileSync(path.join(root, name), bytes);
  }
  const save = () => fs.writeFileSync(path.join(root, "manifest.json"), JSON.stringify(manifest));
  save();
  return { temp, root, manifest, save };
}
test("complete PDF asset manifest passes", (t) => {
  const f = fixture(t);
  assert.equal(verifyPdfAssets(f.temp), 13);
});
test("missing PDF font asset blocks publication", (t) => {
  const f = fixture(t);
  f.manifest.files = f.manifest.files.filter((row) => !row.file.includes("LiberationSans-Regular"));
  f.save();
  assert.throws(() => verifyPdfAssets(f.temp), /incomplete/);
});
test("changed PDF worker bytes block publication", (t) => {
  const f = fixture(t);
  fs.writeFileSync(path.join(f.root, "pdf.worker.mjs"), "wrongworker");
  assert.throws(() => verifyPdfAssets(f.temp), /hash mismatch/);
});
test("PDF manifest cannot read outside its directory", (t) => {
  const f = fixture(t);
  f.manifest.files.push({ file: "../outside", bytes: 0, sha256: "" });
  f.save();
  assert.throws(() => verifyPdfAssets(f.temp), /Invalid PDF asset path/);
});
test("unreviewed PDF version blocks publication", (t) => {
  const f = fixture(t);
  f.manifest.version = "future";
  f.save();
  assert.throws(() => verifyPdfAssets(f.temp), /Unexpected PDF asset version/);
});
