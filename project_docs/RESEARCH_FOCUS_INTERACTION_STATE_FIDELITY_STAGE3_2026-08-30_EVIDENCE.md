# Durable research evidence — focus / interaction-state fidelity — Blocks 33–48 — 2026-08-30

Continuation of the focus/interaction-state fidelity tranche from exact baseline `ff6142135cb7103ed2b9f9a2bf3dd1dadd750454`.

Canonical owner/status authority remains `RESEARCH_REGISTRY.md`. No runtime, canonical registry, manifest/version/build/tag/release changes are made by this checkpoint.

Blocks 1–32 proved current pre-capture focus transfer through WebClip's live Shadow UI and its physical/application consequences. Blocks 33–48 test a later `beforeprint` focus hypothesis, keyboard `:focus-visible`, and pointer `:hover` state with explicit negative controls.

## Block 33 — exact current `beforeprint` sequence records diagnostics before hiding WebClip UI

Current `hideWebClipUiForPrintRender()` performs, in order:

1. selected-frame height stabilization;
2. `capturePageStructureDiagnostics('beforeprint')`;
3. if the WebClip host is connected/not already hidden, stores prior display;
4. `state.host.style.display = 'none'`;
5. sets `printUiHidden = true`.

Because the save dialog normally owns focus by this point, a plausible hypothesis was that hiding the focused Shadow host might synchronously blur it after the before-print diagnostic receipt but before physical layout.

That hypothesis was tested rather than assumed.

## Block 34 — hiding the focused Shadow host with `display:none` did **not** fire focusout in tested Chromium

A WebClip-shaped host under `<html>` contained a focused Shadow textarea. A `beforeprint` handler captured a diagnostic snapshot and then set the host to `display:none`.

Observed through the full print lifecycle:

- no document `focusout` event fired;
- top `document.activeElement` remained the Shadow host;
- Shadow active element remained the textarea when inspected again after the host was restored;
- a page focusout mutation trap did not fire.

Therefore this tranche rejects the proposed “beforeprint host hide itself causes focusout mutation” finding for the tested Chromium generation.

## Block 35 — focused-host hide and non-focused-host hide produced byte-identical PDFs

Focused Shadow host control:

- PDF SHA-256 `fe7e3a12a7bf1151dd6892af25515e463e9f32787895e1172f5476e9d6a75667`;
- 7,100 bytes;
- extracted text `ADMITTED_BEFORE_HIDE`;
- about 84,984 blue pixels, 0 red mutation pixels.

Non-focused Shadow host control produced the **same SHA-256 and byte size**, with the same text/raster category counts.

This is a strong negative control: current `display:none` print hiding should not be classified as a focusout bug from this evidence.

## Block 36 — a second print on the same focused-host fixture remained identical

Printing the first fixture again without refocusing produced the same PDF SHA-256 `fe7e3a...` and same physical state. No latent focusout mutation appeared on retry.

This rejects a retry-only variant of the same hypothesis in the controlled environment.

## Block 37 — diagnostics ordering remains relevant generally, but not via this rejected mechanism

Prior PR #27 already proves page `beforeprint` mutation can occur after earlier diagnostics and enter physical bytes. Blocks 33–36 do **not** add a new focus-specific instance.

The correct durable conclusion is narrower:

- current focus loss happens earlier through trusted WebClip UI interaction / explicit textarea focus (Blocks 1–32);
- `beforeprint` host hiding did not provide an additional focus-loss mechanism in the tested browser.

## Block 38 — keyboard `:focus-visible` is physically printable under forced-screen PDF

A native page button was reached with keyboard `Tab`, producing:

- active element = button `b`;
- `:focus = true`;
- `:focus-visible = true`;
- green focus-visible background;
- orange focus border;
- purple outline.

Physical PDF:

- SHA-256 `f0ce67ea9d8c4a3083f727e48985b59707fd7fc3cf25ff1ca43e637ad5c40a83`;
- 7,827 bytes;
- about **59,320 green** pixels;
- about **16,250 orange** pixels;
- about **21,150 purple** pixels;
- 0 blue normal-state pixels.

The browser can serialize this tested keyboard focus-visible presentation.

## Block 39 — pointer focus is a precision control distinct from `:focus-visible`

The same button focused by a trusted pointer click reported:

- `:focus = true`;
- `:focus-visible = false`;
- normal blue background;
- focus border still present.

Do not equate `:focus` and `:focus-visible` when defining an admitted renderer state. Input modality is part of the browser's interaction-state computation.

## Block 40 — a faithful-screen contract must capture the rendered result, not infer pseudo-state from one boolean

Blocks 38–39 show that storing only “active element id” would not fully reconstruct tested focus presentation. Browser heuristics distinguish pointer and keyboard focus for `:focus-visible`; ancestor selectors and application events add further dimensions.

