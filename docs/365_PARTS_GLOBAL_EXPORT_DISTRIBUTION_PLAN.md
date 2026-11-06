# 365 Parts Global Export and Distribution Plan

**Repository:** Hunting-Fishing/motorsales365

**Program control:** [365_PARTS_PROGRAM_INDEX.md](./365_PARTS_PROGRAM_INDEX.md)

**Execution roadmap:** [365_PARTS_EXECUTION_ROADMAP.md](./365_PARTS_EXECUTION_ROADMAP.md)

**Related master plan:** [365_PARTS_PARTNER_NETWORK_PLAN.md](./365_PARTS_PARTNER_NETWORK_PLAN.md)

**Related global plan:** [365_PARTS_GLOBAL_EXPANSION_PLAN.md](./365_PARTS_GLOBAL_EXPANSION_PLAN.md)

**Regions:** Asia-Pacific, Europe, and North America

**First operating origin:** Philippines

**Platform:** 365 Parts marketplace, 365 Shop Manager, Supabase, provider adapters, carrier/broker integrations

**Status:** Target product, operating, contract, data, integration, and rollout plan

**Version:** 1.0

**Updated:** 2026-08-06

> This is a product and operating specification, not legal, customs, tax, sanctions, or product-safety advice. Every country pack and trade lane requires current review by qualified advisers, customs brokers, carriers, payment providers, insurers, and responsible 365 personnel before activation.

Trade-lane approval is controlled by the Program Index, Decision Register, Regulatory Change Register, economics/quality gates, and a destination-specific versioned lane pack. [`trade-lanes/PH_ORIGIN_PILOT.md`](./trade-lanes/PH_ORIGIN_PILOT.md) prepares the Philippines origin side but deliberately cannot activate shipment until one exact destination is selected.

## 1. Executive decision

365 should add international parts export as a controlled extension of the domestic Parts Partner Network. It should not enable a generic worldwide shipping switch.

The export system should:

1. publish export-capable inventory from approved partner stores, distributors, manufacturers, dismantlers, warehouses, and 365-owned inventory;
2. make rare or unavailable parts discoverable across countries;
3. calculate a defensible delivered cost and delivery range before payment;
4. route the order through an approved exporter, broker, carrier, importer, return location, and warranty provider;
5. preserve fitment, authenticity, origin, customs, product-safety, shipment, installation, and warranty evidence;
6. allow business buyers to consolidate orders and use negotiated commercial terms;
7. block unsafe, illegal, uneconomic, undocumented, sanctioned, or unsupported transactions;
8. create regional buying power without combining the legal ownership of member inventory.

The core rule is:

> A product may be globally visible, but it may be exported only through a versioned and approved trade lane.

A trade lane is not merely two countries. It is:

**origin legal entity + origin location + destination market + buyer/seller model + product class + customs treatment + carrier service + duty model + payment route + return route + warranty route**

Philippines-to-Canada brake pads by express courier is therefore a different lane from Philippines-to-Canada batteries by ocean freight. Approval of one must never approve the other.

## 2. What this plan adds

The Global Expansion Plan defines the high-level market and cross-border architecture. This document adds the operating detail required to build and contract the export network.

It owns:

- export-capable partner enrollment;
- country-of-origin activation packs;
- trade-lane approval and versioning;
- product export eligibility;
- customs classification and origin evidence;
- export/import responsibility;
- landed-cost quoting;
- commercial and customs documents;
- carriers, brokers, consolidators, 3PLs, and regional hubs;
- customer and B2B export journeys;
- Shop Manager export workflows;
- cross-border orders, shipments, events, adjustments, returns, warranties, and cores;
- Supabase entities, RLS boundaries, audit, jobs, and integration events;
- distributor, partner, broker, carrier, and customer contract clauses;
- restricted-party, sanctions, export-control, fraud, and diversion controls;
- rollout gates, scorecards, unit economics, and failure handling.

It does not replace:

- the canonical parts and fitment model;
- domestic inventory ownership and stock ledgers;
- domestic partner onboarding;
- parent/sub-order orchestration;
- marketplace payments and settlement ledgers;
- country market packs;
- vehicle-domain packs;
- repair-data and technician workflows.

Those remain in the related plans.

## 3. Strategic business model

### 3.1 One network, several fulfilment models

| Model | Description | Best use | Main risk |
|---|---|---|---|
| Domestic first | Customer receives locally stocked inventory | Default route in every country | Local catalog and stock coverage |
| Partner direct export | Origin partner ships directly to foreign customer or shop | Rare, high-value, parcel-sized parts | Partner document and packing quality |
| Distributor direct export | Distributor exports from its warehouse | Broad catalog and reliable stock | Territory, blind-ship, data, and warranty terms |
| 365 consolidation | Several partner orders move to an origin consolidation hub and ship together | B2B, repair-shop, and regional replenishment | Handling, delay, title, and inventory control |
| Regional import hub | 365 or an approved importer brings selected stock into a destination-region hub | Proven high-volume lanes | Working capital, importer liability, taxes, EPR, and obsolescence |
| Cross-dock | Shipment is received, checked, relabeled, and forwarded without long-term storage | Quality control and carrier handoff | Chain of custody and cut-off coordination |
| Assisted sourcing/RFQ | 365 manually sources an uncatalogued, used, obsolete, or unusual part | Long-tail demand | Fitment, condition, quote validity, and returns |
| Buying-group import | Demand is aggregated across partners and purchased in bulk | Fast movers and commercial buyers | Member commitments, allocation, credit, and landed-cost variance |

### 3.2 Recommended routing priority

The marketplace should normally route in this order:

1. same partner location;
2. nearby domestic partner;
3. domestic distributor or warehouse;
4. destination-country regional stock;
5. stock already in the destination customs union or free-circulation area;
6. approved direct cross-border offer;
7. approved consolidated export;
8. assisted sourcing/RFQ;
9. unavailable with a clear explanation.

International supply should fill domestic gaps, not unnecessarily replace faster and safer local inventory.

### 3.3 Revenue opportunities

365 can earn from:

- domestic marketplace and network fees;
- an international sourcing/orchestration fee;
- distributor or manufacturer margin/rebate;
- partner software subscriptions;
- B2B commercial-account subscriptions;
- consolidation, cross-dock, inspection, repacking, and documentation fees;
- disclosed foreign-exchange service margin where lawful;
- carrier and insurance commissions where permitted and disclosed;
- fitment guarantee or enhanced warranty products after underwriting;
- supplier-sponsored placement that does not override routing quality;
- private-label or 365-owned inventory after compliance maturity.

Pass-through duty, import tax, customs brokerage, carrier surcharges, and government fees must not be disguised as 365 revenue.

## 4. Parties, ownership, and responsibility

### 4.1 Required trade parties

Every cross-border sub-order must identify:

- customer/buyer;
- ship-to party;
- supplying inventory owner;
- seller of record;
- marketplace operator;
- exporter of record or equivalent origin responsible party;
- principal party in interest where the origin country uses that concept;
- customs declarant or broker;
- freight payer;
- carrier and final-mile carrier;
- importer of record or equivalent destination responsible party;
- consignee;
- tax/VAT/GST responsible party;
- product-safety economic operator, responsible person, or importer where required;
- warranty provider;
- return recipient;
- payment recipient and settlement beneficiary.

One company may perform several roles, but no role may remain assumed or blank.

### 4.2 Operating models

| Model | Customer contract | Export responsibility | Import responsibility | Recommended phase |
|---|---|---|---|---|
| Marketplace, partner seller | Customer buys from partner | Partner or its agent | Customer or named importer | First controlled B2B lanes |
| Marketplace, distributor seller | Customer buys from distributor | Distributor or its agent | Customer or named importer | Early direct-ship lanes |
| 365 merchant of record | Customer buys from 365 entity | 365 entity/supplier under contract | 365 entity or approved importer | Later, selected markets/categories |
| B2B procurement agent | 365 arranges purchase for a business buyer | Supplier/exporter | Business buyer/importer | Early assisted commercial sourcing |
| 365 stocked distributor | 365 owns inventory before sale | 365 origin entity | 365/local destination entity | Mature high-volume lanes |

The order must freeze the selected model and the identities, addresses, registrations, responsibilities, terms, and policy versions used.

### 4.3 Inventory ownership

Export visibility does not transfer stock ownership.

- A partner retains title to its stock until the contracted transfer point.
- A reservation prevents local or network overselling but does not move inventory.
- Consolidation receipt creates custody, not necessarily ownership.
- Buyer-location inventory increases only after accepted receiving.
- 365-owned stock must use separate ledgers, insurance, accounting, and compliance.
- Consignment stock must name the owner and define loss, shrinkage, aging, and return rights.
- Bonded or free-zone stock must retain its customs status and cannot be shown as domestic free-circulation stock.

### 4.4 Incoterms are not the complete legal model

