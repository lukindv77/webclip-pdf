# WebClip — fresh full-project research — C44 Backup / import / recovery — 2026-09-03

Date: 2026-09-03  
Canonical source baseline: `4f23eb5b1c063b25f650a24969bafec1cca18c17`  
Exact `service-worker.js` blob: `cffe46adbd0227bae51c95462d6d705b264838fe`  
Exact `journal.js` blob: `05cb89db3c322d547faf17b2359e92161d0bcbe7`  
Scope: fresh-restart coordinate **C44 — Backup / import / recovery**.

## Result

**C44: `L4-REVALIDATED / PARTIAL/FINDING + POSITIVE/REAL-UNPACKED/PRODUCTION-EXPORT-BLOB/ACTUAL-UI-IMPORT/FULL-BROWSER-RESTART/TRANSFER-PERSISTENCE/FRESH-RETRY/LEASE/CAS CONTROLS + PREVIEW-TO-COMMIT-RETARGET/STALE-REVISION/RECOVERY-CLEAR/RESTART-RESUME-LOSS/ORPHAN-STAGING FINDINGS; NATIVE-SAVE-AS/MERGE/REMOTE-L5 OPEN (P0-013, P0-072, P1-207, P1-215; P1-194 supporting; P0-077 positive)`.**

The new tranche closes the previously open local real-UI and full-browser-restart coverage boundary without crossing into remote or user-owned native UI:

1. the real journal export button invokes the production worker prepare/serialization path and produces a versioned `webclip-journal` v1 Blob;
2. the OS-owned `saveAs:true` adapter alone is substituted in the disposable extension copy, so no native dialog or user filesystem is automated;
3. the real file input, production transfer staging, preview confirmation and production replace commit complete a local export-Blob → selected-file → import roundtrip;
4. preview and commit are not bound by an immutable backup digest/receipt: a controlled change from synthetic valid backup A to valid backup B under the same staging key is accepted after confirmation for A;
5. a concurrent Journal generation admitted after preview is erased because commit has no expected-revision CAS;
6. production replace clears all three durable pending side-effect stores;
7. transfer staging survives a full browser-process restart, while the live confirmation/File/operation owner does not resume;
8. a fresh retry succeeds but leaves the abandoned pre-restart transfer generation orphaned.

No new P-code is needed. The actual production-path findings refine **P0-013**, **P1-207**, **P0-072** and **P1-215**. The earlier physical TTL/lease control remains direct evidence for **P1-194/P1-215**. **P0-077 DONE** remains a positive envelope control and is not reopened.

Runtime, Registry wording/status, manifest `0.9.8` and release readiness are unchanged. Release remains **NOT READY**.

## Security and authorization boundary

This is defensive security / protective architecture analysis only. The physical matrix uses synthetic journal rows and generated backup files inside a disposable local Chrome profile. It does not use third-party data, credentials, Yandex APIs, privilege escalation, permission bypass, exploit construction or attacker-reachability claims.

The staging retarget schedule is a causal integrity control: it asks whether the production commit proves that the bytes being committed are the bytes the confirmation described. It does not assert that an external adversary can perform that state change.

## Accepted execution

### Real UI and full browser restart

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

The earlier tranche supplies deterministic lease-aware cleanup and expected-Journal-revision CAS causal controls. The new tranche supplies the actual production UI/worker schedule and full process restart that were previously open.

## Current exact-source contract

Fresh source inspection confirms:

- the UI stages the selected file in `WebClipOffscreenTransfers` as manifest + Blob chunks;
- preview calls `WEBCLIP_JOURNAL_IMPORT_PREVIEW_STAGED` with `stagingKey`;
- confirmation discloses filename, entry count and export time but no immutable content digest;
- confirmed replace calls `WEBCLIP_JOURNAL_IMPORT_REPLACE_STAGED` with the same `stagingKey`;
- worker preview inspects the transfer bytes;
- worker replace later re-reads/normalizes bytes under that key;
- neither step compares a digest-bound preview receipt;
- destructive commit has no expected Journal revision compare;
- destructive commit clears `pendingAppends`, `pendingDownloads` and `pendingRemoteSaves`;
- no explicit `WEBCLIP_JOURNAL_IMPORT_MERGE` or equivalent merge path exists;
- canonical `prepared-save-as.js` still delegates to `chrome.downloads.download(... saveAs: true)`.

## Physical matrix

