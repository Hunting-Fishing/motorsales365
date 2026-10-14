# Native incoming attachments: bounded source/catalog inventory

2026-10-15 Asia/Manila. Status: **dated metadata and retained-source comparison,
not a writer mitigation, full dependency baseline or live workflow proof**.
This document is the audit component of the chat-policy proof slice. No function, trigger,
policy, index, permission, migration, history or production record is changed.

This follows `NATIVE_STAFF_TRIGGER_COMPOSITION_PROOF.md` and its separate
staff/chat/offboarding rehearsal. It identifies incoming business/shop effects
that must not disappear behind a reduced fixture or be silently replayed while
testing chat membership policies.

## Saved observation and comparison method

`native-incoming-attachments-catalog-2026-10-15.json` records project
`wjxaajgvddtrxxtocxen`, observed at `2026-10-14 23:14:53.668961 UTC`. Whole-file
LF SHA-256:
`37dc6a12548b43b992c12c41c1b4a0f558ac02188870469fd8dc82c0b5dc4c30`
(21,280 UTF-8 bytes). Its sibling reviewed SELECT is
`native-incoming-attachments-catalog-review.sql`, LF SHA-256
`a5201e6c9376d2a2407b9afe08618d8a97a4534ea823c516b2d6948ebb779611`
(3,660 bytes). The metadata SELECT ran once in this heartbeat;
the source-mapping work reads the saved files only and makes no live call.

The SELECT targets six tables and their non-internal attachments, attached
function fingerprints/ACLs, and indexes. It reads no application records or
business counts and invokes no application function. The query itself does not
enforce a read-only transaction or operational timeouts. It excludes internal FK
triggers and does not collect FK constraints, policies, table/column/default
ACLs, role inheritance or all upstream callers. A zero non-internal-trigger list
does not mean a relation has no FK behavior or no incoming writers.

Whole-source and selected-section SHA-256 below use UTF-8 with
**CRLF-to-LF-only** normalization, without trimming. Complete function/CREATE
TRIGGER sections exclude adjacent blank lines and the final transport newline;
body hashes include the exact whitespace inside the dollar quotes. Selectors
must recognize the actual dollar tag: the latest signup-intent trigger uses
`$function$`, not `$$`. Each selected declaration was found uniquely within its
identified source. All eleven selected retained body LF MD5 values equal the
corresponding saved catalog values. This is a static byte comparison, not SQL
execution or live acceptance. The chat slice's `native-catalog-review.test.mjs`
additionally verifies all twelve whole-source, eleven function/body and eleven
attachment-section pins offline.

Full catalog definition/trigger/index MD5 values are retained by the JSON. This
slice does not recreate PostgreSQL's rendered definitions to verify those
full-definition hashes. MD5 is an identifier, not authenticity evidence. Body
agreement does not establish complete header/dependency/ACL parity, applied
history or business-data integrity. The preceding staff snapshot, this incoming
snapshot, and separate chat-policy observations have different times/scopes;
they are **not one shared atomic snapshot**.

## Actual selected attachment boundary

All six selected tables are postgres-owned, RLS-enabled and not FORCE RLS.
The saved lists contain ten non-internal business attachments and one native
shops attachment, all enabled `O`, with no WHEN expression, zero trigger
arguments and an empty update-column list except where specified below.

| Parent / attachment                                      | Observed operation                                           | Observed attached function                           |
| -------------------------------------------------------- | ------------------------------------------------------------ | ---------------------------------------------------- |
| public.businesses / business_team_thread_on_create       | AFTER INSERT                                                 | public.trg_business_created_team_thread()            |
| public.businesses / businesses_recompute_intent          | AFTER INSERT, DELETE, UPDATE OF owner_id                     | public.trg_businesses_recompute_intent()             |
| public.businesses / set_businesses_updated_at            | BEFORE UPDATE                                                | public.tg_set_updated_at()                           |
| public.businesses / trg_block_internal_staff_business    | BEFORE INSERT                                                | public.block_internal_staff_business()               |
| public.businesses / trg_enforce_business_custom_domain   | BEFORE INSERT, UPDATE OF custom_domain, custom_domain_status | public.enforce_business_custom_domain()              |
| public.businesses / trg_guard_business_owner_update      | BEFORE UPDATE                                                | public.guard_business_owner_update()                 |
| public.businesses / trg_notify_business_approved         | AFTER UPDATE OF status                                       | public.tg_notify_business_approved()                 |
| public.businesses / trg_notify_business_archive_change   | AFTER UPDATE OF status                                       | public.tg_notify_business_archive_change()           |
| public.businesses / trg_notify_business_submitted        | AFTER INSERT                                                 | public.tg_notify_business_submitted()                |
| public.businesses / trg_pp_business_signup_bounty        | AFTER INSERT                                                 | public.pp_business_signup_bounty()                   |
| shop_manager.shops / shops_create_employee_work_location | AFTER INSERT                                                 | shop_manager.create_default_employee_work_location() |

