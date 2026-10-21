# Multi-business client release acceptance — Parts Shop + Shop Manager

Status: OPEN. This document is a scope and acceptance contract, not proof of implemented functionality. Owner-confirmed 2026-10-20: multiple independent businesses are required in the first release.

## Required business journeys
1. Register Store A, Store C, Repair Shop B and Repair Shop D; assign separate owners and staff. Test one user authorized for two businesses and verify switching does not leak cached records.
2. Each business manages its own inventory, locations, costs, supplier details, customers, employees, orders and invoices.
3. Same canonical part may have independent quantity, selling price and cost per store; network availability is opt-in and must not expose private economics.
4. B places an order with A; reserve quantity atomically, accept/reject, receive, reconcile inventory and invoice; repeat concurrently to prove no oversell.
5. B opens a customer vehicle, creates an inspection, quote, work order, consumes installed parts and labor, invoices and records payment; verify correct business, customer and vehicle history.
6. Refunds, returns, cancellations, failures, timeouts and retries must be idempotent or have explicit unknown-outcome recovery; no blind duplicate posting.
7. Disable network exposure for A and confirm discovery disappears without deleting A's private stock or historical transactions.
8. Verify unauthorized/anonymous users and staff from C cannot access A/B customer PII, costs, supplier prices, order internals, private receipt files or staff data.
9. Verify real browser and mobile flows, backup/restore, migrations, rollback plan and independent Cloudflare deployment before release.

## Non-negotiable gates
- Row-level and server-side tenant/role authorization on every business read and write; client-side selection alone is insufficient.
- Transactional inventory, reservations and financial operations, with concurrency and partial-failure tests.
- Complete reproducible database migrations and private-object recovery.
- Exact-head CI, staging deployment, real multi-business acceptance, owner sign-off.
- No direct merge to main or production deployment until all gates pass.

## Explicitly out of scope for first client acceptance
Consumer marketplace expansion, Barangay Buddy dispatch and unrelated programs, unless a contracted client dependency requires them.

## Current evidence limitations
The integrated candidate includes substantial tests and transaction candidates, but several replacements remain unconnected; legacy stock writes and quote conversion require work. The invoice 100-to-101 preflight in this branch is a guard, not an atomic invoice transaction.
