# Durable research evidence — renderer-owned replaced-resource convergence — consolidated final — 2026-08-30

Canonical P-code owner/status authority remains exclusively in `RESEARCH_REGISTRY.md`. This document is the compact current-tree representation of the completed **56-block** replaced/media/render-resource research. It replaces three interruption-safe checkpoint files while preserving their exact historical bytes through Git provenance.

No runtime source, registry row, manifest/version/build/tag/release state is changed by this compaction. The research conclusions and acceptance boundaries are unchanged.

## Exact provenance and recovery

The source checkpoints were all present together on pre-compaction canonical `main`:

`73c92c3389790dc4fdf449373eb2392a729359f3`

Their Git blob identities are content-addressed recovery receipts:

| Blocks | Historical source path | Git blob SHA |
|---|---|---|
| 1–20 | `project_docs/RESEARCH_REPLACED_RESOURCE_CONVERGENCE_2026-08-30_EVIDENCE.md` | `b36dc030b245ef39d150d5e8de561859f28ebc19` |
| 21–36 | `project_docs/RESEARCH_REPLACED_RESOURCE_CONVERGENCE_STAGE2_2026-08-30_EVIDENCE.md` | `aa7b484a30c7591ac2e15e0f0269ca6d229f09fa` |
| 37–56 | `project_docs/RESEARCH_REPLACED_RESOURCE_CONVERGENCE_FINAL_2026-08-30_EVIDENCE.md` | `a06dca0fb4752fc4c6514f4069ea97e63cb91452` |

`project_tools/test_staged_evidence_compaction.py` verifies on every Repository Integrity run that each historical path at that exact commit hashes to the recorded blob and that the retired BASE/STAGE2 paths are absent from the current tree. Thus the full original Markdown remains byte-for-byte recoverable with Git while this file carries the current compact semantic evidence.

Original researched source baseline: `main = 66c5cd43906254a583f692bcda3e9e451a29dce6`.

Managed browser used by the original physical probes: `Chromium 144.0.7559.96`. Physical probes used worker-equivalent forced-screen CDP `Page.printToPDF(...ReturnAsStream)` with local HTTP fixtures controlling resource settlement. These are engineering evidence, not real unpacked-Chrome release QA.

## Owner/classification result

No new P-number and no status transition resulted from the 56-block tranche.

Primary refined owners remain:

- **P1-003 ACTIVE** — one bounded renderer-visible selected resource-settlement model, including resource classes not represented by the current IMG/background/font task taxonomy, late-emerging style/resource graphs, top/frame parity and truthful unknown/omitted outcomes.
- **P1-187 ACTIVE** — one bounded inert materialization contract for renderer-owned state and exact frame-local resource provenance that ordinary DOM cloning does not preserve.

Supporting boundaries remain **P0-070**, **P0-004**, **P1-167**, **P2-007**, **P0-075** and **P1-229**. Their status is not changed by this evidence compaction.

## Block-preservation map

The following map preserves the unique finding/control carried by every original block. Exact measurements, fixture wording and source excerpts remain recoverable from the provenance ledger above.

### Blocks 1–20 — initial renderer-state/resource boundary

1. Current top prefetch explicitly models ordinary IMG, computed background-image and fonts; video/media/track, SVG image-like resources and image-input are outside that task vocabulary.
2. Direct top-document paused video prints the current decoded frame — positive renderer capability control.
3. `cloneNode(true)` resets current video temporal state and can print the initial frame instead — P1-187.
4. Poster-only video prints correctly directly — positive control.
5. Existing flattened URL copying preserves several media URLs but cannot preserve temporal renderer state.
6. Required direction is bounded inert current-frame/state preservation or truthful degradation, not recreated live playback.
7. Active WebVTT cue text can enter the physical PDF — positive semantic control.
8. Relative frame-local `<track src>` can rebind after adoption into the top document and lose the active cue — P1-187.
9. Absolutizing the source track URL restores the cue — positive provenance control.
10. Relative video poster provenance is already handled by existing proxy URL copying — positive non-regression control.
11. Direct top-document 2D canvas pixels print correctly — positive renderer capability control.
12. Deep-cloned canvas bitmap is empty — revalidation of existing P1-187 renderer-owned bitmap loss.
13. Managed environment could not obtain a usable WebGL context; no WebGL defect was registered.
14. Tested ordinary `srcset` did not switch merely because output used A4 under forced-screen media — negative control.
15. Tested `<picture media>` likewise retained the screen-selected source — negative control.
16. Tested `sizes="auto"` reflow did not force `currentSrc` reselection — rejected broad hypothesis.
17. Delayed video poster was not awaited by `Page.printToPDF` or current explicit prefetch; immediate bytes omitted the poster and settled bytes included it — P1-003.
18. Delayed SVG `<image href>` behaved the same way — P1-003.
19. Delayed `input[type=image]` resource behaved the same way — P1-003.
20. Those unmodeled resource classes can be physically absent while current resource counters remain clean, so absence of known-task failure is not completeness proof — P1-003 / supporting P0-070.

### Blocks 21–36 — late stylesheet graph and frame-local provenance

