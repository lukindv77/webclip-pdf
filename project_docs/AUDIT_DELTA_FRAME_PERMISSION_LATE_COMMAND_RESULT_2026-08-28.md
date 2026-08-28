# Audit delta — optional frame permission generation vs late command result — 2026-08-28

Source-of-truth `main` immediately before this write: `9819f436231c1bf8630af4c2f5b52eab82864aa2`.

Docs-only audit checkpoint. Runtime/configuration/tests/manifest are unchanged. No new P-number is assigned.

## Classification

Fresh source proof refines existing **P1-201** optional-permission revocation lifecycle and composes with **P1-199/P1-200/P1-171** print/control/document generations.

The earlier P1-201 audit proves revocation can strand an already injected child and block ordinary cleanup. This pass isolates another boundary: **a command admitted while permission generation A was valid can settle successfully after A has been revoked, and current top/content code may still consume that late result as current state.**

No new root cause is needed.

## Current command admission checks permission only before send

Worker frame command flow usefully checks optional host permission immediately before sending a command to the stored child frame.

If permission is already absent, ordinary command is rejected and registry row may be removed.

This prevents a command from being newly admitted after known revocation.

It does not answer what happens when:

1. permission was valid at admission/send;
2. child command is already executing;
3. permission is revoked;
4. old command returns a success response afterward.

Permission revocation cannot cancel arbitrary already-running isolated-world JavaScript.

## Top command fanout accepts late success without permission-generation receipt

`content.js::commandMappedRemoteFrames()` awaits `targetRemoteFrame(remote, command, extra)` and, on success, simply pushes `{ remote, response }`.

The response carries no immutable permission generation that the top content script revalidates against current worker permission state.

For print, `prepareRemoteFramesForPrint()` then treats each successful response as current:

- adds `remote.frameId` to `state.remotePrintPrepared`;
- stores `response.documentHeight`;
- aggregates resource prefetch results.

There is no post-response proof that the permission generation under which `prepare-print` was admitted still exists.

## Deterministic revoke-during-prepare schedule

1. Origin O has optional permission generation A.
2. Remote frame F is selected and mapped under A.
3. Top starts `prepare-print(A)`; worker permission precheck passes and command reaches child.
4. Child sets `phase='printing'`, begins prefetch/style preparation.
5. User revokes O while the child command is still running.
6. Chrome/worker permission state is now generation B = revoked.
7. Child's already-running old A command finishes and returns `{ok:true, documentHeight, resourceReport}`.
8. Top receives the response and marks F `remotePrintPrepared` because no permission-generation check exists at result consumption.
9. The wider PDF preparation can continue using an artifact/result produced under revoked generation A unless a separate later failure happens to stop it.

The worker's initial permission check was correct at step 3; the missing rule is result-generation freshness at step 8.

## This is not fixed by event-driven cleanup alone

P1-201 should add `permissions.onRemoved` and invalidate top/child state promptly.

But event delivery and command response delivery can race. Correctness cannot depend on which callback arrives first in top content.

Even if a revocation notification usually clears `remoteFrames` quickly, an old Promise continuation may still hold a `remote` object and process its response afterward.

Therefore each async frame command/result needs an immutable capability/session generation and a final currentness check before publishing state.

## Permission generation belongs in the command receipt

A frame command receipt should bind at least:

- exact top document generation;
- exact child documentId/frame generation;
- permission origin/pattern + permission generation;
- remote selection/control session generation;
- command sequence/generation;
- print generation for prepare/restore where applicable.

The response is accepted only if all required generations are still current for the semantic effect it is about to publish.

For an ordinary user command, a revoked permission generation makes the old result stale even if child execution technically succeeded.

## Print-specific rule

`prepare-print` success means only “child preparation code completed under generation A.” It is not authorization to include that child in a PDF after A is revoked.

Before top marks `remotePrintPrepared` / before top-level PDF admission:

- verify current permission generation still equals A;
- verify exact child/top/session/print generation still equals receipt;
- mismatch => invalidate this prepared result and fail/abort the current selected-frame print according to P1-199/P1-201;
- perform cleanup-only rollback where safely possible without restoring ordinary access authority.

A revoked frame must not remain printable merely because preparation finished first.

## Selection/control result rule

The same principle applies to other commands that return state/results:

- restore locator result;
- get-state/list-driven synchronization;
- start/set-mode acknowledgements;
- remote frame measurements/state used to update top UI.

Late old-A success cannot resurrect a remote snapshot, counts or session after revocation/re-grant generation B.

## Re-grant makes the race stronger

Schedule:

1. command CA admitted under permission generation A;
2. revoke A;
3. re-grant same origin as new generation B;
4. start fresh B session;
5. old CA response arrives.

A simple current boolean `permissions.contains(origin) === true` would now pass again, but the response is still stale. Therefore post-result validation must compare **generation**, not only current yes/no permission.

This is why P1-201 needs explicit permission-generation issuance rather than repeated boolean checks alone.

## Cleanup-only result semantics

Revocation cleanup is special. A cleanup command authorized by the worker specifically to neutralize old generation A may be allowed to settle after permission is absent.

Its receipt must be marked cleanup-only and can only:

- remove listeners/markers;
- restore exact old print-owned temporary state;
- clear/quarantine old selection state;
- acknowledge teardown.

It cannot publish new page content/selection data or become authority for re-granted B.

## Required regressions

1. prepare-print admitted under A -> revoke before response -> late success is rejected as stale; frame is not marked current prepared.
2. Same sequence where revocation notification reaches top after command response callback -> final generation check still prevents current adoption.
3. Same sequence where notification reaches top first -> old Promise continuation cannot re-add stale prepared state.
4. A revoked then same origin re-granted B before old A response -> current permission boolean true is insufficient; A response remains stale.
5. Old A `get-state`/restore result after B session starts cannot replace B snapshot/counts.
6. Cleanup-only revocation command may settle after revoke and neutralize A but cannot create B selection authority.
7. Child navigates during command -> P1-171 exact document generation invalidates response independently of permission.
8. Print generation changes while old prepare runs -> P1-199 invalidates response independently of permission.
9. Permission for unrelated origin removed -> current O generation/result remains valid.
10. Revoke after all selected-frame preparation but before top debugger PDF admission -> final print admission rechecks permission generation and fails/omits according to explicit product policy; it never silently prints revoked frame state.
11. Revocation during restore-print does not allow old cleanup to roll back a newer re-granted print generation.
12. Real unpacked Chrome test races site-access revoke/re-grant against a deliberately delayed child prepare response.

## Duplicate check

- **P1-201** primary: permission generation/revocation lifecycle.
- **P1-199** exact remote print generation.
- **P1-200** remote selection/control command sequencing.
- **P1-171** exact top/child document identity.
- **P1-193** user-gesture/request admission; a valid original grant does not make late results timeless.

No P1-211 is assigned.

## Test / release state

Documentation only. Product tests were not rerun. Historical gate remains **88/88 syntax + 74/74 deterministic PASS**. No build/tag/Release was created.
