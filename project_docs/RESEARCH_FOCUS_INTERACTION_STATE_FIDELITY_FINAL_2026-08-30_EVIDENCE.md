# Durable research evidence — focus / interaction-state fidelity — final Blocks 49–56 — 2026-08-30

Continuation/finalization of the 56-block focus/interaction-state fidelity tranche from exact researched baseline `ff6142135cb7103ed2b9f9a2bf3dd1dadd750454`.

Canonical P-code owner/status authority remains exclusively in `RESEARCH_REGISTRY.md`. This final evidence is docs-only and changes no runtime, registry status, manifest/version/build/tag/GitHub Release state.

Blocks 1–16 established explicit Shadow textarea focus loss, physical `:focus/:focus-within` fidelity and top/same-origin blur side effects. Blocks 17–32 established that a normal trusted click on WebClip's Shadow buttons transfers focus and can fire `change/blur/focusout` **before** WebClip's click handler. Blocks 33–48 rejected a false beforeprint-host-hide hypothesis, retained `:focus-visible` precision controls and established physical CSS `:hover` state/admission semantics.

## Block 49 — re-focusing the original page element can restore tested focus pixels

A final control began with the page button focused:

- selected button background red;
- magenta focus outline;
- visible application marker `BASE`.

Admitted physical PDF:

- SHA-256 `83e317614f528ea3b467b545029f5309f17b9879335c66aa6064d6b6c4bfea7f`;
- 12,406 bytes;
- about **44,785 red** pixels;
- about **14,825 magenta** pixels;
- 0 blue pixels;
- extracted text `FOCUS_TARGET` / `BASE`.

After WebClip-shaped Shadow focus blurred the button, explicitly focusing the source button again restored `:focus` and the tested red/magenta button appearance.

Thus “focus cannot be returned” is not the finding.

## Block 50 — restoring focus does not undo the blur-generated application state

The source button's blur handler appended visible `BLUR_HANDLER_MUTATION`.

After Shadow focus:

- source button was no longer focused;
- page state text was `BASE\nBLUR_HANDLER_MUTATION`.

Calling `.focus()` on the original page button did **not** remove that mutation. The source renderer may again look focused while the application generation remains different from the admitted one.

This directly rejects post-hoc refocus as a generation rollback mechanism.

## Block 51 — re-focusing can itself invoke new page application behavior

The fixture's focus handler deliberately performed an additional visible mutation on the second focus:

`REFOCUS_HANDLER_MUTATION`.

After WebClip-shaped blur followed by attempted restoration, state became:

`BASE`
`BLUR_HANDLER_MUTATION`
`REFOCUS_HANDLER_MUTATION`

Focus restoration is itself page-observable application input. A repair cannot assume that blur → focus round-trip is semantically idempotent.

## Block 52 — physical refocused PDF has the original focus pixels but a different application document

After re-focusing, the physical PDF was:

- SHA-256 `29895a00d30cd9ff4a5a6a3c8714ff2f7f12a78a5e04d29b36788dcc2b1c467a`;
- 14,767 bytes;
- the same tested focus-region counts: about **44,785 red** and **14,825 magenta** pixels;
- plus about **17,560 green** pixels and **88,018 orange-family** pixels from application-side mutations;
- extracted text contains both `BLUR_HANDLER_MUTATION` and `REFOCUS_HANDLER_MUTATION`.

Therefore matching a local focus visual state is insufficient proof that the captured document generation equals the user's admitted generation.

## Block 53 — the acceptance boundary must precede control-plane interaction

The combined causal evidence supports one architectural requirement:

A mode claiming faithful screen-state preservation needs an immutable/inert admitted representation established **before** WebClip's live control-plane interaction steals focus or pointer-dependent state and before page handlers can transition application state.

Equivalent accepted alternatives may be possible, but must prove the same generation semantics. A sequence such as “show WebClip UI → blur page → later try to restore focus → print live page” cannot prove rollback because both directions can execute page logic.

## Block 54 — interaction-state matrix and explicit negative controls

Fresh physical positives:

