# WebClip — P1-231 source-generation portability / executable-authority binding refinement — 2026-09-10

Date: 2026-09-10  
Canonical baseline at tranche start: `main = 2431b59d92c7ce85ffcbca3621b0bacd3602e387`  
Owner: `P1-231 | ACTIVE`  
Mode: **RESEARCH-ONLY / S0-B + S0-C + S0-F + S0-I COMPOSITION REFINEMENT**  
Production/runtime change: **NONE**  
Generator modification: **NONE**  
Release-policy activation: **NONE**  
Real Chrome/Yandex execution: **NONE**  
New P-code: **NO**

## 1. Purpose

Canonical P1-231 research already proved a concrete cross-platform blocker in the only tracked package-generation relation:

```text
public_suffix_list.dat
+ project_tools/build_public_suffix_js.py
-> public-suffix.js
```

The current generator writes text through:

```python
OUT.write_text(code, encoding='utf-8')
```

Linux CPython 3.12.10 reproduces the canonical LF-only Git blob, while Windows CPython 3.12.10 translates the 79 line endings to CRLF and produces different bytes. Canonical S0-B/S0-F therefore keeps current candidate generation admission blocked as `SOURCE_GENERATION_PORTABILITY_UNPROVEN`.

This tranche does **not** repair the generator. It answers the next composition question exposed by that future repair:

> If an executable source generator changes while the generated package bytes remain identical, which release identities/evidence must become stale and which may remain reusable?

The answer must preserve exact package identity without allowing the candidate to change executable generation authority and silently inherit an old governance decision.

## 2. Canonical facts retained

The following existing P1-231 rules remain unchanged:

- S0-A owns package membership and exact package Git blobs.
- S0-B owns source/generator/output relations and exact regeneration.
- S0-C owns QCF/full-RCF contract projections.
- S0-E owns RPF/QCF/RCF/BCF fingerprint encoding.
- S0-F owns candidate-generation admission.
- S0-G owns evidence settlement.
- S0-I owns PR impact classification.
- RPF contains package paths/bytes, not source-generator provenance.
- physical Chrome/Yandex evidence keys are `RPF + applicable QCF`.
- blocker-review/release-decision keys are `RPF + full RCF`.
- both tested source and current candidate must independently have S0-F PASS before S0-G can reuse evidence.
- verifier-side newline normalization is forbidden.
- current V1 readiness/gate remain canonical before explicitly approved S2 activation.

## 3. Confirmed current gap

Current S0-B treats the exact generator Git blob as a generation input and current S0-I correctly marks a generator-path change as `generationGenerator=true`, requiring candidate-generation verification and shadow identity recomputation.

However the current S0-C research full-RCF bootstrap contains ten explicit blob roots and does not contain:

```text
project_tools/build_public_suffix_js.py
```

S0-E intentionally excludes source/generator bytes from RPF. This is correct for logical package identity, but it means a generator-only change that continues to produce the same `public-suffix.js` bytes can leave:

```text
RPF unchanged
Chrome QCF unchanged
Yandex QCF unchanged
current bootstrap full RCF unchanged
```

S0-F still reruns the changed generator and can prove the output matches. That is sufficient for package-generation freshness, but it does not by itself make an old blocker-review/final release decision a review of the new executable generation authority.

This is a **governance-binding gap**, not an RPF defect.

## 4. Why the generator is different from ordinary source data

`public_suffix_list.dat` is declarative source material. If its bytes change but exact regeneration still produces byte-identical admitted package output, S0-F proves that the current candidate package is fresh and RPF correctly remains unchanged.

`build_public_suffix_js.py` is executable transformation authority. Its code decides how source bytes become package bytes. A candidate can change that executable logic while retaining the same package output.

Therefore v1 should distinguish:

```text
declarative generation input
    -> freshness authority through S0-B/S0-F

executable generator + runtime-profile executor semantics
    -> freshness authority through S0-B/S0-F
    + governance/control-plane binding through full RCF
```

This does not make generator bytes part of RPF or QCF.

## 5. Refinement R1 — every declared executable generator must be full-RCF bound

Before P1-231 production activation, S0-C/S0-F composition MUST guarantee:

```text
for every S0-B relation generator path G:
    G is explicitly bound by current full-RCF authority
```

For the bootstrap relation this means full RCF must bind the exact candidate blob for:

```text
project_tools/build_public_suffix_js.py
```

Recommended v1 implementation strategy:

1. retain S0-C's explicit closed `full_rcf.blob_inputs` authority;
2. add each S0-B executable generator path explicitly to that list;
3. add a cross-authority coverage check before candidate admission becomes usable downstream;
4. fail closed if a declared generator is not covered.

Machine-semantic failure class:

```text
SOURCE_GENERATION_GENERATOR_NOT_RCF_BOUND
```

The list remains explicit. S0-C does not recursively include `project_tools/**` and S0-F does not discover generators by filename heuristics.

## 6. Refinement R2 — generator-path changes are trusted control-plane review events

Current S0-I already identifies changed paths that hit the base/candidate generator-role union.

