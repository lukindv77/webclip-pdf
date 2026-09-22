# WebClip — P1-191 manual token validate-before-commit — 2026-09-22

Date: 2026-09-22  
Owner: P1-191  
Baseline main: `fa286e2f6d9782e0e7138b4a526b4e77f249e8f5`  
Manifest version: `0.9.8`  
Release readiness: **NOT READY**

## 1. Purpose

Implement the runtime ordering contract already defined by P1-191:

```text
manual candidate B received
-> B becomes a newer auth intent under the shared auth generation
-> B is validated privately, using B itself as request authority
-> invalid/unknown B does not mutate committed auth
-> valid B commits only if its expected generation is still current
```

Before this tranche, P1-178 had already fenced stale OAuth settlement, but the manual path still installed B into `yandexAuth` before validation. A failed or ambiguous validation could therefore replace proven A temporarily and then clear B, losing A even though B never became proven replacement authority.

## 2. External provider comparison

Fresh official Yandex documentation was rechecked on 2026-09-22:

- https://yandex.com/dev/id/doc/en/tokens/debug-token
- https://yandex.com/dev/disk/rest/
- https://yandex.com/dev/id/doc/en/codes/code-and-token
- https://yandex.com/dev/id/doc/en/access

The provider documentation establishes that manually obtained/debug OAuth tokens are intended for API access/testing and that a token is request authority for Yandex APIs. The existing WebClip Disk-info endpoint is a read-only provider check and already supplies account metadata used by the runtime.

This tranche does not infer full Disk capability from one successful read. Capability provenance remains separately owned by P1-195.

## 3. Candidate-bound validation

Production adds:

`validateManualYandexTokenCandidate(token, timeoutMs)`

The helper:

- sends exactly one bounded `GET https://cloud-api.yandex.net/v1/disk`;
- places the candidate only in the request `Authorization: OAuth <candidate>` header;
- never calls `getValidYandexAccessToken()` or generic `yandexApi()`;
- follows no redirects;
- writes no OperationLog event;
- does not persist the candidate before validation;
- uses the existing bounded response parser and account extractor.

The returned validation metadata contains only bounded account identity. It never returns the candidate token.

## 4. Validation result classes

The source deliberately keeps validity narrower than capability:

```text
HTTP 2xx + non-empty Disk account uid -> valid
HTTP 401                          -> invalid candidate
403 / 4xx other than 401         -> unknown for replacement authority
429                               -> unknown
5xx                               -> unknown
timeout / network / abort         -> unknown
2xx without reliable account uid -> unknown
```

Only the explicit unauthorized response is treated as authoritative invalid-candidate evidence. A permission/capability failure is not automatically reclassified as an invalid OAuth credential.

Both `invalid` and `unknown` throw before any committed-auth mutation.

## 5. Shared-generation composition

Starting a manual replacement still calls the existing P1-178 generation barrier first:

`advanceYandexAuthControlGeneration('Поколение manual-token intent Яндекс Диска')`

This immediately prevents an older in-flight PKCE/manual result from committing after the new manual intent.

Crucially, that generation advance does **not** delete or replace the last committed auth record. If B is invalid or unknown, A remains physically stored and available under its existing auth-record identity.

The shared control generation is monotonic and is not rolled back after a failed candidate. Avoiding rollback prevents ABA reuse of an older generation.

## 6. Commit CAS

Production adds:

`commitManualYandexAuthIfGeneration(expectedGeneration, auth)`

After successful candidate-bound validation, the helper:

1. re-reads the current shared auth generation;
2. rejects B if another OAuth/manual/disconnect intent advanced it;
3. on exact equality, installs B and clears obsolete pending OAuth authority in one session-storage mutation;
4. only after successful commit performs legacy persistent-secret cleanup and session-only config settlement.

A stale valid B returns `YANDEX_MANUAL_AUTH_SUPERSEDED` and cannot overwrite whichever auth became current later.

## 7. Account and capability truth

B's committed `account` is derived directly from B's validation response, not from a later global-auth read.

The manual auth record intentionally keeps:

```text
scope = ""
expiresAt = 0
```

A successful Disk-info read proves candidate acceptance for that exact read and yields account identity. It does not manufacture evidence that all requested Disk write/publish/move capabilities were granted. P1-195 therefore remains separate.

## 8. Candidate rejection is not current-auth demotion

A candidate-bound 401 rejects B before commit. It is not a 401 observed while using committed A and therefore does not authorize P1-196-style demotion of A.

Likewise, timeout/network/403/5xx results have no authority to clear A.

## 9. Deterministic coverage

New test:

`project_tools/test_p1_191_manual_token_runtime.js`

It covers:

- exact candidate token owns the validation Authorization header;
- validation does not reread global auth;
- successful account identity comes from the candidate response;
- candidate secret is absent from returned/error metadata;
- 401 is invalid;
- 400/403/429/5xx are unknown;
- network/abort are unknown;
- missing account uid is unknown;
- exact generation commits validated B;
- stale generation cannot replace A;
- stale candidates perform no post-commit cleanup/config side effects;
- source order is generation barrier -> private validation -> commit CAS;
- there is no pre-validation `writeYandexAuth(yandexAuth)`;
- rejection has no `compareClearYandexAuthRecord` path;
- manual capability remains unproven.

Existing P1-191, W5 fixed-redirect and P1-177 witnesses are reconciled to the new source shape without changing their neighboring owner boundaries.

## 10. Identity impact

`service-worker.js` is a current package member, so the package RPF and current 33-file negative/control projection will change.

This evidence intentionally does not guess those values. The exact-head source-generation / identity authority must derive them from the final PR head before current identity pins are synchronized.

No canonical QA-contract input or builder-contract input is changed by this tranche, so no Chrome/Yandex QCF, full RCF or BCF change is claimed without exact-head authority output.

## 11. Evidence boundary

This is source/runtime + deterministic evidence.

It does not perform:

- a live Yandex request with a real user token;
- real Chrome qualification;
- provider mutation;
- physical release-evidence admission;
- product ZIP/build;
- manifest version bump;
- release-policy activation;
- tag, deployment or GitHub Release;
- release decision.

Manifest remains `0.9.8`; release readiness remains **NOT READY**.

## 12. Current decision

```text
manual pre-validation global publication = REMOVED IN THIS TRANCHE
candidate-bound Disk-info validation     = IMPLEMENTED
invalid candidate preserves proven auth = IMPLEMENTED
unknown candidate preserves proven auth = IMPLEMENTED
valid candidate generation CAS          = IMPLEMENTED
stale valid candidate overwrite         = BLOCKED
old PKCE after manual intent             = BLOCKED BY SHARED GENERATION
candidate account source                 = EXACT VALIDATION RESPONSE
manual full capability proof             = NO
live provider qualification              = NOT PERFORMED
manifest version                         = 0.9.8
release readiness                        = NOT READY
```
