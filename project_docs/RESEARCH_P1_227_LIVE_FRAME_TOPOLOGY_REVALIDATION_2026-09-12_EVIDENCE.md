# P1-227 live same-origin frame topology revalidation — 2026-09-12

Canonical status and ownership remain in `project_docs/RESEARCH_REGISTRY.md`. This is supporting research evidence only. It does not change production runtime, accepted architecture, product contract, release readiness, manifest version, workflow/infrastructure, or release authorization.

## Scope and exact baseline

Fresh canonical baseline before this research block:

- `main = 2d7f7e617891c65681f081e8bc789a8bf0823093`;
- `content.js` blob = `f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e`;
- open PRs = 0 and open Issues = 0 at the fresh start check;
- registry owner = **P1-227 ACTIVE**.

Fresh branch comparison also reconfirmed the historical provenance branch rather than treating it as current truth:

- `research/p1-227-live-frame-topology-2026-09-08` head = `84828ee10154f59d5fbe461ee5adbd1e27223f81`;
- relative to this baseline it remains **3 ahead / 61 behind**;
- merge-base = `d4f5b268fa3f7ced5a7bc68da52784863d614138`.

The historical branch was read for provenance. It was not merged, cherry-picked, rebased, or treated as implementation closure.

## Current-source revalidation

The current `content.js` still has the useful positive controls described by the earlier interactive-capture evidence:

1. `startSelection()` enters `selecting`, then calls `addPageListeners()`.
2. `addPageListeners()` calls `refreshFrameDocuments()` and adds selection listeners to each currently discovered accessible document.
3. `refreshFrameDocuments()` recursively scans `iframe, frame` elements from every accessible discovered document.
4. Every frame element found by that scan receives a directly attached capture `load` handler in `state.frameLoadHandlers`.
5. A load on such an already-known frame calls `refreshFrameDocuments()` again, so a known frame navigation/reload can converge to the new `contentDocument`.
6. Reconciliation removes selection listeners from no-longer-discovered documents and removes load handlers from detached/no-longer-discovered frame elements.
7. `removePageListeners()` removes listeners from tracked documents, removes the owned frame `load` handlers, clears `state.frameDocuments`/`state.frameLoadHandlers`, and `stopSelection()` then transitions the session to `idle`.
8. Inaccessible/cross-origin `contentDocument` access is caught rather than promoted into same-origin authority.

The exact P1-227 gap also remains:

- there is no selection-session `MutationObserver` or equivalent live same-origin frame-element topology watcher;
- a newly inserted frame element therefore has no WebClip-owned `load` handler until some later unrelated call to `refreshFrameDocuments()` happens;
- its accessible child document consequently has no manual selection listeners during that interval;
- observing only the top document would be insufficient, because DOM inside a child frame document is a separate document tree;
- current selection topology state has no explicit selection-session generation token, so a future asynchronous discovery implementation must not rely only on `state.phase` for stale-task rejection.

This is narrower than “frame navigation is broken”. Known-frame reload remains a positive control. The current failure is **new or replaced frame-element topology that appears after the existing discovery graph was built**, plus the missing generation/budget contract required for making future discovery asynchronous.

## Deterministic model

New model:

- `project_tools/test_p1_227_live_frame_topology_revalidation_model.js`

Local runtime:

- Node `v22.16.0`;
- `node --check` PASS;
- deterministic execution: **42 checks PASS**.

The model deliberately separates two layers.

### Current-source-shaped negative control

A minimal current-shaped snapshot model proves:

- an initially present same-origin child is discovered;
- a same-origin frame inserted after that pass is not discovered merely because it was inserted;
- the new frame has no owned `load` callback before another discovery pass;
- an explicit later refresh repairs the gap.

This is a source-shape model, not a claim that the model itself executes all 188 KiB of `content.js`.

### Candidate lifecycle contract model

A separate research contract model exercises the properties that an implementation would need without making that model an accepted architecture decision:

- observer ownership per discovered document;
- load ownership per discovered frame element;
- recursive nested discovery;
- delayed/unavailable `contentDocument` followed by frame load;
- same-frame document replacement/reload;
- replacement and detach cleanup;
- coalescing of mutation/load bursts to one queued reconciliation;
- idempotent listener/handler ownership;
- inaccessible/cross-origin document fail-closed behavior;
- exact selection-session generation fencing for queued mutation work and stale load closures;
- stop cleanup;
- a hard per-flush frame budget with explicit “budget exceeded” state rather than silently claiming complete discovery;
- duplicate document identity defense.

