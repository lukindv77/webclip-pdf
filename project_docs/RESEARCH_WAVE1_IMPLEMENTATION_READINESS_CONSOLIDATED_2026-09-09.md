# WebClip — Wave 1 consolidated implementation-readiness contract — 2026-09-09

Date: 2026-09-09  
Canonical production baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Registry authority: `project_docs/RESEARCH_REGISTRY.md` on canonical `main`  
Research branch: `research/wave1-implementation-readiness-2026-09-09`  
Mode: **RESEARCH-ONLY / PRE-PRODUCTION CONSOLIDATION**  
Production implementation: **NOT STARTED**.

This document supersedes only the *current interpretation* of earlier Wave 1 implementation-readiness notes where later J0/D/E/retention/capacity research refined the architecture. It does not delete or rewrite historical evidence.

No production source, manifest, Registry status, version, build, tag, release or deployment is changed by this tranche.

---

## 1. Current research baseline and source receipts

Current research synthesis uses the following exact research heads:

```text
foundation A0/U0/A1/A2
  research/wave1-foundation-source-spec-2026-09-09
  3c3a29f035ac5d5be2e5e8dd2e067baa1ecf682e

PDF B0/B1
  research/wave1-pdf-generation-source-spec-2026-09-09
  1dc9f52d8a2905fa2b0b9f4b233c84dbc23946d3

Yandex C0/C1
  research/wave1-yandex-context-effect-source-spec-2026-09-09
  abfb6932a2a6d33953a20d754a9f269c4adf8449

Journal schema J0
  research/wave1-journal-v8-migration-source-spec-2026-09-09
  8b669e1ed8adaa1d02a9b6725a717be182c56899

Journal D0/D1/D2
  research/wave1-journal-finalization-source-spec-2026-09-09
  9d0c12c86a0d49f72faf3ea75b9439a38cc692da

reconciliation E0/E1
  research/wave1-user-operation-reconciliation-2026-09-09
  c309140fd00b71f509f72c738bd9ffbefe19c0c0

Journal authority retention/GC
  research/wave1-journal-authority-retention-gc-2026-09-09
  4142238573fc4380a210c3264061988174db2a66

Journal authority capacity
  research/wave1-journal-authority-capacity-admission-2026-09-09
  a1699ee8fe0ef54b197d9556ba3547aca613157c

staged implementation DAG
  research/wave1-staged-implementation-plan-2026-09-09
  7622d3c4bd7c39ace339d3aad8e883304af93616

PD7/final coverage reconciliation
  research/pd7-single-axis-scroll-stable-2026-09-09
  90b2a3f653a84d58e807b5f1ce9e20bec569d152
```

The exact baseline-bound project research state is:

```text
DEEP-RESEARCH-COVERAGE-COMPLETE
implementation closure = INCOMPLETE
release regression = INCOMPLETE
release readiness = NOT READY
```

C42/Yandex live-provider semantics are explicitly research-terminal as `EXTERNAL-REQUIRED`; real L5 execution is intentionally deferred to the final external validation stage and is not treated as a hidden research gap.

PD7 is also not a current blocker for the selected Stable target: exact Chrome for Testing Stable `153.0.8010.36` returned `CSS.supports("named-feature(single-axis-scroll-container)") === false`, so the selected Stable state is `CURRENT-STABLE FEATURE-INACTIVE / WATCH`.

---

# Part I — final implementation DAG

## 2. Preferred tranche order

The consolidated dependency graph is:

```text
A0  passive OperationReceipt primitives
 ↓
U0  protocol/update fencing
 ↓
J0  passive WebClipJournal v8 migration
 ↓
A1  reviewed content-selection authority
 ↓
A2  worker-issued physical operation identity
 ↓
B0  exact source/render fence + one-pass H/N
 ↓
B1  immutable PDF generation cache v4
 ↓
C0  immutable Yandex operation context
 ↓
C1  exact remote effect/content receipt
 ↓
D0  Journal generation/revision/finalization authority
 ↓
D1  Delete/Mark Read exact domain receipts
 ↓
D2  local/remote save finalization composition
 ↓
E0  common read-only reconciliation
 ↓
E1  user-facing reconciliation/retry cutover
 ↓
Z0  trusted-default activation + Closure Sweep
```

