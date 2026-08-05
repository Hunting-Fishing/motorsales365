# 365 Vehicle History Network — Partner Outreach Pack

Use this pack to approach LTO, PNP-HPG, the Insurance Commission, insurers, inspection centres, OEM/dealers, parts suppliers and import/export partners.

This is a business-development working document, not legal advice. Government and personal-data access must be reviewed by qualified Philippine counsel and the designated Data Protection Officer.

## 1. Complete before any government outreach

- Philippine legal entity name and registration numbers
- Principal office and official business email/domain
- Authorized signatory, title, telephone and email
- Product lead, technical lead, security lead and DPO
- NPC registration/compliance status
- Pilot regions, shops, users and expected monthly query/event volumes
- Current Shop Manager security/data-flow diagram
- Privacy impact assessment summary
- Incident-response and breach-contact process
- Data retention and deletion schedule
- One-page company/profile overview
- Live or recorded demo of RO → parts → scan → report

Do not say that 365 has LTO, HPG, insurer or official Philippine vehicle-history access until a signed agreement and tested connection exist.

## 2. One-page concept note

### Proposal

**365 Vehicle History and Roadworthiness Network — Controlled Philippine Pilot**

365 Motor Sales proposes a non-exclusive, privacy-minimized pilot that connects verified vehicle identity/status checks with consented repair, inspection, odometer, installed-parts and diagnostic events generated through participating Philippine repair shops.

### Public-service outcomes

- reduce used-vehicle identity and documentation fraud;
- support safer pre-sale verification and transfer of ownership;
- identify odometer inconsistencies through repeated verified observations;
- improve total-loss and material-damage disclosure;
- increase recall and safety-campaign completion;
- document major engine/chassis/component changes;
- strengthen repair/parts traceability; and
- produce de-identified roadworthiness insights.

### Data-minimization proposal

365 does not request public access to owner names, addresses, contact details, IDs or scanned registration files. The initial request is for a controlled status response confirming whether submitted vehicle identifiers match and returning only specifically approved, non-personal status fields.

LTO/agency systems retain control of access. Every query is purpose-bound, authenticated, rate-limited and audited. Consumer reports expose only approved fields and display source/time/limitations.

### Initial pilot

- 5–10 participating verified shops;
- 1,000–5,000 service assets;
- two or three Philippine regions;
- six-month operating period;
- initial 365-only event collection followed by an approved status-verification phase;
- privacy, security, data-quality and consumer-dispute reporting.

### Requested next step

A 45–60 minute exploratory meeting with the relevant executive, vehicle-registration, ICT/system, legal, enforcement and data-protection representatives to determine public-service fit, available status fields, lawful basis, required agreements, security controls and pilot approval route.

## 3. Initial LTO letter/email draft

**Subject:** Request for exploratory meeting — 365 Vehicle History and Roadworthiness Network pilot

Dear Office of the Assistant Secretary,

365 Motor Sales is developing a Philippine vehicle-history and roadworthiness network integrated with repair shops, inspections, installed-parts records and diagnostic reports. Its purpose is to help reduce used-vehicle fraud, identifier mismatches, incomplete ownership transfers, odometer inconsistencies and undisclosed material vehicle events while protecting motor-vehicle owners' personal data.

We would like to request an exploratory meeting with the appropriate Vehicle Registration, Management Information/ICT, Legal, Law Enforcement and Data Protection representatives.

We are not requesting a copy of the LTO registry or public access to owner names, addresses, contact details or identification documents. We would like to discuss whether a controlled, privacy-minimized verification pilot could confirm submitted vehicle identifiers and return only specifically approved non-personal status fields through LTO-controlled middleware.

The first pilot would use 365-generated, consented records from participating Philippine repair shops: identity and odometer observations, repair-order summaries, inspections, installed-part lifecycle events and diagnostic pre/post scans. Any LTO verification phase would proceed only after the required legal, privacy, security and data-sharing approvals.

We have attached a concept note describing the public-service outcomes, proposed data minimization, pilot scope and safeguards. We would appreciate guidance on the proper submission route and responsible offices.

Respectfully,

`[Name]`  
`[Title]`  
`[Philippine legal entity]`  
`[Business email]`  
`[Telephone]`  
`[Website]`

## 4. PNP-HPG letter/email draft

**Subject:** Exploratory discussion — privacy-minimized stolen/alarmed vehicle status verification

