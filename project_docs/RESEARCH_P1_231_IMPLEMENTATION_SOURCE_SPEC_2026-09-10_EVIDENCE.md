# WebClip — P1-231 implementation source specification — 2026-09-10

Date: 2026-09-10  
Canonical source baseline: `main = 8e6689e5ed0a37a6bfd3050a91c6d08379354e70`  
Canonical owner: `P1-231 | ACTIVE`  
Research branch: `research/p1-231-implementation-source-spec-2026-09-10`  
Mode: **RESEARCH-ONLY / IMPLEMENTATION SOURCE SPECIFICATION**  
Production runtime change: **NONE**  
Canonical release-policy change: **NONE**  
Build/tag/Release/provider mutation: **NONE**

This tranche translates the already admitted P1-231 generation/settlement architecture into a concrete, package-atomic implementation plan against the current repository source. It does **not** implement or activate the release policy.

The existing Registry owner remains sufficient and is not changed:

```text
P1-231 | ACTIVE | Release readiness/external QA authority must be bound to the exact tested package/runtime generation and the applicable current release-contract generation; a non-empty evidence string or an older tested SHA cannot authorize a later release candidate unless byte-identical package/runtime state and the required current contract are proven.
```

No new P-code is allocated.

---

# 1. Fresh canonical source proof

Before this source-spec tranche:

```text
main = 8e6689e5ed0a37a6bfd3050a91c6d08379354e70
```

PR #181 was already squash-merged and post-merge Repository Integrity passed on that exact `main` commit.

Current source inspected at this exact baseline includes:

```text
project_tools/check_release_readiness.py
project_tools/test_release_readiness.py
project_tools/check_pr_change_contract.py
project_tools/test_pr_change_contract.py
.github/workflows/repository-integrity.yml
.github/workflows/release-gate.yml
manifest.json
project_docs/BUILD_AND_RECOVERY_RULES.md
project_docs/RELEASE_READINESS.md
project_docs/CONTEXT_MANIFEST.json
project_docs/USER_REQUIREMENTS.md
project_docs/DECISIONS_AND_RATIONALE.md
```

The source-spec does not infer implementation shape from old branches; current `main` is authoritative.

---

# 2. Current implementation boundaries

## 2.1 `check_release_readiness.py` is the existing gate authority

Current responsibilities:

- parses `WEBCLIP_RELEASE_READINESS_V1` from `RELEASE_READINESS.md`;
- checks manifest version;
- checks clean checkout;
- resolves optional expected SHA and compares it with checkout `HEAD`;
- checks terminal `pass` / `approved` state;
- checks only that paired evidence strings are non-empty/non-placeholder.

Current missing P1-231 responsibilities:

- no structured release receipt schema;
- no tested source identity per evidence slot;
- no RPF/QCF/RCF validation;
- no exact tested-source ancestry/durability rule;
- no latest-attempt settlement;
- no append-only receipt history;
- no current-main official authority rule;
- no execution-workflow identity rule.

The implementation should preserve `check_release_readiness.py` as the human-facing readiness coordinator but move identity/evidence semantics into dedicated reusable modules rather than turning this file into a monolith.

## 2.2 `check_pr_change_contract.py` already owns runtime/package classification

Current code defines:

```text
RUNTIME_SUFFIXES = .js/.html/.css/.png/.svg/.ico/.webp
RUNTIME_DIRS = assets, icons
manifest.json = runtime
```

and `is_runtime_path(path)` is used to decide PR runtime impact.

Therefore P1-231 must **not** create a second package classifier with a separate list.

The classifier must be extracted/shared so that the same authority is used by:

```text
PR change classification
RPF computation
future release/package builder
future release artifact provenance
```

## 2.3 Current permanent CI insertion points

`repository-integrity.yml` currently runs:

```text
repository checks
research/context checks
CI pinning
PR change contract
release readiness status/self-test
JavaScript syntax
all project_tools/test_*.js
recovery archive self-test
```

P1-231 permanent deterministic validation belongs before release-readiness evaluation so malformed identity config/receipts cannot be hidden behind a later readiness result.

`release-gate.yml` currently:

```text
workflow_dispatch(candidate_sha, candidate_version)
checkout candidate_sha
prove checkout
repository checks
syntax/tests/recovery
check_release_readiness.py gate
```

This workflow is read-only, which should remain true.

---

# 3. External research validation

External evidence is comparison input, not automatic WebClip policy.

Sources reviewed for this implementation source-spec:

1. GitHub Actions contexts reference;
2. GitHub manual `workflow_dispatch` documentation;
3. GitHub workflow event reference;
4. in-toto Attestation Statement v1;
5. in-toto test-result predicate.