The order is semantic, not cosmetic. Later tranches must not confer a stronger trust classification if a predecessor authority is absent.

---

## 3. Trust levels by tranche

### A0 — passive storage only

Introduces `WebClipOperationReceipts v1` and pure normalization/CAS helpers.

A0 must not yet mean:

```text
caller operationId became physical authority
exact source generation exists
PDF cache is trusted
remote effect is trusted
Journal finalization is trusted
```

A0 is a durable namespace/foundation only.

### U0 — compatibility fence

Introduces explicit protocol versioning between worker/content/offscreen/extension pages.

Mutating v2 requests fail closed on incompatible bundle contexts.

U0 is required before first trust-bearing cutover because an extension update can activate a new worker while old content/page/offscreen contexts remain alive.

### J0 — passive schema migration

Moves `WebClipJournal` from v7 to v8 and creates passive authority stores/metadata.

J0 does not activate their production authority yet.

### A1/A2 — reviewed source and physical execution identity

A1 proves exact reviewed content/application/selection generation.

A2 mints worker-only `physicalOperationId P` and durable admission receipt.

The legacy caller `operationId` remains only presentation/correlation compatibility.

### B0/B1 — exact PDF artifact identity

B0 creates source-fenced render attempt `R`, exact bytes length `N` and SHA-256 `H` under Probe A/B/C.

B1 creates immutable operation-owned PDF generation `G` in DB4.

Only after A2+B0+B1 may a PDF row be classified as trusted exact-v2.

### C0/C1 — exact destination/effect identity

C0 freezes account/root/auth/config/publication generations for the physical operation.

C1 persists exact effect ownership and remote content/object receipt.

Provider live semantics remain an L5 external verification item, but source architecture/fallback behavior is already defined.

### D0/D1/D2 — local authority composition

D0 activates `JG + ER + F` Journal authority.

D1 adds exact destructive/move effect receipts.

D2 composes verified local/remote effect with exact Journal finalization or truthful suppression.

### E0/E1 — projection, not new authority

E0 reads common/domain receipts and projects `lookupResolution`, `operationClass`, and `retryDisposition`.

E1 changes user surfaces to obey those projections instead of treating transport errors as authoritative failure.

### Z0 — trusted-default activation

Z0 is the first point at which old fallback semantics are intentionally no longer accepted for v2 paths.

It includes closure/source/physical/change-impact gates.

---

# Part II — database choreography

## 4. `WebClipOperationReceipts v1`

Created by A0.

Service-worker owned.

Key:

```text
physicalOperationId
```

Important indexes:

```text
clientRequestId unique
[operationKind, subjectKey]
updatedAt
```

No migration of arbitrary old `operationId` into physical authority.

---

## 5. `WebClipJournal v7 -> v8`

J0 is a package-level forward schema migration.

Final v8 adds at least:

```text
journalFinalizations        // F
pendingRemoteMutations      // E / destructive-domain effect state
meta.datasetGeneration      // JG
meta.authorityMode
```

Existing data rows remain usable.

Entry revision is lazy rather than mass-backfilled.

Legacy row CAS bridge:

```text
entryId
+ JG
+ ER = legacy-v7
+ captured global JR
```

After first successful exact CAS:

```text
ER = real random generation
```

and unrelated global JR movement no longer invalidates that row.

### 5.1 Single migration owner

Preferred source ownership:

```text
service worker = structural migration owner
journal page   = schema-ready client
```

The Journal page should ask worker for schema readiness before direct IDB read.

A page-side unexpected `onupgradeneeded` must fail/abort rather than independently invent schema.

### 5.2 Rollback boundary

After a profile opens v8 successfully, rollback to a package that explicitly opens v7 is unsafe.

Rollback means a forward-compatible fix that still understands v8.

---

## 6. `WebClipPdfRetryCache v3 -> v4`

B1 is another forward schema migration.