The four other selected relations have empty non-internal-trigger lists:
`shop_manager.cash_registers`, `employee_shifts`, `employee_work_locations` and
`register_sessions`. This is only their captured non-internal attachment state,
not full constraint or writer closure. Public function identities are printed
without a schema in the JSON; their retained declarations identify public.

### Function metadata and effective ACL exception

All eleven attached function records are postgres-owned PL/pgSQL, volatility
`v`. Nine are SECURITY DEFINER. `public.tg_set_updated_at()` and
`public.guard_business_owner_update()` are SECURITY INVOKER. Public functions
have saved `search_path=public`; the default-location function has
`search_path=shop_manager, public, pg_temp`.

Ten functions have ACL `{postgres=X/postgres,service_role=X/postgres}` and saved
effective anon/authenticated EXECUTE **false**, service EXECUTE **true**.
The exception is `shop_manager.create_default_employee_work_location()`:

- ACL `{=X/postgres,postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}`.
- Saved effective anon/authenticated/service EXECUTE are all **true**.
- Its retained return type is trigger. This ACL observation alone is not proof
  of ordinary RPC execution, an exploitable writer wrapper or successful direct
  invocation. No function was invoked here and no ACL restriction is applied.

Do not copy the preceding five-function staff-denial observation onto this new
identity. Conversely, direct EXECUTE denial on the other ten does not prevent
automatic trigger effects after an authorized business write.

## Retained whole-source pins

All source aliases below refer to `supabase/migrations/`. They identify retained
files, not an inferred applied sequence. Only the selected definitions below are
mapped; no whole source, seed, backfill, notification or commission code is run.

| Alias | Retained source                                         | Whole-file LF SHA-256                                              |
| ----- | ------------------------------------------------------- | ------------------------------------------------------------------ |
| B     | 20260512054457_90aac1ba-c3f0-48ff-a9b4-06739ddd2108.sql | `7ab71ad92eec0d9e9647fc8ffa46ef2b35c561c76b85d29ad41f9c32261fde8c` |
| T     | 20260627150439_5c3d6dc8-8f14-45b1-9eb3-dc261579364b.sql | `904dca2383a666cdae96b1723e744f257f63c723d4695040214af61c34d49b77` |
| A     | 20260601134129_39db4dbf-b53a-4491-8006-95ec1e6087a6.sql | `9ddc929ce2bba5096f4f33f1e81d2c2f2cfdfd6cef6cf2c084f13daf7faf1b5c` |
| E     | 20260601154523_81cd3c4e-befb-4b8d-ae67-da43ecbdeff1.sql | `06ebc9de1ef0e7f207a2e9b612c0ed76cd73b851842ae23901c541269047e825` |
| O     | 20260606123543_fb94412b-0d85-4071-bee5-42acbaf4cf90.sql | `8ccedc03f5546e104a8333a94c2b55d44ca8862f94b53210a2c11bf118ebeff4` |
| I0    | 20260706045048_1725132d-d311-46a4-8ce9-cffcca83cb5d.sql | `0078df2357ddae0393eda7cb23a4287db197cc5d9eb1fb3b28f2c830c50208e8` |
| I     | 20260706045715_97c676ff-485d-46a0-a0e6-cc08a8da583d.sql | `90863c60422c966f01821532924ea46025ce5eecf2e71aa67b548a4ba762f493` |
| S     | 20260707070949_d718892b-ccd8-45c4-a81b-058bb9b75211.sql | `9073196a2c1c29302ff19ed28a699dfbf836b4efd9391e7154405125ad6b45f8` |
| C     | 20260713071921_8c790938-2bb4-420b-b1df-3261d4bed855.sql | `2231cdf09ee79ed8a8e0d93ef55176c2e32f245494f55c93dba5e5cbe4a171d7` |
| D     | 20260715020533_cd0eef21-5341-4af3-abc2-71fc7c080432.sql | `efd81ca813023ffbabf6a833c635230258ee2f2e5d4d38a80a0993804ee07196` |
| P     | 20260728125715_52a60fda-14fe-4758-bf19-22284e3e7468.sql | `283c8f951a31de8c9d24c0c46ecf2a545b6a0510d2ab30e3de0130cad32c3856` |
| L     | 20260831124952_employee_operations_ledger.sql           | `2386ee30a1b12cd124445adf3da3568c35e567e96aa9f7b83e6cd4211ccae6b2` |

