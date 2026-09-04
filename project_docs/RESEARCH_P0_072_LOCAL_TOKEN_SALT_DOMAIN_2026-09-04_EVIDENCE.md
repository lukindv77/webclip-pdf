# P0-072 — installation-local token salt domain correction — 2026-09-04

Date: 2026-09-04  
Canonical source baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Working branch entering this block: `research/p0-072-recovery-quarantine-2026-09-04 @ 601f18521003d66fdf6cee14d4cde0fc90662c09`  
Deterministic model commit: `666570d9196593ca8091d627560c4674df5d6d0c`  
Owners: **P0-072 ACTIVE**; confidentiality sanitizer/identity owners **P0-066/P1-216 ACTIVE**.

This checkpoint corrects one privacy/detail of the earlier legacy-source fingerprint and scope-token proposals before runtime implementation. Runtime/manifest are unchanged.

## 1. Problem with an unsalted full-row legacy source digest

Earlier P0-072 research selected a stable SHA-256 digest of the exact bounded raw legacy source before normalization/default generation. That solves reset/migration rendezvous and same-id/different-source conflict detection.

For an identity-less historical row, however, the raw source can contain user URL/title/path metadata. An unsalted deterministic digest is not plaintext, but it is stable across installations and can be dictionary-correlated when the source is predictable.

That is unnecessary durable correlation and is inconsistent with the data-minimization direction already selected for URL/site scope tokens.

P0-072 therefore should not introduce one unsalted content-derived identity namespace while using installation-local salted tokens for another.

## 2. One installation-local token salt, multiple separated domains

Use one exact nonportable local salt record, conceptually:

```text
journalLocalTokenSalt:v1
```

The value is 32 bytes generated with `crypto.getRandomValues()` and stored in one fixed bounded encoding, for example 64 lowercase hex characters.

The salt is:

- not an OAuth/authentication secret;
- not a capability;
- not exported with Journal/settings backups;
- not logged;
- not derived from account/root/URL/path data;
- stable while any dependent tokenized receipt/fence exists.

Token/digest input uses explicit domain separation:

```text
webclip-local-token-v1\0legacy-source\0<SALT_BYTES>\0<bounded raw source JSON>
webclip-local-token-v1\0scope-url\0<SALT_BYTES>\0<normalized URL scope>
webclip-local-token-v1\0scope-site\0<SALT_BYTES>\0<normalized site scope>
```

A future token algorithm changes version rather than silently changing v1.

## 3. Why one salt is preferable to two unrelated local salts

A separate legacy-source salt and scope-token salt would require two creation/loss/rotation lifecycles and two sets of corruption checks.

One installation-local salt with domain separation provides:

- stable same-install matching;
- no cross-domain equality;
- no simple cross-install deterministic correlation;
- one bounded lifecycle;
- one exact `meta` control key;
- no DB schema bump.

The token namespaces remain semantically distinct because their domain labels are part of the digest input.

## 4. Superseded key name

Earlier scope-token research used the illustrative exact control key:

```text
journalScopeTokenSalt:v1
```

For implementation, this checkpoint supersedes that **name only** with:

```text
journalLocalTokenSalt:v1
```

because the same local pseudonymization salt now also protects legacy-source rendezvous.

All earlier lifecycle rules remain:

- never silently replace a missing salt while dependent state exists;
- unsupported/missing token context is `indeterminate`, never a definite nonmatch;
- salt is not portable authority.

## 5. Salt creation can remain transaction-owned

No asynchronous WebCrypto is required.

Inside an active `meta` IndexedDB request callback, the worker can synchronously:

1. read the exact salt key;
2. if present, validate exact version/length/hex shape;
3. if absent, prove no dependent tokenized/fence state exists under bounded prefix scans;
4. generate 32 bytes with `crypto.getRandomValues()`;
5. put the fixed encoded salt;
6. continue the IDB request chain.

The bundled synchronous SHA-256 helper plus `TextEncoder` can then compute domain-separated tokens without leaving the transaction task.

