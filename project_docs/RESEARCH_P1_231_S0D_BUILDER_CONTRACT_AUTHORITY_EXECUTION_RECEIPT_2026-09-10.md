# WebClip — P1-231 S0-D builder-contract authority execution receipt — 2026-09-10

Date: 2026-09-10  
Canonical base at proof/receipt time: `main = a740c358749d09c9b2358982cbfe0c7dd0fbca33`  
Research branch: `research/p1-231-s0d-builder-contract-authority-2026-09-10`  
Mode: **RESEARCH-ONLY / COMMITTED-SOURCE PROOF**  
Production/runtime/release-policy activation: **NONE**

## 1. Purpose

This receipt records committed-source proof for the P1-231 S0-D builder-contract authority research specification/model.

The proof validates the deterministic classic-ZIP/staging contract that later S0-E/S0-H may consume, without creating a production builder authority and without constructing an official WebClip release artifact.

## 2. Diagnostic iteration retained for provenance

The first temporary-workflow run was intentionally treated as diagnostic rather than authoritative:

```text
run = 34438194640
job = 102747565791
execution SHA = c406427cd6f2daf5149f9abff9b3239d213655db
conclusion = failure
```

The full decoded log showed that the architecture/ZIP fixture had progressed into the raw negative matrix. The failure was a test-expectation mismatch for the synthetic `preamble` mutation:

```text
expected = BUILDER_ZIP_EOCD_NOT_FINAL
actual = ERR_ASSERTION: central directory must end exactly at EOCD
488 != 489
```

Adding a preamble keeps the EOCD physically at the end but invalidates the stored central-directory offset/size relationship. The verifier therefore failed closed correctly. Only the negative-control expected error class was corrected; no builder-contract value, golden ZIP byte, raw-verifier rule or policy boundary changed.

## 3. Authoritative committed-source execution identity

```text
workflow = P1-231 S0-D builder contract authority research
run id = 34438300701
run attempt = 1
job id = 102747874512
head branch = research/p1-231-s0d-builder-contract-authority-2026-09-10
execution SHA = f8069080e25f6a1630ea7cd8df1f4d74b7d73557
runner = ubuntu-24.04
Python = 3.12.14
Node.js = 22.23.2
conclusion = success
```

Exact checkout was proven before execution. The workflow ran:

```text
node --check project_tools/test_p1_231_s0d_builder_contract_authority_source_spec_model.js
node project_tools/test_p1_231_s0d_builder_contract_authority_source_spec_model.js
```

The full decoded raw job log was fetched and inspected directly.

## 4. Deterministic result

Exact PASS line:

```text
P1-231 S0-D builder contract authority source-spec model: PASS; cases=440; fixture_zip_bytes=510; fixture_zip_sha256=1db2cd15c7decdd0e380aab31363f12d75268d90573eb6ef46723b5287f740d7; research_contract_sha256=db3f64c9c43269fc5e6148ebafea67767d80d6e529b8c5d624df09913a754324; raw_local_central=true; zip64=v1-forbidden; toolchain_provenance_only=true
```

The committed-source model therefore proves at least:

```text
440 deterministic assertions
predecessor 510-byte synthetic ZIP golden vector preserved
raw local-header ↔ central-directory ↔ EOCD validation
CRC32/size/payload consistency
classic single-disk ZIP v1 profile
ZIP64 forbidden
STORED compression
fixed DOS epoch / fixed Unix metadata
zero flags / no data descriptors
no extra/comment metadata
no preamble/trailing bytes
exact staging membership/bytes and regular-file requirement
toolchain version captured as provenance but excluded from builder semantic identity
```

Research semantic projection digest:

```text
sha256:db3f64c9c43269fc5e6148ebafea67767d80d6e529b8c5d624df09913a754324
```

This is a research proof value, not the future production BCF algorithm. S0-E owns the production identity computation.

## 5. Artifact fallback verification

Successful run artifact:

```text
artifact id = 10136977496
artifact name = p1-231-s0d-builder-contract-authority-f8069080e25f6a1630ea7cd8df1f4d74b7d73557
retention = 7 days
GitHub-reported size = 461 bytes
GitHub-reported digest = sha256:f95b9e800d63f7c41e3abd4efcec63981f7cd987bd584850b477d06cf24097d4
```

The artifact ZIP was independently downloaded and re-hashed:

```text
ZIP size = 461 bytes
ZIP SHA-256 = f95b9e800d63f7c41e3abd4efcec63981f7cd987bd584850b477d06cf24097d4
contained files = 1
```

Contained file:

```text
p1-231-s0d-builder-contract-authority-output.txt
size = 349 bytes
SHA-256 = 1f8ab965f39e521287970c1510ddef83d44606d107e2f5a345a68044050e438b
```

Its content exactly matches the authoritative PASS line from the decoded raw job log.

## 6. Infrastructure note

The pinned `actions/upload-artifact` action succeeded. GitHub emitted the current Node.js 20 → 24 compatibility warning for the action implementation; this is temporary research workflow infrastructure and did not affect the model result or artifact digest.

## 7. Safety / non-activation boundary

This receipt proves research only. It does **not** claim:

```text
production release_builder_contract_v1.json exists
production BCF algorithm/verifier exists
official staging exists
official WebClip ZIP exists
V1 readiness semantics changed
release-gate policy activated
manifest version changed
real Chrome release QA passed
real Yandex L5 passed
release blocker review/final decision completed
tag/GitHub Release/deployment created
```

Current release readiness remains intentionally NOT READY.