### Eleven exact selected function bodies

Line boundaries are inclusive and select complete CREATE OR REPLACE FUNCTION
declarations. The final column is the independently computed retained-body LF
MD5; **every value matches its saved catalog record**.

| Qualified function                                   | Source lines | Complete section LF SHA-256                                        | Matching body LF MD5               |
| ---------------------------------------------------- | ------------ | ------------------------------------------------------------------ | ---------------------------------- |
| public.block_internal_staff_business()               | S 152–161    | `417a8b1f4d12421e9e122d9273e34fb00c1af2d93a88a55881de0803695f8739` | `4013bf118428ed2335d0889a2ba185af` |
| public.enforce_business_custom_domain()              | D 22–41      | `a07be2a74cf7d464d22dd57f94e43c88c3595a5f68dcca184ee3358145ebfe7a` | `201a674653b4a01175449620008f8e77` |
| public.guard_business_owner_update()                 | O 80–99      | `e35a7d4aafc6c10b6fc56eee464b32bf208255fb5e785c1654d056438d06e0b0` | `8cb2be4c21b728a5a86e9b06fcf6e94b` |
| public.pp_business_signup_bounty()                   | P 87–103     | `c7e42a0d0c14150ae99959feb1c2bf533d9cf12ad5017209b5535356aea12a07` | `6ff565d45c820cd0b7134f5e2977cea1` |
| shop_manager.create_default_employee_work_location() | L 23–32      | `0ed1623e84dfc3ed09c8e0f7332009d76e701b6b6e5e63b8ba15bda0ae110e2b` | `cdb5e22b1fcca743c830a08e73b35916` |
| public.tg_notify_business_approved()                 | E 39–71      | `d7008764d24a58985a681925b06eae187784e4897747240c9cbd22277a9fed0f` | `fda41e1bcd640b80cce098c2ee02064f` |
| public.tg_notify_business_archive_change()           | A 1–38       | `147abd643040e795bfbd6271f995c64471f79d98a9f79a1946ae8f37d4165704` | `00dda14f4b2e8a8662ff9676b03da004` |
| public.tg_notify_business_submitted()                | E 4–31       | `b44fb202abb3978fc30a7fb23d82c0841548fe67bf63870dae1eb6019720cfe5` | `11b19dbfb5155289054dc6aa181ac502` |
| public.tg_set_updated_at()                           | T 29–38      | `a2d9ef678cd82404ea6df610770bce35bf585c4b17a50f2e7c5ff3f9cfd29497` | `301a884953d37769916294bb60562e05` |
| public.trg_business_created_team_thread()            | C 51–56      | `ebfa95f92341ad8bc77e6f5789f368e760193619df45327a9532c9a00a94257b` | `d13017c493f1ab0e1788022d6030130a` |
| public.trg_businesses_recompute_intent()             | I 92–131     | `f211ba369466a931de37fff382aa2bec63e8349b1ca4344c90172df984242e4c` | `46b92e78631dff66834b7e4035b4e251` |

Do not substitute the earlier I0 80–99 intent trigger body: its body LF MD5 is
`01f2ceb41f42ee379cfade5e0ab4a3c0`, not the observed value. Similarly, the older
compact tg_set_updated_at bodies have LF MD5
`e3addd320004eb7a8494e7a0c2614c97`; the T body above matches. This distinguishes
retained definitions by content, without inferring which historical deployment
installed them or claiming that filename ordering establishes applied lineage.

