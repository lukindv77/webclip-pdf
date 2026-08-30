# Durable audit evidence — focus / interaction-state fidelity — Blocks 1–16 — 2026-08-30

Canonical P-code owner/status authority remains exclusively in `AUDIT_REGISTRY.md`. This is an interruption-safe fresh-source checkpoint focused on whether WebClip preserves the visual/application state that depends on focus when the user proceeds from a selected page into the save UI and physical PDF generation.

Exact fresh audited baseline: `main = ff6142135cb7103ed2b9f9a2bf3dd1dadd750454`.

Working branch: `audit/focus-interaction-state-fidelity-2026-08-30`.

Managed Chromium 144/CDP probes are deterministic engineering evidence only; real unpacked Chrome remains release QA. No runtime source, registry status, manifest/version/build/tag/release state is changed by this checkpoint.

## Duplicate/root-cause boundary before admission

This tranche does **not** claim that runtime form state is generically lost:

- PR #35 already proved direct top-document input/textarea/select/contenteditable current state is physically printable, while flattened runtime-selected `<select>` state can revert;
- the earlier complex-layout frame audit already owns the flattened `<select>` case under **P1-187** and retained range/progress as positive controls;
- PR #41 explicitly rejected a broad clone-loss claim for checkbox checked/indeterminate, detached radio checked, range/progress/meter, ordinary details-open, selected file-input and tested `:user-invalid` in the current Chromium generation;
- PR #27 already owns arbitrary post-preparation `beforeprint` mutation at the final physical cut;
- the format-neutral architecture evidence from PR #15 already noted the narrower architectural risk that focusing WebClip's Shadow textarea can destroy page `:focus` state before capture.

The fresh surface here is exact current-source + physical-PDF proof of that **pre-capture WebClip-owned focus transfer**, including `:focus-within`, page blur/focusout side effects and same-origin child focus.

No new P-code is admitted in Blocks 1–16. Current owners are sufficient: **P0-075 / P0-070 / P0-004** primary, with **P1-187 / P2-007** supporting where secondary frame representation or explicit capture-mode semantics are relevant. `P1-230` remains deliberately unallocated.

## Block 1 — exact current save UI explicitly moves focus before `prepareForPrint()`

At exact `content.js` baseline, `showFileCommentDialog()` creates the WebClip comment `<textarea>` inside the extension-owned open ShadowRoot and, after showing the modal, executes:

`setTimeout(() => textarea.focus(), 0);`

The user only invokes `downloadPdf()` / `sendPdfToYandex()` later by pressing the modal action button; those paths call `prepareForPrint(meta)` after the dialog has already been shown and its textarea has had an event-loop turn to receive focus.

Therefore the current capture sequence does not merely *observe* page focus. WebClip itself intentionally changes focus before capture preparation begins.

## Block 2 — focus is renderer-visible state, not only keyboard-navigation metadata

Fresh fixture at 1200×800 CSS px, DSF 1 used a selected section containing a button with:

- normal button background blue;
- `button:focus` background red + magenta outline;
- selected container normal gray;
- `#selected:focus-within` pale-yellow background / orange border.

Before any WebClip-like UI focus transfer:

- `document.activeElement.id = focusbtn`;
- `focusbtn.matches(':focus') = true`;
- selected container `:focus-within = true`;
- computed button background = `rgb(230, 30, 30)`;
- computed selected background = `rgb(255, 245, 190)`.

This is visible page state the user can plausibly be looking at when choosing to save.

## Block 3 — direct forced-screen PDF physically preserves the focused visual state

Using the current worker-shaped physical path (`Emulation.setEmulatedMedia({media:'screen'})` + `Page.printToPDF`, A4/12mm, backgrounds enabled), the focused fixture produced:

- PDF SHA-256 `b70aea8830c770da13ba0abd1ea0ba2fc924be0e90df4f2de9b6a399134cd0e5`;
- 12,639 bytes;
- raster: about **49,002 red** pixels;
- about **18,540 magenta** pixels from the focus outline;
- about **20,100 yellow/orange-family** pixels from the focused container state;
- 0 blue pixels in the button region class.

Chromium PDF can therefore preserve the tested current focus-dependent appearance when WebClip does not disturb focus first.

