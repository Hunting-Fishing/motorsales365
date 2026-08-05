# 365 Repair Knowledge Network

**Repository:** `Hunting-Fishing/motorsales365`  
**Primary integration surface:** Shop Manager (`/workspace`)  
**Status:** Implementation plan based on repository inspection  
**Prepared:** 2026-08-05

## 1. Executive decision

365 should **not** attempt to copy or mirror ChiltonLibrary, ALLDATA, Mitchell 1, ProDemand, HaynesPro, or another subscription database. Those services contain copyrighted and licensed material, and their normal subscriptions do not authorize creation of a competing database.

The recommended product is a new shared platform capability called the **365 Repair Knowledge Network**:

- Free government and legitimately reusable vehicle data provides the initial foundation.
- Shop Manager supplies the existing operational workflow: customer, vehicle, work order, inspection, job lines, parts, technician time, quote, invoice, payment, reminder, and service history.
- Verified technicians create original procedures, diagnostic trees, measurements, photos, and videos owned or licensed by 365.
- Every knowledge record retains its source, licence, applicability, review status, revision history, and safety warnings.
- Commercial data providers can be added later as replaceable integrations without owning the core platform.

This makes the growing body of verified repair knowledge a permanent 365 asset and avoids making the business dependent on one data vendor.

## 2. Repository findings

### 2.1 What already exists

The current application is substantially further along than the older `docs/SHOP_MANAGER_MIGRATION_STATUS.md` document suggests. The active native Shop Manager lives under `/workspace`; `/shop-manager` is currently used for product/pricing access rather than the main operating workspace.

| Existing capability | Verified repository surface | How the Repair Knowledge Network should use it |
|---|---|---|
| Shop dashboard and module navigation | `src/routes/_authenticated/workspace.index.tsx` | Add Repair Knowledge, Scan Reports, Recalls, and Procedure Review modules. |
| Shop-scoped database access | `src/lib/shop-manager/db.ts` | Continue using `shop_manager` for private shop transactions. Do not store global knowledge as duplicated per-shop data. |
| Work-order list and creation | `workspace.work-orders.tsx`, `workspace.work-orders.new.tsx` | Attach symptoms, DTCs, scan reports, procedures, recalls, and diagnostic plans to a work order. |
| Work-order detail | `workspace.work-orders.$id.tsx` | Primary technician integration point. It already contains complaint, diagnostic notes, job lines, parts, totals, vehicle, customer, and invoice generation. |
| Labour and job lines | `work_order_job_lines`, Shop Manager labour-rate settings | Use shop-entered hours and rates immediately; add community benchmark hours later. Do not label them OEM flat-rate times. |
| Technician time tracking | `src/components/shop-manager/work-order-time-entries.tsx` | Compare estimated, billed, and actual time to improve future 365 benchmark times. |
| Parts on work orders | `work_order_parts` and inventory routes | Link procedure steps and diagnostic results to required parts and network availability. |
| Quotes to work orders | `workspace.quotes.$id.tsx` | Preserve approved work and transfer selected knowledge/procedure links into the work order. |
| Work orders to invoices | `workspace.work-orders.$id.tsx` | Generate labour and parts invoice lines from the completed repair workflow. |
| Invoices and payments | `workspace.invoices.$id.tsx` | Preserve repair traceability and later support warranty/comeback analysis. |
| Digital vehicle inspections | `workspace.inspections*` and `work-order-inspections-card.tsx` | Link failed/attention inspection items directly to diagnostic plans and procedures. |
| Inspection photographs | Supabase `shop-inspections` bucket and `inspection_photos` | Keep customer/job photos private; allow a separate explicit contribution flow for reusable, consented media. |
| Customer vehicles and service history | `workspace.vehicles.$id.tsx` | Show applicable recalls, bulletins, common faults, procedures, and past repairs. |
| VIN and chassis decoding | `src/lib/vin-decode.functions.ts` | Reuse the existing NHTSA, WMI/VDS, JDM/chassis, and manual-fallback logic as the vehicle identity layer. |
| Inventory and invoice-from-stock | `workspace.inventory.tsx`, invoice inventory dialog | Match procedure-required parts to the shop and future cross-shop parts network. |
| Shop labour rates | `workspace.settings.tsx` | Calculate estimates from procedure hours without confusing the shop rate with an OEM labour-time database. |
| Service reminders and automation | `workspace.service-reminders.tsx`, `workspace.automation.tsx` | Generate future service reminders from completed procedures and maintenance intervals. |
| Realtime updates | `src/hooks/use-shop-realtime.ts` | Invalidate work-order and review queues when linked data changes. |
| Plans, subscriptions, checkout, and entitlements | Shop Manager plan, checkout, entitlement, pricing, and webhook files | Keep the initial knowledge MVP available to free shops; reserve advanced analytics/licensed data for future paid tiers. |
| Planned recall feature | `src/data/features-catalog.ts` | Convert the existing marketing promise into a real, source-backed feature. |
| Legacy automotive table names | `sm_tables.txt` includes `auto_dtc_codes`, `auto_recalls`, `auto_tsbs`, `repair_plans`, and maintenance tables | Treat these as legacy inventory only. No current schema, importer, source licence, populated dataset, or active UI was found for them. Validate before reusing. |

