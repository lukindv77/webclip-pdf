# WebClip — post-P1-231 production-entry reconciliation — 2026-09-10

Date: 2026-09-10  
Canonical baseline at tranche start: `main = f9fd76743d6e7ccf6b589f8e9197c762ead91dcd`  
Mode: **RESEARCH-ONLY / CROSS-PLANE RECONCILIATION**  
Production/runtime mutation: **NONE**  
Release-policy activation: **NONE**  
Real Chrome/Yandex execution: **NONE**  
New P-code: **NO**

## 1. Purpose

This tranche reconciles two substantial research streams that were developed on different baselines:

1. the pre-P1-231 production-entry/cutover stream, culminating in the orphaned branch `research/final-production-entry-cutover-map-2026-09-10`; and
2. the now-canonical P1-231 release-evidence stream on `main`, including the S0/S1/S2 implementation DAG and completed S1-D migration rehearsal.

The old cutover branch was based on `e971bb796e1eed8c295032ab439bd2a8ef5e0d1a`. Current `main` is 21 commits ahead of that exact commit and now allocates `P1-231 | ACTIVE`. The old map therefore cannot be adopted verbatim even though many of its runtime/data-plane invariants remain useful.

The goal is to retain valid architecture work without reintroducing stale authority claims or bypassing the current P1-231 S2 approval fence.

## 2. Inputs and evidence authority

Current canonical authority:

- `project_docs/RESEARCH_REGISTRY.md` — current P-code ownership/status;
- `project_docs/TEST_STATUS.md` — current test/release truth;
- `project_docs/RESEARCH_P1_231_CONSOLIDATED_IMPLEMENTATION_DAG_2026-09-10_EVIDENCE.md` — current release-control implementation DAG;
- `project_docs/RESEARCH_P1_231_S1D_MIGRATION_REHEARSAL_SOURCE_SPEC_2026-09-10_EVIDENCE.md` — current S1 rollback/fail-closed boundary;
- `project_tools/test_p1_231_consolidated_implementation_dag_model.js` and the S1-D deterministic model — executable current research contracts.

Historical/orphaned input retained as evidence, not current authority:

- branch `research/final-production-entry-cutover-map-2026-09-10`;
- `project_docs/RESEARCH_FINAL_PRODUCTION_ENTRY_CUTOVER_MAP_2026-09-10.md`;
- `project_docs/RESEARCH_FINAL_PRODUCTION_ENTRY_CUTOVER_MAP_EXECUTION_RECEIPT_2026-09-10.md`;
- `project_tools/test_final_production_entry_cutover_map_model.js`;
- earlier `current-baseline-synthesis`, `project-production-entry-synthesis`, wave-readiness and cross-wave reconciliation branches.

The historical final cutover model passed 126 deterministic research cases on its exact historical branch. That proves internal consistency of that historical model, not current authority after the P1-231 chain landed.

## 3. Concrete stale statements in the old final cutover map

The old final cutover map explicitly states:

```text
P1-231 remains unallocated
```

That statement is now false. Current Registry authority says:

```text
P1-231 | ACTIVE
Release readiness/external QA authority is exact tested package/runtime generation
+ applicable current release-contract generation.
```

The old map also presents one compact external ordering:

```text
Z
-> real unpacked-Chrome acceptance
-> final real Yandex L5
-> release readiness + explicit release decision
```

This remains useful as an **execution-readiness ordering**, but it is not a replacement for the current P1-231 control-plane implementation DAG. Current P1-231 independently defines S0/S1/S2 release identity/evidence/readiness/gate/build/publish authorities, with every S2 policy-activation node behind explicit user approval.

Therefore the two streams must be composed rather than one replacing the other.

## 4. Reconciled model: three distinct planes

The project now needs three explicitly separate planes.

### 4.1 Runtime/data-plane implementation plane

This is the valid core inherited from the production-entry stream:

```text
A0  OperationReceipts foundation
U0  protocol/update fencing
J0  Journal v8 structural package
A1  exact source/content authority
A2  worker-issued physical operation admission
D0a passive Journal finalization/CAS primitives
B0  exact render/source fence
B1  sealed PDF retry cache v4
W5  auth-core generations
C0  immutable Yandex operation context
C1  exact remote-save/effect engine
D1  exact destructive remote effects
D2  end-to-end save finalization
W4/W6 resumable data/projection/view/search work
E0  common read-only reconciliation
E1  UI reconciliation cutover
Z   coordinated runtime authority/default-effect activation
```

