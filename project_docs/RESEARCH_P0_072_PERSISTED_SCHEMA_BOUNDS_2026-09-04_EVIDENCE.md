# P0-072 — persisted reset/meta schema bounds and prefix-scan contract — 2026-09-04

Date: 2026-09-04  
Canonical source baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Working branch entering this block: `research/p0-072-recovery-quarantine-2026-09-04 @ d782655b26af58f8bc2e2e5759f144f866863247`  
Deterministic model commit: `969c427d3687ecc411b1293ab5cd7cdfa3d7d2c5`  
Owner: **P0-072 ACTIVE**.

This checkpoint fixes minimum persisted-field/key bounds for the reset-disposition and `meta` namespaces selected by earlier P0-072 research. Runtime/manifest are unchanged.

## 1. Fresh source facts

Current worker defines canonical `MAX_OPERATION_ID_CHARS = 160` for validated modern operation ids.

However, historical/current pending-row constructors still store `operationId` using `.slice(0, 180)` in several pending/recovery records. P0-072 must preserve exact historical row identity when fencing old rows rather than silently truncating an already-persisted 180-char value to 160 during comparison.

Current `normalizePendingJournalAppendData()` constructs:

```text
journalEntryId = String(data.journalEntryId || '').trim() || generated id
```

without an explicit length slice at that point.

Current legacy migration likewise uses:

```text
id = String(raw.id || data.journalEntryId || '').trim()
```

and places that id directly in `pendingAppends`.

The legacy queue is bounded by row/aggregate JSON size, but the identifier itself is not independently length-bounded before it becomes an IndexedDB key.

Therefore a new `meta` fence key must **not** concatenate the raw legacy id directly.

## 2. Reset disposition is a fixed enum schema, not free-form metadata

Target v1 shape remains:

```text
journalResetDisposition = {
  version,
  resetId,
  kind,
  scope,
  sourceOperationId,
  quarantinedAt,
  state,
  outcome,
  resolution,
  updatedAt
}
```

No plaintext `scopeKey` is persisted.

The following fields are enum/constant constrained:

- `version = 1`;
- `kind = clear-all | clear-url | clear-site | import-replace`;
- `scope = all | url | site`;
- `state = quarantined`;
- `outcome` belongs to the explicit factual set (`pending`, `complete`, `interrupted`, `remote-verified`, `unknown`, `cancelled-before-start`, `start-rejected`, plus only later versioned additions); 
- `resolution = reconciling | terminal | manual-resolution`.

No arbitrary external error/message/URL/path is copied into the disposition.

Errors remain in their existing separately bounded fields.

## 3. Reset id should use fixed worker-generated random shape

Use one reset generation id per destructive transaction.

Preferred v1 representation is a standard worker-generated UUID (`crypto.randomUUID()`), giving a fixed 36-character shape.

The reset id is not a user-provided capability and is not derived from URL/account/path data.

Do not allow arbitrary caller-provided reset ids into persisted authority.

If a future implementation changes generation format, bump/explicitly version the validator rather than silently accepting unbounded strings.

## 4. Historical sourceOperationId compatibility bound

For `journalResetDisposition.sourceOperationId`:

- new modern operations should already satisfy the canonical 160-char validated operation-id contract;
- existing pending rows may contain up to 180 characters because current constructors historically sliced to 180;
- reset fencing must preserve/compare the exact current stored value, not coerce two distinct historical values to the same 160-char prefix.

Therefore P0-072 v1 compatibility may permit at most **180 characters** in this one copied audit/identity field.

This does not change the canonical input owner `MAX_OPERATION_ID_CHARS = 160` for new operations.

## 5. Derived reset-disposition serialized envelope

Using the maximum v1 enum lengths, UUID reset id, 180-char historical operation id and 13-digit timestamps, compact `JSON.stringify()` remains comfortably below 512 characters.

The deterministic model fixes:

```text
MAX_JOURNAL_RESET_DISPOSITION_JSON_CHARS = 512
```

as a derived guard for v1.

This is not a quota reservation. It only prevents accidental future free-form growth inside the disposition field.

Any v1 construction exceeding the envelope fails before write.

A future schema requiring more data should use a new version rather than silently widening v1.

## 6. Legacy migration fence key must hash the exact legacy id

Earlier illustrative research used:

```text
legacyPendingFence:v1:<legacy-id>
```

That key format is superseded because legacy id length is not independently bounded in current normalization.

Use instead conceptually:

```text
legacyPendingFence:v1:<sha256-hex(exact UTF-8 legacy id)>
```

Properties:

- fixed 64-hex suffix;
- fixed bounded meta key length;
- exact same legacy id deterministically resolves the same fence;
- the raw potentially large id is not duplicated into `meta`;
- migration still retains the original id in its existing pending row, so no Journal/pending identity is rewritten;
- fence lookup collision risk is reduced to SHA-256 collision semantics rather than string truncation.

The bundled synchronous `WebClipSha256` + `TextEncoder` direction already selected for scope-token primitives can compute this digest inside an IndexedDB request callback without an async WebCrypto transaction-lifetime break.

No salt is needed for legacy-id fence hashing because this digest is a bounded lookup key, not a privacy token for user URL data.

## 7. Fence record should not duplicate raw legacy id

A v1 migration fence can contain compact fields such as:

```text
{
  key,
  version: 1,
  legacyIdDigest,
  resetId,
  sourceOperationId,
  relation: match | indeterminate,
  createdAt
}
```

Do not persist the full raw legacy id again merely for diagnostics.

The migration path already has the exact id being looked up and can recompute the digest.

