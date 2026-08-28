# Audit delta — tabs.create MV3 crash receipt — 2026-08-28

Source-of-truth `main` immediately before this write: `47b5f615ff170f399d3dd53004ea54af680e50f3`.

Docs-only audit checkpoint. Production runtime/config/manifest/tests are unchanged.

## Classification

No new P-number is assigned.

Fresh source proof **reopens/refines existing P1-124**. P1-124 correctly solved local-timeout duplicate tabs inside one service-worker lifetime, but its late-success receipt is module-memory only. A service-worker restart can erase the only unknown-settlement receipt while the browser-created tab survives.

Adjacent items are different:

- P1-125 — `executeScript()` document-generation / late-success receipt; injected content/frame scripts are additionally protected by idempotent load sentinels, so a worker restart does not have the same duplicate-tab side effect.
- P1-130/P1-170 — Chrome Action mutation/refresh; a fresh worker runs `refreshActionForAllTabs()` and can reconstruct desired browser Action state.
- P1-136/P1-204 — context-menu crash repair; menu rebuild uses a Chrome alarm repair obligation.
- P1-192 — background backup alarm/lifecycle; different durable operation.

## Fresh source proof

### 1. P1-124 state is entirely in module memory

`service-worker.js` declares:

`const tabCreateSettlements = new Map();`

`createChromeTabBounded()` builds a logical key from requestKey or `sourceTabId + active + url`, then keeps:

- the raw `chrome.tabs.create()` Promise;
- timedOut/settled flags;
- a one-use `lateSuccess` tab receipt;
- a cleanup timer.

If an identical retry happens while the same worker still owns this map, WebClip either:

- waits for the existing actual call;
- returns `WEBCLIP_TAB_CREATE_PENDING`;
- or consumes the one-use late-success tab instead of issuing a second `tabs.create()`.

That remains a useful same-worker control.

### 2. No durable/browser-reconstructible generation backs the map

The map is not mirrored in `chrome.storage.session`, IndexedDB, a target URL nonce, a Chrome alarm, or another crash-recoverable receipt.

`createTabNextTo()` ultimately calls `createChromeTabBounded()` and does not first reconcile a prior unknown create against current Chrome tabs.

On worker restart, `tabCreateSettlements` starts empty.

### 3. Non-idempotent browser state can survive the worker

A `tabs.create()` request is a browser side effect. The created tab belongs to Chrome, not to the JS heap that initiated it.

Deterministic crash-consistency schedule:

1. request A calls `chrome.tabs.create()`;
2. Chrome accepts/creates the tab, or its outcome is otherwise unknown to WebClip;
3. before the worker publishes/retains a usable `lateSuccess` receipt, the MV3 worker terminates/restarts;
4. the browser tab remains;
5. the user/extension retries the same logical Open Journal / Open Options / internal-page action;
6. the new worker has an empty `tabCreateSettlements` map and starts a second `chrome.tabs.create()`;
7. two tabs represent one logical user action.

The existing local 10-second timeout protection cannot bridge process lifetime.

### 4. Existing target flows have different reconciliation opportunities

Journal tabs commonly include a random `contextId` in their extension URL. That nonce can be used as a strong browser-visible identity if carried durably through the create intent.

Static Options/help URLs are weaker: merely finding any existing tab with the same URL is not proof that it is the unknown result of this exact request. Reusing an unrelated old Options tab would change product semantics.

Therefore the repair should be receipt/generation based, not a broad "if same URL exists, reuse it" heuristic.

## Required P1-124 refinement

### Crash-recoverable create intent

Before issuing non-idempotent `tabs.create()`, record a bounded session-scoped create intent containing an immutable request nonce/generation and only the metadata needed to reconcile the exact create.

Acceptable designs include:

- encode a unique request nonce into extension-page target URL where product-compatible and persist the intent in `chrome.storage.session` until settlement/reconciliation;
- or use another bounded durable/session receipt that lets a new worker prove whether the exact request already produced a Chrome tab.

Do not persist ordinary browsing URLs unnecessarily; extension-page navigation identity should remain privacy-minimal.

### Actual settlement still matters

- local timeout is not cancellation;
- same-worker `tabCreateSettlements` may remain as a fast barrier;
- worker restart must not convert `unknown` into `not started`;
- reconciliation must fail closed when more than one browser tab could match the intent;
- no blind second `tabs.create()` until the old intent is proved absent/failed or reconciled.

### Bounded lifecycle

Session create intents require:

- cap/TTL;
- compare-and-delete of only the exact request generation;
- cleanup on proven success/failure;
- restart reconciliation that cannot keep stale intents forever;
- no unbounded Promise queue behind a hung Chrome API.

## Deterministic regressions

1. `tabs.create()` settles normally before deadline -> one tab, receipt cleaned.
2. Caller timeout, same worker, late success -> current P1-124 one-use receipt prevents duplicate.
3. Chrome creates target, worker dies before JS receipt -> new worker + identical retry -> exactly one target tab after reconciliation.
4. Worker dies before Chrome actually creates target -> retry waits/reconciles boundedly, then creates at most one tab.
5. Journal target with unique context nonce -> exact tab is recovered, unrelated Journal tabs are not reused.
6. Existing unrelated Options/help tab + unknown new create -> heuristic same-URL reuse is not accepted as proof unless exact request identity exists.
7. Ambiguous candidate set -> fail closed / explicit retry state, not arbitrary attachment.
8. Stale intent TTL cleanup cannot remove a newer generation with the same logical action.
9. Incognito placement rules for Journal remain unchanged/fail-closed.
10. P1-166 global pending-admission requirements remain independent for unresolved in-memory Chrome calls.

## Numbering result

No P1-210 is allocated.

Primary owner remains **P1-124**, expanded from same-worker timeout reconciliation to MV3 crash-consistent exact-create reconciliation.

## Test / release state

No product tests were rerun. Historical product gate remains **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. No build, tag or Release was created.