Where appropriate, use the current ICC Incoterms rule and a precise named place in B2B contracts. Also define separately:

- seller and buyer;
- title/ownership transfer;
- payment and credit;
- customs value;
- exporter and importer eligibility;
- VAT/GST/sales-tax treatment;
- product-safety importer/economic-operator responsibility;
- warranty, returns, and statutory consumer rights;
- sanctions/export-control responsibility;
- governing law and dispute process.

An Incoterm allocates specified delivery tasks, costs, and risks. It must not be used as a shortcut to decide all other legal or tax responsibilities. DDP should not be offered merely because it is customer-friendly; the seller must actually be able to perform destination import clearance and tax/product obligations.

## 5. Product and vehicle-domain eligibility

### 5.1 Eligibility is product-market-lane specific

An item is exportable only if all gates pass:

- canonical product identity is resolved;
- manufacturer and part number are known;
- vehicle-domain fitment is adequate for the promised use;
- condition is declared;
- inventory is reservable;
- seller is authorized for the product and territory;
- customs description and classification are approved;
- non-preferential country of origin is supported;
- any preferential-origin claim has valid evidence;
- product-market compliance record is approved;
- dangerous-goods state and transport mode are approved;
- export-control and sanctions screening passes;
- destination sale/import is lawful;
- carrier accepts the product/package;
- landed cost can be quoted under the selected duty model;
- local return and warranty routes exist;
- expected contribution margin passes;
- required language, labels, instructions, warnings, and responsible-party data exist.

### 5.2 Product risk tiers

| Tier | Examples | Default export posture |
|---|---|---|
| Green | Many filters, gaskets, mechanical bearings, non-pressurized hoses, manual tools, trim clips, selected brake friction with complete evidence | Candidate for early lanes |
| Yellow | Sensors, lights, starters, alternators, pumps, steering/suspension, wheels, tires, glass, body panels, programmed electronics, high-value assemblies | Category approval, enhanced fitment, packaging, compliance, and return controls |
| Red | Batteries, oils, fuels, aerosols, paints, solvents, refrigerants, airbags, pretensioners, pyrotechnics, emissions defeat products, undocumented used safety parts, counterfeit-suspect goods | Disabled until a specific dangerous-goods/regulatory program is approved |
| Prohibited | Recalled/stop-sale products, sanctioned transactions, stolen parts, VIN/identity manipulation tools, illegal emissions defeat devices, products lacking legally required operator/evidence | Never list or fulfil |

The tier is a starting classification. Destination laws and carrier rules can make a normally green item ineligible.

### 5.3 Condition programs

Use separate programs for:

- new genuine/OE;
- new OEM-equivalent or aftermarket;
- remanufactured;
- rebuilt;
- used tested;
- used untested/display-only;
- new old stock;
- core;
- salvage/dismantled;
- custom/fabricated;
- private label.

Each program needs its own evidence, grading, photography, traceability, fitment confidence, warranty, installation, and return rules. Used airbags, restraints, steering, brakes, emissions devices, batteries, and other safety/regulatory classes should remain disabled until a country-specific program is approved.

### 5.4 First-class vehicle domains

Export eligibility and fitment must remain separate for:

- passenger automotive and light commercial;
- motorcycles, scooters, ATV/UTV, and powersports;
- heavy trucks, buses, trailers, and vocational equipment;
- construction, mining, agricultural, and industrial equipment;
- marine outboards, inboards, sterndrives, personal watercraft, and vessel systems;
- small engine, generator, and stationary power;
- tires, batteries, fluids, tools, and universal products.

A lane approved for an automotive brake pad does not approve a heavy-truck air-brake component or a marine fuel fitting.

### 5.5 Brand territory, parallel imports, and supply-chain due diligence

Authentic does not always mean authorized for every destination or sales channel. Before export, capture:

- brand/distributor territory and channel rights;
- restrictions on cross-border or marketplace resale;
- warranty validity outside the original sales market;
- trademark, packaging, labeling, and exhaustion/parallel-import review;
- software, telematics, subscription, activation, encryption, or region-lock restrictions;
- manufacturer authorization and traceable purchase chain;
- forced-labor, conflict-mineral, environmental, or other supply-chain evidence required by the lane;
- batch/lot/serial and manufacturer recall access.

Gray-market goods must not be labeled counterfeit merely because they are outside an authorized channel, but they must not be sold where import, trademark, warranty, safety, or contractual restrictions make the offer ineligible.

## 6. Customer-side export experience

### 6.1 Discovery

Customers should be able to choose:

- delivery country and postal code before search;
- saved vehicle/asset;
- domestic only, international allowed, or both;
- new/remanufactured/used condition;
- pickup, ship-to-shop, home delivery, or installed;
- fastest, lowest delivered cost, closest source, or preferred brand;
- single shipment or split shipment tolerance;
- consumer or business purchase.

Search must not show an international offer as purchasable until lane eligibility is checked. Ineligible items may appear as catalog reference, waitlist, or assisted-sourcing candidates with accurate wording.

### 6.2 Product page

For each export-capable offer show:

- seller identity, country, and verification;
- item condition and actual-item photos when used/remanufactured;
- part number, interchange, and fitment confidence;
- origin of shipment and manufacturing origin when known;
- warranty provider and where claims are handled;
- estimated dispatch, customs, and final-delivery range;
- merchandise, shipping, brokerage, duty/tax, insurance, environmental/core, and service-fee treatment;
- whether duties/taxes are prepaid, estimated, or payable on arrival;
- return destination and who pays international return freight;
- programming, calibration, installation, or professional-use requirements;
- restricted or dangerous-goods warning;
- language, product-safety, economic-operator, and compliance information required by destination;
- quote expiry and reasons the amount may change.

Customer wording must explain responsibility in plain language. Incoterms may be stored and displayed to B2B buyers but should not be the only consumer explanation.

### 6.3 Fitment confirmation

Before payment:

1. resolve VIN/chassis/model/engine/transmission/build market where available;
2. ask unresolved qualifiers such as production date, axle, brake size, emission family, steering side, cab, wheelbase, marine serial range, or equipment arrangement;
3. show whether fitment is verified, likely, unresolved, or not guaranteed;
4. capture customer confirmation;
5. store the exact fitment assertion and evidence version;
6. prevent substitutions that change fitment without renewed consent.

### 6.4 Landed-cost quote

Checkout should show one of four states:

1. **Delivered total:** duty/tax and expected clearance costs included.
2. **Estimated delivered total:** stated components are estimates and adjustment rules are disclosed.
3. **Import charges on arrival:** customer/importer pays named charges and must explicitly accept.
4. **Quote required:** automated checkout is disabled because classification, importability, or costs are uncertain.

The quote needs a validity period and must be recalculated when quantity, address, carrier, currency, classification, origin, package, duty rate, tax rule, or duty model changes.

### 6.5 Checkout data

Request only what the approved lane requires:

- legal name and contact;
- delivery and billing address;
- customer type;
- destination tax/customs ID where required;
- business registration/resale/exemption evidence where applicable;
- broker details for B2B;
- importer confirmation;
- end-use/end-user information for controlled classes;
- vehicle/asset and fitment confirmation;
- duty/charge model acceptance;
- terms, return, warranty, privacy, and customs-data consent;
- signature or identity verification only when required.

Sensitive identity or customs documents must not be exposed to supplying partners beyond the minimum needed.

### 6.6 Tracking and support

Tracking should normalize:

- reservation and seller acceptance;
- export-document preparation;
- consolidation received/inspection complete;
- export declaration lodged/accepted/held/released;
- carrier pickup and origin departure;
- destination arrival;
- customs information/payment requested;
- customs hold/exam;
- import cleared;
- final-mile handoff;
- delivered or pickup ready;
- exception, loss, damage, refusal, return-to-origin, abandoned, or disposed.

Never promise a customs-clearance date as guaranteed.

### 6.7 Customer self-service

Add:

- upload requested customs information;
- approve or reject a fitment/substitution change;
- pay an approved post-quote adjustment where lawful;
- download invoice and non-sensitive shipment documents;
- contact assigned support;
- open damage, missing, incorrect, fitment, warranty, or return case;
- request cancellation before the irreversible cut-off;
- track refund, duty recovery, replacement, or re-export.

### 6.8 B2B customer features

Commercial buyers need:

- company locations and authorized purchasers;
- approval thresholds and purchase-order numbers;
- negotiated price books;
- net/credit terms after underwriting;
- tax/resale/exemption records;
- importer and broker profiles;
- preferred Incoterm/duty model;
- parcel, LTL, air, ocean, or consolidation preference;
- recurring replenishment lists;
- pallet/carton labels and receiving requirements;
- consolidated invoices and shipment manifests;
- backorder, partial, and substitution rules;
- API/EDI procurement and status feeds;
- landed-cost and duty reports;
- claims and core-return dashboards.

## 7. Partner enrollment and Shop Manager

### 7.1 Signup does not grant export capability

