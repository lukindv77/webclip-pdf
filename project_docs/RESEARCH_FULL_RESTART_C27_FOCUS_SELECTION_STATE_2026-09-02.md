# Fresh full-restart C27 research — focus, selection and interaction-induced page state

Date: 2026-09-02

Status: **accepted fresh L4 physical evidence** for C27. This is research evidence, not a release declaration. `RESEARCH_REGISTRY.md` remains the sole current P-owner/status authority.

## 1. Coordinate and contract boundary

C27 asks whether a selected PDF preserves material user focus and selection state admitted before WebClip changes the page, while excluding or accounting for state caused by WebClip's own controls.

The current fidelity contract includes material non-hover focus/selection state and renderer-owned control state. It also says that focus created by WebClip after admission is not a new source state and must not replace the user's source focus. A blinking caret need not be reproduced as animation.

This produces four distinct obligations:

1. preserve material `:focus`, `:focus-within` and applicable `:focus-visible` presentation;
2. preserve ordinary control state such as value and relevant selection offsets where applicable;
3. preserve visible user document selection when it is material;
4. prevent WebClip's own focus transitions from silently redefining the source or creating untracked page mutations.

Fresh canonical source:

- `main = 6fa613f24116c48a76ee45d7bf75d127884e79f5`;
- exact `content.js` blob `f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e`;
- manifest remains `0.9.8`; `0.9.9` remains WIP and release readiness remains NOT READY.

## 2. Fresh current-source inspection

The accepted harness fails closed unless all of these bindings hold:

- the exact baseline SHA and `content.js` blob match;
- the review path still schedules `textarea.focus()`;
- Finish is the real native Shadow-DOM button;
- its click-handler area contains no earlier `preventDefault` that would suppress trusted pointer focus;
- WebClip UI is hidden only for print;
- same-origin selected BODY still uses the current flattening helpers;
- preparation contains no active-element, document-Selection or focus-pseudo receipt;
- the service worker still selects screen media and calls `Page.printToPDF`.

Relevant behavior in the current tree:

1. The review/comment path explicitly focuses its textarea.
2. The real Finish control is a native button. A trusted pointer activation can focus it before the `click` handler runs.
3. Preparation records ordinary form state, including selection offsets, but that is not an admission receipt for which page element was focused, which ancestors matched `:focus-within`, which focus-visible presentation was material, or which DOM Range was selected.
4. Same-origin selected BODY content is flattened only after the interactive review path.
5. The renderer receives the live, already-interacted-with page through screen-media `Page.printToPDF`.

Therefore the critical boundary is earlier than `prepareForPrint`: if WebClip focuses a control first, page code can observe and mutate on blur before the current selected representation is isolated.

## 3. Fresh external research

External sources establish the platform semantics. C27 advancement rests on the exact-source physical receipt in section 4.

### 3.1 Focus selectors are renderer/user-interaction state

Selectors Level 4 defines `:focus` for an element with user-input focus, `:focus-within` for an element that has or contains the focused element, and `:focus-visible` for focus that the user agent indicates visibly. These are not ordinary attributes recoverable from a later DOM clone.

Reference: <https://www.w3.org/TR/selectors-4/>

### 3.2 Moving focus is observable page behavior

UI Events specifies the transition from an old target to a new target through blur/focusout and focus/focusin events. HTML's focus processing also makes focus updates observable and may run control change behavior. Consequently WebClip focus is not an isolated control-plane operation when its host shares the page document.

References:

- <https://www.w3.org/TR/uievents/>
- <https://html.spec.whatwg.org/multipage/interaction.html>

### 3.3 DOM Selection and highlight painting are separate layers

The Selection API models a Selection containing Range objects. CSS Pseudo-Elements defines `::selection` as a highlight overlay painted for selected content. Retaining a Range therefore does not by itself guarantee that a PDF renderer serializes the highlight overlay.

References:

- <https://www.w3.org/TR/selection-api/>
- <https://www.w3.org/TR/css-pseudo-4/>

### 3.4 Architectural implication

Focus and selection are renderer/browser state with page-observable transitions. A correct pipeline needs an admission-time representation or receipt. Re-focusing a live page later is not rollback: it emits another transition and cannot reverse mutations already caused by blur.

## 4. Exact physical experiment

Accepted execution:

- workflow run `33620748418`;
- job `100216951047`;
- exact head `903d432f1d4f047f71b5f21e7cd11821ba2b3957`;
- Google Chrome `151.0.7922.173`;
- conclusion **SUCCESS**;
- raw result SHA-256 `03b91d0f683b924de2ebea3a73749a2e38203a8d259cd5a3e2b3c44da230d036`.

The fixture contained:

- a selected scope with legitimate and Exclude content;
- an input whose focused state is red with a magenta outline;
- a selected-scope `:focus-within` presentation;
- focus-only content;
- page handlers that append one node on blur and another on a second focus;
- a fully logged focus/input/change/blur/focusout sequence;
- a same-origin child-frame variant;
- a standalone DOM Selection with red `::selection`;
- a test-only disconnected static receipt captured before WebClip focus.

### 4.1 Native renderer-positive control

Chrome kept the input as `document.activeElement` before and after printing. The input matched `:focus` and `:focus-visible`; the selected scope matched `:focus-within`; focus-only content was displayed; no blur mutation occurred.

The PDF contained focus-only content and the typed value, with `13,834` red and `4,324` magenta pixels. PDF SHA-256: `0243d7fab499ed797482fbcdaba9263ec5a82e7cebdd95e715029f00760ed892`.

