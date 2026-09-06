# P0-076 — mutation authority must bind the exact Journal entry id — 2026-09-06

Date: 2026-09-06  
Canonical source baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Working branch entering this block: `research/p0-076-journal-generation-cas-2026-09-06 @ 366935968162241814b1d9dcd36600e6421df099`  
Owner: **P0-076 ACTIVE**.

This checkpoint corrects the previously selected ephemeral `journalMutationAuthority` schema. No production runtime is changed.

## 1. Problem in the earlier schema

Earlier modern authority contained:

```text
version
kind=modern
journalGeneration
entryGeneration
entryRevision
```

Earlier legacy authority contained:

```text
version
kind=legacy
journalGeneration
legacyDbRevision
```

The legacy form is not an exact entry target by itself.

Two legacy entries rendered from the same coherent Journal snapshot naturally share:

```text
journalGeneration = G
legacyDbRevision = R
```

If a UI wiring bug accidentally attaches entry A's authority to a mutation message whose textual id is entry B, the old legacy tuple cannot distinguish them.

Exact rendered mutation authority therefore must include the textual entry target it was issued for.

## 2. Corrected authority shapes

Modern:

```text
journalMutationAuthority = {
  version: 1,
  kind: 'modern',
  entryId: '<exact bounded Journal id>',
  journalGeneration,
  entryGeneration,
  entryRevision
}
```

Legacy:

```text
journalMutationAuthority = {
  version: 1,
  kind: 'legacy',
  entryId: '<exact bounded Journal id>',
  journalGeneration,
  legacyDbRevision
}
```

`entryId` is bounded by the existing Journal entry id limit (180 chars).

## 3. Validation order

Worker mutation admission should classify before mutation:

1. authority shape/version/kind valid;
2. bounded `authority.entryId` exactly equals requested `message.id`;
3. current Journal generation matches;
4. current row exists;
5. modern: entry generation + revision match;
6. legacy: exact legacy DB revision matches and row is still legacy;
7. operation-specific lifecycle lock rules pass;
8. only then may the mutation execute.

A target mismatch returns:

```text
authority-target-mismatch
```

or an equivalent explicit invalid-authority subtype. It never falls back to id-only behavior.

## 4. Why modern authority should also bind id

A UUID-v4 entry generation makes accidental equality between two modern rows practically negligible, but correctness should not depend on generation uniqueness when the exact target id is already available and bounded.

Explicit target binding also catches:

- stale DOM/card handler attached to the wrong entry object;
- grouped-view reorder/cross-card wiring errors;
- synthetic deterministic tests that deliberately reuse generations;
- future generation-implementation defects.

## 5. Size envelope remains valid

With the existing maximum entry id length 180 and bounded revision fields:

```text
modern compact authority JSON <= 371 chars
legacy compact authority JSON <= 431 chars
```

Both remain within the already selected:

```text
MAX_JOURNAL_MUTATION_AUTHORITY_JSON_CHARS = 512
```

Therefore exact target binding does not require widening the authority IPC envelope.

## 6. Deterministic model

Added:

`project_tools/test_p0_076_authority_target_binding_model.js`

Local scratch execution before durable write:

```text
P0-076 authority target binding model: PASS
```

The model proves:

- two legacy rows may share all non-id authority fields, so cross-row reuse must be rejected by `entryId`;
- modern target correctness does not rely solely on random generation uniqueness;
- worst bounded modern/legacy authority remains inside 512 chars.

## 7. Acceptance update

Every mutation-capable direct/fallback projection must issue authority containing its exact entry id.

Every current mutation message family must send both:

```text
id
journalMutationAuthority.entryId
```

and worker requires exact equality.

After a successful mutation, the returned next authority again contains the same exact current entry id.

Same-id delete/recreate remains distinguished by `entryGeneration`; `entryId` is target binding, not incarnation binding.

## 8. Status

Research for this target-binding subcase is **COVERED**. Runtime remains **RED / NOT IMPLEMENTED**.

P0-076 remains ACTIVE. Runtime/manifest remain `0.9.8`; no build, tag, GitHub Release or Actions run is claimed.
