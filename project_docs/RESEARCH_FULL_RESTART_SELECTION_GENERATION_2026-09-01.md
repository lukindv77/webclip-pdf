# WebClip — fresh restart selection / generation evidence — 2026-09-01

Date: 2026-09-01

Canonical product-source baseline: `main = 0d890993ff7cb4f1029cfa3cbda4358aa9c89299`.

Accepted evidence execution:

- temporary evidence head: `d82f31f264c43ea1015cc1acc1c40ed390f33e6d`;
- GitHub Actions workflow run: `33500051622`;
- job: `99831050769`;
- conclusion: **SUCCESS**;
- browser: Google Chrome for Testing `152.0.7977.64`;
- product runtime source was unchanged from canonical baseline throughout the evidence branch.

This is a fresh-restart coverage checkpoint, not an implementation or owner-status change. Historical results were used only to locate candidate fixtures; the claims below come from the current source and the accepted current execution.

## 1. Evidence shape and harness compatibility

The accepted run executed four probes against the current product source:

1. a temporary C01 live-selection versus durable-SelectionSnapshot physical probe using actual `content.js` selection/download preparation;
2. current `project_tools/research_selection_restore_physical_pdf.py` for C02;
3. current `project_tools/research_main_content_physical_pdf.py` for C03;
4. current `project_tools/research_pdf_cache_generation_authority.py` for exact cache-generation authority.

The two older physical research scripts still contained the legacy Playwright call `BrowserContext.new_page(viewport=...)`, which Playwright 1.55 no longer accepts. The temporary workflow transformed only those research-script calls in the runner checkout to `new_page()` plus `set_viewport_size()` while preserving each original indentation. No product file was rewritten by that compatibility step. The first two failed development executions were therefore harness/orchestration failures and are not evidence. Only run `33500051622` is accepted.

## 2. C01 — manual Include/Exclude / selected-scope authority

### Fresh physical finding — P1-154

The C01 probe created 251 independent visible sibling regions and selected all 251 through WebClip's actual click-selection listener. It then used the real download/preparation path and physically printed the prepared page.

Accepted result:

- live Include count before save: **251**;
- `pageAnalysis.selection.includeCount`: **251**;
- durable `selectionSnapshot.includes.length`: **250**;
- first selected marker physically present: `C01_ITEM_000 = true`;
- 251st selected marker physically present: `C01_ITEM_250 = true`;
- PDF bytes: `25678`;
- PDF SHA-256: `e374ea2b8e15382a0706a98f043c184a6acae3ce12809dbe2b047301a0a4f72b`.

This independently reproduces the existing P1-154 root: the live/physical selected scope can contain more regions than the durable SelectionSnapshot records. The physical PDF therefore proves that this is not merely a serialization-count discrepancy; durable provenance/restore authority can omit content that belonged to the actual saved copy.

No new owner is allocated.

## 3. C02 — SelectionSnapshot restore -> admitted target -> physical copy

The current C02 harness executed the actual `WEBCLIP_APPLY_SELECTION_SNAPSHOT` path followed by the actual WebClip download preparation and a physical Chromium PDF.

### Fresh positive controls

- **Stable restore:** benign insertion before an unchanged semantic target restored exactly one Include with high confidence; physical PDF contained `STABLE_TARGET_MARKER` and excluded the unrelated insertion.
- **Exclude restore:** one Include plus one nested Exclude restored with high confidence; physical PDF retained `KEEP_MARKER` and omitted `EXCLUDE_MARKER`.
- **Ambiguity fail-closed:** with two deliberately equal plausible targets, one stable guard Include restored while the ambiguous locator was counted as ambiguous and not applied; the ambiguous marker was absent from the PDF.
- **Same-origin frame restore:** a selected child-frame target restored after benign child insertion with high confidence; physical PDF contained the intended frame marker and omitted the unselected insertion.

These controls demonstrate that the current restore machinery has useful bounded positive behavior and that the findings below are not caused by a globally broken harness or universally wrong locator resolution.

### Fresh physical finding — rendered admission (P1-001)

Two current rendered-state cases were admitted as high-confidence restored Includes despite being absent from the physical copy:

- `visibility:hidden`: restored Includes `1`, high confidence `1`, geometry `620 x 72`, target marker absent physically;
- `opacity:0`: restored Includes `1`, high confidence `1`, geometry `620 x 72`, target marker absent physically.

The current `isUsableCandidate()` geometry-only admission therefore remains insufficient as rendered authority. This is a fresh L4 revalidation of existing P1-001, not a new owner.

### Fresh physical finding — bounded candidate prefix can choose a decoy

The exact original target was placed outside the first 5000 same-tag candidates while an in-prefix decoy shared enough semantic attributes to receive high confidence. Current restore reported one restored Include with high confidence and selected `decoy`; the physical PDF contained the decoy marker and omitted the exact target marker.

This remains part of the existing SelectionSnapshot restore-soundness ownership region; it does not justify a new P-code merely because the discriminator uses the current 5000-candidate bound.

### Fresh physical finding — disconnected selected authority (P0-080)