The existing Shop Manager signup gives a business access to its workspace. Export selling requires separate approval for:

**legal entity + location + origin country + destination market + vehicle domain + product class + fulfilment mode**

### 7.2 Export partner onboarding

Collect and verify:

- legal business and beneficial-owner information;
- physical stock/dispatch location;
- tax, customs, exporter, and required trade registrations;
- authorized representative and compliance contacts;
- bank/payout account;
- customs broker, freight forwarder, 3PL, and carrier accounts;
- product brands/categories and authorization;
- catalog/data rights and territories;
- proof of origin and classification capabilities;
- dangerous-goods capability and trained personnel;
- packaging, weighing, measuring, labeling, and document capability;
- direct/blind-ship capability;
- dispatch cut-offs, holidays, capacity, and SLAs;
- return, warranty, core, recall, and counterfeit procedures;
- insurance for product, cargo, warehouse, errors, cyber, and other applicable risks;
- records-retention and audit acceptance;
- restricted-party, sanctions, anti-bribery, and export-control compliance;
- test-order results;
- signed export fulfilment addendum.

### 7.3 Shop Manager export modules

Add:

| Module | Required functions |
|---|---|
| Export dashboard | Eligible offers, blocked SKUs, pending documents, shipments, holds, returns, claims, settlement, and SLA |
| Capability enrollment | Apply for origin/destination/category/carrier capabilities and track approval/expiry |
| Export catalog readiness | Missing HS, origin, weight, dimensions, material, DG, compliance, warranty, image, and label fields |
| Export offers | Destination allow/deny, minimum order, price basis, lead time, quantity cap, and channel |
| Cross-border quotes | Review classification, package, charges, FX, expiry, and exceptions |
| Export orders | Accept/reject, reserve, pick, inspect, serial/lot capture, pack, weigh, and hand off |
| Documents | Commercial invoice, packing list, origin proof, declarations, permits, labels, and document versions |
| Consolidation | Inbound appointment, custody scan, inspection, combine/separate, master/house shipment, discrepancy |
| Customs exceptions | Information request, hold, exam, valuation, classification, permit, payment, and release |
| Returns/re-import | RMA, return label, export reference, re-import/re-export, inspection, disposition, refund |
| Warranty and cores | Cross-border claim owner, evidence, replacement/repair/refund, core route and credit |
| Finance | Landed-cost variance, charges, credits, FX, reserve, payout, fees, tax, and reconciliation |
| Compliance | Screening, evidence expiry, recalls, suspensions, audits, and corrective actions |

### 7.4 Partner order flow

1. 365 creates a cross-border sub-order against a validated quote.
2. Seller accepts within SLA and stock is reserved atomically.
3. Seller reconfirms part number, condition, quantity, fitment-sensitive attributes, and package plan.
4. Required restricted-party/export-control checks complete.
5. Seller picks and scans item, lot/serial/security code, and actual condition.
6. Seller photographs item and packed condition where policy requires.
7. Actual weight/dimensions are captured and quote tolerance is checked.
8. Documents are generated from approved data and reviewed according to risk tier.
9. Seller hands off to carrier or origin hub with a custody scan.
10. Export/customs/carrier events update the normalized shipment timeline.
11. Delivery proof starts payout, return, and warranty clocks according to the frozen policy.
12. Adjustments, shortages, damage, returns, duty changes, and claims post to the settlement ledger.

### 7.5 No unauthorized substitution

Exporters and distributors must not substitute:

- a different brand;
- a different part or supersession not approved by catalog policy;
- a different manufacturing origin;
- a different condition;
- a different package quantity;
- a different dangerous-goods state;
- a materially different compliance or warranty status.

Any material change requires a new eligibility check, price/landed-cost calculation, and customer approval.

## 8. Supabase implementation blueprint

### 8.1 Reuse versus new records

Reuse:

- organizations, legal entities, locations, memberships, and roles;
- canonical products, provider mappings, and fitment assertions;
- private inventory ledgers and published offers;
- reservations;
- parent orders and seller sub-orders;
- payment and settlement ledgers;
- returns, warranties, cores, recalls, and cases;
- files/evidence and audit events.

Do not create a second customer, catalog, inventory, or order system solely for exports.

### 8.2 New trade entities

| Entity | Purpose |
|---|---|
| trade_country_packs | Versioned origin and destination customs/tax/operations configuration |
| trade_lanes | Stable lane identity and ownership |
| trade_lane_versions | Effective-dated seller/importer, product, carrier, duty, returns, warranty, and policy configuration |
| trade_lane_product_rules | Allow, review, or prohibit by domain/category/product/condition/DG class |
| export_capability_enrollments | Partner legal entity/location capabilities, approval, evidence, expiry, and limits |
| trade_parties | Frozen order-time exporter, importer, broker, consignee, payer, responsible party, and warranty roles |
| customs_classifications | Product plus origin/destination nomenclature, code, rationale, evidence, reviewer, confidence, and effective dates |
| origin_assertions | Non-preferential manufacturing origin and evidence |
| preferential_origin_claims | Agreement, rule, proof, issuer, validity, and audit state |
| trade_compliance_records | Product-market requirements, labels, operators, permits, restrictions, and evidence |
| restricted_party_screenings | Party, lists/sources, result, match review, decision, timestamp, and version |
| export_control_reviews | Jurisdiction, classification, end user/use, licence state, reviewer, and decision |
| cross_border_quotes | Immutable quote inputs, result, currency, expiry, and lane version |
| landed_cost_components | Merchandise, freight, insurance, brokerage, duty, tax, EPR, fees, FX, reserve, and adjustment rule |
| trade_shipments | Sub-order shipment, mode, broker, carriers, package set, customs state, and delivery |
| trade_packages | Carton/pallet identifiers, contents, weights, dimensions, DG, labels, and custody |
| trade_documents | Document type, issuer, version, hash, storage key, access class, and status |
| customs_declarations | Country/system, declarant, reference, status, filing timestamps, and response |
| trade_events | Normalized event plus raw provider payload reference |
| consolidation_receipts | Hub custody, inspection, discrepancy, and onward allocation |
| trade_adjustments | Duty/tax/freight/FX/brokerage/penalty/storage/refund adjustment and allocation |
| trade_returns | Return, re-export, re-import, local disposal, repair, replacement, and customs relief |
| lane_scorecards | Volume, delivery, customs, claims, margin, and suspension metrics |

### 8.3 Key fields and versioning rules

- Store ISO country and currency codes, not display names.
- Store classification scheme, jurisdiction, full national code, nomenclature version, and effective dates.
- Do not assume the six-digit HS code is the complete import/export tariff code.
- Store manufacturing origin separately from shipping origin, seller country, brand country, and vehicle market.
- Treat preferential origin as a claim with evidence, never as a brand/manufacturer shortcut.
- Freeze quote, FX, duty/tax rule, classification, origin, seller/importer model, customer disclosure, and policy versions on the order.
- Keep raw provider values plus normalized values.
- Store document hashes and immutable versions.
- Never overwrite a customs declaration or screening result; supersede it.
- Time-stamp every manual override with reason, approver, and evidence.

### 8.4 RLS and privacy

- Partners access only their legal entities, locations, inventory, offers, orders, evidence, and assigned shipments.
- A buyer partner sees its procurement order and allowed documents, not the supplier's private costs or other customers.
- Brokers and 3PLs access only assigned shipments and minimum party/product data.
- Carriers receive only required booking, label, and customs data.
- Customers receive public and order-specific documents, never supplier cost, broker credentials, screening notes, or other tenants' data.
- 365 compliance, finance, support, and operations roles are separately scoped by region, market, and function.
- Service-role operations run only in trusted server jobs and use explicit tenant/lane inputs.
- Storage buckets separate public product media, tenant-private evidence, identity/KYB, customs documents, and security/audit material.
- Sensitive documents use signed URLs, expiry, watermarking where useful, access logs, and retention rules.

### 8.5 Atomic functions

Create reviewed database functions for:

- reserve_export_offer;
- release_export_reservation;
- accept_export_suborder;
- freeze_trade_parties_and_policies;
- create_cross_border_quote_snapshot;
- allocate_landed_cost;
- record_custody_scan;
- post_trade_adjustment;
- mark_customs_hold_or_release;
- post_export_delivery;
- open_cross_border_return;
- reconcile_duty_tax_adjustment;
- suspend_trade_lane;
- apply_recall_stop_sale_to_trade_orders.

Names are illustrative. Functions must enforce tenant, lane version, status transition, currency balancing, and idempotency.

### 8.6 Background jobs

- expire quotes and reservations;
- refresh tariff/rule/provider data without silently changing open orders;
- check evidence, permits, insurance, and capability expiry;
- screen parties at onboarding, order, payment, and pre-dispatch points as required;
- sync broker/carrier/customs events;
- request missing documents;
- detect stalled customs holds and delivery exceptions;
- reconcile carrier invoices and duty/tax disbursements;
- calculate lane economics and SLA;
- identify return/refund deadlines;
- apply recall and sanctions updates;
- quarantine provider feeds or lanes with abnormal failures.

