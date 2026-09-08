# PD7 — single-axis scroll-container current-channel Change Impact — 2026-09-09

Date: 2026-09-09  
Repository: `lukindv77/webclip-pdf`  
Canonical `main` researched: `d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Current `content.js` Git blob: `f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e`  
Research branch: `research/pd7-single-axis-scroll-stable-2026-09-09`  
Scope: Change Impact / research-only. Runtime, `manifest.json`, Registry status, version/build/tag/release/deployment are unchanged.

## 1. Classification

PD7 was previously classified in Cycle-2 as:

```text
OUT-OF-SCOPE (current stable target) / WATCH
```

The 2026-09-09 external refresh finds materially changed channel/release evidence around Single-axis scroll containers. Current official Chrome surfaces are operationally inconsistent:

- Chrome for Developers landing identifies **Chrome 153 stable** and highlights Single-axis scroll containers;
- Chrome Platform Status Chrome 153 Release Notes list Single-axis scroll containers;
- the dedicated Chrome article dated 2026-09-04 simultaneously says the feature is available in Chrome 153 **Beta/Dev/Canary** and asks developers to test it **before Stable rollout**.

Therefore the correct research state is not “universally Stable PASS” and not the old unconditional WATCH.

**Current PD7 state: `REVALIDATION-REQUIRED / ROLLOUT-SENSITIVE`.**

Physical evidence must record exact browser version/channel and:

```js
CSS.supports("named-feature(single-axis-scroll-container)")
```

before it can classify the new semantic variant as exercised.

No new P-code is allocated.

## 2. Owner reconciliation

The platform delta maps to already ACTIVE owners:

- **P0-004 ACTIVE** — primary owner for selected PDF fidelity under ancestor clipping/layout/positioning;
- **P1-230 ACTIVE** — supporting owner for user-reached dynamic/virtualized history, because scroll-context authority may need per-axis identity;
- **P1-187 ACTIVE** — supporting frame/static-representation parity where rendered frame proxies are involved.

Canonical Registry text remains unchanged.

## 3. Affected coverage families

### C20 — nested scroll / retained scrollports

Current fresh-restart classification before this Change Impact:

```text
L4-REVALIDATED / FINDING + controls (P0-004)
```

The 2026-09-02 physical receipt used Chrome `151.0.7922.173` and already proved that retained selected scrollports can truncate selected content to the current viewport slice. Test-only static expansion restored all 120 rows.

That evidence remains valid for its exact browser/source. PD7 adds a new semantic variant: one element can become a scroll container on only one axis. C20 therefore requires a per-axis revalidation before project-wide coverage can treat this platform delta as terminal.

### C31 — fixed / sticky

Current fresh-restart classification before this Change Impact:

```text
L4-REVALIDATED / FINDING + controls (P0-004; P1-187 supporting)
```

The 2026-09-02 Chrome-151 receipt already proves WebClip's current top selected representation leaves authored fixed/sticky behavior materially exposed to paged-media behavior.

PD7 adds the ability for sticky constraints to resolve against different scroll ancestors per x/y axis. C31 therefore needs a mixed-axis sticky schedule in the browser where the feature is actually active.

### C22/C23 — P1-230 supporting Change Impact

P1-230 currently requires user-reached history per scroll context.

Once the browser itself distinguishes a scroll container per axis, a generic receipt such as:

```text
context = element
maxReached = scalar
```

can become semantically insufficient.

A robust model needs at least the ability to distinguish:

```text
(context identity, x-axis user reach)
(context identity, y-axis user reach)
```

where that distinction materially affects dynamic/virtualized materialization.

The platform delta does not itself prove a new P1-230 production defect beyond the already open owner; it refines its acceptance envelope.

### C29 — geometry/layout supporting Change Impact

Official Chrome documentation also identifies Grid/Flex automatic-minimum-size changes when `clip` is combined with a scrollable value. This can alter post-normalization width/height and therefore belongs to layout/geometry Change Impact under existing P0-004/P0-070 families.

## 4. Platform semantic model

Single-axis scroll semantics permit:

```css
.inner {
  overflow-x: auto;
  overflow-y: clip;
}
```

with conceptual ownership:

```text
x scroll container = inner
y scroll container = an outer ancestor / viewport
```

This invalidates a model that stores one generic “nearest scrolling ancestor” for both axes.

The same split affects sticky ancestry and potentially scroll-generated content authority.

## 5. Current source boundary

Current `content.js` already has useful positive controls:

- diagnostics read `overflowX` and `overflowY` separately;
- some selected-frame/static materialization paths force `position: static`;
- print normalization paths force overflow visible in selected frame/chain representations.

But direct current source has no explicit source-visible abstraction for:

- per-axis scroll-container classification;
- selected top-document scrollport staticization as an owned operation;
- top selected sticky normalization policy;
- axis-qualified user-reached scroll-context identity;
- browser feature/semantic receipt for Single-axis scroll containers.

This research block therefore expects the PD7 source gate to be RED against current production source. Functional RED execution against an exact full production checkout is not claimed in this block.

## 6. Deterministic semantic model

Added:

`project_tools/test_pd7_single_axis_scroll_model.js`

Actual local execution:

```text
PD7 counterexample: one nearest-scroll-container identity is false once x and y can have different scroll ancestors
PD7 single-axis scroll container semantic model: PASS
```

Local Git blob before commit:

`2511553641709809bd99723032d32f94606e772b`

The model covers:

1. one element scrollable on x but clipped on y;
2. sticky x/y resolving to different ancestors;
3. selected static-PDF overflow normalization on both axes;
4. fixed/sticky static-placement requirement;
5. P1-230 axis-qualified monotonic user-reach authority;
6. WebClip-owned programmatic movement cannot enlarge user reach;
7. Grid/Flex auto-min-size layout can change after staticization, requiring post-normalization geometry truth;
8. ordinary dual-axis scroller positive control.

Model PASS proves the target invariants, not browser support or production PASS.

## 7. Physical browser harness

Added:

`project_tools/research_pd7_single_axis_scroll.py`

The same harness is intentionally usable as both:

- an old-browser negative platform control; and
- a future current-feature physical revalidation when `CHROME_BIN` points to a browser where feature detection is true.

It records:

- browser version;
- `CSS.supports("named-feature(single-axis-scroll-container)")`;
- computed overflow values;
- programmatic x/y scroll settlement;
- sticky geometry;
- raw PDF row count;
- test-only static-normalized PDF row count.

Local Git blob before commit:

`034dea0a68ee977af7db82dfd99014add50b6019`

## 8. Actually executed local physical control

Available local browser:

```text
Chromium 144.0.7559.96
```

Actual harness output:

```json
{
  "browser": "144.0.7559.96",
  "chromeBin": "/usr/bin/chromium",
  "initial": {
    "innerOverflowX": "auto",
    "innerOverflowY": "hidden",
    "outerOverflowX": "hidden",
    "outerOverflowY": "auto",
    "stickyTop": 426,
    "stickyLeft": 6,
    "innerTop": 423
  },
  "afterProgrammaticScroll": {
    "innerLeft": 180,
    "innerTop": 90,
    "outerTop": 6,
    "stickyTop": 420,
    "stickyLeft": 6
  },
  "pdf": {
    "rawRows": 0,
    "normalizedRows": 40
  },
  "feature": {
    "featureSupported": false,
    "clipAxisRejectsProgrammaticScroll": false,
    "horizontalScrollWorks": true,
    "verticalOuterScrollWorks": true,
    "normalizedPdfRows": 40,
    "rawPdfRows": 0
  },
  "currentStableRevalidationPass": false
}
```

Final harness classification:

```text
BOUNDED NEGATIVE CONTROL — browser lacks single-axis-scroll-container feature; Chrome 153+ / feature-active browser still required
```

Interpretation:

- old Chromium computed the would-be clipped secondary axes as `hidden`;
- `inner.scrollTop = 90` succeeded, demonstrating old programmatic-scroll semantics;
- feature detection was false;
- raw clipped physical representation omitted all 40 fixture rows from extracted PDF text;
- test-only static normalization made all 40 rows physically present.

This is useful causal/control evidence for the C20/P0-004 direction. It does **not** close PD7 current-channel revalidation.

## 9. Current-channel physical evidence boundary

The local execution environment contains Chromium 144 only.

A local attempt to obtain a current Chrome build failed because the container could not resolve the external download host. Therefore this block does not claim physical Chrome-153 feature-active evidence.

Given the official rollout-sensitive signals, the required future physical run is defined by **feature support**, not merely major version:

```text
browser version/channel recorded
AND CSS.supports("named-feature(single-axis-scroll-container)") == true
```

If current Stable reports false, that is evidence that the feature is not active in that Stable rollout and PD7 remains a bounded rollout/watch boundary rather than a feature-active Stable behavior.

## 10. Required feature-active physical schedules

A feature-active Chrome run should cover at minimum:

### A — platform discriminator

```text
feature support == true
overflow:auto clip keeps clipped axis non-scrollable
programmatic scroll on clipped axis is rejected/does not move
```

### B — per-axis sticky ancestry

Nested fixture:

```text
inner: x scroll / y clip
outer: x clip / y scroll
```

Prove horizontal and vertical sticky constraints follow the expected different ancestors.

### C — selected mixed-axis scrollport / physical PDF

Select content whose ordinary source representation lives inside a single-axis scrollport. Compare current WebClip-shaped physical representation with a test-only static representation.

The user-selected existing content contract requires full static selected content, not only the current scroll slice.

### D — nested mixed-axis scrollports

Exercise more than one nested single-axis container so no implementation can accidentally pass by staticizing only the first ancestor.

### E — fixed/sticky static placement

Prove ordinary top selected fixed/sticky content gets one meaningful static PDF placement under the product contract, not repeated/clipped/axis-dependent paged behavior.

### F — Grid/Flex automatic minimum size

Create a fixture where the new one-axis scroll-container semantics materially change automatic minimum sizing. Measure source/admitted geometry and post-staticization geometry separately.

Static representation may intentionally change layout, but that change must be controlled/truthful rather than accidental.

### G — P1-230 axis authority

Use a dynamic fixture where user horizontal scrolling materializes horizontal logical content while vertical movement is caused by page script or WebClip. The y boundary must not be admitted merely because x user reach exists.

### H — ordinary dual-axis positive control

`overflow:auto` / `overflow:scroll` on both axes should retain existing expected semantics.

## 11. Source-bound production gate

Added:

`project_tools/test_pd7_single_axis_scroll_source.js`

Local syntax check passed before commit.

Local Git blob before commit:

`5ad25aee2f894a76e6818aa0749c9c9fc79ca65f`

The gate requires source-visible equivalents of:

1. per-axis scroll-container classification;
2. explicit selected nested-scroll staticization;
3. selected sticky normalization/admission;
4. axis-qualified user-reached scroll-context identity;
5. feature/semantic receipt for the new browser behavior.

Names are not prescribed; architecture-equivalent proof can replace the exact tokens in the future gate.

## 12. Architecture direction

A future correction should avoid making browser feature detection itself the product architecture.

Preferred separation:

```text
BrowserScrollSemanticsReceipt
        ↓
