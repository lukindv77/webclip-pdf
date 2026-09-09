# WebClip — project-wide production-entry research synthesis — 2026-09-09

Date: 2026-09-09  
Canonical production baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Registry authority: `project_docs/RESEARCH_REGISTRY.md` on canonical `main`  
Research branch: `research/project-production-entry-synthesis-2026-09-09`  
Mode: **RESEARCH-ONLY / PROJECT-WIDE IMPLEMENTATION PROGRAM SYNTHESIS**

This document does not change production source, Registry status, manifest/version, build, tag, release or deployment.

The purpose is to map every current ACTIVE P0/P1 owner into one primary implementation program while preserving cross-wave dependencies separately. Primary implementation home is an engineering organization mechanism; it does not alter canonical root-cause ownership in `RESEARCH_REGISTRY.md`.

---

## 1. Current project research state

For the exact baseline above, current project research coverage is:

```text
DEEP-RESEARCH-COVERAGE-COMPLETE
```

This follows the final 2026-09-09 coverage reconciliation:

- exact Stable PD7 receipt obtained on Chrome for Testing Stable `153.0.8010.36`;
- selected Stable returned `single-axis-scroll-container` feature support = false;
- C42/Yandex was converted from an unbounded unknown into bounded `EXTERNAL-REQUIRED` research terminality;
- no current independent root cause was left without an owner.

Research coverage completion is not implementation closure and not release readiness.

Current boundary:

```text
research coverage        COMPLETE for baseline
implementation closure   INCOMPLETE
release regression       INCOMPLETE
release readiness        NOT READY
Yandex L5                DEFERRED TO FINAL EXTERNAL STAGE
```

---

## 2. Active owner denominator

Canonical Registry currently has:

```text
ACTIVE P0 owners = 17
ACTIVE P1 owners = 89
TOTAL ACTIVE     = 106
```

The primary-wave partition below assigns all 106 exactly once.

Deterministic partition model:

```text
project_tools/test_project_production_entry_wave_partition.js
```

No P1-231 is allocated.

---

# Part I — six primary implementation waves

## 3. W1 — Exact operation / artifact / side-effect authority

**Primary purpose:** remove silent wrong-artifact and duplicate/retargeted-effect risk before lower-risk polish/scale work.

Primary owners: **21**.

### P0

```text
P0-023  exact source-document retry/cache generation
P0-070  exact save generation end-to-end
P0-072  bulk clear/replace vs non-cancellable effect ownership
P0-073  immutable account/root recovery scope
P0-074  immutable long Yandex operation context
P0-076  Journal per-entry + generation CAS
P0-078  publication policy generation/revocation
P0-079  immutable operation-owned PDF bytes
P0-080  same-document SPA/application/selection generation
```

### P1

```text
P1-076  backup lease across resumable/publish side-effect stages
P1-086  readonly IDB result publishes only after tx completion
P1-090  exact object identity after destructive Yandex move unknown
P1-125  executeScript late receipt exact document generation
P1-146  local-download exact durable start/restart settlement
P1-179  backup scheduler/pending state account/root namespace
P1-183  Delete->Trash exact source/target/object checkpoint
P1-184  Yandex exact remote content/object receipt
P1-194  truthful recovery durability class
P1-198  worker-issued physical operation identity
P1-207  backup success bound to exact Journal source revision
P1-210  lost outer response reconciles durable worker receipt
```

### W1 current research status

W1 is the most implementation-ready wave.

Current consolidated implementation DAG:

```text
A0 -> U0 -> J0 -> A1 -> A2 -> B0 -> B1 -> C0 -> C1 -> D0 -> D1 -> D2 -> E0 -> E1 -> Z0
```

Research state:

```text
architecture                  DEFINED
source specifications         DEFINED
DB migrations                 DEFINED
update/restart choreography   DEFINED
retention/GC/capacity         DEFINED
reconciliation semantics      DEFINED
production source             RED / NOT IMPLEMENTED
```

Real Yandex L5 remains final external closure only.

---

## 4. W2 — Browser / extension lifecycle and control-plane settlement

**Primary purpose:** make browser-owned operations, extension pages, frame agents and native/user-owned flows generation-exact across reload, restart and late settlement.

Primary owners: **20**.

```text
P1-004  cross-origin iframe feature lifecycle umbrella
P1-124  tabs.create unknown/late settlement across restart
P1-130  Chrome Action bounded mutation/repair
P1-156  native Save As durable generation-exact lifecycle
P1-157  class-correct Chrome call lifetimes / Settings writers
P1-169  RELEASED Save-As tombstone retention/late barrier
P1-171  cross-origin frame registry exact top/child generation
P1-175  Journal Apply fresh source/document generation before command
P1-193  optional host permission flow preserves user activation/generation
P1-199  remote-frame print prepare/restore exact operation generation
P1-200  remote-frame selection/control session generation
P1-201  permission revoke/regrant fences injected frame authority
P1-203  frame-agent survives worker registry; re-handshake on restart
P1-204  context-menu rebuild generation durable across restart
P1-209  extension-page version refresh pending/completed generation
P1-214  multi-frame partial prepare/restore rollback receipts
P1-217  Chrome Action explicit unknown/degraded truth
P1-222  Options async completion latest-user-edit-wins
P1-223  Create Folder mutation target vs browse-refresh generations
P1-227  manual selection tracks dynamic same-origin frame topology
```

