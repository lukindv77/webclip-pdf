# P0-072 — research acceptance matrix — 2026-09-04

Date: 2026-09-04  
Canonical source baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Working branch entering this matrix: `research/p0-072-recovery-quarantine-2026-09-04 @ fcce956879cb481bc639586fbef5deb1608b8ce1`  
Owner: **P0-072 ACTIVE**.

This matrix distinguishes **research-contract coverage** from **runtime implementation status**. A covered row does not mean production PASS.

Legend:

- `COVERED` — architecture/race contract is durably modeled/evidenced;
- `RED` — source-bound gate is intentionally failing/current runtime still has old behavior;
- `LATER` — belongs to a later P0-072 implementation tranche;
- `DEPENDENCY` — another ACTIVE owner must remain explicit and is not closed here.

## A. Destructive reset / pending-store authority

| Acceptance | Research | Runtime | Primary evidence |
|---|---|---|---|
| clear-all does not delete pendingAppends/downloads/remote authority | COVERED | RED | recovery quarantine + checkpoint source gate |
| scoped clear uses `match/nonmatch/indeterminate`, with ambiguous pending rows detached/manual | COVERED | RED | atomic reset execution |
| import-replace quarantines old recovery authority in same transaction as replacement | COVERED | RED | atomic reset execution |
| transaction abort restores Journal + dispositions + fences + staging state | COVERED | RED | atomic reset execution |
| no Chrome API/WebCrypto await inside authoritative IDB transaction | COVERED | RED | atomic reset execution |
| second reset preserves first reset identity | COVERED | RED | external-stage / reset models |

## B. Legacy Chrome Storage migration source

| Acceptance | Research | Runtime | Primary evidence |
|---|---|---|---|
| destructive path uses bounded read-only legacy snapshot, not ordinary mutating pre-migrate | COVERED | RED | destructive legacy snapshot |
| hidden matching/indeterminate legacy rows materialize detached inside reset transaction | COVERED | RED | atomic reset execution |
| definite scoped nonmatch remains outside reset | COVERED | RED | destructive legacy snapshot |
| stable legacy identity exists before random/time defaults | COVERED | RED | legacy source identity |
| bounded deterministic source projection is shared by reset and migration | COVERED | RED | legacy source projection |
| source-sized hash work occurs before authoritative transaction | COVERED | RED | legacy prehash/token split |
| final fence token is installation-local salted/domain-separated | COVERED | RED | local token salt domain |
| fence is anti-rematerialization barrier after reset | COVERED | RED | legacy migration reset fence |
| migration-first and reset-first orderings converge | COVERED | RED | destructive legacy snapshot + ordering model |
| same pending id/different source token becomes manual conflict | COVERED | RED | legacy source identity |
| fences are lifetime-bounded by finite historical source | COVERED | RED | legacy fence lifetime bound |

## C. Installation-local token/salt lifecycle

| Acceptance | Research | Runtime | Primary evidence |
|---|---|---|---|
| one `journalLocalTokenSalt:v1` with domain separation | COVERED | RED | local token salt domain |
| salt uses `crypto.getRandomValues()` only | COVERED | RED | scope-token primitives / local token salt domain |
| missing salt with dependent state never silently regenerates | COVERED | RED | scope token lifecycle |
| salt bootstrap/token derivation happens inside authoritative transaction | COVERED | RED | local salt authoritative transaction |
| full reset can detach visible receipt namespace without scope-token matching | COVERED | RED | scope token lifecycle |
| scoped reset with unavailable token context fails closed | COVERED | RED | scope token lifecycle |
| salt/fence data are not exported/logged as user data | COVERED | RED | local token salt domain |

## D. Journal append suppression / inline cleanup

| Acceptance | Research | Runtime | Primary evidence |
|---|---|---|---|
| checkpoint authority is `missing/active/reset-detached` | COVERED | RED | append outcome inline-delete |
| outcomes distinguish `appended/existing/suppressed-missing/suppressed-reset-detached` | COVERED | RED | append outcome inline-delete |
| missing does not fabricate reset cancellation | COVERED | RED | append outcome inline-delete |
| inline `pendingStore.delete(id)` cannot delete detached/other-operation evidence | COVERED | RED | append outcome inline-delete + source gate |
| same-id replacement Journal row cannot override reset-detached suppression | COVERED | RED | P0-076 boundary + append model |
| dormant `safeAppendJournalEntry()` is hardened or retired | COVERED | RED | append outcome inline-delete |

## E. Local automatic-download pending state

| Acceptance | Research | Runtime | Primary evidence |
|---|---|---|---|
| new rows use explicit `downloadStart` stage | COVERED | RED | external stage admission |
| only fresh `prepared -> admitted` permits one Chrome start | COVERED | RED | mutation boundary placement |
| reset-before-admission prevents Chrome start | COVERED | RED | external stage admission |
| already-admitted never authorizes duplicate start | COVERED | RED | mutation boundary placement |
| legacy intent without stage remains admission-unknown | COVERED | RED | rollout compatibility |
| caller timeout is not actual Promise settlement | COVERED | RED | local detached settlement |
| actual start rejection / invalid id / complete / interrupted stay distinct | COVERED | RED | local detached settlement |
| detached admitted/legacy intent may late-bind exact numeric DownloadItem | COVERED | RED | local bind reset authority |
| cancelled-before-start/prepared/not-applicable cannot late-bind numeric id | COVERED | RED | local bind reset authority |
| same-operation numeric survivor inherits reset barrier before intent delete | COVERED | RED | local bind reset authority |
| conflicting reset identities do not collapse | COVERED | RED | local bind reset authority |
| complete/interrupted after reset update detached factual outcome, not Journal | COVERED | RED | local detached settlement |
| P0-039 accepted independent active/unknown capacity is not regressed | COVERED | RED | rollout liability reservation |
| new explicit-stage operations reserve future unknown liability | COVERED | RED | rollout liability reservation |
| full restart-safe exact actual settlement | DEPENDENCY | — | P1-146 ACTIVE |

