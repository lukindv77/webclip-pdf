# Audit family navigation index

This file is **navigation only**. Current P-code status and single-owner authority come from `AUDIT_REGISTRY.md`. Detailed source proof is retained in consolidated family evidence files and Git history.

## Consolidation state

All formerly current `AUDIT_DELTA_*.md` evidence files have completed lossless family retirement. The original source text is preserved verbatim in the relevant `AUDIT_FAMILY_*_EVIDENCE.md` file (or the cross-cutting evidence file), together with original filename and SHA-256 where applicable.

No standalone audit delta is a current status authority. New audit findings must first be registered in `AUDIT_REGISTRY.md`; if a temporary delta is created during active analysis, CI requires it to be indexed until it is folded into the appropriate family evidence.

## Current temporary audit deltas

- `AUDIT_DELTA_SELECTION_CAPTURE_FIDELITY_2026-08-29.md`

  PDF/print + frame selection fidelity. Registered scope: P0-004 ACTIVE refinement; new P1-226 ACTIVE. Durable supporting summary: `AUDIT_SELECTION_CAPTURE_FIDELITY_EVIDENCE.md`. Supporting dedup/refinement evidence also covers P0-067/P1-212, P1-003, P1-187, P2-006 and P2-007.

## Supplemental durable audit evidence

- `AUDIT_INTERACTIVE_CAPTURE_FRAME_TOPOLOGY_EVIDENCE.md`

  24-block interactive-capture/live-frame-topology/renderer-state audit tranche. Registered scope: new P1-227 ACTIVE for bounded live same-origin frame topology during manual selection. Supporting refinements/controls cover P0-004, P0-066, P0-068, P0-071, P0-075, P1-160, P1-187, P1-213, P2-006 and P2-007; cross-origin topology remains with the existing frame lifecycle owners.

- `AUDIT_CAPTURE_ADMISSION_RESOURCE_FIDELITY_EVIDENCE_2026-08-29.md`

  26-block capture-admission/responsive-fidelity/renderer-resource-readiness audit tranche. Registered status change: P1-003 reopened ACTIVE because bounded preparation does not yet cover the actual selected visual resource graph (pseudo/CSS visual resources and frame parity), while `Page.printToPDF` is not a readiness barrier. Supporting refinements/controls cover P0-004, P0-070, P0-071, P0-075, P1-004, P1-187 and P2-007 without additional status transitions.

- `AUDIT_COMPLEX_LAYOUT_FRAME_PROXY_FIDELITY_EVIDENCE_2026-08-29.md`

  38-block complex selected-layout / same-origin flattened-frame representation audit tranche. No new P-number or status transition: source and managed-Chromium evidence refines P0-004 for layout/compositing/fixed-pagination fidelity, P1-187 for frame-local rendered state/resource provenance and style-budget truth, P1-160 for boxless semantic auto-content candidates, P1-003 for additional CSS visual resources, and P2-007 for explicit current-view versus complete-static capture semantics.

- `AUDIT_CAPTURE_REPRESENTATION_DEPENDENCY_EVIDENCE.md`

  34-block capture-representation dependency-closure audit tranche. No new P-number or status transition: P0-004 gains sibling/reference/anchor/counter/rendering-dependency acceptance; P0-075 gains page-CSS/helper-DOM isolation evidence; P1-187 gains transform/box/text/SVG/fragmentation/top-layer/browser-owned state cases; P1-003 retains three non-reproducing resource controls; P2-007 remains the composed format-neutral capture architecture owner.

- `AUDIT_MANUAL_PICKER_HITTEST_GEOMETRY_2026-08-29_EVIDENCE.md`

  34-block manual-picker hit-test/rendered-geometry/restore-admission audit tranche. Navigation scope: P1-228 owns truthful rendered candidate/geometry authority for manual and remote-frame picker parity; P1-001 is reopened for post-match rendered-target admission. Supporting refinements/controls cover P0-075, P1-004, P1-154, P1-160, P1-226, P2-006 and P2-007. This index records evidence scope only; current status remains authoritative exclusively in `AUDIT_REGISTRY.md`.

