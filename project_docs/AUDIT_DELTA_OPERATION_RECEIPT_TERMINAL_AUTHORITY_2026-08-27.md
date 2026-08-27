# Audit delta — OperationLog terminal authority / operation receipt composition — 2026-08-27

Source-of-truth `main` immediately before this write: `1bfe9c9149144db31f9a8e87d37122f358f50fe3`.

Docs-only audit checkpoint. Production runtime, tests, configuration and `manifest.json` are unchanged. Canonical large-table synchronization is not claimed by this file.

## Classification

No new P-number is created.

Fresh source proof strengthens existing:

- `P1-198` — worker-issued live operation identity/receipt rather than caller-owned textual `operationId`;
- `P1-197` — OperationLog history epoch / stale-writer rejection across clear and retention;
- `P1-148` — exact Journal entry -> OperationLog provenance;
- `P1-156` / `P1-129` — visible-page native Save As ownership and durable Save As session lifecycle.

The concrete refinement is that **terminal authority is still textual even where physical resource ownership already has a stronger receipt**. A worker-issued operation receipt must therefore govern not only operation start/event writes, but also page-originated cancel/finish/Save-As-settled transitions.

## Fresh source proof

### 1. Content-owned live operation identity remains caller-selected

The content-allowed runtime handlers for:

- `WEBCLIP_GENERATE_PDF`;
- `WEBCLIP_SEND_PDF_TO_YANDEX`;
- `WEBCLIP_RETRY_PDF_TO_YANDEX`;
- `WEBCLIP_DOWNLOAD_CACHED_PDF`

still pass `message.operationId` through syntax/length normalization and use the resulting textual value as the authoritative OperationLog key.

This is the original `P1-198` root cause: the worker does not issue/prove a unique live receipt bound to sender document + operation kind before the log/checkpoint/progress lifecycle begins.

### 2. `startOperationLog()` silently reopens an existing textual key

`startOperationLog(operationId, type, title, meta)` queues by the supplied id and mutates the existing record when one is already present.

It sets/replaces operation type/title/description/status/meta rather than rejecting a second physical operation that happens to use the same textual id.

Per-id Promise serialization prevents raw IndexedDB races, but it does not establish immutable ownership of that id by one physical operation.

### 3. Extension pages are trusted callers, but terminal log authority is still only `operationId`

`assertRuntimeMessageSender()` accepts messages from extension pages as trusted extension senders. That is the correct ACL boundary and this audit does not propose treating WebClip's own pages as hostile host DOM.

However `WEBCLIP_OPERATION_LOG_FINISH` accepts only:

- textual `message.operationId`;
- requested status;
- summary.

The handler calls `finishOperationLog(operationId, status, summary)` without an operation receipt/generation proving which live physical operation the page is allowed to terminate.

Trusting the extension page is not the same as proving that a delayed message belongs to the currently authoritative generation of operation X.

### 4. `finishOperationLog()` is an ordinary operationId-addressed writer

`finishOperationLog()` emits an `operation-finish` event through the same operationId-addressed OperationLog path.

Therefore terminal status has the same collision/stale-generation weakness as ordinary events:

- if two physical operations share textual X, either one can terminally classify the merged X record;
- if old X was cleared and a later writer is not epoch-fenced, terminal/event machinery can participate in resurrection under P1-197;
- if X is deliberately reused for a new operation after clear/new epoch, an old terminal message must not attach to the new X merely because the display string matches.

### 5. Real UI cancellation already uses this textual terminal API

`journal.js` uses `WEBCLIP_OPERATION_LOG_FINISH` when a user cancels a staged local Journal import after preview and when a user cancels a staged Yandex-backup restore after preview.

Those are legitimate visible-page lifecycle events. The issue is not that the page is allowed to cancel its operation; the issue is that the worker receives only textual operationId and therefore cannot distinguish a delayed cancellation from a different/new physical operation that reused the same text key.

A worker-issued receipt should let the page retain this UX while making the cancel transition generation-exact.

## Native Save As provides a useful positive control

### 6. Physical Save As resource lifecycle already has a separate random session receipt

Prepared native Save As uses a random `saveAsSessionId` and a durable checkpoint containing at least:

- session id;
- Blob URL;
- filename;
- owner page (`journal.html` or `options.html`);
- operationId.

`WEBCLIP_PREPARED_SAVE_AS_STARTED` and `WEBCLIP_PREPARED_SAVE_AS_RELEASE` require the session id + Blob URL and re-check the exact allowed owner page before mutating/releasing that prepared resource lifecycle.

This is structurally stronger than OperationLog terminal ownership and should be preserved. Native `saveAs:true` remains owned by the visible extension page and must not gain an artificial timeout.

### 7. Save As log finalization still addresses the log by textual operationId

The Journal export Save As settlement path ultimately calls `finishOperationLog(operationId, ...)` using the operationId supplied/carried by the page-facing flow.

Thus two identities coexist:

- **physical Save As receipt:** random `saveAsSessionId`, durable and owner-page checked;
- **diagnostic operation identity:** textual `operationId`, not yet a worker-issued immutable operation generation.

A stale/mis-correlated terminal message can therefore damage forensic/log truth even when the Blob/download lifecycle itself remains safely owned by its Save As session.

This is important for implementation planning: closing P1-198 does **not** require weakening or replacing the existing Save As resource receipt. The operation receipt should compose with it.

## Required unified P1-198 terminal contract

### Worker-issued live operation receipt

At operation admission, issue an immutable receipt independent of any caller display/correlation string. Conceptually it should bind:

- OperationLog history epoch from `P1-197`;
- random operation nonce/generation;
- operation kind/type;
- source owner class (content document / journal page / options page / background scheduler);
- source tab + exact document generation where applicable (`P0-070`, `P1-171` dependencies);
- optional display `operationId` only as non-authoritative correlation text.

