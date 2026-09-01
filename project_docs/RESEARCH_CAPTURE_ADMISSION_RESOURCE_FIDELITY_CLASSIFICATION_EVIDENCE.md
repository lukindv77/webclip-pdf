# Durable classification evidence — capture admission / resource fidelity

This file is durable research evidence only. `RESEARCH_REGISTRY.md` remains the sole authority for current P-code status and ownership.

Source baseline for the researched runtime: `main` at `f9ff401c3521433ffee40b8d48390c2477a018cb`.

## Classification

The 2026-08-29 capture-admission/resource-fidelity tranche reopens **P1-003** rather than allocating a new P-number.

Historical P1-003 implementation evidence remains valid for its proven scope: bounded preparation of ordinary selected images, element-level CSS `background-image`, and element-level used fonts, with bounded deadlines/task counts and durable failure reporting.

Fresh source inspection plus deterministic Chromium probes show the same root cause remains unresolved for the complete selected visual resource graph. Current preparation does not explicitly await selected pseudo-element resources, CSS `mask-image`, `list-style-image`, pseudo-only font faces, or CSS background/font parity inside permitted cross-origin frame-agent preparation. `Page.printToPDF` can complete before those resources settle and produce a materially different raster from a later print after settlement.

Therefore the correct canonical transition is the existing **P1-003** owner from historical `IMPLEMENTED / RELEASE-REGRESSION` default back to **ACTIVE** with an expanded acceptance contract. P1-004 remains only the cross-origin iframe feature umbrella; no P1-228 is created.

## Related owner refinements without status transition

The same tranche strengthens existing ACTIVE owners without changing their status:

- **P0-004** — nested selected scrollers, container-query geometry, CSS counter semantics and page-owned structural selectors can make the emitted PDF differ from the presentation the user selected.
- **P0-075** — WebClip focus, live-DOM preparation and host `beforeprint`/timer reactions show that the page remains an untrusted mutable input after user admission.
- **P0-070** — same browser document identity is not sufficient to prove the same admitted renderer state across asynchronous preparation.
- **P1-187** — direct Chromium preserves renderer-owned state such as tested form values/canvas, so an intermediate capture/proxy representation must not silently regress it.
- **P2-007** — DOMSnapshot/MHTML/snapshot-engine comparison supports a capture-first, render-second architecture, but no browser primitive is accepted as a complete canonical snapshot by itself.

No other owner status is changed by this file.

## Test and release interpretation

Managed Chromium probes are semantic/browser evidence, not final release acceptance. Real unpacked Chrome, optional-host-permission/cross-origin QA and real Yandex E2E remain external release requirements. Runtime, `manifest.json`, product version, build/tag/release state and release readiness are unchanged.
