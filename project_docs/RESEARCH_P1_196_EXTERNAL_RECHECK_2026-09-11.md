# WebClip — P1-196 fresh external auth-validity recheck — 2026-09-11

Date: 2026-09-11  
Canonical source baseline checked: `main = 07ba5d17569dd563102e6699431222742bec9dde`  
Owner: **P1-196 ACTIVE**  
Mode: **RESEARCH-ONLY / EXTERNAL PROVENANCE**  
Production/runtime modification: **NONE**  
Real Yandex L5: **NOT RUN**  
Release-policy activation: **NONE**  
New P-code: **NO**

This note records the mandatory multi-source external recheck for the P1-196 current-main refinement. External sources are comparison/evidence inputs, not WebClip requirements by themselves. The companion current-source evidence and deterministic model remain the primary WebClip-specific proof.

## 1. Official Yandex OAuth lifetime and revocation

Freshly checked official Yandex OAuth documentation:

- `https://yandex.ru/dev/id/doc/ru/concepts/ya-oauth-intro` — **Реализация OAuth в Яндексе**;
- `https://yandex.ru/dev/id/doc/ru/tokens/token-invalidate` — **Отзыв токенов**;
- `https://yandex.ru/dev/id/doc/ru/codes/screen-code-oauth` and related code/token documentation — successful token responses expose `expires_in` as token lifetime.

Supported observations:

1. Yandex OAuth tokens have provider-defined lifetime rather than an architectural guarantee of infinite validity.
2. Tokens can become invalid because of expiry or revocation.
3. Revocation can follow user action and application/account security changes.
4. Therefore WebClip must keep `expiry unknown` distinct from `never expires`, and token presence alone cannot be durable proof of current validity.

These observations support the existing P1-196 state split. They do not determine the exact WebClip storage representation.

## 2. Yandex Disk authorization boundary

Fresh public Yandex material confirms that access to Yandex Disk API is OAuth-token controlled; current WebClip source likewise sends an `Authorization: OAuth ...` header to `cloud-api.yandex.net`.

However, this research pass did **not** locate sufficiently precise current public Yandex Disk documentation that proves a complete Disk-specific mapping from every relevant HTTP status/provider error body to `invalid access token` versus `insufficient capability/resource policy`.

That uncertainty is material. It is recorded rather than filled from another Yandex API or from generic OAuth rules.

## 3. OAuth standards comparison

Freshly checked standards:

- `https://www.rfc-editor.org/rfc/rfc6750.html` — **RFC 6750, The OAuth 2.0 Authorization Framework: Bearer Token Usage**;
- `https://www.rfc-editor.org/info/rfc7009/` — **RFC 7009, OAuth 2.0 Token Revocation**.

RFC 6750 distinguishes the generic protected-resource cases:

```text
invalid_token      -> resource server SHOULD use HTTP 401
insufficient_scope -> resource server SHOULD use HTTP 403
```

RFC 7009 establishes that access/refresh tokens can be revoked and that clients must be prepared for unexpected token invalidation.

These standards support two architectural precautions already present in P1-196 research:

1. `401` and `403` are not interchangeable validity/capability meanings;
2. revocation is a normal lifecycle event, so stale-token handling needs explicit authority rather than assuming token presence remains valid indefinitely.

They do **not** prove that Yandex Disk implements every RFC example/error exactly as written.

## 4. Cross-source disagreement / applicability boundary

Other Yandex APIs publicly document their own 401/403 mappings, but those service-specific mappings are not imported into WebClip's Disk classifier. Doing so would violate the project rule that external observations are hypotheses/comparison points until checked against the exact WebClip integration boundary.

Therefore the safe current conclusion is narrower than a generic OAuth implementation recipe:

```text
provider evidence may classify exact OAuth-bound Disk invalid-auth response
-> candidate for P1-196 exact-generation demotion

unknown/unproven Disk mapping
-> operation failure only
-> no global auth demotion

generic 403
-> not blanket invalid-auth authority

signed-transfer 401/403
-> not OAuth-token validity authority
```

## 5. Current-main applicability check

Fresh current source on `07ba5d17569dd563102e6699431222742bec9dde` still shows:

- `connected: Boolean(yandexAuth?.accessToken)`;
- known local expiry rejected by `getValidYandexAccessToken()` without an explicit exact-generation validity transition;
- `yandexApi()` recording `error.status` / bounded provider code but lacking an exact-generation 401-demotion branch;
- OAuth request construction where caller headers are spread after the locally generated Authorization header;
- `recoverPendingRemoteSaves()` taking one `authAvailable` snapshot before iterating the queue;
- no runtime `authGeneration` field implementing the P1-178/P1-196 target authority yet.

Thus the external recheck does not obsolete the current-source finding. It reinforces the need for a fail-closed classifier plus exact request/generation binding.

## 6. Resulting architecture recommendation

P1-196 remains a consumer of the single shared P1-178 auth/settings generation.

Recommended target properties remain:

1. represent token presence, validity, usability and lifetime knowledge separately;
2. bind any demotion evidence to the exact OAuth authorization authority actually sent;
3. prohibit or normalize caller Authorization override, or otherwise derive the receipt from the final sent header;
4. compare-and-demote only if the same auth record/generation is still current;
5. treat stale invalidation evidence as operation failure without global-auth mutation;
6. do not blanket-demote on generic `403`, timeout, network failure, 5xx or signed-transfer response;
7. re-resolve current auth usability before each later auth-required recovery child after a possible invalidation;
8. require exact current Yandex Disk evidence before broadening provider-specific invalid-auth classification.

## 7. Evidence boundary

This note is external-documentation research only. It is not real Yandex provider qualification and is not a release receipt.

```text
external documentation != real Yandex L5
real Yandex L5 != P1-231 S2 activation
P1-231 S2 activation != release authorization
```

No product ZIP, manifest/version change, release-readiness mutation, tag, GitHub Release or deployment is authorized or performed by this tranche.