### W2 implementation subprograms

#### W2-A — native/browser actual settlement

```text
P1-124
P1-130
P1-156
P1-157
P1-169
P1-204
P1-217
```

#### W2-B — frame lifecycle/session authority

```text
P1-004
P1-171
P1-199
P1-200
P1-201
P1-203
P1-214
P1-227
```

#### W2-C — extension-page/control-plane generations

```text
P1-175
P1-193
P1-209
P1-222
P1-223
```

### W2 hard relationship to W1/W3

W2 does not wait for all of W1, but its mutating user flows should consume W1's protocol/operation-receipt foundation where applicable.

Cross-frame W3 closure must not precede the relevant W2-B exact frame/session lifecycle.

---

## 5. W3 — Selection / PDF fidelity / frame representation

**Primary purpose:** make selected output complete, selection-bounded, reversible and geometrically truthful under complex page/frame rendering.

Primary owners: **16**.

### P0

```text
P0-004  selected PDF fidelity complete + selection-bounded
```

### P1

```text
P1-001  restored selection rendered-target admission
P1-003  renderer resource preparation covers real visual graph
P1-150  >200000px same-origin selected iframe truthful outcome
P1-154  aggregate Include/Exclude budget before all materialization/export
P1-187  flattened iframe rendered state e.g. canvas bitmap
P1-212  print preparation must not synthesize page-control activation
P1-218  resource-attribute compare-before-restore rollback
P1-219  image-link wrapper exact structural rollback
P1-220  print-header cleanup exact generated node receipt
P1-221  link-normalization private exact rollback authority
P1-224  frame/ancestor style/marker compare-before-restore
P1-226  same-origin iframe geometry transforms/zoom composition
P1-228  rendered-intent selection candidate/geometry authority
P1-229  cross-origin frame media/geometry selected-only contract
P1-230  bounded user-reached dynamic/virtualized history
```

### W3 structure

#### W3-A — reversible temporary representation

```text
P1-218
P1-219
P1-220
P1-221
P1-224
```

#### W3-B — selection/geometry authority

```text
P1-001
P1-154
P1-226
P1-228
P1-230
```

#### W3-C — renderer/frame fidelity

```text
P0-004
P1-003
P1-150
P1-187
P1-212
P1-229
```

W3-B/C cross-frame closure depends on relevant W2-B exact frame/session lifecycle.

---

## 6. W4 — Journal / portable data / history integrity

**Primary purpose:** make persisted/imported/history state exact under replacement, migration, editing, pagination and portable-data semantics.

Primary owners: **15**.

### P0

```text
P0-013  import/restore selection authority exact selected object/staging
P0-050  urlStats rebuild/publication generation isolation
```

### P1

```text
P1-008  settings import reconciliation generation
P1-185  imported timestamp canonical finite domain
P1-186  imported comment-id uniqueness/addressability
P1-188  imported locator cssPath versioned grammar
P1-189  imported site/hostname identity derived from normalized URL
P1-190  imported operationId historical/unverified provenance
P1-197  OperationLog administrative history generation
P1-202  deleted-comment retention/privacy lifecycle
P1-205  OperationLog retention + queued-write generation
P1-206  Journal composed view exact source-revision coherence
P1-211  deleted-comment tombstone lifecycle/capacity debt
P1-216  legacy/modern Journal rows one derived URL identity domain
P1-225  comment editor preserves newer draft after save admission
```

### W4 dependencies

J0/D0 from W1 provide the shared Journal generation/revision foundation for the mutating parts of W4.

Portable import semantics remain explicitly separate from live-local operation authority.

---

## 7. W5 — Security / privacy / auth / public-link governance

**Primary purpose:** preserve defensive trust boundaries around private browsing, credentials, imported metadata, authorization state and public external access.

Primary owners: **18**.

### P0

```text
P0-022  imported locator not destructive Yandex provenance
P0-045  incognito fail-closed across persistent/status surfaces
P0-066  one durable/display URL confidentiality sanitizer
P0-069  Journal delete with public link requires publication outcome
P0-075  host page not trusted UI/control plane
```

### P1