The hard budget in this model is intentionally conservative: when the bound is hit, the model does **not** pretend the remaining graph was discovered. A production design would still need an explicit degraded/continuation/diagnostic contract rather than copying this toy bound literally.

## Browser control — real DOM/iframe lifecycle

A browser control was run locally against:

- Chromium `144.0.7559.96`;
- user agent reports `HeadlessChrome/144.0.0.0`;
- DevTools Protocol `1.3`.

Durable control source:

- `project_tools/research_p1_227_live_frame_topology_browser_control.js`.

The control is browser-side JavaScript intended for `Runtime.evaluate`/DevTools execution; it is syntax-checked by Node but is not a deterministic Node test.

Result: **21 / 21 browser checks PASS**.

The browser control first reproduces the current-source-shaped negative control with real `Document`, `iframe`, `contentDocument` and `load` behavior:

- an existing frame is found by the snapshot pass;
- a later inserted frame is not automatically added to current snapshot authority;
- that new frame has no current-owned load handler before rediscovery;
- an explicit refresh then discovers it and attaches its load handler.

The same real browser session then validates feasibility of the researched lifecycle combination:

- `MutationObserver({childList:true, subtree:true})` on each discovered document plus direct frame `load` ownership discovers a new top-level frame;
- the observer installed on a newly discovered child document discovers a subsequently inserted nested frame;
- replacement of a frame element converges to the replacement document and removes the detached frame/document ownership;
- navigation/reload of an already-owned frame converges to the new document identity;
- a synchronous 20-mutation DOM burst produced one scheduled rediscovery flush in the control (`7 -> 8`);
- nested detach removes document and frame-handler ownership;
- stop disconnects observers and clears frame handlers so a later insertion cannot repopulate the tracker.

This is **real-browser mechanism evidence**, not an unpacked WebClip extension end-to-end PASS. The browser control uses current-source-shaped topology logic plus an isolated research tracker; it does not assert that production runtime has been fixed.

The model-only generation and hard-budget checks remain model evidence; they were not promoted to browser/product evidence by this control.

## External research

Current external sources were rechecked rather than relying only on the historical branch.

### DOM MutationObserver contract

WHATWG DOM defines mutation observer notification through a queued mutation-observer microtask. This gives a standards basis for asynchronous/coalesced reaction to DOM tree changes, but it does not create application-level selection-session generation ownership automatically:

- https://dom.spec.whatwg.org/#mutation-observers

MDN documents that `observe(target, {childList:true, subtree:true})` watches child additions/removals throughout the target subtree, that `disconnect()` stops future observer callbacks, and that removed-descendant mutations can still be delivered until the removal notification itself is delivered:

- https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver/observe

Implication for P1-227: an implementation must tolerate removal-boundary delivery and independently fence callbacks/tasks by the active selection generation. Disconnect alone is cleanup; it is not proof that already-queued application work cannot run.

### iframe load is a separate lifecycle signal

HTML/MDN define a `load` event on `iframe` elements when their nested resource/document load completes; MDN also notes this event does not bubble:

- https://html.spec.whatwg.org/multipage/iframe-embed-object.html
- https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/load_event
- https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe

Implication for P1-227: child-list observation and frame-document replacement/navigation are distinct concerns. Direct per-frame `load` ownership is therefore a useful complement to DOM insertion/removal observation, especially for a frame element whose `contentDocument` is initially unavailable or later changes.

### Independent frame-lifecycle precedent

Playwright exposes a current frame tree and separates `frameattached`, `framenavigated`, and `framedetached` lifecycle events:

- https://playwright.dev/docs/api/class-frame
- https://playwright.dev/docs/api/class-page

Chrome DevTools Protocol likewise exposes distinct `Page.frameAttached`, `Page.frameDetached`, and `Page.frameNavigated` events:

- https://chromedevtools.github.io/devtools-protocol/tot/Page/

These are not APIs being proposed for production WebClip content-script code. They are independent implementation precedent that **topology attachment/removal and document navigation are separate lifecycle dimensions**; a design that handles only one dimension should not claim complete live frame ownership.

### Extension injection context

Chrome's `scripting.executeScript()` supports `allFrames`, specific `frameIds`, and current `documentIds` for targeted execution:

- https://developer.chrome.com/docs/extensions/reference/api/scripting

This is relevant to the adjacent cross-origin agent problem, but it does not change P1-227 ownership: the current owner remains accessible same-origin topology. Expanding to browser-level frame/document injection/navigation authority would change architecture/permission surfaces and remains outside this research delivery unless separately decided.

## Alternatives compared

### A. Refresh on every pointer/mouse event

Rejected as the default direction.

