# WebClip — P1-231 S0-E identity-engine execution receipt — 2026-09-10

Date: 2026-09-10  
Canonical baseline before research: `main = 1dcd81a100515322dbf47e8840c98af65fca3b76`  
Research branch: `research/p1-231-s0e-identity-engine-source-spec-2026-09-10`  
Mode: **RESEARCH-ONLY / PASSIVE IDENTITY PROTOCOL**

## 1. Scope

This receipt records committed-source evidence for the S0-E identity-engine source specification. S0-E defines only the versioned typed binary framing and domain-separated SHA-256 fingerprint protocol consumed by later release construction work.

No production identity implementation, candidate-generation gate, release-readiness migration, release-policy activation, official ZIP, real Chrome release QA or real Yandex L5 was created or executed.

## 2. Fresh canonical guard

Immediately before the proof workflow was created:

```text
main = 1dcd81a100515322dbf47e8840c98af65fca3b76
research branch head before workflow = 57dd509f72aa1419a34bee39eb4470dc0889673a
branch compare = ahead 2 / behind 0
RESEARCH_REGISTRY.md blob = 9623d8d03b4c900708d43cc2e59bf606a378d505
Registry status/numbering unchanged
```

Immediately before this receipt was written, `main` was re-read and remained the same exact SHA.

## 3. Authoritative committed-source proof

Temporary workflow:

```text
name = P1-231 S0-E identity engine research
run id = 34439727133
attempt = 1
job id = 102752052419
execution SHA = a5941e3c310426381f9cc3a1e59fc18defbd1143
runner = ubuntu-24.04
Python = 3.12.14
Node.js = 22.23.2
conclusion = success
```

The workflow checked out the exact `GITHUB_SHA`, verified clean source identity, syntax-checked the model and executed:

```text
node project_tools/test_p1_231_s0e_identity_engine_source_spec_model.js
```

Full decoded raw job log was fetched through the authenticated GitHub job-log endpoint and inspected directly.

Authoritative model result:

```text
P1-231 S0-E identity engine source-spec model: PASS
cases = 201
protocol = WEBCLIP_RELEASE_IDENTITY_V1
package_files = 33
full_inputs = 10
rpf = sha256:1a9551f839b70410c834ba0f040b9c285de58965771a927cef2d95700c86e792
chrome_qcf = sha256:3715a3453333d3d679a1c1c00a0bab6a02b77c0153f1a4e8d138aa1e8f5a984c
yandex_qcf = sha256:8d6c9711b4f71b8485b49a6ab68f90bcf62bc74155ae0959dbdc4718648879a1
rcf = sha256:e6119c800c60513405541bfae552f424985e13fa109e28390ae1bac7ba075f13
bcf = sha256:9eebcc834fa32bd8fe5f03ef14564f0fc1c169d0308dcc2813941b4f913363ff
cross_language = node-python
```

These are research golden vectors for the exact committed-source proof. They are not release evidence for a shipped candidate.

## 4. What the 201-case model proves

The committed model covers, among other things:

- type separation between `TEXT`, `BYTES` and `UINT64`;
- explicit list/record boundary framing;
- record field insertion-order invariance;
- ordered-list order sensitivity;
- fail-closed unsupported/range/digest parsing cases;
- independent RPF/QCF/RCF/BCF domains;
- exact ordinary Git-blob admission checks for 33 package members and 10 full-RCF roots;
- RPF sensitivity to package bytes/path/schema/profile and independence from Git commit identity itself;
- Chrome/Yandex QCF projection independence plus propagation into full RCF;
- full-only RCF blob sensitivity without QCF contamination;
- exclusion of mutable readiness/status evidence from RCF inputs;
- BCF sensitivity to builder semantics while excluding package bytes and toolchain provenance;
- JSON formatting independence after upstream semantic validation;
- independent Node.js and Python implementations producing identical encoded bytes/fingerprints for primitive vectors and all five current identity outputs.

## 5. Artifact fallback triangulation

The workflow uploaded one bounded diagnostic artifact with `if: always()`.

GitHub artifact metadata:

```text
artifact id = 10137475209
artifact name = p1-231-s0e-identity-engine-a5941e3c310426381f9cc3a1e59fc18defbd1143
GitHub digest = sha256:bb26ddc3fbd2fe8b69a954d750cf98ba67792afbe84372957084d5aa64a63ec5
retention = 7 days
```

The artifact ZIP was independently downloaded and inspected:

```text
ZIP bytes = 578
ZIP SHA-256 = bb26ddc3fbd2fe8b69a954d750cf98ba67792afbe84372957084d5aa64a63ec5
contained files = 1
contained file = p1-231-s0e-identity-engine-output.txt
contained output bytes = 562
contained output SHA-256 = ebcabf80563cf68b9c2167723e3815805767e2ea811396eba1fc5c885ed0f462
```

The contained output text exactly matched the authoritative PASS line in the full decoded raw job log.

## 6. Infrastructure note

`actions/upload-artifact` emitted GitHub's current Node.js 20 deprecation/forced-Node-24 warning. The pinned action completed successfully and the artifact was physically downloaded and verified. This is temporary research-workflow infrastructure provenance, not a WebClip product failure and not BCF semantics.

## 7. Safety / non-activation statement

This evidence does **not** mean any of the following has happened:

```text
production release_identity.py created
production package/QA/builder authority activated
candidate-generation verifier activated
V1 readiness migration
release-gate activation
official staging or WebClip ZIP
manifest version bump
real Chrome release QA
real Yandex OAuth/API L5
release-blocker final review
explicit release approval
tag / GitHub Release / deployment
```

Release readiness remains governed by the existing canonical readiness authority and is intentionally unchanged by S0-E research.
