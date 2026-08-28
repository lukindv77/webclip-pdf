# Audit delta — operation receipt / cached-content / physical-attempt lineage — 2026-08-28

Source-of-truth `main` before this checkpoint: `01cc3e24ce0dc79fe4943cb81ab6fbb16d903493`.

Docs-only audit checkpoint. Runtime/tests/configuration/manifest are unchanged.

## Classification

No new P-number is assigned.

Fresh source proof refines **P1-198** and its composition with **P0-079**, **P1-184**, **P0-073/P0-074**, **P0-076** and **P1-210**.

Existing audit already establishes that a worker-issued live operation receipt must replace caller-chosen textual `operationId`, and that physical PDF cache / remote save attempts need their own immutable generations. This checkpoint defines a missing relationship between those receipts: **they are not one-to-one identities and must form an explicit lineage graph.**

## Current retry flow demonstrates the non-one-to-one relation

Manual cached Yandex retry enters the worker through `WEBCLIP_RETRY_PDF_TO_YANDEX` and `retryCachedPdfUploadToYandex(tabId, operationId)`.

Each manual retry is intentionally a new visible user operation and starts a fresh OperationLog lifecycle:

- operation kind `yandex-pdf-retry`;
- current textual `operationId`;
- `retry: true` metadata.

At the same time it calls `getValidCachedPdfForTab(tabId)` and intentionally reuses the already generated PDF body/metadata.

Therefore one cached PDF content generation may legitimately feed multiple user retry attempts over time.

## Remote Journal intent identity is currently reused across retries

Inside `uploadCachedRecordToYandex()` current code derives:

`remoteJournalEntryId = cached.journalEntryId || remote-<cached.createdAt>-<tabId>`.

That value is stable for the cached PDF and is passed to `checkpointPendingRemoteSaveIntent()`.

Thus three concepts currently collapse around stable/reused values:

1. intended final Journal entry identity;
2. cached PDF content generation;
3. physical remote upload/reuse/publication attempt.

But the first two may stay the same while the third happens more than once, and each user retry operation should also have a distinct live operation receipt.

## A worker-issued operation receipt cannot replace a physical remote-attempt id

Suppose P1-198 is implemented by issuing receipt R for every visible user operation.

If one cached retry attempt A receives RA, times out after a possible signed PUT, and the user later explicitly starts retry B receiving RB, there can now be:

- one immutable cached content generation C;
- one intended Journal entry J;
- user attempts RA and RB;
- physical remote attempts UA and UB, depending on reconciliation result.

Using RA/RB as the only remote-save key loses the ability to represent a user operation that first performs reconciliation and then conditionally starts one or zero physical transfers.

Using stable J as the only key merges UA/UB, already proven unsafe by the remote-checkpoint generation audits.

Using content generation C as the only key is also wrong: the same bytes can be intentionally attempted in a later namespace/path generation after the first result is authoritatively classified or explicitly abandoned.

## Required lineage model

Conceptually preserve distinct receipts:

### Content receipt C

Owned by P0-079. Binds exact immutable generated PDF bytes/digest/source document and retry-cache generation.

One C may be consumed by more than one authorized later attempt, subject to retry/reconciliation policy and retention.

### User/live operation receipt R

Owned by P1-198. Binds the user/background operation invocation, owner/document/page generation, operation kind and OperationLog history epoch.

A manual retry click B creates RB even when it consumes the same content C as original attempt A.

### Physical side-effect attempt U

Owned by P1-184/P0-073/P0-074 and remote checkpoint generation rules. Binds exactly one external upload/reuse/publish/move attempt/context and its unknown/verified settlement evidence.

One R can legitimately perform zero physical U attempts if reconciliation finds prior success. One R may need a carefully modeled series only when provider protocol makes multiple distinct side effects intentional and each is separately receipted.

### Journal finalization capability JG

Owned by P0-076. Binds expected Journal generation/entry intent and the exact physical/content result allowed to finalize.

It is not the external-attempt id.

## Parent/child edges are correctness data

Required durable lineage should be equivalent to:

`operationReceipt R -> contentReceipt C -> physicalAttempt U -> Journal finalization receipt JG`

