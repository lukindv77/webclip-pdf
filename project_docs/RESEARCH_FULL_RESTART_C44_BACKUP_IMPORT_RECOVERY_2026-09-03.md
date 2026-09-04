# WebClip — fresh full-project research — C44 Backup / import / recovery — 2026-09-03

Date: 2026-09-04  
Canonical source baseline: `e4d7f02eac9f2c2879b6947e8ef06fb86546f432`  
Exact `service-worker.js` blob: `6d61ac81befdbf2804ae9dbec425aa08d1194eb1`  
Exact `journal.js` blob: `1138e4fbf177e31008f510bc1addfd539885f10e`  
Exact `journal-import-digest.js` blob: `7b943119c712cc663ef766bd5a87cc75c70d346d`  
Scope: fresh-restart coordinate **C44 — Backup / import / recovery**.

## Result

**C44: `L4-REVALIDATED / PARTIAL/FINDING + POSITIVE/REAL-UNPACKED/PREVIEW-RECEIPT/SHA-256-BINDING/STAGING-GENERATION/REVISION-CAS/RENEWABLE-LEASE/EXPLICIT-RESTART-RESUME-CANCEL/FAIL-CLOSED/CLEAN-IMPORT/FULL-BROWSER-RESTART CONTROLS + RECOVERY-CHECKPOINT-CLEAR FINDING; CHECKPOINT/MERGE/NATIVE-SAVE-AS/REMOTE-L5 OPEN (P0-013, P0-072, P1-207; P1-194 supporting; P1-215/P0-077 DONE)`.**

The post-remediation tranche completes the first bounded local C44 repair without crossing into remote or user-owned native UI:

1. the real journal export button invokes the production worker prepare/serialization path and produces a versioned `webclip-journal` v1 Blob;
2. the OS-owned `saveAs:true` adapter alone is substituted in the disposable extension copy, so no native dialog or user filesystem is automated;
3. preview now issues a strict `replace` receipt bound to staging key/generation, source, operation id, SHA-256, count, export time and expected Journal revision, and the UI shows that digest;
4. commit re-reads and normalizes the bytes, validates the receipt, and compares Journal revision inside the same IndexedDB transaction before destructive replacement begins;
5. a same-key/same-generation/same-size valid-byte retarget is rejected specifically on `contentSha256`, preserving Journal and all pending rows;
6. a separate concurrent Journal generation is rejected by expected-revision CAS, again preserving Journal and pending rows;
7. an unchanged backup with a fresh receipt still imports successfully;
8. a durable renewable lease now survives restart as an explicit checkpoint: no destructive auto-resume occurs; expired ownership can be explicitly resumed with token/owner rotation, full byte/revision revalidation and a second confirmation, or explicitly canceled without changing Journal/pending state.

No new P-code is needed. The local digest/revision subcases of **P0-013/P1-207** remain positive controls while their wider remote authority stays ACTIVE. **P1-215 is DONE**: the renewable lease/restart owner is implemented and physically accepted. **P0-072** remains the next local C44 task; **P1-194** remains supporting. **P0-077 DONE** remains positive and is not reopened.

Runtime and deterministic tests change in this tranche. Registry status and manifest `0.9.8` remain unchanged. Release remains **NOT READY**.

## Security and authorization boundary

This is defensive security / protective architecture analysis only. The physical matrix uses synthetic journal rows and generated backup files inside a disposable local Chrome profile. It does not use third-party data, credentials, Yandex APIs, privilege escalation, permission bypass, exploit construction or attacker-reachability claims.

The staging retarget schedule is a causal integrity control: it asks whether the production commit proves that the bytes being committed are the bytes the confirmation described. It does not assert that an external adversary can perform that state change.

## Accepted execution

### Post-remediation restart ownership and lease

- Chrome `152.0.7977.54`;
- workflow run `33825545613`;
- job `100877305863`;
- exact accepted workflow head `77cbd3bcc325dd57542993f94b85f7a08c8245da`;
- conclusion **SUCCESS**;
- result SHA-256 `59214943fa5d77e8147d527fff53fb88ccb1d4a51b972f03cabf9d9fd7e07e86`;
- artifact `c44-import-restart-lease-receipt`, id `9919809184`;
- artifact archive SHA-256 `d0c0018e11b303f924e757e621de7d3c89fc281e28bc4d84f6f3c33c7e847789`;
- deterministic regression `project_tools/test_c44_import_restart_lease.js`;
- durable physical harness `project_tools/research_c44_full_ui_browser_restart.mjs`.

### Previous post-remediation preview receipt and revision CAS