If the salt is missing/corrupt while dependent rows/fences exist, fail closed; do not generate a replacement value that would turn existing tokens into false nonmatches.

## 6. Legacy source identity remains before generated defaults

The important ordering from the earlier legacy-source checkpoint remains unchanged:

```text
raw bounded legacy source
 -> salted source digest BEFORE normalizePendingJournalAppendData() defaults
 -> explicit pending id if present, else legacy:<digest>
 -> legacyPendingFence:v1:<digest>
```

The source digest must still exclude runtime-generated UUIDs/timestamps/reset ids.

Only the digest construction changes from unsalted SHA-256 to the installation-local domain-separated token.

## 7. Same explicit id / different payload conflict remains detectable

Two raw legacy rows may share one explicit pending id while their payloads differ.

Because `legacy-source` token includes the entire bounded raw source, those rows produce different source tokens on the same installation and remain a conflict:

```text
same pendingId + different legacySourceToken -> indeterminate/manual conflict
```

Identical raw duplicates produce the same token and can still deduplicate.

## 8. Full reset behavior with missing salt

Clear-all/import-replace do not require scope tokens merely to detach already-visible external receipt rows by prefix.

However, if a nonempty hidden legacy snapshot requires source-token rendezvous and the local salt is missing/corrupt while dependent legacy fences/state already exist, the destructive operation cannot safely decide that stale migration will rendezvous with the same identity.

In that narrow case it must fail closed rather than fabricate a new salt.

If no dependent tokenized/fence state exists yet, the authoritative transaction may create the salt and proceed.

This is narrower than making every full reset depend on scope matching.

## 9. Scoped reset behavior

URL/site reset additionally needs supported scope-url/scope-site tokens for future namespaced external receipts.

If the salt is unavailable but dependent tokenized receipts/fences exist, relation is indeterminate and scoped reset fails closed according to the earlier lifecycle rule.

Current pending rows continue using their existing row-owned scope data in the first tranche; they do not need new scope tokens merely to add `journalResetDisposition`.

## 10. Data minimization

Persisted token/fence records contain only fixed-length pseudonymous tokens and bounded reset/operation facts.

Do not persist:

- the raw legacy source JSON in `meta`;
- plaintext URL/site scope in reset disposition;
- the salt in OperationLog;
- the token as a user-visible identifier.

This does not close P0-066's broader sanitizer requirement for URLs that remain in Journal/pending records themselves.

## 11. Deterministic model

Added:

`project_tools/test_p0_072_local_token_salt_domains_model.js`

Local Node result before durable write:

```text
P0-072 local token salt domain model: PASS
```

Covered controls:

1. same installation + same raw source gives stable legacy-source token;
2. different installation salts prevent deterministic cross-install equality;
3. `legacy-source`, `scope-url`, and `scope-site` domains cannot cross-match;
4. same explicit pending id + different raw payload still yields distinct source tokens;
5. missing salt with dependent state is fail-closed; missing salt without dependent state may create one.

The model is architecture evidence, not runtime PASS.

## 12. Acceptance additions

Implementation/tests must prove:

- one exact `journalLocalTokenSalt:v1` control record is used for v1 local pseudonymous tokens;
- salt creation uses `crypto.getRandomValues()` with no `Math.random()` fallback;
- token input has explicit domain separation;
- raw legacy source digest/token is computed before generated defaults;
- token/fence records do not persist plaintext raw source/URL scope;
- same raw source on different installation salts produces different token;
- missing/corrupt salt with dependent state never silently regenerates;
- P0-066/P1-216 remain ACTIVE.

## 13. Status

This checkpoint supersedes only the unsalted construction of the **legacy-source** digest and the illustrative `journalScopeTokenSalt:v1` key name. The stable source-identity, fence, dedupe/conflict and scope-token lifecycle contracts remain otherwise intact.

**P0-072 remains ACTIVE.** Runtime/manifest remain unchanged. Manifest remains `0.9.8`; release remains `NOT READY`; no Actions/build/tag/GitHub Release is claimed.
