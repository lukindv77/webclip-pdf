# WebClip — P1-231 S1-D migration rehearsal execution receipt — 2026-09-10

Date: 2026-09-10  
Repository: `lukindv77/webclip-pdf`  
Research owner: `P1-231`  
Node: `S1-D-migration-rehearsal`  
Authority: `migration-rehearsal-report` only  
Mode: **RESEARCH-ONLY / SHADOW / NO S2 OR RELEASE ACTIVATION**

## 1. Canonical baseline / fresh-check

Immediately before the S1-D durable source/model write, canonical GitHub state was re-read:

```text
main = 7849567f83f130d72141342eca4c71ba6d8229f7
project_docs/RESEARCH_REGISTRY.md blob =
9623d8d03b4c900708d43cc2e59bf606a378d505
```

This exactly matched the prior P1-231/S1-C baseline, so no Change Impact rewrite was required. PR #199/S1-C was still the canonical tip.

The S1-D branch was confirmed to be an isolated descendant of that exact baseline:

```text
branch = research/p1-231-s1d-migration-rehearsal-2026-09-10
merge-base(main, branch) = 7849567f83f130d72141342eca4c71ba6d8229f7
behind = 0
```

No new P-code was allocated.

## 2. Durable source/model proof identity

The exact committed research source/model head used for the first PR proof was:

```text
PR = #200
PR head = f456fdb07f799c703079f756c7a41d602e33e1ac
PR base = 7849567f83f130d72141342eca4c71ba6d8229f7
synthetic merge SHA = edf68f712acb32845ff5fb66b2a8cfe3f3df11ed
```

GitHub Actions identity:

```text
workflow = .github/workflows/repository-integrity.yml
workflow run = 34464537213
attempt = 1
job = 102829898628
job name = repository-integrity
conclusion = success
```

The full decoded job log was fetched from the exact job log endpoint. The log, not step metadata alone, showed the checkout command and detached HEAD:

```text
fetch ... +edf68f712acb32845ff5fb66b2a8cfe3f3df11ed:refs/remotes/pull/200/merge
checkout --force refs/remotes/pull/200/merge
HEAD is now at edf68f7 Merge f456fdb07f799c703079f756c7a41d602e33e1ac into 7849567f83f130d72141342eca4c71ba6d8229f7
git log -1 --format=%H
edf68f712acb32845ff5fb66b2a8cfe3f3df11ed
```

Therefore the committed-source execution candidate for PR CI was the exact synthetic merge SHA, not the PR head SHA.

## 3. Exact durable source/model blobs

At the proven source/model head:

```text
project_docs/RESEARCH_P1_231_S1D_MIGRATION_REHEARSAL_SOURCE_SPEC_2026-09-10_EVIDENCE.md
  blob = 4e387718ed85a86bab564f9a5521f13d83848218

project_tools/test_p1_231_s1d_migration_rehearsal_source_spec_model.js
  blob = 4acc0a012fb5bbddcd1b81f2c877d923ace9ef3b
```

No production/runtime file, `manifest.json`, readiness file, receipt namespace, permanent workflow, tag, Release, or deployment input was changed.

## 4. S1-D deterministic proof

The decoded log contains the exact S1-D PASS line:

```text
P1-231 S1-D migration rehearsal source-spec model: PASS; cases=73;
schema=webclip-shadow-migration-rehearsal/v1;
matrix=M01-M22; cross_cases=C01-C14;
current_state=shadow-observed;
current_identity=candidate-ineligible;
current_settlement=candidate-ineligible;
current_equivalence=candidate-ineligible;
namespace_before_short_circuit=true;
candidate_ineligible_not_missing=true;
latest_attempt_ordering=true;
append_only=true;
main_movement=fail-closed;
workflow_binding=fail-closed;
metadata_drift=fail-closed;
rollback=v1-only;
v1_authority=unchanged;
v1_blockers=5;
s2_authorized=false;
release_authorized=false;
product_zip=false;
rpf=sha256:1a9551f839b70410c834ba0f040b9c285de58965771a927cef2d95700c86e792;
bcf=sha256:9eebcc834fa32bd8fe5f03ef14564f0fc1c169d0308dcc2813941b4f913363ff;
head=edf68f712acb32845ff5fb66b2a8cfe3f3df11ed
```

