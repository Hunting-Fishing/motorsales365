# 365 Motor Sales — Data Ownership Boundaries

## Purpose

365 Motor Sales is an independently saleable business and software product. Its production database, authentication, storage, business logic, customer records, and operational data must remain separable from every other 365 ecosystem product.

Cross-product integration is performed through versioned APIs and stable external identifiers. Other products must not query or modify 365 Motor Sales database tables directly.

## Core rule

**The service that creates and governs a business record is the system of record for that data.**

A consuming application may cache explicitly approved public or partner data, but it must preserve the owning service's external identifier and must not become the authoritative copy unless an explicit data-transfer agreement changes ownership.

## 365 Motor Sales owns

- Vehicle, motorcycle, boat, equipment, aircraft, and transportation listings created in 365 Motor Sales.
- Seller and dealer records created for 365 Motor Sales workflows.
- Automotive business profiles managed by 365 Motor Sales.
- Repair-shop, dealer, parts, service, insurance, and automotive-directory records managed by 365 Motor Sales.
- 365 Motor Sales subscriptions, listing products, boosts, referrals, payouts, and billing metadata.
- 365 Motor Sales vehicle-history records and partner mappings.
- Shop/parts information that is specifically authored inside the 365 Motor Sales product boundary.
- 365 Motor Sales audit trails, admin records, permissions, and internal operational data.
- 365 Motor Sales storage objects and private documents.

## 365 Motor Sales does not own

- Barangay master/location data authored and governed by Barangay Buddy.
- Barangay Buddy restaurant, local-service, delivery, community, or fuel-price records unless explicitly imported under a transfer agreement.
- Drone telemetry, missions, imagery, operator records, or drone-network operational data.
- Independent Shop Manager work orders, technician records, repair customer records, and shop accounting data.
- SWGOH Command Center data.
- Data belonging to future independently operated 365 businesses.

## Cross-product references

When 365 Motor Sales references another ecosystem service, store a stable external reference rather than a direct database foreign key.

Recommended shape:

```text
external_source = "barangay-buddy"
external_id     = "<stable-id>"
external_version = "v1"
```

For records exported from 365 Motor Sales to another product, the consumer should preserve:

```text
external_source = "365-motor-sales"
external_id     = "<365-record-id>"
```

## Prohibited coupling

Do not implement:

- Cross-database foreign keys.
- Shared production tables between independently saleable businesses.
- Direct SQL access from Barangay Buddy, Drone Network, Shop Manager, or another product into the 365 Motor Sales database.
- Shared service-role keys between products.
- Shared storage buckets containing private data from unrelated products.
- A common user table that prevents one company from being sold independently.

## Allowed integration

Use:

- Versioned HTTP APIs.
- Service-to-service authentication.
- Webhooks for event notifications.
- Explicit public/partner data contracts.
- Stable external IDs.
- Controlled caches with documented refresh/expiry rules.
- Separate API credentials per consuming business.

## Authentication

365 Motor Sales owns its authentication configuration and identities required to operate the service. If a future ecosystem-wide login is introduced, it must use federation/SSO or another replaceable identity contract rather than requiring multiple businesses to share one physical auth database.

## Sale / carve-out requirement

At any time, 365 Motor Sales must be capable of being transferred with:

- Its repository.
- Its Supabase project/database.
- Its Auth configuration and transferable user data.
- Its Storage objects.
- Its Edge Functions and backend services.
- Its domains and API endpoints.
- Its integration documentation.
- Its own secrets and third-party accounts, subject to contract transferability.

Other 365 businesses must continue functioning after the transfer by replacing internal credentials with commercial API credentials or by disabling the integration.

## Change control

Any feature that introduces a new dependency on another 365 business must document:

1. Data owner.
2. API owner.
3. Endpoint/version used.
4. Authentication method.
5. Data classification: public, partner, private, regulated.
6. Cache/retention behavior.
7. Failure behavior when the other service is unavailable.
8. Exit/sale behavior.
