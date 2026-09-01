# WebClip — Cycle 2 T1 View Transition render-cut evidence — 2026-08-31

Date: 2026-08-31

Campaign: `DEEP-RESEARCH-CYCLE-2-2026-08-31`

Tranche: **T1 / PD2 — View Transition admitted state -> physical PDF render cut**

Canonical source baseline: `main = ceefea2e9d779912b0cc0270762ff1748d678683`

Managed-browser evidence head: `c977330b7e152419d1d08511b644ca227b91429a`

Managed-browser run: GitHub Actions run `33351310377`, job `99365114385`

Browser: **Google Chrome for Testing 152.0.7977.64**

Outcome: **`PD2 ARTIFACT-COVERED / FINDING`**

This document closes the Cycle-2 PD2 coverage deficit. It does **not** claim implementation closure, release readiness, or family-level completion for C14/C18/C33/C35 because those families still contain independent pending Cycle-2 variants.

## 1. Research question

When a View Transition is visibly active at WebClip admission, does the physical PDF preserve the admitted non-hover render state, or can the live renderer silently substitute a later/final state at `Page.printToPDF`?

The required boundary is B2 Admission -> B3 Capture -> B4 Static Materialization -> B5 Renderer -> B6 Physical Artifact.

The current fidelity contract requires the PDF to be bound to admitted temporal/render state rather than an arbitrary later print moment. Inability to prove that state safely must not be reported as silent full success.

## 2. L1 current-source result

Current WebClip source still prepares and prints the **live page representation**. The reviewed `content.js` preparation path expands/prefetches/reworks live DOM state before the service-worker/offscreen print path reaches `Page.printToPDF`, but no current source mechanism was found that:

- snapshots an active document or element-scoped View Transition pseudo tree;
- binds transition phase/currentTime to the admitted generation;
- materializes `::view-transition-*` visuals into an inert print representation;
- proves that a transition cannot be advanced, completed or discarded by the print operation;
- emits truthful degradation/unknown when renderer-only transition state cannot be preserved.

Therefore current source provides no mechanism that could make an admitted View Transition phase authoritative at B6.

This is a source observation, not by itself the finding; the finding is established by the physical controls below.

## 3. L3/L4 managed-browser method

A self-contained synthetic page was exercised under Chrome for Testing 152.0.7977.64. No real user page, credentials, private data or external service was used.

The probe:

1. establishes a final DOM position at `x=440`;
2. starts a View Transition from an old visual position toward that final DOM;
3. pauses renderer-generated transition animations at their midpoint (`currentTime=4000`, `duration=8000` for the named box transition);
4. records the admitted on-screen visual by screenshot;
5. invokes CDP `Page.printToPDF` with screen media and background printing;
6. rasterizes the actual PDF at 96 DPI and measures the black-box geometry;
7. records post-print transition animations;
8. hashes the actual PDF and retained control images.

Two durable probes implement the tested envelopes:

- `project_tools/research_view_transition_render_cut.py`
- `project_tools/research_view_transition_shadow_scope.py`

A temporary branch-only workflow was used to obtain current-browser evidence and was removed before the delivery PR so it cannot become production/repository CI surface.

## 4. Physical results

### 4.1 Positive baseline — no active View Transition

Expected final DOM/visual state is `x=440`.

- admission screenshot component: `[440,120,560,240]`
- physical PDF component: `[440,120,560,240]`
- post-print transition animations: none, as expected
- PDF SHA-256: `fe1f1176130afbf34689edcd610acfcc6ff220ef8ff5846eed385b9525ed5586`
- admission screenshot SHA-256: `c32c3c42edd7ad67d33b9d94286d0475831c48ac7ceab38a05e45c68c9678df1`
- PDF-render PNG SHA-256: `2be507aec4bc7835b5218e0553d36dacdf130b47c21980272b410f34d80843f7`

The ordinary non-transition physical control is therefore valid.

### 4.2 Document-scoped active transition

At admission the transition pseudo tree is paused at midpoint.

- admission screenshot visual component: `[240,120,360,240]`
- underlying final DOM box: `x=440`
- physical PDF component: `[440,120,560,240]`
- post-print transition animations: `[]`
- PDF SHA-256: `92bdd6115fd8258818c0781da48159b01c762a8bb81e8110667414b71a34a894`
- admission screenshot SHA-256: `4cdbbb03d41d4d3c6349db5c094a8a07b8ba747a4217bbc5f7e0884df65a570a`

The PDF does not preserve the admitted visible midpoint. It serializes the final underlying DOM state and the transition is gone after print.

### 4.3 Single element-scoped active transition

Chrome 152 exposes `Element.startViewTransition()` and the named transition pseudo animations are paused at midpoint before print.

- admission screenshot visual component: `[240,120,360,240]`
- physical PDF component: `[440,120,560,240]`
- post-print transition animations: `[]`
- PDF SHA-256: `92bdd6115fd8258818c0781da48159b01c762a8bb81e8110667414b71a34a894`

The same admitted-state -> final-state substitution reproduces for element-scoped transition state.

### 4.4 Two concurrent element-scoped transitions

Two independent element-scoped transition components are admitted simultaneously.

Admission screenshot components:

- `[240,120,360,240]`
- `[240,360,360,480]`

Physical PDF components:

- `[440,120,560,240]`
- `[440,360,560,480]`

