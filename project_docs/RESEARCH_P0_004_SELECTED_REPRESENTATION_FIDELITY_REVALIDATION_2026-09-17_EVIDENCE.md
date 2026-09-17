# Research evidence — P0-004 selected representation fidelity revalidation — 2026-09-17

Research-only closure-oriented tranche. Production runtime, `manifest.json`, workflows, `TEST_STATUS.md`, `RELEASE_READINESS.md`, build/tag/deploy/release state are unchanged.

## Scope and current owner

Canonical baseline researched: `main` at `2ca99621f37dc8631513f1af0124209d11c76a47`.

Current Registry owner:

- `P0-004` — selected PDF fidelity must be complete and selection-bounded: ordinary page-owned ancestor layout/clipping/positioning/visual effects cannot truncate included descendants or inject unselected ancestor presentation into the saved copy.

This tranche revalidates that same root cause against fresh current source. It does not allocate a new P-code and does not claim implementation closure.

## Fresh current-source revalidation

Current `content.js` blob at the baseline is `f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e`.

### What the current print stylesheet already normalizes

`installPrintStylesForSelectionDocuments()` currently normalizes `html, body` for print:

- `overflow: visible`;
- `position: static`;
- auto/unbounded width and height;
- `contain: none`;
- `content-visibility: visible`;
- `transform: none`;
- `clip: auto`;
- `clip-path: none`.

Selected iframe shells and frame ancestor chains also have a dedicated normalization path. `markFrameChainsForPrint()` and `applySelectedFramePrintFlow()` remove viewport-like positioning, clipping, containment, transforms and bounded height for those frame carriers.

These are useful positive controls. P0-004 is not a claim that WebClip never performs print-flow normalization.

### Ordinary selected content follows a different path

The generic selected-only rule hides ordinary nodes unless they are:

- the print header;
- an Include root;
- inside an Include;
- an ancestor matching `:has([data-webclip-pdf-include])`;
- part of a selected frame chain;
- a flattened frame representation.

This necessarily keeps ordinary unselected ancestors of an Include in the live page box tree.

For ordinary Include roots, the only dedicated rule in this stylesheet is:

`[data-webclip-pdf-include] { break-inside: auto; }`

There is no corresponding ordinary-Include/ancestor normalization for page-owned:

- fixed/non-auto height;
- `overflow: hidden|clip|auto|scroll`;
- fixed/sticky/absolute positioning;
- paint/layout containment;
- transforms;
- clip/clip-path;
- ancestor generated content;
- ancestor background/border/shadow/filter/mask presentation.

Therefore the current source still preserves the exact class of ancestor constraints that P0-004 owns.

### Why the hide rule does not establish selection-bounded presentation

The hide selector removes ordinary unselected siblings, but a retained unselected structural ancestor can still render its own box and pseudo-elements.

CSS `::before` and `::after` generate boxes as children of their originating element. Keeping an ancestor for structure therefore keeps a path by which unselected ancestor presentation can enter the PDF even when ordinary siblings are hidden.

The defect is two-sided:

1. **completeness** — retained page-owned clipping/layout can truncate selected descendants;
2. **selection boundary** — retained unselected ancestors can inject presentation that the user did not select.

A fix that addresses only pagination while leaving ancestor presentation intact is insufficient. A fix that strips all styles indiscriminately is also insufficient because it can destroy selected layout semantics.

## Standards evidence

Fresh standards review supports the current root-cause model.

### CSS Fragmentation

CSS Fragmentation defines paged output as a fragmentation context and explicitly allows some fixed-size overflow boxes to be treated as monolithic. In particular, user agents may treat `overflow:auto|scroll`, and `overflow:hidden` with a non-auto logical height, as monolithic for fragmentation.

Source:
- CSS Fragmentation Module Level 3: https://drafts.csswg.org/css-break/
- CSS Fragmentation Module Level 4: https://drafts.csswg.org/css-break-4/

This means a retained fixed-height overflow ancestor cannot be assumed to paginate through merely because the root document is printable.

### CSS Overflow

