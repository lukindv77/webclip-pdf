# Audit delta — hostile remote-frame print/control interaction revalidation — 2026-08-28

Source-of-truth `main` immediately before this write: `4e85e09f36c8981fe38af90a5f12af324b0bd3f5`.

Docs-only audit checkpoint. Production runtime, tests, configuration and `manifest.json` are unchanged. No new P-number is assigned.

## Classification

Fresh current-source proof strengthens the intersection of existing owners rather than establishing an independent root cause:

- **P0-075** — host DOM/control-plane trust and page-visible selection markers;
- **P1-199** — cross-origin print-operation generation/prepare→restore ownership;
- **P1-200** — remote selection/control session generation and child-local lifecycle events;
- **P1-203** — child agent state surviving/loss of worker-generation authority;
- **P1-167** — bounded selected-content preprocessing/remote image enumeration;
- **P0-071** — exact printed representation safe URI/link boundary.

No P1-211 or new P0 is allocated.

## 1. Child Escape can race an already-running async `prepare-print`

Current `frame-agent.js::preparePrint()` does:

1. `state.phase = 'printing'`;
2. `await prefetchSelected()`;
3. compute document height;
4. create and append `PRINT_STYLE_ID`;
5. store `state.printStyle`;
6. return success.

The child `keydown` handler is independent. For any `state.phase !== 'idle'`, Escape immediately:

- sets `state.phase='idle'`;
- removes click/keydown listeners;
- sends an idle state event.

It does not invalidate an in-flight `preparePrint()` generation.

Deterministic schedule:

1. valid top session sends `prepare-print(A)`;
2. child enters `printing` and awaits a slow image decode in `prefetchSelected()`;
3. user presses Escape while focus remains in the child frame;
4. child reports `idle` and removes listeners;
5. async prefetch A later resolves;
6. the old `preparePrint(A)` continues and mounts print CSS despite the local lifecycle having moved to idle;
7. it returns `{ok:true}` to the old command.

This is stronger than a simple UI phase mismatch: an already superseded control decision can still mutate the actual representation used for PDF.

### Ownership

- P1-200 must make the Escape/local phase transition generation-bound and authoritative rather than an unversioned independent writer.
- P1-199 must make `prepare-print(A)` validate that its print generation is still current after every awaited phase and before committing print-owned DOM mutations.
- P1-203 remains relevant if worker restart occurs inside the same window.

Do not implement this as cancellation-by-timeout. The late async task may continue; generation fencing must make its late commit harmless.

## 2. Escape during/after printing still does not rollback print-owned mutations

Existing P1-203 source proof remains current: the Escape handler sets phase idle/removes listeners but does not call `restorePrint()` and does not restore `changedAttrs` or remove `state.printStyle`.

Therefore Escape after resource mutations/style mount can leave print-owned child DOM state present while the child advertises idle.

The fixed design needs one transition protocol:

- if Escape cancels the current print generation, exact A-owned mutations must be restored;
- if Escape is not allowed to cancel printing, it must not independently publish idle/remove lifecycle authority while A remains current;
- stale Escape/state events from an older selection generation cannot cancel a newer one.

## 3. Hostile child can still mutate page-visible selection markers that print CSS trusts

Cross-origin selection authority is held partly in `state.includes/state.excludes`, but selected nodes also carry predictable page-visible attributes:

- `data-webclip-remote-include`;
- `data-webclip-remote-exclude`.

`preparePrint()` builds selected-only CSS directly around those attributes. Host-page JavaScript in the child document can therefore add/remove/change the marker attributes independently of the extension-side Maps.

A hostile child can, for example, add the Include attribute to an unrelated subtree or remove Exclude from a selected subtree before print rendering. The current print CSS does not prove that every marker it sees corresponds to the authoritative extension-held selection generation.

This is the already registered P0-075 principle: page-visible markers cannot be the authoritative print-selection boundary. Cross-origin iframe support does not create a weaker trust model merely because the worker has optional host permission.

Required direction remains:

- derive a bounded inert/frozen print representation or exact generation-owned markers immediately from extension-held state;
- hostile page mutation after derivation must either be unable to affect the representation or cause fail-closed generation validation;
- cleanup is exact-generation owned and never trusts host-added markers as extension authority.

## 4. Remote prefetch bound still has the known P1-167 enumeration weakness

`prefetchSelected()` intends to stop at 100 images, but for each included root it executes:

`for (const x of root.querySelectorAll('img') || []) imgs.push(x)`

before checking `if (imgs.length >= 100) break` at the outer-root level.

A single hostile included subtree with a very large number of `<img>` descendants can therefore materialize/enumerate far more than the intended 100-item work set before later `imgs.slice(0,100)` processing.

This remains P1-167 and is not duplicated.

The eventual generation-aware `prepare-print` implementation must check its generation while traversing/prefetching and before committing DOM mutations, but generation checks do not replace the shared node/time budget.

## 5. Print generation and selection generation must remain distinct

A tempting repair is one generic `sessionId`. That would conflate two lifecycles already separated by P1-199/P1-200.

Required composition:

- `selectionSessionId` / selection generation owns start/stop/mode/clear/restore and child-local Escape authority;
- `printGenerationId` is created under one current selection generation and owns prefetch/style/resource mutations;
- every `prepare-print`/`restore-print` references both exact child document generation and the applicable selection/print generations;
- a newer print within the same selection session invalidates old print commits/restores without ending selection;
- ending selection invalidates all subordinate in-flight print generations.

## Required regressions

1. Delay `prefetchSelected(A)`, press Escape before it settles, then let A settle: stale A cannot mount print style or claim success for the cancelled/superseded lifecycle.
2. Escape after A mounted style/resource mutations: final state is either exact A rollback + consistent top/child idle, or Escape is rejected/deferred while A remains authoritative; never idle-with-print-mutations.
3. Delayed stale Escape/state event from selection A cannot stop selection B.
4. Print A restore arriving after print B prepare cannot remove B-owned style/attrs (existing P1-199 regression remains).
5. Host script adds fake Include/Exclude marker attributes after user selection: printed scope is determined only by extension-authoritative generation or fails closed.
6. Host removes legitimate marker attrs: no silent substitution of selected content; exact representation remains stable or operation aborts.
7. One selected root with >100k images: remote prefetch traversal obeys P1-167 bounded node/time work and does not materialize the entire descendant set first.
8. Worker restart during prefetch composes with P1-203: old child print generation is reconciled/cleaned, never silently adopted by a new worker session.
9. Permission revoke/regrant during the same flow cannot resurrect old child selection/print authority.
10. Safe-link/URI filtering from P0-071 is applied to the exact final print representation, not merely to mutable live markers before hostile `beforeprint`/DOM changes.

## Duplicate check / numbering

No new item is created.

Primary composition: **P0-075 + P1-199 + P1-200 + P1-203**, with **P1-167/P0-071** as preprocessing/representation dependencies.

P1-201…P1-210 remain occupied; P1-211 remains unassigned by this block.

## Test / release state

Audit documentation only. Product runtime/configuration and `manifest.json` are unchanged. Product tests were **not** rerun. The last proven product gate remains historical **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. Version remains `0.9.8`; no build, tag or GitHub Release was created.
