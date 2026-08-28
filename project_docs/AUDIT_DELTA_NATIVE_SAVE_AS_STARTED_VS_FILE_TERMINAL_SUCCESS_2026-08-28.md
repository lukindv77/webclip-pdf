# Audit delta — native Save As STARTED is currently recorded as terminal export success — 2026-08-28

Source-of-truth `main` before this checkpoint: `9d05f3fbc1ee481d009d471e3069f9f818517aa0`.

Docs-only audit checkpoint. Runtime/tests/configuration/manifest are unchanged.

## Classification

No new P-number is assigned.

Fresh source proof refines **P1-156** native Save As lifecycle and composes with **P1-198** operation receipt/terminal authority, **P1-210** page-result reconciliation and OperationLog truthfulness. The physical Blob cleanup watcher is already a positive control; the missing piece is user/diagnostic terminal classification.

## Current page reports `started` immediately after native Save As returns a downloadId

`journal.js` calls:

`downloadId = await WebClipPreparedSaveAs.start(prepared)`.

`prepared-save-as.js::start()` returns after:

`chrome.downloads.download({ saveAs:true, ... })`

has returned a numeric `downloadId`.

The page then sends:

`WEBCLIP_JOURNAL_EXPORT_SAVE_AS_SETTLED { status:'started', downloadId, ... }`.

Thus the page accurately says only that a Chrome DownloadItem has been created/started after the user chose a destination.

## Worker converts STARTED into terminal OperationLog success

The worker handler normalizes only two page states:

- `started`;
- `error`.

When it receives `started`, current code immediately:

- records operation stage `complete`, percent 100, status `success`;
- calls `finishOperationLog(operationId, 'success', ...)`;
- returns success to Journal.

The summary says the full Journal was handed to Chrome downloads. The wording is somewhat careful, but the durable operation status is terminal `success` before the DownloadItem itself reaches terminal state.

## A started DownloadItem can still become interrupted

The same codebase already treats this distinction as correctness-critical for ordinary local PDF saves:

- `downloads.download()` returning an id is not enough to create the Journal record;
- exact `downloads.search({id})` / `downloads.onChanged` must observe `complete`;
- `interrupted` is a separate terminal outcome.

Native Save As uses the same Chrome Downloads state machine after the user-owned dialog returns.

Therefore a valid schedule is:

1. user chooses a path in native Save As;
2. Chrome returns downloadId D;
3. Journal sends `status:'started'`;
4. worker marks export OperationLog success/complete;
5. later D becomes `interrupted` due disk/network/blob/permission/filesystem failure;
6. physical exported file is not successfully completed, while diagnostic/user operation remains terminal success.

This does not corrupt Journal source data, so P1 rather than P0 ownership remains appropriate.

## Existing cleanup watcher proves terminal state is observable

`prepared-save-as.js` installs a page-owned `chrome.downloads.onChanged` listener for D.

Worker `WEBCLIP_PREPARED_SAVE_AS_STARTED` also arms `revokeBlobUrlWhenDownloadFinishes(downloadId, blobUrl)` as a secondary cleanup path.

Those watchers distinguish:

- `complete`;
- `interrupted`.

Therefore the runtime already has a concept of physical terminality. It is currently used primarily to release Blob resources, not to update the export operation result.

The required repair should reuse the exact durable STARTED/download receipt rather than inventing a second unrelated listener.

## STARTED is a committed handoff state, not failure

The fix must not classify STARTED as an error while a download is legitimately in progress.

A correct operation lifecycle can have at least:

- `prepared` — Blob/session exists before user finishes dialog;
- `started` / `download-bound` — exact DownloadItem D exists; export handoff succeeded but file outcome pending;
- `complete` — D reports complete;
- `interrupted` — D reports interrupted + reason;
- `terminal-unknown` / reconciliation-needed if browser history/state cannot be authoritatively read after page/worker loss.

The visible export operation can show `Передано в загрузки Chrome` while pending, but OperationLog should not use final success until physical terminal semantics chosen by the product are satisfied.

## What does “export success” mean?

There are two defensible product definitions:

### Handoff-success semantics