Refine the trust interpretation for a future release-authoritative S0-I implementation:

```text
if generationGenerator == true:
    trustedControlPlaneReview = true
    automaticClassificationTrusted = false
```

This is analogous to, but distinct from, changing S0-A/S0-B checker implementation. The candidate may still run deterministic tests and S0-F regeneration, but the changed executable transformation must not be allowed to self-establish trusted release classification merely by reporting PASS from candidate-controlled code.

A base-trusted or otherwise independently pinned review path is required before the change becomes release-authoritative.

This research tranche does not activate that enforcement in current Repository Integrity.

## 7. Refinement R3 — generator changes stale governance evidence, not physical QA by themselves

For an exact candidate descendant where the generator changes but admitted package bytes and QA contract are unchanged:

```text
RPF                 = unchanged
Chrome QCF          = unchanged
Yandex QCF          = unchanged
full RCF            = changed       # executable generator binding
S0-F admission      = must rerun/pass on current candidate
```

Therefore, after all ancestry/admission rules are met:

```text
old Chrome PASS     -> may remain reusable
old Yandex PASS     -> may remain reusable
old blocker review  -> stale
old release decision-> stale
```

This preserves the expensive physical-QA reuse rule for byte-identical product/runtime behavior while requiring governance evidence to acknowledge the changed executable generation authority.

The current real project does not yet have S0-F PASS, so this reuse rule does not promote any current historical Chrome/Yandex evidence.

## 8. Refinement R4 — source-data-only changes need not enter full RCF

This tranche does not require all S0-B declarative inputs to become full-RCF blobs.

For a source-data-only change:

```text
source changes
-> S0-I generationInput=true
-> S0-F exact regeneration required
-> output bytes equal current candidate package member
-> RPF expresses resulting package bytes
```

If output and release acceptance contract remain identical, physical QA and governance evidence need not be invalidated merely because non-executable source representation changed.

If the source change changes generated package output, RPF changes and all RPF-bound evidence becomes stale normally.

The executable generator is bound more strongly because it is transformation authority, not merely input data.

## 9. Refinement R5 — runtime-profile executor semantics must also be governance-bound

S0-B deliberately stores only a closed `runtime_profile` token; arbitrary command strings are forbidden. Actual command/executor behavior is code-owned.

Therefore future production files that implement the mapping:

```text
runtime_profile -> bounded executor behavior
```

must be included in full-RCF authority as already anticipated by S0-F's implementation-integration note for source-generation/release-control implementations.

Changing only the token in the S0-B authority also changes the S0-B semantic topology and the future `release_source_generation_v1.json` authority, which must itself be full-RCF bound before production activation.

Thus both sides are covered:

```text
relation declaration/profile token -> full RCF authority source
executor implementation            -> full RCF implementation blob
relation generator executable       -> full RCF generator blob
```

## 10. No new identity axis

Do not introduce a generator fingerprint such as `GGF`/`SGF` as a sixth release identity axis.

Existing identities remain sufficient when their ownership is composed correctly:

```text
RPF  = exact logical package identity
QCF  = physical QA acceptance contract identity
RCF  = full release/governance contract identity
BCF  = builder/container semantics
SHA  = exact physical artifact bytes
S0-F = candidate-local generation admission fact
```

Generator executable binding belongs in full RCF because it changes governance/admission semantics while not changing the logical package by itself.

## 11. Portability remediation contract

A future production/tooling repair of `build_public_suffix_js.py` should be minimal and package-byte preserving for current source.

Acceptable conceptual repair:

```python
OUT.write_bytes(code.encode('utf-8'))
```

or another implementation that explicitly emits the same canonical LF UTF-8 bytes on all supported builder/verifier platforms.

Required acceptance after the repair:

```text
exact source Git blob
+ exact repaired generator Git blob
+ pinned/allowed runtime profile
-> isolated Linux regeneration
-> isolated Windows regeneration
-> exact raw bytes equal each other
-> exact raw bytes equal candidate public-suffix.js Git blob
```

No step may normalize line endings after generation.

A `.gitattributes` checkout rule alone is insufficient because S0-B requires generator output itself to be deterministic independent of working-tree newline presentation.

## 12. Identity effect of the minimal repair

If the repair only changes text-write mechanics and current source regenerates the existing LF `public-suffix.js` exactly:

```text
package file set          unchanged
public-suffix.js bytes    unchanged
RPF                       unchanged
Chrome/Yandex QCF         unchanged
BCF                       unchanged
full RCF                  MUST change because generator executable changed
S0-F portability state    may move from blocked to pass only after cross-platform proof
```

This is the desired result. It avoids unnecessary physical QA invalidation while preventing old governance approval from silently covering new executable generation semantics.

## 13. Candidate/self-change schedule

Unsafe schedule without this refinement:

```text
candidate A has generator GA and package R
review/decision approved for R + RCF C
candidate B changes generator to GB
GB still emits package R
S0-F(B) passes using GB
RPF(B)=R and current bootstrap RCF(B)=C
old governance decision appears reusable
```

Required refined schedule:

```text
candidate B generator change
-> S0-I generator-role control-plane review required
-> S0-F(B) exact regeneration required
-> generator binding changes full RCF from C to C2
-> physical QA may reuse only if RPF/QCF + ancestry + both S0-F admissions satisfy S0-G
-> blocker-review/release-decision for C do not settle C2
-> new governance review/decision required
```

## 14. Acyclicity

This refinement must not create authority cycles.

Safe ownership/composition is:

```text
S0-A package authority
   |
   v
S0-B generation relations -----------+
   |                                  |
   | generator paths                  | regeneration
   v                                  v
S0-C explicit full-RCF coverage    S0-F generation admission
   |                                  ^
   v                                  |
S0-E RCF/identity --------------------+
```

S0-C still owns which full-RCF inputs are admitted. S0-B only supplies the fact that a path is an executable generator. S0-F checks that every such generator is covered before exposing an admitted candidate identity downstream.

No RCF value feeds back into deciding which path is a generator. No generator decides its own coverage.

## 15. Negative matrix

A future implementation must fail closed for at least:

```text
G01 declared generator absent from full-RCF coverage
G02 generator changed but S0-F result reused without rerun
G03 generator changed but trusted control-plane review omitted
G04 candidate generator/output regenerated only from working-tree bytes
G05 verifier normalizes CRLF to LF after generator execution
G06 Linux match treated as portability proof without Windows match
G07 generator changes while full RCF remains unchanged
G08 source-data-only representation change incorrectly changes RPF with identical output
G09 generator-only change incorrectly changes QCF
G10 generator-only change incorrectly forces physical QA stale solely through QCF
G11 old blocker review reused after generator-bound full RCF changes
G12 old release decision reused after generator-bound full RCF changes
G13 new generator path added to S0-B without adding full-RCF coverage
G14 runtime-profile executor implementation changes without full-RCF change
G15 new generator fingerprint axis introduced instead of composing existing authorities
```

## 16. Current-state projection

At tranche start:

```text
main = 2431b59d92c7ce85ffcbca3621b0bacd3602e387
P1-231 = ACTIVE
current generator = text-mode write_text without explicit LF control
current PSL Windows portability = false
current S0-F gate = blocked-portability
current S1-A identity eligible = false
current V1 readiness = NOT READY
current V1 blockers = 5
S2 authorized = false
release authorized = false
product ZIP = false
```

The existing S0-C research bootstrap has ten full-RCF blob inputs and does not yet bind `project_tools/build_public_suffix_js.py`; this tranche records that as the composition gap to close before production implementation.

## 17. Deterministic model requirements

The companion model must prove at minimum:

1. current generator still uses `write_text` and has not already been repaired;
2. current S0-B declares exactly the bootstrap generator relation and reports Windows portability false;
3. current S0-C bootstrap has ten full-RCF inputs and does not contain the generator path;
4. current S0-I recognizes generator-role changes and currently limits automatic trust fencing to other control-plane flags;
5. current S0-G governance settlement key is `RPF + full RCF` while physical QA is `RPF + QCF`;
6. CRLF-translated synthetic output differs byte-for-byte from LF canonical output;
7. binary UTF-8 emission preserves LF bytes independent of text newline translation;
8. generator-only change with equal package output preserves a research package digest;
9. generator-only change preserves research QCF tokens;
10. adding the generator blob to a research governance binding changes that governance digest;
11. physical QA reuse can remain true under equal RPF/QCF and independent S0-F PASS;
12. blocker-review/release-decision reuse fails when full RCF changes;
13. missing generator coverage fails closed;
14. runtime `Z`, S2 approval and actual release execution remain distinct;
15. the tranche cannot mutate readiness, build a product ZIP or authorize release.

The research digest used by the model to demonstrate propagation is not a production RPF/QCF/RCF/BCF implementation.

## 18. No activation / no current blocker rewrite

This tranche intentionally does not:

- edit `build_public_suffix_js.py`;
- edit `public-suffix.js`;
- add `.gitattributes`;
- create production S0-A/B/C/E/F/I files;
- change permanent Repository Integrity behavior;
- add a sixth V1 readiness blocker;
- edit `RELEASE_READINESS.md` or `check_release_readiness.py`;
- edit `release-gate.yml`;
- change manifest/version;
- run real Chrome/Yandex release qualification;
- authorize S2, tag, GitHub Release or deployment.

## 19. Conclusion

The confirmed Windows newline defect has two separate future requirements:

```text
byte-level remediation:
  generator itself must emit identical exact UTF-8/LF bytes across supported platforms

governance-level remediation:
  the executable generator must be bound into full RCF and generator changes must require trusted control-plane review
```

The first closes `SOURCE_GENERATION_PORTABILITY_UNPROVEN`. The second prevents a changed candidate-controlled generator from inheriting an old blocker-review/release-decision merely because it emitted byte-identical package output.

RPF and QCF stay narrow and meaningful; expensive physical QA can remain reusable for byte-identical package/acceptance semantics after all S0-F/ancestry rules pass; governance approval becomes fresh whenever executable generation authority changes.

This is a passive P1-231 refinement only. S2 remains behind explicit user approval.