# Durable audit evidence — composed/rendered-scope convergence final — 2026-08-30

Canonical P-code owner/status authority remains exclusively in `AUDIT_REGISTRY.md`. This file completes the interruption-safe composed/rendered-scope convergence tranche.

Durable tranche layout:

- Blocks 1–20 — `AUDIT_COMPOSED_RENDERED_SCOPE_CONVERGENCE_2026-08-30_EVIDENCE.md`
- Blocks 21–32 — `AUDIT_COMPOSED_RENDERED_SCOPE_CONVERGENCE_STAGE2_2026-08-30_EVIDENCE.md`
- Blocks 33–44 — `AUDIT_COMPOSED_RENDERED_SCOPE_CONVERGENCE_STAGE3_2026-08-30_EVIDENCE.md`
- This file — **Blocks 45–56 + final classification**

Exact fresh audited baseline: `main = edb5f04835a61fca370587e0186c8c03c09217b9`.

Managed renderer: Chromium `144.0.7559.96`. Physical PDF probes use worker-equivalent forced screen media plus `Page.printToPDF(...ReturnAsStream)`. Cross-origin cap probes use loopback HTTP origins only to reproduce browser same-origin boundaries deterministically. These are engineering probes, not real unpacked-Chrome release QA.

No runtime source, registry row, manifest/version/build/tag/release state is changed by this tranche.

## Blocks 45–47 — frame discovery / optional-permission budget must be rendered-scope aware

### Block 45 — 256 invisible unslotted cross-origin frames can exhaust the exact 256-frame candidate collector before one visible frame — P1-004 / P1-193 / P1-160

Fresh `collectFrameElementsBounded(ownerDoc, 256)` reads ordinary document `iframe`/`frame` elements and stops at 256. `collectCrossOriginFrameCandidates()` then derives candidate origins from that bounded light-tree set. The reviewed source does not apply rendered-geometry admission before origin exposure.

Managed fixture:

- shadow host had **256** unslotted light iframes pointing to loopback origin A;
- all 256 hidden frames were connected/queryable but `0 x 0` because the shadow component did not distribute them;
- one ordinary visible iframe from loopback origin B followed them in document order and measured about `304 x 154`.

Exact current-shape bounded set:

- document iframe count: 257;
- first-256 cap contained **all 256 hidden A frames**;
- visible B frame was not in the bounded set;
- candidate-origin set contained only origin A.

Thus bounded discovery can be both least-privilege false-positive and functional false-negative: invisible origins consume the cap while a visible user-relevant origin disappears from permission discovery.

No new permission owner is needed. P1-004/P1-193 already own cross-origin frame feature/permission admission; P1-160 owns bounded discovery.

### Block 46 — 255 hidden frames + one visible frame is the exact positive threshold control

The identical fixture with **255** hidden A frames yielded 256 total frames. The visible B frame became the 256th bounded element and candidate origins contained both A and B.

This threshold control isolates the failure to current light-tree cap ordering. The fix is not a larger cap; inactive rendered branches should not consume the same candidate budget as active visible frame scope.

### Block 47 — hidden same-origin iframe documents can also consume live topology/auto-content work — P1-227 / P1-160

A separate same-origin `srcdoc` control used 100 unslotted hidden light iframes inside a shadow host plus one actually rendered slotted node.

After settlement:

- document query returned all 100 iframes;
- all 100 child documents were accessible and each contained its article fixture;
- first iframe rectangle was `0 x 0`;
- the slotted visible node had normal geometry.

Fresh `refreshFrameDocuments()` uses unfiltered document `querySelectorAll('iframe, frame')` and recursively visits accessible documents, while `detectMainContent()` later scores every document in `state.frameDocuments` before final Include usability. Thus physically inactive same-origin frame trees can create topology/listener/candidate work even though they are not part of the rendered host.

This is a P1-227/P1-160 scope/budget refinement. It does not prove every hidden child will win auto-content scoring; the stable finding is that all 100 inactive frame documents enter the current discovery topology.

## Blocks 48–49 — frame-agent resource parity reproduces the same inverted-budget defect

### Block 48 — first-100 frame-agent image preparation can be consumed entirely by invisible unslotted images — P1-003

Fresh `frame-agent.js::prefetchSelected()` builds `imgs` from selected root `matches('img')` plus ordinary `root.querySelectorAll('img')`, then processes only `imgs.slice(0, 100)`.

A remote-frame-equivalent DOM fixture selected a shadow host whose light children were:

- 100 unslotted inactive images;
- one actually rendered `<img slot=a>` in position 101, with `data-src`, no active `src`.

Current-equivalent result:

- total discovered images: 101;
- visible image index: 100 (zero-based);
- visible image was outside first 100 and was not processed;
- visible image remained `naturalWidth == 0`;
- exact PDF contained `VISIBLE_AGENT_ALT`;
- raster contained **0 red pixels**.