Shared openers:

```text
service-worker.js
offscreen.js
```

Both must be updated in the same package tranche.

DB4 separation:

```text
pdfs
  immutable pdf-generation:<G>

meta
  exact G/P/S/H/N/trust

retryIndex
  mutable discovery pointer tab -> G
```

No trusted retry may use `tab:<id>` as PDF identity.

Legacy v3 rows remain `legacy-unbound` and age out under legacy policy.

---

# Part III — update / restart safety

## 7. Protocol fencing precedes both forward migrations

U0 must land before J0/B1 trust activation.

Required behavior for stale contexts:

```text
old content vs new worker
  -> protocol mismatch -> fail closed

old extension page vs new worker
  -> reload-required / read-only degraded state

old offscreen vs new worker
  -> do not silently reuse for mutating v2 transfer
```

If old offscreen may own a started/unknown effect, closing it is not evidence of cancellation. Reconcile the existing effect before new mutation.

---

## 8. Restart state must be receipt-driven

After worker restart:

```text
OperationLog memory/progress state
```

is never used as the sole settlement truth.

Recovery starts from:

```text
OperationReceipt P
+ exact domain checkpoint
+ exact generation/context data
```

UI may disappear; physical operation receipt remains.

---

# Part IV — source/artifact identity

## 9. Identity stack

The authoritative chain is:

```text
clientRequestId              // one admission request
clientCorrelationId          // display/support grouping
physicalOperationId P        // worker-issued execution
selection authority          // user-reviewed content generation
sourceGenerationId S         // exact source generation
renderAttemptId R            // one render attempt
pdfGenerationId G            // one immutable successful PDF
byteLength N
sha256 H
YandexOperationContext C
RemoteEffectId E
RemoteObjectReceipt O
JournalFinalizationIntent F
Journal dataset generation JG
entry revision ER
```

None of these should be reused as a substitute for another identity type.

---

## 10. PDF generation trust gate

Exact-v2 PDF requires all of:

```text
protocol v2
worker-issued P
exact S
Probe A/B/C
render EOF
N
H
immutable DB4 G
```

The existence of DB4 alone does not create trust.

A provisional DB4 implementation must not enable exact retry semantics until P/S/R authority exists.

---

# Part V — remote/Yandex semantics

## 11. Immutable operation context

Each remote physical operation captures one immutable context containing at least:

```text
accountUid
authGenerationId
routingGenerationId
rootPath
configGenerationId
publicationPolicyGenerationId
```

Later global settings/auth changes do not retarget the unresolved operation.

Fresh credentials may be used for read-only reconciliation only when account identity is proven compatible; they do not authorize a new mutation for an old operation automatically.

---

## 12. Remote effect ownership

`allowExisting` is not a generic success shortcut.

An existing object can be adopted only by the same exact unresolved effect receipt with matching:

```text
P
G/H/N/S
context C
remotePath/account/root
```

and after exact remote verification.

A new operation does not inherit an object merely because path/size match.

---

## 13. Live Yandex L5 status

For research coverage, C42 is already bounded external terminality:

```text
DETERMINISTIC-COVERED / FINDING (P1-184)
+ EXTERNAL-REQUIRED for live provider checksum/object/publication semantics
```

Real Yandex L5 is intentionally deferred until the final external-validation phase.

When executed later, it should prove or falsify provider metadata semantics (`sha256`, `resource_id`, `revision`) and exercise the provider-agnostic fallback where needed.

No other internal research tranche should be blocked waiting for this test.

---

# Part VI — Journal finalization and destructive operations

## 14. Early `JournalFinalizationIntent F`

F is created early, before long render/external work.

It defines which Journal state the operation is allowed to finalize later.

Scoped clear revokes matching F only.

Import/replace/clear-all may advance JG and revoke wider F sets.

This separates:

```text
external effect ownership
from
right to mutate current Journal state
```

---

## 15. Effect start linearization

Before the actual non-cancellable provider/browser effect call:

```text
readwrite(F,E)
verify exact F admitted
verify E prepared
persist E -> started-unknown
COMMIT
then call provider/browser effect
```

