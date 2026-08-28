# Audit delta — Prepared Save As STARTED commit ordering — 2026-08-28

Source-of-truth `main` immediately before this write: `00d756b486623c357a405e0fd105379f9cb3770c`.

Docs-only audit checkpoint. Runtime/configuration/tests/manifest are unchanged. No new P-number is assigned.

## Classification

Fresh source proof refines existing **P1-156** native Save As lifecycle ownership, with **P1-169** for RELEASED cleanup and **P1-210** for unknown outer-control settlement.

The existing Save As audit already proves the crash window where Chrome returns a `downloadId` but the page dies before STARTED reaches the worker. This pass finds the inverse ordering problem **inside the worker STARTED handler**: worker-side terminal cleanup authority is armed before the durable STARTED transition is committed.

No new root cause is needed.

## Page handoff

`prepared-save-as.js::start()` correctly leaves `chrome.downloads.download({saveAs:true})` without an artificial timeout. After Chrome returns numeric D it:

1. arms a page-local terminal listener;
2. sends `WEBCLIP_PREPARED_SAVE_AS_STARTED { blobUrl, saveAsSessionId, downloadId:D }`;
3. ignores STARTED message failure because page-owned cleanup remains available.

The page therefore treats STARTED as a secondary worker-recovery handoff, not the physical browser-start authority itself.

## Worker STARTED handler currently arms cleanup before durable STARTED

Current service-worker handler validates sender/path/session/downloadId and then does, in this order:

1. `revokeBlobUrlWhenDownloadFinishes(downloadId, blobUrl)`;
2. `await markPreparedSaveAsStarted({ sessionId, blobUrl, ownerPage, downloadId, ... })`.

`revokeBlobUrlWhenDownloadFinishes()` installs worker module-memory `downloads.onChanged` / watchdog cleanup ownership immediately.

The durable STARTED checkpoint is written only afterward.

Therefore the in-memory worker begins acting as though STARTED is authoritative before the durable state machine has accepted that transition.

## Deterministic failed-commit schedule

1. PREPARED session S/blob B is durable.
2. Native Save As returns DownloadItem D.
3. Page sends STARTED S/B/D.
4. Worker validates the message and arms `revokeBlobUrlWhenDownloadFinishes(D,B)`.
5. `markPreparedSaveAsStarted()` then fails deterministically — for example because RELEASED won, PREPARED is missing/corrupt, owner/session receipt mismatches after the final P1-156 repair, or durable storage mutation cannot commit.
6. Handler rejects; page catches/ignores the failure as designed.
7. Worker watcher remains armed despite no authoritative STARTED transition.
8. D reaches terminal state and watcher revokes B/executes cleanup behavior.
9. Durable session state may still be PREPARED or RELEASED/missing, so runtime cleanup authority and durable lifecycle truth disagree.

The exact consequences depend on which durable failure occurred, but the invariant violation is clear: a state-dependent resource owner was installed before the state transition that authorizes it.

## Timeout case needs actual-settlement semantics, not reordering by caller deadline

Chrome Storage mutation timeout is not cancellation. If `markPreparedSaveAsStarted()` times out locally but its actual mutation later commits, the correct behavior is not to assume PREPARED forever.

P1-156 therefore needs two notions:

- logical STARTED response to the page may be `unknown` after deadline;
- actual durable STARTED transition settlement remains serialized/observable and owns later worker reconciliation.

Worker terminal watcher/recovery should attach to the **actual committed generation**, not merely to the fact that a STARTED request arrived.

## Required commit-point ordering

Preferred state-machine shape:

1. receive exact S/B/D transition request;
2. transaction/CAS validates PREPARED S generation and absence of authoritative RELEASED;
3. durably commit STARTED with exact D and immutable PREPARED receipt linkage;
4. only after actual STARTED commit, arm/reconstruct worker DownloadItem reconciliation for D;
5. immediately exact-read D once so a terminal transition that occurred before listener installation cannot be missed;
6. listener is a fast path; durable STARTED + exact-id search is the recovery authority.

If terminal D occurred between steps 3 and 4, step 5 catches it. This removes the perceived need to install the watcher before the durable commit.

## RELEASE race

RELEASED remains the stronger terminal/tombstone state.

If RELEASE wins before STARTED CAS:

- STARTED is rejected as stale;
- worker must not newly arm cleanup authority from the rejected STARTED message;
- cleanup/revoke is derived from the stored RELEASE generation.

If STARTED commits first and RELEASE follows:

- RELEASE operates on exact S/B/D receipt;
- any worker watcher becomes idempotent and may observe that RELEASE already settled.

A late STARTED request can never reactivate or create side effects after RELEASED solely because its handler installed a listener before checking durable state.

## Page listener remains a fast path

The page-local `onChanged` listener can still race with worker reconciliation. That is acceptable when RELEASE is idempotent/generation-exact.

The page listener must not be the only terminal receipt because page lifecycle can disappear. Conversely, the worker watcher must not exist as authoritative state before durable STARTED exists.

## Exact DownloadItem read after STARTED commit

This pass adds an important acceptance detail to prior P1-156 work.

Installing a listener after durable STARTED is safe only when accompanied by an immediate bounded exact `chrome.downloads.search({id:D})` reconciliation, because D can become terminal before the listener is installed.

Classify exact current D as:

- in progress/paused -> keep owner/watch;
- complete -> RELEASE/final cleanup exactly once;
- interrupted -> apply the chosen terminal/resumable policy;
- missing/API unknown -> retain STARTED unresolved and retry bounded reconciliation rather than claiming terminality.

## Required regressions

1. STARTED request arrives, durable CAS rejects because RELEASED already exists -> no new D watcher/resource authority is installed from rejected STARTED.
2. STARTED durable write fails before commit -> durable PREPARED remains; worker does not behave as authoritative STARTED merely because request arrived.
3. STARTED mutation caller times out but actual commit later succeeds -> actual settlement eventually establishes worker reconciliation without a second physical download.
4. STARTED commits; D completes before listener installation -> immediate exact-id read observes terminal D and releases correctly.
5. STARTED commits; listener installs; page closes -> worker/restart recovery remains sufficient.
6. Worker restarts after STARTED commit -> reconstruct reconciliation from durable S/D, not old module-memory watcher.
7. Page and worker both observe terminal D -> exact RELEASE generation is idempotent; no double revoke corrupts newer session.
8. RELEASE commits while STARTED actual mutation is queued -> serialized/CAS state cannot be reversed by a late old STARTED write.
9. STARTED message fields mismatch immutable PREPARED blob/owner/operation generation -> reject before installing watcher or touching unrelated Blob.
10. Native dialog remains unbounded before D exists; this ordering fix does not introduce a pre-STARTED wall-clock timeout.
11. Missing D after worker restart remains unresolved/reconcilable according to P1-156 instead of deleting session from one failed search.
12. Active-index accounting follows durable PREPARED/STARTED/RELEASED state, not module-memory watcher presence.

## Duplicate check

- **P1-156** remains the primary owner for PREPARED→STARTED→RELEASE Save As lifecycle.
- **P1-169** owns RELEASED tombstone/sibling cleanup.
- **P1-210** governs unknown outer runtime response; it does not define Save As state-machine commit order.
- **P1-067** remains post-started Blob/download resource-bound policy and must not impose a native-dialog timeout.

No new P1-211 is assigned.

## Test / release state

Documentation only. Product tests were not rerun. Historical gate remains **88/88 syntax + 74/74 deterministic PASS**. No build, tag or GitHub Release was created.
