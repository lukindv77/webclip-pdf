# Durable research evidence — flattened document namespace fidelity — consolidated final — 2026-08-30

Canonical P-code owner/status authority remains exclusively in `RESEARCH_REGISTRY.md`. This document is the compact current-tree representation of the completed **56-block** same-origin flattened-document namespace research. It replaces four interruption-safe checkpoints while preserving their exact historical bytes through Git provenance.

No runtime source, registry row, manifest/version/build/tag/release state is changed by this compaction. Research findings are retained as historical/regression evidence; current owner status is reconciled below rather than copied from the older checkpoints.

## Exact provenance and recovery

All four source checkpoints were present together on pre-compaction canonical `main`:

`69eeb8a45800dbd21e2f2150ef772f81167c55d7`

Their Git blob identities are content-addressed recovery receipts:

| Blocks | Historical source path | Git blob SHA |
|---|---|---|
| 1–16 | `project_docs/RESEARCH_FLATTENED_DOCUMENT_NAMESPACE_2026-08-30_EVIDENCE.md` | `f27442b95e2528c63c0a0e974a5a26c8c69f859c` |
| 17–32 | `project_docs/RESEARCH_FLATTENED_DOCUMENT_NAMESPACE_STAGE2_2026-08-30_EVIDENCE.md` | `f083b46aa6260fd19dfc446275592890582ce960` |
| 33–48 | `project_docs/RESEARCH_FLATTENED_DOCUMENT_NAMESPACE_STAGE3_2026-08-30_EVIDENCE.md` | `8ca747bfea509f3da38098cf109f04d541395d39` |
| 49–56 | `project_docs/RESEARCH_FLATTENED_DOCUMENT_NAMESPACE_FINAL_2026-08-30_EVIDENCE.md` | `ea57fb2663a9b12036ced7c9465defc5102f7466` |

`project_tools/test_staged_evidence_compaction.py` verifies on every Repository Integrity run that each historical path at that exact commit hashes to the recorded blob, that retired BASE/STAGE2/STAGE3 paths are absent from the current tree, and that this semantic evidence preserves a marker for every original block. Exact original Markdown remains byte-for-byte recoverable from Git history.

Original researched source baseline: `main = 013bea563f504a325f501ecc4521b1e41cdd11ef`.

Managed browser: Chromium `144.0.7559.96`; physical probes used forced `screen` media plus worker-equivalent CDP `Page.printToPDF`. This is deterministic engineering evidence, not real unpacked-Chrome release QA.

## Current owner/status reconciliation

The source checkpoints predate later closure/dedup delivery and therefore contain stale status wording. Current Registry is authoritative:

- **P0-068 DONE** — the current canonical flattened-proxy inertness/duplicate-identity root; its Chrome 152 closure is retained in `RESEARCH_P0_068_INERT_FRAME_PROXY_CLOSURE_2026-09-01_EVIDENCE.md`.
- historical **P1-213 is MERGED → P0-068** and is not an independent current owner.
- **P1-187 ACTIVE** remains the current rendered-state/materialization owner for flattened iframe representation fidelity.

This compaction does **not** reopen P0-068 or change P1-187. The namespace fixtures below remain valuable regression/acceptance evidence when future work touches flattened representation semantics.

## Block-preservation map

Exact measurements, fixture wording and historical classifications remain recoverable from the provenance ledger. The map below preserves every substantive finding/control while applying current owner/status truth.

### Blocks 1–16 — namespace collapse physically changes independent frame state

