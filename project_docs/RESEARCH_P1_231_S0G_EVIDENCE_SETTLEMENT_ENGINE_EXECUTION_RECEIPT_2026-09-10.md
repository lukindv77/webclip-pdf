# WebClip — P1-231 S0-G evidence-settlement engine execution receipt — 2026-09-10

Date: 2026-09-10  
Canonical baseline before research: `main = 6b6646483968a8797a037fc548c8e94120e44dc0`  
Registry blob: `9623d8d03b4c900708d43cc2e59bf606a378d505`  
Research branch: `research/p1-231-s0g-evidence-settlement-engine-2026-09-10`  
Mode: **RESEARCH-ONLY / PASSIVE EVIDENCE SETTLEMENT**

## 1. Scope

This receipt records committed-source proof for the S0-G evidence-settlement engine source specification.

S0-G composes canonical S0-E identity output and S0-F candidate-generation admission. It does not independently compute fingerprints, mutate release readiness or authorize release/publish.

The key refinement proven by this tranche is:

```text
matching RPF/QCF/RCF is not sufficient;
both testedSourceSha and the current candidate must independently have valid S0-F PASS admission.
```

The target receipt generation is:

```text
webclip-release-evidence/v2
```

Receipt admission is canonical append-only repository state, not a self-declared `admitted=true` boolean.

## 2. Canonical guards

Immediately before source-spec/model writes and immediately before this receipt:

```text
main = 6b6646483968a8797a037fc548c8e94120e44dc0
RESEARCH_REGISTRY.md blob = 9623d8d03b4c900708d43cc2e59bf606a378d505
Registry numbering/status unchanged
```

No Change Impact was required.

## 3. Authoritative committed-source proof

Temporary workflow:

```text
workflow = P1-231 S0-G evidence settlement research
workflow file = .github/workflows/tmp-p1-231-s0g-evidence-settlement-research.yml
run = 34443204269
attempt = 1
job = 102762358429
execution SHA = 4bb91e1d2e42ab111f9700aa06c3ee00685c185b
branch = research/p1-231-s0g-evidence-settlement-engine-2026-09-10
runner = ubuntu-24.04
Python = 3.12.14
Node.js = 22.23.2
conclusion = success
```

The workflow:

1. checked out exact `GITHUB_SHA` with full Git history;
2. required `git rev-parse HEAD == GITHUB_SHA` and a clean checkout;
3. syntax-checked the S0-G model;
4. ran canonical S0-E predecessor proof;
5. ran canonical S0-F predecessor proof;
6. ran the S0-G model;
7. uploaded only the bounded S0-G output as diagnostic artifact fallback.

Full decoded raw job log was fetched and inspected directly.

## 4. Predecessor composition evidence

The same exact workflow checkout produced:

```text
S0-E = PASS; cases=201
protocol = WEBCLIP_RELEASE_IDENTITY_V1
RPF = sha256:1a9551f839b70410c834ba0f040b9c285de58965771a927cef2d95700c86e792
Chrome QCF = sha256:3715a3453333d3d679a1c1c00a0bab6a02b77c0153f1a4e8d138aa1e8f5a984c
Yandex QCF = sha256:8d6c9711b4f71b8485b49a6ab68f90bcf62bc74155ae0959dbdc4718648879a1
full RCF = sha256:e6119c800c60513405541bfae552f424985e13fa109e28390ae1bac7ba075f13
BCF = sha256:9eebcc834fa32bd8fe5f03ef14564f0fc1c169d0308dcc2813941b4f913363ff
cross-language = node-python
```

and:

```text
S0-F = PASS; cases=224
relations = 1
linux_regen = match
current_gate = blocked-portability
admitted_after_portability = pass
RPF = same exact S0-E RPF
no_cgf = true
```

The S0-F log contains the expected:

```text
fatal: git cat-file: could not get object info
```

This is intentional negative-control stderr for a nonexistent SHA and is followed by the S0-F PASS result.

## 5. S0-G authoritative result

Exact raw-log output:

```text
P1-231 S0-G evidence-settlement engine source-spec model: PASS; cases=128; schema=webclip-release-evidence/v2; current_gate=blocked-portability; current_real_settlement=blocked; synthetic_all_pass=true; tested_source_admission=required; ancestry=required; append_only=true; rpf=sha256:1a9551f839b70410c834ba0f040b9c285de58965771a927cef2d95700c86e792; chrome_qcf=sha256:3715a3453333d3d679a1c1c00a0bab6a02b77c0153f1a4e8d138aa1e8f5a984c; yandex_qcf=sha256:8d6c9711b4f71b8485b49a6ab68f90bcf62bc74155ae0959dbdc4718648879a1; rcf=sha256:e6119c800c60513405541bfae552f424985e13fa109e28390ae1bac7ba075f13; head=4bb91e1d2e42ab111f9700aa06c3ee00685c185b
```

