# CSS visual dependency graph audit — Final — Blocks 49–56

Final interruption-safe stage of the tranche begun from exact fresh `main` `cd342ac548606ab93eba3d1f2ebc9a68f2f51c08`.

Current P-code status and ownership remain exclusively authoritative in `project_docs/AUDIT_REGISTRY.md`.

## Blocks 49–56

### Block 49 — historical duplicate reconciliation

Fresh re-read of `AUDIT_CAPTURE_ADMISSION_RESOURCE_FIDELITY_EVIDENCE_2026-08-29.md` confirms that several controls in this tranche intentionally revalidate already-owned P1-003 scope rather than create new findings:

- delayed pseudo background resource;
- delayed `mask-image` resource;
- delayed `list-style-image`;
- pseudo-only web font;
- cross-origin frame-agent CSS/background/font parity weakness.

That earlier tranche is the durable evidence which reopened **P1-003 ACTIVE**. Therefore these classes are not assigned another owner here.

The current tranche adds new acceptance evidence rather than a duplicate root cause.

### Block 50 — genuinely new refinements in this tranche

The new evidence not already represented by that earlier 26-block resource tranche is principally:

1. delayed `border-image-source` physical bytes and clean-current-report omission;
2. generated image slots `content:url(...)` / `::marker content:url(...)` with direct physical controls;
3. `image-set()` renderer-selected candidate versus parser-discovered candidate over-admission, including a complete 500-task-cap amplification control;
4. exact post-scan dependency creation caused by WebClip's own header, print-style, image-wrapper and flattened-proxy insertion;
5. same-origin proxy `cloneNode(true)` / adoption ordering changing source computed relative-URL resolution before `copyComputedFrameCloneStyle()` reads it;
6. a covered `background-image` resource that was successfully prefetched under frame provenance but becomes a new delayed top-document resource after flattening;
7. raw inline `border-image-source` / `list-style-image` frame-base loss plus child-head/pseudo rule loss in the secondary representation;
8. exact copy-before-adoption positive control showing the frame background provenance can be retained under a different ordering.

These refine P1-003/P1-187; they do not justify a new P-code.

### Block 51 — graph identity must be representation-generation bound

The current `resourceReport` describes tasks discovered **before** the final WebClip print representation exists.

Physical controls prove that the task graph can change after that report because:

- page CSS reacts to WebClip helper DOM/styles;
- proxy insertion creates new page-CSS dependencies;
- adoption/rebasing creates different resource URLs;
- flattened representation omits or substitutes source CSS/pseudo state.

Therefore a truthful “resource ready” receipt cannot be only a count of earlier tasks. Acceptance under P1-003 should bind readiness to the exact representation generation that Chromium will physically render, or explicitly admit that graph convergence is unknown.

### Block 52 — renderer-selected candidates must be distinguished from parser candidates

The `image-set()` control shows that extracting every textual/computed `url(...)` is not equivalent to acquiring the actual rendered dependency graph:

- Chromium DPR=1 selected/requested one candidate;
- current URL extraction saw 500 candidates in the same valid computed value;
- all 500 can consume the task cap;
- a 12-candidate exact-deadline schedule reported 11 failures despite the renderer-selected 1x candidate being ready.

Acceptance should not call non-selected alternatives “missing rendered resources”. If the implementation cannot determine which alternative the renderer actually selected, that uncertainty should be represented as graph uncertainty rather than fabricated failure completeness.

### Block 53 — truthful degradation state requirements

The existing worker marks the resource stage `partial` only when the current report has a recorded failure, cap omission, deadline exceedance or scan truncation. Untracked CSS/pseudo/frame/proxy resources can therefore be physically missing while that condition remains false.

A future P1-003 closure should distinguish at least these semantic cases, regardless of exact UI labels:

- **confirmed ready for the final admitted graph** — required renderer-selected dependencies for that representation were acquired/settled under the bounded contract;
- **partial-known** — a required admitted dependency is known to have failed/been omitted/timed out;
- **graph unknown / non-converged** — the implementation cannot prove that the scanned graph still equals the final rendered graph, including mutation/adoption/representation transitions or unsupported dependency classes.

These names are acceptance terminology in this evidence, not a claim that current runtime already implements these states.

A save may still be allowed by product policy in degraded cases, but it must not be represented as a proven faithful resource-complete copy when the graph is unknown.

### Block 54 — one bounded contract must cover top / same-origin proxy / cross-origin child

P1-003 already explicitly owns frame parity. The evidence now demonstrates three materially different graph producers:

1. top-document selected rendered state;
2. same-origin flattened proxy whose resource URLs/style rules can differ from its source frame;
3. cross-origin frame-agent representation whose current prefetch is ordinary-`img` only.

Closure cannot be defined by making only the top-document scanner exhaustive. Each physically rendered representation needs the same truthful resource-generation contract, while P1-167 requires the combined work to remain under a shared node/time/task/byte budget.

### Block 55 — precision / positive / rejected controls retained

Positive controls that must survive future repair:

- current ordinary `<img>` readiness waits a delayed selected image;
- current element `background-image` readiness can successfully wait a delayed ordinary background;
- ordinary multi-layer backgrounds legitimately require multiple simultaneously composited URLs;
- CSS variables resolving into the covered computed background remain discoverable;
- `cloneNode(true)` without cross-document adoption does not by itself alter source base resolution;
- copying source computed frame URL values **before** adoption preserved the tested frame background physically;
- the tested custom-property-backed border image preserved frame URL provenance under adoption, demonstrating that URL syntax paths are not all equivalent.

Rejected/non-promoted controls:

- the new managed mask fixture did not reproduce a reliable loaded-vs-unloaded difference; prior durable evidence remains the mask authority instead;
- tested `shape-outside` image fixture did not produce a measurable layout difference;
- tested external SVG CSS filter did not issue the intended resource request;
- tested external clip-path schedule lacked a valid intended clipped positive control;
- `@counter-style symbols:url()` did not yield the expected image-resource positive control;
- managed WebGL availability remains an external real-Chrome/GPU boundary from earlier evidence.

### Block 56 — final classification and no-new-owner decision

**No new permanent P-code and no canonical status transition.**

Primary refined owners:

- **P1-003 ACTIVE** — final selected renderer-resource graph must be actual, bounded, representation-generation exact and truthful about both known omissions and graph uncertainty;
- **P1-187 ACTIVE** — same-origin flattened proxy must preserve required renderer state and resource provenance under bounded materialization.

Strong supporting boundaries:

- **P0-070 ACTIVE** — exact full-document/physical generation;
- **P0-075 ACTIVE** — page-observable live preparation/helper DOM is not a trusted/frozen representation;
- **P0-004 ACTIVE** — selected physical copy fidelity;
- **P1-167 ACTIVE** — graph acquisition/convergence must live inside one bounded preparation budget;
- **P1-004 / P1-229** — cross-origin child lifecycle/representation parity;
- **P2-007** — explicit capture/representation-mode architecture remains the broader product boundary.

Git/history checks do not identify an independent CSS-resource owner. Existing history also contains deliberate prior decisions not to allocate an adjacent `P1-230` for audit refinements already covered by existing owners. This tranche likewise does **not** allocate `P1-230` or any later number.

## Tranche result

Completed **56/56 blocks** with durable checkpoints after Blocks 1–16, 17–32, 33–48 and this final Blocks 49–56 stage.

The durable architecture result is:

> Resource readiness is a property of the exact final renderer representation and its actually selected dependency graph, not of a pre-mutation list of URL strings. The graph must remain generation-bound through WebClip preparation and frame representation changes; when bounded code cannot prove convergence, the product must preserve that uncertainty instead of reporting resource completeness.

Runtime, `AUDIT_REGISTRY.md`, manifest/version/build/tag/release state are intentionally unchanged by this docs-only audit tranche.