Dear Director / Authorized HPG Representative,

365 Motor Sales is building a vehicle-history and roadworthiness network for Philippine buyers, owners and repair shops. We would like to discuss a controlled verification process that can warn an authorized user when a submitted vehicle identity requires official HPG review, without exposing investigative or personal data in a consumer report.

The proposed system preserves the submitted identifiers, source, time and audit purpose; prevents bulk enumeration; and routes conflicts to official procedures rather than making independent criminal allegations. It would complement shop check-in, pre-purchase inspection and ownership-transfer workflows.

We request a technical/legal discovery meeting to understand the permitted status categories, authorization requirements, safeguards, escalation process and any required LTO/PNP data-sharing arrangement.

Respectfully,

`[Signature block]`

## 5. Insurance Commission/insurer letter draft

**Subject:** Proposal for a standardized privacy-minimized motor vehicle loss-history event pilot

Dear Commissioner / Authorized Representative,

365 Motor Sales proposes an industry discovery and pilot for standardized motor-vehicle history events covering total loss, restoration status, material damage categories, theft/recovery and repair completion without publishing policyholder identity, private claim files or unsupported fault conclusions.

365 can connect insurer-approved events to verified repair orders, parts installed, inspection evidence, odometer observations and diagnostic pre/post scans. This can improve used-vehicle disclosure, claims/warranty traceability, valuation and fraud controls.

We request guidance on current regulatory reporting, the correct industry participants, data-protection requirements and the feasibility of a limited event standard tested with willing insurers/adjusters.

Respectfully,

`[Signature block]`

## 6. Discovery meeting agenda

1. Introductions and legal entities
2. Public-service/business problem
3. Existing 365 Shop Manager and report demonstration
4. Exact data requested and data explicitly not requested
5. Exact data 365 can contribute
6. Lawful basis, controller/processor roles and consent
7. Permitted consumer display and prohibited uses
8. Identity match, error and dispute handling
9. API/middleware, authentication, logs and rate limits
10. Retention, deletion, incident and audit controls
11. Pilot scope, regions, volumes and success measures
12. Agreement, procurement/approval and next steps

## 7. Questions every source partner must answer

### Authority and rights

- Who owns/controls each field?
- What law, consent or agreement permits sharing?
- May 365 use it in a paid consumer report?
- May 365 cache it, and for how long?
- May 365 display a fact, a status code, a document or only a link?
- Are bulk, dealer, lender, insurer or export uses separately licensed?
- Are cross-border access and storage allowed?

### Coverage and accuracy

- Which vehicle classes, years, regions and identifiers are covered?
- What is the earliest event date?
- What causes no-result, delayed or incomplete records?
- How frequently is each field updated?
- Can corrected/withdrawn events be pushed to 365?
- What identifier conflict and false-match rate is expected?

### Privacy and security

- Which party is PIC/controller or PIP/processor?
- Which users and purposes may access each field?
- Is owner consent required for each query?
- What authentication, encryption, IP/device and rate controls are required?
- What audit records must be retained?
- What incident and breach deadlines apply?
- What deletion/return is required at termination?

### Commercial and operational

- Pilot, setup, per-query, minimum and annual fees?
- Sandbox and test data availability?
- Service levels, outages and support contacts?
- Contract term, territories and exclusivity?
- Attribution and official-mark/logo rules?
- Required government procurement or approval route?

## 8. Evidence to bring to the first meeting

- screenshots/demo of vehicle, RO, inspection, parts and scan links;
- sample redacted buyer report;
- sample private owner repair packet;
- field-level visibility matrix;
- data-flow and system boundary diagram;
- sample API request/response using synthetic data;
- identity-conflict workflow;
- dispute/correction workflow;
- pilot-shop letters of interest;
- DPO/security contacts; and
- risk register and pilot measures.

## 9. Recommended outreach order

1. Philippine counsel and DPO/privacy readiness
2. LTO exploratory submission
3. National Privacy Commission consultation, if advised
4. PNP-HPG status-verification discussion
5. Insurance Commission
6. Insurer association and three willing insurers/adjusters
7. PMVIC/PETC partners
8. OEM distributors/dealer groups
9. Parts distributors and diagnostic providers
10. Japan/Korea origin-history providers for imported vehicles

Use [the partner tracker](./365_VEHICLE_HISTORY_PARTNER_TRACKER.csv) for owners, dates, status and evidence.

