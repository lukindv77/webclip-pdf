# WebClip — P1-231 S1-C passive builder equivalence — execution receipt — 2026-09-10

Date: 2026-09-10  
Mode: **RESEARCH-ONLY / SHADOW / NO OFFICIAL WEBCLIP ARTIFACT**  
Source specification: `project_docs/RESEARCH_P1_231_S1C_BUILDER_EQUIVALENCE_SOURCE_SPEC_2026-09-10_EVIDENCE.md`  
Executable model: `project_tools/test_p1_231_s1c_builder_equivalence_source_spec_model.js`

## 1. Baseline and scope

Canonical baseline at tranche start:

```text
main = 8cebf798b4cf3d02af194c185b267d0061749173
RESEARCH_REGISTRY.md blob = 9623d8d03b4c900708d43cc2e59bf606a378d505
```

No Registry/P-code status was changed.

This receipt records committed-source evidence for the P1-231 S1-C builder-equivalence source specification. It does not record a product build, release qualification or release decision.

## 2. Exact GitHub Actions execution identity

Temporary research workflow:

```text
workflow = P1-231 S1-C builder equivalence research
workflow file = .github/workflows/p1-231-s1c-builder-equivalence-research.yml
run = 34457044034
attempt = 1
job = 102805753542
execution SHA = 2c53870e737841ca4fb43c8551b6bb0daa8555ac
branch = research/p1-231-s1c-builder-equivalence-2026-09-10
runner = ubuntu-24.04
Python = 3.12.14
Node.js = 22.23.2
conclusion = success
```

The full decoded job log was read directly through authenticated GitHub Actions access.

## 3. Exact predecessor proof from the same checkout

The same job executed the relevant predecessor models before S1-C:

```text
P1-231 S0-D builder contract authority source-spec model:
  PASS; cases=440
  fixture_zip_bytes=510
  fixture_zip_sha256=1db2cd15c7decdd0e380aab31363f12d75268d90573eb6ef46723b5287f740d7
  raw_local_central=true
  zip64=v1-forbidden
  toolchain_provenance_only=true

P1-231 S0-H passive-builder verifier source-spec model:
  PASS; cases=80
  current_gate=blocked-portability
  current_product_build=blocked-before-load
  product_zip=false
  fixture_members=4
  fixture_zip_bytes=510
  fixture_zip_sha256=1db2cd15c7decdd0e380aab31363f12d75268d90573eb6ef46723b5287f740d7
  bcf=sha256:9eebcc834fa32bd8fe5f03ef14564f0fc1c169d0308dcc2813941b4f913363ff
  head=2c53870e737841ca4fb43c8551b6bb0daa8555ac

P1-231 S1-A shadow identity source-spec model:
  PASS; cases=75
  schema=webclip-shadow-identity/v1
  current_shadow=blocked-portability
  current_eligible=false
  structural_errors=fail-closed
  pr_candidate=github-sha
  synthetic_merge_required=true
  product_zip=false
  permanent_workflow_unchanged=true
  head=2c53870e737841ca4fb43c8551b6bb0daa8555ac
```

Thus the equivalence proof was not detached from its admission and builder-contract predecessors.

## 4. S1-C committed-source result

Exact PASS line from the full job log:

```text
P1-231 S1-C builder equivalence source-spec model: PASS; cases=67; schema=webclip-builder-equivalence/v1; current_state=candidate-ineligible; current_equivalence_evaluated=false; cross_language=node-python; fixture_members=4; fixture_zip_bytes=510; fixture_zip_sha256=1db2cd15c7decdd0e380aab31363f12d75268d90573eb6ef46723b5287f740d7; raw_bytes_equal=true; extracted_rpf_equal=true; metadata_drift=fail-closed; current_product_load=false; product_zip=false; policy_mutation=false; permanent_workflow_unchanged=true; bcf=sha256:9eebcc834fa32bd8fe5f03ef14564f0fc1c169d0308dcc2813941b4f913363ff; head=2c53870e737841ca4fb43c8551b6bb0daa8555ac
```

## 5. What the result proves

### 5.1 Current real candidate remains unbuilt

The current exact checkout still inherits the known source-generation portability blocker.

S1-C therefore proves:

```text
current_state = candidate-ineligible
current_equivalence_evaluated = false
current_product_load = false
product_zip = false
```

No 33-member WebClip product projection was loaded or serialized by the S1-C positive path.

### 5.2 Independent cross-language serializers are physically equivalent

The positive control uses only the established four-member synthetic fixture.