- `AUDIT_SELECTION_INTENT_ADMISSION_CONVERGENCE_2026-08-30_EVIDENCE.md`

  28-block selection-intent/rendered-admission/gesture/remote-ordering convergence tranche from fresh `main`. No new P-number or status transition: source and managed-Chromium evidence refines P1-228 for preview→commit coherence, multi-click, keyboard candidate traversal, zero-box/visible-overflow geometry and local/remote overlap parity; P1-001 for transparent filter/mask restore admission and shared rendered-scope semantics; P0-075 for hostile listener ordering/pointer mutation and forgeable helper-id candidate suppression; P1-200 for exact remote clear/start/set-mode session ordering; P1-154, P2-006 and P2-007 remain supporting owner boundaries.

- `AUDIT_SELECTION_RESTORE_SOUNDNESS_2026-08-30_EVIDENCE.md`

  36-block SelectionSnapshot restore-soundness / remote-settlement / bounded-locator-work tranche from fresh `main`. No new P-number or status transition: P1-001 gains end-to-end restore truth for sound candidate/confidence sets, idempotent local/remote application and final report/state reconciliation; P1-200 covers failed/late remote clear/start/restore session ordering; P1-171 covers exact frame/document boundary and conservative cross-frame confidence; P1-154 preserves aggregate count/cap truth; P1-168/P1-160 retain bounded locator/snapshot/outline computation. Managed Chromium reproduces duplicate remote restores toggling state off while returning success, 251st remote selections refused while returning success, and an exact target at tag-candidate position 5001 losing to an in-window decoy with score 99 / high confidence. Existing positive controls for in-window exact match and ambiguity fail-closed remain valid.

- `AUDIT_SELECTION_SAVE_FREEZE_REENTRANCY_IPC_2026-08-30_EVIDENCE.md`

  50-block selection save-freeze / host-reentrant marker / pre-IPC locator-admission tranche from fresh `main`. No new P-number or status transition: P0-070/P1-200/P1-214 gain exact reviewed local+remote selection-freeze receipt requirements so mutable remote state cannot diverge between confirmation, `meta.selectionSnapshot` and physical multi-frame preparation; P0-075/P0-080/P1-228 gain managed-Chromium isolated-world proof that WebClip marker writes can synchronously execute page custom-element/CSS reactions before Map commit, including target removal/replacement, marker stripping and reentrant nested selection; P1-168/P1-172 gain early per-field/depth/byte limits before `CSS.escape`, selector parsing and Chrome message serialization. Worker SelectionSnapshot sanitization remains a positive authoritative second boundary.

- `AUDIT_REMOTE_FRAME_PRINT_MEDIA_GEOMETRY_2026-08-30_EVIDENCE.md`

  50-block cross-origin frame physical-PDF media/selected-geometry audit tranche from fresh `main`. Registered scope: new **P1-229 ACTIVE** because worker `screen` media emulation disables the frame-agent's `@media print` Include/Exclude filter while enabling its `@media screen` green/red selection outlines; the child also returns pre-filter full-document height that top uses for iframe pagination. Managed Chromium reproduces selected + excluded + unrelated child text and selection outlines in the PDF, while a media-independent child filter is a positive control and post-filter geometry is required to avoid excess blank pages. Supporting owner boundaries: P0-004, P1-004, P1-003 and P0-070.

- `AUDIT_SELECTED_ONLY_CASCADE_AUTHORITY_2026-08-30_EVIDENCE.md`

  28-block selected-only author-cascade authority tranche from fresh `main`. No new P-number/status transition: direct Chromium PDF proof refines P0-075/P0-004 because live author-origin `display:none!important` is not authoritative against page inline/high-specificity/layered important declarations; unselected and explicit Exclude content can enter the PDF and a 5000px unselected tail expanded output from 1 to 6 pages. P1-003 retains actual-rendered-resource-graph parity. P1-229 is explicitly refined: its media-independent child-filter positive control fixes the media dimension only and is not full closure unless the selected-only representation is also non-overridable by page author cascade. Negative controls preserve non-important CSS, lower-specificity important CSS, visibility-only, animation, `display:contents` and a rejected transition hypothesis.

