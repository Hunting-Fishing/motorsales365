# 365 Parts Quality and Traceability Plan

**Control document:** [`365_PARTS_PROGRAM_INDEX.md`](./365_PARTS_PROGRAM_INDEX.md)

**Status:** Quality-management and Part Passport specification

**Version:** 1.0

**Updated:** 2026-08-06

> This plan establishes operating controls. Category- and country-specific product rules, testing, certifications, labeling, recall, environmental, and professional obligations still require qualified review.

## 1. Quality objective

365 must make it safer and easier to identify, source, receive, install, return, and support the correct part while preserving evidence about what happened.

Quality is not only “the part was not broken.” It includes:

- correct identity and description;
- defensible fitment;
- approved source and authenticity;
- correct condition and completeness;
- regulatory/product eligibility;
- accurate stock and promise;
- suitable packaging, transport, and storage;
- correct item picked and shipped;
- chain of custody;
- installation and required setup evidence;
- warranty, failure, recall, and corrective-action traceability.

## 2. Quality principles

1. Safety and fitment override sponsored ranking, margin, speed, or seller preference.
2. Evidence has source, scope, license, date, version, reviewer, and confidence.
3. Supplier approval does not approve every product, factory, condition, or trade lane.
4. Product approval does not prove stock, packaging, shipment, installation, or continuing compliance.
5. AI-generated mappings and translations remain suggestions until validated under an approved rule.
6. Suspect material is quarantined before investigation; commercial pressure cannot bypass quarantine.
7. Corrections and reversals are auditable; history is not silently overwritten.
8. A recall must reach stock, in-transit, sold, returned, and installed-part records.

## 3. Quality organization

| Role | Accountability |
|---|---|
| Quality lead | QMS, risk tiers, audits, CAPA, recall authority |
| Catalog/fitment lead | Product identity, mappings, evidence, conflict resolution |
| Partner quality owner | Supplier/location qualification and performance |
| Receiving/fulfilment owner | Inspection, storage, picking, packaging, custody |
| Customer quality owner | Complaints, returns, warranties, safety escalation |
| Trade compliance owner | Export/import product and lane eligibility |
| Technical expert network | Domain-specific validation and failure analysis |
| Engineering/data owner | Enforced states, RLS, audit, monitoring, traceability |

Quality must have authority to stop product, offer, seller, location, provider, category, or lane activation.

## 4. Product risk classification

The quality lead assigns a versioned risk tier by product class, condition, market, vehicle domain, and use.

| Tier | Typical characteristics | Minimum controls |
|---|---|---|
| Q1 — low | Non-safety-critical, non-dangerous, easy identity and inspection | Approved source, catalog evidence, visual/quantity checks |
| Q2 — controlled | Fitment-sensitive or moderate failure consequence | Strong fitment, supplier qualification, packaging/storage, return analysis |
| Q3 — safety/regulated | Braking, steering, restraint, high-voltage, regulated emissions/safety or serious failure consequence | Specialist approval, regulatory evidence, serial/lot traceability, enhanced inspection, recall readiness |
| Q4 — restricted | Dangerous goods, software/security-linked, high counterfeit risk, uncertain legality, unsupported used/condition state | Explicit category + country + carrier + lane approval; often manual-only |
| Q5 — prohibited | Cannot be legally, safely, contractually, or economically supported | Block publication, sale, transfer, and export |

The tier controls evidence, supplier status, customer disclosures, shipping, installation, warranty, returns, and audit frequency.

## 5. Supplier and partner qualification

### 5.1 Required evidence

- verified legal and trading identity;
- authorized contacts and beneficial/control information as required;
- permits, tax, facility, bank/payout, and insurance evidence;
- manufacturer/importer/distributor authorization or documented source chain;
- product/category/factory/brand coverage;
- quality certifications where relevant;
- warranty, returns, recall, counterfeit, and incident process;
- storage, handling, packaging, calibration, and training capability;
- catalog, fitment, stock, price, and traceability data rights;
- audit and records-access obligations;
- product-liability and indemnity allocation reviewed by counsel.

### 5.2 Supplier states

`applicant → due-diligence → sample/technical review → pilot-approved → approved → restricted → suspended → terminated`

Approval is effective-dated and scoped by:

- legal entity and facility;
- brand and product category;
- condition program;
- domestic market and export lane;
- fulfilment method;
- maximum volume/exposure;
- required inspection level.

### 5.3 Ongoing monitoring

- item correctness and fill rate;
- defect, return, warranty, damage, counterfeit, and recall rate;
- delivery and acknowledgement performance;
- data accuracy/freshness;
- traceability completeness;
- CAPA response and recurrence;
- complaint severity;
- audit results and certificate/permit expiry.

