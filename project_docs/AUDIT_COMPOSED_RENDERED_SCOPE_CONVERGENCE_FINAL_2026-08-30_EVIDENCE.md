# Composed/rendered-scope convergence — compact durable evidence — Blocks 1–56

This is the compact current representation of the completed 2026-08-30 composed/rendered-scope convergence audit tranche.

Current P-code status and single-owner authority come **only** from `project_docs/AUDIT_REGISTRY.md`. The original interruption-safe checkpoint files remain byte-for-byte recoverable from Git history and are verified by `project_tools/test_staged_evidence_compaction.py`.

No runtime, manifest/version, Registry status, release-readiness, build, tag or GitHub Release state is changed by this compaction.

## Historical source provenance

Pre-compaction current-tree source commit: `948d5ae047fcd91325658b27f614f8afb37005e0`.

| Historical checkpoint | Blocks | Git blob |
|---|---:|---|
| `project_docs/AUDIT_COMPOSED_RENDERED_SCOPE_CONVERGENCE_2026-08-30_EVIDENCE.md` | 1–20 | `cb97d2be0675a76da0209c8c7044043cf7efa910` |
| `project_docs/AUDIT_COMPOSED_RENDERED_SCOPE_CONVERGENCE_STAGE2_2026-08-30_EVIDENCE.md` | 21–32 | `7002fafcb2899e7fa811988f09ae23726479cec4` |
| `project_docs/AUDIT_COMPOSED_RENDERED_SCOPE_CONVERGENCE_STAGE3_2026-08-30_EVIDENCE.md` | 33–44 | `afcbbd355ff39af1c0d829515d03a44dea878052` |
| `project_docs/AUDIT_COMPOSED_RENDERED_SCOPE_CONVERGENCE_FINAL_2026-08-30_EVIDENCE.md` | 45–56 | `4e36a6d7c7418c2bb8c9a7de6299bfc414ef408b` |

The historical tranche itself was audited from exact fresh baseline `edb5f04835a61fca370587e0186c8c03c09217b9` using managed Chromium 144 engineering probes. Those probes are not substitutes for real unpacked-Chrome release QA.

## Current-status reconciliation

The historical source files repeatedly state that no new P-code was allocated during this tranche and specifically say that `P1-230` remained unallocated. That wording was true at the time of the 2026-08-30 checkpoints but is **not current status authority**. The current Registry now assigns `P1-230` to the separate user-reached dynamic-scroll/materialization root. This compaction preserves the historical wording through the exact Git blobs above but does not repeat it as current truth.

The tranche remains evidence refining existing rendered-scope, selection-generation, resource, locator/privacy, bounded-discovery and frame-topology owners. Any present-day ACTIVE/DONE/MERGED/BACKLOG interpretation must be read from `AUDIT_REGISTRY.md`.

## Semantic preservation map — Blocks 1–56

