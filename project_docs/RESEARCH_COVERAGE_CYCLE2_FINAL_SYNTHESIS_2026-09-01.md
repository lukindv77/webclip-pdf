# WebClip — Cycle 2 Coverage Reconciliation and Final Synthesis — 2026-09-01

Date: 2026-09-01

Campaign: `DEEP-RESEARCH-CYCLE-2-2026-08-31`.

Canonical source baseline for this reconciliation: `main = 508b3c4c3c0f3385f524beb3d1bce33d2d5c302e` (T5/PD1 merged; post-merge Repository Integrity #191 SUCCESS).

This document is the durable Cycle-2 Coverage Reconciliation / Final Synthesis gate required by `RESEARCH_COVERAGE_CAMPAIGN_POLICY.md`. It does **not** replace `RESEARCH_REGISTRY.md`, close ACTIVE findings, change production runtime, or imply release readiness.

## 1. Decision

**Deep-research Cycle-2 coverage state: `DEEP-RESEARCH-COVERAGE-COMPLETE`.**

The decision means all material families in the Cycle-2 campaign are triaged to terminal research states at the required evidence level, or have an explicit bounded external/out-of-scope boundary. A terminal `FINDING` remains a defect; research coverage completion and implementation closure are intentionally separate.

The following stronger states are **not** claimed:

- `DEEP-RESEARCH-CRITICAL-CLOSURE-COMPLETE` — **NO**; canonical P0/P1 owners remain ACTIVE.
- `RELEASE-READY` — **NO**; `RELEASE_READINESS.md` remains **NOT READY**, with unpacked Chrome/native/Yandex/release-blocker evidence still pending.

No new P-code, P-owner, owner status, product requirement or fidelity-contract rule is created by this reconciliation.

## 2. Coverage terminality gate

The merged Cycle-2 Matrix `RESEARCH_COVERAGE_CYCLE2_MATRIX_2026-08-31.md` contains the complete current family denominator C01…C46.

Reconciliation result:

- family rows: **46/46 present and sequential**;
- material `NOT-TRIAGED`: **0**;
- material `REVALIDATION-REQUIRED`: **0**;
- current-stable platform-delta deficits: **0**;
- PD1, PD2, PD3, PD4, PD5: terminal `ARTIFACT-COVERED / FINDING`;
- PD6: terminal bounded `ARTIFACT-COVERED / PASS-CONTROL (virtual PDF target)`;
- PD7: explicit `OUT-OF-SCOPE (current stable target) / WATCH` at the campaign checkpoint;
- explicit L5/external families remain visible: **C17, C37, C41, C42, C44, C46**;
- C46 remains bounded `EXTERNAL-REQUIRED / UNKNOWN`, not a synthetic managed-browser PASS;
- no material Cycle-2 observation remains without canonical owner coverage or an explicit bounded external/out-of-scope reason.

This satisfies the project-wide `DEEP-RESEARCH-COVERAGE-COMPLETE` gate in section 20 of the campaign policy.

## 3. Cycle-2 platform-delta closure

The new full-research campaign started because current browser/platform semantics and refreshed external evidence could stale specific renderer-dependent claims. Five physical tranches closed the stable platform delta.

### T1 / PD2 — View Transitions

Chrome for Testing 152 physical evidence proved that an admitted document/element/concurrent/Shadow View Transition midpoint can serialize as final underlying DOM state in the PDF. The canonical example admitted x=240 and physically emitted x=440.

Outcome: `ARTIFACT-COVERED / FINDING` under existing P0-070/P0-075/P0-004.

### T2 / PD3 — `::backdrop` and `::scroll-marker`

Stable controls print correctly, while page-owned `beforeprint` can substitute admitted pseudo/top-layer state before the physical render: blue backdrop→red and marker/content #2/TWO→#3/THREE.

Outcome: `ARTIFACT-COVERED / FINDING` under existing P0-070/P0-075/P0-004.

### T3 / PD5+PD6 — `text-fit` and `page-margin-safety`

PD5 proves identical admitted fitted typography can be changed 680→300 px before physical render, changing physical text geometry and pagination 2→1.

PD6 is a bounded virtual-PDF control: Chrome parses `page-margin-safety`, and none/clamp/add did not introduce an unsafe-printer inset on the virtual PDF target while an ordinary author margin control discriminated.

Outcomes: PD5 `ARTIFACT-COVERED / FINDING`; PD6 `ARTIFACT-COVERED / PASS-CONTROL (virtual PDF target)`.

### T4 / PD4 — scoped custom-element registries

SelectionSnapshot can restore same ordinary/light identity from registry A to visually different registry B with zero ambiguity and the physical PDF follows B. Main Content can ignore a stronger semantic article existing only in scoped/nested Shadow DOM. Manual scoped-Shadow selection and same-origin scoped-frame rendering provide positive/bounded controls.

Outcome: `ARTIFACT-COVERED / FINDING` under existing P1-001/P0-080 and P1-160 roots, with P0-070/P0-075/P0-004 support.

### T5 / PD1 — scroll-triggered animations

Stable and selected-only controls start with the same admitted green/final target and identical admission target hash. Selected-only materialization hides a 1000px predecessor, moves the `view()` trigger y=50→≈-758, resets the animation finished/currentTime=220/+260px→paused/currentTime=0/origin, and the physical PDF follows the red reset state. A nested-scroll case stays green/final; a no-user-scroll case keeps scrollTop=0 and generates no new logical batch.

Outcome: `ARTIFACT-COVERED / FINDING` under existing P0-070/P0-075/P0-004, with P1-230 preserving the user-reached/no-auto-scroll authority boundary.

No T1–T5 result required a new P-code after owner saturation.

## 4. Staleness / Change Impact reconciliation

Cycle 2 began from canonical `main = 2ab1aaca13a34eb64fc6934bc2ebbd042bb070e8`.

Fresh compare from that baseline to the merged T5 reconciliation baseline `508b3c4c3c0f3385f524beb3d1bce33d2d5c302e` shows only:

- `project_docs/**` research/process documentation;
- `project_tools/**` research tooling.

No production extension runtime file, `manifest.json`, build/release file or `WEBCLIP_PDF_FIDELITY_CONTRACT.md` changed during Cycle 2. Therefore the Cycle-2 targeted evidence was not invalidated by an intervening product-runtime/contract change.

This conclusion is bounded to this campaign. A future runtime, contract, browser-semantic, external-boundary or fixture-assumption change must invoke Change Impact and can mark affected cells `REVALIDATION-REQUIRED` again.

## 5. External user-intent freshness

`RESEARCH_EXTERNAL_USER_INTENT_BASELINE_2026-08-31.md` is the substantive external refresh for this second campaign. The final reconciliation is dated 2026-09-01, one day later and within the active-research freshness target.

The baseline covered official peer documentation/stores, public peer GitHub issues, community reports, independent comparisons, archiving/replay systems and current browser/platform changes. External evidence affected risk ranking but did not create WebClip requirements or P-owners automatically.

No stale external-priority input blocks the coverage-complete decision.

## 6. Ownership / no hidden unallocated observation

The canonical Registry remains the single status/owner authority. Cycle-2 findings were deduplicated to existing roots:

- exact admitted→artifact generation / representation isolation / selected physical fidelity: **P0-070 / P0-075 / P0-004**;
- SelectionSnapshot rendered-target identity and SPA/live-selection authority: **P1-001 / P0-080**;
- auto-content/scoped semantic discovery: **P1-160**;
- user-reached dynamic/virtualized scroll authority: **P1-230**;
- narrower supporting owners such as P1-003/P1-187 remain supporting where their specific resource/rendered-state claims apply.

The T1–T5 breadth controls showed repeated manifestations of these roots rather than independent new owner classes. No new P-code was allocated.

## 7. Residual terminal external/unknown classes

Coverage completion does not erase external evidence requirements.

- **C17** cross-origin frame permission/session boundary — managed evidence plus explicit L5 remainder.
- **C37** failure/retry/rollback — deterministic/renderer findings plus native/external settlement where applicable.
- **C41** local download/native Save As physical settlement — L5.
- **C42** real Yandex upload/object/public identity — L5.
- **C44** backup/import/recovery — deterministic in-repo coverage plus real Yandex restore L5.
- **C46** real unpacked Chrome/optional permission UI/actual `chrome.debugger` path — bounded `EXTERNAL-REQUIRED / UNKNOWN`.

Per campaign policy, bounded UNKNOWN/external cells are research-terminal when the reason, scope and required next evidence are explicit. They remain residual risk and release/closure work, not hidden research gaps.

## 8. B1 → B9 final Cycle-2 synthesis

`BROKEN` is compatible with coverage completeness because the defect is proven, bounded and owned.

| Boundary | Cycle-2 final synthesis | Meaning |
|---|---|---|
| **B1 User Intent** | **PROVEN / BOUNDED** | Current save intent, selected scope, Main Content semantics, static-completeness rules and user-reached boundary are explicit; peer opportunities are not silently product requirements. |
| **B2 Admission** | **BROKEN** | T1–T5 reinforce that visible/rendered state can diverge after admission; SelectionSnapshot/Main Content identity defects remain owned. |
| **B3 Capture** | **BROKEN** | Current rendered/composed/resource/control/history state has proven capture/identity gaps under existing owners. |
| **B4 Static Materialization** | **BROKEN** | Selected-only/live-page transformations can alter admitted renderer state; disclosure/frame/history/materialization findings remain. |
| **B5 Renderer** | **BROKEN** | Current Chrome evidence directly proves View Transition, pseudo/top-layer, fitted typography and scroll-trigger render-cut divergence. |
| **B6 Physical Artifact** | **BROKEN** | L4 PDFs contain demonstrably substituted/missing/wrong visual states in multiple independent physical tranches. |
| **B7 Persistence / Transfer** | **BROKEN + EXTERNAL** | Cache/download/Yandex exact identity and settlement owners remain active; native/remote boundaries remain L5 where required. |
| **B8 Journal / Provenance** | **BROKEN / PARTIAL + EXTERNAL** | In-repo provenance/recovery findings are owned; exact remote-object aspects remain external. |
| **B9 Later Reading / Recovery** | **BROKEN / PARTIAL + EXTERNAL** | Physical fidelity failures affect later reading; real native/Yandex restore/settlement remains L5. |

The correct interpretation is not “everything works”; it is “the material user journey is now research-classified rather than materially unknown.”

## 9. Project-wide state transition

The Cycle-2 coverage gate is satisfied because:

1. all CORE families C01…C46 are present and triaged;
2. all material relevant cells are terminal under current Change Impact;
3. required L3/L4 evidence was obtained for the new stable renderer/platform semantics;
4. positive/negative/boundary controls discriminate the major findings;
5. confirmed findings have canonical root-cause ownership;
6. explicit L5/out-of-scope states remain visible and bounded rather than converted to false PASS;
7. no material `NOT-TRIAGED`, `REVALIDATION-REQUIRED` or unexplained UNKNOWN remains;
8. production runtime/contract did not change during the campaign;
9. external user-intent research remains fresh;
10. the final B1→B9 synthesis can be stated without inferring higher evidence from lower layers.

Therefore Cycle 2 transitions from:

`DEEP-RESEARCH-IN-PROGRESS`

to:

**`DEEP-RESEARCH-COVERAGE-COMPLETE`**.

## 10. What this does not close

Cycle-2 coverage completion does **not** mean:

- all P0/P1 findings are fixed;
- `DEEP-RESEARCH-CRITICAL-CLOSURE-COMPLETE`;
- current real unpacked Chrome/native/Yandex QA is complete;
- `RELEASE-READY`;
- a build, tag or GitHub Release should be created.

`RELEASE_READINESS.md` remains `NOT READY` with target version 0.9.9 still WIP while current manifest remains 0.9.8.

## 11. Next engineering stream

After this final synthesis, the primary work becomes risk-ranked **implementation + Closure Sweep**, not uncontrolled extension of already saturated research variants.

Priority should remain driven by canonical Registry severity and user-visible silent-corruption/data-loss risk. Implemented owners must re-research all affected Matrix regions under Change Impact. Explicit L5 tasks remain required for release/external claims.

A new full research campaign is warranted when product/runtime/contract/platform/external changes materially stale this synthesis, or when a genuinely independent root cause creates a new material surface.

**Final Cycle-2 statement: deep-research coverage is complete; critical finding closure and release readiness are not.**
