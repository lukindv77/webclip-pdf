# WebClip — fresh full-project audit restart baseline — 2026-09-01

Date: 2026-09-01

Canonical source baseline: `94dd11a312a7e125ba74fa2a49e06938f674e0cd`.

Campaign state: **DEEP-AUDIT-IN-PROGRESS / FRESH-RESTART**.

## Purpose

This campaign restarts the full project audit from the beginning on current canonical source. Existing implementation, P-code ownership, durable evidence, tests, Git history and prior coverage work are retained; nothing is reverted or discarded.

However, prior PASS/FINDING/coverage outcomes are **not credited as evidence for this new campaign until independently rechecked against the current source and current product contracts**. Historical material may be used only as:

- duplicate/root-cause lookup;
- hypothesis and fixture input;
- historical comparison/provenance;
- evidence-location discovery.

`AUDIT_REGISTRY.md` remains the single current authority for P-code owner/status. This restart does not reopen DONE owners, close ACTIVE owners, allocate new P-codes or change release readiness by itself.

## Normative basis

The new pass starts from the current normative chain:

1. `PROJECT_MISSION_AND_DEFENSIVE_SECURITY_POLICY.md` — user-selected truthful later-readable copy, defensive security and truthful degradation;
2. `WEBCLIP_COPY_ARCHITECTURE_POLICY.md` — selection/admitted generation -> format-neutral capture/provenance -> renderer;
3. `WEBCLIP_PDF_FIDELITY_CONTRACT.md` — current faithful-static-PDF contract;
4. `AUDIT_COVERAGE_CAMPAIGN_POLICY.md` — B1…B9 coverage model, L1…L5 evidence ladder, controls, root-cause saturation and completion gates;
5. `AUDIT_CHANGE_WORKFLOW.md` / `GITHUB_WORKFLOW.md` — owner/delivery and exact-head integration rules.

Current release state remains `NOT READY`; historical browser/external PASS does not substitute for evidence executed/revalidated under this restart.

## Restart semantics

The old `AUDIT_COVERAGE_RECONSTRUCTION_2026-08-30.md` remains historical evidence and navigation. It is not overwritten.

For the restart matrix below:

- every material surface begins at `NOT-TRIAGED / UNKNOWN` for the new campaign;
- a row advances only after fresh inspection of current source plus the evidence level required by the current claim;
- historical evidence can reduce discovery cost but cannot itself advance the restart row;
- if a fresh observation is the same root cause as an existing owner, it is recorded under that owner rather than receiving a duplicate P-code;
- DONE owners remain DONE unless fresh current-source/current-runtime evidence independently proves a regression and the canonical workflow reopens them;
- external L5 claims remain external until freshly verified.

## Pipeline boundaries

Every tranche must explicitly map relevant work to:

- B1 User Intent;
- B2 Admission / exact page-document-frame-application generation;
- B3 Capture;
- B4 Static Materialization;
- B5 Renderer;
- B6 Physical Artifact;
- B7 Persistence / Transfer;
- B8 Journal / Provenance;
- B9 Later Reading / Recovery.

## Fresh restart matrix

All 46 previously identified material families are retained as coverage coordinates, but their previous outcomes are reset for this campaign.