## 9. Trade-lane decision engine

### 9.1 Eligibility sequence

The engine should evaluate:

1. destination serviceability;
2. customer/buyer eligibility;
3. seller/export-capability enrollment;
4. product/category/condition rule;
5. fitment and catalog confidence;
6. stock freshness and reservability;
7. customs classification;
8. origin evidence;
9. product-market compliance;
10. restricted-party, sanctions, end-use, and export-control rule;
11. dangerous-goods/carrier acceptance;
12. seller territory and brand restrictions;
13. importer, tax, and invoice model;
14. delivery-duty model;
15. return and warranty route;
16. payment/payout feasibility;
17. package/size/weight limit;
18. landed-cost quote;
19. contribution margin;
20. lane capacity and health.

Fail closed. Uncertain outcomes route to manual review or assisted sourcing, not automatic approval.

### 9.2 Rules hierarchy

Apply the strictest active rule across:

- global platform;
- origin country;
- destination country;
- customs union/region;
- origin legal entity/location;
- destination legal entity/importer;
- vehicle domain;
- category;
- canonical product;
- condition;
- brand/supplier;
- carrier/service/mode;
- customer type/end use;
- current recall/sanctions/emergency hold.

### 9.3 Decision result

Return:

- eligible;
- eligible after customer information;
- eligible after manual compliance review;
- eligible only for B2B/importer-managed purchase;
- eligible only for domestic destination stock;
- quote required;
- temporarily unavailable;
- prohibited;
- reason codes, customer-safe message, internal explanation, and evidence.

## 10. Classification, origin, and trade agreements

### 10.1 Classification

The Harmonized System provides an international six-digit foundation, but countries commonly extend it for their own tariff and statistical requirements. The platform must therefore store:

- WCO HS six-digit base;
- origin export classification where required;
- destination import tariff classification;
- national suffix and nomenclature version;
- ruling/reference/evidence;
- classification description and reasoning;
- material, function, composition, and vehicle/application facts used;
- reviewer and confidence;
- effective/expiry dates.

Do not classify every item as a generic motor-vehicle part. Some products are classified by material or function in headings outside the vehicle-parts chapter.

### 10.2 Origin

Store separately:

- country of manufacture;
- country of substantial transformation/non-preferential origin;
- shipping/export country;
- seller country;
- brand headquarters country;
- preferential origin under a named agreement.

Brand location, warehouse location, or last shipping point does not establish preferential origin.

### 10.3 Preferential treatment

Never promise a reduced tariff solely because two countries share a trade agreement. A claim requires:

- applicable agreement and current tariff schedule;
- product-specific origin rule;
- supplier/manufacturer origin statement and supporting bill-of-materials/process evidence as required;
- correct certificate/declaration format;
- direct transport/non-manipulation evidence where required;
- value/quantity threshold handling;
- record retention and verification cooperation;
- buyer/importer consent to make the claim;
- fallback duty if the claim is rejected.

RCEP, ASEAN agreements, USMCA/CUSMA/T-MEC, EU agreements, and other preferences must be separate rule packs with effective dates.

### 10.4 Binding decisions

For high-volume or uncertain parts, obtain formal tariff/origin rulings where available. Store the ruling, jurisdiction, holder, product scope, facts, effective dates, and conditions. Do not apply one ruling to a materially different item.

## 11. Documents and declaration workflow

### 11.1 Document set

Depending on the lane, generate or collect:

- customer purchase order;
- seller order confirmation;
- commercial or proforma invoice;
- packing list;
- export declaration/shipping bill reference;
- import declaration reference;
- bill of lading, air waybill, courier label, or road consignment note;
- certificate/declaration of origin;
- permits/licences;
- product compliance declarations/certificates;
- safety data sheet;
- dangerous-goods declaration and battery test summary where required;
- insurance certificate;
- inspection/condition/serial evidence;
- broker power of attorney/authorization;
- delivery proof;
- return, re-export, re-import, drawback, or duty-refund documents.

### 11.2 Document source of truth

Documents must be generated from frozen order and package facts, not editable free text. Every field should identify its source:

- canonical product;
- seller legal entity;
- buyer/importer profile;
- classification decision;
- origin assertion;
- actual pick/pack scan;
- carrier quote/booking;
- lane configuration;
- approved manual override.

### 11.3 Filing boundary

365 may prepare data and documents, but it must not represent that it files a customs declaration unless:

- the responsible 365 entity is legally permitted;
- the declarant/broker relationship is documented;
- credentials and delegated authority are valid;
- filing responses and corrections are integrated;
- record-retention and audit obligations are assigned;
- errors, penalties, and escalation responsibilities are contracted.

For early phases, use licensed customs brokers, declaring agents, freight forwarders, or carrier brokerage.

## 12. Landed cost, pricing, and quote control

### 12.1 Cost components

Calculate separately:

- supplier merchandise price;
- quantity breaks and minimums;
- origin pickup;
- export packing and handling;
- consolidation/cross-dock;
- export declaration/broker;
- international freight;
- fuel, security, remote-area, peak, and oversized surcharges;
- cargo insurance;
- customs value adjustments;
- duty and trade-remedy duties;
- import VAT/GST/sales tax;
- excise/environmental/EPR/core/tire/battery/chemical fees;
- destination brokerage/disbursement;
- storage/exam/inspection contingency;
- final mile;
- payment and FX cost;
- 365 fee/margin;
- reserve for adjustment/returns where lawful;
- rounding.

### 12.2 Currency rules

- Customer pays in one immutable order currency.
- Record source cost, quote currency, order currency, settlement currency, and ledger/base currency.
- Store FX provider, timestamp, rate, spread, rounding, and quote expiry.
- Refund policy must state whether original order-currency amount or recalculated FX applies, subject to law.
- Partner payout must not silently change because 365 quoted the customer incorrectly.
- Currency gains/losses and provider fees post to named ledger accounts.

### 12.3 Adjustments

Define tolerance and responsibility for:

- actual package weight/dimensions;
- carrier reweigh/reclass;
- customs classification/value change;
- rejected origin preference;
- duty/tax reassessment;
- storage/exam;
- remote/oversize surcharge;
- address correction;
- customer-caused information delay;
- seller data error;
- broker/carrier error;
- 365 quote-engine error.

Consumer lanes should minimize post-purchase collection. If a delivered total cannot be supported within a controlled tolerance, use quote-required or recipient-paid import charges with explicit acceptance.

### 12.4 Unit economics

Calculate contribution margin per shipment and lane:

**365 revenue and margin – payment – FX – carrier – broker – hub – insurance – support – fraud – loss/damage – returns – warranty – compliance – tax operations – credits**

Do not report merchandise GMV as revenue or count government charges as margin.

### 12.5 Customs valuation and low-value rules

The customs value engine must support more than the checkout merchandise subtotal. Depending on the lane, review:

- transaction value and related-party acceptability;
- assists, royalties/licence fees, packing, commissions, freight, and insurance treatment;
- discounts, rebates, free-of-charge goods, samples, warranty replacements, and promotional bundles;
- repair/processing value;
- used/remanufactured value;
- cores and returned goods;
- currency conversion date/rate;
- transfer price and post-import adjustments;
- destination low-value relief and simplified-entry rules;
- anti-dumping, countervailing, safeguard, retaliatory, or other trade-remedy duties.

Low-value thresholds and simplified procedures are effective-dated country rules, not global constants. The platform must not split orders artificially to avoid customs, tax, reporting, permit, or safety obligations.

## 13. Logistics and distribution network

### 13.1 Node types

| Node | Purpose |
|---|---|
| Partner store | Local inventory, pickup, dispatch, installation, returns |
| Distributor warehouse | Broad stock, replenishment, direct ship |
| Origin consolidation hub | Combine, inspect, repack, document, and export |
| Destination import hub | Import, clear, receive, and distribute |
| Cross-dock | Fast custody transfer without long storage |
| Bonded/free-zone warehouse | Hold goods under controlled customs status |
| Return/inspection center | Domestic customer returns, testing, grading, warranty |
| Repair/installation partner | Fitment confirmation, installation, chain of custody, warranty evidence |

### 13.2 Hub selection

Do not open a hub because a region looks large on a map. Require:

- committed volume and supplier density;
- airport/port/road access;
- carrier and broker competition;
- service to priority destinations;
- legal entity and customs feasibility;
- rent/labor/security economics;
- dangerous-goods capability if needed;
- inventory/custody controls;
- returns and warranty capability;
- system integration and scan compliance;
- insurance and business continuity.

### 13.3 Suggested network evolution

