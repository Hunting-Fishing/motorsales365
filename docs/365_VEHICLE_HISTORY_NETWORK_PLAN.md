# 365 Vehicle History Network

**Repository:** `Hunting-Fishing/motorsales365`  
**Primary launch market:** Philippines  
**Expansion:** Asia-Pacific first, followed by Europe and North America  
**Primary integration surfaces:** Shop Manager, Repair Knowledge Network, Parts Network, Scan Companion, Marketplace and Export  
**Status:** Product, data, government-partnership and implementation plan  
**Prepared:** 2026-08-06

## 1. Executive decision

365 should build a new first-class platform capability called the **365 Vehicle History Network**.

This should not be marketed merely as a Philippine copy of CARFAX. The stronger and more defensible product is an evidence-based vehicle lifecycle network that can combine:

- authoritative registration and status verification when a government partner permits it;
- insurance, total-loss and damage events;
- theft, recovery and identity-alert status from authorized law-enforcement sources;
- Shop Manager repair orders, inspections, estimates, invoices and technician records;
- exact parts purchased, installed, removed, warrantied and replaced;
- diagnostic pre-scans and post-scans linked to the repair order;
- odometer, engine-hour and component-hour observations;
- dealer, auction, import, customs, export and ownership-transfer events;
- recalls, campaigns and verified service completion;
- owner-submitted documents and maintenance evidence; and
- independent inspections and current-condition reports.

The launch cannot depend on receiving LTO data. 365 can immediately create useful, verified service, parts, inspection and diagnostic history through Shop Manager and the Parts Network. LTO, PNP-HPG, the Insurance Commission, insurers, inspection centres, importers and other partners are later authoritative layers.

### 1.1 Market conclusion

Global VIN-report websites can decode some Philippine vehicles or return records from an overseas source market. Philippine buyers can also perform separate LTO, HPG, document, inspection and dealer checks. Current research did not identify a national Philippine consumer service that already combines local registration status, insurance events, odometer observations, workshop repairs, installed-part provenance, scans and export history into one continuing report.

That is a real market opening, but 365 must not claim that no competitor exists or that a report is complete. Every report must state the jurisdictions and sources searched, the date searched and the gaps that remain.

South Korea demonstrates that an Asian insurance-history model is viable: the Korea Insurance Development Institute's CarHistory service uses insurance accident information for the public benefit and warns that unreported or uninsured events are not included. Singapore's LTA OneMotoring also provides authenticated ownership, inspection and vehicle-transaction services. These are useful models for government and insurer discussions, not data that 365 may copy without an agreement.

### 1.2 Product positioning

Recommended public name:

> **365 Verified Vehicle History**  
> Know what happened. Know what was installed. Know who verified it.

Recommended government/partner name:

> **365 Vehicle History and Roadworthiness Network**

The consumer product sells confidence in a used vehicle. The partner proposal emphasizes road safety, fraud reduction, stolen/cloned-vehicle detection, odometer integrity, total-loss disclosure, repair traceability, recall completion, correct transfer of ownership and higher-quality national fleet data.

## 2. Relationship to existing 365 products

The Vehicle History Network is a shared trust and reporting service. It is not a replacement for the four independently purchasable repair modules in the [365 Repair Knowledge Network](./365_REPAIR_KNOWLEDGE_NETWORK_PLAN.md).

| Existing product | Contribution to vehicle history | Boundary |
|---|---|---|
| Shop Manager Core | Customers, service assets, ROs, inspections, job lines, parts, technician time, estimates, invoices, payments and files | Private operational records remain shop-scoped; only approved history assertions enter the network |
| Automotive Repair | Automotive procedures, diagnostics, recalls and repair applicability | Does not unlock Motorcycle, Heavy Truck or Marine content |
| Motorcycle & Powersports | Frame/engine identity, motorcycle repair and inspection events | First-class history domain; no forced 17-character VIN |
| Heavy Truck & Fleet | Chassis plus engine/transmission/axle/brake/aftertreatment/trailer history | First-class history domain; component changes are preserved separately |
| Marine & Watercraft | Vessel, engine, drive, generator and onboard-system lifecycle | Future Vessel History report; not represented as an automobile |
| Parts Network | Purchase, supplier, fitment, inventory, shipment, return and warranty evidence | A purchased part is not treated as installed until an installation event is completed |
| 365 Scan Companion | VIN/identity observation, DTCs, readiness, freeze frame, live-data evidence and pre/post comparisons | A scan is an observation, not proof that a repair was performed |
| Marketplace | Seller disclosure, listing identity, buyer report and verified-history badge | Listing access never exposes private owner or shop data |
| Export Network | Origin-market records, customs/shipping, inspections and destination handoff | Each jurisdiction and source remains separately attributed |

### 2.1 Product/module decision

Add one shared product capability:

- `vehicle_history_network` — reporting, history events, contributor feeds, consent, disputes and partner integrations.

It may be bundled with any repair module but does not merge their technical data. An Automotive, Motorcycle or Heavy Truck report is resolved through that domain's identity model. Marine later uses a separately branded Vessel History report on the same event infrastructure.

## 3. Defensible differentiator: the installed-parts lifecycle

Other history and maintenance products may show that a service occurred or that a component was replaced. 365 should not claim to be the first service ever to record parts. The defensible difference is the **depth, provenance and lifecycle** of the installed part or major component.

### 3.1 Separate purchase, installation and removal

