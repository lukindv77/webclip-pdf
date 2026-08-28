# Audit delta — OAuth completion partial-commit result — 2026-08-28

## Scope

Docs-only audit of `finishYandexOAuth()` after authorization-code exchange. No new P-number.

Refines **P1-178** auth-attempt generation and **P1-210** unknown/partial outer-result truthfulness. P1-196 validity semantics remain separate.

## Finding

A successful authorization-code exchange is followed by several independently fallible local/ancillary steps:

1. `exchangeAuthorizationCode(...)` returns an access token;
2. `updateYandexConfig()` persists Client ID;
3. `writeYandexAuth(yandexAuth)` persists the session auth capability;
4. pending PKCE state is removed;
5. account metadata is fetched and best-effort enriched;
6. `getYandexStatus()` is read for the response.

The current handler has no explicit commit-result state for those boundaries.

### Partial commit A — auth capability committed, pending cleanup fails

If step 3 succeeds but step 4 fails/times out:

- the new access token is already current in `chrome.storage.session`;
- `finishYandexOAuth()` throws instead of returning success;
- `yandexOAuthPending` may remain;
- the UI can present the attempt as failed and encourage the user to submit the same one-time verification code again;
- a second code exchange is not a valid reconciliation mechanism for a code already consumed by the provider.

This is a committed-auth / ancillary-cleanup-pending result, not an all-or-nothing failure.

### Partial commit B — token issued remotely, local commit fails

If the provider successfully issued/returned the token but Client-ID/auth storage cannot be durably committed, the authorization code has already crossed its one-time exchange boundary. Repeating the same code must not be represented as the expected recovery action.

The safe result is explicit local-commit failure requiring a fresh authorization attempt after storage health is restored.

### Unknown token-exchange settlement

A network timeout/lost response during the code exchange can also mean the provider consumed the code even though WebClip never received a usable token. Since WebClip cannot reconstruct an unknown access token, this class is not safely retried with the same code unless the provider's real documented semantics explicitly permit it.

This is analogous to non-cancellable/one-shot side-effect reasoning: lack of a local response is not proof that the remote one-time capability remained unused.

## Required result model

OAuth completion should expose distinct states such as:

- `exchange-not-started / validation-failed`;
- `exchange-outcome-unknown`;
- `token-received-local-commit-failed`;
- `auth-committed-reconciliation-pending`;
- `fully-reconciled`.

Once exact auth generation G is durably committed, later PKCE cleanup/status/account enrichment failure cannot make the UI claim “authorization failed”. It should report connected/auth-committed with a repairable ancillary warning and reconcile exact G.

Conversely, if no token was durably stored, WebClip must not claim connected merely because remote exchange may have succeeded.

## Generation requirements

- PKCE pending removal must compare/remove the exact attempt generation that produced G; a stale cleanup cannot remove a newer attempt.
- Account enrichment remains generation-fenced per P1-178; ancillary success from old G cannot overwrite newer auth H.
- A retry/reopen flow must first read current auth/pending generations before deciding whether another exchange is needed.
- An already committed G must not be overwritten merely because the original Finish RPC response was lost.

## Acceptance cases

1. Exchange + local auth commit + pending cleanup all succeed -> fully reconciled success.
2. Auth G commits, pending remove fails -> UI/status says G is connected with cleanup pending; same code is not blindly re-exchanged.
3. Token response received, auth storage fails -> no connected claim; user is told a fresh authorization attempt is required after local storage recovery.
4. Exchange response is unknown after timeout -> same code is not blindly auto-retried; attempt transitions to explicit unknown/fresh-auth-required policy.
5. Finish response channel is lost after G committed -> reopen/status reconciles G instead of starting another auth mutation.
6. New auth H supersedes G while old cleanup/account work finishes -> old work cannot clear/overwrite H.
7. Stale pending attempt A cannot be removed by cleanup belonging to committed attempt B unless identity proves A is the consumed predecessor.

## Classification

- **P1-178**: exact auth/pending generation and stale completion fencing.
- **P1-210**: truthful outer result after a mutation may already have committed.

No new P1-211 is allocated.

## Validation note

Documentation only. Product tests were not rerun. Historical 88/88 JS syntax + 74/74 deterministic PASS remains prior evidence. No build/tag/release.