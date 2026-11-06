# Asia motorcycle catalogue: first official-source pull

Collection and review date: 2026-11-06.

## Result

The live database received 22 new source observations: 11 published and 11 held for review. These are observations, not a claim of 22 distinct motorcycles or complete Asian coverage.

| Source | New records | Published | Review |
| --- | ---: | ---: | ---: |
| Thai Yamaha manufacturer pages | 6 | 6 | 0 |
| Japanese Honda manufacturer release | 2 | 2 | 0 |
| Philippine LTO / UP NARO records | 14 | 3 | 11 |
| Total | 22 | 11 | 11 |

The existing catalogue already had 25 published Philippine manufacturer observations and 250 API observations awaiting market verification. After this batch: **297 observations, 36 published, 261 in review**.

## Actual document download

[Successful collector run](https://github.com/Hunting-Fishing/motorsales365/actions/runs/42221446517) downloaded 13 of 14 manifest-listed PDFs, covering Rusi, Motorstar, Skygo and Motoposh. Five scans produced an identity-matched displacement. The Rusi Force 150 direct LTO download returned HTTP 403 and was not retried or bypassed.

[Download cache](https://github.com/Hunting-Fishing/motorsales365/actions/runs/42221446517/artifacts/13503582328) includes the PDFs, HTML, OCR text and results; retention is 90 days. The repository permanently retains the factual extraction results, hashes, review decisions and seed records. The temporary artifact is not a permanent PDF archive.

## Published facts

- Yamaha Finn, Thailand: 2020, 2021, 2023, 2024, 2025 and 2026, each 114cc. Only explicitly identified model years are included. The nominal 115cc designation is separate where the manufacturer advertises it. No 2022 record is inferred.
- Honda PCX and PCX160, Japan: 124cc / JK05E and 156cc / KF47E respectively. The 2025 announcement and on-sale dates do not establish a model-year range.
- Skygo SG200A, Philippines: 198cc, one cylinder, gasoline. NARO OCR was corroborated by the primary LTO technical table: https://lto.gov.ph/wp-content/uploads/2025/04/MC-VDM-2025-4345.pdf
- Skygo SG175R, Philippines: 169.7cc, one cylinder, gasoline. NARO OCR was corroborated by the primary LTO technical table: https://lto.gov.ph/wp-content/uploads/2025/03/MC-VDM-2025-4280.pdf
- Rusi Macho TC150, Philippines: 149cc, one cylinder, gasoline, from the indexed primary LTO technical table in MVL-2025-4766: https://lto.gov.ph/wp-content/uploads/2025/11/MC-MVL-2025-4766.pdf. This additional observation was not one of the 13 archived PDFs. It does not replace the older VDM-2024-4050 observation.

All LTO records retain unknown model years and engine codes. Approval dates are not model years.

## Review backlog

Eleven downloaded document observations remain hidden from public catalogue access. Some have unclear OCR; others have readable candidate displacement without sufficient corroboration. Rusi Macho TC150/TC125 and Motoposh EVO170 did not pass the initial OCR identity match. Verify the original relevant PDF page before publication, especially EVO170, whose first-page OCR did not match its catalogue title. Do not turn a badge number or engine serial number into a specification or engine code.

The extracted candidate records are in `lto-collection-2026-11-06.json`; the reviewed database import is in `lto-reviewed-seed.json`. The Yamaha/Honda observations are in `asia-manufacturer-seed.json`.

## Continuing imports

The existing API Ninjas and Data & APIs queue remains enabled, with 28 unfinished make queries per provider after the initial run. It resumes daily at 02:17 UTC / 10:17 Manila, subject to scheduler delays, the existing eight-request daily / 240-request monthly application limits, and provider account limits. These API records retain unknown market until checked.

No new subscription or provider account was purchased. MotorCyclesData, cStudios and TecAlliance have not been connected. RUSCO truck coverage remains a separate gap.

## Verification

The production anonymous catalogue RPC returns the reviewed Philippine engines, marks their model years unverified, hides review records, preserves the missing Thai 2022 year and excludes Thai Finn specifications from the Philippine market. Database inserts use the source/external-ID/market uniqueness constraint and preserve existing observations.
