# Durable audit evidence — responsive image capture identity — final Blocks 49–56 — 2026-08-30

Continuation of the responsive-image capture-identity tranche from exact fresh baseline `309dd6e446dbcc7188215fdbf979478cec645c96`.

Blocks 1–48 are durable in the preceding three evidence files. This final checkpoint closes derived image-link semantics, diagnostic truth, acceptance architecture and duplicate/owner reconciliation.

Canonical P-code status/owner authority remains `AUDIT_REGISTRY.md`. Docs only. No runtime source, registry status, manifest/version/build/tag/GitHub Release change.

## Block 49 — exact preparation ordering derives image links after frame-responsive mutation

Current `prepareForPrint(meta)` completes resource prefetch first. Later its print-DOM sequence is:

1. `markFrameChainsForPrint()`;
2. install print styles;
3. absolutize existing links;
4. `wrapUnlinkedImagesForPdf()`;
5. stabilize selected frame heights;
6. flatten selected same-origin body frames.

`markFrameChainsForPrint()` applies the current selected iframe `width:100% !important`, which Blocks 1–48 physically prove can change responsive `currentSrc`.

Therefore extension-generated image-link semantics are derived from a potentially already-mutated responsive generation.

## Block 50 — current image wrapper explicitly uses the live `currentSrc` as link authority

`wrapUnlinkedImagesForPdf()` collects included `img[src], img[srcset]` that are not already inside a link and computes:

`const imageUrl = image.currentSrc || image.src`.

It then creates an `<a href=imageUrl data-webclip-image-link=1>` around the image so the saved PDF lets the user open the source image later.

This makes responsive candidate identity user-visible beyond raster pixels: it also chooses the durable navigation destination added by WebClip itself.

## Block 51 — controlled source candidate and post-normalization link candidate diverge

Fresh same-origin selected-frame fixture:

- source frame 420 px;
- picture wide source blue guarded by `(min-width:800px)`;
- fallback red;
- admitted source `currentSrc = red.png`.

After the current production-shaped 100% frame width in a 1200 px top viewport:

- live currentSrc becomes `blue.png`;
- current wrapper logic therefore creates `href = blue.png`.

The generated link points to a resource the user was not viewing at admission.

## Block 52 — physical PDF annotations confirm the derived link target changes

Production-shaped mutated-order control:

- admitted candidate red;
- after width normalization candidate blue;
- wrapper href blue;
- physical PDF SHA `00ae76adc660041f6f76ddfd47bdd118b61362b04b625701a639eb9e648229ea`;
- `pdfinfo -url` reports PDF URL annotation `https://asset.test/blue.png`.

Admission-frozen control, wrapping the same image while source is still 420 px:

- currentSrc/href red;
- physical PDF SHA `96b5446d695f9cb6af5d3efaa348c65463e2298b37f6d1fc14e828bb6fdfa935`;
- `pdfinfo -url` reports `https://asset.test/red.png`.

Thus responsive generation drift changes an actual persistent PDF link annotation, not merely transient DOM metadata.

## Block 53 — faithful image semantics require one admitted slot identity for pixels, readiness and derived link

For faithful-screen mode, the same selected image slot currently has multiple independently consumed notions of identity:

- prefetch uses pre-frame-mutation currentSrc;
- live-frame rendering may switch currentSrc after 100%/640 geometry;
- flattened IMG copying freezes a later currentSrc;
- cloned `<picture>` may re-run source selection in the top document and override IMG src;
- generated image hyperlink uses currentSrc after frame normalization;
- final `Page.printToPDF` consumes whatever representation/resource state exists at that later instant.

These cannot be accepted as equivalent merely because all are valid URLs or all load successfully. Candidate identity is part of the admitted renderer generation.

## Block 54 — current diagnostics/print receipt cannot prove responsive-candidate continuity

Current page diagnostics preserve document geometry, selected element geometry/style summaries, frame measurements and flattened-frame aggregate counts. Current resource report preserves aggregate attempted/loaded/failed/omitted/deadline state plus bounded failures.

Neither records a bounded successful-candidate lineage such as:

`admitted image slot/currentSrc → readiness candidate → post-frame candidate → flattened/proxy candidate → generated image-link target → final candidate readiness`.

