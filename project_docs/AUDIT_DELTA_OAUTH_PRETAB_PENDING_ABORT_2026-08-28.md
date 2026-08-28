# Audit delta — OAuth pending attempt when pre-tab preparation aborts — 2026-08-28

## Scope

Docs-only audit of the `startYandexOAuth()` preparation sequence before browser tab creation. No new P-number.

Refines **P1-178** pending-auth generation ownership and complements the separate late-`tabs.create()` PKCE rollback delta from this session.

## Finding

The current start sequence is:

1. generate OAuth `state` + PKCE verifier/challenge;
2. persist `yandexOAuthPending` in `chrome.storage.session`;
3. `await updateYandexConfig(...clientId...)`;
4. only after that, call `createTabNextTo(...oauthUrl...)`;
5. the existing cleanup catch surrounds the tab-create stage, not the earlier config-write stage.

Therefore a failure/timeout from step 3 leaves the exact pending PKCE attempt alive even though the code path that could open its OAuth tab was never reached.

### Deterministic schedule

1. Attempt A stores pending `{clientId, verifier, state, expiresAt}`.
2. `updateYandexConfig(clientId=A)` rejects or the caller hits its bounded timeout.
3. Control unwinds out of `startYandexOAuth()` before `createTabNextTo()` is invoked.
4. No OAuth tab for A can be created by this invocation, because the browser side-effect call was never admitted.
5. Pending A remains in session storage until its 10-minute expiry or another auth flow changes it.
6. `getYandexStatus()` can report `authPending:true`, while the visible Start Auth action returned an error and no authorization page exists for A.

This is the mirror image of the late-tab case:

- **after tab admission, unknown create settlement must retain PKCE** because the browser tab may exist;
- **before tab admission, a terminated preparation must not leave PKCE classified as an active browser authorization attempt** when the flow is proven unable to continue.

## Timeout nuance

`updateYandexConfig()` is an actual-settlement serialized mutation. A local timeout does not cancel its underlying storage write, but it **does** terminate this `startYandexOAuth()` continuation: the function will not later resume and call `tabs.create()` after the rejected bounded await.

Therefore two facts must be tracked separately:

- config mutation settlement may still be unknown/late;
- OAuth-tab admission for attempt A is definitively **not started** by this invocation.

The pending-attempt state should reflect the latter without pretending the config write was cancelled.

## Required contract

`yandexOAuthPending` needs an explicit attempt generation/phase, for example:

- `preparing`;
- `tab-create-admitted/unknown`;
- `tab-open/reconcilable`;
- `consumed/expired/aborted`.

If a pre-tab prerequisite fails:

- compare-and-retire only exact attempt A;
- do not remove a newer pending B that may have superseded A;
- preserve truthful config mutation settlement separately;
- status must not call A `authPending` as though the user can finish it through a browser page that was never opened.

If product wants to let the user retry opening the same A after config settles, that must be an explicit reconciliation action tied to A's receipt, not accidental retention of an undifferentiated pending object.

## Acceptance cases

1. Pending A stored -> config write succeeds -> tab create begins -> A advances to the tab-admitted lifecycle.
2. Config write proves failure -> exact A is retired; no phantom `authPending:true`.
3. Config write caller times out but actual write later succeeds -> A's tab phase remains not-started; no hidden late `tabs.create()` is possible.
4. Attempt B replaces A before A cleanup -> stale A cleanup cannot remove B.
5. Worker dies after pending A but before/during config prerequisite -> restart sees explicit preparation phase and applies bounded abort/reconcile policy rather than assuming a browser OAuth page exists.
6. Once `tabs.create()` is actually admitted, the separate P1-124/P1-178 late-create rule applies and PKCE is retained until exact create reconciliation/expiry.
7. PKCE verifier remains session-only and is never placed in browser-visible URLs/logs.

## Classification

No new blocker. **P1-178** remains the owner of pending OAuth attempt generation/state transitions. P1-124 begins only when browser tab creation is actually admitted.

## Validation note

Documentation only. Runtime/tests/manifest unchanged. Product tests were not rerun; historical 88/88 JS syntax + 74/74 deterministic PASS remains prior evidence. No build/tag/release.