These are different events:

1. **Purchased** — the part was ordered or invoiced.
2. **Received** — the shop or customer received it.
3. **Allocated** — it was reserved for a vehicle/RO.
4. **Installed** — a technician confirms installation on a specific asset at a specific mileage/date.
5. **Verified** — evidence and/or a post-repair test confirms the completed operation.
6. **Removed** — the part left the vehicle and the reason is recorded.
7. **Returned/core returned** — the purchased or removed part was returned to the supplier.
8. **Warranty claim** — the part or installation entered a warranty process.
9. **Replaced/superseded** — a later part instance takes its installed position.

A parts invoice alone must never create an `installed` history statement.

### 3.2 Part-instance record

Capture whenever available:

- 365 part-instance ID;
- supplier and seller;
- manufacturer and brand;
- supplier SKU and manufacturer part number;
- OE number and validated interchange references;
- GTIN/GS1 barcode;
- serial number, lot/batch and date code;
- new, used, remanufactured, rebuilt or customer-supplied condition;
- source vehicle for used parts, when lawful and known;
- purchase and invoice reference;
- ordered, received and installed dates;
- install odometer, engine hours or operating hours;
- installed position, system and parent component;
- fitting vehicle identity and fitment confidence;
- installing shop, technician and RO;
- installation photos and retained labels/packaging evidence;
- labour operation and procedure revision used;
- torque/test/calibration/post-scan evidence where appropriate;
- part and labour warranty terms;
- removal date, reading, condition and reason;
- failure analysis, comeback and warranty outcome;
- core return, disposal or reuse status; and
- provenance, verification status and visibility.

### 3.3 Major replaceable components

Engines, transmissions, hybrid/EV batteries, differentials, axles, ECUs, odometer clusters, truck aftertreatment units, motorcycle engines and other identity-relevant components need their own component instances and histories.

A change of engine, frame/chassis, body, cluster or other regulated identity component must trigger a legal-document workflow. 365 records the observation and documents; it never presents the change as officially accepted until the relevant authority confirms it.

## 4. What the customer report contains

### 4.1 Report sections

1. **Identity summary**
   - VIN/chassis/frame and masked display;
   - plate and market identifiers where allowed;
   - make/model/year/variant, engine and transmission;
   - identity-match conflicts or changed-component alerts.
2. **Official status checks**
   - sources queried, timestamp and response status;
   - registration/transfer/official flags only when lawfully supplied;
   - no owner name, address or contact details.
3. **Mileage and usage timeline**
   - odometer, engine hours and source;
   - rollback/inconsistency indicators, not unsupported accusations.
4. **Damage, insurance and total-loss history**
   - event category, date range, severity/repair status when supplied;
   - source limits clearly stated.
5. **Inspection history**
   - official and independent inspections separated;
   - pass/fail/advisory summary and evidence access rules.
6. **Service and repair timeline**
   - service date, mileage, high-level operation and contributing shop status;
   - private notes, customer complaint text and pricing hidden by default.
7. **Installed parts and component lifecycle**
   - exact verified parts and major assemblies where permitted;
   - warranty and replacement/removal state.
8. **Diagnostic history**
   - pre/post-scan summary, systems scanned and unresolved/new faults;
   - security-sensitive data and raw frames restricted.
9. **Recall/campaign history**
   - applicable, open, completed or unknown with authoritative source.
10. **Listing, auction, import/export and custody events**
   - attributed source, date, mileage and documents/photos where licensed.
11. **Report limitations**
   - coverage by source/jurisdiction;
   - unreported events may be absent;
   - report does not replace physical inspection or official verification.

### 4.2 Four visibility classes

| Class | Example | Access |
|---|---|---|
| Public report | Verified service category, mileage observation, installed part summary, total-loss flag | Report purchaser or authorized listing viewer |
| Owner/shared report | Detailed invoice, photos, scan results, warranty documents | Current owner and people the owner explicitly shares with |
| Shop-private | Customer details, technician notes, costs/margins, internal diagnosis and supplier pricing | Originating shop and authorized staff |
| Restricted authority | Owner identity, sensitive government fields, theft investigation detail and regulator-only information | Authorized agency/role only under the governing agreement |

No public consumer report should display previous-owner names, addresses, telephone numbers, email, government ID, finance account, payment data, exact home/work location, immobilizer/security secrets or unredacted registration documents.

## 5. Vehicle identity for the Philippines and Asia

Do not make a 17-character VIN the only key. Philippine and Asian fleets include non-standard or older identities, JDM chassis codes, motorcycles, changed engines and locally assembled/imported units.

### 5.1 Supported identifiers

- VIN;
- chassis number;
- motorcycle frame number;
- engine number;
- plate number and plate history;
- MV file number;
- conduction sticker;
- CR number and OR transaction reference;
- manufacturer model/frame code;
- body, cab and trailer identifiers;
- customs/import declaration references;
- auction, dealer and fleet identifiers; and
- component serial numbers.

Sensitive and fraud-enabling identifiers are encrypted and masked. They may be searchable only by authorized roles and cannot all be displayed together on a consumer report.

### 5.2 Identity observations, not blind overwrites

Every source creates an identity assertion containing:

- value and identifier type;
- issuing/source organization;
- country and market;
- observed date and effective date;
- evidence/photo/document reference;
- verification method;
- confidence and dispute state; and
- the user/system that created it.

