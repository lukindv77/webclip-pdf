# Retired audit-delta evidence

This document preserves unique corrections and positive controls from `AUDIT_DELTA_*` files that have passed a lossless retirement comparison and can therefore leave the current working tree.

It is **not** the current status registry. Current owner/status/acceptance authority remains the audit registry/priority layer. Git history preserves the exact original delta text.

## Retirement rule

A delta may be retired only when all of the following are true:

1. it introduces no independent unresolved owner whose only acceptance text lives in that delta; or that owner/acceptance already exists in the canonical registry;
2. any unique correction/retraction is copied here or to `AUDIT_HISTORY_INDEX.md`;
3. any unique positive source proof/regression guard is copied here or `AUDIT_EVIDENCE.md`/`TEST_EVIDENCE.md`;
4. current status is not inferred from the delta's historical test note;
5. exact source remains recoverable from Git history.

## 2026-08-29 retirement batch 1

### P1-076 backup lease remote-phase liveness — corrected proof retained

Retired sources:

- `AUDIT_DELTA_BACKUP_LEASE_REMOTE_PHASE_EXPIRY_2026-08-28.md`
- `AUDIT_DELTA_BACKUP_LEASE_REMOTE_PHASE_CORRECTION_2026-08-28.md`

The first delta correctly identified a semantic ownership problem: backup A can lose a fixed 10-minute lease while an operation capable of later resuming/publishing side effects remains live; a successor B could then acquire a newer lease, while stale A may later resume and publish state without revalidating ownership.

One supporting argument in the first delta was wrong and is explicitly retired: deep Yandex root traversal is **not** an unbounded proof. Existing P1-034 controls already bound normalized root length to 2048, path segments to 32 and the aggregate folder-tree operation to 90 seconds, with each request receiving only the remaining budget.

The current concrete overlap proof instead composes **P1-076 with P1-158**: `yandexApi()` awaits `getValidYandexAccessToken()`/`readYandexAuthState()`, and the audited P1-158 path contains an unbounded `chrome.storage.local.get('yandexConfig')` before the bounded HTTP fetch deadline is established. That prerequisite can outlive the 10-minute lease.

Preserved semantic acceptance:

- exclusive backup authority must not expire while any stage that can later resume and publish remote/state side effects remains live;
- this may be solved by heartbeat/renewal, one strict whole-operation deadline proven below lease duration, or actual-settlement receipt admission that blocks/supersedes successors safely;
- stale A must not publish current success/coverage after losing ownership;
- lease expiry is not cancellation evidence for an actually unsettled prerequisite/remote attempt;
- preserve P1-034 as a positive control, not a broken dependency;
- regression should hang `chrome.storage.local.get('yandexConfig')` beyond lease TTL and prove B cannot create an unsafe overlap or that A is permanently fenced before it can resume/publish.

No new P-number was created; P1-076 remains lease owner and P1-158 supplies the current unbounded prerequisite proof.

### Context-menu child-frame click origin — positive control

Retired source:

- `AUDIT_DELTA_CONTEXT_MENU_ORIGIN_FRAME_SEMANTICS_REVALIDATION_2026-08-28.md`

Current context-menu commands are tab/top-document WebClip session commands. Although Chrome `OnClickData` may include child `frameId`/frame URL, `handleContextMenuClick()` deliberately routes ordinary commands to the top-frame content script and does not treat the click-origin frame as implicit authority.

Fresh revalidation found **no new defect** in that omission. Treating `info.frameId` as automatic authority would be unsafe because right-clicking an untrusted child frame must not bypass optional-host-permission/frame-agent admission.

Preserved boundaries:

- `info.frameId` is provenance/diagnostic context unless a future command is explicitly frame-local;
- P0-070 still owns exact top-document save/PDF generation fencing;
- P1-171/P1-004 still own exact child document/permission generation;
- P1-204 still owns browser-owned context-menu rebuild generation across MV3 worker lifetimes;
- a future frame-local command must explicitly bind `{tabId, frameId, documentId/navigation generation, permission generation}`.