## F. Remote save pending state

| Acceptance | Research | Runtime | Primary evidence |
|---|---|---|---|
| new remote rows use explicit upload/publish stages | COVERED | RED | external stage admission |
| upload CAS sits immediately before signed PUT | COVERED | RED | mutation boundary placement |
| publish CAS sits at actual `/resources/publish` PUT, after read-only check | COVERED | RED | mutation boundary placement |
| already-admitted recovery is factual/read-only, not mutation replay | COVERED | RED | mutation boundary placement |
| legacy prepared row without stage is admission-unknown | COVERED | RED | rollout compatibility |
| checkpoint writer cannot downgrade admitted stage to prepared | COVERED | RED | remote checkpoint writer monotonicity |
| stale-unverified row is not reactivated by whole-record checkpoint writer | COVERED | RED | remote checkpoint writer monotonicity |
| detached current row wins over caller-built item | COVERED | RED | remote checkpoint writer monotonicity |
| different-operation same-key checkpoint fails closed | COVERED | RED | remote checkpoint writer monotonicity |
| same-id Journal precheck cannot key-delete old detached receipt | COVERED | RED | remote existing-precheck race |
| generic stale cleanup has no readonly-snapshot -> later key-delete race | COVERED | RED | remote stale cleanup atomic |
| generic stale cleanup never deletes reset-detached rows | COVERED | RED | remote stale cleanup atomic |
| detached factual verified outcome never regains Journal authority | COVERED | RED | pending writer/reset evidence |
| exact account/root/object continuity | DEPENDENCY | — | P0-073/P0-074/P1-090 ACTIVE |
| publication policy generation/revocation | DEPENDENCY | — | P0-078/P0-069 ACTIVE |

## G. Namespaced external-effect receipts / ReadLater

| Acceptance | Research | Runtime | Primary evidence |
|---|---|---|---|
| trusted physical authority is worker-issued and non-importable | COVERED | LATER | scope correction / operation receipt family |
| imported `readMove*` cannot create physical authority | COVERED | LATER | external-effect scope model |
| receipt is prepared durably before move admission | COVERED | LATER | meta receipt linearization |
| only fresh prepared→admitted transition permits one move request | COVERED | LATER | mutation boundary placement |
| reset detaches receipt in same generation boundary | COVERED | LATER | meta receipt linearization |
| admitted receipt after reset settles factually only | COVERED | LATER | external-effect models |
| meta namespace scan/cap is bounded | COVERED | LATER | persisted schema/capacity evidence |
| Trash pre-move receipt exists | DEPENDENCY | — | P1-183 ACTIVE |

## H. Capacity / cleanup / failure semantics

| Acceptance | Research | Runtime | Primary evidence |
|---|---|---|---|
| unresolved truth is never deleted just to free capacity | COVERED | RED/LATER | receipt capacity cleanup |
| quota/write failure aborts reset rather than losing authority | COVERED | RED | receipt capacity cleanup + atomic reset |
| terminal cleanup is separate from unresolved/manual retention | COVERED | RED/LATER | receipt capacity cleanup |
| generic age does not manufacture terminality | COVERED | RED | receipt capacity cleanup |
| global storage byte reservation remains unclaimed | DEPENDENCY | — | P1-043 ACTIVE |
| recovery fairness remains unclaimed | DEPENDENCY | — | P1-064/P1-208 ACTIVE |

## I. Required source-bound RED→GREEN gates

Current first-runtime implementation must make these committed-source tests GREEN:

- `project_tools/test_p0_072_first_runtime_source_contract.js`;
- `project_tools/test_p0_072_checkpoint_quarantine.js`;
- `project_tools/test_p0_072_destructive_legacy_source_contract.js`;
- `project_tools/test_p0_072_append_source_contract.js`;
- `project_tools/test_p0_072_remote_existing_precheck_source_contract.js`;
- `project_tools/test_p0_072_remaining_callsite_source_contract.js`.

Additional deterministic models are architecture/state-machine evidence and must continue to pass after implementation.

## J. Research completeness conclusion

For the **first pending/legacy/local/remote P0-072 runtime tranche**, no unresolved architecture-wide question is currently known in the audited current-source writer/delete/materialization set.

Remaining work is implementation and committed-source verification, plus the deliberately later namespaced ReadLater receipt tranche.

This statement is not P0-072 closure. Any new source path found during implementation reopens the matrix row rather than being ignored.

## K. Exact next boundary

Production implementation should begin only with the addendum-defined **Commit A: pure constants/helpers/classifiers**, with no external mutation or destructive call-site behavior change in that commit. Commit B then owns pending/legacy reset and writer/delete fencing. Commit C owns existing local/remote stage admission call-sites. ReadLater receipt integration remains later.

P0-072 remains **ACTIVE**. Manifest remains `0.9.8`; release remains `NOT READY`; no Actions/build/tag/Release is claimed by this matrix.
