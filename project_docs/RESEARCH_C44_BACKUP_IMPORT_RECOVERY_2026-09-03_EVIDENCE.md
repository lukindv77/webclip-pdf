# C44 accepted evidence — Backup / import / recovery — 2026-09-03

Canonical source baseline: `508877da4357c7610adbb150ea222ea8ea8464bf`  
Accepted workflow head: `4d64d216f281d3ac443632eae737af076020752e`  
Workflow: **Research C44**  
Run: `33723881258`  
Job: `100548527410`  
Browser: Google Chrome `151.0.7922.173`  
Conclusion: **SUCCESS**  
Harness: `project_tools/research_c44_backup_import_recovery.py`  
Result SHA-256: `56f54b8e797f88361c9ba18c6359609a8a9401d53074afe35c7b8111095ca045`

Exact source blobs:

- `service-worker.js`: `cffe46adbd0227bae51c95462d6d705b264838fe`
- `journal.js`: `05cb89db3c322d547faf17b2359e92161d0bcbe7`

## Accepted result

```json
{"browserMatrix":{"browserVersion":"151.0.7922.173","expectedRevisionCasControl":{"concurrentStillPresent":true,"pendingCounts":{"pendingAppends":1,"pendingDownloads":1,"pendingRemoteSaves":1},"result":{"actual":8,"code":"STALE_REVISION","ok":false}},"leaseAwareControl":{"deleted":0,"importARemains":true,"retainedLeased":1},"reloadPersistence":{"afterImportRows":2,"beforeImportRows":2,"importAStillPresent":true},"staleRevisionCurrentReplace":{"concurrentPresentAfter":false,"concurrentPresentBefore":true,"importAOnly":["entry-import-A"],"importedFields":{"id":"entry-import-A","operationId":"op-import-A","pdfSha256":"c44-digest-A","provenance":{"marker":"C44_PROVENANCE_A"},"selectionExactScope":{"marker":"C44_EXACT_SCOPE_A"},"selectionMeta":{"marker":"C44_SELECTION_META_A"},"selectionSnapshot":{"marker":"C44_SELECTION_SNAPSHOT_A","version":3},"title":"C44_IMPORT_A","url":"https://example.test/a"},"pendingCountsAfter":{"pendingAppends":0,"pendingDownloads":0,"pendingRemoteSaves":0},"replace":{"copied":1,"ok":true}},"ttlWithoutLease":{"deleted":1,"importARemains":false}},"evidenceBoundary":{"level":"L4 current-source plus physical Chrome IndexedDB/race controls","realBrowserRestart":false,"realMergePath":false,"realRemoteBackup":false},"journalBlobSha":"05cb89db3c322d547faf17b2359e92161d0bcbe7","resultSha256":"56f54b8e797f88361c9ba18c6359609a8a9401d53074afe35c7b8111095ca045","sourceBaseline":"508877da4357c7610adbb150ea222ea8ea8464bf","sourceContract":{"importStagingWallClockTtl":true,"indexedImportStaging":true,"journalDbV7":true,"noExplicitImportMergeCommand":true,"normalizedRowsCarryImportId":true,"replaceClearsRecoveryStores":true,"replaceHasNoExpectedJournalRevisionCas":true,"replaceTouchesRevision":true,"replaceUsesPreparedIdentityAndCount":true,"selectionSnapshotNormalizationPresent":true,"statsGenerationIsNotJournalCas":true,"transferStagingWallClockTtl":true},"workerBlobSha":"cffe46adbd0227bae51c95462d6d705b264838fe"}
```

## Assertions accepted by the job

- every exact-source C44 guard was true;
- two normalized staging generations survived a real renderer reload;
- current wall-clock TTL behavior deleted import A when older than two hours despite a synthetic live-owner marker;
- the lease-aware causal control retained that same old import A row;
- a Journal mutation after preview was present before destructive replace and absent after current replace;
- current replace copied only exact `import-A`, not `import-B`;
- current replace reduced `pendingAppends`, `pendingDownloads` and `pendingRemoteSaves` from one each to zero;
- exact selection/provenance-shaped markers survived the staged-row → entries positive roundtrip;
- the expected-revision causal control rejected revision 8 when revision 7 was expected and preserved the concurrent entry plus all three recovery checkpoints;
- the harness explicitly records that real browser restart, real remote backup and a real merge path were **not** exercised.

## Classification boundary

Accepted as **L4 current-source + physical browser IndexedDB/race evidence**, not L5. The harness models the exact relevant production DB/store identities and destructive transaction consequences but does not claim a full visible UI export/import path, browser-process restart, remote backup service or nonexistent merge command.

Owner reconciliation: `P0-013, P1-194, P1-207, P1-215, P0-072`; `P0-077` remains DONE positive. No new P-code or Registry wording/status change.
