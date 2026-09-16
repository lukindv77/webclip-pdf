# Research evidence — P0-023 retry source-document generation revalidation — 2026-09-16

Canonical baseline: `main` at `e5253f4eab538947cee14d08394cd74a9d36380f`.

Research-only closure-oriented tranche. Production runtime, `manifest.json`, workflows, build/tag/deploy/release state, `TEST_STATUS.md` and `RELEASE_READINESS.md` are unchanged.

## Result

**P0-023 remains ACTIVE / ROOT-CAUSE-REVALIDATED.**

Fresh current source still authorizes cached-PDF retry/download from one tab-scoped cache row by bounded TTL plus **current normalized URL equality**. The cache admission path does not persist or compare Chrome's exact browser `documentId`. Therefore a full reload or replacement document in the same tab at the same URL can authorize reuse of a PDF formed from the prior document.

This is not a byte-identity defect and not a same-document SPA-selection defect:

- **P0-023** owns the exact browser source-document generation required by current-page cached-PDF retry authority;
- **P0-070** owns the end-to-end source-generation receipt that P0-023 must consume rather than reinvent;
- **P0-079** owns immutable operation-owned PDF bytes/cache generation;
- **P0-080** owns same-document SPA/application generation and live-selection authority after browser `documentId` remains unchanged.

No new P-code is created.

## Current requirement alignment

Fresh `USER_REQUIREMENTS.md` requires:

- navigation/reload/document replacement must not silently apply selection state to another logical document generation (§3.9);
- saved PDF responsive/resource/temporal/frame state must belong to the same admitted logical document generation or be classified degraded/unknown/failure (§5.9);
- retry after Yandex failure must reuse the **same operation-owned PDF bytes** and must not call `printToPDF` again (§8.8).

P0-023 is the bridge between the last two requirements for a retry initiated from the current source page: reuse is required, but a replacement document with the same URL must not inherit authority over the old PDF merely because the address bar looks identical.

## Fresh exact-source proof

All runtime observations below were revalidated against `service-worker.js` blob `6d61ac81befdbf2804ae9dbec425aa08d1194eb1` on exact canonical baseline `e5253f4eab538947cee14d08394cd74a9d36380f`.

### 1. PDF retry authority is still tab-scoped

`pdfCacheKey(tabId)` returns:

```text
tab:<tabId>
```

The key contains no source `documentId`, navigation generation or application generation.

The tab-scoped key is also the separate P0-079 byte-ownership problem. P0-023 does not require merging those owners: even after P0-079 moves bytes to immutable operation-owned generations, the user-facing retry command still needs an exact source-document admission receipt.

### 2. `getValidCachedPdfForTab(tabId)` uses TTL + URL equality

Fresh source:

1. derives `key = pdfCacheKey(tabId)`;
2. loads cached metadata;
3. rejects missing/expired rows using `PDF_CACHE_TTL_MS`;
4. fresh-reads the current tab URL;
5. normalizes current URL and cached `sourceUrl` / metadata URL;
6. deletes/rejects the cache when those URL strings differ;
7. returns the cached record when they match.

No `sourceDocumentId` comparison exists anywhere in `service-worker.js` on this baseline. A repository search/find for `sourceDocumentId` against this exact file has zero matches.

Therefore URL equality is currently the strongest page-generation fence at this retry boundary.

### 3. Same-URL replacement defeats the current fence

Valid failure schedule:

1. top document A at `https://example.test/article` forms PDF A;
2. PDF A remains in retry cache for tab 7;
3. tab 7 performs a full reload, back/forward replacement, or navigation sequence that finishes at the same URL but creates browser document B;
4. B has a different Chrome `documentId` but the same tab id and URL;
5. current `getValidCachedPdfForTab(7)` sees a non-expired row and equal URL strings;
6. retry/download may therefore expose PDF A to B's current-page action.

An A → other URL → A URL sequence is an ABA variant of the same defect: returning to the same address does not resurrect document A.

### 4. Existing negative controls remain useful

Current source correctly fails closed when:

- the tab no longer exists / tab lookup fails;
- current normalized URL differs from cached URL;
- cache TTL expired;
- the tab has no matching cache row.

These controls reduce accidental cross-page reuse but cannot distinguish two browser documents at the same URL.

### 5. Manual retry and durable operation recovery are different authorities

P0-023 must not over-correct by declaring that every retry requires a live source document forever.

