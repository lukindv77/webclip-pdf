# Durable research evidence — CSS visual dependency graph — consolidated final — 2026-08-30

Canonical P-code owner/status authority remains exclusively in `RESEARCH_REGISTRY.md`. This document is the compact current-tree representation of the completed **56-block** CSS visual-dependency research. It replaces four interruption-safe checkpoints while preserving their exact historical bytes through Git provenance.

No runtime source, registry row, manifest/version/build/tag/release state is changed by this compaction. Research conclusions and acceptance boundaries are unchanged.

## Exact provenance and recovery

All four source checkpoints were present together on pre-compaction canonical `main`:

`4a44b75b283e18e5091913c793059965112eb1a3`

Their Git blob identities are content-addressed recovery receipts:

| Blocks | Historical source path | Git blob SHA |
|---|---|---|
| 1–16 | `project_docs/RESEARCH_CSS_VISUAL_DEPENDENCY_GRAPH_2026-08-30_EVIDENCE.md` | `9ab49df3b368a68bfac8ade402453f85b0df9a20` |
| 17–32 | `project_docs/RESEARCH_CSS_VISUAL_DEPENDENCY_GRAPH_STAGE2_2026-08-30_EVIDENCE.md` | `bc772620ab18d202406adf0a81d69483000ba992` |
| 33–48 | `project_docs/RESEARCH_CSS_VISUAL_DEPENDENCY_GRAPH_STAGE3_2026-08-30_EVIDENCE.md` | `88f25125e66412d50434af2a425157f5c5dfb581` |
| 49–56 | `project_docs/RESEARCH_CSS_VISUAL_DEPENDENCY_GRAPH_FINAL_2026-08-30_EVIDENCE.md` | `7bac52cee7a9b7e3eb1aff4b48faf7370784bafb` |

`project_tools/test_staged_evidence_compaction.py` verifies on every Repository Integrity run that each historical path at that exact commit hashes to the recorded blob, that the retired BASE/STAGE2/STAGE3 paths are absent from the current tree, and that this current semantic evidence preserves a marker for every original block. The full original Markdown therefore remains byte-for-byte recoverable from Git history.

Original researched source baseline: `main = cd342ac548606ab93eba3d1f2ebc9a68f2f51c08`.

Managed physical probes used Chromium `144.0.7559.96` with forced `screen` media plus raw CDP `Page.printToPDF`, print backgrounds enabled. This is engineering evidence, not real unpacked-Chrome release QA.

## Owner/classification result

No new P-number and no canonical status transition resulted from this 56-block tranche.

Primary refined owners remain:

- **P1-003 ACTIVE** — renderer-resource preparation must describe the actual final selected visual dependency graph under bounded deadlines, including CSS/pseudo resources, frame parity, renderer-selected candidates, post-preparation graph changes and truthful known/unknown omissions.
- **P1-187 ACTIVE** — the same-origin flattened secondary representation must preserve required rendered visual state and frame-local resource provenance under explicit materialization budgets.

Supporting boundaries remain P0-004, P0-070, P0-075, P1-004, P1-167, P1-229 and P2-007. Their status is not changed by this evidence compaction.

## Block-preservation map

The following map preserves the substantive finding, positive control or rejected hypothesis carried by every original block. Exact fixture text, measurements and source excerpts remain recoverable from the provenance ledger above.

### Blocks 1–16 — uncovered CSS/pseudo visual resources