### Eleven retained attachment sections

These select CREATE TRIGGER only, not adjacent DROP statements. Source attachment
events/target columns correspond to the saved narrow metadata list; full rendered
trigger-definition MD5 parity is not executed or asserted in this slice.

| Attachment                          | Source lines | Complete CREATE section LF SHA-256                                 |
| ----------------------------------- | ------------ | ------------------------------------------------------------------ |
| set_businesses_updated_at           | B 114–115    | `d1d44d0599412d80ede3d5a381f85be2533deb3b6c0c39ae363c58e20bb962f2` |
| trg_notify_business_archive_change  | A 41–44      | `97eb329d5708aa5e899868309df4dbe062e1f95a82be1dfe11fde8fe9b74cd1d` |
| trg_notify_business_submitted       | E 34–36      | `a5b6370fcdb8d0cdc8509bbcdf63e067d09c77c1ad138992058c7d453c2d80d4` |
| trg_notify_business_approved        | E 74–76      | `148480c1cf7ec015633d5d900ae99e4c5c54b1b503cd667e6097e29dbb373592` |
| trg_guard_business_owner_update     | O 102–104    | `8a37e1cc38737adb9dedd6380ff24e848a8b0ff918ec291362bf034e5c394595` |
| businesses_recompute_intent         | I0 102–104   | `c94212741288cfb60859759c217bc9c45b0bad7b40ad0b78818c55af77c74b67` |
| trg_block_internal_staff_business   | S 163–165    | `76a6e1de2c98161e9edfe5c893e2a75ea723a612474756628d95d86162863466` |
| business_team_thread_on_create      | C 59–61      | `a8663351c82ce481b3588f6bed0cb2c6b609cad127c05b8bcb330bf286af26a3` |
| trg_enforce_business_custom_domain  | D 44–46      | `f9c45d5aa23a59677b668fcb61df5bd959eb6c336d38d97145fc4b8b05dced71` |
| trg_pp_business_signup_bounty       | P 106–108    | `b35ba3e10f8dc8a7d8e9334db6e6ed704a4f2add6286643e5dd1f7dc9d35ee4d` |
| shops_create_employee_work_location | L 34–36      | `747d04b587b6e7e8de8b2cbe16c13cf1385f23f447f68e4793d8ba94bb75582c` |

The retained source search additionally finds two business guard attachments that
are absent from this saved current non-internal list:

- `trg_guard_business_network_exposure`: source
  `20260927090000_parts_network_cross_org_rls_hardening.sql`, LF SHA-256
  `0bdeb54f03c6a329835819a012bd58ca75f0f3800b736f15548b9ebb44417e0d`;
  function 160–186, CREATE attachment 191–195.
- `trg_guard_business_custom_domain_verification`: source
  `20260927120000_parts_network_security_followups.sql`, LF SHA-256
  `074feb25f80e497033d09d9a51332905930913e5a89b511d27f122f27df1f2bc`;
  function 157–186, CREATE attachment 191–194.

The seed inventory classifies these files pending-forward. Their retained
definitions do not prove current attachment or authorize applying them. The
snapshot's absence is not a production incident, permission to deploy a guard,
or proof that the corresponding function identity is absent: this query selects
only functions attached to the selected tables.

## Index observations and exact-name correction

The saved incoming catalog includes valid/ready unique partial indexes:

- shops_one_per_business: business_id WHERE business_id IS NOT NULL;
- employee_shifts_one_open_per_user: user_id WHERE status is on_shift/on_break;
- register_one_open: register_id WHERE status=open.

Their rendered definitions are included in selected_definition. This confirms
the observed single-open-shift and per-register-open-session index structures at
that time, not multi-roster authority or business-data acceptance. Other captured
indexes mostly have only definition/predicate fingerprints, not rendered DDL.

