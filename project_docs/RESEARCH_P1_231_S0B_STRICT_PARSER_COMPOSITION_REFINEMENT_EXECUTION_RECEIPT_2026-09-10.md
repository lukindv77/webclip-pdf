# WebClip — P1-231 S0-B strict parser / composition refinement execution receipt — 2026-09-10

Date: 2026-09-10  
Owner: `P1-231 | ACTIVE`  
Mode: **RESEARCH-ONLY EXECUTION RECEIPT**

This receipt binds the deterministic committed-source proof for:

```text
project_docs/RESEARCH_P1_231_S0B_STRICT_PARSER_COMPOSITION_REFINEMENT_2026-09-10_EVIDENCE.md
project_tools/test_p1_231_s0b_strict_parser_composition_refinement_model.js
```

It is execution evidence only. GitHub `main` remains canonical project state.

---

## 1. Canonical baseline before this refinement

Fresh checked immediately before the durable refinement writes and again immediately before this receipt:

```text
repository = lukindv77/webclip-pdf
main = ed4425bbc33d5b5052d3807debbd5f17d831026b
```

That baseline already contains canonical PR #188 S0-B source-generation authority research.

Its post-merge Repository Integrity proof was independently read before this refinement:

```text
run = 34434375861
job = 102736300225
exact checkout = ed4425bbc33d5b5052d3807debbd5f17d831026b
S0-B predecessor model = PASS; cases=72
94 deterministic test files; failures=0
Recovery archive self-test PASS
release readiness = NOT READY; same five blockers
```

---

## 2. Committed-source proof identity

Temporary read-only research workflow:

```text
.github/workflows/p1-231-s0b-parser-composition-refinement-research.yml
```

Exact execution identity:

```text
repository = lukindv77/webclip-pdf
run = 34434708456
attempt = 1
job = 102737262260
job name = research
execution SHA = ac5fecf9b2def204ad3a36afae9cfd289425e4a6
branch = research/p1-231-package-generation-authority-schema-2026-09-10
runner = ubuntu-24.04
Node.js = 22.23.2
GITHUB_TOKEN permissions = Contents: read; Metadata: read
```

Pinned external actions observed in the full decoded log:

```text
actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1
actions/setup-node@820762786026740c76f36085b0efc47a31fe5020
actions/upload-artifact@330a01c490aca151604b8cf639adc76d48f6c5d4
```

The full decoded job log was fetched and read.

---

## 3. Exact deterministic result

Syntax check:

```text
node --check project_tools/test_p1_231_s0b_strict_parser_composition_refinement_model.js
-> success
```

Execution command:

```text
node project_tools/test_p1_231_s0b_strict_parser_composition_refinement_model.js
```

Exact output:

```text
P1-231 S0-B strict parser/composition refinement model: PASS; cases=77; relations=1; chaining=v1-forbidden; strict_raw_parser=true; topology_sha256=aa61b0263c81cfb102ce7567408c5409b03f5a3f6630d2d7e5c8bebdc8e564f1; current_psl_windows_portable=false; head=ac5fecf9b2def204ad3a36afae9cfd289425e4a6
```

Interpretation:

- raw-byte strict parsing matrix passed;
- duplicate-key/BOM/invalid-UTF8/closed-field failures passed;
- v1 no-generation-chaining rule passed;
- current bootstrap remains exactly one relation;
- topology digest remains identical to canonical #188 semantic topology digest;
- the Windows PSL portability blocker remains explicitly unresolved.

---

## 4. Artifact fallback proof

GitHub artifact metadata:

```text
artifact id = 10135740452
name = p1-231-s0b-parser-composition-refinement-ac5fecf9b2def204ad3a36afae9cfd289425e4a6
expired = false
wrapper size = 441 bytes
wrapper SHA-256 = a370698de76795d2f7fa0c62e2ac5f29c9f7e69db024414ff2fa3124565b4d40
retention = 7 days
```

The artifact ZIP was downloaded independently and re-hashed locally:

```text
local wrapper size = 441 bytes
local wrapper SHA-256 = a370698de76795d2f7fa0c62e2ac5f29c9f7e69db024414ff2fa3124565b4d40
match GitHub metadata = true
```

Contained files:

```text
count = 1
p1-231-s0b-parser-composition-refinement-output.txt
size = 296 bytes
SHA-256 = 1aa3ad769e7a34e7157f57581eb39a629fbd7ced08f05cc54993f9121441d4bc
```

Contained text exactly reproduces the deterministic PASS line from the full raw job log.

This physically exercises both primary raw-log access and the canonical diagnostic artifact fallback path.

---

## 5. Warning classification

The workflow emitted the known GitHub-hosted warning that the pinned `actions/upload-artifact` implementation targets Node 20 and GitHub currently forces it to Node 24.

This warning occurred after the model itself had already passed and did not change the uploaded output or job conclusion.

It is not classified as an S0-B model failure in this receipt. Supply-chain/pinning policy remains governed by the repository CI rules rather than by this temporary research workflow.

---

## 6. What this proof establishes

For the committed research model at exact SHA `ac5fecf9...`:

```text
strict raw parser semantics are executable
closed top-level/relation schema semantics are executable
arbitrary command/args/env fields fail closed
v1 generation output cannot feed any generation input/generator
ordinary non-generated dependency sharing remains legal
semantic generation topology remains unchanged
exact bootstrap Git object checks remain compatible with #188
PSL Windows byte-portability defect remains open
```

This is an additive refinement to canonical #188, not a replacement for its Linux/Windows evidence.

---

## 7. Non-claims / safety

This proof did NOT:

```text
create production release_source_generation_v1.json
create/activate production S0-B verifier
modify build_public_suffix_js.py
fix Windows newline portability
modify runtime/package bytes
modify manifest.json/version
modify RESEARCH_REGISTRY.md
modify RELEASE_READINESS.md
activate release-gate policy
build a real WebClip release ZIP
run Chrome release QA
run Yandex L5
create tag/GitHub Release/deployment
```

No secrets or production data were requested or emitted.

---

## 8. Cleanup requirement

The temporary workflow is evidence infrastructure only and must be deleted before the owner PR. The final PR should contain only durable research/model/receipt files.

Expected durable tranche:

```text
project_docs/RESEARCH_P1_231_S0B_STRICT_PARSER_COMPOSITION_REFINEMENT_2026-09-10_EVIDENCE.md
project_docs/RESEARCH_P1_231_S0B_STRICT_PARSER_COMPOSITION_REFINEMENT_EXECUTION_RECEIPT_2026-09-10.md
project_tools/test_p1_231_s0b_strict_parser_composition_refinement_model.js
```