- `AUDIT_SELECTION_SNAPSHOT_PRIVACY_FINAL_2026-08-30_EVIDENCE.md`

  56-block SelectionSnapshot privacy revalidation tranche from fresh `main`, with interruption-safe detailed evidence in `AUDIT_SELECTION_SNAPSHOT_PRIVACY_REVALIDATION_2026-08-30_EVIDENCE.md`, `AUDIT_SELECTION_SNAPSHOT_PRIVACY_PORTABILITY_2026-08-30_EVIDENCE.md` and `AUDIT_SELECTION_SNAPSHOT_PRIVACY_RESOLVER_2026-08-30_EVIDENCE.md`. No new P-number or status transition: fresh source plus managed-Chromium proof revalidates P1-182 because a benign selected node can durably capture unselected parent/previous/next plaintext and raw `href/src` secrets; the same non-minimized snapshot propagates through Journal, pending local/remote recovery, PDF retry cache, local JSON export, Yandex backup and import staging/round-trip. Resolver scoring currently assigns selected text up to 24 points, raw `href` 14, raw `src` 10 and surrounding context up to 18, so privacy repair must be a coordinated versioned feature/scoring/ambiguity migration rather than field deletion. Supporting owner boundaries: P0-066, P1-001, P1-168, P1-188 and P0-077.

- `AUDIT_POST_FREEZE_PHYSICAL_RENDER_CUT_FINAL_2026-08-30_EVIDENCE.md`

  56-block interruption-safe post-freeze physical-render-cut tranche from fresh `main`, with Blocks 1–44 preserved across the staged `AUDIT_POST_FREEZE_PHYSICAL_RENDER_CUT*_EVIDENCE.md` files and final Blocks 45–56/classification in this final file. No new P-number or status transition: direct managed-Chromium PDF/raster proof revalidates P0-070/P0-075/P0-004 because page `beforeprint`, microtasks, MutationObservers, synthetic print lifecycle events and shared-DOM artifact mutation can change the representation after preparation and before `Page.printToPDF` layout. Already-loaded image/CSS resources, canvas/SVG/form/disclosure/pseudo state and `@page` geometry can change at the physical cut while prepared/before/after diagnostics remain telemetry rather than byte receipts. P1-003/P1-187/P1-229 gain supporting resource/render/frame acceptance refinements; P1-230 is deliberately not allocated.

- `AUDIT_PRINT_ROLLBACK_RETRY_CONVERGENCE_2026-08-30_EVIDENCE.md` + `AUDIT_PRINT_ROLLBACK_RETRY_HANDOFF_2026-08-30_EVIDENCE.md`

  40-block print-preparation rollback/retry-convergence tranche from fresh `main`. No new P-number/status transition: fresh source and deterministic models revalidate P1-214/P1-199 because successful remote child preparation can be lost when a later child fails, restore ownership is consumed before actual settlement, missing mappings can erase cleanup receipts, and old fire-and-forget restore can overtake a new prepare. Managed Chromium additionally shows a temporarily disconnected normalized link can be reattached with WebClip's temporary absolute href/marker still present (P1-221), and page-added content inside a temporary image wrapper can be deleted by blanket wrapper cleanup (P1-219). Child `restorePrint()` can report success after swallowed cleanup failures (P1-214/P1-218), while child resource `attempted` can overstate actual deadline-bounded work (P1-003). Download/Yandex reprepare UI can become available before previous remote cleanup settles; cache-only retries should remain independent of live-page cleanup while retaining reconciliation receipts. Supporting convergence owners: P0-067/P1-212, P1-171 and P0-070.

- `AUDIT_LOCAL_PREPARE_BUDGET_TASK_LIFETIME_2026-08-30_EVIDENCE.md`

  56-block local PDF-preparation budget / diagnostic-work / renderer-task-lifetime tranche from fresh `main`. No new P-number or status transition: P1-167 is revalidated because bounded resource prefetch coexists with independent unbounded link/image/details/disclosure selectors, serial per-control disclosure waits, repeated full rendered-text diagnostics, whole-document selected-only style/layout work and full flattened-frame clone/query passes outside one shared node/time/mutation/string budget. P1-003 gains timeout-vs-underlying-resource-settlement evidence: managed Chromium shows caller timeout returning while a hanging image request and listeners/handlers remain active, so retry generations need bounded unresolved task ownership rather than treating timeout as cancellation. P0-064 retains full-clone preflight ownership; supporting boundaries include P1-154, P1-227, P0-067/P1-212 and P1-187. Managed large-DOM controls preserve the 5000-node TreeWalker as a positive bounded pattern.

