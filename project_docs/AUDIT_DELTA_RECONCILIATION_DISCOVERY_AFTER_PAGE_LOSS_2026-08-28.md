# Audit delta — durable reconciliation discovery after page loss/reload — 2026-08-28

Source-of-truth `main` immediately before this write: `84c0ea97dd8c28becb3090d5f34baf00080022c4`.

Docs-only audit checkpoint. Runtime/configuration/tests/manifest are unchanged. No new P-number is assigned.

## Classification

Fresh source proof refines **P1-210** user-facing unknown-result reconciliation and composes with **P1-198** worker-issued operation receipts plus the physical subsystem owners **P0-039/P0-048** (local download), **P1-184/P0-073/P0-074** (remote save), **P1-156** (Save As), and **P1-052/P1-207** (backup attempts).

The missing acceptance condition is **discoverability**. A durable physical checkpoint is not sufficient for user-facing reconciliation if only the destroyed old page knows the operation id/session key needed to ask about it.

No new root cause is required.

## Two kinds of mutations need different reconciliation discovery

### Current-state mutations

Options mutations such as:

- current auth/disconnect;
- root/config/public-link preference;
- backup settings;
- imported settings generation;

can often be reconciled after page reload by reading the authoritative **current state/revision**. The new page does not necessarily need the old operation receipt just to learn whether the setting is currently enabled/rooted/connected.

P1-210 still needs generation-aware explanation when the old physical/ancillary operation matters, but current-state reads provide a natural discovery surface.

### Physical side-effect attempts

Local Downloads, Yandex uploads/publication, prepared Save As, backup uploads and destructive remote moves have a different shape.

Their durable truth is not reducible to one current global setting. Multiple attempts/generations can coexist, remain unresolved, become detached after Journal replacement, or settle after the initiating page disappears.

These require exact physical attempt discovery.

## Current local/remote pending stores are internal recovery authority

Service worker has durable stores/functions for:

- `pendingDownloads`;
- `pendingRemoteSaves`;
- backup pending checkpoint;
- prepared Save As session/index;
- future generation-aware move/delete receipts.

Background maintenance can enumerate/reconcile those stores.

For remote saves, `recoverPendingRemoteSaves()` eventually returns aggregate fields such as `pending`, `stalePending`, `recovered`, `verified`, `deferred`, `failed`, etc. `countPendingRemoteSavePhases()` exists only as an internal helper used by recovery.

Fresh runtime switch/source review did not find a page-facing endpoint exposing a bounded list/query of current local/remote physical generations to a newly loaded content/Journal/Options page.

The internal maintenance owner can therefore know that something is pending while the replacement UI has no exact receipt to present/reconcile.

## Old content page owns correlation only in ephemeral DOM/JS state

Content upload/download UI generates/stores a textual operation id in the live content script and renders retry/reconciliation affordances in the modal.

For Yandex retry, a new `retryCachedPdfToYandex()` creates another operation id when the user presses Retry. The modal warnings can tell the user not to repeat while a checkpoint is pending **only while that document/UI remains alive**.

Navigation/reload/page close/extension update destroys:

- `state.pageUploadOperationId`;
- modal state/operation card;
- local knowledge of which physical attempt is currently unknown;
- any page-only retry suppression based on that old UI.

The physical checkpoint may correctly survive in IndexedDB.

This creates a discoverability gap rather than a durability gap.

## Deterministic page-loss schedule

1. Content document A starts Yandex upload physical generation RA.
2. Durable remote checkpoint RA is committed and transfer is admitted.
3. Outer result becomes unknown or page A navigates/reloads before terminal response.
4. RA remains durable and background recovery can later reconcile it.
5. New content document B has no old modal/operation id/receipt.
6. No current page-facing status API tells B that this tab/source/logical save has an unresolved RA.
7. User invokes WebClip again and sees a fresh operation surface.
8. Without discoverable RA/current logical-owner state, UI can offer/start a new retry/save generation RB even though RA remains unresolved, unless another subsystem-specific gate happens to reject it.

P1-210's rule “while A is unknown, ordinary retry must not silently create B” therefore requires a way for a **replacement page** to discover A.

## Same issue for local download unknown settlement

A durable `pendingDownloads` row can survive page/worker changes and background recovery may exact-search Chrome Downloads.

If the initiating content UI disappears, a fresh page cannot infer physical completion/non-completion from the Journal alone:

- absence of Journal entry does not mean file did not save;
- Chrome DownloadItem may still be pending/unknown;
- clear/import may intentionally detach old Journal authority while preserving physical receipt.

User-facing reconciliation needs a bounded representation of the exact pending/detached generation when relevant, not only silent hourly maintenance.

## Save As/backup have owner-specific discovery sources

