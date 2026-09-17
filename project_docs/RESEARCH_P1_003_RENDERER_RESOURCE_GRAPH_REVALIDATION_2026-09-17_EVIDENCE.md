# Research evidence — P1-003 selected renderer resource graph revalidation — 2026-09-17

Research-only closure-oriented tranche. Production runtime, `manifest.json`, workflows, `TEST_STATUS.md`, `RELEASE_READINESS.md`, build/tag/deploy/release state are unchanged.

## Scope and current owner

Canonical baseline researched: `main` at `e4c012f822d0f3ad8fc23307082e0acc76885715`.

Current Registry owner:

- `P1-003` — PDF renderer-resource preparation must cover the actual selected visual resource graph under bounded deadlines, including pseudo/CSS visual resources and frame parity; `Page.printToPDF` completion is not resource-readiness proof, and bounded omissions must be truthful.

Fresh source independently reconfirms that same root cause. No new P-code is required. Historical `RESEARCH_CAPTURE_ADMISSION_RESOURCE_FIDELITY_EVIDENCE_2026-08-29.md` is used only after fresh source inspection for semantic dedup and prior browser provenance.

## Fresh current-source revalidation

Current source blobs at the baseline:

- `content.js`: `f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e`;
- `frame-agent.js`: `ce55145dc7ee1a4abf485b7fad3134ac39b61751`.

### Top / same-origin preparation: useful but incomplete

`content.js::prefetchIncludedResources()` remains bounded. It starts from `includedElementsBounded()`, shares `PDF_RESOURCE_PREFETCH_DEADLINE_MS`, caps tasks at `PDF_RESOURCE_PREFETCH_MAX_RESOURCES`, uses bounded per-item waits/concurrency, and returns attempted/loaded/failed/omitted/truncated/deadline diagnostics.

It explicitly prepares these ordinary selected-element resource classes:

1. DOM `<img>` / currentSrc;
2. lazily promoted `data-src` / `data-srcset`;
3. ordinary element `background-image` URLs;
4. ordinary element computed fonts via `Document.fonts.load/check`.

These are positive controls and must not regress.

The same function still does not inspect computed styles for `::before` / `::after` / `::marker`, and it has no discovery path for at least:

- pseudo-element background/content images;
- fonts used only by pseudo-elements;
- `mask-image` / `-webkit-mask-image`;
- `list-style-image`;
- `border-image-source`;
- image-valued generated `content`.

Therefore its bounded task set is not the complete selected visual resource graph.

### Cross-origin frame parity is materially weaker

`frame-agent.js::prefetchSelected()` remains a separate implementation. It enumerates selected `<img>` roots/descendants only, caps itself at 100 images, uses an approximately 5 s total deadline, promotes `data-src` and `loading=eager`, and waits image decode/load best-effort.

It does not inspect computed CSS at all. It therefore has no proactive preparation for ordinary remote-frame CSS backgrounds, fonts, pseudo resources, masks, list marker images, or border images.

This is a direct parity failure inside P1-003. P1-004 remains the cross-origin feature umbrella, but a second resource-readiness owner is not justified.

### Current aggregation can describe only discovered tasks

`prepareForPrint()` merges top and remote resource reports before the worker prints. That is useful telemetry, but `attempted/loaded/failed` counts are necessarily scoped to discovered tasks.

A resource class never discovered does not become a failed task. Therefore a clean task report is not proof that the selected visual graph was fully ready.

Correctness boundary:

`discovered task success != complete selected visual-resource graph proof`.

## Why `Page.printToPDF` cannot substitute for readiness proof

A public chromedp issue asks how to wait for external images before `PrintToPDF`; the reporter observed that printing without an explicit wait could omit images and that an arbitrary sleep changed the result.

Source:
- https://github.com/chromedp/chromedp/issues/659

This is adjacent ecosystem evidence, not WebClip proof. It supports the architectural point that PDF invocation/completion is not itself a general application-level resource-readiness contract. WebClip-specific proof remains current scanner scope plus prior controlled Chromium evidence.

## Platform/API evidence

### Image decode readiness

MDN documents that `HTMLImageElement.decode()` resolves when image data is decoded and ready for rendering. WebClip already uses image-specific readiness mechanisms, which is a sound positive control.

Source:
- https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement/decode

### Computed style supports pseudo-elements

`Window.getComputedStyle(element, pseudoElt)` can inspect resolved styles for `::before`, `::after`, `::marker` and other pseudo-elements.

Source:
- https://developer.mozilla.org/en-US/docs/Web/API/Window/getComputedStyle

Thus pseudo-resource discovery is technically observable through the page renderer context; absence from the current scanner is an implementation coverage boundary rather than unavoidable browser opacity.

### CSS Font Loading API

`Document.fonts` / `FontFaceSet.load()` can explicitly trigger and observe font loading, while `FontFaceSet.ready` resolves after relevant font loading and layout settle.