### Imported Journal URL-derived scope keys — positive control

Retired source:

- `AUDIT_DELTA_IMPORTED_URL_DERIVED_SCOPE_KEYS_REVALIDATION_2026-08-28.md`

`normalizeImportedJournalEntry()` normalizes the imported HTTP URL and recomputes authoritative `urlKey` and `siteKey`; it does not trust `raw.urlKey` or `raw.siteKey`. Current view/scoped-clear identity is likewise derived from normalized URLs rather than arbitrary imported derived keys.

Preserved boundary:

- raw imported `hostname`/`siteAddress` may remain bounded descriptive metadata but must not become stronger current scope/destructive authority when a valid URL exists;
- current destructive generation/CAS remains P0-076;
- imported Yandex provenance remains P0-022/P0-073;
- composed Journal view revision remains P1-206.

Regression guard: valid URL A plus forged raw keys for B must store/use A-derived keys; future schema migration must not promote raw derived keys without explicit validation/version semantics.

### Journal export revision-writer coverage — positive control

Retired source:

- `AUDIT_DELTA_JOURNAL_EXPORT_REVISION_WRITER_COVERAGE_REVALIDATION_2026-08-28.md`

Fresh inventory found no current authoritative `JOURNAL_STORE` writer bypassing the Journal revision contract used by full export/backup. Current append, entry update, delete, clear and replace-import mutations advance `JOURNAL_META_REVISION_KEY` in the same IndexedDB transaction as the source-row change.

Therefore `stageFullJournalExportOnce()` may use before/after revision snapshots as evidence that no committed authoritative source-row mutation occurred between its boundary reads. Derived stats, pending stores and staging data are not source rows and correctly do not independently advance source revision.

This does **not** close P1-206 composed-view revision coherence, backup source-revision binding to remote/account/root generation, or retry/deadline policy.

Regression guard: any future direct authoritative Journal source-row writer or migration must participate atomically in the same revision-generation contract.

### OperationLog detail one-transaction snapshot — positive control

Retired source:

- `AUDIT_DELTA_OPERATION_LOG_DETAIL_TRANSACTIONAL_SNAPSHOT_REVALIDATION_2026-08-28.md`

`getOperationLog(operationId)` first observes/awaits the current per-operation write tail when present, then reads operation header and exact operation event timeline in **one** bounded readonly IndexedDB transaction and publishes only after transaction completion.

A later writer may validly fall before or after that readonly snapshot; the returned detail itself is coherent rather than a mixed header/events view from separate transactions.

This does not close P1-197 clear/history generation, P1-205 retention-vs-writer ordering, P1-198 receipt authority, post-snapshot writer admission or UI latest-request generation.

Regression guard: future optimization must not split header and timeline into independent transactions without an equivalent shared snapshot/history receipt.

### Exact transfer-group deletion — positive control

Retired source:

- `AUDIT_DELTA_TRANSFER_GROUP_DELETE_OWNERSHIP_REVALIDATION_2026-08-28.md`

Fresh revalidation did not prove a new correctness blocker in `deleteTransferPayloadGroup()`.

Preserved controls:

- a group key selects exactly `id === key` or `id.startsWith(key + ':chunk:')`, including the delimiter, so group A does not select AB/A2;
- staging/export flows generate fresh random group identities rather than normally reusing a stable physical owner key for successive generations;
- selection and deletion occur inside one readwrite IndexedDB transaction, giving transaction atomicity rather than a readonly-snapshot/later-blind-delete CAS gap;
- cleanup has a bounded deadline and timeout/abort does not prove cross-generation deletion.

This conclusion is deliberately narrower than P1-035. Generic TTL cleanup can still delete a live long-lived import staging generation and remains owned by P1-035. Storage admission remains P1-043; staged import source/content authority remains under the import receipt owners.

If future code introduces user-supplied/reused base ids, this positive conclusion must be re-audited.

### Yandex restore encoded-byte limit — positive control

Retired source:

- `AUDIT_DELTA_YANDEX_RESTORE_DOWNLOAD_BYTE_LIMIT_REVALIDATION_2026-08-28.md`

Despite a misleading service-worker field name `maxChars`, the signed `text-download` offscreen path converts/clamps the value as **bytes** to `MAX_JOURNAL_IMPORT_BYTES = 50 MiB`.

`stageResponseBodyAsJournalImport()` checks `Content-Length` when available, requires a streaming reader, counts each `Uint8Array.byteLength`, rejects/cancels when total encoded bytes exceed the cap, and stages bounded byte chunks instead of decoding the complete response to one JS string first. Transfer admission/reservation is also expressed in the same physical byte scale and is later resized to actual staged bytes.

Therefore multibyte UTF-8 content cannot bypass the 50 MiB network/materialization bound merely because decoded character count is smaller.

The `maxChars` name is interface debt and should eventually become `maxBytes`, but fresh source proof did not justify a new correctness P-item from naming alone. Parser/schema/per-field/deadline limits remain separate owners.

Regression guard: >50 MiB streamed bodies must fail on encoded bytes even without Content-Length; multibyte bodies are byte-counted; streaming-unavailable response fails closed; reservation remains held through actual settlement.

## Interpretation

All source deltas above were docs-only checkpoints and repeated the historical 88/88 syntax + 74/74 deterministic result without rerunning it. Their retirement does not upgrade that historical gate to a current test result.

## 2026-09-01 final temporary-delta retirement

Retired source: `AUDIT_DELTA_SELECTION_CAPTURE_FIDELITY_2026-08-29.md`.

Provenance:

- exact source is present on `main` at `feadab448ef05163cee7815b7f7644e3ee4ebf92` before this retirement;
- Git blob hash for the exact UTF-8 source is `438bf6a4b2e3318d0efcfb97ef778da30f2f0faa`;
- original audit baseline recorded by the source is `cef798f693ce5a7d4573484baf819389ace079af`;
- current P-code authority remains `AUDIT_REGISTRY.md` (not the historical text below);
- durable current supporting summary remains `AUDIT_SELECTION_CAPTURE_FIDELITY_EVIDENCE.md`.

The source text below is preserved **verbatim** so the standalone temporary delta can leave the working tree without losing source proof, browser reproductions, dedup decisions, positive/negative controls or acceptance detail.

<!-- BEGIN VERBATIM AUDIT_DELTA_SELECTION_CAPTURE_FIDELITY_2026-08-29.md -->
# Audit delta — selection / capture fidelity — 2026-08-29

Baseline canonical `main`: `cef798f693ce5a7d4573484baf819389ace079af`.

This is audit evidence, not an implementation checkpoint. Production runtime, `manifest.json`, release state and historical product-test claims are unchanged.

Canonical current status remains in `AUDIT_REGISTRY.md`. This delta records source proof, policy-safe browser reproductions, dedup decisions, positive controls and external web-clipping research from a 16-block deep-audit tranche.

## Executive result

Two audit-status changes are justified:

1. **P0-004 is ACTIVE again with a broader selected-PDF fidelity contract.** The exact historical P1-153 `its.1c.ru` root-document pagination bug stays DONE; this is a different root cause. Current selected-only print CSS keeps ordinary ancestors of an Include alive without normalizing their clipping/layout/visual effects, and does not neutralize clipping on the Include root itself. Those constraints can truncate selected descendants or inject unselected presentation into the PDF.
2. **New P1-226 is ACTIVE.** Same-origin iframe selection geometry is projected to the top viewport by simple rectangle addition, which is wrong for iframe border/content-box offsets and CSS transform/scale/zoom. The same geometry drives hover/selected outlines, candidate usability and independent-selection overlap rejection.

No new owner is assigned for Shadow DOM, flattened-frame rendered state, disclosure activation, general deferred-content strategy, Reader-mode extraction, ordinary flex/grid/multicol/table pagination or the tested content-visibility/SVG cases: those observations either refine existing owners or are retained as negative controls.

