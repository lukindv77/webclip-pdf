# P1-178 — current-main auth-attempt/settings generation refinement — 2026-09-10

Date: 2026-09-10  
Canonical baseline: `main = d09ec5cbb4666636c983fb3385481d3c6eb5d9e3`  
Canonical `service-worker.js` blob: `6d61ac81befdbf2804ae9dbec425aa08d1194eb1`  
Working branch: `research/p1-178-auth-attempt-generation-refinement-2026-09-10`  
Owner: **P1-178 ACTIVE**.

Research/model only. Production runtime, `manifest.json`, release-readiness authority, provider L5 and S2 activation are unchanged.

## 1. Canonical owner and current-main question

Registry owner:

> OAuth pending/token exchange/config commit is one auth-attempt + settings-generation state machine; stale finish/cleanup cannot delete/overwrite newer attempt/settings.

The historical P1-178 contract already established one shared Yandex auth/settings generation. This refinement asks a narrower current-main question after later W5/auth and storage-ordering work:

> Which P1-178 requirements have actually been absorbed by canonical production source at `d09ec5cb…`, which remain gaps, and how must the shared generation compose with P1-191, P1-196, P1-177 and P0-074 without creating parallel authority axes?

This document does not claim implementation closure.

## 2. Fresh canonical baseline

Immediately before branch creation:

- `main = d09ec5cbb4666636c983fb3385481d3c6eb5d9e3`;
- the commit is GitHub-verified;
- P1-178 remains `ACTIVE` in the canonical Registry;
- P1-177 and P1-179 current-main refinements are already canonical;
- runtime/manifest version remains `0.9.8`;
- release readiness remains under untouched V1 authority;
- no new P-code is allocated.

The post-P1-177 canonical Repository Integrity run `34497403451` checked out exact `d09ec5cb…`, passed P1-177 `94/94`, P1-179 `85/85`, all `116` deterministic JS test files with `failures=0`, and Recovery archive self-test. Release readiness remained `NOT READY` with the same five blockers.

## 3. Absorbed positive controls: serialization is real, but is not generation authority

Current production source has meaningful protections that must be preserved.

### 3.1 Yandex auth storage actual settlements are serialized

`runYandexAuthStorageOperation()` holds a queue turn until the real Chrome Storage operation settles, even if the caller's bounded wait times out. This prevents a later storage mutation from overtaking an earlier still-running physical mutation.

That closes an ordering class, but not the P1-178 authority class.

A network exchange may capture logical authority under old state A, wait outside the storage queue, and return after B has become current. When A later enters the serialized queue, serialization only says where A's stale mutation is ordered; it does not prove A is still allowed to mutate current state.

Therefore:

```text
actual-settlement serialization != logical generation CAS
```

Both are required.

### 3.2 OAuth secrets remain session-only

Current auth uses session storage for access-token state and pending PKCE material. Legacy persistent token cleanup is fail-closed. P1-178 must preserve that security invariant.

The target generation/receipt must not move `codeVerifier` or access tokens into durable/local logs or research receipts.

### 3.3 PKCE S256 remains a positive control

Current OAuth authorization request uses `code_challenge_method=S256`, and pending PKCE data carries the verifier only inside extension session state.

P1-178 does not replace P1-165: generated `state` being stored is not proof that returned state is effectively verified. `returned_state_authority` therefore remains false/unresolved until P1-165 is closed.

## 4. Current source still has one unversioned pending slot

`startYandexOAuth()` currently writes:

```text
yandexOAuthPending = {
    clientId,
    codeVerifier,
    state,
    createdAt,
    expiresAt
}
```

There is no worker-issued attempt identity and no shared auth/settings generation on the record.

The source has no production `authAttemptId`, `oauthAttemptId`, `authGeneration` or `yandexAuthGeneration` authority for this flow.

The target is conceptually:

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

Exact storage field names are implementation detail. The single-generation invariant is not.

## 5. Start-failure cleanup still has the A→B deletion race

Current sequence:

1. A writes global pending A;
2. A writes Client ID A;
3. A waits for `tabs.create` settlement;
4. B starts and overwrites global pending/config with B;
5. A's tab creation fails late;
6. A unconditionally removes `yandexOAuthPending`.

Result: B's pending authority is deleted by stale A.

Target cleanup is receipt-specific:

```text
compare current pending attemptId + generation with A receipt
same -> consume/fail A
different/newer -> stale no-op
```

A late start failure also must not roll back newer settings state.

## 6. Status/expiry cleanup has the same stale-snapshot class

`getYandexStatus()` reads a pending snapshot and later removes the global slot when that snapshot is invalid/expired.

Race:

```text
status reads expired A
B starts and becomes current
old status continuation removes global pending
```

Target:

```text
expiry cleanup is compare-and-remove(exact A receipt)
```

A read-only/status path may perform bounded maintenance, but an old observation is never mutation authority over a newer attempt.

## 7. Finish remains unfenced across the network boundary

Current `finishYandexOAuth(code)`:

1. reads the current pending object;
2. validates local expiry;
3. performs token exchange using captured `clientId + codeVerifier`;
4. after the network returns, separately persists captured Client ID;
5. writes returned auth globally;
6. removes global `yandexOAuthPending` unconditionally;
7. performs a Disk account read;
8. may write the same auth object globally again after enriching `account`.

The network exchange must not reserve future commit authority indefinitely.

Required sequence:

```text
capture immutable pending receipt R
perform exchange using R
before every authoritative commit:
    prove current generation == R.generation
    prove current pending attempt == R.attemptId/R.generation
commit OAuth result as one logical generation transition
consume only R
```

If either comparison fails, the token exchange result is stale for global mutation. It may be discarded without deleting the newer attempt or current auth.

## 8. The second account-enrichment write is independently generation-sensitive

A successful token exchange can be committed, followed by a best-effort `GET disk` to learn account metadata.

Current code mutates the previously created `yandexAuth` object and calls `writeYandexAuth(yandexAuth)` again.

Race:

```text
A OAuth commit succeeds
A account read starts
B/manual/disconnect advances auth generation
A account read returns
A writes old auth object again
```

This second write must not resurrect or overwrite newer auth.

Safe options include:

- include proven account metadata in the original logical commit if available before commit; or
- perform later enrichment with `expectedGeneration + authRecordId` CAS and update only the current matching auth record.

Account enrichment is metadata enrichment, not new authority.

## 9. P1-191 composition: manual candidate semantics stay with P1-191

P1-191 owns manual-token replacement semantics. It consumes, but does not create, P1-178's shared generation.

Current production source still writes a manual candidate globally before validation, calls global `yandexApi('')`, and on failure clears global auth. This preserves the historical P1-191 gap.

P1-178 refinement does not claim that gap as its own. It only defines the shared mutation authority P1-191 must consume:

```text
capture current generation G
hold candidate B privately
validate B using candidate-bound request/context
invalid/unknown -> preserve current auth and G
valid -> generation-CAS commit only if G is still current
success -> advance shared generation
```

A successful manual replacement invalidates every old OAuth finish receipt. A failed/unknown candidate does not advance generation merely because validation was attempted.

## 10. Disconnect composition

Explicit Disconnect is a user-visible auth transition and advances the same P1-178 generation.

Current source clears auth and pending as separate operations without shared generation authority.

Required logical outcome:

```text
Disconnect claims/advances shared generation
older OAuth start/finish/account-enrichment authority becomes stale
current auth becomes unusable/disconnected
pending from the invalidated generation is consumed/marked stale by exact ownership
```

If physical storage spans session/local areas and a failure interrupts the transition, the next read/restart must not fabricate a coherent connected state from mixed-generation pieces.

P1-177 consumes this auth-generation change to pause new backup admissions. Already-started signed effects remain separately reconciled; Disconnect is not evidence that a remote side effect was cancelled.

## 11. P1-196 composition: exact-generation demotion only

P1-196 owns validity/demotion semantics and consumes the same generation.

For an OAuth-authorized Disk request:

```text
capture exact auth generation G / opaque auth record A
prove request Authorization is bound to A/G
receive authoritative invalid-auth 401
CAS current auth == A/G
success -> demote/expire A and advance shared generation
failure -> response is stale for global auth mutation
```

A late 401 from A after B became current still fails operation A, but cannot clear/downgrade B.

P1-178 does not broaden provider error classification. In particular:

- generic 403 is not automatically invalid-token authority;
- signed-transfer 401/403 is not OAuth-token invalidation authority;
- timeout/network unknown does not demote current auth without exact evidence.

## 12. One generation, not owner-specific counters

The following all participate in one logical auth/settings generation sequence:

- newer OAuth attempt begins;
- successful OAuth finish commits;
- successful manual replacement commits (P1-191 consumer);
- explicit Disconnect commits;
- exact current-auth invalidation/expiry transition commits (P1-196 consumer);
- any future auth-relevant settings mutation explicitly assigned to this authority.

The following must not create independent counters that can disagree:

- OAuth generation;
- manual-token generation;
- invalid-token generation;
- backup no-auth generation.

P1-177 has its own scheduler generation for scheduler callbacks, but consumes P1-178 auth generation as an admission input. P1-179 separately owns account/root backup namespace. These are composition dimensions, not substitutes for each other.

## 13. Successful OAuth commit and successor generation

A coherent implementation may use either transaction-style generation claiming or compare-and-swap storage, but external semantics must be equivalent:

```text
pending attempt R belongs to generation G
exchange completes
CAS proves R/G is current
logical OAuth commit creates current auth generation G+1
R is consumed exactly once
```

After that transition:

- duplicate finish of R is stale;
- late cleanup of R is stale;
- a 401 receipt from a pre-G+1 auth is stale;
- later account enrichment must expect G+1 exactly;
- scheduler/recovery consumers observe the new auth generation rather than inferring authority from token presence.

