# Receipt PDF: bounded on-device delivery

Updated 2026-10-15 (Asia/Manila). This extends the image OCR slice in
`RECEIPT_OCR_DELIVERY.md`; it does not certify purchase, fitment or installation.

## Workflow and limits

- The existing **Scan on this device** button accepts PDF receipts, at most
  10 MB and 1–3 pages, alongside JPG/PNG/WebP. No receipt record, file upload or
  provider call occurs during local scanning. Saving separately uploads the
  original PDF to the existing private attachment storage.
- PDF.js renders pages locally; the existing English Tesseract worker reads
  each raster sequentially. Text-layer PDFs and image-only scans use the same
  reviewed suggestion path, not an unverified text-layer shortcut.
- The entire document is preflighted for page count, viewport and unsupported
  interactive content before OCR. Passwords, XFA, AcroForms, JavaScript actions
  and non-link annotations are rejected. Links are never followed; annotation
  rendering and the PDF scripting/viewer layers are not used.
- Original viewports and embedded images are capped at 32 MP, with viewport
  edges at most 16,000 px. Each OCR raster is at most 4 MP / 4,000 px per edge.
  PDF.js temporary canvases are bounded too. Oversized embedded images fail
  rendering with `stopAtErrors`, rather than silently disappearing from a scan.
- A linked 180-second PDF deadline cancels rendering/page OCR; cleanup has a
  two-second grace period followed by native PDF worker termination. The image
  OCR initialization limitation documented in the first slice still applies:
  a late Tesseract initializer is terminated when its handle becomes available.
  These are resource controls, not a guarantee against every malformed PDF.
- Any unreadable, unsupported, failed or cancelled page fails the whole scan.
  The editor keeps its existing values; no partial page list is applied.

## Reviewed merging

Page item order and repeated items are preserved, never guessed or deduplicated.
Every candidate remains unreviewed; more than 100 combined items is rejected.
Agreeing known metadata can be used across pages. The merge helper leaves
conflicting metadata unknown, but the editor-facing scanner rejects conflicting
suppliers, dates, currencies or totals with an explicit manual-resolution message
before applying any suggestions. Receipt totals are never added together. An amount is
not assigned another page's currency: unknown-currency page item totals are
cleared, and every known receipt total must carry the agreed currency. Conflicting
currencies clear all merged amounts. Unknown results do not erase existing form
metadata; the operator must compare every page against the original before
confirmation. No OCR output proves stock movement or installation.

## Packaging and privacy

`pdfjs-dist@6.4.299` is pinned in the npm lockfile. The asset preparation hook
copies its worker, CMaps, fonts, WASM, ICC profile and upstream licenses into
generated `public/receipt-pdf/6.4.299/` (202 files, approximately 5 MB). All paths
are explicit same-origin URLs. The PDF is supplied as local bytes, not a URL;
no document script/action body is retrieved or executed. PDF.js itself is
Apache-2.0; bundled font, codec and profile notices are retained with the assets.
Generated assets are ignored by Git and verified by bytes/SHA-256 after build.
The browser-only import guard and server-package gate keep both engines out of
the Cloudflare Worker runtime. First-use scanning still needs app asset delivery;
no offline-availability promise or paid service is introduced.

## Verification

- Local application suite: 325/325, including currency-total provenance,
  cancellation and metadata-conflict regressions. Release checks are recorded
  in the checklist.
- 36/36 Node tooling regressions pass, including PDF asset integrity and the
  narrow disposable migration replay checks.
- Actual Chrome/WebWorker smoke passes for PNG/JPEG/WebP, a two-page digital PDF
  with two ordered items and a repeated grand total (not summed), and an image-only
  PDF. Four-page, malformed and oversized-viewport PDFs are rejected.
- Zero third-party requests or missing assets/browser runtime errors were observed.
  Combined synthetic browser test took 10,138 ms locally; this is not a phone-photo
  performance or accuracy guarantee. The generated raster preview was visually
  inspected: complete, legible text with no clipping. No customer data is used.
- CI runs the real browser test and complete-checkout build/package checks.
  Synthetic fixture generation is in memory; its ignored PNG preview is not a
  customer attachment or production artifact.

No schema migration, production database mutation or production deployment is
included. The sparse local checkout omits other public media and must not be
deployed. A representative receipt corpus, mobile/browser memory tests, account
switch/save-and-review acceptance and the broader release prerequisites remain.

Primary references: [PDF.js API](https://mozilla.github.io/pdf.js/api/draft/module-pdfjsLib.html)
and [implementation/API notes](https://mozilla.github.io/pdf.js/api/draft/api.js.html).
The installed v6 types/source are the version-specific authority: document
destruction is through `loadingTask.destroy()`, not `PDFDocumentProxy.destroy()`;
the old `isEvalSupported` option is absent. Upgrades require explicit review.