It would place recursive document/frame scanning on a hot interaction path, would still require careful replacement/navigation cleanup, and would couple correctness to user pointer activity. A frame inserted while the pointer is stationary should not remain unknowable.

### B. Observe only the top document

Insufficient.

Mutation observation does not traverse into a child frame's separate `Document`. A new nested frame inserted inside an already discovered same-origin child would remain invisible unless that child document is also observed or another browser-level topology source is used.

### C. Re-run the current full `refreshFrameDocuments()` for every mutation callback

Mechanically simple but not sufficient as an accepted design by itself.

The current function performs recursive `querySelectorAll('iframe, frame')` scans over each accessible document. Calling that unconditionally for every mutation callback risks turning unrelated host DOM churn into repeated whole-document work. The existing P1-227 acceptance explicitly requires bounded/coalesced discovery and already points to P1-160 for discovery budgeting.

Coalescing to at most one scheduled reconciliation per burst is a useful floor, not a complete performance proof. A production implementation should prefer changed-subtree/frame-root work where feasible, retain a bounded reconciliation fallback, and expose truthful degraded/unknown state when a hard budget prevents completeness.

### D. Per-discovered-document mutation ownership + per-frame load ownership + coalesced generation-bound reconciliation

**Preferred research direction; not an accepted architecture change.**

It covers the two distinct event classes demonstrated above:

- inserted/removed frame-element topology through document mutation observation;
- document replacement/readiness through direct frame `load` ownership.

It also creates explicit places for detach cleanup, coalescing, generation receipts, and budget/degraded semantics. The exact data structures, changed-subtree algorithm, scheduler, budget and diagnostics still require implementation design and review.

### E. Move topology authority to webNavigation/CDP/browser-level frame events

Not selected by this research delivery.

Those APIs can expose stronger frame/document lifecycle identity, but adopting them for this path would broaden permissions/process architecture and cross-origin semantics. That requires a separate explicit architecture/product/security decision rather than being smuggled into a P1-227 research fix.

## Owner boundaries and non-duplication

No new P-code is justified.

- **P1-227** remains the single owner for live accessible same-origin frame topology during active manual selection.
- **P1-160** remains the supporting owner for bounded discovery work; P1-227 must not create an unbounded DOM-rescan loop.
- **P1-226** remains frame coordinate projection/geometry, not discovery lifecycle.
- **P1-228** remains rendered manual candidate/hit-test/fragment/clipping geometry, not frame topology ownership.
- Cross-origin agent/permission/document-generation concerns remain under **P1-004 / P1-171 / P1-193 / P1-200 / P1-201 / P1-203**.

## Testable implementation acceptance refinement

The existing Registry wording remains sufficient as owner authority. For future implementation review, the following concrete gates should all hold in one active manual-selection session:

1. insert a same-origin frame after selection start; select inside it without restart or auto-content;
2. insert a nested same-origin frame inside that new child; select inside it;
3. insert a frame before its final child document is ready; converge after load without user interaction;
4. navigate/reload an already-known frame; old document listeners/observer ownership disappear and the new document becomes selectable;
5. replace a frame element; detached old frame/document authority is removed and replacement authority is acquired;
6. remove an entire nested frame subtree; all descendant document observers/listeners and frame handlers are cleaned;
7. burst unrelated child-list mutations; discovery is coalesced and stays under an explicit budget;
8. if the budget prevents complete topology knowledge, report degraded/unknown rather than silently treating partial discovery as complete;
9. stop then restart selection while old discovery work is queued; no old callback/task/load closure can attach listeners into the new generation;
10. inaccessible/cross-origin child documents remain unread and do not crash same-origin discovery;
11. real unpacked-Chrome extension regression validates the same scenarios through actual WebClip manual selection rather than only isolated controls.

## Conclusion

P1-227 is freshly revalidated on current `main` and remains **ACTIVE**.

The current runtime already correctly handles known-frame `load` refresh and basic detach cleanup, so an implementation should preserve those controls. The missing piece is live ownership of newly appearing/replaced same-origin frame topology with explicit asynchronous session-generation and bounded/coalesced discovery semantics.

The strongest bounded direction supported by current source, standards, independent frame-lifecycle precedent, the 42-check deterministic model, and the 21-check real Chromium control is:

**per-discovered-document mutation observation + direct per-frame load ownership + coalesced, generation-bound reconciliation + exact detach cleanup + explicit budget/degraded semantics.**

That direction remains a research conclusion, not a production implementation or accepted architecture change. No runtime file was modified by this research delivery. No Chrome unpacked-extension PASS, PDF PASS, release PASS, product ZIP authorization, release authorization, tag/build/deploy, or workflow/infrastructure change is claimed.
