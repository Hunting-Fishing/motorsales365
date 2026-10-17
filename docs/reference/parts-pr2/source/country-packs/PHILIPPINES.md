# 365 Parts Country Pack — Philippines

**Parent:** [`../365_PARTS_PROGRAM_INDEX.md`](../365_PARTS_PROGRAM_INDEX.md)

**Market code:** `PH`

**Status:** `research` — not authorized for production network commerce by this document alone

**Version:** 0.1

**Updated:** 2026-08-06

**First proposed cluster:** Laoag / Northern Luzon

> This pack converts Philippine requirements into launch evidence and configuration. Qualified Philippine legal, tax, privacy, customs, insurance, product-safety, and payment review is required before activation.

## 1. Activation identity

| Field | Current value/action |
|---|---|
| Country/customs territory | Philippines — confirm any special zone treatment per location/order |
| Default currency | PHP; multi-currency display does not change order/settlement currency rules |
| Default timezone | `Asia/Manila`; store all system timestamps with timezone-aware UTC source |
| Languages | English and Filipino minimum customer/partner support; add Ilocano/other language support based on evidence |
| Measurement | Metric by default; preserve manufacturer/vehicle-domain units |
| Address model | Region, province, city/municipality, barangay, postal code, landmark, geolocation, delivery instructions |
| Vehicle identity | VIN where valid plus chassis/frame, plate, engine, model, production date, local/import-market identifiers |
| Market owner | **Open — assign before G2** |
| Legal/tax owner | **Open — assign before G2** |
| Quality/compliance owner | **Open — assign before G3** |
| Activation version | Not created until required evidence is approved |

## 2. Proposed launch boundary

### 2.1 Included in first pilot

- verified Philippine businesses and operating locations;
- consumer and repair-shop buyers in a limited service cluster;
- new low-risk fast-moving parts with defensible identity/fitment;
- partner pickup, ship-to-shop, supported local delivery, and selected domestic parcel delivery;
- assisted one-seller orders with daily operations and finance review;
- Shop Manager quote, purchasing, receiving, installation, and warranty linkage;
- distributor-held or partner-held stock.

### 2.2 Excluded from first pilot

- open nationwide promises without measured carrier/partner capability;
- multi-seller checkout and automated split settlement;
- used safety-critical parts, uncertain provenance, or undocumented condition;
- batteries, aerosols, pressurized goods, chemicals, airbags/restraints, and other dangerous/high-risk categories without separate approval;
- 365-funded credit, broad cash on delivery, or uncontrolled refund exposure;
- generic cross-border checkout;
- 365-owned warehouse inventory and private label.

## 3. Legal entity and marketplace model

The following must be completed and attached to the activation record:

- Philippine platform/operator legal entity and registered business names;
- ownership/control and authority to contract;
- registered address and required business/local permits;
- tax registration, books/invoicing/reporting setup, and bank accounts;
- identification of platform operator, e-marketplace, seller of record, payment collector, payout party, invoice issuer, and refund authority for each order model;
- analysis of the Internet Transactions Act, E-Commerce Philippine Trustmark, Consumer Act, applicable DTI issuances, seller/merchant duties, platform liability, prohibited/regulated goods, complaints, and online dispute resolution;
- terms of use, marketplace/seller terms, privacy documents, return/warranty policies, acceptable-products policy, ranking/sponsored disclosure, and complaint escalation;
- insurance program and responsible insured entities.

No interface copy may state or imply that 365 is the seller, warrantor, importer, exporter, lender, or insurer unless the approved model says so.

## 4. Partner enrollment

### 4.1 Required business evidence

- legal name, trade name, entity type, registration numbers, registered address;
- business/mayor's permits and location evidence as applicable;
- TIN/tax and invoicing information;
- authorized representative and authority;
- beneficial/control information required by providers/law;
- bank/payout account matched to approved entity;
- owners/managers and operational contacts;
- physical store/warehouse/shop evidence and geolocation;
- categories, brands, source chain, fulfilment, installation, and service capabilities;
- warranty/return address and responsible staff;
- insurance evidence when required;
- data/feed system and Shop Manager users/roles.

