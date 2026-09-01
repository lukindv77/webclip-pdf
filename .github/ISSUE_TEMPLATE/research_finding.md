---
name: Research finding
about: Register a new research finding or refine an existing P-owner
title: "[RESEARCH] "
labels: ""
assignees: ""
---

## Baseline

- Exact `main` / source SHA:
- Files / subsystem:

## Observation

Describe the concrete defect, violated invariant, unsafe state transition or missing acceptance boundary.

## Reproduction / schedule

Describe the smallest deterministic schedule or reproduction. For concurrency/recovery findings, identify generations, authority, actual settlement and crash/restart points explicitly.

## Owner decision

- [ ] Existing P-owner refinement
- [ ] Candidate new root cause / new P-owner
- [ ] Candidate duplicate / merge
- [ ] Historical / non-current / rejected finding

Existing/proposed owner:

## Duplicate check

Checked immediately before allocation against:

- [ ] `project_docs/RESEARCH_REGISTRY.md`
- [ ] `project_docs/RESEARCH_DELTA_INDEX.md`
- [ ] relevant `RESEARCH_FAMILY_*_EVIDENCE.md`
- [ ] `project_docs/RESEARCH_HISTORY_INDEX.md`
- [ ] Git history

Do not treat a P-number as reserved until it is written into `RESEARCH_REGISTRY.md` through a reviewed PR.

## Acceptance criteria

List the observable conditions required to close or merge the finding.

## Verification class

- [ ] deterministic/source test is sufficient
- [ ] real unpacked Chrome required
- [ ] real Chrome permission/native-download/debugger boundary required
- [ ] real Yandex OAuth/API required
- [ ] other external verification required

## Evidence destination

Name the family/history evidence document that must retain the durable proof after merge.