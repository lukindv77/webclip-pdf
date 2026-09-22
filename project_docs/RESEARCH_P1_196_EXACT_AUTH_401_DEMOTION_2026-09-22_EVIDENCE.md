# WebClip — P1-196 exact current-auth 401 demotion — 2026-09-22

Date: 2026-09-22  
Owner: P1-196  
Canonical baseline: `e49e3440d4ed2cfee39034aca0bb8552e8126f1a`  
Baseline post-merge Repository Integrity: #1070 / run `35741436946` — SUCCESS  
Manifest: `0.9.8`  
Release readiness: **NOT READY**

## 1. Scope

This is a bounded P1-196 runtime tranche. It implements exact request-authority binding and generation-fenced invalidation for ordinary current-auth Yandex Disk requests without claiming complete P1-196 closure.

The current owner remains:

```text
P1-196 | ACTIVE | Invalid-token/401 demotion is exact auth-generation fenced;
stale failure from auth A cannot clear/downgrade newer auth B.
```

This tranche does **not** implement the remaining local-expiry validity state, connected/present/usable status separation, or per-child recovery recheck. Those gaps keep P1-196 ACTIVE.

## 2. Pre-change gap

Before this tranche, ordinary `yandexApi()`:

1. read the current token as a bare string;
2. built `Authorization: OAuth <token>`;
3. spread caller headers after the worker header, so a caller could structurally override `Authorization`;
4. attached HTTP status/provider code to failures;
5. had no exact request record/generation receipt;
6. had no current-auth 401 demotion transition.

A late 401 therefore had no safe mutation authority, and an invalid/revoked current token could remain globally usable for later admission.

## 3. External research boundary

Fresh comparison material reviewed on 2026-09-22:

- Yandex Disk REST API: https://yandex.com/dev/disk/rest/
- Yandex Metrica authorization: https://yandex.com/dev/metrika/en/intro/authorization
- Yandex Webmaster error reference: https://yandex.com/dev/webmaster/doc/en/reference/errors
- RFC 6750: https://www.rfc-editor.org/rfc/rfc6750

The Disk documentation establishes the OAuth-authorized HTTP API context. Yandex Metrica documents 401 when authorization is missing/invalid, while Yandex Webmaster documents 403 variants that can represent either access/permission failure or invalid OAuth token. Those are cross-Yandex comparisons, not Disk-specific error-contract proof.

RFC 6750 independently distinguishes invalid-token 401 from insufficient-scope 403 for standard Bearer semantics. Yandex Disk uses the provider-specific `Authorization: OAuth ...` scheme rather than RFC 6750's literal `Bearer` scheme, so the RFC is used only as a semantic cross-check.

Resulting implementation policy is intentionally narrow:

```text
exact current ordinary Disk request + HTTP 401 -> eligible for exact CAS demotion
403 / 429 / 5xx / timeout / network           -> operation failure only
immutable operationContext 401                -> no global-auth mutation authority
unbound legacy auth 401                       -> no global-auth mutation authority
```

No claim is made that every Yandex 401/403 across every service has identical semantics.

## 4. Worker-owned Authorization

Production adds:

`sanitizeYandexApiCallerHeaders(headers)`

The helper rejects any case variant of caller `Authorization` with:

`YANDEX_CALLER_AUTHORIZATION_FORBIDDEN`

The final request headers are assembled with worker-owned `Accept` and `Authorization` after benign caller headers. Therefore the token selected by the worker is the token actually placed in the final OAuth header.

This closes the specific P1-196 request-binding ambiguity without changing signed-transfer behavior.

## 5. Exact current-auth request authority

Production adds:

`captureCurrentYandexAuthRequestAuthority()`

It first consumes the existing auth migration/security cleanup boundary, then reads the current session auth record and shared P1-178 control generation in one serialized storage operation.

It returns:

```text
{
  accessToken: <memory-only secret>,
  receipt: {
    requestKind: "disk-oauth",
    authRecordId,
    authGeneration,
    controlGeneration,
    authorizationBound
  }
}
```

The receipt is non-secret. It contains neither the token nor an Authorization header value.

`authorizationBound=true` requires current shaped auth identity: a non-empty record id plus positive auth/control generations. Legacy/unbound auth may continue through the compatibility request path, but its response has zero global-auth mutation authority.

The record generation and shared control generation are retained separately. This is deliberate after P1-191: a failed manual replacement can advance the shared control generation while preserving the previously committed auth record. A later request can still describe both exact facts rather than pretending they are equal.

