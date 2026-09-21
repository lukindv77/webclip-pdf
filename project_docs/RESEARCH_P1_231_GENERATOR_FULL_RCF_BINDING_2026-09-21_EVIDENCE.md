# P1-231 generator / full-RCF authority binding — 2026-09-21

Status: **DETERMINISTIC AUTHORITY RECONCILED; PHYSICAL/RELEASE EVIDENCE PENDING**

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

The final eleven-root full RCF for this reconciled authority state is:

`sha256:cb34076d37c8dbe99392fac120fb21b03d192e4b53bc7a40650b5cd277311ffb`

Repository Integrity #949 on exact intermediate head `c8aaaee78236f5b88dbacc9672f9ebbda7437086` first proved that adding the generator changes the identity axis; at that intermediate authority state it reproduced `sha256:0806e70942b17db36b400b5a4fda9f3e68b9695157e4d861f4bb3c431927836c`. Later synchronization of the full-RCF-root `project_docs/RESEARCH_REGISTRY.md` correctly changed the fingerprint again. Repository Integrity #959 on exact head `e3911d8e002e187080bc71eb6cc55c6038b097a1` independently reproduced the resulting final authority bytes as `sha256:cb34076d37c8dbe99392fac120fb21b03d192e4b53bc7a40650b5cd277311ffb`.

The old `sha256:df6709...` value is retained only as the historical ten-root control, and `sha256:0806e709...` is retained only as an intermediate eleven-root discovery value. Neither is current full-RCF authority after this tranche.

## Downstream contract

With exact current generator bytes covered by full-RCF authority and the corrected generation relation still reproducing the exact committed `public-suffix.js` bytes:

- S0-F now passes candidate-generation admission for the exact current source; the missing-generator path remains a fail-closed regression control;
- S0-G therefore advances from generation-blocked to **evidence-missing** for the current candidate when no current receipt namespace entries exist;
- physical Chrome/Yandex evidence identity remains keyed by RPF + the applicable unchanged QCF;
- governance evidence keyed by RPF + full RCF cannot silently carry across the full-RCF change;
- S0-H/S1-C do **not** infer product-build permission from generation admission: current product package loading/building remains intentionally unexecuted in this research tranche;
- S1-A can describe the current identity as generation-eligible while S1-B/S1-D remain blocked by missing evidence and all release-authority flags remain false.

This authority change alone does not create physical Chrome/Yandex PASS, a product build, a release decision, or release readiness.

## Exact-head discovery

Repository Integrity #948 on intermediate exact head
`04ebd4c400145f076754c85e432217f9e63719ba`
stopped at the PR change-contract layer because the owner-impact branch did not yet contain durable P1-231 evidence. No deterministic identity result from that skipped test phase is treated as evidence.

Repository Integrity #949 established the first eleven-root discovery value and showed exactly seven downstream stale assumptions. After S0-F was reconciled, Repository Integrity #950 on exact head `71b6c367d43ad63db2a0c85d7ed017840277283a` showed S0-F PASS with `cases=271`, `current_gate=pass`, and `generator_rcf_binding=bound`; the remaining deterministic failures were reduced to six downstream S0-G/S0-H/S1 current-state assumptions.

Those six models were then reconciled to distinguish generation admission from missing evidence and from absent build/release authorization. Repository Integrity #959 subsequently caught the intentional full-RCF change caused by synchronizing `RESEARCH_REGISTRY.md`, a full-RCF root, and independently produced the final `cb34076d...` fingerprint above. The fingerprint expectations are now bound to that exact final authority state. Merge acceptance still requires a fresh exact-head Repository Integrity SUCCESS and the normal post-merge SUCCESS on literal new `main`; intermediate failing runs are discovery evidence only.

## Release boundary

P1-231 remains **ACTIVE**.

Manifest remains `0.9.8`.

Release readiness remains **NOT READY**.

No product ZIP/build, version bump, release-gate execution, tag, deployment, GitHub Release, Chrome qualification, Yandex OAuth/provider mutation, Yandex qualification, S2 authorization, or release decision is authorized or performed by this tranche.
