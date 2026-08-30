# Durable audit evidence — composed/rendered-scope convergence — 2026-08-30

Canonical P-code owner/status authority remains exclusively in `AUDIT_REGISTRY.md`. This is an interruption-safe checkpoint for a fresh-source audit tranche. At this checkpoint **Blocks 1–20 are complete**; later blocks/final classification may extend this tranche in additional durable files.

Exact fresh audited baseline: `main = edb5f04835a61fca370587e0186c8c03c09217b9`.

Managed renderer: Chromium `144.0.7559.96`. Browser probes use an already-admitted managed blank page populated through CDP `Page.setDocumentContent`; physical PDF probes use the production-equivalent forced-screen `Page.printToPDF(..., ReturnAsStream)` shape. These are engineering probes, not real unpacked Chrome release QA.

No runtime source, registry row, manifest/version/build/tag/release state is changed by this checkpoint.

## Duplicate/root-cause baseline

This tranche starts after the completed 56-block `AUDIT_COMPOSED_TREE_COPY_FIDELITY_2026-08-30_EVIDENCE.md`. That evidence already proved that current WebClip misses **visible** open-shadow internals in picker, auto-content, disclosure, resource and frame discovery, and explicitly declined `P1-230` because current owners already cover those roots.

The fresh question here is narrower and complementary:

> What happens when light DOM and the browser's **actual composed/rendered scope diverge in both directions** — not only visible shadow nodes missing from light traversal, but light-tree nodes that remain queryable while they are *not rendered at all* because slot distribution excludes them?

Fresh registry duplicate mapping before testing:

- `P0-004` — complete, selection-bounded physical representation;
- `P0-070` — exact user-intent / physical-generation truth;
- `P0-075` — host page is not a trusted representation/control plane;
- `P1-001` — truthful rendered-target restore admission;
- `P1-003` — actual selected **visual** resource graph under bounded readiness;
- `P1-160` / `P1-167` — bounded discovery/preparation;
- `P1-182` — durable locator plaintext/data minimization;
- `P1-193` / `P1-004` — exact optional remote-frame permission/discovery boundary;
- `P1-226` / `P1-227` / `P1-228` — same-origin frame geometry/topology and user-observable rendered candidate authority;
- `P2-006` / `P2-007` — explicit Shadow DOM scope and capture-mode semantics.

No new P-number is justified by Blocks 1–20.

## Blocks 1–8 — browser slot distribution versus light-tree visibility

### Block 1 — fresh source still has no shared composed-tree primitive

Fresh `content.js` contains no reviewed `shadowRoot`, `assignedSlot` or `slotchange` traversal. Existing subsystems continue to use document/light-tree operations such as `querySelectorAll`, `getElementsByTagName`, `TreeWalker`, `parentElement`, `children`, `Element.contains()` and `innerText || textContent` independently.

Fresh `frame-agent.js` is likewise document/light-tree based.

This confirms that the prior composed-tree finding is still current on the exact fresh baseline.

### Block 2 — rendered scope is not equivalent to either light tree or shadow tree alone

A fresh open-shadow fixture used:

- shadow text before/after a named `<slot>`;
- one correctly assigned light node;
- one unslotted light text node;
- one unslotted light image;
- one unslotted light iframe.

The browser rendered the assigned node and shadow-owned content while the unslotted light children had zero geometry.

A shared traversal therefore cannot mean simply “document tree plus recurse into every open shadow root”. It must model slot distribution.

### Block 3 — slotted light node remains an important positive control

The assigned light node had a normal rendered rectangle and contributed to `host.innerText` / `document.body.innerText`.

This preserves the previous positive control: slotted **light-tree** nodes are already directly visible to many current WebClip paths and must not be duplicated or broken by a future composed walker.

### Block 4 — unslotted light nodes are queryable but physically absent

Direct Chromium measurements for unslotted children under a host with a shadow root:

- unslotted text element rect: `0 x 0`;
- unslotted image rect: `0 x 0`;
- unslotted iframe rect: `0 x 0`;
- `host.querySelectorAll(...)` still returned them;
- a `TreeWalker` rooted at the host still returned them;
- `document.querySelectorAll('iframe')` still returned the unslotted light iframe.

Thus the current light-tree traversal can be **wider than the user's rendered component**, not only narrower than it.

### Block 5 — slot fallback content is the opposite case: rendered but absent from light text/query scope

After removing all assigned nodes from the named slot, the slot's shadow-owned fallback element acquired a normal rendered rectangle and appeared in physical PDF.

Yet `host.innerText` and `document.body.innerText` remained empty in the probe because the visible fallback exists only inside the shadow tree.

