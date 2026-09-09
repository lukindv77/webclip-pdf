# WebClip — Wave 1 staged implementation plan B/C/D/E Change Impact — 2026-09-09

Date: 2026-09-09  
Canonical production baseline rechecked before write: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Canonical Registry blob: `81e5867c0e0936b9524ece8949c53ad4ed83523c`  
Research branch: `research/wave1-staged-implementation-plan-2026-09-09`  
Mode: **RESEARCH-ONLY / CHANGE-IMPACT ADDENDUM**

Inputs incorporated after the original staged plan:

```text
B0/B1 trusted PDF generation source spec
C0/C1 immutable Yandex context/effect source spec
D0/D1/D2 Journal finalization source spec
D→E reconciliation addendum
PD7 current coverage-status boundary
```

No production source, Registry, workflow, build, version, tag, release or deployment is changed.

---

## 1. Executive correction

The original staged plan remains valid at the high-level Wave 1 dependency level, but three implementation details are superseded:

1. **Journal v7 is no longer sufficient for the preferred D design.**
2. **E requires a terminal `settled-partial` class after D finalization revocation.**
3. Historical `DEEP-RESEARCH-COVERAGE-COMPLETE = YES` in the old plan is not current project status because PD7 exact current-target evidence remains outstanding.

The revised topology introduces one passive migration node:

```text
J0 = WebClipJournal v8 passive schema migration
```

---

## 2. Why the old “keep Journal v7” decision is superseded

The original plan preferred v7 because it assumed the new Journal authority could be represented primarily by additive fields/meta inside existing rows/stores.

D0/D1/D2 subsequently proved two independent lifecycle objects are required:

```text
JournalFinalizationIntent F
PendingRemoteMutation / destructive effect E
```

They cannot safely live only inside the mutable Journal entry because:

- import/replace may create a different row with the same id;
- Delete/Mark Read effect ownership must survive row removal/replacement;
- started/unknown external effects must survive clear/import;
- P1-208 recovery fairness needs phase/status-oriented enumeration;
- a fixed destructive target must survive restart without re-selection;
- scoped finalization revocation and effect ownership are separate truths.

The preferred D persistence therefore becomes:

```text
WebClipJournal v8

existing stores retained
+ journalFinalizations
+ pendingRemoteMutations

meta
+ datasetGeneration

entries
+ lazy/additive entryRevision
```

This is now the preferred architecture over forcing unindexed compound authority blobs into `meta`.

---

## 3. Why F/E should not simply move to `WebClipOperationReceipts`

The common operation receipt DB introduced by A0 remains the right owner for worker physical admission/reconciliation identity P.

However D effect-start linearization requires an exact ordering against current Journal authority:

```text
F/JG/ER valid
AND E still prepared
-> E becomes started-unknown
-> only then provider mutation starts
```

If Journal authority and E start phase were in unrelated IndexedDB databases, there would be no atomic transaction across them. A clear/import could linearize between a Journal read and the remote-effect phase write.

Keeping F/E in `WebClipJournal` allows one D transaction to order:

```text
Journal authority check
+ finalization state
+ destructive effect phase transition
```

The common `WebClipOperationReceipts` row references F/E by durable ids; it does not replace their domain authority.

---

## 4. New J0 passive migration node

### 4.1 Purpose

Split schema migration risk from D behavior activation.

J0 changes persistence shape only. It does not yet claim new D authority.

### 4.2 Dependencies

```text
U0 -> J0
```

J0 must follow protocol/update fencing because `service-worker.js` and `journal.js` are shared openers and old long-lived extension pages must not silently continue as compatible v7 mutation clients.

J0 does not require A2 physical-operation activation to create passive stores.

### 4.3 Files — package atomic

```text
service-worker.js
journal.js
```

Both must request/open:

```text
WebClipJournal version 8
```

and implement schema-compatible upgrade callbacks.

### 4.4 Upgrade

Retain every existing store/index.

Add:

```text
journalFinalizations
  keyPath = finalizationId
  indexes (bounded implementation target):
    state
    updatedAt
    urlKey
    siteKey
    physicalOperationId

pendingRemoteMutations
  keyPath = remoteEffectId
  indexes:
    phase
    updatedAt
    finalizationId
    operationId / physicalOperationId as appropriate
```

Add missing `datasetGeneration` meta lazily/transactionally.

Do not cursor-rewrite all existing Journal rows merely to install `entryRevision`.

### 4.5 Passive intermediate trust

After J0 but before D0:

```text
DB schema = v8
new stores = empty/passive
production Journal mutation semantics = still legacy
```

No existing row/checkpoint is promoted to exact-v2 merely because the DB was upgraded.

---

## 5. J0 update safety

A literal package downgrade to old v7 code after J0 is unsafe for the same reason as PDF cache DB4:

```text
old opener explicitly requests v7
existing database is v8
-> VersionError / unsupported state
```

Therefore Journal v8 is a forward migration boundary.

Rollback policy after J0:

```text
forward-compatible fix that still understands v8
```

not:

```text
install an old v7 package and hope it ignores the newer DB
```