This plane is primarily about product state, durable operation identity, schema compatibility, exact source/effect binding and recovery semantics.

### 4.2 Release-control implementation plane — P1-231

Current canonical release-control DAG:

```text
S0-A package authority
S0-B source-generation authority
S0-C release-contract projections
S0-D builder contract
S0-E identity engine
S0-F candidate-generation verifier
S0-G evidence settlement
S0-H passive builder/verifier
S0-I PR checker integration

S1-A shadow identity
S1-B shadow settlement
S1-C builder equivalence
S1-D migration rehearsal

APPROVAL = explicit user approval for release-policy activation

S2-A readiness authority migration
S2-B official release gate
S2-C official artifact build/verification
S2-D publish choreography
S2-E real external Yandex qualification integration
```

S0/S1 are passive/shadow research/implementation authorities. S2 changes canonical release policy and remains fenced.

### 4.3 Release execution/evidence plane

Actual release execution must satisfy current `TEST_STATUS.md`, independently of when supporting code is implemented:

```text
exact implementation candidate fixed
+ exact repository CI PASS
+ real unpacked Chrome acceptance
+ real permission/debugger/download/native-save paths as applicable
+ real Yandex OAuth/API/provider E2E including L5 final qualification
+ release-blocker review
+ explicit release decision
+ current-main/current-contract freshness
+ exact artifact identity
=> only then publish/tag/Release execution may succeed
```

Implementation of a publish orchestrator is not itself permission to publish. Installation of a release gate is not a release decision. A green deterministic model is not external QA.

## 5. Preserved production-entry invariants

The following old-map conclusions remain compatible with current canonical research and should be retained for future implementation work.

### 5.1 One effect, one authority owner

Dual-format storage is allowed during migration, but dual authority over the same physical effect is not.

```text
legacy record -> legacy evidence-limited reconciler
v2 record     -> exact-v2 reconciler
```

Never synthesize stronger v2 provenance around a legacy record and allow both paths to retry/start the same effect.

### 5.2 Durable admission precedes non-cancellable effect

For browser/provider side effects:

```text
durable admission
-> exact domain/source/context authority
-> durable effect-start boundary
-> physical effect
```

A timeout after the effect-start boundary is unknown settlement, not cancellation.

### 5.3 Admission-off / reconciliation-on rollback

A rollback/hotfix may stop new admissions while retaining read/reconcile support for already-admitted effects.

Forbidden:

```text
disable v2 code
-> forget started-unknown receipt
-> user retry becomes a fresh effect
```

### 5.4 Forward-only schema compatibility

The old map's proposed Journal v8 and PDF-cache v4 cuts are forward-only once a real profile has opened the new schema. Rollback after an irreversible schema cut means a forward-compatible hotfix, not pretending the profile can safely return to an old opener.

This remains a **future implementation contract**, not a claim that those migrations exist on current `main`.

### 5.5 Heavy migration work stays resumable/post-open

Structural store/index creation belongs in versionchange. Heavy URL/stat/summary rebuilds remain bounded, resumable and generation-published only after completion.

### 5.6 Stale protocol contexts fail closed for mutation

Old extension/content/offscreen pages surviving an update may not obtain stronger authority by sending legacy-shaped payloads to a newer worker.

### 5.7 No bulk legacy trust promotion

Historical data remains at the evidence level it actually possessed. New exact identity may be generated only from current admissible authority, not retroactively fabricated.

## 6. Superseded or reclassified old-map conclusions

### 6.1 `P1-231 remains unallocated` — superseded

Current Registry is authoritative. No document or branch derived from pre-P1-231 history may use the old unallocated statement for number allocation or status decisions.

### 6.2 `implementation-ready` — narrowed

The old final map concluded that broad internal architecture was sufficient to begin staged implementation. After P1-231, that conclusion must be read as:

```text
runtime/data-plane production-entry architecture
= sufficiently specified for bounded implementation planning
```

It must not be read as:

```text
release-control activation approved
release evidence current
S2 authorized
release-ready
```

### 6.3 `Z -> Chrome -> L5 -> release` — reclassified

This chain remains a release **execution** safety ordering. It does not define the P1-231 implementation/control-plane dependency graph.

`Z` is a runtime authority cutover, not equivalent to:

- P1-231 S2 approval;
- release readiness migration;
- official release gate activation;
- external QA settlement;
- explicit release decision.

### 6.4 Old cutover branch as implementation source — forbidden without rebasing/reconciliation

The old branch diverges from current main and predates the 21-commit P1-231 chain. Cherry-picking or implementing directly from it would import stale assumptions. Future production work must derive from current main and cite preserved old-map invariants only as historical design input.

## 7. Cross-plane dependency rules

The three planes compose through explicit bindings.

### R1 — runtime candidate identity must be consumable by release identity

When runtime implementation eventually changes package/runtime bytes, P1-231 package/source-generation identity must bind to the exact resulting candidate. Release evidence cannot be carried over merely because an older runtime tranche passed deterministic tests.

### R2 — runtime schema authority and release authority remain separate

A Journal schema/version or PDF cache migration may be necessary for product correctness, but it cannot mutate `RELEASE_READINESS.md` or settle release receipts by itself.

### R3 — runtime `Z` does not satisfy S2 approval

Even a fully implemented/validated runtime authority cutover does not constitute explicit release-policy approval.

### R4 — S2 approval does not prove runtime correctness

Conversely, future permission to activate release policy does not waive product correctness, migration or runtime external QA.

### R5 — external evidence binds exact candidate/contract generation

Chrome/Yandex evidence must be for the exact candidate/package/runtime generation and applicable contract generation required by P1-231. Old branch run IDs are historical proof only.

### R6 — publish execution requires external evidence even if publish code exists

The release orchestration code may exist before the final QA event, but actual tag/Release publication must fail closed until all required current external evidence, blocker review and explicit decision are present.

### R7 — current-main freshness remains final

After build/gate/evidence settlement, a main movement invalidates the stale execution decision where current-main identity is required. No old production-entry branch can bypass the P1-231 main-movement fence.

## 8. Current state projection

At `main = f9fd76743d6e7ccf6b589f8e9197c762ead91dcd`:

```text
P1-231 status = ACTIVE
P1-231 S1-D = canonical research-complete
V1 readiness declaration = canonical
V1 release gate = canonical
manifest version = 0.9.8
target_version = 0.9.9
release readiness = NOT READY
V1 blockers = 5
S2 release-policy approval = absent
product ZIP publication = not authorized
real current-release Chrome/Yandex qualification = still required
```

This tranche does not alter any of those facts.

## 9. Orphaned branch interpretation

The repository still contains many historical `research/*` branches. Their existence is not proof that the content is current, rejected, or safe to merge. At least these higher-level synthesis branches are known to diverge from current main and retain unique files:

```text
research/current-baseline-synthesis-2026-09-09
research/project-production-entry-synthesis-2026-09-09
research/final-w1-w6-cross-wave-reconciliation-2026-09-09
research/final-production-entry-cutover-map-2026-09-10
```

The final production-entry cutover branch is the most recent integrated predecessor among these, but it still predates current P1-231 authority. Therefore this reconciliation treats those branches as historical source material, not a queue to merge wholesale.

A future branch-hygiene cleanup may delete merged/superseded refs after provenance is retained, but ref deletion is repository hygiene, not part of this research tranche.

## 10. Reconciled future implementation choreography

Without authorizing implementation here, the safe conceptual order is now two-dimensional.

### Runtime/data plane

```text
A0/U0/J0
-> A1/A2/D0a
-> B0/B1
-> W5/C0/C1
-> D1/D2/W4W6
-> E0/E1
-> Z
```

### Release-control plane

```text
P1-231 S0/S1 passive authorities/shadow proof
-> explicit S2 approval
-> S2 readiness/gate/artifact/publish-control implementation
```

### Release execution plane

```text
exact final candidate
-> repository CI
-> real Chrome acceptance
-> real Yandex E2E/L5 where required
-> blocker review
-> explicit release decision
-> fresh-main/fresh-contract/artifact checks
-> publish execution
```

No arrow from runtime `Z` directly authorizes S2. No arrow from S2 approval skips runtime/external evidence. No historical branch run substitutes for exact current-candidate evidence.

## 11. Research implications for ACTIVE owner portfolio

This reconciliation also clarifies how broad ACTIVE owners fit the future plan.

Runtime/data-plane tranches are composition points for many existing owners rather than new umbrella P-codes:

- source/document/application exactness: P0-070, P0-080, P1-125, P1-171, P1-175, P1-198, P1-200, P1-203, P1-210;
- immutable PDF generation/cache: P0-023, P0-079, P1-003, P1-150, P1-167, P1-187, P1-229, P1-230;
- Journal generation/CAS/finalization: P0-076, P1-197, P1-205, P1-206, P1-207, P1-211, P1-216, P1-225;
- Yandex exact context/object/effect settlement: P0-022, P0-069, P0-073, P0-074, P0-078, P1-090, P1-164, P1-177, P1-179, P1-183, P1-184, P1-195, P1-196;
- browser/MV3 late settlement and UI reconciliation: P1-124, P1-130, P1-146, P1-156, P1-157, P1-166, P1-169, P1-170, P1-173, P1-192, P1-204, P1-209, P1-210, P1-217;
- release authority: P1-231.

The implementation map is therefore a dependency choreography across existing owners, not a status-closing mechanism. Each owner still requires its own acceptance evidence before status can change.

## 12. Failure modes prevented by this reconciliation

### F01 — stale P-number authority

A historical branch says P1-231 is free/unallocated and future research reuses or ignores it.

Required: fail; current Registry wins.

### F02 — runtime activation confused with release approval

`Z` is complete, therefore S2 is assumed authorized.

Required: fail.

### F03 — S2 approval confused with release readiness

Future S2 approval exists, therefore external QA is skipped.

Required: fail.

### F04 — publish-control implementation confused with publish execution

S2-D code exists, therefore tag/Release is permitted without current external evidence.

Required: fail.

### F05 — old branch CI reused as current evidence

Historical `e971...`/`34b6...` research run is treated as proof for current candidate.

Required: fail.

### F06 — schema rollback discards unresolved effects

New schema/effect has existed, then an old bundle is restored and v2 receipts are ignored.

Required: fail.

### F07 — bulk legacy promotion

Legacy row is wrapped into v2 identity without provenance.

Required: fail.

### F08 — main movement after evidence

Evidence/gate/build belonged to candidate A, current main is B.

Required: fail.

### F09 — data-plane and control-plane circular authority

Release evidence defines runtime object identity while runtime migration defines release evidence validity.

Required: fail; each authority retains one owner.

## 13. Deterministic model requirements

The companion model must assert at minimum:

1. current Registry allocates P1-231 as ACTIVE;
2. current test status remains NOT READY / manifest 0.9.8;
3. current P1-231 DAG includes explicit approval and S2 nodes;
4. runtime/data-plane and release-control nodes are distinct namespaces;
5. runtime `Z` cannot satisfy S2 approval;
6. release publish execution cannot succeed without repository CI, Chrome, Yandex L5/E2E, blocker review and explicit decision;
7. historical branch success cannot be current candidate evidence;
8. forward-only rollback retains reconciliation after started v2 effects;
9. legacy data cannot be bulk-promoted;
10. current V1 readiness/gate remain canonical before S2-A;
11. the current tranche remains research-only and cannot emit product ZIP/release authorization.

The test may read current canonical files to make stale-assumption drift observable.

## 14. No activation / no status change

This tranche intentionally makes no change to:

- `RESEARCH_REGISTRY.md` statuses;
- `RELEASE_READINESS.md`;
- `check_release_readiness.py`;
- `.github/workflows/release-gate.yml`;
- manifest/version;
- production runtime files;
- Chrome/Yandex state;
- tag/GitHub Release.

It allocates no new P-code because the discovered contradiction is reconciliation of stale historical research with the already-current P1-231 owner.

## 15. Conclusion

The pre-P1-231 production-entry work is not discarded. Its strongest runtime migration invariants remain valid design evidence, especially one-owner effects, pre-effect durable admission, forward-only schema compatibility, admission-off/reconciliation-on rollback, exact protocol fencing and no legacy trust promotion.

What changes is authority and composition:

```text
old runtime/data-plane cutover map
+ current P1-231 release-control DAG
+ current TEST_STATUS external-release requirements
= three-plane implementation/release model
```

This removes the stale `P1-231 unallocated` claim, prevents runtime `Z` from being confused with release-policy approval, and prevents release-control implementation from being confused with actual release execution.

The next research work may now proceed from current main into focused owner/tranche source specifications or branch-provenance cleanup. Production implementation or S2 activation remains outside this tranche.