A correct rendered-scope model must therefore switch between assigned nodes and fallback content according to actual slot assignment.

### Block 6 — `assignedNodes({flatten:true})` expresses the relevant slot branch

With assigned nodes present, `slot.assignedNodes({flatten:true})` returned the assigned light nodes and fallback geometry was zero.

After assignment was removed, the same call exposed the rendered fallback branch and its geometry became nonzero.

This is useful architecture evidence: a bounded open-root walker needs explicit slot semantics rather than traversing both fallback DOM and assigned light children indiscriminately.

### Block 7 — naive light+shadow recursion would double-count slotted nodes

A slotted light node exists in the host's light children **and** is reached through the shadow slot's assigned-node relation. Traversing both host light children and slot assignments without an identity/set rule visits the same rendered node twice.

That would corrupt candidate budgets, resource counts, frame discovery, locator/diagnostic ordering and possibly Include/Exclude aggregate limits. One shared node-identity budget is required under P1-160/P1-167.

### Block 8 — naive shadow-tree recursion would also include non-rendered fallback

When a slot has assigned nodes, its fallback descendants remain ordinary nodes in the shadow root but have zero rendered geometry and do not appear in PDF.

A raw shadow `TreeWalker` therefore has the symmetric error of current light traversal: it can include DOM that is not part of the active composed representation.

## Blocks 9–12 — text order, locator truth and privacy inversion

### Block 9 — `innerText` of a shadow host does not provide full composed text

In the mixed fixture, `host.innerText` contained the assigned light text but omitted shadow-owned visible text. `host.textContent` contained light children including unslotted, invisible text.

Thus current `innerText || textContent` is not a reliable “what the user saw” primitive for a shadow host.

### Block 10 — current locator fallback can persist **unrendered** light plaintext while missing rendered shadow text

A stronger fixture had:

- visible shadow article/fallback text;
- no rendered light text;
- unslotted light text `UNRENDERED_TOKEN_ABC123` plus an unslotted `<details>`.

Measurements:

- `host.innerText === ''`;
- `document.body.innerText === ''`;
- visible shadow nodes had nonzero rectangles;
- unslotted light nodes had `0 x 0` rectangles;
- `host.textContent` contained the unslotted token/details text.

Current locator helper semantics `(element.innerText || element.textContent || '')` therefore produced:

`UNRENDERED_TOKEN_ABC123 HIDDEN_SUMMARYHIDDEN_DETAIL`

while omitting the visible shadow article/fallback text.

This is a concrete **P1-001 + P1-182** refinement: durable restore context can be both less useful and less private than the rendered state it is supposed to identify.

### Block 11 — frame-agent has the same locator inversion

Fresh `frame-agent.js::elementText()` is also `innerText || textContent`, and its locator persists `text`, `parentText`, `previousText` and `nextText` from that primitive.

Therefore granted remote-frame selection has the same rendered-text/privacy mismatch for web components; this is not top-content-only behavior.

### Block 12 — light-DOM `innerText` ordering can disagree with physical composed/PDF order

Fixture light DOM order: `LIGHT_A`, then `LIGHT_B`.

Shadow DOM rendered slots in the opposite order: slot `b`, then slot `a`.

Measured:

- `host.innerText` / `body.innerText`: `LIGHT_A LIGHT_B` (light-tree order);
- rendered geometry placed B before A;
- physical PDF text extraction: `SHADOW_START`, then `LIGHT_B LIGHT_A`, then `SHADOW_END`.

So even already-supported slotted content proves that current text/locator/diagnostic ordering is not a composed-reading-order model. P1-001 and P2-007 remain the existing restore/readability boundaries.

## Blocks 13–17 — resource/disclosure traversal can act on non-rendered light descendants

### Block 13 — current included-resource traversal sees unslotted hidden descendants

Fresh `includedElementsBounded()` starts from each Include and walks its ordinary light subtree. `collectIncludedElements(selector)` likewise uses Include/light-descendant matching.

In the direct host fixture, the current-equivalent TreeWalker returned the unslotted hidden image, details and iframe while it could not reach the visible shadow article/fallback nodes.

The resource/disclosure scope is therefore inverted relative to the physical representation.

### Block 14 — hidden unslotted lazy promotion can initiate a network request outside the visual graph

A local HTTP probe gave an unslotted `0 x 0` light image only `data-src`, no active `src`. Before promotion the server received **zero** requests.

Applying the same current preparation pattern to that light-scanned image (`loading=eager`, `src=data-src`) caused a real request to `/unslotted.svg`; the image decoded successfully while remaining `0 x 0` and unrendered.