This makes the effect-start boundary durable.

### 15.1 Revocation before start

If F is revoked while E is still `prepared`:

```text
E -> canceled-before-start
```

This terminal state is exact proof that provider call was not admitted.

### 15.2 Revocation after start

If E is already:

```text
started-unknown
```

later F revocation does not change that classification.

External effect still requires reconciliation.

---

## 16. Finalization outcomes

Important exact outcomes:

```text
remote/local effect verified + F/JG/ER valid
  -> local-finalized / succeeded

remote/local effect verified + F revoked/stale
  -> remote-complete-local-suppressed
  -> common status settled-partial
  -> retryDisposition none

provider/browser effect may have started but settlement unknown
  -> effect-unknown
  -> reconcile-only

F revoked before provider start
  -> canceled-before-start
  -> canceled
  -> new physical attempt may be allowed
```

No outer transport error may downgrade a started/unknown effect to failed-before-effect.

---

# Part VII — retention, GC and capacity

## 17. Unresolved authority is never evicted for capacity

Safety invariant:

```text
capacity pressure
!= cancellation
```

If active authority cap is full:

```text
reject new admission
```

rather than deleting an unresolved row.

---

## 18. Transactional capacity admission

No derived `activeFCount` / `activeECount` ledger is needed initially.

For one store:

```text
readwrite(store)
  count active/total
  enforce caps
  add row
COMMIT
```

For E tied to F:

```text
readwrite(journalFinalizations, pendingRemoteMutations)
  verify exact F admitted and belongs to P
  count active/total E
  add E(prepared)
COMMIT
```

Overlapping readwrite transactions on the same scope serialize, so the later admission observes the earlier committed row.

Count and add must not be split by an await outside the same transaction.

---

## 19. GC ordering across databases

`WebClipJournal` and `WebClipOperationReceipts` cannot be mutated atomically together.

Therefore terminal GC order is intentionally asymmetric:

```text
1. exact F/E terminal truth exists
2. persist compact terminal summary into P
3. satisfy retention / late-settlement barriers
4. delete detailed terminal F/E atomically inside Journal DB
5. retain P
6. delete P only after its own later retention criteria
```

This ensures:

```text
domain detail GC'd
!= operation not admitted
```

Unresolved/manual/evidence-limited rows are not silently TTL-deleted into absence.

---

# Part VIII — reconciliation and UI

## 20. Common reconciliation is a projection

Target axes:

```text
lookupResolution
operationClass
retryDisposition
```

Relevant operation classes now include:

```text
not-admitted
running
domain-pending
effect-unknown
succeeded
failed-before-effect
failed-terminal
canceled
settled-partial
evidence-limited
```

`settled-partial` is required for exact external success with intentionally/stalely suppressed local Journal finalization.

---

## 21. UI retry rules

User surfaces must obey only explicit `retryDisposition`.

```text
new-attempt-allowed
  -> may mint new P

same-operation-only
  -> continue exact existing P/domain receipt

reconcile-only
  -> read-only status check only

manual-resolution
  -> no automatic mutating retry

none
  -> terminal result; no retry
```

A rejected/lost runtime Promise is not by itself a retry authorization.

---

# Part IX — exact production tranche boundaries

## 22. A0 — passive OperationReceipt foundation

Primary production file:

```text
service-worker.js
```

Potential helper extraction is allowed if it improves testability, but first implementation should minimize new runtime surfaces.

GREEN requires:

- DB1 opens and upgrades safely;
- unique clientRequestId index;
- physical P worker minting helper exists but legacy flows are not yet falsely upgraded;
- receipt CAS works;
- active capacity does not evict unresolved receipts.

---

## 23. U0 — protocol fencing

Likely package files:

```text
service-worker.js
content.js
offscreen.js
journal.js
options.js
popup.js where mutating admission originates
```

GREEN requires stale-context failure before mutation.

---

## 24. J0 — Journal v8 passive migration

Atomic package files:

```text
service-worker.js
journal.js
```