A definite `nonmatch` receives no fence for a scoped reset.

## 8. External-effect and fence namespaces require fixed ASCII suffixes

Selected namespace examples:

```text
externalEffect:v1:<uuid>
legacyPendingFence:v1:<64-hex-digest>
journalScopeTokenSalt:v1
```

The first two use fixed ASCII suffix alphabets:

- UUID: `[0-9a-f-]` fixed shape;
- digest: `[0-9a-f]{64}`.

This makes a bounded string key range straightforward and prevents arbitrary Unicode/raw URL/path suffixes from changing scan semantics.

## 9. Prefix scans must use IDBKeyRange, not full-meta filtering

Fresh MDN verification confirms `IDBKeyRange` represents a continuous bounded key interval and can be passed directly to `openCursor()` in workers.

References checked 2026-09-04:

- https://developer.mozilla.org/en-US/docs/Web/API/IDBKeyRange
- https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB

For the selected ASCII-only suffixes, a helper may use a closed range conceptually like:

```text
IDBKeyRange.bound(prefix, prefix + '\uffff')
```

and still validate `String(cursor.key).startsWith(prefix)` defensively.

Because suffix alphabets are explicitly ASCII, no valid namespace key can extend beyond the `prefix + U+FFFF` upper bound.

Do not use an unbounded `meta.openCursor()` followed only by JavaScript filtering for routine receipt/fence scans.

## 10. Prefix scan has its own hard work envelope

The namespace is logically bounded, but the runtime must still defend against corruption/older bugs.

A prefix cursor therefore needs an explicit maximum scan count and `N+1` detection.

Research model uses a configurable/example envelope of 512 records to prove semantics; final production constants remain subject to the earlier measured-capacity rule.

Required behavior:

```text
scan sees configured maximum + 1 -> fail closed / abort current admission/reset
```

Do not silently ignore rows beyond the limit.

Ignoring overflow would allow unscanned durable authority to remain active after a reset.

This scan limit is a work bound, not evidence that 512 is the final product capacity.

## 11. Salt key and receipt namespaces must not overlap

The exact scope-salt control key remains separate:

```text
journalScopeTokenSalt:v1
```

It must not share the `externalEffect:v1:` or `legacyPendingFence:v1:` prefix.

This prevents receipt prefix cleanup/scans from consuming salt/control metadata.

Likewise existing `revision`, import lease and backup lease keys remain outside the new prefixes.

## 12. Scope salt encoding

Earlier primitive research selected 32 random bytes from `crypto.getRandomValues()` with no `Math.random()` fallback.

A fixed hex encoding gives a bounded 64-character stored salt value.

The salt is local operational metadata, not a credential/capability and is never exported/logged.

If implementation chooses another fixed encoding (for example base64url), the versioned validator must still enforce exact byte entropy and bounded encoded length.

## 13. Deterministic model

Added:

`project_tools/test_p0_072_persisted_schema_bounds_model.js`

Local Node result before durable write:

```text
P0-072 persisted schema bounds model: PASS
```

Durable model commit:

`969c427d3687ecc411b1293ab5cd7cdfa3d7d2c5`

Covered controls:

1. maximum v1 reset disposition remains within 512 compact JSON characters;
2. disposition contains no plaintext `scopeKey`;
3. a 200k-character legacy id still produces a fixed-length fence key;
4. distinct legacy ids produce distinct modeled SHA-256 lookup keys;
5. external-effect key uses fixed UUID shape;
6. prefix scans include only their namespace and exclude salt/revision/import/backup control keys;
7. configured prefix `N+1` overflow fails closed;
8. scope salt representation is bounded and prefix-isolated.

This is architecture/model evidence, not runtime PASS.

## 14. Source-level acceptance additions

Add to P0-072 runtime/source tests:

- reset-disposition constructor rejects unknown enums/oversized fields;
- reset id is worker-generated fixed versioned shape;
- new disposition has no arbitrary message/path/URL payload;
- v1 disposition serialized size is bounded before `cursor.update/put`;
- historical pending operation id up to 180 is preserved exactly for fencing; new operation-id input policy remains 160;
- raw legacy id is never concatenated directly into a meta fence key;
- legacy fence lookup uses exact UTF-8 id digest;
- fence record does not duplicate raw legacy id;
- external/fence prefix cursor uses bounded `IDBKeyRange` and defensive prefix check;
- namespace scan aborts at configured max+1 rather than truncating;
- prefix scans cannot consume scope salt, Journal revision, import lease or backup lease records;
- no full `meta` cursor is introduced for normal receipt/fence enumeration.

## 15. Owner boundaries

This remains P0-072 storage/recovery hygiene.

It does not close:

- P0-066/P1-216 URL sanitization/identity;
- P1-043 global physical quota reservation;
- P2-019 shared DB schema/migration ownership;
- P0-076 Journal generation CAS.

No new P-code is allocated.

## 16. Current conclusion

The selected no-v8 `meta` architecture remains viable only if every new record/key is deliberately bounded.

The refined v1 contract is now:

- reset disposition: fixed enums + UUID + bounded historical operation id, compact ≤512 chars;
- external receipt key: prefix + UUID;
- legacy fence key: prefix + SHA-256 hex of exact legacy id, never raw id;
- scope salt: exact separate control key + fixed random-byte encoding;
- receipt/fence enumeration: bounded `IDBKeyRange` prefix cursor + max+1 fail-closed.

**P0-072 remains ACTIVE.** Runtime/manifest remain unchanged. Manifest remains `0.9.8`; release remains `NOT READY`; no Actions/build/tag/GitHub Release is claimed.
