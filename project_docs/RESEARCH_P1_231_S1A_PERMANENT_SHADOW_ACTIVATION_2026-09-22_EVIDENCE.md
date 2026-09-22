# P1-231 S1-A permanent shadow workflow activation — 2026-09-22

Status: **PERMANENT READ-ONLY S1-A LANE IMPLEMENTED / RELEASE AUTHORITY UNCHANGED**

Owner:

\`P1-231 | ACTIVE\`

Canonical baseline:

\`091309b2e8959020d7137ef45d22d7e32f0fa284\`

Baseline post-merge Repository Integrity:

- run #1015
- run id \`35681870361\`
- exact main: \`091309b2e8959020d7137ef45d22d7e32f0fa284\`
- conclusion: **SUCCESS**
- both pre-activation permanent jobs: **SUCCESS**

Manifest remains \`0.9.8\`.
Release readiness remains **NOT READY**.

## Purpose

This bounded tranche activates the already-reconciled S1-A shadow identity as a third permanent read-only Repository Integrity job.

It does not activate S1-B/S1-C/S1-D and does not turn S1-A into a release gate.

## Preserved delivery jobs

The existing \`repository-integrity\` and \`p1-231-source-generation-authority\` jobs keep literal PR-head delivery checkout on pull requests.

The generic job remains on CPython 3.12.14.

The S0-B/S0-F/S0-G delivery job remains on CPython 3.12.10.

Neither existing job is converted to synthetic-merge authority.

## New S1-A job

The new permanent job is:

\`p1-231-shadow-identity\`

It runs only for \`push\` and \`pull_request\`. \`workflow_dispatch\` skips S1-A because there is no canonical push/PR candidate context.

The job is read-only and uses a separate checkout/workspace.

### Pull request

The exact S1-A candidate is \`github.sha\`, the synthetic merge candidate for the pull_request run.

The job requires:

- checkout \`ref: ${{ github.sha }}\`;
- \`git rev-parse HEAD == github.sha\`;
- base SHA = \`github.event.pull_request.base.sha\`;
- PR-head SHA = \`github.event.pull_request.head.sha\`;
- candidate SHA = \`github.sha\`.

S0-I then verifies that the candidate is a two-parent merge of the exact base and PR head.

### Push to main

The exact S1-A candidate is the exact pushed \`github.sha\`.

The push path has no PR base/head context.

## Runtime profile

S1-A invokes S0-F, which invokes S0-B generation verification.

Therefore the permanent S1-A job uses:

- CPython 3.12.10;
- Node 22.23.2.

The generic Repository Integrity job remains on CPython 3.12.14.

## Result invariants

The workflow invokes \`project_tools/release_shadow_identity.js\` and independently checks its passive result envelope.

Always required:

- schema \`webclip-shadow-identity/v1\`;
- exact candidate SHA;
- \`generation_gate=pass\`;
- \`policy_mutation=false\`;
- \`receipt_mutation=false\`;
- \`evidence_settlement=false\`;
- \`artifact_build=false\`;
- \`release_authorized=false\`.

For push main:

- \`eligible=true\`;
- \`shadow_outcome=eligible\`;
- \`trustedControlPlaneReview=false\`;
- \`automaticClassificationTrusted=true\`.

For pull requests:

- exact base/head/candidate provenance is required;
- an ordinary automatically trusted PR may report \`eligible\`;
- a protected control-plane PR must report:
  - \`eligible=false\`;
  - \`shadow_outcome=control-plane-review-required\`;
  - \`trustedControlPlaneReview=true\`;
  - \`automaticClassificationTrusted=false\`.

Any other trust pair remains structural failure.

## Activation-PR expectation

This tranche itself changes \`.github/workflows/repository-integrity.yml\` and \`project_tools/check_ci_pins.py\`, both protected S0-I control-plane paths.

Therefore exact-head PR S1-A is expected to succeed computationally while reporting:

- \`control-plane-review-required\`;
- \`eligible=false\`;
- \`release_authorized=false\`.

That is not self-approval. Expected-head squash merge still requires the existing external workflow discipline.

## Post-merge expectation

After expected-head merge, the push run on literal new \`main\` is expected to report:

- \`eligible=true\`;
- \`shadow_outcome=eligible\`;
- \`release_authorized=false\`.

This establishes passive shadow execution only.

## CI pin checker hardening

\`project_tools/check_ci_pins.py\` separately validates:

- existing delivery PR-head checkout markers;
- S0-B delivery lane;
- S1-A synthetic-merge lane.

For S1-A it requires:

- named job;
- push/PR-only condition;
- Ubuntu 24.04;
- immutable action pins;
- \`fetch-depth: 0\`;
- exact \`ref: ${{ github.sha }}\`;
- exact checkout verification;
- CPython 3.12.10;
- Node 22.23.2;
- exact PR base/head expressions;
- production S1-A invocation;
- control-plane-review invariant;
- \`release_authorized=false\` invariant;
- absence of \`continue-on-error\`.

It explicitly rejects the delivery PR-head checkout expression inside S1-A.

## Release boundary

S1-A remains observational.

This tranche does not write/settle receipts, reinterpret missing S0-G evidence as PASS, build the current WebClip ZIP, activate S1-B/S1-C/S1-D, mutate readiness, run the release gate, bump version, tag/deploy, publish a GitHub Release, perform physical Chrome/Yandex qualification, or authorize S2/release.

P1-231 remains **ACTIVE**.

## Exact-head discovery history

Intermediate exact-head runs are retained only as discovery evidence:

- #1016 / head `869e4ee9d5f05a634a76a5215acd6d774cd104f7` failed before S1-A evaluation because the workflow accidentally contained literal backslashes before GitHub expressions; the pin checker independently rejected the same malformed markers.
- #1017 / head `b1e1fc761d7b8fc398370f1c05839a7dfde84065` proved the actual S1-A synthetic-merge execution path: candidate `3b26455b90faab8be7ae8d23776316ec7fb78e21` completed with `shadow_outcome=control-plane-review-required`, `eligible=false`, and `release_authorized=false`. The run remained non-mergeable because one negative pin self-test did not remove both CLI invocations.
- #1018 / head `0e3c0f8cbcc8c5e692765f65978c1380693023a8` passed both the S0-B/F/G delivery job and the S1-A synthetic-merge job, including the corrected pin self-tests. The primary deterministic suite then exposed two expected stale bootstrap controls: the S1-D workflow rollback blob anchor and the production S1-A witness still asserted that permanent workflow activation was absent.

Those stale controls are reconciled in the same tranche. None of #1016/#1017/#1018 is reused as final merge authority for a later head.

## Acceptance

Before merge:

- exact-head Repository Integrity SUCCESS;
- all three permanent jobs SUCCESS;
- exact-head S1-A reports valid control-plane review-required state;
- fresh TOCTOU confirms unchanged head/base/scope and no conflicting PR/Issue.

After merge:

- literal new \`main\` confirmed;
- separate post-merge Repository Integrity SUCCESS;
- all three permanent jobs SUCCESS;
- S1-A push reports ordinary \`eligible\`, still with \`release_authorized=false\`.

Only then is permanent S1-A activation integrated.
