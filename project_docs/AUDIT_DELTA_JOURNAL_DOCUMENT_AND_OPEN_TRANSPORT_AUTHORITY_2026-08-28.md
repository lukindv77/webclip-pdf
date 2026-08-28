# Audit delta — Journal exact-document command and open-URL transport authority — 2026-08-28

Source-of-truth `main` immediately before this write: `9dce396c8908ca6146428ee11d95c250212cc844`.

Docs-only audit checkpoint. Production runtime, tests, configuration and `manifest.json` are unchanged. Canonical large-table synchronization is not claimed by this file.

## Classification

No new P-number is assigned.

Fresh source proof refines existing:

- **P1-175** — exact source-document admission for Journal/page commands;
- **P1-125 / P1-171** — scripting/frame command receipts must be document-generation bound, including same-URL reload;
- **P1-124** — `tabs.create()` actual-settlement/crash-consistent receipt;
- **P1-210** — outer transport loss is `result unknown`, not permission to launch a second non-idempotent side effect;
- **P0-070 / P0-023** — save/PDF/retry authority must remain bound to the originating document generation.

Two concrete surfaces are confirmed: Journal `Apply selection` still has a tabId-only TOCTOU after its fresh check, and `openSavedUrl()` can deliberately duplicate a browser tab after an unknown worker result.

## Fresh source proof — Journal source context

`resolveSourceContext()` persists/loads only:

- `sourceTabId`;
- `sourceUrl`;
- `createdAt`.

It does not retain an exact `documentId` or a top-document navigation generation.

When possible it fresh-reads `chrome.tabs.get(sourceTabId)` and updates the URL. Failure clears the source context, which is a useful positive control: a definitely missing tab is not silently used.

However a surviving tab with a replacement document is still represented by the same tab id.

## `Apply selection` checks current URL but not exact document

The Journal apply path currently performs useful bounded checks:

1. fresh `chrome.tabs.get(sourceTabId)`;
2. require current `http(s)` URL;
3. compute current target `siteKey` and saved entry `siteKey`;
4. reject a different site;
5. when the exact URL differs but siteKey is the same, require explicit cross-URL confirmation.

Those controls correctly implement the product feature that a saved template may intentionally be applied to another URL of the same site.

After those checks, however, the path performs:

- `chrome.scripting.executeScript({ target: { tabId: sourceTabId }, files: ['content.js'] })`;
- then `chrome.tabs.sendMessage(sourceTabId, { type: 'WEBCLIP_APPLY_SELECTION_SNAPSHOT', ... })`.

Both final operations are tabId-only.

### Deterministic same-URL replacement schedule

1. Journal fresh-reads source tab/document A at URL U and validates U/siteKey.
2. A performs a full reload to document B at the same U before script injection/message.
3. URL and siteKey remain indistinguishable.
4. tabId is unchanged.
5. Journal injects/sends the saved selection to B.

No current check proves that B is the document generation the user authorized when Apply was admitted.

A different-URL same-site navigation can also race after the initial confirmation/check and before final dispatch.

This is exactly the already documented P1-175/P1-125/P1-171 root and does not warrant a new number.

## Required exact-document command contract

For Apply and all privileged page-command helpers:

1. capture an exact top-document receipt at admission, preferably current `documentId` plus a per-tab full-document navigation generation;
2. bind injection receipt to that generation;
3. immediately before the final command, prove the same generation is still current;
4. where the Chrome API supports it, target exact `documentId` rather than only tabId;
5. a late injection success from A cannot satisfy B;
6. a same-URL reload invalidates A just as a cross-URL navigation does;
7. cross-URL same-site Apply remains allowed only after the user's explicit confirmation, and that confirmation itself belongs to one exact target generation.

The exact-document fence should be shared with popup/context-menu page commands rather than creating Journal-specific ad hoc rules.

## Fresh source proof — `openSavedUrl()` blind fallback

Journal `openSavedUrl(url)` currently does:

1. send `WEBCLIP_OPEN_URL` to the worker;
2. if the Promise resolves, return;
3. on **any** rejection, call `window.open(value, '_blank', 'noopener,noreferrer')`.

