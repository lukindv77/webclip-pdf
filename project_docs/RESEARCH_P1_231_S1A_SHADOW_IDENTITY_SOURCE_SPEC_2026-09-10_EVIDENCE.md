# P1-231 — S1-A shadow identity source specification

Date: 2026-09-10
Status: research/source-spec only; no production or release-policy activation
Canonical base for this tranche: `dddfa79982c8c5f4b819cd3aba7224629f615751`
Canonical Registry blob at tranche start: `9623d8d03b4c900708d43cc2e59bf606a378d505`
Owner: `P1-231`

## 1. Purpose

Define the first S1 integration node from the consolidated P1-231 release-governance DAG:

```text
S1-A-shadow-identity
  deps = S0-E-identity-engine
       + S0-F-generation-gate
       + S0-I-pr-checker-integration
  owner = repository-integrity-shadow
  mutatesCanonicalPolicy = false
```

S1-A is the boundary where the passive S0 identity/admission authorities become a permanent-CI **shadow report** for the exact checked-out candidate. It does not become an official release gate, does not update `RELEASE_READINESS.md`, does not mint evidence receipts and does not build a WebClip product ZIP.

## 2. Why a shadow layer is required

The current release/readiness stack is still V1 and current `main` intentionally remains `NOT READY`. S0-F also correctly reports `blocked-portability` because the current `public_suffix_list.dat -> public-suffix.js` generator relation is not proven Windows-portable.

If the first CI integration treated every valid S0-F non-pass state as a process failure, ordinary WIP CI would become permanently red before the known prerequisite is implemented. Conversely, treating malformed authority/tooling as merely informational would make the shadow lane useless.

Therefore S1-A separates:

```text
valid release-candidate truth that is currently ineligible
from
invalid/untrusted identity computation
```

The former is a successful shadow execution with `eligible=false`; the latter is a CI failure.

## 3. Exact candidate identity

The shadow candidate is the commit actually checked out by Repository Integrity:

```text
candidateSha = GITHUB_SHA = git rev-parse HEAD
```

For `pull_request`, GitHub checks out the synthetic merge commit. Therefore:

```text
candidateSha != PR head SHA in general
```

The PR event's base/head values are provenance and S0-I inputs only:

```text
baseSha   = github.event.pull_request.base.sha
prHeadSha = github.event.pull_request.head.sha
```

S0-I must prove its trusted classification is for:

```text
baseSha -> candidateSha
```

and must retain `prHeadSha` only as branch-head provenance. The shadow engine must reject any PR classification whose `candidateSha` differs from checked-out `HEAD`.

For `push` to `main`:

```text
candidateSha = GITHUB_SHA = HEAD
prContext = absent
```

No synthetic PR provenance is invented.

## 4. Proposed shadow result schema

Target result schema:

```text
webclip-shadow-identity/v1
```

Required conceptual fields:

```text
schema
candidateSha
eventKind
identityProtocol
rpf
chromeQcf
yandexQcf
rcf
bcf
generationGate
eligible
shadowOutcome
impactContext
policyMutation
receiptMutation
artifactBuild
```

Allowed `shadowOutcome` values:

```text
eligible
blocked-portability
blocked-generation
```

`eligible=true` is allowed only when S0-F returns exact PASS for `candidateSha` and the S0-E identity tuple carried by that admission exactly equals the shadow-computed tuple.

Current expected canonical truth is:

```text
generationGate = blocked-portability
eligible = false
shadowOutcome = blocked-portability
```

This is a valid shadow result, not a CI implementation error.

## 5. Hard distinction: reportable blocker vs CI failure

### 5.1 Exit 0 / report-only

A syntactically and semantically valid S0-F result may be ineligible because of a known candidate property:

- `blocked-portability`;
- another future typed generation blocker explicitly owned by S0-F.

S1-A must emit the exact state and exit successfully so CI remains usable while the release candidate is truthfully ineligible.

### 5.2 Nonzero / fail closed

S1-A must fail CI for identity/control-plane defects, including:

- `HEAD != GITHUB_SHA`;
- unsupported/malformed S0-E or S0-F schema;
- missing required S0-E identity component;
- S0-F result refers to a different candidate SHA;
- S0-F PASS tuple differs from independently computed S0-E tuple;
- PR S0-I classification refers to another synthetic merge candidate;
- PR base/head provenance mismatch;
- S0-I says the release control plane is self-changing/untrusted;
- package/source-generation authority cannot be parsed;
- unexpected tool/process failure.

These are not ordinary release blockers; they mean the shadow report itself cannot be trusted.

## 6. Identity tuple equality

The shadow lane consumes the already-separated S0-E domains and must not collapse them into a new hash:

```text
RPF
Chrome QCF
Yandex QCF
full RCF
BCF
```

No `shadowFingerprint`, CGF or aggregate replacement identity is introduced.

S0-F PASS is accepted only if every applicable identity carried by the generation admission equals the independently recomputed S0-E value byte-for-byte.