Sources:
- https://developer.mozilla.org/en-US/docs/Web/API/CSS_Font_Loading_API
- https://developer.mozilla.org/en-US/docs/Web/API/FontFaceSet/ready

WebClip already uses `fonts.load/check` for ordinary element fonts. The missing P1-003 case is graph discovery for visual text that exists only in pseudo/generated representation or another frame path.

### Generated content can itself be an image

CSS Generated Content defines image values in generated `content` as rendered replaced content.

Source:
- https://drafts.csswg.org/css-content/

Therefore restricting resource discovery to DOM `<img>` plus ordinary element background images is not equivalent to enumerating all selected visual image dependencies.

## Historical browser evidence reconciled to fresh source

Existing durable capture/resource evidence recorded controlled Chromium cases where immediate versus post-settlement PDFs differed for:

- delayed `::before` background image;
- delayed `mask-image`;
- delayed `list-style-image`;
- delayed font used only by pseudo-element;
- delayed ordinary CSS background inside a permitted remote frame.

Fresh source still contains the exact scanner omissions that explain those observations.

Historical evidence also preserves positive controls for ordinary selected DOM image, ordinary element `background-image`, ordinary used web font, and bounded scan/deadline telemetry.

This tranche does not rerun or reinterpret old browser evidence as current runtime proof; it shows that current source has not closed the root cause those controls isolated.

## Refined P1-003 acceptance boundary

### 1. Selected visual resource graph, not an element allowlist

Discovery must cover resource classes that materially contribute to the admitted selected representation, including the currently proven gaps: pseudo-element image resources, pseudo-only fonts, masks, list marker images, border-image sources, and generated image content.

The architecture should prefer an explicit visual-resource graph contract over unrelated one-off property checks without ownership.

### 2. Frame parity

For any selected frame representation that WebClip claims at the same fidelity level, readiness semantics must be equivalent in kind, not merely “some images were awaited.” If a cross-origin frame cannot provide parity, the result must be truthfully classified at the lower proven fidelity level.

### 3. Bounded work remains mandatory

Completeness requirements do not authorize unbounded scanning/loading. Existing positive controls remain: node/resource limits, shared deadlines, bounded concurrency, per-item timeout, and bounded diagnostics.

If required resources lie outside the admitted budget, the operation must return a truthful degraded/unknown/failure outcome according to policy.

### 4. Discovery omission differs from load failure

A failed resource task is observable. A resource class never discovered is a different condition.

The result contract must distinguish:

- graph proven + all required resources settled;
- graph proven + known bounded omissions/failures;
- graph not proven because scan/resource classes were outside the supported/bounded graph.

A report with `failed=0` must never imply “complete” if graph coverage itself is unproven.

### 5. Resource identity belongs to the admitted visual generation

Resource readiness must be bound to the same selected/application/source visual generation used for printing. A resource ready for representation A cannot prove representation B after responsive/source/live-state change.

P0-004 owns visual representation fidelity; P0-070/P0-080 own source/application generation. P1-003 supplies the resource-readiness evidence those owners consume.

### 6. No false `printToPDF` readiness inference

`Page.printToPDF` return means Chromium produced PDF bytes. It must not be interpreted as proof that all WebClip-required selected resources were ready at the admitted render cut.

## Owner boundaries

Remain distinct:

- **P0-004** — selected visual representation completeness and selection-bounded presentation;
- **P0-070** — end-to-end exact source-document/application generation;
- **P0-080** — same-document SPA/application generation and live selected DOM;
- **P1-004** — cross-origin iframe feature/lifecycle umbrella;
- **P1-003** — renderer-resource graph readiness and truthful bounded omission;
- **P1-150** — selected iframe height completeness;
- **P1-167** — shared computation/mutation/string budget for PDF preparation/diagnostics;
- **P1-187** — flattened iframe rendered state such as canvas bitmap.

No new P-code is allocated.

## Deterministic model

Added:

`project_tools/test_p1_003_renderer_resource_graph_revalidation_model.js`

The model reads exact current `content.js` and `frame-agent.js` and checks bounded top-scanner positive controls, top ordinary DOM image/background/font coverage, absence of pseudo/mask/list/border/generated-image discovery, remote-frame image positive controls, absence of remote CSS/font/pseudo parity, truthful unknown/degraded outcomes, and frame parity requirements.

Local preflight:

- `node --check`: PASS;
- exact current-repository execution is required by Repository Integrity before merge.

No new real-browser proof is claimed by this research-only tranche.

## Implementation / verification work still required

Research revalidation does not close P1-003. Implementation closure still requires production graph-discovery/readiness changes, deterministic exact-source regression, browser tests for pseudo/mask/list/border/pseudo-font cases, remote-frame parity tests, deadline/resource-cap truthfulness tests, generation-change tests, and real unpacked Chrome regression where required.

## Release boundary

P1-003 remains:

`ACTIVE / ROOT-CAUSE-REVALIDATED`

`RELEASE_READINESS.md` remains `NOT READY`.
