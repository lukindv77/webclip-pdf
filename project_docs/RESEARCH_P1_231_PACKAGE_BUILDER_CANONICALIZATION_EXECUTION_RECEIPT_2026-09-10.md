# WebClip — P1-231 package builder canonicalization execution receipt — 2026-09-10

Date: 2026-09-10  
Owner: `P1-231 | ACTIVE`  
Canonical source baseline: `main = 57e4ff8a3cc31a6a803cf8ef718be25f5bee53e9`  
Research branch: `research/p1-231-package-builder-canonicalization-2026-09-10`  
Mode: **RESEARCH-ONLY / CROSS-PLATFORM BUILDER CANONICALIZATION**  
Production/runtime/release-policy activation: **NONE**

This receipt records the committed-source execution evidence for the portable package-path and deterministic ZIP builder model. It records both the failed initial toolchain assumption and the successful corrected cross-platform matrix. The synthetic ZIP fixture is not a WebClip release package.

---

## 1. Negative evidence: Python 3.12.14 is not a portable Windows/Linux builder pin

Initial matrix execution:

```text
run = 34430368492
execution SHA = d4817e395ccb90185789b0bae9b38bc1270afe96
workflow = .github/workflows/p1-231-package-builder-canonicalization-research.yml
```

Linux job:

```text
job = 102724429298
runner = ubuntu-24.04
conclusion = success
model = PASS; cases=138
fixture_zip_bytes = 510
fixture_zip_sha256 = 1db2cd15c7decdd0e380aab31363f12d75268d90573eb6ef46723b5287f740d7
```

Windows job:

```text
job = 102724429454
runner = windows-2025
conclusion = failure before model execution
failed step = Set up Python
exact error = The version '3.12.14' with architecture 'x64' was not found for Windows 2025.
model step = skipped
```

Interpretation:

```text
The first Windows failure does NOT contradict the package/ZIP model.
The model did not run on Windows.
It disproves only the research assumption that Python 3.12.14 can be used as one portable pinned builder runtime across the selected official GitHub-hosted Linux and Windows runners.
```

The evidence document was corrected before PR review: the proposed common builder pin became Python `3.12.10`.

---

## 2. Positive evidence: corrected Python 3.12.10 matrix

Successful matrix execution:

```text
run = 34430621429
run attempt = 1
execution SHA = 2599e5138e3893724f2b857dbe59a9c2a5c0cb7c
workflow = .github/workflows/p1-231-package-builder-canonicalization-research.yml
matrix = ubuntu-24.04 + windows-2025
Python = 3.12.10
Node.js = 22.23.2
```

### 2.1 Linux

```text
job = 102725182108
runner = ubuntu-24.04
checkout = 2599e5138e3893724f2b857dbe59a9c2a5c0cb7c
Python = 3.12.10
Node.js = 22.23.2
conclusion = success
```

Exact model output:

```text
P1-231 package builder canonicalization model: PASS; cases=138; package_paths=33; path_profile=portable-ascii-v1; fixture_zip_bytes=510; fixture_zip_sha256=1db2cd15c7decdd0e380aab31363f12d75268d90573eb6ef46723b5287f740d7
```

Diagnostic artifact:

```text
artifact id = 10134342605
artifact name = p1-231-package-builder-canonicalization-Linux-2599e5138e3893724f2b857dbe59a9c2a5c0cb7c
GitHub artifact-wrapper SHA-256 = 51841c08df7f7b6e8830af27126b9c5b6fb7a7c17fef2f5fab219c35d0a1ea75
wrapper size = 387 bytes
contained files = 1
contained output file size = 221 bytes
```

### 2.2 Windows

```text
job = 102725182159
runner = windows-2025
checkout = 2599e5138e3893724f2b857dbe59a9c2a5c0cb7c
Python = 3.12.10
Node.js = 22.23.2
conclusion = success
```

Exact model output:

```text
P1-231 package builder canonicalization model: PASS; cases=138; package_paths=33; path_profile=portable-ascii-v1; fixture_zip_bytes=510; fixture_zip_sha256=1db2cd15c7decdd0e380aab31363f12d75268d90573eb6ef46723b5287f740d7
```