## 3.1 Tested subject digest + test configuration maps directly to RPF + QCF

The in-toto Statement model binds an assertion to an immutable `subject` identified by digest.

The in-toto `test-result` predicate additionally includes test `configuration` alongside result state.

That supports the WebClip architecture:

```text
physical test subject -> RPF
applicable test configuration -> QCF(kind)
result -> PASS / FAIL / inconclusive
```

It does not replace WebClip policy; blocker review and user release decision remain project-specific assertions.

## 3.2 GitHub workflow execution identity is a separate authority

GitHub documents:

```text
github.ref
github.sha
github.workflow_ref
github.workflow_sha
```

For `workflow_dispatch`, the branch/tag receiving the dispatch determines `GITHUB_REF`/`GITHUB_SHA`. GitHub UI/CLI/API can dispatch against a selected branch/tag after the workflow exists on the default branch.

Therefore this schedule is possible in principle:

```text
workflow definition from ref A
input candidate_sha = B
job checks out B
```

The current release gate proves only checkout B.

A future official P1-231 gate must also prove the **executing workflow definition** is current and belongs to the same candidate authority.

---

# 4. New refinement: execution-workflow generation

This is a refinement of P1-231, not a new root cause.

For official release mode require all of:

```text
github.ref == refs/heads/main
github.workflow_ref == <repo>/.github/workflows/release-gate.yml@refs/heads/main
github.workflow_sha == candidate_sha
fresh refs/remotes/origin/main == candidate_sha
checkout HEAD == candidate_sha
```

Why all are needed:

- `checkout HEAD == candidate_sha` proves the code being inspected;
- `workflow_sha == candidate_sha` proves the gate program itself comes from that candidate generation;
- `github.ref == main` forbids dispatching the official gate from another branch/tag;
- fresh `origin/main == candidate_sha` detects `main` advancing after dispatch but before/during the job.

Do not print the full `github` context to logs because it includes sensitive `github.token` data. Pass only the specific safe scalar identity fields required by the check.

Historical verification remains a separate non-release mode and may use arbitrary exact refs, but its result must be explicitly non-releasable.

---

# 5. New refinement: durable tested source must remain in canonical lineage

The previous P1-231 architecture required `testedSourceSha` to resolve.

That is not sufficient for official release evidence.

A PR branch head may be tested, then squash-merged to a different commit and eventually lose its branch ref. Even if GitHub retains some internal PR reference for a time, that is not the intended canonical source lineage.

For official evidence require:

```text
git merge-base --is-ancestor <testedSourceSha> <candidateSha>
```

in addition to resolution and RPF/QCF equality.

Preferred physical-QA choreography:

```text
main X = versioned/package-frozen candidate generation
real Chrome/Yandex test exact X
receipt/evidence-only PR merges -> main Y
RPF(X) == RPF(Y)
X is ancestor of Y
final gate evaluates Y
```

This creates a durable chain without ephemeral PR-head authority.

A non-ancestor commit may still be examined in `verification-only` mode, but cannot authorize an official release.

---

# Part I — proposed implementation modules

# 6. New `project_tools/release_identity_inputs_v1.json`

Purpose:

> one versioned declarative authority for package classification and release-contract projections.

Conceptual shape:

```json
{
  "schema": "webclip-release-identity-inputs/v1",
  "package": {
    "explicit": ["manifest.json"],
    "root_suffixes": [".js", ".html", ".css", ".png", ".svg", ".ico", ".webp"],
    "directories": ["assets", "icons"],
    "non_package_root_files": [".gitignore", "README.md", "GITHUB_REPOSITORY_STATE.md"],
    "non_package_directories": [".github", "project_docs", "project_tools"]
  },
  "release_contract": {
    "full": ["..."],
    "projections": {
      "unpacked-chrome": ["..."],
      "yandex-e2e": ["..."]
    }
  }
}
```

Exact arrays must be reviewed against the final implementation baseline; the example is not permission to silently change package composition.

## 6.1 Why explicit non-package classification is required

The current heuristic answers only:

```text
is this path known runtime?
```

P1-231 needs the stronger question:

```text
has every tracked path been intentionally classified?
```

Classification states:

```text
package
non-package
unknown
```

`unknown` is a hard error for identity/package/release tooling.

Examples:

```text
new root runtime.wasm -> unknown -> BLOCK
new root runtime-data.json -> unknown -> BLOCK
new vendor/foo.js -> unknown -> BLOCK
new project_docs/research.md -> known non-package
new assets/model.bin -> package
```

This fail-closed rule prevents topology drift where a future packaged file class is omitted from RPF merely because the original suffix list predates it.

