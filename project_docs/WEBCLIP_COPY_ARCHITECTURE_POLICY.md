# WebClip copy architecture policy

This document is a permanent product/architecture requirement. It does **not** define current P-code status; `AUDIT_REGISTRY.md` remains the sole status/owner authority.

## Core rule: page copy is format-neutral

The primary WebClip product object is a **captured copy of an explicitly identified page/document state and user-selected scope**, not a PDF file.

PDF is the first/current output format, but it is only one serialization/rendering of a captured copy. Future outputs may include HTML and other archival/reading formats. Long-term architecture must therefore avoid making PDF-specific live-DOM mutations, pagination assumptions, cache keys or renderer details the canonical definition of a WebClip copy.

The intended direction is:

**selection intent + source/document/frame generation + admitted visible/interactable state -> format-neutral captured representation/provenance -> one or more format-specific renderers/serializers**.

A format-specific renderer may lose capabilities that its format cannot represent, but it must do so predictably and under an explicit mode/policy rather than silently redefining what was captured.

Existing P2-007 is the natural backlog/navigation owner for multiple capture/output modes; this policy does not create a second P2 owner or change P2-007's current status.

## Fidelity contract shared by future formats

Every saved format must remain bound to the same admitted source/document/frame generation and user selection unless the user explicitly chooses a different capture mode.

Shared capture/provenance must be capable of expressing, where technically obtainable and permitted:

- exact selected scope and selection order;
- document/frame identity and generation;
- viewport/layout context relevant to what the user actually saw;
- current renderer-owned state that is not reliably represented by HTML attributes alone;
- visible dynamic state and an explicit capture timestamp/generation boundary;
- resources required for a self-contained or truthfully degraded copy;
- iframe/shadow boundaries and permission/availability truth;
- links and other representable navigation semantics;
- completeness/degradation diagnostics rather than silent omission.

A future HTML/archive renderer may preserve more interactive semantics than PDF. A Reader/simplified renderer may intentionally transform layout. Those are separate output/mode contracts, not evidence that the original capture was inaccurate.

## PDF remains a strict first-class fidelity contract

Although PDF is not the universal copy model, PDF saving must remain predictable and high fidelity.

For the faithful PDF mode, WebClip should preserve a static representation of the page/selected area **as it was actually presented to the user at the admitted capture state**, including material visual state that the user could perceive through normal interaction with the page. The PDF pipeline must not silently substitute a different responsive variant, page generation, resource state or unrelated layout simply because Chromium pagination uses different geometry.

At minimum PDF fidelity auditing must cover:

- desktop/mobile/orientation/container-query and viewport-unit state;
- zoom/transforms/frame geometry;
- colors/backgrounds/fonts/SVG/canvas/images;
- current form/control and other renderer-owned visible state where relevant;
- open/closed/top-layer state where it is part of the admitted presentation;
- clipping/overflow/fixed/sticky/long-content completeness;
- clickable links where PDF can safely represent them;
- temporal state such as animations/transitions and page mutations: output must be bound to a defined admitted state rather than arbitrary render timing;
- inability of WebClip's own dialogs/focus/preparation mutations to silently change the page state that is later claimed as the user's captured view.

`media: screen` is not by itself proof of visual fidelity: layout-dependent screen media/container/viewport rules can still be reevaluated against print geometry.

## Interactive content and static formats

“User can interact with it on the site” does not mean a static PDF must execute the site's JavaScript or preserve dangerous active behavior. It means the capture model must understand that the visible state may depend on interaction and must apply an explicit policy.

Examples:

- A closed disclosure that can be expanded on the live site should not be silently expanded in a faithful-current-view PDF merely to expose more text. An explicitly named expanded/reader mode may materialize revealable content in an inert representation.
- Focus/hover/target/top-layer/control state that materially changes what the user sees must be captured at a defined admission point or explicitly documented as outside a selected mode's fidelity envelope.
- Future interactive/offline HTML-like formats may preserve safe interaction semantics that PDF cannot; they must still remain inert with respect to privileged WebClip authority and must not become a vehicle for replaying untrusted page actions with extension privileges.

## Capture first, render second

Long-term architecture should investigate browser snapshot primitives and established web-archiving approaches, but none is accepted merely by availability.

Candidate inputs include Chromium `DOMSnapshot.captureSnapshot`, `Page.captureSnapshot`/MHTML, renderer-state extraction, resource materialization, and browser-based WARC/WACZ-style recording. Each candidate must be evaluated for:

- fidelity to current DOM + renderer state;
- canvas/video/form/shadow/iframe handling;
- responsive/layout geometry;
- resource completeness and offline durability;
- size/node/byte/time budgets;
- privacy and safe-URI behavior;
- hostile-page isolation/inertness;
- deterministic provenance and generation fencing;
- suitability for multiple output renderers.

No single browser API is assumed to be a complete canonical snapshot. The project should compose the minimum trustworthy captured representation needed by accepted output modes.

## Product UX rule

When multiple capture/output modes exist, the UI must make their semantics understandable. A user choosing faithful page/selection copy must not unknowingly receive a Reader transformation; a user choosing a simplified/expanded/interactive archival mode should know what is transformed or preserved.

Completeness warnings and degradation should be durable with the saved record where useful. Success means a truthful copy under the selected mode's contract, not merely that a file was produced.

## Audit rule

Deep audit must continue to test the shared capture boundary independently from individual output renderers, then test each renderer's own fidelity contract. A finding caused by capture/provenance should be fixed once at the shared layer where possible; a PDF-only pagination/rendering defect remains a PDF-specific owner/acceptance case.