## Block 1 — same-origin iframe geometry: new P1-226

### Source proof

`content.js::rectRelativeToTopViewport(element)` starts from the child element's `getBoundingClientRect()`, then walks to the top document and performs only:

```text
left += frame.getBoundingClientRect().left
top  += frame.getBoundingClientRect().top
```

The returned width/height remain the child rectangle width/height. `getDocumentRect()` derives from this result, and the result feeds:

- `isUsableCandidate()`;
- `elementsVisuallyOverlap()`;
- hover outline placement;
- selected/excluded/suggestion outline placement.

A child viewport coordinate is relative to the iframe's **content box**, while the parent `frame.getBoundingClientRect()` describes the transformed **border box**. An outer transform/scale also changes the child's rendered dimensions in the parent coordinate space. Simple addition therefore does not compose the coordinate spaces.

### Policy-safe browser reproduction

Chromium 144 probe:

- iframe parent position: left 100 px, top 50 px;
- iframe border: 10 px;
- iframe `transform: scale(.5); transform-origin: 0 0`;
- child element rect inside the iframe: left 30 px, top 40 px, width 100 px, height 50 px.

WebClip-equivalent simple addition predicts approximately:

```text
left=130, top=90, width=100, height=50
```

The rendered child box in top-document coordinates is approximately:

```text
left=120, top=75, width=50, height=25
```

The mismatch exists without transform because border must be accounted for; scale/transform magnifies the semantic error and nested frames compose it repeatedly.

### Why this is independent

- P1-004 is the cross-origin iframe feature umbrella.
- P1-171 owns cross-origin frame/document identity and navigation generation.
- P2-006 owns Shadow DOM selection scope.
- No current owner/family/history item found owns same-origin child-to-top visual coordinate transformation for selection UI and overlap authority.
- Git/code history search found no prior P1-226 assignment.

### P1-226 acceptance

1. Child coordinates are mapped through iframe content-box offset, border and transform/scale/zoom semantics rather than raw rect addition.
2. Nested same-origin frame transforms compose correctly at every level.
3. Hover and selected/excluded outlines match the actual rendered target.
4. `isUsableCandidate()` and `elementsVisuallyOverlap()` use the same truthful visual coordinate model.
5. Scrolling in child and ancestor documents preserves alignment.
6. A transformed/bordered iframe cannot make two visually independent selections appear overlapping or vice versa.
7. Cross-origin frame-agent selection remains separately generation/permission fenced by its existing owners.

## Block 2 — ordinary ancestor clipping truncates selected PDF: P0-004

### Source proof

`installPrintStylesForSelectionDocuments()` broadly normalizes `html, body`, and separately normalizes explicit selected iframe/frame-chain markers. For an ordinary top-document Include it keeps every ancestor alive through `:has([data-webclip-pdf-include])`, but does not neutralize ordinary ancestor `overflow`, fixed/sticky positioning, `contain`, height or clipping.

Thus the print representation is still subject to host-page layout containers that were designed as viewports rather than archival flow.

### Browser reproduction matrix

A selected article contained `TOP_MARKER`, roughly 1100 px of content and `BOTTOM_MARKER`. It was placed inside one unselected structural ancestor. Under WebClip-equivalent selected-only print CSS:

- `height:180px; overflow:hidden` -> TOP present, BOTTOM missing;
- `height:180px; overflow:auto` -> BOTTOM missing;
- `height:180px; overflow:clip` -> BOTTOM missing;
- `height:180px; contain:paint` -> BOTTOM missing;
- `position:fixed; left:0; top:0; width:650px` -> long selected content truncated to one page, BOTTOM missing;
- `position:sticky; top:0; height:180px; overflow:auto` -> BOTTOM missing.

Control: `max-height:180px; overflow:visible` did not reproduce the loss, and transform-only/ordinary absolute-layout probes did not justify a blanket rule that every positioning/transform must be removed. The acceptance requirement is therefore outcome-based: structural ancestors must not clip selected archival content.