1. Philippine store/distributor direct shipping through approved couriers.
2. One Philippine consolidation partner near a major export gateway.
3. Destination-country return addresses through local partners.
4. Small scheduled B2B consolidations to one proven destination.
5. Regional partner/distributor hubs in markets with domestic demand.
6. 365-managed or owned hubs only after volume and control justify fixed costs.

Potential hub locations must be selected by measured lane demand, not predetermined. Manila, Singapore/Malaysia, Japan/Korea, Netherlands/Belgium/Germany, UK, US coastal/central nodes, Canada, and Mexico may become candidates, but none is approved by this plan.

### 13.4 Packaging

Create category packaging standards for:

- delicate electronics and anti-static protection;
- seals and contamination control;
- fluids/residue and dangerous goods;
- sharp/heavy items;
- glass/body panels;
- rotors/drums and dense metal;
- tires/wheels;
- engines/transmissions/large assemblies;
- marine corrosion protection;
- used/greasy parts;
- tamper evidence and serialized security labels.

Capture actual package weight/dimensions, package photos, seals, and custody scans. Carrier acceptance does not replace legal dangerous-goods classification.

## 14. Returns, warranties, and cores

### 14.1 Policy snapshot

At order time store:

- statutory rights;
- voluntary return window;
- cancellation cut-off;
- return destination;
- return freight payer;
- duties/tax recovery treatment;
- installed/opened/programmed/custom exceptions where lawful;
- warranty provider, scope, duration, and evidence;
- labor, towing, diagnostic, consequential, and downtime treatment;
- core amount, deadline, condition, and route;
- currency/FX/refund method;
- claim and appeal SLA.

### 14.2 Return routing hierarchy

1. destination-country partner inspection;
2. destination regional return center;
3. repair or replacement without return;
4. refund without return for low-value/uneconomic cases;
5. approved local disposal/recycling with evidence;
6. return to origin with re-export/re-import/customs-relief process.

Do not routinely fly low-value defective parts back across the world.

### 14.3 Fitment responsibility

Classify the cause:

- 365 catalog/fitment error;
- supplier catalog error;
- seller shipped wrong item;
- unauthorized substitution;
- customer entered wrong vehicle or rejected qualifier;
- vehicle modified/swapped;
- installer error;
- damaged/defective item;
- customs/carrier loss or damage.

Responsibility determines refund, return freight, labor policy, seller debit, provider correction, and fitment record remediation.

### 14.4 Cores

Cross-border cores require:

- core export eligibility and condition;
- dangerous-goods/contamination check;
- customs value and temporary/return treatment;
- serial/identity link to replacement;
- prepaid route or consolidation;
- inspection criteria;
- credit timing and disputes;
- time limit;
- local recycling fallback.

Default to domestic/regional core programs until reverse-logistics economics are proven.

## 15. Payments, settlement, tax, and credit

### 15.1 Settlement rules

The ledger must allocate:

- merchandise;
- seller tax;
- import tax/duty;
- shipping and insurance;
- broker/hub/carrier charges;
- 365 fees;
- discounts and funder;
- payment/FX costs;
- withholding;
- reserve;
- refund/chargeback;
- duty/tax adjustment;
- warranty/return/core credit;
- seller payout.

Never calculate seller payout only as payment captured minus commission.

### 15.2 Payout timing

Payout policy can use:

- dispatch milestone;
- export-clearance milestone;
- import-clearance milestone;
- delivery milestone;
- return-window hold;
- partner risk tier;
- reserve for cross-border claims.

The supplying partner should not bear customs delays caused by 365 or the buyer unless the contract assigns that risk. Conversely, seller misdescription, false origin, bad packing, or wrong parts can justify holds and chargebacks.

### 15.3 B2B credit

Add:

- credit application and beneficial-owner verification;
- credit limit by legal entity/currency;
- purchase approval limits;
- deposits;
- trade credit insurance/guarantee where appropriate;
- aging and suspension;
- late fees where lawful;
- dispute and short-pay workflow;
- supplier payment obligations independent from buyer collection where contracted.

365 should not finance large imported orders before credit policy, collections, fraud, and foreign-currency exposure are controlled.

### 15.4 Related entities and intercompany trade

If a 365 origin entity sells to or transfers inventory through a 365 destination entity, define:

- intercompany buyer/seller and inventory title;
- transfer-pricing method and supporting agreements;
- customs value and related-party evidence;
- currency and settlement;
- import VAT/GST recovery;
- warehouse, marketing, software, warranty, and support service charges;
- permanent-establishment and local tax review;
- inventory in transit and elimination entries;
- responsibility for obsolescence, recalls, returns, and bad debt.

Customer marketplace settlement and corporate intercompany accounting are separate ledgers and must reconcile without being collapsed into one payout calculation.

## 16. Provider integration contract

### 16.1 Capability model

Every provider adapter declares supported countries, accounts, locations, product classes, services, currencies, and functions.

Export-related capabilities may include:

- validate_address;
- validate_tax_customs_id;
- get_export_eligibility;
- get_import_eligibility;
- classify_product;
- get_tariff_tax_quote;
- get_landed_cost_quote;
- screen_restricted_party;
- book_brokerage;
- create_shipment;
- create_documents;
- submit_declaration;
- amend_or_cancel_declaration;
- get_customs_events;
- get_tracking;
- create_return;
- request_duty_refund;
- reconcile_invoice;

Unsupported operations return an explicit capability error.

### 16.2 Integration requirements

- sandbox/test and production accounts;
- account/legal-entity/location mapping;
- country, service, and product restrictions;
- versioned API/feed/EDI/CSV specification;
- idempotency;
- signed webhooks and replay protection;
- stable external identifiers;
- normalized and raw status storage;
- quote and booking expiry;
- rate limits and retries;
- polling fallback;
- circuit breaker and manual fallback;
- data residency/transfer and retention;
- credential secret references and rotation;
- SLA, support, escalation, and outage notice;
- reconciliation files/invoices;
- change-management notice;
- termination and data export/deletion;
- test certification by lane.

### 16.3 Distributor/supplier data feed

Require:

- manufacturer and brand;
- manufacturer/supplier part number;
- GTIN/barcode where available;
- OE/interchange/supersession;
- structured fitment;
- condition;
- package quantity and unit;
- actual/nominal weight and dimensions;
- materials/function/customs description;
- origin and supporting evidence;
- HS/national classifications with jurisdiction/version;
- dangerous-goods state, UN number, SDS/test summary as applicable;
- compliance, labels, warnings, and responsible-party data;
- warranty/return/core terms;
- territorial/channel restrictions;
- stock, lead time, cutoff, price tiers, currency, and minimums;
- images and content usage rights;
- batch/lot/serial/recall requirements;
- change and delete/tombstone feed.

Missing fields must lower export eligibility rather than silently default.

### 16.4 Normalized failure reasons

At minimum:

- invalid address;
- missing customs ID;
- classification required;
- origin evidence missing;
- product restricted;
- dangerous goods unsupported;
- sanctioned/restricted-party review;
- seller not approved;
- importer unavailable;
- carrier unavailable;
- package limit exceeded;
- quote expired;
- price/stock changed;
- declaration rejected;
- customs information requested;
- duty/tax payment requested;
- returned/refused/abandoned;
- provider unavailable.

## 17. Required contract clauses

The following are drafting requirements for counsel, not final legal language.

### 17.1 Parts Partner Export Addendum

Include:

1. legal entity, approved locations, territories, domains, categories, conditions, and fulfilment modes;
2. independent-business status and no unauthorized agency;
3. seller, exporter, declarant, importer, tax, warranty, and return responsibilities;
4. inventory ownership, reservation, title, risk, and custody transfer;
5. accurate catalog, part number, fitment, condition, stock, package, and lead-time data;
6. classification, origin, preference, customs value, material, and end-use evidence;
7. export-control, sanctions, anti-diversion, anti-bribery, and restricted-party cooperation;
8. authenticity, authorized sourcing, product safety, labels, warnings, traceability, recalls, and stop-sale;
9. no unauthorized substitutions;
10. dangerous-goods classification, trained staff, packaging, labels, documents, and incident reporting;
11. direct/blind-ship, neutral packing, customer-contact, and non-solicitation boundaries where lawful;
12. pick/pack/scan/photo/serial/lot and dispatch standards;
13. commercial invoice, packing list, declarations, permits, and record retention;
14. carrier/broker handoff, custody, loss, damage, customs hold, refusal, and abandonment;
15. pricing, currency, quote validity, fees, withholding, reserves, payout, adjustments, and reconciliation;
16. returns, warranty, labor policy, cores, re-export/re-import, disposal, and duty recovery;
17. service levels, capacity, holidays, performance scoring, corrective action, and suspension;
18. customer data use limits, privacy, security, breach notice, and subprocessors;
19. catalog/content licence, territory/channel rights, provenance, correction, and termination;
20. audit, sample inspection, mystery order, records, and regulator cooperation;
21. insurance, indemnity, limitation allocation, recall cost, penalties, and claims;
22. change control, evidence renewal, law/regulation updates, and emergency controls;
23. termination, open-order completion, return/claim tail, payout, records, data export, and badge removal.