Two separate implementation paths were executed:

```text
Path A = manual Node.js raw ZIP writer
Path B = Python stdlib zipfile writer
```

Both independently produced:

```text
fixture members = 4
archive bytes = 510
archive SHA-256 = 1db2cd15c7decdd0e380aab31363f12d75268d90573eb6ef46723b5287f740d7
raw byte arrays equal = true
```

The model directly compares the in-memory byte arrays, not only their hashes.

### 5.3 Logical projection equivalence is separately proven

Both archives were independently read/verified and projected back to exact package members.

The resulting synthetic fixture RPF values equal the admitted synthetic RPF on both paths:

```text
extracted_rpf_equal = true
```

Thus physical archive equality and logical package equality are independent assertions in the model.

### 5.4 Metadata-only drift is not accepted

A Python serializer variant changes only the DOS timestamp while retaining identical names and payload bytes.

The model proves:

```text
extracted member names remain equal
extracted payload bytes remain equal
logical fixture RPF remains equal
raw archive bytes change
artifact SHA changes
canonical raw S0-D verification fails closed
full S1-C equivalence evaluation rejects the drift
```

This proves that extract-equivalence cannot substitute for physical BCF equivalence.

### 5.5 Environment/input-order variation remains non-semantic

The model also verifies unchanged canonical output under:

```text
reverse input order
TZ=Pacific/Honolulu
SOURCE_DATE_EPOCH=2147483647
```

Toolchain runtime versions remain provenance only.

## 6. Bounded artifact fallback

GitHub artifact metadata:

```text
artifact id = 10143913927
name = s1c-builder-equivalence-2c53870e737841ca4fb43c8551b6bb0daa8555ac
reported ZIP bytes = 580
reported digest = sha256:98df6a9f082e498ae9261785c035f7cdfa3a0a8db2ff9d199270b9ceb807ab6c
retention = 7 days
```

The artifact was physically downloaded and independently inspected.

Local independent verification of the downloaded ZIP:

```text
ZIP bytes = 580
ZIP SHA-256 = 98df6a9f082e498ae9261785c035f7cdfa3a0a8db2ff9d199270b9ceb807ab6c
members = exactly 1
member = s1c-builder-equivalence-output.txt
member bytes = 638
member SHA-256 = ab8a801998756c0156e0e7ac1fdf2128ec99b0e5672c02d0b87d437acc448a0d
```

The contained text is exactly the S1-C PASS line quoted above.

The artifact contains no WebClip product ZIP, product member bytes, credentials, browser output or provider material.

## 7. Warning classification

The temporary artifact action emitted GitHub's current compatibility warning that an action targeting Node 20 is forced to run under Node 24.

This warning did not affect:

- the Node 22.23.2 model runtime selected by the workflow;
- the Python 3.12.14 builder path;
- the 510-byte golden vector;
- artifact upload completion;
- artifact digest verification.

It is temporary research infrastructure information, not a WebClip product defect or release qualification result.

## 8. Research safety / non-authority confirmation

This run did **not**:

- repair S0-B Windows portability;
- admit current `main` through S0-F;
- load/build the WebClip product package;
- construct an official ZIP;
- modify a permanent workflow;
- mutate `RELEASE_READINESS.md`;
- mutate evidence receipts;
- activate release policy;
- run Chrome release QA;
- run Yandex OAuth/API L5;
- create a tag/GitHub Release/deployment;
- approve a release.

The S1-C result remains explicitly non-authoritative:

```text
policy_mutation=false
permanent_workflow_unchanged=true
product_zip=false
```

## 9. Canonicalization condition

Before PR creation, the temporary workflow must be removed and the final branch tree diff against fresh canonical `main` must contain exactly:

```text
project_docs/RESEARCH_P1_231_S1C_BUILDER_EQUIVALENCE_SOURCE_SPEC_2026-09-10_EVIDENCE.md
project_docs/RESEARCH_P1_231_S1C_BUILDER_EQUIVALENCE_EXECUTION_RECEIPT_2026-09-10.md
project_tools/test_p1_231_s1c_builder_equivalence_source_spec_model.js
```

Then the normal PR synthetic-merge gate and mandatory post-merge push gate must pass before S1-C is considered canonical research/source-spec evidence.

## 10. Next DAG node

After successful S1-C canonicalization, the remaining S1 research node is:

```text
S1-D migration rehearsal / negative matrix
```

S1-D must compose S1-A, S1-B and S1-C without modifying the existing V1 readiness/release-gate authority.