### Classification

No new P0 is allocated. Existing family evidence identifies **P0-004 as the PDF fidelity owner**. P1-153 remains DONE for its exact historical root html/body pagination root cause; its regression only proves root normalization, not arbitrary selected ancestor chains.

## Block 3 — unselected ancestor presentation leaks into selected PDF: P0-004

The same `:has([INCLUDE])` rule keeps structural ancestors in the printed tree as normal rendered elements.

Browser control:

- wrapper `::before` emitted `WRAPPER_BEFORE_UNSELECTED`;
- wrapper `::after` emitted `WRAPPER_AFTER_UNSELECTED`;
- only a child article carried Include;
- unrelated normal sibling text was correctly hidden.

Generated PDF text contained both unselected wrapper pseudo strings plus the selected article. This proves the ancestor is not merely structural scaffolding: page-owned ancestor pseudo/background/border/mask presentation can contaminate a supposedly selected-only copy.

P0-004 acceptance is therefore **complete and selection-bounded**, not merely “selected nodes remain present.”

## Block 4 — Shadow DOM selection scope: existing P2-006

Browser probe with an open shadow root showed document-level capture listeners receive the shadow host as `event.target`, while the inner clicked node appears only in `event.composedPath()[0]`. Current `onPageClick()`/`onMouseMove()` use `event.target`, and auto-content candidate queries do not traverse shadow roots.

Result: precise inner Shadow DOM selection is not supported. This is not new: **P2-006 already owns Shadow DOM as explicit selection scope**.

## Block 5 — pseudo-element positive control

When the explicitly Included element itself owns `::before`/`::after`, Chromium print preserves those generated contents. Therefore there is no generic “pseudo-elements are lost” finding. The defect from Block 3 is specifically unselected ancestor presentation leaking through structural ancestors.

## Block 6 — live form-state positive control

A policy-safe Chromium print probe changed DOM properties after initial markup:

- input `.value` to a new value;
- textarea `.value` to a new value.

The PDF contained the current values rather than the original markup defaults. Top-document live printing therefore preserves these basic current form-text states; no new owner is allocated from this probe.

## Block 7 — flattened same-origin iframe rendered state: P1-187 refinement

`createFlattenedBodyFramePrintProxy()` deep-clones child nodes and copies a bounded subset of computed styles. Browser `cloneNode(true)` controls showed:

- canvas bitmap is not carried into the clone;
- a `<select>` whose current selection differs from markup can revert to markup/default selection in the clone;
- several simpler properties such as ordinary checkbox checked state may survive in current Chromium and are not sufficient evidence of complete state preservation.

P1-187 already requires the flattened proxy to preserve required rendered state “such as canvas bitmap.” Refine its acceptance to include current select/form and other renderer-owned state where cloning does not preserve the visible value. No new P-code.

## Block 8 — disclosure expansion: active P0-067 / P1-212 confirmed

Native `<details>` has a safe local representation path: current code sets `details.open = true`, and a browser control confirmed closed details omit inner text from print while `open=true` makes it printable.

Custom disclosure fallback still calls `triggerInternalClick(control)`, which invokes `control.click()`. This is direct current-source confirmation of active **P0-067 / P1-212**, not a new root cause. The eventual isolated print representation should reveal printable content without firing page-owned control handlers.

## Block 9 — deferred/lazy resource capture: P1-003 plus P2-007 boundary

Current `prefetchIncludedResources()` has useful bounded support:

- common `data-src` and `data-srcset` promotion;
- `<source data-srcset>`;
- `loading=lazy` -> eager;
- computed CSS background-image preload;
- font readiness;
- shared 15 s deadline, 500-resource cap, concurrency 8, <=5000 element scan and bounded failure report.

Historical P1-003 browser regression proves this path for representative lazy images/background/fonts.

