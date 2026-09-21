# P1-231 generator / full-RCF authority binding — 2026-09-21

Status: **RECONCILIATION IN PROGRESS**

## Scope

This bounded tranche promotes the already-researched executable-generator governance requirement into current P1-231 full-RCF authority.

Canonical baseline at tranche start:

`4550964a9973fcd0ccca04f61387aa613c687662`

Integration PR:

`#312`

Owner:

`P1-231 | ACTIVE`

## Authority change

The current full-RCF blob-root set is changed from ten roots to eleven roots by adding exactly:

`project_tools/build_public_suffix_js.py`

The generator remains outside the extension package. No extension package member, generated `public-suffix.js` byte, Chrome/Yandex QA projection, or builder contract is changed by this authority operation.

The corrected generator's cross-platform portability was already physically established by the exact Linux/Windows evidence recorded in:

`RESEARCH_P1_231_S0B_PSL_PORTABILITY_REPROOF_2026-09-21_EVIDENCE.md`

This tranche does not repeat or replace that physical proof.

## Identity consequences

Expected invariant axes:

- package members: 34
- RPF: `sha256:feab25126c9d686062f8ed0da8c9d7ad39f468ebc819342bb34fbd2c47e0e843`
- Chrome QCF: `sha256:3715a3453333d3d679a1c1c00a0bab6a02b77c0153f1a4e8d138aa1e8f5a984c`
- Yandex QCF: `sha256:8d6c9711b4f71b8485b49a6ab68f90bcf62bc74155ae0959dbdc4718648879a1`
- BCF: `sha256:9eebcc834fa32bd8fe5f03ef14564f0fc1c169d0308dcc2813941b4f913363ff`

The pre-binding full RCF

`sha256:df6709bbe06a91b39828073552c499e307d74c4aebf782b3966fb1163ebdc8ce`

is historical for the ten-root authority once this tranche is accepted.

The new eleven-root full RCF is intentionally not asserted in this in-progress checkpoint until the exact-head S0-C/S0-E models independently reproduce it. A failing/intermediate CI run is discovery evidence only and cannot be used as merge evidence.

## Downstream contract

Once exact current generator bytes are covered by full-RCF authority and the corrected generation relation continues to reproduce the exact committed `public-suffix.js` bytes:

- S0-F may pass its generation-governance admission instead of failing with `SOURCE_GENERATION_GENERATOR_NOT_RCF_BOUND`;
- physical Chrome/Yandex evidence identity remains keyed by RPF + the applicable unchanged QCF;
- governance evidence keyed by RPF + full RCF cannot silently carry across the full-RCF change;
- downstream S0-G/S0-H/S1 models must remain fail-closed for missing physical/governance evidence and for absent build/release authorization.

This authority change alone does not create physical Chrome/Yandex PASS, a product build, a release decision, or release readiness.

## Exact-head discovery

Repository Integrity #948 on intermediate exact head
`04ebd4c400145f076754c85e432217f9e63719ba`
stopped at the PR change-contract layer because the owner-impact branch did not yet contain durable P1-231 evidence. No deterministic identity result from that skipped test phase is treated as evidence.

This file supplies the required durable owner evidence so a later exact-head run can execute the deterministic identity/reconciliation models. The final accepted evidence must replace this in-progress section with the exact new RCF and final exact-head/post-merge CI references.

## Release boundary

P1-231 remains **ACTIVE**.

Manifest remains `0.9.8`.

Release readiness remains **NOT READY**.

No product ZIP/build, version bump, release-gate execution, tag, deployment, GitHub Release, Chrome qualification, Yandex OAuth/provider mutation, Yandex qualification, S2 authorization, or release decision is authorized or performed by this tranche.