## 6. Exact 401 CAS demotion

Production adds:

`demoteYandexAuthIfCurrentRequest(receipt)`

The transition succeeds only when all of these still match the captured request authority:

- current auth record id;
- current auth record generation;
- current shared control generation.

On exact match, the worker atomically:

- clears current auth;
- advances the shared P1-178 control generation once;
- clears stale pending OAuth authority.

If any identity changed after the request started, the function returns false and changes nothing.

Therefore:

```text
request A captured
B commits
late A/401
-> operation A fails
-> B remains unchanged
-> no B generation advance
```

A control-generation change alone also fences an older response even if the old auth record has not yet been replaced.

## 7. P1-191 composition

P1-191 now validates manual candidate B before commit. A failed candidate can leave proven auth A stored while shared control generation has advanced.

This P1-196 tranche captures both:

```text
A.authGeneration = G
controlGeneration = G+1
```

If no newer transition occurs after capture, an authoritative A/401 may still exactly demote that preserved current record and advance control generation from G+1 to G+2.

If B or any newer auth/control intent settles first, exact CAS fails and the late A response cannot mutate the newer state.

## 8. Immutable operationContext boundary

P0-074 operation contexts intentionally pin historical long-running work to their captured token/account/root/publication state.

This tranche does **not** extend operation contexts with global-current auth mutation authority.

If an operation-context request returns 401:

```text
the operation fails
global current auth is not demoted by that response
```

That avoids using a historical/stale immutable context to clear a newer global credential. A later P1-196/P0-074 composition tranche may add explicit non-secret auth identity to operation contexts if required by a proven acceptance contract.

## 9. Generic failure classification

Only the explicit 401 branch invokes the new current-auth demotion CAS.

The following do not mutate global auth:

- 400;
- generic 403;
- 429;
- 5xx;
- timeout/abort;
- network failure;
- immutable-operation-context 401;
- unbound legacy-auth 401.

Signed transfer failures remain outside `yandexApi` OAuth authority and therefore outside this demotion path.

## 10. Deterministic coverage

New:

`project_tools/test_p1_196_exact_auth_401_runtime.js`

Coverage includes:

- secret-free request receipt separate from memory-only token;
- exact auth record/control generation capture;
- three case variants of caller Authorization rejection before fetch;
- benign caller header preservation with worker-owned final OAuth/Accept values;
- exact current A/401 demotion;
- A request -> B commit -> late A/401 cannot demote B;
- control-generation change without record replacement fences late response;
- preserved A after failed manual intent remains exactly demotable when no newer transition occurs;
- 400/403/429/5xx do not demote;
- network failure does not demote;
- legacy/unbound 401 cannot mutate auth;
- operation-context 401 cannot mutate global auth;
- known local expiry remains an explicit current gap;
- no real provider call is made by the test.

Existing deterministic source witnesses for P1-196, P0-074, W5 auth core and the Yandex effect-adapter model are synchronized to the new header/request-authority shape without changing their owner boundaries.

## 11. Remaining P1-196 gaps

P1-196 stays **ACTIVE** after this tranche because these acceptance items remain open:

1. token presence, validity and usability are still not first-class separate runtime/status axes;
2. known local expiry still throws without publishing an exact-generation validity transition;
3. unknown lifetime remains represented only indirectly by `expiresAt=0`;
4. immutable operation-context requests do not carry current-global demotion authority;
5. `recoverPendingRemoteSaves()` still captures one auth/operation-context snapshot before the queue and does not recheck auth generation/usability before every later auth-required child;
6. no live Yandex qualification is performed here.

## 12. Release identity impact

`service-worker.js` is a current package member, so the exact 34-file RPF and the current 33-file negative/control projection will advance.

This document does not guess their final values. Exact-head P1-231 source-generation authority must derive them from the PR head, after which current identity pins will be synchronized.

No QA-contract input, full-RCF root, or builder-contract input is intentionally changed by the runtime/test/evidence tranche. QCF/full-RCF/BCF changes are not claimed absent exact authority output.

## 13. Non-actions

This tranche performs no live Yandex request with real credentials, no provider mutation, no real Chrome qualification, no physical release-evidence admission, no official product ZIP/build, no manifest version bump, no release-policy activation, no tag, deployment, GitHub Release, or release decision.

Manifest remains `0.9.8`; release readiness remains **NOT READY**.
