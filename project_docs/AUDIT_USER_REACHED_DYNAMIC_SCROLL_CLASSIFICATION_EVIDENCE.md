# P1-230 classification/navigation evidence

This compact file is durable navigation for the C22/C23 user-reached dynamic-scroll / virtualized-history finding. Current owner/status authority remains exclusively in `AUDIT_REGISTRY.md`.

## Exact audit baseline

- audited canonical `main`: `a0e1252317dfa1a1146dbed0e5b8bfe5bb760491`;
- current PDF acceptance: `WEBCLIP_PDF_FIDELITY_CONTRACT.md`;
- coverage cells: C22 and C23 in `AUDIT_COVERAGE_RECONSTRUCTION_2026-08-30.md`.

## Current classification

**P1-230 ACTIVE** is the independent owner for the current primary PDF when logical content was actually materialized/seen through the user's own dynamic/virtualized scrolling but later disappeared from the live DOM through recycling/unmount before physical PDF generation.

The current capture/admission representation has no bounded generation-bound history from which to retain/reconstruct that user-reached logical range, and no truthful partial/degraded/unknown receipt for silent loss. The physical result can therefore collapse to the current mounted virtual window while appearing successful.

## Why this is independent

Detailed duplicate/root-cause proof is in `AUDIT_USER_REACHED_DYNAMIC_SCROLL_2026-08-30_EVIDENCE.md`. In summary, the defect remains possible independently of:

- P0-004 ordinary selected-descendant clipping/layout;
- P0-070/P0-080 exact document/application generation fencing;
- P1-003 represented-resource readiness;
- P1-167 bounded-work requirements.

P2-007 remains the broader multi-mode architecture backlog but no longer makes this current-PDF behavior semantically undecided: PR #54's explicit PDF contract admitted user-reached dynamic content up to the user's own boundary.

## Required controls already achieved

Fresh managed Chromium 144 + physical PDF evidence proves:

- negative: `printToPDF` did not auto-scroll an additive feed to create N+1;
- positive: retained additive top-level and nested user-materialized nodes survived scroll-back and printed through item 40;
- contract failure: gradual virtual traversal actually materialized/seen logical items 1…57, then returned upward, while physical PDF contained only current mounted 1…8;
- supporting identity failure: a reusable selected row changed logical identity before physical cut.

Exact physical hashes and schedules are preserved in the detailed evidence file; reproducible safe local probes are `project_tools/audit_user_reached_dynamic_scroll.py` and `project_tools/audit_user_reached_virtual_history.py`.

## Historical correction

`AUDIT_HISTORY_INDEX.md` preserves why the earlier deferred/virtualized tranche correctly left P1-230 unallocated under then-unresolved mode semantics, and why that conclusion must not be reused after the later explicit PDF product decision.

## Handoff / closure boundary

Issue #56 is the implementation handoff. This audit-only tranche does not change runtime and does not close P1-230. Future closure requires generation-bound user-boundary authority, no forbidden WebClip auto-scroll, bounded virtual-history retention/reconstruction or truthful degradation, nested/frame parity, selection identity, and fresh L3+L4 closure evidence.