Frame parity therefore needs rendered-scope budget semantics, not merely equal timeout/report logic.

### Block 49 — visible image first is the positive isolation control

With the identical visible slotted image placed first, followed by the same 100 inactive images:

- visible image index was 0;
- it was processed by the first-100 slice;
- `naturalWidth == 240`;
- PDF alt text disappeared;
- raster contained about **10,799 red pixels**.

Again the hard cap itself is not the defect. The defect is charging inactive light branches ahead of the actual selected visual graph.

## Blocks 50–53 — bounded composed-scope reference model / architecture controls

These blocks are **reference-model controls**, not production code proposals or implementation claims. They test whether the required scope semantics can remain hard-bounded without scanning every light descendant.

### Block 50 — direct slot traversal can reproduce active composed order while excluding unslotted nodes

Reference walker rule:

1. if an element has an open shadow root, traverse shadow-root children instead of raw host light children;
2. when a `<slot>` is reached, traverse its direct assigned nodes when assignment is non-empty, otherwise its fallback child nodes;
3. otherwise traverse ordinary children;
4. use one identity `seen` set and one global node budget.

Fixture light order: A, B, unslotted U. Shadow order: head, slot B, slot A, tail.

Reference walk produced:

`host -> head -> slot -> B -> slot -> A -> tail`

and did not visit unslotted U. Browser geometry likewise placed B before A while U was `0 x 0`.

This demonstrates that a composed topology primitive does not require “light tree + shadow tree union”; active slot paths can be traversed directly.

### Block 51 — nested fallback slots are reached without duplicate assigned-node accounting

Nested outer-slot/inner-slot fixture from the previous stage was processed by the same direct-assignment reference rule plus an identity set.

Reference sequence:

`host -> outer -> inner -> B`

The assigned B node occurred **once**, and inactive fallback retained `0 x 0` geometry.

This is a positive feasibility control for the P1-160/P1-167 requirement that nested open-root/slot traversal be globally bounded and deduplicated.

### Block 52 — 5,100 inactive unslotted nodes need not consume the visible-resource budget

A host had 5,100 unslotted light nodes plus one visible slotted image. With a deliberately tiny reference element budget of 10, active composed traversal visited only:

`host -> slot -> visible`

The visible image was reached; none of the 5,100 unslotted ids entered the walk.

This directly complements Block 42: a correct scope model can improve fidelity **and** reduce work without increasing caps.

### Block 53 — `slotchange` is partially browser-coalesced, but task-separated churn still needs WebClip coalescing/generation bounds

A slot fixture reassigned one node 100 times synchronously between two slots. Browser `slotchange` delivery after that task collapsed to only two slot events (`a`, `b`).

Six additional task-separated reassignment steps produced repeated events, with 12 total entries by the end of the probe.

This is a useful lifecycle control: browser behavior already coalesces same-task churn to some degree, but WebClip must still bind slot/topology observation to the selection/save generation and coalesce repeated task-level work under P1-160/P1-167. Do not run a full composed-tree rescan synchronously for every raw topology signal.

## Blocks 54–55 — traversal alone does not solve selected-only authority; top/child implementations need one contract

### Block 54 — a shared walker is necessary but insufficient

Blocks 21/22/30/32 physically proved that precise slotted-light Include can retain an entire host whose shadow-owned header/footer/fallback/iframe remains outside document selected-only CSS authority.

Therefore a future shared composed walker cannot by itself make PDF selection-bounded. Supported open-root selection needs one of:

- root-local WebClip-owned filtering/representation authority in every traversed open root; or
- preferably the isolated/frozen representation already motivated by P0-075/P0-070, where selected composed scope is materialized without relying on page author scopes.

P0-004 remains the primary completeness/selection-bounded owner. P2-006 defines inner-shadow product scope, but Block 21 already reproduces leakage with an ordinary slotted light node, so P2-006 cannot be treated as a prerequisite for fixing selection-bounded output.

### Block 55 — fresh frame-agent source confirms the same contract must apply in child frames

Fresh exact `frame-agent.js` still uses:

- `ev.target` for picker admission;
- ordinary `Element.contains()` for Include/Exclude containment;
- `innerText || textContent` for locator `text`/parent/previous/next context;
- ordinary `root.querySelectorAll('img')` followed by first-100 image processing;
- document-scoped selected-only print CSS.

So top `content.js` and remote child `frame-agent.js` currently implement separate light-tree approximations of a rendered scope. The eventual repair should not add unrelated one-off shadow/slot traversals to each subsystem. One versioned bounded rendered-scope contract should be reused by top picker/discovery/resources/frames/diagnostics/restore and by frame-agent equivalents, with frame generation/permission semantics layered on top.

Existing child owners remain P1-004/P1-171/P1-199/P1-200/P1-229 as applicable after scope discovery; no new child-shadow owner is required.