The migration must not delete existing data during upgrade.

---

## 6. Shared opener contract

J0 now becomes one of the highest-risk package-atomic tranches because two different execution surfaces open one DB.

Required gate:

```text
worker opener schema == journal page opener schema
```

For every store/index added, both upgrade callbacks must converge to the same final schema regardless of which opener performs the version upgrade first.

Preferred implementation options:

1. one bundled shared schema helper usable by both worker and Journal page; or
2. deliberately duplicated upgrade code with an exact deterministic schema-equivalence test.

This composes with existing architecture backlog P2-019 but does not require promoting it to a new Wave 1 P1 owner.

---

## 7. Revised dependency graph

Preferred safe topology:

```text
A0 passive operation receipts
 |
 U0 protocol/update fencing
 |\
 | J0 Journal v8 passive schema
 |   \
 A1 exact content protocol
 |
 A2 worker physical admission
 |\
 B0 exact source/render fence   C0 Yandex context primitives
 |
 B1 immutable PDF DB4
 | \
 |  C1 exact remote effect/content
 |       \
 D0 JG/ER/F CAS activation
 | \      \
 |  D1 destructive move receipts
 |          \
 |           D2 save/download finalization composition
 |            /
 E0 reconciliation projection
 |
 E1 UI cutover
 |
 Z0 activation/closure sweep
```

One valid topological implementation order is:

```text
A0 > U0 > J0 > A1 > A2 > B0 > B1 > C0 > C1 > D0 > D1 > D2 > E0 > E1 > Z0
```

C0 remains logically independent of B0/B1 after A2 and may be reviewed earlier if desired. The displayed total order is a safe review order, not the only topological ordering.

---

## 8. Revised D0 cut

D0 is no longer responsible for introducing schema v8 itself; J0 already did that.

D0 activates:

```text
JG normalization/read
ER lazy normalization/read/write
Journal entry authority receipt
mutateJournalEntryCAS
deleteJournalEntryCAS
JournalFinalizationIntent F creation/revocation/finalization
scoped clear F revocation semantics
clear-all/import JG rotation
```

D0 must not yet issue a new destructive remote move until D1 installs the exact effect checkpoint path.

---

## 9. Revised D1 cut

D1 uses `pendingRemoteMutations` created by J0.

Mark Read and Delete→Trash become:

```text
F exact Journal authority
-> locate/verify exact source resource
-> choose one fixed target
-> persist E prepared
-> atomically validate F/JG/ER + E prepared
-> set E started-unknown
-> issue provider move
-> exact provider reconciliation
-> E verified
-> CAS/suppress local finalization
```

Current `readMove*` fields become legacy compatibility/recovery inputs, not the long-term v2 effect authority.

This supersedes the old staged-plan wording “strengthen existing readMove checkpoint rather than creating an unrelated parallel mechanism”: the preferred v2 mechanism is now an explicit domain effect store, while legacy fields remain conservatively readable.

---

## 10. Revised D2 cut

D2 binds every save destination to early F.

### Yandex

```text
F
+ P/S/G/H/N
+ C
+ remote E/O
+ publication outcome
-> exact Journal append or suppression
```

### Automatic local download

```text
F
+ P/S/G/H/N
+ exact download intent/effect
-> exact Journal append or suppression
```

Clear/import behavior changes from:

```text
delete pending checkpoint == assume cancellation
```

to:

```text
prepared pre-effect work may be canceled safely
started/unknown effect checkpoint survives
F may be revoked
reconciliation continues
Journal resurrection is suppressed
```

This is the P0-072 implementation boundary.

---

## 11. B0/B1 terminology synchronization

The later B source spec is authoritative for PDF identity details.

Use:

```text
R = renderAttemptId
G = pdfGenerationId created only after EOF + H/N + final source Probe C
H = exact incremental SHA-256 over IO.read bytes
N = exact byte count
```

Recommended immutable key spelling from the B source spec:

```text
pdf-generation:<G>
```

The older staged-plan shorthand `pdf:<G>` should be treated as conceptual only.

`retryIndex` remains mutable pointer state; PDF generation row is create-once.

---

## 12. C1 terminology synchronization

C1 exact remote adoption is bound to the same:

```text
P/G/H/N/S/C/E
```

A same-path/same-size object is not adopted by a fresh operation.

Provider `sha256 + size + resource_id + revision` is the preferred verification path if confirmed by real L5 WebClip/Yandex evidence. If SHA-256 is not available with required semantics, exact download-and-hash is the fallback; size-only is not a v2 success path.

---

## 13. E0 refinement after D

Add operation class:

```text
settled-partial
```

for exact terminal states where:

```text
external/browser effect verified
+ Journal finalization proven suppressed/revoked
+ no automatic continuation remains
```

Required retry disposition:

```text
none
```

This prevents a generic failure path from repeating a remote move/upload/download that already happened.

E0 source/model gates must include the D→E composition addendum/model in addition to the original 65-case reconciliation model.

---

## 14. E1 UI refinement

Current production negative controls remain concrete:

- `content.js` can show `Повторить отправку` / `Сформировать и отправить заново` after Yandex errors;
- `journal.js` can show generic `Повторить` after destructive-operation errors;
- current pages mint local UUID `operationId` values;
- worker currently accepts caller operationId in representative mutation paths.

E1 must replace these controls with reconcile-driven actions:

```text
new-attempt-allowed -> Повторить
same-operation-only -> Продолжить / Возобновить
reconcile-only -> Проверить результат
manual-resolution -> Детали / ручное решение
none + succeeded -> Готово
none + settled-partial -> Показать результат / Закрыть
```

---

## 15. Revised trust progression

Original trust levels remain useful, with one clarification:

```text
T6 v2-finalized
```

means D authority semantics are installed, not that every operation necessarily produced a Journal row.

A trusted terminal operation may intentionally settle as:

```text
remote-complete-local-suppressed
```

and still possess exact D authority evidence.

T7 requires UI to display that state without blind retry.

---

## 16. Revised atomic tranche list

Package-atomic/high-risk boundaries now include:

### U0 protocol fencing

Multiple live execution surfaces.

### J0 Journal DB v8

```text
service-worker.js
journal.js
```

### A2 identity activation

Worker + covered mutation clients or explicit tested compatibility adapter.

### B1 PDF DB v4

```text
service-worker.js
offscreen.js
```

### E1 UI cutover

All claimed Wave 1 surfaces together, or remaining surfaces explicitly stay legacy and are not counted complete.

---

## 17. Revised closure gates

Add to staged-plan closure matrix:

### J0

```text
worker-first v7->v8 upgrade
journal-page-first v7->v8 upgrade
same final schema
existing v7 data retained
old rows not rewritten into trusted ER
stale v7 page/opener fails/reloads rather than mutating under false compatibility
literal v7 rollback boundary documented
```

### D0/D1/D2

Use the later 73-case D research schedules as input and add exact production-source gates for:

```text
JG/ER CAS
F scoped revocation
prepared vs started effect linearization
fixed Trash target
same resourceId move receipt
clear/import preserving started effect checkpoints
same-id replacement survival
remote-complete-local-suppressed truth
```

### E0/E1

Use:

```text
original reconciliation model PASS 65
D→E composition model PASS 40
settled-partial UI schedules
no blind retry from started/unknown or verified/suppressed states
```

---

## 18. Supplemental deterministic model

Committed:

```text
project_tools/test_wave1_staged_plan_bcde_change_impact_model.js
```

Executed before commit:

```text
Wave 1 staged-plan B/C/D/E change-impact model: PASS
cases=67
topology=A0>U0>J0>A1>A2>B0>B1>C0>C1>D0>D1>D2>E0>E1>Z0
```

The model checks:

- all revised dependency edges;
- U0 precedes J0;
- J0 precedes D0;
- D0 precedes D1/D2;
- C1/B1 precede D2;
- D1/D2 precede E0;
- required Journal v8 stores/meta;
- clear policy for prepared vs started/verified effects;
- `settled-partial` classification after verified effect + suppressed finalization.

This is L2 architecture evidence only.

---

## 19. Historical coverage-status correction

The original staged-plan document contains:

```text
DEEP-RESEARCH-COVERAGE-COMPLETE = YES
```

That historical statement is not the current project-wide status after later PD7 reconciliation.

Current rule:

```text
DEEP-RESEARCH-COVERAGE-COMPLETE = NOT YET RE-DECLARED
```

until exact PD7 target evidence is attached and a fresh Coverage Reconciliation confirms no remaining stale/nonterminal CORE cell.

This addendum supersedes the current-status interpretation without rewriting the historical document.

---

## 20. Revised preferred production sequence

When production implementation is explicitly entered, the preferred sequence is now:

```text
A0  passive operation receipt primitives
U0  protocol/update fencing
J0  passive WebClipJournal v8 schema migration
A1  exact content/selection protocol
A2  worker-issued physical-operation admission
B0  exact source/render attempt + N/H
B1  immutable PDF DB4 generations
C0  immutable Yandex context/policy generations
C1  exact remote effect/content receipt
D0  JG/ER/F Journal authority activation
D1  Delete/Mark Read exact destructive effect receipts
D2  Yandex/local-save finalization composition
E0  read-only reconciliation + settled-partial
E1  UI reconciliation/retry cutover
Z0  Wave 1 activation/closure sweep
```

No implementation is authorized by this research addendum.

---

## 21. Current result

```text
Original high-level DAG                          = RETAINED
Journal-v7 preference                           = SUPERSEDED FOR D PREFERRED DESIGN
J0 passive Journal-v8 migration                 = ADDED
D destructive effect store                      = REQUIRED
B/C terminology                                 = SYNCHRONIZED
E settled-partial                               = ADDED
Supplemental staged-plan model                  = PASS 67/67
Production implementation                       = NOT STARTED
Registry status changes                         = NONE
New P-code                                      = NONE
Project-wide coverage complete                  = NOT YET RE-DECLARED
Critical closure                                = INCOMPLETE
Release                                         = NOT READY
```
