# J0 v8 cross-wave schema package — execution receipt — 2026-09-10

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
workflow    = J0 v8 cross-wave schema research
run_id      = 34389848652
run_attempt = 1
job_id      = 102595171289
job         = research
head_sha    = edc8535803e563ee08ace73eadae188bc0e57f22
runner      = ubuntu-24.04
conclusion  = success
```

Executed committed model:

```text
project_tools/test_j0_v8_cross_wave_schema_package_model.js
```

## Full decoded job-log evidence

The dedicated authenticated GitHub job-log reader returned the complete decoded log.

Exact model stdout:

```text
J0 v8 cross-wave schema package model: PASS; cases=67
```

The syntax-check step completed successfully before model execution.

Evidence class: **L2 deterministic architecture/schema model evidence**.

The claim is based on actual decoded stdout, not only green job metadata.

## Diagnostic artifact fallback

Exact-SHA artifact:

```text
artifact_id   = 10119170407
artifact_name = j0-v8-cross-wave-schema-edc8535803e563ee08ace73eadae188bc0e57f22
expired       = false at verification time
retention     = 7 days
artifact zip digest = sha256:64b105faf86824cdf76e2973a65d7e1539b6838be5a8870459ca9255f8533b11
```

The ZIP was physically downloaded through the authenticated artifact endpoint and inspected.

It contained exactly:

```text
j0-v8-cross-wave-schema-output.txt
```

with exact content:

```text
J0 v8 cross-wave schema package model: PASS; cases=67
```

Both primary raw job-log access and artifact fallback were therefore physically verified for this research run.

## Model scope

The 67 deterministic cases cover:

- preservation of all v7 stores;
- byte-equivalent preservation of legacy `pendingRemoteSaves` records;
- no entries/urlStats data rewrite during versionchange;
- exact new W1 stores/indexes;
- forward indexes on `pendingRemoteSaves` without provenance fabrication;
- `urlStatsV2` generation-isolated projection structure;
- `journalSummaries` generation-isolated light row/search projection;
- one-time dataset generation seed;
- `authorityMode=passive-v8` seed;
- resumable URL identity migration obligation seed;
- honest derived projection initial states;
- shadow-generation publication only when source revision remains exact;
- preservation of old/current projection after stale shadow build;
- runtime schema verification / fail-closed cases;
- service-worker-only structural migration ownership;
- page refusal to perform structural upgrade;
- old page refusal of future DB version;
- one v8 package satisfying all currently defined W1/W4/W6 physical-schema needs.

## Infrastructure note

The pinned `actions/upload-artifact@v5` commit also emitted GitHub's current Node-20-deprecation compatibility warning while GitHub forced the action runtime to Node 24. Artifact upload still completed successfully.

This is temporary research infrastructure and does not modify production or upgrade product evidence.

The temporary workflow is deleted from the final research branch after evidence capture.

## Browser/provider boundary

This execution does not prove:

```text
real IndexedDB v7->v8 migration behavior in target Chrome
blocked/versionchange lifecycle under real open extension pages
worker termination during real post-open backfill
production source implementation
Yandex provider semantics
```

Real Chrome acceptance remains future implementation evidence.

## Status impact

```text
new P-code          = NO
P1-231              = UNALLOCATED
Registry changes    = NONE
production changes  = NONE
real Chrome L3/L4   = NOT RUN
Yandex L5           = NOT RUN / DEFERRED
```
