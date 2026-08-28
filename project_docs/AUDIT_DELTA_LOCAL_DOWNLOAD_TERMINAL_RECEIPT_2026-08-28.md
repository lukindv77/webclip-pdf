# Audit delta — exact local DownloadItem terminal receipt — 2026-08-28

Source-of-truth `main` immediately before this write: `8dc382e7adaa46d7ad3081c6e24b87802af8da4f`.

Docs-only audit checkpoint. Runtime/config/manifest/tests are unchanged.

## Classification

No new P-number is assigned.

Fresh review unifies existing **P0-039** and **P0-048** acceptance: a `chrome.downloads.onChanged` terminal-state delta is a **reconciliation trigger**, not a sufficient physical terminal receipt for Journal finalization or destructive checkpoint/resource cleanup.

Composed owners remain **P1-067** for Blob lifetime, **P1-146** for non-cancellable start settlement, **P1-087** for own-extension DownloadItem proof, **P1-198** for operation generation and **P0-079** for exact PDF generation ownership.

## Fresh source proof

### 1. Current global listener finalizes from state delta only

Current worker installs:

`chrome.downloads.onChanged.addListener(delta => ...)`

and, for any numeric id whose `delta.state.current` is `complete` or `interrupted`, immediately calls:

`finalizePendingLocalDownload(delta.id, state, delta.error?.current)`.

The listener does not first exact-read `chrome.downloads.search({ id })`.

### 2. Complete path writes Journal directly from pre-download checkpoint

`finalizePendingLocalDownload(id, 'complete')` loads `pendingDownloads[id]` and passes `pending.data` directly into `appendJournalEntryFromDurableCheckpoint(...)`.

That checkpoint was created before `chrome.downloads.download()` and contains WebClip's **requested** filename. It does not contain Chrome's final resolved physical basename.

Therefore the fast path can commit a successful Journal row without incorporating the strongest terminal DownloadItem evidence available after completion.

### 3. `conflictAction:'uniquify'` makes requested filename non-authoritative

Automatic download explicitly asks Chrome to `uniquify` conflicts. Hence a requested `name.pdf` may physically become `name (1).pdf`, etc.

The existing actual-filename delta already proves the user-visible metadata consequence. This pass makes the architectural requirement explicit: exact-item terminal read should be the shared source for both normal event-driven finalization and restart recovery, rather than maintaining weaker fast-path semantics.

### 4. Interrupted path needs an exact item for an even stronger reason

Current event listener also sends every `interrupted` delta directly to finalization/cleanup. The interrupted-lifecycle audit already proves that Chrome's exact DownloadItem can carry `canResume` and stronger bytes/error/state information.

Thus one coarse state delta currently drives:

- deletion/classification of durable recovery evidence;
- Blob URL release via a second onChanged watcher;
- user/log terminal semantics;

without requiring exact current DownloadItem inspection.

### 5. Recovery path already demonstrates the better pattern

For a checkpoint with a bound numeric `downloadId`, background reconciliation performs exact-id `chrome.downloads.search()` and verifies own-extension identity before using the item state.

This is a useful positive control. The fast terminal event path should converge on the same receipt semantics rather than becoming a weaker correctness path merely because an event arrived promptly.

### 6. Filename delta can arrive separately from terminal state

The listener ignores deltas without `state.current`. Even if Chrome emitted a filename change during collision resolution, WebClip does not retain it as part of the pending receipt. Terminal finalization still uses the original checkpoint filename.

A robust implementation should not depend on ordering/availability of separate filename deltas. Exact-id lookup at terminal reconciliation naturally obtains current resolved fields.

## Required unified contract

### Terminal event = wake signal

On `complete` / `interrupted` event:

1. identify the exact bound checkpoint generation for that numeric id;
2. perform bounded exact-id Downloads API read;
3. verify own-extension/binding identity and expected generation;
4. classify from the exact current item;
5. only then commit Journal success or terminal/resource cleanup.

If exact read times out/errors, preserve unresolved checkpoint and retry later. Do not convert API uncertainty into terminal proof.

### Exact completion receipt

For a proven own-extension completed item, retain only privacy-minimal required physical fields, including:

- numeric downloadId;
- requested basename separately;
- exact resolved basename extracted from `DownloadItem.filename` without persisting full filesystem path;
- terminal state;
- observed total/file byte evidence where meaningful;
- exact local intent/PDF generation receipts.

Journal should use the resolved basename when it claims a physical saved filename.

### Exact interruption receipt

For `interrupted`, use exact current state including `canResume`, error and relevant bytes. `canResume:true`, API timeout or missing/ambiguous item are not equivalent to proven non-resumable terminal failure.

Blob/body lease may expire under P1-067, but durable operation evidence must not be deleted merely because expensive source bytes are released.

### Same semantics in fast path and maintenance

Event-driven finalization and maintenance reconciliation must call the same classifier/commit primitive so timing does not decide correctness.

A fast event must not create a lower-evidence Journal row than the slower restart path.

## Deterministic regressions

1. Existing `name.pdf` causes Chrome `uniquify` to `name (1).pdf`; complete event arrives -> exact-id receipt records `name (1).pdf` basename in Journal.
2. Filename change delta is missed/reordered but complete state arrives -> exact terminal lookup still obtains correct basename.
3. Exact-id lookup times out after complete event -> checkpoint remains unresolved; no false Journal success until later proof.
4. Exact-id result is not own-extension / mismatches expected generation -> fail closed; do not consume checkpoint.
5. Interrupted event + exact item `canResume:true` -> checkpoint remains nonterminal and Blob/resource policy follows P1-067.
6. Interrupted event + exact item `canResume:false` -> no success Journal; terminal resource cleanup may proceed according to policy.
7. Interrupted event + exact read failure -> unknown, not terminal.
8. Worker misses event entirely -> maintenance reaches the identical exact receipt/finalization result.
9. Two same-name/same-size downloads with distinct numeric ids remain separate and get their own resolved basenames.
10. Full local filesystem path never enters Journal/export/OperationLog solely to achieve filename truth.
11. Outer response loss after physical completion remains P1-210: UI reconciliation observes the same exact terminal receipt and does not start a blind second download.
12. Clear/import removal of the exact checkpoint still prevents late terminal event from resurrecting stale Journal metadata.

## Numbering result

No new item. Primary owners remain **P0-039/P0-048**. P1-067/P1-146/P1-087/P1-198/P0-079 remain required adjacent layers.

## Test / release state

No product tests were rerun. Historical gate remains **88/88 JavaScript syntax + 74/74 deterministic tests PASS** as prior evidence only. No build, tag or Release was created.
