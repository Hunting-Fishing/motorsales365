# Shop Manager job-line field accessibility

17 October 2026, Asia/Manila. Independent C3/U6 source slice in the existing
integrated candidate/draft PR68. This does not reopen the stopped Auth source,
QA login or hosting actions, or activate a financial writer.

## Observed defect and bounded correction

The existing work-order detail `AddJobLineDialog` renders six visible labels as
siblings of native inputs/textarea, with no `htmlFor`/`id` association. In
particular, Category has no other accessible name. The installed UI Label
forwards a native label and Input forwards native attributes; sibling text does
not create an implicit label. Existing tests locate Job name by placeholder and
do not detect the Category defect.

The bounded correction uses one stable React `useId` prefix inside that dialog
and explicit, distinct label/control IDs for Job name, Category, Est. hours,
Labor rate, read-only Total and Description. No field value, numeric step,
calculation, payload, mutation handler, readiness/permission guard, account or
work-order lifetime, query/cache policy or other dialog is intended to change.

Actual-route DOM regressions must verify accessible names/roles, the native
label/control association, unique stable IDs while editing, unchanged numeric
steps and read-only Total, and no write when opening/editing/cancelling. Retain
all existing account-switch, late response, source-error and posting-interlock
tests. Root final focused gate passes154/154 across quote list/work-order list/
work-order detail in41.68s, including the two new tests and16 detail tests total.
No failure/skip/cancel. Changed-file ESLint0 errors/15 unchanged legacy warnings;
independent review clear. Normal full TypeScript (`npm run typecheck`) and
nine-file Prettier/diff pass; source/test formatting unchanged. Existing mandatory
CI three-suite step already includes the modified detail test, with no workflow
edit/timeout/quarantine/native coverage change. Same draft PR68, commit subject
`Associate native job-line fields with accessible labels`; exact source/publication
will be in its evidence comment. New-head required CI is separate.

Frozen route SHA256-LF:
`2f17f0f72c27c95f7efd91784312a2ad24c438a04b89a3491c5adf25ef967eb8`.
Frozen test SHA256-LF:
`5924f81a78c8cffc848ae68ecba13cf6e41e474d283d2ea509c00f9333bc4aa6`.
Root verifies old41332-byte route hashf21b048c… and current41860-byte route;
editor's reverse-only normalization reproduces the entire old route. Independent
diff review confirms only the import/prefix/associations/JSX expansion changed.
Root also verifies the entire old19157-byte test prefix8bd58229… remains exactly
unchanged before the two appended regressions. No generated source/dependency
or CI timeout/quarantine/required coverage changed.

## Closed parent verification, separate acceptance

Exact parent0ee7a2261728cdce88164e870c80937786eeb0f6 now passes all six required
Actions38963656014. Actual unit117184665375 reports5,032 tests/96 files102.10s,
zero unexpected/quarantined failures (returned log truncated, final summaries
present). The native/build/current artifact evidence is retained in
[the provider prerequisite](AUTH_PROVIDER_VERSION_PREREQUISITE.md), not rerun or
inherited by a future source head. Current source adds no Auth/SQL/Storage test.

The [React primary guidance](https://react.dev/reference/react/useId#generating-ids-for-several-related-elements)
supports one top-level shared ID prefix for related label/control pairs. This
does not establish SSR/hydration acceptance of the route. Sites local-only
accessibility guidance informs the correction; no Sites
registration/publication or preview infrastructure is created. Supabase/Postgres
guidance preserves the authority boundary; the fresh changelog was read after
the web reader rejected Markdown and one native HTTP alternative succeeded.
Relevant TLS/PG17.11 notes were reviewed, with no upgrade or production scan.
OpenAI Docs guidance keeps the existing follow-up durable and updated in place.

Migration/permissions/deployment impact: none. No Docker, dependency update,
new hosted resources, live form interaction, customer communication, Buddy/366
change, main promotion or production deployment. Component DOM tests with
synthetic SDK responses are not real Auth/native authority, screen-reader or
Chrome/Edge/Android/iPhone/iPad/device-camera/layout acceptance. CRM's atomic
financial/stock loop and full recovery remain open. All18 workflows+N1–N3,
47 replay failures/12 historical/five unapplied/two recorded classifications,
owner/release gates and the at-risk22 October target remain.

Next: same-PR publication and new-head required CI, then remaining independent
UI/CRM/device acceptance under the board. Independently, immutable Auth source
inventory/rehearsal waits for the existing unanswered owner handoff. Do not
repeat its web listing/API alternative, QA route attempts or hosting diagnostics.
