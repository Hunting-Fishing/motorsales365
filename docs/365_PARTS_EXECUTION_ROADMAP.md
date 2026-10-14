# 365 Parts Execution Roadmap

**Control document:** [`365_PARTS_PROGRAM_INDEX.md`](./365_PARTS_PROGRAM_INDEX.md)

**Status:** Sequenced delivery and scale roadmap

**Version:** 1.0

**Updated:** 2026-08-06

> Time ranges are planning envelopes, not promises. A step advances when its exit evidence is accepted, not because a calendar date arrives.

## 1. How to use this roadmap

Each step produces a defined business capability. Work may overlap only when dependencies are satisfied and the Program Index gate owner accepts the risk.

For every step, the program manager must record:

- accountable owner;
- delivery lead and contributors;
- approved scope and exclusions;
- dependencies and decisions;
- target and actual dates;
- budget and capital consumed;
- acceptance evidence;
- unresolved risks and follow-up work;
- status using the Program Index vocabulary.

The roadmap is divided into five horizons:

| Steps | Horizon | Strategic purpose |
|---|---|---|
| 1–10 | Philippines proof | Establish legal, technical, partner, catalog, financial, and quality foundations; complete controlled orders. |
| 11–20 | Philippine network | Add linked companies, distributor fulfilment, national density, buying power, and first assisted export. |
| 21–30 | International repeatability | Build the country-launch factory and prove domestic operations in selected foreign markets. |
| 31–40 | Connected global network | Connect proven markets through trade lanes, hubs, B2B services, financing partners, and traceability. |
| 41–50 | Long-term intelligence and capital | Private label, selective inventory, manufacturing, acquisitions, data products, and network defensibility. |

## 2. Steps 1–10 — Philippines proof

### Step 1 — Baseline program authority

**Outcome:** One approved source of truth for the program.

**Deliverables:**

- merge the detailed specifications and separated control documents;
- assign document owners and review dates;
- record current assumptions and unresolved conflicts;
- establish version, approval, and change-control rules;
- create a traceable backlog from roadmap deliverables.

**Exit evidence:** Current `main` contains the approved document set; each control document has an owner; P0 conflicts have decision IDs.

### Step 2 — Freeze the Philippine operating model

**Outcome:** Developers and partners know who is responsible for every domestic transaction.

**Deliverables:**

- identify platform operator, marketplace, seller of record, invoicing party, payment collector, and payout party;
- define consumer, B2B, affiliate click-out, assisted sourcing, and distributor-direct models;
- define refunds, disputes, warranties, counterfeit claims, tax, withholding, and customer-funds treatment;
- obtain current Philippine legal, tax, privacy, insurance, and payment-provider review;
- record decisions and required contracts.

**Exit evidence:** D-001 through D-010 or equivalent are approved; prohibited operating combinations are documented.

### Step 3 — Validate demand and founding economics

**Outcome:** The MVP is based on real Philippine demand rather than a giant speculative catalog.

**Deliverables:**

- collect wanted-part searches, repair estimates, lost sales, supplier invoices, no-result searches, and interviews;
- rank vehicle applications, locations, categories, urgency, price tolerance, and current sourcing routes;
- select the first 500–2,000 sellable SKUs/applications or a smaller evidence-backed set;
- obtain preliminary supplier, payment, delivery, return, and support costs;
- populate low/base/high unit-economics scenarios.

**Exit evidence:** Founding assortment, customer segments, service area, contribution-margin hypothesis, and cash requirement are approved.

### Step 4 — Correct Shop Manager tenancy

**Outcome:** A person can safely belong to several companies and locations without data leakage.

**Deliverables:**

- implement `user → organization → legal entity → shop/location → membership`;
- separate public business listings from private operational shops;
- add organization/shop ownership to operational rows;
- replace `profiles.shop_id` authorization with indexed membership and permission functions;
- add active-workspace selection as UI state only;
- migrate safely with reconciliation and rollback evidence.

**Exit evidence:** Multi-company RLS tests pass for owner, manager, technician, parts, finance, read-only, suspended, and former-member cases.

### Step 5 — Establish partner and supplier governance

**Outcome:** Only verified and contractually approved businesses may publish or fulfil parts.

**Deliverables:**

- KYB, beneficial owner/control, permits, tax, bank/payout, location, contact, and insurance fields;
- partner, supplier, distributor, installer, carrier, and 3PL agreement sets;
- role, category, market, location, and fulfilment-capability activation;
- service standards, training, scorecards, warning/suspension/termination flow;
- authenticity, returns, warranty, data, security, and audit obligations.

