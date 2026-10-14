# 365 Vehicle History Network - Security and Privacy Assurance

## 1. Assurance statement

365 will not treat security as a marketing badge. Live partner data should be accepted only after the controls below are implemented, tested, documented and reviewed against the signed agreement and current Philippine requirements.

This document describes the target control design. It must not be represented as completed certification until evidence exists.

## 2. Security and privacy principles

1. Collect the minimum data needed for a declared purpose.
2. Keep people data separate from vehicle facts.
3. Default records to private; publish only field-policy-approved facts.
4. Authenticate the user, organization, device/client and purpose.
5. Reject ambiguous identities rather than guessing.
6. Preserve provenance and correction history.
7. Restrict government/insurer data by contract at field level.
8. Design for data-subject rights, disputes and deletion/restriction.
9. Assume credentials and clients may be compromised; minimize blast radius.
10. Test restoration and incident response before live partner access.

## 3. Data zones

### Zone A - shop/private owner operations

Contains customer identity, owner claim evidence, repair orders, invoices, technician notes, source documents, prices, supplier terms and private scan details. Tenant isolation is mandatory.

### Zone B - restricted partner data

Contains raw or contract-bound government, insurer, law-enforcement, OEM and inspection responses. Use separate service identities, storage, encryption keys, field policies, logs and retention jobs. Public report services receive only approved derived facts.

### Zone C - public-safe report facts

Contains masked vehicle identity, reportable events, source labels, freshness, coverage, dispute state and report snapshots. It contains no previous-owner identity and no direct links to unrestricted source documents.

### Zone D - security/audit evidence

Contains access, administrative changes, partner queries, field-policy decisions, report generation, sharing, correction and incident events. Logs are append-only, access-limited and integrity-checked.

## 4. Identity and access management

- Unique account per person; shared credentials prohibited.
- MFA/passkeys required for staff, shops, partner users and all privileged access.
- Roles separated for shop operations, report review, partner integration, dispute review, security, DPO and system administration.
- Privileged access is time-limited and approved; emergency access is separately logged and reviewed.
- Access decisions include tenant, asset relationship, purpose, partner/source, field, country, report entitlement and dispute state.
- User and service accounts are disabled promptly on departure/contract termination.
- Quarterly access review during pilot; higher-risk partner roles reviewed monthly.
- No support impersonation without explicit approval, visible banner and audit trail.

## 5. Vehicle identifier protection

- Store a normalized encrypted value for authorized retrieval.
- Create a keyed HMAC lookup token for matching; do not publish unsalted identifier hashes.
- Mask identifiers on reports and user interfaces unless full display is necessary and authorized.
- Avoid presenting VIN/chassis, plate, MV file, engine and OR/CR reference together.
- Detect and rate-limit repeated plate/VIN/chassis queries.
- Block wildcard, range and sequential enumeration.
- Require additional authorization for high-risk recent or ownership-related queries.

## 6. Partner API security

- Server-to-server access only for restricted sources.
- OAuth 2 client credentials/private-key JWT or mutual TLS where the partner supports it.
- IP/network allowlists as an additional control, not the only authentication.
- Short-lived access tokens, scoped clients and separate sandbox/production credentials.
- Signed requests/responses or detached payload signatures for high-integrity events.
- Idempotency keys, nonce/timestamp and replay detection.
- Strict schemas, size limits, input validation and safe error messages.
- Per-client and per-purpose rate limits plus daily query budgets.
- Immediate client revocation and scheduled credential rotation.
- Partner request and response reference logged without over-copying restricted payloads.

## 7. Application and database controls

- Deny-by-default server authorization; client-side hiding is never access control.
- Supabase RLS plus application authorization and automated cross-tenant tests.
- Separate service-role credentials from browser/mobile clients.
- Secrets in managed vault/environment controls; never Git, logs or front-end bundles.
- Parameterized queries, secure storage paths and object-level authorization.
- History and evidence changes require authorized workflows; direct table edits are restricted and audited.
- Report snapshots are immutable, signed/hashed and reproducible from a recorded source set.
- Corrections create linked revisions rather than silent edits.

## 8. Evidence and file controls

- Direct-to-isolated signed upload with short expiry.
- MIME/type, file size and extension validation.
- Malware scan and quarantine before review or report availability.
- EXIF/location metadata removed from public derivatives unless explicitly required.
- Original evidence retained only under the correct visibility/retention policy.
- Download links are short-lived, viewer-bound where practical and logged.
- Sensitive documents receive redacted derivatives; originals never appear in public reports.
- Evidence hash, source, uploader, capture time and review decision preserved.

## 9. Report protection

- Unique report ID and cryptographic content hash.
- QR/link validation page showing issue time, source refresh time, current/superseded state and permitted summary.
- Purchaser/recipient watermark for downloaded reports.
- Time-limited owner shares with revocation.
- Screenshots are not treated as current reports; validation page is authoritative.
- Material correction can mark prior snapshots superseded and notify eligible purchasers.
- Robots/indexing disabled for private and purchased report pages.

## 10. Monitoring and fraud detection

Monitor:

- high-rate identifier searches;
- repeated no-match and near-match attempts;
- one user searching unrelated assets;
- bulk report generation or export;
- cross-region impossible travel and risky session changes;
- shop event patterns inconsistent with normal RO volume;
- duplicate invoice/part serial/evidence reuse;
- unusually positive-only contributor histories;
- repeated identity correction attempts;
- partner client errors, field over-return and unexpected schema changes; and
- administrative access outside change windows.

