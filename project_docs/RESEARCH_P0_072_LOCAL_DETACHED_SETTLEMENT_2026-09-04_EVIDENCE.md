# P0-072 — local download detached settlement / terminal transition refinement — 2026-09-04

Date: 2026-09-04  
Canonical source baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Working branch entering this block: `research/p0-072-recovery-quarantine-2026-09-04 @ 485106064f653e0f9c3cef8cfc9c25ab10ce3c8c`  
Deterministic model commit: `c122821202f279993efecc3dfca3982740f998ac`  
Owner: **P0-072 ACTIVE**.

This checkpoint refines how a reset-detached local-download row settles after the reset. It does not change runtime and does not claim P1-146 closure.

## 1. Fresh current-source call-site audit

`removePendingLocalDownload()` is currently a key-only unconditional delete. It is used from six materially different paths:

1. automatic-start concurrency cap is already full, before `chrome.downloads.download()` is called;
2. synchronous failure while creating the Chrome download start promise;
3. actual `chrome.downloads.download()` promise rejection;
4. a resolved start value that is not a valid nonnegative integer DownloadItem id;
5. successful `complete` finalization after Journal append;
6. terminal `interrupted` handling.

The current helper has no way to distinguish these physical states.

After P0-072, replacing the helper with only `if (quarantined) do not delete` is insufficient: it preserves evidence, but leaves rows permanently classified as reconciling even when the caller already knows a factual terminal outcome.

## 2. Chrome's official download contract

Current Chrome Extensions documentation states:

- `chrome.downloads.download(options)` returns `Promise<number>`;
- when the download is successfully started, the callback/Promise result is the new `DownloadItem` id;
- if an error occurs while starting the download, the operation reports an error instead;
- DownloadItem state distinguishes `in_progress`, `interrupted`, and `complete`.

Reference checked 2026-09-04:

https://developer.chrome.com/docs/extensions/reference/api/downloads

This supports keeping actual start rejection, complete and interrupted as distinct factual outcomes. A caller-side timeout remains different: it is not the actual Promise settlement.

## 3. Reset cannot infer whether an `intent:*` has already crossed Chrome admission

Current durable local intent is written before `chrome.downloads.download()`.

There is then a real interval where the row still has:

```text
kind = intent
```

but the Chrome call may already have been issued and its Promise may not yet have returned the numeric id.

Therefore reset itself must classify a matching `intent:*` conservatively as:

```text
outcome = pending
resolution = reconciling
```

It must **not** mark every intent `cancelled-before-start` merely because no numeric DownloadItem has been bound yet.

A dedicated caller path may later prove that the Chrome call was never made.

## 4. Proven pre-start cancellation is a terminal fact

The current automatic-start concurrency-cap branch runs before `chrome.downloads.download()`.

If that branch executes after reset quarantined the intent, the operation can truthfully transition the detached row to:

```text
outcome = cancelled-before-start
resolution = terminal
```

The same applies to a synchronous exception raised before a Chrome start request is actually admitted.

This terminal receipt may later be compacted under the dedicated terminal-retention policy. It should not remain in the active/reconciling class forever.

## 5. Actual Promise rejection is not caller timeout

The actual `chrome.downloads.download()` Promise may settle with an error after the caller has already timed out locally.

Required distinction:

- caller timeout -> outcome remains `pending` / reconciling until actual settlement or later exact reconciliation;
- actual start Promise rejection -> outcome `start-rejected` / terminal under the Chrome API contract;
- neither state is represented as `complete` or `interrupted`.

Do not let an old timeout handler manufacture `cancelled-before-start` while the underlying Chrome Promise is still live.

This preserves the P1-146 unknown-settlement boundary.

## 6. Invalid resolved DownloadItem id is a defensive anomaly, not proof of no side effect

Current code deletes the durable intent if the resolved value is not a valid nonnegative integer.

The official API contract says successful start resolves to a numeric DownloadItem id. Therefore an invalid resolved value is outside the documented success contract.

For defensive P0-072 semantics, a reset-detached intent in this state should be treated conservatively:

```text
outcome = unknown
resolution = manual-resolution
```

It must not be labeled `cancelled-before-start`, because the call did cross the async Chrome API boundary and the result is anomalous.

Whether the non-reset runtime should also retain such anomalous intent is adjacent **P1-146** work and is not claimed closed here.

## 7. Numeric bind is a key migration and must merge reset authority

`bindPendingLocalDownloadIntent(intentKey, downloadId)` currently performs one IndexedDB transaction:

- get intent;
- get numeric target id;
- if target absent: `delete(intentKey)` + `put({...intent, downloadId, kind:'download'})`;
- if target exists for the same operation: delete the intent and return the existing numeric row;
- if target belongs to another operation: fail closed.

The normal absent-target branch already structurally spreads the intent, so a top-level reset disposition can survive.

