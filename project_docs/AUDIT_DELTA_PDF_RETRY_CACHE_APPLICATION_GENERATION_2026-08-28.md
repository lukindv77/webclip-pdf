# Audit delta — PDF retry cache needs same-document application generation — 2026-08-28

Source-of-truth `main` immediately before this write: `0baaa84eaa34e4b1eac73ee308e0caffa83faf5c`.

Docs-only audit checkpoint. Runtime/tests/configuration/manifest are unchanged.

## Classification

No new P-number is assigned.

Primary existing owners:

- **P0-023** — PDF retry cache identity/invalidation;
- **P0-080** — same-document SPA/application generation authority;
- **P0-070** — full browser-document identity remains a separate required fence.

## Existing cache controls

`getValidCachedPdfForTab(tabId)` already performs two important checks:

1. cache TTL (`PDF_CACHE_TTL_MS`);
2. current tab URL must equal `cached.sourceUrl` / cached metadata URL.

If tab lookup fails or URL differs, the cached PDF is deleted and retry fails closed.

P0-023 additionally requires exact `MessageSender.documentId`/full-document identity so same-URL reload cannot reuse a PDF from an old document.

Those controls are necessary but not sufficient for P0-080 same-document application changes.

## Fresh source proof

A SPA/application can change the meaningful page representation without changing either:

- tab URL; or
- browser `documentId`.

Examples include:

- replacing the selected route subtree while intentionally keeping the same URL;
- client-side filters/tabs/views that replace the article/content state without History API navigation;
- `history.replaceState()` to the same normalized URL;
- application state restoration that materially changes selected content while preserving the browser document.

After WebClip has already generated PDF A, the cache record keeps bytes/metadata for A. `getValidCachedPdfForTab()` currently asks only whether current URL still equals the cached URL (plus TTL; future P0-023 document identity).

Therefore cached A can remain accepted after the live application is in state B.

## Deterministic schedule

1. Same browser tab/document/application generation A is visible at URL U.
2. User selects content and WebClip generates PDF A.
3. Yandex upload fails; retry cache keeps PDF A as intended by P0-007.
4. Site changes its application representation to B while URL remains U and `documentId` remains D.
5. User now sees B.
6. Context menu/UI invokes `retry-yandex`.
7. Cache validation sees:
   - same tab;
   - same URL U;
   - same document D once P0-023 is implemented;
   - TTL valid.
8. WebClip uploads PDF A even though the visible/current application state is B.

The bytes themselves are not corrupted — retry correctly preserves the original failed artifact — but the product currently lacks a way to tell the user whether the retry operation still belongs to the currently displayed application generation.

## Relationship to retry semantics

P0-007 intentionally requires a retry to reuse **the same PDF bytes** after a Yandex error. Re-rendering B automatically would violate that invariant.

Therefore the fix is not “regenerate on any SPA mutation”. The required distinction is:

- **artifact retry receipt A** — explicitly retry the previously generated PDF A;
- **current page generation B** — what the user is looking at now.

If A != B, WebClip must not silently present the retry as if it were a save of B.

Acceptable policy options include:

1. invalidate/disable page-context Retry after application generation changes and require the user to explicitly reopen/retry historical A from a receipt/log; or
2. show explicit wording that retry will upload the previously generated PDF from generation A, not the currently displayed page B, and require confirmation.

## Required P0-023/P0-080 refinement

### Cache provenance receipt

A cached PDF should carry immutable provenance at least for:

- full browser document generation (P0-023/P0-070);
- same-document application/selection generation (P0-080);
- source normalized URL;
- PDF content generation / operation id;
- selection snapshot generation or equivalent receipt.

### Retry admission

Before a page-scoped Retry command, compare the cache provenance with the current content/application generation.

- exact match -> ordinary retry of same artifact is allowed;
- full-document mismatch -> fail closed under P0-023;
- application-generation mismatch -> do not silently treat old artifact A as current page B; require the chosen explicit historical-retry policy.

### No mutation-based invalidation of unknown settlement

If a Yandex upload of PDF A already has unknown external settlement, application generation B does not cancel or rewrite A's remote recovery receipt. Remote reconciliation remains attached to A.

## Required regressions

1. PDF A fails upload, page unchanged -> retry sends exact A bytes.
2. PDF A fails -> same URL full reload -> P0-023 rejects page-scoped retry of A.
3. PDF A fails -> SPA representation changes with same URL/document -> page-scoped retry does not silently masquerade as save of B.
4. Explicit historical retry policy, if implemented, clearly identifies A and still sends exact A bytes.
5. SPA state changes then returns visually to A without a matching generation receipt -> do not infer identity from appearance/URL alone.
6. Unknown remote settlement for A remains reconciled as A after page changes to B.
7. A new save in B creates a new artifact/content generation and cannot overwrite A's recovery identity merely because URL is the same.

## Duplicate check

P0-023 currently addresses URL + full-document identity; P0-080 addresses same-document selection/application generation. Repository history contained no dedicated audit checkpoint applying P0-080 to the **retry-cache artifact provenance** boundary.

This is therefore a new manifestation of those existing owners, not a new root-cause number.

## Test / release state

Documentation only. Product tests were not rerun. Historical evidence remains **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. Runtime version remains `0.9.8`; no build, tag or GitHub Release was created.