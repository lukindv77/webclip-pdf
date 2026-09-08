# P1-227 — active manual selection must track live same-origin frame topology

Date: 2026-09-08  
Repository: `lukindv77/webclip-pdf`  
Owner: `P1-227`  
Registry status at research start: `ACTIVE`  
Canonical `main` researched: `d4f5b268fa3f7ced5a7bc68da52784863d614138`  
`content.js` Git blob: `f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e`  
Durable prior evidence: `project_docs/RESEARCH_INTERACTIVE_CAPTURE_FRAME_TOPOLOGY_EVIDENCE.md`  
Research branch: `research/p1-227-live-frame-topology-2026-09-08`  
Scope: research/model/source-gate only. Production runtime, `manifest.json`, Registry status, build/tag/release state are unchanged.

## 1. Classification

P1-227 remains the single current owner for this root cause:

> While manual selection is already active, newly inserted/replaced/nested accessible same-origin frame documents must enter the listener/selection graph without restart or unrelated auto-content work. Detached ownership must be removed, work must be bounded/coalesced, and stale discovery cannot cross selection-session generation.

This is not a generic frame-navigation defect. Current source already handles reload of frame elements that were discovered earlier. The unresolved gap is **frame topology that appears after the active discovery graph was built**.

No new P-code is required.

## 2. Fresh canonical state

Fresh check at research admission:

- `main` == `d4f5b268fa3f7ced5a7bc68da52784863d614138`;
- Registry keeps P1-227 ACTIVE;
- no existing branch matching `p1-227` was found;
- current `content.js` blob is `f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e`.

## 3. Current selection listener graph

Current `startSelection()` eventually calls:

```js
addPageListeners();
```

`addPageListeners()` does:

```js
refreshFrameDocuments();
for (const doc of state.frameDocuments) {
  addListenersToDocument(doc);
}
window.addEventListener('resize', scheduleOutlineUpdate, true);
```

`refreshFrameDocuments()` recursively walks the current ordinary DOM with:

```js
doc.querySelectorAll('iframe, frame')
```

and for each discovered frame:

- stores the frame in the current discovered graph;
- installs one `load` handler if not already known;
- attempts `frame.contentDocument`;
- recursively visits accessible same-origin child documents;
- removes listeners from child documents no longer discovered;
- removes load handlers from frame elements no longer discovered/connected.

This is useful existing machinery. P1-227 should extend it rather than replace proven cleanup behavior without reason.

## 4. Existing positive controls

### 4.1 Initial selection start

Frames already present when selection starts are discovered and receive document listeners.

### 4.2 Known-frame navigation/reload

A frame discovered earlier owns a `load` handler:

```js
const handler = () => {
  if (state.phase === 'idle') return;
  refreshFrameDocuments();
  scheduleOutlineUpdate();
};
```

Therefore navigation/reload of a known frame can refresh the child-document listener graph.

### 4.3 Cleanup when rediscovery actually runs

`refreshFrameDocuments()` compares previous vs current documents and frame elements. Detached document listeners and stale frame load handlers are removed.

The defect is not that cleanup code is absent; the defect is that no ordinary live-topology trigger guarantees that rediscovery runs after a new/replaced frame appears.

## 5. Confirmed current-source gap

During normal manual selection the current source contains no `MutationObserver` or equivalent live topology observer.

Fresh calls to `refreshFrameDocuments()` occur from:

1. selection listener admission (`addPageListeners()`);
2. a `load` event from an already discovered frame element;
3. `detectMainContent()` / the unrelated “Основной контент” path;
4. preparation work before PDF.

A newly inserted frame element has no pre-existing WebClip `load` handler. If the user simply keeps manually selecting, there is no guaranteed topology refresh between insertion and the next click inside that new child document.

### Current-shape counterexample

```text
selection starts
→ F1 exists and is discovered
→ page inserts new same-origin F2
→ no refreshFrameDocuments trigger
→ user clicks inner DOM of F2
→ F2 document has no WebClip selection listeners
```

The child document is accessible and live, but outside WebClip's selection authority graph.

The same shape applies to replacing an old frame element with a new frame element: the new element/document are not owned merely because the removed element had a load handler.

## 6. Why this is not P1-226

P1-226 owns coordinate projection **after a same-origin child element is already part of the selection graph**.

P1-227 owns whether the child document enters that graph at all while selection remains active.

Correct transform-aware geometry does not make an undiscovered document selectable, and topology discovery does not repair geometry projection. They remain separate owners.