## 6.2 Classifier definition itself is generation-sensitive

The identity configuration must have a canonical digest.

Receipts store the config/schema identity used to compute their fingerprints.

Changing classifier semantics invalidates older generation evidence unless compatibility is explicitly proven.

Conservative invalidation is preferred over silently interpreting an old receipt with new package topology rules.

---

# 7. New `project_tools/release_identity.py`

Purpose:

- load/strictly validate the identity input config;
- classify tracked paths exhaustively;
- compute RPF for current or historical Git refs;
- compute full RCF;
- compute QCF projections;
- validate tested-source resolution/ancestry;
- provide shared functions to other checkers/builders.

Recommended public functions:

```text
load_identity_config()
identity_config_digest()
classify_path(path)
assert_exhaustive_tree(ref)
package_paths(ref)
compute_rpf(ref)
compute_rcf(ref='HEAD')
compute_qcf(kind, ref='HEAD')
resolve_commit(ref)
is_ancestor(ancestor, descendant)
manifest_version_at(ref)
```

Exact names are not canonical; responsibilities are.

## 7.1 RPF canonical byte format

Do not hash prose representations or Git commit metadata.

Recommended deterministic structure:

```text
WEBCLIP_RPF_V1\0
identity-config-digest\0
for each package path sorted by UTF-8 byte/path order:
  uint32_be(path_byte_length)
  path_utf8_bytes
  uint64_be(file_byte_length)
  exact_file_bytes
```

SHA-256 over this stream is the RPF.

Properties:

- path rename changes RPF;
- exact content change changes RPF;
- docs/research content outside package does not change RPF;
- classifier schema/config change changes RPF conservatively;
- commit author/date/message do not change RPF.

Do not use Git blob SHA-1 as the external RPF because repository object format is not the package-byte identity contract.

## 7.2 Unsupported Git object types fail closed

For package paths:

- regular blobs supported;
- symlink-mode package entries should be rejected until explicitly designed/tested;
- submodule/tree surprises inside package classification should fail;
- missing classified package input fails.

## 7.3 Resource bounds

Identity computation itself must be bounded.

Initial conservative limits can be substantially above the current extension size, for example:

```text
max package files: 4096
max package bytes read for one RPF: 512 MiB
max contract files: 1024
max contract bytes: 128 MiB
```

Exact production numbers should be measured on current tree before merge.

Exceeding a bound is a blocker, not permission to silently omit files.

---

# 8. Full RCF and QCF inputs

The full contract input set should be centralized in the config.

Initial source-spec candidate set:

```text
project_docs/CONTEXT_MANIFEST.json
project_docs/USER_REQUIREMENTS.md
project_docs/DECISIONS_AND_RATIONALE.md
project_docs/RESEARCH_REGISTRY.md
project_docs/TEST_STATUS.md
project_docs/BUILD_AND_RECOVERY_RULES.md
project_docs/TEST_PLAN.md
project_docs/WEBCLIP_PDF_FIDELITY_CONTRACT.md
project_tools/check_release_readiness.py
project_tools/check_release_evidence.py
project_tools/release_identity.py
project_tools/release_identity_inputs_v1.json
project_tools/check_pr_change_contract.py
.github/workflows/release-gate.yml
```

The executing release workflow belongs to the full contract because changing the verifier changes the release assertion.

The mutable receipt ledger and current `RELEASE_READINESS.md` evidence values must not recursively make every receipt declaration invalidate itself.

## 8.1 Chrome QCF candidate projection

Should contain current sources defining physical browser acceptance, such as:

```text
USER_REQUIREMENTS.md
DECISIONS_AND_RATIONALE.md
RESEARCH_REGISTRY.md
TEST_STATUS.md
TEST_PLAN.md
WEBCLIP_PDF_FIDELITY_CONTRACT.md
release-evidence schema/config/checker pieces that define Chrome receipt semantics
```

Do not include unrelated Yandex-only provider details merely to maximize invalidation.

## 8.2 Yandex QCF candidate projection

Should contain current sources defining real OAuth/API/account/root/capability acceptance, including applicable requirements/decisions/Registry/test plan and receipt semantics.

The exact projection must be finalized after inspecting all current Yandex release-test contract sources during implementation preparation.

## 8.3 Projection safety rule

If a current release-critical contract file cannot be confidently classified into a projection:

```text
unknown projection relevance -> include conservatively or fail review
```

Do not silently exclude it for convenience.

---

# 9. New `project_tools/check_release_evidence.py`

Purpose:

> strict network-free validation and current-authority derivation over the version-controlled receipt ledger.

Recommended commands:

```text
status
gate --mode official --candidate-sha ... --expected-version ...
verify --candidate-sha ...
```

