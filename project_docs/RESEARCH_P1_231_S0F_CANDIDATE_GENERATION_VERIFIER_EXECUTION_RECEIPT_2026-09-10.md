# WebClip — P1-231 S0-F candidate-generation verifier execution receipt — 2026-09-10

Date: 2026-09-10  
Canonical baseline before research: `main = 1ac11440438a8002903f11213ae104204a1f8623`  
Research branch: `research/p1-231-s0f-candidate-generation-verifier-2026-09-10`  
Mode: **RESEARCH-ONLY / PASSIVE GENERATION ADMISSION**

## 1. Scope

This receipt records committed-source evidence for the S0-F candidate-generation verifier source specification.

S0-F composes canonical S0-A package authority, S0-B source-generation authority and S0-E identity computation. Its key boundary is:

```text
computed identity != admitted release-candidate identity
```

A candidate identity tuple is not admitted downstream until declared generated outputs have been regenerated from exact candidate generator/input blobs and matched byte-for-byte, with the S0-B portability prerequisite satisfied.

No production verifier, generator fix, official staging tree, WebClip ZIP, readiness migration, release-gate activation, Chrome release QA or Yandex L5 was created or run.

## 2. Canonical guards

Before the S0-F writes and again before this receipt:

```text
main = 1ac11440438a8002903f11213ae104204a1f8623
RESEARCH_REGISTRY.md blob = 9623d8d03b4c900708d43cc2e59bf606a378d505
Registry numbering/status unchanged
```

No Change Impact was required.

## 3. Diagnostic iteration 1 — identity adapter validation bug

Temporary workflow:

```text
workflow = P1-231 S0-F candidate generation verifier research
run = 34440481743
attempt = 1
job = 102754298435
execution SHA = 9ff9a0540998490258d7fbcd3f8431cc47b8d720
result = failure
```

The full decoded job log showed:

```text
IDENTITY_COMPUTATION_FAILED
```

Root cause was confined to the research model adapter. The S0-E parser deliberately returned required fingerprint fields plus diagnostic `protocol` and `line` fields, while the first S0-F adapter incorrectly required every object value to match `sha256:<hex>`.

Correction: validate only the five owned required digest fields:

```text
rpf
chromeQcf
yandexQcf
rcf
bcf
```

S0-F generation/admission semantics were unchanged.

Diagnostic artifact:

```text
artifact id = 10137736099
artifact ZIP size = 218 bytes
artifact digest = sha256:d3b0e8f2a64959d84469e24a6e054ef82bd00cafe1e4b8a5dacad1e7e93eb36e
```

This run is not authoritative evidence.

## 4. Diagnostic iteration 2 — semantically inert PSL fixture

Second workflow execution:

```text
run = 34440600566
attempt = 1
job = 102754654126
execution SHA = ffeabff550ac381b109cb6724766ae7c5bdd5296
result = failure
```

Full decoded job log showed the assertion:

```text
changed source must regenerate different output
```

The synthetic source mutation had appended a `// ...` line to `public_suffix_list.dat`. The real generator intentionally ignores PSL comment lines, so the input blob changed physically but the generator's semantic input did not. The unchanged generated output was therefore correct.

This diagnostic refined the test contract: S0-F validates the exact declared generation relation by executing it; it does not assume every source-blob byte change must necessarily alter the output.

The fixture was changed to add an actual PSL rule, which must alter generated output. Generation/admission architecture remained unchanged.

Diagnostic artifact:

```text
artifact id = 10137779602
artifact ZIP size = 218 bytes
artifact digest = sha256:c03732979b6a2c0287d4eb4c2a4be65f1a5212aff5fe3b25576b3dc777542000
```

This run is not authoritative evidence.

## 5. Authoritative committed-source proof

Third workflow execution:

```text
workflow = P1-231 S0-F candidate generation verifier research
run = 34440779948
attempt = 1
job = 102755185841
execution SHA = 938c1fe2353ac54e6120ef7a41dc5962d6d6772f
runner = ubuntu-24.04
Python = 3.12.14
Node.js = 22.23.2
conclusion = success
```

