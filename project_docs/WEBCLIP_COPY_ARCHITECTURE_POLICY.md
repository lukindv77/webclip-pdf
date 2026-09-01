# WebClip copy architecture policy

This document is a permanent product/architecture requirement. It does **not** define current P-code status; `RESEARCH_REGISTRY.md` remains the sole status/owner authority.

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

The current PDF-specific semantics are defined normatively by `WEBCLIP_PDF_FIDELITY_CONTRACT.md`. Other future formats/modes require their own explicit product decisions rather than inheriting PDF's fidelity/completeness trade-offs automatically.

## PDF remains a strict first-class fidelity contract

Although PDF is not the universal copy model, PDF saving must remain predictable and high fidelity.

The current primary PDF is deliberately a **hybrid of fidelity and bounded static completeness**. It is not merely a screenshot of the current viewport, but it is also not a crawler or an unlimited materializer.

Its contract combines two requirements:

1. preserve the meaningful visual/structural presentation of the selected page state as the user actually encounters it on the site;
2. produce a complete static representation of already-existing selected content reachable through ordinary scrolling and safely materializable collapsed content, while scroll-triggered **new logical content** is bounded by how far the user himself/herself has scrolled rather than by WebClip auto-scrolling the live page for more items.

This means pagination or static materialization may legitimately differ from the literal viewport rectangle, but it must not silently substitute a different responsive variant, page generation, unrelated layout, resource generation or hidden-content policy merely because Chromium print geometry is different.

At minimum PDF fidelity researching must cover:

- desktop/mobile/orientation/container-query and viewport-unit state;
- zoom/transforms/frame geometry;
- colors/backgrounds/fonts/SVG/canvas/images;
- current form/control and other renderer-owned visible state where relevant;
- explicit spoiler/disclosure static-materialization semantics;
- ordinary/nested scroll completeness and the user-reached boundary for scroll-triggered dynamic growth;
- virtualized content already within the user-reached range even when current DOM recycling removes earlier nodes;
- clipping/overflow/fixed/sticky behavior and pagination;
- clickable links where PDF can safely represent them;
- temporal state such as animations/transitions and page mutations: output must be bound to a defined admitted state rather than arbitrary render timing;
- material non-hover focus/selection state;
- explicit exclusion of hover-only menus/tooltips/overlays/styling, even when hover is active at admission;
- inability of WebClip's own dialogs/focus/preparation mutations to silently change the page state that is later claimed as the user's captured view.

`media: screen` is not by itself proof of visual fidelity: layout-dependent screen media/container/viewport rules can still be reevaluated against print geometry.

## Interactive content and static formats

“User can interact with it on the site” does not mean a static PDF must execute the site's JavaScript or preserve dangerous active behavior. It means the capture model must understand which content/state belongs to the accepted PDF completeness envelope and apply an explicit, deterministic static representation policy.

For the current primary PDF contract:

- A scroll container whose content already exists may be expanded into complete static flow so that content the user could reach by ordinary scrolling is not lost, while preserving meaningful ordering/appearance as far as the static format permits.
- Scroll/infinite/virtualized behavior that creates **new logical content** is different: WebClip does not auto-scroll the live page farther to obtain more items. The user's own furthest reached scroll boundary defines the logical-content limit; material already present at capture-session start is also in scope. If virtual DOM recycling prevents faithful recovery of content already within that boundary, the result must be truthfully partial/degraded/unknown rather than silently complete.
- A closed spoiler/`<details>` or equivalent safely materializable collapsed block inside selected scope is expanded in the inert PDF representation for later reading, while provenance may record that its source state was closed. WebClip must not synthesize a page-owned click on the live page merely to fetch or activate new state.
- Materialization must not synthesize page-owned submit/navigation behavior, arbitrary `Load more` actions or crawler-like expansion.
- Material non-hover focus/selection/control state should be captured at the admission point when it changes the resulting presentation.
- Hover-only state is explicitly excluded from the current PDF contract even if it was active because of the user's pointer: hover menus, tooltips, flyouts, overlays and hover-only styling should not appear in the saved PDF.
- Non-hover dialog/popover/top-layer state follows admission: opened state may be preserved, closed state is not automatically opened for completeness.
- Future interactive/offline HTML-like formats may preserve safe interaction semantics that PDF cannot; they must still remain inert with respect to privileged WebClip authority and must not become a vehicle for replaying untrusted page actions with extension privileges.

## Capture first, render second

Long-term architecture should investigate browser snapshot primitives and established web-archiving approaches, but none is accepted merely by availability.

Candidate inputs include Chromium `DOMSnapshot.captureSnapshot`, `Page.captureSnapshot`/MHTML, renderer-state extraction, resource materialization, and browser-based WARC/WACZ-style recording. Each candidate must be evaluated for:

- fidelity to current DOM + renderer state;
- canvas/video/form/shadow/iframe handling;
- responsive/layout geometry;
- resource completeness and offline durability;
- user-reached dynamic-scroll boundaries and virtualized-history requirements where applicable;
- size/node/byte/time budgets;
- privacy and safe-URI behavior;
- hostile-page isolation/inertness;
- deterministic provenance and generation fencing;
- suitability for multiple output renderers.

No single browser API is assumed to be a complete canonical snapshot. The project should compose the minimum trustworthy captured representation needed by accepted output modes.

## Product UX rule

When multiple capture/output modes exist, the UI must make their semantics understandable. A user choosing faithful page/selection copy must not unknowingly receive a Reader transformation; a user choosing a simplified/expanded/interactive archival mode should know what is transformed or preserved.

The current PDF hybrid is defined by `WEBCLIP_PDF_FIDELITY_CONTRACT.md`; this does not pre-approve equivalent semantics for future formats.

Completeness warnings and degradation should be durable with the saved record where useful. Success means a truthful copy under the selected mode's contract, not merely that a file was produced.

## Research rule

Deep research must continue to test the shared capture boundary independently from individual output renderers, then test each renderer's own fidelity contract. For current PDF, `WEBCLIP_PDF_FIDELITY_CONTRACT.md` is the normative PDF-specific acceptance reference.

A finding caused by capture/provenance should be fixed once at the shared layer where possible; a PDF-only pagination/rendering/static-materialization defect remains a PDF-specific owner/acceptance case.
