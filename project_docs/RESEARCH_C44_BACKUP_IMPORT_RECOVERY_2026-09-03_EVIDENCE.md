# C44 accepted evidence — Backup / import / recovery — 2026-09-03

## Canonical classification

**C44: `L4-REVALIDATED / PARTIAL/FINDING + POSITIVE/REAL-UNPACKED/PREVIEW-RECEIPT/SHA-256-BINDING/STAGING-GENERATION/REVISION-CAS/FAIL-CLOSED/CLEAN-IMPORT/FULL-BROWSER-RESTART CONTROLS + RECOVERY-CLEAR/RESTART-RESUME-LOSS/ORPHAN-STAGING FINDINGS; LEASE/CHECKPOINT/NATIVE-SAVE-AS/MERGE/REMOTE-L5 OPEN (P0-013, P0-072, P1-207, P1-215; P1-194 supporting; P0-077 positive)`.**

This evidence is a defensive architecture control over synthetic records in a disposable browser profile. It does not use user data, credentials, remote services, permission bypasses or exploit delivery.

## Accepted post-remediation real-UI execution

Canonical source baseline: `e4fdd7ba62d4d4d810be39f21e6e7c42e9ee3c0e`  
Accepted workflow head: `3cbf4a2efe22034fdf4a8b61541f5b167a9df476`  
Workflow: **Research C44 Preview Receipt CAS**  
Run: `33790752301`  
Job: `100766491470`  
Browser: Chrome `152.0.7977.54`  
Conclusion: **SUCCESS**  
Harness: `project_tools/research_c44_full_ui_browser_restart.mjs`  
Result SHA-256: `4a90e0177463db855092c48ec7ee8610b19af498d9e9405f93cc9f7bc8529996`  
Artifact: `c44-preview-receipt-cas-receipt`, id `9907225369`, archive SHA-256 `df1fced2bc77fca68ec58d45fce34a46e14b2d49bbd4fa41b0f84e3678e21297`

Exact source blobs:

- `service-worker.js`: `c4edd3fe7e2467102edc7b27f79e89513678ce79`
- `journal.js`: `e300afb8ce3b1d03005dc35e6ef40ec31d4543b4`
- `journal-import-digest.js`: `7b943119c712cc663ef766bd5a87cc75c70d346d`

Exact source content SHA-256 values recorded by the harness:

- worker: `aa47c316a89b306c8ae702943e077a3c9b548585d970e2cf03bb909a13667b86`;
- journal: `36b6133379d03cec8fe82d204f054fcef49aa204ca0b2262886c069a11e908e1`;
- incremental import digest module: `8f7906ec9157b5dbd4745d129581ce524803811af546764d064fc958cce88485`.

The real local UI now displays the SHA-256 of the inspected backup and returns the worker-issued receipt unchanged. The receipt binds version, `replace` mode, staging key/generation, source, operation id, content digest, entry count, export time and expected Journal revision. Commit re-reads and normalizes the staged bytes, checks that receipt, then compares the expected revision inside the same IndexedDB transaction before any destructive replacement is invoked.

The byte-retarget control preserved the exact staging key, manifest, generation and byte length while changing only valid synthetic JSON bytes. Commit rejected it on `contentSha256`; both Journal generations and all six pending rows remained unchanged. A separate stale-revision control rejected the unchanged backup after a concurrent Journal write and likewise preserved Journal and all pending rows. A clean fresh preview/import succeeded. The full-browser-restart boundary remains truthful: durable staging survives, but live confirmation ownership is not restored and a fresh retry is still required.

## Accepted post-remediation result receipt