High-risk alerts require human review. Automated systems may restrict access but should not publicly accuse a user, shop or seller of fraud.

## 11. Secure development lifecycle

- Threat model for identity merging, partner ingestion, report sharing, disputes and staff administration.
- Privacy requirements and field policies included in design tickets.
- Peer review and protected branches for security-sensitive changes.
- Static analysis, dependency/secret scanning and vulnerability triage.
- Automated tests for RLS, object authorization, field filtering, report redaction and entitlement denial.
- Separate development/test/production systems with synthetic data outside controlled production support.
- Change approval and rollback plan for partner adapters and field policies.
- Independent penetration test before live government/insurer data and after material architecture changes.
- Annual PIA review and new PIA when significant processing changes occur.

## 12. Retention framework

Final periods require counsel, DPO and partner approval. The design should support different retention by source and field.

| Record class | Proposed pilot treatment |
|---|---|
| Raw government/insurer response | Ephemeral or shortest contract-permitted period; prefer zero persistent raw storage |
| Approved public-safe status fact | Retain with source, effective period and agreement policy while lawful and necessary |
| Vehicle history event | Lifecycle retention where lawful; separate/pseudonymize personal contributor/owner data when no longer needed |
| Owner claim/identity evidence | Only while needed for claim and dispute purposes; restricted and deleted/pseudonymized by schedule |
| Owner share grant | Expire automatically; retain minimal audit record |
| Purchased report snapshot | Retain for customer access, disputes, accounting and legal need under approved schedule |
| Access/partner query logs | Proposed two years or longer/shorter as contract and risk require |
| Security logs | At least one year proposed with hot/cold tiers; align with incident and contract needs |
| Dispute evidence | Until final resolution plus approved limitation/appeal period |
| Backups | Encrypted, access-limited and expired on a defined rotation; deletion propagates by documented process |

No record should be retained merely because storage is inexpensive.

## 13. Privacy operations

- Layered privacy notices for owner, buyer, seller, shop, contributor and partner contexts.
- Consent is granular, recorded, withdrawable for future optional processing and never bundled with unrelated marketing.
- Non-consent lawful bases are documented per purpose and field.
- Data-subject request portal and offline channel.
- Identity verification proportionate to the request; do not collect another complete ID when a lower-risk method is sufficient.
- Data-subject requests and complaints have owners, due dates and audit records.
- Previous-owner information is detached from a vehicle profile when custody changes, except restricted records lawfully needed for audit/disputes.
- Cross-border transfers use approved contractual and technical controls.
- Children are not a target report audience; account and consent flows must avoid unnecessary minor data.

## 14. Incident response

### Severity examples

- SEV-1: live partner credential compromise, large or sensitive personal-data disclosure, systemic cross-tenant access, or integrity compromise affecting public reports.
- SEV-2: contained unauthorized access, limited wrong-recipient disclosure, significant partner outage or systematic data-quality defect.
- SEV-3: attempted abuse blocked, minor availability issue or limited incorrect event with no sensitive disclosure.

### Required roles

- Incident commander.
- Security/engineering lead.
- DPO/privacy lead.
- Legal counsel.
- Partner liaison.
- Customer/dispute communications lead.
- Evidence recorder/scribe.

### 72-hour capable workflow

The incident plan must support initial assessment and available-information notification within 72 hours when Philippine notification is mandatory. The PIC remains responsible even where processing is outsourced. Partner contracts should require processors to alert 365 quickly enough to meet 365's obligations.

Conduct at least one tabletop exercise and one credential/data-access simulation before live partner data.

## 15. Business continuity and disaster recovery

Proposed pilot targets, subject to engineering validation:

- Report validation and core identity services: RTO 4 hours; RPO 15 minutes.
- Shop event ingestion: RTO 8 hours; RPO 1 hour, with durable retry queue.
- Partner status verification: fail closed or show unavailable; never substitute stale/another source silently.
- Nightly encrypted backup plus continuous/point-in-time protection where available.
- Quarterly restore test during pilot.
- Documented regional outage, ransomware, key loss and partner outage playbooks.

## 16. Assurance roadmap

### Before pilot

- NPC compliance/registration path resolved.
- PIA and privacy management program.
- Baseline control evidence, vulnerability scan, restore test and tabletop.
- Independent penetration test scoped to identity, tenant isolation, reports and partner APIs.

### Before scale

- Formal ISMS/PIMS roadmap.
- Consider ISO/IEC 27001 and ISO/IEC 27701 certification.
- Review eligibility and business case for the Philippine Privacy Mark; do not display it before certification.
- Annual independent penetration test and partner-facing assurance report.
- Cyber insurance aligned to actual data and contractual exposure.

## 17. Evidence available to partners

- Architecture/data-flow diagrams.
- PIA executive summary and risk treatment status.
- Roles and access matrix.
- Encryption/key-management description.
- Secure-development and vulnerability-management policies.
- Penetration-test executive summary and remediation status.
- Incident response and 72-hour notification procedure.
- Business continuity and restore-test evidence.
- Subprocessor list and hosting regions.
- Data inventory, field matrix and retention schedule.
- Sample audit trail using synthetic data.

