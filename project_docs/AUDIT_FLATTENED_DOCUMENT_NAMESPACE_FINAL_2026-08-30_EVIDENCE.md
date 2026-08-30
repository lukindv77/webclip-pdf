# Durable audit evidence — flattened document namespace fidelity — FINAL Blocks 49–56 — 2026-08-30

Final reconciliation for the 56-block tranche preserved in:

- `AUDIT_FLATTENED_DOCUMENT_NAMESPACE_2026-08-30_EVIDENCE.md` — Blocks 1–16;
- `AUDIT_FLATTENED_DOCUMENT_NAMESPACE_STAGE2_2026-08-30_EVIDENCE.md` — Blocks 17–32;
- `AUDIT_FLATTENED_DOCUMENT_NAMESPACE_STAGE3_2026-08-30_EVIDENCE.md` — Blocks 33–48;
- this file — Blocks 49–56 and final classification.

Exact fresh baseline: `main = 013bea563f504a325f501ecc4521b1e41cdd11ef`.

Audit/docs only. Runtime, `AUDIT_REGISTRY.md`, manifest/version/build/tag/GitHub Release state are unchanged.

## Block 49 — historical P0-068 already owns document-global identity

Lossless family evidence for the earlier flattened-proxy audit explicitly states that the current sanitizer did not neutralize forms, custom elements or duplicate document identity before live insertion and required:

- inert transformation before connection;
- form/navigation/autofocus/identity semantics to be neutralized;
- duplicate `id/name` and similar document-global identity not to be mounted unchanged.

Therefore the fresh radio/details/form/SVG results are not admission of a new architectural defect. They are concrete physical reproductions of an already-declared P0-068 acceptance gap.

## Block 50 — P1-213 already owns connection-triggered behavior

Historical P1-213 was assigned specifically because no synthetic click is required: connecting a non-inert flattened subtree can itself execute or alter browser/page behavior.

Fresh evidence sharpens that contract beyond nested frames/custom elements/network effects:

- connection can uncheck an already-checked radio from another source document;
- connection can close an already-open named disclosure;
- connection can rebind form ownership;
- connection places local SVG identities into a shared first-match namespace.

No new owner is needed.

## Block 51 — strongest new physical regression matrix

The completed tranche adds exact current-Chromium physical regression cases that were absent from the historical generic wording:

1. **radio group collision** — two source frames both checked -> flattened first unchecked; PDF loses `F1_CHECKED`;
2. **named details collision** — two source frames both open -> flattened second closed; PDF loses `D2_BODY`;
3. **form id/IDREF collision** — source `F1_VALID/F2_INVALID` -> flattened `F1_INVALID/F2_VALID`;
4. **SVG gradient collision** — direct red+blue -> flattened both red (~76k red / 0 blue classified pixels);
5. **SVG `<use>` collision** — direct red+blue -> flattened both first-frame symbol (~75.5k red / 0 blue);
6. **internal fragment navigation** — naïve two-frame flatten yields one `/same` PDF destination and two links targeting it; coordinated remap yields distinct `/f1__same` and `/f2__same` destinations/annotations.

These are high-value regression candidates for any future P0-068/P1-213/P1-187 implementation.

## Block 52 — rejected / non-independent hypotheses are preserved

Do not overgeneralize this tranche.

Fresh positive controls show current Chromium `cloneNode(true)` preserves the tested:

- checkbox `checked` and `indeterminate`;
- detached radio checked state;
- range/progress/meter runtime values;
- `<details open>` when not participating in a newly shared named group;
- selected file-input `FileList`/visible filename;
- tested `:user-invalid` state.

Explicit non-promotions:

- image-map `usemap/name` association did collapse in the DOM, but Chromium emitted no PDF URI annotations in either direct or flattened control, so no current saved-PDF navigation claim is made;
- duplicate clipPath exploratory fixture lacked a valid direct positive raster and is rejected;
- `:target` fixture demonstrated owning-document state loss in a simple clone model, but its visible marker used pseudo-generated content already known to be lost by the current flattened representation. Without isolating production computed-style copying from that older pseudo loss, `:target` is supporting architecture evidence only, not a separate fresh sub-owner.

## Block 53 — successful repair control is coordinated and pre-connection

A controlled per-frame repair performed **before connection**:

- unique radio/details group names;
- unique form ids plus rewritten `form=` references;
- unique SVG ids plus rewritten `url(#id)` references;
- unique internal fragment ids plus rewritten `href="#id"`.

It preserved:

- both checked radios;
- both open disclosure bodies;
- original form valid/invalid states;
- distinct red/blue SVG representation;
- distinct PDF internal destinations and annotations.

This proves the problem is architecturally repairable without changing the source page's intended state.

## Block 54 — naïve and late repair controls fail for different reasons

Two negative repair controls are important:

1. **id-only rename** without rewriting SVG references produced no expected red/blue pixels: declaration uniqueness alone breaks the reference graph;
2. **late remap after live mount** restored form ownership when references were rewritten, but did not restore the radio already unchecked or details already closed.

Therefore acceptance ordering is:

`clone/materialize while detached -> coordinated typed namespace/reference transform -> state preservation check -> live connection -> physical print`

and not:

`connect -> observe collisions -> rename afterward`.

This directly reinforces P1-213.

## Block 55 — bounded/truthful implementation boundary

A future fix must not turn namespace preservation into an unbounded new traversal.

Supporting owners remain:

- **P0-064 ACTIVE** — flattened subtree allocation/preflight budget;
- **P1-167 ACTIVE** — one shared PDF preparation node/time/mutation/string budget.

The namespace/reference transform should operate over the already-admitted flattened source/proxy graph with explicit caps on:

- elements examined;
- ids/names/references rewritten;
- attribute/string bytes inspected/generated;
- unresolved/unsupported reference records retained for diagnostics.

If budget or unsupported semantics prevent exact preservation, the artifact must be truthfully degraded rather than silently mounting a collision-prone proxy.

Current flattened diagnostics report clone/style/removal counts and style-budget truncation but no namespace/reference integrity receipt. Diagnostics should eventually distinguish at least rewritten, unresolved, collision-detected and state-diverged cases; counters alone are not the correctness mechanism.

## Block 56 — final classification

**56/56 blocks complete. No new permanent P-code and no canonical status transition.**

Primary refined owners:

- **P0-068 ACTIVE** — flattened same-origin representation must not collapse independent document identity/group namespaces into cross-frame side effects;
- **P1-213 ACTIVE** — collision-sensitive/inert transformation must finish before live insertion, because late namespace repair cannot undo every state transition;
- **P1-187 ACTIVE** — final secondary representation must preserve the source frame's required rendered/control/disclosure/SVG/link state.

Supporting boundaries:

- **P0-004 ACTIVE** — physical selected-copy fidelity/completeness;
- **P0-064 ACTIVE** — preflight/materialization envelope;
- **P1-167 ACTIVE** — shared bounded preparation/reference-rewrite work.

P0-075 remains the broader hostile shared-DOM/host-CSS boundary but is not required as a primary owner for the deterministic browser namespace collisions proven here.

`P1-230` remains deliberately unallocated.

### Final acceptance statement

A frame is not merely a subtree. It is a document-scoped namespace/state container. A faithful flattened archival representation must either preserve that isolation or perform a bounded, typed, coordinated, **pre-connection** materialization of every required identity/group/reference edge. The representation must then prove or truthfully degrade final state before PDF bytes are treated as a faithful copy.

Real unpacked Chrome remains release QA; managed Chromium 144 results above are engineering evidence only.