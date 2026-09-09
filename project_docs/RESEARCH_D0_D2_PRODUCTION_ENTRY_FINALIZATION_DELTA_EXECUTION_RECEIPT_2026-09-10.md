# D0/D2 production-entry finalization delta — execution receipt — 2026-09-10

Mode: **RESEARCH-ONLY / DETERMINISTIC MODEL EVIDENCE**

Canonical production baseline during tranche:

```text
main = e971bb796e1eed8c295032ab439bd2a8ef5e0d1a
Registry blob = 81e5867c0e0936b9524ece8949c53ad4ed83523c
```

No production source or Registry status was changed.

## Exact GitHub Actions identity

```text
repository  = lukindv77/webclip-pdf
workflow    = D0 D2 finalization delta research
run_id      = 34389022173
run_attempt = 1
job_id      = 102592447698
job         = research
head_sha    = 52e22c0b564c7a4d1e2541dcb70a6723776fab54
runner      = ubuntu-24.04
conclusion  = success
```

The executed commit contains the committed model:

```text
project_tools/test_d0_d2_production_entry_finalization_delta_model.js
```

## Full decoded job-log evidence

The dedicated authenticated GitHub job-log reader returned the complete decoded log.

Relevant exact output:

```text
D0/D2 production-entry finalization delta model: PASS; cases=56
```

The syntax-check step also completed successfully before model execution.

Evidence level: **L2 deterministic architecture/model evidence**.

A green job status alone was not used as the proof; the actual decoded stdout was inspected.

## Diagnostic artifact fallback

The workflow also generated an exact-SHA diagnostic artifact:

```text
artifact_id   = 10118851520
artifact_name = d0-d2-finalization-delta-52e22c0b564c7a4d1e2541dcb70a6723776fab54
expired       = false at verification time
retention     = 7 days
artifact zip digest = sha256:b5cf95ebfb2babcdbc1e2e78a74a7d7f67cb63b2ea8dfa8d16238ba82eb3b431
```

The artifact ZIP was physically downloaded through the authenticated GitHub artifact endpoint and inspected.

It contained exactly one diagnostic file:

```text
d0-d2-model-output.txt
```

with content:

```text
D0/D2 production-entry finalization delta model: PASS; cases=56
```

Thus both the primary raw-log path and the diagnostic-artifact fallback were physically available for this research execution.

## Model coverage

The 56 deterministic cases cover, among other schedules:

- P-before-F continuity and P/F cross-database gap;
- early F admission requirement;
- separate `pendingRemoteSaves` and `pendingRemoteMutations` families;
- upload/destructive effect-start F/JG/ER gates;
- clear/replacement before effect start producing zero provider effect;
- clear/replacement after `started-unknown` preserving effect ownership;
- exact save finalization versus Journal suppression;
- publication generation and separate publication-effect settlement;
- destructive target/object identity checks;
- local suppression after stale F/JG/ER;
- `passive-v8 -> cas-v1` activation gates;
- unresolved authority retention;
- P-terminal-summary prerequisite for terminal detail GC;
- phase-aware recovery priority.

## Infrastructure warning

The log contained a GitHub infrastructure warning that the pinned `actions/upload-artifact@v4` commit targets Node.js 20 and is currently forced by GitHub to run on Node.js 24.

This did not affect model execution or artifact creation. The workflow is temporary research infrastructure and is removed from the final research branch after evidence capture.

No product correctness/evidence level is upgraded because of this warning or because the artifact upload succeeded.

## Provider/browser boundary

This run does **not** prove:

```text
real Chrome IndexedDB/browser behavior for the future implementation
real Yandex remote semantics
provider SHA/resource/revision semantics
production D0/D2 code
```

Those remain future implementation/browser or final external L5 gates.

## Status impact

```text
new P-code          = NO
P1-231              = UNALLOCATED
Registry changes    = NONE
production changes  = NONE
Yandex L5           = NOT RUN / DEFERRED
```
