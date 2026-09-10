# WebClip — P1-231 S0-C release-contract / QA-projection authority source specification — 2026-09-10

Date: 2026-09-10  
Canonical baseline: `main = d67b2d1c00472c8606c07b2ad56619487a8a5ffa`  
Owner: `P1-231 | ACTIVE`  
DAG node: **S0-C — release-contract projection authority**  
Mode: **RESEARCH-ONLY / PASSIVE SOURCE SPECIFICATION**  
Production/runtime change: **NONE**  
Release-policy activation: **NONE**  
Physical Chrome/Yandex QA: **NOT RUN**

No new P-code is allocated. `RESEARCH_REGISTRY.md` is unchanged.

---

## 1. Canonical predecessor state

This source specification starts after canonical PR #189.

```text
main = d67b2d1c00472c8606c07b2ad56619487a8a5ffa
post-merge Repository Integrity run = 34434996986
job = 102738099954
95 deterministic JavaScript test files; failures=0
Recovery archive self-test PASS
release readiness = NOT READY; same five blockers
```

The P1-231 identity chain already requires five independent axes:

```text
Git/execution authority
logical package identity RPF
acceptance-contract identity QCF/full RCF
candidate-local generation consistency
builder/container identity BCF + exact artifact SHA-256
```

This tranche owns only the third axis: **what current release contract makes evidence sufficient**.

It must not own:

```text
package membership
package bytes / RPF
source-generation execution
builder/ZIP serialization / BCF
receipt outcome/latest-attempt settlement
readiness mutation
release approval
```

---

## 2. Canonical settlement semantics preserved

Retain the already-canonical P1-231 settlement rule:

```text
Chrome QA authority = RPF + QCF(unpacked-chrome)
Yandex QA authority = RPF + QCF(yandex-e2e)
blocker review authority = RPF + full RCF
final release decision authority = RPF + full RCF
```

Consequences:

```text
Chrome-only acceptance change
-> Chrome QCF changes
-> Chrome PASS becomes stale
-> Yandex PASS may remain current

Yandex-only acceptance change
-> Yandex QCF changes
-> Yandex PASS becomes stale
-> Chrome PASS may remain current

release-process/checker-only change
-> full RCF changes
-> blocker review/final decision become stale
-> physical Chrome/Yandex PASS need not rerun if their QCFs are unchanged

package byte/topology change
-> RPF changes independently
-> both physical evidence classes become stale through RPF mismatch
```

QCF/RCF MUST NOT participate directly in RPF.

---

## 3. New finding: raw mutable status/evidence documents cannot be direct QCF/full-RCF blob inputs

Earlier settlement research suggested an initial full-RCF list containing current authority documents including `TEST_STATUS.md`.

Fresh inspection shows that `TEST_STATUS.md` mixes two different semantic classes:

1. current normative release-QA requirements; and
2. mutable current/historical evidence/status narrative, including concrete past browser runs.

Likewise:

```text
RELEASE_READINESS.md
TEST_EVIDENCE.md
future release_evidence/receipts/**
future release_evidence/summaries/**
```

are evidence/status surfaces by design.

If a QCF or full RCF simply hashes those complete files, this schedule is possible:

```text
contract C
Chrome PASS for RPF R / QCF C
record PASS evidence in mutable status file
-> raw status-file bytes change
-> contract fingerprint changes to C2
-> newly recorded PASS is immediately stale
```

That is a self-invalidation recursion, not a useful contract identity.

### S0-C rule

Machine contract authority must be separated from mutable evidence/status payloads.

Therefore v1 MUST NOT use the complete bytes of these as direct contract inputs:

```text
project_docs/RELEASE_READINESS.md
project_docs/TEST_STATUS.md
project_docs/TEST_EVIDENCE.md
project_docs/release_evidence/receipts/**
project_docs/release_evidence/summaries/**
```

Human documents may reference/report S0-C authority, but evidence recording must not change QCF/RCF merely because a PASS narrative or receipt pointer was added.

This refines the earlier broad full-RCF example; it does not weaken current V1 readiness policy, which remains canonical until S2.

