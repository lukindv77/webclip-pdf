# WebClip — functional Closure Sweep — P0-023 / P0-079 PDF cache generation authority — 2026-09-01

Date: 2026-09-01

Canonical starting point: `main = a847314360ffcbb5f39fa6f3eb69b54413d45c3c` (P0-004 functional tranche merged; post-merge Repository Integrity #199 SUCCESS).

Canonical owner authority: `RESEARCH_REGISTRY.md`.

- **P0-023 ACTIVE** — PDF retry cache must be exact source-document generation bound; same-URL reload/replacement cannot reuse an older document's PDF.
- **P0-079 ACTIVE** — PDF bytes used for Yandex upload/retry must be immutable operation-owned cache generations, not one mutable `tab:<id>` slot.

This tranche re-checks one shared cache boundary against both distinct existing authority contracts. It allocates no new P-code and claims no implementation closure.

## 1. Functional question

Can one mutable PDF retry-cache record addressed only by browser tab id preserve both:

1. exact **source-document generation** across same-tab reload/replacement; and
2. exact **save-operation ownership** when multiple PDF/save operations for the same tab overlap before offscreen transfer dereferences the cache?

A finding here is silent-corruption class: retry/upload can use internally valid PDF bytes that belong to the wrong document generation or the wrong save operation.

## 2. Exact current source boundary

Durable harness: `project_tools/research_pdf_cache_generation_authority.py`.

The harness reads the checked-out `service-worker.js` and `offscreen.js` and refuses to run the race model unless current source still satisfies all of these exact invariants:

1. `pdfCacheKey(tabId)` is exactly:

   `function pdfCacheKey(tabId) { return \`tab:${tabId}\`; }`

2. a newly generated Yandex PDF cache record is stored with `key: pdfCacheKey(tabId)`;
3. `retryCachedPdfUploadToYandex(tabId, ...)` obtains the record through `getValidCachedPdfForTab(tabId)`;
4. `getValidCachedPdfForTab(tabId)` obtains `getCachedPdfMetadataByKey(pdfCacheKey(tabId))`, without a document-generation or operation-generation component in the key;
5. service-worker transfer passes `pdfCacheKey: String(cached.key || pdfCacheKey(tabId))` to offscreen;
6. offscreen `pdf-cache-upload` later executes `getPdfCacheRecord(spec.pdfCacheKey, ...)` and builds the HTTP body from the record found **at that later dereference**.

Therefore the deterministic schedules below are source-bound to the current implementation rather than a hypothetical architecture.

## 3. Managed deterministic execution

Temporary GitHub Actions validation:

- run: **33458742334**;
- job: **99704194711** (`pdf-cache-authority`);
- exact evidence commit: **`ed8e1d52c34a59d4783f8cde02e47e02cb69ff18`**;
- runner: Ubuntu 24.04 hosted runner;
- Python: 3.12.14;
- job conclusion: **SUCCESS** — the current-source invariants were present and both schedules reproduced the owned failures.

Source identities printed by the accepted run:

- `service-worker.js` SHA-256: `995a4c860f8172be595bff2f4860a0f5141ff15aba289c19881995d445611ab3`;
- `offscreen.js` SHA-256: `ac73b9e1162d83eb0b8e436d217efe0244d9e8c133356640571960ea7afbbb01`;
- example current cache key for tab 77: **`tab:77`**.

Verdict from the harness: **`DETERMINISTIC / FINDING`**.

## 4. P0-023 — document-generation substitution

Deterministic schedule under the exact tab-key semantics:

1. tab 77, document generation **doc-A**, creates `PDF-DOCUMENT-A`; cache slot `tab:77` now belongs to doc-A;
2. the same browser tab is reloaded/replaced into **doc-B** and creates `PDF-DOCUMENT-B`; the same cache key `tab:77` is overwritten;
3. a retry intended to use the previously generated doc-A artifact resolves `getValidCachedPdfForTab(77)`;
4. current lookup can only address `tab:77`, therefore it resolves the newer doc-B record.

Accepted run result:

- expected document generation: `doc-A`;
- resolved document generation: **`doc-B`**;
- resolved bytes: **`PDF-DOCUMENT-B`**;
- `wrong_document_generation: true`.

This directly reproduces **P0-023**. URL equality would not repair the authority defect because the owner explicitly distinguishes browser document generation from same-URL reload/replacement.

## 5. P0-079 — operation-owned byte substitution

Deterministic schedule under the exact service-worker → offscreen dereference boundary:

1. operation **op-A** stores `PDF-OP-A` in `tab:77` and obtains/passes that cache key for its signed transfer;
2. before offscreen op-A dereferences the key, a later same-tab operation **op-B** stores `PDF-OP-B`, overwriting `tab:77`;
3. offscreen op-A executes its current `getPdfCacheRecord('tab:77', ...)`;
4. the resolved record now belongs to op-B, and `cachedPdfRecordToBlob(record)` therefore supplies op-B bytes to op-A's transfer.

Accepted run result:

- transfer owner: `op-A`;
- resolved cache operation: **`op-B`**;
- resolved bytes: **`PDF-OP-B`**;
- `wrong_operation_generation: true`.

This directly reproduces **P0-079**. The race does not require corrupt IndexedDB or a failed fetch; all individual operations may succeed while the wrong valid PDF is uploaded.

## 6. Ownership and deduplication

**P0-023 and P0-079 remain ACTIVE.**

No new P-code is warranted:

- P0-023 owns source-document generation binding of retry cache;
- P0-079 owns immutable operation-specific PDF byte ownership across upload/retry/offscreen dereference;
- P0-070 remains a broader exact full-document generation authority root, but the two narrower canonical owners already classify these concrete cache failures.

This evidence does not prescribe a specific implementation. A production repair must make cache identity/generation durable across the relevant worker/offscreen lifecycle and must preserve recovery semantics rather than merely append an in-memory token.

## 7. Change Impact for a future repair

Any implementation touching this boundary should revalidate at least:

- C36 — same locator/URL, different resource/document generation;
- C37 — retry/failure/rollback/convergence;
- C40 — physical PDF bytes/cache identity;
- C42 — Yandex upload/object identity at the applicable deterministic/real boundary;
- C43 — Journal/provenance/exact artifact linkage;
- C45 — later reading uses the intended artifact;
- related P0-070/P0-073/P0-074/P1-184 generation/remote receipt regions where changed code overlaps.

Real Yandex settlement remains an L5/release boundary; this deterministic source-bound finding does not claim external E2E.

## 8. Project-state consequence

- Cycle-2 research coverage remains `DEEP-RESEARCH-COVERAGE-COMPLETE`;
- critical/functional closure remains incomplete;
- P0-023 remains ACTIVE;
- P0-079 remains ACTIVE;
- `RELEASE_READINESS.md` remains `NOT READY`;
- no build, tag or GitHub Release is justified by this tranche.

**Functional conclusion:** the current `tab:<id>` PDF retry-cache key is insufficient for both exact document-generation authority and immutable save-operation byte ownership.