GREEN requires worker-first and page-first user schedules to converge on one v8 schema through worker-owned migration.

No authority activation yet.

---

## 25. A1/A2 — selection + physical operation identity

Files primarily:

```text
content.js
popup.js
service-worker.js
```

GREEN requires reviewed receipt validation after preparation and worker `MessageSender` exact document admission.

---

## 26. B0/B1 — source/render/PDF generation

B0 primarily:

```text
service-worker.js
```

B1 atomic package:

```text
service-worker.js
offscreen.js
```

GREEN requires exact Probe A/B/C, one-pass H/N, immutable G and exact offscreen G/N/H lookup.

---

## 27. C0/C1 — destination/effect

Primary:

```text
service-worker.js
offscreen.js
```

Exact file split depends on whether provider metadata verification remains worker-side or offscreen-side; authority ownership remains worker common/domain receipts.

No provider L5 is required to implement the deterministic/fallback architecture, but P1-184 cannot become DONE until its required live receipt is later executed.

---

## 28. D0/D1/D2 — Journal authority

Primary:

```text
service-worker.js
journal.js
```

D0 activates passive v8 structures.

D1 migrates Delete/Mark Read to exact F/E/object identity.

D2 migrates local/remote save finalization and clear/import checkpoint semantics.

---

## 29. E0/E1 — reconciliation cutover

E0 is worker read-only API/projection.

E1 touches user surfaces:

```text
content.js
journal.js
options.js
prepared-save-as.js / owning page flow where applicable
```

Old blind-retry presentation must be removed or limited to legacy-safe cases.

---

## 30. Z0 — trusted-default activation

Z0 is not a feature commit; it is a closure/activation tranche.

It removes/blocks old fallback semantics on v2 paths only after all predecessor gates are GREEN.

Expected checks:

```text
no caller operationId physical authority
no same-URL source substitution
no mutable tab-cache exact retry
no size-only remote adoption
no current-global auth/root retarget
no late Journal mutation without F/JG/ER
no blind retry after unknown effect
no unresolved authority eviction
no stale protocol mutation
```

---

# Part X — rollback and partial deployment rules

## 31. Safe rollback before forward schema cutovers

Before J0/B1, a code-only tranche can ordinarily be reverted if its own new data representation has not become relied upon as authority.

Still require Change Impact for any written receipts.

---

## 32. Rollback after J0

Do not install an old v7-only package.

Fix forward with v8 compatibility.

---

## 33. Rollback after B1

Do not install an old DB3-only worker/offscreen package.

Fix forward with DB4 compatibility.

---

## 34. Rollback after external effect activation

After C1/D1/D2 begin emitting started/unknown effects, rollback code must preserve read/reconciliation compatibility with their durable receipts.

A rollback may disable new admission, but cannot pretend outstanding effects vanished.

---

# Part XI — closure evidence levels

## 35. Source/L2 gates

Every tranche should have:

```text
source contract gate
+ deterministic race/state model
```

No source/model PASS alone closes an owner whose contract requires physical/provider evidence.

---

## 36. Required browser/physical classes

Examples:

```text
U0  extension update with stale page/content/offscreen contexts
J0  real IndexedDB v7->v8 opener/migration schedules
A1  reload/BFCache/SPA selection-generation schedules
B0  navigation/debugger detach during render
B1  actual DB4 worker/offscreen retry after restart
D   clear/import vs late save/delete/Mark Read
E   page reload/lost-response reconciliation UI
```

Exact physical schedule may be grouped where one current Chrome run proves several adjacent contracts without hiding failures.

---

## 37. Deferred external L5

Real Yandex L5 remains the final external-provider closure stage.

It should be requested only after all internally controllable Wave 1 work and verification is complete or when an implementation decision genuinely cannot be resolved without provider evidence.

Until then:

```text
C42 research coverage remains terminal EXTERNAL-REQUIRED
P1-184 remains ACTIVE
release readiness remains NO
```

---

# Part XII — contradiction sweep

## 38. Earlier assumption superseded: Journal stays v7

Earlier Wave 1 notes that assumed no Journal schema bump are superseded.