CSS Overflow defines `overflow:hidden` and `overflow:clip` as clipping to an overflow clip edge. `overflow:auto` behaves like a clipping/scrolling overflow mode when overflow exists, and print handling of scrolling overflow is not a general completeness guarantee.

Source:
- CSS Overflow Module Level 3: https://drafts.csswg.org/css-overflow/

### Generated content

CSS Pseudo-Elements defines `::before` and `::after` as generated boxes associated with the originating element. Retaining an unselected ancestor therefore retains an independent source of presentation unless WebClip explicitly neutralizes or isolates it.

Sources:
- CSS Pseudo-Elements Module Level 4: https://drafts.csswg.org/css-pseudo/
- CSS Level 2 generated content: https://drafts.csswg.org/css2/

## Public project / implementation evidence

### Playwright element-PDF request

Playwright issue `microsoft/playwright#39695` requests element-level PDF clipping because `page.pdf()` lacks an element-equivalent to locator screenshots. The reporter describes CSS/page-size workarounds as fragile when target content has explicit-height/grid behavior.

Source:
- https://github.com/microsoft/playwright/issues/39695

This does not prove WebClip's defect. It is relevant architectural evidence that browser PDF is document/page oriented, so element selection needs its own representation contract rather than assuming screenshot-like element clipping exists.

### react-to-print guidance

The `react-to-print` project documents a recurring print failure class where content is cut off rather than flowing to the next page. It specifically calls out `overflow:hidden|scroll`, fixed height and some wrapper layout modes as common causes, recommending print-specific normalization.

Source:
- https://github.com/MatthewHerbst/react-to-print

Again, this is adjacent implementation experience, not WebClip proof. The WebClip proof remains current source plus deterministic/browser evidence.

## User/community relevance

Fresh community search continues to show that selective clipping is judged by both **what was selected** and **how faithfully it is retained**.

Examples:

- An Obsidian community request asks for selective clipping of text/images/layout while excluding navigation, ads and other unwanted page material.
- A 2026 Obsidian Web Clipper report describes highlight mode adding the whole body instead of only selected parts.
- Evernote users report saved article clips becoming unreadable or carrying unwanted site presentation, with some users falling back to print-to-PDF.

Sources:
- https://www.reddit.com/r/ObsidianMD/comments/12woppe
- https://www.reddit.com/r/ObsidianMD/comments/1ssowa0
- https://www.reddit.com/r/Evernote/comments/j9octi

These reports establish user relevance only. They are not prevalence estimates and are not evidence that those products share WebClip's implementation defect.

## Responsive-state refinement remains current

The worker still invokes:

`Emulation.setEmulatedMedia({ media: 'screen' })`

before `Page.printToPDF`.

That is a useful positive control because site `@media print` rules should not silently replace a screen-selected element. But media **type** is not the same as the admitted screen **layout state**.

A width-dependent `@media screen` branch can be selected at the user's viewport and then re-evaluated against the narrower paged geometry. The earlier P0-004 evidence already demonstrated this class. Fresh source still has no receipt that freezes or proves the admitted responsive branch.

Therefore P0-004 acceptance still includes either:

- preserving the admitted responsive visual state in the representation; or
- truthfully classifying the representation as degraded/unknown where that state cannot be preserved.

It must not equate `media:'screen'` with full responsive-state fidelity.

## Interaction and temporal state

`prepareForPrint()` operates on the live page after WebClip UI interaction and resource preparation. Earlier evidence showed WebClip's own file-comment focus can change a page-owned `:focus` state before the PDF render, and time-varying animation state can move between admission and print.

Those are not new owners. They reinforce the same representation rule: fidelity must be tied to a defined admitted visual cut, not merely whatever live DOM happens to render later.

P0-070 owns exact source-document/application generation across the save pipeline. P0-004 owns whether the selected representation of that generation is visually complete and selection-bounded.

## Required acceptance boundary

A P0-004 implementation is not closed until all of the following are true.

### 1. Complete selected content

Ordinary selected content cannot be silently truncated by page-owned ancestor or Include-root:

- fixed/non-auto block size;
- overflow clipping/scroll containers;
- containment;
- viewport-like positioning;
- transform/clip constraints that prevent complete pagination.