```json
{"sourceBaseline":"e4fdd7ba62d4d4d810be39f21e6e7c42e9ee3c0e","sourceHashes":{"worker":"aa47c316a89b306c8ae702943e077a3c9b548585d970e2cf03bb909a13667b86","journal":"36b6133379d03cec8fe82d204f054fcef49aa204ca0b2262886c069a11e908e1","importDigest":"8f7906ec9157b5dbd4745d129581ce524803811af546764d064fc958cce88485","preparedSaveAs":"240b866e9c07f8b0897f14d1f6cf7f374b409bf4b37249140ee95c40947bb4ea","manifest":"183f1ffa9fc60910c2a0b6122d4c4e71d62c5f097f6954aec9eff4e2b2a1e2fc"},"source":{"manifestVersion":"0.9.8","realUiFileBinding":true,"realUiStagesBlobChunks":true,"realUiPreviewsSameKey":true,"realUiReusesKeyAfterConfirmation":true,"confirmationShowsCountDateAndDigest":true,"previewBindsDigestGenerationModeAndRevision":true,"uiReturnsPreviewReceiptUnchanged":true,"replaceRereadsAndMatchesTransferBytes":true,"replaceRequiresPreviewReceipt":true,"expectedRevisionCasGuardsDestructiveWrites":true,"incrementalDigestModulePresent":true,"replaceClearsRecoveryStores":true,"noExplicitMergePath":true,"nativeSaveAsStillRealBoundary":true},"evidenceBoundary":{"level":"L4 real unpacked local UI plus full browser-process restart in disposable profile","nativeSaveAs":false,"remoteBackup":false,"mergePath":false,"defensiveSyntheticDataOnly":true},"productionExport":{"uiButton":true,"productionPrepareAndSerializedBlob":true,"nativeSaveAsSubstituted":true,"schema":"webclip-journal","schemaVersion":1,"entryCount":1,"exportedTitle":"C44_CURRENT_export-A","exportSha256":"775de46bfdaf9a3cafbb3b5c9799820df56ff9facf2fe5047efb758fc0a545d0","status":"Полный журнал (1 записей) передан в стандартные загрузки Chrome. · operationId: 40e15a0e-fde9-48cb-8049-422d6b3614cc"},"previewToCommitRetarget":{"selectedFilename":"c44-production-export-A.json","previewEntryCount":1,"previewExportedAt":"2026-09-03T18:29:20.910Z","previewSha256Shown":true,"stagingKeyStable":true,"transferRowsBeforeRetarget":2,"replacementBytes":419,"failClosed":true,"entryIdsBeforeCommit":["concurrent-retarget","current-retarget-base"],"entryIdsAfterCommit":["concurrent-retarget","current-retarget-base"],"retargetBytesImported":false,"concurrentEntryPreserved":true,"pendingCountsBeforeCommit":{"appends":2,"downloads":2,"remote":2},"pendingCountsAfterCommit":{"appends":2,"downloads":2,"remote":2},"usedTransferRowsAfterCommit":0,"status":"Ошибка импорта: Копия или параметры импорта изменились после проверки: поле contentSha256 не совпадает. Повторите preview перед заменой журнала. · operationId: cdcfbe6e-3085-4f20-8667-d67ed81453a8"},"staleRevisionCas":{"previewSha256Shown":true,"failClosed":true,"entryIdsBeforeCommit":["concurrent-stale","current-stale-base"],"entryIdsAfterCommit":["concurrent-stale","current-stale-base"],"concurrentEntryPreserved":true,"pendingCountsBeforeCommit":{"appends":2,"downloads":2,"remote":2},"pendingCountsAfterCommit":{"appends":2,"downloads":2,"remote":2},"usedTransferRowsAfterCommit":0,"status":"Ошибка импорта: Журнал изменился после проверки резервной копии. Повторите preview перед заменой журнала. · operationId: 2b573e3d-43f5-420a-8ce5-67d71ba2314c"},"cleanImport":{"previewSha256Shown":true,"importedTitle":"C44_CURRENT_export-A","priorEntryRemoved":true,"pendingCountsAfterCommit":{"appends":0,"downloads":0,"remote":0},"usedTransferRowsAfterCommit":0,"status":"Журнал восстановлен из файла. Импортировано записей: 1. · operationId: 7f3bdf90-989a-4f21-9da4-e90e24eb813d"},"fullBrowserRestart":{"extensionIdStable":true,"stagedRowsBeforeRestart":2,"stagedRowsAfterRestart":2,"journalEntryIdsBefore":["current-restart-base"],"journalEntryIdsAfter":["current-restart-base"],"confirmationRestored":false,"selectedFileRestored":false,"operationIdRestored":false,"freshRetrySucceeded":true,"abandonedOriginalRowsAfterRetry":2,"freshRetryRowsAfterCommit":0,"retryStatus":"Журнал восстановлен из файла. Импортировано записей: 1. · operationId: c5555000-8731-43dc-818b-148f97e85c1c"},"browserVersion":"Chrome/152.0.7977.54","extensionId":"bnhkljfeklfjnnmlblgmkogehgiapdpo","resultSha256":"4a90e0177463db855092c48ec7ee8610b19af498d9e9405f93cc9f7bc8529996"}
```