1. Fresh-source admission established that flattening moves child body nodes into a top-owned `Document`, collapsing document-local namespaces; this was treated as refinement of existing flattened-representation owners, not a new-number search.
2. Broad native-control-loss hypothesis was rejected: detached cloning preserved tested checkbox checked/indeterminate, radio choice, range/progress/meter values, details-open and text-input live state.
3. Selected file-input state was a positive control: current Chromium preserved tested `FileList`/visible filename through production-shaped deep cloning and PDF output.
4. Tested `:user-invalid` interaction state was preserved after cloning/connection and remained visible in direct and flattened PDF — positive control.
5. Focus did not transfer to the cloned input, so source `:focus` presentation was lost; supporting representation-state evidence, not a new root.
6. Two independent iframe documents may legally contain same-named checked radio groups and both remain checked in their own source documents; direct PDF preserved both states.
7. Connecting the second proxy into the shared top document caused the first proxy radio to become unchecked because formerly independent groups became one document group.
8. Radio collision reached physical PDF: the first frame's checked-state marker disappeared while the second remained.
9. Radio failure is specifically a shared-document grouping collision; detached clone preservation is the negative boundary, so blanket property-copy fixes are insufficient.
10. Two iframe documents may independently use the same SVG fragment identifier for different gradient definitions; direct PDF preserved red and blue source regions separately.
11. Flattening both SVG trees into one document produced duplicate fragment identity and first-match resolution for the second reference.
12. SVG collision reached physical PDF: the formerly blue region became red, demonstrating synchronous namespace fidelity loss rather than resource-readiness failure.
13. Two iframe documents may independently use the same `form id` with different external-control validity state; direct PDF preserved each form's own presentation.
14. Flattening retargeted both `form="shared"` references to the first top-document form, crossing ownership and swapping derived validity state.
15. Form-owner collision reached physical PDF: visible `valid/invalid` presentation changed between source and flattened output.
16. First-stage acceptance established that a faithful secondary representation must preserve document-local grouping, typed IDREF/fragment identity and final state after materialization under bounded semantics rather than treating a frame as an attribute-only subtree.

### Blocks 17–32 — additional reference classes, named groups and document state

17. Duplicate review against older complex-layout evidence excluded already-owned style/layout/select/resource-provenance losses; this tranche remained focused on multi-document namespace interaction and source-document state.
18. Two independent image-map `name/usemap` associations collapse structurally after flattening so the second image resolves to the first map.
19. Tested Chromium emitted no PDF URI annotations for image-map areas in either source or flattened output, so no current saved-PDF image-map navigation defect was promoted.
20. Two source documents with duplicate local SVG `<use href="#s">` references each rendered their own red/blue symbol in direct PDF — positive source control.
21. Flattened duplicate SVG `<use>` identity resolved the second reference to the first symbol; physical PDF changed from red+blue to both first-frame color.
22. Duplicate clipPath fixture lacked a valid direct positive raster and was explicitly rejected.
23. Two independent documents may each contain an open named `<details>` group with the same name; direct PDF preserved both disclosure bodies.
24. Connecting the second flattened named-details group caused the second disclosure to close because both groups now shared one document namespace.
25. Named-details collision physically removed the second disclosure body from PDF, a direct later-reading completeness consequence.
26. Source `:target` was shown as a document-state positive control: direct child printing preserved target-dependent presentation.
27. A clone in a top-owned proxy no longer matched the child's `:target` because that state derives from owning-document URL state rather than element attributes.
28. The simple flattened target-state model lost source target presentation in PDF; later final classification retained this only as supporting architecture evidence because pseudo-generated content was a confounder already known in the representation.
29. `:target` demonstrates a document-context class not solved merely by adding more properties to a computed-style whitelist.
30. Physically proven namespace taxonomy now included group names, ID/fragment reference namespaces and owning-document-derived state.
31. Owner decision remained deduplicated: existing flattened identity/inertness root plus rendered-state fidelity covered the findings; no new P-code was justified.
32. Second-stage acceptance required treating each frame as a namespace-bearing document, preserving supported group/reference/state classes or truthfully degrading; image-map and clipPath observations remained non-promoted.

### Blocks 33–48 — coordinated pre-connection repair controls

33. Repair question was framed as graph preservation rather than independent attribute copying: identity declarations and every typed reference/group edge must remain coherent.
34. Pre-connection per-frame radio-name remap preserved both source checked states and PDF-visible checked markers.
35. Pre-connection per-frame details-name remap preserved both open disclosures and both body texts.
36. Coordinated form-id plus `form=` reference remap preserved each external control's original form ownership and validity presentation.
37. SVG repair required both unique ID and matching `url(#id)` rewrite; coordinated remap restored the intended red/blue physical representation.
38. Naïve ID-only renaming without rewriting SVG references broke both references, proving declaration uniqueness alone is not a valid repair.
39. Coordinated internal fragment remap produced distinct PDF destinations/annotations for each frame instead of one collapsed destination.
40. Reference transformation must be typed: singular HTML IDREF, fragment link, SVG/CSS fragment URL and non-IDREF grouping names have different semantics; blind string replacement is not acceptable.
41. Per-frame generated namespace identity itself must be collision-safe rather than a page-guessable prefix that can already exist in source content.
42. Collision-sensitive transformation must occur before live connection: naïve mount already changed radio/details/form state before any later cleanup could run.
43. Late name remap did not restore a radio already unchecked or a details element already closed, proving destructive grouping transitions are not fully reversible.
44. Late form IDREF rewrite could restore form association, demonstrating that some associations recompute while other state changes do not; repair cannot assume universal reversibility.
45. Historical pre-insertion inertness acceptance gained a concrete fidelity rule: complete collision-free/reference-complete materialization while detached, then connect, never mount partially rewritten state.
46. Existing flattened diagnostics lacked namespace-integrity receipts such as duplicate/rewrite/unresolved counts or source-vs-proxy group/state divergence.
47. Diagnostics alone cannot repair the artifact; correctness ordering is source state -> bounded detached materialization -> final connected representation -> equivalence/degradation receipt -> physical PDF.
48. Third-stage classification remained no-new-owner/no-status-transition; namespace isolation and final rendered-state fidelity stayed within the existing flattened representation roots under shared budgets.

