# Durable research evidence — focus / interaction-state fidelity — Blocks 17–32 — 2026-08-30

Continuation of the fresh focus/interaction-state tranche from exact baseline `ff6142135cb7103ed2b9f9a2bf3dd1dadd750454` on branch `research/focus-interaction-state-fidelity-2026-08-30`.

Canonical owner/status authority remains `RESEARCH_REGISTRY.md`. Research/docs only; no runtime, registry status, manifest/version/build/tag/release change.

Blocks 1–16 proved that current explicit Shadow textarea focus can replace physically printable `:focus` / `:focus-within` state and synchronously trigger irreversible top/iframe blur handlers before PDF preparation. Blocks 17–32 test the earlier trusted pointer path through WebClip's own Shadow buttons and distinguish browser default focus behavior from WebClip's click handler.

## Block 17 — exact current toolbar handler does not suppress the browser's pointer-focus default

Current `state.finishButton` is a native `<button>` in WebClip's open ShadowRoot. Its handler is registered on `click` and calls `event.stopPropagation()` before switching to review/showing the save dialog.

Likewise generic modal actions created by `createUiButton()` are native buttons whose click listener stops propagation and invokes the action.

The current source does not cancel the earlier trusted pointer/mousedown default that normally focuses a pressed button. Therefore source-page focus can already be gone before the `click` callback begins.

## Block 18 — trusted pointer click on a WebClip-shaped Shadow button automatically steals focus

Fresh fixture started with a selected text input focused and a WebClip-shaped ShadowRoot containing a native `button#finish`. Playwright performed a trusted pointer click on that Shadow button rather than calling `.focus()` programmatically.

Before the click:

- top active element = selected input `edit`;
- `edit:focus = true`;
- selected container `:focus-within = true`;
- BODY `:focus-within = true`.

After the trusted click:

- top `document.activeElement` = Shadow host `webclip-pdf-extension-root`;
- ShadowRoot active element = `finish`;
- selected input focus = false;
- selected container focus-within = false;
- BODY focus-within = false.

This is the ordinary browser default produced by interaction with the current UI shape.

## Block 19 — event ordering proves WebClip's `click` handler is too late to preserve source focus

The deterministic event log for the trusted click was:

1. `shadow:pointerdown`
2. `shadow:mousedown`
3. `edit:change`
4. `edit:blur`
5. document capture `focusout:edit`
6. `edit:focusout`
7. `shadow:focus`
8. document capture `focusin:webclip-pdf-extension-root`
9. `shadow:click`

Thus source `change/blur/focusout` and Shadow-button focus happen **before** the current click handler can run. `event.stopPropagation()` inside the click listener cannot make this a neutral transition.

## Block 20 — BODY `:focus-within` is specifically lost because WebClip host is mounted under `<html>`, not inside BODY

Current WebClip UI host is appended to `document.documentElement`. In the tested equivalent, moving focus from a BODY input to a focusable descendant of that host yielded:

- `html` remains an ancestor of focus;
- `body.matches(':focus-within')` changes true → false.

A page can therefore change broad selected presentation through `body:focus-within` selectors even though focus stays in the same top document.

This is not hypothetical selector syntax: the physical control below uses it.

## Block 21 — focus transfer can remove selected content from layout, not merely recolor it

The selected fixture contained `FOCUS_ONLY_SELECTED_CONTENT` with CSS:

`#selected:focus-within #focusOnly { display:block }`

and default `display:none`.

Before WebClip-like trusted toolbar click, the selected text block was displayed. After the click moved focus into the Shadow UI, its computed display became `none`.

So focus transfer can turn already-selected, user-visible content into physically absent content before selected-only print preparation.

## Block 22 — focused baseline physical PDF contains the focus-only content and focus styling

Before toolbar interaction, after the user had typed `USER_TYPED`, the physical forced-screen PDF was:

- SHA-256 `2e6716453f31672d5c0a94f80c60faaff877c796e76fbd91400593089a9ac29c`;
- 16,682 bytes;
- about **12,624 red** focus-outline pixels;
- about **53,820 green** pixels from the focus-only selected block;
- about **54,221 purple** pixels from a `body:focus-within` dependent selected block;
- about **29,083 yellow-family** focus input pixels;
- 0 blue dependent-state pixels.

This is the admitted physical control.

## Block 23 — after trusted WebClip-like toolbar click, the focus-only selected block is physically absent

After the Shadow toolbar click:

- `focusOnly` computed display = `none`;
- input focus styling is gone;
- body/selected `:focus-within` is false.

Physical PDF:

- SHA-256 `ccc2936b23a3420c270c6a7c67af907adf385004852164cd2f606de6b5e46c9c`;
- 16,284 bytes;
- 0 red focus pixels;
- 0 purple focus-within pixels;
- 0 yellow focus pixels;
- about **55,044 blue** pixels from the normal body-not-focused branch.

The green count now belongs to the change-handler side effect rather than the former focus-only block. The selected rendered composition is materially different before `prepareForPrint()` even starts.

## Block 24 — focus can change distant selected content through a document-level state selector