per-axis source scroll-context model
        ↓
Capture/UserReached authority
        ↓
selected static representation policy
        ↓
post-normalization geometry receipt
        ↓
physical PDF
```

Feature detection only tells WebClip which browser semantics it is observing. Product rules remain defined by WebClip contracts.

### Source-state receipt

Where material, capture/admission should preserve:

```text
overflowX / overflowY
scroll-container axes
source scroll positions per axis
sticky/fixed source relation
source geometry
```

### Static representation

For selected existing content, retained scroll clipping should not survive merely because the page happened to use an axis-specific scroll viewport.

For ordinary decorative/navigation fixed/sticky content, the PDF contract still prefers one meaningful static placement where literal paged behavior would repeat/clip/overlap.

### Post-normalization geometry

Because overflow staticization can change Grid/Flex auto-min-size, post-normalization geometry must not reuse a pre-normalization width/height receipt blindly.

## 13. No new owner / no premature closure

This tranche does not create `P1-231`.

The observed platform delta is fully expressible as Change Impact against existing owners until physical feature-active evidence proves an independent WebClip root cause that those owners cannot represent.

P0-004 and P1-230 remain ACTIVE for their existing reasons.

## 14. Coverage reconciliation consequence

The 2026-09-01 Cycle-2 `DEEP-RESEARCH-COVERAGE-COMPLETE` statement was explicitly bounded by future Change Impact.

Fresh-restart work on 2026-09-02/03 later revalidated C01…C46 against newer current source, but PD7 had not yet been exercised as a feature-active current-channel variant.

Therefore current project-wide research state must not mechanically inherit the old “platform delta = 0” assertion.

Until a feature-active PD7 physical run or an explicit checkpoint proves the feature remains non-Stable/out-of-scope for the chosen release target:

```text
PD7 = REVALIDATION-REQUIRED / ROLLOUT-SENSITIVE
C20 = existing FINDING + PD7 revalidation pending
C31 = existing FINDING + PD7 revalidation pending
C22/C23 = P1-230 acceptance refined; no independent PD7 closure claimed
```

This blocks a new unconditional `DEEP-RESEARCH-COVERAGE-COMPLETE` synthesis, but does not change Registry status or release readiness.

## 15. External baseline

The associated external refresh is:

`project_docs/RESEARCH_EXTERNAL_USER_INTENT_BASELINE_2026-09-09.md`

It records the official rollout ambiguity, Chrome 154 Beta WATCH deltas and fresh SingleFile/Obsidian/Browsertrix comparison signals. No new independent WebClip user intent or root owner was established.

## 16. Evidence ladder

Do not collapse:

```text
semantic model PASS
≠ Chromium-144 negative platform control
≠ feature-active Chrome physical platform proof
≠ source-gate PASS against exact production checkout
≠ production implementation PASS
≠ release readiness
```

## 17. Registry / release state

Unchanged:

- P0-004 ACTIVE;
- P1-230 ACTIVE;
- P1-187 ACTIVE;
- no new P-code;
- no runtime or `manifest.json` edit;
- no Registry status change;
- no build/tag/GitHub Release/deployment;
- release remains NOT READY.