No diagnostic failure iteration was required for S0-G; the first committed-source execution passed.

## 6. What the model proves

The committed model proves, among other things:

- exact current S0-E fingerprint tuple is consumed rather than reimplemented;
- exact current S0-F state remains `blocked-portability`;
- therefore current real `main` cannot produce an S0-G admitted/pass settlement merely because fingerprints exist;
- a synthetic future S0-F-admitted tested source and admitted descendant can settle all four evidence slots;
- tested source without S0-F PASS is rejected even when receipt RPF/QCF/RCF text matches;
- current candidate without S0-F PASS is rejected before receipt selection;
- tested-source identity mismatch fails closed;
- same-generation ancestor evidence can be reused by a docs-only descendant;
- a same-RPF/QCF side branch cannot authorize the candidate;
- settlement key is `(kind,RPF,applicable QCF/RCF)` and excludes tested SHA deliberately;
- later descendant retest shares the same key and supersedes older attempts;
- later FAIL/inconclusive/invalidated blocks earlier PASS;
- later PASS can recover a physical/review slot;
- later rejected/invalidated blocks prior release approval;
- later approved decision can recover the decision slot;
- duplicate attempt sequence in one key blocks the namespace;
- equal attempt sequence across different kinds/generations is allowed;
- duplicate receipt id blocks the namespace;
- malformed canonical receipt is not silently ignored;
- old conceptual/research receipt schemas are not v2 authority;
- `admitted=true` is rejected as an extra v2 field and cannot self-authorize a diagnostic record;
- durable summary is bounded by exact UTF-8 bytes and bound to its SHA-256;
- secret/capability patterns are rejected from summary/provenance/evidence references;
- physical QA provenance records repository/workflow/run/attempt/job/execution SHA separately from tested source SHA;
- a PR synthetic merge execution SHA can be provenance without becoming tested source identity;
- GitHub workflow/run/job identity cannot substitute for RPF/QCF/RCF;
- Chrome QCF changes invalidate only Chrome QA among physical slots;
- Yandex QCF changes invalidate only Yandex QA among physical slots;
- full-RCF-only change preserves physical QA while invalidating blocker review/release decision;
- RPF change invalidates every old evidence slot;
- BCF is not a direct S0-G evidence key;
- ordinary receipt namespace growth is append-only; modification/deletion is detected;
- S0-G result contains no release-readiness or release-approval authority field.

## 7. Artifact fallback triangulation

Artifact metadata:

```text
artifact id = 10138682869
artifact name = p1-231-s0g-evidence-settlement-4bb91e1d2e42ab111f9700aa06c3ee00685c185b
retention = 7 days
GitHub artifact size = 607 bytes
GitHub digest = sha256:0a68e3836b947a9c23d54649f923ba502709284654527995b946884da7b2ec33
```

The ZIP was independently downloaded and inspected:

```text
ZIP bytes = 607
ZIP SHA-256 = 0a68e3836b947a9c23d54649f923ba502709284654527995b946884da7b2ec33
contained files = 1
contained file = p1-231-s0g-evidence-settlement-output.txt
contained output bytes = 642
contained output SHA-256 = b75d78ea3967ee4d56920b32164e74072652af0382938cc75df01a41333a3305
```

The contained output exactly matches the authoritative S0-G PASS line in the full decoded raw job log.

## 8. Current production consequence

The S0-G research contract is coherent, but current real candidate settlement remains intentionally blocked because S0-F has not admitted current production state:

```text
current_gate = blocked-portability
current_psl_windows_portable = false
```

This remains a known implementation prerequisite and is not converted into a sixth canonical release-readiness blocker by this research tranche.

No production receipt namespace, production settlement engine or readiness migration exists yet.

## 9. Warnings/non-product observations

The temporary `actions/upload-artifact` action emitted GitHub's current Node 20 -> Node 24 compatibility warning and Node deprecation warnings inside the action implementation. Artifact upload completed successfully and its digest/content were independently verified.

These warnings are temporary research-infrastructure observations, not WebClip runtime findings.

## 10. Safety / non-activation

This evidence does not mean any of the following occurred:

```text
production release-evidence schema activated
production receipt namespace created
production S0-G verifier created
S0-B portability fixed
current candidate admitted
RELEASE_READINESS changed
release-gate semantics changed
official stage/ZIP built
manifest version bumped
real Chrome release QA run
real Yandex OAuth/API L5 run
release-blocker review passed
explicit release approval recorded
tag / GitHub Release / deployment created
```

Canonical release readiness remains NOT READY with the same five blockers.
