# WebClip — P1-196 exact account-enrichment CAS — 2026-09-22

Date: 2026-09-22  
Owner: P1-196  
Baseline main: `4be2f05930ed5992b0e4cba504bee329ca5cb705`  
Baseline post-merge Repository Integrity: #1073 / run `35746419059` — SUCCESS  
Manifest version: `0.9.8`  
Release readiness: **NOT READY**

## 1. Purpose

Continue P1-196 after exact current-auth 401 demotion was integrated by PR #340.

The remaining positive-settlement race is:

```text
request under auth A starts
provider returns successful account metadata for A
auth B becomes current before local enrichment settles
late A response writes stale A/account metadata over B
```

Before this tranche, both `testYandexConnection()` and `getCurrentYandexAccountUid()` could perform a later ordinary `writeYandexAuth(...)` after a successful provider read. That write was not bound to the request receipt created by the P1-196 exact-auth request layer.

## 2. Acceptance boundary

This tranche implements only the positive account-enrichment part of the existing P1-196 contract:

```text
successful current-auth read
-> response carries the exact non-secret auth request receipt internally
-> account enrichment may settle only if record/auth/control identity still matches
-> stale A response cannot overwrite B
```

P1-196 remains **ACTIVE** because known local expiry transition, explicit present/valid/usable status axes, and recovery per-child auth recheck remain open.

## 3. Opt-in request receipt return

`yandexApi()` keeps its existing default return shape for all ordinary callers.

Only callers that set:

`includeAuthRequestReceipt: true`

receive:

```text
{
  data: <ordinary provider response>,
  authRequestReceipt: <secret-free request receipt or null>
}
```

The receipt is the same in-memory non-secret authority introduced by the prior P1-196 tranche. It contains record id, auth generation, control generation and binding state, but no access token or Authorization header.

Immutable P0-074 operation-context requests still have no global-current auth mutation authority and therefore carry no current-auth receipt.

## 4. Positive exact-request CAS

Production adds:

`compareUpdateYandexAuthIfCurrentRequest(receipt, patch)`

The helper succeeds only if all of these still match the captured request authority:

- current auth record id;
- current auth record generation;
- current shared control generation.

On exact match, it patches only the current auth record metadata and preserves the current token/record/generation.

Unlike 401 demotion, positive enrichment does **not** advance the shared generation.

If any identity differs, it returns false and writes nothing.

## 5. Connection-test composition

`testYandexConnection()` now requests an auth receipt together with Disk-info data.

For a modern bound current-auth request:

1. extract account data from the exact provider response;
2. CAS-enrich only the exact request auth;
3. if the CAS is stale, throw `YANDEX_AUTH_REQUEST_SUPERSEDED`;
4. do not continue into service-folder preparation under a different current auth.

This prevents a successful old A response from both overwriting B and then continuing a mixed-context connection test.

For legacy/unbound compatibility requests, provider data may still be returned, but there is zero account-write authority.

## 6. Current-account lookup composition

`getCurrentYandexAccountUid()` retains its cached-UID fast path.

When a provider read is required it now:

1. requests `includeAuthRequestReceipt`;
2. extracts the UID from that response;
3. CAS-enriches account metadata only when the request is modern and bound;
4. rejects a stale bound response with `YANDEX_AUTH_REQUEST_SUPERSEDED`;
5. performs no unconditional `writeYandexAuth(...)`.

An unbound legacy compatibility read can still return the observed UID but cannot mutate stored auth metadata. Broader legacy-operation continuity remains outside this bounded tranche.

## 7. Deterministic race coverage

New test:

`project_tools/test_p1_196_account_enrichment_runtime.js`

It proves:

- exact current A account enrichment succeeds without changing token or generation;
- late A response after B commit cannot update B;
- a newer control generation alone fences the old positive response;
- unbound response has zero account-write authority;
- stale connection-test response throws before folder continuation;
- successful connection test preserves its public result shape;
- stale current-account read cannot return A as current when exact receipt is superseded;
- successful exact current-account read returns provider UID;
- cached UID keeps the no-network fast path;
- unbound legacy read may return observed data but cannot write auth metadata;
- `yandexApi` receipt return is opt-in and default caller shape remains unchanged;
- both account-enrichment callers no longer contain unconditional `writeYandexAuth`.

The existing P1-196 refinement witness is updated to mark positive enrichment as implemented while keeping expiry/status/recovery gaps explicit.

## 8. Owner boundaries

This tranche does not alter:

- P1-178 shared auth generation ownership;
- P1-191 manual candidate validate-before-commit semantics;
- P1-195 capability truth;
- P1-177 backup scheduler generation;
- P1-179 namespace identity;
- P0-074 immutable operation-context semantics.

A positive read receipt authorizes only settlement against the exact current auth identity. It does not authorize mutation replay or retarget a historical operation.

## 9. Remaining P1-196 work

P1-196 remains **ACTIVE** after this tranche because:

1. known local expiry still blocks use without publishing an exact-generation validity transition;
2. status still exposes `connected` mainly from token presence rather than distinct presence/validity/usability axes;
3. unknown lifetime is still represented indirectly by `expiresAt=0`;
4. `recoverPendingRemoteSaves()` still uses one pre-loop auth/operation-context snapshot rather than rechecking each later auth-required child after invalidation;
5. real provider qualification is not performed here.

## 10. Release identity impact

`service-worker.js` changes again and is a canonical package member. Therefore current 34-file RPF and current 33-file control must be re-derived by exact-head P1-231 authority.

This document does not guess those digests. No QA-contract, Registry/full-RCF root, or builder-contract input is intentionally changed by this tranche.

## 11. Non-actions

No live Yandex credential/request, provider mutation, real Chrome qualification, physical release receipt, product ZIP/build, manifest version bump, release-policy activation, tag, deployment, GitHub Release or release decision is performed.

Manifest remains `0.9.8`; release readiness remains **NOT READY**.


## 12. CI discovery #1074

Repository Integrity #1074 / run `35747481769` on exact preliminary head `dc6ec0150a3b58e7d0adf0fc718e28a240410296` stopped at the PR change-contract metadata gate before JavaScript syntax/deterministic execution. The failure was caused by PR wording that named an additional owner code in descriptive boundary text; the body is corrected to declare only P1-196.

The independent source-generation lane completed successfully and derived current 34-file RPF `sha256:363e8df53233e035a079f5e2a26b124de8cf2b623749d6e4f457d5a94e0f8368`. Chrome QCF remains `sha256:3715a3453333d3d679a1c1c00a0bab6a02b77c0153f1a4e8d138aa1e8f5a984c`, Yandex QCF remains `sha256:8d6c9711b4f71b8485b49a6ab68f90bcf62bc74155ae0959dbdc4718648879a1`, full RCF remains `sha256:037cd4b167ed9c6b572b8e74ea8b355be9599c142c68bffce55e0fb386aab9ed`, and BCF remains unchanged.

Because the generic deterministic identity engine did not run, this tranche does not invent a current 33-file control digest. A later exact-head run must derive it and must pass the complete suite before merge. #1074 is discovery evidence only, not merge evidence.
