# Durable audit evidence — responsive image capture identity — Blocks 1–16 — 2026-08-30

Canonical P-code owner/status authority remains exclusively in `AUDIT_REGISTRY.md`. This is an interruption-safe fresh-source checkpoint focused on responsive-image candidate identity across user-admitted screen state, resource preparation, selected-frame normalization, same-origin flattened representation and physical PDF generation.

Exact fresh audited baseline: `main = 309dd6e446dbcc7188215fdbf979478cec645c96`.

Working branch: `audit/responsive-image-capture-identity-2026-08-30`.

Managed Chromium 144/CDP probes are deterministic engineering evidence only; real unpacked Chrome remains release QA. No runtime source, registry status, manifest/version/build/tag/release state is changed by this checkpoint.

## Duplicate/root-cause boundary before admission

PR #39 / `AUDIT_REPLACED_RESOURCE_CONVERGENCE_2026-08-30_EVIDENCE.md` already owns three nearby negative controls and remains authoritative for them:

- ordinary top-document `srcset` did not switch merely because forced-screen PDF uses A4 geometry;
- `<picture media>` retained its screen-media source under the direct top-document forced-screen print path;
- one tested `sizes="auto"` selected-only reflow did not justify a generic currentSrc-reselection claim.

This tranche does **not** reopen those broad hypotheses. The fresh surface is different: current source admits/waits one responsive candidate, then WebClip itself can change a selected iframe's live responsive environment and later constructs a flattened top-document representation whose `<picture>` source-selection environment differs again. The final printed candidate can therefore be a different resource generation from the one resource preparation actually proved ready.

Existing owners are sufficient at this stage: P1-003/P1-187/P0-075/P0-070/P0-004 with P1-167/P0-064/P2-007 supporting. No new P-code in Blocks 1–16; `P1-230` remains deliberately unallocated.

## Block 1 — exact prefetch authority is the current `IMG.currentSrc`

At exact `content.js` baseline, `prefetchIncludedResources()` first promotes known lazy image/source attributes and yields one task turn so picture/currentSrc can settle. For each scanned `IMG`, the resource identity is then chosen as:

`element.currentSrc || element.getAttribute('src') || firstSrcsetUrl(element.getAttribute('srcset'))`.

The task waits on that DOM image. Thus a successful resource receipt proves readiness of the **responsive candidate current at prefetch time**, not all candidates that could become current later.

## Block 2 — prefetch occurs before selected-frame print geometry and flattening

The current print preparation orders resource preparation before the later print-only frame representation work. After the resource report/header work, the selected-page preparation performs frame-chain normalization, print styles, link/image wrapping, selected-frame stabilization and finally same-origin body-frame flattening.

This ordering matters: later live frame-width mutations and later flattened-document source selection are outside the generation whose image candidate was admitted in Block 1.

## Block 3 — current frame normalization is responsive-input mutation

Current selected-frame logic uses `width:100% !important`; its measurement pass temporarily applies an important pixel width capped at 640 px and returns the frame to important 100%. `SELECTED_FRAME_PRINT_STABILIZE_PASSES = 3`.

The preceding viewport/environment tranche physically established that these real iframe-width changes are page-observable. Here they are used specifically to test browser responsive-image selection.

## Block 4 — deterministic fixture starts from a narrow user-screen picture candidate

Managed fixture:

- top viewport 1200×800 CSS px, DSF 1;
- selected same-origin iframe width 420 px;
- child `<picture>` has a wide source `media="(min-width:800px)"` whose image is blue;
- child fallback `<img src>` is red.

At the user's admitted screen state:

- frame width 420;
- child `innerWidth` 420;
- media query false;
- `IMG.currentSrc = red.png`;
- red image complete, naturalWidth 400.

Only the red URL had been requested at this point.

## Block 5 — direct admitted-screen PDF is physically red

Before WebClip-shaped frame geometry mutation, the exact screen-media physical PDF was:

- SHA-256 `ad751efad82f587483fffac010a362cfa6dd0d838a50577bc1f794087ca4e8e3`;
- 7,042 bytes;
- about 100,947 red pixels;
- 0 blue pixels.

This is the physical ground truth for what the user was viewing in the fixture.

## Block 6 — prefetch-style receipt proves only red

Immediately before the frame print-flow sequence, the fixture's production-shaped resource receipt observed:

- `currentSrc = red.png`;
- `complete = true`;
- `naturalWidth = 400`;
- request history contained only `red.png`.

The wide blue candidate had not entered the admitted resource generation.

## Block 7 — `width:100%` switches the live candidate from red to blue

Applying the current selected-frame 100% geometry changed the same live child from 420 to 1200 px.

Observed:

- `(min-width:800px)` became true;
- `currentSrc` switched red → blue;
- the blue resource was requested and became ready in the successful-candidate control.

This is not paper/A4 candidate selection. It is a responsive-image transition caused by WebClip's live-frame preparation.

## Block 8 — the 640 px measurement pass switches blue back to red

Applying the current capped 640 px measurement geometry produced:

- child width 640;
- media query false;
- `currentSrc` blue → red.

Thus the measurement helper itself traverses a different responsive-resource generation from the 100% state.

## Block 9 — restoration to important 100% switches red back to blue

Returning the frame to the current post-measurement important 100% state produced:

- child width 1200;
- media query true;
- `currentSrc` red → blue again.

The production-shaped sequence therefore deterministically traversed:

**red → blue → red → blue**.

A resource identity cannot be treated as stable across current live selected-frame preparation.

## Block 10 — exact flattened IMG copier freezes the *later* currentSrc, not the admitted one

Current `copyFrameCloneUrlState(source,target)` handles `IMG` by reading `source.currentSrc || source.src`, assigning that URL to target `src`, and removing target `srcset` and `loading`.

After the live frame sequence above, source `currentSrc` was blue. The production-shaped flattened proxy therefore copied blue into the proxy IMG `src` even though resource preparation had admitted red.

This is a direct representation-generation mismatch: the proxy freezes whichever candidate exists **after** WebClip's responsive mutations.

## Block 11 — successful later candidate changes the physical saved art

With blue available:

- admitted screen PDF: red, SHA `ad751e...`, ~100,947 red / 0 blue pixels;
- flattened proxy source after WebClip-shaped geometry: `currentSrc = blue.png`;
- proxy `src/currentSrc = blue.png` after settlement;
- physical proxy PDF SHA `b877d74325b6cb4f528258f777b93a5ca0f6239ea5715a8b05b77154e64fd86d`;
- physical proxy: 0 red / ~96,327 blue pixels.

The same semantic selected image slot therefore changes from the user's red artwork to different blue artwork solely through capture preparation and secondary representation.

## Block 12 — failing later candidate can make the final image blank after a successful admitted receipt

A deterministic negative-network control aborted only `blue.png`. Red remained available and fully ready.

Before mutation:

- screen `currentSrc = red.png`, naturalWidth 400;
- prefetch-style receipt is successful for red;
- direct screen PDF SHA `0b82fb2dcc3c134d0d62c8409060329da8e92c89497abfea3e6d10486fbd11d7`;
- ~100,947 red / 0 blue pixels.

After current width transitions:

- at 1200, `currentSrc = blue.png`, naturalWidth 0;
- at 640, currentSrc returns to ready red;
- at 1200, currentSrc returns to failed blue;
- flattened proxy freezes blue and remains naturalWidth 0.

Physical final proxy PDF:

- SHA `e9caacbb6948b42c62727635bafc69fa8c24cb575d1b86231926eab534e94c50`;
- 9,590 bytes;
- 0 red / 0 blue pixels.

The network failure itself is a controlled fixture, not a claim about real failure frequency. The product defect is that the final candidate can be a later resource that never belonged to the successful readiness generation.

## Block 13 — clean resource-report counters cannot prove the final responsive candidate