21. A pending external stylesheet can materially change selected physical output after an immediate clean print — P1-003.
22. `getComputedStyle()` returns current pre-settlement style rather than making the stylesheet a readiness barrier.
23. A late stylesheet can introduce a new background resource only after the original scan saw `none`; the selected resource graph can emerge after scanning.
24. The acceptance does not require extension-side arbitrary CSS/resource byte fetching; browser-visible settlement/freeze/truthful degradation remains sufficient architecture space.
25. Current report schema cannot distinguish “no tasks” from “selected visual graph has not emerged yet”.
26. Combining an earlier resource report with bytes from a later visual generation is a supporting P0-070 generation-truth risk.
27. Relative frame-local `input[type=image].src` can rebind under the top-document base in the flattened proxy — P1-187.
28. Absolutizing that image-input URL restores the source visual — positive control.
29. Relative frame-local SVG `<image href>` can likewise rebind under the top-document base — P1-187.
30. Absolutizing the SVG image provenance restores the source visual — positive control.
31. The repeated failure shows a bounded renderer/resource-provenance model is preferable to indefinitely adding tag-specific patches.
32. Cross-origin `frame-agent` resource preparation currently models selected ordinary IMG only; renderer-resource parity is narrower than top content — P1-003.
33. Parent aggregation cannot truthfully report a resource class the child never attempted or represented.
34. Existing bounded ordinary-image waits remain a positive design pattern to preserve while generalizing the model.
35. Playing media can advance across ordinary asynchronous preparation latency, so the product must define current-view/admission/physical-cut/static semantics explicitly — supporting P0-070 / P1-187 / P2-007.
36. Current generic diagnostics do not receipt video temporal state, decoded frame, cue state, canvas bitmap or equivalent renderer-owned state; telemetry is not artifact proof.

### Blocks 37–56 — convergence and final architecture

37. Delayed primary `<video src>` itself is outside current readiness tasks; immediate print can omit the frame and settled print can contain it — P1-003.
38. Delayed ordinary IMG is a positive control: current bounded DOM-image wait blocks through settlement and the expected image reaches the PDF.
39. SVG `<feImage>` is physically relevant in direct Chromium — positive capability control.
40. Delayed SVG `<feImage href>` is not awaited by PDF/current explicit prefetch and can be omitted before settlement — P1-003.
41. Cloned audio control state resets temporal state and changes rendered controls — supporting P1-187.
42. Nested relative video `<source src>` is already correctly absolutized by current proxy copying — positive provenance control.
43. Correct absolute media URL still does not preserve the current decoded frame; resource provenance and renderer state are distinct obligations under P1-187.
44. A poster-to-decoded-frame transition caused solely by preparation timing demonstrates the need for explicit generation/output-mode semantics — supporting P0-070 / P2-007.
45. Preparation latency can move a playing video between materially different physical frames.
46. Deliberately paused direct video remains a stable positive current-view control.
47. Poster/static representation is a valid explicit degradation policy only when it is declared rather than silently substituted for a current paused frame.
48. Active caption text is renderer-owned semantic state relevant to later reading/searchability, not only visual pixels.
49. The accumulated dependency classes show that a per-tag URL patch list is not a durable renderer-resource architecture.
50. Top content and selected remote frames need the same bounded resource/state vocabulary and truthful unknown/omission semantics; P1-229 keeps its separate remote selected-only media/geometry responsibility.
51. Any P1-187 materialization must be bounded by node/pixel/byte/time limits and must not recreate active playback merely to preserve appearance.
52. Diagnostics/OperationLog remain telemetry and cannot prove final PDF identity for frame/cue/canvas/late-style state.
53. Future regression matrix must cover delayed IMG, poster, primary media, SVG image/feImage, image input, late stylesheet/resource emergence, paused/cloned media, frame-local track/image provenance, nested source, canvas, captions, responsive-source positive controls and real-browser WebGL.
54. Negative/rejected controls remain binding guardrails: tested A4 forced-screen srcset/picture and `sizes=auto` did not reproduce switching; existing poster/nested-source URL absolutization works; object/embed, external SVG-use and managed WebGL probes were not promoted.
55. Duplicate/root-cause review confirmed P1-003 and P1-187 already own the observed roots; no independent owner was justified.
56. Final convergence rule: WebClip must account for renderer state/resources that actually determine the admitted saved representation, under bounded settlement/materialization and truthful degradation, rather than equating easy-to-enumerate HTML URLs with renderer completeness.

## Preserved acceptance direction

The complete tranche therefore retains these architecture requirements:

1. **P1-003:** establish one bounded renderer-visible resource-settlement model for top document and selected frames, including truthful `unknown/omitted` when the graph is still emerging or cannot be confirmed.
2. **P1-187:** establish one bounded inert representation for renderer-owned state lost by cloning, including canvas/video/media/cue state plus exact frame-local resource provenance.
3. **P0-070:** bind the admitted representation/resource receipt to the exact save generation through physical PDF bytes.
4. **P0-004:** preserve complete selected visual/semantic content without silently substituting materially different renderer state.
5. **P1-167:** keep enumeration, waiting and raster/materialization work under shared node/time/pixel/byte limits.
6. **P2-007:** explicitly distinguish faithful current-view media state from static-reading/poster/fallback semantics when product modes differ.
7. Preserve working direct-browser and existing bounded IMG/media-URL positive controls rather than flattening all behavior indiscriminately.
8. Real unpacked-Chrome regression remains necessary for media controls, WebGL and real-site release closure.

## Evidence interpretation

This file is current durable semantic evidence, not a replacement status registry. Historical source checkpoints may contain wording that later became stale (for example temporary statements about which P-number was unallocated); current status/numbering always comes from `RESEARCH_REGISTRY.md`.

The compaction intentionally removes interruption mechanics, repeated “no registry edit” boilerplate and duplicated environment prose from the working tree while retaining every block's substantive finding/control and an exact Git recovery path for the original text.

## Terminology migration provenance note

Current filenames in this document use the canonical Research terminology. Historical source identity is anchored by the recorded source commit and blob SHA values; immutable historical pathname spellings are intentionally not reproduced in the current mutable tree.
