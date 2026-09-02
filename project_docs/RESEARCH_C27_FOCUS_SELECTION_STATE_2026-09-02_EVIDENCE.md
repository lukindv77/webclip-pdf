# C27 focus/selection state fresh evidence receipt — 2026-09-02

Status: **durable fresh-restart evidence receipt**. `RESEARCH_REGISTRY.md` remains the sole current P-owner/status authority.

Coordinate: **C27 — Focus / selection / interaction-induced page state**.

Canonical researched baseline:

- `main = 6fa613f24116c48a76ee45d7bf75d127884e79f5`;
- `content.js` blob `f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e`;
- Google Chrome `151.0.7922.173`.

Fresh classification:

**`L4-REVALIDATED / FINDING + POSITIVE/NATIVE/TRUSTED-CLICK/EXPLICIT-FOCUS/REFOCUS/SELECTION/FRAME/CAUSAL CONTROLS (P0-075, P0-070, P0-004; P1-187 supporting)`**

## Exact accepted physical receipt

- workflow run `33620748418`;
- job `100216951047`;
- exact workflow head `903d432f1d4f047f71b5f21e7cd11821ba2b3957`;
- conclusion **SUCCESS**;
- raw result SHA-256 `03b91d0f683b924de2ebea3a73749a2e38203a8d259cd5a3e2b3c44da230d036`.

The harness bound itself to the exact baseline and current `content.js`, the real WebClip guard prefix, current same-origin BODY flattening, `media:'screen'`, and `Page.printToPDF`. Synthetic local fixtures only were used.

## Fresh observations

1. Native Chrome kept the source input focused through physical PDF generation. `:focus`, `:focus-within`, `:focus-visible`, focus-only content, red input background and magenta outline survived; no blur mutation occurred. PDF SHA-256: `0243d7fab499ed797482fbcdaba9263ec5a82e7cebdd95e715029f00760ed892`.
2. Current WebClip's explicit review textarea focus moved focus into the extension Shadow root and caused the page-observable order `change → blur → focusout`. The fixture's blur handler inserted `C27_BLUR_MUTATION`; the PDF included it and omitted focus-only content. PDF SHA-256: `1e2a9f537d163f6cd0205136dfb9f28b3975da9fc4a240dfb4ad9956f16c43fe`.
3. A trusted pointer click on the real Shadow-DOM Finish button produced the same page blur before its click handler completed. The button became the Shadow active element, and the later PDF contained the blur mutation while focus-only content was absent. PDF SHA-256: `5c24ee64f7d0075522bf3e3e767b0cda57587fdd5e66824d10e6a84dbd33d9b9`.
4. Post-hoc `focus()` restored the red/magenta focus presentation, but could not undo the earlier blur mutation and itself triggered `C27_REFOCUS_MUTATION`. Both mutations appeared in the PDF. PDF SHA-256: `5867d9d5a85a8b48f7f1aab3071af9e6f07a88d142cdc1cb386fc32541de2be2`.
5. A focused control inside a same-origin child frame printed correctly in a native control. Current WebClip review focus blurred it; BODY flattening then cloned the already-mutated, non-focused representation. Focus-only content was absent, the blur mutation remained, and the flattened proxy did not retain the typed control value. PDF SHA-256: `c7765920db7184e5a1e2d898583b9a25145b7362d201e5b1c67c08b1893fb303`.
6. A live DOM `Selection` and its Range survived physical printing and selected text remained in the PDF, but the red `::selection` overlay had `46,558` red screenshot pixels and `0` red PDF pixels. PDF SHA-256: `d120a654bafb1690310185952cb5fff6038dbdae5b6eef708e36773729eab2f8`.
7. A test-only disconnected static receipt captured before WebClip took focus, with material focus styles and visible focus-only content materialized. Substituting it only after current preparation preserved admitted focus presentation and typed value while excluding both the later blur mutation and Exclude/outside content. PDF SHA-256: `6be1358df8fafab61a288eb21e11ed1aec643287a4617c60e7b608aab8e5cc87`.

## Root-cause decision

No new P-code is warranted.

- **P0-075 ACTIVE** is primary: page-hosted WebClip controls currently take focus and dispatch page-observable focus transitions before the renderer input is isolated.
- **P0-070 ACTIVE** owns the missing admission receipt and exact admitted-generation boundary for focus, selection, and interaction-derived mutations.
- **P0-004 ACTIVE** owns the physically incorrect selected-copy consequence.
- **P1-187 ACTIVE** is supporting for the same-origin frame representation; it is not a new C27 root.

The frame control's missing typed value is recorded as supporting parity evidence and does not reopen the separately researched ordinary form-state coordinate. The DOM Selection/`::selection` split is a renderer-materialization requirement, not a separate ownership family.

## Architecture direction

Capture an extension-owned inert/static admitted representation before any WebClip control can receive focus. Materially visible focus state must be represented without focusing the live page again. DOM Selection highlight must be explicitly materialized when the contract requires it, because retaining the Range does not make Chrome print the highlight overlay. If provenance or materialization is unavailable, report degraded/unknown instead of claiming the live post-interaction page as the admitted source.

Detailed proof and standards analysis are in `RESEARCH_FULL_RESTART_C27_FOCUS_SELECTION_STATE_2026-09-02.md`.

Runtime source, Registry wording/status, manifest/version, build/tag/Release and release readiness remain unchanged.