`verify`/`verification-only` is intentionally non-authorizing.

Responsibilities:

1. strict schema validation;
2. bounded receipt file enumeration;
3. duplicate receiptId rejection;
4. unique attemptSeq per authority key;
5. secret/capability-pattern rejection in metadata/summary;
6. testedSourceSha resolution;
7. official tested-source ancestry;
8. tested manifest version validation;
9. recompute tested RPF using the **current verifier/config**;
10. require receipt RPF equals recomputed tested RPF;
11. require tested RPF equals current candidate RPF;
12. recompute applicable QCF/RCF;
13. derive latest admitted attempt by max attemptSeq;
14. terminal current outcome evaluation;
15. expose a compact machine-readable/current summary to `check_release_readiness.py`.

No network or external URL dereference is required for ordinary gate correctness.

---

# 10. Receipt storage namespace

Proposed namespace:

```text
project_docs/release_evidence/receipts/
project_docs/release_evidence/summaries/
```

Alternative equivalent paths are acceptable if centralized before activation.

## 10.1 Receipt file is immutable after merge

Normal PR rules:

```text
A receipt file -> allowed if valid
M receipt -> reject
D receipt -> reject
rename receipt -> reject
```

Likewise for an external durable summary file if summaries are stored separately.

Correction is a new higher-sequence receipt.

## 10.2 Recommended receipt schema

Conceptual strict JSON:

```json
{
  "schema": "webclip-release-evidence/v1",
  "receiptId": "...",
  "kind": "unpacked-chrome",
  "attemptSeq": 1,
  "admitted": true,
  "testedSourceSha": "<40-hex>",
  "testedVersion": "0.9.9",
  "identityConfigDigest": "sha256:<64-hex>",
  "runtimeFingerprint": "sha256:<64-hex>",
  "contractFingerprint": "sha256:<64-hex>",
  "outcome": "pass",
  "evidenceRef": "github-actions:run/123/job/456",
  "summary": {"...": "bounded non-secret decisive facts"},
  "summarySha256": "sha256:<64-hex>"
}
```

Strict v1 should reject unknown fields rather than silently treating them as authoritative semantics.

A future schema version gets an explicit parser/migration policy.

## 10.3 Summary canonicalization

If `summary` is embedded:

```text
canonical JSON = UTF-8, sorted keys, no insignificant whitespace
summarySha256 = SHA256(canonical summary JSON)
```

The digest is not a substitute for Git history; it gives a stable exported identity for the decisive summary.

Bound summary size, for example <=32 KiB, and reject known secret/capability shapes.

## 10.4 Evidence reference is provenance/navigation only

Examples:

```text
github-actions:run/<run>/job/<job>
github-actions:artifact/<id>
project-evidence:<path>#<section>
manual-qa:<bounded-record-id>
```

Never:

```text
Bearer token
OAuth access/refresh token
signed Yandex transfer URL
GitHub token/PAT
browser profile secret
raw environment dump
```

Artifact expiry does not change the receipt outcome by itself because the bounded decisive summary remains canonical; however PASS must only be recorded after the physical source was actually inspected under the Actions/evidence procedure.

---

# Part II — PR append-only enforcement

# 11. Modify `check_pr_change_contract.py`

This change must be package-atomic with shared classifier extraction.

## 11.1 Replace local runtime classifier

Remove duplicate ownership from:

```text
RUNTIME_SUFFIXES
RUNTIME_DIRS
is_runtime_path()
```

and import/use shared classification from `release_identity.py`.

The PR checker may expose a compatibility wrapper `is_runtime_path()` for tests/callers, but its result must delegate to the shared package classifier.

## 11.2 Preserve status information in Git diff

Current `changed_files()` uses `git diff --name-only`, which cannot distinguish add/modify/delete/rename.

Add a status-aware function based on a NUL-safe command such as:

```text
git diff --name-status -z --find-renames <base>...<head>
```

Parse:

```text
A path
M path
D path
R old new
```

without whitespace/path ambiguity.

## 11.3 Protect immutable evidence namespace

Any existing receipt/summary path touched by:

```text
M
D
R/C from or to protected namespace
```

fails PR contract.

Only new `A` paths are accepted, and their content is validated by `check_release_evidence.py`.

## 11.4 Concurrent attempt sequence behavior

Two PRs may both initially choose `attemptSeq=N`.

After one merges, the second must rebase; full-ledger validation then sees duplicate `N` and fails until the second receipt receives `N+1`.

No timestamp tie-breaking is needed.

---

# 12. Modify `test_pr_change_contract.py`

Add deterministic cases for:

```text
new receipt A -> PASS
receipt M -> FAIL
receipt D -> FAIL
receipt rename -> FAIL
summary M/D/R -> FAIL
ordinary research doc M -> unaffected by immutable rule
new package topology unknown -> FAIL
shared package classifier parity with RPF classifier
concurrent duplicate attempt after rebase -> evidence checker FAIL
```

The P1-231 marker must appear in production owner tests when the implementation PR activates owner behavior.

---

# Part III — readiness integration

# 13. Modify `check_release_readiness.py`

Do not delete current human-readable readiness semantics abruptly.

Recommended transition behavior:

## 13.1 `status` mode

- validate current readiness declaration schema;
- validate release identity config/ledger structurally;
- derive evidence authority for the current checkout generation;
- report blockers without pretending pending WIP is an error.

## 13.2 terminal status authority

A V1 free-form string must no longer authorize terminal status.

If readiness says:

```text
unpacked_chrome_qa=pass
```

then `check_release_evidence.py` must independently derive current Chrome PASS for current RPF/QCF.

A newer FAIL/inconclusive/invalidated receipt blocks even if `RELEASE_READINESS.md` still says `pass`.

The evidence field may remain a human navigation/cache field during migration, but it is not authority.

If retained, safest rule is:

```text
human receipt pointer must equal derived current receiptId
```

so stale documentation becomes a blocker rather than misleading current state.

## 13.3 Gate mode

Gate succeeds only after:

```text
schema/version/clean checkout
+ official workflow/current-main identity proven by workflow
+ P1-231 evidence checker current-generation PASS
+ readiness declaration consistent with derived authority
```

---

# 14. Modify `test_release_readiness.py`

The current positive fixture demonstrates the P1-231 gap by using:

```text
fixture:chrome
fixture:yandex
fixture:blockers
fixture:decision
```

and receiving no blockers once status/version fields are terminal.

After activation, this positive fixture must be replaced.

Required negative cases:

```text
pass + arbitrary evidence string + no receipt -> BLOCK
pass + old RPF receipt -> BLOCK
pass + old QCF receipt -> BLOCK
pass + latest FAIL -> BLOCK
pass + latest invalidated -> BLOCK
approved + old RCF decision -> BLOCK
unresolvable tested source -> BLOCK
non-ancestor tested source in official mode -> BLOCK
```

Required positive cases:

```text
current RPF/QCF PASS receipts
current full-RCF blocker review
current full-RCF approved final decision
readiness declaration consistent with derived current receipts
```

---

# Part IV — permanent workflow changes

# 15. Modify `repository-integrity.yml`

Permanent deterministic ordering should become approximately:

```text
repository consistency/hygiene
research/context/CI hygiene
release identity configuration validation
release identity self-test
PR change contract exact diff
PR change contract self-test
release evidence ledger validation
release evidence self-test
release readiness status
release readiness self-test
JS syntax/tests
recovery archive self-test
```

Why evidence validation before readiness:

> readiness consumes evidence authority; malformed evidence must not be interpreted indirectly as ordinary pending state.

No write permission is needed.

---

# 16. Modify `release-gate.yml`

## 16.1 Preserve read-only permission

Keep:

```text
permissions:
  contents: read
```

No release mutation belongs in the gate.

## 16.2 Pass safe workflow identity scalars

Add environment values from GitHub contexts, for example conceptually:

```text
DISPATCH_REF = github.ref
WORKFLOW_REF = github.workflow_ref
WORKFLOW_SHA = github.workflow_sha
```

Do not dump full `github` context.

## 16.3 Prove executing workflow/candidate/current-main equality before expensive tests

Early fail-closed step:

```text
require DISPATCH_REF == refs/heads/main
require WORKFLOW_SHA == CANDIDATE_SHA
require WORKFLOW_REF == expected main release-gate path/ref
fresh fetch origin main
require origin/main == CANDIDATE_SHA
require checkout HEAD == CANDIDATE_SHA
require clean tree
```

This should occur before the expensive deterministic suite.

If `main` advanced after dispatch:

```text
BLOCK immediately
```

The user can dispatch a new gate against the new current main; physical QA may remain reusable if RPF/QCF prove unchanged.

## 16.4 Historical verification is not the official workflow

Prefer a separate CLI/tool mode rather than adding an easy UI toggle that could be confused with official approval.

If workflow-level historical verification is later needed, it should have a different name/job/result and cannot emit `READY for release`.

---

# Part V — post-gate release TOCTOU boundary

# 17. There is currently no publishing workflow in this source-spec

The canonical current gate intentionally does not build/tag/publish.

Therefore P1-231 source-spec does not invent a release mutation workflow now.

Future release action must receive:

```text
gatedCandidateSha
releaseGateRunId
```

and immediately before tag/build/Release must fresh-check:

```text
origin/main == gatedCandidateSha
```

If not equal:

```text
STOP; new gate required
```

This prevents a green gate becoming a floating authorization after main changes.

The final release tag remains the immutable released source pointer under current build policy.

---

# Part VI — implementation tranches and activation boundary

# 18. S0 — passive identity foundation

Can be implemented without changing release readiness authority **after normal implementation authorization**, because it introduces no release-state promotion.

Candidate files:

```text
+ project_tools/release_identity_inputs_v1.json
+ project_tools/release_identity.py
+ project_tools/test_release_identity.py
~ project_tools/check_pr_change_contract.py   # delegate package classifier
~ project_tools/test_pr_change_contract.py
~ .github/workflows/repository-integrity.yml  # run identity self-test
```

Acceptance:

- current tree exhaustively classified;
- no runtime/package composition changed;
- unknown topology fails deterministic fixture;
- current PR runtime classifications remain compatible;
- RPF docs/runtime/manifest/asset controls pass.

This is the safest first P1-231 production tooling tranche.

---

# 19. S1 — passive receipt ledger + immutability guard

Candidate files:

```text
+ project_tools/check_release_evidence.py
+ project_tools/test_release_evidence.py
+ project_docs/<release-evidence schema documentation>
~ project_tools/check_pr_change_contract.py
~ project_tools/test_pr_change_contract.py
~ .github/workflows/repository-integrity.yml
```

Behavior remains passive with respect to release authorization:

- ledger may be empty;
- existing current readiness stays NOT READY;
- receipt schema/append-only rules are enforced;
- no `pass` is synthesized;
- release gate still does not trust receipts until activation tranche.

---

# 20. S2 — policy activation package

**Do not implement silently.**

This tranche changes canonical release authority and therefore requires explicit review/approval of the release-policy change before writes.

Package-atomic candidate files include at minimum:

```text
project_tools/release_identity.py
project_tools/release_identity_inputs_v1.json
project_tools/check_release_evidence.py
project_tools/test_release_identity.py
project_tools/test_release_evidence.py
project_tools/check_release_readiness.py
project_tools/test_release_readiness.py
project_tools/check_pr_change_contract.py
project_tools/test_pr_change_contract.py
.github/workflows/repository-integrity.yml
.github/workflows/release-gate.yml
project_docs/RELEASE_READINESS.md
project_docs/BUILD_AND_RECOVERY_RULES.md
applicable TEST_PLAN / test-status / architecture docs
P1-231 durable implementation evidence
```

The two-phase decision model must also be approved before canonical policy text changes:

```text
candidate-formation authorization
!=
final explicit release decision
```

A partial activation is forbidden because mixed old/new authority would recreate the root cause.

---

# 21. Why S0/S1 may be separate but S2 must be atomic

Safe passive state:

```text
new identity/checker code exists
but no release status is promoted by it
```

Unsafe mixed active state examples:

```text
release gate checks RPF but PR guard still allows receipt mutation
readiness trusts receipts but workflow can run stale workflow_sha
workflow checks current main but blocker/final decision still free-form
receipt checker active but RCF/QCF config not current-authority bound
```

Therefore activation must cross all authority boundaries together.

---

# Part VII — package topology design

# 22. Current package classification compatibility

At current baseline the established runtime/package classifier recognizes:

```text
manifest.json
root *.js
root *.html
root *.css
root *.png/*.svg/*.ico/*.webp
assets/**
icons/**
```

Current root repository metadata/non-runtime domains include at least:

```text
.gitignore
README.md
GITHUB_REPOSITORY_STATE.md
.github/**
project_docs/**
project_tools/**
```

The initial shared classifier should preserve current package semantics and add only fail-closed `unknown` detection.

Do not opportunistically include/exclude additional extension files in the same P1-231 tooling refactor; actual package composition changes are a separate runtime/build decision.

---

# 23. Future package builder integration

Current canonical policy describes building the user ZIP from exact release commit/tag, but P1-231 research has not identified a dedicated authoritative extension ZIP builder in current `project_tools`.

Future builder should import the same package-path authority from `release_identity.py`.

It should then prove:

```text
builder input path set == RPF path set
```

and emit:

```text
source commit/tag
RPF
ZIP SHA-256
```

This prevents a third package-list implementation drifting from PR classification and RPF.

Do not create a builder merely to close P1-231 if the actual release workflow is not yet being implemented.

---

# Part VIII — receipt sequencing and concurrency

# 24. Authority key

Current receipt settlement key remains:

```text
(kind, runtimeFingerprint, contractFingerprint)
```

