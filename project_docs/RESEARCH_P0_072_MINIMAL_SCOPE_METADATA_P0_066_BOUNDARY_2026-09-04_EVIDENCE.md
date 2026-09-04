# P0-072 — minimal reset scope metadata / P0-066 confidentiality boundary — 2026-09-04

Date: 2026-09-04  
Canonical source baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Working branch entering this block: `research/p0-072-recovery-quarantine-2026-09-04 @ 7438a38684cb3a03c4082ef976567937e9e1e647`  
Deterministic model commit: `c44d488d71ed853b9c0f381bf6f44d5878ea695b`  
Owners: **P0-072 ACTIVE**, confidentiality boundary **P0-066 ACTIVE**.

This checkpoint removes an unnecessary confidentiality expansion from the earlier illustrative P0-072 disposition schema. Runtime is unchanged.

## 1. Fresh current-source fact

`normalizeJournalUrl(url)` currently:

1. parses the URL;
2. removes only the fragment;
3. returns the serialized URL.

It does not remove query parameters or other sensitive URL components.

P0-066 already owns the broader requirement that one durable/display URL sanitizer cover source/locator/imported/public metadata so secrets/userinfo/non-durable schemes cannot persist.

Therefore P0-072 must not introduce new redundant plaintext URL persistence while P0-066 remains unresolved.

## 2. Earlier illustrative schema duplicated `scopeKey`

Earlier P0-072 evidence proposed:

```text
journalResetDisposition.scopeKey = normalized exact URL/site key
```

That field is not required for late settlement.

Once a row is detached, the important durable facts are:

- which reset generation detached it;
- reset kind/scope class;
- source operation identity where available;
- factual outcome/resolution.

The exact URL that was used during the already-completed reset match does not need to be copied into every disposition.

## 3. Revised reset disposition — no plaintext scope key

Authoritative direction for implementation:

```text
journalResetDisposition = {
  version,
  resetId,
  kind,
  scope,              // all | url | site
  sourceOperationId,
  quarantinedAt,
  state,
  outcome,
  resolution,
  updatedAt
}
```

Do **not** persist `scopeKey` in the disposition.

Scope matching is done from current row/receipt scope data at reset time. The disposition records the result of the reset transition, not another copy of the user URL.

The same rule applies to migration-only legacy fences: a fence is row-specific and needs `legacyId + resetId + relation`; it does not need the target URL in plaintext.

## 4. Detached external-effect receipts still need future scope matching

A worker-issued external-effect receipt survives independently of the Journal row. A later URL/site clear must therefore be able to decide whether an **active, not-yet-detached** receipt belongs to the scope even if its Journal entry has disappeared/replaced.

Persisting the full source URL in that receipt would preserve potentially sensitive URL material beyond Journal deletion and duplicate P0-066 exposure.

Use nonportable scope tokens instead of plaintext URL copies.

## 5. Installation-scoped salted scope tokens

Recommended receipt fields:

```text
urlScopeToken
siteScopeToken
```

A token is a one-way digest over:

```text
version + installation-local random salt + namespace(kind) + normalized scope key
```

Example conceptual input:

```text
webclip-scope-v1\0<salt>\0url\0<normalized-url>
```

Properties:

- same installation + same exact scope -> same token;
- different URL/site -> different token;
- URL and site namespaces cannot cross-match;
- different installation salt prevents simple cross-install token correlation;
- plaintext URL/query is not copied into the detached receipt.

The existing bundled `WebClipSha256` implementation is available in the service worker and can support a bounded synchronous digest over short scope strings. A future implementation may use another equivalent local digest helper, but no network/service dependency is needed.

The salt is local operational metadata, nonportable and never exported as Journal content.

## 6. Scope token is not authority or object identity

The token exists only to answer:

```text
Does this local receipt belong to the URL/site scope being reset?
```

It is **not**:

- Yandex object identity;
- a capability;
- operation identity;
- proof that a remote side effect occurred;
- a substitute for P0-066 sanitization of Journal/pending URLs;
- a substitute for P0-073/P0-074/P1-090 remote identity/context.

Receipt authority still comes from worker-issued provenance, effect id, operation context and factual state.

## 7. Why a salt rather than plain SHA-256 of URL

A deterministic unsalted hash avoids plaintext duplication but still permits easy dictionary correlation for common/known URLs.

