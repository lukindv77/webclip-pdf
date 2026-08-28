# Audit delta — OAuth tab late success vs PKCE rollback — 2026-08-28

## Scope

Docs-only continuation of the Yandex OAuth / Chrome tab-create lifecycle audit on current `main`.

No new P-number is assigned. This delta refines **P1-124** (non-cancellable `tabs.create()` settlement across MV3 lifetime) and the existing Yandex auth-attempt generation contract around **P1-178**.

## Finding

`startYandexOAuth()` creates the authorization attempt in this order:

1. generate `state`, PKCE verifier/challenge and expiry;
2. durably write `yandexOAuthPending` into `chrome.storage.session`;
3. save configured Client ID;
4. call `createTabNextTo(sourceTabId, oauthUrl, true)`;
5. on **any** thrown result from that create call, remove `yandexOAuthPending` and throw an error.

The rollback assumes a rejected bounded wrapper means the browser did not create the tab. That assumption is false for local timeout / unknown settlement.

`createChromeTabBounded()` correctly acknowledges that `chrome.tabs.create()` is non-cancellable: after its 10-second local deadline, the underlying Promise remains alive and a late-success receipt is retained in module memory. But `startYandexOAuth()` catches the local pending/timeout error immediately and deletes the PKCE authority that the possibly-late browser tab requires.

### Deterministic schedule

1. OAuth attempt A persists pending receipt `{clientId, verifier, state, expiresAt}`.
2. `tabs.create(OAuth-A)` is issued.
3. WebClip's bounded caller wait expires before the actual Chrome Promise settles.
4. `startYandexOAuth()` catches the error and removes pending receipt A.
5. Chrome then completes the original non-cancellable create and displays OAuth-A to the user.
6. User finishes authorization and obtains a verification code for A.
7. `finishYandexOAuth()` cannot consume it because `yandexOAuthPending` was rolled back; the verifier/state generation needed for the code exchange is gone.

A worker restart can make the situation worse because P1-124's current late-create receipt is module-memory only, while the browser tab survives.

This is not merely a duplicate-tab problem: the late browser side effect has become **detached from its cryptographic authorization capability**.

## Required contract

### Distinguish proven create failure from unknown settlement

Rollback of `yandexOAuthPending` is allowed only when the exact `tabs.create()` attempt is proven to have failed before creating a usable OAuth tab.

For local timeout / worker loss / unknown actual settlement:

- retain pending PKCE receipt A until reconciliation/expiry;
- mark the create result `unknown/pending` rather than `failed`;
- do not issue a second OAuth-attempt generation merely because the UI lost the create result;
- reconcile exact tab-create generation through the P1-124 durable receipt design.

### Bind tab-create intent to auth-attempt generation

The browser-visible OAuth URL already contains A's random OAuth `state`. The tab-create intent should reference the same locally issued auth generation (without persisting secrets in tab metadata).

A reconciled late tab must prove it belongs to A; an unrelated OAuth tab or old Options tab is not evidence.

### Keep PKCE secrets session-only

This repair must not weaken the existing secret boundary. The code verifier remains in trusted `chrome.storage.session`, not URL/query/OperationLog. Browser-visible `state` may correlate the public tab to the secret-bearing local attempt receipt.

## Acceptance cases

1. Normal create success -> A remains pending and `finishYandexOAuth()` can exchange its code.
2. Proven synchronous/browser create failure -> A may be rolled back.
3. Local create timeout followed by late Chrome success -> A remains consumable; no orphan authorization page.
4. Worker termination after create admission but before result -> new worker reconciles A and cannot blindly start B.
5. User explicitly starts a genuinely new OAuth attempt B -> B supersession of A follows an explicit auth-generation policy; a late A tab cannot consume B's verifier.
6. A expires while create outcome remains unresolved -> expiry cleanup may retire A, but only by the established PKCE expiry policy, not by equating timeout with cancellation.
7. No PKCE verifier/code is added to URLs, logs or durable persistent storage.

## Classification

- **P1-124** owns exact `tabs.create()` unknown-settlement/restart reconciliation.
- **P1-178** owns Yandex auth/config/pending attempt generation and stale completion ordering.

No new P1-211 is needed.

## Validation note

Documentation only. Runtime/tests/manifest are unchanged. Product tests were not rerun; historical gate remains 88/88 JavaScript syntax + 74/74 deterministic tests PASS. No build/tag/release was created.