This proves the renderer can physically preserve the admitted focus presentation when the page is not disturbed.

### 4.2 Explicit review-focus finding

After WebClip opened review, the extension host became the document active element and the Shadow textarea became its active descendant. The page observed:

`focus, input, change, blur, focusout`

The blur handler inserted `C27_BLUR_MUTATION`. At both beforeprint observation stages the source input was not focused and focus-only content was hidden.

The selected PDF contained the blur mutation, legitimate content and typed value, omitted focus-only content, Exclude and outside content, and had `0` red/magenta focus pixels. PDF SHA-256: `1e2a9f537d163f6cd0205136dfb9f28b3975da9fc4a240dfb4ad9956f16c43fe`.

### 4.3 Trusted real Finish control

A physical pointer click targeted the actual Shadow Finish button. Before the click the page input was focused. After the trusted activation the Shadow button was active and the page had already received `change → blur → focusout` and inserted its blur mutation.

The later selected PDF contained the blur mutation, omitted focus-only content, and had no red/magenta focus presentation. PDF SHA-256: `5c24ee64f7d0075522bf3e3e767b0cda57587fdd5e66824d10e6a84dbd33d9b9`.

This closes the gap between a programmatic review-focus hypothesis and the user's real control path: the loss occurs before the Finish click handler can establish a later capture boundary.

### 4.4 Post-hoc refocus negative control

Calling `focus()` on the source input after WebClip had blurred it restored `:focus`, `:focus-within`, focus-only content and red/magenta pixels. It did not remove the existing blur mutation. The second focus also caused the page to insert `C27_REFOCUS_MUTATION`.

The PDF included both mutations and the restored focus presentation. PDF SHA-256: `5867d9d5a85a8b48f7f1aab3071af9e6f07a88d142cdc1cb386fc32541de2be2`.

Therefore refocus is neither rollback nor a safe production fix.

### 4.5 Same-origin frame parity control

Native printing kept the child input focused and printed focus-only content with red/magenta presentation. In the WebClip path, review focus blurred the child and inserted its mutation. Current selected-BODY flattening then produced a non-focused proxy containing the blur mutation.

The final PDF omitted focus-only content, Exclude and top outside content. It retained the blur mutation but did not retain the typed input value. PDF SHA-256: `c7765920db7184e5a1e2d898583b9a25145b7362d201e5b1c67c08b1893fb303`.

The focus failure maps to the same admission/isolation root. The typed-value omission is supporting P1-187 parity evidence and is recorded without reopening the independently researched ordinary form-state coordinate.

### 4.6 DOM Selection / `::selection` split

Before and after PDF generation, `getSelection()` retained one Range and the exact selected string. The page screenshot contained `46,558` red pixels from `::selection`. The PDF contained the selected text but `0` red pixels. PDF SHA-256: `d120a654bafb1690310185952cb5fff6038dbdae5b6eef708e36773729eab2f8`.

Thus live Range survival is not visible-selection fidelity under the current renderer path.

### 4.7 Inert static causal control

Before WebClip focused its review textarea, the harness created a disconnected clone, materialized relevant computed focus styles, preserved the typed value, retained focus-only content, and removed Exclude content. The live page then underwent the normal blur mutation. Only after current preparation did the harness substitute the admitted static receipt.

The physical PDF preserved focus-only content, typed value, red/magenta focus presentation and legitimate content, while excluding the later blur mutation, Exclude and outside content. PDF SHA-256: `6be1358df8fafab61a288eb21e11ed1aec643287a4617c60e7b608aab8e5cc87`.

This is a causal architecture control, not a proposed production implementation.

## 5. Root-cause and ownership reconciliation

No new P-code is warranted.

- **P0-075 ACTIVE** is primary: current page-hosted controls perturb page focus before isolation and can cause application-visible events and mutations.
- **P0-070 ACTIVE** owns admission-to-generation integrity and the missing focus/selection/degraded receipt.
- **P0-004 ACTIVE** owns the resulting wrong selected PDF.
- **P1-187 ACTIVE** is supporting for same-origin flattening parity.

Historical focus investigations are duplicate/hypothesis input only. The accepted fresh run independently binds the conclusion to current source and current Chrome.

Fresh C27 classification:

**`L4-REVALIDATED / FINDING + POSITIVE/NATIVE/TRUSTED-CLICK/EXPLICIT-FOCUS/REFOCUS/SELECTION/FRAME/CAUSAL CONTROLS (P0-075, P0-070, P0-004; P1-187 supporting)`**

## 6. Architecture decision

The robust direction is an extension-owned inert/static renderer input admitted before any WebClip control can receive focus.

At admission, the pipeline should record or materialize:

- the materially focused source control and applicable focus pseudo presentation;
- focus-within presentation required by selected ancestors;
- ordinary control value/checked/selected/internal-scroll state;
- materially visible document Selection and highlight style;
- a generation/provenance receipt tying the renderer input to that moment.

The renderer representation must not require focusing the live source again. If the pipeline cannot prove that interaction-derived mutations were excluded or correctly admitted, the result should be degraded/unknown rather than silently claiming fidelity.

## 7. Non-actions and next coordinate

This tranche does not change runtime source, Registry wording/status, manifest/version, build/tag/GitHub Release, or release readiness.

C27 advances from `NOT-TRIAGED / UNKNOWN` to the classification above. **C28 — Responsive/environment state** is the next sequential coordinate.
