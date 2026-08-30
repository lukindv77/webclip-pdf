# WebClip copy architecture policy

This document is a permanent product/architecture requirement. It does **not** define current P-code status; `AUDIT_REGISTRY.md` remains the sole status/owner authority.

## Project mission authority

`PROJECT_MISSION_AND_DEFENSIVE_SECURITY_POLICY.md` is the upper-level normative mission for WebClip. This architecture policy must be interpreted under that mission: preserve the user-selected page state for later reading with maximal truthful fidelity, while all preparation, storage, transfer, diagnostics and external integrations remain safe for the user and operate within a defensive-security scope. A technically successful serialization is not success if it silently changes the admitted user-visible state or compromises user data.

Security analysis for this architecture is defensive. Exploit development, authorization bypass, attacks, service compromise, malicious code and intrusion instructions are outside project scope. When a threat class is relevant to an architecture decision, the required level is conceptual: protected asset, condition that creates the risk, and the defensive mechanism that closes it.

## Core rule: page copy is format-neutral

The primary WebClip product object is a **captured copy of an explicitly identified page/document state and user-selected scope**, not a PDF file.

PDF is the first/current output format, but it is only one serialization/rendering of a captured copy. Future outputs may include HTML and other archival/reading formats. Long-term architecture must therefore avoid making PDF-specific live-DOM mutations, pagination assumptions, cache keys or renderer details the canonical definition of a WebClip copy.

The intended direction is:

**selection intent + source/document/frame generation + admitted visible/interactable state -> format-neutral captured representation/provenance -> one or more format-specific renderers/serializers**.

A format-specific renderer may lose capabilities that its format cannot represent, but it must do so predictably and under an explicit mode/policy rather than silently redefining what was captured.

Existing P2 ownership remains split by scope rather than duplicated: **P2-007** is the natural architecture/backlog owner for capture/output mode separation, while **P2-001** remains the concrete backlog owner for saving HTML/Markdown alongside PDF. This policy creates no second owner and changes neither status.

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

A faithful PDF is **not merely a screenshot of the current viewport**. Its contract combines two requirements:

1. preserve the meaningful visual/structural presentation of the selected page state as the user actually encounters it on the site;
2. produce a complete static copy of the selected content that the user can actually reach through ordinary non-destructive interaction such as scrolling, subject to an explicit static-flattening policy.

This means pagination or static materialization may legitimately differ from the literal viewport rectangle, but it must not silently substitute a different responsive variant, page generation, unrelated layout, resource generation or hidden content policy merely because Chromium print geometry is different.

At minimum PDF fidelity auditing must cover:

- desktop/mobile/orientation/container-query and viewport-unit state;
- zoom/transforms/frame geometry;
- colors/backgrounds/fonts/SVG/canvas/images;
- current form/control and other renderer-owned visible state where relevant;
- open/closed/top-layer state and the explicit static-materialization rule for revealable content;
- scrollable/nested content and long-page completeness without arbitrary clipping;
- clipping/overflow/fixed/sticky behavior and pagination;
- clickable links where PDF can safely represent them;
- temporal state such as animations/transitions and page mutations: output must be bound to a defined admitted state rather than arbitrary render timing;
- inability of WebClip's own dialogs/focus/preparation mutations to silently change the page state that is later claimed as the user's captured view.

`media: screen` is not by itself proof of visual fidelity: layout-dependent screen media/container/viewport rules can still be reevaluated against print geometry.

## Interactive content and static formats

“User can interact with it on the site” does not mean a static PDF must execute the site's JavaScript or preserve dangerous active behavior. It means the capture model must understand which content/state is reachable through normal interaction and must apply an explicit, deterministic static representation policy.

Examples:

- A scroll container may be expanded into complete static flow so that content the user could reach by scrolling is not lost, while preserving the container's meaningful ordering/appearance as far as the static format permits.
- A closed disclosure that can be expanded on the live site needs an explicit policy. A current-view mode may keep it closed; an expanded/archival mode may materialize revealable content into an inert representation. If materialization changes the original visible state, the mode/diagnostics must make that transformation predictable rather than silently presenting it as an exact current-view snapshot.
- Materialization must not synthesize page-owned click/submit/navigation behavior. It should derive an inert representation or use safe state extraction.
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