### 17.2 Distributor purchasing/direct-ship agreement

Add:

- wholesale price tiers and effective dates;
- territory/channel/customer restrictions;
- minimum order and freight terms;
- stock/price feed accuracy and reservation;
- order acknowledgement, allocation, backorders, discontinuation, and supersession;
- drop-ship/ship-to-store/customer-neutral packing;
- export and import capability by lane;
- brand authorization and authenticity evidence;
- catalog/fitment/content/data rights;
- service levels and cut-offs;
- packing, dangerous goods, documents, broker/carrier;
- shipment, ASN, tracking, invoice, credit, and reconciliation;
- warranty, defects, returns, cores, recalls, and product liability;
- rebate calculation, reporting, audit, and payment;
- data privacy and no unauthorized customer marketing;
- continuity, allocation priority, termination, and outstanding orders.

### 17.3 3PL, consolidation, broker, and carrier clauses

Add:

- licensed/authorized status and territorial scope;
- facility, account, lane, mode, and commodity capability;
- custody scan and chain of custody;
- inventory status and customs status;
- receiving, discrepancy, inspection, repacking, labeling, and dispatch;
- document preparation versus legal declaration responsibility;
- delegated authority and power-of-attorney limits;
- service levels and cut-off times;
- dangerous-goods capability and training;
- screening/security and theft prevention;
- loss, damage, delay, customs penalty, storage, demurrage, and abandoned goods;
- event/API/EDI data, proof, invoice, and reconciliation;
- subcontractors/final mile;
- privacy/security and incident notice;
- insurance and claims;
- business continuity and data portability;
- audit, suspension, and exit assistance.

### 17.4 Customer export terms

Disclose:

- seller and marketplace identity;
- exporter/importer and customer obligations;
- plain-language duty/tax/brokerage model;
- quote validity and adjustment conditions;
- customs-data accuracy and authorization;
- delivery estimate and customs uncertainty;
- restricted product/end-use confirmation;
- cancellation cut-off;
- split shipment and substitution rules;
- statutory and voluntary returns;
- international return costs;
- warranty location and coverage;
- duties/tax refund limitations;
- abandoned/refused shipment consequences subject to law;
- privacy and necessary cross-border sharing;
- complaint, dispute, and regulator routes.

### 17.5 Integration/data addendum

Every integrated provider should accept:

- exact allowed data purposes and territories;
- ownership/licence and sublicensing rights;
- display, storage, caching, translation, normalization, AI use, print/export, and retention limits;
- update, correction, tombstone, recall, and delete duties;
- accuracy and freshness SLA;
- security, credentials, webhook signing, and incident notice;
- personal-data roles and transfers;
- test/live separation;
- change/deprecation notice;
- usage metering and audit;
- exit data and deletion;
- liability for materially incorrect or unauthorized data.

## 18. Country-of-origin activation packs

### 18.1 Country pack template

Every export-origin country needs an effective-dated pack containing:

- responsible 365 and partner legal entities;
- exporter/declarant registration and identifiers;
- customs system and broker/delegation model;
- export declaration thresholds/exemptions and filing timing;
- export classification nomenclature;
- invoice/packing/document requirements;
- permits and controlled/restricted goods;
- origin/certificate systems and trade agreements;
- indirect-tax export treatment and evidence;
- export-control, sanctions, and end-use rules;
- currency/payment/repatriation rules;
- carrier/port/airport modes and cut-offs;
- dangerous-goods rules;
- record-retention period;
- correction/cancellation/return/re-import process;
- regulator, broker, counsel, carrier, and emergency contacts;
- test cases and last legal review.

### 18.2 Asia-Pacific origin programs

| Origin | Required activation work |
|---|---|
| Philippines | BOC exporter/broker process; Export Declaration; commercial/proforma invoice; packing list; product permits; origin certificates/declarations; tax/export evidence; courier, air, and ocean pilots; return/re-import process |
| Singapore | UEN and Customs Account; TradeNet declaring-agent model; direct/approved-premises/temporary/re-export permit types; GST/customs status; controlled goods; regional consolidation feasibility |
| Japan | exporter/broker model; Export/Reshipment Declaration; invoice and case-specific packing list/permits; Japanese classification/origin; consumption-tax export evidence; domestic catalog and language |
| South Korea | UNI-PASS declarations; exporter/broker account; KCS classification/origin/FTA evidence; VAT export evidence; Korean catalog and partner integrations |
| Mainland China | legal exporter and customs registration; China International Trade Single Window; GACC declaration; export VAT/tax treatment; foreign-exchange/payment; origin; controlled goods; supplier authorization and inspection |
| Hong Kong | business/exporter setup; customs declarations; strategic/controlled-goods checks; re-export/origin accuracy; air/ocean consolidation and China boundary |
| Taiwan | exporter registration; Customs Administration declaration; classification/origin; BSMI/other product controls; tax and carrier setup |
| Malaysia | exporter/legal entity; Royal Malaysian Customs electronic declarations; permits; SST/export evidence; ASEAN/RCEP origin; port/air consolidation |
| Thailand | exporter/legal entity; e-Customs declaration; permits; VAT export evidence; ASEAN/RCEP origin; Thai-language catalog and logistics |
| Indonesia | NIB/OSS and customs access; CEISA/export declaration; prohibited/restricted goods; tax and foreign-exchange evidence; archipelago logistics |
| Vietnam | exporter/tax registration; VNACCS/VCIS declaration; permits; VAT export evidence; origin certificates; Vietnamese-language operations |
| India | IEC; ICEGATE/ICES or approved courier workflow; shipping bill; GST/export documentation; bank/AD code as applicable; controlled goods; return/re-import |
| Australia | ABN/exporter and Integrated Cargo System/broker process; export declarations and controlled-goods checks; GST evidence; biosecurity/packaging; regional carriers |
| New Zealand | Customs client/exporter code; electronic export entry and permits; GST evidence; biosecurity/packaging; carrier and return setup |

This table is a work queue, not proof of activation. Each row requires current official confirmation and local sign-off.

### 18.3 Europe origin programs

Treat Europe as several customs and legal programs:

| Origin group | Required activation work |
|---|---|
| EU member state | EORI; national customs-declaration access/broker; Union versus non-Union goods status; export declaration and exit evidence; VAT zero-rating evidence; TARIC/national classification; origin; dual-use/sanctions; national product/EPR overlays |
| Intra-EU movement | No external-border export declaration for Union goods, but VAT, invoice, seller/product, transport evidence, reporting, EPR, and destination consumer rules still apply |
| Germany/France/Italy/Spain/Poland and other seller states | Add national invoicing, EPR, language, customs portal/broker, labor/warehouse, and record overlays |
| Netherlands/Belgium hub | Customs representation, port/airport community systems, bonded/free-circulation status, VAT/fiscal representation, transit, and re-export controls |
| United Kingdom | GB/XI EORI as applicable; Customs Declaration Service/broker; export declaration; VAT export evidence; origin; controlled goods; EU/NI boundary; UK product-safety and returns |
| Norway | Separate EEA-but-non-EU customs, VAT, importer, product, and return pack |
| Switzerland | Separate customs, VAT, importer, product-language, and return pack |
| Turkey | Customs-union treatment does not eliminate country-specific customs, ATR/origin, tax, product, payment, and export-control work |
| Other European countries | Separate national market and origin packs; never inherit EU activation solely by geography |

EU inbound shipments also require the carrier/supply chain to meet current ICS2 advance cargo requirements. That responsibility and required data must be confirmed for each transport model.

### 18.4 North America origin programs

| Origin | Required activation work |
|---|---|
| United States | USPPI/exporter model; Schedule B/HTS classification; AES/EEI filing rules and exemptions; EAR/end-use/end-user and OFAC screening; state/local seller operation; carrier/broker; Canada/Mexico and overseas return flows |
| Canada | exporter and BN/RM configuration as applicable; CERS reporting and exceptions; Canadian Export Control List/sanctions; GST/HST export evidence; English/French documentation; carrier/broker; CARM when 365/partner imports into Canada |
| Mexico | RFC/legal exporter; VUCEM/customs access; customs broker; pedimento and invoice/complement requirements; tariff classification; permits; VAT/export evidence; USMCA/T-MEC origin; return/re-import |

USMCA/CUSMA/T-MEC preference is not automatic for every part sold between the three countries. Product-specific origin and certification must be supported.

### 18.5 Destination pack

An origin pack never proves a product may enter the destination. Each destination pack must add:

- importer eligibility;
- import declaration/system;
- tariff, trade remedy, and valuation;
- VAT/GST/sales tax and marketplace rules;
- low-value rules with effective dates;
- product safety, economic operator, labels, language, and recalls;
- emissions, environmental, tire, battery, chemical, and EPR rules;
- consumer/B2B terms;
- privacy and data sharing;
- local payment and settlement;
- domestic delivery;
- local returns/warranty;
- regulator and broker contacts.

