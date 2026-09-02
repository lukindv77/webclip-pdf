# C26 hover-exclusion fresh evidence receipt — 2026-09-02

Status: **durable fresh-restart evidence receipt**. `RESEARCH_REGISTRY.md` remains the sole current P-owner/status authority.

Coordinate: **C26 — Hover exclusion**.

Canonical researched baseline:

- `main = c5834ba0eb75fbf0ac1c637f42d7da1bff24b429`;
- `content.js` blob `f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e`;
- Google Chrome `151.0.7922.173`.

Fresh classification:

**`L4-REVALIDATED / FINDING + POSITIVE/NATIVE/PAGE-CLEANED/FRAME/CAUSAL CONTROLS (P0-075, P0-070, P0-004)`**

## Exact accepted physical receipt

- workflow run `33618234004`;
- job `100208967903`;
- exact workflow head `be799886020c68e8984958d4843bf0709c56159e`;
- conclusion **SUCCESS**;
- raw result SHA-256 `a487b7773a8741ae530b45b15acfc92b7d54142cffb6d1db605c0a3b74435f62`.

The runner used the exact repository guard prefix and current `content.js`; the harness also bound itself to current `service-worker.js` screen-media `Page.printToPDF` behavior. Synthetic local fixtures only were used.

## Fresh observations

1. Native Chromium physically serialized an actively hovered selected-shape target: CSS hover-only child, `::after` hover content, page-JS hover-mounted node and red hover styling all appeared in the PDF (`21,975` red pixels; PDF SHA-256 `1eaab03b562ac002ca027d7fada0adb7ef307ac8027751357120ea91540e87ef`). This proves the renderer can preserve current hover state; omission is not automatic.
2. Current WebClip's full-screen review backdrop changed the hit-test target and produced page-observable `pointerleave`. Ordinary CSS `:hover` and pseudo-content cleared, and the physical PDF had `0` red pixels. A page-JS node created on `pointerenter` but deliberately left mounted after `pointerleave` survived current preparation and appeared in the selected PDF (PDF SHA-256 `a940bf1bd2d1cabfdc59c504c4f6f29535b93552b5d1925686b61e6d72258ea9`). The independent non-hover dialog remained present; Exclude and outside shell remained absent.
3. `beforeprint` observations both before and after the product's own UI-hide listener kept CSS hover false while the sticky JS node remained. The finding is therefore not a late re-hover artifact caused by hiding WebClip UI for the print render.
4. Page-owned cleanup control removed the same JS flyout on `pointerleave`; the flyout stayed absent from the PDF while legitimate pre-existing content and the non-hover dialog stayed present (PDF SHA-256 `c98d0a7c8c8a6f25fed41bf8f3a0e61c203a678c98e3eed33069e3335db1a12f`).
5. Same-origin selected BODY flattening repeated the boundary: source CSS/pseudo hover cleared, but the sticky JS node was cloned into the final non-hover proxy and appeared in the PDF. Exclude and the top-document outside shell remained absent (PDF SHA-256 `cb121c1e3207e3460aae4f14914d8ecf9e147896770ecc31062c444784f03b88`).
6. A test-only private provenance observer marked the one DOM node created while hover was active. Removing exactly that marked node from the already-prepared final representation excluded the hover-only JS token while preserving legitimate pre-existing content, the non-hover dialog, selection boundary and Exclude semantics (PDF SHA-256 `6ad19773ab37f3162317f3cef27364da0da81cf9f7740281089caabf6611c2bd`). This is a causal control, not a production algorithm.

## Root-cause decision

No new P-code is warranted.

- **P0-075 ACTIVE** is primary: WebClip's page-hosted review/control UI currently changes page pointer state, and the product has no isolated admitted representation that can distinguish resulting page-owned hover DOM from legitimate selected DOM.
- **P0-070 ACTIVE** owns the exact admission-to-render generation boundary and the missing hover provenance/degraded receipt.
- **P0-004 ACTIVE** owns the physically wrong selected-copy consequence when hover-only DOM reaches the PDF.

The old candidate `P1-231` remains intentionally unallocated. Ordinary CSS/pseudo hover clears in the current WebClip shape; the independent remaining defect is already covered by the existing isolated-representation/generation/fidelity owners above. Same-origin flattening is a parity control, not a new P1-187 root.

## Architecture direction

The renderer input must be an extension-owned inert/static representation admitted before WebClip review UI changes pointer hit-testing. Hover-derived mutations must be attributable at admission or conservatively reported as degraded/unknown when they cannot be separated from legitimate content. Moving the pointer with CDP/browser automation is not a trusted cleanup operation because it dispatches page-observable input and cannot undo already-mounted JS DOM.

Detailed proof and standards/comparable-source analysis are in `RESEARCH_FULL_RESTART_C26_HOVER_EXCLUSION_2026-09-02.md`.

Runtime source, Registry wording/status, manifest/version, build/tag/Release and release readiness remain unchanged.
