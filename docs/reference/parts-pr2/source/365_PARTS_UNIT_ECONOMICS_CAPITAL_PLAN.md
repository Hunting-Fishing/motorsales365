# 365 Parts Unit Economics and Capital Plan

**Control document:** [`365_PARTS_PROGRAM_INDEX.md`](./365_PARTS_PROGRAM_INDEX.md)

**Status:** Financial model specification; populate with signed terms and measured data

**Version:** 1.0

**Updated:** 2026-08-06

> Figures must not be treated as approved merely because they appear in a forecast. Finance owns definitions, source evidence, reconciliation, and versioning.

## 1. Financial objective

365 should maximize durable contribution margin and data/network value while keeping early operations asset-light.

The program should initially earn from software, transaction, sourcing, fulfillment coordination, and negotiated supplier economics while partners and distributors hold inventory. Warehouses, private label, credit exposure, and owned stock are capital decisions that follow measured demand.

## 2. Core formulas

### 2.1 Order-level net revenue

```text
net revenue
= customer service/marketplace fees retained by 365
+ seller commission retained by 365
+ product markup retained by 365
+ sourcing fee
+ logistics coordination/handling fee retained by 365
+ installation/referral revenue retained by 365
+ earned distributor rebate allocated to 365
+ subscription revenue allocated to usage
- customer discounts funded by 365
- seller fee credits
- refunded 365 revenue
```

Do not count seller proceeds, taxes collected for authorities, refundable deposits, core deposits owed to the customer, or carrier charges merely passed through as 365 revenue.

### 2.2 Contribution margin

```text
contribution margin
= net revenue
- payment and payout processing
- variable catalog/API usage
- variable hosting/communications
- support and manual sourcing labor
- 365-funded delivery/packaging/handling
- refunds not recovered from responsible parties
- chargebacks, fraud, bad debt, and collection cost
- returns, warranty, core, and recall expense
- FX and customs variance borne by 365
- partner acquisition incentive allocated to the order
- variable insurance/claims allocation
```

### 2.3 Cash requirement

```text
operating cash requirement
= supplier prepayments and deposits
+ carrier/broker/duty advances
+ payout timing gap
+ refund and chargeback liquidity
+ warranty/recall reserves
+ tax/withholding liabilities before remittance
+ inventory and hub working capital
+ minimum operating buffer
- customer funds legally and contractually available for the same obligations
- approved supplier credit
- recoverable deposits and insured amounts
```

Customer funds must not be assumed available for general operations without legal, contractual, accounting, and provider confirmation.

## 3. Required dimensions

Every financial event must be reportable by:

- order, sub-order, order line, shipment, return, warranty, and settlement;
- customer type: consumer, repair shop, reseller, fleet, distributor;
- seller, supplier, legal entity, location, and partner tier;
- category, product, brand, condition, and vehicle domain;
- domestic market or exact trade lane;
- channel: marketplace, Shop Manager procurement, assisted RFQ, affiliate, API;
- payment, payout, carrier, broker, and fulfillment provider;
- currency, display/charge/settlement currency, and FX quote;
- campaign, discount funder, and acquisition source.

## 4. Revenue model register

| Revenue stream | Payer | Recognition event | Main control |
|---|---|---|---|
| Shop Manager subscription | Partner business | Service period | Entitlement and proration |
| Marketplace commission | Seller | Eligible completed sale | Seller agreement and settlement ledger |
| Customer service fee | Customer | Order acceptance/fulfilment per policy | Clear pre-payment disclosure |
| Product markup | Customer | Sale by approved merchant model | Seller-of-record and tax treatment |
| Assisted sourcing fee | Customer/business buyer | Accepted quote or successful source per terms | Refund/cancellation rule |
| Logistics coordination | Customer/seller | Shipment/service event | Pass-through versus retained revenue separation |
| Installation referral/booking | Installer or customer | Completed qualifying booking | Attribution and cancellation rules |
| Distributor rebate | Distributor | Earned under agreement | Accrual, eligibility, clawback, allocation |
| Data/API service | Approved business client | Usage or contract period | Source-license and privacy limitations |
| Advertising/sponsored offer | Seller/brand | Impression/click/period | Disclosure; safety/fitment ranking cannot be overridden |
| Buying-group fee | Member/supplier | Eligible purchasing activity | Competition and rebate transparency |

Affiliate click revenue remains outside marketplace order economics and must be reported separately.

## 5. Cost model register

### 5.1 Variable transaction costs