| ID | Surface family | Restart state |
|---|---|---|
| C01 | Manual Include/Exclude / selected-scope authority | `L4-REVALIDATED / FINDING (P1-154)` |
| C02 | SelectionSnapshot restore -> admitted rendered target -> saved copy | `L4-REVALIDATED / FINDING + POSITIVE CONTROLS (P1-001, P0-080)` |
| C03 | Main Content / auto candidate -> actual saved scope | `L4-REVALIDATED / FINDING + POSITIVE CONTROLS (P1-160, P0-070/P0-075/P0-080)` |
| C04 | Ordinary DOM/text baseline | `NOT-TRIAGED / UNKNOWN` |
| C05 | Geometry/layout | `NOT-TRIAGED / UNKNOWN` |
| C06 | Colors/backgrounds/compositing | `NOT-TRIAGED / UNKNOWN` |
| C07 | Fonts/typography | `NOT-TRIAGED / UNKNOWN` |
| C08 | Raster images / crop/object-fit | `NOT-TRIAGED / UNKNOWN` |
| C09 | Responsive images / picture/srcset/currentSrc | `NOT-TRIAGED / UNKNOWN` |
| C10 | SVG visual state/resources | `NOT-TRIAGED / UNKNOWN` |
| C11 | Canvas | `NOT-TRIAGED / UNKNOWN` |
| C12 | Video / replaced media / current frame | `NOT-TRIAGED / UNKNOWN` |
| C13 | Form / renderer-owned controls | `NOT-TRIAGED / UNKNOWN` |
| C14 | Pseudo/generated content | `NOT-TRIAGED / UNKNOWN` |
| C15 | Links / anchors / internal destinations | `NOT-TRIAGED / UNKNOWN` |
| C16 | Same-origin iframe | `PARTIAL / L4 POSITIVE CONTROLS` |
| C17 | Cross-origin iframe capture/print boundary | `NOT-TRIAGED / UNKNOWN` |
| C18 | Shadow DOM / slots / composed tree | `NOT-TRIAGED / UNKNOWN` |
| C19 | Ordinary long-page existing content | `NOT-TRIAGED / UNKNOWN` |
| C20 | Nested scroll / retained scrollports | `NOT-TRIAGED / UNKNOWN` |
| C21 | Lazy/offscreen resources already belonging to content | `NOT-TRIAGED / UNKNOWN` |
| C22 | Scroll-triggered new logical content / user-reached max boundary | `NOT-TRIAGED / UNKNOWN` |
| C23 | Virtualized/windowed content history within user-reached range | `NOT-TRIAGED / UNKNOWN` |
| C24 | Spoilers/disclosures / inert expansion | `NOT-TRIAGED / UNKNOWN` |
| C25 | Dialog / popover / top layer | `NOT-TRIAGED / UNKNOWN` |
| C26 | Hover exclusion | `NOT-TRIAGED / UNKNOWN` |
| C27 | Focus / selection / interaction-induced page state | `NOT-TRIAGED / UNKNOWN` |
| C28 | Responsive/environment state | `NOT-TRIAGED / UNKNOWN` |
| C29 | Viewport units / container-query dependent geometry | `NOT-TRIAGED / UNKNOWN` |
| C30 | Clipping / overflow / paint containment | `NOT-TRIAGED / UNKNOWN` |
| C31 | Fixed / sticky | `NOT-TRIAGED / UNKNOWN` |
| C32 | Pagination / physical page breaks | `NOT-TRIAGED / UNKNOWN` |
| C33 | CSS/WAAPI animations/transitions | `NOT-TRIAGED / UNKNOWN` |
| C34 | Animated image/GIF frame | `NOT-TRIAGED / UNKNOWN` |
| C35 | Mutation during preparation / beforeprint / physical render cut | `PARTIAL / L4 FINDING` |
| C36 | Same locator/URL, different resource bytes/generation | `NOT-TRIAGED / UNKNOWN` |
| C37 | Failure/retry/rollback/convergence | `NOT-TRIAGED / UNKNOWN` |
| C38 | Node/byte/time/resource budgets | `NOT-TRIAGED / UNKNOWN` |
| C39 | Privacy / data minimization | `NOT-TRIAGED / UNKNOWN` |
| C40 | Physical PDF bytes / cache identity | `L2-REVALIDATED / FINDING (P0-023, P0-079)` |
| C41 | Local download physical settlement / native Save As | `NOT-TRIAGED / UNKNOWN` |
| C42 | Yandex upload/object/public identity | `NOT-TRIAGED / UNKNOWN` |
| C43 | Journal / provenance / exact artifact linkage | `NOT-TRIAGED / UNKNOWN` |
| C44 | Backup / import / recovery | `NOT-TRIAGED / UNKNOWN` |
| C45 | Later reading / reopened PDF usefulness | `NOT-TRIAGED / UNKNOWN` |
| C46 | Real unpacked Chrome / permission UI / actual chrome.debugger extension path | `NOT-TRIAGED / UNKNOWN` |

## Coverage Sweep 1 — execution/authority skeleton

The first fresh sweep starts at the beginning of the real operation rather than at a previous historical gap. Planned source-first blocks:

1. manifest, permissions, extension entrypoints and trust boundaries;
2. popup current-tab admission and contextual/private-mode authority;
3. content-script injection/bootstrap ordering;
4. manual selection state and Include/Exclude authority;
5. SelectionSnapshot serialization/restore boundary;
6. auto/main-content admission;
7. same-origin frame recursion and geometry projection;
8. cross-origin frame-agent registration/command authority;
9. save metadata / exact URL/document/application generation capture;
10. print preparation mutations and rollback;
11. resource readiness/materialization;
12. debugger/Page.printToPDF physical-render boundary;
13. PDF cache/generation identity and retry;
14. automatic download/native Save As settlement;
15. Yandex auth/account/root/object/publication operation context;
16. Journal/provenance mutation and exact-artifact linkage;
17. backup/import/restore authority;
18. restart/recovery/late-settlement queues and boundedness;
19. privacy/redaction/minimization across durable surfaces;
20. truthful success/degraded/unknown/error UI and later-reading recovery.

The sweep will expand only where a newly discovered high-risk adjacent mechanism shares the same evidence stack. It will not create a P-code before duplicate/root-cause reconciliation.

## Fresh finding FRS-001 — private-context authority is still absent on current main

Fresh L1 inspection of current `manifest.json` and `popup.js` re-demonstrates an unresolved private-context boundary on the exact restart baseline:

- manifest uses the ordinary `service-worker.js` and does not install a dedicated incognito-context bootstrap/guard;
- popup calls `loadBackupStatus()` immediately on startup before classifying the active tab context;
- explicit cross-origin iframe permission flow obtains the active tab and proceeds into frame discovery / `chrome.permissions.request()` without an `incognito === false` admission gate;
- Start injects top content code, enables granted frame agents and starts selection without an incognito-context gate.

This is not a new owner. It is a fresh restart revalidation of existing **P0-045 ACTIVE**. Required next evidence for this row remains source-complete worker-side authority review plus fresh L2/L5 controls before any closure claim.

Affected restart coordinates currently remain nonterminal: C17, C39, C43/C44 contextual shared-state surfaces, and C46 real extension/private-context behavior.

## Fresh continuation checkpoint — selection and generation

`AUDIT_FULL_RESTART_SELECTION_GENERATION_2026-09-01.md` records the accepted current Chrome 152 / deterministic tranche for C01–C03 plus narrow C16/C35 controls and C40 cache-generation authority. Its accepted external execution is workflow run `33500051622`, job `99831050769`, exact evidence head `d82f31f264c43ea1015cc1acc1c40ed390f33e6d`, conclusion SUCCESS.

The matrix above advances only those specifically exercised coordinates. No historical result is implicitly promoted and no P-owner status changes through this coverage update.

## Delivery rule

This baseline is audit evidence only. It does not change runtime, P-code status, manifest version or release readiness. Subsequent restart tranches update this document or add narrowly scoped durable evidence only when the current tree has actually been inspected/tested.
