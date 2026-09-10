# WebClip — P1-231 package topology census and package-authority correction — 2026-09-10

Date: 2026-09-10  
Canonical source baseline: `main = ca2f5edc9626575a0e78ca7a988b5fc328e1fcaf`  
Canonical owner: `P1-231 | ACTIVE`  
Mode: **RESEARCH-ONLY / PACKAGE TOPOLOGY CENSUS**  
Production runtime change: **NONE**  
Canonical release-policy activation: **NONE**  
Build/tag/Release/provider mutation: **NONE**

This tranche refines the already-canonical P1-231 implementation source specification after an exact census of the current repository/package topology and historical release construction. It corrects one over-broad statement in the prior source-spec: the current PR `is_runtime_path()` heuristic must not become the sole package-content authority.

The Registry owner remains sufficient and is unchanged:

```text
P1-231 | ACTIVE | Release readiness/external QA authority must be bound to the exact tested package/runtime generation and the applicable current release-contract generation; a non-empty evidence string or an older tested SHA cannot authorize a later release candidate unless byte-identical package/runtime state and the required current contract are proven.
```

No new P-code is allocated.

---

## 1. Fresh canonical evidence

The source census was performed against exact canonical `main`:

```text
ca2f5edc9626575a0e78ca7a988b5fc328e1fcaf
```

PR #182 was already squash-merged and post-merge Repository Integrity passed on this exact SHA:

```text
run = 34429066881
job = 102720467682
88 deterministic test files
failures = 0
Recovery archive self-test PASS
```

Release readiness remained intentionally `NOT READY` with the existing five blockers. This tranche does not promote any release evidence.

---

## 2. Current root topology census

The exact root at the baseline contains three control/source directories:

```text
.github/
project_docs/
project_tools/
```

There are currently no root `assets/` or `icons/` directories.

### 2.1 Current extension payload candidates

The current root contains 33 files that form the present extension payload candidate set:

```text
content-injection-guard.js
content.js
frame-agent.js
frame-proxy-budget-guard.js
frame-proxy-inert-guard.js
host-control-activation-guard.js
journal-import-digest.js
journal-import-stream.js
journal-restore-envelope-guard.js
journal-text-filter.js
journal.css
journal.html
journal.js
local-download-identity.js
manifest.json
offscreen-blob-admission-guard.js
offscreen-bootstrap.js
offscreen.html
offscreen.js
operation-log-redaction-guard.js
options.css
options.html
options.js
pdf-print-guard.js
popup.css
popup.html
popup.js
prepared-save-as.js
public-suffix.js
service-worker.js
yandex-auth-help.css
yandex-auth-help.html
yandex-auth-help.js
```

Breakdown:

```text
23 x .js
5  x .html
4  x .css
1  x manifest.json
33 files total
```

This list is a **census of the current baseline**, not permission for a future builder to infer package membership from suffix alone.

### 2.2 Current root non-package/control/source files

The remaining root files are:

```text
.gitignore
GITHUB_REPOSITORY_STATE.md
README.md
public_suffix_list.dat
```

The first three are repository/control documentation.

`public_suffix_list.dat` is materially different: it is a **source-generation input**. `project_tools/build_public_suffix_js.py` reads it and writes the generated runtime file `public-suffix.js`.

Current runtime then loads `public-suffix.js` from `service-worker.js`:

```text
importScripts('public-suffix.js', ...)
```

No current runtime read of `public_suffix_list.dat` was found. Therefore `.dat` is not current runtime payload evidence; it is source-generation provenance/input.

This distinction matters because package content, runtime impact and source-generation inputs are related but are not identical sets.

---

## 3. Confirmed weakness in the current PR classifier

Current `project_tools/check_pr_change_contract.py` uses:

```text
RUNTIME_SUFFIXES = .js/.html/.css/.png/.svg/.ico/.webp
RUNTIME_DIRS = assets, icons
manifest.json = runtime
```

This is a PR-impact heuristic. It answers approximately:

> does this path look like current/future extension runtime?

It does **not** prove:

> is this exact path included in the release ZIP?

Nor does it model:

> is this path a source-generation input whose change requires regeneration/consistency checks?

The previous P1-231 source-spec said that this checker "already owns runtime/package classification" and proposed extracting it as one shared authority. The census refines that statement:

```text
runtime impact != package content != source-generation input
```

These concepts may share one declarative topology configuration, but they must remain separate classifications with separate semantics.

---

## 4. Historical release construction evidence

A historical diagnostic prerelease provides concrete evidence of the old artifact-construction behavior.

Release:

```text
v0.9.8-build-20260825-1935-p1-153-diag
source snapshot = 558618b8ff0ab382008e6bcf800a97aaf07a5053
artifact SHA-256 = 5bea0e810d9d32f3732786d399ef01819db41bf891e571288ef340bc26873586
```