- payment authorization, capture, payout, cross-border, FX, refund, and chargeback fees;
- carrier, label, pickup, remote-area, fuel, handling, insurance, brokerage, duty/tax advance, and redelivery;
- packaging and dangerous-goods materials;
- catalog, VIN/chassis, tax, fraud, sanctions, address, messaging, translation, and support API calls;
- partner commissions or referral payments;
- per-order support, manual confirmation, sourcing, and exception handling;
- returns freight, inspection, repacking, disposal, supplier recovery, and customer replacement;
- warranty, counterfeit, recall, cargo damage, and fraud losses.

### 5.2 Fixed/semi-fixed costs

- engineering, product, design, security, data, and QA;
- partner recruitment, onboarding, training, audits, and field support;
- customer operations and quality/compliance staff;
- legal, tax, privacy, customs, licensing, and insurance;
- Supabase, hosting, observability, backup, storage, and business systems;
- offices, equipment, country launches, and provider minimums;
- hub/warehouse rent, labor, systems, and depreciation when later approved.

## 6. Order ledger and reconciliation design

The financial source of truth must use immutable entries rather than recalculating history from current prices or policies.

Minimum entry types:

- customer receivable/collection;
- tax and duty payable;
- seller proceeds payable;
- 365 fee/commission/markup revenue;
- shipping/broker/pass-through liability;
- payment/provider fee;
- withholding;
- refund and refund recovery;
- chargeback, dispute, and recovery;
- payout and payout reversal;
- reserve hold, release, and use;
- core deposit, return, forfeiture, and refund;
- rebate accrual, confirmation, payment, and clawback;
- FX gain/loss and customs adjustment;
- intercompany receivable/payable where applicable.

Required properties:

- event and accounting timestamps;
- legal entity, currency, signed amount, and account code;
- immutable source record and idempotency key;
- order/policy/rate/tax/FX versions;
- counterparty and responsible party;
- reversal linkage rather than destructive update;
- external provider reference and reconciliation status.

## 7. Unit-economics model by order type

### 7.1 Domestic partner order

Measure:

- commission/service revenue;
- payment/payout cost;
- delivery subsidy and support time;
- refunds/warranty/fraud allocation;
- contribution before and after partner acquisition cost.

### 7.2 Distributor direct fulfilment

Add:

- wholesale/retail spread or distributor commission;
- minimum-order/freight rules;
- backorder and cancellation cost;
- blind-ship/handling fee;
- supplier warranty recovery timing.

### 7.3 Inter-company B2B order

Add:

- buyer/seller subscription allocation;
- negotiated pricing and rebate;
- AP/AR processing and credit cost;
- receiving variance and return freight;
- sales-tax/VAT exemption evidence cost where applicable.

### 7.4 Assisted sourcing/RFQ

Add:

- sourcing labor minutes;
- quote conversion and expiry;
- fitment/condition verification;
- non-refundable third-party costs;
- customer cancellation and supplier deposit exposure.

### 7.5 Cross-border order

Add:

- origin and destination handling;
- export/import documents and broker fees;
- duty/tax, disbursement, and customs adjustments;
- international payment/FX;
- screening and compliance review;
- damage/loss insurance;
- return, warranty, abandonment, and duty-recovery exposure.

Every trade lane receives its own profit-and-loss view. Profitable domestic orders must not conceal a loss-making export lane.

## 8. Scenario model inputs

Maintain low, base, and high cases for:

| Driver | Required input |
|---|---|
| Demand | searches, conversion, orders, repeat rate, seasonality |
| Basket | product value, line count, seller count, weight/volume |
| Revenue | commission, fees, markup, subscription, rebates |
| Supply | fill rate, backorder, cancellation, lead time |
| Logistics | service, zone, remote surcharge, damage, redelivery |
| Support | contacts/order, minutes/contact, escalation rate |
| Returns/quality | return, wrong part, defect, warranty, counterfeit, recall |
| Payments | authorization, capture, payout, refund, chargeback, FX |
| Capital | payout gap, supplier terms, inventory days, reserves |
| Growth | customer/partner acquisition and onboarding cost |

Assumptions require source, owner, confidence, effective date, and replacement trigger.

## 9. Working-capital controls

### 9.1 Cash-conversion timeline

Track exact dates for:

1. customer authorization and capture;
2. supplier reservation, invoice, deposit, and payment;
3. carrier/broker/duty funding;
4. shipment and delivery;
5. return/warranty eligibility milestone;
6. seller payout release;
7. tax/withholding remittance;
8. refund, chargeback, and supplier recovery;
9. rebate receipt.