---

## 4. Proposed passive authority file

Conceptual future production filename from the existing DAG:

```text
project_tools/release_contract_inputs_v1.json
```

Exact filename may be adjusted during implementation review; semantic ownership must remain singular.

Proposed schema:

```json
{
  "schema": "webclip-release-contract-inputs/v1",
  "fingerprint_profile": "webclip-contract-fingerprint-v1",
  "full_rcf": {
    "blob_inputs": [
      ".github/workflows/release-gate.yml",
      "project_docs/BUILD_AND_RECOVERY_RULES.md",
      "project_docs/CONTEXT_MANIFEST.json",
      "project_docs/DECISIONS_AND_RATIONALE.md",
      "project_docs/RESEARCH_REGISTRY.md",
      "project_docs/TEST_PLAN.md",
      "project_docs/USER_REQUIREMENTS.md",
      "project_docs/WEBCLIP_PDF_FIDELITY_CONTRACT.md",
      "project_tools/check_pr_change_contract.py",
      "project_tools/check_release_readiness.py"
    ]
  },
  "projections": {
    "unpacked-chrome": { "...": "..." },
    "yandex-e2e": { "...": "..." }
  }
}
```

The authority manifest's **canonical semantic projection** participates in full RCF. Do not hash the manifest as an opaque self-referential blob and then embed its resulting digest back into itself.

---

## 5. Why the initial full-RCF blob set is conservative but bounded

The retained exact-blob roots are current stable decision/requirement/tooling authorities:

```text
CONTEXT_MANIFEST.json
USER_REQUIREMENTS.md
DECISIONS_AND_RATIONALE.md
RESEARCH_REGISTRY.md
BUILD_AND_RECOVERY_RULES.md
TEST_PLAN.md
WEBCLIP_PDF_FIDELITY_CONTRACT.md
check_release_readiness.py
check_pr_change_contract.py
release-gate.yml
```

A change to any one may conservatively require a new blocker review/final decision. That is comparatively cheap and safe.

The expensive physical QA projections are intentionally narrower and are owned by the structured projection clauses below.

`TEST_STATUS.md` remains valuable current human truth and source evidence for constructing the initial S0-C projection, but once S0-C lands as a passive machine authority, physical release-QA requirement changes must update the relevant S0-C projection deliberately rather than relying on arbitrary prose-diff inference.

---

## 6. QCF is normative acceptance semantics, not attempt metadata

A QCF projection describes **what must be proven**, not one particular test execution.

QCF MUST include/version concepts such as:

```text
projection schema generation
subject class
execution/environment policy
required case families
required assertion semantics
fixture/profile semantics when frozen
```

QCF MUST NOT include one attempt's:

```text
GitHub run/job id
wall-clock timestamp
actual browser patch version
runner hostname/temporary path
actual Yandex account identifier
actual Yandex root locator
OAuth token/Authorization header
signed transfer URL
artifact-retention URL
evidenceRef
receiptId/attemptSeq/outcome
```

Those belong to immutable execution evidence/receipt/summary and are validated later by S0-G.

The candidate RPF is also not part of QCF; receipt authority is the pair `RPF + QCF`.

---

## 7. Initial `unpacked-chrome` QCF projection

Proposed projection identity:

```text
kind = unpacked-chrome
schema = webclip-qa-contract/unpacked-chrome/v1
subject = staged-unpacked
```

Environment-policy tokens:

```text
real-unpacked-mv3
chrome-or-chrome-for-testing
browser-version-recorded-in-receipt
browser-meets-candidate-minimum
no-enterprise-policy-bypass
real-user-permission-ui
real-extension-debugger-path
real-download-boundary
```

### 7.1 Case family `chrome.unpacked-load`

Required assertions:

```text
staged-file-set-equals-package
staged-bytes-equal-candidate-git-blobs
staged-rpf-equals-candidate-rpf
manifest-v3
real-unpacked-extension-load
extension-startup-operational
```

This prevents repository-root testing from being confused with the actual staged extension package.

