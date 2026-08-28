# Audit delta — P1-210 reconciliation surface: Save As prepare + destructive Journal flows — 2026-08-28

Source-of-truth `main` immediately before this write: `b9807477ce3252c0e894a88eb1ecc16dd7ef9533`.

Docs-only audit checkpoint. Production runtime, tests, configuration and `manifest.json` are unchanged. No new P-number is assigned.

## Classification

Fresh source proof expands existing **P1-210 — outer runtime transport loss / durable operation-state reconciliation** into two additional user-operation surfaces:

1. prepared native Save As response loss before the page receives its durable Save As session receipt;
2. destructive Journal/Yandex operations where a lost outer response is rendered as ordinary failure and can lead to a fresh operation generation.

This checkpoint does not replace subsystem owners:

- **P1-156/P1-169** own the physical prepared Save As session/Blob/checkpoint lifecycle;
- **P1-183/P1-090** own Delete→Trash durable target/outcome and exact move reconciliation;
- **P0-069/P0-078** own destructive/publication privacy policy and publication generation;
- **P0-076** owns exact Journal generation/CAS for delayed local finalization;
- **P0-074/P0-073** own Yandex auth/account/root namespace generation;
- **P1-198** remains the worker-issued operation receipt prerequisite.

P1-210 owns the page-side question that remains after those stores exist: **what may the UI claim and which next action may it admit when the outer response itself was lost?**

## Surface A — prepared Journal/OperationLog Save As response loss

### Journal export PREPARE can physically prepare durable state before the page receives the response

`journal.js::exportJournalToFile()` creates a caller operationId and directly awaits:

`chrome.runtime.sendMessage({ type:'WEBCLIP_JOURNAL_EXPORT_PREPARE', operationId })`.

The worker-side preparation builds/stages the export, creates an offscreen Blob URL and writes a durable PREPARED Save As checkpoint before returning `{ blobUrl, saveAsSessionId, ... }` to the page.

The page cannot call `WebClipPreparedSaveAs.start(prepared)` until that response arrives.

### Outer response loss turns a durable PREPARED generation into an invisible failure

Journal wraps the operation in `runBusy()`. On any thrown/rejected error it shows ordinary error text, and `finally` restores the button's previous enabled state.

Deterministic schedule:

1. page starts export A;
2. worker creates Blob A and PREPARED session SA;
3. worker's response channel is lost before the page receives SA;
4. page reports ordinary failure and re-enables Export;
5. SA remains in `webclipPreparedSaveAsIndex` but no page closure owns its `blobUrl/saveAsSessionId` receipt;
6. user clicks Export again;
7. worker creates independent Blob/session B/SB;
8. A is now an orphaned PREPARED resource/checkpoint and repeated transport loss can consume the active cap of 64.

No physical native download necessarily started for A, so this is not the same side-effect severity as the Yandex/local download P1-210 manifestations. It is still the same **outer response lost after durable admission** classification defect.

The correct UI state is `prepare result unknown/reconcile`, not proof that preparation never happened.

### OperationLog export has the same response boundary

`options.js` directly awaits `WEBCLIP_OPERATION_LOG_EXPORT_PREPARE`, then calls the same `WebClipPreparedSaveAs.start(prepared)` helper.

If PREPARE committed but its outer response is lost, Options also lacks a returned session receipt and a fresh click can create another prepared Blob/session.

Required composition:

- P1-156 must allow recovery/GC of ownerless PREPARED sessions;
- P1-210 should let a page reconcile the exact worker-issued prepare operation/receipt instead of blindly creating a fresh generation;
- P1-198 should bind the returned operation receipt to `saveAsSessionId` so the page can recover exact admitted state without guessing by filename/blob URL.

## Surface B — Delete→Trash outer response loss

### Every retry is a fresh operation generation

`journal.js::runDeleteOperation(diskAction)` sets:

`activeDeleteOperationId = crypto.randomUUID(...)`

on every invocation.

The Retry button is wired to:

`runDeleteOperation(deleteRetryAction)`.

Thus a retry after an error is not reconciliation of the old operation identity; it starts a new textual operationId/generation.

### Generic outer rejection is rendered as terminal error and exposes Retry

The destructive call directly awaits:

`chrome.runtime.sendMessage({ type:'WEBCLIP_JOURNAL_DELETE', id, diskAction, operationId })`.

Its catch path enters the error UI and exposes `Повторить`; for Trash it also exposes the already-audited local-only fallback.

There is no page-side distinction between:

- structured worker rejection proving no remote side effect was admitted;
- structured `unknown settlement` returned by an operation-specific state machine;
- browser/runtime response-channel loss after the worker had already moved/published/unpublished/finalized state;
- worker restart after durable checkpoint but before response delivery.

### Deterministic outer-loss schedule

1. user starts Trash operation A;
2. worker admits or transmits the exact remote move A; it may also create/need the P1-183 durable target receipt;
3. remote move settles or becomes outcome-unknown;
4. the page↔worker result channel is lost before Journal receives authoritative state;
5. Journal catch presents ordinary error + Retry;
6. user clicks Retry;
7. `runDeleteOperation()` creates operationId B and calls a new delete flow;
8. A may still need exact reconciliation while B starts from current/partially changed remote and Journal state.

The older `AUDIT_DELTA_DELETE_FALLBACK_UNKNOWN_MOVE_2026-08-27.md` already proves the analogous problem when the **worker itself returns an error/timeout after move admission**. P1-210 adds the stronger boundary where no worker result is available at all.

Required behavior after outer loss:

- do not generate B merely because the channel rejected;
- show `результат удаления/перемещения уточняется`;
- query bounded exact status by worker-issued receipt A;
- use P1-183/P1-090 durable source/target/object evidence to classify A;
- only permit a fresh move/delete generation after A is authoritatively proven pre-side-effect/terminal-safe, or after an explicit manual-abandon policy preserves detached unknown-outcome evidence.

