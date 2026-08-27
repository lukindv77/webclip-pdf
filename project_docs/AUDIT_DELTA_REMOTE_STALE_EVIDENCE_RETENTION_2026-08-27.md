# Audit delta — remote stale-evidence retention / unknown-settlement tombstone — 2026-08-27

Source-of-truth `main` immediately before this write: `dc1a2f4d47dcc4292285741b4a5a57cf34dcb4ae`.

Docs-only audit checkpoint. Production/runtime/tests/configuration and `manifest.json` are unchanged. Canonical registry synchronization is not claimed by this file.

## Classification

No new P-number is assigned.

Fresh source proof strengthens existing **P1-184** (exact remote object/content proof and unknown-settlement reconciliation). It applies the same evidence-preservation principle already required by **P0-039** for local-download unknown outcomes to the Yandex remote-save side.

Dependencies remain:

- **P0-073/P0-074** — exact account/root/auth/config namespace and operation generation;
- **P0-079** — exact immutable local PDF/content generation;
- **P0-076** — stale Journal generation must not regain finalization authority;
- **P1-194** — retention/durability claims must match the actual storage guarantee.

This is not a new retry or capacity root cause. The defect is that the current bounded archive eventually converts an unresolved external side effect into **no retained recovery identity at all** solely because time/capacity thresholds were reached.

## Positive control — active queue is deliberately bounded

Current remote-save recovery correctly avoids leaving repeatedly unresolved 404 rows in the active queue forever.

A PREPARED checkpoint that repeatedly returns 404 can, after the configured age/attempt threshold, transition to:

`phase: 'stale-unverified'`.

That state is excluded from ordinary active recovery enumeration, so an unresolved historical row does not permanently consume one of the active `MAX_PENDING_REMOTE_SAVES` slots.

This active-vs-archive split is valuable and should remain. The finding is not that every stale row must remain in the hot recovery loop.

## Fresh source proof — archived unknown-settlement evidence is later physically deleted

Current constants include:

- `PENDING_REMOTE_STALE_RETENTION_MS = 30 * 24 * 60 * 60 * 1000`;
- `MAX_PENDING_REMOTE_STALE_SAVES = 100`.

`cleanupStalePendingRemoteSaves()`:

1. enumerates all `phase === 'stale-unverified'` rows ordered by `updatedAt`;
2. builds `removeKeys` from every stale row whose `staleAt` is older than the 30-day cutoff;
3. among the remaining rows, if the count is greater than 100, adds the oldest excess rows to `removeKeys`;
4. physically deletes those keys from `JOURNAL_PENDING_REMOTE_STORE`.

Therefore an upload whose settlement was never authoritatively classified can lose its final locally retained operation/object recovery identity for either of two non-evidentiary reasons:

- wall-clock age exceeded 30 days;
- more than 100 unresolved stale rows exist.

Neither condition proves that the original signed PUT did not commit, that no remote object exists, or that the object can no longer surface/be discovered later.

## Why `stale-unverified` is still unresolved external evidence

The transition to `stale-unverified` is deliberately conservative: it happens after repeated 404 observations and elapsed time, precisely because those observations are not treated as authoritative negative settlement.

Once a row is in that state, the semantics are therefore:

- automatic active recovery has stopped/deprioritized it;
- remote outcome remains unverified;
- the local receipt is still the evidence explaining which intended operation/path/account/content may have created an object.

Deleting the row later because another independent retention clock elapsed does not improve the quality of the negative proof. It only removes the evidence.

This is the same logical distinction already enforced elsewhere in the project:

`bounded retention policy != proof of external non-occurrence`.

## Concrete failure scenarios

### 1. Delayed/manual discovery after 30 days

1. PDF upload attempt A is durably checkpointed and signed PUT may have started.
2. Worker loses the response; repeated lookups do not prove the object.
3. A is archived as `stale-unverified`.
4. No authoritative resolution is obtained for 30 days.
5. Maintenance physically deletes A's row.
6. User later discovers the Yandex object manually or a future API/read path could identify it.
7. WebClip no longer has the exact local receipt needed to associate that object with A's source document/PDF/Journal generation or to explain why it exists.

### 2. Capacity pressure deletes recent unresolved evidence

1. More than 100 stale-unverified operations accumulate, for example during a long provider/account incident or repeated historically ambiguous saves.
2. Some rows are still younger than 30 days.
3. `cleanupStalePendingRemoteSaves()` nevertheless deletes the oldest excess rows solely to satisfy `MAX_PENDING_REMOTE_STALE_SAVES`.
4. Those external side effects remain unresolved; capacity pressure has silently become a destructive evidence policy.

### 3. Future stronger P1-184 implementation makes this more important

Once P0-079/P1-184 carry exact local digest, transfer attempt, remote-save generation, account/root and object identity, the stale row becomes much more valuable than today's weak path/size record.