1. Fresh source had no shared `shadowRoot` / `assignedSlot` / `slotchange` composed-tree primitive; top and frame-agent subsystems independently used light/document-tree traversal.
2. Rendered scope was shown to differ from both raw light and raw shadow trees: assigned light + shadow content rendered while unslotted light children did not.
3. Slotted light content remained a positive control: it rendered normally and was visible to many existing light-tree paths, so a future walker must not duplicate/break it.
4. Unslotted light text/image/iframe nodes stayed queryable through ordinary DOM traversal while having zero rendered geometry.
5. Slot fallback was the inverse case: it rendered when assignment was absent while remaining outside ordinary light-text/query scope.
6. `assignedNodes({flatten:true})` represented the active slot branch and switched between assigned content and fallback according to browser composition.
7. Naive light+shadow recursion would double-count slotted light nodes unless traversal is identity-deduplicated.
8. Naive raw shadow recursion would also visit inactive fallback descendants that were not part of the active rendered representation.
9. `innerText` on a shadow host did not provide complete composed visible text, while `textContent` included invisible light descendants.
10. Current locator fallback could persist unrendered light plaintext while omitting visible shadow text, refining rendered-target and privacy/minimization concerns.
11. Frame-agent used the same `innerText || textContent` locator primitive and inherited the same rendered-text/privacy inversion.
12. Light-DOM text order could disagree with physical composed/PDF order when slots reorder assigned light nodes.
13. Current included-resource traversal walked unslotted hidden descendants while being unable to reach visible shadow content.
14. Promoting an unslotted hidden lazy image initiated a real network request even though the image remained physically unrendered.
15. Combined with earlier visible-shadow misses, the acceptance target is rendered-resource graph parity, not merely scanning more DOM.
16. Native disclosure preparation could mutate an unslotted invisible `<details>` and fire a real `toggle` event outside the rendered scope.
17. Selection-bounded preparation must follow active slot branches and exclude inactive fallback/unslotted branches while preserving one identity/budget model.
18. Document frame discovery found a hidden unslotted light iframe while missing a visible shadow-root iframe.
19. Physical PDF confirmed the rendered frame set was the opposite: visible shadow-frame content printed while hidden light-frame content did not.
20. Cross-origin frame candidate collection could expose an unslotted zero-box remote origin because no rendered-geometry admission preceded candidate-origin exposure.
21. Precise selection of a rendered slotted light node admitted unrelated unselected shadow header/footer into selected-only PDF output.
22. Slot reassignment could make the selected node zero-box while its Include marker and host-retention authority remained live; PDF could contain fallback instead of selected text.
23. Moving the same selected Element between rendered slots changed its physical placement/context without changing DOM identity.
24. Selecting the host itself did not freeze which composed branch that host represented; slot reassignment could replace assigned content with fallback before print.
25. Browser `slotchange` supplied a concrete topology signal that current selection lifecycle did not consume or generation-fence.
26. Nested fallback slots required flattened assignment semantics; the outer flattened assignment could reach an inner assigned light node.
27. A zero-box / `display:contents` slot could still be a necessary topology node leading to a fully rendered assigned child, so topology traversal cannot prune only on container geometry.
28. Assigned `display:none` content still suppressed slot fallback even though both assigned and fallback content had zero geometry; fallback is chosen by assignment, not paintability.
29. A hidden slot likewise kept assignment authoritative while rendering neither assigned nor fallback branch, separating composition topology from rendered admission.
30. A selected child under a hidden slot could leave only unrelated shadow head/tail in the PDF while the selected node stayed connected and marked.
31. Page `beforeprint` could reassign the selected node after preparation so the exact physical cut printed fallback instead of the prepared selected content.
32. Precise selected slotted-light content could also admit an entirely unselected shadow-owned iframe into PDF while document frame discovery could not see that iframe.
33. Save admission and restore admission could disagree after rendered-scope drift: stale Includes remained save-admissible while fresh restore geometry admission would reject the same zero-box node.
34. A selected node could become zero-box while locator text and light structural fields remained apparently healthy.
35. Current restore usability checking correctly rejected that exact zero-box drifted node, a positive control that should be preserved.
36. Selection metadata could still describe selected text that was absent from the resulting physical artifact, requiring a separate generation-exact save truth.
37. A fully rendered selected slotted node could persist plaintext from an invisible unslotted previous light sibling via locator context.
38. The same leakage applied to an invisible unslotted next sibling while visible shadow context could remain absent from locator text.
39. Locator sibling indices encoded light order even when composed physical/PDF order was different, so structural light order is not rendered reading-order truth.
40. An ordinary visible slotted `<article>` remained a working auto-content positive control that a composed-scope repair must preserve.
41. Thousands of inactive unslotted semantic nodes could enter discovery candidate work before geometry rejection, creating irrelevant budget debt.
42. 5,100 inactive unslotted nodes could exhaust the 5,000-element resource scan before one visible slotted image, leaving the visible resource unprepared.
43. Reordering the same visible image early made the fixed-cap scan succeed, isolating the problem to scope/order rather than the existence of a hard cap.
44. 1,200 inactive unslotted `<details>` controls could all receive disclosure mutations and produce page-observable toggle events despite no rendered contribution.
45. Exactly 256 invisible unslotted cross-origin frames could consume the 256-frame candidate cap and suppress one following visible origin from permission discovery.
46. With 255 hidden frames, the visible frame became the 256th candidate, providing the exact threshold positive control.
47. Inactive unslotted same-origin iframe documents could all enter live topology/auto-content work even though they were not in the rendered host representation.
48. Frame-agent first-100 image preparation could be consumed entirely by 100 invisible unslotted images, starving one visible slotted image at position 101.
49. Placing that same visible image first made frame-agent preparation succeed, again isolating rendered-scope ordering under the fixed cap.
50. A bounded reference walker using open-shadow substitution, slot assigned-or-fallback traversal, ordinary child traversal and one seen-set reproduced active composed order while excluding unslotted nodes.
51. The same direct-assignment reference model reached nested slot assignment without duplicate assigned-node accounting.
52. With 5,100 inactive unslotted nodes, a deliberately tiny active-composed reference budget still reached host → slot → visible image without charging the inactive branch.
53. Browser `slotchange` coalesced synchronous churn partly, but task-separated churn still produced repeated events requiring WebClip generation binding/coalescing rather than full rescans per signal.
54. A shared walker was necessary but insufficient: selected-only authority still had to suppress unrelated shadow-owned content in supported open roots or use an isolated/frozen representation.
55. Fresh frame-agent source used the same family of light-tree approximations, so top and child implementations need one versioned bounded rendered-scope contract rather than unrelated local patches.
56. Final tranche result: one bounded active-composition model, a separate rendered-admission layer and generation-exact selection authority are required; the same model should reduce false negatives and false positives while preserving hard budgets and existing positive controls.

## Durable architecture result

The historical 56-block conclusion remains valid as evidence:

> WebClip needs one bounded model of the active composed topology, a separate rendered-admission layer, and a generation-exact selection authority. Light DOM, Shadow DOM, slot assignment, geometry and selection markers are individually insufficient substitutes for that model.

The practical acceptance direction preserved by the tranche is:

- traverse active slot topology rather than unioning light and shadow DOM;
- retain topology nodes needed to reach visible descendants even when those nodes have zero boxes;
- apply rendered admission separately to selectable/resource/frame/output candidates;
- keep one identity-aware global budget so inactive branches do not crowd out the actual rendered representation;
- revalidate/freeze selected rendered scope through the physical print generation;
- use the same rendered-scope semantics in top content and frame-agent paths;
- preserve truthful degradation when unsupported/opaque scope cannot be proven;
- retain real unpacked-Chrome validation as release QA rather than treating managed Chromium evidence as release closure.

## Compaction rule

The three pre-final checkpoint paths are intentionally absent from the current working tree after this compaction. Their exact bytes and the original FINAL bytes remain recoverable from the recorded source commit and are content-address verified on every repository-integrity run. The current FINAL is navigation/evidence only and never overrides `AUDIT_REGISTRY.md` status authority.
