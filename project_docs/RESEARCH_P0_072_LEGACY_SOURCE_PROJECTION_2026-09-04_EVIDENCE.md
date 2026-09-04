# P0-072 — bounded legacy-source projection before local-token hashing — 2026-09-04

Date: 2026-09-04  
Canonical source baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Working branch entering this block: `research/p0-072-recovery-quarantine-2026-09-04 @ 94fb5b1b9237448e4ac34af0a1c6eedde68ab086`  
Deterministic model commit: `15c2fe2fd36a97d33d7679c5822f65f1289b47a2`  
Owner: **P0-072 ACTIVE**.

This checkpoint refines the source-token input selected by the preceding legacy-source identity and local-token-salt research. Runtime/manifest are unchanged.

## 1. Do not hash arbitrary raw Chrome Storage payload directly

The legacy source must rendezvous deterministically across destructive reset and ordinary migration before either path generates UUID/time defaults.

Hashing the exact raw object solves stability, but it unnecessarily couples identity work to every historical field and to the raw payload's maximum shape.

A better v1 contract is:

> construct one deterministic **bounded migration-source projection**, with no generated defaults, then compute the installation-local domain-separated token over that projection.

This keeps source identity aligned with what the migration can actually preserve.

## 2. Projection must be deterministic and default-free

The projection is built before any fallback that uses:

- `crypto.randomUUID()`;
- `Date.now()`;
- attempt-local reset id;
- migration-attempt timestamps.

Missing historical identity/time fields remain explicit empty/zero sentinel values in the projection.

Only after the local source token and stable pending id are known may materialization assign normal current-runtime defaults.

## 3. Projection uses the same bounded migration semantics

The projection should retain the bounded fields that materially affect the migrated checkpoint, including at least:

- explicit legacy/pending id if present;
- stored created/updated/attempt facts when present;
- historical operation id under its compatibility bound;
- bounded last error;
- destination/filename and other migration-owned data fields;
- normalized/bounded source scope fields used by reset matching;
- sanitized selection snapshot under the same migration policy.

It is not a new portable schema and is never exported.

## 4. Selection snapshot stripping happens before identity token

Current pending-append migration already strips `selectionSnapshot` when the materialized row would exceed the established pending-row size envelope.

The source projection should apply that same deterministic stripping rule before tokenization.

Result:

- reset and migration hash the same bounded representation;
- an oversized discarded snapshot does not keep megabytes of irrelevant identity input alive;
- token computation remains within the same approximate row envelope as the materialization it identifies.

If the row still exceeds the established bound after stripping, migration/reset fails closed as today rather than hashing/writing an unbounded record.

## 5. Recommended helper split

Phase-A destructive prerequisite can return bounded source projections without needing the local salt:

```text
readLegacyPendingJournalSnapshotBounded()
 -> normalizeLegacyPendingSourceProjection(raw)
 -> { projection, projectionJson, explicitId, scopeFacts, boundedSize }
```

No UUID/time fallback is generated.

Inside the authoritative `pendingAppends + meta` transaction:

```text
read/validate/create journalLocalTokenSalt:v1
 -> legacySourceToken = localToken('legacy-source', projectionJson)
 -> pendingId = explicitId || `legacy:${legacySourceToken}`
 -> fenceKey = `legacyPendingFence:v1:${legacySourceToken}`
 -> materialize/merge/fence under reset or ordinary migration rules
```

The synchronous bundled SHA-256 + `TextEncoder` path remains transaction-safe.

## 6. Why projection is preferable to raw-object hashing

It provides four concrete improvements:

1. **bounded work** — token input follows a migration-owned size envelope;
2. **stable semantics** — irrelevant future raw fields cannot silently change v1 identity;
3. **default exclusion** — generated UUID/time facts cannot enter source identity;
4. **data minimization** — fields discarded by migration are not retained indirectly in a durable token identity.

The local salt still prevents deterministic cross-install token equality for otherwise identical projections.

## 7. Version stability

The v1 projection algorithm must be shared by:

- destructive clear/import snapshot processing;
- ordinary legacy migration;
- late repeated migration after Chrome Storage remove timeout.

Do not duplicate its field list/stripping logic in multiple call sites.

If a future migration changes which source fields are identity-significant, use a new source-token version or an explicit compatibility path rather than silently reinterpreting old v1 fence keys.

## 8. Explicit id and identity-less rows

### Explicit id present

The pending/future Journal id remains that exact historical id. The projection token is still useful for:

- bounded fence lookup;
- identical duplicate dedupe;
- same-id/different-source conflict detection.

### No explicit id

Use:

```text
legacy:<legacySourceToken>
```

as the stable migration id.

This remains deterministic because the source token is computed over the default-free bounded projection.

## 9. Same-id conflict semantics remain unchanged

Two projections with the same explicit pending id but different source tokens remain:

```text
indeterminate/manual conflict
```

not last-write-wins.

Identical projections produce the same source token and can dedupe.

## 10. Deterministic model

Added:

`project_tools/test_p0_072_legacy_source_projection_model.js`

Local Node result before durable write:

```text
P0-072 legacy source projection model: PASS
```

Covered controls:

1. missing id/time defaults remain empty/zero and do not destabilize identity;
2. later generated UUID/materialization timestamps do not alter source token;
3. oversized selection data is stripped before token input;
4. resulting projection remains within the modeled pending-row envelope;
5. a meaningful bounded URL/source difference changes the same-install token.

The model is architecture evidence, not runtime PASS.

## 11. Acceptance additions

Implementation/tests must prove:

- legacy source token is computed from one shared bounded projection helper;
- projection is constructed before any random/time fallback;
- destructive snapshot and ordinary migration use the same projection implementation;
- selectionSnapshot stripping/row-size rule is deterministic before tokenization;
- identity-less stable pending id derives from the token, never a fresh UUID;
- raw discarded migration fields are not copied into `meta` merely for token identity;
- projection/token algorithm is version-stable.

## 12. Status

This checkpoint supersedes only the phrase “hash the exact raw legacy JSON” in earlier source-identity evidence. The stable pre-default identity, installation-local salt, fence, dedupe and conflict contracts remain intact.

**P0-072 remains ACTIVE.** Runtime/manifest remain unchanged. Manifest remains `0.9.8`; release remains `NOT READY`; no Actions/build/tag/GitHub Release is claimed.
