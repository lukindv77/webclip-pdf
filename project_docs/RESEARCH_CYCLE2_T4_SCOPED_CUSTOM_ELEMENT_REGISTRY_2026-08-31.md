# WebClip — Cycle 2 T4 / PD4 — scoped custom-element registry physical PDF evidence — 2026-08-31

Date: 2026-08-31

Campaign: `DEEP-RESEARCH-CYCLE-2-2026-08-31`.

Canonical source baseline for this tranche: `main = 7b70213ea28a74ed96372eff87905da59bc31e56` (T3/PD5+PD6 already merged; post-merge Repository Integrity #187 SUCCESS).

Accepted current-browser evidence:

- branch: `research/cycle2-scoped-custom-element-registry-2026-08-31`;
- exact accepted evidence head: `274a722ec56acc012824fc884c14d2d2933ca2ff`;
- GitHub Actions run: `33360474045`;
- job: `99390699225`;
- browser: **Google Chrome for Testing 152.0.7977.64**;
- probe: `project_tools/research_scoped_custom_element_registry.py`;
- physical evidence: actual PDF bytes, extracted PDF text, first-page raster/color counts and SHA-256 receipts.

Earlier run `33355187906` / job `99375857263` is explicitly rejected as fixture-invalid. Its frame case attached a scoped registry to a ShadowRoot but then created the custom element through a separate individual-element registry option, so the element did not upgrade. The fixture was corrected to create `<research-card>` inside the ShadowRoot that owns the scoped registry, and the complete probe was rerun successfully.

## 1. Tranche envelope

T4 closes **PD4 — scoped custom-element registries**, introduced as a current stable Chrome 146 semantic and mapped by the Cycle-2 matrix to:

- C02 SelectionSnapshot restore;
- C03 Main Content discovery;
- C16 same-origin iframe representation;
- C18 Shadow DOM / composed-tree semantics.

Required evidence: L1 current source/owner saturation plus feature-capable L3 and physical L4 controls across B2→B6.

The research question is not whether Chrome can render scoped registries. It is whether WebClip's selection/semantic identity and saved physical representation remain faithful when ordinary light-DOM identity no longer uniquely identifies the custom-element definition that supplies rendered semantics.

## 2. Platform semantics

Chrome's scoped custom-element registry model permits multiple custom-element definitions for the same tag name within one page and allows registries to be scoped to a ShadowRoot or individual element rather than only the document-wide registry.

Chrome 152 in the accepted probe confirms the required platform capabilities:

- constructible `CustomElementRegistry`: true;
- `ShadowRoot` `customElementRegistry` option: true;
- individual-element `customElementRegistry` option: true;
- `CustomElementRegistry.prototype.initialize`: true.

Two test hosts can therefore have the same ordinary light-DOM tag/text/attributes while their registry-owned custom elements render materially different visual content.

## 3. Current-source proof

Current `content.js` does not encode scoped-registry identity in SelectionSnapshot locator authority.

Relevant current mechanisms:

- candidate enumeration is bounded through `collectTagCandidatesBounded(ownerDoc, tag, 5000)` using the ordinary owner document's tag collection;
- CSS-path candidate resolution uses `ownerDoc.querySelector(locator.cssPath)`;
- locator scoring is based on ordinary element-visible structural/tag/text/class/attribute/geometry signals;
- no registry identity, registry definition generation, or scoped custom-element semantic fingerprint participates in locator matching;
- Main Content discovery remains document-oriented and cannot treat an article living only inside nested ShadowRoots as an ordinary document candidate.

The native browser renderer, however, can preserve a selected open ShadowRoot's scoped component, so representation capability and semantic/selection identity are separable questions.

## 4. Positive control — manually selected top-level scoped Shadow content prints

Fixture:

- a normal top-level host `#top-host` owns an open ShadowRoot;
- the ShadowRoot owns a private `CustomElementRegistry`;
- `<research-card>` upgrades only in that scoped registry and renders `TOP_SCOPED_RENDER` over a red visual block;
- an unselected light-DOM shell contains `TOP_UNSELECTED_SHELL`.

The user-equivalent manual selection selects only `#top-host`.

Physical PDF result:

- `TOP_SCOPED_RENDER` present;
- `TOP_UNSELECTED_SHELL` absent;
- red pixels: `55126`;
- blue pixels: `0`;
- PDF SHA-256: `02bbea3880c0156e8b1a45ab1b1059619c1e6653fb4c5f8c341b60400ba18e0c`;
- first-page raster SHA-256: `bd2e6e853872354887f9a97ae57e937ff64e8eb6f56fece527dcba47dccc8c8a`.

This is a valid positive control: current Chrome/WebClip can physically serialize stable scoped-registry rendering when the correct host is already selected.

## 5. C02 finding — SelectionSnapshot restores the wrong registry semantics without ambiguity

Source snapshot page:

- guard Include: `REGISTRY_GUARD_MARKER`;
- scoped host A: ordinary host identity `section` + `LOCATOR_SAME_MARKER`;
- registry A renders `REGISTRY_A_RENDER` in red;
- source physical artifact confirms the red scoped component;
- source PDF SHA-256: `5559f1c828c21044e90dcde4f2fef3b9aa55e10d1a165aaf1df045b366fcbf73`.

Restore page deliberately reverses semantic order:

1. scoped host B first — same ordinary host tag/light text, but registry B renders `REGISTRY_B_RENDER` in blue;
2. scoped host A second — same ordinary host tag/light text, registry A renders the original red state.

SelectionSnapshot v3 reports a clean restoration:

- `ok = true`;
- `restoredIncludes = 2`;
- `failedIncludes = 0`;
- `missingIncludes = 0`;
- `ambiguousIncludes = 0`;
- one high-confidence and one medium-confidence Include.

But the selected scoped host is index 0 — **registry B**, not the source registry A.

Physical PDF confirms the wrong semantic target:

- `REGISTRY_A_RENDER`: absent;
- `REGISTRY_B_RENDER`: present;
- red pixels: `0`;
- blue pixels: `55134`;
- PDF SHA-256: `3617905cf5da3c243257751ad0a434ae045e15b7a835f5bf5199bec4fdfc6543`;
- first-page raster SHA-256: `587ecbe2c7285b645566c65bc7e80ec83cac26ad44c3e2552004413936afd1e4`.

### C02 / PD4 verdict

**`ARTIFACT-COVERED / FINDING`**.

The locator can truthfully match the same ordinary host structure while silently restoring a different registry-owned rendered meaning. This is not a browser rendering failure: the physical renderer accurately prints whichever host WebClip selected.

Existing root-cause owners are sufficient:

- **P1-001** — restored target admission must be truthful for the current rendered target, not merely locator-score plausible;
- **P0-080** — live selected DOM/application generation authority must not silently retarget;
- **P0-070** — exact admitted generation must remain authoritative through physical save;
- **P0-075 / P0-004** — supporting isolation/fidelity authority.

No new P-code is warranted.

## 6. C03/C18 finding — Main Content is blind to the stronger scoped-shadow semantic article

Fixture:

- a scoped-registry custom element under an open ShadowRoot owns a nested ShadowRoot containing an `article[role=main]` with substantially stronger meaningful text and marker `SCOPED_SHADOW_MAIN_MARKER`;
- a weaker ordinary light-DOM article contains `LIGHT_DECOY_MARKER`.

Pre-selection control proves:

- nested scoped-shadow main article exists and is rendered;
- document-level `querySelector('article[role=main]')` cannot see it.

`auto-content` chooses exactly one Include: the ordinary light-DOM decoy.

Physical PDF:

- `LIGHT_DECOY_MARKER`: present;
- `SCOPED_SHADOW_MAIN_MARKER`: absent;
- PDF SHA-256: `057c828cba47240da902cd81fc107caac6afbf01a768712df7b9ed2eba0736e1`.

### C03/C18 / PD4 verdict

**`ARTIFACT-COVERED / FINDING`**.

A scoped registry does not itself create the Shadow DOM blindness, but it makes same-tag component semantics explicitly non-global and therefore confirms that document-only semantic discovery cannot infer the strongest rendered component from tag identity alone.

Existing owners cover the failure:

- **P1-160** primary for bounded/coalesced auto-content discovery over the rendered/composed surface;
- **P0-080 / P0-070 / P0-075 / P0-004** supporting generation, authority and physical-fidelity boundaries.

No new P-code is warranted.

## 7. C16 bounded PASS-control — same-origin frame scoped rendering survives flatten/save

A plain same-origin frame positive control first proves the harness/WebClip frame path is functioning:

- `PLAIN_FRAME_POSITIVE`: present in physical PDF;
- unselected top shell absent;
- green pixels: `70443`;
- PDF SHA-256: `4a42715eee4ca8546466a0e79416599f3af35499d76cdca560bc491c254047c9`;
- raster SHA-256: `581049ed908337a9d84f3800df742eafa5871727a3d37099b1ff4062593d9c9c`.

Scoped-frame fixture:

- same-origin frame contains an otherwise empty host;
- its open ShadowRoot owns a scoped registry;
- scoped `<research-card>` upgrades successfully;
- source light DOM/body text is empty;
- only the scoped rendered component contains `FRAME_SCOPED_REGISTRY_RENDER`.

Physical PDF:

- `FRAME_SCOPED_REGISTRY_RENDER`: present;
- red pixels: `59726`;
- PDF SHA-256: `232913dc0b97220faf32244e62ce2230120f91778dabe4a52b6e6ae4a820fa24`;
- raster SHA-256: `6065b7a562a26c9fb1f4fba4c811e6f2dfb7c3b91dadb1cb682279e82eeeaf31`.

### C16 / PD4 verdict

**`ARTIFACT-COVERED / PASS-CONTROL` for the bounded same-origin selected-frame scoped-registry representation claim.**

This does not turn the entire C16 family into PASS: C16 retains historical FINDING ownership for other frame fidelity mechanisms. It proves only that PD4 does not add an independent same-origin frame representation defect in the tested path.

## 8. Ownership and duplicate reconciliation

No independent T4 P-code is created.

PD4 findings reduce to already-active authorities:

- SelectionSnapshot wrong-semantic restore → P1-001 / P0-080, with P0-070/P0-075/P0-004 support;
- Main Content composed/scoped semantic blindness → P1-160, with P0-080/P0-070/P0-075/P0-004 support;
- same-origin frame scoped representation → positive control only; existing frame owners remain unchanged for their separate contracts.

`RESEARCH_REGISTRY.md` therefore remains unchanged and remains the sole P-owner/status authority.

## 9. Family-level Cycle-2 effect

T4 closes all four PD4 family deficits:

- **C02** → terminal current Cycle-2 `ARTIFACT-COVERED / FINDING`;
- **C03** → terminal current Cycle-2 `ARTIFACT-COVERED / FINDING`;
- **C16** → terminal current Cycle-2 historical FINDING retained + bounded PD4 PASS-control;
- **C18** → terminal current Cycle-2 `ARTIFACT-COVERED / FINDING`.

Family metrics advance:

- before T4: **38 terminal / 8 revalidation**;
- after T4: **42 terminal / 4 revalidation**.

Remaining revalidation set:

**C20, C29, C33, C35**.

All four remaining deficits are the same current-stable platform variant:

**PD1 — scroll-triggered animations**.

Platform state after T4:

- PD2 — `ARTIFACT-COVERED / FINDING`;
- PD3 — `ARTIFACT-COVERED / FINDING`;
- PD4 — `ARTIFACT-COVERED / FINDING` with a bounded C16 PASS-control;
- PD5 — `ARTIFACT-COVERED / FINDING`;
- PD6 — `ARTIFACT-COVERED / PASS-CONTROL (virtual PDF target)`;
- PD1 — `REVALIDATION-REQUIRED`;
- PD7 — WATCH / not current-stable requirement at this checkpoint.

Cycle 2 therefore remains **`DEEP-RESEARCH-IN-PROGRESS`** until PD1 is closed.

## 10. Next ranked tranche

**T5 — PD1 scroll-triggered animation** across C20/C29/C33/C35, with C22 as a negative logical-content boundary.

Required next evidence: L1 + current Chrome L3/L4 physical controls proving whether WebClip preparation/render cut advances, resets, or otherwise substitutes the user-admitted scroll-linked animation phase, while not treating newly scroll-created logical content beyond the user-reached boundary as required static content.