A future representation should preserve/materialize the admitted rendered result or carry sufficient immutable interaction-state provenance, rather than trying to recreate all browser heuristics later in another document.

## Block 41 — CSS `:hover` is physically serialized by the tested forced-screen PDF path

A selected target had:

- normal background blue;
- `:hover` background red;
- a nested `HOVER_ONLY_CONTENT` panel with default `display:none` and `display:block` under target hover.

With the pointer positioned over the selected target immediately before physical print:

- `target.matches(':hover') = true`;
- target background = red;
- hover-only panel = block.

Physical PDF preserved that current hover branch.

## Block 42 — physical hovered PDF contains both changed pixels and hover-only text

Hovered physical PDF:

- SHA-256 `2552dc73462339ce1192f1bb99877dfa698f7f05c5f18a3f252fc07ed01b29f7`;
- 8,215 bytes;
- extracted text contains both `HOVER_TARGET` and `HOVER_ONLY_CONTENT`;
- about **85,874 red** target pixels;
- about **35,563 green** hover-only panel pixels;
- 0 blue normal-state target pixels.

Chromium PDF is therefore capable of preserving the tested hover-dependent content if that is the admitted interaction state.

## Block 43 — moving the pointer to a WebClip-like toolbar changes the page before any PDF call

The same live page then moved the pointer from the selected target to a fixed top-right WebClip-like toolbar.

After that ordinary pointer move:

- selected target `:hover` became false;
- toolbar `:hover` became true;
- selected target background red → blue;
- hover-only panel `display:block` → `none`.

This is expected browser behavior, but it establishes an admission-policy boundary: the in-page save UI itself changes pointer-dependent renderer state before capture.

## Block 44 — physical PDF after pointer moves to toolbar loses the hover-only selected content

Physical PDF after moving the pointer to the toolbar:

- SHA-256 `985aa4865f496b47ee7613bb30c4af73b8cbdee1fa21cd1bd760e8c9a21cce68`;
- 7,775 bytes;
- extracted text contains `HOVER_TARGET` but **not** `HOVER_ONLY_CONTENT`;
- 0 red hover-target pixels;
- about **123,534 blue** normal-state target pixels;
- 0 green hover-only panel pixels.

The same DOM can therefore yield materially different saved content solely from where the pointer is when capture occurs.

## Block 45 — hover differs from focus in admission semantics and is not automatically a defect

Unlike focus, which can remain on a page control until WebClip takes it, clicking an in-page toolbar normally requires the pointer to leave the previously hovered target. Therefore a faithful-capture product must explicitly define the authoritative interaction-state moment.

Possible legitimate semantics include, for example:

- freeze the renderer state associated with the user's selected content before control-plane interaction;
- intentionally normalize transient hover state for a reading copy;
- capture the current state at final save admission.

The research does not choose product policy here. It requires that the mode be explicit and deterministic rather than accidentally dependent on toolbar pointer placement.

## Block 46 — hover-only content completeness can differ even though all DOM is already mounted

`HOVER_ONLY_CONTENT` existed in the DOM in both controls. No lazy loading, virtualization or resource delay was involved.

Its presence/absence in PDF was controlled solely by the CSS hover branch. Therefore this is not P1-003 deferred materialization; it is renderer interaction-state/admission semantics under P0-004/P0-070/P2-007.

## Block 47 — duplicate sweep found no dedicated renderer `:hover` tranche

Fresh PR/history search for `hover`, `focus-visible`, `focusout`, `beforeprint`, `activeElement` found no dedicated prior renderer-interaction-state tranche. Existing selection researchs discuss hover targets/outlines and pointer admission, while viewport evidence uses `hover`/`pointer` **media features** as environment controls; neither owns physical CSS `:hover` preservation policy.

No new P-code is nevertheless justified: current P0-004/P0-070/P0-075/P2-007 decomposition already covers selected visual fidelity, exact save generation, live host interaction and explicit capture modes.

## Block 48 — Stage-3 owner reconciliation

No new P-code/status transition.

Primary for focus path:

- **P0-075 ACTIVE** — WebClip live UI takes focus and page can observe/react;
- **P0-070 ACTIVE** — interaction-state generation needs one explicit admission boundary;
- **P0-004 ACTIVE** — focus/focus-visible/hover branches can change physically saved selected pixels/content.

Supporting:

- **P1-187 ACTIVE** for frame secondary representation consuming admitted state;
- **P2-007 BACKLOG** for explicit faithful-screen vs interaction-normalized reading semantics.

Current diagnostics contain no active-element, focus-visible, pointer position, hovered rendered dependency or interaction-state generation receipt. The absence is especially relevant if a mode later claims faithful-screen preservation.

Blocks 33–48 are complete and interruption-safe.