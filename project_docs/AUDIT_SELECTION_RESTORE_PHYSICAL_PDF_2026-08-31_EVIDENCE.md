# Durable audit evidence — C02 SelectionSnapshot restore -> final physical PDF — 2026-08-31

Canonical status and single-owner authority remain exclusively in `AUDIT_REGISTRY.md`.

Audited fresh source baseline: `main = 07df33f5d1ed572bd4da3083411aef9dd94d21c0`.

This tranche closes the missing C02 B2 -> B6 evidence bridge: a SelectionSnapshot is restored by the actual current `content.js`, then the current selected-only print preparation is allowed to run, and a physical Chromium PDF is inspected. The goal is not to repeat the earlier locator/restore audit. It is to determine whether a restore result that is accepted by the current renderer actually produces the intended saved artifact.

Managed-browser evidence is deterministic engineering evidence, not a substitute for real unpacked-Chrome release QA or optional-host-permission cross-origin QA.

## Executive classification

**C02 = `ARTIFACT-COVERED / FINDING`.**

No new permanent P-number and no current status transition are justified by this tranche.

- **P1-001 ACTIVE — primary restore owner.** Current v3 restore can report a high-confidence successful rendered target whose current visual state is not admissible (`visibility:hidden`, `opacity:0` with non-zero geometry). The restored selection then produces no intended content in the physical PDF. The same owner already covers candidate-set/confidence soundness: a stronger exact target outside the fixed first-5000 tag prefix can be omitted from ranking while an in-prefix decoy is accepted with high confidence; physical PDF then serializes the wrong target.
- **P0-080 ACTIVE — stale/disconnected selection generation.** A successfully restored selected node can later be replaced by same-document application DOM. The stale disconnected node remains in the local selection map, `totalIncludeCount()` remains non-zero, save admission still succeeds, but the physical selected artifact contains none of the intended selected content.
- **P0-070 ACTIVE — exact admitted generation.** Restore success is only useful if the exact admitted rendered target remains the generation serialized into the saved copy. The hidden/decoy/stale cases demonstrate that current restore counters are not a final-artifact receipt.
- **P0-075 ACTIVE — hostile/live page boundary.** Restore and print still consume the live page as the authority boundary; post-restore page-controlled state can invalidate what the restore result appeared to authorize.
- **P0-004 ACTIVE — physical selected-copy consequence.** In the hidden/stale cases the intended Include is physically absent; in the decoy case the wrong selected content is physically present.
- **P1-200/P1-171 remain supporting remote/session owners.** Earlier durable restore evidence already proves remote restore/session/frame-confidence defects. This C02 physical tranche uses deterministic local/same-origin controls and does not allocate a second remote-specific owner.

The earlier `AUDIT_SELECTION_RESTORE_SOUNDNESS_2026-08-30_EVIDENCE.md` remains the detailed restore/candidate/session evidence. This file adds only the missing final-physical-artifact bridge and owner reconciliation.

No production runtime, `manifest.json`, version/build/tag/release state is changed by this audit tranche.

## Source boundary on the fresh baseline

Current `content.js` establishes the relevant pipeline:

1. `WEBCLIP_APPLY_SELECTION_SNAPSHOT` calls `startSelection()` and then `applySelectionSnapshot()`.
2. v3 local restore resolves a locator, checks `isUsableCandidate(element)`, mutates Include/Exclude maps and increments restore/confidence counters.
3. `isUsableCandidate()` only requires a non-null document rect at least 2x2; it does not reject `visibility:hidden`, fully transparent (`opacity:0`), clipped/non-painted or otherwise non-admissible visual targets.
4. `resolveElementLocatorV3InDocument()` computes exact CSS and DOM-path candidates, but ranks only `collectTagCandidatesBounded(..., 5000)`; an exact candidate outside that prefix is known but excluded from the ranking/margin set.
5. local selection state stores direct Element references. If an application replaces a restored node after restore, no generation/reconnect fence automatically removes the stale disconnected Element from `state.includes`.
6. `totalIncludeCount()` counts `state.includes.size`, not connected/admissible physical selected nodes.
7. print preparation installs selected-only CSS against live `data-webclip-pdf-include` markers and the live document. A stale detached selected Element therefore cannot authorize any corresponding live printable node.