- `AUDIT_SOURCE_URL_DATA_MINIMIZATION_2026-08-30_EVIDENCE.md`

  56-block source-URL data-minimization/external-persistence revalidation tranche from fresh `main`. No new P-number or status transition: P0-066 is revalidated because authoritative HTTP/HTTPS source URL currently keeps username/password/query/fragment in `meta.url`, and that value becomes both PDF-visible text and hyperlink target, raw Journal/recovery/cache metadata, portable Journal JSON and Yandex-stored PDF/backup content. Managed Chromium physically reproduces the raw components in extracted PDF text and link annotation `/URI`, while a minimized URL is a clean positive control. Worker sender-derived source authority, HTTP/HTTPS-only admission, OperationLog URL redaction and resource-diagnostic URL minimization are preserved positive controls. Supporting acceptance boundaries: P0-070, P0-080, P0-023, P0-075, P1-182 and P0-077; exact operational identity must remain separate from the durable/display URL or privacy-preserving equality key.

- `AUDIT_PDF_BYTE_TRANSFER_RECEIPT_2026-08-30_EVIDENCE.md`

  56-block PDF byte/cache/download/Yandex transfer-receipt and credential-boundary tranche from fresh `main`. No new P-number/status transition: P1-184 is revalidated because Yandex upload, existing-file reuse and crash recovery prove remote file content primarily with path/type/exact byte size; equal-length distinct byte sequences are therefore not distinguishable by the durable receipt. P0-079/P0-070 retain immutable operation-owned cache/end-to-end artifact identity; P1-146/P0-048 retain local download intent/blobURL/downloadId settlement with size-only fallback; P0-074/P0-073 retain one immutable Yandex auth/account/root/config/publication context; P0-023 preserves independent source-document generation; P0-077 gains the analogous backup-content receipt boundary. Positive controls preserve atomic cache body+metadata commit, session-only OAuth tokens, trusted-context storage, worker-only OAuth headers, signed Yandex HTTPS offscreen transfer without OAuth token, no redirects, bounded transfer reservations and OperationLog redaction. Security scope is limited to confidentiality/integrity/storage/safe transfer of extension data and credentials.

- `AUDIT_SAVED_COPY_READABILITY_2026-08-30_EVIDENCE.md`

  24-block fresh-source saved-copy readability / hyperlink / logical-text / rendered-form-state tranche. No new P-number/status transition: exact current CDP PDF proof refines P0-004 because selected-only filtering can leave a surviving internal `/Dest` annotation whose target/named destination is absent; P1-187 because flattened same-origin iframe cloning changes child-relative link base provenance and reverts a runtime-selected `<select>` option; P0-068/P1-213 retain duplicate-identity ownership when independently local frame fragment ids collapse into one PDF destination; P2-007 remains the explicit Print/Reader/semantic output-mode boundary for searchable/tagged text and visual-vs-logical reading order. P0-071/P0-066 remain supporting safe-link/privacy boundaries and P1-221 remains live-link rollback ownership. Managed Chromium 144 direct top-document current input/textarea/select/contenteditable printing, ordinary same-document fragment navigation, external URI annotations, generated pseudo text and SVG text are retained positive controls.

- `AUDIT_DEFERRED_VIRTUALIZED_MATERIALIZATION_2026-08-30_EVIDENCE.md`

  32-block fresh-source deferred/virtualized materialization fidelity tranche. No new P-number/status transition: P1-003 remains the deferred-resource/readiness owner because current native `loading=eager` and known `data-src`/`data-srcset` promotion are useful positive controls but there is no general page-owned IntersectionObserver/scroll materialization phase, and exact `Page.printToPDF` does not trigger missing viewport intersections. P2-007 remains the primary current-view versus expanded/complete-logical capture-mode boundary: clean physical probes show an unscrolled infinite feed stays at two batches while explicit scrolling expands it to five, and a 100-item virtual list represented by eight reusable DOM rows prints only the current eight-row window. P0-070/P0-004 retain selection-generation ownership when one selected reusable row changes from logical item 003 to 053 before physical cut; P1-160 retains auto-content's current-mounted-window limitation; P1-167 requires any future expansion/materialization loop to be globally bounded and truthfully partial/unknown on non-convergence. One contaminated shared-page exploratory scroll schedule is explicitly rejected; only isolated fresh-page schedules are retained.

