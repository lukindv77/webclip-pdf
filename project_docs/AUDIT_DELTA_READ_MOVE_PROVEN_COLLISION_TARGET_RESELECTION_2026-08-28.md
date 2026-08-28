# Audit delta — ReadLater move proven-collision target reselection — 2026-08-28

Source-of-truth `main` immediately before this write: `059fc525110295085c55d941bf1903b8b82de502` plus later docs-only audit commits in this session; production runtime remains unchanged.

Docs-only audit checkpoint. Runtime/configuration/tests/manifest are unchanged. No new P-number is assigned.

## Classification

Fresh source proof refines existing **P1-090 — exact Yandex source/target move reconciliation**.

This is distinct from P1-183 Delete→Trash: ReadLater→Upload already has the stronger positive control of persisting exact `readMoveSourcePath/readMoveTargetPath` before the destructive move. The remaining issue is what happens when that chosen target is later **proven unusable without any successful move**.

## Positive control — target is durably selected before destructive move

`moveReadLaterEntryToRead()`:

1. locates current source object;
2. builds/ensures Upload target folder;
3. chooses a free target via `chooseAvailableTargetPath(...)` unless an existing checkpoint target is being resumed;
4. persists `readMovePendingAt`, `readMoveSourcePath`, `readMoveTargetPath`, `readMoveOperationId` on the Journal entry;
5. only then issues `POST /resources/move` with `overwrite=false`.

This is exactly the crash-consistent ordering missing from Delete→Trash P1-183 and must be preserved.

## Fresh liveness defect — a stale occupied checkpoint target is reused forever

On every later invocation, if `entry.readMoveTargetPath` is non-empty and lies inside the current target Upload folder, the code directly reuses it:

`targetPath = checkpointTargetPath`

without re-running `chooseAvailableTargetPath()`.

The catch path also rewrites the same `checkpointTargetPath` back into the entry after an error.

### Deterministic collision schedule

1. Source S is in ReadmeLater.
2. WebClip checks Upload target T and observes 404/free.
3. WebClip durably checkpoints source S + target T.
4. Before WebClip's move request is accepted, another actor creates unrelated object Q at T.
5. `POST /resources/move(from=S,path=T,overwrite=false)` returns an authoritative collision/conflict in a way that proves this attempt did not move S to T.
6. Catch retains checkpoint target T.
7. User retries Mark Read later.
8. Exact source locate still finds S; target T still contains Q and does not match S's exact identity.
9. Because checkpoint T belongs to Upload, WebClip reuses T instead of selecting a new free target T2.
10. Move fails with the same collision again.
11. Every subsequent retry repeats T until external Q is removed manually.

The durable target that is necessary under unknown settlement becomes a permanent liveness pin after **proven non-move** settlement.

## Unknown settlement and proven collision require different policies

Do not fix this by always picking a new target after any move error.

If the POST outcome is unknown, T must remain frozen:

- S may already have moved to T;
- choosing T2 could create a second move attempt before the first is reconciled;
- exact P1-090 source/target identity verification must classify the old attempt first.

But when WebClip has authoritative evidence that the old move did **not** happen and T is occupied by a different object, old T is no longer a required recovery target. It is a failed attempt receipt.

P1-090 therefore needs explicit attempt classes:

- `target-selected / move-not-started`;
- `move-may-have-started / outcome-unknown`;
- `target-conflict-proven / no-move`;
- `move-verified`;
- `inconclusive`.

Only a proven-no-move collision may retire T and select a fresh target generation.

## Required target-generation contract

A target path is not merely a string on the Journal row; it belongs to one move attempt generation.

When T is retired after proven non-move:

1. keep the old attempt outcome for diagnostics/reconciliation as needed;
2. advance a move-attempt/target generation;
3. re-run bounded free-name selection to choose T2;
4. persist S + T2 + expected source object identity before issuing the new POST;
5. a late result from old attempt T cannot satisfy/update T2 generation.

If the API error does not prove no move occurred, do not reselect automatically.

## Exact object identity remains mandatory

A target collision Q at T must be distinguished using the source object receipt required by P1-090:

- if source exact `resource_id=R`, Q with id Q != R proves T is not the intended post-state;
- existence of a generic file at T is never success;
- filename/size equality is not enough;
- if source/target state remains ambiguous, retain old T and report unresolved rather than blindly moving to T2.

## Local Journal generation remains separate

Even after a later T2 move succeeds, final `readingMode='read'` commit still needs P0-076 expected Journal entry generation/CAS. Import/replace of the same textual entry id cannot be mutated by the old move saga.

## Required regressions

1. T free -> checkpoint T -> exact move succeeds -> verify exact source identity at T -> normal completion.
2. T free -> checkpoint T -> external Q occupies T -> POST returns authoritative no-overwrite conflict with S still at source -> T is retired and later attempt may choose T2.
3. Same conflict but POST outcome is transport-timeout/unknown -> T remains frozen; no T2 move is issued before reconciliation.
4. T contains Q equal filename/size but different resource id -> never treat Q as successful move.
5. Retry after proven collision chooses a fresh bounded target generation rather than looping forever on T.
6. Late old-T response/result cannot update the newer T2 generation.
7. Continuous collisions hit bounded target-selection/retry policy and surface a controlled error, not unbounded remote requests.
8. Worker dies after T2 checkpoint but before POST -> T2 remains the recovery target.
9. Existing already-in-Upload exact source object remains idempotently recognized without unnecessary rename.
10. Import/replacement of the Journal entry during the saga blocks stale local finalization under P0-076.

## Duplicate check / numbering

No new P-number is created.

- **P1-090** remains the primary owner for exact source→target move attempt/reconciliation and now explicitly distinguishes unknown settlement from proven-no-move collision target retirement.
- **P1-183** remains Delete→Trash's missing durable target checkpoint; it is not duplicated here.
- **P0-076** remains local finalization generation/CAS.
- **P0-073/P0-074** remain Yandex namespace/context fencing.

P1-211 remains assigned to deleted Journal comment tombstone lifecycle.

## Test / release state

Documentation only. Product tests were not rerun. Historical gate remains prior evidence only: **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. No build, tag or GitHub Release was created.