### 2. Selection-bounded presentation

Unselected structural ancestors may contribute only the minimum structure required to place selected content. Their independent presentation must not silently enter the saved result, including:

- generated `::before` / `::after` content;
- decorative background/border/shadow/filter/mask where not part of the selected policy;
- page-owned clipping or viewport positioning.

### 3. Preserve selected semantics without blanket flattening

The solution must not normalize the entire page indiscriminately.

Positive controls must remain correct for ordinary:

- text flow;
- lists;
- tables;
- flex/grid cases that already paginate correctly;
- selected images/SVG;
- selected-root styles that are legitimately part of the selected presentation.

A safer architectural direction is an isolated selected representation with explicit structural carriers rather than using arbitrary live page ancestors as trusted presentation containers.

### 4. Responsive visual-state authority

The representation must bind to the admitted layout/viewport/container-query state or truthfully report degradation. `media:'screen'` alone is not sufficient proof.

### 5. Interaction/temporal render cut

The saved representation must identify the visual cut it claims to represent. WebClip UI focus, preparation mutations, animation progress or later page changes must not silently redefine the selected visual state.

### 6. Generation binding

The representation receipt must be tied to the same selection/application/source generation consumed by the save pipeline. A correct representation for generation A cannot authorize generation B.

## Owner boundaries

This tranche remains under P0-004.

Related but distinct owners remain:

- **P0-070** — exact source-document/application generation through save finalization;
- **P0-080** — same-document SPA/application generation and live selected DOM;
- **P0-075** — host page is not a trusted sensitive UI/control plane;
- **P1-003** — selected visual resource readiness under bounded deadlines;
- **P1-226** — same-origin iframe geometry;
- **P1-228** — rendered picker target/admission truth;
- **P0-071 DONE** — unsafe link-scheme guard at the physical print render cut;
- **P0-068 DONE** — inert flattened same-origin iframe representation;
- **P0-067 DONE** — host-control activation guard.

No new P-code is required.

## Deterministic model

Added model:

`project_tools/test_p0_004_selected_representation_fidelity_revalidation_model.js`

The model is designed to execute against the current repository `content.js` and checks:

- current `installPrintStylesForSelectionDocuments()` exists;
- root and frame-path normalization positive controls remain present;
- ordinary Include rule remains only `break-inside:auto`;
- ordinary retained ancestors have no equivalent overflow/height/position/contain/transform/clip normalization;
- fixed-height overflow, containment and viewport-like cases are completeness failures;
- ordinary sibling hiding is a positive control;
- retained ancestor generated/background presentation remains a selection-boundary failure;
- isolated structural-carrier semantics remove unselected presentation without deleting selected content;
- `media:'screen'` does not imply width-responsive branch preservation;
- an immutable visual-state receipt binds selection generation, viewport, interaction state and temporal cut;
- candidate save admission fails closed for incomplete, unbounded or unproven visual representation.

Local preflight:

- `node --check`: PASS;
- controlled current-source fixture execution: **PASS 49 checks**;
- exact current-repository execution is required by Repository Integrity before merge.

Real browser proof is intentionally not claimed by this research-only tranche.

## Implementation / verification work still required

Research revalidation does **not** close P0-004.

Implementation closure still requires at minimum:

1. production representation change;
2. deterministic regression against exact production source;
3. browser proof for fixed-height `overflow:hidden`, `overflow:clip`, `overflow:auto`, containment and fixed/sticky ancestor cases;
4. browser proof that unselected ancestor pseudo/background presentation does not leak;
5. positive browser controls for ordinary selected text/list/table/flex/grid/image/SVG fidelity;
6. responsive-state controls across viewport-width/orientation/container-query changes;
7. interaction/temporal-state controls where the claimed fidelity contract includes them;
8. real unpacked Chrome release regression where required.

## Release boundary

P0-004 remains:

`ACTIVE / ROOT-CAUSE-REVALIDATED`

This tranche changes research evidence and a deterministic model only. It does not change release truth.

`RELEASE_READINESS.md` remains `NOT READY`.
