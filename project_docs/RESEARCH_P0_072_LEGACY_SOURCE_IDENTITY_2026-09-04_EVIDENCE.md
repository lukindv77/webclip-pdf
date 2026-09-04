# P0-072 — stable legacy source identity before normalization defaults — 2026-09-04

Date: 2026-09-04  
Canonical source baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Working branch entering this block: `research/p0-072-recovery-quarantine-2026-09-04 @ 2ae307c562848ba8a5d2d8595d99dead3cd0ef92`  
Deterministic model commit: `e56a3021fb98ef247e9d7b51a51161dd354ac970`  
Owner: **P0-072 ACTIVE**.

This checkpoint fixes the identity of legacy `webclipPendingJournalAppends` source rows so reset fencing and repeated migration cannot depend on generated UUID/time defaults. Runtime remains unchanged.

## 1. Fresh source finding — current migration can assign a new random id on every read

Current migration loop does:

```text
const data = normalizePendingJournalAppendData(raw.data || {});
const id = String(raw.id || data.journalEntryId || '').trim();
```

Current `normalizePendingJournalAppendData()` does:

```text
journalEntryId = String(data.journalEntryId || '').trim()
  || crypto.randomUUID()/fallback
```

Therefore when a legacy raw row contains neither:

- `raw.id`, nor
- `raw.data.journalEntryId`,

the migration identity is created **during normalization**.

Two concurrent/repeated reads of the same raw legacy row can consequently produce different pending ids.

That was tolerable only while migration normally removed the legacy source after one successful pass. It is incompatible with P0-072 reset fencing because reset and a stale migration may normalize the same still-present row independently.

## 2. Concrete failure schedule

1. reset reads raw legacy row L with no explicit id;
2. reset normalization generates id A;
3. reset creates fence/materializes detached row A;
4. stale migration had read the same L separately;
5. its normalization generates id B;
6. fence keyed by A/id-derived identity does not match B;
7. migration can create ordinary active row B after reset;
8. old Journal replay authority crossed the reset boundary.

A fence is useful only if the source identity used to find it is stable before either side introduces generated defaults.

## 3. Required ordering — fingerprint raw source before normalizer

For each bounded legacy source element:

1. obtain the raw object from the bounded Chrome Storage array;
2. serialize the exact source object in the same deterministic JS representation used by both destructive snapshot and ordinary migration;
3. compute a synchronous SHA-256 digest over UTF-8 bytes;
4. call this the **legacy source digest**;
5. only then run normal pending-data normalization/defaulting.

The source digest must not include:

- a newly generated UUID;
- a fallback `Date.now()` timestamp created by the new runtime;
- reset id;
- migration attempt counters created outside the stored raw source.

It represents the old stored source record, not the new materialization attempt.

## 4. Stable pending id rule

For a legacy source row:

### Explicit legacy id exists

If either of these is nonempty:

```text
raw.id
raw.data.journalEntryId
```

preserve that exact value as the pending/future Journal id, subject to the existing legacy row/aggregate bounds and later owner work on general id hygiene.

P0-072 does not rewrite a valid historical identity merely to make a fence key shorter.

### No explicit legacy id exists

Do **not** generate a fresh UUID.

Use a deterministic internal pending id derived from the source digest, conceptually:

```text
legacy:<64-hex-source-digest>
```

This is bounded and stable across repeated/concurrent reads of the same stored raw row.

It also prevents one physical legacy source element from materializing as multiple active pending rows solely because the worker restarted.

## 5. Legacy fence should track source digest, not generated pending id

The previous persisted-schema checkpoint selected a bounded SHA-256 fence key because raw legacy ids can be unbounded.

This checkpoint further refines the digest input.

Authoritative direction:

```text
legacyPendingFence:v1:<legacy-source-digest>
```

rather than:

```text
legacyPendingFence:v1:<digest(derived/generated pending id)>
```

Why:

- source digest exists before normalization/default generation;
- identity-less rows remain fenceable;
- explicit-id rows and identity-less rows use one migration-source namespace;
- same textual explicit id with different raw payloads can be distinguished as distinct source records during conflict analysis.

The fence record itself may store the same 64-hex `legacySourceDigest`; it need not duplicate raw source JSON or raw legacy id.

## 6. Same textual pending id + different source digest is a conflict

The bounded legacy array may contain two raw rows that resolve to the same explicit pending id while carrying different payloads.

Current whole-record migration would process both `put()` operations and silently let the later one win.

For P0-072 this is unsafe during reset/fencing because the worker cannot know which source representation owns the external/recovery history.

Required rule:

```text
same pendingId + different legacySourceDigest -> indeterminate/manual conflict
```

Do not select the last row and do not treat one as a proved scoped nonmatch merely because another same-id representation differs.

Inside reset, any target-relevant same-id conflict loses automatic replay authority and is retained/manual.

Ordinary migration should likewise stop using last-write-wins for this conflict.

## 7. Identical duplicate raw source can deduplicate

