# Receipt OCR: first on-device delivery

This slice adds English-language image OCR to the existing reviewed receipt
workflow. It does not replace receipt authorization, install parts automatically,
infer fitment, or certify service history.

## User workflow and privacy

1. Select a JPG, PNG or WebP receipt, up to 10 MB.
2. Select **Scan on this device**. The worker reads the image locally. This
   operation neither creates a database receipt nor uploads its attachment.
3. Review the supplier, date, currency and each proposed item. Unknown fields
   remain unknown; categories are not inferred; every item starts unreviewed.
4. Save a draft or confirm reviewed purchases. Saving uploads the selected
   attachment to the existing private receipt storage, as clearly labelled.

The separate consent-gated provider option remains available. Local PDF scanning
is not included yet: use manual entry or that separate provider option. This is
not a claim that first-use scanning works offline; scanner assets must be served
by the app. No API key or paid OCR provider is needed for the on-device path.

Scanning replaces nonempty item suggestions and known metadata only. Unknown
metadata and an empty item list do not erase existing entries; a wholly empty
result reports a manual-entry fallback. Fields are disabled during processing
to avoid overwriting concurrent edits. Cancel preserves existing values.
Closing/unmounting aborts the local operation and ignores late results.

## Safety and packaging

- `tesseract.js@7.0.0`, lockfile-resolved `tesseract.js-core@7.0.0`, and
  `@tesseract.js-data/eng@1.0.0` are version-checked by the asset preparation step.
- `npm run ocr:assets` copies the worker, six core/device fallbacks, integerized
  English model and license notices into generated `public/receipt-ocr/7.0.0/`.
  Development/build hooks prepare them; they are not checked into Git.
- All worker/core/language URLs are explicitly same-origin; no CDN defaults or
  persistent receipt cache is used. The model is 4.0.0_best_int, not tessdata_fast.
- SHA-256/byte-count verification checks generated **and built** assets. The
  Worker bundle gate fails for missing, altered, or unexpectedly versioned assets.
- A bounded 1 MiB encoded-header reader checks PNG/JPEG/WebP dimensions before
  decoding. Input is capped at 32 MP / 16,000 px per edge and checked again after
  decoding, then rasterized to at most 4 MP / 4,000 px per edge. Unknown/truncated
  headers and deferred/hierarchical JPEG variants fall back to manual entry.
  Header checks do not replace whole-file validation by the browser.
- A 90-second deadline bounds UI waiting. Recognition cancellation terminates
  the worker. Tesseract exposes its termination handle only after initialization
  resolves: cancellation during that phase ignores results and terminates the
  late worker; single-flight initialization prevents duplicate workers while
  cleanup is pending. Do not claim immediate initializer termination.
- OCR text is bounded at 50,000 characters, 1,000 lines and 100 candidate items.
  Dates require explicit, valid ISO labels; conflicting/ambiguous values are null.
  Suggestions never assert purchase review or installation.

## Verification at this checkpoint

- 283/283 application tests pass, including 14 text-parser, 9 OCR-lifecycle,
  13 encoded-header and 6 additional no-upload/manual/cancellation panel tests.
- Tooling regressions: 18/18 passing.
- Both isolated receipt/installation database regression suites pass.
- Real installed Chrome smoke test reads generated PNG, JPEG and WebP synthetic
  receipts using the actual worker, relaxed-SIMD core and English model. Latest
  measured combined operation: 1,028 ms; not a real-world phone-photo performance
  guarantee. The fixture uses the framework's client-only identity stub; the
  complete application compilation separately verifies server-side stripping.
- The browser test observes zero third-party requests, correctly extracts the
  labelled supplier/date/currency/total, and keeps the candidate item unreviewed.
- CI includes the browser smoke test and five asset-verification regressions.
  Typecheck and complete production compilation remain gates on the published PR.

No schema migration or production deployment is part of this slice. The local
sparse checkout still omits other public media and must not be deployed.

## Dependencies and notices

Tesseract.js and its core are Apache-2.0. The language package metadata states MIT;
its source language-data repository carries Apache-2.0. The generated directory
includes the Apache license plus upstream bundled notices and available full
licenses for buffer, ieee754, regenerator-runtime and zlib.js. The two vendored
notice files were retrieved from the projects' official license files. Dependency
upgrades require reviewing the package versions, selected core filenames and
notices rather than silently accepting new assets.

Primary references: [Tesseract.js local installation](https://github.com/naptha/tesseract.js/blob/v7.0.0/docs/local-installation.md),
[worker API](https://github.com/naptha/tesseract.js/blob/v7.0.0/docs/api.md),
[language data](https://github.com/naptha/tessdata/blob/gh-pages/README.md),
[language-data license](https://github.com/naptha/tessdata/blob/gh-pages/LICENSE),
[buffer license](https://github.com/feross/buffer/blob/master/LICENSE), and
[ieee754 license](https://github.com/feross/ieee754/blob/master/LICENSE).

## Next slice

Verify build/type/browser checks in CI, then implement bounded same-origin PDF
page rendering with explicit page limits and reviewed merging. A wider photo
corpus, mobile resource tests and business/owner acceptance remain pilot gates.
