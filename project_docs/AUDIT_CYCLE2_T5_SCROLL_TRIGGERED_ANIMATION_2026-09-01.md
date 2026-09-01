# WebClip — Cycle 2 T5 / PD1 — scroll-triggered animation physical PDF evidence — 2026-09-01

Date: 2026-09-01

Campaign: `DEEP-AUDIT-CYCLE-2-2026-08-31`.

Canonical source baseline for this tranche: `main = 7b74ca7d6202f03342546da2dd46cfb98e25ad82` (T4/PD4 merged; post-merge Repository Integrity #189 attempt 4 SUCCESS on this exact main after the earlier GitHub-hosted-runner outage).

Accepted current-browser evidence:

- branch: `audit/cycle2-scroll-triggered-animation-2026-09-01`;
- exact evidence head: `5e1dd3679728decbed1539345bbbe006980e00a3`;
- GitHub Actions run: `33456762410`;
- job: `99698272380`;
- browser: **Google Chrome for Testing 152.0.7977.64**;
- probe: `project_tools/audit_scroll_triggered_animation.py`;
- renderer model: production-equivalent `media: screen` plus physical PDF with backgrounds and CSS page size;
- physical evidence: actual PDF bytes, extracted text, all-page 96-dpi raster/color totals and SHA-256 receipts.

An earlier run `33456666821` / job `99697983568` was rejected as insufficient because its raster assertion examined only PDF page 1 while the stable positive target legitimately printed on a later page. The feature/state assertions themselves had reached the positive case, but no tranche result was accepted until the all-page raster rerun succeeded.

## 1. Tranche envelope

### Surface

T5 covers **PD1 — scroll-triggered animations** across the last four Cycle-2 revalidation families:

- C20 — nested scroll / retained scrollports;
- C29 — viewport/view-timeline dependent geometry;
- C33 — CSS/WAAPI animations/transitions;
- C35 — mutation/materialization between admission and physical render cut.

C22 — user-reached dynamic-scroll authority — is repeated as a negative boundary: WebClip must not manufacture logical content by scrolling farther than the user did.

### Mission invariant

If a selected element is visibly in a scroll-triggered animation state when the save is admitted, WebClip preparation must not silently substitute a different animation state merely because its selected-only representation changes surrounding geometry. The saved PDF must represent the admitted logical generation and material visual state, or explicitly surface a bounded degradation.

At the same time, preserving fidelity does not authorize WebClip to auto-scroll beyond the user's reached boundary and trigger new logical content.

### Required evidence

- L1 current source and owner saturation;
- L3 current feature-capable Chrome;
- L4 actual PDF bytes/raster/text;
- stable positive control;
- selected-only geometry/materialization control;
- nested-scroll control;
- Exclude and hover-negative controls;
- no-user-scroll C22 negative boundary.

## 2. Platform trigger

Chrome 146 stable added scroll-triggered animations: ordinary time-based CSS animations can be controlled by a timeline trigger whose active/inactive state depends on a scroll or view progress timeline. This differs from scroll-driven animations: the scroll position triggers playback actions rather than directly serving as the animation clock.

The accepted fixture uses:

```css
.trigger-subject {
  trigger-scope: --audit-trigger;
  timeline-trigger: --audit-trigger view() contain / cover;
}
.trigger-visual {
  animation: audit-reveal 220ms linear both;
  animation-trigger: --audit-trigger play-forwards reset;
}
```

Chrome 152 confirms both required syntax paths:

- `CSS.supports('timeline-trigger: --audit-trigger view() contain / cover') = true`;
- `CSS.supports('animation-trigger: --audit-trigger play-forwards reset') = true`;
- the basic `play-forwards play-backwards` form is also supported.

The `reset` deactivation action is valuable for this audit because it makes a geometry-induced active→inactive transition observable immediately and deterministically: animation progress returns to zero and pauses.

## 3. L1 current WebClip path

Current `content.js` contains no dedicated snapshot/freeze/materialization of page-owned CSS animation-trigger state or view-timeline trigger state.

The save path instead prepares the live document, including:

1. disclosure expansion and resource readiness;
2. insertion of the WebClip print header;
3. frame-chain preparation;
4. installation of selected-only print styles;
5. link/image normalization;
6. frame height/proxy materialization;
7. then the worker performs the physical PDF render.

For the top document, selected-only print CSS deliberately hides non-selected body nodes while retaining selected nodes/ancestors. That is necessary for scope authority, but it also changes document geometry before the renderer cut. There is no separate preservation of a scroll-trigger's admitted active state before this geometry change.

Current `service-worker.js` explicitly sets `Emulation.setEmulatedMedia({media:'screen'})` and then calls `Page.printToPDF` with `printBackground:true`, `scale:1`, and `preferCSSPageSize:true`. The T5 harness mirrors this screen-media physical-render model.

Current source does not perform general capture-time `scrollTo`/`scrollTop` materialization. Scroll listeners update WebClip outlines, while the Main Content command alone may center its chosen candidate with `scrollIntoView`. The T5 manual-selection controls therefore distinguish selected-only geometry change from WebClip auto-scrolling.

## 4. Stable whole-body positive control

The fixture places 1000 px of ordinary content before the trigger subject. A user-like scroll reaches `scrollY=950`, putting the subject at viewport y=`50`.

At admission:

- visual rect: `x=280, y=50, 160×120`;
- subject rect: `x=20, y=50, 560×300`;
- background: `rgb(0, 150, 0)`;
- transform: `translateX(260px)` (`matrix(...,260,0)`);
- animation state: `finished`, `currentTime=220`;
- admission target PNG SHA-256: `a67a7b236fbe39fb4df41218c2a317fe1fd0944379272443a6835b42099ca42c`.

The whole body is selected, so the 1000 px predecessor remains part of the selected representation. After WebClip preparation the print header shifts the subject to y≈`241.97`, but it remains inside the trigger's active range:

- background remains green;
- transform remains +260 px;
- animation remains `finished`, `currentTime=220`.

Physical PDF:

- 3 pages;
- all-page green pixels: `18,678`;
- red pixels: `0`;
- selected trigger text present;
- explicit Exclude text absent;
- hover-only text absent;
- PDF SHA-256: `a48bfcdfbd117591ac4d6e0033264415a98c0897bf6d450cbdb8d670bbebfc88`;
- combined all-page raster SHA-256: `6198af14df783a2560603f68b5592cc79dd6c991900edc940a55c4f4301ab2c0`.

This is the positive control: current Chrome 152 and the physical PDF path can preserve a stable scroll-triggered final state when WebClip preparation does not invalidate its trigger geometry.

## 5. PD1 finding — selected-only materialization resets the admitted trigger

The finding fixture is **identical at admission** to the stable positive fixture. It uses the same user scroll, same trigger, same animation and same rendered target. The only later difference is the user's selection scope: only `#capture` is included, while the preceding 1000 px `#pre` block is outside the selection.

At admission:

- `scrollY=950`;
- visual/subject y=`50`;
- green final background;
- +260 px transform;
- `finished`, `currentTime=220`;
- admission PNG SHA-256 is **exactly the same as the positive control**:
  `a67a7b236fbe39fb4df41218c2a317fe1fd0944379272443a6835b42099ca42c`.

Therefore the two cases do not begin from different visible states.

During WebClip preparation, selected-only CSS hides the unselected 1000 px predecessor. The user's scroll remains `950`, while the retained trigger subject shifts to y≈`-758.03`, outside its `view()` active range. Chrome applies the declared deactivation action:

- background: green → **red** (`rgb(220, 0, 0)`);
- transform: +260 px → **0 px**;
- `playState`: `finished` → **`paused`**;
- `currentTime`: `220` → **`0`**.

The actual PDF follows the substituted prepared state:

- 2 pages;
- red pixels: `18,646`;
- green pixels: `0`;
- selected `TRIGGER_TARGET` text present;
- unselected predecessor text absent;
- Exclude text absent;
- hover-only text absent;
- PDF SHA-256: `5fb04538224211ba547f09b1c0502ce5d31e2f9fdae4882a55c9a2d2ddce0a09`;
- combined all-page raster SHA-256: `04ac24b8e71780d2e32906d28b691c4809a7d95659e3aaa178c9fc4e7b0c4566`.

### Verdict

**PD1 = `ARTIFACT-COVERED / FINDING`.**

The defect is not lack of Chrome support and not an unavoidable print-only behavior. The stable control proves the same current browser and physical PDF path preserve the green/final triggered state. The failure occurs because WebClip changes the trigger's geometry after user admission without materializing the admitted animation state first.

## 6. C20 nested-scroll positive breadth control

A second fixture uses a real `overflow:auto` nested scrollport. The user-like action sets its `scrollTop=560`, bringing the nested trigger into the active range.

At admission:

- nested visual/subject y≈`82`;
- background green;
- transform +260 px;
- animation `finished`, `currentTime=220`.

After WebClip preparation:

- trigger remains active/final;
- visual/subject y≈`273.97`;
- background remains green;
- transform remains +260 px;
- animation remains `finished`, `currentTime=220`.

Physical PDF:

- 1 page;
- green pixels: `17,550`;
- nested trigger text present;
- nested Exclude text absent;
- PDF SHA-256: `4402bde3d9bb8960cc82969d407c07b6894a32f39ba4ced3c9962d290ccf9d8e`;
- raster SHA-256: `0f5bcb63cd9849ddd939971a3b7e07980c4859c612f990ea2180267dc7106286`.

This closes the new PD1 nested-scroll breadth requirement for C20 without claiming that all historical nested-scroll fidelity findings are fixed.

## 7. C22 negative authority — no user scroll means no generated batch

The no-user-scroll fixture attaches an observable logical-content generator to a nested scrollport: a new `AUTO_SCROLL_GENERATED_CONTENT` sentinel is appended only if `scrollTop > 0`.

Before save:

- `scrollTop=0`;
- generated count=`0`.

After real WebClip preparation + physical PDF:

- `scrollTop=0`;
- generated count=`0`;
- sentinel not present in DOM;
- sentinel absent from PDF text;
- PDF SHA-256: `56431e00e3111e3ae1e08f523da2781acdb1057cff484bdd7eea1c4ef98c35d0`.

This strengthens, but does not replace, the existing P1-230 user-reached dynamic-scroll evidence: WebClip did not auto-scroll beyond the user's reached boundary in this T5 path.

## 8. Ownership / deduplication

No new P-code is warranted.

Primary root-cause owners already exist:

- **P0-070** — exact save generation from user/command admission through physical artifact finalization;
- **P0-075** — host page is not a trusted print control plane; the admitted representation needs isolation/materialization;
- **P0-004** — selected physical PDF fidelity and geometry must remain complete and selection-bounded.

Supporting context:

- **P1-230** — user-reached dynamic/virtualized scroll history and the no-auto-scroll-beyond-user boundary;
- **P1-003** — rendered CSS/resource readiness where applicable;
- historical temporal-render evidence already showed that Chromium can physically preserve an explicitly stabilized animation phase, so the current finding is a refinement of the existing generation/representation authority problem rather than an independent new owner.

`AUDIT_REGISTRY.md` remains unchanged and remains the sole P-code/status authority.

## 9. Family-level Cycle-2 effect

T5 closes the final current-stable platform-delta revalidation cells:

- **C20 Nested scroll / retained scrollports** → terminal: direct nested PD1 control reached; existing historical findings remain, and no new independent PD1 nested defect was added;
- **C29 Viewport/container-dependent geometry** → terminal FINDING: selected-only geometry moves a `view()` trigger from active to inactive;
- **C33 CSS/WAAPI animations/transitions** → terminal FINDING: admitted finished phase is reset to zero before physical artifact;
- **C35 Preparation/render-cut mutation** → terminal FINDING: the state substitution occurs during WebClip's own selected-only preparation before `Page.printToPDF`;
- **C22** remains terminal and gains a fresh negative no-auto-scroll control.

Family metrics therefore advance:

- before T5: **42 terminal / 4 revalidation**;
- after T5: **46 terminal / 0 revalidation**.

All current-stable Cycle-2 platform-delta variants PD1–PD6 now have terminal required evidence. PD7 remains a future/WATCH item because it was not current stable at the campaign checkpoint.

## 10. Coverage meaning and next step

T5 completes the **current-stable platform-delta revalidation set**, but this tranche by itself does not declare the whole campaign complete.

The required next step is a separate fresh-main **Cycle-2 final reconciliation/synthesis**:

1. rerun/verify the complete C01…C46 Matrix denominator and zero revalidation state on merged main;
2. verify explicit L5/external boundaries remain visible rather than silently converted to PASS;
3. verify no duplicate/unowned finding was introduced;
4. distinguish coverage completion from implementation closure and release readiness;
5. only then decide whether `DEEP-AUDIT-COVERAGE-COMPLETE` is warranted for Cycle 2.

No build, tag or GitHub Release is implied by this audit tranche. `RELEASE_READINESS.md` remains unchanged / `NOT READY`.