The integrated matrix covers all required primary scenarios M01..M22 and explicit compositions C01..C14. It confirms in particular:

```text
candidate-ineligible != evidence-missing
receipt namespace corruption remains structural before eligibility short-circuit
latest valid attempt wins; old PASS cannot resurrect itself
receipt history remains append-only
non-ancestor evidence cannot settle a candidate
stale candidateAdmission / S1-A / S1-B reports cannot cross generations
workflow ref/SHA mismatch fails closed
PR synthetic merge cannot be replaced by PR head
main movement between evidence and decision fails closed
RPF drift invalidates stale settlement/equivalence
BCF drift requires a fresh builder-equivalence proof
same extracted RPF cannot hide physical archive metadata/raw-byte drift
all-green S1 remains non-authoritative and cannot authorize S2/release
rollback target is untouched V1 semantics
```

## 5. Predecessor proof retained

The same decoded run also re-executed the canonical predecessors on the exact synthetic merge SHA, including:

```text
S0-D PASS; cases=440
S0-E PASS; cases=201
S0-F PASS; cases=224; current_gate=blocked-portability
S0-G PASS; cases=128; current_real_settlement=blocked
S0-H PASS; cases=80; current_product_build=blocked-before-load; product_zip=false
S0-I PASS; cases=161; synthetic_merge_identity=required
S1-A PASS; cases=75; current_eligible=false
S1-B PASS; cases=71; current_outcome=candidate-ineligible
S1-C PASS; cases=67; current_state=candidate-ineligible; current_product_load=false
S1-D PASS; cases=73
```

Repository-wide deterministic result:

```text
Executed 106 deterministic test files; failures=0.
Recovery archive self-test PASS
```

Repository consistency, repository hygiene, research terminology, context/bootstrap, CI pinning, PR change contract, release readiness checker self-test, and JavaScript syntax all passed in the same job.

## 6. V1 rollback proof

The exact untouched rollback/control-plane anchors tested by S1-D were:

```text
project_docs/RELEASE_READINESS.md
  165766b248ffa48fc88f0140283adf0e855df22f
project_tools/check_release_readiness.py
  d3569428a3ea4e5d90be24426fd09c233c75b882
.github/workflows/release-gate.yml
  f6813f364d39932fb32a1cc2d527d2d7a489ed02
.github/workflows/repository-integrity.yml
  a8b24780df4c18ee3f85ec2bc51925be3a40541c
```

The real V1 checker in the decoded log remained:

```text
BLOCKER: target_version 0.9.9 != manifest version 0.9.8
BLOCKER: unpacked_chrome_qa=pending; requires pass
BLOCKER: yandex_e2e=pending; requires pass
BLOCKER: release_blockers_review=pending; requires pass
BLOCKER: explicit_release_decision=pending; requires approved
Release readiness NOT READY: 5 blocker(s).
```

Thus rehearsal failure/abort has one unambiguous authority rollback target: `v1-only`. S1-D history may remain diagnostic evidence but cannot replace V1 readiness/gate authority.

## 7. Evidence handling

No temporary workflow was created for S1-D. The ordinary pinned Repository Integrity PR workflow supplied exact committed-source evidence and its full decoded log was available.

Therefore:

```text
temporary workflow = none
artifact fallback = not required
raw Actions log committed = false
product ZIP = false
real Chrome release QA = not run
real Yandex L5 = not run
release decision = not made
S2 activation = false
```

## 8. Canonicalization boundary

This receipt records the source/model proof run above. Adding this durable receipt changes the PR head and synthetic merge SHA, so the final PR head must receive a fresh Repository Integrity run before merge. Immediately before merge, `main`, Registry, exact PR head, changed-file set, synthetic merge SHA, mergeability, and fresh CI must be re-read. After squash merge, Repository Integrity must pass again on the exact resulting canonical `main` SHA.

Only after those guards succeed may S1-D be called canonical/research-complete.

Even then, S1 completion is only a research milestone. The next DAG node S2-A remains behind the separate hard fence:

```text
EXPLICIT_USER_APPROVAL_FOR_RELEASE_POLICY_ACTIVATION
```

This research authorization does not satisfy that fence.