### Terminal transitions require the exact receipt

Every cancel/finish/terminal status transition must carry or be derivable from the exact live receipt.

Inside the authoritative OperationLog transaction, prove:

1. current history epoch matches the receipt;
2. current operation generation/nonce matches;
3. the terminal transition is valid for that operation lifecycle;
4. a stale terminal writer cannot mutate a newer operation that reused the same textual display id.

Terminal state should be monotonic unless an explicitly modeled recovery state permits a later reconciliation transition. A second unrelated operation must never reopen or overwrite the first by reusing its textual id.

### Page-owned cancellation

Visible extension pages may continue to own user decisions such as canceling import after preview. The worker should return an operation receipt when the operation is prepared/admitted, and the page must return that receipt for cancellation.

If the page is stale/reloaded and no longer owns the exact receipt, cancellation should fail closed or reconcile the exact retained operation state rather than targeting a display string.

### Native Save As composition

For page-owned Save As, bind:

`operationReceipt <-> saveAsSessionId <-> ownerPage <-> Blob/download lifecycle`.

The existing random Save As session remains the physical resource owner. OperationLog terminal status should be derived from/check against the checkpoint's bound operation receipt rather than trusting an independently supplied textual operationId.

`saveAs:true` must remain without an artificial timeout. Receipt validation is ownership/provenance, not a deadline.

### Background/recovery composition

Background and recovery operations that currently create their own `makeOperationLogId(...)` values should also receive a locally issued generation/receipt so that:

- restart/recovery can distinguish a resumed durable operation from a new diagnostic operation;
- P1-197 clear epoch invalidates stale writers;
- Yandex remote-save `transferAttemptId` / checkpoint generations can reference a proven operation receipt (`P0-073/P0-074/P1-184` composition) rather than a mutable text label.

## Required deterministic regressions

1. Physical operation A owns receipt RA/display id X. A second operation B proposes/reuses display X: B cannot rewrite A; it receives RB or is explicitly rejected.
2. A delayed `WEBCLIP_OPERATION_LOG_FINISH` carrying RA after B has begun with display X cannot finish B.
3. A page cancel for staged import A cannot cancel a later staged import B merely because the same display id is reused.
4. Clear OperationLog advances P1-197 epoch; late finish/event from RA is rejected and cannot recreate the cleared record.
5. New operation B after clear may reuse display X under a new receipt/epoch; late A terminal message remains stale.
6. Journal entry -> log linkage stores/resolves the exact operation receipt/provenance, not only display X.
7. Prepared Save As session SA is bound to operation receipt RA; STARTED/RELEASE/settled log outcome for SA cannot finish another operation RB.
8. Reload/duplicate extension page cannot finish/cancel an operation unless it holds the exact live/durable receipt required by that lifecycle.
9. Normal user cancellation after import preview still works and records exactly one terminal canceled event for the intended operation.
10. Native Save As remains page-owned and unbounded by artificial timeout while terminal OperationLog provenance becomes generation-safe.
11. Background operation restart cannot attach a new physical operation to an old receipt simply because `makeOperationLogId`/display text matches.
12. Imported historical operationId remains `imported-unverified` under P1-190 and cannot be presented as a live terminal-capable receipt.

## Adjacent audit blocks completed in the same pass

### Destructive/publication lifecycle

Fresh source evidence was duplicate-checked against existing `AUDIT_DELTA_YANDEX_MUTATION_RECOVERY_2026-08-27.md`, `AUDIT_DELTA_DESTRUCTIVE_PUBLICATION_LIFECYCLE_2026-08-27.md`, and `AUDIT_DELTA_PUBLICATION_POLICY_2026-08-27.md`.

No new P-number is needed:

- generic `yandexApi()` timeout text incorrectly claiming `без изменения данных` for mutating PUT/POST is already an explicit mutation-recovery refinement;
- missing `/resources/unpublish` and deletion of published Journal references remain `P0-069/P1-164`;
- stale publication policy remains `P0-078`;
- publish before exact object/content proof remains `P1-184`;
- move timeout/target identity remain `P1-090/P1-183`.

### OAuth readiness/lifetime

Fresh current-source check still confirms the already reserved `P1-195/P1-196` evidence:

- status reports connected from token presence;
- status exposes requested scopes rather than enforced granted capabilities;
- locally known expiry is rejected only at operation-time token getter rather than represented as authoritative status state;
- manual token persists unknown lifetime/scope as `expiresAt:0` / empty scope;
- no exact-current-generation 401 demotion exists.

No new OAuth number is created; existing `AUDIT_DELTA_YANDEX_OAUTH_2026-08-26.md` remains the owner.

### PDF debugger/document ownership

Current debugger attach/detach actual-settlement serialization remains a positive control (`P1-066/P1-131`). Fresh save-path inspection still passes only `tabId` into PDF generation while the content sender's `documentId` is not carried to `generatePdfBlob(tabId)`. This remains existing `P0-070`, not a new item.

## Registry consequence

No new P-number is assigned by this checkpoint.

Refine `P1-198` so worker-issued live identity covers **terminal/cancel/settlement writers**, not only start/event collision. Compose with `P1-197` history epoch and existing page-owned Save As receipt `P1-129/P1-156`.

Canonical `PRIORITIES_P0_P1_P2.md` / `DEEP_AUDIT_2026-08-25.md` lossless synchronization remains pending as a separate large registry-reconciliation step.

## Test / release state

No product tests were rerun for this docs-only checkpoint. The last proven product gate remains the historical **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. No runtime/config/manifest change was made. No build, tag or Release was created.