This refines **P1-003** in both directions:

- visible shadow resources are currently omitted;
- invisible unslotted resources can be promoted/awaited even though they are not in the selected visual graph.

A truthful resource report should be scoped to the actual representation, not merely to light descendants of an Include marker.

### Block 15 — a future composed walker must preserve the visible-shadow-resource case without retaining the hidden-light case

The previous 56-block tranche physically proved that an offscreen visible shadow lazy image can remain unloaded and absent from PDF because current scanning misses it.

Blocks 13–14 add the inverse control: an unrendered unslotted image is easy for current scanning to find and can trigger work/network activity.

The acceptance contract is therefore **rendered-resource graph parity**, not “scan more DOM”.

### Block 16 — current native-details preparation can mutate an unslotted invisible control

The same host contained an unslotted `<details>` whose rectangle was `0 x 0`. Setting its `open` state — the type of native disclosure mutation used by current completeness preparation — fired a real `toggle` event (`toggleCount: 1`) even though the control was not part of the rendered component.

This is not a request for a new activation P-code. It refines existing P0-067/P1-212/P0-075 boundaries: disclosure preparation first needs a truthful rendered-scope filter, otherwise even “safe” non-click state changes can reach irrelevant page-owned state.

### Block 17 — selection-bounded preparation must exclude inactive slot branches

The browser's current composed tree selects exactly one branch at a slot boundary: assigned nodes, or fallback when no effective assignment exists.

Disclosure/resource/frame work should follow that branch under one identity/budget model. Processing inactive fallback plus assigned nodes, or unslotted light descendants, makes preparation broader than the copy Chromium will actually render.

## Blocks 18–20 — frame-discovery inversion and optional-permission boundary

### Block 18 — current document frame discovery can select the wrong side of the shadow boundary

A fixture contained:

- `hiddenLight`: unslotted light-DOM iframe under a shadow host;
- `visibleShadow`: iframe directly inside the open shadow root.

Measurements:

- `document.getElementsByTagName('iframe')` returned only `hiddenLight`;
- `hiddenLight` rect was `0 x 0`;
- `host.shadowRoot.querySelectorAll('iframe')` returned `visibleShadow`;
- `visibleShadow` rect was about `404 x 124`.

Fresh `refreshFrameDocuments()` and `collectFrameElementsBounded()` are document/light-tree based, so current topology observes the physically hidden iframe and misses the visible one.

### Block 19 — physical PDF confirms the rendered frame set is the opposite

The same fixture's Chromium PDF contained:

- `SHADOW_HEAD`;
- `VISIBLE_SHADOW_FRAME`;
- `SHADOW_TAIL`;

and did **not** contain `HIDDEN_LIGHT_FRAME`.

This is direct architecture evidence for the principle “the scope WebClip discovers/prepares must be the same scope Chromium is allowed to render.” It refines P1-227/P0-004 rather than creating a shadow-frame duplicate.

### Block 20 — remote-frame candidate collection has no rendered-geometry admission before exposing origins

Fresh `collectCrossOriginFrameCandidates()` iterates `collectFrameElementsBounded(ownerDoc, 256)`. When a frame is not same-origin accessible it normalizes the frame's `src` and directly pushes `{ element, ownerDoc, url, prefix }`; the reviewed path has no rendered-geometry check before `collectCrossOriginFrameOrigins()` exposes the origin.

A managed fixture showed an unslotted remote-src iframe is still queryable, connected and `0 x 0` under its shadow host. Under current source shape its URL is therefore eligible for optional frame-access candidate discovery even though it is not user-visible composed content.

This is supporting evidence for existing **P1-004/P1-193/P2-016** least-privilege/permission discovery and P1-160 bounded discovery. A future shared composed walker should remove both false-negative visible-shadow frames and false-positive inactive light frames before permission UI is considered.

## Checkpoint decision

Blocks 1–20 are complete and durable. No registry edit or new P-code.

The key new architecture result is an **inverted-scope problem**:

1. open-shadow/fallback content can be physically rendered but absent from current discovery;
2. unslotted light children can remain fully queryable while physically absent;
3. current text fallback can persist non-rendered light plaintext while missing visible shadow text;
4. current resource/disclosure preparation can do work or cause page-observable state changes on non-rendered descendants;
5. current frame discovery can observe a hidden light iframe while missing the visible shadow iframe.

The next stage will follow dynamic slot assignment and selection generation through physical PDF, then test nested/flattened slot traversal, duplicate budget semantics, zero-geometry restore/admission and the minimum shared-walker contract across top content and frame-agent.