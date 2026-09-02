# WebClip — fresh full-project research — C33 CSS/WAAPI animations and transitions — 2026-09-02

Date: 2026-09-02  
Canonical source baseline: `72a2efc2ca298b623d5650d44f8430163f0aa876`  
Exact `content.js` blob: `f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e`  
Exact `pdf-print-guard.js` blob: `423c79143df37a80fbabf8cbbf7570a4a2ca4e2a`  
Scope: fresh-restart coordinate **C33 — CSS/WAAPI animations/transitions**.

## Result

**C33: `L4-REVALIDATED / FINDING + POSITIVE/CSS/WAAPI/TRANSITION/PAUSED/FROZEN/FRAME/CAUSAL CONTROLS (P0-070, P1-187; P0-075 supporting)`.**

Fresh exact-source Chrome evidence proves two independent current representation failures:

1. **Top-document temporal cut drifts after admission.** Running CSS animation, WAAPI animation and CSS transition continue advancing through WebClip preparation and the delay before the physical PDF cut. The physical PDF matches a later phase, not the visual phase sampled at admission. Test-only sampled-state freeze and already-paused controls remain stable and physically reproduce the sampled phase.
2. **Same-origin flattened frame drops temporal animation state.** A source WAAPI animation has a non-zero sampled transform and one running Animation object; the final flattened proxy has `animationCount=0`, `transform:none`, and physically prints the base proxy position. Applying only the already sampled transform to the final proxy restores the temporal displacement in the physical PDF. Full source geometry is not restored by that one causal step because the proxy also has already-owned static geometry differences under P1-187.

The top finding is a fresh revalidation of **P0-070 ACTIVE**: exact user save authority must bind one admitted content/render generation through the physical render cut. The frame finding is a fresh revalidation of **P1-187 ACTIVE**: the flattened proxy must preserve required rendered state. **P0-075 ACTIVE** remains supporting architecture because freezing the hostile live page is not a trusted representation boundary.

No new P-code is allocated. Runtime, manifest/version, Registry wording/status, release readiness, build/tag/Release are unchanged.

## 1. Fresh current-source boundary

Fresh current source contains no temporal snapshot path based on `getAnimations()`, `Animation.currentTime`, animation `playState`, transition state or a captured animation timeline.

The current render guard does protect the physical cut from page-script mutation: `pdf-print-guard.js` temporarily invokes CDP `Emulation.setScriptExecutionDisabled({value:true})` around `Page.printToPDF`, sanitizes unsafe links, then re-enables script execution. That is a script-execution guard, not a CSS/Web Animations timeline snapshot. CSS/WAAPI compositor timing can remain time-dependent even while page JavaScript is disabled.

The worker also explicitly uses `Emulation.setEmulatedMedia({media:'screen'})`, so this product path does not rely on the generic print-media option for user agents to ignore animations.

The current save metadata produced by the accepted C33 fixtures contains no temporal receipt: every case reports `temporalMetaPaths=[]`. Therefore the operation metadata cannot prove which animation/transition phase was admitted or which phase reached the physical PDF.

## 2. Physical evidence

Accepted exact-source execution:

- workflow: `Research C33 CSS WAAPI temporal`;
- run: `33650829793`;
- job: `100317097988`;
- exact workflow head: `eea937d13bc5eb66a930a530c624d5f44e649845`;
- browser: Google Chrome `151.0.7922.173`;
- conclusion: **SUCCESS**;
- raw receipt commit: `4accce00793aa581b13742a63739676a173772d6`;
- raw result SHA-256: `29d5a8cbda55f1edcc2a7e91150a94a8029aa5a429050af73026a2f22c5b2388`;
- durable harnesses:
  - `project_tools/research_c33_temporal_matrix.py`;
  - `project_tools/research_c33_temporal_acceptance.py`.

The fixture uses a fixed green reference box and a magenta animated box. The normalized horizontal ratio is measured in live DOM state and independently from physical PDF raster pixels, so uniform PDF scaling does not invalidate comparisons.

All accepted PDFs keep the explicit Exclude and outside-scope tokens absent.

## 3. Top-document CSS animation drift

At admission the running CSS animation was sampled near:

- `currentTime ≈ 633 ms`;
- normalized ratio `≈ 2.1333`;
- transform translateX `≈ 50.7px`.

Current WebClip preparation did not freeze the animation:

- after preparation: `currentTime ≈ 1183 ms`, ratio `≈ 2.6833`;
- immediately before physical print: `currentTime ≈ 2083 ms`, ratio `≈ 3.5832`;
- physical PDF ratio: `≈ 3.6949`.

PDF SHA-256: `7375da50dc00352b46447df78ffee2975fe246350d113539daaf2773afe2fe4f`.

