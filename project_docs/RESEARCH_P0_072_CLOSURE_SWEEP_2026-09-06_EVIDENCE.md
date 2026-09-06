# P0-072 — first-runtime closure sweep / current mutation-surface saturation — 2026-09-06

Date: 2026-09-06  
Canonical source baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Working branch entering this block: `research/p0-072-recovery-quarantine-2026-09-04 @ 2e1d84a03340ea80dc82e3a4c9976a671f4d8187`  
Positive-control inventory commit: `a72d8b9e97b53a4cee7e881b3733e8dacb762cee`  
Owner: **P0-072 ACTIVE**.

This checkpoint performs a closure-oriented re-audit of the **current source mutation/materialization surface** after the detailed P0-072 state-machine work. It is intended to decide whether further first-tranche architecture research is still justified or whether the remaining work is implementation/verification.

Runtime/manifest remain unchanged.

## 1. Sweep method

Re-audit the current worker along the lifecycle:

```text
materialization
-> durable checkpoint
-> external mutation admission
-> factual settlement
-> Journal finalization
-> cleanup/retention
-> destructive clear/import
```

The goal is not to invent another schema. It is to find a current call-site that can bypass the accumulated P0-072 barriers.

## 2. Hidden/post-reset materialization sources

Current source contains one named `migrateLegacy*` path:

```text
migrateLegacyPendingJournalAppends()
```

It reads `chrome.storage.local.webclipPendingJournalAppends`, materializes into IndexedDB `pendingAppends`, then removes the legacy storage key after the IDB write.

No second named legacy materializer was found in the current worker.

This source is already owned by the destructive read-only snapshot + salted source token + `legacyPendingFence:v1:` contract.

Current `checkpointPendingJournalAppend()` is otherwise only reached by dormant `safeAppendJournalEntry()`; no active call-site to `safeAppendJournalEntry()` exists in current source. This remains a harden-or-retire acceptance item rather than a newly discovered runtime flow.

## 3. Local-download physical mutation surface

Current worker contains exactly one:

```text
chrome.downloads.download(...)
```

automatic-start call-site.

The main local flows first create `pendingDownloads` intent and then call the bounded start helper.

Terminal browser events (`complete` / `interrupted`) funnel through:

```text
finalizePendingLocalDownload(...)
```

and maintenance funnels through:

```text
reconcilePendingLocalDownloads(...)
```

Current 24-hour missing-history paths transition to existing `unknown/manual-resolution` rather than treating absence as proof of no physical file.

Therefore no second local-download mutation or settlement bypass was found beyond the already modeled:

- prepared/admitted one-shot start;
- timeout vs actual rejection;
- intent→numeric bind;
- reset-detached factual settlement;
- compare-delete cleanup;
- P0-039 capacity regression controls;
- P1-146 restart-safe exact start settlement dependency.

## 4. Signed-transfer inventory

Current worker contains three `runOffscreenSignedTransfer({...})` call-sites:

1. Journal/Yandex PDF remote save upload (`mode: pdf-cache-upload`);
2. Journal backup upload (`mode: text-chunks-upload`);
3. Journal backup download (`mode: text-download`).

Only the first belongs to the first P0-072 pendingRemoteSaves tranche.

The backup upload/download paths belong to the backup/restore owners and must not be pulled into P0-072 merely because they use the same transfer primitive.

Current remote-save upload has the positive-control ordering:

```text
ensureRemoteCheckpoint()
-> runOffscreenSignedTransfer(pdf-cache-upload)
```

The target P0-072 change strengthens that with one-shot `upload: prepared -> admitted` CAS immediately before signed transfer.

## 5. Publication mutation surface

Current worker contains one concrete:

```text
PUT /resources/publish
```

inside centralized `ensureYandexPublicUrl()`.

Both normal remote-save flow and remote recovery reach publication through this helper.

The helper first checks existing public URL read-only, so the selected target remains:

```text
read existing public state
-> only if PUT is actually needed, perform publish admission CAS
-> PUT /resources/publish
```

No second publish mutation call-site was found.

P0-078 publication policy generation remains a separate owner; P0-072 only prevents reset-detached/old admitted recovery from replaying publication.

## 6. Yandex move surface

Current worker contains two `/resources/move` mutation call-sites:

1. Journal Delete → Trash;
2. ReadLater → Upload (Mark Read).

They remain intentionally separated:

### ReadLater → Upload

Later P0-072 tranche requires worker-issued local `externalEffect:<effectId>` receipt, prepared before move admission, stable envelope barrier, and factual-only settlement after reset.

Imported `readMove*` Journal projection remains non-authoritative.

### Delete → Trash