These facts already map to current owners. The remaining question for C02 was whether the defects survive through actual physical PDF generation rather than remaining renderer-only concerns.

## Physical probe method

Durable probe: `project_tools/audit_selection_restore_physical_pdf.py`.

The probe:

- loads the actual repository `content.js` into safe local fixtures;
- mocks only the extension message transport needed to drive current content-script commands;
- captures real SelectionSnapshot v3 objects through the current save metadata path;
- applies them through the actual `WEBCLIP_APPLY_SELECTION_SNAPSHOT` handler;
- starts the actual current download preparation path;
- deliberately holds the mocked worker `WEBCLIP_GENERATE_PDF` reply so physical `Page.printToPDF` runs while the page is in the exact current prepared state;
- extracts physical PDF text with `pypdf`;
- resolves the held worker request only after artifact capture, allowing current rollback code to finish.

The probe does not copy a simplified selection resolver or print stylesheet. The relevant logic under test is the repository `content.js` itself.

## L3/L4 controls and findings

### 1. Stable restored Include survives benign DOM insertion — PASS control

A visible article is selected and snapshotted. On the restore page an unrelated sibling is inserted before it while the intended article retains the semantic fingerprint.

Observed contract:

- restore reports one Include;
- intended current node receives the Include marker;
- physical PDF contains the intended marker text;
- unrelated inserted content is not promoted into selected output.

This is the basic positive control showing that C02 is not claiming restore or physical serialization always fails.

### 2. Restored Exclude remains absent from the physical saved copy — PASS control

A parent Include plus nested Exclude is captured and restored.

Observed contract:

- Include and Exclude restore counters are successful;
- physical PDF contains the retained parent marker;
- the Excluded marker is absent.

This confirms the final-artifact probe is exercising the current selected-only Include/Exclude path rather than a whole-page PDF shortcut.

### 3. Same-origin frame restore reaches the physical PDF — PASS control

A selected node inside a same-origin `srcdoc` frame is snapshotted. A benign sibling insertion is made inside the child document before restore.

Observed contract:

- v3 framePath restore succeeds;
- intended frame node is selected;
- physical PDF contains the frame marker.

This is a same-origin frame parity control. It does not close P1-004/P1-171 cross-origin permission/document-generation requirements.

### 4. Equal plausible candidates fail closed — PASS control

A locator is replayed onto two equal in-window candidates.

Observed contract:

- restore does not select either candidate;
- `ambiguousIncludes` increments;
- no ambiguous candidate marker appears in the physical selected artifact.

The margin ambiguity mechanism therefore can fail closed when all material candidates participate in ranking.

### 5. `visibility:hidden` target reports high-confidence restore but produces no intended PDF content — FINDING

The snapshot is captured while the target is visible. The restore page keeps the same geometry and locator identity but applies `visibility:hidden`.

Observed contract:

- current v3 resolver still returns the intended node with high confidence;
- `isUsableCandidate()` accepts it because its bounding box remains non-zero;
- restore reports success and keeps a local Include;
- physical PDF does **not** contain the target marker.

Therefore current restore success is not a truthful rendered-target/final-artifact admission receipt. This is direct physical confirmation of current **P1-001** wording.

### 6. `opacity:0` target reports high-confidence restore but produces no intended PDF content — FINDING

The same schedule is repeated with a geometrically non-zero but fully transparent target.

Observed contract:

- high-confidence restore is reported;
- Include admission succeeds;
- physical PDF omits the intended marker.

Non-zero geometry is not sufficient current visual admission.

### 7. Exact intended target beyond first-5000 tag prefix loses to an in-prefix decoy, and PDF serializes the decoy — FINDING

The original locator contains strong structural/semantic identity. On the restore page:

- an in-prefix decoy shares the scored semantic fingerprint;
- 4,999 additional same-tag fillers keep the decoy inside the bounded candidate set;
- the true exact target is placed after the first 5,000 same-tag candidates;
- current code still computes the exact CSS/DOM candidate but does not insert it into the ranked set.

