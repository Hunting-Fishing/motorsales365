import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";

export const PDF_ASSET_VERSION = "6.4.299";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export function preparePdfAssets() {
  const source = path.join(root, "node_modules/pdfjs-dist");
  const version = JSON.parse(fs.readFileSync(path.join(source, "package.json"), "utf8")).version;
  if (version !== PDF_ASSET_VERSION)
    throw new Error(
      `PDF assets require pdfjs-dist@${PDF_ASSET_VERSION}; found ${version}. Review browser support, paths and notices before upgrading.`,
    );
  const output = path.join(root, `public/receipt-pdf/${version}`);
  const sources = [
    ["build/pdf.worker.min.mjs", "pdf.worker.mjs"],
    ["LICENSE", "LICENSE"],
  ];
  for (const folder of ["cmaps", "standard_fonts", "wasm", "iccs"]) {
    for (const name of fs.readdirSync(path.join(source, folder)).sort()) {
      const file = `${folder}/${name}`;
      if (!fs.statSync(path.join(source, file)).isFile())
        throw new Error("Unexpected PDF asset directory");
      sources.push([file, file]);
    }
  }
  const files = sources.map(([file, target]) => {
    const bytes = fs.readFileSync(path.join(source, file));
    const dest = path.join(output, target);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, bytes);
    return {
      file: target,
      bytes: bytes.length,
      sha256: createHash("sha256").update(bytes).digest("hex"),
    };
  });
  fs.writeFileSync(
    path.join(output, "manifest.json"),
    JSON.stringify({ version, files }, null, 2) + "\n",
  );
  console.log(
    `Prepared ${files.length} same-origin PDF assets (${Math.round(files.reduce((n, f) => n + f.bytes, 0) / 1024 / 1024)} MB).`,
  );
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) preparePdfAssets();