1. Fresh authority/source reset used exact researched `main`; no new owner was allocated.
2. Duplicate/root-cause search found CSS visual-resource completeness already owned by P1-003 and flattened rendered state by P1-187.
3. Current generic CSS URL parsing is applied by prefetch only to element `backgroundImage`, not to the wider computed visual-property graph.
4. Cross-origin frame-agent preparation is narrower still: selected ordinary IMG only, with no CSS visual-resource scan.
5. Delayed `border-image-source` can be absent from immediate physical PDF while appearing after settlement; print completion is not readiness proof.
6. Delayed `list-style-image` can be silently absent while list text remains, then appear after settlement.
7. Delayed pseudo `::before { content:url(...) }` is physically relevant and is missed by element-only computed-style scanning.
8. Delayed `::marker content:url(...)` is likewise a physically relevant pseudo-tree dependency missed by the current scan.
9. Production-shaped delayed ordinary `background-image` is a positive control: the current bounded background scan discovers and waits it successfully.
10. The same production-shaped scan discovers zero tasks for delayed `border-image`, allowing physical omission before settlement.
11. The same current scan discovers zero tasks for delayed `list-style-image` and prints before that resource settles.
12. The same current scan discovers zero tasks for delayed pseudo-content image and prints before settlement.
13. Because uncovered resource classes create no tasks, a structurally clean resource report can coexist with a physically missing selected visual dependency.
14. Current flattened-frame style whitelist omits tested `border-image-source`, `list-style-image`, pseudo content, `clip-path` and `box-shadow`; a settled source effect can disappear in the proxy representation.
15. Child-head pseudo style rules disappear when only body nodes are proxied and pseudo computed state is not reconstructed.
16. Precision controls rejected new claims from the tested mask, shape-outside, external SVG filter and inconclusive external clip-path schedules.

### Blocks 17–32 — candidate over-admission, pseudo fonts and post-scan graph creation

17. A 500-candidate `image-set()` computed value exposed 500 URLs to the current parser while Chromium at DPR 1 physically requested only the selected 1x candidate.
18. In a 12-candidate deadline schedule, the renderer-selected 1x image was ready but current-shaped preload started all alternatives and reported 11 failures, demonstrating false-partial semantics.
19. One valid `image-set()` value can consume the complete 500-task resource cap even though the measured renderer selected one candidate.
20. Ordinary multi-layer backgrounds are a positive control: multiple simultaneously composited URLs legitimately require multiple dependencies.
21. A CSS custom property resolving into covered `background-image` becomes a concrete URL and is discoverable; variables themselves are not the root cause.
22. A custom property resolving into uncovered `border-image-source` remains invisible because the admitted property set, not variable syntax, is the limitation.
23. A delayed pseudo-only web font can be absent from immediate PDF and present after settlement.
24. Current font readiness derives font state from the ordinary element and does not acquire pseudo-element font state, so the pseudo-only font is missed.
25. The tested `@counter-style symbols:url()` schedule did not produce a valid positive resource control and was rejected.
26. WebClip header insertion after prefetch can cause host CSS to create a new delayed selected background dependency after the scan.
27. WebClip print-style insertion after prefetch can likewise create a new selected dependency after the scan.
28. WebClip image-wrapper insertion after prefetch can likewise make page CSS introduce a new selected resource dependency.
29. These post-scan mutations refine existing representation-generation/resource and isolation owners; adding more pre-scan properties alone cannot prove final graph readiness.
30. Frame-agent-shaped cross-origin selected content with only delayed ordinary background reports zero attempted resources and can print without that background; top/frame parity is incomplete.
31. The frame mismatch remains within the existing P1-003 frame-parity root rather than requiring a new frame-specific resource owner.
32. Stage classification remained no-new-owner/no-status-transition; later work was directed toward final graph identity and bounded truthful convergence.

### Blocks 33–48 — same-origin proxy ordering and resource-provenance drift

33. Production flatten ordering clones/adopts body nodes into a top-owned proxy before reading/copying source computed whitelist styles.
34. `cloneNode(true)` without cross-document adoption is a positive control: it does not by itself change the source frame-relative computed background URL.
35. Adoption of the clone into a detached top-owned container can change the still-frame-owned source element's computed relative background URL to the top-document base while leaving its raw style unchanged.
36. Current production-shaped order therefore reads the already-mutated top-based source computed URL and writes that wrong absolute URL into the proxy.
37. Merely having `background-image` in the whitelist does not preserve frame provenance when the value is read after the representation transition changed its resolution.
38. A source frame resource confirmed ready before flatten can become stale evidence when adoption produces a different top-document resource URL afterward.
39. Physical control showed that newly rebased delayed top resource can be absent from immediate PDF after the original frame resource was already confirmed ready, then appear after settlement.
40. Copy-before-adoption is the precision positive control: capturing source computed values first preserved the tested frame-relative background through later adoption.
41. Non-whitelisted raw relative `border-image-source` rebases through the top document and can request/print the wrong top resource.
42. Non-whitelisted raw relative `list-style-image` similarly rebases and can print a top-document marker instead of the frame resource.
43. A custom-property-backed border image retained frame provenance in the tested schedule, proving that URL rebasing cannot be generalized by syntax alone.
44. A border image supplied only by child-head CSS disappears independently because the child head is not represented and the property is not whitelisted.
45. A child-head pseudo image rule disappears independently because neither child-head rule nor pseudo computed state is reconstructed.
46. Inserting the flattened-frame marker itself can trigger host CSS that creates a new delayed selected dependency after prefetch.
47. Current local preparation performs no final resource revalidation/convergence pass after header/style/wrapper/proxy mutations and final proxy property establishment.
48. Stage classification remained P1-003 for final graph truth and P1-187 for flattened representation provenance, with no new owner/status transition.

