# P1-178 — Yandex auth-attempt + settings-generation state machine — 2026-09-07

Date: 2026-09-07  
Canonical baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Working branch: `research/p1-178-auth-attempt-generation-2026-09-07`  
Owner: **P1-178 ACTIVE**.

Research/model only. Production runtime and manifest are unchanged.

## 1. Canonical owner

Registry defines P1-178 as:

> OAuth pending/token exchange/config commit is one auth-attempt + settings-generation state machine; stale finish/cleanup cannot delete/overwrite newer attempt/settings.

P1-178 owns the shared generation authority consumed by P1-191 manual replacement and P1-196 invalid-token demotion. It must remain the **single** auth/settings generation; adjacent owners must not invent parallel counters.

## 2. Current start flow is split across mutable stores

Current `startYandexOAuth(clientId, sourceTabId)`:

1. generates state/codeVerifier/codeChallenge;
2. writes `yandexOAuthPending` to session storage;
3. writes `config.clientId = clientId` through `updateYandexConfig()`;
4. calls `createTabNextTo(...)`;
5. if tab creation fails, unconditionally removes `yandexOAuthPending`.

There is no attempt id/generation comparison on cleanup.

## 3. Newer-attempt deletion race

```text
A writes pending A
A writes clientId A
A waits for tabs.create
B starts
B overwrites pending with B
B writes clientId B
A tabs.create fails late
A cleanup removes yandexOAuthPending
```

The resulting config may say B while pending state is gone. A stale cleanup consumed B's authority.

Required: every pending write carries immutable `attemptId + generation`; cleanup is compare-and-remove only for that exact receipt.

## 4. Finish race after network exchange

Current `finishYandexOAuth(code)` reads one `yandexOAuthPending`, performs a network exchange, then later:

- writes config clientId from the previously read pending record;
- writes the returned auth globally;
- removes `yandexOAuthPending` unconditionally;
- may perform another account read and write auth again.

Any newer attempt/manual/disconnect occurring while exchange is in flight can therefore be overwritten by stale finish.

Required:

```text
capture exact pending attempt receipt R
exchange using R.clientId + R.codeVerifier
before every authoritative commit, prove R is still current generation
commit config/auth as one logical generation transition
consume only R, not whichever pending attempt exists now
```

## 5. Shared generation model

Conceptually:

```text
yandexAuthControl = {
  version: 1,
  generation: G,
  pendingAttempt: {
    attemptId,
    generation: G,
    clientId,
    codeVerifier,
    oauthState,
    createdAt,
    expiresAt
  } | null
}
```

Exact storage may differ. `codeVerifier` and access tokens remain session-only secrets.

A user-visible auth/settings intent that invalidates older commit authority advances the same generation. Examples:

- begin newer OAuth attempt;
- successful manual-token replacement (P1-191);
- explicit disconnect;
- successful OAuth finish;
- other auth-relevant settings transitions explicitly assigned to this generation by implementation.

## 6. Start semantics

A start operation obtains worker-issued `attemptId`, advances/claims generation and persists its exact pending receipt before opening the browser tab.

If opening the OAuth tab later fails:

```text
compare current pendingAttempt with attemptId+generation
if still same -> remove/mark failed
if newer/different -> do nothing
```

A stale start failure MUST NOT roll back newer config/pending state.

Prefer keeping clientId authoritative commit tied to successful finish. If product requires immediate persistence of entered clientId, that write must itself be generation-tagged and stale rollback/finish must compare the same generation.

## 7. Finish semantics

`finishYandexOAuth` captures exact R and validates expiration before exchange. Network exchange itself does not reserve future commit authority indefinitely.

After exchange returns:

```text
if current generation != R.generation -> stale, no auth/config write
if current pending attempt != R.attemptId -> stale, no write
else generation-CAS commit validated auth + clientId
then compare-and-remove exactly R
```

If commit spans session/local storage and cannot be physically atomic across Chrome storage areas, the implementation needs a recoverable logical commit/receipt so restart cannot expose a falsely coherent mixed generation. P1-178 owns that consistency contract; do not treat write ordering alone as atomicity.

## 8. Cleanup semantics

All cleanup is receipt-specific:

- expiration cleanup removes only the exact expired attempt it read;
- tab-open failure removes only its exact start attempt;
- successful finish consumes only its exact attempt;
- disconnect invalidates older attempts by advancing generation, then clears only state belonging to the prior generation or marks it stale;
- status reads must not delete a newer attempt because an older snapshot looked expired.

## 9. Interaction with P1-191

Manual replacement validates candidate privately. On successful generation-CAS commit, the shared generation advances. Any old OAuth exchange from the previous generation becomes stale and cannot overwrite the manual token.

Invalid/unknown manual candidate does not advance generation and does not clear current proven auth.

## 10. Interaction with P1-196

A 401/invalid-token demotion must target the exact auth generation that produced the failing request. If current generation is newer, stale demotion does nothing.

## 11. Interaction with P1-165

P1-165 separately owns effective returned-state verification. P1-178 does not claim the currently generated `state` is sufficiently verified merely because it is stored in the pending receipt.

## 12. Interaction with P0-074

Long Yandex operations acquire immutable live context from one proven auth generation. A later auth generation change does not mutate that operation's in-memory context; whether not-yet-admitted mutation is revoked belongs to the composing policy owners.

## 13. Deterministic model

`project_tools/test_p1_178_auth_attempt_generation_model.js` proves:

1. current unconditional start cleanup can delete newer pending B;
2. compare-and-remove stale A cannot consume B;
3. old exchange A cannot commit after newer attempt B starts;
4. old PKCE cannot overwrite newer manual auth;
5. exact current attempt commits clientId+auth once and consumes itself.

Model result: `P1-178 auth attempt/settings generation model: PASS`.

## 14. Runtime acceptance requirements

Future implementation must prove:

1. pending OAuth state carries worker-issued attempt identity and shared generation;
2. start failure cleanup is compare-and-remove;
3. expiration/status cleanup is compare-and-remove;
4. finish captures one exact attempt receipt before network exchange;
5. stale finish cannot overwrite newer pending/config/auth;
6. successful finish generation-CAS commits auth and its matching clientId;
7. successful finish cannot remove a newer pending attempt;
8. manual replacement/disconnect invalidate older finish authority through the same generation;
9. secrets remain session-only/non-loggable;
10. cross-storage logical commit/restart semantics are explicit and recoverable if physical atomicity is unavailable.

## 15. Status

P1-178 remains **ACTIVE**. Current source uses one unversioned `yandexOAuthPending` slot, unconditional cleanup, and non-generation-fenced config/auth writes after network exchange.

Runtime/manifest remain `0.9.8`; release remains `NOT READY`.