```text
P1-138  read-like Yandex paths must not hide provisioning mutation
P1-161  reauthorization return context + manual resume only
P1-164  per-entry public-link revoke durable/reconciled
P1-165  OAuth state effectively verified from captured redirect
P1-172  save metadata/user inputs bounded before DOM/IPC
P1-176  extension-page pre-IPC validation matching worker limits
P1-177  disconnect/re-auth + backup paused/resume generation semantics
P1-178  auth attempt + settings generation state machine
P1-180  bulk destructive operations disclose public-link control loss
P1-182  locator context avoids surrounding plaintext/raw href/src
P1-191  manual-token replacement validate-before-generation commit
P1-195  actual Yandex capability/scope truth
P1-196  401 demotion exact auth-generation fenced
```

### W5 auth core supporting W1 remote stage

The following supporting slice should be implemented before W1 C0/C1 is considered fully closed:

```text
P1-165
P1-178
P1-191
P1-195
P1-196
```

This is a support dependency, not a reassignment into W1.

---

## 8. W6 — Scale / fairness / bounded resource use

**Primary purpose:** make correct semantics remain bounded, fair and usable at large scale / long-running worker lifetime.

Primary owners: **16**.

```text
P1-009  scalable Journal text-search candidate strategy
P1-035  staging cleanup explicit live owner/lease/generation
P1-043  global shared-origin storage byte reservation
P1-064  fair local-download recovery progress
P1-158  parent-operation deadline includes pure prerequisite reads
P1-160  bounded/coalesced discovery budgets
P1-162  incremental generation-fenced Journal domain rendering
P1-163  streaming JSON parser awaits only on refill
P1-166  global cap for unresolved executeScript/tabs.create settlement
P1-167  shared PDF preparation computation budget
P1-168  bounded locator creation/scoring
P1-170  coalesced/bounded Chrome Action global refresh
P1-173  settlement queue waiting-turn admission/coalescing
P1-174  lightweight Journal summaries/lazy heavy details
P1-192  long alarm work durable fair progress across wakes
P1-208  pending-remote recovery phase/status fairness
```

W6 should not redefine correctness semantics. It adds boundedness/fairness after each relevant correctness owner is sufficiently stable.

Some W6 caps must land in the same tranche as the queue/store they protect if otherwise the new implementation would introduce a fresh unbounded surface.

---

# Part II — verified partition

## 9. Primary wave counts

```text
W1 = 21
W2 = 20
W3 = 16
W4 = 15
W5 = 18
W6 = 16
-----------
TOTAL = 106
```

The deterministic model proves:

- no ACTIVE P0/P1 owner is absent;
- no ACTIVE owner has two primary homes;
- no non-ACTIVE owner is silently added;
- support dependencies do not alter primary ownership.

---

# Part III — project implementation topology

## 10. Do not implement as six fully serial waves

A strict sequence:

```text
W1 -> W2 -> W3 -> W4 -> W5 -> W6
```

would create unnecessary blocking and would be architecturally inaccurate.

The recommended shape is one hard authority spine plus controlled parallel branches.

---

## 11. Hard authority spine

The initial high-risk spine remains W1 foundation:

```text
A0
-> U0
-> J0
-> A1
-> A2
-> B0
-> B1
```

This establishes:

```text
protocol compatibility
operation receipt
Journal schema foundation
reviewed source generation
physical operation identity
render source proof
immutable PDF identity
```

before the system starts relying on stronger remote/local effect semantics.

---

## 12. Remote/auth branch

After W1 foundation:

```text
W5 auth core
        +
W1 C0/C1
```

should be developed as one coordinated branch.

Hard rule:

```text
remote effect authority must not outpace auth/account/capability generation correctness
```

Real Yandex L5 remains deferred until final external validation.

---

## 13. Journal/data branch

After J0/D0 foundation:

```text
W1 D1/D2
+
W4 Journal/data integrity
```

can proceed in coordinated tranches.

The shared generation/revision substrate should not be independently reimplemented by W4 owners.

---

## 14. Frame/fidelity branch

W2 frame lifecycle first establishes exact identities:

```text
P1-171 / 199 / 200 / 201 / 203 / 214 / 227
```

Then W3 cross-frame fidelity can consume those receipts.

Do not solve cross-frame fidelity with a second independent frame/session identity model.

---

## 15. Native/browser lifecycle branch

W2 native/control-plane owners can proceed after U0/A2 foundations where relevant:

```text
tabs.create
Chrome Action
Save As
permission flows
extension-page version repair
```

They should use the common lost-response/physical-operation semantics rather than inventing per-UI retry logic.

---

## 16. Scale overlay

W6 is an overlay, not an afterthought.

For an existing bounded surface, W6 can be deferred until correctness is fixed.

For a newly created queue/store in W1–W5, its minimum safe admission/retention bound belongs in the creating tranche.

Examples already applied in W1 research:

```text
OperationReceipt active capacity
F/E transactional capacity
terminal retention/GC ordering
```

