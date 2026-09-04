# P0-072 — scope token salt/version lifecycle — 2026-09-04

Date: 2026-09-04  
Canonical source baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Working branch entering this block: `research/p0-072-recovery-quarantine-2026-09-04 @ 8a4235700a2e2f91f27a35409a210915bc7c9669`  
Deterministic model commit: `fea859ac529371d108c2242ccc14caf8334e2ede`  
Owner: **P0-072 ACTIVE**; adjacent P0-066/P1-216 remain ACTIVE.

This addendum completes the lifecycle rules for the minimal nonplaintext scope-token direction. Runtime is unchanged.

## 1. Salt stability is part of scope matching

A receipt created with a salted local scope token can only be matched later if the same installation-local salt remains available.

Therefore the salt is not disposable cache. It is small local operational metadata whose stability is required while any tokenized external-effect receipt exists.

It is still not a credential or remote capability.

## 2. Never silently regenerate a missing salt while receipts exist

Unsafe sequence:

1. receipt R stores token generated with salt S1;
2. S1 is accidentally missing/corrupt;
3. helper silently creates S2;
4. scoped reset computes token under S2;
5. R looks like a definite nonmatch and remains active.

That converts local metadata loss into stale external-effect authority.

Required rule:

```text
salt missing + tokenized receipts exist -> fail closed / indeterminate, never regenerate in place
```

A new salt may be created only when the transaction proves no receipt depends on an older salt.

## 3. Salt creation must itself be transaction-owned

Use one exact `meta` key, for example conceptually:

```text
journalScopeTokenSalt:v1
```

Creation helper transaction:

1. read exact salt key;
2. if valid current salt exists, return it;
3. if absent, bounded-prefix check for existing tokenized receipts;
4. if any receipt exists, fail closed with a stable internal error;
5. otherwise generate/store one worker-random salt;
6. publish it only after transaction `oncomplete`.

Two concurrent creators serialize on `meta`; the second observes the first value instead of overwriting it.

## 4. Scoped reset behavior when salt is unavailable

### Clear-all / import-replace

These operations do not need a scope token to find receipts: every old active receipt is in scope. They may still detach receipts by prefix scan.

### URL/site clear

If tokenized receipts exist but the salt is missing/corrupt, the worker cannot prove which are nonmatching.

Do not silently treat them as nonmatches.

Preferred behavior is fail closed for the scoped destructive operation with a diagnostic/reconciliation path rather than detach unrelated operations indiscriminately.

This keeps scope semantics precise and leaves user-facing recovery to the existing P1-210/P1-216 owners.

## 5. Token identity must be versioned separately from receipt schema

Receipt schema version and scope-token normalization version are different concerns.

Store an explicit field such as:

```text
scopeTokenVersion = 1
```

A future P0-066/P1-216 change may alter canonical durable URL identity without changing every other external receipt field.

Old receipts retain their old token version; reset matching dispatches through the corresponding supported versioned scope-identity function.

Do not reinterpret an old token using a new normalization rule.

## 6. Unsupported token version is indeterminate, not nonmatch

If the runtime encounters a receipt token version it cannot evaluate:

```text
relation = indeterminate
```

It must not infer that the receipt belongs to another URL/site.

This is the same truthfulness rule used for missing legacy scope.

A version migration may later provide explicit conversion if the original scope identity is still safely available; silent token replacement is not allowed.

## 7. Clear-all remains the universal safety boundary

Even if token salt/version metadata is damaged, a full clear/import-replace can still find the receipt namespace itself and detach every receipt.

This is useful as a recovery invariant:

- exact scoped reset requires valid scope-token context;
- whole-generation reset does not depend on scope token matching.

It does not authorize deletion of unresolved receipts; it only allows their reset detachment.

## 8. Salt/token data minimization

Do not log:

- the salt;
- scope tokens as user-facing identifiers;
- plaintext source URL merely to explain token matching.

OperationLog may record reset id, effect id and high-level scope class under existing redaction rules.

The token is internal matching metadata only.

## 9. Deterministic model

Added:

`project_tools/test_p0_072_scope_token_lifecycle_model.js`

Local Node result before durable write:

```text
P0-072 scope token lifecycle model: PASS
```

Covered controls:

1. a salt is created only when no receipts depend on an older value;
2. missing salt with existing receipts fails closed;
3. unsupported token version is `indeterminate`, never definite nonmatch;
4. clear-all matching does not require salt;
5. supported token version matches exact URL and rejects a different URL.

The model is architecture evidence, not runtime PASS.

## 10. Owner boundaries

- **P0-072** owns only stable reset-scope matching for its durable receipts.
- **P0-066** remains owner for the canonical durable/display URL confidentiality sanitizer.
- **P1-216** remains owner for the unified legacy/modern Journal URL identity domain.
- **P1-210** remains owner for complete user-visible read-only receipt reconciliation after unknown/lost operation responses.
- **P2-019** may later centralize shared schema/meta ownership.

No new P-code is allocated.

## 11. Status

P0-072 remains **ACTIVE**. Runtime/manifest are unchanged; manifest remains `0.9.8`; release remains `NOT READY`; no Actions/build/tag/Release is claimed.