### 4.2 Enrollment states

`application → identity review → commercial review → location review → category/data review → training → pilot-approved → active → restricted/suspended/terminated`

Each approval is scoped to legal entity, locations, categories, brands, condition, market, and fulfilment method.

### 4.3 Shop Manager provisioning

- create or link the verified organization/legal entity;
- create each operational shop, counter, warehouse, or service location;
- create memberships with least privilege;
- link public business pages without using their IDs as private shop IDs;
- activate network capabilities separately from Shop Manager subscription/ordinary signup;
- require MFA/step-up controls for finance, payout, bulk export, admin, and sensitive changes;
- preserve offboarding, access review, and audit evidence.

## 5. Customer experience localization

### 5.1 Account and garage

Support:

- guest discovery and policy-appropriate checkout/account options;
- Filipino phone formats and verified email/phone where required;
- VIN/chassis/frame/plate/engine/model/production-date capture;
- imported/JDM/ASEAN/local vehicle ambiguity and manual resolution;
- consumer, repair-shop, fleet, reseller, and business account types;
- saved addresses, vehicles/equipment, orders, warranties, returns, and installation records.

### 5.2 Pricing and disclosures

Before payment show:

- seller identity and location;
- product/condition and fitment evidence state;
- stock/confirmation state;
- item price, discounts and funder, fees, shipping, tax treatment, and total;
- pickup/delivery range and exclusions;
- return, warranty, core, and installation terms;
- payment method and refund route;
- sponsored/affiliate status where applicable.

### 5.3 Delivery addresses

Do not rely only on postal code. Capture barangay, landmarks, route notes, phone, map pin, serviceability, remote-area classification, and safe-handoff instructions. Restrict free-form instructions from changing the legal recipient or delivery duty without controlled review.

## 6. Catalog and vehicle-domain pack

### 6.1 Pilot domains

Automotive and motorcycle may begin first if data coverage supports them. Truck/bus, equipment/agriculture, marine, power-sports, and small-engine remain separate domain activations.

### 6.2 Identity requirements

- VIN where standardized and available;
- chassis/frame/model/engine/transmission codes;
- production month/date and market/version;
- local registration/plate as a customer aid, not sole fitment evidence;
- body, drive, fuel, displacement, trim/options, and axle/application attributes;
- motorcycles/tricycles and equipment-specific identifiers.

### 6.3 Data sources

Create provider records for manufacturers, EPC/catalog licensors, authorized distributors, government/open sources, partner data, and technician evidence. Record rights to store, display, transform, translate, export, retain, and use in AI.

No scraped marketplace listing becomes authoritative fitment or authenticity evidence.

## 7. Product eligibility

Every product class must record:

- Philippine sale/import status and responsible authority;
- required standards, markings, labeling, warnings, language, technical files, permits, or registrations;
- source/authenticity and condition requirements;
- transport/storage/dangerous-goods rules;
- installation requirements and restricted users;
- return, warranty, recall, waste/recycling, and disposal path;
- domestic and export eligibility separately.

Start with lower-risk maintenance categories selected from demand evidence. Tires, batteries, fluids, chemicals, electronics, emissions parts, safety-critical components, used parts, and programmed/security-linked parts require separate reviews.

## 8. Tax, invoicing, and withholding

Finance and Philippine tax advisers must produce an effective-dated tax pack covering:

- entity registration and tax classifications;
- seller/merchant onboarding evidence;
- invoice/receipt issuer, numbering, required fields, storage, corrections, and credit notes;
- VAT/non-VAT and other applicable treatment;
- e-marketplace withholding rules, current amendments/clarifications, thresholds/exceptions, certificates, filings, and remittance;
- commissions, subscriptions, rebates, shipping, discounts, refunds, warranties, core deposits, and seller payouts;
- B2B exemptions or documentation where relevant;
- provider/bank statement reconciliation;
- future e-invoicing/e-reporting obligations;
- retention and audit exports.