The export operation is considered complete once WebClip successfully creates the DownloadItem, and later browser file outcome is explicitly outside the operation.

If this definition is intentional, status/UX must say `handoff complete` rather than generic terminal `success`, and diagnostics should still preserve later `interrupted` outcome for the exact D because the user may otherwise believe the file exists.

### File-complete semantics

The export operation remains pending until D reaches `complete`; `interrupted` becomes terminal error/partial.

This is more consistent with the local PDF Journal save model and likely closer to a user's expectation for `Export to file`.

Whichever policy is chosen, STARTED and physical COMPLETE must remain distinct states rather than being collapsed accidentally.

## Durable STARTED receipt is the bridge

The native Save As lifecycle already has:

- `saveAsSessionId`;
- owner page;
- Blob URL;
- STARTED checkpoint with `downloadId`;
- RELEASED tombstone.

P1-156 repair should make the exact durable STARTED generation authoritative for terminal reconciliation after page/worker restart.

OperationLog terminal update should derive from that receipt, not from a free-standing page message containing only textual operationId + downloadId.

This composes with the earlier `SAVE_AS_STARTED_COMMIT_ORDER` finding: durable STARTED must become authoritative before worker-owned terminal cleanup/result logic.

## RELEASE and result terminality are different transitions

Blob cleanup can happen when D becomes either complete or interrupted. Resource release is valid in both cases.

Operation result is not the same:

- complete -> successful file result;
- interrupted -> file result failed/interrupted;
- resource RELEASED merely says WebClip no longer needs the Blob backing resource.

Do not infer success from RELEASED.

## Page loss / worker restart

A page can disappear after D is started.

Current P1-156 already requires reconstruction of STARTED sessions from durable session state and exact `downloads.search({id})` after worker restart.

That same recovery pass should reconcile operation result:

- if D complete -> exact operation receipt may become success;
- if D interrupted -> terminal interrupted/error;
- if D still in progress -> remain pending;
- if D cannot be authoritatively found -> use truthful unknown/history-unavailable state rather than success merely because STARTED existed.

## Options OperationLog export must follow the same model

Prepared Save As is shared by Journal export and OperationLog export from Options.

The lifecycle contract should be generic:

`prepared Save As session -> exact DownloadItem receipt -> terminal file result -> release`.

Do not fix only Journal export while Options continues to treat started as equivalent to completed.

## Required deterministic/browser regressions

1. Native dialog accepted -> D starts -> D remains in_progress: operation is handoff/pending, not physical file success under file-complete semantics.
2. D transitions complete -> exactly one terminal success is recorded for the bound operation receipt.
3. D transitions interrupted -> operation records interrupted/error, not prior immutable success.
4. Page dies after D starts -> worker/startup reconciliation reads exact D and reaches correct terminal result.
5. Worker dies after durable STARTED but before watcher setup -> restart reconciliation still reaches terminal result.
6. onChanged terminal event happens before listener registration -> exact post-bind `downloads.search({id})` closes the gap.
7. RELEASE races terminal reconciliation -> Blob release is idempotent and cannot erase the DownloadItem/operation receipt before result classification.
8. User leaves native dialog open arbitrarily long -> no artificial pre-STARTED timeout is introduced.
9. D is removed from history before terminal reconciliation -> operation becomes truthful unknown/history-unavailable according to retention policy, never silently success from STARTED alone.
10. Journal export and OperationLog export share the same terminal semantics.
11. OperationLog clear/retention does not destroy the durable Save As physical receipt while reconciliation still requires it.
12. Outer page response loss after STARTED does not launch a second native Save As without reconciling the exact session/download receipt.

## Duplicate check / numbering

No new item is created.

- **P1-156** remains native Save As durable lifecycle/reconciliation owner.
- **P1-198** owns exact operation terminal authority/receipt composition.
- **P1-210** owns page-level unknown-result retry behavior.
- Existing local-download terminal-receipt work is a useful analogous positive model but remains a separate physical workflow.

P1-211 remains unassigned.

## Test / release state

No product tests were rerun. Historical **88/88 syntax + 74/74 deterministic PASS** remains prior evidence only. No runtime/build/tag/Release change was made.
