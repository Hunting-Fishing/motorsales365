# 365 Parts Decision Register

**Control document:** [`365_PARTS_PROGRAM_INDEX.md`](./365_PARTS_PROGRAM_INDEX.md)

**Status:** Working decision log; unapproved entries are not authorization

**Version:** 1.0

**Updated:** 2026-08-06

## 1. Purpose

The Parts plans contain options that materially change code, contracts, tax, payments, customer promises, liability, capital, and international operations. This register prevents an option described in a plan from being mistaken for an approved business decision.

## 2. Decision statuses

| Status | Meaning |
|---|---|
| `open` | A decision is required; options or evidence may still be incomplete. |
| `recommended` | The working group has a preferred option; accountable approval is pending. |
| `approved` | The accountable authority accepted the decision and effective date. |
| `conditional` | Approved only if recorded conditions remain true. |
| `deferred` | Not required for the current phase; revisit trigger is recorded. |
| `superseded` | Replaced by a later decision; history remains immutable. |
| `rejected` | Considered and deliberately not selected. |
| `suspended` | Temporarily disabled because assumptions, law, safety, or performance changed. |

Only `approved` or applicable `conditional` decisions authorize build or launch.

## 3. Required decision record

Every decision must include:

- decision ID, title, category, and accountable owner;
- status and decision deadline/gate;
- context and exact question;
- options considered;
- evidence, adviser/provider inputs, and affected jurisdictions;
- decision and reasoning;
- effective date and version;
- affected documents, code, data, contracts, partners, customers, and reports;
- conditions, metrics, review date, and reversal/suspension trigger;
- superseded decision ID if applicable.

## 4. Current working directions

The following directions are already consistent across the detailed plans. They should still be formally signed off before implementation where noted.

| ID | Working direction | Status | Gate/owner |
|---|---|---|---|
| D-001 | Launch Philippines first with an asset-light partner/distributor model. | `recommended` | G0 / program sponsor |
| D-002 | Build domestic country networks first; connect them through approved trade lanes. | `recommended` | G0 / program sponsor |
| D-003 | Separate person, organization, legal entity, shop/location, membership, business listing, and network enrollment. | `recommended` | G1 / product + technical lead |
| D-004 | Use federated inventory; do not create one shared editable inventory pool. | `recommended` | G1 / product + finance |
| D-005 | Keep canonical product, seller item, offer, stock, reservation, order line, and installed part separate. | `recommended` | G1 / catalog + technical lead |
| D-006 | Require approved evidence for fitment; AI suggestions are non-authoritative. | `recommended` | G1 / catalog + quality |
| D-007 | Start with assisted, single-seller ordering before multi-seller checkout. | `recommended` | G3 / product + operations |
| D-008 | Do not enable generic international shipping; use exact versioned trade lanes. | `recommended` | G2/G8 / trade compliance |
| D-009 | Keep affiliate click-outs separate from 365 marketplace inventory/orders. | `recommended` | G1 / product + finance |
| D-010 | Approve scale based on contribution margin, cash, quality, and service—not GMV. | `recommended` | G6 / finance + sponsor |

## 5. P0 decisions — before network order coding