The one-shot workflow deleted in that source commit contained:

```bash
git archive --format=zip --output="$artifact" HEAD
```

Therefore that historical diagnostic artifact was a Git archive of the whole tracked tree, not a separately staged extension payload.

This is historical evidence only. It does not become the future official release policy.

### 4.1 Why raw `git archive HEAD` is incompatible with P1-231 settlement semantics

The canonical P1-231 architecture intentionally permits this sequence:

```text
main X = package-frozen tested state
real QA on X
receipt/evidence-only commits
main Y
RPF(X) == RPF(Y)
final release gate on Y
```

If the official user ZIP is `git archive HEAD`, then a receipt/evidence-only commit changes ZIP bytes by adding/changing `project_docs/**`. Consequently:

```text
ZIP(X) != ZIP(Y)
```

and a package fingerprint over the actual archive must also change.

That destroys the intended separation between package generation and evidence/contract generation.

Therefore future official P1-231 release construction cannot use whole-repository `git archive HEAD` as its package-content definition.

---

## 5. External platform comparison

External material was used only as comparison/evidence input.

Official Chrome documentation states that:

- an unpacked extension is loaded from a directory containing `manifest.json` at its root;
- the Chrome Web Store upload is a ZIP containing the extension files;
- `manifest.json` must be at the root of that ZIP.

Chrome does not define WebClip's source-repository-to-package projection for us. It does not say that a Git repository root is automatically the release payload, nor does it derive all ZIP members from manifest references.

Therefore the project itself must define which tracked source paths become extension package members.

---

## 6. Architecture correction: package-content authority

### 6.1 Separate authorities

Future implementation should expose three related classifications:

```text
PackageMembership:
  package
  non-package
  unknown

RuntimeImpact:
  runtime-sensitive
  not-runtime-sensitive
  unknown

SourceGenerationRole:
  generated-output
  generation-input
  ordinary
  unknown
```

The exact enum names may differ. The semantic separation is mandatory.

### 6.2 `unknown` remains fail-closed

For package/release identity:

```text
unknown package membership -> BLOCK
```

Examples:

```text
new root runtime.wasm       -> unknown package membership -> BLOCK
new root runtime-data.json  -> unknown package membership -> BLOCK
new vendor/foo.js           -> unknown top-level directory -> BLOCK
new project_docs/foo.md     -> known non-package
new project_tools/tool.py   -> known non-package/control
```

A future package directory such as `assets/` becomes package content only after the versioned topology authority explicitly admits it.

---

## 7. Recommended S0 correction: explicit package manifest

The implementation source-spec should be refined from one generic `release_identity_inputs_v1.json` package heuristic into an explicit package topology contract.

Recommended split:

```text
project_tools/extension_package_manifest_v1.json
project_tools/release_identity_inputs_v1.json
project_tools/release_identity.py
project_tools/build_extension_package.py
```

The exact file names are proposals; responsibilities are the important contract.

### 7.1 `extension_package_manifest_v1.json`

Purpose:

> exact versioned authority for repository path -> extension package projection.

For the current baseline it should enumerate the 33 package root files explicitly rather than rely on root suffix matching.

Conceptual shape:

```json
{
  "schema": "webclip-extension-package/v1",
  "root_files": [
    "manifest.json",
    "content.js",
    "... exact current list ..."
  ],
  "recursive_directories": [],
  "known_non_package_root_files": [
    ".gitignore",
    "GITHUB_REPOSITORY_STATE.md",
    "README.md",
    "public_suffix_list.dat"
  ],
  "known_non_package_directories": [
    ".github",
    "project_docs",
    "project_tools"
  ]
}
```

Future package subdirectories must be explicitly admitted.

### 7.2 Why exact current root files are better than suffix rules

A suffix rule such as `*.js` silently admits every new root JavaScript file into the official package before package intent is reviewed.

An exact list instead makes topology changes visible:

```text
new root helper.js -> unknown -> PR fails -> reviewer decides package/non-package
```

This is the desired fail-closed behavior for release identity.

### 7.3 Package manifest itself is generation-sensitive

The package-manifest digest must participate in RPF identity.

Changing package membership rules changes release generation even when currently selected file bytes happen to remain equal, unless explicit compatibility is proven.

---

## 8. One builder and one RPF projection

Future `build_extension_package.py` and `compute_rpf()` must consume the **same** `package_paths(ref)` authority.

Required invariant:

```text
set(staged ZIP members) == set(package_paths(ref))
```

The builder must not have an independent include/exclude list.

The RPF should remain independent of ZIP container metadata such as timestamps/compression implementation. It fingerprints canonical member paths + exact member bytes + package-manifest generation.

A separate final artifact SHA-256 fingerprints the actual ZIP bytes after construction.

Thus:

```text
RPF = logical extension package generation
artifact SHA-256 = exact generated ZIP container
```