For a non-PASS S0-F result, S1-A may still report the independently computed S0-E tuple, but must never relabel that tuple as admitted.

## 7. S0-I consumption

On PR events S1-A consumes S0-I only as trusted change-impact/provenance context.

S1-A does **not** derive package/source-generation membership itself. S0-I in turn must consume:

```text
S0-A package authority
S0-B generation authority
```

with base+candidate authority union and status-aware A/M/D/T effects.

Shadow identity must not treat docs-only impact as an identity change by heuristic. Exact S0-E recomputation decides identity equality; S0-I decides impact/trust boundaries.

For self-changing release-control-plane PRs, S1-A fails closed. Candidate code cannot modify its own authority/checker/workflow and then claim its new shadow output is trusted.

## 8. Permanent Repository Integrity integration shape

Future implementation should add one bounded step after trusted PR-impact context is available and before any future S1 settlement step.

Conceptual invocation:

```text
python project_tools/check_release_shadow_identity.py \
  --candidate "$GITHUB_SHA" \
  [--base "$PR_BASE_SHA" --pr-head "$PR_HEAD_SHA"]
```

The exact executable language/name remains an implementation detail, but the authority semantics in this document are fixed for S1-A.

The permanent workflow must continue to use:

- exact checkout;
- `fetch-depth: 0` because ancestry/base/candidate verification may be required;
- read-only repository permissions;
- pinned external actions;
- bounded output with no secrets or product artifacts.

No `continue-on-error` may hide structural shadow failure. The executable itself distinguishes typed ineligibility (exit 0) from untrusted computation (nonzero).

## 9. Machine-readable output and logging

The shadow step should print one bounded line suitable for raw-log evidence, for example:

```text
P1-231 S1-A shadow identity: PASS; candidate=<sha>; eligible=false; outcome=blocked-portability; rpf=<...>; chrome_qcf=<...>; yandex_qcf=<...>; rcf=<...>; bcf=<...>
```

The line is **diagnostic shadow state**, not a release receipt and not S0-G evidence authority.

No OAuth token, Yandex locator/capability, signed URL, browser session data or package bytes may appear in output.

## 10. State and side-effect prohibitions

S1-A must have:

```text
policyMutation = false
receiptMutation = false
artifactBuild = false
```

It must not:

- write `RELEASE_READINESS.md`;
- alter `TEST_STATUS.md` as machine authority;
- append `webclip-release-evidence/v2` receipts;
- build/stage a WebClip product ZIP;
- create tags/releases/deployments;
- invoke Chrome release QA;
- invoke Yandex OAuth/API L5;
- repair S0-B portability;
- convert `blocked-portability` into PASS.

## 11. Relation to S1-B/S1-C/S1-D

```text
S1-A shadow identity
   |\
   | \-> S1-C builder equivalence (with S0-H)
   |
   \----> S1-B shadow settlement (with S0-G)

S1-A + S1-B + S1-C
          -> S1-D migration rehearsal
```

S1-A therefore publishes only a trustworthy ephemeral shadow identity/admission view. It is not itself a receipt settlement or artifact equivalence proof.

## 12. Negative matrix required before implementation

The deterministic model must cover at least:

- exact push candidate;
- exact PR synthetic merge candidate;
- PR head incorrectly substituted for candidate;
- HEAD/GITHUB_SHA mismatch;
- blocked-portability is reportable/exit-0;
- synthetic S0-F PASS becomes `eligible=true` only with exact S0-E tuple;
- one-field RPF/QCF/RCF/BCF mismatch blocks PASS;
- stale S0-F candidate SHA;
- malformed predecessor result;
- S0-I self-change/untrusted classification;
- base/head/candidate provenance mismatch;
- no readiness mutation;
- no receipt mutation;
- no product ZIP/build path;
- no new aggregate fingerprint.

## 13. Current expected result

On the current canonical source generation relation:

```text
candidate = exact checked-out SHA
identity computation = valid
S0-F = blocked-portability
S1-A execution = valid PASS
eligible = false
shadowOutcome = blocked-portability
```

This does not add a sixth V1 readiness blocker. It is a prerequisite state underneath the existing release process and remains owned by P1-231/S0-F until implementation fixes it.

## 14. Research safety

This tranche is research-only. It does not change `.github/workflows/repository-integrity.yml`, `check_pr_change_contract.py`, `check_release_readiness.py`, runtime/package files, manifest version or release policy.

No official artifact, real Chrome QA, real Yandex L5, release decision, tag, GitHub Release or deployment is created.

### Machine-readable research impact

- [ ] `research-impact: none`
- [ ] `research-impact: structural`
- [x] `research-impact: owner`

P-owner(s):

`P1-231`

`research-rationale: S1-A defines the exact checked-out-candidate shadow identity/admission boundary for permanent Repository Integrity. It preserves current WIP CI usability by reporting valid S0-F ineligibility without treating it as a tooling error, while failing closed on stale/malformed/self-authorizing identity or PR-control-plane inputs.`