A new plate, engine or registration value does not overwrite the old value. It creates an auditable timeline and, when necessary, an identity-conflict review.

### 5.3 Match levels

- `official_exact` — confirmed by an authorized government/OEM response;
- `verified_exact` — exact identifiers plus acceptable evidence reviewed by 365/verified partner;
- `source_asserted` — supplied by a known partner but not independently confirmed;
- `owner_asserted` — supplied by the owner with or without evidence;
- `possible_match` — requires human review and is never merged automatically;
- `conflict` — contradictory identity values;
- `rejected` — proven not to represent the asset.

## 6. Event and evidence architecture

History must be event-based and append-only at the audit layer. Corrections supersede a false assertion; they do not silently rewrite the past. Personal data may still need to be deleted, restricted or pseudonymized under law.

### 6.1 Core history assertion

Each event records:

- event ID and domain module;
- service asset and relevant component instance;
- event type and event time/date range;
- odometer/hours plus units and reading status;
- source organization, source system and source record ID;
- source type and verification tier;
- facts asserted in structured fields;
- public summary separated from restricted payload;
- evidence and cryptographic hash;
- contributor and reviewer;
- consent/lawful-basis record;
- visibility and retention policy;
- correction, dispute and supersession links; and
- ingestion, signing and publication timestamps.

### 6.2 Source/verification labels

Every visible event must use a label such as:

- Government verified
- Law-enforcement status check
- Insurer reported
- Inspection-centre verified
- Dealer/OEM reported
- 365 Shop Manager verified
- Parts-network verified purchase
- Technician confirmed installation
- Diagnostic-device captured
- Auction/import source
- Owner submitted with evidence
- Owner submitted, unverified
- Inferred risk indicator — not proof

No AI-generated event can be labeled verified. AI may extract fields from documents, but a source image and human or authoritative validation remain attached.

## 7. Shop Manager capture workflow

### 7.1 Check-in

1. Select or create the customer and service asset.
2. Scan VIN/chassis/frame/engine/plate and capture prescribed photos.
3. Decode and compare with stored identity.
4. Create an identity conflict if values disagree; do not silently merge.
5. Record odometer/hours with instrument-cluster image and reading status.
6. Create or select the RO.
7. Capture the customer's history/privacy choice and any authorization for sharing.

### 7.2 Diagnosis and estimate

- Attach complaint, inspection and pre-scan to the private RO.
- Convert verified diagnostic findings into recommended operations.
- Record parts quoted separately from parts purchased or installed.
- Pin the repair procedure and labour-time source used.

### 7.3 Parts purchase and installation

- Import purchases from the 365 Parts Network, supplier API, barcode/QR scan or reviewed invoice extraction.
- Allocate a purchased part to the RO.
- Technician confirms exact part/position and condition at installation.
- Require additional evidence for identity/safety-critical components.
- Complete post-repair test/scan and warranty data.
- Create the public-safe installation summary only after completion.

### 7.4 Close and publish

- Show the shop which facts will enter the history network.
- Separate required operational processing from optional public sharing.
- Customer receives a digital repair packet and may claim the vehicle profile.
- A signed event batch is sent to the history service.
- Corrections remain possible through an auditable dispute workflow.

## 8. Partner and contributor network

| Partner | Data 365 requests | Value 365 offers | Initial access form |
|---|---|---|---|
| LTO | Minimal vehicle identity/status confirmation, registration/transfer/change events and available odometer/inspection fields | Consumer fraud reduction, roadworthiness evidence, verified repair/odometer observations and safer transfer workflow | Non-exclusive pilot MOA plus DSA and controlled API/status response |
| PNP-HPG | Authorized stolen/alarmed/recovered or identity-conflict status | Better pre-sale warnings, qualified leads for verification, evidence-preserving audit | Status-only verification; no investigative detail in public reports |
| Insurance Commission | Policy-approved total-loss categories, reporting standard and industry participation path | Total-loss disclosure, repair traceability and standardized digital reporting | Regulatory/industry pilot and data standard |
| Insurers/adjusters | Claim/damage/total-loss/repair event and approved photos | Fraud controls, repair evidence, parts traceability, valuation and claims workflow | Insurer feed under DSA and purpose limits |
| PMVIC/PETC and inspection centres | Inspection date/result, advisories, readings and verified identity | Appointment/referral channel, digital inspection history and fraud controls | Signed API/batch feed |
| OEM dealers/importers | Warranty service, recall completion, campaigns, mileage and major component replacement | Owner engagement, genuine-parts traceability, recall leads | OEM-approved feed or business API |
| Independent repair shops | RO service summary, mileage, parts and technician installation events | Shop Manager, customer retention, verified-shop badge and report credits | Native Shop Manager event publication |
| Parts distributors/retailers | Purchase, GTIN/part number, warranty, shipment and return | Sales channel, fitment feedback and warranty evidence | Parts Network/order API |
| Diagnostic providers | Signed scan reports and tool/device identity | RO integration and provider marketplace access | SDK/API/export partnership |
| Banks/lenders/fleets | Encumbrance/repossession/fleet-maintenance status where lawful | Valuation, collateral condition, recovery and maintenance compliance | Consent-based or contract/regulator-approved feed |
| Auctions/importers/exporters | Auction condition, mileage, photos, origin/destination and shipment events | Buyer trust, export package and sales conversion | Licensed report/API/feed |
| Owners | Receipts, maintenance, DIY work, documents and correction evidence | Free vehicle vault, reminders, resale badge and report discount | Explicit upload and granular sharing controls |

