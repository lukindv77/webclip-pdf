# WebClip — external product-opportunity baseline — 2026-08-30

Date: 2026-08-30

Purpose: initial durable `Product Opportunity Map` derived from the peer-product/user-intent research in `RESEARCH_EXTERNAL_USER_INTENT_BASELINE_2026-08-30.md`. This document does **not** approve implementation, change runtime, create P-codes or alter product contracts by itself. It records candidate product directions that should be periodically re-evaluated and, when mature enough, brought to the user as explicit product proposals. Explicit product decisions reached later are recorded here only as outcome/context and point to their normative policy document.

## Evaluation rule

Each item is evaluated by demonstrated user need, strength/breadth of external evidence, overlap with the WebClip mission, expected value, whether it belongs in the faithful mode or a separate mode, fidelity/provenance/security/privacy/resource-budget implications, implementation/UX complexity and peer-product trade-offs.

Discovery statuses: `OBSERVED`, `NEEDS-RESEARCH`, `CANDIDATE`, `PROPOSE-FOR-DECISION`, `REJECTED/OUT-OF-SCOPE`, `ADOPTED-BY-EXPLICIT-DECISION`.

## O1 — Explicit complete-static capture mode

Status: **CANDIDATE**

User need: preserve content beyond the currently visible viewport and materialize ordinary reachable content for later reading without pretending that the result is a literal current-view snapshot.

External signal: archival/full-page tools use bounded scrolling/fetch/materialization, while user reports across clippers repeatedly describe incomplete article/image capture.

WebClip opportunity: a separately named complete-static mode could make more aggressive disclosure/scroll/lazy materialization deliberate and researchable rather than silently changing another format/mode's semantics.

Current decision interaction: the primary PDF contract adopted on 2026-08-30 already includes **bounded static completeness**, but it does not auto-scroll the live page to create new logical infinite/virtual items beyond the user's own reached boundary. A future more aggressive complete-static/archive mode remains a separate candidate rather than being silently folded into current PDF.

## O2 — Explicit faithful current-state mode

Status: **CANDIDATE**

User need: save the admitted rendered state rather than a cleaned/expanded interpretation.

External signal: faithful snapshot tools and Reader/print-cleanup tools deliberately make different choices.

WebClip opportunity: a future pure current-state mode could preserve a stricter literal admitted-state representation when users prefer it over static completeness.

Current decision interaction: this is **not** the current primary PDF semantics. The primary PDF adopted on 2026-08-30 is a fidelity + bounded-completeness hybrid. A pure current-state mode remains a future candidate.

## O3 — Reader / simplified copy mode

Status: **CANDIDATE**

User need: retain useful article/content while intentionally removing clutter for comfortable later reading.

External signal: PrintFriendly, Evernote and Obsidian expose simplified/article/reader workflows separately from full-page capture; ArchiveBox stores both fidelity-oriented and readability-derived representations.

Recommendation: keep separate from faithful mode; any adoption requires its own explicit fidelity/transformation contract.

## O4 — Additional archival output such as self-contained HTML

Status: **CANDIDATE**

User need: retain web structure/resources and capabilities that PDF cannot represent while keeping offline durability.

External signal: SingleFile/Save Page WE/Monolith center on self-contained HTML; ArchiveBox stores multiple representations.

WebClip opportunity: the capture-first architecture can later support multiple renderers from one provenance-bound capture.

Recommendation: retain as a strong architecture-aligned future candidate; requires separate product/security/fidelity design and does not automatically inherit the PDF contract.

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

## Explicit product decision — current primary PDF fidelity, 2026-08-30

The fidelity-contract discussion resolved the immediate mode ambiguity for the current PDF. The normative authority is `WEBCLIP_PDF_FIDELITY_CONTRACT.md`.

Accepted product semantics:

- current primary PDF is deliberately a **hybrid of fidelity and bounded static completeness**;
- at minimum, already-existing content that the user can reach by ordinary page/nested scrolling belongs to the static PDF completeness envelope;
- closed spoilers/`<details>` inside selected scope are included via safe inert expansion, with source closed/open provenance where materially relevant;
- if **new logical content** is created/loaded through scrolling, the user must personally scroll to the desired boundary; WebClip does not auto-scroll the live page further to extend that logical set;
- virtualized content already within the user's reached range should not be lost merely because the current DOM recycled earlier nodes; inability to recover it truthfully is a partial/degraded/unknown condition;
- hover-only state is excluded from PDF even when the user is currently hovering it;
- responsive/resource/temporal/control/frame fidelity remains bound to admitted source generation;
- other future formats or modes receive separate explicit fidelity/completeness decisions rather than inheriting the PDF hybrid automatically.

This decision does **not** automatically adopt O1 or O2 as separate UI modes. It defines current primary PDF semantics while retaining pure current-state and more aggressive complete-static/archive behaviors as future product candidates if later user research justifies them.

## Current product-discovery conclusion

The external research correctly identified mode separation as a major product axis, but the current PDF now has an explicit contract rather than remaining ambiguous: **faithful static PDF = admitted-state fidelity + bounded static completeness under user-driven dynamic-scroll limits**.

The next product-discovery work should therefore evaluate whether users materially benefit from additional separately named modes/formats (pure current state, more aggressive archive completeness, Reader/simplified, self-contained HTML, multi-representation save) instead of altering the current PDF semantics implicitly.