If two entries in the legacy array have the same exact source digest, they are the same stored source representation for the purposes of this migration-only fence.

They may be collapsed to one normalized source item before the IDB transaction.

This is different from same-id/different-digest conflict.

The legacy source remains bounded to its existing maximum count, so the dedupe scan is finite.

## 8. Raw JSON digest scope

The current legacy source is a Chrome Storage object/array with no current live writer in the modern source; ordinary migration is the only current consumer/remover.

For this historical compatibility source, digesting the exact bounded `JSON.stringify(raw)` representation is sufficient for the reset/migration rendezvous because both paths read the same stored object representation and use the same helper.

The helper must be shared; destructive reset and ordinary migration must not implement two different serializers.

If future code ever reintroduces a live writer or semantic canonicalization requirement for this legacy key, that should use a new migration-source version rather than silently changing the v1 digest algorithm.

The digest is not a general content-addressing API for modern Journal records.

## 9. Shared normalization helper is required

Introduce one pure/helper layer conceptually like:

```text
readLegacyPendingJournalSnapshotBounded()
normalizeLegacyPendingJournalSource(rawList)
legacyPendingSourceDigest(raw)
legacyPendingStableId(raw, sourceDigest)
```

Both:

- destructive clear/import snapshot processing, and
- ordinary `migrateLegacyPendingJournalAppends()`

must consume the same normalized source representation.

This prevents drift in:

- source id selection;
- selectionSnapshot stripping under row-size limits;
- operation id/error bounds;
- URL/site scope extraction;
- fence lookup.

Do not copy/paste the legacy parsing loop into the destructive handler.

## 10. Generated timestamps remain materialization facts, not source identity

Some current fallback fields use `Date.now()` when the legacy row omitted timestamps.

Those values may still be assigned when one normalized source is first materialized, subject to current semantics.

They are **not** part of `legacySourceDigest`.

If two transactions race to materialize the same source:

- the source digest/fence rendezvous is identical;
- one IDB transaction ordering/current-row check wins;
- later writer preserves the already materialized current row rather than overwriting it with a second timestamp/default snapshot.

This makes generated defaults harmless to source identity.

## 11. Very long explicit legacy ids

Current normalization can preserve a very long explicit legacy id as the existing pending key, bounded indirectly by the legacy row-size envelope.

P0-072 does not need to duplicate it into `meta`:

- fence key is fixed source digest;
- fence record stores digest/reset facts only;
- pending row continues to hold the original legacy id because changing it would alter the historical future-Journal identity.

A broader universal id-length migration, if desired, belongs to separate data-model work rather than being hidden inside reset fencing.

## 12. Deterministic model

Added:

`project_tools/test_p0_072_legacy_source_identity_model.js`

Local Node result before durable write:

```text
P0-072 legacy source identity model: PASS
```

Durable model commit:

`e56a3021fb98ef247e9d7b51a51161dd354ac970`

Covered controls:

1. identity-less raw source gets the same `legacy:<digest>` pending id across repeated reads;
2. source digest is computed before any generated UUID/timestamp defaults;
3. a 200k-character explicit legacy id still creates a fixed-length fence key;
4. same explicit pending id + different raw payload produces a source-digest conflict rather than last-write-wins;
5. identical duplicate raw source deduplicates;
6. distinct identity-less raw rows receive distinct stable pending ids;
7. fence key and fallback pending id both rendezvous on the same pre-normalization source digest.

This is architecture/model evidence, not runtime PASS.

## 13. Direct implementation acceptance additions

Add to the P0-072 runtime/source gate:

- legacy source digest is computed before `normalizePendingJournalAppendData()` can generate ids/timestamps;
- destructive snapshot and ordinary migration use the same source-normalization helper;
- legacy raw row lacking both id fields never receives a fresh random migration id;
- repeated reads of that row resolve the same stable pending id/fence;
- fence key is based on legacy source digest, not raw id concatenation;
- same explicit pending id with different source digest is manual/conflict, not last-write-wins;
- identical source-digest duplicates do not create multiple pending rows;
- stale writer cannot overwrite the current row merely because its generated fallback timestamps differ;
- new v1 digest algorithm remains version-stable.

## 14. Owner boundaries

This is narrow P0-072 legacy rematerialization identity.

It does not claim a general cryptographic identity model for Journal entries and does not close:

- P0-076 current Journal generation CAS;
- P1-216 general legacy/modern URL identity;
- any broader future historical-id migration.

No new P-code is allocated.

## 15. Status

The legacy migration/reset contract now has a stable source rendezvous even for malformed/very old rows that lack an explicit id.

The refined identity chain is:

```text
raw bounded legacy source
 -> SHA-256 source digest BEFORE defaults
 -> explicit pending id if present, else legacy:<digest>
 -> fence key legacyPendingFence:v1:<digest>
 -> shared reset/migration writer fencing
```

**P0-072 remains ACTIVE.** Runtime/manifest remain unchanged. Manifest remains `0.9.8`; release remains `NOT READY`; no Actions/build/tag/GitHub Release is claimed.