Because current image preparation creates its task from the pre-mutation `IMG.currentSrc`, a successful task for red does not automatically create a task or a truthful omission for a blue candidate selected only after frame normalization/flattening.

Therefore a clean image task receipt can describe generation A while physical PDF uses generation B. This is a direct P1-003/P0-070 receipt boundary: readiness must correspond to the exact renderer/resource generation used to produce final bytes.

## Block 14 — `<picture>` creates an independent top-document representation failure even without live iframe widening

A second isolated control left the source iframe at its original 420 px throughout source admission and cloning.

Source state remained:

- frame/child width 420;
- wide source media false;
- admitted `currentSrc = red.png`.

A production-shaped body clone copied the admitted red `currentSrc` into target IMG `src` and removed IMG `srcset`, exactly as the current copier does. However, the cloned parent `<picture><source media="(min-width:800px)" srcset="blue.png">` remained in the clone.

Current source code has no responsive-image SOURCE snapshot equivalent: for `source`, `copyFrameCloneUrlState` only handles `source.src` when present; the cloned `srcset`/`media` semantics remain live.

Once the flattened body was appended to the 1200 px top document, browser `<picture>` selection re-evaluated in that new environment:

- target IMG `src` remained red;
- target IMG `currentSrc` became blue;
- physical proxy PDF SHA `70047fe13a0b51317f969f78967847ed4d1a256a29ef11b24ebd31ca79e4319a`;
- 0 red / ~96,327 blue pixels.

Thus even a perfect rollback of live source-frame width would not by itself preserve responsive image identity in the current flattened representation.

## Block 15 — freezing the admitted slot and neutralizing cloned picture candidates restores the physical source art

Causal repair control only, not an implementation prescription:

- snapshot admitted source `currentSrc = red.png`;
- clone body;
- set target IMG `src` to that admitted URL;
- remove IMG `srcset/sizes`;
- neutralize cloned `<picture><source>` candidate attributes so the top document cannot re-run source selection against a different environment.

After settlement:

- target `currentSrc = red.png`;
- physical PDF SHA `afe15071048f877290250aeeb6f4af35d4c78f9e70897c15f039f53b4462638e`;
- ~96,327 red / 0 blue pixels.

This proves the tested discrepancy is representational, not an unavoidable inability of Chromium PDF to preserve the admitted image pixels. Any real repair still needs URL provenance, content/type semantics, animation/current-frame policy, resource deadlines and bounded admission.

## Block 16 — interim owner reconciliation and acceptance direction

No new permanent P-code is justified.

Primary refined owners:

- **P1-003 ACTIVE** — actual selected visual resource readiness must refer to the exact candidate/resource generation used by final PDF, including candidates introduced by capture preparation;
- **P1-187 ACTIVE** — same-origin flattened representation must preserve responsive replaced-element rendered state/environment rather than re-run `<picture>` semantics in a different owning document;
- **P0-075 ACTIVE** — live host/frame preparation is page-observable and can mutate responsive resource selection before the inert representation exists;
- **P0-070 ACTIVE** — exact final artifact generation/receipt cannot be claimed from a resource report describing an earlier currentSrc generation;
- **P0-004 ACTIVE** — physically saving different artwork or no artwork violates same-as-displayed selected-copy fidelity.

Supporting:

- **P1-167 ACTIVE / P0-064 ACTIVE** — any candidate/resource snapshot or deeper frame materialization must use one bounded admission/preflight contract;
- **P2-007 BACKLOG** — a deliberately reselected/reflowed representation would need explicit different-mode semantics rather than masquerading as faithful screen capture.

`P1-230` remains unallocated.

Acceptance direction for faithful-screen mode: establish one immutable admitted responsive-image slot/candidate identity before page-observable preparation; use that same identity for readiness, secondary representation and final physical bytes, or truthfully report the slot degraded/unknown. A clean task for an earlier currentSrc is not evidence for a later currentSrc selected by WebClip itself.

Blocks 1–16 are complete and interruption-safe.
