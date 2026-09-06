# P1-191 — manual Yandex token replacement generation — 2026-09-07

Date: 2026-09-07  
Canonical baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Working branch: `research/p1-191-manual-token-generation-2026-09-07`  
Owner: **P1-191 ACTIVE**.

This is a research/model checkpoint. Production runtime and manifest remain unchanged.

## 1. Canonical owner

Registry defines P1-191 as:

> Manual-token replacement must validate candidate before generation-fenced commit and preserve last proven auth on failure/unknown; old PKCE cannot later overwrite it.

P1-191 owns manual replacement semantics. It composes with, but does not duplicate:

- **P1-178** — shared auth-attempt/settings-generation state machine;
- **P1-196** — generation-fenced demotion on invalid-token/401;
- **P0-074** — immutable live Yandex operation context;
- **P0-073** — durable expected account/root scope.

P1-191 MUST NOT create a parallel independent auth-generation counter. It consumes the shared generation authority that P1-178 owns.

## 2. Current-source defect: candidate becomes global auth before validation

Current `setManualYandexToken(token)` constructs a manual auth object and immediately executes:

```text
await writeYandexAuth(yandexAuth)
```

Only after that does it call ordinary `yandexApi('')` to validate/read Disk account metadata.

If validation fails, current code executes:

```text
await writeYandexAuth(null)
throw error
```

Therefore replacing proven token A with invalid/temporarily-unverifiable B can erase A.

This violates the desired replacement rule:

```text
last proven A remains authoritative
until B is independently proven and generation-CAS commits
```

## 3. Current-source defect: validation reads mutable global auth

Ordinary `yandexApi()` obtains the current access token through global auth state. Because current manual flow has already written B globally, validation happens to use B in the common case, but this is not a stable candidate-binding contract.

A future/parallel auth mutation can change current global auth while validation is in flight. P1-191 therefore requires a candidate-bound read primitive:

```text
validateYandexAuthCandidate(candidateContext)
```

or a P0-074-compatible context-bound API call that never rereads mutable global auth.

The candidate token remains transient memory only during validation.

## 4. Provider validation target

Official Yandex OAuth documentation states that OAuth tokens are bound to an account, an app and permissions. Yandex Disk documents authenticated REST access using `Authorization: OAuth <token>`; `GET https://cloud-api.yandex.net/v1/disk` is a provider-bound read suitable for proving that a candidate token can access Disk and for obtaining account metadata.

Validation must distinguish:

- `valid` — provider response proves candidate usable for required Disk API and yields acceptable account metadata;
- `invalid` — provider gives a definitive invalid/revoked/unauthorized result;
- `unknown` — timeout, transport failure, ambiguous server error or lifecycle interruption.

`unknown` is not `invalid` and not `success`.

## 5. Required replacement ordering

Given last proven auth A at shared auth generation G:

```text
read current shared auth generation G
capture candidate B privately
validate B with B-bound request/context
if invalid -> preserve A/G
if unknown -> preserve A/G
if valid -> CAS commit B only if shared generation is still G
```

On successful commit:

```text
auth = B
shared generation = G+1
```

If the generation changed while B was being validated, B is stale and MUST NOT overwrite the newer auth.

## 6. Old PKCE completion race

Current `finishYandexOAuth()`:

1. reads `yandexOAuthPending`;
2. performs network code exchange;
3. updates config clientId;
4. writes returned OAuth auth globally;
5. removes pending state;
6. may later write account metadata again.

There is no shared auth-generation CAS around these writes.

Race:

```text
PKCE attempt P starts at generation G
manual B validates and commits -> generation G+1
old P network exchange finishes
old P writes token -> B is overwritten
```

P1-191 requires that manual replacement invalidate the commit authority of any older PKCE attempt through the shared P1-178 generation/attempt receipt. P1-178 owns exact pending-state structure; P1-191 only requires the composition invariant:

```text
old auth attempt cannot commit after newer proven manual replacement
```

## 7. Candidate validation must not mutate durable/global state

Before candidate is proven, validation MUST NOT:

- write candidate into `yandexAuth` session storage;
- change root/config/publication settings;
- clear existing auth on timeout/failure;
- delete newer PKCE pending state;
- persist token in Journal/OperationLog/error strings.

Safe transient metadata may include a candidate validation id/generation, but the token remains secret and memory-only until successful auth commit.

## 8. Account continuity

If B is valid but belongs to a different Yandex account, that fact is part of the proven candidate metadata. Whether switching accounts is allowed for current pending operations is governed by P0-073/P0-074 and other Yandex namespace owners.

P1-191 does not silently reinterpret existing unresolved checkpoints under B.

## 9. Failure/unknown semantics

### Definitive invalid candidate

```text
A remains connected/proven
B discarded
UI reports replacement failed
```

### Validation timeout/transport unknown

```text
A remains connected/proven
B not committed
UI reports validation unknown/retryable
```

Do not clear A merely because B could not be validated.

### Stale generation after valid B

```text
B validation result may be real
but commit authority expired
B discarded
newer current auth remains
```

A fresh explicit user action may validate/commit again against the new generation.

## 10. Interaction with disconnect

Disconnect is a newer auth mutation. If manual candidate B began validation before disconnect and finishes afterward, generation CAS must reject B.

Conversely a manual replacement committed after a genuinely newer explicit disconnect would require a fresh user action/generation; an old in-flight candidate cannot resurrect auth.

## 11. Interaction with P1-196

P1-196 owns demotion after an API request proves the current exact auth generation invalid.

P1-191 must not reuse P1-196 semantics against an uncommitted candidate. Invalid candidate B is simply rejected; it does not demote proven A.

## 12. Deterministic model coverage

`project_tools/test_p1_191_manual_token_replacement_model.js` proves:

1. current-shaped pre-validation commit can erase proven A on invalid B;
2. target invalid B preserves A and generation;
3. target unknown B preserves A and generation;
4. valid B commits once under expected generation;
5. old PKCE cannot overwrite B after B increments generation;
6. validation consumes the explicit candidate, not mutable current global auth.

Model result: `P1-191 manual token replacement model: PASS`.

## 13. Runtime acceptance requirements

Future implementation/source gate should prove:

1. manual candidate is not written globally before provider validation;
2. candidate validation uses candidate-bound auth/context and does not reread mutable global auth;
3. invalid candidate preserves last proven auth;
4. unknown candidate preserves last proven auth;
5. successful manual replacement commits through shared P1-178 auth-generation CAS;
6. disconnect/newer auth mutation invalidates older candidate commit authority;
7. old PKCE exchange cannot commit after newer manual replacement;
8. old PKCE cleanup cannot remove newer pending/settings state;
9. candidate token remains secret/non-durable before commit;
10. account metadata stored with B is derived from B-bound validation;
11. P0-073/P0-074 namespace/context rules still apply to unresolved operations after account switch.

## 14. Status

P1-191 remains **ACTIVE**. Architecture/model are saturated enough for implementation planning, but current runtime still pre-commits manual candidate auth and lacks shared generation fencing against older PKCE completion.

Runtime/manifest remain `0.9.8`; release remains `NOT READY`.