## 9. LTO partnership strategy

### 9.1 The public-interest case

The proposal should lead with outcomes LTO is responsible for, not with 365's desire to sell reports:

- reduce VIN/chassis/engine/plate mismatches and cloned-vehicle fraud;
- help buyers verify status before payment;
- improve transfer-of-ownership completion;
- identify odometer inconsistencies at repeated verified events;
- improve disclosure of material total-loss and rebuild history;
- increase recall and safety-campaign completion;
- preserve evidence for engine/chassis/component changes;
- provide repair and inspection traceability without exposing owner identities; and
- create higher-quality, consented lifecycle observations for policy and road-safety analysis.

LTO has already used data-sharing/interconnectivity agreements with other government bodies and LGUs. This demonstrates that controlled verification facilities are possible, but it does not guarantee that a private commercial platform will receive access. 365 must propose a public-service pilot with data minimization and allow LTO to retain technical control of online access.

### 9.2 Minimum viable LTO data request

Ask first for a **status/verification response**, not a copy of the registry:

- whether submitted identifiers match one LTO vehicle record;
- non-personal vehicle descriptors required to prevent false matches;
- registration status and last status date, if approved;
- plate/vehicle identifier consistency;
- recorded engine/chassis change status, if approved;
- transfer pending/completed indicator, if approved;
- inspection/emission/odometer observations only if lawfully available and reliable;
- official hold/alert category only when lawful for consumer display; and
- response code, source timestamp and expiry.

Do not request owner names, addresses, contact details, ID numbers or scanned registration records for a consumer report.

### 9.3 What 365 can return to LTO

Subject to consent, law and the final agreement:

- verified odometer observations with evidence tier;
- identity conflicts observed during shop check-in;
- major regulated component-change documentation packages;
- standardized inspection/repair completion summaries;
- recall/campaign completion evidence from approved sources;
- aggregated, de-identified safety and repair trends; and
- audit trails for verification queries and suspected abuse.

365 should not promise LTO raw customer invoices, private complaints, diagnostic notes or complete personal profiles.

### 9.4 Required legal/technical instruments

1. Formal concept note and request for an exploratory technical/legal meeting.
2. Philippine contracting entity and authorized signatory.
3. Data Protection Officer and NPC registration/compliance review.
4. Data inventory, data-flow diagram and privacy impact assessment.
5. Purpose, lawful-basis and consumer-notice analysis.
6. Non-exclusive pilot MOA/MOU as LTO and counsel determine.
7. Data Sharing Agreement compliant with the Data Privacy Act and NPC rules, including NPC Circular 2020-03 and any later applicable guidance.
8. Security architecture, incident response, breach notification, retention and destruction schedule.
9. Controlled middleware/API specification with LTO retaining control of online access.
10. Service levels, query logging, audit rights and suspension/termination controls.
11. Consumer correction, complaint and appeal path.
12. Commercial-use, fee and public-display approval stated expressly; never inferred.

Government data cannot be treated as 365 property. The contract must distinguish LTO-originated verification from 365-owned or partner-licensed events. Report revenue should initially be justified by 365's aggregation, evidence, workflow and privately sourced data—not by reselling personal government records.

### 9.5 Offices/roles to include

Use role-based recipients so the pack does not become stale when officials change:

- LTO Office of the Assistant Secretary;
- Office of the Executive Director;
- Management Information Division / system owner;
- Vehicle Registration Division;
- Law Enforcement Service;
- Legal Service;
- LTO Data Protection Officer;
- relevant pilot Regional Office(s); and
- Department of Transportation legal/data/ICT officials if LTO directs escalation.

Parallel consultation:

- National Privacy Commission for privacy/DSA guidance;
- PNP Highway Patrol Group for stolen/alarmed/identity verification;
- Insurance Commission and Philippine insurer industry representatives for total-loss and claim events; and
- DTI consumer-protection stakeholders for used-vehicle disclosure and complaint handling.

### 9.6 Proposed pilot

**Stage A — 365-only data pilot (no government access)**

- 5–10 verified shops in two or three Philippine regions;
- 1,000–5,000 service assets;
- six months;
- identity/photo/odometer capture at check-in;
- ROs, inspections, parts installations and pre/post scans;
- owner claim/share and buyer report beta;
- measured dispute, duplicate and mismatch rates.

**Stage B — controlled LTO verification pilot**

- the same or a regulator-approved subset of assets;
- consented or otherwise lawfully authorized queries only;
- status-only responses through LTO-controlled middleware;
- no bulk registry copy;
- strict per-user purpose, role, rate and audit controls;
- independent privacy/security review before launch.

Pilot success measures:

- exact identity-match rate;
- duplicate/false-merge rate;
- registration/identifier conflicts found and correctly resolved;
- transfer-completion uplift;
- odometer inconsistencies detected and adjudicated;
- critical events with sufficient evidence;
- consumer disputes per 1,000 reports and resolution time;
- partner/shop event timeliness;
- unauthorized-access attempts blocked; and
- buyer/shop satisfaction without privacy complaints.

## 10. Insurance, total-loss and damage history

Philippine insurers already have regulatory reporting around motor vehicles declared total loss, including restorable, unrestorable and subrogation-related categories. This makes the Insurance Commission and participating insurers essential partners.

