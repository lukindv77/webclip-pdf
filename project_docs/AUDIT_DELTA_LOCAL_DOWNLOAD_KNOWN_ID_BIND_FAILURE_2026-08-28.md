# Audit delta — known Chrome downloadId must survive durable bind failure — 2026-08-28

Source-of-truth `main` immediately before this write: `788424bff804d76e53503ee23fb4e299f34e6087`.

Docs-only audit checkpoint. Production runtime, tests, configuration and `manifest.json` are unchanged. No new P-number is assigned.

## Classification

Primary owner: **P0-048** — exact ownership/identity for local-download recovery.

Adjacent owners:

- **P1-146** — actual settlement of non-cancellable `chrome.downloads.download()` and durable intent lifecycle;
- **P1-194** — truthful durable recovery evidence/durability class;
- **P0-039** — unresolved physical local-save outcome must not lose its only recovery evidence.

This checkpoint does not allocate P1-211 or another new number.

## Fresh source proof

`checkpointPendingLocalDownloadIntent()` correctly persists an intent before the irreversible Chrome download call. At that point the recovery key is a generated string intent id and the strongest available physical identity is the exact Blob URL.

`startAutomaticBlobDownloadBounded()` later receives the actual result of `chrome.downloads.download()`.

When Chrome returns a valid numeric `downloadId`, WebClip calls:

`bindPendingLocalDownloadIntent(intentKey, downloadId)`

The normal bind is a useful positive control: one IndexedDB readwrite transaction deletes the string-keyed intent and puts a numeric-keyed `kind:'download'` record. A crash cannot leave only half of that successful key migration.

The defect is the **bind failure path after Chrome already returned the exact id**.

Current flow is equivalent to:

1. Chrome physically admits the download and returns numeric id `D`.
2. WebClip attempts to migrate durable intent `I` to key `D`.
3. IndexedDB bind throws or otherwise cannot produce a bound record.
4. Code catches the error and stores only an in-memory/string `bindWarning`.
5. The function still returns `{status:'started', downloadId:D, bindWarning}` to its caller.
6. The caller reports that background recovery will repair the checkpoint.
7. The old durable record remains keyed by `I`; it does **not** durably contain `D` as the authoritative Chrome receipt.

The operation log may record `downloadId`, but local-download recovery does not use OperationLog as correctness authority and must not depend on it.

## Why the fallback is weaker than evidence already observed

`reconcilePendingLocalDownloads()` treats an unbound intent by searching Chrome Downloads. Its primary match is exact stored Blob URL. If the browser no longer exposes the original Blob URL, the code falls back for a short window to `filename + expectedBytes`, currently taking the first matching own-extension DownloadItem. That fallback ambiguity is already the core of P0-048.

Therefore after WebClip has already observed exact numeric id `D`, a local IDB bind failure can downgrade future recovery from exact Chrome identity back to heuristic discovery.

This is avoidable evidence loss: the program knew the authoritative physical id but failed to preserve it in a recovery structure before returning a recoverable/partial state.

## Deterministic schedule

1. Durable intent `I` is committed before `downloads.download()`.
2. Chrome starts the download and returns `D=42`.
3. `bindPendingLocalDownloadIntent(I,42)` fails because of a transient IDB/transaction error.
4. Caller receives `bindWarning`; physical download 42 continues.
5. MV3 worker stops before a later successful bind/reconciliation.
6. On restart, durable store contains only `I` with Blob URL / filename / bytes and no exact `D=42` receipt.
7. If Chrome still exposes the Blob URL, recovery can rediscover 42; this is a useful best-case path.
8. If Chrome hides/normalizes the Blob URL, recovery falls back to filename+bytes and can hit P0-048 ambiguity even though exact id 42 had already been known before the crash.

A recovery design should not deliberately forget stronger identity and later attempt to infer it again from weaker observations.

## Required contract

Once `chrome.downloads.download()` returns a valid numeric id, that exact id becomes part of the immutable local-download operation receipt.

Before the operation is presented as safely background-recoverable, WebClip must retain a durable transition proving at least:

- original intent generation/id;
- exact returned numeric `downloadId`;
- operation id/generation;
- Blob URL and expected bytes as secondary corroborating evidence;
- whether the ordinary key migration completed.

Implementation options include:

- retrying only the **local durable bind** under a bounded actual-settlement owner while keeping `D` in an independent tiny bind-pending receipt;
- a two-phase record whose original intent row can durably acquire `knownDownloadId:D` before key migration;
- another atomic/indexed representation that guarantees the exact id survives process loss.

The important invariant is not the physical schema: **after exact `D` is observed, recovery must never become weaker merely because the preferred key migration failed.**

Do not automatically start another `downloads.download()` call. The physical start has already succeeded.

## Composition with existing P0-048 ambiguity

This does not replace P0-048's requirement that heuristic fallback:

- fail closed when zero or multiple candidates match;
- exclude already claimed `downloadId` values;
- never overwrite an existing bound checkpoint for another intent.

Instead it reduces how often the heuristic is needed. Exact ids already returned by Chrome should bypass fallback discovery entirely after restart.

## Required regressions

1. `downloads.download()` returns D; IDB bind succeeds -> one numeric durable checkpoint D, normal behavior.
2. `downloads.download()` returns D; first bind transaction fails -> exact D remains durable in bind-pending evidence.
3. Worker stops immediately after that failure -> restart reconciles exact D without filename+bytes discovery.
4. Same case with Chrome omitting original Blob URL -> exact D still recovers correctly.
5. Two same-name/same-size downloads exist -> known D is not confused with the sibling item.
6. Bind-pending durable write itself has unknown settlement -> retain explicit unknown/local-reconcile state; do not start a second physical download.
7. Existing checkpoint already owns D -> conflict is surfaced/fail-closed under P0-048; no overwrite.
8. Clear/import removes the operation's durable recovery generation -> late local bind cannot resurrect stale Journal metadata.
9. OperationLog missing/pruned -> correctness is unchanged because exact-id evidence is in the recovery state, not logs.
10. Browser history loss after exact D was known preserves the P0-039 dead-letter/manual-resolution semantics rather than falsely declaring no physical download.

## Duplicate check

Canonical P0-048 already owns ambiguous DownloadItem claiming and numeric-key overwrite. P1-146 owns late actual settlement of the Chrome download start. P0-039 owns loss of unresolved physical-save evidence.

This delta is the missing transition between them: **successful physical admission produced exact `downloadId`, but a failed durable key bind currently discards that stronger receipt across MV3 restart.** No new P-item is justified.

## Test / release state

Documentation only. Product tests were not rerun. Historical evidence remains **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. Runtime/version remain unchanged (`0.9.8`). No build, tag or GitHub Release was created.