A restored selected element was then replaced in the live DOM. Before replacement the live selected id was `stale`; afterwards there were zero live `[data-webclip-pdf-include]` nodes. WebClip nevertheless admitted the save from stale in-memory selection state and produced a physical PDF containing neither the old selected marker nor the unselected replacement marker.

This independently revalidates P0-080: save admission does not require the selected authority to still designate connected current content.

## 4. C03 — Main Content / auto candidate -> physical saved scope

The current C03 harness executed actual `start` -> `auto-content` -> download preparation and physical Chromium print.

### Fresh positive controls

- a credible semantic article beat unrelated navigation/footer shell and was the only physical selected scope;
- a `display:none` semantic competitor did not beat a visible credible article;
- a strong same-origin child-frame article was selected at `top/main-frame` and reached the physical PDF while the top shell stayed out.

### Fresh physical finding — weak BODY fallback (P1-160)

A page containing only navigation/footer-like text still produced one automatic Include: top-document `body`. The physical PDF contained both `NAV_ONLY_MARKER` and `FOOTER_ONLY_MARKER`.

Thus the fallback path still converts low-confidence/no-main-content pages into a seemingly successful automatic scope instead of requiring a confidence/ambiguity boundary. This freshly revalidates P1-160.

### Fresh physical finding — equal candidates resolve by traversal order (P1-160)

Two equal semantic articles resulted in `equal-a`, the first DOM candidate, being selected and physically printed while `equal-b` was omitted. There is no ambiguity/manual-fallback result for this tie. This is the same P1-160 confidence/ambiguity root, not a new owner.

### Fresh physical finding — disconnected auto selection (P0-080)

After a credible auto-selected article was replaced, live Includes became empty, but save still proceeded. Physical output contained neither the original selected marker nor the unselected replacement. This is the same stale selected-authority defect independently observed through the auto-content entrypoint.

### Fresh physical finding — in-place mutation after admission (P0-070 / P0-075 region)

After auto scoring selected `mutating-auto`, the same Element object remained selected but its logical text was replaced before save. Physical output contained `MUTATED_AFTER_AUTO_MARKER` and omitted the content that originally justified selection.

This demonstrates a current timing/generation boundary between admission and physical representation. It is fresh evidence inside the existing exact-generation / isolated-representation ownership region and does not by itself close or fully characterize the broader render-cut family.

## 5. PDF cache exact-generation authority — C40

`project_tools/research_pdf_cache_generation_authority.py` bound its race schedules to the exact current source and passed on the accepted head.

Source receipts emitted by the accepted run:

- `service-worker.js` SHA-256: `f705db325f625d3187505af90ba399f93111379d508f3c5f75a4a5cc21d1d2bc`;
- `offscreen.js` SHA-256: `ac73b9e1162d83eb0b8e436d217efe0244d9e8c133356640571960ea7afbbb01`;
- current cache key source: `return \`tab:${tabId}\`;`.

Fresh deterministic schedules:

- **P0-023:** operation expecting `doc-A` resolves the mutable tab slot after it has become `doc-B`, including `PDF-DOCUMENT-B`; `wrong_document_generation = true`.
- **P0-079:** transfer owned by `op-A` dereferences the mutable slot after `op-B` overwrites it and resolves `PDF-OP-B`; `wrong_operation_generation = true`.

This is fresh L2 deterministic revalidation of both existing owners. It is not a physical/offscreen-extension L4/L5 closure claim.

## 6. Fresh restart coverage interpretation

The accepted tranche advances only the cells actually exercised:

| Coordinate | Fresh campaign state after this tranche | Basis |
|---|---|---|
| C01 | `L4-REVALIDATED / FINDING` | 251 live/physical Includes vs 250 durable Snapshot; P1-154. |
| C02 | `L4-REVALIDATED / FINDING + POSITIVE CONTROLS` | Stable/Exclude/ambiguity/frame controls plus hidden/opacity/decoy/disconnected physical findings. |
| C03 | `L4-REVALIDATED / FINDING + POSITIVE CONTROLS` | Semantic/hidden/frame controls plus BODY fallback/tie/stale/mutation findings. |
| C16 | `PARTIAL / L4 POSITIVE CONTROLS` | Same-origin frame restore and auto-main frame paths were physically exercised; this is not complete same-origin-frame coverage. |
| C35 | `PARTIAL / L4 FINDING` | In-place selected content mutation demonstrates an admission-to-artifact timing issue; complete mutation/beforeprint/render-cut coverage remains outstanding. |
| C40 | `L2-REVALIDATED / FINDING` | Exact current source-bound cache generation schedules for P0-023/P0-079. |

All other fresh-restart coordinates retain their prior restart state until independently exercised.

## 7. Owner/status decision

No new P-code is warranted by this tranche. All reproduced failures map to existing owners/root regions. No DONE owner is reopened by this evidence. `RESEARCH_REGISTRY.md` is unchanged.

This tranche is evidence/coverage only:

- no product runtime change;
- no manifest change;
- no owner acceptance-contract change;
- no P-status transition;
- no build/tag/GitHub Release;
- release readiness remains **NOT READY**.

The temporary evidence workflow and C01-only probe are removed before final delivery; the accepted run/head/job above remain the durable external execution receipt.