## Block 4 — `Page.printToPDF` itself did not blur the focused element in this control

Immediately after the physical print completed:

- `document.activeElement.id` remained `focusbtn`;
- `:focus` remained true;
- container `:focus-within` remained true;
- the fixture event log still contained only the original `focus` event.

So the tested loss below is not an intrinsic `printToPDF` requirement. It is introduced earlier by focus transfer.

## Block 5 — WebClip-shaped Shadow textarea focus removes page `:focus`

The fixture then created a top-document host with an open ShadowRoot and focused a textarea inside it, matching the relevant current WebClip control-plane shape.

After that focus call:

- top `document.activeElement` became the Shadow host;
- the ShadowRoot active element became `TEXTAREA`;
- source button `:focus` became false;
- selected container `:focus-within` became false;
- button background changed red → blue;
- selected container background changed pale yellow → gray.

This is an extension-owned mutation of the page's renderer/application input before capture.

## Block 6 — the same focus transfer synchronously triggers page `blur` / `focusout`

The selected button had deterministic `blur` and `focusout` listeners.

Focusing the Shadow textarea produced event order:

`focus → blur → focusout`.

The blur handler changed visible selected DOM text from `BASE_STATE` to `BLUR_SIDE_EFFECT` and its background to green.

Thus restoring focus later would not necessarily restore the admitted page generation: page code can make irreversible application mutations in response to WebClip's focus transfer.

## Block 7 — physical PDF after WebClip-like focus transfer saves the changed visual/application state

The same fixture printed after Shadow textarea focus produced:

- PDF SHA-256 `15a1fd5cc0676760b982e8cad7bdfc9d71bb8ece595b59b417281fa326416d5a`;
- 20,585 bytes;
- **0 red** pixels;
- about **49,089 blue** pixels;
- 0 magenta focus-outline pixels;
- about **48,598 green** pixels from the blur side effect.

The physical saved copy therefore contains both the lost focus appearance and page-script state created by WebClip's own UI focus action.

## Block 8 — `:focus-within` expands the impact beyond the focused node itself

The focused descendant originally made its selected ancestor match `:focus-within`, altering ancestor background/border. After WebClip-like focus transfer, the ancestor stopped matching.

A faithful-screen acceptance cannot model focus only as a property of the exact active element: renderer dependencies can propagate through ancestor `:focus-within` selectors and further stylesheet rules.

## Block 9 — sampled visual materialization is a causal control, not a repair prescription

Before moving focus, a separate control sampled the already-computed button/container focus-dependent colors and materialized those values as important inline state. It then performed the same Shadow textarea focus.

Although actual `:focus` / `:focus-within` became false and the page blur handler still ran, the physical PDF retained the sampled red/yellow focus-dependent appearance:

- PDF SHA-256 `4272655ddde7bbe940f93dd303558488bbe86cee3a0d79b775e29d0ad52d8d04`;
- about **49,002 red** pixels;
- about **20,100 yellow/orange-family** pixels;
- 0 blue pixels.

The blur-created green content still remained (~48,598 green pixels), proving two distinct requirements:

1. preserve the admitted rendered presentation;
2. avoid triggering page application transitions while taking the snapshot.

Copying a few colors is only an isolation control, not a complete implementation proposal.

## Block 10 — same-origin iframe focus is also physically printable before WebClip takes focus

A second fixture placed a focus-styled button in a same-origin/srcdoc iframe. Before top UI focus transfer:

- child active element = button `b`;
- child `:focus = true`;
- child container `:focus-within = true`;
- button background = red;
- container background = pale yellow.

The physical parent PDF contained:

- SHA-256 `86f1c565fc1ae71f90dd4550e44cfc014df5d91a72166b65df92017e085e4e80`;
- 11,824 bytes;
- about **39,309 red** pixels;
- about **13,750 magenta** focus-outline pixels;
- 0 blue pixels.

Direct Chromium can therefore preserve tested child-document focus appearance too.

## Block 11 — top-document focus authority points at the iframe while the child owns the focused descendant

Before WebClip-like focus transfer, the top document reported:

- `document.activeElement.tagName = IFRAME`;
- active element id = `f`.

