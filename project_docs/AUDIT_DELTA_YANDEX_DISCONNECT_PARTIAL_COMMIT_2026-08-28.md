# Audit delta — Yandex Disconnect is a partial-commit auth transition — 2026-08-28

Source-of-truth `main` immediately before this write: `3c1b16574b51eec2667194f1d99bd94e73370fff`.

Docs-only audit checkpoint. Runtime/tests/configuration/manifest are unchanged.

## Classification

No new P-number is assigned.

Primary existing owners:

- **P1-177** — Disconnect must converge backup scheduler/auth-visible state;
- **P1-178** — PKCE/auth attempt state must be completion-aware and generation-fenced;
- **P1-210** — outer failure after a committed mutation requires reconciliation rather than blind replay;
- **P0-074** — already-started Yandex operations retain their own immutable operation context/settlement.

## Fresh source proof

`WEBCLIP_YANDEX_DISCONNECT` performs three sequential steps:

1. `await writeYandexAuth(null)` — removes the current `yandexAuth` object from `chrome.storage.session`;
2. `await runYandexAuthStorageOperation(() => chrome.storage.session.remove(['yandexOAuthPending']), ...)` — separately removes pending PKCE state;
3. `return {ok:true, ...(await getYandexStatus())}` — separately re-reads status for the response.

The auth removal and pending-attempt removal are serialized, but they are **not one atomic state transition**. The response/status read is another separate stage.

## Deterministic partial-commit schedules

### Current auth removed, pending cleanup fails

1. Current auth generation A is connected.
2. User presses Disconnect.
3. `writeYandexAuth(null)` physically commits: A access token is gone from session storage.
4. The following `yandexOAuthPending` removal times out/errors or the worker stops.
5. Handler rejects before returning success.
6. Options shows an error, but the user is already disconnected.
7. A stale pending PKCE attempt may still exist and can affect later status/finish logic under P1-178.

### Disconnect committed, status response fails

1. Auth and pending cleanup both commit.
2. `getYandexStatus()` fails/hangs.
3. Page sees an error although disconnect is complete.
4. A user retry is not proof of a new logout event; it is first a reconciliation of the already committed transition.

### Old in-flight remote operation

Disconnect removes authorization for new Yandex requests, but a signed upload/download or already-issued remote request may still have an independent actual settlement.

Therefore successful local logout is **not cancellation evidence** for an already admitted external side effect. This is already stated by P1-177/P0-074 and must remain explicit in the disconnect receipt.

## Required contract

### Auth transition receipt

Disconnect should use one immutable auth-transition generation/receipt that can represent:

- current auth A before transition;
- `authRemoved` committed/not committed/unknown;
- `pendingAttemptCleanup` committed/pending/unknown;
- scheduler reconciliation generation under P1-177;
- any known in-flight Yandex operations that continue independently.

The exact storage layout is implementation-specific, but page-visible completion must not depend on all ancillary steps succeeding in one call stack.

### Truthful partial result

If current auth removal is confirmed but PKCE cleanup or status refresh fails, the result is equivalent to:

`disconnected / reconciliation pending`

not “Disconnect failed and nothing changed”.

If the outer response is lost, Options should refresh/reconcile current auth generation before presenting a new destructive/auth mutation.

### Pending PKCE generation

A leftover `yandexOAuthPending` after committed disconnect must never become authority to re-install stale auth automatically.

P1-178 generation rules still apply:

- stale attempt is historical/inert after disconnect generation wins;
- cleanup removes only the exact old attempt generation;
- a newer Start Auth after disconnect cannot be removed by late old cleanup.

### Scheduler convergence

P1-177 remains mandatory: confirmed logout should drive backup scheduler to paused/no-auth without deleting user interval/enabled preferences. Failure of scheduler cleanup is an ancillary reconciliation state, not rollback of the factual logout.

## Required regressions

1. Disconnect all stages succeed -> auth absent, pending attempt absent, scheduler reconciled.
2. Auth removal succeeds -> pending cleanup fails -> status says disconnected + reconciliation pending after refresh.
3. Auth removal succeeds -> worker dies before response -> next status proves logout; UI does not claim A still connected.
4. Auth removal fails before commit -> previous auth A remains current and result says not disconnected.
5. Pending A exists -> disconnect commits -> late A finish cannot reinstall auth.
6. Disconnect A -> Start Auth B -> late old pending cleanup cannot remove B.
7. In-flight signed transfer admitted before logout may settle/reconcile independently; logout never fabricates cancellation.
8. Outer response loss after full disconnect -> retry first reconciles, not interpreted as proof first attempt did nothing.
9. Scheduler alarm cleanup fails after logout -> current auth remains absent and repair is retried separately.

## Duplicate check

P1-177 already owns disconnect-to-scheduler semantics and explicitly notes in-flight transfers. P1-178 owns PKCE generation/cleanup races. P1-210 owns unknown outer results.

This checkpoint connects those existing owners at the exact three-stage Disconnect implementation boundary; no new root-cause number is needed.

## Test / release state

Documentation only. Product tests were not rerun. Historical evidence remains **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. Runtime version remains `0.9.8`; no build, tag or GitHub Release was created.