- Chrome `152.0.7977.54`;
- workflow run `33790752301`;
- job `100766491470`;
- exact accepted workflow head `3cbf4a2efe22034fdf4a8b61541f5b167a9df476`;
- conclusion **SUCCESS**;
- result SHA-256 `4a90e0177463db855092c48ec7ee8610b19af498d9e9405f93cc9f7bc8529996`;
- artifact `c44-preview-receipt-cas-receipt`, id `9907225369`;
- artifact archive SHA-256 `df1fced2bc77fca68ec58d45fce34a46e14b2d49bbd4fa41b0f84e3678e21297`;
- durable deterministic regression `project_tools/test_c44_import_preview_receipt.js`;
- durable physical harness `project_tools/research_c44_full_ui_browser_restart.mjs`.

### Historical real UI and full browser restart

- Chrome `152.0.7977.54`;
- workflow run `33787642007`;
- job `100756187928`;
- exact accepted workflow head `917143718e565b2845f30dbdc5da43706100532c`;
- conclusion **SUCCESS**;
- result SHA-256 `9011a72b205b6304826e021fc509d650cd6cb92b041d056507aa31a6385f8e18`;
- artifact `c44-full-ui-restart-receipt`, id `9906045429`;
- artifact archive SHA-256 `5df7c49d8f15ea087e763dfa21c9da73d599da4ebba853da0603b0edfaf882d3`;
- durable harness `project_tools/research_c44_full_ui_browser_restart.mjs`.

### Earlier physical IDB and causal controls

- Chrome `151.0.7922.173`;
- workflow run `33723881258`;
- job `100548527410`;
- exact accepted workflow head `4d64d216f281d3ac443632eae737af076020752e`;
- conclusion **SUCCESS**;
- result SHA-256 `56f54b8e797f88361c9ba18c6359609a8a9401d53074afe35c7b8111095ca045`;
- durable harness `project_tools/research_c44_backup_import_recovery.py`.

The earlier tranches supplied the discovery schedule plus deterministic lease-aware cleanup and expected-revision causal controls. The post-remediation tranche executes the new digest and revision controls through the actual production UI/worker path.

## Current exact-source contract

Fresh source inspection confirms:

- the UI stages the selected file in `WebClipOffscreenTransfers` as manifest + Blob chunks;
- worker preview computes incremental SHA-256 over the exact bytes consumed by the parser and records the observed staging generation;
- the worker-issued receipt has an exact field contract for version, `replace` mode, staging key/generation, source, operation id, digest, count, export time and expected Journal revision;
- confirmation discloses filename, entry count, export time and exact SHA-256;
- confirmed replace echoes the receipt, re-reads/normalizes bytes under the same staging key and compares digest/generation/count/export time;
- destructive commit prechecks revision and repeats the authoritative revision compare inside the same IndexedDB transaction before invoking replacement;
- import preview/replace/discard plus pending/renew/resume/cancel runtime messages are accepted only from the extension's `journal.html` page;
- preview persists one exact `journalImportLease` v1 checkpoint with receipt, rotating token/page owner, renewable two-minute expiry and staging-generation-derived two-hour hard expiry;
- restart never resumes destructively on its own; only an expired short lease can be resumed/canceled, and resume re-hashes bytes, captures a fresh revision and requires a second confirmation;
- generic TTL cleanup protects hard-live exact staging and fails closed for Journal-import rows on corrupt checkpoint metadata;
- destructive commit verifies exact lease authority before revision CAS and before replacement in the same IndexedDB transaction; raw staging is removed only after successful commit;
- destructive commit still clears `pendingAppends`, `pendingDownloads` and `pendingRemoteSaves`;
- no explicit `WEBCLIP_JOURNAL_IMPORT_MERGE` or equivalent merge path exists;
- canonical `prepared-save-as.js` still delegates to `chrome.downloads.download(... saveAs: true)`.

## Physical matrix

| Schedule / control | Accepted result |
|---|---|
| Seed one synthetic Journal entry; click real export button | Production worker creates a valid schema-v1 Blob containing the exact entry. |
| Native Save As boundary | Substituted only inside disposable copy; canonical source inspected as real `saveAs:true`; native L5 not claimed. |
| Select exported backup A through real file input | Production transfer staging has two rows; confirmation shows A filename, count 1, exact export time and exact SHA-256. |
| Preserve staging key, manifest, generation and byte length; replace only valid synthetic bytes A with B; confirm | Commit rejects on `contentSha256`; neither B nor any destructive Journal/pending-store mutation is admitted. |
| Preview unchanged A; then add a concurrent Journal entry and rows to every pending store; confirm | Commit rejects on stale expected revision; old and concurrent entries plus every pending row remain. |
| Fresh preview of unchanged A; confirm without concurrent change | Import succeeds, proving the new fail-closed guards do not block the valid replace path. |
| Select A, reach confirmation, close full browser process, relaunch same profile | Transfer staging remains 2 rows and Journal/pending state remains; no destructive confirmation resumes while the former lease is current. |
| Expire the short lease; choose explicit resume | Token and owner rotate; staged bytes are re-hashed, fresh revision is captured, and a second destructive confirmation is shown. |
| Attempt commit with the previous token while the new confirmation is open | Fails closed; Journal/pending state and both raw staging rows remain unchanged. |
| Confirm with the current owner/token | Exactly one replacement succeeds; checkpoint and consumed staging are removed. |
| Separate restart; expire lease; choose explicit cancel | Journal and all pending rows remain; only checkpoint plus raw staging are removed. |
| Earlier fixed-TTL versus lease-aware control | Current age-only model deletes old staging; bounded live lease retains it. |
| Production expected-revision CAS control | Stale commit is rejected inside the destructive transaction and preserves Journal + pending stores. |