**Exit evidence:** Founding cohort has passed documented activation gates; no ordinary signup can self-activate network selling.

### Step 6 — Build canonical catalog and fitment MVP

**Outcome:** One product identity can support several sellers without inventing fitment.

**Deliverables:**

- canonical brand, product, manufacturer part number, identifiers, interchanges, supersessions, attributes, media, and condition;
- domain-specific vehicle/equipment identity and fitment assertions;
- source, license, lineage, evidence, confidence, effective date, conflict, correction, and approval records;
- seller-item mappings kept separate from canonical data;
- quarantine and human-review queues for uncertain mappings.

**Exit evidence:** Pilot assortment meets coverage, evidence, duplicate, and ambiguity thresholds; unverified fitment cannot be shown as confirmed.

### Step 7 — Build private inventory and publication boundary

**Outcome:** Partners keep private control while publishing safe availability to the network.

**Deliverables:**

- location/item stock ledger with receipts, issues, adjustments, transfers, reservations, and counts;
- separate network publication record with quantity band, price, lead time, pickup, delivery, warranty, and visibility controls;
- stock-source freshness, expiry, confidence, and manual-confirmation states;
- atomic reservation/release/consume functions;
- audit and reconciliation dashboards.

**Exit evidence:** No user can view or alter another company's private cost, bin, customer, or unrestricted quantity; oversell concurrency tests pass.

### Step 8 — Build assisted single-seller ordering

**Outcome:** 365 can complete controlled live orders without premature multi-seller complexity.

**Deliverables:**

- customer garage/search/product/offer/cart flow;
- one seller/location per checkout;
- stock confirmation, reservation, pickup, ship-to-shop, or supported delivery;
- immutable policy, price, fitment, tax, seller, and product snapshots;
- order events, communication, cancellation, refund, support, and evidence capture;
- daily manual financial and inventory reconciliation.

**Exit evidence:** End-to-end sandbox orders and limited live orders reconcile from search through final disposition.

### Step 9 — Connect Shop Manager quote to installation

**Outcome:** Repair shops can source a part and preserve the installed outcome.

**Deliverables:**

- estimate/work-order demand creates a network search without exposing customer data;
- approved offer becomes reservation and purchasing record;
- shipment, receiving variance, bin receipt, issue-to-work-order, installation, torque/relearn evidence, and invoice links;
- part/lot/serial/warranty record attached to the vehicle/equipment history;
- return, core, comeback, and warranty workflows.

**Exit evidence:** At least one controlled transaction completes the full diagnosis/need → order → receive → install → outcome chain.

### Step 10 — Pass the Philippine controlled-pilot gate

**Outcome:** Evidence supports continuation, correction, or stop.

**Required review:**

- stock-confirmation accuracy;
- correct-item-shipped rate;
- oversell and cancellation rate;
- order, payout, refund, and tax reconciliation;
- on-time promise performance;
- returns, warranties, disputes, counterfeit signals, and support effort;
- contribution margin and cash usage;
- RLS, recovery, incident, and recall exercises;
- partner and customer retention signals.

**Exit evidence:** Gate G5 decision records approved limits for Steps 11–20. Failure produces corrective work, not automatic scale.

## 3. Steps 11–20 — Philippine network

### Step 11 — Add network search inside Shop Manager

Publish approved local, distributor, and partner availability to authorized buyers. Preserve supplier terms and privacy. Record lost searches and buyer intent.

**Exit evidence:** A shop can compare eligible offers without accessing another partner's private ledger.

### Step 12 — Implement inter-company purchasing

Create seller sales order, buyer purchase order, reservation, shipment, receiving variance, AP/AR references, settlement, and return linkage as separate records.

**Exit evidence:** Ownership transfers only through documented shipment/receipt rules; stock is never copied into both companies as owned inventory.

### Step 13 — Add distributor direct fulfilment

Support acknowledgements, backorders, substitutions requiring consent, ASNs, package tracking, blind shipping, invoices, warranties, and feed reconciliation.

**Exit evidence:** Distributor failures degrade to clear customer/partner states rather than corrupting order or stock records.

### Step 14 — Build provider-adapter platform

Normalize CSV, API, EDI, webhook, SFTP, POS, carrier, payment, broker, and 3PL capabilities; add idempotency, retries, dead-letter queues, observability, and secrets management.

