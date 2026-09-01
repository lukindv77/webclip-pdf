# WebClip — fresh restart render-fidelity evidence — C04–C15 — 2026-09-01

Date: 2026-09-01

Canonical product-source baseline: `main = d7a884f8d93ff154bbc4e30e68f4a0ff99f50aa3`.

Accepted evidence execution:

- temporary evidence head: `0ff13db76c8cdfb9b70c02e3b4548b0f20aef113`;
- GitHub Actions workflow run: `33502455222`;
- job: `99838697235`;
- conclusion: **SUCCESS**;
- browser: Google Chrome for Testing `152.0.7977.64`;
- uploaded bounded artifact digest: `sha256:285183f2059751aad293e996df3aafe18242c5ecbf0eab381f3c7d9220c4218b`;
- product runtime source was unchanged from canonical baseline throughout the evidence branch.

This checkpoint belongs to the fresh full-project restart campaign. Historical renderer evidence was used only for hypothesis/fixture/duplicate lookup; the claims below come from the current product source and the accepted Chrome 152 execution above.

## 1. Evidence discipline and rejected development executions

The accepted run used one temporary omnibus physical-PDF harness around the actual repository `content.js` selection/download/prepare path plus the production content-injection guard sources. It also reran the current P0-071 real-MV3 / actual-`Page.printToPDF` guard harness as an independent link/render-cut control.

The temporary C04–C15 harness held the mocked worker PDF response while the exact prepared page was physically printed by Chrome. PDF text, word geometry, span size, raster pixels and PDF SHA-256 were then inspected. The test fixtures were synthetic/local and contained no user data.

Two earlier development executions are **not accepted evidence**:

- run `33502045750` lacked shell `pipefail`, so `python ... | tee` concealed non-zero Python exits. The C04 harness had stopped on an over-strict SVG text-extraction marker and the P0-071 harness had stopped on a stale bootstrap source-string assertion. GitHub step green status from that run is therefore explicitly rejected.
- run `33502250722` used fail-closed shell execution and both physical probes genuinely completed. It exposed that a low `>100` blue-pixel threshold classified 108/111 pixels of unrelated raster noise as a pseudo-image/canvas positive. Its raw PDFs were useful for diagnosing the discriminator, but it is not the final numerical authority.

The accepted run `33502455222` retained fail-closed `pipefail`, kept product files untouched, and made only runner-checkout harness compatibility/measurement adjustments:

1. inline SVG was classified by its physical magenta shape rather than requiring exact full SVG text extraction (`SVG_C10_MARKER` was visibly rendered but Chromium text extraction truncated the word);
2. the old P0-071 harness bootstrap assertion was adjusted to accept current grouped worker bootstrap loading of `pdf-print-guard.js` rather than its historical singleton `importScripts(...)` spelling;
3. the blue-state discriminator was raised to `>500` pixels, cleanly separating delayed pseudo/canvas signal from the measured 108/111-pixel background noise.

No product runtime file was rewritten by those runner-only adjustments.

## 2. Exact current source receipts

The accepted C04–C15 run emitted SHA-256 receipts for the product source used by the physical fixtures:

- `content.js`: `9bc3b42db86d522a05cd261da420771eab721f1767bc13fc28d6b0c32f0ff47a`;
- `frame-proxy-budget-guard.js`: `7c787f08b3942ecfb50246c45169bf52af7491920edeb2ce8abee9e754da8356`;
- `frame-proxy-inert-guard.js`: `dc4fd3204e52d5c50b57a78ea3f682c64564e49063d2b4a8c7ada8bd01b5ab08`;
- `host-control-activation-guard.js`: `e0cc737d6f607bb7ed53d9f3f4d157c85bec5549a08bfdda17002cd5962e0b39`.

The independently rerun P0-071 physical guard emitted:

- `pdf-print-guard.js`: `175ad164ec6dd231729f1efe6d4327697d7ec6f97eb7d82b00820bb142717b47`;
- worker bootstrap (`journal-text-filter.js`): `b7d8a6a3b47d8618ed44df9ea9553147c2b85542f5bb83f3ef7afadf7543bb7d`;
- `service-worker.js`: `f705db325f625d3187505af90ba399f93111379d508f3c5f75a4a5cc21d1d2bc`.

## 3. Top-document physical positive-control envelope

One selected top-document `<article id="scope">` was prepared through actual WebClip content code and physically printed.

Physical artifact:

- bytes: `37681`;
- SHA-256: `14763f671a7da6aaa1e2c4479f20d3fe2de54d6b37f884e79b77bed2aadae95b`.

Fresh physical controls:

- C04 ordinary nested text, strong text, table cell and list-item text were present;
- C05 two flex-row markers preserved horizontal ordering/row alignment (`x≈67.41` versus `x≈279.18`, same `y≈338.93`);
- C06 ordinary selected yellow background produced `4020` classified yellow pixels;
- C07 30px versus 10px typography produced PDF text span sizes about `21.46` versus `7.15`, preserving the expected >2x relation;
- C08 raster image produced `3920` red pixels;
- C09 responsive image `currentSrc` exactly equalled the expected 1x Blob URL at device scale factor 1 and produced `3924` cyan pixels;
- C10 inline SVG physically produced `3331` magenta pixels; text extraction truncated the long marker and is therefore not used as the SVG visual discriminator;
- C11 top-document canvas bitmap produced `4018` green pixels;
- C12 a video **poster-only** case produced `3920` orange pixels;
- C13 live top-document input/textarea/select values changed after markup creation were present physically (`FORM_CURRENT_789`, `TEXTAREA_CURRENT_789`, `FORM_SELECT_CURRENT`), while the old input attribute value was absent;
- C14 ordinary top-document `::before` generated text was present physically.

The corresponding resource report was structurally clean: attempted `9`, loaded `9`, failed `0`, omitted `0`, `scanTruncated=false`, `deadlineExceeded=false`, elapsed about `3 ms`.

These are bounded positive controls only. They do not claim that all variants of C04–C14 are complete.

## 4. Fresh physical finding — clean resource report can precede required CSS/pseudo visual resources

A local HTTP fixture delayed two selected visual resources by roughly four seconds:

- a `border-image-source` SVG rendered red;
- a `::before { content:url(...) }` pseudo image rendered blue.

WebClip's current resource report for the exact prepared representation still reported:

- attempted `2`;
- loaded `2`;
- failed `0`;
- omitted `0`;
- `scanTruncated=false`;
- `deadlineExceeded=false`;
- elapsed about `1 ms`.

Yet the immediate physical PDF contained:

- red pixels: `0`;
- blue pixels: `108` (measured raster noise, below the accepted `500`-pixel signal threshold).

Immediate artifact:

- bytes: `23386`;
- SHA-256: `fa8bab0308c5ed8cddd5c04f38de096a4201ec12d277421e960e23c02921c216`.

After the same page was allowed to settle, the physical PDF contained:

- red pixels: `34818`;
- blue pixels: `7810`.

Settled artifact:

- bytes: `23631`;
- SHA-256: `a28664f26c27924c0fbe774cba357403ba2daed2cb70da5dd2be3874beb10bd8`.

Accepted machine discriminators:

- `borderMissingImmediately = true`;
- `pseudoImageMissingImmediately = true`;
- `reportClaimsNoFailure = true`.

This is a fresh Chrome 152 physical revalidation of the existing **P1-003 ACTIVE** root: a clean bounded readiness report over the current task vocabulary is not proof that the exact final selected visual dependency graph is ready. No new P-code is warranted.

For coverage interpretation this refines C06 and C14 and also supports the cross-cutting resource/generation regions C21/C36 when they are researched directly later. It does not by itself complete those later coordinates.

## 5. Fresh physical finding — flattened same-origin representation loses renderer-owned state

A same-origin child BODY was selected through WebClip. Before save, the live child contained:

- a blue canvas bitmap;
- input current value `FRAME_INPUT_CURRENT_789` while the markup attribute remained `FRAME_INPUT_OLD`;
- textarea current value `FRAME_TEXTAREA_CURRENT_789` while its source text remained `FRAME_TEXTAREA_OLD`;
- a select whose current selected option was changed to `CURRENT`;
- child-head `#frame-pseudo::before { content:'FRAME_PSEUDO_C14_CURRENT ...' }` generated text.

The flattened physical PDF preserved ordinary frame content but not those current renderer-owned states.

Artifact:

- bytes: `29764`;
- SHA-256: `ca2ed4d5c40f88b011e51b29383925e2fdc0e936e64aea828d8b914991f8b359`;
- blue pixels: `111`, below the accepted `500`-pixel canvas signal threshold.

Machine result:

- canvas bitmap present: **false**;
- current input value present: **false**;
- old input value present: **true**;
- current textarea value present: **false**;
- old textarea value present: **true**;
- current select text present: **false**;
- old select text present: **false**;
- child pseudo generated text present: **false**.

The same operation's resource report nevertheless reported attempted `4`, loaded `4`, failed `0`, no omission/truncation/deadline.

This is fresh Chrome 152 physical evidence inside existing **P1-187 ACTIVE**: the flattened same-origin secondary representation does not preserve required rendered state such as canvas bitmap and current renderer-owned form state. The missing child pseudo state also intersects P1-003's final visual-dependency representation boundary. No new owner is allocated.

The finding does **not** imply that top-document form/canvas handling is globally broken; the top-document fixture above is the positive control showing those same broad classes can survive when Chromium prints the live selected document rather than the flattened clone.

## 6. C15 fresh revalidation — P0-071 remains closed for its narrow unsafe-link render-cut contract

The accepted run independently executed the current `project_tools/research_p0_071_print_render_guard.py` against Chrome 152, with only its stale harness source-string check adapted to the current grouped bootstrap spelling.