## Historical pre-remediation real-UI / full-browser-restart execution

Canonical source baseline: `4f23eb5b1c063b25f650a24969bafec1cca18c17`  
Accepted workflow head: `917143718e565b2845f30dbdc5da43706100532c`  
Workflow: **Research C44 Full UI Restart**  
Run: `33787642007`  
Job: `100756187928`  
Browser: Chrome `152.0.7977.54`  
Conclusion: **SUCCESS**  
Harness: `project_tools/research_c44_full_ui_browser_restart.mjs`  
Result SHA-256: `9011a72b205b6304826e021fc509d650cd6cb92b041d056507aa31a6385f8e18`  
Artifact: `c44-full-ui-restart-receipt`, id `9906045429`, archive SHA-256 `5df7c49d8f15ea087e763dfa21c9da73d599da4ebba853da0603b0edfaf882d3`

Exact source blobs:

- `service-worker.js`: `cffe46adbd0227bae51c95462d6d705b264838fe`
- `journal.js`: `05cb89db3c322d547faf17b2359e92161d0bcbe7`
- `prepared-save-as.js`: `f33efc5e5340f615fd183dcd37f096f541b1f282`
- `manifest.json`: `259a7c3706e78c1a22021db7dc4769e8accdfb3e`

Exact source content SHA-256 values recorded by the harness:

- worker: `f705db325f625d3187505af90ba399f93111379d508f3c5f75a4a5cc21d1d2bc`;
- journal: `0d5489af122976a00f0a81bf808db8cb46cc0a0353aaa0503e52039b0e1519b8`;
- prepared Save As adapter: `240b866e9c07f8b0897f14d1f6cf7f374b409bf4b37249140ee95c40947bb4ea`;
- manifest: `183f1ffa9fc60910c2a0b6122d4c4e71d62c5f097f6954aec9eff4e2b2a1e2fc`.

## Accepted result receipt