The worker's `WEBCLIP_OPEN_URL` handler validates the URL and calls:

`createTabNextTo(sourceTabId, url, true)`

before returning `{ ok:true, tabId }`.

`createTabNextTo()` is the P1-124-controlled `tabs.create()` path with bounded actual-settlement tracking.

### Deterministic duplicate-tab schedule

1. Journal sends Open URL A.
2. Worker/P1-124 issues `chrome.tabs.create()`.
3. Chrome creates tab T.
4. The worker/page response channel fails before Journal receives `{ok:true, tabId:T}`.
5. Journal catch cannot distinguish this from a proven pre-admission failure.
6. It immediately executes `window.open()` for the same URL.
7. Browser now has T plus fallback tab T2 for one user action.

The worker's internal P1-124 same-worker/create receipt cannot protect the fallback because the second side effect bypasses the worker entirely.

This is a direct P1-210 outer-transport classification defect composed with P1-124, not a new root cause.

## Required Open URL contract

Outer page logic must distinguish:

- **application success received** — use returned tab result;
- **pre-admission failure proven** — an alternate open path may be allowed if product wants one;
- **result unknown** — do not issue another `window.open()`/`tabs.create()` until the exact P1-124 create receipt is reconciled.

Preferred architecture is one authoritative browser-tab creation owner rather than two independently side-effecting fallbacks.

A caller timeout/runtime rejection is never proof that `tabs.create()` did not occur.

For MV3 restart, P1-124's crash-recoverable create intent remains required; Journal must be able to reconcile the exact logical open, not simply search for any old tab with the same browsing URL.

## Direct `openDiskFolder()` note

Journal's Yandex-folder helper uses `window.open()` directly without first asking the worker to open the same tab. That does not create the same two-owner duplicate schedule by itself.

It still belongs to the broader P1-157 inventory of direct extension-page Chrome/browser operations and should eventually receive explicit bounded/product-consistent ownership, but this checkpoint does not claim a separate correctness blocker for it.

## Save/retry composition

The Apply race matters beyond visual selection:

- after stale Apply lands in replacement document B, B can later initiate PDF/Yandex save using state the user intended for A;
- P0-070 must fence any live save from exact user-command/source generation through print and post-print finalization;
- P0-023/P0-079 must prevent old retry-cache authority from crossing a same-URL document replacement.

Exact command admission therefore cannot be postponed until `Page.printToPDF`; the generation chain begins when the user authorizes the page command.

## Required deterministic regressions

1. Apply on document A at U -> same-URL full reload B before injection -> B receives no apply command.
2. Apply on A -> injection begins -> same-URL reload B -> late injection receipt for A cannot satisfy/send into B.
3. Cross-URL same-site Apply confirmation for target A -> target navigates again before final command -> stale confirmation cannot authorize the new document.
4. Missing/closed source tab continues to fail closed and clears source context.
5. Intentional same-site cross-URL Apply still works when one exact target generation remains stable from confirmation through command settlement.
6. Saved URL Open -> worker creates browser tab -> response channel lost -> Journal does not create a second fallback tab.
7. Open URL proven rejected before `tabs.create()` admission -> product may expose a safe alternate action without treating unknown as failure.
8. Worker restart after browser tab creation but before page result -> P1-124 receipt reconciliation returns/reuses only the exact created tab and no duplicate is opened.
9. Existing unrelated tab with same browsing URL is not accepted as proof of an unknown create unless exact request receipt identifies it.
10. Navigation after Apply but before subsequent PDF save is caught again by P0-070 exact save generation; no stale command state becomes authority for B.

## Duplicate check

No new item is created.

- P1-175 already owns stale source/page command admission.
- P1-125/P1-171 own document-bound script/message receipts and same-URL lifecycle.
- P1-124 owns actual settlement/crash reconciliation of `tabs.create()`.
- P1-210 owns user/page behavior after outer response loss.
- P0-070/P0-023 own downstream save/PDF/cache document binding.

## Test / release state

No product tests were rerun for this docs-only checkpoint. The last proven product gate remains historical **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. Runtime/version remain unchanged (`0.9.8`). No build, tag or Release was created.