# 365 Ecosystem Integration Registry

## Infrastructure parent

**Supabase organization:** `366 Industries AI Platform`  
**Organization ID:** `lqoqcbpfwwwpyjfiveun`  
**Policy:** Main commercial 366 Industries products may share this Supabase organization for centralized ownership, billing, access administration, and cost management, but each independently saleable business must use its own Supabase project/database unless an explicit architecture review approves otherwise.

Sharing the Supabase organization does **not** mean sharing application databases. Each serious business retains independent database, Auth, Storage, Edge Functions, secrets, API keys, migrations, and deployment configuration so it can be sold, transferred, paused, or operated independently.

SWGOH Command Center remains outside the 366 Industries business ecosystem and must not be merged into these databases.

## Rule

365 Motor Sales is a standalone service. All connections to Barangay Buddy, Drone Network, Shop Manager, payment providers, mapping providers, parts partners, and future products must be registered here or in a linked service-specific integration document.

No integration may depend on direct access to another independently saleable product's production database.

## Service: 365 Motor Sales

**Owner:** 365 Motor Sales  
**Role:** System of record for 365 Motor Sales automotive marketplace and automotive business data.  
**Production API target:** `https://api.365motorsales.com/v1` (planned; do not assume live until deployed).  
**Current backend migration target:** Dedicated managed Supabase project inside `366 Industries AI Platform`.

### Provides

Planned API domains include:

- Vehicle and transportation listings.
- Dealers.
- Automotive businesses.
- Repair shops and service capabilities.
- Parts/business partner references.
- Public vehicle-history information where legally and contractually permitted.
- Public location/service availability data.

### Consumes

Potential integrations include:

- Barangay Buddy location and community-directory API.
- Mapping/geocoding services.
- Payment processors.
- Messaging/SMS/email providers.
- Parts, VIN/chassis, labor-time, and vehicle-history partners.
- Future Drone Network services where a defined business case exists.

## Service: Barangay Buddy

**Owner:** Barangay Buddy  
**Role:** System of record for Barangay Buddy barangay, local-business, delivery, community, restaurant, fuel-price, and related local-network data.  
**API target:** Versioned Barangay Buddy API; exact production hostname to be registered when finalized.

### Permitted 365 Motor Sales relationship

Barangay Buddy may consume selected public or partner-authorized 365 Motor Sales data through the 365 Motor Sales API. Examples:

- Automotive businesses.
- Repair shops.
- Dealers.
- Public vehicle listings.
- Public service-area/location information.

Barangay Buddy must preserve 365 Motor Sales external IDs and must not become the authoritative owner of 365 Motor Sales records merely by caching them.

365 Motor Sales may consume Barangay Buddy-owned location/community information through a Barangay Buddy API rather than duplicating control of the Barangay master dataset.

## Service: 365 Drone Network

**Owner:** Future Drone Network business/service.  
**Role:** Own drone missions, telemetry, operators, fleet state, imagery, coverage, and drone-specific operational data.

Other products consume Drone Network capabilities through a versioned API. Direct database access is prohibited.

## Service: Shop Manager / Repair Business Platform

**Owner:** Independent Shop Manager business/product when commercialized.  
**Role:** Own work orders, technicians, customers, shop inventory, inspections, estimates, invoices, and repair-operation records created inside that product.

365 Motor Sales can provide automotive directory/listing/referral information through API integration. Shop Manager can expose controlled service availability or public business information back through its own API.

## Cost and lifecycle policy

Not every experiment needs a dedicated always-on production database. Dedicated projects are prioritized for active, serious, independently saleable products. Early concepts may remain GitHub-only, local, archived, or paused until active development justifies compute cost.

Cost optimization must not create direct database coupling between independently saleable businesses. If the cost of separate production projects becomes material, prefer pausing inactive projects, archival, API caching, or infrastructure plan changes rather than merging ownership boundaries.

## Integration implementation pattern

Each product should use a dedicated integration module, for example:

```text
src/
  integrations/
    registry.ts
    365-motor-sales/
    barangay-buddy/
    drone-network/
    shop-manager/
    stripe/
    maps/
```

Each internal integration module should contain, as applicable:

- `client.ts` — network client.
- `types.ts` — contract types.
- `endpoints.ts` — endpoint definitions.
- `mapper.ts` — translation between external and internal models.
- `errors.ts` — integration-specific error handling.

## Secrets policy

Repository files may contain environment-variable names and non-secret service URLs. They must not contain production secrets.

Examples of allowed configuration names:

```text
MOTORSALES_API_URL
BARANGAY_BUDDY_API_URL
DRONE_NETWORK_API_URL
```

API keys, service-role keys, webhook secrets, payment secrets, OAuth secrets, and signing keys must remain in the appropriate deployment secret store.

## API contract requirements

All business-to-business APIs must:

1. Be versioned (`/v1`, `/v2`, etc.).
2. Authenticate partner/service requests independently.
3. Expose only fields authorized for that consumer.
4. Avoid leaking internal database schemas as the public contract.
5. Use stable IDs.
6. Define pagination, filtering, rate limits, error formats, and deprecation behavior.
7. Define whether fields are authoritative, derived, cached, or informational.
8. Support credential rotation without application rewrites.
9. Remain replaceable if one company is sold.

## Sale / separation test

Before adding a new cross-business integration, answer:

- Can either business be sold without transferring the other company's database?
- Can credentials be rotated independently?
- Can the connection be disabled without corrupting either product?
- Can the buyer operate using a documented API agreement?
- Is the authoritative owner of every shared field clear?

If any answer is no, the integration design must be revised before production deployment.