### 10.1 Requested event standard

- vehicle identity and identity confidence;
- insurer/adjuster source;
- loss date or range;
- claim type;
- damage category and affected systems;
- flood/fire/theft/collision/other indicator;
- airbag deployment when known;
- total-loss category and effective status;
- repairable/restorable status as officially defined;
- settlement/subrogation/salvage disposition state;
- inspection/repair evidence references;
- event update/correction/cancellation; and
- consumer-display permissions.

Claim amount, policyholder identity and private claim documents must not be public by default. A damage event must never identify or imply fault unless an authorized source expressly provides a lawful final determination.

### 10.2 Partner sequence

1. Seek Insurance Commission guidance on a standardized, privacy-minimized vehicle-event feed.
2. Approach insurer associations and three willing motor insurers/adjusters.
3. Start with total-loss and major-claim status, not entire claim files.
4. Use the 365 repair/parts/inspection packet to demonstrate insurer value.
5. Add digital warranty and repair-quality feedback after the event standard is stable.

## 11. Privacy, fairness and report integrity

### 11.1 Minimum compliance position

- Appoint a DPO and determine NPC registration obligations before public beta.
- Maintain separate privacy notices for owners, buyers, shops, technicians and partner feeds.
- Complete privacy impact assessments for the history network, government checks, diagnostics and document extraction.
- Record the lawful basis and permitted uses per source/event.
- Use granular consent where consent is the basis; do not bundle unrelated marketing permission.
- Provide access, correction, objection and complaint routes.
- Minimize public fields and separate identity/person data from vehicle facts.
- Encrypt high-risk identifiers and evidence at rest and in transit.
- Apply role-, tenant-, source-, purpose- and jurisdiction-aware access controls.
- Define retention and secure deletion/pseudonymization schedules.
- Document cross-border processing and prevent unauthorized regional replication.
- Maintain an incident-response and notification plan.

### 11.2 Fairness protections

- Report only what the source actually asserts.
- Distinguish `no record found` from `event did not happen`.
- Show source limitations and last-update time.
- Never infer accident, flood or neglect from a single weak signal.
- Do not publish owner or driver blame.
- Let shops, owners, insurers and agencies submit evidence-backed disputes.
- Preserve the original assertion, correction and final resolution internally.
- Suppress a materially disputed consumer statement while urgent review is pending when fairness requires it.
- Never sell a shop or seller the ability to delete accurate negative events.
- Do not rank shops by how few negative events they report; that would reward under-reporting.

### 11.3 Security controls

- immutable audit log and event hashes;
- signed partner submissions and rotating credentials;
- MFA for privileged users;
- short-lived report links and watermarking;
- anti-scraping and rate limits;
- bulk-export disabled by default;
- secrets isolated from Supabase client code;
- row-level security and server-side authorization tests;
- source-specific data-loss-prevention rules;
- regular access review and penetration testing; and
- abuse monitoring for vehicle stalking, title fraud and identity enumeration.

A blockchain is not required for the MVP. Cryptographic hashes, signatures, append-only event revisions, secure backups and audit logs provide the needed integrity with less complexity.

## 12. Proposed data model

Use a dedicated `vehicle_history` schema for shared history and retain private operations in `shop_manager`.

### 12.1 Identity and access

- `service_assets` — shared asset kernel reference;
- `asset_identifiers`;
- `asset_identifier_assertions`;
- `asset_identity_conflicts`;
- `asset_identity_reviews`;
- `asset_custody_claims`;
- `asset_owner_share_grants`;
- `history_report_permissions`;
- `consent_and_lawful_basis_records`.

### 12.2 Sources and events

- `history_sources`;
- `source_organizations`;
- `source_agreements`;
- `source_field_policies`;
- `source_ingestion_runs`;
- `history_events`;
- `history_event_assertions`;
- `history_event_evidence`;
- `history_event_visibility`;
- `history_event_signatures`;
- `history_event_disputes`;
- `history_event_corrections`;
- `history_event_supersessions`.

### 12.3 Usage and readings

- `odometer_hour_observations`;
- `reading_inconsistency_flags`;
- `inspection_events`;
- `registration_status_checks`;
- `law_enforcement_status_checks`;
- `insurance_loss_events`;
- `ownership_transfer_events`;
- `auction_listing_events`;
- `import_export_events`.

### 12.4 Parts and components

- `component_instances`;
- `component_identifiers`;
- `part_purchase_events`;
- `part_allocation_events`;
- `part_installation_events`;
- `part_removal_events`;
- `component_position_history`;
- `component_warranties`;
- `component_warranty_claims`;
- `component_failure_findings`;
- `component_core_returns`.

### 12.5 Reports and commercial use

- `history_report_products`;
- `history_report_orders`;
- `history_report_snapshots`;
- `history_report_source_coverage`;
- `history_report_disclaimers`;
- `listing_history_badges`;
- `partner_api_clients`;
- `partner_api_usage_events`.

### 12.6 Required links to existing Shop Manager

Every eligible event should retain foreign-key or immutable external references to:

- `shop_id`;
- `customer_vehicle/service_asset_id`;
- `work_order_id` and RO number;
- inspection and scan report;
- job/labour line;
- work-order part and inventory transaction;
- invoice and source document;
- technician/user; and
- exact procedure/data revision used.

## 13. Service/API design

### 13.1 Core services

