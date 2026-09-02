# WebClip — fresh full-project research — C18 Shadow DOM / slots / composed tree — 2026-09-02

Date: 2026-09-02
Canonical source baseline: `3082da345ad49f10969211d20ad45d04bbb1238f`
Exact `content.js` blob: `f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e`
Scope: focused fresh-restart coordinate **C18 — Shadow DOM / slots / composed tree**.

## Result

**C18: L4-REVALIDATED / FINDING + POSITIVE PHYSICAL CONTROL (P2-006).**

Fresh source inspection and exact-source Chrome evidence show that WebClip does not implement Shadow DOM as an explicit selection scope. Document listeners observe composed clicks after browser retargeting, so clicks on open or closed shadow descendants resolve to their light-DOM host. Light-DOM nodes assigned to a `<slot>` remain ordinary selectable nodes. When the host itself is selected, Chromium physically prints its shadow subtree, so the focused failure is not a blanket inability of `Page.printToPDF` to render Shadow DOM.

No new P-code is allocated. Canonical `RESEARCH_REGISTRY.md` already owns this product/architecture gap as **P2-006 BACKLOG — Shadow DOM as explicit selection scope**. This tranche does not promote P2-006 to P0/P1 and does not change release readiness.

## Fresh source inspection

Current `content.js` selection plumbing installs listeners on ordinary `Document` objects and recursively discovers accessible `iframe/frame` documents. The focused search found no host-page Shadow traversal based on `shadowRoot`, no `composedPath()` target recovery, and no explicit shadow-root listener/selection registry.

That means the browser's event retargeting boundary remains authoritative for manual selection. An event originating at a shadow descendant and observed by the top `Document` listener exposes the host as the target; WebClip therefore cannot attach its Include/Exclude marker to the internal shadow element.

This source result is consistent with the existing Registry backlog item P2-006 and was used to design the physical discriminator below.

## Physical evidence

Accepted external execution:

- workflow: `Research C18 Shadow DOM`;
- run: `33599090493`;
- job: `100148598093`;
- exact evidence head: `2db00d627ca72b2281e8ac89e29a970e2629a49c`;
- browser: Google Chrome `151.0.7922.173`;
- conclusion: `SUCCESS`;
- durable harness: `project_tools/research_c18_shadow_dom.py`.

A preceding raw-observation run recorded result JSON SHA-256 `306235c864a52225f5de85f93c6728e362be5db2d4affca9880e920d8834fb53`; the final accepted run uses the same fixture with assertions corrected to the actually observed retargeting semantics and waits for the real WebClip PDF-preparation handoff before the physical cut.

### Case 1 — open Shadow DOM internal Include click

Fixture:

- light-DOM host `#open-host`;
- open shadow root containing `#shadow-a` and `#shadow-b`;
- composed click dispatched on `#shadow-a` while WebClip is in Include mode.

Observed selection state:

- one Include exists;
- selected node is light-DOM `div#open-host`;
- no internal shadow node carries the WebClip marker.

This directly proves that an open shadow root is not an explicit selectable scope in the current implementation.

### Case 2 — internal Shadow Exclude attempt

With `#open-host` already Included, WebClip switches to Exclude mode and a composed click is dispatched on internal `#shadow-b`.

Observed selection state remains:

- Include: `div#open-host`;
- Excludes: none.

Therefore the user cannot express “include the host but exclude this internal shadow descendant” through the current manual selection model. The browser retargeting boundary prevents WebClip from naming the internal node.

### Case 3 — slotted light-DOM positive control

A light-DOM `<span id="light-slot" slot="main">` is rendered through the host's shadow `<slot>`.

A click on this node selects `span#light-slot` itself rather than the host. This proves the failure is not caused by all composed-tree presentation: a slotted node that remains a light-DOM element retains ordinary WebClip selection authority.

### Case 4 — closed Shadow DOM

A composed click on a descendant of a closed shadow root selects the light-DOM `div#closed-host`. Internal explicit selection is unavailable, as expected from the stronger closed-shadow encapsulation boundary.

### Case 5 — physical selected-host PDF

The open-shadow host is selected and WebClip reaches its real PDF-preparation handoff. Chrome then physically prints the prepared document.

Observed physical PDF:

- `C18_SHADOW_A`: present;
- `C18_SHADOW_B`: present;
- slotted `C18_SLOTTED_TOKEN`: present;
- outside light-DOM sibling `C18_OUTSIDE_TOKEN`: absent;
- one physical page.

This is the critical positive control. Chromium can render the host's Shadow subtree in the selected PDF while WebClip's ordinary selected-only top-level filtering excludes an outside sibling. C18 therefore must not be misclassified as a renderer-wide “Shadow DOM missing from PDF” failure.

## Ownership / duplicate reconciliation

### P2-006 — direct owner

The canonical Registry already states:

> `P2-006 | BACKLOG | Shadow DOM as explicit selection scope.`

The fresh evidence is exactly that contract: internal open/closed shadow descendants cannot be independently Included/Excluded, while a slotted light-DOM node can.

No new P-code is justified.

### P0-071 — not reopened

P0-071 is DONE for unsafe-link render-cut guarding across top document/open Shadow/same-origin frame representation. C18 does not demonstrate a regression in that security guard; it tests selection scope, not unsafe-link sanitization.

### P0-067 — not reopened

P0-067 is DONE for host-control activation guarding and explicitly preserves WebClip's own Shadow-DOM controls. C18 concerns host-page Shadow DOM selection, not WebClip UI Shadow DOM activation.

### P1-003 / other fidelity owners

This focused tranche did not claim comprehensive resource-readiness coverage inside arbitrary shadow roots. No fresh delayed-resource discriminator was executed here, so P1-003 is not added to the C18 outcome solely by inference. Future resource-focused coordinates remain free to revalidate that owner with direct evidence.

## Pipeline mapping

- **B1 User Intent:** user attempts to Include/Exclude a rendered shadow descendant.
- **B2 Admission:** current Document-level event observation receives the retargeted host, not the original shadow descendant.
- **B3 Capture:** explicit internal shadow selection identity is therefore absent; slotted light-DOM identity remains available.
- **B4 Static Materialization:** no special shadow materialization is required for the selected-host positive control because the live host remains in the document.
- **B5 Renderer:** Chrome renders the selected host's shadow subtree.
- **B6 Physical Artifact:** physical PDF contains both shadow descendants and the slotted node while excluding the outside sibling.
- **B7–B9:** not independently exercised by this focused C18 tranche.

## Acceptance interpretation

C18 advances to `L4-REVALIDATED / FINDING + POSITIVE PHYSICAL CONTROL (P2-006)`.

This means:

1. current Shadow DOM is not an explicit selection scope;
2. open shadow internals are not separately Include/Exclude-addressable through the current manual click model;
3. closed shadow internals are likewise not addressable;
4. slotted light-DOM nodes remain selectable, providing a composed-tree positive control;
5. selecting the host can still produce a physical PDF containing its shadow subtree;
6. no new P0/P1 owner or release-blocker is inferred from this focused evidence;
7. P2-006 remains BACKLOG until product architecture intentionally adds explicit Shadow DOM scope semantics.

## Non-claims

This tranche does not claim:

- arbitrary shadow resource readiness;
- complete styling/pseudo/container-query fidelity inside all shadow roots;
- Shadow DOM restore/import locator semantics;
- declarative Shadow DOM parity;
- cross-origin frame + Shadow combinations;
- C19 or later restart coordinates;
- real unpacked permission/debugger UI C46 coverage.

Production runtime, `manifest.json`, version and release state are unchanged.