The physical artifact therefore reflects a later cut, not the admitted user-visible phase.

## 4. CSS freeze causal control

The test-only causal representation samples the exact computed transform at admission, cancels the running animation on the test representation, disables animation/transition, and reapplies that sampled transform as an immutable value.

Observed:

- admission ratio `2.1`;
- prepared ratio `2.1`;
- pre-print ratio `2.1`;
- physical PDF ratio `≈ 2.1356`.

PDF SHA-256: `5bbd96040f0b56890db4dce7a6b2ff428a7bf80fa872a3da4336039516f98ef5`.

The small PDF-raster ratio difference is consistent with physical pixel rounding. This proves current Chrome can serialize the sampled visual state when the final representation is made time-invariant.

## 5. Already-paused positive control

A CSS animation explicitly paused near `currentTime ≈ 616.6ms` remains stable through preparation and the physical cut:

- admission ratio `≈ 2.1166`;
- prepared ratio `≈ 2.1166`;
- pre-print ratio `≈ 2.1166`;
- PDF ratio `≈ 2.1525`.

PDF SHA-256: `a9c48ccfab08f9294143d00e42d5b6788ae032601f674f48bbb6a50df055d5e8`.

This rejects a broad renderer claim that Chrome cannot preserve a stable non-zero animated presentation. The failure is temporal ownership, not inability to print the transformed state.

## 6. WAAPI animation drift

Fresh WAAPI control shows the same root independently of CSS keyframes:

- admission: `currentTime ≈ 633ms`, ratio `≈ 2.1332`;
- prepared: `≈ 883ms`, ratio `≈ 2.3833`;
- pre-print: `≈ 1783ms`, ratio `≈ 3.2832`;
- physical PDF ratio: `≈ 3.3390`.

PDF SHA-256: `cbbbb657d28899d2c8abf54b73039c04021dc0ef8a2d8fef5548c4b7ad28d4ee`.

`Page.printToPDF` therefore consumes a later active WAAPI phase in this current WebClip-shaped path.

## 7. CSS transition drift

A three-second transform transition produces an even stronger physical discriminator:

- admission ratio `≈ 2.1332`;
- prepared ratio `≈ 2.3500`;
- pre-print ratio `≈ 3.2666`;
- physical PDF ratio `≈ 4.5763`.

PDF SHA-256: `e3c7e7a75a7cac3262fd2fcd7633c6cdb49f2a0b64fc5cb6aae0ebcc2210e079`.

The physical cut can occur materially later than the last JavaScript-side metric gathered by the harness. Therefore a `beforeprint`/pre-call measurement is not by itself a temporal fidelity receipt unless the representation is made immutable after that measurement.

## 8. Same-origin frame temporal-state loss — P1-187

A selected same-origin BODY contains a WAAPI-animated magenta box. At admission:

- source animation count: 1;
- running animation current time near 633ms;
- sampled transform translateX ≈ 50.7px;
- source normalized ratio ≈ 2.1333.

After current BODY flattening, the final proxy reports:

- `animationCount = 0`;
- `transform = none`;
- proxy temporal displacement ratio = `0`.

The physical PDF likewise has ratio `0.0`. PDF SHA-256: `c3baf606d46660ad053904f87b25505549fa2944c90cf64a37aa160a3be6a9d8`.

The source frame's animation object continues to advance after its iframe is hidden, but that source state is no longer the representation rendered into the PDF.

## 9. Frame sampled-transform causal control

On the same final flattened proxy, the test-only control applies only the transform sampled from the admitted source animation.

Before the causal step:

- proxy ratio `0`;
- animation count `0`;
- transform `none`.

After applying the sampled transform:

- proxy ratio `≈ 0.6334`;
- physical PDF ratio `≈ 0.6441`;
- PDF SHA-256 `995e64b01671b84c2cfb0492ff0cdeef3c0e7d6e950718b83dbd2ea161486964`.

This restores the **temporal displacement** almost exactly in the final representation. It deliberately does not claim to restore the entire source ratio, because the flattened proxy also changes base/absolute geometry under already-known P1-187 representation rules. Requiring equality to the full source ratio was an invalid earlier harness assertion and is not part of the accepted evidence.

## 10. Rejected / corrected harness hypotheses

Two development runs are retained as provenance and are not hidden:

1. run `33650154090` / job `100314826615` failed before producing a result because the first harness addressed proxy descendants by duplicate `id`; the production inert proxy sanitizer removes duplicate identity attributes. The harness was corrected to use class-based test locators.
2. run `33650541770` / job `100316129026` emitted a complete raw matrix but failed an over-strong assertion requiring one sampled transform to restore the proxy all the way to the source's full geometry ratio. The raw result showed that the temporal delta was restored while unrelated proxy geometry remained different. Accepted C33 therefore asserts proxy-relative temporal restoration instead.