### 18.6 Current official implementation anchors

As of this document date, the official sources below establish several useful starting points. Store each rule with source, jurisdiction, effective date, last-checked date, reviewer, and expiry/recheck date rather than hard-coding it permanently:

- The Philippines Bureau of Customs export guidance lists the Export Declaration printout, proforma/commercial invoice, packing list, and other documents required for the goods.
- The EU states that an EORI is mandatory for customs clearance of imports, exports, and transit; inbound supply-chain actors must also account for current ICS2 advance cargo requirements.
- Japan Customs states that an Export/Reshipment Declaration is accompanied by an invoice or substitute, with packing lists, permits, and other documents required in applicable cases.
- Singapore requires export permit applications through TradeNet; exporter setup begins with a UEN/business registration and Customs Account or an appointed declaring agent.
- Current US Census guidance requires EEI when a shipment exceeds USD 2,500 per Schedule B/HTSUSA code or meets another mandatory filing rule, subject to exemptions and special cases.
- Canada provides CERS for electronic export reporting and CARM for commercial import duty/tax accounting; exact registration, reporting, and exception rules must be resolved per shipment.
- The UK uses GB/XI EORI identifiers as applicable and customs declarations for exports.

These are anchors only. They do not replace product permits, sanctions/export controls, tax, product safety, carrier rules, destination requirements, or local professional review.

## 19. Export controls, sanctions, fraud, and diversion

### 19.1 Screening points

Screen according to legal advice and risk at:

- partner onboarding and renewal;
- customer/business onboarding;
- quote or order;
- payment;
- pre-dispatch;
- material party/address/end-use change;
- list/rule update;
- return/re-export.

### 19.2 Parties and facts

Screen:

- buyer, consignee, importer, payer, beneficial owner, end user, broker, supplier, and intermediaries;
- addresses, countries, ports, vessels, and banks when applicable;
- product/export-control classification;
- final destination and end use;
- diversion/red-flag patterns.

### 19.3 Automotive and equipment risk

Most ordinary maintenance parts are not inherently dual use, but risk rises for:

- advanced sensors, cameras, radar/lidar, navigation, encryption, and communications;
- drones and unmanned systems;
- military-pattern vehicles/equipment;
- heavy off-road, marine, aviation-adjacent, and industrial components;
- high-performance engines, power electronics, and specialized materials;
- shipments to restricted parties, destinations, or suspicious end uses.

The system must support review rather than hard-code that all automotive parts are uncontrolled.

### 19.4 Fraud controls

- seller identity and bank verification;
- customer/importer verification proportionate to risk;
- device/payment/address/velocity checks;
- high-risk part and destination review;
- stolen/counterfeit/serial anomaly detection;
- chargeback and friendly-fraud evidence;
- package weight and photo mismatch;
- collusion and self-dealing detection;
- payout holds and reserves;
- manual review with reason and audit.

## 20. Internal 365 operating organization

Minimum functions:

| Function | Responsibility |
|---|---|
| Global trade owner | Policy, lane approval, accountable executive, risk acceptance |
| Country lead | Local partners, support, operations, provider and regulator relationships |
| Customs/classification | Classification, origin, broker management, declarations, audits |
| Product compliance | Safety, labels, responsible parties, EPR, restricted products, recalls |
| Export controls/sanctions | Screening policy, escalations, licences, diversion, records |
| Catalog/fitment | Canonical identity, domain fitment, supplier data, corrections |
| Logistics | Carriers, 3PLs, hubs, packaging, loss/damage, performance |
| Finance/tax | Pricing, FX, tax, duty, reconciliation, payout, credit, reporting |
| Returns/warranty | Local routing, inspection, claims, cores, recovery |
| Partner success | Onboarding, training, score, corrective action |
| Customer support | Multilingual order/customs/return support |
| Engineering/data | Lane engine, adapters, Supabase, security, observability |
| Legal/privacy/security | Contracts, data roles, incidents, insurance, regulator response |

Do not activate lanes that depend on one founder manually remembering every customs or warranty exception.

## 21. Admin control center

Add:

- country-pack versions and approvals;
- trade-lane builder and four-eyes approval;
- category allow/review/prohibit matrix;
- partner capability/evidence/expiry;
- classification and origin review queue;
- product-market compliance;
- restricted-party/export-control review;
- quote and landed-cost diagnostics;
- shipment/customs exception queue;
- broker/carrier/provider health;
- document and declaration audit;
- returns/warranty/cores;
- duty/tax and carrier reconciliation;
- lane scorecards and unit economics;
- emergency lane/category/product/seller/customer hold;
- regulator, recall, sanctions, and incident case management.

High-impact overrides require separation of duties, reason, evidence, expiry, and immutable audit.

## 22. Rollout roadmap

### Phase 0 — design and legal boundary

- Link this plan to the master/global plans.
- Decide seller/exporter/importer models.
- Build country-pack and lane data definitions.
- Select first low-risk product classes.
- Select broker, carrier, legal, tax, and product-safety advisers.
- Draft export addenda and customer disclosures.
- Confirm insurance.

**Exit gate:** one origin/destination/product/carrier model is documented end to end.

### Phase 1 — Philippines export-assisted pilot

- Enroll 2–3 verified suppliers.
- Use manual quote review and licensed broker/carrier.
- Offer B2B assisted sourcing before open consumer checkout.
- Export only green-tier, parcel-sized, well-documented parts.
- Capture every quote, document, cost, event, exception, and return.
- Reconcile landed cost manually.

**Exit gate:** 20–50 successful shipments with no unresolved compliance failures and acceptable margin/service.

### Phase 2 — export workspace and lane engine

- Add export capability onboarding.
- Build country/lane/version records.
- Add product readiness and compliance gates.
- Add cross-border quote snapshots and landed-cost components.
- Add trade parties, packages, documents, and normalized events.
- Add admin review and emergency holds.

**Exit gate:** a test order cannot bypass seller, product, importer, carrier, returns, or warranty gates.

### Phase 3 — one automated parcel lane

- Integrate one carrier/broker service.
- Automate booking, labels, documents, tracking, and invoice reconciliation.
- Offer delivered total only where provider responsibility is clear.
- Add customer customs-information and exception flows.
- Add domestic destination return address.

**Exit gate:** automated and provider invoices reconcile; quote variance, customs delay, and return rates pass targets.

### Phase 4 — regional B2B consolidation

- Add origin hub/cross-dock.
- Combine commercial orders on a schedule.
- Add pallet/carton manifests, receiving, discrepancies, and allocation.
- Add B2B credit and procurement integrations.
- Evaluate destination import hub.

**Exit gate:** consolidation saves cost without unacceptable delay, damage, or working-capital exposure.

### Phase 5 — repeatable origin-country factory

- Activate a second APAC origin pack.
- Activate one Europe origin pack.
- Activate US and Canada origin packs independently.
- Reuse shared architecture while proving local customs and operations.
- Version laws, providers, classifications, and policies.

### Phase 6 — selected consumer and regional stock

- Open proven lanes to consumers.
- Add local installation/warranty.
- Import high-demand stock into destination regions.
- Introduce fitment guarantee selectively.
- Evaluate 365 private label/owned inventory separately.

## 23. Launch gates and acceptance tests

| Gate | Required evidence |
|---|---|
| Responsibility | Seller, exporter, declarant, importer, tax, warranty, and return parties frozen |
| Partner | Legal entity/location/capability approved with valid evidence and insurance |
| Product | Identity, fitment, condition, classification, origin, compliance, DG, and authenticity pass |
| Customer | Address, importer/customs/end-use information and consent complete |
| Quote | Costs, currency, duty model, expiry, tolerance, and margin approved |
| Payment | Exact country/currency collection, refund, dispute, payout, and reconciliation work |
| Documents | Invoice, packing, labels, declarations, permits, and evidence are consistent |
| Carrier/broker | Service accepts the commodity/package and returns usable events/reconciliation |
| Security/compliance | Screening, access, audit, privacy, and evidence retention pass |
| Returns/warranty | Destination route, owner, costs, customs relief, and customer policy exist |
| Operations | Named staff can handle normal and exception scenarios in required language/timezone |
| Economics | Contribution margin remains acceptable after real adjustments/returns/support |
| Emergency | Product, seller, category, lane, and destination can be stopped immediately |

Required scenario tests:

- stock changes after quote;
- quote expires;
- wrong/ambiguous fitment;
- missing origin;
- classification conflict;
- restricted party possible match;
- carrier rejects dangerous goods;
- package reweigh;
- customs information request;
- duty reassessment;
- split shipment;
- seller ships wrong part;
- product damaged/lost;
- customer refuses charges;
- return to local center;
- return to origin/re-import;
- warranty replacement;
- core not returned;
- recall after delivery;
- provider outage/webhook replay;
- duplicate order/refund/event;
- partner or lane suspended mid-order.