Observed contract in the physical probe family:

- restore returns the in-prefix decoy with high confidence (the exploratory run measured score 82; the durable probe asserts the semantic invariant rather than pinning a score constant);
- intended exact target is not selected;
- physical PDF contains `DECOY_ONLY_MARKER`;
- physical PDF does not contain `TARGET_ONLY_MARKER`.

This converts the earlier resolver-soundness proof into a B6 artifact failure: the saved copy can confidently contain the wrong restored region.

The ambiguity positive control above explains why this matters: omitting the exact target from the candidate set also removes it from the confidence margin, allowing false confidence rather than fail-closed ambiguity.

### 8. Post-restore same-document replacement leaves a stale Include count and allows an empty selected artifact — FINDING

A valid visible target is restored successfully. Before save, page script replaces that selected element with a new unmarked live node.

Observed contract:

- the originally selected Element becomes disconnected;
- no live node has the Include marker;
- internal selection map still contains one Include, so save/download admission succeeds;
- current print selected-only CSS has no connected selected node to preserve;
- physical PDF contains no intended target marker (only WebClip metadata/header remains relevant).

No navigation, URL change or cross-origin behavior is required. Same-document application replacement is enough. This is direct physical C02 evidence for **P0-080**, with **P0-070/P0-075/P0-004** supporting consequences.

## Duplicate/root-cause reconciliation

This tranche intentionally does **not** allocate a new P-code.

- Hidden/transparent current-node restore is exactly the current compact **P1-001** acceptance wording.
- Fixed-prefix candidate-set false confidence was already classified in `AUDIT_SELECTION_RESTORE_SOUNDNESS_2026-08-30_EVIDENCE.md` as P1-001/P1-168 supporting work rather than a new restore owner.
- Stale disconnected same-document selection is exactly **P0-080**.
- The fact that these states survive into a physical artifact is a downstream manifestation of **P0-070/P0-075/P0-004**, not a separate physical-PDF root cause.
- Remote clear/toggle/session and exact child-document confidence remain **P1-200/P1-171** supporting C02 owners from prior evidence.

Do not allocate a new late P1 merely because C02 now has physical evidence. A future independent owner would require a materially distinct root cause after a trusted admitted representation/restore receipt exists.

## Acceptance refinement retained by this tranche

C02 can be considered fixed only when restore -> save is end-to-end truthful, including at least:

1. candidate-set confidence is sound under bounded work: known exact/structural candidates cannot be silently excluded by a document-order prefix, and confidence margins account for all privileged exact candidates;
2. a resolved current node passes explicit rendered-target admission, including connectedness and visible/paint-admissible state rather than bbox alone;
3. local and remote restore semantics are idempotent and final-state reconciled, with confidence conservatively composed across frame boundaries;
4. restored selection is generation-bound through save admission and physical serialization; disconnected/replaced selected nodes cannot keep save authority;
5. Include/Exclude final materialized state is revalidated immediately before physical cut, or save fails/degrades truthfully;
6. physical artifact verification/provenance can distinguish restored requested scope from normalized/aliased/failed scope;
7. bounded work remains under P1-168/P1-160/P1-167 rather than replacing correctness with unbounded rescans;
8. cross-origin parity remains explicit and cannot be inferred from same-origin managed controls.

## Coverage consequence

C02 moves from:

`RENDERER-COVERED / PARTIAL`

to:

`ARTIFACT-COVERED / FINDING`.

The achieved evidence is L3 + L4 for the in-repo local/same-origin restore -> physical-PDF boundary.

C03 remains the next material in-repo CORE gap with weaker-than-required end-to-end artifact evidence. Explicit L5 cells remain external-required and cannot be closed by managed evidence.

## Reproduction

From a repository checkout with Chromium, Python Playwright and pypdf available:

```bash
python3 project_tools/audit_selection_restore_physical_pdf.py
```

The script exits non-zero if any positive or adversarial contract assertion changes and prints a compact JSON result for durable comparison.