Rates, thresholds, and formulas belong in governed configuration with source/effective dates—not hard-coded UI logic.

## 9. Payments and payouts

### 9.1 Provider validation

For every provider confirm:

- Philippine entity availability and contract;
- cards, wallets, bank transfer, over-the-counter, and other enabled methods;
- marketplace collection and seller payout capability;
- onboarding/KYC/KYB, limits, reserves, payout timing, holds, and termination;
- refunds, partial refunds, disputes, chargebacks, fraud, and reconciliation;
- customer-funds/safeguarding implications;
- cross-border availability separately;
- webhook/API reliability, idempotency, and outage handling.

Existing Stripe subscription billing is not evidence that marketplace payment collection and local seller payouts are supported.

### 9.2 Cash on delivery

COD, if considered, requires a separate decision covering carrier capability, refusal rate, cash remittance, theft, reconciliation, seller payout, returns, customer verification, product/category/value limits, and contribution margin. It should not be a default pilot dependency.

## 10. Privacy and security

The Philippine privacy pack must address:

- personal information controller/processor roles;
- lawful basis and transparent notices by purpose;
- minimization and proportionality;
- customer, partner staff, delivery, payment, vehicle, diagnostic, and location data;
- consent where used, including withdrawal and evidence;
- data-subject access, correction, objection, portability where applicable, blocking/erasure, and complaint handling;
- retention schedule and legal holds;
- processor/data-sharing agreements and cross-border transfers;
- privacy impact assessments for high-risk processing;
- privacy management program, accountable officer/DPO assessment, training, access reviews;
- security measures, breach detection, response, notification, and evidence;
- no deceptive design patterns in consent or privacy controls.

Supabase RLS, storage policies, service-role handling, audit logs, backups, and staff support access require production tests before live data.

## 11. Domestic inventory and fulfilment

### 11.1 Stock states

Use source-specific states such as:

- `verified-in-stock`;
- `confirmation-required`;
- `distributor-stock`;
- `special-order`;
- `unavailable/expired`.

Each state has freshness, confirmation, reservation, and customer-promise rules.

### 11.2 Fulfilment modes

- partner counter pickup;
- repair-shop/ship-to-shop;
- local same/next-day delivery where measured;
- domestic parcel carrier;
- distributor direct ship;
- assisted transfer between partner locations;
- later consolidation/cross-dock.

### 11.3 Geographic resilience

Account for island routes, weather, typhoons, floods, earthquakes, ferry/port interruption, remote barangays, power/connectivity outages, and carrier capacity. Promise dates must use route/service evidence, cut-offs, and exception messaging.

## 12. Returns, warranties, complaints, and recalls

Before launch establish:

- customer support identity, channels, hours, languages, SLA, and safety escalation;
- seller/manufacturer/installer/365 responsibility matrix;
- category/condition return windows and exclusions subject to consumer law;
- wrong item, defect, fitment, transit damage, change-of-mind, core, and installed-part flows;
- destination and inspection owner;
- refunds, replacements, repair, supplier recovery, and disposal;
- DTI complaint/ODR and regulator escalation handling;
- recall feed owners, stop-sale, affected-order/installed-part tracing, notifications, remedies, and drill.

## 13. Founding network plan

Target evidence-backed recruitment of approximately:

- 5–10 independent parts stores;
- 10–20 repair/service shops;
- two direct national/regional distributors;
- one motorcycle supplier;
- one truck/equipment specialist;
- one domestic carrier/delivery integration;
- qualified installers for selected categories.

Numbers are planning targets, not launch gates by themselves. Partner quality, category coverage, stock accuracy, and local order density matter more.

## 14. Philippine pilot stages

### PH-0 — research and approvals

- resolve P0 decisions;
- complete legal/tax/privacy/payment/insurance packs;
- select partner cohort and categories;
- approve Shop Manager tenancy migration;
- collect demand and unit-economics inputs.