### 9.2 Exposure limits

Set limits by:

- partner and distributor;
- customer and commercial account;
- payment provider and bank;
- category/product risk;
- market and trade lane;
- open refunds/warranties/chargebacks;
- inventory owner and aging bucket;
- currency and FX volatility.

The order engine must refuse or require approval when a configured exposure limit would be exceeded.

## 10. Reserves

Create separately governed reserves for:

- customer refunds;
- chargebacks and fraud;
- returns and restocking loss;
- product warranty;
- cargo loss/damage;
- recalls and customer notification;
- counterfeit/source disputes;
- customs, duty, tax, and FX adjustments;
- B2B bad debt;
- inventory obsolescence when 365 later owns stock.

Each reserve has an owner, calculation, minimum floor, release rule, funding source, legal-entity/currency boundary, and monthly true-up.

## 11. Capital stages

### Stage A — documentation and validation

Fund legal/tax advice, data discovery, partner interviews, technical design, provider quotes, and small prototypes. Avoid inventory and long contracts.

### Stage B — controlled Philippine pilot

Fund tenancy correction, catalog MVP, linked availability, ordering, reconciliation, partner onboarding, support, and reserves. Use partner/distributor stock.

### Stage C — Philippine density

Fund provider integrations, field onboarding, returns network, delivery contracts, multi-seller settlement, and buying-group operations only after pilot gates.

### Stage D — one foreign domestic market and one export lane

Separate budgets for country activation and trade-lane learning. Do not hide either inside the Philippine operating budget.

### Stage E — regional nodes and strategic inventory

Require a capital memo showing volume, service improvement, margin, cash cycle, downside, exit/repurpose path, and return on invested capital.

### Stage F — private label/manufacturing/acquisitions

Require independent quality, insurance, recall, demand, working-capital, governance, and integration cases.

## 12. Capital approval memo

Every material commitment must state:

- problem and why software/partner capacity cannot solve it;
- amount, currency, legal entity, payment schedule, and cancellation terms;
- demand and unit-economics evidence;
- effect on customer promise and partner network;
- operational owner and staffing;
- legal, tax, insurance, safety, and data obligations;
- base/downside/upside cash flow;
- break-even volume and maximum loss;
- exit, resale, sublease, repurpose, or shutdown plan;
- success and stop criteria.

## 13. Scale gates

Do not approve geographic, category, or marketing scale unless:

- contribution margin is positive or a time-bound learning subsidy is explicit;
- daily settlement reconciliation is stable;
- reserves and liquidity meet approved floors;
- stock, fitment, fulfillment, return, and quality thresholds pass;
- support effort per order is understood and sustainable;
- partner and customer acquisition payback is within the approved horizon;
- provider concentration and continuity risks are accepted;
- no material safety, privacy, tax, or regulatory issue remains open.

## 14. Financial dashboard

The executive view should show:

- orders and gross transaction value;
- net revenue and contribution margin;
- contribution per order and per support hour;
- cash balance by legal entity/currency;
- seller payable, tax/duty payable, reserves, and customer refund exposure;
- unsettled/reconciliation exceptions by age;
- supplier prepayment and B2B receivables;
- marketing and partner acquisition payback;
- performance by market, cluster, partner, category, provider, and lane;
- capital committed, deployed, recovered, and at risk.

## 15. Supabase/analytics requirements

Minimum financial entities or equivalent views:

- `financial_ledger_entries`;
- `settlement_accounts` and `settlement_runs`;
- `partner_payables` and payout events;
- `tax_duty_liabilities`;
- `reserves` and reserve movements;
- `provider_reconciliations` and exceptions;
- `fx_quotes` and currency adjustments;
- `order_unit_economics_snapshots`;
- `partner_category_lane_profitability` aggregates;
- `capital_commitments` and approval evidence.

RLS must restrict entity finance to authorized roles. Aggregated network reporting must not expose another partner's confidential costs or negotiated terms.

## 16. Definition of financial readiness

The program is financially ready for a phase only when:

- money and liability flows are documented;
- provider and supplier terms are signed or evidenced;
- ledger entries reconcile to bank/provider statements;
- tax/withholding and invoice treatment is approved for the operating model;
- reserves, exposure limits, and payout holds are configured;
- scenario and downside cash requirements are funded;
- finance can explain order profitability without spreadsheet-only manual reconstruction.
