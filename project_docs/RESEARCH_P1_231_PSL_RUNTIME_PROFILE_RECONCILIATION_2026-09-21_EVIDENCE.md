# P1-231 PSL runtime-profile reconciliation — 2026-09-21

Status: **CURRENT CI COMPATIBILITY PROVEN / CROSS-PLATFORM AUTHORITY REMAINS CPYTHON 3.12.10**

Owner:

`P1-231 | ACTIVE`

Canonical baseline before this tranche:

`1cc668bdd1fdaa9fab7622064b7fddf042ae91be`

Baseline Repository Integrity:

- run #970
- run id `35574848013`
- result: **SUCCESS**

Manifest remains `0.9.8`.

Release readiness remains **NOT READY**.

## Why this tranche was required

Current canonical Repository Integrity pins generic project tooling to CPython `3.12.14`.

The existing S0-B source-generation authority, however, deliberately uses the cross-platform runtime profile:

`cpython-3.12.10-v1`

That profile had already been physically proven on Linux and Windows for the exact corrected generator/input/output roots.

Before a future passive production S0-B verifier is installed, the project needed to answer a narrower question:

> does the corrected PSL generator still reproduce the exact committed bytes under the newer generic Linux CI runtime, and should S0-B cross-platform authority itself move to exact 3.12.14?

## External platform fact

Fresh Python.org and actions/setup-python documentation were checked.

Python 3.12 entered security-fixes-only status after 3.12.10. Security-only 3.12 releases are source-only; Python 3.12.10 was the last 3.12 release with binary installers.

Relevant sources:

- https://blog.python.org/2026/08/python-31214-31116-31021/
- https://www.python.org/downloads/release/python-31213/
- https://github.com/actions/setup-python/blob/main/docs/advanced-usage.md

`actions/setup-python` documents that Windows downloadable CPython versions depend on Windows installer distributions. Therefore hosted Windows runners cannot materialize CPython 3.12.14 through the normal exact-version setup path because no such Windows installer exists.

This is a platform/distribution constraint, not a WebClip generator failure.

## Negative physical controls

Temporary PR #314 first attempted exact CPython 3.12.14 on both Ubuntu and Windows.

On `windows-2025`, setup failed before the generator ran:

`The version '3.12.14' with architecture 'x64' was not found for Windows 2025.`

The same result was reproduced on `windows-2022`.

These failed setup attempts are not generator FAIL results. They are evidence that the requested Windows runtime distribution does not exist in the selected hosted-runner/setup-python model.

## Reconciled physical matrix

Temporary evidence workflow:

`P1-231 PSL Python 3.12.14 portability evidence`

Successful run:

- run #4
- run id `35577180521`
- exact evidence head: `31570e4a527c0f24c659f52e21be61a3bba68e25`
- result: **SUCCESS**

The temporary workflow was removed before the final mergeable head.

### Ubuntu compatibility observation

Job:

`106261546984`

Runner:

`ubuntu-24.04`

Runtime:

`CPython 3.12.14`

Exact result:

- candidate SHA: `31570e4a527c0f24c659f52e21be61a3bba68e25`
- generator Git OID: `79b279fdc90dce39acb671d294dd814357dce380`
- input Git OID: `7658ddd3081291afbb4090c1caa136707ff71d25`
- committed output Git OID: `541a0833e4731e3513d327208904661cc3d3e990`
- generated SHA-256: `72aea4d8a8505ad90d9070bca539dff7d49391f034d0dd41f76d64867efc0b26`
- committed SHA-256: same
- byte length: `167388`
- exact byte match: `true`
- CRLF count: `0`

Therefore current generic Repository Integrity's CPython 3.12.14 runtime is compatible with the exact corrected PSL generator bytes on Linux.

### Windows cross-platform authority observation

Job:

`106261546668`

Runner:

`windows-2025`

Runtime:

`CPython 3.12.10`

Exact result:

- candidate SHA: `31570e4a527c0f24c659f52e21be61a3bba68e25`
- generator Git OID: `79b279fdc90dce39acb671d294dd814357dce380`
- input Git OID: `7658ddd3081291afbb4090c1caa136707ff71d25`
- committed output Git OID: `541a0833e4731e3513d327208904661cc3d3e990`
- generated SHA-256: `72aea4d8a8505ad90d9070bca539dff7d49391f034d0dd41f76d64867efc0b26`
- committed SHA-256: same
- byte length: `167388`
- exact byte match: `true`
- Windows line separator: CRLF
- generated/committed CRLF count: `0`

This independently re-confirms the canonical `cpython-3.12.10-v1` cross-platform portability authority.

## Authority decision

This tranche does **not** change the S0-B runtime profile to `cpython-3.12.14`.

Reason:

- exact 3.12.14 is available and proven on current Linux CI;
- no official Windows 3.12.14 installer distribution exists;
- the canonical 3.12.10 profile is the last 3.12 patch with official Windows binary installers;
- 3.12.10 already has exact Linux/Windows byte-equality proof;
- changing the cross-platform authority to an impossible hosted-Windows exact patch would make the contract unexecutable rather than stronger.

The correct separation is:

- Repository Integrity generic tooling runtime: currently CPython 3.12.14;
- S0-B cross-platform source-generation authority: `cpython-3.12.10-v1`;
- compatibility evidence: exact current generator also reproduces the committed bytes under Linux CPython 3.12.14.

A future permanent S0-B verifier must therefore invoke the explicit S0-B runtime profile rather than silently inheriting whatever Python patch the general Repository Integrity job uses.

## Tooling refinement

`project_tools/check_p1_231_psl_portability.py` no longer hard-codes one Python patch. The witness requires an explicit:

`--expected-python X.Y.Z`

and fails if the actual CPython version differs.

This keeps physical evidence exact while allowing the same witness to verify:

- the canonical cross-platform 3.12.10 profile; and
- separately identified compatibility profiles such as current Linux 3.12.14.

It does not make `python-any` valid authority.

## Release impact

No extension package/runtime bytes changed.

Canonical identity axes remain unchanged:

- RPF: `sha256:feab25126c9d686062f8ed0da8c9d7ad39f468ebc819342bb34fbd2c47e0e843`
- Chrome QCF: `sha256:3715a3453333d3d679a1c1c00a0bab6a02b77c0153f1a4e8d138aa1e8f5a984c`
- Yandex QCF: `sha256:8d6c9711b4f71b8485b49a6ab68f90bcf62bc74155ae0959dbdc4718648879a1`
- full RCF: `sha256:cb34076d37c8dbe99392fac120fb21b03d192e4b53bc7a40650b5cd277311ffb`
- BCF: `sha256:9eebcc834fa32bd8fe5f03ef14564f0fc1c169d0308dcc2813941b4f913363ff`

P1-231 remains **ACTIVE**.

This tranche does not create physical Chrome/Yandex qualification, blocker-review authority, release-decision authority, product build permission, S2 approval or release readiness.

## Next bounded step

After this tranche is integrated, the passive S0-B production verifier can be designed to use the explicit canonical `cpython-3.12.10-v1` profile independently from the Repository Integrity job's general-purpose Python runtime.

That implementation must remain read-only and release-neutral until the later S1/S2 activation sequence.

## Explicit non-actions

No product ZIP/build, version bump, release-gate execution, tag, deployment, GitHub Release, Chrome qualification, Yandex OAuth/API mutation, S2 authorization or release decision was performed.