| ID | Decision required | Default recommendation | Status | Accountable owner | Gate |
|---|---|---|---|---|---|
| D-011 | Which Philippine entity operates the platform? | One clearly identified operating entity with documented intercompany boundaries. | `open` | Program sponsor | G2 |
| D-012 | Who is seller of record for normal partner orders? | The supplying partner unless a deliberately approved merchant-of-record model applies. | `open` | Legal/finance | G2 |
| D-013 | Who issues customer invoices/receipts and credit notes? | Match the seller-of-record and current tax advice; snapshot issuer per order. | `open` | Finance/tax | G2 |
| D-014 | Who collects customer funds? | Approved payment arrangement that supports marketplace obligations and reconciliation. | `open` | Finance | G2 |
| D-015 | How are seller payouts, withholding, fees, reserves, and adjustments handled? | Immutable settlement ledger with payout holds and current Philippine tax configuration. | `open` | Finance/tax | G2 |
| D-016 | What refund authority does 365 have? | Policy-defined authority with seller recovery, evidence, appeal, and emergency consumer protection. | `open` | Customer ops/legal | G2 |
| D-017 | Which returns and warranties are seller, manufacturer, installer, or 365 responsibilities? | Freeze responsible party and policy version per line/order. | `open` | Legal/quality | G2 |
| D-018 | What claims may `365 Fitment Checked`, `Verified Stock`, and `Source Verified` make? | Evidence-based states with explicit exclusions; no unconditional guarantee. | `open` | Product/quality/legal | G3 |
| D-019 | What data may partners publish to the network? | Approved product, availability state/band, price, location promise, warranty, and fulfilment facts only. | `open` | Product/security | G1 |
| D-020 | What is the authoritative private stock ledger? | Consolidated Shop Manager ledger after tenancy and duplicate-table migration. | `open` | Technical/finance | G1 |
| D-021 | How are organizations, legal entities, public businesses, and shops related? | Follow the hierarchy in the master plan; UUIDs are never interchangeable. | `open` | Technical/product | G1 |
| D-022 | What are the first pilot geography, partner cohort, categories, and order limits? | Laoag/Northern Luzon; evidence-selected low-risk fast movers; low volume with daily oversight. | `open` | Program manager | G3 |
| D-023 | Which fitment/catalog sources may be stored, displayed, transformed, translated, and used for AI? | Only licensed uses recorded per provider and field. | `open` | Catalog/legal | G3 |
| D-024 | Which payment provider(s) and fallback support Philippine marketplace flows? | Provider abstraction; do not assume subscription billing supports payouts. | `open` | Finance/technical | G2 |
| D-025 | What insurance limits, exclusions, deductibles, and named parties are required? | Broker-designed product, cyber, technology, cargo, crime, recall, and management program. | `open` | Finance/legal | G2/G5 |

## 6. P1 decisions — assisted Philippine pilot

| ID | Decision required | Recommendation | Status | Owner | Trigger |
|---|---|---|---|---|---|
| D-026 | Stock states and freshness limits by source | `verified`, `confirmation-required`, `distributor`, `special-order`; effective-dated expiry. | `open` | Inventory lead | Before offer launch |
| D-027 | Reservation TTL and extension rules | Category/source-specific; atomic expiry and release. | `open` | Product/operations | Before live orders |
| D-028 | Substitution policy | Never substitute brand/part/condition without explicit eligible rule and buyer consent. | `open` | Product/quality | Before live orders |
| D-029 | Offer ranking | Fitment/safety/eligibility first, then total value/service; sponsored status disclosed. | `open` | Product/legal | Before search launch |
| D-030 | Partner commission/subscription/lead model | Start simple; avoid overlapping fees customers or partners cannot understand. | `open` | Finance/sales | Partner contracting |
| D-031 | Customer delivery subsidy | Time-bound acquisition experiment charged to a visible program budget. | `open` | Growth/finance | Before promotions |
| D-032 | Pilot return windows and restocking rules | Category/condition-specific with consumer-law floor and defective/wrong-item exception. | `open` | Customer ops/legal | Before sale |
| D-033 | Warranty and chargeback reserve | Data-informed percentage/floor with monthly true-up; do not pay from unreserved cash. | `open` | Finance | Before payouts |
| D-034 | Customer support channels/hours/SLA | Philippine-language capable, order-event driven, emergency safety escalation. | `open` | Customer ops | Before pilot |
| D-035 | Pilot stop thresholds | Use the Program Index and roadmap stop conditions with numeric thresholds. | `open` | Steering group | Before pilot |

## 7. P2 decisions — linked network and national scale

| ID | Decision required | Recommendation | Status | Owner | Trigger |
|---|---|---|---|---|---|
| D-036 | Inter-company ownership-transfer event | Shipment, delivery, or receipt based on contract; never implied by visibility. | `deferred` | Finance/legal | Step 12 |
| D-037 | Multi-seller capture and payout timing | Hold/partial capture where supported; payout after defined fulfilment/risk gate. | `deferred` | Finance | Step 15 |
| D-038 | Buying-group rebate allocation | Transparent, auditable, based on eligible purchases/commitments; seller pricing remains independent. | `deferred` | Finance/legal | Step 17 |
| D-039 | National expansion sequence | Order density and service economics, not province count alone. | `deferred` | Program sponsor | Step 16 |
| D-040 | Distributor exclusivity | Avoid broad exclusivity; use category/market/time-bound arrangements only when justified. | `deferred` | Commercial/legal | Distributor negotiations |
| D-041 | Customer account credit | Third-party licensed credit first; internal terms only after governance and loss data. | `deferred` | Finance | B2B scale |
| D-042 | Central return nodes | Use partner/3PL nodes where volume and recovery justify them. | `deferred` | Operations/finance | Step 18 |
| D-043 | Data-sharing for group purchasing | Aggregate/minimize; no competitor-identifiable future pricing/cost exchange. | `deferred` | Legal/data | Step 17 |