- `AUDIT_LONGPAGE_TOPLAYER_PAGINATION_2026-08-30_EVIDENCE.md` + `AUDIT_LONGPAGE_TOPLAYER_PAGINATION_FINAL_2026-08-30_EVIDENCE.md`

  48-block interruption-safe long-page/fixed/sticky/top-layer/retained-scroll-ancestor pagination tranche from fresh `main`. No new P-number/status transition: exact-CDP physical PDF proof strongly refines P0-004 because a complete included descendant within retained fixed/sticky/absolute/ordinary `overflow:auto`/`overflow:clip`/`contain:paint`/top-layer scroll viewports can collapse to one page and preserve only 15–33 of 140–180 named items, with live nested scroll position selecting a different middle slice. Forced screen media can suppress an author print expansion that preserves all content. Capture-only static/unclipped controls restore 140/140 or 180/180; ordinary sticky, a transformed containing-block fixed descendant, long transformed flow, `contain:layout`, `max-height` with visible overflow, and giant `break-inside:avoid` are positive controls. P2-007 owns current-view versus expanded/static semantics; P0-070 physical-generation truth; P1-187 frame parity; P1-167 bounded expansion; P0-075 capture isolation. Current diagnostics already expose selected/ancestor scroll-height and style mismatches, but the worker records them after PDF-byte generation without gating save success.

- `AUDIT_COMPOSED_RENDERED_SCOPE_CONVERGENCE_2026-08-30_EVIDENCE.md` + `AUDIT_COMPOSED_RENDERED_SCOPE_CONVERGENCE_STAGE2_2026-08-30_EVIDENCE.md` + `AUDIT_COMPOSED_RENDERED_SCOPE_CONVERGENCE_STAGE3_2026-08-30_EVIDENCE.md` + `AUDIT_COMPOSED_RENDERED_SCOPE_CONVERGENCE_FINAL_2026-08-30_EVIDENCE.md`

  56-block interruption-safe composed/rendered-scope convergence tranche from fresh `main`. No new P-number/status transition: direct slot/PDF/resource/frame probes refine P0-004/P0-070 because precise slotted-light selection can admit unrelated shadow siblings/frames and can become zero-box or be replaced by fallback after slot reassignment, including in `beforeprint`; P1-003/P1-167 because inactive unslotted light nodes can consume the top 5000-element and frame-agent first-100 image budgets before visible slotted resources; P1-182/P1-001 because locators can persist physically invisible unslotted sibling plaintext and light structural order while missing composed reading order; P1-004/P1-193 because 256 invisible remote frames can consume the exact frame-candidate cap and suppress one visible origin; P1-227/P1-160 because inactive same-origin frame/semantic/disclosure branches consume topology/candidate/mutation work. Reference controls show active slot traversal with identity dedup can reach visible resources while skipping thousands of inactive light nodes under a smaller budget. P0-075, P0-080, P1-228, P2-006/P2-007 and downstream frame representation owners remain supporting boundaries; `P1-230` remains deliberately unallocated.

## Families