Both are useful and neither substitutes for the other.

---

## 9. Staged package directory for Chrome QA

To align real unpacked QA with the future release payload, the preferred future physical-QA input is no longer the whole repository checkout.

Preferred flow:

```text
exact clean commit X
-> package_paths(X)
-> deterministic staged extension directory
-> load staged directory as unpacked extension
-> real Chrome QA
-> receipt binds RPF(X)
-> final builder uses same package_paths(X/Y)
```

This prevents `project_docs/**`, `.github/**`, test tools and source-only generation inputs from becoming accidental QA/package surface.

The current README instruction to load the repository checkout remains valid for ordinary development until a staged QA workflow is deliberately implemented. This research does not change that current policy.

---

## 10. Source-generation input contract

`public_suffix_list.dat` demonstrates that source-generation provenance needs its own consistency rule.

Current relationship:

```text
public_suffix_list.dat
  + project_tools/build_public_suffix_js.py
  -> public-suffix.js
```

The existing `test_public_suffix.js` validates behavior/count sanity of the committed generated JS, but does not prove that regenerating from the current `.dat` produces byte-identical `public-suffix.js`.

A future passive deterministic check should therefore be able to prove:

```text
regenerate in temporary location
-> exact bytes == committed generated output
```

This check concerns source reproducibility/consistency. The package RPF still fingerprints the generated `public-suffix.js` that is actually shipped.

A source-generation input change without regenerated output should fail repository consistency rather than silently alter package identity.

This is recorded as a P1-231 implementation refinement because it protects exact package-generation truth; no separate P-code is allocated in this tranche.

---

## 11. Corrected S0 implementation order

The previous S0 plan is refined to:

```text
S0a — topology authority
  explicit extension package manifest
  exhaustive repository-path classification
  package manifest self-test

S0b — package projection
  package_paths(ref)
  staged package builder (non-publishing)
  builder/package-path equality test

S0c — release identity
  RPF over package_paths + exact member bytes + topology generation
  RCF/QCF over separate release-contract projections

S0d — PR coupling
  PR runtime-impact checker imports shared topology facts
  but retains distinct runtime-impact semantics

S0e — source-generation consistency
  deterministic regeneration checks for declared generated outputs
```

S1 immutable evidence ledger remains after these passive identity foundations.

S2 release-policy activation remains separately approval-gated and is not authorized by this research.

---

## 12. Acceptance model for future implementation

Minimum deterministic cases for package topology:

1. current 33-file baseline has no unknown package paths;
2. package manifest requires `manifest.json` exactly once;
3. every package path resolves to a regular blob/file;
4. no package path resides under `.github/`, `project_docs/`, `project_tools/`;
5. `public_suffix_list.dat` is known non-package generation input;
6. changing `public-suffix.js` changes RPF;
7. changing `public_suffix_list.dat` alone does not change logical package RPF;
8. regeneration mismatch between `.dat` and generated JS fails source consistency;
9. docs-only changes do not change RPF;
10. package manifest change changes RPF generation;
11. new unknown root file fails closed;
12. new unknown root directory fails closed;
13. staging output member set equals package_paths;
14. whole-repository `git archive` member set is rejected as official package projection;
15. unsupported symlink/submodule package member fails closed.

Additional existing P1-231 generation/settlement/workflow/ancestry cases remain required.

---

## 13. Correction to the prior implementation source-spec

The following prior statement is superseded by this refinement:

```text
check_pr_change_contract.py already owns runtime/package classification
therefore no second package classifier should exist
```

Corrected statement:

```text
one declarative topology authority may feed multiple consumers,
but package membership and runtime impact are separate semantic projections.

The explicit package manifest owns release ZIP membership.
The PR checker owns PR-impact policy and consumes topology facts.
The RPF and builder consume the package-membership projection.
```

No previously admitted P1-231 evidence is invalidated by this correction. This is a narrowing/strengthening of the implementation design before S0 exists.

---

## 14. Release impact

This tranche performs no release action.

Still pending and unclaimed:

```text
manifest target/version alignment
real unpacked Chrome release QA
real Yandex E2E/L5
release blockers review
explicit release decision
build/tag/GitHub Release
```

No real Chrome/Yandex test is required to validate this research-only topology model.

---

## 15. Conclusion

The package-topology census closes an important ambiguity before implementation begins.

The decisive architecture is now:

```text
canonical Git commit
  -> explicit versioned package topology
  -> package_paths(ref)
       -> staged unpacked QA directory
       -> RPF logical package identity
       -> extension ZIP builder
  -> ZIP artifact SHA-256

separately:
  release contract inputs -> RCF/QCF
  evidence receipts -> settlement/release authority
```

This preserves the intended property that evidence/docs-only commits can advance release-contract/evidence state without silently changing the extension package generation, while any actual package topology or byte change invalidates RPF deterministically.