- Identity Resolution Service
- History Event Ingestion Service
- Evidence and Document Service
- Consent/Sharing Service
- Partner Adapter Service
- Odometer and Conflict Detection Service
- Report Assembly Service
- Dispute/Correction Service
- Source Coverage and Freshness Service
- Partner Billing/Usage Service

### 13.2 Provider-independent adapter

```ts
interface VehicleHistoryProvider {
  providerKey: string;
  countryCodes: string[];
  capabilities: HistoryCapability[];
  verifyIdentity(input: IdentityQuery): Promise<IdentityResult>;
  fetchEvents(input: HistoryQuery): Promise<ProviderEventBatch>;
  fetchEventUpdate?(sourceRecordId: string): Promise<ProviderEventUpdate>;
}
```

The adapter must preserve the raw provider response in restricted storage when permitted, normalize only approved fields, attach the agreement/licence version and prevent display of disallowed fields.

### 13.3 Initial endpoints

- `POST /api/history/identity-observations`
- `POST /api/history/event-batches`
- `POST /api/history/parts/installations`
- `POST /api/history/scans/attach`
- `POST /api/history/reports/preview`
- `POST /api/history/reports/purchase`
- `GET /api/history/reports/{reportId}`
- `POST /api/history/disputes`
- `POST /api/history/share-grants`
- `GET /api/history/source-coverage/{assetId}`

All mutating APIs require idempotency keys, source authorization, audit context and server-side entitlement checks.

## 14. Product experience

### 14.1 Owner

- claim a vehicle through a safe proof process;
- view a private digital glovebox;
- import or photograph prior invoices and parts receipts;
- see maintenance, warranty and recall reminders;
- approve time-limited buyer sharing;
- request corrections;
- transfer the 365 profile without transferring old owner personal data; and
- earn a `365 Verified History` badge through continuous verified records.

### 14.2 Buyer

- enter/scan VIN, chassis/frame or approved plate fields;
- see which source markets are available before payment;
- purchase a snapshot report;
- view evidence tiers and source freshness;
- book a 365 pre-purchase inspection;
- compare seller statements with report facts; and
- receive a report ID/hash that can be revalidated.

### 14.3 Shop

- automatic event capture from normal RO work;
- customer authorization and preview at close-out;
- verified contributor/shop badge;
- report credits for qualifying, high-quality submissions;
- warranty/comeback and installed-part visibility;
- easier transfer of service history with customer permission; and
- no public exposure of pricing, margin or internal notes.

### 14.4 Seller/dealer

- attach a current report to a 365 Marketplace listing;
- show source coverage and verified-service percentage;
- provide disclosure before buyer payment;
- bulk inventory checks and expiring-report reminders; and
- use an inspection-backed `365 Verified Listing` badge.

## 15. Commercial model

Pricing below is a test range, not a final promise.

| Product | Proposed test price | Notes |
|---|---:|---|
| Basic identity/source preview | Free | Shows what can be checked; does not imply a clean history |
| 365 Network History report | ₱299–₱499 | 365 shop/parts/scan/inspection events plus available open/licensed sources |
| Philippine Official-Status add-on | TBD by agreement | Only if LTO/agency permits consumer use and fees |
| Seller Verified History badge | ₱199–₱399 or included with listing plan | Requires current report and disclosure |
| Report + mobile pre-purchase inspection | ₱1,500–₱4,000 by scope/location | Inspection is separate from historical data |
| Dealer report packs | Tiered monthly/credits | Volume, users, locations and source costs |
| Shop History Network | Included or add-on to Shop Manager | Contribution credits tied to quality, not positive outcomes |
| Lender/insurer/fleet API | Contract pricing | Purpose-limited, audited and source-permitted |
| Export History Passport | US$25–US$75 target | Origin + 365 inspection + shipment/destination package; source costs extra |

Revenue sources:

- consumer reports;
- Marketplace verified listings;
- pre-purchase inspections;
- Shop Manager/history add-ons;
- dealer and auction packages;
- insurer, lender and fleet APIs;
- export/import history packages;
- warranty/parts integrations; and
- referrals to verified shops, parts and inspections.

Do not charge contributors for reporting a negative event, pay for positive-only reports or allow payment to improve an evidence grade.

## 16. Asia-Pacific expansion

### 16.1 Country-adapter rule

Every country receives a separate:

- vehicle identity profile;
- government/registration source map;
- insurer/total-loss source map;
- inspection and odometer source map;
- auction/import/export source map;
- privacy/lawful-basis review;
- data-residency/cross-border policy;
- language/translation policy;
- consumer disclaimer; and
- partner agreement and source-coverage test.

No country adapter may claim another country's data coverage.

### 16.2 Recommended sequence

1. **Philippines** — 365-generated shop/parts/scan data plus LTO, HPG, insurance and inspection partnership pursuit.
2. **Japan origin/import history** — chassis-based auction/odometer/export integrations under commercial licence; never assume a 17-character VIN.
3. **South Korea origin/import history** — seek KIDI/authorized CarHistory access or referral/API terms for insurance accident history.
4. **Singapore** — owner-authenticated LTA/inspection/transaction workflows and licensed partner access where offered.
5. **Malaysia/Thailand/Indonesia** — individual government, inspection, insurance and used-vehicle partner studies before any coverage claim.
6. **Australia/New Zealand** — add local write-off, registration, inspection and finance/security sources under their rules.
7. **Europe/UK** — country-specific registration/inspection/insurance plus EU/UK privacy and redistribution controls.
8. **North America** — NMVTIS-approved access/partner route, state/provincial title/brand data, NHTSA/Transport Canada and licensed CARFAX/Experian alternatives where contracted.

