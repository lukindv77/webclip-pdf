# Durable audit evidence — post-freeze physical render cut — 2026-08-30

Canonical status and single-owner authority remain exclusively in `AUDIT_REGISTRY.md`. This file is the interruption-safe working evidence for a source-first deep-audit tranche on mutations that can occur after save admission/preparation and before or during the physical Chromium `Page.printToPDF` render.

## Interruption-safe baseline

- Fresh audited `main`: `2b2522130792d8d023b540216f9742c3f7226d2e`.
- Working branch: `audit/post-freeze-physical-render-cut-20260830`.
- Previous planning checkpoint survives in Git history as commit `45201bcc919f13b85abec8e1ec49d640e1a8dbed`.
- That earlier branch name was subsequently reused by the separately completed PR #26 privacy tranche, so this tranche intentionally moved to a new unique branch and fresh main rather than attempting to continue from the reused branch tip.
- PR #26 is audit/docs-only and does not alter the runtime source being audited here.
- `manifest.json` remains version `0.9.8`; no runtime/version/build/tag/release change is part of this checkpoint.

## Non-overlap boundary already established

Do not rediscover these as new roots:

1. PR #23: reviewed local+remote selection freeze, mutable remote state between review/meta/prepare, marker-write reentrancy, live selected-DOM pruning, pre-IPC locator bounds.
2. PR #24 / P1-229: cross-origin child print-media mismatch, screen-only selection decoration, pre-filter remote geometry.
3. PR #25: page-author `!important` cascade can override live-DOM selected-only hiding; P1-230 deliberately not allocated there.
4. PR #26: SelectionSnapshot privacy/minimization only; no runtime overlap with this tranche.

## Current source boundary

Fresh `content.js` proves:

- `downloadPdf()` constructs `meta`, enters `printing`, awaits `prepareForPrint(meta)`, then sends `WEBCLIP_GENERATE_PDF` to the worker.
- `prepareForPrint()` performs disclosure expansion, bounded resource prefetch, remote-frame prepare, header insertion, frame-chain/style mutation, link/image rewriting, frame-height stabilization and same-origin frame flattening.
- It records `meta.pageAnalysis = capturePageStructureDiagnostics('prepared')` and returns; there is no immutable DOM/render receipt or generation seal at this boundary.
- The content script registers `window` `beforeprint`/`afterprint` listeners. Its `beforeprint` handler re-measures frame heights and captures diagnostics, then hides WebClip UI; it does not freeze the host page or compare the physical render state to `meta.pageAnalysis`.

Fresh worker source proves `generatePdfBlob()` later invokes CDP `Page.printToPDF` (after setting emulated media), so the browser print event/render occurs after the content-side preparation promise has completed.

Current registry already contains strong candidate owners:

- P0-070 ACTIVE — exact full-document save generation from command admission through print/cache/download/upload/Journal finalization.
- P0-075 ACTIVE — host page is not a trusted UI/control plane; print representation should be isolated.
- P0-071 ACTIVE — safe URI schemes must hold on the actual printed representation, explicitly including hostile `beforeprint`/post-sanitization mutation.
- P0-080 ACTIVE — same-document application generation and live selected DOM are separate from browser document identity.
- P0-004 ACTIVE — selection-bounded PDF fidelity.
- P1-003 ACTIVE — actual rendered resource graph readiness.
- P1-187 ACTIVE — flattened iframe rendered-state provenance.
- P1-214/P1-229 ACTIVE — multi-frame physical preparation / cross-origin selected representation.

## Stage 1 decision

The next proof target is intentionally narrower than the already-known URI-specific P0-071 acceptance: determine whether a page-owned `beforeprint` listener can synchronously mutate already-prepared selected **text/structure/style/frame/resource state**, have those mutations enter `Page.printToPDF`, and evade any generation invalidation/restart. If yes, classify whether this is a refinement of P0-070/P0-075/P0-004 or a genuinely independent owner.

No new P-code or status transition is claimed yet.