The existing local-only fallback remains governed by P1-183/P1-090/P0-069 and must not erase unresolved A evidence.

## Surface C — ReadmeLater→Upload / Mark Read truthfulness

`journal.js` starts the remote move with a fresh `activeMoveReadOperationId` and directly awaits:

`WEBCLIP_JOURNAL_MARK_READ`.

On any rejection, including outer runtime/channel failure, the UI states:

`Перенос не завершён`

and explicitly says:

`Запись журнала оставлена в режиме «Прочитать позже».`

That statement is not authoritative after outer transport loss.

The worker flow can already have moved the exact Yandex file or committed checkpoint fields before the response was lost. Existing worker-side durability does not make the page's negative statement true.

This UI currently does not expose an immediate Retry button in the same progress dialog, which is a positive control compared with Delete→Trash. However after closing/reloading, if local finalization did not settle, the Journal entry may still appear as `later` and the user can initiate another move operation.

Required P1-210 refinement:

- outer loss must render `result unknown / checking operation`, not `entry definitely left unchanged`;
- reload/reopen should be able to discover the exact pending move generation from durable state;
- any later fresh Mark Read operation must first reconcile/retire the previous generation under P1-090/P0-076/P0-074 rather than infer non-occurrence from the UI error.

## Surface D — local-only Journal delete is lower side-effect severity but still needs revision receipt

For a non-Yandex entry, the page also directly sends `WEBCLIP_JOURNAL_DELETE` and on rejection reports generic error. A worker may have deleted the Journal row before the outer response was lost.

A second delete normally encounters `entry already absent`, so this path is naturally more convergent and does not warrant a new P1-210 severity class.

Still, the visible response should reconcile current Journal revision/entry generation rather than treat channel rejection as proof that deletion failed. This composes with P0-076/P1-206 rather than creating another item.

## Required P1-210 common contract refinement

### Worker result delivery and operation settlement are separate facts

For extension-page mutations, rejection of `runtime.sendMessage()` means only that the page did not receive an authoritative response. It does not classify worker admission or external/browser settlement.

The page should use three-state semantics consistently:

1. authoritative application result received;
2. exact pre-admission failure proven;
3. result unknown -> reconcile.

### Exact status lookup must not depend on caller textual operationId

P1-198 remains required. The worker should issue an immutable operation receipt/generation at or before admission and bind it to subsystem receipts:

- `saveAsSessionId` for prepared Save As;
- Delete→Trash source/target/object checkpoint;
- Mark Read move checkpoint;
- PDF/download/remote-save receipts from the original P1-210 audit.

A page-generated display operationId can remain useful for UX/log correlation but must not authorize status mutation/retry.

### UI must not unlock fresh non-idempotent action solely from transport failure

After outer loss:

- disable or replace ordinary Retry with `Проверить результат` / reconciliation;
- a fresh generation is allowed only after authoritative status proves it safe;
- reconciliation timeout remains `unknown`, not failure;
- page close/reload does not delete durable recovery evidence.

### Boundedness

Status reconciliation must remain bounded/coalesced. Do not hold a page forever or create a polling storm. Unknown state can persist durably/manual-reconciliation state while expensive resources obey their own bounded owner/lease policies.

## Deterministic regressions

1. Journal export PREPARE commits SA, outer response rejects -> page does not create SB on ordinary Retry until SA is reconciled or proven safely orphan-reclaimable.
2. Same PREPARE loss + page reload -> active SA is discoverable by worker-issued receipt/owner recovery or is reclaimed by P1-156 proof-based GC; repeated loss cannot exhaust cap 64 silently.
3. OperationLog export PREPARE has the same semantics.
4. Delete→Trash move A physically succeeds, outer response rejects -> UI shows unknown/reconcile; clicking normal action cannot start B before A reconciliation.
5. Delete→Trash A is authoritatively rejected before remote side effect -> fresh B may be admitted.
6. Delete→Trash A outcome unknown + user explicitly abandons automatic reconciliation -> detached exact source/target/publication receipt remains; Journal-management authority can be revoked separately.
7. Mark Read remote move A succeeds but response is lost before local UI success -> page never states as fact that the entry/file remained unchanged.
8. Mark Read after page reopen first reconciles A before issuing a new move generation.
9. Local-only delete commits but response is lost -> refresh/revision check converges to missing entry instead of repeatedly claiming deletion failed.
10. Reconciliation itself loses its response -> state remains unknown and no blind side effect retry occurs.
11. P1-198 collision test: a caller-supplied/reused textual operationId cannot reconcile or control another operation's receipt.
12. Clear/import revokes stale local finalization authority without erasing external-operation evidence required by P1-183/P1-090.
13. Publication state remains explicit across delete transport loss; P0-069/P0-078 are not bypassed by an error fallback.
14. All reconciliation reads and UI outstanding requests remain globally bounded.

## Duplicate check / numbering

No new P-number is allocated.

- **P1-210** is expanded to Save As PREPARE response loss and destructive Journal outer-response loss.
- **P1-156/P1-169** retain the physical Save As session/Blob/cleanup ownership.
- **P1-183/P1-090/P0-069/P0-076/P0-074** retain destructive remote correctness ownership.
- **P1-198** remains the required worker-issued operation identity layer.

The previously assigned P1-201…P1-210 numbers remain occupied and unchanged.

## Test / release state

Audit documentation only. Product runtime/configuration and `manifest.json` are unchanged. Product tests were **not** rerun. The last proven product gate remains historical **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. Manifest/runtime version remains `0.9.8`. Real unpacked Chrome QA and real Yandex E2E remain release blockers. No build, tag or GitHub Release was created.
