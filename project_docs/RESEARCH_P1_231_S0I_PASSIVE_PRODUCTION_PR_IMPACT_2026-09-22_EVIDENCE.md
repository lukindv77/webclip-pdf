# P1-231 S0-I passive production PR-impact authority — 2026-09-22

Status: **PASSIVE PRODUCTION CLASSIFIER IMPLEMENTED / CHECKER AND SHADOW ACTIVATION PENDING**

Owner:

`P1-231 | ACTIVE`

Canonical baseline:

`9d7835da77bd41da0c82e581bf396ffcc83f352c`

Baseline post-merge Repository Integrity:

- run #1009
- run id `35679076981`
- exact main: `9d7835da77bd41da0c82e581bf396ffcc83f352c`
- conclusion: **SUCCESS**
- both permanent jobs: **SUCCESS**

Manifest remains `0.9.8`.
Release readiness remains **NOT READY**.

## Purpose

This tranche promotes P1-231 S0-I from research-only PR-impact modeling to a passive production classifier library.

New production surfaces:

- `project_tools/release_pr_impact.js`
- `project_tools/test_release_pr_impact.js`

The tranche deliberately does **not** modify:

- `project_tools/check_pr_change_contract.py`;
- `.github/workflows/repository-integrity.yml`;
- release readiness or release gate policy.

That preserves the bootstrap trust boundary: the first production introduction of S0-I cannot self-authorize by changing the same checker/workflow that would evaluate it.

## Authority scope

S0-I answers only:

> For one exact PR synthetic merge candidate, which S0-A package and S0-B source-generation surfaces are affected by the exact base -> candidate integration delta?

S0-I does not compute or redefine:

- package membership;
- source-generation relations;
- RPF/QCF/RCF/BCF;
- S0-F candidate admission;
- S0-G evidence settlement;
- ZIP/artifact bytes;
- readiness or release decisions.

Explicit result flags remain:

- `policy_mutation=false`
- `identity_computation=false`
- `candidate_generation_verified=false`
- `release_authorized=false`

## Exact PR identity

Production `classifyPrImpact()` requires three exact 40-hex commit identities:

- `baseSha`
- `prHeadSha`
- `candidateSha`

All three must be distinct exact commits.

The candidate must be a two-parent merge commit whose parent set binds the exact base and exact PR head. A branch head cannot substitute for the synthetic merge candidate.

Moving refs such as `main` or `HEAD` are rejected by the low-level interface.

## Exact diff

The Git adapter classifies:

`git diff --name-status -z --no-renames <baseSha> <candidateSha>`

Accepted statuses are only:

- `A`
- `M`
- `D`
- `T`

Rename/copy or unknown statuses fail closed at the normalized S0-I boundary.

Changed repository paths are bounded, validated and unique.

## Base + candidate authority union

S0-I reads the exact authority manifest blobs from **both** base and candidate commits and passes the bytes through the existing production parsers:

- S0-A `release_package_authority.js`
- S0-B `release_source_generation_authority.js`

It does not copy their manifest parsers or package/relation lists.

Package impact uses:

`base package members UNION candidate package members`

Generation role impact uses:

`base relations UNION candidate relations`

This prevents candidate-only evasion when a PR removes a package member or source-generation relation while changing/deleting the same old path.

Both authority views must independently satisfy current S0-A/S0-B bounds. In particular, the production S0-B v1 manifest requires at least one valid relation; deleting the only relation does not become a classified "valid empty view" — it fails closed as an invalid S0-B candidate authority.

## Semantic vs representation change

Raw changes to:

- `release_package_manifest_v1.json`
- `release_source_generation_v1.json`

are recorded as authority-source touches.

But semantic change is decided from the canonical predecessor topology digests.

Therefore formatting/key-order changes that parse to the same S0-A/S0-B semantics do not falsely become package/source-generation topology changes.

## Generation role classification

The production classifier derives input/generator/output role indexes only from valid S0-B relations.

For the current `public-suffix-js` relation:

- `public_suffix_list.dat` -> generation input;
- `project_tools/build_public_suffix_js.py` -> generator;
- `public-suffix.js` -> generated output.

Unrelated names such as another `build_*.py` are not inferred as generation impact.

Affected relation ids and reasons are canonical sorted unique values.

## Current production control-plane paths

S0-I records S0-A/S0-B implementation impact for:

- `project_tools/release_package_authority.js`
- `project_tools/release_source_generation_authority.js`

It records PR-checker/control-plane impact for:

- `project_tools/release_pr_impact.js`
- `project_tools/check_pr_change_contract.py`
- `.github/workflows/repository-integrity.yml`

