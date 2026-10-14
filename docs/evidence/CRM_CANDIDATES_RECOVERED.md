# Recovered CRM candidates and integration boundary

Observed 2026-10-15 Asia/Manila. **Candidates recovered; adoption not approved.**
This is a source/architecture review, not an installed integration, legal opinion,
production release recommendation or promise of revenue.

## Original chat evidence

The app's authenticated read-only chat tools now returned the previously
unavailable durable CRM chat `01a1397b-e1b3-70ae-bfb0-045e77e17024`, workspace
`/workspace/scratch/8b1286a419da`. Its final CRM attempt failed on usage limits.
The recorded recommendation named **ERPNext** and **Dolibarr**, while explicitly
continuing native 365 CRM until the owner reviewed them. No adoption decision
was recorded. Search queries also mentioned Odoo, but it was not one of the two
recommended options; do not substitute it or invent a selected repository.

The record shows cloning the canonical 365 repository, creating
`feature/parts-crm-integration`, and a CLI `parts_crm_workspace` migration
creation command. It does not provide verified CRM source edits, commit, push or
PR from that interrupted workspace. Chat-context recovery is complete; filesystem
source recovery is not. No message was sent to, nor work resumed in, that chat.
The ChatGPT chats **Receipt Tracking Status** and **Development status audit**
also corroborate the native receipt/CRM request, but their older deployment
statements are historical claims, not refreshed production evidence.

The 366 Designer skill was inspected; no authenticated 366 Designer project tool
is exposed in this session. No project data was obtained or modification claimed.
Do not install a replacement connector or guess project IDs to fill that gap.

## Current primary-source review

Both repositories' root license files contain GPL version 3 text; GitHub reports
GPL-3.0. Before copying/distributing modified components, review the actual
applicable notices, dependencies, commercial distribution and trademark terms.
Do not interpret open source as ownership of upstream code or a license-free
closed-source bundle. No upstream code was copied or runtime installed here.

| Candidate                                        | Pinned review observation (develop, not a selected stable release)                                                                                                                                                 | Integration evidence                                                                                                                                                                                                                                                 |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [ERPNext](https://github.com/frappe/erpnext)     | Commit `6e4dffdeb6dcc724adeacf1b30ef1cbabcb2af80`; [license.txt](https://github.com/frappe/erpnext/blob/6e4dffdeb6dcc724adeacf1b30ef1cbabcb2af80/license.txt), Git blob `f288702d2fa16d3cdf0035b15a9fcbc552cd88e7` | Maintainer README describes accounting, stock/order/customer/supplier workflows and Python/JavaScript Frappe. [Frappe REST documentation](https://docs.frappe.io/framework/user/en/api/rest) provides authenticated document/resource access.                        |
| [Dolibarr](https://github.com/Dolibarr/dolibarr) | Commit `c5b165c2e7a40ac9ac3ba83dc831014ef51fe462`; [COPYING](https://github.com/Dolibarr/dolibarr/blob/c5b165c2e7a40ac9ac3ba83dc831014ef51fe462/COPYING), Git blob `e60008693e017bec1b4eb49c84be3898e26fcf2a`      | Maintainer README describes ERP/CRM, stock/orders/invoices and a PHP web application with a supported relational database. [Official REST module documentation](https://wiki.dolibarr.org/index.php/Module_Web_Services_API_REST) documents per-user API-key access. |

Review hashes identify observed upstream source, not a vetted version or security
clearance. Self-hosted source still requires operated infrastructure and recovery.
No hosting/resource or new recurring-charge decision is made by this review.

## Recommended 365 architecture (inference, not adoption)

Continue the native Customer 360/Shop Manager path already implemented in PRs
#11–#16. The current React/TanStack/TypeScript application, Cloudflare bundle,
Supabase identity and receipt/history ledger are not drop-in hosts for either
separate application. Replacing the core would duplicate identity/authorization
and stock/accounting responsibility while the existing release gates are open.
This is an architectural inference from the inspected stacks and 365 source,
not a tested performance/cost comparison.

If the owner later selects an external ERP, evaluate a separately operated,
version-pinned **optional server-side adapter**, beginning with synthetic,
read-only projections. ERPNext is the prior chat's first candidate for a broader
ERP evaluation; Dolibarr remains the alternative. Neither is a present dependency
of 365, and no external system is required for on-device receipt OCR.

Required adapter acceptance before adoption:

1. Declare which system owns each customer/order/stock/invoice state; never let
   two ledgers independently post the same sale or inventory movement.
2. Map immutable native and external IDs per authenticated business/shop. No
   implicit joins or merges by email, names, VIN/plate or organization guesses.
3. Keep credentials and tenant selection server-side with narrowly permitted
   accounts. Test cross-tenant IDs, disabled membership and revoked credentials.
4. Use durable idempotency, bounded retries, reconciliation and an inspectable
   failure queue. Prove duplicates, partial outages and reordered changes with
   synthetic fixtures before any writes. API documentation is not this proof.
5. Keep original receipts/private vehicle history in 365 by default; external
   projection must not become hidden file sharing. Explicit consent, purpose and
   field allowlists precede any external customer-data transfer.
6. Review licenses/notices/trademarks and operational ownership; evaluate a
   pinned supported release, upgrades, backups and restore. An API boundary does
   not by itself constitute a legal compatibility determination.
7. Require a real isolated vendor integration rehearsal, owner acceptance and
   explicit infrastructure/release authority. Do not provision/install either
   product or change production just because its repository has been identified.

Next 365 dependency remains trusted native profile/roster authority and the
baseline/recovery gates, followed by atomic invoicing and bounded CRM activity,
retail/recruitment pipelines and pilot acceptance. The recovered candidates
remove an evidence gap; they do not interrupt or replace that native build.
