# P1-231 S0-I current-authority reconciliation — 2026-09-21

Status: **CURRENT S0-I AUTHORITY RECONCILED / S1-SHADOW ACTIVATION STILL PENDING**

## Baseline

Canonical baseline:

`ad7e72fefe8955904ee15ed122077fd2becf57fa`

Post-merge Repository Integrity on that exact main:

- run #967
- run id `35571732674`
- result: **SUCCESS**

Owner:

`P1-231 | ACTIVE`

Manifest remains `0.9.8`.

Release readiness remains **NOT READY**.

## Discovered stale executable projection

After the generator/full-RCF reconciliation, the executable S0-I PR-impact source-spec model still carried two historical current-state literals from its 2026-09-10 research baseline:

- package fixture count: 33, omitting the now-canonical package member `application-generation.js`;
- current S0-F diagnostic: `blocked-portability`.

Those statements were no longer current authority. Canonical S0-A now has 34 package members, and canonical S0-F passes candidate-generation admission after the PSL portability and full-RCF generator binding tranches.

The historical source-spec document remains valid as dated research evidence for its original baseline. This tranche updates the executable current model rather than rewriting that history.

## Reconciliation

S0-I now:

- includes `application-generation.js` in its current package fixture;
- requires exactly 34 current package files;
- executes S0-A as a predecessor and requires its current `package_files=34` truth;
- executes S0-F as a predecessor and requires `current_gate=pass`;
- reports `current_s0f_gate=pass`;
- retains S0-I's narrow authority: PR impact classification only;
- does not copy RPF/QCF/RCF/BCF, admission, readiness, artifact, tag, release or deployment authority into the S0-I result;
- leaves the production PR checker and Repository Integrity workflow unchanged.

S1-A still consumes S0-I only as a predecessor. Its predecessor fence now requires S0-I to report the current 34-file package truth and S0-F pass state in addition to the existing synthetic-merge identity requirement.

## Identity impact

This tranche does not change extension package/runtime bytes or any canonical identity input.

Expected current identity axes therefore remain:

- RPF: `sha256:feab25126c9d686062f8ed0da8c9d7ad39f468ebc819342bb34fbd2c47e0e843`
- Chrome QCF: `sha256:3715a3453333d3d679a1c1c00a0bab6a02b77c0153f1a4e8d138aa1e8f5a984c`
- Yandex QCF: `sha256:8d6c9711b4f71b8485b49a6ab68f90bcf62bc74155ae0959dbdc4718648879a1`
- full RCF: `sha256:cb34076d37c8dbe99392fac120fb21b03d192e4b53bc7a40650b5cd277311ffb`
- BCF: `sha256:9eebcc834fa32bd8fe5f03ef14564f0fc1c169d0308dcc2813941b4f913363ff`

The historical 33-file RPF remains only a legacy incomplete control.

## Remaining boundary

This reconciliation does not install permanent S1 shadow identity/settlement/builder-equivalence steps and does not mutate canonical release policy.

The current DAG still requires:

`S0/S1 passive/shadow implementation -> explicit APPROVAL -> S2`

No S2 action is authorized by this tranche.

Physical unpacked-Chrome/Yandex qualification, current governance receipts, blocker review and explicit release decision remain absent and cannot be inferred from deterministic reconciliation.

## Explicit non-actions

No product ZIP/build, release-gate execution, version bump, tag, deployment, GitHub Release, Chrome qualification, Yandex OAuth/API mutation or release decision is performed.