where contract fingerprint is:

```text
Chrome -> QCF(unpacked-chrome)
Yandex -> QCF(yandex-e2e)
blocker review -> full RCF
release decision -> full RCF
```

## 24.1 Sequence allocation

For a new admitted receipt:

```text
attemptSeq = max(existing sequence for authority key) + 1
```

The generator/helper may compute the suggestion, but validation is authoritative.

## 24.2 Two simultaneous PRs

If both are created from the same baseline with sequence N:

- either PR may pass independently before merge;
- once the first merges, the second must rebase;
- duplicate sequence then fails;
- second receipt is reissued as N+1.

This is ordinary optimistic concurrency through Git, not a reason for external mutable coordination storage.

---

# Part IX — exact failure schedules

# 25. Stale workflow definition

```text
main contains P1-231 gate at commit B
operator dispatches release-gate from old branch/ref A
candidate_sha = B
job checks out B
```

Old design can run A's workflow program against B.

Target:

```text
github.ref != refs/heads/main OR workflow_sha != B
-> BLOCK before tests
```

---

# 26. Main advances after dispatch

```text
dispatch at main B
workflow_sha = B
before job check, main advances to C
candidate input = B
```

Target:

```text
fresh origin/main = C != B
-> BLOCK
```

If C is evidence/docs-only and RPF/QCF unchanged, a new gate on C can reuse applicable physical receipts.

---

# 27. Ephemeral PR-head physical QA

```text
real Chrome tested branch P
PR squash-merges as main M
P is not ancestor of M
RPF(P) == RPF(M)
```

Even with byte equality, official receipt bound to P is undesirable because P is not canonical durable lineage.

Target:

```text
official receipt testedSourceSha=P
ancestor(P,M)=false
-> BLOCK
```

Preferred:

```text
test exact main M
then evidence docs produce descendant E
```

---

# 28. New unknown packaged topology

```text
PR adds runtime.wasm
old suffix list does not recognize .wasm
```

Old heuristic could classify as non-runtime implicitly.

Target:

```text
classify(runtime.wasm)=unknown
-> PR/identity check BLOCK
```

The developer must explicitly update versioned package classifier and prove whether `.wasm` is package or non-package.

---

# 29. New FAIL after recorded PASS

```text
receipt 1 PASS for R/Q
receipt 2 FAIL for R/Q
RELEASE_READINESS still says pass and points to receipt 1
```

Target:

```text
latest admitted sequence = receipt 2
current outcome = FAIL
readiness stale pointer/status cannot override
-> BLOCK
```

---

# 30. Artifact expires

```text
receipt PASS merged
bounded decisive summary remains in Git
artifact later expires
```

Target:

```text
receipt remains historical/current generation evidence according to policy
artifact URL availability is not reinterpreted as result state
```

If later review finds the original evidence invalid, append `invalidated`; do not rewrite the old receipt.

---

# Part X — deterministic source-spec model

# 31. Companion model

This tranche includes:

```text
project_tools/test_p1_231_implementation_source_spec_model.js
```

Local-first drafting execution produced:

```text
P1-231 implementation source-spec model: PASS; cases=51
```

The model covers:

- exhaustive package/non-package/unknown classifier;
- unknown root `.wasm`/`.json`/new directory failure;
- RPF sensitivity/stability;
- classifier-config generation sensitivity;
- official workflow `main/workflow_sha/current-main/candidate` equality;
- historical verification-only non-release semantics;
- tested-source ancestor requirement;
- add-only receipt/summary paths;
- stale free-form/readiness pointer inability to authorize;
- S2 package-atomic activation with explicit policy approval;
- post-gate main-head TOCTOU recheck.

Local execution is drafting evidence only; committed-source CI is required before this source-spec is integrated.

---

# Part XI — exact implementation order

# 32. Recommended P1-231 tooling sequence

When production/tooling implementation is authorized:

```text
P1-231/S0-1  shared exhaustive package classifier + identity config
P1-231/S0-2  deterministic RPF/RCF/QCF computation + self-tests
P1-231/S0-3  PR runtime classifier delegates to shared identity authority
P1-231/S1-1  strict receipt schema/ledger parser + self-tests
P1-231/S1-2  status-aware PR diff + append-only guard
P1-231/S1-3  passive repository-integrity validation
--- explicit release-policy approval boundary ---
P1-231/S2-1  readiness consumes derived receipt authority
P1-231/S2-2  official release gate binds dispatch/workflow/current-main/candidate identity
P1-231/S2-3  canonical build/release policy switches to candidate-formation + final-decision model
P1-231/S2-4  non-publishing end-to-end rehearsal
P1-231/S2-5  real release qualification uses new receipt flow
```