| Schedule / control | Accepted result |
|---|---|
| Seed one synthetic Journal entry; click real export button | Production worker creates a valid schema-v1 Blob containing the exact entry. |
| Native Save As boundary | Substituted only inside disposable copy; canonical source inspected as real `saveAs:true`; native L5 not claimed. |
| Select exported backup A through real file input | Production transfer staging has two rows; confirmation shows A filename, count 1 and exact export time. |
| While confirmation is visible, replace same staging key with valid synthetic backup B; confirm through real UI | Production imports B (`retarget-import-B` / `C44_RETARGET_IMPORT_B`), proving no immutable preview-byte binding. |
| Add concurrent Journal entry and two rows to each pending store after preview; then confirm | Concurrent entry disappears; all three pending stores fall from 2 to 0. |
| Select A, reach confirmation, close full browser process, relaunch same profile | Transfer staging remains 2 rows and Journal/pending state remains, but confirmation/File/operation id are not restored. |
| Reselect A and confirm after restart | Fresh retry succeeds and its staging is consumed; abandoned pre-restart staging remains 2 rows. |
| Earlier fixed-TTL versus lease-aware control | Current age-only model deletes old staging; bounded live lease retains it. |
| Earlier stale-revision versus expected-revision CAS control | Current replace loses concurrent state; CAS rejects stale commit and preserves Journal + pending stores. |

## Owner reconciliation

### P0-013 — selected backup authority

An exact `stagingKey` is useful but not sufficient when the bytes behind that key can differ between preview and commit. The confirmation must authorize one immutable receipt containing the selected object identity/content digest and normalized staging generation. The accepted production-path causal control directly demonstrates this existing owner.

### P1-207 — source revision truth

The backup/restore decision is made against a Journal generation observed at preview, yet commit does not compare that generation. The real UI schedule loses the later concurrent entry. Expected-revision CAS is already proven as a feasible causal control.

### P0-072 — admitted side effects

Pending append/download/remote-save rows are reconciliation checkpoints, not cancellable work handles. Production replace erases them. The architecture must reconcile, migrate or explicitly quarantine those receipts under recovery authority; deletion cannot stand in for cancellation of browser/remote effects.

### P1-215 / P1-194 — staging lifetime and restart

The restart result distinguishes durable bytes from durable ownership: staging persists but its UI owner does not. A bounded lease needs a restart policy—resume from a durable confirmation receipt, or explicitly cancel and reclaim—plus truthful storage durability. Indefinite orphan retention and generic age-only deletion are both incomplete.

### P0-077 — positive versioned envelope

The production-generated schema-v1 backup successfully passes back through the actual local import UI. This strengthens the positive same-version envelope evidence without reopening the DONE owner.

## B1–B9 mapping

| Boundary | Fresh C44 result |
|---|---|
| B1 User Intent | Visible confirmation describes A, but commit can accept different valid bytes B under the same mutable staging key. |
| B2 Admission / exact generation | No immutable preview receipt or expected Journal revision is atomically compared. |
| B3 Capture | Production export serializes the expected synthetic Journal entry in a versioned envelope. |
| B4 Static Materialization | Not primary for C44. |
| B5 Renderer | Real extension page/UI executed; no content-render claim. |
| B6 Physical Artifact | Production Blob and real file-input roundtrip pass; OS-native Save As remains open. |
| B7 Persistence / Transfer | Transfer rows survive full browser restart; current ownership/resume/orphan contract is incomplete. |
| B8 Journal / Provenance | Stale commit erases a newer entry and all pending reconciliation stores. |
| B9 Later Reading / Recovery | Fresh retry works, but confirmation does not resume and abandoned staging remains; remote recovery is untested. |

## Architecture direction

A repair should issue one immutable import receipt after preview containing at least:

- selected backup identity and cryptographic content digest;
- transfer and normalized staging generation ids;
- expected Journal revision;
- explicit operation mode;
- bounded owner/lease identity and expiry;
- confirmation state sufficient for a deliberate resume or explicit cancel.

Commit must atomically compare that receipt before destructive mutation. On mismatch it must stop without clearing Journal or recovery checkpoints. Restart must either restore the exact durable decision or make cancellation/reclamation explicit. Recovery checkpoints for already-admitted local/remote work must be reconciled separately from Journal replacement.

Merge must not be inferred. Either the product declares it unsupported and the matrix records that decision, or it gets separate conflict, duplicate and provenance semantics.

## Remaining C44 exit evidence

C44 remains **OPEN**:

1. implement and physically revalidate immutable digest/staging/revision binding against the accepted actual-UI schedules;
2. implement bounded lease plus explicit restart resume/cancel/orphan cleanup and physically revalidate it;
3. preserve/reconcile admitted side-effect checkpoints during replace;
4. record unsupported merge as a product decision or test an explicit merge implementation;
5. exercise native Save As success/cancel/unresolved state only in a user-owned interactive context;
6. exercise remote backup only in an explicitly authorized isolated Yandex test context.

The local actual-UI and full-browser-restart discovery work is complete. The remaining local work is post-remediation closure, not another discovery reproduction.