**Exit evidence:** One provider can be replaced or suspended without rewriting core order logic.

### Step 15 — Add multi-seller cart and settlement

Split parent orders into seller fulfilment orders; support partial authorization/capture, shipping allocation, commissions, withholding, payouts, partial refund, dispute, and ledger reconciliation.

**Exit evidence:** Every centavo is attributable to an immutable ledger event; partial failures do not create orphaned money or stock.

### Step 16 — Expand by Philippine density

Prioritize Ilocos/Northern Luzon, then selected Central Luzon and Metro Manila clusters based on demand, partner coverage, delivery economics, and support capacity.

**Exit evidence:** Each cluster passes its own service and contribution-margin gate before broader national marketing.

### Step 17 — Launch transparent buying-group operations

Aggregate demand and negotiate supplier terms while keeping member pricing independent. Define rebate allocation, commitments, cancellation, credit, confidentiality, and competition-law controls.

**Exit evidence:** Signed purchasing rules, auditable rebates, no exchange of competitors' restricted price/cost data, and positive member economics.

### Step 18 — Add national returns, quality, and recall network

Establish return nodes, assessors, disposition codes, carrier labels, supplier recovery, CAPA, quarantine, stop-sale, customer notification, and recall drills.

**Exit evidence:** A simulated safety recall traces and contacts affected inventory, orders, customers, and installed parts.

### Step 19 — Launch one Philippines-origin assisted B2B export pilot

Select one destination, product risk class, exporter, importer approach, broker, carrier, payment route, return route, and warranty provider using the trade-lane pack.

**Exit evidence:** Gate G8 approves the exact lane; the first shipments are manually reviewed and reconciled.

### Step 20 — Decide national-scale and first foreign market

Use domestic results and the country scorecard to choose one next country—not an entire region. Approve its research budget, country manager, legal entity strategy, catalog plan, payments, logistics, support, and launch gates.

**Exit evidence:** Board/executive record states continue, modify, pause, or stop and why.

## 4. Steps 21–30 — International repeatability

### Step 21 — Build the country-launch factory

Turn the country-pack template into repeatable evidence collection, owner assignments, approvals, configuration, test suites, versioning, suspension, and reapproval.

### Step 22 — Make the global core configuration-complete

Remove hard-coded country, currency, address, timezone, language, tax, payment, units, invoice, phone, and vehicle-identity assumptions from shared logic.

### Step 23 — Add regional catalog/provider packs

Implement licensed source adapters and mapping governance appropriate to the selected country: local/EPC/chassis strategies in Asia-Pacific, TecDoc-oriented sources in Europe where suitable, and ACES/PIES-oriented sources in North America.

### Step 24 — Launch the first foreign domestic pilot

Operate only local sellers, local fulfilment, local payments, local terms, local support, and a limited catalog. Do not depend on exports to make the domestic pilot appear complete.

### Step 25 — Prove foreign-market Shop Manager tenancy and finance

Validate local roles, legal entities, tax/invoices, settlement, refunds, privacy, retention, and accounting exports with real partner scenarios.

### Step 26 — Establish destination-country returns and warranty support

Approve local return addresses, assessors, parts disposition, supplier recovery, customer timelines, and installed-part claims before increasing consumer volume.

### Step 27 — Launch a second domestic country in the same region

Test whether the factory is repeatable without cloning country-specific rules into the global core.

### Step 28 — Launch one domestic pilot in a second global region

Use the same gates to expose architecture gaps across Asia-Pacific, Europe, and North America without launching all countries simultaneously.

### Step 29 — Build effective-dated regional policy and reporting services

Support country/state/province tax rules, seller reporting, product restrictions, privacy rights, invoice requirements, and regulatory change impact analysis.

### Step 30 — Certify the country-launch factory

Require two successful launches, controlled suspensions, complete evidence packs, and post-launch reviews before declaring the process repeatable.

## 5. Steps 31–40 — Connected global network

### Step 31 — Connect two proven domestic markets

Activate one exact trade lane for a narrow B2B product set. Measure landed-cost variance, customs holds, damage, delivery, returns, support, and margin.

### Step 32 — Build long-tail global RFQ exchange

Support rare, obsolete, imported, commercial, marine, equipment, and used-part sourcing with evidence-based fitment, condition, quote validity, and manual approval.

### Step 33 — Add consolidation and cross-dock nodes

Use partner or 3PL facilities before buying warehouses. Measure order density, handling loss, dwell time, cut-off performance, and unit economics.