### Blocks 49–56 — historical reconciliation and final acceptance

49. Historical family evidence already required duplicate document identity to be neutralized before live insertion, so fresh namespace fixtures were concrete reproductions of an existing root rather than a new architectural defect.
50. The historical merged owner specifically covered connection-triggered behavior; fresh radio/details/form/SVG evidence sharpened that same connection boundary without creating an independent current owner.
51. Strong physical regression matrix retained: radio collision, named-details content loss, form IDREF validity swap, SVG gradient collision, SVG `<use>` collision, and internal PDF fragment-destination collapse/restoration.
52. Positive/non-promoted boundaries retained: tested ordinary native clone state and file-input/user-invalid preservation; image-map association lacked PDF annotation consequence; clipPath lacked a valid positive control; target-state evidence remained supporting rather than an isolated new owner.
53. Successful repair control was coordinated and pre-connection across group names, form IDs/references, SVG IDs/references and internal fragment IDs/references; it restored checked/open/form/SVG/link outcomes.
54. Naïve ID-only repair and late post-mount repair failed for different reasons, establishing the required ordering: detached clone/materialization -> coordinated typed transform -> state check -> live connection -> physical print.
55. Any future namespace/reference transform must stay inside admitted flattened-subtree and shared preparation budgets, with bounded element/reference/string work and truthful unresolved/unsupported diagnostics; silent collision-prone fallback is not acceptable.
56. Final historical classification was 56/56 complete with no new permanent P-code/status transition: a frame is a document-scoped namespace/state container, and faithful flattening requires preserved isolation or bounded typed coordinated pre-connection materialization plus truthful final-state evidence.

## Preserved acceptance / regression direction

The complete tranche retains these requirements without changing current Registry status:

1. **P0-068 regression boundary (currently DONE):** future changes must not reintroduce duplicate identity/group namespace side effects when multiple frame representations are materialized.
2. **P1-187 ACTIVE:** flattened representation must preserve required current rendered/control/disclosure/SVG/link state and document-local provenance under explicit budgets.
3. Historical merged inertness wording remains subsumed by P0-068; it is not a second current owner.
4. Namespace repair, if used, must be typed, coordinated and complete while detached, before connection can mutate radio/details/other state.
5. Declaration rewrite must include every supported reference edge; ID uniqueness alone is insufficient.
6. Collision-safe representation-owned namespace identities and bounded traversal/string/reference work are required.
7. Current/source-to-proxy equivalence or truthful degradation must be available for unsupported/unresolved reference classes; diagnostics support truthfulness but do not substitute for isolation.
8. Preserve positive and rejected controls so future implementation does not overgeneralize ordinary clone-state loss or claim unsupported image-map/clipPath/target conclusions.
9. Real unpacked-Chrome QA remains separate release evidence; the managed Chromium results here remain deterministic engineering/regression evidence.

## Evidence interpretation

Historical checkpoints intentionally remain recoverable exactly and therefore preserve their then-current ACTIVE/MERGED assumptions. Those old status statements are **historical only**. Current status is the Registry truth stated above.

This compaction removes interruption mechanics and stale duplicated status narration from the working tree while retaining every block's substantive finding/control and an exact Git recovery path for original wording.

## Terminology migration provenance note

Current filenames in this document use the canonical Research terminology. Historical source identity is anchored by the recorded source commit and blob SHA values; immutable historical pathname spellings are intentionally not reproduced in the current mutable tree.
