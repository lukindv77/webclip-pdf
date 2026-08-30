# Durable audit evidence — flattened document namespace fidelity — Blocks 33–48 — 2026-08-30

Third interruption-safe stage. Exact fresh baseline remains `013bea563f504a325f501ecc4521b1e41cdd11ef`. Audit/docs only; runtime, registry/status, manifest/version/build/tag/release unchanged.

## Block 33 — repair question is graph preservation, not attribute copying

Stage 1/2 proves that correct source elements can become incorrect only after multiple source documents share one owner document. The next question is whether a bounded per-frame namespace transform can preserve the final representation.

A valid repair control must preserve both identity declarations and every reference/grouping edge that depends on them.

## Block 34 — coordinated group-name remap preserves radio state

A repair-model fixture cloned two independent source frames but prefixed each cloned radio `name` with a frame-local namespace **before connection**.

Both source radios were checked. With per-frame names, both proxy radios remained checked after connection.

PDF-visible `R1_CHECKED` and `R2_CHECKED` presentation matched the direct source state.

This proves the radio collision is preventable by namespace isolation; it is not an unavoidable limitation of Chromium PDF.

## Block 35 — coordinated details-name remap preserves both open disclosures

The same pre-connection repair prefixed each cloned `<details name>` by frame namespace.

Both disclosures remained `open=true` after both proxies connected, and both body texts remained in the PDF.

This is the positive counterpart to Stage-2 automatic closing.

## Block 36 — coordinated form-id/IDREF remap preserves form ownership

Before connection, each frame-local form `id` was prefixed and each associated input's `form` attribute was rewritten to the new local id.

After both proxies connected:

- each external input's `.form` remained its own cloned frame form;
- frame 1 stayed valid;
- frame 2 stayed invalid.

PDF-visible validity presentation matched the direct source state.

## Block 37 — SVG repair requires ID **and reference** rewrite

For duplicate local SVG gradients, a repair control prefixed the second frame gradient id and rewrote the corresponding `fill="url(#...)"` reference before connection.

Direct source raster was approximately:

- red ~38.6k pixels;
- blue ~38.3k pixels.

Repaired flattened raster was approximately:

- red ~38.3k;
- blue ~38.3k.

The intended two-color representation was restored.

## Block 38 — naïve id-only renaming breaks SVG references

A separate control prefixed all gradient ids but intentionally left `fill="url(#g)"` unchanged.

With no remaining matching `id="g"`, the tested PDF had:

- red: 0 classified pixels;
- blue: 0 classified pixels.

Therefore "make ids unique" is not a sufficient acceptance design. Namespace transformation must rewrite the complete typed reference graph atomically.

## Block 39 — internal PDF fragment navigation is repairable by coordinated remap

Two frame-derived regions each contained local:

- `href="#same"`;
- `id="same"`.

Naïve flatten produced one PDF named destination `/same` and two annotations both targeting `/same`, reproducing earlier saved-copy readability evidence.

A per-frame coordinated rewrite produced:

- named destinations `/f1__same` and `/f2__same`;
- first annotation `/f1__same`;
- second annotation `/f2__same`.

Thus namespace isolation can preserve later-reading internal navigation when declaration and reference are rewritten together.

## Block 40 — repair graph must be typed

Different reference classes cannot be handled by one blind string replacement. At minimum the physically proven matrix includes:

- singular HTML IDREF (`form`);
- fragment URL (`href="#id"`);
- SVG/CSS fragment URL (`url(#id)` / `<use href="#id">`);
- grouping name whose semantics are not an IDREF (radio `name`, details `name`).

Future implementation must enumerate supported classes and bound traversal/string work under P1-167/P0-064 rather than regex-rewriting arbitrary page text.

## Block 41 — per-frame namespace prefix must itself be collision-safe

A generated prefix is representation-owned identity. It cannot be a page-guessable textual convention that can already exist in source ids/names and silently collide again.

Acceptance needs exact per-proxy generation/identity plus collision checking or a stronger isolated representation mechanism. This is an architecture refinement under P0-068/P1-213, not a new security owner.

## Block 42 — rewrite must happen before live connection

Control schedule first connected two naïve conflicting proxies, then renamed radio/details groups and form ids/references afterward.

Immediately after naïve mount:

- first radio was already unchecked;
- second details was already closed;
- form validity/ownership had already crossed frames.

This proves the mutation point is connection into the shared document namespace.

## Block 43 — late remap does not restore radio/details state

After the collision had happened, the control assigned unique per-frame radio and details names.

Final state remained:

- first radio `checked=false`;
- second details `open=false`.

Changing the grouping namespace later does not reconstruct the source state that Chromium already changed.

Therefore post-hoc cleanup is insufficient.

## Block 44 — late form-ID remap can restore association but does not make late mutation safe

In the same schedule, late form-id + `form=` rewrite did restore each external input to its own form and restored the expected valid/invalid calculation.

This difference is important: some derived associations recompute from current references, while radio/details state transitions are destructive state changes.

A repair must not rely on all reference classes being reversibly recomputed.

## Block 45 — P1-213 pre-insertion inertness is directly strengthened

P1-213 currently says the flattened same-origin iframe print proxy must be inert before live insertion.

Fresh namespace evidence gives this a concrete fidelity dimension:

- prepare a collision-free/reference-complete representation while detached;
- only then connect it;
- do not connect a partially rewritten proxy and hope to repair it afterward.

This is in addition to previously known custom-element/active-content concerns.

## Block 46 — current diagnostics do not report namespace integrity

Fresh `content.js` flattened diagnostics expose bounded fields including:

- mode/mount/depth/sameOrigin;
- sourceTextChars;
- cloneElementCount;
- styledElementCount;
- removedScripts;
- removedExcludes;
- styleBudgetTruncated.

There is no current receipt for:

- duplicate ids/names after flatten;
- rewritten IDREF/fragment edge counts;
- unresolved references;
- radio/details grouping divergence;
- source-vs-proxy control/open state mismatch;
- SVG local-reference rebinding.

Thus current diagnostics can look structurally clean while the physical representation changed.

## Block 47 — diagnostics are not a substitute for isolation

Adding collision counters alone would not repair the artifact. Required ordering is:

`source document state -> bounded detached namespace/reference materialization -> final connected representation -> equivalence/degradation receipt -> physical PDF`

Diagnostics should support truthfulness, but isolation/materialization remains the correctness boundary.

## Block 48 — third-stage owner/acceptance decision

No new P-code/status change.

Primary:

- **P0-068 ACTIVE** — document-local identity/group namespaces cannot create cross-frame side effects in the flattened representation;
- **P1-213 ACTIVE** — all collision-sensitive transformation must complete while inert/detached before connection;
- **P1-187 ACTIVE** — final proxy must preserve source rendered/control/disclosure/SVG/link state.

Supporting:

- **P0-004 ACTIVE** — final selected PDF completeness/fidelity;
- **P1-167 ACTIVE / P0-064 ACTIVE** — any namespace/reference graph rewrite must be admitted and bounded before/while materializing the already-budgeted flattened subtree.

## Interruption-safe resume point

Blocks 1–48 are complete. Final Blocks 49–56 should perform duplicate/root-cause reconciliation against P0-068/P1-213 historical evidence, define the minimum namespace/reference taxonomy without overclaiming untested classes, explicitly mark `:target`, image-map and clipPath boundaries, inspect whether source-to-proxy equivalence can be sampled without unbounded work, and write the final no-new-P classification. Then index and deliver through exact compare/PR/CI/TOCTOU/merge if the session window permits.