### 2.2 Major missing pieces

The repository does not yet provide a complete Repair Knowledge Network. The following are required:

- A shared, global repair-knowledge schema separated from private shop records.
- Source and licence tracking for every imported or contributed record.
- Government-data import jobs with refresh logs, deduplication, and failure handling.
- Recall and manufacturer-communication matching on vehicle/work-order pages.
- Structured DTC and scan-report storage.
- Procedure authoring, review, verification, publishing, revision, and withdrawal.
- Vehicle applicability rules covering year, make, model, engine, market, chassis, and VIN patterns.
- Diagnostic decision trees with test conditions, expected results, and next actions.
- Safety classification and mandatory warnings for brakes, steering, restraints, high voltage, fuel, lifting, programming, and other high-risk work.
- Contributor identity, qualifications, attribution, and content licence acceptance.
- Search across codes, symptoms, procedures, recalls, bulletins, vehicles, tools, and parts.
- Customer-visible views that expose only approved information and never private technician notes.
- A defined route for paid OEM/commercial data integrations later.

## 3. Best free foundation for 365

Free/open software and free/open data are different things. Open-source code can power the platform, but it does not grant rights to copyrighted OEM manuals.

### 3.1 Data sources to use first

| Source | Initial use | Cost | Storage approach | Important limitation |
|---|---|---:|---|---|
| [NHTSA vPIC](https://vpic.nhtsa.dot.gov/api/) | VIN decoding, manufacturer, model, body, engine and plant fields | Free | Continue current server-side decoding; cache normalized responses and source timestamps | Strongest for US/North-American 17-character VINs; it is not a repair-manual database. |
| [NHTSA recalls and datasets](https://www.nhtsa.gov/nhtsa-datasets-and-apis) | Recall campaigns and vehicle matching | Free | Scheduled import plus on-demand lookup; retain campaign ID and official source URL | Coverage is US-market oriented. VIN-level completion status may require an OEM-specific lookup. |
| [NHTSA manufacturer communications](https://www.nhtsa.gov/vehicle-manufacturers/manufacturer-communications) | Bulletin/communication metadata and links | Free access | Store searchable metadata and source links first; review document reuse rights before retaining full documents | Public availability does not automatically make every OEM document unrestricted for commercial republication. |
| [Transport Canada Vehicle Recalls Database](https://open.canada.ca/data/en/dataset/1ec92326-47ef-4110-b7ca-959fab03f96d) | Canadian recall campaigns | Free/open-government dataset | Scheduled import with the published dataset licence and source revision | Coverage is Canadian-market recalls, not repair procedures. |
| [EU Safety Gate](https://ec.europa.eu/safety-gate-alerts/) | European dangerous-product and vehicle alerts | Free access | Import only through an officially supported feed/export and record its reuse terms | Matching quality and vehicle detail vary by alert. |
| Shop-created operational data | Actual labour time, observed symptoms, fixes, comebacks, inspections and parts used | Existing product data | Keep private by default; aggregate/anonymize only with consent and a documented policy | A customer's repair record is not automatically reusable public content. |
| Original technician contributions | Procedures, diagnostic trees, photos, videos and tool notes | Contributor/review cost only | Store as versioned 365 content under an explicit contributor licence | Requires moderation, attribution, safety review, and plagiarism controls. |

### 3.2 Open-source software worth evaluating

| Project | Possible role | Licence/architecture note |
|---|---|---|
| [python-OBD](https://github.com/brendan-w/python-OBD) | Desktop/Raspberry Pi ELM327 communication prototype | GPL-2.0. It cannot connect a remote web server to a customer's car by itself. Review GPL implications and isolate it in a companion service if adopted. |
| [comma.ai OpenDBC](https://github.com/commaai/opendbc) | Research and decoding for supported CAN signals | MIT-licensed project, but coverage is vehicle-specific and it is not a repair manual. Validate every supported platform. |
| [LubeLogger](https://github.com/hargata/lubelog) | Reference for maintenance-history UX and self-hosted workflows | MIT. Use as design/architecture reference only where compatible; 365 already has its own vehicle and service-history system. |
| PostgreSQL full-text search | Initial knowledge search | Already compatible with Supabase. Use this before adding vector-search complexity. |
| Supabase Storage | Original diagrams, photos, attachments and contributor media | Already used by inspections. Use new buckets and policies for global knowledge media. |

### 3.3 What is not available as a legitimate comprehensive free source

Do not promise free comprehensive coverage for:

- OEM step-by-step service procedures.
- Complete wiring diagrams, connector views, and pinouts.
- Manufacturer scan-tool routines and programming files.
- Accurate OEM or commercial flat-rate labour times.
- Complete torque specifications and sequences.
- Special-tool instructions.
- Worldwide parts interchange and OEM catalogues.
- Manufacturer-specific DTC definitions and guided tests.

Random manual-download sites, copied PDFs, scraped subscription databases, and unattributed GitHub datasets must not enter the production database. A public URL is not proof of permission to redistribute commercially.

## 4. The opportunity: 365 Repair Knowledge Network

### 4.1 Product promise

> One vehicle record connects the customer's complaint, scan results, recalls, inspection evidence, diagnostic tests, repair procedure, required tools, parts availability, labour estimate, technician time, invoice, and future service reminders.

This is broader than an online manual. It joins technical knowledge to the transaction and parts network already being built by 365.

### 4.2 Network flywheel

1. A shop creates or selects a customer vehicle.
2. The existing VIN/chassis decoder identifies the vehicle and market as accurately as possible.
3. 365 checks official recall and manufacturer-communication sources.
4. A technician records symptoms, DTCs, freeze-frame/live values, and inspection findings.
5. Search returns applicable published procedures and diagnostic trees with confidence and source labels.
6. The technician follows or adapts a procedure, records test results, adds parts, and logs actual time.
7. The work order becomes a quote/invoice using the existing Shop Manager flow.
8. The shop may submit an original improvement or new procedure for review.
9. Qualified reviewers verify applicability, safety, originality, and technical correctness.
10. Published knowledge improves the next repair and can match parts across the future 365 partner network.

### 4.3 Commercial advantage

- Free Shop Manager adoption produces distribution without charging a data fee on day one.
- Verified technician knowledge becomes a defensible owned asset.
- Procedure-to-parts matching can generate marketplace margin and referral revenue.
- Tool, fluid, training, and parts suppliers can sponsor clearly labelled placements without controlling technical conclusions.
- Shops can later pay for advanced search, multi-location analytics, licensed OEM data, AI assistance, warranty analytics, and priority review.
- Contributors can earn reputation, subscription credits, referral revenue, fixed review payments, or a future content-revenue pool.

Advertising or supplier commissions must never change safety instructions, specifications, or the ranked diagnostic conclusion.

## 5. Architecture

### 5.1 Separation of concerns

Use two connected data domains:

| Domain | Purpose | Visibility |
|---|---|---|
| `shop_manager` | Customers, vehicles, work orders, private diagnostic notes, inspections, photos, job lines, parts, time, quotes, invoices and payments | Shop-scoped through existing membership/RLS rules |
| `repair_knowledge` | Published and reviewable shared sources, recalls, communications, procedures, steps, DTC knowledge, diagnostic trees, tools and vehicle applicability | Published reads across authorized users; controlled contributor/reviewer/admin writes |

Do not copy the full global knowledge record into every shop. Link it to the work order by immutable knowledge revision ID, then store the shop's execution notes and measured results privately.

### 5.2 Proposed database tables

Create a dedicated `repair_knowledge` schema after confirming that Lovable/Supabase exposes it through the generated types and API configuration.

#### Provenance and imports

| Table | Purpose | Essential fields |
|---|---|---|
| `sources` | Registry of government, licensed, contributor and internal sources | `id`, `name`, `source_type`, `base_url`, `licence_name`, `licence_url`, `commercial_reuse_allowed`, `full_text_storage_allowed`, `attribution_required`, `terms_reviewed_at`, `active` |
| `import_runs` | Audit scheduled/manual data refreshes | `id`, `source_id`, `started_at`, `finished_at`, `status`, `records_seen`, `inserted`, `updated`, `rejected`, `error_summary`, `source_version` |
| `source_records` | Preserve source identity and deduplicate updates | `id`, `source_id`, `external_id`, `record_type`, `source_url`, `source_published_at`, `source_updated_at`, `content_hash`, `raw_payload`, `last_seen_at` |

`raw_payload` must be disabled or redacted for sources whose terms permit only linking or derived metadata.

#### Vehicle identity and applicability

| Table | Purpose | Essential fields |
|---|---|---|
| `vehicle_platforms` | Normalized global vehicle/platform identity | `id`, `make`, `model`, `generation`, `platform_code`, `market`, `year_from`, `year_to` |
| `powertrains` | Engine, transmission, fuel/hybrid/EV variants | `id`, `platform_id`, `engine_code`, `engine_family`, `displacement`, `fuel_type`, `transmission_code`, `drive_type` |
| `applicability_rules` | Join knowledge to compatible vehicles | `id`, `knowledge_revision_id`, `platform_id`, `powertrain_id`, `market`, `vin_pattern`, `chassis_code`, `year_from`, `year_to`, `include_exclude`, `confidence`, `review_status` |

Never assume US make/model/year applicability equals a Philippines, Japanese, Chinese, Canadian, or European variant.

#### Knowledge content

| Table | Purpose | Essential fields |
|---|---|---|
| `knowledge_items` | Stable identity for a procedure, diagnostic tree, DTC article, specification note, recall or communication | `id`, `kind`, `slug`, `title`, `summary`, `safety_class`, `current_revision_id`, `visibility`, `status` |
| `knowledge_revisions` | Immutable versioned content | `id`, `knowledge_item_id`, `revision_number`, `source_id`, `author_id`, `body`, `change_summary`, `licence`, `review_status`, `published_at`, `supersedes_id` |
| `procedure_steps` | Ordered executable instructions | `id`, `revision_id`, `step_number`, `instruction`, `warning`, `expected_result`, `estimated_minutes`, `requires_verification` |
| `specifications` | Structured values with conditions | `id`, `revision_id`, `name`, `value_numeric`, `value_text`, `unit`, `condition`, `source_record_id`, `confidence` |
| `tools` | Tool and equipment catalogue | `id`, `name`, `tool_type`, `generic_or_special`, `manufacturer_number`, `substitute_notes` |
| `procedure_tools` | Tools required or recommended | `revision_id`, `tool_id`, `requirement`, `notes` |
| `knowledge_media` | Diagrams, photos and videos | `id`, `revision_id`, `storage_path`, `media_type`, `caption`, `copyright_owner`, `licence`, `consent_record_id` |

Torque, fluid, alignment, pressure, voltage, resistance, temperature, clearance, software version, and other specifications must be stored with units and operating conditions—not as unstructured numbers without context.

#### Diagnostics, recalls and scan reports

| Table | Purpose | Essential fields |
|---|---|---|
| `dtc_definitions` | Legally reusable or original DTC knowledge | `id`, `code`, `system`, `manufacturer_scope`, `title`, `description`, `source_id`, `review_status` |
| `diagnostic_trees` | Structured guided testing | `id`, `knowledge_item_id`, `entry_conditions`, `safety_class`, `revision_id` |
| `diagnostic_nodes` | Question/test/action/result nodes | `id`, `tree_id`, `node_type`, `instruction`, `measurement_type`, `unit`, `expected_min`, `expected_max`, `next_pass_id`, `next_fail_id` |
| `recalls` | Normalized campaign metadata | `id`, `source_record_id`, `campaign_number`, `manufacturer`, `title`, `risk`, `remedy`, `report_date`, `source_url` |
| `manufacturer_communications` | TSB/communication metadata and permitted content/link | `id`, `source_record_id`, `communication_number`, `title`, `summary`, `published_at`, `source_url`, `document_storage_allowed` |
| `scan_reports` | Shop-private scan session header | In `shop_manager`: `id`, `shop_id`, `work_order_id`, `vehicle_id`, `scanner`, `protocol`, `started_at`, `completed_at`, `raw_file_path`, `consent_status` |
| `scan_report_codes` | Codes recorded during a scan | In `shop_manager`: `scan_report_id`, `code`, `module`, `status`, `description_snapshot`, `freeze_frame` |
| `scan_report_pids` | Selected live/freeze-frame measurements | In `shop_manager`: `scan_report_id`, `pid`, `name`, `value`, `unit`, `captured_at`, `capture_type` |

Raw diagnostic uploads must remain private unless the shop/customer explicitly authorizes anonymized use.

#### Contribution and quality

| Table | Purpose | Essential fields |
|---|---|---|
| `contributors` | Technician profile and verification | `user_id`, `display_name`, `country`, `qualification_type`, `qualification_status`, `verified_at`, `reputation_score` |
| `contribution_agreements` | Evidence of rights granted to 365 | `id`, `user_id`, `version`, `accepted_at`, `ip_hash`, `licence_grant`, `warranty_of_originality` |
| `reviews` | Technical/editorial/safety review | `id`, `revision_id`, `reviewer_id`, `review_type`, `decision`, `findings`, `created_at` |
| `field_validations` | Real-world outcome signal | `id`, `revision_id`, `shop_id_hash`, `vehicle_platform_id`, `outcome`, `actual_hours`, `comeback_within_days`, `notes_redacted` |
| `content_reports` | Incorrect, unsafe, copied or outdated reports | `id`, `knowledge_item_id`, `reporter_id`, `reason`, `severity`, `status`, `resolution` |

### 5.3 Publication workflow

Use explicit states:

`draft → submitted → technical_review → safety_review (when required) → approved → published → superseded/withdrawn`

Publication rules:

- One qualified technical approval for ordinary low-risk content.
- Two independent qualified approvals for high-risk systems.
- Admin/legal review when the source or originality is uncertain.
- Automatic withdrawal flag when a linked official recall supersedes the advice or a serious safety report is received.
- Published revisions are immutable; corrections create a new revision.
- AI cannot approve content or fabricate missing specifications.

### 5.4 Safety classes

| Class | Examples | Minimum control |
|---|---|---|
| Low | Filters, bulbs, trim and basic maintenance | Technical review and normal warning display |
| Medium | Cooling, starting/charging, non-safety electronics | Technical review plus test-condition validation |
| High | Brakes, steering, suspension, airbags/SRS, fuel, lifting, wheels/tires, ADAS calibration | Two reviewers, prominent warnings, required specifications and post-repair verification |
| Restricted | High-voltage battery work, immobilizer/security programming, emissions defeat, dangerous bypasses | Verified-role access and jurisdiction/policy review; some content must not be published |

## 6. Shop Manager integration

### 6.1 New routes

| Route | Purpose | MVP status |
|---|---|---|
| `/workspace/repair-knowledge` | Search by VIN/vehicle, DTC, symptom, procedure, recall or bulletin | Build in MVP |
| `/workspace/repair-knowledge/$slug` | Published article/procedure with applicability and revision/source labels | Build in MVP |
| `/workspace/scan-reports` | List scan reports for the shop | MVP can start with manual/file import |
| `/workspace/scan-reports/new` | Create or upload a scan report and attach it to vehicle/work order | Build in MVP |
| `/workspace/recalls` | Shop-wide vehicles with possible recall matches | Build after first data importer |
| `/workspace/contribute` | Create original knowledge drafts | Phase 2 |
| `/workspace/review` | Qualified reviewer queue | Phase 2 |
| `/admin/repair-knowledge/sources` | Source/licence/import administration | Build with importer |
| `/admin/repair-knowledge/moderation` | Content, safety and copyright reports | Phase 2 |

### 6.2 Existing pages to extend

#### Work-order detail

Add a `RepairKnowledgeCard` to `workspace.work-orders.$id.tsx` showing:

- Vehicle identity and decode confidence.
- Possible official recalls and manufacturer communications.
- Recorded DTCs and scan reports.
- Suggested diagnostic trees based on complaint, DTC and vehicle.
- Attached procedure revision(s).
- Required tools, parts and safety class.
- Buttons: **Attach to work order**, **Start diagnostic**, **Add jobs/parts**, **Record result**, and **Suggest correction**.

The card must not automatically write AI-generated repairs into the invoice. A technician selects and confirms job/part lines.

#### Vehicle detail

Extend `workspace.vehicles.$id.tsx` with:

- Recall/communication panel.
- Knowledge search pre-filtered by decoded vehicle.
- Scan and DTC history.
- Procedure history and outcomes.
- Measurement trends from inspections and scans.
- Existing work-order service history remains the authoritative private record.

#### Digital inspection

For failed/attention items:

- Link to applicable diagnostic trees and procedures.
- Create a work-order job line with technician confirmation.
- Preserve the inspection photo as private evidence.
- Offer a separate consented contribution action rather than silently publishing customer media.

#### Parts and inventory

- Procedure-required parts should search local inventory first.
- Later query opted-in 365 partner stock.
- Preserve fitment confidence and do not claim compatibility from description text alone.
- Record which part was actually installed for validation and warranty tracking.

## 7. Zero-cost MVP

The zero-cost MVP should prove the closed loop from vehicle → knowledge → work order → result without pretending to have complete OEM coverage.

### 7.1 MVP scope

1. **Repair Knowledge schema and provenance**
   - Create sources, import runs, source records, knowledge items/revisions, applicability, procedure steps, recalls and communication metadata.
   - Add generated Supabase types and strict RLS.

2. **NHTSA integration**
   - Reuse the existing VIN decoder.
   - Add recall lookup/import with campaign/source links.
   - Add manufacturer-communication metadata lookup.
   - Cache results and show source/update timestamps.

3. **Transport Canada recalls**
   - Add a scheduled importer for the open dataset after recording its exact licence and attribution requirements in `sources`.

4. **Search**
   - PostgreSQL full-text search across title, summary, DTC, symptoms, procedures and official metadata.
   - Filters for vehicle, engine/chassis, market, knowledge type, safety class and verification state.

5. **Work-order integration**
   - Add the knowledge card to work-order detail.
   - Attach immutable knowledge revisions.
   - Convert selected procedure time/tasks to job lines only after technician confirmation.

6. **Vehicle integration**
   - Add possible recall and bulletin panels.
   - Clearly label a match as `possible`, `vehicle-level`, or `VIN-confirmed`.

7. **Scan-report MVP**
   - Manual entry and JSON/CSV upload first.
   - Store DTCs, modules, statuses and selected freeze-frame/live values.
   - Direct Bluetooth/USB scanning is a later companion-app project because a cloud web application cannot reliably access every scanner/vehicle across browsers and mobile platforms.

8. **Original starter content**
   - Publish a small, reviewed set of procedures written specifically for 365.
   - Start with common low/medium-risk jobs and diagnostic fundamentals.
   - Include applicability, tools, estimated time, specifications with sources, inspection checkpoints and post-repair verification.

9. **Basic contribution workflow**
   - Draft, submit, review, publish, supersede and report.
   - Verified technicians only for the initial pilot.

10. **Testing and monitoring**
    - Import idempotency tests.
    - RLS tests separating global published content, drafts/reviews and shop-private records.
    - Applicability matching tests.
    - Unit conversion tests.
    - Work-order attachment and revision-snapshot tests.

### 7.2 Explicit MVP exclusions

- No Chilton/Gale scraping or database mirroring.
- No promise of complete worldwide coverage.
- No unlicensed OEM manuals or diagrams.
- No AI-generated torque values, wiring, safety procedures or flat-rate times.
- No automatic diagnosis presented as certain.
- No direct vehicle programming, bidirectional controls, immobilizer work or ECU flashing.
- No automatic customer publication of private scan/inspection data.
- No parts-fitment guarantee until a fitment source and validation model exist.

### 7.3 Recommended MVP UI sequence

1. Open work order.
2. Confirm or manually correct decoded vehicle.
3. Display recall/communication matches with confidence labels.
4. Enter/import DTCs and scan data.
5. Search verified knowledge by complaint, DTC and vehicle.
6. Attach a specific procedure revision.
7. Select technician-confirmed labour tasks, tools and parts.
8. Perform inspection/diagnostic steps and record measurements.
9. Complete repair and log actual technician time.
10. Generate the invoice through the existing flow.
11. Create the next service reminder.
12. Optionally submit an original correction or outcome validation.

## 8. Delivery phases

### Phase 0 — validate the existing Shop Manager foundation

- Update `docs/SHOP_MANAGER_MIGRATION_STATUS.md` because its route progress is stale.
- Confirm current `shop_manager` table migrations, RLS policies, storage policies and generated types match production.
- Identify legacy tables that exist only in the old database/table snapshots.
- Fix inconsistent route references in feature copy (`/shop/*` vs active `/workspace/*`).
- Add automated smoke coverage for the work-order → inspection → invoice lifecycle.

**Exit condition:** the current Shop Manager foundation is reproducible from migrations and safe across two test shops.

### Phase 1 — legal data foundation

- Create the source/licence registry and import audit tables.
- Implement NHTSA recalls and manufacturer-communication metadata.
- Implement Transport Canada recall import.
- Add the shared vehicle-platform/applicability model.
- Seed only data whose reuse rights have been reviewed.

**Exit condition:** one vehicle can show traceable, timestamped official-source matches without copied subscription content.

### Phase 2 — knowledge MVP inside work orders

- Build global search and knowledge detail routes.
- Add work-order and vehicle knowledge panels.
- Add manual/CSV/JSON scan reports.
- Add knowledge attachments and revision snapshots.
- Convert technician-selected steps into job lines and required parts.

**Exit condition:** a technician can move from complaint/DTC to an attached verified procedure and complete the existing invoice flow.

### Phase 3 — contributor network

- Contributor agreement and qualification verification.
- Procedure editor, applicability builder, review queue and safety workflow.
- Reputation, field validation, correction and withdrawal systems.
- Original media contribution with copyright/consent records.

**Exit condition:** 365 can publish original, reviewed, attributable content with a complete audit trail.

### Phase 4 — OBD companion and measurement intelligence

- Choose supported adapter families and protocols.
- Build a Windows/Android companion or local bridge for scanner communication.
- Import generic OBD-II codes, freeze frame and selected PIDs.
- Add explicit user consent, encryption, device pairing and raw-file retention rules.
- Keep bidirectional tests/programming outside scope until safety, device and licensing requirements are satisfied.

**Exit condition:** a supported device can reliably create a normalized scan report attached to the correct vehicle and work order.

### Phase 5 — commercial data and monetization

- Request commercial API/data-feed terms from Gale/Cengage, MOTOR, HaynesPro, TecAlliance and relevant OEMs.
- Add providers through adapters so one vendor can be replaced without rewriting Shop Manager.
- Gate licensed content according to provider territory, user, display, storage and retention rules.
- Add advanced analytics, licensed coverage, multi-location benchmarking and contributor rewards to paid tiers.

**Exit condition:** licensed data adds value without contaminating or controlling 365-owned knowledge.

## 9. Initial implementation backlog

### P0 — required before feature work

- [ ] Reconcile migration status with the current `/workspace` routes.
- [ ] Confirm production schema and RLS for all current work-order, inspection, time, parts, quote, invoice and vehicle tables.
- [ ] Add a documented data-rights policy: allowed, link-only, metadata-only and prohibited sources.
- [ ] Add terminology rule: `shop estimate`, `365 community benchmark`, and `licensed flat-rate time` must never be mixed.

### P1 — first usable release

- [ ] Migration: `repair_knowledge` provenance, vehicle applicability, knowledge revision, recall and communication tables.
- [ ] Migration: Shop Manager scan-report and knowledge-attachment tables.
- [ ] Supabase grants/RLS/storage policies and generated TypeScript types.
- [ ] NHTSA recall/communication server adapters with cache and rate/error handling.
- [ ] Transport Canada importer with licence attribution.
- [ ] Full-text search service and `/workspace/repair-knowledge` route.
- [ ] Knowledge detail page with sources, applicability, revision and safety labels.
- [ ] Work-order `RepairKnowledgeCard`.
- [ ] Vehicle recall/knowledge panel.
- [ ] Manual scan-report entry and structured upload.
- [ ] Admin source/import health page.
- [ ] Seed reviewed 365-original procedures.
- [ ] RLS, import, matching and work-order integration tests.

### P2 — network growth

- [ ] Contributor agreement and verified-technician profile.
- [ ] Procedure/diagnostic-tree editor.
- [ ] Reviewer queue and safety-class routing.
- [ ] Original-media contribution flow.
- [ ] Outcome validation and comeback feedback.
- [ ] Procedure-to-inventory and cross-shop parts matching.
- [ ] Contributor reputation and reward rules.

### P3 — later integrations

- [ ] Android/Windows OBD companion proof of concept.
- [ ] Paid repair-data provider adapter interface.
- [ ] OEM/commercial data contract administration.
- [ ] Advanced search/AI limited to owned, open or specifically licensed content.
- [ ] Multi-shop anonymized labour/outcome benchmarks with minimum cohort/privacy thresholds.

## 10. Definition of done for every knowledge source

A source is not production-ready until all answers are recorded:

- Who owns the data/content?
- What exact licence or contract permits 365 to use it?
- Is commercial use allowed?
- May 365 store full text/files, or only metadata and links?
- Is modification, translation, summarization, indexing or AI processing allowed?
- What attribution is mandatory?
- What territories and user types are permitted?
- What update/deletion obligations apply?
- How will the importer detect changes and removals?
- Who approved the source and when must it be reviewed again?

## 11. Definition of done for every published procedure

- Vehicle and powertrain applicability is explicit.
- Source and contributor rights are documented.
- The content has an immutable revision and change history.
- Tools, parts, consumables and safety equipment are identified.
- Specifications include units, conditions and provenance.
- High-risk steps carry prominent warnings.
- Post-repair verification is included.
- Required reviewer approvals are complete.
- Search keywords and symptom/DTC links are present.
- The procedure can be attached to a work order without exposing other shops' private data.
- A correction, report, supersede and withdrawal path exists.

## 12. Key product rules

1. **No source, no specification.** A critical value without provenance is not published.
2. **AI assists; technicians decide.** AI may organize permitted information, but it cannot invent specifications or certify a repair.
3. **Private by default.** Customer, scan, inspection and shop records do not become network content automatically.
4. **Revision-pinned work orders.** A completed job always records the exact procedure revision used.
5. **Global knowledge, shop-local execution.** Shared content is not duplicated into each shop's database.
6. **Applicability is a claim requiring evidence.** Similar-looking vehicles are not assumed identical across markets.
7. **Commercial content stays isolated.** Provider-specific storage, display and expiry rules are enforced by the adapter and entitlement layer.
8. **Safety overrides monetization.** Advertising, affiliate revenue and parts availability never alter technical conclusions.

## 13. Recommended first build slice

The first engineering slice should be deliberately narrow:

1. Create `repair_knowledge.sources`, `source_records`, `import_runs`, `recalls`, `manufacturer_communications`, `knowledge_items`, `knowledge_revisions`, `applicability_rules`, and `procedure_steps`.
2. Create `shop_manager.scan_reports`, `scan_report_codes`, and `work_order_knowledge_links`.
3. Add NHTSA recall matching to the existing vehicle detail page.
4. Add a work-order Repair Knowledge card supporting manual DTC entry and procedure attachment.
5. Seed 10–20 original, fully reviewed 365 procedures rather than importing questionable material.
6. Test the complete flow on two shops and multiple vehicle markets.

This slice creates real customer value, remains within a near-zero data budget, and establishes the legal/technical foundation needed before larger imports or AI search are attempted.
