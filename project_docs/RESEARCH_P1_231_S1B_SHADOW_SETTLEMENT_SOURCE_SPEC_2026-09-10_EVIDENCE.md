# P1-231 — S1-B shadow settlement source specification

Date: 2026-09-10
Status: research/source-spec only; no production or release-policy activation
Canonical base for this tranche: `c54dac69a82fd356336252fafda62cf63e8339cf`
Canonical Registry blob at tranche start: `9623d8d03b4c900708d43cc2e59bf606a378d505`
Owner: `P1-231`

## 1. Purpose

Define the second S1 integration node:

```text
S1-B-shadow-settlement
  deps = S0-G-evidence-settlement
       + S1-A-shadow-identity
  owner = shadow-evidence-report
  mutatesCanonicalPolicy = false
```

S1-B reports, for the exact S1-A shadow candidate, whether release-evidence settlement can be evaluated and what the current typed slot states are. It is a passive CI/reporting layer. It does not become canonical readiness, release approval or publish authority.

## 2. Two distinct questions

S1-B must not collapse these questions:

```text
A. Is the canonical typed receipt namespace structurally trustworthy?
B. Is this exact candidate admitted/eligible for candidate-specific S0-G settlement?
```

S0-G already requires malformed admitted receipts to block settlement and explicitly requires a pure append-only namespace-validation helper for PR/checker reuse. S1-B therefore consumes that S0-G-owned helper; it does not reimplement receipt syntax or append-only semantics.

This yields the ordering:

```text
S0-G namespace validation
        ↓
S1-A exact candidate shadow result
        ↓
if S1-A eligible=false:
    report candidate-ineligible; do not candidate-settle receipts
else:
    call S0-G exact candidate settlement
        ↓
S1-B bounded shadow evidence report
```

Thus a corrupt canonical receipt namespace is a structural CI defect even while the current candidate is otherwise ineligible, while ordinary candidate ineligibility remains a truthful shadow blocker rather than a tooling failure.

## 3. Candidate binding

S1-B consumes one exact S1-A result:

```text
schema = webclip-shadow-identity/v1
candidateSha = exact checked-out GITHUB_SHA
```

S1-B must reject:

- stale S1-A candidate SHA;
- unsupported shadow schema;
- malformed identity tuple;
- a shadow result claiming `eligible=true` while its generation gate is not PASS;
- any candidate mismatch between S1-A and S0-G settlement result.

S1-B never substitutes PR head SHA for a synthetic merge candidate.

## 4. Proposed result schema

Target shadow report schema:

```text
webclip-shadow-settlement/v1
```

Conceptual fields:

```text
schema
candidateSha
identityEligible
namespaceValid
settlementEvaluated
shadowOutcome
slots
allRequiredSlotsPass
policyMutation
receiptMutation
artifactBuild
```

Allowed high-level `shadowOutcome` values:

```text
candidate-ineligible
settled-pass
settled-blocked
```

Structural validation failure is not represented as a normal `shadowOutcome`; it is a fail-closed execution error/nonzero exit.

## 5. Current canonical expected state

Current S1-A truth is:

```text
current_shadow = blocked-portability
current_eligible = false
```

Therefore current S1-B expected result is:

```text
namespace validation = valid/empty-or-valid canonical namespace
identityEligible = false
settlementEvaluated = false
shadowOutcome = candidate-ineligible
allRequiredSlotsPass = false
```

No historical/free-form V1 evidence, matching fingerprint string or old workflow artifact may upgrade this state.

## 6. Namespace validation ownership

Receipt parsing, schema validation, duplicate-id/attempt checks, secret-material rejection and append-only validation remain owned by S0-G.

S1-B only consumes a typed namespace-validation result such as conceptually:

```text
schema = webclip-evidence-namespace-validation/v1
valid = true
receiptCount = N
```

Exact production helper/result name is implementation detail, but ownership is not.

If the namespace helper reports invalid or cannot execute reliably:

```text
S1-B structural failure -> nonzero CI
```

S1-B may not skip or downgrade malformed admitted receipts because S1-A is ineligible.

## 7. Candidate-ineligible short circuit

After namespace structural validation succeeds, if S1-A reports:

```text
eligible = false
```

S1-B must not run candidate-specific receipt selection/ancestry/latest-attempt interpretation as if the candidate were admitted.

Return:

```text
settlementEvaluated = false
shadowOutcome = candidate-ineligible
allRequiredSlotsPass = false
slots = not-evaluated
```

The S1-A blocker reason may be retained as bounded diagnostic state, for example `blocked-portability`, but S1-B does not redefine that reason or create a new readiness blocker.

## 8. Eligible candidate path

Only when S1-A is trustworthy and `eligible=true` may S1-B consume S0-G exact settlement.

Required cross-checks:

```text
S0-G candidateSha == S1-A candidateSha
S0-G candidateGenerationState == pass
S0-G identities == S1-A identities for RPF/applicable QCF/RCF
```