```json
{"sourceBaseline":"4f23eb5b1c063b25f650a24969bafec1cca18c17","sourceHashes":{"worker":"f705db325f625d3187505af90ba399f93111379d508f3c5f75a4a5cc21d1d2bc","journal":"0d5489af122976a00f0a81bf808db8cb46cc0a0353aaa0503e52039b0e1519b8","preparedSaveAs":"240b866e9c07f8b0897f14d1f6cf7f374b409bf4b37249140ee95c40947bb4ea","manifest":"183f1ffa9fc60910c2a0b6122d4c4e71d62c5f097f6954aec9eff4e2b2a1e2fc"},"source":{"manifestVersion":"0.9.8","realUiFileBinding":true,"realUiStagesBlobChunks":true,"realUiPreviewsSameKey":true,"realUiReusesKeyAfterConfirmation":true,"confirmationShowsCountAndDateOnly":true,"previewInspectsTransferBytes":true,"replaceRereadsTransferBytes":true,"noPreviewDigestBinding":true,"noReplacePreviewReceiptBinding":true,"noExpectedRevisionCas":true,"replaceClearsRecoveryStores":true,"noExplicitMergePath":true,"nativeSaveAsStillRealBoundary":true},"evidenceBoundary":{"level":"L4 real unpacked local UI plus full browser-process restart in disposable profile","nativeSaveAs":false,"remoteBackup":false,"mergePath":false,"defensiveSyntheticDataOnly":true},"productionExport":{"uiButton":true,"productionPrepareAndSerializedBlob":true,"nativeSaveAsSubstituted":true,"schema":"webclip-journal","schemaVersion":1,"entryCount":1,"exportedTitle":"C44_CURRENT_export-A","exportSha256":"18c03f3bf7bfade097e29b7f2bb3f8ca428fba16f0242a60dbdffb69cfdbc5fd","status":"Полный журнал (1 записей) передан в стандартные загрузки Chrome. · operationId: 9f6c0b54-6e2b-432d-82cc-f4cc87fe578f"},"previewToCommitRetarget":{"selectedFilename":"c44-production-export-A.json","previewEntryCount":1,"previewExportedAt":"2026-09-03T17:57:58.428Z","stagingKeyStable":true,"transferRowsBeforeRetarget":2,"replacementBytes":531,"importedIds":["retarget-import-B"],"importedTitles":["C44_RETARGET_IMPORT_B"],"importedRetargetProvenance":"","concurrentEntryPresentBeforeCommit":true,"concurrentEntryPresentAfterCommit":false,"pendingCountsBeforeCommit":{"appends":2,"downloads":2,"remote":2},"pendingCountsAfterCommit":{"appends":0,"downloads":0,"remote":0},"usedTransferRowsAfterCommit":0,"status":"Журнал восстановлен из файла. Импортировано записей: 1. · operationId: f4591b0a-2e55-4051-b8af-a0ec491ff0f4"},"fullBrowserRestart":{"extensionIdStable":true,"stagedRowsBeforeRestart":2,"stagedRowsAfterRestart":2,"journalEntryIdsBefore":["current-restart-base"],"journalEntryIdsAfter":["current-restart-base"],"confirmationRestored":false,"selectedFileRestored":false,"operationIdRestored":false,"freshRetrySucceeded":true,"abandonedOriginalRowsAfterRetry":2,"freshRetryRowsAfterCommit":0,"retryStatus":"Журнал восстановлен из файла. Импортировано записей: 1. · operationId: e610028b-2a5f-435e-b284-1b8e968b70d1"},"browserVersion":"Chrome/152.0.7977.54","extensionId":"nnkppblgpdhlpokecpbgaiochickfncl","resultSha256":"9011a72b205b6304826e021fc509d650cd6cb92b041d056507aa31a6385f8e18"}
```

## Assertions accepted by the historical discovery job

- the source baseline is the exact current `main` used for classification;
- the real journal page and real export button invoked the production worker prepare/serialization path;
- the serialized Blob is the versioned `webclip-journal` schema v1 envelope with the expected single synthetic entry;
- only the OS/native `saveAs:true` adapter was substituted inside the disposable extension copy; canonical `prepared-save-as.js` remained source-inspected and unchanged;
- the real file input staged the exported JSON as production transfer manifest + Blob chunk rows and the visible confirmation showed the selected filename, count and export time;
- while that confirmation remained visible, changing the same synthetic staging generation from valid backup A to valid backup B caused the confirmed production commit to import B;
- a concurrent Journal entry admitted after preview existed immediately before commit and disappeared after commit;
- two rows each in `pendingAppends`, `pendingDownloads` and `pendingRemoteSaves` existed before commit and all three stores were empty after commit;
- the consumed staging generation was removed after commit;
- after a full browser-process close and relaunch with the same disposable persistent profile, the staged transfer rows and existing Journal/recovery state persisted;
- the live destructive confirmation, selected `File` object and operation id did not resume after browser restart;
- a fresh user-shaped retry succeeded;
- the fresh retry staging generation was consumed, while the abandoned pre-restart staging generation remained as two orphan rows.

## Defensive findings

### P0-013 — preview authority is not byte-bound

