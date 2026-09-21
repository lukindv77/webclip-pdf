# P1-231 S0-B profile-specific Repository Integrity integration — 2026-09-21

Status: **PERMANENT READ-ONLY S0-B CI LANE IMPLEMENTED / S1 SHADOW NOT ACTIVATED**

Owner:

`P1-231 | ACTIVE`

Canonical baseline:

`178cd75b8b33f7f9ea6e37030e82cf2f245c5b0c`

Baseline post-merge Repository Integrity:

- run #987
- run id `35587806554`
- exact main: `178cd75b8b33f7f9ea6e37030e82cf2f245c5b0c`
- conclusion: **SUCCESS**

Manifest remains `0.9.8`.

Release readiness remains **NOT READY**.

## Purpose

The previous tranche installed the passive production S0-B source-generation authority but deliberately did not invoke it in permanent CI because Repository Integrity's general tooling profile is CPython 3.12.14 while S0-B's cross-platform authority is `cpython-3.12.10-v1`.

This tranche resolves that execution-profile separation explicitly.

## Permanent Repository Integrity shape

The existing `repository-integrity` job remains unchanged in authority:

- exact delivery checkout;
- pull requests use the literal PR head;
- push uses the exact pushed SHA;
- generic Python remains CPython 3.12.14;
- Node remains 22.23.2;
- repository/research/readiness/deterministic tests remain in that job.

A second permanent job is added:

`p1-231-source-generation-authority`

It is deliberately narrow and read-only.

The job:

1. runs on `ubuntu-24.04`;
2. checks out the same exact delivery SHA as the primary job;
3. verifies `git rev-parse HEAD == EXPECTED_SHA`;
4. installs exact CPython `3.12.10`;
5. installs exact Node `22.23.2`;
6. invokes:
   `node project_tools/release_source_generation_authority.js --candidate "$EXPECTED_SHA"`;
7. fails closed on any manifest, Git-object, runtime-profile, generation or byte mismatch.

It does not run under `continue-on-error`.

## Why the lane evaluates the delivery SHA

This tranche remains S0-B, not S1-A.

For pull-request delivery, permanent Repository Integrity intentionally verifies the literal PR head. That current hardened contract remains unchanged.

The future S1-A shadow candidate is still the GitHub synthetic merge SHA in a separate shadow workspace. This tranche does not create that workspace and does not relabel the PR head as the S1 shadow candidate.

Therefore:

- S0-B permanent delivery lane -> exact delivery SHA;
- future S1-A shadow lane -> separate exact synthetic-merge SHA.

The two identities remain distinct by design.

## Pin-policy hardening

`project_tools/check_ci_pins.py` now models the dual Python profile explicitly.

Generic permanent tooling authority remains:

- CPython `3.12.14`;
- Node `22.23.2`.

S0-B-specific authority is:

- CPython `3.12.10`;
- allowed only inside `.github/workflows/repository-integrity.yml`;
- required exactly once in the named S0-B authority job.

The checker also requires the S0-B job to contain:

- immutable checkout action usage;
- `fetch-depth: 0`;
- the canonical exact delivery-ref expression;
- exact checkout verification;
- the exact 3.12.10 profile;
- exact Node 22.23.2;
- the production source-generation verifier invocation.

A `continue-on-error` escape is forbidden.

Deterministic checker self-tests cover:

- valid S0-B lane;
- missing S0-B Python profile;
- missing exact checkout ref;
- missing production verifier invocation;
- valid dual-profile Repository Integrity;
- forbidden use of CPython 3.12.10 in another permanent workflow.

## Security/release boundary

Workflow permissions remain:

`contents: read`

No secrets, write permission, `pull_request_target`, mutating GitHub API call, package build, receipt mutation or release decision is introduced.

The S0-B output remains passive generation verification only:

- no readiness mutation;
- no release evidence receipt;
- no product ZIP;
- no tag/Release/deployment;
- no Chrome/Yandex qualification;
- no S2 policy activation.

## Identity impact

No extension package/runtime bytes change.

Current identity axes remain:

- RPF: `sha256:feab25126c9d686062f8ed0da8c9d7ad39f468ebc819342bb34fbd2c47e0e843`
- Chrome QCF: `sha256:3715a3453333d3d679a1c1c00a0bab6a02b77c0153f1a4e8d138aa1e8f5a984c`
- Yandex QCF: `sha256:8d6c9711b4f71b8485b49a6ab68f90bcf62bc74155ae0959dbdc4718648879a1`
- full RCF: `sha256:cb34076d37c8dbe99392fac120fb21b03d192e4b53bc7a40650b5cd277311ffb`
- BCF: `sha256:9eebcc834fa32bd8fe5f03ef14564f0fc1c169d0308dcc2813941b4f913363ff`

P1-231 remains **ACTIVE**.

## Next bounded step

After this profile-specific lane is merged and its post-merge Repository Integrity is green, the next P1-231 implementation question is whether the remaining passive S0 predecessors required by S1-A are production-executable under current canonical authority.

Permanent S1-A shadow activation must not be installed until those predecessor boundaries are current and the dual-checkout synthetic-merge workspace remains fail-closed.

## Explicit non-actions

No product build/ZIP, version bump, release-gate execution, tag, deployment, GitHub Release, Chrome qualification, Yandex OAuth/API mutation, S2 authorization or release decision is performed.