Neither development failure changes the accepted physical findings.

## 11. Duplicate / owner reconciliation

### P0-070 — primary top-document owner

P0-070 requires one exact user save generation from command admission through physical render/cache/download/upload/Journal finalization. C33 demonstrates a concrete render-generation drift inside one stable document: the visual phase sampled at admission is not the phase serialized later.

This can remain broken even with all resources loaded and with page JavaScript disabled at print time. It is therefore fresh P0-070 evidence rather than a P1-003 readiness issue.

### P1-187 — primary frame owner

P1-187 owns missing rendered state in the flattened iframe proxy. The final proxy has no WAAPI Animation object and no sampled transform. This is the same secondary-representation root class as earlier canvas/form/top-layer/fragmentation losses, freshly revalidated for temporal animation state.

### P0-075 — supporting architecture

A naive fix that pauses all animations on the live hostile page would make WebClip preparation page-observable. Existing current architecture already treats the live host as untrusted. The safer direction is to capture/materialize the sampled temporal state in an isolated final representation.

### P0-004 — visual consequence, not primary owner here

The wrong temporal phase is visibly wrong selected content, but the direct root in this schedule is save-generation cut timing rather than ancestor clipping/selection dependency. P0-004 remains adjacent rather than being broadened unnecessarily.

### P1-003 — not revalidated by this fixture

All C33 visual resources are simple colored boxes and are ready. Resource readiness therefore does not explain the observed phase drift.

No new P-code is warranted.

## 12. External standards / comparable-engine research

External sources are architecture/hypothesis input only; fresh WebClip physical evidence controls the verdict.

### Web Animations / MDN

The Animation API exposes `currentTime` as explicit animation timeline state and `pause()` as explicit playback control. This reinforces that temporal state is not implied merely by DOM/style identity.

References:

- https://developer.mozilla.org/en-US/docs/Web/API/Animation/currentTime
- https://developer.mozilla.org/en-US/docs/Web/API/Animation/pause
- https://www.w3.org/TR/web-animations-1/

### CSS Animations

CSS Animations are time-dependent computed-value effects. User agents may choose special behavior for non-interactive print media, but WebClip explicitly renders through emulated `screen` media, so the product needs its own deterministic temporal-cut contract.

Reference:

- https://www.w3.org/TR/css-animations-1/

### snapDOM

Current snapDOM v2.23+ changelog includes a specific fix to disable animations on clones so entry keyframes do not blank captures, alongside non-destructive clone capture and rendered-state freezing improvements.

References:

- https://github.com/zumerlab/snapdom/blob/main/CHANGELOG.md
- https://github.com/zumerlab/snapdom/releases

The transferable lesson is representation ownership: capture a stable rendered state in a clone/static representation rather than allowing the live application's temporal timeline to decide the eventual bytes.

## 13. Architecture direction

A future C33/P0-070/P1-187 implementation should:

1. define an explicit admission-time temporal cut for the faithful-static PDF mode;
2. sample relevant selected CSS/WAAPI/transition state before WebClip-owned save transformations create a later phase;
3. materialize required sampled used values into an isolated/frozen final representation rather than blanket-pausing hostile live DOM;
4. preserve per-frame temporal state in the actual secondary representation rendered into PDF;
5. keep temporal-state capture bounded by P1-167/P0-064-style node/time budgets;
6. distinguish temporal-state proof from resource-readiness proof;
7. report degraded/unknown/error rather than silent success when exact required temporal state cannot be represented;
8. verify physical PDF raster/geometry rather than treating metadata or pre-print DOM metrics as final-byte proof.

## 14. Pipeline mapping

- **B1 User Intent:** save the selected visual state now.
- **B2 Admission:** current implementation has no immutable animation/transition phase receipt.
- **B3 Capture:** live source continues advancing after admission.
- **B4 Static Materialization:** top path remains live; frame proxy drops WAAPI state; test-only sampled freeze shows a viable static-state direction.
- **B5 Renderer:** screen-media `Page.printToPDF` serializes the representation at its later physical cut.
- **B6 Physical Artifact:** raster ratios prove later top phases and zeroed frame temporal phase; frozen/paused controls preserve sampled state.
- **B7–B9:** not independently exercised by the focused C33 tranche.

## 15. Verdict / next coordinate

Fresh C33 verdict:

**`L4-REVALIDATED / FINDING + POSITIVE/CSS/WAAPI/TRANSITION/PAUSED/FROZEN/FRAME/CAUSAL CONTROLS (P0-070, P1-187; P0-075 supporting)`**.

No Registry status/wording transition is made. After canonical integration, the next sequential coordinate is **C34 — Animated image/GIF frame**.