Two flows have different authority:

**Current-page retry/download**

A command emitted by a live page/UI that means “retry the cached PDF associated with this source page” must prove that the current top browser document is the exact source document in the PDF/source receipt. Same URL/tab/frame is insufficient.

**Durable recovery of an already admitted operation**

If an operation already has an immutable P0-070/P0-079 source/byte receipt and a P0-072/P0-073/P0-074 durable external-side-effect checkpoint, recovery may need to continue after the source tab/document has closed. It should recover from the durable operation receipt, not by transferring authority to whichever document later occupies the old tab/URL.

This distinction preserves recovery semantics while closing stale current-page authority.

## Chrome platform evidence

Fresh official Chrome documentation checked 2026-09-16 supports an exact document-generation primitive rather than URL inference.

### `webNavigation.documentId`

Chrome documents `documentId` as a UUID for the loaded document. `webNavigation.onCommitted` emits it for committed navigations. Chrome's documentation also explains that when a frame navigates and a new document opens, the document identifier changes, while the identifier remains stable across lifecycle-state changes of that same document.

Reference:

`https://developer.chrome.com/docs/extensions/reference/api/webNavigation`

This directly covers the P0-023 distinction: same tab/frame/URL can still be a different browser document generation.

### Exact-document extension messaging

Chrome's tab messaging API supports a `documentId` targeting option (Chrome 106+), allowing an extension to address a specific document rather than only a tab/frame.

Reference:

`https://developer.chrome.com/docs/extensions/reference/api/tabs#method-sendMessage`

The research conclusion is not that this exact API must be the final implementation. It demonstrates that the browser exposes stronger identity than current URL equality and that P0-023 need not rely on a guessed URL-generation surrogate.

## Public-project evidence

Public projects independently show why tab/URL/session continuity is not document continuity. These are analogous failure evidence, not proof of the WebClip source defect.

### OpenClaw stale target after renderer/process navigation

OpenClaw issue #25323 (2026-02-24) reports a navigation response retaining a pre-navigation `targetId` after a renderer-process swap. The returned URL is already the correct final URL while the target identity is stale; subsequent operations can target the wrong page/session on affected versions.

Reference:

`https://github.com/openclaw/openclaw/issues/25323`

This is particularly relevant to P0-023: a plausible current/final URL is not proof that stored execution/document identity still belongs to that page generation.

### chrome-use stale session after close/navigation

chrome-use issue #35 (2026-06-16) reports a cached relay session becoming stale when a tab closes/navigates or a renderer-process transition occurs; later commands keep reusing the stale session until a new binding is made.

Reference:

`https://github.com/leeguooooo/chrome-use/issues/35`

Again, the lesson is identity lifecycle: durable cached authority needs an explicit generation/target receipt and invalidation rules, not only a coarse tab locator.

### WebExtensions API discussion

W3C WebExtensions issue #722 explicitly illustrates per-document addressing with `documentIds` when discussing multi-tab message targeting. It is not a P0-023 fix proposal, but it reflects document identity as a first-class extension messaging dimension rather than something derivable from URL.

Reference:

`https://github.com/w3c/webextensions/issues/722`

## User/community experience evidence

User reports from other web clippers repeatedly surface reload/stale-page boundaries as visible failure states. These are product-intent signals only, not causal evidence for WebClip.

- Evernote community report (2023-03-17): clipper repeatedly asks for target-page reload before clipping; browser restart resolves it for the reporter.
  `https://www.reddit.com/r/Evernote/comments/11tu2il`
- Obsidian Web Clipper reports in 2025/2026 describe “Please reload the page” / reload-required failures when clipper state and the current page context no longer compose cleanly.
  `https://www.reddit.com/r/ObsidianMD/comments/1oe0i0a/obsidian_webclipper_suddenly_stopped_working_for/`
  `https://www.reddit.com/r/ObsidianMD/comments/1u7a3w8/problem_with_the_web_clipper_extension/`

The useful design implication is fail-closed but recoverable UX: stale page-generation authority should produce an explicit “source page changed / retry from operation receipt or generate a new copy” outcome, rather than silently sending the wrong cached artifact.

## Semantic duplicate / owner reconciliation

Historical family evidence already contains:

- `RESEARCH_DELTA_PDF_CACHE_CONSUMER_LIFECYCLE_2026-08-27.md`;
- `RESEARCH_DELTA_PDF_CACHE_OPERATION_ISOLATION_2026-08-27.md`;
- `RESEARCH_DELTA_PDF_END_TO_END_PROVENANCE_2026-08-27.md`;
- `RESEARCH_DELTA_PDF_RETRY_CACHE_APPLICATION_GENERATION_2026-08-28.md`;
- `RESEARCH_DELTA_PDF_RETRY_CACHE_SPA_APPLICATION_GENERATION_2026-08-28.md`;
- `RESEARCH_DELTA_SPA_SAME_DOCUMENT_SELECTION_GENERATION_2026-08-28.md`.

Those records already assign this root to P0-023 and explicitly state that same-URL reload passes the current URL-only gate. The current Registry continues to identify P0-023 as the single ACTIVE owner for exact browser source-document binding of retry cache.

Therefore this tranche extends/revalidates **P0-023**. No new P-code is appropriate.

## Deterministic model

Added model:

`project_tools/test_p0_023_retry_source_document_generation_revalidation_model.js`

Local verification:

- `node --check`: PASS;
- deterministic execution: **PASS 46 checks**;
- SHA-256: `c671cfd5b17102ce624d349f428785f53f1eced4b14c16ec847921221b547a17`;
- Git blob: `bce340869b0aacf2040b9fd3463fd67c060a9a32`.

### Current-source failure controls reproduced

The model proves:

1. same tab + same URL accepts old PDF after a distinct browser document replacement;
2. repeated same-URL document B/C/D replacements remain indistinguishable to URL-only retry admission;
3. different URL is rejected;
4. different tab has no matching current row;
5. TTL expiry rejects the row;
6. tab id, frame id, URL and title can all remain equal while `documentId` differs;
7. URL ABA does not imply browser-document ABA.

### Candidate acceptance controls

The model also demonstrates a bounded acceptance shape without selecting a final runtime architecture:

- P0-070 source receipt includes exact top `sourceDocumentId`;
- current-page retry requires exact tab + exact source `documentId`;
- same-URL document replacement fails closed;
- records without source-document lineage are not silently elevated to exact retry authority;
- P0-080 remains an independent same-document application-generation fence;
- P0-079 remains an independent immutable byte-generation/content fence;
- durable operation recovery may continue without a live source page when its exact durable operation/source/byte receipt remains valid;
- recovery receipt tampering or byte/source-lineage substitution fails closed.

## Required invariant

> A live current-page cached-PDF retry/download may reuse an existing PDF only when the current top browser document is the exact source document generation recorded by the owning save receipt. Tab id, frame id, URL, title and TTL are insufficient substitutes. Same-URL reload/replacement must not inherit old retry authority. Durable recovery of an already admitted operation is a separate receipt-driven path and must not be rebound to a replacement page.

The source receipt should compose with, rather than duplicate:

- P0-070 source document/application generation;
- P0-080 same-document application generation;
- P0-079 immutable operation-owned cache generation/content identity;
- P0-072 admitted/unknown external side-effect retention;
- P0-073/P0-074 immutable remote namespace/operation context.

## Closure evidence still required

P0-023 must remain ACTIVE until implementation evidence proves at least:

1. exact top source-document identity is captured from the real save admission path and reaches cached-PDF metadata/receipt;
2. current-page retry/download validates that exact source document rather than only URL/tab/frame;
3. deterministic same-URL reload/replacement rejection;
4. URL ABA rejection;
5. normal same-document retry succeeds with the exact P0-079 bytes and without a new `printToPDF`;
6. P0-080 same-document SPA/application-generation changes remain independently fenced;
7. legacy/missing-source-document cache records have an explicit safe migration/fail-closed rule;
8. durable recovery after tab/document closure continues only through exact operation receipts and is not accidentally blocked by the live-page fence;
9. real unpacked-Chrome evidence demonstrates same-URL reload/replacement behavior with browser `documentId` on the supported Chrome baseline;
10. exact-head Repository Integrity and post-merge Repository Integrity on the implementation commit.

## Classification

- current status: **ACTIVE / ROOT-CAUSE-REVALIDATED**;
- deterministic research coverage: **PASS 46 checks**;
- real unpacked-Chrome closure: **not claimed**;
- implementation: **not changed by this tranche**;
- build/tag/deploy/release: **not authorized and not performed**;
- release readiness: **unchanged / NOT READY**.