An installation-local random salt provides a stronger nonportable pseudonymous scope token without requiring the token to become a secret capability.

This is data minimization, not a cryptographic authentication protocol.

## 8. Salt lifecycle

The salt belongs in nonportable local metadata, for example one exact `meta` key.

Requirements:

- generated worker-side with sufficient randomness;
- stable for the lifetime of the local Journal DB so old receipts remain matchable;
- never imported from Journal backup;
- never derived from OAuth/account credentials;
- not rotated casually while active receipts exist;
- if the whole local DB is physically lost, receipt scope matching is already lost with it, so separate recovery of the salt is not required by P0-072.

P2-019 may later centralize schema/meta ownership, but no DB version bump is needed merely for an exact `meta` salt record.

## 9. Pending-store rows do not need new scope tokens for P0-072

Existing `pendingAppends`, `pendingDownloads`, and `pendingRemoteSaves` already contain their current metadata and remain in their stores after quarantine.

For the current tranche:

- use existing normalized data to classify the row during reset;
- if scope is indeterminate, detach/manual as the fail-safe defined in the legacy-reset checkpoint;
- do not duplicate the URL into `journalResetDisposition`;
- P1-216 remains owner for a single correct legacy/modern URL identity domain.

Future P0-066 work may change how the underlying pending metadata itself stores URLs. P0-072 should compose with that instead of creating another copy.

## 10. P1-216 boundary

Registry reconciliation identified **P1-216 ACTIVE**:

> Legacy and modern Journal rows share one derived URL identity domain for view/clear/delete/stats/templates; missing persisted urlKey cannot create ghost scope.

Therefore P0-072's `match/nonmatch/indeterminate` rule is only a recovery-safety fallback.

It does not define the final canonical URL identity algorithm and does not close ghost-scope behavior generally.

P1-216 remains responsible for making legacy/modern Journal scope identity exact and coherent across all Journal surfaces.

## 11. P1-210 / manual-resolution boundary

Registry also keeps **P1-210 ACTIVE** for user-visible reconciliation of durable receipts after unknown/lost outer operation responses.

P0-072 may create/retain manual detached receipts and fail closed when their bounded capacity is exhausted, but it does not claim the complete user-facing reconciliation workflow.

Any future UI that lists receipts should read them through committed read-only transaction results and must not turn a view action into mutation authority.

## 12. Deterministic model

Added:

`project_tools/test_p0_072_minimal_scope_token_model.js`

Local Node result before durable write:

```text
P0-072 minimal scope token model: PASS
```

The model proves the intended data-minimization contract:

1. exact URL scope matches via a token without serializing a secret query into the receipt;
2. different installation salts produce different tokens for the same URL;
3. URL/site namespaces cannot cross-match;
4. reset disposition contains no plaintext `scopeKey`;
5. scope token is separate from worker-issued effect identity/provenance.

The model is architecture evidence, not a runtime PASS.

## 13. Earlier evidence interpretation correction

Any earlier P0-072 model/document that contains a plaintext illustrative `scopeKey` inside `journalResetDisposition` is superseded **only for that field** by this checkpoint.

The earlier reset-id/outcome/resolution/quarantine invariants remain valid.

Likewise, the earlier meta receipt examples containing plaintext `urlKey/siteKey` should be interpreted as logical scope identity, not the final persisted representation. The final implementation should use minimal nonportable scope tokens unless P0-066 establishes a stronger canonical sanitized representation first.

## 14. Implementation acceptance additions

Direct tests should prove:

- reset disposition serializes no target URL/site key;
- legacy migration fence serializes no target URL;
- external receipt exact URL matching works using local scope token;
- a receipt created for URL A does not match URL B;
- different token namespace prevents URL/site accidental equality;
- imported Journal JSON cannot supply or control installation salt/tokens;
- scope token never substitutes for effect id, operation id or remote object identity;
- P0-066/P1-216 remain ACTIVE and are not marked closed by P0-072 implementation.

## 15. Status

This refinement reduces the amount of new durable user URL data P0-072 needs to add and avoids creating a second plaintext URL-copy lifecycle in reset receipts.

P0-072 remains **ACTIVE**. P0-066, P1-216 and P1-210 remain **ACTIVE** under their own owners. Runtime/manifest are unchanged; manifest remains `0.9.8`; release remains `NOT READY`; no Actions/build/tag/Release is claimed.