## 14. Cross-storage logical atomicity and restart

Current auth/pending secrets are session-scoped while `yandexConfig` is local storage. Chrome does not provide one physical transaction across those storage areas.

Therefore merely choosing a write order is not atomicity.

Required contract:

1. an auth/config transition has one logical generation/commit identity;
2. readers do not report a mixed generation as coherent current auth;
3. a worker restart can detect an incomplete/mixed transition using non-secret commit/control metadata;
4. recovery either completes the exact transition or fails closed to an explicitly non-usable state;
5. recovery never replays a stale token/config write over a newer committed generation;
6. secret material remains session-only and is not copied into durable recovery receipts.

Exact storage topology is deferred to implementation. This research requires recoverable semantics, not a specific database.

## 15. Operation-context boundary

P0-074 continues to own immutable live Yandex operation context.

An operation admitted under auth A/G may keep its immutable in-memory context for already-admitted work, subject to the composing effect policy. A later B/G+1 must not silently retarget that operation to B.

P1-178 controls global auth mutation authority. It does not authorize replaying old mutations under new credentials.

## 16. P1-165 remains unresolved

P1-178 binds attempt identity, generation, Client ID and PKCE material. It does not claim that the returned OAuth `state` has been effectively verified simply because a state value was generated and stored.

Therefore:

```text
returned_state_authority = false
p1_165 = unresolved
```

must remain visible in composition evidence.

## 17. Current-main deterministic race matrix

The refinement model covers at least these schedules:

| Case | Schedule | Required result |
|---|---|---|
| A01 | start A; start B; late A tab-open failure | B pending survives |
| A02 | status reads expired A; start B; old cleanup | B pending survives |
| A03 | finish A exchange; start B; A response | A cannot commit/remove B |
| A04 | finish A exchange; manual B succeeds | A cannot overwrite B |
| A05 | finish A exchange; Disconnect | A cannot resurrect auth |
| A06 | A commits; account enrichment waits; B commits | stale enrichment no-op |
| A07 | request A/G; B commits; late A/401 | B unchanged |
| A08 | request current A/G; authoritative 401 | exact A demoted once |
| A09 | duplicate A/401 after demotion | stale/idempotent no-op |
| A10 | manual invalid/unknown candidate | proven current auth/generation unchanged |
| A11 | exact current OAuth finish | one logical successor generation; own receipt consumed |
| A12 | duplicate/late cleanup of consumed receipt | no-op |
| A13 | mixed session/local logical commit after restart | fail closed/recover exact transition |
| A14 | old recovery receipt after newer generation | cannot complete over newer state |
| A15 | storage operations serialized but stale logical receipt arrives later | serialization does not grant authority |
| A16 | signed-transfer 401/403 | no OAuth demotion authority |
| A17 | OAuth 403 without exact invalid-token classifier evidence | no blanket demotion |
| A18 | network timeout/unknown | no auth demotion solely from unknown |
| A19 | known-expiry transition A races B | stale expiry cleanup cannot clear B |
| A20 | scheduler admission after auth generation changes | P1-177 must consume fresh auth generation |

Additional deterministic variants exercise repeated generations, duplicate receipts, old/new attempt ids and successor-generation account enrichment.

## 18. Implementation acceptance contract

Future runtime closure of P1-178 must prove all of the following together:

1. one shared auth/settings generation exists in production source;
2. OAuth pending carries worker-issued immutable attempt identity + generation;
3. start-failure cleanup is exact compare-and-remove;
4. status/expiry cleanup is exact compare-and-remove;
5. finish captures one immutable attempt receipt before exchange;
6. token exchange completion has no commit authority without a fresh generation/attempt CAS;
7. OAuth auth + matching Client ID publish as one recoverable logical generation transition;
8. successful finish consumes only its own receipt;
9. delayed account enrichment is exact successor-generation fenced;
10. successful manual replacement consumes this same generation under P1-191 semantics;
11. Disconnect invalidates older finish/cleanup/enrichment authority through this same generation;
12. P1-196 invalid-token/expiry demotion consumes this same generation and cannot clear newer auth;
13. cross-storage partial commit/restart is explicitly detectable and recoverable/fail-closed;
14. storage actual-settlement serialization remains preserved but is not treated as CAS;
15. tokens/PKCE secrets remain session-only/non-loggable;
16. P1-165 returned-state verification remains separate until independently closed;
17. P0-074 immutable operation context remains separate;
18. P1-177 scheduler and P1-179 backup namespace consume/compose with, rather than replace, auth generation.

## 19. Status

P1-178 remains **ACTIVE**.

Current canonical runtime has useful storage-ordering and secret-storage protections, but it still lacks the shared generation/attempt receipt and compare-and-commit/compare-and-remove authority needed to prevent stale OAuth cleanup/finish/enrichment from mutating newer state.

This refinement is research-only. No runtime, manifest, provider L5, release receipt/readiness, official artifact, tag, GitHub Release, deployment or S2 activation is authorized or changed.