## Owner reconciliation

### P0-013 — selected backup authority

The local production path now authorizes one strict receipt and rejects a same-key/same-generation/same-size byte change on SHA-256 mismatch. Restart ownership is separately closed by P1-215. P0-013 remains ACTIVE for wider selected-object authority, especially remote object/account/root identity; the local file-byte subcase is a positive control.

### P1-207 — source revision truth

The production commit now compares the previewed Journal revision inside the same IndexedDB transaction before replacement. The real UI stale schedule rejects and preserves the concurrent entry plus pending rows. P1-207 remains ACTIVE for the wider backup-source/remote revision surface; the local Journal-CAS subcase is a positive control.

### P0-072 — admitted side effects

Pending append/download/remote-save rows are reconciliation checkpoints, not cancellable work handles. Production replace erases them. The architecture must reconcile, migrate or explicitly quarantine those receipts under recovery authority; deletion cannot stand in for cancellation of browser/remote effects.

### P1-215 DONE / P1-194 supporting — staging lifetime and restart

The exact owner is closed: durable checkpoint, short renewable owner lease, hard generation lifetime, fail-closed cleanup, explicit expired-lease resume/cancel, token/owner rotation, byte/revision revalidation, second confirmation and same-transaction commit authority all have deterministic and physical Chrome evidence. P1-194 remains supporting because the wider browser-storage durability class is independent.

### P0-077 — positive versioned envelope

The production-generated schema-v1 backup successfully passes back through the actual local import UI. This strengthens the positive same-version envelope evidence without reopening the DONE owner.

## B1–B9 mapping

| Boundary | Fresh C44 result |
|---|---|
| B1 User Intent | Visible confirmation now includes the SHA-256 of A; same-generation bytes B are rejected. |
| B2 Admission / exact generation | Strict preview receipt plus in-transaction expected-revision CAS guard destructive replacement. |
| B3 Capture | Production export serializes the expected synthetic Journal entry in a versioned envelope. |
| B4 Static Materialization | Not primary for C44. |
| B5 Renderer | Real extension page/UI executed; no content-render claim. |
| B6 Physical Artifact | Production Blob and real file-input roundtrip pass; OS-native Save As remains open. |
| B7 Persistence / Transfer | Exact staging and its checkpoint survive restart; live ownership is renewable, hard-bounded and explicitly resumed/canceled after short-lease expiry. |
| B8 Journal / Provenance | Stale commit is rejected and preserves newer Journal/pending state; successful replace still clears pending reconciliation stores, so P0-072 remains. |
| B9 Later Reading / Recovery | Two full restarts prove explicit resume and explicit cancel without automatic destructive action; remote recovery remains untested. |

## Architecture direction

The completed first repair now issues and atomically checks:

- selected backup identity and cryptographic content digest;
- transfer staging generation;
- expected Journal revision;
- explicit `replace` mode.

Commit now stops on lease, receipt or revision mismatch without clearing Journal or recovery checkpoints, and restart ownership has explicit bounded resume/cancel semantics. The next local repair is P0-072: already-admitted local/remote recovery checkpoints still need reconciliation, migration or explicit quarantine separate from Journal replacement.

Merge must not be inferred. Either the product declares it unsupported and the matrix records that decision, or it gets separate conflict, duplicate and provenance semantics.

## Remaining C44 exit evidence

C44 remains **OPEN**:

1. preserve/reconcile, migrate or explicitly quarantine admitted side-effect checkpoints during replace (P0-072);
2. record unsupported merge as a product decision or test an explicit merge implementation;
3. exercise native Save As success/cancel/unresolved state only in a user-owned interactive context;
4. exercise remote backup only in an explicitly authorized isolated Yandex test context.

The digest/staging/revision/mode and lease/restart-ownership repairs are complete at L4. The remaining local work is checkpoint reconciliation plus the merge product decision; native and remote boundaries remain explicit L5 work.