If any of these self-trust surfaces changes:

- `trustedControlPlaneReview=true`
- `automaticClassificationTrusted=false`

Candidate code therefore cannot make its own control-plane change and simultaneously claim automatic trusted classification.

This is a trust-state fact, not a claim that the change is malicious.

### S1-A bootstrap extension

The later S1-A passive-production tranche extends the PR-checker/control-plane trust set to the production S1 identity/admission dependencies:

- `project_tools/release_contract_authority.js`
- `project_tools/release_builder_contract_authority.js`
- `project_tools/release_identity.js`
- `project_tools/release_candidate_generation.js`
- `project_tools/release_pr_impact.js`
- `project_tools/release_shadow_identity.js`
- `project_tools/check_pr_change_contract.py`
- `.github/workflows/repository-integrity.yml`

This extension is intentionally landed before permanent S1-A workflow activation. Once in canonical base, a later PR cannot rewrite S0-C/D/E/F/S1-A shadow trust code and have candidate-controlled S0-I classify that same change as automatically trusted.

## Derived requirement flags

`candidateGenerationVerification=true` when package/source-generation semantics, generation closure or S0-A/S0-B implementation may affect candidate generation.

`shadowIdentityRecompute=true` when candidate-generation or PR-checker/control-plane impact requires later S1-A shadow recomputation.

`trustedControlPlaneReview=true` when the PR touches authority implementation or checker/workflow trust surfaces.

S0-I does not perform any of those downstream actions itself.

## Deterministic production witness

`test_release_pr_impact.js` covers:

- exact SHA validation;
- A/M/D/T normalization;
- duplicate/invalid path rejection;
- package add/remove union behavior;
- non-package root JS negative control;
- explicit generation input/generator/output roles;
- relation add/remove with both S0-B views remaining valid;
- formatting-only authority source changes;
- actual production control-plane filenames;
- forbidden identity/admission/release fields;
- a real temporary Git repository with exact base/head/two-parent merge candidate;
- actual `git diff --name-status -z --no-renames`;
- exact authority blob parsing through S0-A/S0-B;
- branch-head substitution rejection;
- moving-ref rejection;
- exact formatting-only semantic equality;
- exact self-change -> untrusted classification.

The witness also keeps the current production checker/workflow unchanged and verifies that the historical S0-I source-spec markers remain available as predecessor research evidence.

## Identity and product impact

No extension package member changes.

No S0-C full-RCF input changes.

No S0-D builder-contract change.

Expected current identities therefore remain:

- RPF: `sha256:feab25126c9d686062f8ed0da8c9d7ad39f468ebc819342bb34fbd2c47e0e843`
- Chrome QCF: `sha256:3715a3453333d3d679a1c1c00a0bab6a02b77c0153f1a4e8d138aa1e8f5a984c`
- Yandex QCF: `sha256:8d6c9711b4f71b8485b49a6ab68f90bcf62bc74155ae0959dbdc4718648879a1`
- full RCF: `sha256:cb34076d37c8dbe99392fac120fb21b03d192e4b53bc7a40650b5cd277311ffb`
- BCF: `sha256:9eebcc834fa32bd8fe5f03ef14564f0fc1c169d0308dcc2813941b4f913363ff`

No current 34-member product ZIP is built.

## S0 completion boundary

After this tranche is merged and post-merge Repository Integrity is green, passive production implementations exist for all nine S0 foundation nodes:

- S0-A package authority
- S0-B source generation
- S0-C contract inputs
- S0-D builder contract
- S0-E identity engine
- S0-F candidate admission
- S0-G evidence settlement
- S0-H passive builder/verifier
- S0-I PR-impact classifier

This does **not** mean release readiness is achieved.

## Next bounded step

The next canonical layer is S1 shadow operation.

The first bounded production step is S1-A shadow identity, respecting the reconciled dual-checkout contract:

- primary pull-request workspace remains exact PR head for existing delivery verification;
- a separate exact workspace materializes the GitHub synthetic merge SHA;
- S1-A consumes S0-E, S0-F and S0-I;
- self-changing control-plane context fails closed;
- no readiness, receipt or artifact mutation occurs.

Permanent workflow migration must preserve the S0-I bootstrap trust boundary and remain shadow-only until S1-D migration evidence exists. S2 remains behind explicit user approval.

## Explicit non-actions

No current checker behavior change, permanent S1 shadow workflow step, product ZIP/build, artifact receipt, readiness mutation, version bump, release-gate execution, tag, deployment, GitHub Release, Chrome qualification, Yandex OAuth/API mutation, S1/S2 release activation or release decision is performed.