S0/S1 should not be conflated with extension runtime Wave 1 implementation. They are release-tooling infrastructure and can be developed independently as long as they remain passive.

---

# 33. Acceptance for S0

Must prove:

1. every tracked current path gets package/non-package classification;
2. unknown topology fixture fails;
3. current package path set exactly matches prior classifier semantics;
4. docs-only change preserves RPF;
5. runtime/manifest/icon/assets changes alter RPF;
6. config/schema change alters identity conservatively;
7. historical ref computation works from exact Git objects;
8. missing/unsupported package object fails closed;
9. computation respects explicit count/byte budgets;
10. `check_pr_change_contract.py` no longer owns a duplicate package list.

---

# 34. Acceptance for S1

Must prove:

1. strict receipt schema and bounds;
2. no secret-like metadata;
3. receiptId uniqueness;
4. sequence uniqueness per authority key;
5. current outcome is highest admitted sequence;
6. PASS->FAIL/inconclusive/invalidated blocks;
7. later PASS recovers without history rewrite;
8. tested SHA must resolve;
9. official mode requires tested SHA ancestor of candidate;
10. RPF/QCF/RCF are recomputed, not trusted from receipt text;
11. receipt/summary M/D/R is blocked by PR checker;
12. only A of valid new immutable evidence is accepted;
13. empty ledger + current pending readiness remains valid WIP/NOT READY.

---

# 35. Acceptance for S2 activation

Requires explicit release-policy approval first.

Must then prove atomically:

1. arbitrary free-form terminal evidence no longer authorizes release;
2. current receipt authority overrides stale readiness pointer;
3. executing workflow ref is `main`;
4. executing workflow SHA equals candidate SHA;
5. fresh current main equals candidate SHA;
6. checkout equals candidate SHA and is clean;
7. current Chrome RPF/QCF receipt PASS;
8. current Yandex RPF/QCF receipt PASS;
9. current blocker review RPF/full-RCF PASS;
10. final decision RPF/full-RCF APPROVED;
11. old tested source cannot be a non-ancestor in official mode;
12. docs-only evidence commit may reuse QA only under proven RPF/QCF equality;
13. runtime change automatically blocks old physical evidence;
14. relevant QCF change automatically blocks corresponding physical evidence;
15. full RCF change refreshes blocker review/final decision;
16. gate stays read-only;
17. publish action separately rechecks main before effect.

---

# Part XII — relationship to the wider WebClip implementation plan

# 36. P1-231 does not reorder runtime production-entry dependencies

Runtime entry remains separately researched around:

```text
A0 -> U0 -> J0 passive v8 -> A1/A2 -> B0/B1 -> W5 AUTH-CORE -> D0/F -> C0/C1 -> D2
```

P1-231 tooling can proceed in parallel because it does not change extension runtime/package bytes until/if release policy or package builder integration is activated.

Do not delay correctness work merely to finish release tooling, but do not reach final Chrome/Yandex release closure without P1-231 active authority.

---

# 37. Real Chrome and Yandex boundary remains unchanged

This source-spec is deterministic architecture evidence only.

It does not prove:

- unpacked Chrome release QA;
- Yandex OAuth/API L5;
- final package bytes;
- release decision;
- release readiness.

Real Yandex L5 remains the final external stage after production code is ready and applicable deterministic/browser prerequisites are closed.

---

# 38. No canonical policy mutation in this tranche

The source-spec recommends changing the release choreography to distinguish:

```text
candidate-formation authorization
final explicit release decision
```

but current canonical `BUILD_AND_RECOVERY_RULES.md`, `RELEASE_READINESS.md` and `release-gate.yml` are intentionally unchanged here.

Implementation of S2 is blocked on explicit approval of that policy change.

This preserves the project rule that architecture/current-policy changes are not silently made merely because research proposes them.

---

# 39. Final source-spec conclusion

The minimal safe P1-231 implementation is not “add SHA fields to RELEASE_READINESS”.

It is a chain of authorities:

```text
one exhaustive package classifier
-> versioned identity config
-> RPF / full RCF / QCF
-> immutable admitted receipt ledger
-> deterministic latest-attempt settlement
-> add-only PR protection
-> readiness derives, never invents, evidence authority
-> official gate binds dispatch ref + workflow SHA + current main + candidate checkout
-> tested source is durable candidate ancestor
-> final release action rechecks main before side effect
```

The newly identified **workflow execution identity** and **tested-source canonical ancestry** requirements are essential: without them, exact candidate checkout alone is insufficient.

P1-231 remains:

```text
ACTIVE
```

until implementation plus direct non-publishing rehearsal and applicable real release evidence close it.