## 17. Outreach package

Use the complete [Vehicle History Partner Outreach Pack](./vehicle-history-outreach/README.md), [Master Outreach Playbook](./vehicle-history-outreach/365_MASTER_OUTREACH_PLAYBOOK.md), [Government Pilot Concept Note](./vehicle-history-outreach/365_GOVERNMENT_PILOT_CONCEPT_NOTE.md), [Security and Privacy Assurance](./vehicle-history-outreach/365_SECURITY_PRIVACY_ASSURANCE.md), [Buyer/Seller Safety Playbook](./vehicle-history-outreach/365_BUYER_SELLER_SAFETY_PLAYBOOK.md), [Partner RFI](./vehicle-history-outreach/365_PARTNER_RFI_AND_DUE_DILIGENCE.md), [Readiness Checklist](./vehicle-history-outreach/365_PRE_OUTREACH_READINESS_CHECKLIST.csv), [Field Matrix](./vehicle-history-outreach/365_DATA_SHARING_FIELD_MATRIX.csv), [Pilot KPI Scorecard](./vehicle-history-outreach/365_PILOT_KPI_SCORECARD.csv), [Risk Register](./vehicle-history-outreach/365_RISK_REGISTER.csv) and [Partner Tracker](./vehicle-history-outreach/365_VEHICLE_HISTORY_PARTNER_TRACKER.csv).

Before sending:

- confirm the Philippine legal contracting entity;
- use a business-domain email;
- name the founder/product lead, technical lead and DPO/privacy lead;
- prepare a one-page architecture and data-flow diagram;
- prepare a privacy impact assessment summary;
- confirm pilot shops, regions and estimated query/event volumes;
- state that no government or partner access currently exists;
- avoid exclusivity requests;
- request a technical/legal discovery meeting, not unrestricted data;
- separate public-interest pilot goals from later commercial terms; and
- have Philippine counsel review the government and privacy package.

## 18. Delivery roadmap

### Phase 0 — 0–30 days: foundation and governance

- Approve product name, module key and product boundaries.
- Map current Shop Manager vehicle/service-history/RO/parts tables.
- Complete privacy, visibility, consent and dispute requirements.
- Create source, identity, event, evidence and component schemas.
- Define report language and evidence labels.
- Appoint privacy/security owners and begin NPC compliance review.
- Recruit initial pilot shops and document baseline workflows.
- Complete LTO/HPG/Insurance Commission concept package.

**Exit:** schemas, privacy rules, report contract and pilot scope approved.

### Phase 1 — 31–90 days: 365-owned history MVP

- Capture identity/odometer evidence at shop check-in.
- Publish RO service summaries from Shop Manager.
- Build purchased/installed/removed part lifecycle.
- Attach OBD pre/post scan sessions to RO and history.
- Build private owner vault, share grant and report snapshot.
- Add dispute/correction workflow.
- Launch with 5–10 pilot shops.

**Exit:** a vehicle can accumulate and share a trustworthy 365 history without government data.

### Phase 2 — 3–6 months: marketplace and parts network

- Paid buyer reports and verified-listing badges.
- Pre-purchase inspection bundle.
- Supplier/barcode/invoice parts import.
- Warranty and comeback lifecycle.
- Dealer inventory report packs.
- Quality/fraud monitoring and contributor credits.

**Exit:** reports produce revenue and improve Marketplace conversions.

### Phase 3 — 3–12 months: authoritative Philippine partners

- LTO exploratory meeting, DPIA, DSA/MOA and controlled pilot.
- PNP-HPG status-verification discussion.
- Insurance Commission/PIRA/insurer total-loss event standard.
- PMVIC/PETC and OEM/dealer feeds.
- Security/privacy assurance and independent review.

**Exit:** at least one authoritative partner feed passes legal, security and consumer-display review.

### Phase 4 — 6–18 months: Asia expansion

- Japan and Korea origin-history partnerships first.
- Country-adapter framework and coverage UI.
- Singapore and additional ASEAN discovery/pilots.
- Export History Passport.

**Exit:** reports identify exact country/source coverage and combine lawful cross-border events without merging identities incorrectly.

## 19. Initial implementation backlog

### P0 — decisions and safety

- [ ] Approve `vehicle_history_network` module key and ownership.
- [ ] Inventory existing vehicle, RO, part, scan and service-history tables/migrations.
- [ ] Approve public/owner/shop/authority visibility matrix.
- [ ] Complete data-protection and report-fairness requirements.
- [ ] Define identity-match/conflict rules for VIN, chassis, frame, engine and plate.
- [ ] Define event source/verification vocabulary.
- [ ] Define dispute, correction and urgent-suppression policy.
- [ ] Confirm contracting entity, DPO and legal review path.

### P1 — launchable 365 history