The workflow checked out the exact `GITHUB_SHA`, verified source identity, syntax-checked the model and ran:

```text
node project_tools/test_p1_231_s0f_candidate_generation_verifier_source_spec_model.js
```

Full decoded raw job log was fetched and inspected directly.

Authoritative output:

```text
P1-231 S0-F candidate-generation verifier source-spec model: PASS; cases=224; package_files=33; relations=1; linux_regen=match; current_gate=blocked-portability; admitted_after_portability=pass; rpf=sha256:1a9551f839b70410c834ba0f040b9c285de58965771a927cef2d95700c86e792; no_cgf=true; head=938c1fe2353ac54e6120ef7a41dc5962d6d6772f
```

The log also contains:

```text
fatal: git cat-file: could not get object info
```

This is expected stderr from an intentional negative-control using a nonexistent candidate SHA; the model subsequently passed all 224 assertions.

## 6. What the authoritative model proves

The committed model proves, among other things:

- exact candidate commit identity is explicit and immutable;
- all 33 S0-A package members remain exact Git `blob` / mode `100644` inputs;
- the one canonical S0-B relation remains the only generation relation;
- current Linux regeneration from exact generator/input Git blobs matches committed `public-suffix.js` byte-for-byte;
- unrelated candidate files are absent from the minimal regeneration workspace;
- a one-platform match does not overcome the canonical S0-B Windows portability defect;
- current admission therefore fails closed as `SOURCE_GENERATION_PORTABILITY_UNPROVEN` and publishes no admitted identity tuple;
- after a synthetic portability prerequisite is marked closed, exact matched bytes allow the existing S0-E identity tuple to be admitted;
- stale generated output is rejected even though deterministic package identity remains mathematically computable;
- a semantically effective source change with old generated output is rejected;
- a generator change with old generated output is rejected;
- CRLF output remains a raw-byte mismatch; verifier-side newline normalization is not allowed;
- unsupported runtime profiles, missing outputs, undeclared outputs and non-package generated outputs fail closed;
- S0-F result is bound to exact candidate SHA and cannot be relabeled onto another same-RPF commit;
- no new `CGF` axis is introduced;
- S0-G and S0-H dependency boundaries remain canonical.

## 7. Artifact fallback triangulation

Authoritative run artifact:

```text
artifact id = 10137840273
artifact name = p1-231-s0f-candidate-generation-verifier-938c1fe2353ac54e6120ef7a41dc5962d6d6772f
GitHub digest = sha256:75c203e6de7201e4f60f275418506bacaaffc490d7d6d691cb9041d23dc34b7d
retention = 7 days
```

The ZIP was independently downloaded and inspected:

```text
ZIP bytes = 463
ZIP SHA-256 = 75c203e6de7201e4f60f275418506bacaaffc490d7d6d691cb9041d23dc34b7d
contained files = 1
contained file = p1-231-s0f-candidate-generation-verifier-output.txt
contained output bytes = 331
contained output SHA-256 = 2eff97f6d27ef770193aeb9798fc700f422a67f2ef0135cf0d925e4a8aa094ee
```

The contained output exactly matches the authoritative PASS line from the full decoded raw job log.

## 8. Current production-entry consequence

The S0-F research contract is valid while the current product remains intentionally **blocked for production S0-F admission** because canonical S0-B still has:

```text
current_psl_windows_portable=false
```

This is a known implementation prerequisite. It is not recorded as an additional canonical release-readiness blocker in this research tranche, and `RELEASE_READINESS.md` remains unchanged.

Before a future production S0-F implementation can become operational, an explicitly authorized implementation package must repair generator portability at the generation source, not by verifier-side normalization.

## 9. Safety / non-activation

This evidence does not mean any of the following occurred:

```text
build_public_suffix_js.py fixed
production release_source_generation_v1.json created
production candidate-generation verifier created
production identity implementation activated
candidate admitted for official release
release-readiness migration
release-gate activation
official stage or WebClip ZIP
manifest version bump
real Chrome release QA
real Yandex OAuth/API L5
release-blocker final review
explicit release approval
tag / GitHub Release / deployment
```

Canonical release readiness remains NOT READY with the existing five blockers.
