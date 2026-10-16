# Receipt expense caller and acknowledgment safety

Source: `5bd1a7155b3711174791bb475999973c45bbcff0`, same integrated branch and
draft PR #68. Publication/exact-head checks are recorded separately.

## Scope

This C1.04 source slice changes only the receipt-expense handler, its pure
request/acknowledgment contract and the panel's expense action, with adjacent
tests and unconditional CI wiring. It does not change SQL, native permissions,
the shared legacy RPC helper or the other receipt writers.

The exact request captures account, receipt and selected shop-vehicle intent.
The unchanged same-client caller denial helper checks the middleware context and
request. A fixed `id,shop_vehicle_id` receipt read must have own successful SDK
evidence and match both captured IDs before the single fixed expense RPC is
awaited. Read and RPC builders receive the request signal and explicit
`retry(false)`. The installed PostgREST SDK retries idempotent reads only; this
does not imply that its POST RPC previously retried automatically.

The exact three-field result binds captured receipt/shop-vehicle intent and the
returned expense UUID. It is a **transport acknowledgment**, not proof of the
persisted expense's amount, tenant, posting, reconciliation or durable dedupe.
Errors are generic and do not expose provider/database detail. Caller fences run
after construction, each await, parsing and before return. The separate target
read and RPC are not atomic: a concurrent target change remains a backend gate.

## Panel behavior

Only a confirmed receipt whose shop-vehicle ID matches the selected workspace
can enter the action from a fresh usable receipt snapshot. The immutable request
includes that selected target; a truthy different-shop ID is not sufficient.
The dedicated per-mount ref admits one expense attempt synchronously, before
awaiting or React state updates. Account/target/Auth-loading/unmount and ABA
lifetimes fence late callbacks. StrictMode cleanup of an actually dispatched
pending write conservatively holds the retained scope and aborts transport;
setup cannot revive it or release the hold. This does not prove SQL cancellation.

A checked acknowledgment produces a neutral message asking the operator to
check shop expenses, not a "recorded" claim. Only the current attempt can
invalidate the real legacy `shop-manager,expenses` key and existing receipt/
history prefixes. The separate expense reader still uses an unscoped legacy key;
this callback change does not harden that reader.

Rejected or malformed responses hold expense redispatch while mounted, with a
generic check-before-repeat notice. Ordinary refresh/paging does not clear the
hold. True unmount/reload creates a new local scope: this is not durable operation
identity or reopen reconciliation. Sharing/discard/install and other writers are
not serialized by this expense-only mutex.

## Verification

Final focused integration passes **1,415/1,415 across 12 suites in 28.51s**, one
threaded worker, normal timeouts. This is 235 additional cases versus the prior
1,180 run. Panel coverage is 161, including all 124 prior cases unchanged plus
37 new expense cases. Root comparison confirms the prior 101,048-byte LF panel
test file is an exact prefix (SHA-256
`b96a504d682f7cf334abed380882c77fbed9d4bc2d84703123d6a96259e2c393`).

Root comparison also confirms all thirteen other exported server blocks remain
byte-identical to parent `20198972` after LF normalization. Independent review
confirms retained 262 handler assertions, all unrelated panel paths and mixed
sharing interlock are unchanged. Negative tests explicitly silence the new
neutral message channel; caller-loss parser traps execute. The new helper suite
joins the existing unconditional never-quarantined receipt CI step and its
literal offline guard. Offline guards pass 2/2 (89.99ms), format/diff checks pass;
agent lint has zero errors and eight retained warnings across existing files.
The first full TypeScript check found optional/unknown receipt-reader mock
parameters in two new test callbacks. Erased fixture casts corrected them without
changing runtime expressions or assertions; final full TypeScript passes.
Seven-file changed-line lint against `20198972` passes with zero new errors or
warnings and eight retained findings. Fresh complete `npm run build` passes at
`5bd1a715`, with retained route-test/module/chunk/Wrangler warnings. All 214 tracked
public Git/source/output copies verify; Worker `motorsales365/index.mjs` binds the
canonical 365 backend, with 15 same-origin OCR/202 PDF assets and no browser engine
in its server package. Only six owned documentation files remain dirty after
packaging. Publication/exact-head checks are recorded separately; no upload.
No quarantine, assertion, timeout or coverage reduction is included.

These use synthetic SDK responses and a real QueryClient. They do not establish
real API/Auth/private-storage, original-human/fresh native authority, financial
transactions, restore, owner or live acceptance.

Parent publication `20198972` now passes all six Actions gates. Its completed unit
job `116853501011` confirms Linux application 3,645/3,645 across 85 files (89.38s),
zero unexpected/quarantined failures; overall log truncated, final summaries and
checker present. This does not accept the new expense source. Its actual native
PG17.11/Parts247/quote-groups/cleanup and 47 retained replay failures are in
`RECEIPT_READ_CONTRACTS.md`; no completed selected proof is replayed as new scope.

## Remaining dependency

Receipt totals remain unscaled NUMERIC while expenses use NUMERIC(14,2); the
retained conflict branch returns an existing UUID without checking amount/shop/
vehicle. Exact decimal precision, persisted binding/conflict reconciliation,
atomic expected-shop authority and durable posting/retry/reopen recovery remain
required. Browser rounding or this generated acknowledgment is not a substitute.
The retained SQL and [PostgreSQL declared-scale behavior](https://www.postgresql.org/docs/17/datatype-numeric.html#DATATYPE-NUMERIC-DECIMAL)
support that risk; no new live financial transaction test was performed.

Next connected source actions are C1.05 discard and the remaining sharing/install
caller/acknowledgment/lifetime boundaries, preserving the existing editor and
unknown holds. Storage removal plus DB discard remains non-atomic and needs
durable recoverable coordination; operation reordering is not recovery proof.
Independent sharing, complete-line viewing and the shared R1–R4/retail/recruitment
gates remain open. Mapping stays 404/423 and selected native rehearsal retains
47 replay failures. No migration/grant/live Auth/business write, deployment,
provider activation, customer send, paid resource or Docker use is included.
