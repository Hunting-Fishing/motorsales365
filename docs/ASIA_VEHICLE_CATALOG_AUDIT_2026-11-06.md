# Asian vehicle catalogue and My Rides repair

Research date: 6 November 2026. Scope: Philippine-first motorcycles, scooters, cars, light commercial vehicles and Asian-market imports, including discontinued models and engine variants.

## What is fixed

Ride creation previously wrote only to `rides`; receipt selection reads `vehicles`. All three production rides had no `vehicle_id`. The additive migration creates a private, owner-matched vehicle in the same transaction and repairs complete older rides without a possible existing vehicle match. Production verification returned three rides, three links and three private vehicles. No receipts were made public.

The UI change adds editable numeric CC (including decimals), common-size suggestions, optional motorcycle-appropriate trim, a direct Receipts & history button and visible load errors. It preserves custom model/engine values when the picker mounts. Changing vehicle category clears incompatible selections. RUSI Surf, Royal, Gamma and RFI names replace the erroneous RUSI Rouser entry; existing user records are retained.

## Coverage is not complete

No source examined establishes every Asian make/model/year/engine combination. API catalogue counts are provider claims, not verified Philippine coverage. A US VIN database is insufficient. A current dealer product page does not prove availability in every previous year, and an undated specification must not be assigned a guessed production range.

The first source-backed seed contains **25 observations**: RUSI 6, RUSCO 15, Honda 2, Suzuki 1 and Yamaha 1. Only the Honda observations establish specific model years (2023 and 2026). The remaining 23 explicitly have unknown year ranges. Multiple engines can belong to one model, so observations are not a count of unique models. Existing bundled catalogue data remains a legacy suggestion source, not a newly audited historical database.

## API and dataset findings