| # | Family | Consolidated evidence | Primary owners / scope | Retired deltas |
|---:|---|---|---|---:|
| 1 | Backup / scheduler / remote recovery generation | `AUDIT_FAMILY_BACKUP_RECOVERY_GENERATION_EVIDENCE.md` | P1-076, P1-077, P1-117, P1-177, P1-184, P1-194, P1-207, P1-208, P1-210, P0-074. | 25 |
| 2 | Yandex auth / config / immutable operation context / Settings UI | `AUDIT_FAMILY_YANDEX_AUTH_CONFIG_EVIDENCE.md` | P0-074, P0-078, P1-157, P1-158, P1-165, P1-175, P1-178, P1-184, P1-195, P1-196, P1-210, P1-222, P1-223. | 24 |
| 3 | Yandex remote object identity / move / publication / destructive lifecycle | `AUDIT_FAMILY_YANDEX_REMOTE_IDENTITY_EVIDENCE.md` | P0-022, P0-040, P0-069, P0-072, P0-073, P0-074, P0-078, P1-090, P1-164, P1-175, P1-184, P1-210. | 21 |
| 4 | Backup restore/import from Yandex | `AUDIT_FAMILY_BACKUP_RESTORE_EVIDENCE.md` | P0-013, P0-022, P0-073, P0-074, P1-035, P1-069, P1-184, P1-210, P1-215. | 4 |
| 5 | Journal import / provenance / portable schema / legacy identity | `AUDIT_FAMILY_JOURNAL_IMPORT_PROVENANCE_EVIDENCE.md` | P0-013, P0-022, P0-073, P0-076, P0-077, P1-030, P1-035, P1-042, P1-069, P1-206, P1-211, P1-215, P1-216. | 15 |
| 6 | Journal read/view revision / pagination / open/apply / bulk authority | `AUDIT_FAMILY_JOURNAL_VIEW_AUTHORITY_EVIDENCE.md` | P0-076, P0-080, P1-001, P1-009, P1-175, P1-206, P1-210. | 18 |
| 7 | Journal comments / tombstones / edit generations | `AUDIT_FAMILY_JOURNAL_COMMENTS_EVIDENCE.md` | P0-076, P1-202, P1-211, P1-225 | previously consolidated |
| 8 | Operation receipt / OperationLog / user reconciliation | `AUDIT_FAMILY_OPERATION_RECEIPTS_EVIDENCE.md` | P1-145, P1-197, P1-198, P1-205, P1-210 and durability/maintenance owners. | 15 |
| 9 | Local download / native Save As / file settlement | `AUDIT_FAMILY_LOCAL_DOWNLOAD_SAVEAS_EVIDENCE.md` | P0-039, P1-079, P1-080, P1-087, P1-129, P1-146, P1-156, P1-169, P1-210. | 12 |
| 10 | Chrome/MV3 APIs / browser-owned state / extension-page transport | `AUDIT_FAMILY_CHROME_MV3_SETTLEMENT_EVIDENCE.md` | P1-123…P1-131, P1-157, P1-158, P1-166, P1-170, P1-173, P1-203, P1-204, P1-209, P1-210, P1-217. | 17 |
| 11 | Frame permission / cross-origin frame-agent identity and command generation | `AUDIT_FAMILY_FRAME_PERMISSION_IDENTITY_EVIDENCE.md` | P1-004, P1-157, P1-171, P1-193, P1-199…P1-203, P1-214, P1-229. | 12 |
| 12 | PDF/print / offscreen resource lifetime / live-DOM rollback / source generation | `AUDIT_FAMILY_PDF_PRINT_OFFSCREEN_EVIDENCE.md` | P0-004, P0-003, P0-023, P0-063, P0-065, P0-067, P0-068, P0-070, P0-071, P0-075, P0-080, P1-003, P1-069, P1-149…P1-153, P1-160, P1-167, P1-187, P1-199, P1-212…P1-214, P1-218…P1-224, P1-226, P1-227, P1-228, P1-229. | 26 |
| 13 | Incognito / trust boundaries / signed-link redaction | `AUDIT_FAMILY_PRIVACY_TRUST_EVIDENCE.md` | P0-033, P0-045 | previously consolidated |
| 14 | Derived URL stats / view indexes | `AUDIT_FAMILY_URLSTATS_EVIDENCE.md` | P0-050 | previously consolidated |
| 15 | Retired broad revalidation / cross-cutting inventories | `AUDIT_CROSSCUTTING_REVALIDATION_EVIDENCE.md` | cross-cutting historical controls | previously consolidated |

## Current reading rule

1. Read `AUDIT_REGISTRY.md` for current status and ownership.
2. Use the family evidence above and supplemental durable evidence for detailed source proof, deterministic schedules, corrections, positive controls and acceptance boundaries.
3. Use `AUDIT_HISTORY_INDEX.md`, `AUDIT_EVIDENCE.md`, `AUDIT_RETIRED_DELTA_EVIDENCE.md`, `TEST_EVIDENCE.md` and Git history for historical implementation/test context.
4. Never infer that a P-number is free from absence in one family document; permanent numbering rules in `AUDIT_REGISTRY.md` control allocation.