### 7.2 Case family `chrome.optional-host-permission`

Required assertions:

```text
real-user-grant
real-user-deny
revoke
regrant
cross-origin-frame
navigation
reload
stale-frame-or-document-fails-closed
```

Current `TEST_STATUS.md` explicitly requires the real Chrome extension permission UI including grant/deny/revoke and frame navigation/reload scenarios.

### 7.3 Case family `chrome.debugger-print`

Required assertions:

```text
actual-extension-chrome-debugger
actual-page-print-to-pdf
selected-or-full-document-contract-as-applicable
render-fidelity-contract
bounded-failure-is-truthful
no-policy-bypass
```

A managed/mock browser boundary is useful engineering evidence but does not satisfy this release family by itself.

### 7.4 Case family `chrome.download-save-as`

Required assertions:

```text
automatic-download
native-save-as
terminal-downloaditem-truth
complete-and-interrupted-handling
late-settlement-reconciliation
restart-recovery
no-duplicate-start-after-unknown
```

The exact native dialog remains user-owned; bounded caller timeouts cannot fabricate cancellation.

---

## 8. Initial `yandex-e2e` QCF projection

Proposed projection identity:

```text
kind = yandex-e2e
schema = webclip-qa-contract/yandex-e2e/v1
subject = live-yandex-provider
```

Environment-policy tokens:

```text
real-yandex-rest-api
real-oauth
immutable-live-account-root-context
account-root-capability-recorded-without-secret
same-rpf-runtime-generation
no-secret-in-receipt
no-signed-transfer-url-in-durable-evidence
```

### 8.1 Case family `yandex.oauth-context`

Required assertions:

```text
real-oauth
account-identity
root-identity
capability-identity
reauth-fencing
manual-resume-after-reauth
account-switch-fails-stale-context
root-switch-fails-stale-context
```

### 8.2 Case family `yandex.remote-effects`

Required assertions:

```text
upload
exact-remote-byte-verification
move
exact-object-reconciliation
publish
unpublish
delete
namespace-ownership
```

### 8.3 Case family `yandex.backup-restore`

Required assertions:

```text
backup
restore
selected-object-binding
staging-receipt-binding
no-destructive-retarget
journal-generation-admission
```

### 8.4 Case family `yandex.failure-settlement`

Required assertions:

```text
transport-failure
timeout
started-unknown
reconciliation
retry-no-duplicate-effect
restart-recovery
auth-expiry
account-root-switching
```

Real Yandex L5 remains the final external qualification stage. S0-C merely defines the contract; it does not execute it.

---

## 9. Current repository support for these projections

Current `TEST_STATUS.md` release boundary already requires at minimum:

Chrome:

```text
real unpacked Manifest V3 execution
real Chrome extension permission UI with grant/deny/revoke + frame navigation/reload
real chrome.debugger / Page.printToPDF path
real automatic download / native Save As / terminal DownloadItem + late-settlement/recovery
```

Yandex:

```text
real Yandex OAuth/API E2E for account/auth/root/capability identity
real upload/move/publish/unpublish/delete/backup/restore
failure/timeout/unknown settlement
account/root switching scenarios
```

The proposed QCF case families are a normalized machine-contract projection of those current release boundaries, not a newly invented release requirement.

Historical browser/Yandex engineering evidence remains historical evidence and is not automatically migrated into P1-231 receipts.

---

## 10. External comparison evidence

External sources are comparison evidence only and do not silently become WebClip policy.

### Chrome for Testing

Chrome documents Chrome for Testing as a versioned Chrome flavor specifically for automation/testing and reproducible browser selection.

```text
https://developer.chrome.com/docs/automation-and-testing/chrome-for-testing
https://developer.chrome.com/docs/automation-and-testing/download-test-binaries
```

Applicable lesson:

```text
actual browser build belongs in execution evidence/receipt
contract may specify allowed browser family/version policy
```

### Chrome optional permissions

Chrome documents `chrome.permissions.request`, `contains` and `remove`, with optional host permissions granted at runtime.

