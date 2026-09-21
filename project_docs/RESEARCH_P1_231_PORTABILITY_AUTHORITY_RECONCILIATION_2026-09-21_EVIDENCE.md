# P1-231 portability / generator-RCF authority reconciliation — 2026-09-21

Status: **PORTABILITY PASS / GENERATOR-RCF BINDING BLOCKED**

## Scope

This tranche reconciles current P1-231 source-generation authority after the corrected PSL generator was physically re-proved on Linux and Windows.

It does not implement the next full-RCF authority change. It changes the current fail-closed reason from the now-retired portability defect to the already-established executable-generator governance gap.

Canonical baseline at tranche start:

`bae94fb2eb44ad45221a4f16d25c1f3118a88d4a`

Durable integration PR: `#310`

Owner:

`P1-231 | ACTIVE`

## Physical portability authority

The durable physical proof is:

`project_docs/RESEARCH_P1_231_S0B_PSL_PORTABILITY_REPROOF_2026-09-21_EVIDENCE.md`

Temporary evidence workflow run:

- run id: `35566109810`
- Linux job: `106228144739`
- Windows job: `106228144631`
- exact evidence head: `5cdbb131513f77cacac91c6b229ad7dd77b55420`
- runtime: CPython `3.12.10`

Both platforms regenerated the same exact committed output:

- `public-suffix.js` Git blob: `541a0833e4731e3513d327208904661cc3d3e990`
- SHA-256: `72aea4d8a8505ad90d9070bca539dff7d49391f034d0dd41f76d64867efc0b26`
- bytes: `167388`
- CRLF count: `0`

Windows reported platform line separator `0d0a`, so the exact-match result directly proves that the corrected binary writer no longer translates generated LF bytes to CRLF.

Current S0-B truth is therefore:

`current_psl_windows_portable=true`

The former marker `current_psl_windows_portable=false` is historical evidence only.

## Next fail-closed boundary

The earlier canonical refinement
`RESEARCH_P1_231_GENERATION_PORTABILITY_BINDING_REFINEMENT_2026-09-10_EVIDENCE.md`
already established a separate governance requirement:

every declared executable S0-B generator must be explicitly covered by current full-RCF authority before candidate generation may become release-authoritative.

The current S0-C bootstrap contains ten full-RCF blob inputs and still omits:

`project_tools/build_public_suffix_js.py`

Therefore current S0-F state becomes:

```text
portability = pass
current_gate = blocked-generation
current_blocker = SOURCE_GENERATION_GENERATOR_NOT_RCF_BOUND
```

This is not a new P-code and not a new release-readiness blocker. It is the next unresolved acceptance condition inside existing P1-231.

## Why S0-F does not become PASS

A successful raw regeneration proves generated package freshness for the exact generation roots. It does not prove that governance/release review is bound to the changed executable transformation authority.

The generator changed from historical text-mode output to byte-mode output while current package bytes remained the same. As already specified by the binding refinement:

- RPF remains a package identity and does not absorb generator bytes;
- Chrome/Yandex QCF remain physical-QA contract identities and do not absorb generator bytes merely for this change;
- BCF remains the builder/archive contract identity;
- full RCF must cover the executable generator authority before governance evidence can be treated as current.

Until that binding is implemented, S0-F publishes no admitted candidate tuple for the real current candidate.

## Downstream reconciliation

The downstream current-state models remain fail-closed:

- S0-G real settlement remains blocked because the current candidate is not S0-F admitted;
- S0-H remains blocked before product package load/build;
- S1-A current shadow identity is ineligible with `blocked-generation`;
- S1-B does not evaluate semantic evidence settlement for the ineligible candidate;
- S1-C does not treat the real current candidate as builder-equivalence eligible;
- S1-D migration rehearsal keeps the current candidate behind the S0-F generation gate.

Synthetic positive paths remain model-only demonstrations of the state after the missing generator/full-RCF binding is closed.

## Identity effect

This reconciliation changes no extension package bytes and makes no full-RCF authority change itself.

Therefore the currently recorded identities remain:

- package files: 34
- RPF: `sha256:feab25126c9d686062f8ed0da8c9d7ad39f468ebc819342bb34fbd2c47e0e843`
- Chrome QCF: `sha256:3715a3453333d3d679a1c1c00a0bab6a02b77c0153f1a4e8d138aa1e8f5a984c`
- Yandex QCF: `sha256:8d6c9711b4f71b8485b49a6ab68f90bcf62bc74155ae0959dbdc4718648879a1`
- full RCF: `sha256:df6709bbe06a91b39828073552c499e307d74c4aebf782b3966fb1163ebdc8ce`
- BCF: `sha256:9eebcc834fa32bd8fe5f03ef14564f0fc1c169d0308dcc2813941b4f913363ff`

The full RCF above is intentionally not advanced in this tranche because its canonical input authority has not yet been changed.

The next bounded implementation tranche should explicitly add executable generator coverage to the full-RCF authority and then recompute/synchronize the affected full-RCF-dependent models/evidence. That later change is expected to stale blocker-review/release-decision governance evidence while not, by itself, changing RPF/QCF/package bytes.

## Release boundary

P1-231 remains **ACTIVE**.

Manifest remains `0.9.8`.

Release readiness remains **NOT READY**.

No product ZIP/build, version bump, tag, deployment, GitHub Release, release-gate execution, Chrome qualification, Yandex OAuth/provider mutation, Yandex qualification or release decision is authorized or performed.