A separate selected block used:

- purple background while BODY matched `:focus-within`;
- blue background under `body:not(:focus-within)`.

The trusted Shadow toolbar click changed that block purple → blue although it was not the focused control itself.

This reinforces that focus is an environment/dependency edge, not one isolated CSS property on one node.

## Block 25 — user-edited text input can fire `change` solely because WebClip takes focus

The input began with markup/runtime value `ORIGINAL`. The user-control path changed it while focused to `USER_TYPED` but had not blurred it.

A deterministic `change` handler mutated selected visible DOM to:

`CHANGE_SIDE_EFFECT:USER_TYPED`

and gave the marker a green background.

The trusted click on the WebClip-shaped button triggered `change` before blur and before WebClip's click handler. Therefore a save action can commit/validate/transform application state that was not yet committed while the user was viewing the focused control.

## Block 26 — the later PDF contains the page application's blur/change generation

After trusted toolbar click, the physical PDF contains the visible state produced by the page's `change` handler. This state did not exist in the admitted focused baseline.

The core product issue is not whether firing `change` is browser-correct—it is. The issue is using a live application interaction as a supposedly neutral path to a faithful snapshot.

## Block 27 — page code can observe the extension focus target through retargeted document focus events

The fixture registered document-level capture listeners. After source focusout it observed:

`doc:focusin:webclip-pdf-extension-root`.

Because focus events crossing an open Shadow boundary are retargeted to the host, the page can observe that focus entered the predictable WebClip host, even though it cannot directly use the inner textarea/button as the ordinary event target.

This is another P0-075 control-plane boundary: UI focus is part of live page-observable state.

## Block 28 — cancelling mousedown default is a causal engineering control

A separate control added a capture-phase `mousedown.preventDefault()` to the Shadow button, while leaving the trusted pointer click and click handler otherwise intact.

After that click:

- active element remained the selected input;
- input remained focused;
- selected/BODY focus-within remained true;
- focus-only content remained displayed;
- no `change`, blur or focusout fired;
- Shadow button click still occurred.

This isolates the earlier divergence to browser focus transfer rather than click-handler business logic.

This is **not** an implementation recommendation: suppressing native focus has keyboard/accessibility/interaction consequences and cannot be adopted without a complete UI contract.

## Block 29 — the mousedown-cancel control physically retains the admitted focus representation

Physical PDF after that causal control:

- SHA-256 `a9f4dfdee343402b1acd69d269d4bedf3dde52661ce92a9820d12856531210a7`;
- 16,686 bytes;
- about **12,624 red** pixels;
- about **53,820 green** focus-only pixels;
- about **54,221 purple** focus-within pixels;
- about **29,083 yellow-family** pixels;
- 0 blue dependent-state pixels.

The raster category counts exactly match the focused baseline control for these tested regions. Chromium can print the admitted state if the capture UI does not first displace it.

## Block 30 — explicit `blur()` without WebClip reproduces the same application transition

A separate no-toolbar control focused the edited input and then called `edit.blur()`.

It produced the same semantic sequence:

- `change`;
- `blur`;
- document focusout;
- element focusout;
- focus-only content hidden;
- dependent block purple → blue;
- visible `CHANGE_SIDE_EFFECT:USER_TYPED` mutation.

This is a browser-semantic positive control: WebClip is not inventing special blur behavior; it is invoking ordinary page semantics at the wrong capture boundary for faithful snapshotting.

## Block 31 — materializing sampled focus-dependent presentation can preserve pixels/content but cannot recreate actual focus authority

A separate causal control sampled focus-dependent display/background values while the page input was focused, materialized those tested values, then allowed the trusted Shadow toolbar click to steal actual focus.

Physical PDF:

- SHA-256 `788f6c5e481524daa5a73cb6355acb837e5998f765a8139af9baddbf9d93a37f`;
- retained the focus-only green block and purple dependent block despite actual focus being in Shadow UI.

Actual `:focus` / `:focus-within` remained false.

This demonstrates representability of the tested rendered result but does not restore page application authority or arbitrary focus-dependent behavior. A real solution needs an admitted inert representation, not a scattered CSS patch list.

## Block 32 — interim classification after trusted-pointer controls

No new P-code/status transition.

Primary owners remain:

- **P0-075 ACTIVE** — ordinary trusted interaction with WebClip's live Shadow controls is page-observable before the extension click handler and can invoke page `change/blur/focusout` semantics;
- **P0-070 ACTIVE** — exact save generation must be established before the UI interaction changes source application/renderer state;
- **P0-004 ACTIVE** — physically printable selected content can disappear or take a different focus-dependent visual branch solely because the save controls take focus.

Supporting:

- **P1-187 ACTIVE** — same-origin frame secondary representation must derive from the admitted frame state, not a source already blurred by top UI;
- **P2-007 BACKLOG** — intentionally normalizing transient interaction state belongs to an explicit capture mode, not a hidden side effect.

Current page diagnostics still do not record active-element/focus lineage or page focus/change event consequences.

Blocks 17–32 are complete and interruption-safe.