## 8. P3 decisions — country and export activation

| ID | Decision required | Recommendation | Status | Owner | Trigger |
|---|---|---|---|---|---|
| D-044 | First foreign domestic market | Select with scorecard after Philippine pilot; one country only. | `deferred` | Program sponsor | Step 20 |
| D-045 | First Philippines-origin destination | Select exact destination using demand, broker/carrier, returns, margin, and compliance evidence. | `open` | Trade compliance/program sponsor | Step 19 |
| D-046 | Exporter of record for first lane | Approved supplier/partner or contracted export entity; freeze per order. | `deferred` | Trade/legal | Lane design |
| D-047 | Importer of record and delivery-duty model | Exact destination and customer model; disclose before payment. | `deferred` | Trade/tax | Lane design |
| D-048 | First export product class | Low-risk, non-dangerous, parcel-sized, documented, defensible fitment. | `recommended` | Trade/quality | Step 19 |
| D-049 | Cross-border return/warranty route | Destination support or economically credible return route before consumer scale. | `deferred` | Customer ops/trade | Lane activation |
| D-050 | Regional Supabase/data topology | Decide per country/region privacy and latency requirements; global identity without tenant leakage. | `deferred` | Security/privacy | First foreign build |
| D-051 | Regional catalog standard/provider | Market/domain-specific licensed provider; canonical mappings remain source-attributed. | `deferred` | Catalog/legal | Country pack |
| D-052 | International FX quote and variance owner | Time-limited quote, settlement currency, refund rate, and variance account. | `deferred` | Finance | Lane activation |

## 9. P4 decisions — strategic capital and long-term scope

| ID | Decision required | Recommended trigger | Status | Owner |
|---|---|---|---|---|
| D-053 | Regional hub or warehouse | Proven route density and return on invested capital | `deferred` | Board/finance |
| D-054 | 365-owned inventory | Measured fill-rate/lead-time benefit exceeds working-capital and obsolescence cost | `deferred` | Board/finance |
| D-055 | Private-label entry category | Proven demand, independent testing, insurance, traceability, recall readiness | `deferred` | Quality/commercial |
| D-056 | Manufacturing/nearshoring | Stable specifications, volume commitments, tooling/change control, alternate supply | `deferred` | Board/quality |
| D-057 | Acquisition/franchise criteria | Durable supply, data rights, trust, density, capability, and positive economics | `deferred` | Board |
| D-058 | Parts-intelligence licensing | Sufficient proprietary evidence and clear partner/source/privacy rights | `deferred` | Board/legal/data |
| D-059 | Telematics/connected vehicle | Explicit user authorization, market legality, provider rights, security case | `deferred` | Product/privacy |
| D-060 | EV battery/passport program | Regulatory, dangerous-goods, state-of-health, recycling, and warranty capability | `deferred` | Quality/trade |

## 10. Decision review cadence

- P0: weekly until resolved.
- P1: before pilot configuration freeze.
- P2: monthly during Steps 11–20.
- P3: country/lane committee review; at least before each activation and after material regulatory change.
- P4: quarterly strategy/capital review.
- All: immediate review after a recall, data breach, material loss, provider loss, law change, or serious customer incident.

## 11. Decision quality checklist

Before approval, confirm:

- the question is narrow enough to implement;
- real alternatives and the do-nothing option were considered;
- financial, customer, partner, quality, legal, security, and operational impacts are visible;
- evidence is current and source-attributed;
- affected countries, product classes, and vehicle domains are explicit;
- conditions and reversal triggers are measurable;
- the decision does not silently create a regulated role for 365;
- implementation, migration, communication, and audit requirements are funded.