### PH-1 — internal sandbox

- canonical catalog and partner mappings;
- private inventory/public availability;
- one-seller order, payment simulation, fulfilment, refund, warranty;
- RLS, reconciliation, recovery, recall, and incident tests.

### PH-2 — assisted Laoag/Northern Luzon pilot

- low order/partner/category limits;
- confirmation-required stock where feeds are weak;
- daily operations/finance review;
- manual exception and quality oversight;
- no unapproved multi-seller or cross-border automation.

### PH-3 — density expansion

Expand route by route based on contribution margin, service, quality, support, and partner capacity.

### PH-4 — national network

Add distributor direct fulfilment, linked company purchasing, multi-seller settlement, buying group, and national returns only after their gates.

## 15. Launch evidence checklist

### Corporate/legal

- [ ] Operating entity and registrations approved
- [ ] Marketplace/seller-of-record models approved
- [ ] Trustmark/ITA/consumer requirements completed
- [ ] Customer, partner, supplier, provider, privacy, and product terms approved
- [ ] Insurance policies/limits/evidence accepted

### Tax/finance/payments

- [ ] Current tax/withholding pack approved
- [ ] Invoice, credit note, payout, refund, and reporting tested
- [ ] Payment/payout provider contracts and fallback approved
- [ ] Ledger/bank/provider daily reconciliation passes
- [ ] Reserves and liquidity funded

### Product/quality

- [ ] Pilot domains/categories/risk tiers approved
- [ ] Licensed/evidenced catalog and fitment coverage passes
- [ ] Suppliers/locations/products activated by scope
- [ ] Authenticity, return, warranty, quarantine, CAPA, and recall ready

### Technology/security

- [ ] Multi-company tenancy migration complete
- [ ] RLS/adversarial tests pass
- [ ] Stock/reservation concurrency tests pass
- [ ] Audit, backup, recovery, monitoring, secrets, and incident response pass
- [ ] Customer and partner accessibility/localization review passes

### Operations

- [ ] Partner training and support roster complete
- [ ] Carrier/serviceability and packaging tested
- [ ] Customer support and complaint/ODR handling tested
- [ ] Pilot dashboard, stop limits, and daily review active

## 16. Open decisions

- Exact Philippine operating entity and transaction roles.
- First categories/SKUs and vehicle applications from demand evidence.
- Payment and payout providers.
- Partner fee/commission/subscription model.
- Delivery/COD policy and service cluster.
- Customer support model and languages.
- Insurance program and reserve floors.
- Numerical pilot pass/stop thresholds.
- First export destination, handled in the separate trade-lane pack.

## 17. Official source starting points

- [DTI E-Commerce Philippine Trustmark](https://trustmark.dti.gov.ph/)
- [DTI Trustmark FAQs](https://trustmark.dti.gov.ph/faqs)
- [DTI prohibited and regulated products list](https://trustmark.dti.gov.ph/LIST-OF-PROHIBITED-AND-REGULATED-PRODUCTS)
- [DTI Consumer Care/ODR](https://consumercare.dti.gov.ph/)
- [BIR issuances](https://www.bir.gov.ph/)
- [Bureau of Customs export guidance](https://customs.gov.ph/guidelines-on-exportation/)
- [Bureau of Customs import guidance](https://customs.gov.ph/guidelines-on-importation/)
- [National Privacy Commission](https://privacy.gov.ph/)
- [Data Privacy Act and IRR](https://privacy.gov.ph/the-data-privacy-act-and-its-irr/)

## 18. Activation signature

This section remains blank until Gate G5.

| Approval | Name | Date | Version/conditions |
|---|---|---|---|
| Program sponsor |  |  |  |
| Philippine country owner |  |  |  |
| Legal/tax |  |  |  |
| Finance/payment |  |  |  |
| Privacy/security |  |  |  |
| Quality/product safety |  |  |  |
| Product/engineering |  |  |  |
| Operations/customer support |  |  |  |
