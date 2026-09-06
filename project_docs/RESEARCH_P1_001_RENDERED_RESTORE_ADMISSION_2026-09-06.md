# P1-001 — truthful rendered-target admission for SelectionSnapshot restore — 2026-09-06

Canonical owner/status authority remains `project_docs/RESEARCH_REGISTRY.md`.

Baseline:

- `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`;
- minimum Chrome remains 118;
- research branch changes docs/tools only.

## Status

**P1-001 remains ACTIVE.**

Registry owner:

> SelectionSnapshot v3 restore must apply a truthful current rendered-target admission contract after structural matching; high locator score plus nonzero bbox cannot report success for hidden/fully transparent/otherwise non-admissible current nodes.

## Executive finding

Current restore has a strong two-part structural locator system but a weak final admission step.

Local restore resolves a locator, checks ambiguity, and then calls:

```text
isUsableCandidate(element)
```

Current implementation:

```text
const rect = getDocumentRect(element);
return Boolean(rect && rect.width >= 2 && rect.height >= 2);
```

The cross-origin `frame-agent.js` uses the same semantic rule:

```text
usable(el) -> getBoundingClientRect().width >= 2 && height >= 2
```

Thus structural confidence and a nonzero box are currently treated as sufficient rendered authority.

A node can have a large box while being:

- `visibility:hidden`;
- fully transparent through its own/ancestor opacity;
- not rendered due to `content-visibility:hidden`;
- under a skipped `content-visibility:auto` subtree;
- otherwise unavailable as a truthful current rendered target.

## Positive controls to preserve

### V3 locator scoring

Current locator scoring already contains useful structural ambiguity handling:

- score threshold;
- best/second margin;
- `high` / `medium` confidence;
- CSS/DOM path signals;
- id/ARIA/name/title/src/href/role/text/context signals;
- frame-path resolution.

P1-001 must not replace this with a visibility-only heuristic.

The pipeline remains:

`structural candidate -> ambiguity/confidence -> rendered admission`.

### Nonzero geometry

The current >=2x2 geometry check remains useful as one admission component.

It is simply not sufficient by itself.

### Remote-frame parity

Cross-origin restore already has a dedicated frame agent and returns `ok/confidence/ambiguous` to the top script.

Rendered admission must be implemented with equivalent semantics in that agent rather than only in top `content.js`.

## Required contract

A structural match is not counted as restored until a **fresh rendered-target admission** passes.

Conceptually:

```text
admitRenderedRestoreTarget(element) -> {
  ok,
  reason,
  observedAt,
  geometryClass
}
```

The receipt is short-lived current-page authority, not durable backup data.

## Minimum admission checks

### 1. Live connected element

Require:

- element node type is correct;
- `isConnected`;
- owner document is the expected current document/frame generation under P0-080/P1-171 boundaries.

A detached old element reference cannot be restored.

### 2. Associated usable box

Keep the bounded geometry test:

- width >= 2 CSS px;
- height >= 2 CSS px;
- finite values.

Do not treat huge/NaN/Infinity geometry as normal admission.

### 3. CSS visibility

Reject current targets whose actual rendered state is invisible through:

- `display:none` / no associated box;
- `visibility:hidden`;
- `visibility:collapse` where applicable.

### 4. Effective zero opacity

Reject fully transparent current targets.

This must include ancestor effects sufficient to make the candidate fully transparent, not only `getComputedStyle(element).opacity === '0'` if an ancestor owns the zero opacity.

Do not invent an arbitrary threshold such as opacity < 0.1. The required semantic boundary is fully transparent versus rendered, unless later product research explicitly defines a different threshold.

### 5. Content-visibility

Reject:

- `content-visibility:hidden` on element/ancestor;
- a currently skipped `content-visibility:auto` subtree when WebClip can determine that fact.

The minimum supported Chrome creates a compatibility nuance described below.

## Chrome `Element.checkVisibility()` as a primitive

`Element.checkVisibility()` is available in Chrome from 105, so the base API is compatible with WebClip's minimum Chrome 118.

On Chrome 118 the historical option names are the safe compatibility form:

```text
checkVisibility({
  checkOpacity: true,
  checkVisibilityCSS: true
})
```

Those options are supported from Chrome 105.

The newer names (`opacityProperty`, `visibilityProperty`) and `contentVisibilityAuto` option have later compatibility thresholds; notably `contentVisibilityAuto` is Chrome 121+.

Therefore do not raise the effective minimum Chrome accidentally by unconditionally relying on Chrome-121-only option behavior.

## Compatibility strategy for Chrome 118–120

A safe implementation can use:

1. base `checkVisibility()`;
2. historical `checkOpacity:true`;
3. historical `checkVisibilityCSS:true`;
4. bounded computed-style/ancestor inspection for `content-visibility:auto` ambiguity;
5. fail closed as `render-state-unknown` when the minimum-version browser cannot prove an auto-contained candidate is currently rendered.

On newer Chrome the implementation may feature-detect and additionally use:

`contentVisibilityAuto:true`.

Do not infer support solely from current development-browser version.

## Why `checkVisibility() === true` is not complete authority

Browser documentation explicitly states that `true` only means potentially visible; it does not guarantee the user can see the element.

That is acceptable if WebClip defines the right admission boundary.

P1-001 does **not** require:

- current viewport intersection;
- no overlap by another page element;
- `elementFromPoint()` ownership;
- current scroll visibility.

