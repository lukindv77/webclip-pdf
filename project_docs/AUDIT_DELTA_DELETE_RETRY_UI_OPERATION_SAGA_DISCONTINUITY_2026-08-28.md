# Audit delta — Delete→Trash Retry UI starts a fresh operation identity instead of resuming the prior move saga — 2026-08-28

Source-of-truth `main` before this checkpoint: `a4be2861778f77f7b414c55bb064f0c315e848ca`.

Docs-only audit checkpoint. Runtime/tests/configuration/manifest are unchanged.

## Classification

No new P-number is assigned.

Fresh current-source proof strengthens the existing **P1-183/P1-090** Retry requirement and composes with **P1-198/P1-210**, **P0-076**, **P0-074** and **P0-069**.

The previous delete-fallback audit already states the required behavior: Retry after an unknown Trash move must consume/reconcile the same durable operation generation and exact target before any new move is admitted. This checkpoint proves that the current Journal UI does the opposite at its correlation boundary: **every Retry click creates a new operation id before sending the same stale entry/diskAction again.**

## Current Retry is wired as a new invocation

`deleteRetry` is permanently wired to:

`runDeleteOperation(deleteRetryAction)`.

`runDeleteOperation(diskAction)` begins from the page's retained `pendingDeleteEntry` and, on every invocation, executes:

`activeDeleteOperationId = crypto.randomUUID() ...`

It then sends:

`WEBCLIP_JOURNAL_DELETE { id: entry.id, diskAction, operationId: activeDeleteOperationId }`.

Therefore Retry is not represented as `resume/reconcile prior delete generation A`. It is represented as another newly labeled delete operation B against the same textual entry id.

## The error UI retains action kind, not a durable physical-move receipt

After an error current Journal state retains enough information to show:

- the entry object in `pendingDeleteEntry`;
- `deleteRetryAction`, commonly `trash`;
- the textual operation id of the failed attempt for display.

But the Retry callback does not return an exact move-attempt receipt to the worker.

It supplies only the new B operation id + entry id + action.

The worker therefore has no page-provided way to know that B is specifically a reconciliation continuation of physical move attempt A rather than a new independent delete request, except by future durable subsystem state that has not yet been implemented.

## Trash target is recomputed inside each worker invocation

Current Trash flow calls `moveJournalYandexFileToTrash(entry, operationId)`.

The collision-resolved target is chosen in memory. `chooseYandexTrashTarget()` can generate timestamp-suffixed names such as:

`<base>__deleted_<YYYY-MM-DD_hh-mm-ss>...<ext>`.

There is still no durable exact target checkpoint before `POST /resources/move` as required by P1-183.

Thus a fresh Retry invocation B may compute a different target from A simply because time/current Trash contents changed.

## Deterministic two-target schedule

1. User starts Trash A for entry E.
2. A chooses target T1, including a collision suffix if needed.
3. `POST resources/move S -> T1` is transmitted.
4. Yandex commits or may commit the move, but WebClip loses/times out waiting for authoritative settlement.
5. Journal shows error + Retry.
6. User clicks Retry.
7. `runDeleteOperation('trash')` creates brand-new textual operation id B.
8. Worker starts a fresh delete lifecycle for E rather than receiving `resume A / reconcile T1`.
9. If source lookup still resolves or provider state is ambiguous, current target selection can choose T2 under a later timestamp/collision state.
10. WebClip has now lost the one-to-one relationship between the first unknown physical move and its target.

The provider may make some branches fail because S already disappeared, but correctness cannot rely on that incidental result. Unknown settlement requires exact first-target reconciliation before any new destructive admission.

## New `operationId` is useful for a new user operation but insufficient for saga continuity

It is reasonable for a second visible click to receive a fresh P1-198 user/live operation receipt RB for diagnostics.

The error is not `Retry must reuse the same human-readable operationId forever`.

The required model is:

- physical delete/move saga A keeps immutable receipt MA with source S, exact target T1, object identity, namespace and privacy state;
- Retry user operation RB explicitly references `reconcile/resume MA`;
- RB first performs reconciliation of MA;
- if MA is proven successful, RB can finish local Journal work without a new move;
- if MA is authoritatively proven not to have happened, RB may admit a distinct new physical move MB with a new exact target;
- MA is never relabeled or overwritten as RB.

This matches the operation-receipt lineage delta recorded earlier in this session.

## Retained page entry is also stale authority

`pendingDeleteEntry` remains the entry object captured when the dialog was opened.

The separate destructive-confirmation-lifetime audit already requires expected Journal/entry revision CAS because another page/import can replace the textual id while the dialog remains open.

Retry compounds that issue: a Retry click after a long error interval must carry both:

- exact prior move saga receipt to reconcile;
- expected Journal entry generation/authorization for any local finalization or new destructive attempt.

Fresh-reading current entry by id cannot silently retarget the old saga/user confirmation to a replacement object.

## Retry action classification must come from worker settlement state

Current UI stores `deleteRetryAction` as the requested action string.

Future design must not decide retry policy solely from `diskAction='trash'` plus generic error.

Worker result should expose a durable class such as:

- `pre-side-effect-failure`;
- `move-outcome-unknown / reconcile MA`;
- `move-verified / Journal-finalization-pending`;
- `privacy-unpublish-outcome-unknown`;
- `stale Journal generation`;
- `detached/manual-resolution`.

The Retry button then invokes the allowed continuation for the exact receipt rather than rerunning the original high-level command from scratch.

## Page loss/reopen

Because the physical move receipt must be durable, closing/reloading Journal after error cannot make a future Retry start from only entry id.

A replacement page needs the P1-210 discovery surface to find the unresolved delete saga for E/generation and present `Continue verification`/manual state.

If no exact receipt can be recovered, fail closed; do not recreate a destructive target by guessing from the current Journal row.

## Publication composition

If E was published, the delete saga also owns the explicit keep-public/unpublish outcome required by P0-069.

Retry B must not lose that privacy decision merely because it gets a new visible operation receipt. The prior physical/privacy saga remains parent state until both publication and move/local-finalization outcomes are classified.

## Required deterministic regressions

1. A chooses T1 -> move response lost -> Retry B: B reconciles exact T1 before selecting/sending any T2.
2. A physically succeeded -> B proves same object at T1 and performs only remaining local/privacy finalization; no second move.
3. A authoritatively did not start -> B may create a new physical move generation with its own durable target before POST.
4. UI gives B a fresh user operation receipt -> OperationLog shows B reconciled A rather than relabeling A's physical move.
5. Page reload between A error and Retry -> exact A saga remains discoverable or Retry fails closed; it does not start by entry id alone.
6. Import replaces entry id E between A and Retry -> A can be reconciled detached but cannot delete/move replacement E/B.
7. Reauth/root change between A and Retry -> A remains bound to historical namespace; B cannot reconcile A by current account/root substitution.
8. Published source -> unpublish/move unknown state survives Retry identity change.
9. Multiple user clicks while A outcome unknown coalesce onto one reconciliation owner; they cannot create multiple physical moves.
10. A deterministic provider rejection before side-effect admission produces a safe new-attempt state without retaining a false unknown move.

## Duplicate check / numbering

No new item is created.

- **P1-183** owns durable Delete→Trash source/target saga.
- **P1-090** owns exact move settlement/object identity.
- **P1-198/P1-210** own user-operation receipt lineage and unknown-result retry/reconciliation surface.
- **P0-076** owns stale Journal entry-generation authority.
- **P0-074/P0-069** own Yandex namespace and publication/privacy lifecycle.

This checkpoint adds concrete current-UI proof that Retry starts with a new operation identity and no continuation receipt; it does not duplicate the broader fallback finding.

P1-211 remains unassigned.

## Test / release state

No product tests were rerun. Historical **88/88 syntax + 74/74 deterministic PASS** remains prior evidence only. No runtime/build/tag/Release change was made.