Post-print transition animations are empty.

- PDF SHA-256: `9dff898e012cb1de853a1c37820a944abc7bb741a53002a980b2297eae838a1a`
- admission screenshot SHA-256: `b6615a11646e7f0eb19d26e0da0ee796eccbd2f9e5bb64fe6dce78ee80d529e3`
- PDF-render PNG SHA-256: `6a464dc3f15a9e0146636f58ac211c442676518a90c6f229db5855bc19e5d944`

Concurrency therefore does not isolate or preserve the admitted transition phases; both are replaced by their final DOM positions in the PDF.

### 4.5 Shadow/composed-scope element transition

An element-scoped transition was started on a scope containing a named box inside Shadow DOM. Chrome exposes and pauses `::view-transition-group(shadowbox)` / old/new pseudo animations at midpoint.

- admission screenshot visual component: `[240,120,360,240]`
- physical PDF component: `[440,120,560,240]`
- post-print transition animations: `[]`
- PDF SHA-256: `215e19ce1e20d6903ce45da9a8bf27b610a611613748da4bced1fdf184729bbd`
- admission screenshot SHA-256: `b642be0b74a843d674de7b7bf833ce7139d9d72f30d9958980ef68b3394181ce`
- PDF-render PNG SHA-256: `d8bb4736f9b4b6ed889a0c6256c8995d42bfa7795f1636d51683180c94ed29fb`

The mismatch therefore crosses the Shadow/composed-tree variant as well.

## 5. Authority / negative controls

The main physical probe also retains contract controls unrelated to the transition mismatch:

- an explicitly excluded control is absent from extracted PDF text;
- a hover-only control is absent from extracted PDF text;
- the non-transition final-state baseline is physically correct;
- the PDF itself, not only a renderer screenshot, is hashed and raster-inspected.

These controls distinguish PD2 from a generic crop, hover, text-extraction or PDF-generation failure.

## 6. Finding

**Current Chrome can display one admitted View Transition state while `Page.printToPDF` serializes a different final underlying DOM state. The print operation also causes the active transition pseudo animations to disappear.**

For WebClip this is a silent fidelity failure because current preparation has no inert transition snapshot/materialization layer and no transition-phase provenance/degradation result. A user can admit a visibly meaningful non-hover transition state and receive a physically different PDF while the generation path otherwise succeeds.

The defect reproduces across:

- document-scoped View Transition;
- single element-scoped View Transition;
- concurrent element-scoped View Transitions;
- Shadow/composed-scope element transition.

This is sufficient saturation for PD2 at L3+L4. More fixtures of the same transition mechanism would duplicate the established root-cause envelope rather than improve coverage materially.

## 7. Root-cause saturation / ownership

No new P-code is warranted.

The finding is already covered by existing ACTIVE owners:

- **P0-070** — exact admitted full-document generation through physical print/cache/persistence;
- **P0-075** — the live host page is not a trusted print/control plane; the print representation must be isolated from page-owned state;
- **P0-004** — physical selected-copy fidelity and prevention of unowned presentation from replacing the admitted saved copy.

`P1-187` and existing pseudo/composed/render-state owners remain supporting context where their narrower mechanisms apply, but the observed admitted-generation/render-cut failure does not establish an independent root cause.

`RESEARCH_REGISTRY.md` is therefore unchanged.

## 8. Matrix consequence

PD2 moves from `REVALIDATION-REQUIRED` to:

**`ARTIFACT-COVERED / FINDING`**.

Affected family cells remain nonterminal only because of their other independent Cycle-2 variants:

- C14: PD2 covered; **PD3 remains**;
- C18: PD2 covered; **PD4 remains**;
- C33: PD2 covered; **PD1 remains**;
- C35: PD2 covered; **PD1 remains**.

Family-level campaign metrics therefore remain 31 terminal carry-forward families / 15 families containing at least one unresolved new stable-browser variant. This is expected and prevents falsely converting partial variant closure into family completion.

## 9. Reproducibility / provenance

Managed current-browser run:

- run: `33351310377`
- job: `99365114385`
- exact evidence head: `c977330b7e152419d1d08511b644ca227b91429a`
- browser: `Google Chrome for Testing 152.0.7977.64`
- runner: GitHub hosted Ubuntu 24.04

The run completed successfully and emitted the measured JSON plus artifact hashes in the job log. Probe scripts are retained in the repository; the temporary workflow used only to execute the managed current-browser run is intentionally not retained.

## 10. T1 termination decision

T1 satisfies its predeclared termination envelope:

- current feature support is proven on Chrome 152;
- document, element, concurrent and Shadow/composed active variants reproduce;
- baseline/Exclude/hover controls distinguish the envelope;
- physical PDF geometry and bytes prove B6 impact;
- post-print state proves the transition is not simply left paused after serialization;
- owner saturation maps the finding to existing P0-070/P0-075/P0-004;
- no unsupported runner state is inferred as PASS;
- no new P-code is allocated.

Decision: **T1 COMPLETE — PD2 `ARTIFACT-COVERED / FINDING`.**

Cycle 2 remains **`DEEP-RESEARCH-IN-PROGRESS`**.

Next ranked tranche: **T2 / PD3 — `::backdrop` / `::scroll-marker` modern pseudo/top-layer state -> physical PDF**.