| Source | Useful data | Limitations and next action |
|---|---|---|
| [API Ninjas Motorcycles](https://api-ninjas.com/api/motorcycles) | Make/model/year, displacement, engine type and other specs; advertises 44,000+ model-year entries and 600+ makes | Up to 30 records per search; offset pagination requires an eligible paid plan. Make/model enumeration has plan restrictions. Test RUSI, regional Honda/Yamaha/Suzuki variants and historical gaps before choosing it. Adapter implemented, live credential test outstanding. |
| [Data & APIs Motorcycles](https://dataandapis.com/apis/motorcycles) | Brand/model/year, numeric displacement, engine configuration, year ranges in search and page pagination; advertises 42,500+ models from 607 brands | Publishes a 500-token monthly free allowance. Validate regional accuracy and permanent storage/display rights. Adapter implemented; no key configured or bulk fetch run. |
| [MotorcycleDB API](https://www.motorcycledb.com/api/) | Make/model-year search, engine capacity, specification detail and catalogue endpoints | Trial key and commercial plans. Evaluate attribution, caching and bulk reuse terms; no RUSI completeness established. |
| [Car2DB motorcycle data](https://moto.car2db.com/) | Downloadable CSV/MySQL/XLSX with make/model/series/trim/specification structure | Page advertises $72 CSV/MySQL and $85 XLSX. Inspect samples and licence before purchase. The displayed example merits field-level quality checks; do not accept all data because it is paid. |
| [TecAlliance vehicle API](https://developer.tecalliance.cn/en/tecdoc-api/function/vehicle-search/index.html) | Market, make/model, construction dates, engine code array and displacement, plus parts-catalogue identifiers | The inspected documentation is China-specific. Obtain coverage and licensing terms for PH/JP/TH/ID/VN/MY/IN separately. Strong candidate for the parts-fitment programme, not proof of every motorcycle. |
| [JATO developer portal](https://developer.jato.com/) / [API list](https://developerdemo.jato.com/apis) | Historical vehicle-instance discovery and passenger-car/LCV specifications in 50+ markets | Commercial access; confirm Philippine and Asian historical coverage. Motorcycle coverage was not established. |
| [NHTSA vPIC](https://vpic.nhtsa.dot.gov/api/) / [coverage FAQ](https://vpic.nhtsa.dot.gov/api/home/index/faq) | Free manufacturer/VIN data and downloadable databases | Foreign vehicles are covered when registered for US sale/import. Use for appropriate US-market imports, not as the master Asian catalogue. |
| [CarAPI](https://carapi.app/docs/) | Year/make/model/trim/engine endpoints, plus powersports endpoints | Documentation proves endpoints, not comprehensive Asian-market availability or RUSI/RUSCO coverage. Require a representative data sample. |
| [Vehicle Databases motorcycle decode](https://vehicledatabases.com/docs/api-documentation/motorcycle-decode/) | VIN-specific specifications including engine fields | VIN decoding is enrichment for an individual vehicle, not an enumeration of every local model or short chassis number. |
| [CarQuery](https://www.carqueryapi.com/documentation/api-usage/) | Candidate legacy vehicle API | Documentation fetch failed during this audit. Not selected or integrated on unverified assumptions. |

No subscription was purchased and no supplier was contacted.

## Manufacturer and historical sources

| Brand/source | Confirmed source and how to use it |
|---|---|
| RUSI | [Surf](https://rusimotors.ruscomotorsgroup.net/product/mp-100-110-125-surf/) explicitly lists nominal 100/110/125cc four-stroke choices. [Royal](https://rusimotors.ruscomotorsgroup.net/product/sc125-royal/), [Gamma](https://rusimotors.ruscomotorsgroup.net/product/ss-200-gamma/) and [RFI](https://rusimotors.ruscomotorsgroup.net/product/rfi-175cc-fuel-injection-scooter/) supply basic nominal sizes. These pages contain placeholder marketing copy and no historical ranges; obtain dated brochures or homologation records before claiming exact years or actual displacement. |
| RUSCO | [Catalogue](https://ruscomotorsgroup.net/vehicles/) and [second page](https://ruscomotorsgroup.net/vehicles/page/2/) identify local offerings. [DA63T](https://ruscomotorsgroup.net/product/rusco-da63t/) and [DA64V](https://ruscomotorsgroup.net/product/rusco-da64v-van/) describe reconditioned Japanese-surplus vehicles. Keep original OEM, donor chassis, original manufacture year, rebuild year and registration year separate. DA63T/DA64V are chassis/model identifiers, not verified engine codes. Piaggio-branded listings must remain Piaggio, not RUSCO. |
| Honda | [2023 Click125 announcement](https://www.hondaph.com/motorcycle/news/kick-off-with-the-ultimate-ride-of-2023-the-all-new-click125) and [2026 model announcement](https://www.hondaph.com/motorcycle/news/game-changer-upgrade-honda-introduces-the-click125-2026-year-model) establish separate year-specific PH observations. Use country-specific brochures and manuals for other years. |
| Yamaha | [Product Library](https://global.yamaha-motor.com/showroom/library/) provides country/area/year search. [Historical publications](https://global.yamaha-motor.com/showroom/cp/library/) and [collection](https://global.yamaha-motor.com/showroom/cp/collection/) help with discontinued models. Historic Japanese data does not automatically describe Philippine variants. |
| Suzuki | [Digital archive](https://www.globalsuzuki.com/motorcycle/smgs/digital-archive/) is mainly Japanese specification; retain JP market tags. [PH underbones](https://mc.suzuki.com.ph/suzuki-underbone-motorcycle-philippines/) and [technology references](https://mc.suzuki.com.ph/suzuki-technology/) support current local names. Store nominal “150” separately from an exact measured displacement when one is documented. |
| Bajaj / Kawasaki | [Bajaj Philippines](https://www.bajajauto.com/en-ph) and [Kawasaki Philippines](https://www.kawasaki.ph/news-and-events) are regional sources. Rouser must not be catalogued as RUSI. Distributor aliases need market/year evidence. |
| Motorstar | [MSS Cycle Trading](https://msscycletrading.com.ph/) identifies itself as the local distributor. Obtain dated specification sheets; importer/rebadge equivalence alone does not establish engine interchangeability. |
| LTO | [2023 RUSI classification circular](https://www.lto.gov.ph/wp-content/uploads/2023/09/MC_VDM_2023-2419.pdf) is a potentially valuable historical source. Direct PDF retrieval was denied, so its engine fields were not imported. Classification/approval dates must not be stretched into a full production range. |

## Database and ingestion rules

`vehicle_catalog_entries` stores source identity/URL, observation date, country, category, manufacturer, model, aliases, explicit year evidence, engine description/code, actual CC, nominal CC, optional trim and chassis code. A verified range requires both endpoints; unknown ranges require both NULL. Electric vehicles may have NULL displacement. Multiple sources remain separate observations until reconciled.

The public picker sees only `published` rows for the selected market. Unknown-year suggestions display an explanation. Ordinary users cannot publish or modify the catalogue. API-imported records default to `review` and market `ZZ` (unassigned). Provider model-year data is preserved, but a reviewer must confirm regional applicability before assigning PH and publishing. User-entered models/CC stay on that user's ride; they do not silently become verified global catalogue facts.

`scripts/vehicle-catalog/import.mjs` supports API Ninjas and Data & APIs. It detects repeated pages, marks a capped fetch incomplete, preserves decimal CC, and never derives an engine code from a model name. Existing catalogue rows are not overwritten. Credentials belong in server environment variables, never browser code.

Example after confirming the provider's storage licence:

```sh
node scripts/vehicle-catalog/import.mjs --provider api-ninjas --make Honda --license-reviewed --output honda-review.json
```

Set `VEHICLE_CATALOG_API_KEY`. Add `--apply` with server-only `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to import into review. Without `--apply`, the command only creates a local review file. A live provider fetch has not been performed; current adapter verification uses mocked provider responses.

## Expansion and acceptance criteria

1. PH benchmark: RUSI Surf/Classic/RFI/Gamma, RUSCO DA-series, Honda Click/Beat/Wave/TMX, Yamaha Mio/NMAX/Aerox/YTX, Suzuki Raider/Smash/Burgman, Kawasaki/Bajaj Rouser/CT/Barako, Motorstar and Skygo. Record zero-results as coverage gaps, not proof that a model did not exist.
2. Add country-specific JP, TH, ID, VN, MY, IN, CN, KR, TW, PK, BD and LK records. Priorities include TVS, Hero, Royal Enfield, Bajaj, SYM, Kymco, CFMoto, QJMotor, Zongshen, Loncin, Lifan, Haojue, Benelli, Keeway, Modenas, Demak and Yadea. This is an acquisition queue, not a claim that those brands have been fully imported.
3. Cars/LCVs: Toyota, Honda, Suzuki, Nissan, Mitsubishi, Isuzu, Mazda, Daihatsu, Subaru, Hyundai, Kia, Proton, Perodua, Tata, Mahindra, BYD, Geely, Chery, GWM/Haval and MG. Heavy vehicles/equipment require a separate provider coverage assessment rather than using motorcycle data.
4. Before accepting a provider, request counts by country, brand and year; earliest/latest verified years; actual CC vs marketed size; engine-code completeness; model/variant aliases; inactive model retention; update frequency; sample exports; caching/display/resale rights and attribution requirements.
5. Acceptance: each published historical record traces to evidence; sample exact engine/year matches against manufacturer material; report missing fields separately; preserve uncertain records for review. Never fill every year between first and latest observation automatically. A specification match is not a verified replacement-parts fitment match.

## Verification

Node provider tests cover displacement parsing, review-only imports, pagination, repeated-page detection and incomplete fetches. PGlite tests run the SQL migrations and check atomic linking, CC updates, cross-owner denial, duplicate avoidance, vehicle retention when deleting a showcase ride, seed lookup, aliases, historical exclusion and catalogue write denial. Live transaction checks ran with rollback; production repair counts were verified separately. The GitHub workflow also runs UI regression tests and a production build.

Remaining external dependency: obtain a provider key and suitable storage/display licence, verify the regional sample, then bulk ingest. No claim of complete all-years Asian coverage is made.