### Step 34 — Introduce `365 Part Passport`

Connect product identifiers, source, batch/lot/serial, condition, quality evidence, shipment, installation, warranty, recall, and outcome. Preserve source licensing and privacy boundaries.

### Step 35 — Add demand forecasting and committed group buys

Convert no-result searches, work orders, seasonality, fleet needs, and lead times into supplier forecasts and opt-in purchase commitments.

### Step 36 — Add commercial credit through licensed partners

Integrate underwriting, limits, approvals, invoices, repayment status, disputes, and suspension without lending from unprotected operating cash.

### Step 37 — Add EV/hybrid and regulated-product programs

Create separate identity, state-of-health, safety, packaging, dangerous-goods, recycling, warranty, and regional compliance workflows before offering batteries or high-voltage components.

### Step 38 — Add remanufactured, used, and core exchange

Define grading, testing, photos, serials, provenance, core eligibility, deposits, return timing, customs treatment, and disposal.

### Step 39 — License selected B2B network services

Offer catalog, fitment evidence, availability, RFQ, procurement, order, and installed-outcome APIs to fleets, insurers, shops, and approved marketplaces under data-rights controls.

### Step 40 — Approve regional-node strategy

Choose cross-docks, returns hubs, bonded/regular warehouses, or import entities only where measured density and service improvement exceed capital, liability, and obsolescence costs.

## 6. Steps 41–50 — Long-term intelligence and capital

### Step 41 — Build supplier quality intelligence

Rank suppliers and products using correctness, defects, authenticity, delivery, returns, warranty, CAPA, installed life, and recall performance—not sales volume alone.

### Step 42 — Build privacy-safe installed-outcome models

Use consented, minimized records to improve part selection, failure prediction, maintenance, and warranty while preventing customer/shop data leakage.

### Step 43 — Launch low-risk private-label pilots

Begin with proven, non-safety-critical, high-volume categories after testing, insurance, batch traceability, recall readiness, supplier audits, and margin validation.

### Step 44 — Add selective consigned or 365-owned stock

Stock only items/locations where demand, lead-time savings, fill-rate improvement, obsolescence, and return on invested capital beat partner-held inventory.

### Step 45 — Develop local manufacturing and nearshoring

Use proven demand and specifications to qualify manufacturers near major markets. Preserve independent testing, tooling ownership, change control, and alternate sources.

### Step 46 — Add advanced service networks

Qualify ADAS calibration, programming, immobilizer, software-dependent component, battery service, and specialist installation partners with equipment and training evidence.

### Step 47 — Create global fleet and insurer programs

Offer negotiated catalogs, approvals, service levels, repair authorization, invoice data, telematics consent, and warranty/recall reporting.

### Step 48 — Evaluate acquisitions and franchises

Acquire or franchise only where the target adds durable supply, catalog rights, local trust, logistics density, technical capability, or profitable customers—not merely revenue.

### Step 49 — Establish the parts-intelligence business

Package proprietary, permissioned insights about demand, fitment corrections, supply gaps, product performance, and installed outcomes without violating partner confidentiality or source licenses.

### Step 50 — Operate as a federated global distribution network

Maintain domestic market strength, approved trade lanes, regional nodes, auditable quality, positive unit economics, resilient providers, and a trusted global vehicle-to-part-to-outcome graph.

## 7. Mandatory pause and stop conditions

New activation must pause when any of the following occurs:

- unexplained tenant-data exposure or RLS failure;
- unreconciled customer funds, partner payouts, tax, or refund balances;
- safety recall or credible counterfeit risk without traceability;
- material regulatory change not assessed before its effective date;
- payment, carrier, broker, or catalog provider loses required authority/capability;
- repeated fitment, wrong-item, damage, delivery, or warranty failure above approved tolerance;
- negative contribution margin without an approved time-bound learning subsidy;
- reserve or working-capital coverage below the approved floor;
- suspected sanctions, export-control, fraud, diversion, or customs misstatement;
- no responsible owner available for customer, partner, or regulatory obligations.

## 8. Definition of a completed step

A step is complete only when:

1. deliverables are in the approved source system;
2. acceptance tests and reconciliations pass;
3. decisions and exceptions are recorded;
4. operating owners are trained and accept handoff;
5. monitoring, support, security, and rollback/suspension exist;
6. finance confirms the cost and ongoing obligation;
7. the next gate authority accepts the evidence.