## 6. Catalog and fitment quality

### 6.1 Evidence hierarchy

Each domain/market pack defines its hierarchy, generally distinguishing:

- manufacturer/OE technical evidence;
- licensed industry/catalog provider evidence;
- authorized distributor data;
- verified physical/technical inspection;
- qualified technician evidence;
- partner assertions;
- customer reports;
- AI or heuristic suggestions.

Lower evidence may create a review task; it cannot automatically override stronger evidence.

### 6.2 Fitment assertion record

Minimum fields:

- canonical product and asset/vehicle application;
- domain, market, production range, chassis/model/engine/transmission/option constraints;
- fitment type: direct, conditional, universal, modification-required, not-compatible;
- quantity/position/side/axle/location;
- required companion parts, tools, coding, relearn, calibration, fluids, or consumables;
- source, evidence artifact, license, version, effective dates;
- reviewer, approval state, confidence, conflict, correction history;
- customer/shop confirmation questions.

### 6.3 Catalog non-conformance

Examples:

- duplicate canonical product;
- wrong brand/part number mapping;
- false interchange or supersession;
- overly broad year/make/model range;
- missing production date/engine/chassis distinction;
- incorrect image or package quantity;
- unsafe translation or warning omission;
- unsupported regulatory/safety claim.

Affected offers enter review or stop-sale according to severity.

## 7. Authenticity and source verification

Required controls may include:

- approved supplier/source path;
- purchase and import documentation;
- manufacturer/distributor verification;
- packaging, labels, seals, holograms, QR/serial validation;
- batch/lot/serial capture;
- photos and anomaly comparison;
- price/source anomaly alerts;
- sample destructive/non-destructive testing where appropriate;
- chain-of-custody and investigator records.

`365 Source Verified` should mean only that the recorded source chain meets the current program rule. It is not an unconditional manufacturer authorization or performance guarantee unless explicitly stated and evidenced.

## 8. Receiving and inventory quality

### 8.1 Receiving checks

- purchase order, ASN, shipment, and physical count;
- brand, manufacturer part number, condition, package quantity;
- lot/batch/serial/date code and expiry where applicable;
- damage, corrosion, contamination, tampering, missing pieces;
- required labels, instructions, certificates, safety data, and warnings;
- storage temperature/humidity/orientation or dangerous-goods requirements;
- sample or full inspection based on risk and supplier score;
- discrepancy, quarantine, rejection, and supplier claim.

### 8.2 Inventory states

`expected → received-pending-inspection → approved → reserved → picked → shipped/issued → returned-pending-inspection → approved-for-resale/rework/return-to-supplier/scrap/quarantine`

No state transition may erase stock movements or responsible users.

### 8.3 Cycle counts and reconciliation

Frequency is risk/value/velocity based. Variances create investigation tasks and may reduce network stock confidence or suspend publication.

## 9. Fulfilment and transport quality

- scan or verify item and order at pick, pack, handoff, and receipt;
- prevent mixed-up left/right, front/rear, quantity, condition, or kit contents;
- use category-specific packaging and tamper evidence;
- capture weight/dimensions and package count;
- protect seals, machined surfaces, electronics, glass, fluids, and heavy components;
- follow dangerous-goods and carrier rules where approved;
- preserve custody events, labels, photos, and exceptions;
- investigate damage by packaging, handling node, carrier, route, and product.

## 10. Installation and service quality

When a partner installs the part, capture as applicable:

- installer, shop, date, mileage/hours, work order, and vehicle identity;
- installed product, lot/batch/serial, quantity, position;
- diagnosis/test evidence and failure cause of removed part;
- required companion parts, fluids, torque, tools, coding/relearn/calibration;
- pre/post measurements and road/functional test;
- customer authorization and warranty terms;
- removed-part/core disposition;
- comeback, failure, and warranty outcome.

The platform must not imply that sale of a part proves correct installation.

## 11. Non-conformance and CAPA

### 11.1 Non-conformance sources

- catalog/fitment correction;
- receiving discrepancy;
- wrong item/quantity/condition;
- stock variance;
- shipping damage or loss;
- customer complaint or return;
- installation failure/comeback;
- warranty claim;
- counterfeit suspicion;
- regulatory notice or recall;
- audit or security finding.

### 11.2 Required case fields

- severity, risk tier, affected scope, detection source;
- products, batches/serials, offers, locations, shipments, orders, installed parts;
- immediate containment/quarantine/stop-sale;
- customer/partner/regulator notification assessment;
- root-cause method and evidence;
- correction and corrective/preventive action;
- owner, deadline, verification, effectiveness review;
- supplier recovery, financial loss, insurance, and closure approval.

### 11.3 Severity

