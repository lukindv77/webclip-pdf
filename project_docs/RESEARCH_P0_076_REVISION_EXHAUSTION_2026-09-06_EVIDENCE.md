# P0-076 — bounded entry revision exhaustion — 2026-09-06

Date: 2026-09-06  
Canonical source baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Working branch entering this block: `research/p0-076-journal-generation-cas-2026-09-06 @ 12ca1a5581a3554bc1add41f7ba8f0bc9573ab4a` plus subsequent research-only checkpoints.  
Owner: **P0-076 ACTIVE**.

## Decision

`journalLocalRevision.revision` is a positive JavaScript safe integer.

Advance rule:

```text
1 <= revision < Number.MAX_SAFE_INTEGER
-> same entry generation
-> revision + 1
```

At:

```text
revision == Number.MAX_SAFE_INTEGER
```

P0-076 does **not** wrap to zero/one and does **not** silently rotate `entryGeneration`.

The mutation fails closed with typed outcome:

```text
entry-revision-exhausted
```

## Why no automatic generation rollover

An automatic new entry generation would look like a new logical incarnation to:

- rendered mutation authorities;
- P0-072/P0-076 external-effect receipts;
- same-id stale-write fences.

Doing that as a side effect of an otherwise ordinary comment/edit/settlement would create a second generation-transition protocol solely for an unreachable practical counter edge.

Fail-closed behavior is simpler and preserves all durable factual receipt evidence.

## External-effect settlement

If a remote effect has already reached a factual terminal state but local entry revision is exhausted, local projection/finalization may fail or require manual repair, but the trusted external-effect receipt is not deleted or rewritten to pretend the effect did not happen.

This follows the existing receipt-truth separation from P0-072.

## Invalid revision values

These are malformed/fail-closed, not legacy:

```text
<= 0
fractional
NaN / Infinity
> Number.MAX_SAFE_INTEGER
```

Only absence of the entire versioned `journalLocalRevision` field is the legacy-row case.

## Deterministic model

Added:

`project_tools/test_p0_076_revision_exhaustion_model.js`

Local scratch result before durable write:

```text
P0-076 revision exhaustion model: PASS
```

The model proves ordinary increment, no wrap/reincarnation at the maximum, malformed numeric rejection, and preservation of independent external receipt truth.

## Status

Research: **COVERED**. Runtime: **RED / NOT IMPLEMENTED**.

P0-076 remains ACTIVE. No production runtime, manifest, build, tag, Release or Actions run changed in this checkpoint.
