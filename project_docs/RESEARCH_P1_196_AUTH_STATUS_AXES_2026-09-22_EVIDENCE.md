# WebClip — P1-196 explicit auth status axes — 2026-09-22

Date: 2026-09-22  
Owner: P1-196  
Baseline main: `868ce7a7d704d6dd5b7a140d669bad7938cd8236`  
Baseline post-merge Repository Integrity: #1077 / run `35756934854` — SUCCESS  
Manifest version: `0.9.8`  
Release readiness: **NOT READY**

## 1. Purpose

Continue P1-196 after exact 401 demotion (#340) and exact positive account-enrichment CAS (#341).

The current remaining status-truth problem is that `getYandexStatus()` still exposes the compatibility field:

```text
connected = Boolean(accessToken)
```

That conflates at least four independent questions:

- are token bytes present?
- what is the known validity state?
- is the credential admissible for a new request right now?
- is its lifetime known?

This tranche makes those axes explicit without introducing a second auth-generation counter.

## 2. External comparison

Fresh Yandex OAuth/API documentation was rechecked on 2026-09-22:

- https://yandex.ru/dev/id/doc/en/tokens/token-invalidate
- https://yandex.ru/dev/id/doc/ru/concepts/ya-oauth-intro
- https://yandex.ru/dev/id/doc/en/tokens/debug-token
- https://yandex.com/dev/disk/rest/

Relevant bounded observations:

- Yandex OAuth tokens have provider-defined lifetimes and may be revoked before a client would otherwise expect them to remain usable.
- a manually obtained token is a real OAuth credential for API/testing use, but its lifetime must not be fabricated when WebClip has no `expires_in` evidence;
- token presence therefore is not equivalent to durable validity or present usability.

The prior P1-196 provider-classification boundary remains unchanged: this tranche does not broaden Disk failure classification beyond the existing exact current-auth 401 path.

## 3. Runtime status classifier

Production adds the pure helper:

`describeYandexAuthTruth(auth, controlGeneration, now)`

It reports:

```text
authPresent
authValidity
authUsable
expiryKnowledge
authGeneration
authRecordGeneration
authExpiresAt
authExpirySkewActive
```

The helper is source-pure:

- no Chrome storage calls;
- no network calls;
- no provider mutation;
- no generation mutation.

The shared `authGeneration` field is the existing P1-178 control generation. P1-196 does not create a second counter.

## 4. Validity semantics

Current supported status values are:

```text
authValidity = valid | invalid | expired | unknown
expiryKnowledge = known | unknown
```

Rules:

1. no token and no explicit tombstone -> `unknown`, unusable;
2. legacy token without modern validity metadata -> `unknown` validity, compatibility-usable unless negative/expiry evidence exists;
3. freshly issued OAuth token -> `valid`;
4. successfully validated manual token -> `valid`;
5. exact provider expiry instant in the past -> `expired`;
6. a persisted future invalid/expired tombstone shape, if introduced by a later tranche, is already interpreted as unusable.

This tranche does not yet persist invalid/expired tombstones.

## 5. Lifetime semantics

OAuth token exchange now records:

```text
expiryKnowledge = known   when a positive expires_in is returned
expiryKnowledge = unknown otherwise
validity = valid
validityObservedAt = token receipt time
```

Manual token validation records:

```text
expiryKnowledge = unknown
validity = valid
validityObservedAt = successful candidate validation time
```

A zero `expiresAt` is therefore explicitly **unknown lifetime**, not "never expires".

## 6. Admission usability vs temporal validity

The existing request-admission guard refuses credentials inside a 60-second expiry skew.

This tranche preserves a critical distinction:

```text
expiresAt > now but <= now + 60s
-> authPresent = true
-> authValidity = valid
-> authUsable = false
-> authExpirySkewActive = true
```

It does not falsely call a token expired before the provider expiry instant.

After `expiresAt <= now`:

```text
authValidity = expired
authUsable = false
```

The exact-generation persistent expiry transition remains a separate open P1-196 item.

## 7. Compatibility connected field

`connected` is retained for existing consumers but its semantics change from "token bytes present" to:

```text
connected = authUsable
```

This prevents a known-expired or admission-skew-blocked credential from being displayed as operationally connected.

The Options UI uses the new axes to distinguish:

- connected/usable;
- actually expired;
- inside admission expiry skew;
- token present but otherwise not usable;
- no auth present.

## 8. Legacy compatibility

A migrated/legacy session token may lack modern `validity` and `expiryKnowledge` fields.

The classifier does not fabricate evidence:

```text
authPresent = true
authValidity = unknown
expiryKnowledge = unknown (when expiresAt = 0)
```

For compatibility it remains request-admissible unless there is exact negative evidence or a known expiry boundary. A later authoritative 401 still uses the exact current-auth CAS implemented by #340.

## 9. Deterministic coverage

New test:

`project_tools/test_p1_196_auth_status_axes_runtime.js`

It proves:

- absence is distinct from validity;
- legacy token validity/lifetime stay unknown;
- modern OAuth known future expiry is valid and usable;
- validated manual token has valid-at-validation-time truth with unknown lifetime;
- past exact expiry is expired/unusable;
- a token inside the 60-second skew is still valid but unusable;
- outside-skew token remains usable;
- persisted invalid state is unusable;
- no-token "valid" claim is normalized to unknown;
- shared control generation and record generation remain separate axes;
- classifier performs no storage/network side effect;
- `getYandexStatus()` exposes all new axes and maps compatibility `connected` to usability;
- OAuth/manual commits write bounded validity/lifetime metadata;
- Options UI consumes the explicit axes;
- known-expiry persistent transition is deliberately still absent.

The existing P1-196 refinement model is reconciled to mark status axes implemented while retaining expiry/recovery gaps.

## 10. Remaining P1-196 work

P1-196 remains **ACTIVE** after this tranche.

Still open:

1. known local expiry must publish a generation-fenced persistent validity transition instead of only blocking admission;
2. exact 401 demotion currently removes current auth rather than preserving a durable non-secret invalid-state tombstone;
3. recovery must re-evaluate current auth usability/generation before each later auth-required child instead of relying on one pre-loop snapshot;
4. real provider qualification is not performed here.

These remaining items are not silently reclassified as complete by the new status fields.

## 11. Release identity impact

Both `service-worker.js` and `options.js` are canonical package members.

Therefore:

- current 34-file RPF must advance;
- current 33-file negative/control digest must advance.

This document does not guess those values. Exact-head source-generation/deterministic identity authority must derive them before current identity pins are synchronized.

No canonical QA-contract, Registry/full-RCF root or builder-contract input is intentionally changed by this tranche.

## 12. Non-actions

No live Yandex credential/request, provider mutation, real Chrome qualification, physical release receipt, product ZIP/build, manifest version bump, release-policy activation, tag, deployment, GitHub Release or release decision is performed.

Manifest remains `0.9.8`; release readiness remains **NOT READY**.