with optional explicit relation to a prior attempt being reconciled:

`RB reconciles/precedes UA from RA`.

The exact schema may differ, but every transition must be able to answer:

- which exact bytes did this user operation intend to reuse?;
- which previous physical attempt is this retry first reconciling?;
- did this retry actually start a new external side effect?;
- which physical result authorized the Journal record?;
- which diagnostics/progress operation should display that result?;
- which generation may be cleaned without deleting another generation's evidence?

## Retry must not relabel old physical evidence

Existing remote checkpoint code can preserve an old `remote-verified` row while updating its textual operationId to the new retry's id. Previous audit already identified that as contradictory provenance.

The lineage model gives the correct replacement:

- old physical attempt UA keeps immutable owner RA/C/context;
- retry RB can reference UA as `reconciledPreviousAttempt`;
- if UA is proven successful, RB may report `recovered previous result` without claiming RB physically uploaded the file;
- if a new UB is safely admitted, UB is a child of RB/C with its own generation.

OperationLog can then truthfully say whether the retry uploaded, reused, reconciled, or merely finalized an older result.

## Publication is another child state, not a boolean annotation

P0-078 and publication-observation audits require policy generation separate from observed public state.

If upload U is followed by publish side effect P, the receipt graph should make that transition explicit. A later retry that only reconciles an already-public object must not be represented as having executed a new publish merely because its parent operation desired public links.

The same model supports explicit future unpublish receipts.

## Local download composition

The same receipt separation is useful locally:

- generated PDF content C;
- user operation R;
- non-cancellable Chrome download-start attempt D;
- exact DownloadItem id/result once bound;
- Journal finalization JG.

A new visible operation that reconciles an old D does not become the physical creator of D.

No separate new local-download P-item is required; this is P1-198 schema composition with existing physical owners.

## OperationLog remains a projection

OperationLog may display the lineage but must not be the only durable source of it.

P1-197 clear/retention can delete diagnostics while C/U/D detached recovery receipts remain authoritative.

A stable display operationId may be shown to the user, but correctness edges use immutable locally issued receipts.

## Required deterministic regressions

1. Original user operation RA creates content C and remote attempt UA; UA outcome unknown. Manual retry RB starts -> RB first references/reconciles UA; it cannot overwrite/relabel UA as RB.
2. UA proves success during RB -> RB completes as reconciliation/finalization with zero new physical upload; OperationLog truthfully attributes physical upload to UA.
3. UA proves non-occurrence -> RB admits distinct UB bound to same C and current Yandex context; UA evidence remains historical.
4. RA/RB use same intended Journal id J -> U generations remain distinct and cleanup of UA cannot delete UB.
5. RA/RB use same exact cached bytes -> content receipt C may be shared intentionally without treating the operations as the same receipt.
6. New PDF generation C2 replaces latest retry pointer while old C/UA are unresolved -> old lineage remains exact; RB for C2 cannot inherit UA.
7. Publication side effect from UA is not attributed to RB merely because RB reconciles the file.
8. OperationLog clear between UA and RB does not destroy physical lineage needed for RB reconciliation.
9. Journal clear/import invalidates JG but retains unresolved U/D receipt lineage detached from current Journal generation.
10. Worker/page loss followed by recovery can reconstruct enough lineage to surface which physical generation is pending without old DOM state.
11. Imported historical operation ids cannot manufacture live R/C/U lineage.
12. Normal one-shot save still has a simple chain and does not require extra user interaction.

## Duplicate check / numbering

No new item is created.

- **P1-198** owns worker-issued live operation receipt and this parent/child composition.
- **P0-079** owns immutable PDF content generation.
- **P1-184/P0-073/P0-074** own external physical attempt/object/Yandex context.
- **P0-076** owns expected Journal-generation finalization.
- **P1-210** owns page-level unknown-result reconciliation before a fresh retry operation is admitted.

This checkpoint does not replace any physical subsystem receipt with a generic operation id. It records how those receipts must be linked without being collapsed.

P1-211 remains unassigned.

## Test / release state

No product tests were rerun. Historical **88/88 syntax + 74/74 deterministic PASS** remains prior evidence only. No runtime/build/tag/Release change was made.
