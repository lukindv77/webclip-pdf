# Audit delta — PDF retry cache needs explicit SPA/application-generation semantics — 2026-08-28

Source-of-truth `main` immediately before this write: `91848ea1aea714fb1670dc0ebaf2073bf5293797`.

Docs-only audit checkpoint. Runtime/tests/configuration/manifest are unchanged. No new P-number is assigned.

## Classification

Primary existing owners:

- **P0-023** — retry-cache identity/invalidation;
- **P0-080** — same-document SPA/application-generation authority;
- **P0-007** — Yandex retry must reuse the same already-generated PDF rather than silently regenerate it.

Adjacent operation-receipt work: P0-079/P1-198/P1-210.

## Fresh source proof

`getValidCachedPdfForTab(tabId)` verifies a cached PDF with three important checks:

1. cache record exists;
2. `createdAt` is inside `PDF_CACHE_TTL_MS`;
3. a fresh bounded `tabs.get(tabId)` returns a URL whose normalized value equals `cached.sourceUrl || cached.meta.url`.

If the URL differs, the cache is deleted and cannot be retried.

This is a useful positive control for ordinary A->B navigation, but it is not an application-generation proof. P0-080 already established that the same browser document and even the same textual URL can host a completely replaced SPA/application representation.

Therefore current cache admission can satisfy:

`currentUrl === cachedUrl`

while the current visible application generation no longer corresponds to the PDF bytes in the cache.

## Important product distinction

This does **not** imply that cached PDF bytes themselves become invalid when the page changes. P0-007 explicitly requires retry to reuse the exact already-generated PDF after Yandex failure.

The missing contract is about **what the UI/runtime claims the retry is bound to**.

There are two valid designs, but they must not be mixed implicitly:

### A. Operation-artifact semantics

The cached PDF is an immutable artifact of historical operation generation G.

Retry means: "retry sending **this already-generated PDF G**" regardless of whether the current page has since changed.

Then the retry surface must show/retain a bounded source receipt for G (URL/title/timestamp/application/document/selection generation as appropriate), and should not pretend that current page state proves the artifact belongs to the current route.

A current-tab URL equality check becomes a UX/safety hint rather than the sole identity authority.

### B. Current-page retry semantics

If product semantics require retry cache to remain attached to the currently visible page, then URL equality is insufficient. The cache must also carry an application-generation/document receipt and retry must prove current generation compatibility under P0-070/P0-080.

A same-URL SPA replacement must invalidate or explicitly conflict with the old cache.

## Deterministic same-URL schedule

1. Route/application generation A at `https://example.test/item` is selected and PDF bytes PA are generated.
2. Yandex upload fails; PA remains in retry cache with source URL U.
3. The SPA replaces the route/content with application generation B while preserving textual URL U and browser documentId.
4. `getValidCachedPdfForTab()` fresh-reads the tab and still sees U.
5. Current cache check passes because `currentUrl === cachedUrl`.
6. User invokes `retry-yandex` from the persistent WebClip surface/context command.
7. Worker sends PA, even though the current page representation is B.

Sending PA may be exactly correct if the user is explicitly retrying historical operation A. It is misleading if the UI/runtime treats URL equality as proof that PA represents current B.

## Required P0-023/P0-080 refinement

Define one explicit cache identity model and encode it in the durable cache receipt.

At minimum the receipt should distinguish:

- immutable PDF/content generation;
- source URL observation;
- browser document generation when available;
- same-document application/navigation generation when the cache is page-bound;
- originating selection/operation receipt;
- creation time/TTL.

Do not infer equivalence of application generations from URL equality alone.

### If operation-artifact semantics are chosen

- retry remains allowed after page/application changes;
- UI labels it as retrying the existing cached PDF, not current page content;
- metadata/Journal finalization must continue to use the cached artifact's original receipt, never rebuild from current page B;
- a newer PDF generation for the same tab must not overwrite/retarget the old attempt without explicit generation replacement semantics.

### If current-page semantics are chosen

- current application generation must match the cache receipt;
- same-URL DOM/app replacement conflicts and disables current-page retry;
- user may still be offered an explicitly historical "retry cached PDF A" action if operation-artifact semantics are also supported as a separate action.

## Regression requirements

1. Ordinary same page, failed upload -> retry sends exact cached bytes and original metadata.
2. Full navigation to another URL -> old cache remains rejected as today.
3. Same-document URL change A->B -> no silent claim that cache A represents B.
4. Same URL, SPA replaces content -> operation-artifact retry is clearly identified as historical A, or current-page retry is blocked by generation mismatch.
5. Retry never regenerates PDF merely because current page changed; P0-007 remains intact.
6. Journal entry created after retry uses the immutable cached operation/content receipt, not newly observed page title/URL/selection unless an explicit new operation is started.
7. A new PDF generation on the same tab cannot make recovery of an unresolved older remote attempt ambiguous.

## Duplicate check

Repository commit search found no dedicated retry-cache checkpoint for same-document application generation. Existing P0-023 owns cache identity; P0-080 supplies the newly proven application-generation dimension. A new P-number would duplicate those owners.

## Test / release state

Documentation only. Product tests were not rerun. Historical evidence remains **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. Runtime version remains `0.9.8`; no build/tag/Release was created.