S1-B then maps:

```text
S0-G allRequiredSlotsPass=true  -> shadowOutcome=settled-pass
S0-G allRequiredSlotsPass=false -> shadowOutcome=settled-blocked
```

S1-B does not reinterpret slot prose. It consumes typed S0-G slot states.

## 9. Slot visibility

Closed slots remain S0-G's four evidence kinds:

```text
unpacked-chrome
yandex-e2e
blocker-review
release-decision
```

For an eligible candidate, S1-B may report the bounded S0-G slot summaries:

```text
state
receiptId
attemptSeq
testedSourceSha
```

For an ineligible candidate, S1-B must not fabricate `missing` slot states because receipt settlement was not evaluated. Use a distinct `not-evaluated` representation.

This distinction prevents:

```text
candidate not admitted
```

from being misread as:

```text
candidate admitted, but only missing QA receipts
```

## 10. Structural failures

S1-B must fail closed for at least:

- receipt namespace invalid;
- namespace helper unsupported/malformed;
- S1-A schema/candidate/identity inconsistency;
- S1-A `eligible=true` with non-PASS generation state;
- S0-G result schema malformed;
- S0-G candidate mismatch;
- S0-G identity mismatch against S1-A;
- S0-G claims all-required PASS while a required slot is not typed PASS/approved;
- unexpected duplicate/unknown slot;
- tool/process failure.

These are shadow-control-plane integrity failures, not ordinary release blockers.

## 11. No new evidence authority

S1-B does not mint or modify:

```text
webclip-release-evidence/v2
```

It does not create a second receipt namespace, mutable selector, evidence cache authority or settlement fingerprint.

The shadow report is recomputable ephemeral CI/reporting state. Durable release evidence remains immutable S0-G receipts.

## 12. No policy mutation

Every S1-B result must retain:

```text
policyMutation = false
receiptMutation = false
artifactBuild = false
```

S1-B must not:

- write `RELEASE_READINESS.md`;
- change current five V1 blockers;
- approve/reject release policy;
- build/stage a WebClip product ZIP;
- run Chrome release QA;
- run Yandex OAuth/API L5;
- create tags/releases/deployments;
- repair S0-B portability.

## 13. Exit semantics for future permanent CI

Future S1-B permanent shadow integration should use:

```text
valid namespace + candidate ineligible -> exit 0, report blocked
valid namespace + eligible candidate + settled blocked -> exit 0, report blocked
valid namespace + eligible candidate + settled pass -> exit 0, report pass
structural/trust error -> nonzero
```

This mirrors S1-A's distinction between truthful release-state ineligibility and broken shadow computation.

## 14. Bounded logging

One bounded non-secret line is sufficient, conceptually:

```text
P1-231 S1-B shadow settlement: PASS; candidate=<sha>; identity_eligible=false; namespace_valid=true; settlement_evaluated=false; outcome=candidate-ineligible; all_required=false
```

No receipt durable summary needs to be echoed wholesale. No OAuth/provider/browser secret/capability material may appear.

## 15. Relation to S1-D

S1-B is one input to migration rehearsal:

```text
S1-A shadow identity
S1-B shadow settlement
S1-C builder equivalence
        ↓
S1-D migration rehearsal
```

Only S1-D may prove the shadow stack coherent enough to approach an explicit S2 migration proposal. S1-B alone never authorizes readiness migration.

## 16. Required deterministic model matrix

The research model must prove at least:

- current canonical S1-A blocked-portability -> candidate-ineligible;
- current candidate does not call semantic receipt settlement;
- namespace structural validation still occurs before candidate short circuit;
- malformed namespace -> structural failure even with candidate ineligible;
- synthetic eligible candidate + all four required slots pass -> settled-pass;
- synthetic eligible candidate + one missing/fail/inconclusive/rejected slot -> settled-blocked;
- S0-G candidate mismatch -> fail closed;
- RPF/QCF/RCF mismatch -> fail closed;
- malformed S1-A/S0-G schema -> fail closed;
- `allRequiredSlotsPass` inconsistent with slot states -> fail closed;
- no mutable readiness/receipt/artifact side effects;
- no new aggregate settlement fingerprint.

## 17. Research safety

This tranche is research-only. It does not add the permanent S1-B workflow/checker, receipt files, readiness migration or official release infrastructure.

No production/runtime/package files, manifest version, Registry status, real Chrome QA, real Yandex L5, release decision, tag, GitHub Release or deployment are changed.

### Machine-readable research impact

- [ ] `research-impact: none`
- [ ] `research-impact: structural`
- [x] `research-impact: owner`

P-owner(s):

`P1-231`

`research-rationale: S1-B defines passive evidence-settlement reporting for the exact S1-A candidate while preserving S0-G receipt/settlement ownership. It validates the typed receipt control plane structurally, distinguishes candidate ineligibility from missing evidence, and fails closed on corrupt or inconsistent settlement inputs without mutating canonical readiness or release policy.`