Consequently the physical failure pairs in this tranche — red→blue, red→blank, immediate blank→settled blue, red image-link→blue image-link — cannot be detected or truthfully classified by the current receipt.

## Block 55 — acceptance architecture: isolate first, converge on the exact representation, then print

The evidence supports an ordering contract rather than another ad-hoc responsive-image wait:

1. freeze the admitted selected renderer/environment generation before page-observable preparation can alter it;
2. construct the inert/bounded representation that will actually be printed;
3. preserve responsive-image slot identity in that representation rather than re-running source selection under a different frame/document environment, unless an explicitly different reflow/reader mode requests it;
4. run bounded resource convergence against **that exact final representation/generation**;
5. derive PDF image-link semantics from the same admitted slot identity;
6. only then authorize physical PDF bytes, with explicit degraded/unknown receipt when the slot cannot be preserved or confirmed.

This is not a prescription to extension-fetch arbitrary response bytes. Existing renderer/privacy boundaries can remain: already-rendered candidate state may be preserved through inert representation/materialization, and unresolved resources can be waited under one bounded browser-owned contract. Blob/data/current-frame and animated-resource policy remain separate representation-budget questions.

## Block 56 — final duplicate/root-cause reconciliation; no new P-code

Fresh reconciliation against nearby audit families:

- PR #39 remains authoritative that ordinary direct top-document forced-screen `srcset`/`picture` does not generically switch merely because PDF is A4; this tranche does not contradict it.
- The completed viewport/environment tranche owns the broader hybrid screen-media/paged-viewport geometry and live-frame responsive application-state mutation; this tranche narrows that evidence to concrete responsive-image candidate/resource identity and physical image/link output.
- The flattened CSS environment family concerns stylesheet environment/namespace representation; this tranche concerns browser responsive-image source selection and resource convergence.
- P1-219 is adjacent because it owns safe rollback of the temporary image-link wrapper topology, but it does not own which responsive candidate URL the wrapper should derive from. No status change is needed there.

Primary current owners refined by the completed 56 blocks:

- **P1-003 ACTIVE** — actual selected visual resource graph/readiness must cover the exact responsive candidate introduced by the final representation and cannot report an earlier currentSrc generation as proof;
- **P1-187 ACTIVE** — same-origin flattened representation must preserve admitted responsive replaced-element state and cannot allow cloned `<picture>` semantics to reselect under a different owner-document environment;
- **P0-075 ACTIVE** — live selected-frame geometry mutation can switch responsive image candidates before isolation, including on non-flattened selected-descendant paths;
- **P0-070 ACTIVE** — exact save authority/receipt requires candidate continuity through admitted state, representation, resource convergence, derived links and physical bytes;
- **P0-004 ACTIVE** — saving different artwork, blank artwork or a different source-image link violates selected-copy visual/reading fidelity.

Supporting:

- **P1-167 ACTIVE** — candidate/representation/resource diagnostics need shared bounded node/resource/time/mutation/string admission;
- **P0-064 ACTIVE** — deep flattened materialization must preflight node/text/byte work before allocation;
- **P2-007 BACKLOG** — intentionally reselecting responsive art for reader/print reflow is a separate explicit product semantic, not faithful-screen capture.

No new P-code or status transition. `P1-230` remains deliberately unallocated.

## Final tranche conclusion

The current pipeline has at least three independently proven responsive-image identity breaks:

1. **live selected-frame mutation**: current 100%/640 preparation can change a source frame's responsive currentSrc after resource prefetch, affecting both flattened and non-flattened paths;
2. **secondary owner-document re-selection**: cloned `<picture><source>` remains responsive and can override an IMG whose admitted currentSrc was copied into `src`, because the proxy is evaluated against top-document width/height/orientation rather than the source child environment;
3. **post-prefetch resource introduction**: a candidate first selected by the flattened proxy has no second convergence barrier; physical print can finish blank while that new candidate is pending and print correctly only after it settles.

The same drift also changes WebClip-generated persistent PDF image-link annotations.

These are not generic Chromium PDF limitations: causal controls that freeze the admitted slot and neutralize later responsive re-selection preserve the tested red physical art. The root is missing single-generation authority across screen admission, live preparation, isolated representation, resource readiness, derived semantics and final bytes.

The full responsive-image capture-identity tranche is complete at **56/56 blocks** and interruption-safe.