The actual focused descendant and focus-dependent renderer state live in the child document. A future capture receipt must therefore represent focus ownership across document/frame boundaries rather than storing only top `document.activeElement`.

## Block 12 — focusing the top Shadow textarea blurs the child focused element

After the WebClip-shaped top Shadow textarea received focus:

- child button `:focus` became false;
- child container `:focus-within` became false;
- child button background changed red → blue;
- child container background changed pale yellow → gray;
- child active element returned to BODY/no focused id.

The child logged a `blur` event.

This is a clean same-origin reproduction of top UI focus destroying selected child renderer state before frame preparation/flattening.

## Block 13 — child blur handler can irreversibly mutate selected iframe content

The child button's blur handler changed visible child text `FRAME_BASE` → `FRAME_BLUR_MUTATION` and colored the marker green.

This mutation persisted after the focus transition. It is the iframe counterpart of Block 6 and reinforces **P0-075**: an extension UI hosted in the live page is not a neutral preparation workspace when ordinary browser focus semantics reach page code.

## Block 14 — physical iframe PDF after top Shadow focus contains the new generation

The physical parent PDF after the top Shadow textarea took focus produced:

- SHA-256 `82e32faaff72b02da6c98ce1b6cdbf138933e4897cb86f1447a8abf5a45fb966`;
- 13,868 bytes;
- **0 red** pixels;
- about **39,334 blue** pixels;
- 0 magenta pixels;
- about **26,441 green** pixels from the child blur mutation.

The saved artifact is therefore a different child renderer/application generation from the one admitted before the WebClip dialog took focus.

## Block 15 — DOM text selection survives, but tested `::selection` highlight is not a physical PDF feature

A separate negative control created a live Selection Range over `SELECTION_HIGHLIGHT_TEST_ABCDEFG` with `::selection { background:red; color:white }`.

Before/after print the Selection still contained the full text and one range. Yet the forced-screen physical PDF:

- SHA-256 `e71af65bc56d1c9dbab1a0eaaaff4886ffc54630d0b0c25531766260f94732e6`;
- 7,352 bytes;
- contained **0 red selection-highlight pixels** in the raster.

Do not generalize the focus finding into a claim that every transient browser interaction overlay belongs in PDF. The tested browser does not serialize the Selection highlight itself even while the DOM Selection remains live.

This also matters for terminology: the user's WebClip **selected content regions** and the browser's text Selection API are separate concepts.

## Block 16 — current diagnostics do not receipt focus ownership or focus-induced application drift

Exact current `capturePageStructureDiagnostics()` records document/layout/selection/frame measurements and style snapshots, but current source contains no `activeElement`/focus receipt. It therefore cannot prove:

- what element/document owned focus when the user entered save review;
- whether WebClip's textarea focus changed `:focus` / `:focus-within` presentation;
- whether `blur` / `focusout` page handlers mutated selected content;
- whether a child-frame focus generation was destroyed before flattening/print.

### Interim owner classification

No new permanent P-code/status transition.

Primary refinements:

- **P0-075 ACTIVE** — WebClip-hosted UI/preparation on the live page is page-observable through browser focus and page event handlers; focus transfer can mutate the source generation before capture;
- **P0-070 ACTIVE** — exact saved generation must be the user-admitted renderer/document generation, not a later generation created by extension UI focus;
- **P0-004 ACTIVE** — tested focus/focus-within appearance is physically printable, so silently saving normal/blurred styling is a selected-copy fidelity difference.

Supporting:

- **P1-187 ACTIVE** — same-origin selected-frame secondary representation must consume an already-admitted frame renderer state rather than rely on a child whose focus generation was changed by top UI beforehand;
- **P2-007 BACKLOG** — if a future reading-oriented mode intentionally omits transient focus presentation, that must be an explicit representation policy rather than an accidental side effect of the save UI.

Acceptance direction: faithful-screen capture needs one isolated admitted renderer/application generation **before** extension UI can steal focus, or a truthful degraded/unknown result when such state cannot be represented. Simply returning focus after the dialog is insufficient because blur/focusout handlers can already have mutated page state.

Blocks 1–16 are complete and interruption-safe.