# P1-231 S1-B passive production shadow settlement — 2026-09-22

Status: **PASSIVE PRODUCTION LIBRARY IMPLEMENTED / PERMANENT S1-B WORKFLOW NOT ACTIVATED**

Owner:

`P1-231 | ACTIVE`

Canonical baseline:

`abfda09da2a8d3e4f93a3937f21ec8ce3e61fc8e`

Baseline post-merge Repository Integrity:

- run #1023
- run id `35686386974`
- exact main: `abfda09da2a8d3e4f93a3937f21ec8ce3e61fc8e`
- conclusion: **SUCCESS**
- all three permanent jobs: **SUCCESS**
- S1-A push result: `eligible=true`, `shadow_outcome=eligible`, `release_authorized=false`

Manifest remains `0.9.8`.
Release readiness remains **NOT READY**.

## Purpose

This tranche promotes P1-231 S1-B from research-only modeling to a passive production library:

`project_tools/release_shadow_settlement.js`

It composes:

- S0-G typed receipt namespace/settlement authority;
- S1-A exact shadow candidate identity/eligibility.

It does not become a second receipt parser, receipt namespace, evidence authority, readiness authority, or release decision owner.

No permanent S1-B Repository Integrity job is installed in this tranche.

## Ordering and trust contract

The production library preserves the S1-B ordering:

1. normalize the exact candidate SHA;
2. read/validate the canonical receipt namespace through S0-G;
3. obtain/validate the exact S1-A shadow result;
4. if S1-A is ineligible, stop before candidate-specific S0-G settlement;
5. only if S1-A is eligible, consume S0-G exact candidate settlement;
6. validate candidate and RPF/QCF/RCF equality;
7. map the closed four S0-G slots into a bounded passive shadow report.

Receipt namespace corruption therefore remains a structural error even when the S1-A candidate is ineligible.

Candidate ineligibility does not get mislabeled as missing evidence.

## Current canonical main state

On the canonical baseline, the permanent S1-A push job already proves:

- exact candidate = current main;
- `generation_gate=pass`;
- `eligible=true`;
- `shadow_outcome=eligible`;
- `release_authorized=false`.

The current canonical S0-G receipt namespace is empty.

Therefore the current S1-B truth is:

- `identity_eligible=true`;
- `namespace_valid=true`;
- `namespace_receipt_count=0`;
- `settlement_evaluated=true`;
- `shadow_outcome=settled-blocked`;
- `s0g_settlement_state=evidence-missing`;
- all four slots = `missing`;
- `all_required_slots_pass=false`.

This is not a release failure invented by S1-B. It is a passive projection of current S0-G evidence truth.

## Control-plane PR state

For a protected PR where permanent S1-A truthfully reports:

- `eligible=false`;
- `shadow_outcome=control-plane-review-required`;

S1-B still validates the S0-G namespace first, then returns:

- `identity_eligible=false`;
- `settlement_evaluated=false`;
- `shadow_outcome=candidate-ineligible`;
- `blocker_reason=control-plane-review-required`;
- every slot = `not-evaluated`;
- `all_required_slots_pass=false`.

It does not invoke candidate-specific semantic settlement for that ineligible candidate.

## Eligible settlement path

For an eligible S1-A candidate, the production library consumes S0-G and requires:

- schema `webclip-evidence-settlement-result/v1`;
- exact candidate equality;
- `candidate_generation_state=pass`;
- exact RPF equality;
- exact Chrome QCF equality;
- exact Yandex QCF equality;
- exact full RCF equality;
- exactly four required slots:
  - `unpacked-chrome`
  - `yandex-e2e`
  - `blocker-review`
  - `release-decision`
- consistency between slot states, `all_required_slots_pass`, and S0-G settlement state.

S1-B maps:

- all slots PASS -> `settled-pass`;
- any missing/blocked slot -> `settled-blocked`.

It preserves the underlying bounded S0-G state separately as `s0g_settlement_state`.

## Structural failures

The production library fails closed for at least:

- malformed receipt namespace;
- stale/malformed S1-A candidate;
- malformed S1-A passive envelope;
- inconsistent S1-A eligible/outcome pair;
- malformed S0-G result;
- S0-G candidate mismatch;
- RPF/QCF/RCF mismatch;
- unknown/missing slot;
- inconsistent all-required boolean;
- inconsistent S0-G aggregate settlement state;
- provider/tool failure.

These are control-plane integrity defects, not ordinary release blockers.

## Result schema

S1-B emits:

`webclip-shadow-settlement/v1`

with bounded state only:

- exact candidate;
- identity eligibility;
- namespace validity/count;
- whether semantic settlement was evaluated;
- high-level shadow outcome;
- bounded blocker reason;
- four bounded slot summaries;
- aggregate required-slot truth;
- S0-G settlement state when evaluated.

No aggregate S1-B fingerprint is introduced.

## Side-effect boundary

Every returned result retains:

- `policy_mutation=false`
- `receipt_mutation=false`
- `readiness_mutation=false`
- `artifact_build=false`
- `release_authorized=false`

The library does not:

- write or mint `webclip-release-evidence/v2`;
- modify `RELEASE_READINESS.md`;
- build/stage the current WebClip ZIP;
- perform Chrome/Yandex qualification;
- create tag/release/deployment state;
- authorize S2 or release.

## S0-I trust-surface extension

Because S1-B is now production shadow control-plane code, this tranche adds:

`project_tools/release_shadow_settlement.js`

to the S0-I `CHECKER_CONTROL_PLANE` set.

A PR changing S1-B implementation therefore requires trusted control-plane review in S1-A rather than automatically certifying its own shadow semantics.

The current permanent S1-A workflow remains active and unchanged.

## Deterministic production witness

`project_tools/test_release_shadow_settlement.js` proves:

- current empty namespace -> current eligible candidate -> `settled-blocked/evidence-missing`;
- namespace validation occurs before S1-A/settlement ordering;
- review-required S1-A candidate short-circuits semantic settlement;
- all-pass synthetic S0-G -> `settled-pass`;
- each required slot can independently block;
- malformed namespace fails structurally;
- stale/malformed S1-A fails structurally;
- S0-G candidate/identity/slot/aggregate drift fails structurally;
- bounded output excludes secret/release-authority surfaces;
- S1-B implementation is S0-I protected;
- permanent S1-A job remains present;
- permanent S1-B job remains absent.

## Relation to historical source-spec

The 2026-09-10 S1-B source-spec described an older blocked-generation baseline.

The current deterministic source-spec model had already been reconciled to the modern state:

- S1-A current eligible = true;
- S0-G current settlement = evidence-missing;
- S1-B current outcome = settled-blocked.

This production tranche follows the reconciled current semantics rather than reviving the historical blocked-portability state.

## Next bounded step

After this bootstrap tranche is merged and post-merge Repository Integrity is green, the next S1-B step may evaluate permanent read-only workflow activation.

Any permanent S1-B job must preserve:

- the S1-A synthetic-merge/push candidate;
- namespace-before-eligibility ordering;
- candidate-ineligible as exit-0 passive truth;
- settled-blocked as exit-0 passive truth;
- structural errors as nonzero;
- zero receipt/readiness/build/release mutation.

S1-C and S1-D remain inactive.

## Explicit non-actions

No permanent S1-B workflow activation, receipt mutation, product ZIP/build, readiness migration, release-gate execution, version bump, tag, deployment, GitHub Release, Chrome/Yandex qualification, S1-C/S1-D activation, S2 authorization, or release decision is performed.