## 7. Why this is not the cross-origin frame owner family

P1-227 is limited to accessible same-origin topology.

Cross-origin frame agent injection/permission/session/restart identity remains under P1-004/P1-171/P1-193/P1-200/P1-201/P1-203 and related owners. A same-origin topology implementation must not silently read inaccessible child DOM or infer cross-origin agent authority.

A newly inserted cross-origin frame may be structurally observed as a frame element, but child-document listener admission remains fail-closed.

## 8. Why this composes with P1-160

P1-160 already owns bounded discovery work. P1-227 adds a continuous event source, so it must not turn every DOM mutation into a full recursive document rescan.

The implementation therefore needs one bounded/coalesced topology scheduler with explicit limits such as:

- maximum changed roots / frame elements per turn;
- maximum recursively inspected frame descendants per turn;
- optional elapsed-time budget;
- coalescing of mutation bursts;
- deterministic spillover/defer behavior rather than silent loss.

The exact constants are implementation choices; the invariant is bounded work with eventual convergence while the same selection session remains active.

## 9. Required selection-session authority

Current source uses `state.phase` as a lifecycle signal, but P1-227 needs an explicit generation/receipt for asynchronous or queued topology work.

Conceptually:

```text
SelectionTopologySession {
  generation
  active
  observer/trigger ownership
  pending changed roots
  scheduled turn
}
```

Every scheduled topology task captures the generation at admission.

At execution:

```text
if capturedGeneration != currentSelectionGeneration:
    discard without attaching listeners/handlers
```

This prevents a task queued during selection A from attaching authority after selection A stopped and selection B started.

## 10. Required topology transition model

### Start

```text
start selection generation G
→ build initial same-origin frame graph
→ attach document listeners/load handlers
→ start live topology observation for G
```

### Mutation burst

```text
DOM mutation(s)
→ identify potentially relevant changed roots
→ merge/coalesce into G pending work
→ at most one scheduled discovery turn for G
```

### Discovery turn

```text
verify G is current
→ clean detached ownership
→ inspect bounded changed roots
→ recursively admit accessible same-origin frame documents
→ attach exact listeners/load handlers once
→ if work remains, schedule another bounded G turn
```

### Stop/restart

```text
stop G
→ disconnect observer
→ revoke listeners/handlers/pending ownership
→ increment/invalidate generation

start H
→ fresh observer + fresh graph
→ any late G task is stale
```

## 11. Important identity rule

Frame element identity and child document identity are separate.

A known frame element can navigate to a new same-origin document. Existing `load` handling is a positive control because it rediscoveries the new child document.

A replacement frame element is a different topology object even if it has the same DOM id/name/src. The old element's handler must not authorize the replacement by textual similarity.

Likewise, a detached child document must not retain selection listeners merely because a later replacement frame has a similar URL.

## 12. Deterministic model

Added:

`project_tools/test_p1_227_live_frame_topology_model.js`

The model first reproduces the current-shape counterexample, then covers nine schedules:

A. new top-level same-origin frame becomes selectable without unrelated rediscovery;
B. nested inserted frames are recursively discovered under a bounded batch budget;
C. replacement revokes detached document/listener ownership and admits the replacement;
D. known-frame load remains a positive control;
E. removal-only topology mutation cleans listeners and load handlers;
F. a burst of mutations coalesces into one scheduled turn for one generation;
G. a queued task from selection generation A cannot attach after stop/restart B;
H. cross-origin child DOM remains fail-closed;
I. budget overflow spills into later bounded turns rather than one unbounded scan or silent loss.

Actual local execution before commit:

```text
P1-227 current-shape counterexample: newly inserted same-origin frame remains outside the manual-selection listener graph
P1-227 live same-origin frame topology deterministic model: PASS
```

Local Git blob before commit:

`f5cc34da7b39ea438b5ea78c2964cbb237d6f8d0`

## 13. Source-bound production closure gate

Added:

`project_tools/test_p1_227_live_frame_topology_source.js`

The gate preserves current positive controls:

- `frameDocuments` registry;
- `frameLoadHandlers` registry;
- `refreshFrameDocuments()`;
- known-frame `load` rediscovery;
- detached document/listener cleanup;
- detached frame-handler cleanup.

It then requires source-visible equivalents of:

1. active live topology observation (`MutationObserver` or equivalent);
2. explicit selection/topology generation;
3. coalesced topology scheduler/pending work;
4. explicit discovery budget;
5. inserted/replaced/removed topology handling;
6. observer/task disposal on selection teardown;
7. stale-generation fence before listener authority is attached.

The gate does not require one exact function name or one exact observer architecture. Its role is to prevent a production closure that merely adds another unconditional full-document scan.

Current source is expected RED by source inspection. Functional RED execution against an exact full production checkout is not claimed by this research block unless exact bytes are materialized and executed separately.

Local syntax check passed before commit. Local Git blob before commit:

`117c5ddce2d05a5b2ee280b3d13ff1d373b9ba22`

## 14. Production design direction

A minimal implementation can reuse `refreshFrameDocuments()` for full reconciliation while adding a bounded mutation-trigger layer, but a naïve `MutationObserver(() => refreshFrameDocuments())` is insufficient because it can rescan every document on every mutation.

Preferred direction:

- observe relevant document roots only while manual selection is active;
- collect mutation `addedNodes`/`removedNodes` or changed subtrees;
- quickly reject subtrees that cannot contain `iframe/frame`;
- enqueue relevant roots in a Set/identity map;
- coalesce to one scheduled task;
- bind that task to current selection generation;
- discover recursively with explicit budget;
- reconcile detached listeners/handlers;
- attach an observer to newly admitted same-origin child documents as needed;
- disconnect all owned observers on teardown;
- retain known-frame `load` support.

An alternative architecture may periodically poll topology under a strict budget, but it must prove acceptable responsiveness and must still be generation-owned and bounded. `MutationObserver` is not the only acceptable mechanism.

## 15. Observer recursion requirement

Observing only the top document is insufficient for same-origin nested topology.

Once child document F is admitted, a frame inserted later *inside F* must also become discoverable. The implementation therefore needs either:

- one observer per currently owned same-origin document with exact lifecycle cleanup; or
- another mechanism that truthfully detects descendant-document topology changes.

Observer count itself should stay bounded by admitted frame/document budget.

## 16. Removal / replacement cleanup

When topology changes remove a frame subtree:

- listeners from detached child documents are removed;
- load handlers from detached frame elements are removed;
- observers attached to detached same-origin documents are disconnected;
- pending changed-root work for detached subtrees becomes harmless;
- selected/hover state referring to now-disconnected nodes follows existing selection cleanup/validity rules and must not be resurrected by stale topology work.

P1-227 does not redefine selection snapshot identity or SPA generation; it requires topology lifecycle to respect those owners.

## 17. Required production regressions

Before P1-227 can close, deterministic/source/browser coverage should include at least:

1. selection active -> insert top-level same-origin iframe -> select inner element without restart;
2. selection active -> insert nested same-origin frame at depth two -> select inner element;
3. replace known frame element with a different frame element -> old listeners removed, new document selectable;
4. reload/navigation of an already known frame remains selectable;
5. remove known frame -> child listeners/load handlers/observers are cleaned;
6. rapid insertion/removal burst stays coalesced and within declared budget;
7. more changed frames than one-turn budget converge over bounded subsequent turns;
8. stop selection with queued topology work -> old task cannot attach after stop;
9. stop A, start B, then late A task -> B graph remains authoritative;
10. insert cross-origin frame without accessible DOM -> same-origin path does not inspect child DOM;
11. insert same-origin nested frame after parent document itself was dynamically admitted;
12. host mutates many unrelated ordinary nodes -> discovery does not perform an unbounded whole-document rescan per mutation.

Physical Chrome evidence is required for closure because DOM MutationObserver/load ordering, iframe document replacement and listener behavior are browser-owned runtime semantics.

## 18. Evidence interpretation

This research block distinguishes:

- deterministic topology model PASS;
- source gate syntax validation;
- source inspection of current RED shape;
- future source-gate PASS on exact production checkout;
- future physical Chrome E2E.

Model PASS is not production PASS. Existing historical Chromium reproduction remains supporting evidence but does not close current `main`.

## 19. Registry / release state

P1-227 remains ACTIVE.

No production source file, `manifest.json`, Registry status, version, build, tag, GitHub Release or deployment is changed by this research branch.

## 20. Next owner

After P1-227 research, the next sequential ACTIVE owner is P1-228:

> Manual selection candidate/geometry authority must represent user-observable rendered intent rather than raw `event.target` plus one axis-aligned bbox.

P1-228 must remain separate from P1-226 geometry composition and P1-227 live frame topology.
