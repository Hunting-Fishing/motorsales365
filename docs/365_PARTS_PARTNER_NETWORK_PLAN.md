# 365 Parts Partner Network Plan

**Repository:** `Hunting-Fishing/motorsales365`
**Primary market:** Philippines
**Expansion direction:** Asia-Pacific first; other markets only through an activated country pack
**Document role:** Specialist control plan for the Parts Partner Network and its Shop Manager integration
**Controlled by:** [`365_PLATFORM_PROGRAM_INDEX.md`](./365_PLATFORM_PROGRAM_INDEX.md)
**Status:** Initial control baseline (`proposed`); not build or launch authorization
**Version:** 0.1
**Updated:** 2026-08-06

## 1. Purpose and scope

This plan governs how parts move through 365: how a part is identified, who may
publish stock, how a shop or consumer requests it, how it is priced, ordered,
fulfilled, installed, warranted and recorded — and how a business enrolls as a
**Parts partner** and is billed for it.

It is the reconciliation target for the unmerged Parts draft (PR #2). Until that
draft is reconciled, this document is the only Parts control baseline on `main`.

### 1.1 In scope

- Canonical parts catalog and fitment/applicability.
- Partner (seller) enrollment, verification, tiers and obligations.
- Inventory publication, network stock visibility and reservations.
- RFQ/inquiry lifecycle, quoting, ordering, fulfilment, returns and warranty.
- Parts consumption inside Shop Manager: work orders, quotes, invoices, stock
  deduction and general-ledger postings.
- Installed-component evidence handed to Vehicle History.
- Parts-specific entitlements, fees, commissions and reporting.

### 1.2 Out of scope

- Repair procedures, labour times and diagnostic data — see
  [`365_REPAIR_KNOWLEDGE_NETWORK_PLAN.md`](./365_REPAIR_KNOWLEDGE_NETWORK_PLAN.md).
- Published vehicle lifecycle reports — see
  [`365_VEHICLE_HISTORY_NETWORK_PLAN.md`](./365_VEHICLE_HISTORY_NETWORK_PLAN.md).
- Promoter/affiliate commissions on account signups (`/partner-program`), which
  is a separate commission-only referral product and must never be merged with
  Parts partner enrollment.
- Franchise brand licensing (`/franchise`), which may *qualify* an organization
  for a Parts tier but does not itself grant one.
- Cross-border trade lanes, which require platform gate `PG10` and an exact lane
  pack.

### 1.3 Program vocabulary

| Term | Meaning in this plan |
|---|---|
| Parts partner | An enrolled, verified organization permitted to publish stock or fulfil orders on the network. |
| Partner tier | The commercial package an enrolled organization holds (fees, discounts, exposure, limits). |
| Promoter | A `/partner-program` affiliate earning signup commission only. Not a Parts partner. |
| Network stock | The consented, admin-approved, read-only projection of a partner's inventory. |
| Offer | A partner's sellable price/availability for one canonical product at one location. |
| Installed component | A part instance proven to have been fitted to a service asset. |

## 2. Current evidenced state

Labels follow the platform status vocabulary. Nothing below is
`operationally-verified` yet.

| Capability | Evidence in repository | Delivery status |
|---|---|---|
| Parts hub and category browsing (`/parts`, `/parts/c/$slug`) | Routes present | `in-build` |
| Partner/affiliate product links (`/parts/partners`) | Routes and product grid present | `in-build` |
| 365-owned merchandise store (`/shop`) | Route present, checkout incomplete | `in-build` |
| Network stock search (`/parts/network`) | Route plus network stock view and realtime channel | `internal-test` |
| Network inquiry lifecycle (pending/accepted/rejected + fulfilment update) | Manager and customer views present | `internal-test` |
| Inquiry notifications | Database triggers plus in-app listener | `internal-test` |
| Admin exposure approval, audit history, revocation | Exposure status plus audit log present | `internal-test` |
| Short stock reservations (1–168 h) | Reservation writes adjust available quantity | `internal-test` |
| Shop Manager inventory and invoice-from-inventory | Business inventory plus invoice line sourcing, stock deduction, GL postings | `in-build` |
| Shop Manager tiering and checkout | Plan tables, regional pricing, entitlement layer, Stripe checkout | `in-build` |
| Canonical catalog with OEM part numbers, supersession and VIN fitment | Not implemented | `research` |
| Partner enrollment as a distinct commercial product | Not implemented | `proposed` |
| Order, fulfilment, return and warranty records | Not implemented | `proposed` |
| Installed-component registry | Not implemented | `proposed` |

## 3. Architecture rules (non-negotiable)

1. **Canonical product is authoritative; a partner offer never is.** A partner
   may not edit canonical part identity, fitment or supersession.
2. **Inventory is owned by exactly one organization and location.** There is no
   shared, editable network quantity. Network stock is a derived projection.
3. **Publication is opt-in, admin-approved and revocable**, with an append-only
   audit trail on every exposure change.
4. **Reservations are short-lived, auditable and expire automatically.** They
   reduce available quantity only; they never mutate on-hand quantity.
5. **Every parts schema object is country-scoped from day one** (country, region,
   currency, tax treatment) — no retrofits later.
6. **Money is derived from immutable order/line snapshots**, never from mutable
   invoice display fields.
7. **Purchase is not installation.** Purchase, delivery, fitment, verification,
   removal, failure, return and warranty are separate events.
8. **Enrollment is not entitlement.** A Parts partner tier grants Parts
   capabilities only; Shop Manager, repair data, diagnostics and History remain
   separately purchased `module_key` grants.
9. **AI may map, translate and suggest. It may never invent fitment**, mark an
   event verified, or resolve a conflicting part number.
10. **Cross-schema privilege escalation is prohibited.** A `shop_manager` role
    can never grant platform admin or read another organization's stock, cost or
    customer data.

## 4. Parts × Shop Manager integration contract

This is the core of the program: the partner network only has value if a shop
can consume it inside a work order without leaving Shop Manager.

```text
work order / quote line needs a part
        │
        ▼
[1] resolve canonical product   (part number, OEM, supersession, fitment vs asset)
        │
        ▼
[2] check own inventory         (organization + location on hand / available)
        │  short?
        ▼
[3] search network stock        (consented partner offers, price, ETA, distance)
        │
        ▼
[4] reserve or raise inquiry    (short reservation, or RFQ with quantity + ETA)
        │
        ▼
[5] partner responds            (accept / reject / fulfilment update: price, qty, ETA)
        │
        ▼
[6] order + receive             (purchase order, partial delivery, core charge)
        │
        ▼
[7] issue to work order         (stock deduction, DR COGS / CR Inventory)
        │
        ▼
[8] invoice + payment           (immutable line snapshot, GL postings)
        │
        ▼
[9] installed component event   (part instance, position, installer, warranty)
        │
        ▼
[10] Vehicle History assertion  (owner/buyer-visible, evidence-backed)
```

Contract requirements per step:

| Step | Required behaviour | Failure mode to prevent |
|---|---|---|
| 1 | Canonical resolution must return the domain-correct product (auto, motorcycle, heavy truck, marine) | Automotive fitment leaking into other domains |
| 2 | Availability = on hand − reserved − allocated | Overselling own stock |
| 3 | Only approved, non-revoked exposures are visible; no cost, margin or customer data | Competitor cost/PII leakage |
| 4 | Reservation and inquiry both carry requesting organization, work order reference and expiry | Orphaned holds blocking stock |
| 5 | Status transitions are append-only with actor, timestamp and reason | Silent status rewrites |
| 6 | Receiving supports partial delivery, supersession and core returns | Phantom inventory |
| 7 | Issue posts double-entry immediately and is reversible by an explicit return | Unbalanced ledger |
| 8 | Line prices are snapshotted at invoice time with tax and policy version | Retro-priced revenue |
| 9 | Installation requires a completed work order and technician actor | Purchase treated as proof of fitment |
| 10 | Only approved assertions publish; private notes never publish | Customer data exposure |

## 5. Partner enrollment and tier model

### 5.1 Enrollment lifecycle

```text
draft → submitted → document review → verification → approved → active
                              │              │            │
                              ▼              ▼            ▼
                          rejected      more info     suspended → revoked
```

Required before `approved`:

- Organization and legal entity record (not a public listing ID).
- Business registration document (DTI/SEC/BIR for the Philippines; country pack
  defines equivalents elsewhere).
- Authorized signatory identity, contact and address.
- Payout destination and payout-method preference.
- Fulfilment commitments: handling time, coverage area, returns handling.
- Accepted partner terms version, recorded with timestamp.

Every state change is audited with actor, reason and document references. Any
revocation immediately hides the organization's network stock and cancels open
reservations.

### 5.2 Tier fields (each tier is data, admin-editable — never hardcoded)

| Field | Purpose |
|---|---|
| `tier_key`, name, country, currency | Identity and scope |
| monthly/annual fee | Recurring cost |
| commission or margin basis | Per-order economics |
| listing limits, location limits, seat limits | Capacity |
| exposure/priority weight | Search placement |
| return and warranty obligations | Buyer protection |
| payout schedule and reserve rule | Finance control |

Tiers must not silently downgrade on a stale billing event; the existing
webhook stale-event protection applies.

### 5.3 Relationship to existing programs

| Program | Grants Parts partner rights? | Notes |
|---|---|---|
| Shop Manager subscription | No | May be bundled at a discount; separate grant |
| `/franchise` Partner or Franchise tier | No, but may qualify a Parts tier price | Fees live in `franchise_tiers` |
| `/partner-program` promoter | No | Commission-only signup affiliate |
| Verified club membership | No | 5% internal-purchase discount only |

## 6. Data model additions required

Named at design level only; migrations require gate `G4`. Every table is
country-scoped, RLS-enabled and shipped with explicit `GRANT`s.

| Object | Purpose |
|---|---|
| `parts_products` | Canonical product: part number, brand, OEM references, domain, country scope |
| `parts_product_numbers` | Alternate, OEM, aftermarket and superseded numbers |
| `parts_fitment` | Applicability to asset identity/domain profile, with source and confidence |
| `parts_partners` | Parts enrollment per organization: status, documents, terms version, tier |
| `parts_partner_audit` | Append-only enrollment/exposure/tier history |
| `parts_offers` | Partner price and availability per product per location |
| `parts_reservations` | Short holds with requester, work order reference and expiry |
| `parts_orders` / `parts_order_lines` | Immutable commercial record incl. tax and fees |
| `parts_receipts` | Receiving incl. partial delivery and supersession |
| `parts_returns` / `parts_warranty_claims` | Buyer protection and supplier recovery |
| `installed_components` | Part instance fitted to an asset with position, installer, warranty |

Existing surfaces (`network_stock` view, inquiry tables, exposure status and
audit log, business inventory and invoices) are reconciled into this model rather
than duplicated.

## 7. Program gates

Parts gates sit beneath the platform gates `PG0–PG10`.

| Gate | Required evidence | Blocks |
|---|---|---|
| `G0 — authority` | Program owner, decision method and this document approved | All Parts build |
| `G1 — architecture` | Canonical catalog, offer, reservation, order and installed-component design approved; reconciliation with PR #2 complete | Migrations |
| `G2 — tenancy and security` | Cross-organization RLS and adversarial tests pass for stock, cost and PII | Live partner data |
| `G3 — legal and commercial` | Seller of record, invoice/refund roles, partner terms, tax and consumer-protection decisions recorded | Enrollment and network commerce |
| `G4 — build authorization` | Bounded scope, acceptance tests, rollback and data migration approved | Implementation |
| `G5 — internal readiness` | Synthetic end-to-end run: catalog → offer → inquiry → order → receive → issue → invoice → installed component | External pilot |
| `G6 — Philippine pilot` | Named partner cohort, volume caps, support and daily review | Public scale |
| `G7 — catalog/provider data` | Licence, territory, retention and refresh rights verified for any external catalog | Provider data use |
| `G8 — Philippine scale` | Fill rate, return rate, dispute rate, margin and reconciliation thresholds pass | National growth |
| `G9 — foreign domestic market` | Activated country pack | Foreign launch |
| `G10 — trade lane` | Exact lane pack approved (defers to `PG10`) | Cross-border orders |

## 8. Delivery sequence (Philippines first)

| Phase | Outcome | Gate |
|---|---|---|
| `P1` | Reconcile PR #2, publish canonical catalog and fitment design, inventory current Parts surfaces | `G0`, `G1` |
| `P2` | Cross-organization RLS and adversarial test suite for stock, cost and PII | `G2` |
| `P3` | Legal and commercial model: seller of record, partner terms, fees, refunds, tax | `G3` |
| `P4` | Partner enrollment product: application, document review, approval, tiers, billing | `G4` |
| `P5` | Canonical catalog MVP plus offers replacing ad-hoc network stock | `G4` |
| `P6` | Shop Manager consumption loop, steps 1–8 of §4, end to end on synthetic data | `G5` |
| `P7` | Installed-component registry plus History assertion hand-off (step 9–10) | `G5` |
| `P8` | Returns, warranty claims and supplier recovery | `G5` |
| `P9` | Philippine pilot with a named partner cohort | `G6` |
| `P10` | Scale review, then country packs | `G8`, `G9` |

## 9. Open decisions (P0 queue)

| ID | Decision | Needed for |
|---|---|---|
| `PD-001` | Is 365 seller of record, agent, or marketplace facilitator per order type? | `G3` |
| `PD-002` | Canonical catalog source: 365-built, licensed, or hybrid | `G1`, `G7` |
| `PD-003` | Parts partner fee model: subscription, commission, or hybrid per tier | `G3` |
| `PD-004` | Whether Shop Manager tiers bundle Parts partner rights at a discount | §5.3 |
| `PD-005` | Reservation default window and auto-expiry policy per product class | `G4` |
| `PD-006` | Return and warranty liability split between 365 and the partner | `G3` |
| `PD-007` | Whether promoter commissions ever apply to Parts orders (default: no) | `G3` |

## 10. Conflicts to resolve before build

| Conflict | Resolution rule |
|---|---|
| Draft PR #2 Parts index versus this plan | Reconcile into this document; PR #2 detail may be adopted, but shared identity, evidence and tenancy rules from the platform index prevail |
| `/parts/partners` currently means affiliate outbound links | Rename user-facing affiliate surfaces so "partner" is unambiguous once Parts partner enrollment ships |
| Business inventory tables versus a network offer model | Offers derive from owned inventory; no second editable quantity |
| Feature catalogue marketing labels versus tested status | §2 status table prevails over marketing copy |
| Terms pages versus new fees, returns and payouts | Terms, refund policy and privacy must be updated in the same change that ships any fee, payout or data-handling behaviour |

## 11. Stop conditions

Halt the affected capability immediately if any of the following occur:

- Another organization's cost, margin, customer or stock data becomes visible.
- Ledger postings do not balance, or an issue/return leaves stock and GL out of sync.
- Network stock is published for a revoked, suspended or unverified partner.
- An installed-component or History assertion is created without a completed
  work order and identified actor.
- Any external catalog data is used outside its licence, territory or retention terms.
- A fee, payout or refund behaviour ships without matching public terms.

## 12. Next controlled actions

1. Name a Parts program owner and record `G0` approval.
2. Reconcile draft PR #2 into this plan and close `PS-002`.
3. Produce the canonical catalog and offer design for `G1`.
4. Write the cross-organization adversarial RLS test suite for `G2`.
5. Record decisions `PD-001` through `PD-007`.