Still lacks the exact durable pre-move receipt required before destructive remote movement. This remains **P1-183 ACTIVE** and is not manufactured by P0-072.

No third current Yandex move mutation call-site was found.

## 7. Remote settlement/finalization surface

Normal remote save:

```text
verify remote metadata/type/byte size
-> markPendingRemoteSaveVerified(...)
-> appendJournalEntryFromDurableCheckpoint(...)
-> cleanup pending receipt
```

Remote recovery similarly verifies the remote object before verified/finalization handling, and may call the centralized publication helper when policy requires a missing public URL.

The already-selected P0-072 rules cover the relevant races:

- current durable row wins over stale caller snapshot;
- reset barrier checked before Journal finalization;
- same-id replacement Journal row cannot authorize old receipt cleanup;
- detached factual verified state updates evidence only;
- cleanup is compare/delete and reset-aware;
- generic stale cleanup is one atomic readwrite classification/delete transaction;
- exact account/root/object continuity remains P0-073/P0-074/P1-090.

No additional remote finalizer bypass was found in the current call graph.

## 8. Background maintenance surface

The current maintenance pass invokes:

- `cleanupStalePendingRemoteSaves()`;
- `recoverPendingJournalAppends()`;
- `recoverPendingRemoteSaves()`;
- `reconcilePendingLocalDownloads()`;
- plus unrelated transfer/PDF/import-staging/log/stat maintenance.

These are exactly the recovery/cleanup entrypoints already represented in the P0-072 source gates and state models.

No separate timer/alarm path was found that directly deletes P0-072 recovery authority outside those helpers.

## 9. Important boundary: operation not yet materialized when reset commits

A destructive reset can theoretically commit before an older in-memory save operation has created any P0-072 pending row.

P0-072 cannot quarantine a record that does not exist.

This is **not** grounds to add a hidden global generation ledger to P0-072. The existing owner boundary already assigns ordinary old-operation/new-Journal-generation authority to **P0-076**:

```text
no reset disposition / row did not exist at reset
-> same textual Journal id is insufficient
-> exact per-entry / Journal-generation CAS remains P0-076
```

Once a P0-072 durable row/receipt exists and reset attaches/preserves its barrier, P0-072 owns the unconditional rule:

```text
reset barrier present -> no replacement-Journal mutation
```

This boundary prevents owner creep while keeping the direct P0-072 root cause fully implementable.

## 10. First-runtime saturation conclusion

For the **current baseline first pending/legacy/local/remote P0-072 tranche**, this sweep found no new unowned materialization, physical-mutation, settlement, cleanup or Journal-finalization call-site that requires another architecture mechanism.

Remaining first-tranche work is implementation and committed-source verification of the existing contracts.

This is a **research saturation statement**, not runtime closure and not P0-072 DONE.

If implementation reveals a new current call-site or source path, this conclusion is reopened.

## 11. Later external-effect tranche status

The later ReadLater receipt architecture now additionally has:

- stable `externalEffect:` discovery root;
- exact UUID key validation;
- envelopeVersion/payloadVersion separation;
- barrier-before-payload ordering;
- future scope-token compatibility for full vs scoped reset;
- 64-KiB complete envelope-v1 record cap;
- unresolved capacity semantics;
- opaque future payload cleanup preservation;
- exclusive Journal-meta namespace ownership;
- strong `effectId` generation.

The remaining blocker for Delete→Trash is still P1-183, not another P0-072 storage design question.

## 12. Positive-control source test

Added:

`project_tools/test_p0_072_current_mutation_surface_inventory.js`

The test fixes the current mutation/materialization inventory so a future new call-site forces reclassification rather than silently bypassing the P0-072 audit.

Local/source expectation for the current unchanged baseline:

```text
P0-072 current mutation surface inventory: PASS
```

The inventory test is a positive source control; it does not make the intentionally RED P0-072 implementation tests pass.

## 13. Process consequence

The next high-value project step is no longer open-ended first-tranche architecture research.

Before a merge-ready P0-072 PR:

1. implement the bounded tranches when a safe exact-head edit path is available;
2. turn source-bound RED gates GREEN;
3. run closure re-research on affected lifecycle cells;
4. losslessly consolidate current P0-072 dated evidence into the canonical Yandex remote-identity family/history evidence per `RESEARCH_CHANGE_WORKFLOW.md`;
5. keep P0-072 ACTIVE until required direct verification is complete.

## 14. Status

P0-072 remains **ACTIVE**. Runtime, `service-worker.js`, `journal.js`, manifest and release state remain unchanged. Manifest remains `0.9.8`; release remains `NOT READY`; no Actions/build/tag/GitHub Release is claimed.