```text
https://developer.chrome.com/docs/extensions/reference/api/permissions
```

Applicable lesson:

```text
grant/deny/remove/regrant is a real browser acceptance boundary, not a mocked boolean
```

### Chrome debugger

Chrome documents `chrome.debugger` as an extension API requiring the `debugger` manifest permission and notes enterprise policy can restrict attachment.

```text
https://developer.chrome.com/docs/extensions/reference/api/debugger
```

Applicable lesson:

```text
release QA must exercise the actual extension debugger path and must not bypass enterprise policy merely to manufacture PASS
```

### Chrome downloads

Chrome documents `DownloadItem.state` values including:

```text
in_progress
interrupted
complete
```

```text
https://developer.chrome.com/docs/extensions/reference/api/downloads
```

Applicable lesson:

```text
terminal browser download truth belongs in the Chrome release acceptance contract
```

### Yandex Disk REST API

Yandex documents OAuth-authenticated REST access to a user's Disk files and upload capability.

```text
https://yandex.ru/dev/disk/rest/
```

Applicable lesson:

```text
mocked service-worker boundaries do not substitute for final real OAuth/API qualification
```

Project-specific account/root/object/effect settlement rules remain owned by WebClip research/requirements, not by Yandex documentation.

---

## 11. Strict authority parser

The future S0-C authority parser should reuse the same fail-closed principles already established for S0-A/S0-B:

```text
bounded raw bytes
UTF-8 only
UTF-8 BOM forbidden
duplicate object keys rejected before ordinary last-wins materialization
one JSON document
unknown fields rejected
unknown schema/fingerprint profile rejected
wrong/missing types rejected
bounded list/string sizes
ASCII stable identifiers/tokens
```

No arbitrary:

```text
command
args
env
shell
script
URL-to-execute
```

belongs in release contract authority.

Execution mapping is owned elsewhere.

---

## 12. Closed v1 schema shape

Top-level keys exactly:

```text
schema
fingerprint_profile
full_rcf
projections
```

`full_rcf` keys exactly:

```text
blob_inputs
```

Projection keys exactly:

```text
schema
subject
environment_policy
cases
```

Case keys exactly:

```text
id
assertions
```

V1 projection names exactly:

```text
unpacked-chrome
yandex-e2e
```

Unknown projection/schema/field fails closed rather than being ignored.

---

## 13. Canonicalization

All list/set-like semantic collections must canonicalize independently from JSON formatting and source array order.

Conceptual canonical ordering:

```text
UTF-8 unsigned byte lexical order
```

Require uniqueness before sorting:

```text
full-RCF blob paths
projection environment-policy tokens
case IDs within projection
assertion tokens within case
```

Case IDs are globally prefixed by projection domain (`chrome.*`, `yandex.*`) to remain diagnostic and stable.

QCF semantic projection excludes `full_rcf.blob_inputs`.

Full RCF semantic projection includes:

```text
S0-C schema/fingerprint generation
canonical full-RCF input path set
canonical full contents of both QCF projection definitions
```

then exact Git blob bytes for every full-RCF input path.

Thus:

```text
Chrome projection change -> Chrome QCF changes + full RCF changes
Yandex projection change -> Yandex QCF changes + full RCF changes
full-RCF-only blob change -> full RCF changes, QCFs unchanged
JSON formatting/order-only change -> no semantic fingerprint change
```

---

## 14. Exact candidate Git object rule for full-RCF blobs

For candidate `C`, every declared full-RCF `blob_input` must resolve from the exact candidate Git tree.

V1 admit:

```text
type = blob
mode = 100644
```

Reject:

```text
missing path
tree/directory
symlink 120000
executable 100755
gitlink/submodule 160000
unexpected object mode/type
```

Do not read a mutable workspace file that differs from candidate Git object bytes when computing official identity.

---

## 15. Mutable evidence/status exclusion is explicit and fail-closed

The parser/validator should reject forbidden full-RCF input paths/prefixes:

```text
project_docs/RELEASE_READINESS.md
project_docs/TEST_STATUS.md
project_docs/TEST_EVIDENCE.md
project_docs/release_evidence/receipts/
project_docs/release_evidence/summaries/
```

This is not because those files are unimportant. It is because they carry **evidence/status**, not stable release-contract semantics.

If future project design creates a dedicated stable normative machine block in one of these files, admitting that semantic block requires an explicit schema revision/source-spec update; do not silently hash the whole mixed-purpose file.

---

## 16. Fingerprint separation

Future S0-E computes identities; S0-C only owns projection semantics.

Conceptual:

```text
QCF(kind) = H(
  WEBCLIP_QCF_V1:<kind>
  + canonical S0-C projection(kind)
)

full RCF = H(
  WEBCLIP_RCF_V1
  + canonical S0-C full semantic projection
  + each declared full-RCF input path + exact candidate Git blob bytes
)
```

S0-C does not calculate RPF or BCF and does not settle receipts.

No QCF/full-RCF field contains:

```text
current RPF
artifact SHA
attemptSeq
outcome
release decision
```

---

## 17. QCF invalidation matrix

Required deterministic behavior:

| Change | Chrome QCF | Yandex QCF | full RCF |
|---|---|---|---|
| Chrome case/assertion/policy change | change | same | change |
| Yandex case/assertion/policy change | same | change | change |
| release-gate/checker blob change | same | same | change |
| Registry/current requirements/decision blob change | same | same | change |
| `RELEASE_READINESS` evidence/status update | same | same | same |
| `TEST_STATUS` evidence narrative update | same | same | same |
| receipt/summary append | same | same | same |
| package/runtime byte change only | same | same | same (unless a listed contract blob also changed) |
| builder-only BCF change | same | same | full RCF changes only if policy root explicitly changes |
| JSON formatting/order only | same | same | same |

Note: package/runtime changes invalidate physical evidence through RPF, not QCF.

---

## 18. Synchronization rule after passive S0-C introduction

Once the production S0-C authority file exists on `main` (still passive), it becomes the machine owner for **physical release-QA contract projections**.

Therefore future changes that intentionally alter physical release acceptance must update the corresponding projection in the same PR.

Human `TEST_STATUS.md`/`TEST_PLAN.md` may describe or navigate the same policy, but they do not silently mutate QCF by prose alone.

A later repository-integrity/PR-contract integration may enforce this synchronization explicitly. S0-C source specification itself does not modify current PR policy.

---

## 19. Receipt boundary for later S0-G

A future admitted physical QA receipt must carry, at minimum, the exact subject-generation/contract bindings required by settlement:

Chrome:

```text
kind = unpacked-chrome
testedSourceSha
runtimeFingerprint = RPF
contractFingerprint = QCF(unpacked-chrome)
attemptSeq
outcome
browser build identity in durable summary
evidenceRef + durableSummaryDigest
```

Yandex:

```text
kind = yandex-e2e
testedSourceSha
runtimeFingerprint = RPF
contractFingerprint = QCF(yandex-e2e)
attemptSeq
outcome
non-secret account/root/capability context identity in durable summary
evidenceRef + durableSummaryDigest
```

Actual secrets are forbidden.

S0-C does not define latest-attempt settlement; S0-G owns that.

---

## 20. Interaction with staged Chrome subject

The Chrome projection's subject is explicitly:

```text
staged-unpacked
```

Before physical scenarios begin, later staging/identity components must prove:

```text
staged file set == S0-A package paths
staged bytes == candidate Git package blobs
staged RPF == candidate RPF
S0-F candidate-generation consistency PASS
```

This is why browser build metadata is not enough: the actual extension subject must be bound to RPF.

---

## 21. Interaction with Yandex L5

S0-C may define `yandex-e2e` contract semantics, but **real Yandex L5 remains S2-E / final external qualification**.

Research-only deterministic models may validate schema/fingerprint/invalidation logic with fixtures. They must not:

```text
obtain OAuth credentials
call live Yandex APIs
create/move/publish/delete live objects
mutate a user's Disk
claim Yandex E2E PASS
```

---