- `:focus` appearance is printable;
- ancestor `:focus-within` appearance is printable;
- keyboard `:focus-visible` appearance is printable;
- CSS `:hover` appearance and hover-only mounted content are printable;
- focused same-origin child-document appearance is printable.

Fresh live-control-plane mutations:

- trusted Shadow-button focus changes page focus before click handler;
- explicit Shadow textarea focus changes page focus;
- source `change/blur/focusout` handlers can alter selected DOM;
- same-origin child blur handlers can alter selected child DOM;
- pointer movement to in-page WebClip controls can leave a hovered selected branch and hide mounted hover-only content.

Negative/rejected controls retained:

- current `Page.printToPDF` did not itself blur the tested focused page element;
- hiding a focused WebClip Shadow host with `display:none` during beforeprint did not trigger focusout in tested Chromium and focused/non-focused controls were byte-identical;
- programmatic DOM Selection remained live but tested `::selection` highlight was not serialized into PDF;
- pointer focus and keyboard focus intentionally differ for `:focus-visible`.

These controls prevent an overbroad “all transient interaction state is lost” or “all transient state must be printed” claim.

## Block 55 — diagnostics/truth contract

Exact current page diagnostics do not record an immutable interaction-state receipt. In particular they do not prove:

- source active element identity through nested document/frame ownership;
- focus modality / resulting `:focus-visible` state;
- source/ancestor `:focus-within` rendered dependency state;
- page `change/blur/focusout/focusin` transitions induced by WebClip UI;
- pointer location / selected rendered `:hover` dependency state;
- whether interaction-dependent mounted content was admitted before control-plane movement;
- whether an attempted refocus generated further page mutations.

For an explicitly interaction-normalized reading mode, omission of focus rings/hover panels may be valid. For a faithful-screen claim, the system must either prove the admitted interaction-dependent representation or report it as intentionally normalized/degraded/unknown rather than silently conflating it with the post-control-plane live page.

## Block 56 — final duplicate/owner reconciliation

No new P-code and no canonical status transition.

### Primary owners

- **P0-075 ACTIVE** — WebClip's in-page Shadow UI is not a neutral preparation workspace. Trusted focus/pointer interaction is visible to page/browser state and can synchronously run page handlers before WebClip captures.
- **P0-070 ACTIVE** — exact save authority must bind one admitted renderer/application generation before extension control-plane interaction changes that generation.
- **P0-004 ACTIVE** — focus/focus-within/focus-visible/hover state can materially change the physically saved selected pixels and even presence of mounted selected content.

### Supporting owners

- **P1-187 ACTIVE** — same-origin frame secondary representation must consume an already-admitted frame renderer state; top WebClip UI can destroy child focus state before proxy materialization.
- **P2-007 BACKLOG** — faithful-screen versus interaction-normalized/static-reading semantics must be explicit. The research does not require every transient browser overlay to be serialized; tested `::selection` is a concrete negative control.

### Duplicate decisions

- PR #15 already recorded the architectural focus-risk observation; this tranche adds exact current-source timing and fresh physical proof rather than claiming a new root.
- PR #27 remains owner evidence for arbitrary page `beforeprint` physical-cut mutation; the rejected host-hide focusout hypothesis is not reclassified under it.
- PR #35 / complex-layout / PR #41 remain authoritative for form-state clone positives/negatives and the flattened `<select>` case; this tranche does not reopen generic form cloning.
- prior selection-intent/hover-target researchs concern picker/candidate behavior, not this physical renderer interaction-state matrix.

`P1-230` remains deliberately unallocated.

## Final acceptance direction

For a mode described as “same as displayed”, capture architecture should establish the selected renderer/application representation before in-page extension controls can change focus/pointer-dependent page state. That representation must include the renderer consequences actually admitted, not necessarily raw browser interaction machinery. If a state class is intentionally normalized for later reading, the mode/receipt should say so. If the system cannot prove whether interaction-state-dependent content changed before capture, truth is degraded/unknown rather than silently faithful.

Blocks 49–56 and the complete 56-block tranche are complete and interruption-safe.