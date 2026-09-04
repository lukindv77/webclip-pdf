# P0-072 — legacy source prehash outside transaction / salted token inside transaction — 2026-09-04

Date: 2026-09-04  
Canonical source baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Working branch entering this block: `research/p0-072-recovery-quarantine-2026-09-04 @ f5c504dbf9364d4a447d2857369a86956314e6e3`  
Deterministic model commit: `38111df52ac03e6e3399364038e7c9eb84a310dc`  
Owner: **P0-072 ACTIVE**.

This checkpoint refines only CPU placement for legacy-source identity. Runtime/manifest are unchanged.

## 1. Existing bound

The legacy pending-append source is already bounded by the existing queue policy, including a multi-megabyte aggregate envelope. Earlier P0-072 research chose a deterministic bounded source projection and a final installation-local salted `legacy-source` token.

Computing SHA-256 over the complete projection inside an active IndexedDB request callback is transaction-safe because the bundled helper is synchronous, but it makes the transaction hold a potentially multi-megabyte pure-JS hash workload.

## 2. Split the construction

Use two layers:

### Phase A — outside authoritative transaction

For each already bounded deterministic source projection compute an **ephemeral**:

```text
sourcePrehash = SHA256(UTF8(stableProjectionBytes))
```

The prehash:

- is not persisted;
- is not logged;
- is not exported;
- is not used as the `meta` key;
- exists only in the bounded in-memory prerequisite snapshot.

### Phase B — inside authoritative transaction

After reading/creating the valid installation-local salt, compute the final durable rendezvous token from constant-size input:

```text
legacySourceToken = SHA256(
  "webclip-local-token-v1\0legacy-source\0"
  || saltBytes
  || "\0"
  || sourcePrehashBytes
)
```

The resulting 64-hex token remains the value used for:

- identity-less stable `legacy:<token>` pending id;
- `legacyPendingFence:v1:<token>` lookup key;
- same-id/different-source conflict analysis.

## 3. Privacy property is unchanged

Only the final salted token persists.

The unsalted prehash is ephemeral process memory and therefore does not create a new cross-install durable correlation surface.

Different installation salts still produce different durable tokens for the same source projection.

Domain separation remains explicit.

## 4. Why this is better for IndexedDB lifecycle

The authoritative transaction now hashes only constant-size prehash material per legacy row instead of potentially several megabytes of projection text.

This reduces:

- transaction callback CPU time;
- service-worker long-task exposure;
- delay before later IDB requests are queued;
- implementation pressure to introduce async WebCrypto, which would be unsafe inside the transaction lifecycle.

All expensive/source-sized validation and projection work remains in the bounded prerequisite phase where normal async scheduling is allowed.

## 5. Stable projection requirement remains

The prehash is only valid if destructive reset and ordinary legacy migration share the same versioned deterministic projection function.

Do not use raw `JSON.stringify()` on arbitrary input with runtime-generated UUID/time defaults.

The projection version is part of the migration contract; changing its semantic fields requires an explicit version change rather than silently changing v1 rendezvous.

## 6. Collision semantics

The construction relies on SHA-256 both for the ephemeral source prehash and the final salted domain-separated token.

This does not weaken the practical identity model relative to directly hashing the full projection in the final step; the final persisted key still has SHA-256 collision semantics and constant 64-hex size.

This is a bounded local migration identity, not a remote authentication primitive.

## 7. Deterministic model

Added:

`project_tools/test_p0_072_legacy_prehash_token_split_model.js`

Local equivalent result before durable write:

```text
P0-072 legacy prehash/final-token split model: PASS
```

Covered controls:

1. same deterministic projection yields the same prehash;
2. same prehash under different installation salts yields different persisted tokens;
3. domain separation remains effective;
4. different projections still yield different final identities.

This is architecture/model evidence, not runtime PASS.

## 8. Implementation acceptance addition

- Phase A computes bounded deterministic projection + ephemeral source prehash before opening the authoritative reset transaction;
- Phase B computes only the final salted/domain-separated token after current salt validation in `meta`;
- prehash is never persisted/logged/exported;
- destructive reset and ordinary migration use the same v1 projection/prehash function;
- no async hashing is introduced inside the IDB transaction.

## 9. Owner boundaries

This remains P0-072 implementation hygiene. P0-066/P1-216 remain owners for broader URL confidentiality/identity and P1-043 remains the shared physical quota owner.

No new P-code is allocated.

## 10. Status

P0-072 remains **ACTIVE**. Runtime and manifest remain unchanged. Manifest remains `0.9.8`; release remains `NOT READY`; no Actions/build/tag/Release is claimed.
