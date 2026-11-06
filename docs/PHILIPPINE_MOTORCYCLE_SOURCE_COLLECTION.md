# Philippine motorcycle source collection

The initial manifest covers 14 two-wheeled motorcycle specification circulars: Rusi (7), Motorstar (2), Skygo (3), and Motoposh (2). The discovery sources are the Land Transportation Office and its records in the University of the Philippines National Administrative Register. This is an initial batch, not complete Philippine or Asian history.

## Collection

The `Collect Philippine motorcycle source documents` Actions workflow fetches only manifest-listed public records from `naro.law.upd.edu.ph` and `lto.gov.ph`. Each HTTP request is at least ten seconds after the previous request. It does not retry blocked pages, follow off-site redirects, or use credentials. HTTP 429/503 pauses the remaining batch. Downloads are limited in size and validated as PDF before parsing.

The collector preserves PDFs, SHA-256 hashes, catalogue HTML and extracted text in a 90-day Actions artifact. It first uses PDF text extraction and falls back to first-page OCR for scans. The JSON results retain provenance, document issue date, matching evidence lines and validation flags. Permanent reviewed facts are retained in the repository seed and the live vehicle catalogue; the artifact is a temporary document cache, not permanent source storage.

## Review and publication

All machine output is `status=review`. A matching manufacturer and model must appear in the extracted document before engine fields are attached. Missing or uncertain displacement remains null. A nominal number in a model badge never becomes measured CC, and engine codes are not inferred from serial numbers or CC.

Document issue/approval dates are stored separately in the source manifest and notes. Only a labelled model-year field establishes a model year during extraction. A reviewer can corroborate additional years with independent manufacturer evidence; the document date alone cannot establish a year range.

After review, validated motorcycle records can be imported idempotently using `(source_key, external_id, market)`. Do not automatically publish changed OCR results over existing approved data. Three-wheel cargo vehicles and electric vehicles require their own category/engine handling and are excluded from this initial manifest.

## Other sources

The existing API Ninjas and Data & APIs jobs keep their established private cache and quotas. No paid subscriptions were purchased. MotorCyclesData and cStudios require account access and a verified sample before integration. Honda MotoPub's published terms restrict commercial reuse/automation; no bulk download is configured for that portal. Regional manufacturer product pages and government records can be evaluated individually for additional country-specific observations.

## Validation

Unit tests cover decimal displacement, identity mismatches, approval-date/model-year separation, missing CC, review-only output and source-host restrictions. Live collection results must be checked separately because scanned documents vary in layout and OCR quality.