## Block 56 — final owner/status decision and required regression matrix

This tranche completes **56/56 blocks**. No permanent P-code and no canonical status transition are justified.

### Primary refined owners

- **P0-004 ACTIVE** — selected-only physical artifact must be complete and selection-bounded. Precise slotted-light selection currently admits unrelated shadow headers/footers/fallback/frame content; slot drift can replace selected content with unselected fallback.
- **P0-070 ACTIVE** — selected rendered scope must be generation-exact through physical cut. Same connected/marked Element can become zero-box, move between slots or be replaced by fallback; `beforeprint` can change assignment after preparation.
- **P1-003 ACTIVE** — actual selected visual resource graph. Inactive unslotted nodes can consume top 5,000-element or child first-100 image budgets while visible slotted resources remain unprepared.
- **P1-001 ACTIVE** — rendered-target restore/identity. Light-tree text/sibling fields can remain structurally plausible after render loss and do not represent composed reading order.
- **P1-182 ACTIVE** — locator minimization. A fully visible selected slotted node can durably capture plaintext from physically invisible unslotted previous/next siblings.
- **P1-160 / P1-167 ACTIVE** — discovery/preparation must use one shared bounded scope. Inactive semantic nodes, disclosures and frames currently create candidate/mutation/topology debt before rendered admission.
- **P1-004 / P1-193 ACTIVE** — optional remote-frame discovery/permission. Invisible unslotted cross-origin frames can consume the exact 256 candidate cap and suppress a visible origin.
- **P1-227 ACTIVE** — same-origin live frame topology. Inactive unslotted accessible frame documents enter current document discovery, while prior evidence shows visible shadow-contained frames are missed.
- **P1-228 ACTIVE** — manual candidate authority remains user-observable rendered intent, not raw light-tree identity/one stale bbox.
- **P0-075 ACTIVE** — page-owned state/reactions are not trusted representation authority; inactive disclosure mutation and print-time slot changes remain page-observable.

### Supporting architecture boundaries

- **P0-080** — same-document application/rendered generation may supersede live selected DOM without browser documentId change;
- **P2-006** — precise Shadow DOM selection scope;
- **P2-007** — explicit coarse/current-view/static-expanded/visual fallback semantics, especially for closed roots and opaque/unmaterialized content;
- **P1-187 / P1-229** — downstream frame representation/media geometry after the correct rendered frame scope is discovered.

`P1-230` remains deliberately unallocated. Every fresh finding above maps to an existing root-cause owner already ACTIVE/BACKLOG in the canonical registry.

### Required future regression matrix

At minimum, a shared rendered-scope implementation should prove:

1. precise selected slotted light node does **not** pull unrelated shadow siblings/frames into PDF;
2. slot reassignment after selection is generation-fenced/revalidated or truthfully fails/degrades;
3. `beforeprint` slot reassignment cannot silently replace selected artifact content;
4. nested slots choose assigned versus fallback by composition semantics, not zero-geometry heuristics;
5. `display:contents`/zero-box slot containers are still traversed to visible descendants;
6. assigned hidden content does not cause fallback substitution;
7. slotted reading order/locator semantics distinguish structural light order from composed visible order;
8. locator context never persists invisible unslotted sibling plaintext merely because it is adjacent in light DOM;
9. 5,100 inactive light nodes cannot starve one visible slotted image under the top resource cap;
10. the equivalent frame-agent first-100 image case cannot starve the visible resource;
11. inactive disclosures do not receive completeness mutations/events;
12. 256 invisible remote frames cannot suppress a visible permission origin;
13. inactive same-origin frame documents do not consume live rendered-topology budgets/listeners/candidate work;
14. a slotted semantic article remains an already-working auto-content positive control;
15. active slot traversal reaches nested assignments once, preserves identity and obeys one node/time/depth/mutation/string budget;
16. topology observation is generation-bound and coalesced rather than full-rescanned per raw `slotchange`;
17. top `content.js` and remote `frame-agent.js` share the same rendered-scope version/semantics;
18. closed roots keep explicit coarse/fallback mode semantics rather than false precise traversal claims;
19. prior static-shadow, relative-link, `content-visibility:auto`, ordinary light DOM and ordinary iframe positive controls remain non-regressed;
20. final real unpacked-Chrome regression validates isolated-world events, real optional host permissions and physical PDF bytes before release closure.

### Final tranche rule

The 56-block convergence result is:

> **WebClip needs one bounded model of the active composed topology, a separate rendered-admission layer, and a generation-exact selection authority. Light DOM, Shadow DOM, slot assignment, geometry and selection markers are individually insufficient substitutes for that model.**

The same primitive should reduce false negatives **and** false positives: reach visible shadow/slotted resources/frames, skip inactive unslotted/fallback branches, avoid duplicate slot accounting, and keep bounded work proportional to the representation Chromium is actually allowed to save.