Those would reject legitimate offscreen archive targets and couple restore correctness to transient overlays/scroll position.

P1-001 requires a current renderable target, not current human line-of-sight.

## Boundary with P0-004 clipping/fidelity

An admitted target can still sit inside a page carrier that clips it in the live page.

P0-004 owns neutralizing carrier ancestor clipping/presentation for the selected PDF.

Therefore P1-001 should not attempt a full CSS paint/occlusion engine.

Examples not automatically rejected solely by P1-001:

- partly clipped by overflow ancestor;
- below viewport;
- covered by sticky cookie banner;
- inside a carrier whose background/transform will be normalized by P0-004.

If the target has a real render box and is not display/visibility/opacity/content-visibility hidden, it can remain admissible and P0-004 determines print fidelity.

## Boundary with P0-080

P0-080 owns same-document SPA/application generation and live selection authority.

P1-001 consumes the current generation after structural locator matching.

A rendered target from an obsolete SPA generation is still stale even if visually visible.

Conversely a candidate in the correct current generation is not a successful restore until P1-001 rendered admission passes.

## Boundary with P1-171

Cross-origin frame registry/document generation must be exact.

The frame agent may report rendered admission only for the exact currently authorized child document generation.

A reused `frameId` or same-URL reload receipt cannot become a P1-001 success.

## Includes and Excludes

The same rendered-target rule applies before restoring both Include and Exclude locator targets.

Additional existing Exclude requirements remain:

- Exclude target must be inside an admitted Include;
- it must not already be inside another Exclude;
- restore ordering and ambiguity rules remain unchanged.

A hidden Exclude target must not be counted as successfully restored merely because the containing Include is valid.

## Truthful result accounting

Current restore returns counters such as restored/failed/ambiguous/confidence.

P1-001 should distinguish at least diagnostics/reason categories for:

- locator-not-found;
- locator-ambiguous;
- rendered-target-hidden;
- rendered-target-opacity-zero;
- rendered-target-content-visibility;
- rendered-target-no-box;
- render-state-unknown.

The UI may aggregate these for simplicity, but OperationLog/diagnostics should not call them structural matching failures when matching succeeded and rendered admission failed.

## No mutation to make a target pass

Restore admission is observational.

Do not make hidden targets visible merely to convert them into successful matches:

- no `display:block`;
- no opacity mutation;
- no removal of `hidden`/style;
- no scrolling solely to force `content-visibility:auto` and then silently count success without a defined contract.

If the product later supports an explicit reveal/expand action, it is a separate mutation with its own user/DOM authority.

## Boundedness

Rendered admission runs after structural candidate selection, not for every element in the locator search universe.

That keeps style/visibility inspection bounded by the number of restored Include/Exclude targets.

Avoid a whole-document visibility scan.

Ancestor inspection must have an explicit depth/time budget and fail closed/unknown if it cannot be completed safely.

## Cross-origin frame parity

`frame-agent.js::restoreOne()` currently performs:

`resolve -> usable(bbox) -> addInclude/addExclude`.

It needs the same rendered admission helper semantics as top content.

Required parity regressions:

1. local top target opacity 0 -> fail;
2. cross-origin frame target opacity 0 -> fail;
3. local visibility hidden -> fail;
4. remote visibility hidden -> fail;
5. content-visibility hidden -> fail in both contexts;
6. visible high-confidence target -> success in both contexts.

## Deterministic race/admission model

`project_tools/test_p1_001_rendered_restore_admission_model.js` proves:

- bbox-only current admission accepts opacity-zero target;
- corrected admission rejects opacity-zero;
- visibility-hidden is rejected;
- content-visibility hidden/skipped is rejected;
- fully non-admissible modeled target is rejected;
- visible target remains accepted;
- structural score 80 does not override rendered admission.

Model result on creation:

`P1-001 rendered restore admission model: PASS`.

The model's `fullyClipped` case is an abstract non-admissible control, not a requirement to implement general pixel occlusion detection in source.

## Source-bound runtime gate

This branch adds `project_tools/test_p1_001_rendered_restore_admission_source.js`.

It remains RED until:

- `isUsableCandidate()` delegates to an explicit rendered-target admission helper or equivalent;
- that helper uses more than bbox;
- `checkVisibility` or equivalent display/visibility/content-visibility logic exists;
- effective zero-opacity is handled;
- frame-agent `usable/restoreOne` has parity;
- restore counters do not count rejected hidden targets as success;
- current structural ambiguity/confidence thresholds remain present.

## Required physical/browser verification

Because CSS/browser rendering is the owner subject, source/model evidence cannot close P1-001.

Chrome fixtures should include:

- high-score locator + `opacity:0`;
- ancestor opacity 0;
- `visibility:hidden`;
- `visibility:collapse` applicable element;
- `content-visibility:hidden` ancestor;
- `content-visibility:auto` skipped state on Chrome versions representative of supported minimum/current;
- zero-size target;
- offscreen but rendered target positive control;
- target under visual overlay positive control;
- local and cross-origin frame parity;
- same structural locator after SPA replacement under P0-080.

Success means truthful restored/failed counters and no hidden node receives Include/Exclude authority.

## Release/closure rule

P1-001 remains ACTIVE until:

1. production source gate PASS;
2. deterministic model/regressions PASS;
3. real supported Chrome evidence covers minimum/current visibility semantics;
4. remote frame parity passes;
5. P0-080 generation and P0-004 fidelity regressions remain compatible;
6. release readiness is separately satisfied.