In particular, **businesses_source_external_id_unique exists** in this snapshot,
with unique/valid/ready true, definition MD5
`cd1a82dfebaacfffc70a0686d9ceef2c` and predicate MD5
`90070b050eee3dab99fa734c93104427`. Its selected_definition is NULL. A retained
candidate is `20260523101642_b10e46d3-8424-4a6c-b124-908ca9b23ea6.sql`, whole LF
SHA-256 `aa8710fd31c1f30b3d13d5d90b0d0075e3baec9e2732fc87b620a6aa6ae689d1`:
CREATE section 8–10, LF SHA-256
`bba7b35f24be4b73e1837c596c43a8685aea282614387b188093bbe88822f5ac`,
declares unique `(source,source_external_id)` WHERE source_external_id IS NOT
NULL. This is a concrete retained candidate, not a newly verified match to the
catalog's rendered-definition hash or exact applied provenance.

The later DROP statements target the differently named
**businesses_source_external_id_key**, not \_unique:

- `20260606143827_5cbab52d-1b9d-4e45-b109-418dc8815f1c.sql` line 1;
  whole LF SHA-256
  `7a189453c7c8696654abb634ad91d853528ede8e1f66db13060d895adbf20679`.
- `20260616054838_f911f5dd-0431-4f0c-9a94-59bc9852eb4c.sql` line 1;
  whole LF SHA-256
  `075c9e0540c6b7434ced211bfd2b4b30278f50df64f468f641c178ae6c37a3d1`.

Therefore the observed \_unique is not contradicted by those DROP statements.
Do not call it an existence discrepancy or infer that both names refer to the
same index. No index drop, recreation, deduplication or history repair is proposed.

## Writer dependencies kept outside the minimal chat proof

The selected bodies reveal real additional dependencies, not complete closure:

- The submitted/approved/archive triggers read auth.users/public.profiles and
  call enqueue_email with transactional templates. They must not be loaded or
  invoked merely to test chat row policies.
- Signup bounty reads user_referrals and calls pp_award_bounty. Commission,
  payout, referral and commercial side effects are separate work.
- Signup-intent recomputation calls recompute_signup_intent and derive_signup_intent,
  updates profiles and attempts admin_audit_log insertion. The retained
  recompute function catches audit errors; this is not proof of complete or
  correctly attributed audit output.
- Internal-staff blocking depends on is_internal_365_staff; protected owner
  updates depend on auth.uid/can_moderate; custom-domain enforcement depends on
  normalize_business_domain. Their downstream policies/roles/wrappers need
  separate verification before a whole-business-write rehearsal.
- The business-created team path calls ensure_business_team_thread. Shops INSERT
  calls the default-location writer. These are the small known source extensions
  for a later incoming-path fixture, not a reason to load every business trigger
  or repeat the completed staff offboarding cases.

For the next **minimal chat-membership policy proof**, keep only the two actual
chat table declarations, selected business scope/index additions, two membership
helpers and six thread/member policies, with explicit synthetic auth/business
prerequisites. First compare them to the separate fresh chat catalog. Do not load
business-created team/default-location attachments, staff provisioning, email,
notifications, commission, signup-intent, message delivery or storage paths into
that policy fixture. It must not claim full live parity because those incoming
dependencies are deliberately excluded. SELECT and UPDATE compose: a self UPDATE
predicate alone does not prove left-member self-reactivation or cross-thread
movement; stored mutation, affected rows and RETURNING visibility need distinct
assertions.

## Exact remaining dependency and release limits

No selected incoming function-body mismatch remains after choosing the actual
matching retained definitions and respecting the tagged intent body. The next
actionable dependency is the bounded unchanged-source chat policy/helper proof
against its separate fresh metadata, followed by review of its real outcomes
before extending authority contracts. Preserve the incoming functions' narrow
ACL exception and the source/current attachment distinction in future inventory
records; do not promote mandatory whole-table or writer-security facets.

Full incoming/outgoing FK graphs, complete function dependencies, original-actor
authority, all table/column/default ACLs, role inheritance, dynamic wrappers,
business ownership/provisioning paths, notification/storage delivery, concurrency,
audit completeness, business-data invariants and recovery remain unverified.
Current metadata and body correspondence do not approve a baseline, replay,
forward migration, production guard, data repair or deployment. The enclosing
chat-policy slice records its disposable tests and publication separately in
`NATIVE_CHAT_MEMBERSHIP_POLICY_PROOF.md`; no production state changes.