Broader global storage/fairness owners stay W6.

---

# Part IV — parallelization rules

## 17. Safe parallelism

After A0/U0/J0 are stable, separate branches may work in parallel when they do not invent competing identity stores/protocols.

Examples:

```text
W2 native Save As lifecycle
parallel with
W4 imported data normalization
```

or:

```text
W3 reversible print rollback
parallel with
W5 URL confidentiality sanitizer
```

provided both consume shared protocol/generation contracts where relevant.

---

## 18. Unsafe parallelism

Avoid parallel teams independently designing:

```text
physical operation identity
Journal generation/revision
Yandex auth generation
frame/session identity
retry/unknown semantics
```

Those are shared authority primitives and need one canonical implementation.

---

# Part V — risk ordering

## 19. Highest priority: silent wrong-artifact / wrong-effect

Primary program:

```text
W1
```

Reason: wrong bytes/account/object/Journal target can produce apparently successful but semantically wrong user output.

This is higher risk than performance or display polish.

---

## 20. Second: browser/native lifecycle ambiguity

Primary program:

```text
W2
```

Reason: lost/late Chrome operations can duplicate effects or revive stale authority across MV3 restart/update.

---

## 21. Third: fidelity and reversible page mutation

Primary program:

```text
W3
```

Reason: incomplete/wrong selection output and stale rollback can corrupt page/print representation, but most findings are bounded and already owner-mapped.

---

## 22. Fourth: persistent data/history integrity

Primary program:

```text
W4
```

Some W4 owners may move earlier when they are direct prerequisites for a W1/W2 user path.

---

## 23. Security/privacy/auth

W5 is not globally "fifth" in priority.

Security slices that gate W1 remote authority move earlier immediately.

Other privacy/governance owners can run in parallel with W3/W4.

---

## 24. Scale/fairness

W6 becomes primary after silent-corruption/lifecycle risks have been reduced, except where a new correctness tranche would otherwise introduce an unbounded queue/store.

---

# Part VI — next research work before implementation

## 25. W1 broad internal architecture research is saturated

After the consolidated Wave 1 readiness contract, another broad W1 architecture cycle is not justified without new contradictory evidence.

Next W1 work is implementation + Closure Sweep.

---

## 26. W2 is the next useful internal research target

W2 has complete coverage and owners, but does not yet have one consolidated implementation source specification comparable to Wave 1.

The next research tranche should therefore consolidate:

```text
W2-A native/browser settlement
W2-B frame lifecycle/session authority
W2-C extension-page/control-plane generations
```

Goals:

- reuse OperationReceipt/protocol v2 primitives;
- identify exact durable stores/generations needed;
- eliminate duplicate per-feature settlement models;
- define update/restart/native-dialog schedules;
- define source RED->GREEN gates;
- identify which W2 owners can close together.

---

## 27. W3 follows W2-B source specification

W3 should not fully source-spec cross-frame fidelity before W2-B lifecycle contract is consolidated, because frame-generation identity is a prerequisite.

Independent W3 reversible-rollback work can be specified earlier.

---

## 28. W4/W5/W6 can be incrementally consolidated in parallel

Their current research is already coverage-complete; remaining work is implementation-readiness synthesis rather than new root-cause discovery.

---

# Part VII — external validation policy

## 29. Yandex L5 remains final

By project working rule, real Yandex L5 is intentionally executed in the final external validation phase.

Until then:

```text
C42 research coverage = terminal EXTERNAL-REQUIRED
P1-184 = ACTIVE
production implementation may proceed internally
release readiness = NO
```

The user should only be asked for Yandex L5 when all internally controllable research/implementation evidence that should precede it is complete or when a concrete provider ambiguity blocks an implementation decision.

---

# Part VIII — current research completion estimate after this synthesis

## 30. Internal research vs external proof

This synthesis materially reduces the remaining internal research ambiguity.

Approximate state:

```text
project research coverage                    100% for current baseline
Wave 1 implementation-readiness research    ~99%
project-wide implementation-program mapping  100% at owner partition level
W2 implementation-readiness synthesis       not yet consolidated
W3-W6 implementation-readiness synthesis    partial / family evidence exists
Yandex L5 live-provider evidence             deferred
```

The remaining internal work is mostly converting already researched owners into coherent source-change programs, not discovering unknown project areas.

---

## 31. Final decision

The project should now move through:

```text
1. W2 implementation-readiness consolidation
2. W3 fidelity/rollback consolidation
3. W4/W5/W6 targeted implementation-readiness consolidation
4. final cross-wave contradiction sweep
5. staged production implementation / Closure Sweeps
6. final external/native provider validation
7. Yandex L5 at the agreed final stage
8. final release regression/readiness decision
```

No broad C01…C46 research restart is warranted unless new Change Impact reopens a specific cell.

No new P-code is warranted by this synthesis.