### Blocks 49–56 — duplicate reconciliation and final acceptance

49. Historical reconciliation confirmed that several delayed pseudo/background/mask/list/font/frame cases intentionally revalidate the earlier durable tranche that already reopened P1-003; they are not new roots.
50. New refinements in this tranche are principally border-image physical omission, generated image slots, renderer-selected versus parser candidates, post-scan helper/proxy dependency creation, same-origin adoption ordering, resource rebasing/provenance loss, child-head/pseudo representation loss and copy-before-adoption preservation.
51. A truthful readiness receipt must be bound to the exact final representation generation, because the dependency graph can change after the earlier report through page reactions, proxy insertion, adoption/rebasing and representation substitution.
52. Renderer-selected candidate dependencies must be distinguished from parser-discovered alternatives; inability to identify the selected candidate is graph uncertainty, not fabricated rendered-resource failure.
53. Future semantics must distinguish confirmed-ready final graph, partial-known required dependency failure/omission/timeout, and graph-unknown/non-converged state; degraded saves must not be represented as proven complete when graph identity is unknown.
54. One bounded contract must cover the top selected representation, same-origin flattened proxy and cross-origin child representation; making only the top scanner exhaustive is insufficient.
55. Positive controls retained include delayed ordinary IMG/background waits, legitimate multi-layer background URLs, covered custom-property background resolution, clone-without-adoption stability, copy-before-adoption provenance preservation and the tested custom-property border provenance; rejected/inconclusive controls remain non-findings.
56. Final classification: no new permanent P-code or status transition; resource readiness is a property of the exact final renderer representation and actually selected dependency graph, generation-bound through preparation/frame representation changes with uncertainty preserved when bounded code cannot prove convergence.

## Preserved acceptance direction

The complete tranche therefore retains these architecture requirements:

1. **P1-003:** acquire or truthfully classify the actual renderer-selected dependency graph for the exact final representation rather than equating parsed URL strings with resource completeness.
2. **P1-003:** represent known partial failure separately from graph-unknown/non-converged state; a clean report over an incomplete task vocabulary is not proof of fidelity.
3. **P1-003:** apply one bounded readiness vocabulary across top, same-origin proxy and cross-origin selected child representations.
4. **P1-187:** preserve source-frame rendered style/resource provenance and pseudo/head-derived visual state through flattened representation creation without depending on source computed state after adoption changes it.
5. Keep graph acquisition/convergence within shared bounded preparation work rather than unbounded rescans or fetching every textual alternative.
6. Bind readiness evidence to the same physical representation generation eventually rendered to PDF.
7. Preserve the positive controls and rejected hypotheses above so future repair does not overgeneralize or regress working cases.
8. Real unpacked-Chrome QA remains separate release evidence; these managed Chromium probes are engineering acceptance evidence only.

## Evidence interpretation

This file is current durable semantic evidence, not a replacement status registry. Historical source checkpoints may contain wording or numbering statements that later became stale; current status and permanent numbering always come from `RESEARCH_REGISTRY.md`.

The compaction removes interruption mechanics and repeated classification/environment boilerplate from the working tree while retaining every block's substantive finding/control and an exact Git recovery path for the original text.

## Terminology migration provenance note

Current filenames in this document use the canonical Research terminology. Historical source identity is anchored by the recorded source commit and blob SHA values; immutable historical pathname spellings are intentionally not reproduced in the current mutable tree.