Diagnostic artifact:

```text
artifact id = 10134344195
artifact name = p1-231-package-builder-canonicalization-Windows-2599e5138e3893724f2b857dbe59a9c2a5c0cb7c
GitHub artifact-wrapper SHA-256 = be2afbc456a45cb0b7745946866457213eb8134dfc63e12c07b2ee0b138fecc0
wrapper size = 387 bytes
contained files = 1
contained output file size = 221 bytes
```

---

## 3. Independent artifact fallback verification

Both GitHub diagnostic artifact ZIPs were downloaded independently through the Actions artifact endpoint and inspected outside the job log.

Observed wrapper SHA-256 values matched GitHub metadata exactly:

```text
Linux wrapper  = 51841c08df7f7b6e8830af27126b9c5b6fb7a7c17fef2f5fab219c35d0a1ea75
Windows wrapper = be2afbc456a45cb0b7745946866457213eb8134dfc63e12c07b2ee0b138fecc0
```

The wrapper ZIP bytes are different. This is expected because the GitHub artifact archive is a transport wrapper produced by `upload-artifact`; it is not the proposed canonical WebClip release ZIP identity.

Each wrapper contained exactly one file named:

```text
p1-231-package-builder-canonicalization-output.txt
```

Each contained file was exactly 221 bytes and contained the identical line:

```text
P1-231 package builder canonicalization model: PASS; cases=138; package_paths=33; path_profile=portable-ascii-v1; fixture_zip_bytes=510; fixture_zip_sha256=1db2cd15c7decdd0e380aab31363f12d75268d90573eb6ef46723b5287f740d7
```

Therefore the raw-log result has an independent artifact fallback on both operating systems.

---

## 4. What this execution proves

For the committed research model and the selected execution environments:

```text
portable-ascii-v1 path validation semantics passed on Linux and Windows
33 current package paths passed the proposed portable profile
synthetic package member ordering is deterministic
fixed ZIP member metadata is deterministic
ZIP_STORED fixture serialization is byte-identical
Linux fixture ZIP bytes = Windows fixture ZIP bytes
fixture ZIP size = 510 bytes on both
fixture ZIP SHA-256 = 1db2cd15c7decdd0e380aab31363f12d75268d90573eb6ef46723b5287f740d7 on both
```

This is strong evidence that the proposed serializer contract can be made cross-platform reproducible without depending on source mtimes, filesystem enumeration order or compressor implementation.

---

## 5. What this execution does NOT prove

It does NOT prove any of the following:

```text
production package builder implemented
canonical package manifest implemented
production RPF implementation activated
real 33-file WebClip ZIP built
real staged Chrome QA directory built
Chrome unpacked QA passed
Chrome Web Store upload compatibility tested
release version advanced
release readiness promoted
GitHub Release created
Yandex L5 executed
```

The fixture is deliberately synthetic so that research can validate binary serializer semantics without creating or publishing a release artifact.

---

## 6. Toolchain observation

The temporary research workflow emitted a warning that the pinned `actions/upload-artifact` revision targets Node.js 20 and the hosted runner forced it to Node.js 24 because Node.js 20 is deprecated.

This warning does not affect the model result because diagnostic upload occurs after model execution and the uploaded output was independently verified. The temporary workflow is removed before PR review.

A future production/release workflow must independently select an immutable `upload-artifact` revision compatible with the then-current runner policy; this receipt does not promote the temporary research action revision into release policy.

---

## 7. Durable conclusion

The research conclusion for this tranche is:

```text
P1-231 portable package-path profile: supported by Linux + Windows committed-source evidence
P1-231 deterministic ZIP serializer model: supported by Linux + Windows byte-identical golden vector
cross-platform common Python pin: 3.12.10 supported for the tested matrix
Python 3.12.14 common pin: rejected by observed Windows runner availability
production activation: still absent
```

The next P1-231 layer should bind one immutable candidate SHA to one validated package-manifest semantic generation, one RPF, one staged-QA projection, and one exact release ZIP artifact identity without collapsing those distinct identities.