Prepared Save As already has a durable active index/session store. P1-156 should use that index for worker/page reconstruction rather than requiring the old page's closure variables.

Backup has scheduler/status UI, but after the pending-generation multiplicity repair status must be able to distinguish current backup coverage from historical unresolved attempts. One singleton `lastError/lastSuccessAt` is not a complete physical-generation discovery surface.

The common principle is the same; implementation can remain subsystem-specific.

## Required discovery model

### Bounded subsystem status/query API

Expose a privacy-minimized worker-owned status/query surface that allows an authorized current extension/content context to discover physical generations relevant to its logical owner.

It need not expose all recovery stores or sensitive metadata.

Useful query keys/filters may include:

- exact worker-issued operation receipt when the page still has it;
- current tab + exact source-document/logical save family where safe;
- Journal entry/generation for extension-page actions;
- prepared Save As owner/session index;
- backup current/historical attempt class;
- explicit recent/detached physical operation view in Journal/Options when no content document owner remains.

The worker determines matches from authoritative durable receipts.

### Do not reconstruct identity from OperationLog alone

OperationLog can be cleared/retained independently. The prior operation-receipt/diagnostic-separation delta applies.

A missing log cannot make an unresolved physical attempt undiscoverable.

### Privacy minimization

A fresh arbitrary content document must not receive a global list of private operations/URLs.

Queries should return only the minimum status/receipt class appropriate to the caller and exact document/tab/site ownership rules. Extension pages may expose a broader user-controlled recovery/status view with redacted metadata.

### Generation-aware UI state

Replacement UI should distinguish:

- no relevant admitted attempt;
- in-flight/pending;
- outcome unknown/reconciliation running;
- verified physical result/local finalization pending;
- detached by Journal generation change;
- terminal success/failure where proven;
- diagnostic history unavailable.

Only “no admitted attempt/proven safe to retry” permits automatic fresh-generation behavior.

## Repair/reconciliation triggering

Discovery may optionally trigger one bounded reconciliation pass for the exact generation, but it must not start a new irreversible side effect.

If the state cannot be resolved immediately:

- display pending/unknown;
- background maintenance continues;
- allow explicit manual refresh/reconcile;
- do not create a polling/wake loop.

## Extension update/reload composition

P1-209 requires old extension pages to reload into the current runtime version. After that reload, they must be able to rediscover current durable operations rather than losing retry suppression simply because the old JS generation was intentionally discarded.

Worker-issued receipts/state schemas should be versioned/migratable enough that a new page generation can read bounded status for compatible outstanding physical attempts.

## Required regressions

1. Remote RA admitted -> content A reloads before result -> content B/status surface discovers RA pending/unknown and does not blindly create RB.
2. RA later verifies in background -> replacement UI refresh discovers verified/terminal result without old A operationId.
3. Local download pending -> content page closes -> fresh relevant UI can show/reconcile exact pending generation; absence of Journal success is not treated as safe retry proof.
4. Clear/import detaches RA -> replacement Journal/recovery view reports detached physical state while imported Journal remains untouched.
5. OperationLog is cleared while RA pending -> discovery still works from physical receipt; history is shown unavailable rather than “operation absent”.
6. Save As page crashes after STARTED -> worker reconstructs from active session index and replacement extension page can show/reconcile session state if product exposes it.
7. Backup has historical unresolved A plus current B -> status distinguishes generations/current coverage instead of collapsing them into one last result.
8. Unrelated content tab/site cannot enumerate another tab's/private operation metadata.
9. Same-URL reload does not inherit old retry authority automatically; discovery uses exact source/logical receipt rules and P0-023 document-generation policy.
10. A truly pre-admission failure leaves no physical receipt -> fresh retry is allowed after current-state check.
11. Reconciliation query timeout leaves status unknown and does not start a new physical generation.
12. Multiple relevant generations are presented/reconciled distinctly; aggregate `pending=2` alone is not used as exact ownership proof.
13. Worker restart does not erase discoverability because the authoritative index is durable, not module memory.
14. Resolved old receipts are retired/archived under bounded policy so discovery index does not grow without limit.

## Duplicate check

- **P1-210** primary: user-facing unknown-result reconciliation/retry admission.
- **P1-198** supplies worker-issued operation/generation identity.
- **P0-039/P0-048**, **P1-184**, **P1-156**, **P1-052/P1-207** retain physical subsystem truth.
- **P1-209** extension-page version reload must preserve ability to rediscover durable current work.
- OperationLog remains diagnostic only under P1-197/P1-205.

No P1-211 is assigned.

## Test / release state

Documentation only. Product tests were not rerun. Historical gate remains **88/88 JavaScript syntax + 74/74 deterministic PASS**. No runtime/manifest/build/tag/Release change was made.
