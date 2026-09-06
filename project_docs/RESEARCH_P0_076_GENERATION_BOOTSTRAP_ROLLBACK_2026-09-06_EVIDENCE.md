# P0-076 — Journal mutation-generation bootstrap and rollback contract — 2026-09-06

Date: 2026-09-06  
Canonical source baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Working branch: `research/p0-076-journal-generation-cas-2026-09-06`  
Deterministic model commit: `057f4ec88bd8e8da57ad2343e56a6dd1f5c3ac66`  
Owners: **P0-076 ACTIVE**, with P0-072 integration for pending/reset rows.

This checkpoint corrects the exact-key/version/bootstrap semantics of the global Journal mutation-generation control before runtime implementation. Runtime/manifest remain unchanged.

## 1. Version must live in the body, not the exact key

An earlier P0-076 sketch used:

```text
journalMutationGeneration:v1
```

as the exact `WebClipJournal.meta` key.

That is rollback-unsafe. If a future implementation writes only `journalMutationGeneration:v2` and removes the v1 key, an older worker after downgrade would observe the v1 key as missing and could bootstrap a new generation over existing future-version authority.

Selected correction:

```text
key = 'journalMutationGeneration'
value = {
  version: 1,
  generation: '<worker-issued UUID-v4>',
  destructiveBoundarySeen: <boolean>
}
```

The exact key is a stable discovery/authority control. Schema version lives inside the body.

A future incompatible body remains visible to an older worker and is classified unsupported/fail-closed rather than absent.

## 2. Why bootstrap state needs more than a UUID

Existing installations and current pending rows predate P0-076 and have no `expectedJournalGeneration`.

Suppose the upgraded runtime simply creates a new generation UUID during an ordinary point mutation. Later it sees an old pending row with no expected generation. The runtime must decide whether that row:

- legitimately predates the harmless first bootstrap; or
- somehow appeared/survived after a destructive clear/import and therefore must not be rebound to current Journal authority.

A UUID alone cannot distinguish those cases.

The minimal persistent bootstrap fact is:

```text
destructiveBoundarySeen
```

It starts `false` only when the first generation control is created outside a destructive reset. Once any destructive clear/import occurs, it becomes `true` and never returns to false for v1.

The generation UUID still rotates on each destructive boundary.

## 3. Ordinary bootstrap

When the generation control is absent and an upgraded ordinary operation first needs it:

```text
create {
  version: 1,
  generation: randomUUID(),
  destructiveBoundarySeen: false
}
```

inside the same readwrite transaction that needs the authority.

Do not perform a separate pre-transaction bootstrap write.

Malformed/unsupported existing control must not be replaced by a new v1 record merely because the parser cannot understand it.

## 4. Legacy pending adoption before the first destructive boundary

A pre-P0-076 pending/recovery row may have no `expectedJournalGeneration`.

It may be lazily bound to the current generation only when the current control is valid v1 and:

```text
destructiveBoundarySeen === false
```

or when the control is being created as an ordinary bootstrap in that same serialized transaction.

Reason: while the flag is false, no P0-076 destructive generation boundary has occurred since bootstrap, so grandfathering a pre-existing durable row does not cross a reset.

The write must still obey all P0-072 operation-identity/reset/stage fences.

## 5. After any destructive boundary, missing expected generation is indeterminate

Once:

```text
destructiveBoundarySeen === true
```

an old row that later appears with no expected Journal generation cannot be blindly adopted into the current generation.

It may be:

- a stale writer from before reset;
- a row created by a downgraded older runtime that did not understand P0-076;
- an incomplete/corrupt migration artifact.

Required default:

```text
missing expected generation + destructiveBoundarySeen=true
-> indeterminate/manual/fail-closed
```

unless a stronger owner-specific receipt/fence proves a safe relationship.

This directly protects extension downgrade/upgrade sequences.

## 6. First upgraded action may itself be a reset

If the generation control is absent and the first P0-076-aware operation is clear/import:

1. the authoritative reset transaction creates a fresh generation control with `destructiveBoundarySeen=true`;
2. it classifies all relevant durable P0-072 rows in that same transaction;
3. matching/indeterminate rows are detached;
4. definite nonmatches are explicitly assigned/rebased to the newly created generation;
5. success publishes only on commit.

Thus a definite nonmatch may receive the first generation even though the control is born as a destructive boundary. This assignment is safe because it is made by the authoritative reset transaction after exact scope classification, not by later blind legacy adoption.

## 7. Future-version rollback semantics

For the stable exact key `journalMutationGeneration`:

```text
key absent              -> legacy bootstrap state
version 1 valid          -> current authority
version unsupported      -> fail closed
body malformed           -> fail closed
```

An old worker must never convert `unsupported-version` into `absent`.

A future implementation that needs incompatible control semantics should keep the same exact key and bump body version, or provide a separately proven compatibility envelope. It must not move authority exclusively to a new version-suffixed key.

## 8. Interaction with modern Journal entries

Modern entry mutation authority remains:

```text
journalGeneration
entryGeneration
entryRevision
```

A modern `journalLocalRevision` without a valid current global generation control is inconsistent/corrupt and must not silently fall back to legacy mutation authority.

Legacy Journal rows themselves do not need a stored expected generation: their rendered authority observes the current generation + exact DB revision in one `[entries, meta]` readonly transaction. Their first successful mutation installs modern per-entry authority.

The `destructiveBoundarySeen` adoption rule primarily matters for durable operation/checkpoint rows that may settle later without being re-rendered from the current Journal snapshot.

## 9. Interaction with scoped reset rebase

The previous scoped-reset protocol remains:

- rotate generation on every destructive clear/import;
- matching/indeterminate durable rows are detached and keep historical authority;
- definite nonmatching durable rows are transactionally rebased to the new generation.

`destructiveBoundarySeen` becomes true in the same transaction and remains true afterwards.

This means any later generation-less row is treated conservatively, while every legitimate survivor of the reset was already explicitly rebased.

## 10. Deterministic model

Added:

`project_tools/test_p0_076_generation_bootstrap_rollback_model.js`

Local Node result before durable write:

```text
P0-076 Journal generation bootstrap/rollback model: PASS
```

Controls:

1. first ordinary bootstrap creates v1 generation with `destructiveBoundarySeen=false`;
2. pre-existing generation-less rows can adopt while no destructive boundary has occurred;
3. destructive reset rotates generation and permanently sets boundary-seen true;
4. reset transaction may explicitly rebase definite nonmatches;
5. a generation-less row appearing after a destructive boundary cannot be grandfathered;
6. first upgraded action may be reset and still safely assign the first generation to definite nonmatches;
7. unsupported future control body is not mistaken for missing/bootstrap state;
8. malformed v1 body fails closed.

Architecture/model evidence only; runtime remains RED.

## 11. Source-contract correction

The P0-076 committed-source gate should require the stable marker:

```text
journalMutationGeneration
```

not the superseded version-suffixed exact key `journalMutationGeneration:v1`.

The body/version validator is the source of schema-version semantics.

## 12. Status

P0-076 remains **ACTIVE**. P0-072 remains **ACTIVE** and will consume this bootstrap/rebase rule when generation integration is implemented.

Runtime/manifest unchanged; manifest remains `0.9.8`; release remains `NOT READY`; no Actions/build/tag/GitHub Release is claimed.