In the historical pre-remediation run, the visible decision described backup A while preview and commit only reused one mutable `stagingKey`. No immutable digest or preview receipt was compared, so the causal integrity control changed only synthetic bytes under that exact key and the historical production path imported valid backup B after confirmation for A.

This demonstrates an integrity/authority gap in the recovery architecture. It is not an exploitability or attacker-reachability claim.

The post-remediation execution closes the local byte-binding subcase: the same-key/same-generation/same-size valid-byte retarget is rejected on SHA-256 mismatch, before Journal or pending-store mutation. P0-013 remains ACTIVE for the wider selected-object/recovery authority surface, including remote identity and restart ownership.

### P1-207 — stale Journal revision is not fenced

A concurrent entry admitted after preview was silently erased by the later destructive replace. The historical pre-remediation commit touched Journal revision but did not compare the revision seen by preview/confirmation. The previously accepted expected-revision CAS control rejected the same stale schedule and preserved the newer Journal generation.

The post-remediation production path now implements that local CAS: a precheck avoids avoidable work, and the authoritative comparison is repeated inside the destructive IndexedDB transaction before replacement begins. The physical stale schedule is rejected and preserves Journal plus all pending rows. P1-207 remains ACTIVE for the wider backup-source/remote revision surface.

### P0-072 — recovery receipts are erased as if work were cancelled

Production replace clears `pendingAppends`, `pendingDownloads` and `pendingRemoteSaves`. Those rows are durable reconciliation authority for already-admitted work; deletion does not prove the corresponding browser/remote side effect was cancelled. The actual UI run confirms the clear on the production commit path.

### P1-215 / P1-194 — restart ownership and orphan staging

Transfer staging survives the full browser restart, but the UI owner/confirmation does not. A fresh retry creates and consumes another generation while the abandoned generation remains. Combined with the earlier accepted two-hour wall-clock cleanup/lease control, this confirms that C44 needs an explicit bounded lease/resume-or-cancel contract rather than age-only cleanup or indefinite orphan retention.

### P0-077 positive envelope

The actual production export Blob is a valid versioned `webclip-journal` v1 envelope and successfully returns through real file selection/import. P0-077 remains DONE and is not reopened.

## Earlier accepted physical IDB / causal-control execution

The prior tranche remains valid supporting evidence:

- canonical source baseline: `508877da4357c7610adbb150ea222ea8ea8464bf`;
- accepted workflow head: `4d64d216f281d3ac443632eae737af076020752e`;
- workflow run: `33723881258`;
- job: `100548527410`;
- Chrome: `151.0.7922.173`;
- harness: `project_tools/research_c44_backup_import_recovery.py`;
- result SHA-256: `56f54b8e797f88361c9ba18c6359609a8a9401d53074afe35c7b8111095ca045`.

It provides the lease-aware TTL and expected-Journal-revision CAS causal controls, exact normalized `importId`/count behavior and field-roundtrip evidence. Its renderer-reload-only boundary is superseded, for restart coverage, by the accepted full-browser execution above.

## Evidence boundary and remaining exit work

Accepted at L4 because the unpacked extension, actual journal UI, production worker paths and full browser-process restart are physical. It does not claim:

- native OS Save As success/cancel/unresolved-dialog behavior;
- an import merge mode, because no production merge command/path exists;
- remote/Yandex backup selection, transport or object identity;
- post-remediation lease/restart-resume and recovery-checkpoint behavior.

C44 remains PARTIAL and OPEN. Remaining exit evidence:

1. give live transfer/normalized staging a bounded renewable lease plus explicit restart resume/cancel/orphan reclamation semantics;
2. reconcile or migrate admitted recovery checkpoints during replace instead of clearing them as cancellation evidence;
3. record an explicit product decision for unsupported merge, or implement separately specified merge/conflict/provenance semantics and test it;
4. exercise native Save As only in a user-owned interactive context;
5. exercise remote backup only with an explicitly authorized isolated Yandex test context.

This tranche changes runtime and adds a deterministic regression test. No new P-code or Registry status change is warranted; manifest remains `0.9.8` and release readiness remains NOT READY.