Keeping the existing unconditional 30-day/100-row delete after implementing stronger provenance would destroy exactly the evidence needed for later/manual reconciliation.

Therefore retention semantics must be fixed as part of the P1-184 architecture, not postponed as an unrelated cleanup optimization.

## Required bounded retention contract

The solution must remain bounded. The audit does **not** require unbounded retention of large PDF bodies or unlimited full checkpoints.

### Separate hot recovery from compact unresolved evidence

Use distinct lifecycle classes, for example:

1. active automatic recovery receipt;
2. compact unresolved/dead-letter receipt;
3. authoritatively resolved/explicitly discarded record.

Moving from (1) to (2) is allowed on age/attempt/cap policy. Moving from (2) to no evidence requires a stronger contract.

### Compact tombstone instead of blind deletion

When full stale records exceed the desired retention budget, compact them to a bounded tombstone containing the minimum identity necessary to avoid pretending the external event never existed.

The exact schema depends on the final provenance model, but should retain enough bounded fields to identify at least:

- immutable remote-save/transfer attempt generation;
- intended Journal operation/generation identity in a non-authoritative historical form;
- account/root/config namespace receipt or stable normalized namespace identifier;
- exact intended remote path;
- stable remote resource identity if ever observed;
- exact local content generation/digest or a bounded digest receipt where available;
- original/last reconciliation timestamps;
- explicit state such as `outcome-unresolved`;
- reason the full active record was compacted.

Large Blob/PDF bodies need not remain forever. P0-079 can release large content once no active side effect requires the body, while a compact digest/provenance tombstone remains.

### Capacity policy

A hard cap can apply to full active/stale records, but reaching the cap must not silently rewrite `unknown external outcome` as `no evidence`.

Acceptable bounded strategies include:

- compact full stale rows into much smaller tombstones;
- aggregate old tombstones only if aggregation preserves enough unique operation identity for diagnosis/reconciliation;
- require explicit user/manual acknowledgement before irrevocably forgetting an unresolved remote side effect;
- if storage pressure forces emergency loss of even compact evidence, surface that loss truthfully as `recovery evidence evicted`, not as a proven absent/failed upload.

The implementation must define a bounded maximum for compact evidence and a deterministic degradation policy; the answer is not an unbounded log.

### Journal finalization authority remains revoked

Preserving a dead-letter/tombstone after clear/import or after active recovery abandonment does **not** preserve authority to append or mutate the current Journal.

P0-076 remains authoritative: old operation evidence can be retained for reconciliation/diagnosis while its ability to finalize into a replacement Journal generation is permanently stale.

This composes with `AUDIT_DELTA_JOURNAL_REPLACE_RECOVERY_EVIDENCE_2026-08-27.md`: physical side-effect evidence and local Journal-finalization capability are separate lifecycle concepts.

## Required regressions

1. Unknown remote attempt becomes `stale-unverified`; after >30 days maintenance does not erase all operation/object evidence merely because of age.
2. 101+ stale-unverified attempts: active/full storage remains bounded, but the oldest unresolved attempt still has a compact diagnosable tombstone or an explicit evidence-eviction state.
3. A later exact remote-object discovery can be associated with the original compact receipt when required fields are available.
4. A compact stale receipt cannot append into a Journal generation replaced by clear/import.
5. Resolved negative outcome based on future authoritative provider evidence may be retired according to policy; ordinary 404/time alone is not that evidence.
6. Resolved positive remote object + completed local reconciliation may release the stale receipt under normal terminal cleanup.
7. Large PDF bodies are not retained indefinitely solely to satisfy this requirement; bounded digest/provenance evidence remains after body release where safe.
8. Storage-pressure emergency eviction is explicitly logged/surfaced as evidence loss and is not reported as `upload did not occur`.
9. Namespace/account changes do not merge compact tombstones with another account/root merely because textual paths match.
10. Full active/stale/tombstone storage remains globally bounded under stress.

## Duplicate check

No new number is created.

- **P1-184** owns exact remote object/content proof and unresolved external settlement lifecycle. This checkpoint adds the terminal evidence-retention requirement.
- **P0-039** is the analogous local-download rule that insufficient negative evidence must not justify destroying the only checkpoint; it remains the local owner rather than being broadened into a second Yandex item.
- **P0-073/P0-074** own namespace/generation identity, not retention lifetime.
- **P0-079** owns immutable PDF body/content generation and bounded physical-body lifetime, not the remote outcome itself.
- **P1-194** owns truthful durability/recovery-class claims, not whether an unresolved record is semantically safe to forget.

## Test / release state

No runtime/config/manifest change was made. Product tests were not rerun. The last proven product gate remains the historical **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. No build, tag or Release was created.