- [ ] Migration: sources, organizations, agreements and field policies.
- [ ] Migration: asset identifiers/assertions/conflicts/reviews.
- [ ] Migration: events, assertions, evidence, signatures and visibility.
- [ ] Migration: odometer/hour observations and inconsistency flags.
- [ ] Migration: component instances and purchase/install/removal/warranty events.
- [ ] RLS, storage and server-side authorization.
- [ ] Shop check-in identity/photo/reading workflow.
- [ ] RO close-out history preview and signed event publishing.
- [ ] Parts instance barcode/invoice capture and installation confirmation.
- [ ] Scan-to-RO/history link and pre/post comparison.
- [ ] Owner claim/share and private digital glovebox.
- [ ] Report snapshot, source coverage and report limitation UI.
- [ ] Dispute/correction centre.
- [ ] Pilot-shop dashboard and data-quality queue.
- [ ] Tests for duplicate assets, identity conflicts, tenant leakage and forbidden public fields.

### P2 — commerce and partner readiness

- [ ] Marketplace verified-history badge and report purchase.
- [ ] Pre-purchase inspection package.
- [ ] Dealer bulk reports and credits.
- [ ] Partner event-ingestion API and sandbox.
- [ ] Data-flow and security architecture pack.
- [ ] DPIA and government/insurer DSA templates reviewed by counsel.
- [ ] LTO controlled-pilot request.
- [ ] HPG and insurer/Insurance Commission discovery.
- [ ] PMVIC/PETC and OEM/dealer outreach.

### P3 — regional scale

- [ ] Japan auction/chassis/odometer provider test.
- [ ] Korea CarHistory/KIDI access discussion.
- [ ] Singapore LTA/inspection access study.
- [ ] Malaysia, Thailand and Indonesia source/legal mapping.
- [ ] Export History Passport.
- [ ] NMVTIS/UK/EU/Australia/NZ provider adapters.
- [ ] Multi-language reports and local dispute operations.
- [ ] Regional source-cost and report-margin controls.

## 20. Non-negotiable product rules

1. **No record is not a clean record.** It only means the searched source returned no reportable event.
2. **No source, no public claim.** Every visible fact has provenance and freshness.
3. **Purchase is not installation.** Only a completed installation event says a part is on the vehicle.
4. **Private by default.** Shop/customer details never enter public history automatically.
5. **No previous-owner exposure.** Personal identities do not transfer with the vehicle report.
6. **No silent identity merge.** Conflicting VIN/chassis/frame/engine/plate values require review.
7. **No silent country fallback.** Coverage from one market is not presented as another market's history.
8. **Corrections are auditable.** Material history is superseded, not secretly rewritten.
9. **Negative truth is not for sale.** No fee can hide an accurate material event.
10. **Government data remains government data.** Access, display, retention and fees follow the signed authority.
11. **Evidence grades are independent of payment.** Subscription tier cannot upgrade verification.
12. **AI extracts; sources prove.** AI cannot create or certify a historical event.
13. **History is not condition.** Every report recommends a current physical inspection.
14. **Safety and privacy override growth.** Data acquisition is rejected when rights, security or accuracy cannot be established.

## 21. Recommended first build slice

1. Add the `vehicle_history` source, identity, event, evidence, reading, dispute and component migrations.
2. Extend Shop Manager check-in to capture identifier photos and odometer/hours evidence.
3. Extend `work_order_parts` into distinct purchased, allocated, installed and removed part events.
4. Publish a private owner timeline and a redacted shareable report snapshot.
5. Connect the 365 Scan Companion session to the exact service asset, RO and pre/post history event.
6. Add history preview/approval to RO close-out.
7. Pilot with 5–10 shops and 1,000 assets without claiming LTO access.
8. Use the pilot metrics and security/privacy pack to approach LTO, HPG, the Insurance Commission and insurers.

This sequence creates a valuable asset immediately, proves the workflow with real Philippine shop data and gives government/insurance partners something concrete to evaluate rather than only an idea.

## 22. Primary references

- [LTO–PNP data-sharing agreement announcement](https://lto.gov.ph/news/lto-pnp-sign-data-sharing-agreement-for-efficient-crime-prevention-crime-fighting/)
- [LTO–Carmona data-sharing/interconnectivity announcement](https://lto.gov.ph/news/lto-signs-data-sharing-interconnectivity-agreement-with-carmona-city-lgu/)
- [LTO Data Privacy Notice](https://lto.gov.ph/data-privacy-notice/)
- [LTO contact information](https://lto.gov.ph/contact-us/)
- [National Privacy Commission: Data Privacy Act IRR](https://privacy.gov.ph/implementing-rules-regulations-data-privacy-act-2012/)
- [NPC Circular 2020-03: Data Sharing Agreements](https://privacy.gov.ph/wp-content/uploads/2021/01/Circular-Data-Sharing-Agreement-amending-16-02-21-Dec-2020-clean-copy-FINAL-LYA-and-JDN-signed-minor-edit.pdf)
- [NPC PIC/PIP and data-processing-system registration FAQ](https://privacy.gov.ph/pips-and-pics/faqs/)
- [Korea KIDI CarHistory sample/limitations](https://www.carhistory.kr/guide/sample.page?lang=en)
- [Singapore LTA OneMotoring digital services](https://onemotoring.lta.gov.sg/content/onemotoring/home/digitalservices.html)
- [US DOJ: understanding NMVTIS vehicle history](https://vehiclehistory.bja.ojp.gov/nmvtis_understandingvhr)
- [US DOJ: NMVTIS consumer report fields](https://vehiclehistory.bja.ojp.gov/faq/list)
- [CARFAX Vehicle History Reports](https://www.carfax.com/vehicle-history-reports/)
- [CARFAX Car Care service history](https://www.carfax.com/Service/)