## 24. KPI and lane economics

Report by origin, destination, lane version, legal entity, partner, domain, category, condition, carrier, broker, and customer type:

- eligible catalog share and reasons blocked;
- classification/origin/compliance completeness;
- quote conversion and expiry;
- stock acceptance/cancellation;
- actual versus quoted weight, freight, duty, tax, FX, and landed cost;
- dispatch and export-document SLA;
- customs clearance time and hold reasons;
- delivery time and on-time percentage;
- loss, damage, refusal, return-to-origin, and abandonment;
- return, fitment error, warranty, and core rate;
- duty recovery and refund aging;
- customer contacts and complaint resolution;
- provider uptime and event latency;
- settlement and invoice mismatch;
- GMV, 365 revenue, gross margin, support/compliance cost, and contribution margin;
- partner and lane suspension rate.

Stop or restrict a lane when safety, legality, service, data quality, or contribution margin falls below its approved threshold.

## 25. Risk register

| Risk | Control |
|---|---|
| Wrong part crosses the world | Domain fitment qualifiers, order-time assertion, no unauthorized substitution |
| Surprise duty/fees | Explicit duty model, landed-cost components, quote expiry, no unsafe delivered promise |
| Wrong exporter/importer | Frozen trade parties and country/lane approval |
| False origin preference | Evidence-backed claims, fallback duty, audit, supplier liability |
| Wrong classification | Versioned rationale, expert review, formal rulings for volume |
| Illegal destination sale | Product-market compliance and strictest-rule engine |
| Dangerous goods rejected | DG master, trained shipper, carrier capability, fail closed |
| Sanctions/diversion | Multi-point screening, end-use review, manual escalation |
| Counterfeit/stolen product | Verified supply chain, serial/photo evidence, holds, brand escalation |
| Customs delay destroys experience | Honest ETA, event normalization, support, broker SLA |
| Returns destroy margin | Domestic returns, restricted classes, refund-without-return, lane economics |
| Partner contacts customer directly | Data minimization and contractual use limits |
| 365 assumes liability accidentally | Clear roles, legal disclosures, no generic international switch |
| Hub inventory double counted | Custody versus ownership records and ledger transitions |
| Customs status mixed | Free-circulation/bonded/temporary status on every stock unit |
| Provider outage | Adapter circuit breaker, manual fallback, queued idempotent jobs |
| Law/rate changes | Effective-dated packs, expiry, revalidation, order snapshots |
| FX loss | Expiring quote, spread/tolerance, ledger, reserve, reconciliation |
| Low-value threshold changes | Versioned destination rules; no hard-coded global threshold |
| Export data leaks | Regional/tenant RLS, minimum disclosure, signed URLs, access logs |

## 26. Decisions required before coding

| Decision | Recommended position |
|---|---|
| First origin | Philippines |
| First customer type | B2B assisted sourcing |
| First products | Green-tier, parcel-sized, non-dangerous, documented |
| First destination | Select by committed demand, broker/carrier support, returns, and economics |
| Seller model | Partner/distributor seller for pilot |
| Importer model | Named B2B buyer/importer for earliest controlled lanes; delivered model only after proof |
| Customs filing | Licensed broker/carrier, not 365 self-filing initially |
| Returns | Destination-country partner/center whenever possible |
| Warranty | Named seller/manufacturer plus local 365 coordination |
| Quote | Manual approval first, automated after variance evidence |
| Consumer launch | After B2B lane proves service, compliance, and economics |
| Hubs | Third-party consolidation before 365-owned facilities |
| Dangerous goods | Disabled initially |
| Used safety parts | Disabled initially |
| Preferential tariffs | Claim only with evidence; otherwise quote normal duty |

## 27. Definition of done

Global parts export is not complete when an international shipping label can be printed. It is complete for one lane only when:

- the exact origin/destination/entity/product/carrier/return/warranty configuration is approved and versioned;
- every required trade party and responsibility is frozen;
- supplier stock is accurately published and reserved;
- product identity, fitment, condition, classification, origin, compliance, safety, and authenticity pass;
- the customer sees a clear delivered-cost or recipient-charge promise;
- payment, payout, FX, tax, duty, refund, and adjustments reconcile;
- the seller can pick, inspect, document, pack, and hand off correctly;
- broker/carrier/customs events are visible and exceptions have owners;
- delivery, return, warranty, and core workflows function across borders;
- Shop Manager isolates each company's inventory, costs, customers, evidence, and accounting;
- Supabase RLS and negative tenant tests pass;
- records, documents, screening, and audit are retained correctly;
- support can serve the lane;
- emergency stops work;
- pilot metrics meet approved service, safety, compliance, and contribution-margin thresholds.

Until those conditions are met, the route should remain catalog preview, waitlist, RFQ, referral, or assisted sourcing.

## 28. Primary official references

These links are architecture inputs and must be rechecked when a country pack or lane is approved.

### International customs and delivery terms

- [World Customs Organization: What is the Harmonized System?](https://www.wcoomd.org/en/topics/nomenclature/overview/what-is-the-harmonized-system.aspx)
- [WCO HS Nomenclature 2022 edition](https://www.wcoomd.org/en/topics/nomenclature/instrument-and-tools/hs-nomenclature-2022-edition.aspx)
- [ICC Incoterms rules](https://iccwbo.org/business-solutions/incoterms-rules/)
- [ICC Incoterms 2020](https://iccwbo.org/business-solutions/incoterms-rules/incoterms-2020/)

### Philippines and Asia-Pacific

- [Philippines Bureau of Customs export guidelines](https://customs.gov.ph/guidelines-on-exportation/)
- [Philippines Bureau of Customs import guidelines](https://customs.gov.ph/guidelines-on-importation/)
- [RCEP Agreement](https://asean.org/wp-content/uploads/2024/10/Regional-Comprehensive-Economic-Partnership-RCEP-Agreement-Full-Text.pdf)
- [Japan Customs: documents required for export declaration](https://www.customs.go.jp/english/c-answer_e/extsukan/5009_e.htm)
- [Singapore Customs: obtain an export permit](https://www.customs.gov.sg/doing-business/export-operations/export-procedures/obtain-customs-export-permit/)
- [Singapore Customs: export permit types](https://www.customs.gov.sg/doing-business/export-operations/export-procedures/types-of-export-permits/)
- [Korea Customs Service](https://www.customs.go.kr/english/main.do)
- [General Administration of Customs of China](https://english.customs.gov.cn/)
- [India CBIC Express Cargo Clearance System](https://courier.cbic.gov.in/)

### European Union and United Kingdom

- [EU EORI](https://taxation-customs.ec.europa.eu/customs/customs-procedures-import-and-export/customs-operations/economic-operators-registration-and-identification-number-eori_en)
- [EU Import Control System 2](https://taxation-customs.ec.europa.eu/customs/customs-security/import-control-system-2_en)
- [EU Access2Markets](https://trade.ec.europa.eu/access-to-markets/en/home)
- [EU preferential rules of origin](https://trade.ec.europa.eu/access-to-markets/en/content/preferential-rules-origin-0)
- [EU dual-use export controls](https://policy.trade.ec.europa.eu/help-exporters-and-importers/exporting-dual-use-items_en)
- [UK EORI](https://www.gov.uk/eori)
- [UK export customs clearance](https://www.gov.uk/export-customs-declaration)

### North America

- [US Census Foreign Trade Regulations quick guide](https://www.census.gov/foreign-trade/regulations/quickguide.pdf)
- [US CBP basic importing and exporting](https://www.cbp.gov/trade/basic-import-export)
- [US BIS end-user and end-use controls](https://www.bis.gov/licensing/guidance-on-end-user-and-end-use-controls-and-us-person-controls)
- [US OFAC sanctions list search](https://sanctionssearch.ofac.treas.gov/)
- [Canada CBSA exporting commercial goods](https://www.cbsa-asfc.gc.ca/services/export/menu-eng.html)
- [Canada CERS portal](https://www.cbsa-asfc.gc.ca/services/export/portal-portail/menu-eng.html)
- [Canada CARM](https://www.cbsa-asfc.gc.ca/services/carm-gcra/menu-eng.html)
- [Canada export controls](https://www.international.gc.ca/controls-controles/about-a_propos/expor/before-avant.aspx?lang=eng)
- [Mexico National Customs Agency courier information](https://www.anam.gob.mx/mensajeria-y-paqueteria/)

### Dangerous goods

- [IATA battery guidance](https://www.iata.org/en/programs/cargo/dgr/lithium-batteries/)
- [UNECE ADR 2025](https://unece.org/adr-2025-files)
- [IMO International Maritime Dangerous Goods Code](https://www.imo.org/en/ourwork/safety/pages/dangerousgoods-default.aspx)