The same-operation-existing branch needs an explicit merge rule after P0-072:

- if either survivor or intent has a reset disposition, the surviving numeric row must retain it;
- if both carry the same reset id, retain that identity;
- if both somehow carry conflicting reset ids, fail closed rather than choose one silently;
- a detached intent cannot be deleted in favor of an active same-operation row that loses its reset barrier.

This is a transaction-local authority merge, not a new P0-048 identity heuristic.

## 8. Complete and interrupted after reset are terminal evidence

Current `finalizePendingLocalDownload()` receives exact factual state from Chrome.

When the row is reset-detached:

### `complete`

- never append/recreate Journal;
- transition detached outcome to `complete`;
- resolution becomes `terminal`;
- do not perform ordinary unconditional row delete.

### `interrupted`

- never append Journal;
- transition detached outcome to `interrupted`;
- resolution becomes `terminal`;
- preserve until terminal retention/compaction allows removal.

### still unknown

- transition/retain `unknown` + `manual-resolution` according to P0-039/P1-146 semantics;
- never age-delete as if no physical effect happened.

`complete`, `interrupted`, `start-rejected`, `cancelled-before-start`, and `unknown` remain distinct outcomes.

## 9. Exact race: append success -> reset -> old cleanup

The existing race remains an important direct acceptance case:

1. DownloadItem is complete.
2. Journal append transaction succeeds while local checkpoint is still active.
3. Before `removePendingLocalDownload()`, reset transaction deletes the just-appended Journal row and quarantines the local checkpoint.
4. Old finalizer resumes with factual knowledge `state=complete`.

Correct P0-072 result:

- old cleanup does not delete the quarantined row;
- it advances detached outcome to `complete/terminal`;
- replacement/cleared Journal stays untouched.

Merely skipping delete would leave false reconciling state; unconditional delete would lose the reset receipt.

## 10. Structured append result is necessary for cleanup

`appendJournalEntryFromDurableCheckpoint()` currently collapses a no-append result to `cancelled:true` with wording that the checkpoint was deleted by clear/import.

After quarantine, downstream local cleanup needs a machine-readable distinction such as:

```text
journalOutcome = appended | suppressed-missing | suppressed-reset-detached | warning
```

Required behavior:

- `appended` + current active row -> ordinary compare-and-delete may run;
- `suppressed-reset-detached` -> factual state updates disposition, no Journal append and no ordinary delete;
- `suppressed-missing` -> truthful warning/data-loss state, never fabricated cancellation;
- warning -> preserve existing recovery semantics.

This structured result is also useful for remote-save finalization.

## 11. Deterministic model

Added:

`project_tools/test_p0_072_local_detached_settlement_model.js`

Local Node result before durable write:

```text
P0-072 local detached settlement model: PASS
```

The model proves:

1. reset cannot infer that `intent:*` is pre-start merely from absence of numeric id;
2. proven pre-Chrome-call cancellation can become terminal `cancelled-before-start`;
3. actual Promise rejection is distinct from caller timeout;
4. invalid resolved id fails conservatively to unknown/manual;
5. late numeric bind preserves reset disposition;
6. same-operation existing numeric row inherits intent reset authority;
7. conflicting reset generations fail closed;
8. complete after reset becomes retained terminal evidence and cannot append Journal;
9. interrupted after reset becomes retained terminal evidence;
10. reset between append and old cleanup records the already-known complete fact instead of deleting or leaving reconciling state.

The model is not a committed-runtime PASS.

## 12. P1-146 boundary

This research deliberately does not claim to close all automatic-download start uncertainty.

P1-146 remains ACTIVE for the broader rule that the non-cancellable browser start must survive caller timeout/restart without duplicate start and with exact actual settlement.

P0-072 only requires that once a reset disposition exists:

- uncertainty is not renamed cancellation;
- exact later facts update the detached receipt;
- no late fact regains Journal append authority;
- cleanup cannot destroy the last reset evidence.

## 13. Runtime acceptance additions

Add direct deterministic cases:

- reset hits intent before numeric bind -> retain reconciling;
- busy branch after reset -> terminal `cancelled-before-start`;
- caller timeout after reset -> remain reconciling;
- actual Promise rejection after reset -> terminal `start-rejected`;
- invalid resolved id after reset -> unknown/manual, no delete;
- numeric bind after reset preserves reset id;
- same-operation existing numeric row cannot drop intent reset id;
- conflicting reset ids fail closed;
- complete after reset -> terminal complete, no Journal append;
- interrupted after reset -> terminal interrupted;
- append-success/reset/cleanup race -> terminal complete receipt remains.

## 14. Status

P0-072 remains **ACTIVE**. Runtime and manifest are unchanged by this checkpoint. Manifest remains `0.9.8`; release remains `NOT READY`; no Actions/build/tag/Release is claimed.