| Severity | Example response |
|---|---|
| Critical | Immediate stop-sale/ship, incident command, trace, notify, regulatory/legal review |
| Major | Containment, focused suspension, customer/partner outreach, CAPA |
| Moderate | Correct record/process, monitor recurrence, targeted review |
| Minor | Routine correction, trend monitoring |

## 12. Returns, warranty, and failure analysis

Return reason is not final root cause. The system distinguishes:

- customer changed mind;
- ordering error;
- catalog/fitment error;
- seller picked wrong item;
- distributor supplied wrong item;
- transit damage;
- incomplete/incorrect condition;
- installation error;
- underlying vehicle fault;
- premature product failure;
- counterfeit/suspect source;
- recall/safety action;
- no-fault core return.

Disposition, financial responsibility, catalog correction, supplier score, and CAPA follow the verified cause.

## 13. Recall and stop-sale

The recall system must:

1. receive manufacturer, supplier, regulator, partner, and internal alerts;
2. normalize affected identifiers, batches, serials, production dates, conditions, and markets;
3. block affected catalog offers, stock, reservations, and shipment where required;
4. find partner stock, in-transit items, delivered orders, returns, and installed parts;
5. notify responsible parties and customers through approved channels;
6. record acknowledgement, remedy, replacement, refund, inspection, and disposition;
7. reconcile supplier/regulator reporting and financial recovery;
8. complete a recall effectiveness review.

A recall drill is required before G5 and for every new high-risk program.

## 14. 365 Part Passport

### 14.1 Purpose

The Part Passport is a traceability record, not a cryptocurrency or public disclosure of private commercial data.

### 14.2 Possible components

- canonical product and global identifiers such as GTIN where licensed/available;
- manufacturer part number, brand, version, condition;
- factory/manufacturer, country of manufacture, source chain where permitted;
- lot/batch/serial/date code;
- quality/certification evidence;
- supplier and receiving event;
- custody, storage, shipment, and delivery events;
- installation and vehicle/equipment link;
- warranty, return, failure, CAPA, and recall state;
- digital signatures/hashes for evidence integrity where useful.

### 14.3 Visibility

Views are permissioned:

- customer: purchased item, source/condition claims, warranty, recall, installation facts;
- partner/shop: operational custody and service evidence;
- supplier/manufacturer: eligible quality and recovery information;
- regulator/insurer: authorized incident/recall evidence;
- 365: auditable network quality and analytics;
- public: only approved verification facts without personal or confidential data.

## 15. Data model requirements

Minimum entities or equivalents:

- `quality_risk_classes` and effective-dated rules;
- `supplier_qualifications` and scopes;
- `product_approvals` and compliance evidence;
- `catalog_fitment_evidence` and conflicts;
- `receiving_inspections` and sampled units;
- `traceable_units` for lot/batch/serial items;
- `chain_of_custody_events`;
- `nonconformance_cases`;
- `capa_actions` and effectiveness checks;
- `recalls`, affected products, notifications, and remedies;
- `part_passports` and permissioned views;
- `quality_audits` and findings;
- `supplier_quality_scores` with explainable inputs.

Files belong in protected storage with retention, access logging, malware scanning, integrity metadata, and legal holds where applicable.

## 16. Quality KPIs

- catalog conflict and correction rate;
- fitment confidence/evidence coverage;
- stock confirmation and count accuracy;
- receiving discrepancy and supplier defect rate;
- correct item/quantity/condition shipped;
- transit damage/loss;
- return and warranty rate by cause;
- counterfeit/suspect-source incidents;
- CAPA on-time and recurrence rate;
- recall trace/contact/remedy completion;
- installed-part early failure and comeback;
- quality cost per order and recovered supplier cost.

Rates must be normalized by exposure and risk; low sales volume must not produce misleading supplier rankings.

## 17. Audit program

Audit frequency is risk and performance based. Audits may cover:

- supplier/facility and source-chain evidence;
- catalog/data licensing and mappings;
- stock ledger, counts, quarantine, and disposal;
- receiving, packaging, storage, and transport;
- installation, calibration, and warranty evidence;
- access controls and record integrity;
- recall and incident readiness;
- corrective actions and training.

Critical findings can suspend affected scope immediately.

## 18. Quality launch gates

No product/category/partner/market/lane launches without:

- assigned risk tier and evidence rule;
- approved source/supplier and facility scope;
- defensible product/fitment identity;
- storage, packaging, shipping, and return method;
- customer warnings and warranty/responsibility terms;
- traceability appropriate to risk;
- stop-sale, quarantine, incident, and recall process;
- trained operational owner;
- quality metrics and audit schedule;
- insurance/legal/regulatory approval where required.