Real MV3 worker installation proved:

- install marker `true`;
- exported guard present;
- `chrome.debugger.sendCommand` wrapped/available;
- allowed URI schemes exactly `http`, `https`, `mailto`, `tel`.

Physical negative control without the guard admitted unsafe PDF annotations, including `javascript:` and `data:` links from page, open Shadow and same-origin frame representations.

With the current guard active during the actual render cut:

- safe HTTPS, mailto, tel and internal-page annotations remained;
- unsafe nested Shadow/frame annotations were absent from the physical PDF;
- an already-mutated unsafe target was also absent from the physical PDF;
- temporarily changed live hrefs were restored after guarded printing.

Guarded PDF SHA-256 values:

- beforeprint/nested case: `770df86bcf40baf62a5df53cea93e49cca423223669844dfc4b9f6e2f1362453`;
- already-mutated case: `f95c41fd47e0d9d61f22c1e0f62125767ad5ccf49ffad8e1bf9a1467083199cc`.

Therefore the fresh restart finds **no regression requiring P0-071 DONE to be reopened**. C15 receives fresh L4 positive evidence for the narrow unsafe-link annotation/render-cut boundary. Broader anchor/internal-destination semantics remain separate coverage.

## 7. Fresh-restart coverage interpretation

Only the variants physically exercised by this tranche advance. A positive result for one variant is deliberately not generalized to an entire renderer family.

| Coordinate | Fresh campaign state after this tranche | Basis |
|---|---|---|
| C04 | `L4-PARTIAL / POSITIVE CONTROL` | Ordinary nested text/table/list in one selected top-document region physically preserved. |
| C05 | `L4-PARTIAL / POSITIVE CONTROL` | Simple flex-row geometry preserved; transforms, fragmented boxes, clipping and modern layout variants remain. |
| C06 | `L4-REVALIDATED / FINDING + POSITIVE CONTROL` | Ordinary background preserved; delayed selected border-image physically missing despite clean readiness report, then appears after settlement — P1-003. |
| C07 | `L4-PARTIAL / POSITIVE CONTROL` | Basic font-size/line layout relation preserved; fonts, `text-fit`, writing systems and modern typography variants remain. |
| C08 | `L4-PARTIAL / POSITIVE CONTROL` | Ordinary raster image physically preserved; crop/object-fit/error/large-resource variants remain. |
| C09 | `L4-PARTIAL / POSITIVE CONTROL` | One DPR=1 `srcset/currentSrc` candidate physically matched; DPR/media/picture/candidate-mutation variants remain. |
| C10 | `L4-PARTIAL / POSITIVE CONTROL` | Inline SVG visual shape physically preserved; external SVG/resources/animation/use/filter variants remain. |
| C11 | `L4-REVALIDATED / FINDING + POSITIVE CONTROL` | Top canvas preserved; same-origin flattened-frame canvas bitmap lost — P1-187. |
| C12 | `L4-PARTIAL / POSITIVE CONTROL` | Video poster physically preserved; actual played/current video frame remains unresearched in this fresh campaign. |
| C13 | `L4-REVALIDATED / FINDING + POSITIVE CONTROL` | Top current input/textarea/select values preserved; flattened same-origin current values revert/disappear — P1-187. Checkbox rendering/privacy variants remain. |
| C14 | `L4-REVALIDATED / FINDING + POSITIVE CONTROLS` | Top pseudo text preserved; delayed pseudo image missing under clean report (P1-003) and flattened child pseudo state lost (P1-187). |
| C15 | `L4-PARTIAL / FRESH POSITIVE CONTROL` | P0-071 current Chrome physical guard strips unsafe annotations and restores live hrefs; broader anchor/destination semantics remain. |

The external user-intent/platform baseline also requires later fresh triage of Chrome 146–152 renderer additions such as scroll-triggered animation, nested/scoped view transitions, `::backdrop`, `::scroll-marker`, `::view-transition`, `text-fit` and print-specific layout semantics. Those are **not** silently marked covered by this tranche.

## 8. Owner/status decision

No new P-code is warranted.

Fresh failures map to existing active roots:

- **P1-003 ACTIVE** — exact final renderer-selected visual dependency graph/readiness, including pseudo/CSS resources and truthful unknown/partial state;
- **P1-187 ACTIVE** — flattened same-origin representation must preserve required renderer-owned state such as canvas and current form/rendered state.

Fresh positive control confirms the tested narrow **P0-071 DONE** render-cut contract remains effective on current Chrome 152; it is not reopened.

`RESEARCH_REGISTRY.md` remains unchanged. This is evidence/coverage only:

- no product runtime change;
- no manifest/version change;
- no owner acceptance-contract change;
- no P-status transition;
- no build/tag/GitHub Release;
- `RELEASE_READINESS.md` remains **NOT READY**.

The temporary omnibus harness and temporary GitHub workflow are removed before final delivery. The accepted head/run/job and artifact digest above remain the durable external execution receipt.