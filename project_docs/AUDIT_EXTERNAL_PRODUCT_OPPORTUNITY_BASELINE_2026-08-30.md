# WebClip — external product-opportunity baseline — 2026-08-30

Date: 2026-08-30

Purpose: initial durable `Product Opportunity Map` derived from the peer-product/user-intent research in `AUDIT_EXTERNAL_USER_INTENT_BASELINE_2026-08-30.md`. This document does **not** approve implementation, change runtime, create P-codes or alter the current fidelity contract. It records candidate product directions that should be periodically re-evaluated and, when mature enough, brought to the user as explicit product proposals.

## Evaluation rule

Each item is evaluated by demonstrated user need, strength/breadth of external evidence, overlap with the WebClip mission, expected value, whether it belongs in the faithful mode or a separate mode, fidelity/provenance/security/privacy/resource-budget implications, implementation/UX complexity and peer-product trade-offs.

Discovery statuses: `OBSERVED`, `NEEDS-RESEARCH`, `CANDIDATE`, `PROPOSE-FOR-DECISION`, `REJECTED/OUT-OF-SCOPE`, `ADOPTED-BY-EXPLICIT-DECISION`.

## O1 — Explicit complete-static capture mode

Status: **CANDIDATE**

User need: preserve content beyond the currently visible viewport and materialize ordinary reachable content for later reading without pretending that the result is a literal current-view snapshot.

External signal: archival/full-page tools use bounded scrolling/fetch/materialization, while user reports across clippers repeatedly describe incomplete article/image capture.

WebClip opportunity: a separately named complete-static mode could make disclosure/scroll/lazy materialization deliberate and auditable rather than silently changing faithful-copy semantics.

Recommendation: carry into the fidelity-contract discussion; do not silently change the current mode.

## O2 — Explicit faithful current-state mode

Status: **CANDIDATE**

User need: save the admitted rendered state rather than a cleaned/expanded interpretation.

External signal: faithful snapshot tools and Reader/print-cleanup tools deliberately make different choices.

WebClip opportunity: explicitly naming this contract would reduce ambiguity around closed disclosures, temporal/focus/responsive state and selected scope if multiple modes emerge.

Recommendation: define this reference contract before adding transformations.

## O3 — Reader / simplified copy mode

Status: **CANDIDATE**

User need: retain useful article/content while intentionally removing clutter for comfortable later reading.

External signal: PrintFriendly, Evernote and Obsidian expose simplified/article/reader workflows separately from full-page capture; ArchiveBox stores both fidelity-oriented and readability-derived representations.

Recommendation: keep separate from faithful mode; revisit after the faithful fidelity contract is settled.

## O4 — Additional archival output such as self-contained HTML

Status: **CANDIDATE**

User need: retain web structure/resources and capabilities that PDF cannot represent while keeping offline durability.

External signal: SingleFile/Save Page WE/Monolith center on self-contained HTML; ArchiveBox stores multiple representations.

WebClip opportunity: the capture-first architecture can later support multiple renderers from one provenance-bound capture.

Recommendation: retain as a strong architecture-aligned future candidate; requires separate product/security design.

## O5 — Multi-representation save

Status: **NEEDS-RESEARCH**

User need: one representation may be best for reading, another for fidelity/research/recovery.

Opportunity: optionally produce multiple outputs from one admitted capture instead of recapturing the live page.

Trade-offs: storage growth, artifact identity, destination semantics, Journal UX and recovery.

## O6 — Annotation/highlight workflow beyond Include/Exclude

Status: **NEEDS-RESEARCH**

User need: mark important passages/images/notes while preserving source context.

External signal: peer tools expose highlighting/annotation/edit-before-save workflows.

Trade-offs: whether annotations alter the faithful artifact or exist as overlays/metadata, locator durability and portability.

## O7 — Batch / multi-tab capture

Status: **OBSERVED**

User need: save several related pages efficiently.

External signal: multi-tab and bulk page capture are recurring adjacent workflows.

Recommendation: keep visible in product discovery but below single-page fidelity until stronger WebClip-specific demand is established.

## O8 — Scheduled / automatic capture

Status: **OBSERVED**

User need: repeatedly capture changing pages without manual initiation.

External signal: auto-save and scheduled archival products demonstrate adjacent demand.

Recommendation: treat as a distinct future workflow because it changes selection authority, background-permission and privacy semantics.

## Current product-discovery conclusion

The strongest immediate external-product insight is not a specific copied feature but a **mode separation**: faithful current-state capture, deliberate complete-static materialization and Reader/simplified transformation represent different user jobs and should not be silently collapsed into one contract.

This conclusion is an input to the next product decision: defining the fidelity contract of WebClip's current primary mode.