What it does not provide is a general deferred/virtualized-content materialization strategy. Site-specific lazy attributes, IntersectionObserver-only sections, virtual scrollers or content created only after scrolling can still be absent. This is not classified as a fresh P1 merely because arbitrary sites use different conventions. It is a deliberate architectural boundary between P1-003 resource readiness and P2-007 capture modes/strategies.

## Block 10 — cross-origin frame-agent fidelity parity: P0-004

`frame-agent.js::preparePrint()` injects selected-only print CSS but only normalizes `html,body { overflow:visible; height:auto; max-height:none }`. It does not normalize ordinary ancestor chains around a selected child.

Therefore the ancestor-clipping P0-004 reproduction is not top-document-only; the same class can exist inside a granted cross-origin frame. It remains the same fidelity root cause, not a new frame identity owner.

## Block 11 — auto-content / Reader extraction: P1-160 + P2-007

Current `detectMainContent()` scores semantic selectors and broad `div/section` candidates using text length, paragraph/headline/image/list/table counts, link density and marker heuristics across accessible same-origin documents.

The path is intentionally heuristic. P1-160 already owns bounded discovery. Mozilla Readability demonstrates a mature separate article-extraction architecture with explicit candidate scoring and `maxElemsToParse`; it is still a heuristic extractor, not a correctness oracle for every site.

Conclusion: a Reader/Simplified mode should remain a distinct capture mode under P2-007 rather than silently becoming the fidelity definition for manual Selection/Print PDF.

## Block 12 — external web-clipping architecture research

Fresh web research was performed as required by the project audit policy.

### Evernote Web Clipper

Reference: https://help.evernote.com/hc/en-us/articles/209125827-Clip-formats

Evernote separates Article, Multi-Select, Simplified Article, Full Page, Bookmark, Screenshot, PDF and Selection. Its help explicitly frames Full Page as a static copy preserving original format/layout while Simplified Article removes formatting/layout, and Multi-Select/Selection are user-directed scopes.

**Transferable lesson:** “faithful visual page,” “reader extraction,” and “exact selected content” are different user contracts. P2-007 is architecturally justified; correctness should be tested per mode.

### SingleFile

Reference: https://github.com/gildas-lormeau/SingleFile/blob/master/src/ui/pages/help.html

SingleFile supports current tab, selected content and selected frame. It exposes “save deferred images/frames” as best effort, bounded by configurable idle time, with optional scroll dispatch/zoom-out behavior and explicit warnings about site-dependent behavior.

**Transferable lesson:** deferred/virtualized content needs an explicit capture strategy and truthful best-effort/failure semantics; silently assuming current DOM is complete is insufficient.

### Save Page WE

Reference: https://chromewebstore.google.com/detail/save-page-we/dhhpefjklgkmgeafimnjhojgjamoafof

Save Page WE describes saving the page “as currently displayed” into a single HTML representation and exposes lazy-content loading behavior as an option.

**Transferable lesson:** archival fidelity and lazy materialization are product policy, not one universally safe hidden mutation.

### Mozilla Readability

Reference: https://github.com/mozilla/readability

Readability is a dedicated article extractor and exposes parsing limits such as `maxElemsToParse`.

**Transferable lesson:** Reader extraction should have explicit complexity limits and its own acceptance criteria instead of being conflated with exact manual selection.

### snapDOM

Reference: https://github.com/zumerlab/snapdom/blob/main/FEATURES.md

snapDOM documents a frozen-capture approach that traverses Shadow DOM, snapshots computed styles, rasterizes same-origin iframe content, converts canvas/video rendered state, preserves form-control state and composes transforms with matrix/origin-aware geometry.

**Transferable lesson:** WebClip's existing P0-075 direction toward an isolated/frozen print representation is technically sound. In particular, P1-226 geometry and P1-187 live rendered state are known capture-engine concerns rather than exotic edge cases.

## Block 13 — clipping on the Include root itself: P0-004 refinement

The previous ancestor reproduction is not the full boundary. Current print CSS only gives `[INCLUDE] { break-inside:auto; }`; it does not neutralize `height + overflow` on the selected root itself.

Chromium 144 policy-safe probes with the Include carrying `height:180px` showed:

- `overflow:auto` -> TOP present, BOTTOM missing;
- `overflow:hidden` -> TOP present, BOTTOM missing.

Therefore the P0-004 contract must cover **both the Include root and structural ancestor chain**. A user selecting a scrollable article/card/document viewport is authorizing the contained selected content, but current print semantics can preserve only the viewport slice.

## Block 14 — paged-layout negative controls

The audit must not infer “all non-block layout is unsafe” from the clipping reproductions. Long Include roots were tested with ordinary:

- `display:flex; flex-direction:column`;
- `display:grid`;
- `column-count:2`;
- table-like flow.

In these probes both TOP and BOTTOM markers survived pagination. No independent flex/grid/multicol/table root cause is registered from this tranche.

This matters for implementation: the P0-004 fix should target proven clipping/selection-boundary constraints rather than flattening every selected layout into generic block flow.

## Block 15 — content-visibility negative control

A long Include using `content-visibility:auto; contain-intrinsic-size:2000px` retained both TOP and BOTTOM markers in the tested Chromium PDF path. Current `html/body` print normalization also forces root `content-visibility:visible`, but this probe shows no basis for a generic “content-visibility always loses selected content” owner.

Site-specific virtualized DOM can still be incomplete before print and remains part of the explicit deferred-content strategy boundary from Block 9.

## Block 16 — SVG print positive control and rendered-state boundary

Top-document selected SVG text and a same-document SVG `<use href="#...">` control both appeared in generated PDF text under the selected-only print stylesheet. No generic SVG-loss owner is registered from this pass.

This contrasts usefully with Block 7: live browser-native print preserves ordinary top-document rendered state better than `cloneNode(true)`-based iframe flattening. The architectural problem is not “PDF cannot represent these primitives”; it is the fidelity gap introduced when WebClip builds a secondary cloned representation without explicitly freezing renderer-owned state.

## Consolidated acceptance impact

### P0-004

1. Included content inside `overflow:hidden|auto|clip`, paint containment, fixed/sticky and equivalent clipping **on the Include root or its structural ancestors** remains complete in the actual PDF.
2. Structural ancestors needed to preserve layout do not contribute unselected pseudo/generated/background/border/mask presentation unless the user selected that presentation by the defined mode.
3. The same completeness/selection-bound contract holds in granted cross-origin frame-agent printing.
4. Selecting the ancestor itself can still preserve its intended appearance; the solution must distinguish structural scaffolding from selected presentation.
5. Ordinary flex/grid/multicol/table layouts that already paginate correctly must not be needlessly flattened or degraded by the fix.
6. The solution composes with P0-075 isolated/frozen representation and does not rely on unsafe permanent host DOM mutation.
7. Historical P1-153 root-document pagination remains a regression control but is not treated as blanket proof of selected-subtree fidelity.

### P1-187

Add current `<select>`/form and other non-markup renderer state to the existing flattened-frame live-state matrix alongside canvas, under explicit budget and inertness requirements.

### P0-067 / P1-212

Current `control.click()` remains a live reproducer; native-details behavior demonstrates that disclosure fidelity can be achieved without page-owned activation for at least the native case.

### P1-003 / P2-007

Retain bounded current resource readiness; treat general lazy/virtualized materialization as explicit capture-mode policy with truthful completeness diagnostics rather than unlimited scrolling or hidden side effects.

## Test / release boundary

- Browser probes in this audit tranche are policy-safe Chromium semantic reproductions, not real unpacked-extension release QA.
- No production code was changed by this audit delta.
- No manifest/version/build/tag/Release change is implied.
- Historical 88/88 JavaScript syntax + 74/74 deterministic PASS remains historical evidence until the repository CI for this audit PR runs.
- Real unpacked Chrome, optional-host permission UI and real Yandex OAuth/API E2E remain mandatory external release gates.
<!-- END VERBATIM AUDIT_DELTA_SELECTION_CAPTURE_FIDELITY_2026-08-29.md -->