## 22. Current Chrome harness boundary

`project_tools/test_p1_007_browser_harness.js` proves engineering harness shape and checks that the normal path uses a real unpacked MV3 runner while the managed path executes production scripts with mocked external boundaries.

That harness is valuable evidence, but its implementation bytes are not automatically a QCF input.

Reason:

```text
QCF = what must be proven
harness implementation = how one attempt proves it
```

If a harness bug later invalidates an earlier PASS, append a higher-sequence `invalidated` receipt under S0-G settlement semantics. Do not redefine QCF merely to rewrite history unless the acceptance contract itself changed.

---

## 23. Source-spec model acceptance

The accompanying deterministic model should prove at least:

1. strict raw parser rejects BOM, invalid UTF-8, duplicate keys, unknown fields and unknown schema/profile;
2. exactly two v1 projections exist and unknown projection fails closed;
3. exact expected projection schemas/subjects are enforced;
4. case/environment/assertion identifiers are bounded, unique and canonicalized;
5. Chrome/Yandex QCFs are independent;
6. modifying one projection changes only that QCF plus full RCF;
7. full-RCF-only blob change changes only full RCF;
8. mutable evidence/status paths are forbidden as full-RCF inputs;
9. evidence/receipt values are absent from QCF semantics;
10. RPF/BCF/artifact/attempt fields are absent from QCF semantics;
11. current full-RCF inputs resolve as exact Git blobs/mode `100644`;
12. current `TEST_STATUS.md` contains the release-boundary markers represented by initial QCF case families;
13. current browser harness remains engineering evidence rather than projection authority;
14. semantic fingerprints are invariant under JSON key/list ordering where collections are set-like;
15. QCF/full-RCF digests are independently addressable.

---

## 24. Machine error taxonomy

Recommended fail-closed S0-C errors:

```text
RELEASE_CONTRACT_MANIFEST_TOO_LARGE
RELEASE_CONTRACT_MANIFEST_UTF8_INVALID
RELEASE_CONTRACT_MANIFEST_BOM_FORBIDDEN
RELEASE_CONTRACT_MANIFEST_JSON_INVALID
RELEASE_CONTRACT_MANIFEST_DUPLICATE_KEY
RELEASE_CONTRACT_MANIFEST_UNKNOWN_FIELD
RELEASE_CONTRACT_MANIFEST_SHAPE_INVALID
RELEASE_CONTRACT_SCHEMA_UNSUPPORTED
RELEASE_CONTRACT_FINGERPRINT_PROFILE_UNSUPPORTED
RELEASE_CONTRACT_PROJECTION_SET_INVALID
RELEASE_CONTRACT_PROJECTION_INVALID
RELEASE_CONTRACT_CASE_INVALID
RELEASE_CONTRACT_INPUT_INVALID
RELEASE_CONTRACT_MUTABLE_EVIDENCE_INPUT_FORBIDDEN
RELEASE_CONTRACT_GIT_OBJECT_INVALID
```

Human text is diagnostic only; orchestration must use stable machine codes.

---

## 25. Non-claims

This tranche does **not**:

```text
create production release_contract_inputs_v1.json
implement release_identity.py
modify current TEST_STATUS/TEST_PLAN/requirements/decisions
modify V1 RELEASE_READINESS semantics
modify release-gate.yml
modify check_release_readiness.py
modify check_pr_change_contract.py
build/stage a real extension candidate
run real unpacked Chrome release QA
run real Yandex OAuth/API/L5
bump manifest version
create tag/GitHub Release/deployment
```

No runtime/package bytes, `manifest.json`, Registry status or release blocker state are changed.

---

## 26. Conclusion

S0-C should be a **versioned, strict, machine-readable acceptance-contract authority**, not an inferred hash of mixed-purpose prose/status files.

The central invariant is:

```text
QCF = normative physical acceptance semantics
receipt = one observed attempt under that QCF
RPF = tested package subject
full RCF = broader current release-decision contract
```

This prevents both false reuse and unnecessary expensive reruns while avoiding evidence self-invalidation.