Current rule:

```text
J0 = v7 -> v8 passive schema migration
```

because F/E must outlive/reconcile domain row replacement and cannot safely exist only as fields inside the row they protect.

---

## 39. Earlier assumption superseded: two Journal migration owners

Do not duplicate structural migration logic independently in worker and journal page.

Current preferred rule:

```text
worker = migration owner
page = schema-ready direct reader
```

---

## 40. Earlier assumption refined: PDF v4 can land first

DB4 mechanics may be implemented early only as provisional storage.

Trusted exact-v2 semantics cannot activate before A2+B0 source/operation authority.

---

## 41. Earlier assumption refined: terminal success/failure enum

Common reconciliation now needs `settled-partial` and exact `canceled-before-start` projection.

This avoids relabeling external success + local suppression as remote failure and avoids treating post-start revocation as cancellation.

---

## 42. Earlier status correction: PD7 and coverage

Older intermediate documents stated PD7 still blocked coverage.

The later authoritative 2026-09-09 reconciliation supersedes that intermediate status:

```text
PD7 selected Stable = feature-inactive/watch
C42 = bounded external terminality
DEEP-RESEARCH-COVERAGE-COMPLETE
```

Do not regress current project status back to `RECONCILIATION-BLOCKED` unless a new Change Impact actually reopens an affected cell.

---

# Part XIII — readiness decision

## 43. Internal Wave 1 research status

For the exact baseline and branch heads listed in section 1:

```text
Wave 1 architecture                      DEFINED
foundation source specification          DEFINED
update/restart protocol                  DEFINED
Journal v8 migration                     DEFINED
trusted save/source protocol             DEFINED
PDF generation/cache v4                  DEFINED
Yandex immutable context/effect          DEFINED
Journal finalization/destructive flows   DEFINED
reconciliation/retry semantics           DEFINED
retention/GC/capacity                    DEFINED
staged implementation DAG                DEFINED
rollback boundaries                      DEFINED
```

The remaining uncertainty is primarily implementation/physical/provider closure, not internal architecture invention.

---

## 44. Production entry condition

The project can enter staged Wave 1 production implementation without additional broad architecture research provided:

1. canonical `main` is rechecked before each tranche;
2. any new production change receives targeted Change Impact;
3. new evidence does not invalidate an invariant above;
4. Yandex L5 remains deferred but not forgotten;
5. Registry is updated only after implementation + required closure receipts, not from research models alone.

---

## 45. What remains research rather than implementation

After this consolidation, further broad internal Wave 1 research is not justified by default.

New research should be triggered only by:

```text
implementation contradiction
new browser/platform delta
provider/live evidence contradiction
new user/product requirement
unexpected physical test result
new unowned root cause
```

Otherwise the next work is staged engineering + Closure Sweep.

---

## 46. Model receipt

Research file:

```text
project_tools/test_wave1_implementation_readiness_consolidated_model.js
```

Actual local execution on 2026-09-09:

```text
Wave 1 consolidated implementation-readiness model: PASS
cases=40
topology=A0>U0>J0>A1>A2>B0>B1>C0>C1>D0>D1>D2>E0>E1>Z0
```

This is L2 deterministic consolidation evidence only.

---

## 47. Current project state after consolidation

```text
DEEP-RESEARCH-COVERAGE-COMPLETE = YES

Wave 1 internal architecture research = IMPLEMENTATION-READY
production implementation             = NOT STARTED
critical closure                      = INCOMPLETE
release regression                    = INCOMPLETE
release readiness                     = NOT READY

PD7 selected Stable                   = FEATURE-INACTIVE / WATCH
Yandex L5                             = DEFERRED TO FINAL EXTERNAL STAGE
C42 research classification           = EXTERNAL-REQUIRED / TERMINAL FOR COVERAGE
P1-184                                = ACTIVE
P1-231                                = NOT ALLOCATED
```

This does not declare the whole project implementation-ready in every Wave 2–5 owner. It declares the internally researched **Wave 1 program** sufficiently specified to enter staged production work without another broad architecture-discovery cycle.
