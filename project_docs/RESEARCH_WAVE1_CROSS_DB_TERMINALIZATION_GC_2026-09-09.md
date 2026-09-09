# WebClip — Wave 1 cross-database terminalization / compact archive / GC crash-consistency contract — 2026-09-09

Date: 2026-09-09  
Canonical production baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Canonical Registry blob: `81e5867c0e0936b9524ece8949c53ad4ed83523c`  
Research branch: `research/wave1-cross-db-terminalization-gc-2026-09-09`  
Mode: **RESEARCH-ONLY / PRE-IMPLEMENTATION CRASH-CONSISTENCY SPECIFICATION**  
Production implementation: **NOT STARTED**.

Primary composed owners: **P0-072, P0-076, P1-198, P1-210**.  
Supporting boundaries: **P1-086, P1-090, P1-183, P1-194, P1-205, P1-208, P2-019**.

No production file, Registry status, workflow, build, version, tag, release or deployment is changed by this research branch.

---

## 1. Purpose

The latest Wave 1 Journal research now defines:

```text
P = common physical operation receipt
    database: WebClipOperationReceipts

F = JournalFinalizationIntent / Journal-domain root
    database: WebClipJournal / journalFinalizations

E = destructive/external Journal-domain effect receipt
    database: WebClipJournal / pendingRemoteMutations
```

The preceding tranches established:

```text
J0        v8 schema capacity
retention bounded F/E lifecycle
capacity  transactionally exact F/E admission
```

The remaining crash-consistency gap is that IndexedDB provides atomicity **inside one database**, not across the two databases above.

Therefore this sequence is not one transaction:

```text
make F/E terminal
archive compact truth into P
delete detailed F/E
eventually delete P
```

A worker stop, extension reload, storage failure or local timeout can occur between any two steps.

The target is a monotonic protocol in which every prefix is recoverable and no crash can turn:

```text
known terminal operation
```

into:

```text
not-admitted
```

or permit a blind repeat of an already completed/unknown external effect.

---

# Part I — platform boundary

## 2. IndexedDB transaction scope is one database connection

Current platform documentation defines a transaction as an atomic set of operations on a particular database, with a fixed object-store scope created from one `IDBDatabase` connection.

Consequently WebClip cannot create one IndexedDB transaction spanning:

```text
WebClipOperationReceipts.receipts
+
WebClipJournal.journalFinalizations
+
WebClipJournal.pendingRemoteMutations
```

The design must therefore use ordered durable handoff instead of fictional cross-database atomicity.

External references refreshed 2026-09-09:

```text
MDN IndexedDB basic terminology / transaction
MDN IDBDatabase.transaction()
IndexedDB 3.0
```

Platform/source evidence only; no WebClip production receipt is claimed here.

---

## 3. Existing positive controls

The project already uses the same general pattern in smaller scopes:

```text
remote upload verified
-> keep checkpoint
-> update Journal/local state
-> only then remove checkpoint
```

and:

```text
staged import receipt
-> exact apply authority
-> transactional local commit
```

The new protocol extends the same monotonic idea across P and F/E rather than introducing a distributed rollback fantasy.

---

# Part II — exact terminalization terms

## 4. Domain-sealed state

Before a compact terminal archive may be written into P, the Journal-side domain must be **sealed**.

For an operation with Journal authority this means:

```text
exactly one F exists for P
F is terminal/non-admitting
all E linked to P/F are terminal
no new E may be admitted under F
```

Terminal F states remain:

```text
revoked
finalized
expired
```

Active F:

```text
admitted
```

Terminal E phases remain:

```text
canceled-before-start
local-finalized
remote-complete-local-suppressed
manual-resolution
```

Unresolved E phases:

```text
prepared
started-unknown
verified
```

Any unresolved E blocks compact terminal archive.

---

## 5. One F root per physical operation

The preceding J0 schema proposed an index on:

```text
journalFinalizations.physicalOperationId
```

This tranche refines the target contract:

> for the Wave 1 operation classes that use Journal finalization, one physical operation P has at most one F root.

Preferred v8 index:

```text
physicalOperationId
unique: true
```

Reason:

- F is the Journal-domain admission/seal root;
- multiple F roots make terminal closure ambiguous;
- GC cannot safely know which root is authoritative;
- late duplicate F creation should fail at storage level rather than rely only on caller discipline.

This is a pre-implementation refinement of J0; no DB has been migrated yet.

A future genuinely multi-finalization operation should model that explicitly instead of silently weakening this invariant.

---

## 6. F/E record revisions are required

P already has `receiptRevision` CAS in A0 research.

For compare-before-archive/delete, F/E also need additive revision fields:

```text
F.recordRevision
E.recordRevision
```

Rules:

```text
create -> 1
any authority-relevant put -> +1
terminal rows remain immutable except bounded repair metadata explicitly excluded from the terminal fingerprint
```

Do not use `updatedAt` as a revision token.

Timestamps are diagnostics/order fields, not exact CAS identity.

---

## 7. Domain terminal outcome belongs to the domain owner

The common layer must **not** infer whole-operation semantics from generic E phase names alone.

Example:

```text
one optional E = canceled-before-start
one required E = local-finalized
```

does not generically mean the whole operation was canceled.

Therefore the terminal F/domain root should carry a bounded exact outcome decided by D/domain logic, conceptually:

```js
terminalOutcome: {
  operationClass,
  retryDisposition,
  reasonCode
}
```

Allowed classes come from P1-210 reconciliation, including the D refinement:

```text
succeeded
settled-partial
canceled
failed-terminal
evidence-limited
...
```

The compact P archive copies this exact domain decision; it does not re-derive it later from lossy historical fields.

---

# Part III — DomainTerminalSnapshot V1

## 8. Snapshot purpose

After F/E are terminal, create a deterministic bounded snapshot of exactly the authority that will later be compacted/deleted.

Conceptual shape:

```js
DomainTerminalSnapshotV1 {
  version: 1,
  physicalOperationId,

  finalization: {
    id,
    recordRevision,
    state,
    terminalAt
  },

  terminalOutcome: {
    operationClass,
    retryDisposition,
    reasonCode
  },

  effects: [
    {
      id,
      recordRevision,
      phase,
      terminalAt,
      exactObjectIdentityClass,
      resourceId?,
      revision?
    }
  ]
}
```

The actual implementation should keep only fields required for exact terminal identity and future support/reconciliation.

Do not include:

```text
PDF bytes
comments
selection snapshots
OAuth tokens
Authorization headers
signed upload/download URLs
raw provider response bodies
OperationLog event arrays
```

---

## 9. Snapshot read must be transaction-complete

Read F + all E in one readonly `WebClipJournal` transaction with the required indexes/scope.

Publish the snapshot only after `tx.oncomplete`.

This composes with P1-086.

A request-level `onsuccess` before transaction completion is insufficient terminal evidence.

---

## 10. Deterministic effect ordering

Effects are sorted by stable exact identity before fingerprinting, for example:

```text
remoteEffectId ascending
```

Object/property iteration order must not change the fingerprint.

No “first row returned by cursor” semantics may become authority.

---

## 11. Domain fingerprint

Compute a canonical digest over the bounded terminal snapshot:

```text
domainFingerprint = SHA-256(canonical DomainTerminalSnapshotV1)
```

Recommended persisted representation:

```text
sha256:<64 lowercase hex>
```

This fingerprint is not proof of external provider behavior by itself.

It is a **local exact handoff token** saying:

```text
P terminal summary archived exactly this F/E terminal state
```

Remote truth still comes from P1-090/P1-183/C1/domain receipts.

---

# Part IV — compact terminal archive in P

## 12. Terminal summary minimum

A0's generic `terminal` object is refined to carry a compact immutable domain archive when Journal domain receipts exist.

Conceptually:

```js
terminal: {
  summaryVersion: 1,

  operationClass,
  retryDisposition,
  code,

  domain: {
    kind: 'journal-v1',
    domainFingerprint,
    finalizationId,
    effectIds,
    provenanceClass
  },

  archivedAt
}
```

This is small enough to outlive detailed F/E retention.

---

## 13. Terminal archive is immutable

Once P contains a terminal summary:

```text
same domainFingerprint
-> idempotent success

different domainFingerprint
-> conflict / fail closed
```

Never silently overwrite terminal history with whichever wake happens last.

Suggested error:

```text
WEBCLIP_OPERATION_TERMINAL_CONFLICT
```

A conflict indicates either stale async completion, corruption, or an unsupported domain transition and should be retained for repair/manual evidence rather than normalized away.

---

## 14. P terminalization uses P receipt CAS

Preferred sequence:

```text
read P revision R
read exact terminal DomainTerminalSnapshot S
compute H
mutateOperationReceiptCas(P, R):
  verify still nonterminal / compatible phase
  write immutable terminal summary containing H
commit
```

If P changed before CAS:

```text
re-read P
if already terminal with H -> idempotent success
if already terminal with different H -> conflict
otherwise re-evaluate from current domain state
```

No delete/recreate of P is used for retry.

---

# Part V — monotonic cross-database protocol

## 15. Required order

The safe order is:

```text
T0  P + F/E active

T1  Journal domain becomes exact terminal/sealed
    F terminal
    all E terminal

T2  read exact DomainTerminalSnapshot S
    compute H

T3  CAS archive immutable terminal summary H into P

T4  after retention policy:
    re-read P terminal summary
    compare current F/E against H inside Journal transaction
    delete terminal F/E detail atomically if exact match

T5  after P retention + proof domain detail absent:
    GC P
```

Every arrow is restartable.

---

## 16. Forbidden orderings

Forbidden:

```text
delete F/E
-> then try to summarize P
```

because crash can erase the only exact terminal detail.

Forbidden:

```text
mark P terminal from OperationLog/error text
-> later hope F/E agree
```

because diagnostics are not settlement authority.

Forbidden:

```text
delete P first because it is older
-> keep orphan F/E
```

because lookup can degrade to `not-admitted` while real domain evidence remains.

Forbidden:

```text
P terminal summary exists
-> delete whatever F/E currently share same ids
```

without revision/fingerprint comparison.

---

# Part VI — compare-before-delete domain GC

## 17. P archive is prerequisite, not sufficient by itself

Before deleting F/E detail, worker reads exact P and requires:

```text
P terminal
P terminal summary has journal domain archive
expected domainFingerprint H
```

If P is missing or nonterminal:

```text
keep F/E
```

Missing common receipt is not permission to destroy domain evidence.

---

## 18. Journal GC transaction

Within one `WebClipJournal` readwrite transaction spanning:

```text
journalFinalizations
pendingRemoteMutations
```

perform:

1. read exact F;
2. read all E linked to F/P;
3. require all remain terminal;
4. rebuild canonical snapshot from current records;
5. require current fingerprint == H archived in P;
6. require retention/pressure policy says eligible;
7. delete E set;
8. delete F;
9. publish success only after transaction complete.

If any row changed:

```text
abort/no delete
```

Suggested error/classification:

```text
WEBCLIP_DOMAIN_ARCHIVE_STALE
```

---

## 19. Why compare-before-delete matters

Schedule:

```text
S1 snapshot H archived in P
later repair changes E from local-finalized -> manual-resolution
stale GC wake still holds H
```

Without comparison, stale GC can delete the newer evidence.

With comparison:

```text
E.recordRevision/phase changed
-> Hcurrent != H
-> no deletion
-> terminal conflict/repair path
```

This is the domain equivalent of compare-before-restore used elsewhere in WebClip.

---

# Part VII — crash schedules

## 20. C1 — crash after domain terminal, before P archive

Persisted:

```text
P nonterminal/domain-active
F/E terminal
```

Recovery:

```text
read terminal domain
rebuild S/H
archive same P
```

No P2 is minted.

F/E are not GC-eligible yet because P terminal summary is absent.

---

## 21. C2 — crash after P archive, before F/E GC

Persisted:

```text
P terminal with H
F/E terminal detail still present
```

Recovery:

```text
re-archive H -> idempotent
or later GC compare H and delete detail
```

This is the preferred over-retention failure mode.

---

## 22. C3 — crash during Journal F/E delete transaction

IndexedDB local transaction semantics:

```text
abort -> F/E remain
commit -> all selected F/E delete together
```

P summary already exists in either case.

No truth loss.

---

## 23. C4 — crash after F/E GC, before later P GC

Persisted:

```text
P terminal compact archive exists
F/E absent
```

Reconciliation still returns the exact terminal class from P.

It must not say:

```text
not-admitted
```

merely because detailed domain rows were compacted.

---

## 24. C5 — P terminal summary conflict

Schedule:

```text
archive H1
later code observes/constructs terminal H2 != H1
```

Required:

```text
no overwrite
no automatic domain delete
retain current evidence
surface conflict/evidence-limited repair state
```

A terminal record cannot use last-writer-wins semantics.

---

## 25. C6 — P unexpectedly missing while F/E terminal exist

Required:

```text
retain F/E
classify repair/evidence-limited
never delete because common record is absent
```

Possible causes include:

- legacy transition;
- storage corruption;
- partial/incorrect prior implementation;
- future downgrade bug.

This schedule is a negative control for P1-210 `not-admitted` semantics.

---

## 26. C7 — F/E changed after P archive

Required:

```text
compare-before-delete fails
P summary remains immutable
current detail retained
repair/reconciliation decides which evidence is authoritative
```

Do not silently rewrite P without an explicit conflict-resolution contract.

---

## 27. C8 — unresolved effect never enters compact archive

If any E is:

```text
prepared
started-unknown
verified
```

then:

```text
DomainTerminalSnapshot = NOT AVAILABLE
P terminal archive = forbidden
F/E GC = forbidden
```

This prevents unknown effect from becoming historical success/failure by retention pressure.

---

## 28. C9 — `settled-partial`

Exact remote effect completed but Journal finalization was suppressed/revoked.

Domain owner archives:

```text
operationClass = settled-partial
retryDisposition = none
```

After F/E detail GC, P still preserves:

```text
external effect happened
local Journal did not finalize
never blind-repeat external effect
```

---

## 29. C10 — `manual-resolution`

Automation exhausted exact reconciliation authority.

Domain owner archives:

```text
operationClass = evidence-limited
retryDisposition = manual-resolution
```

Detailed E receives its longer retention window.

If detail is eventually compacted after policy permits, P must still preserve the manual/evidence-limited terminal class for P's remaining retention.

---

# Part VIII — late admission / resurrection boundary

## 30. F is the Journal-domain seal

Once F is terminal:

```text
new E admission must fail
```

because E preparation/effect-start transactions re-read F in the same Journal DB.

This is already defined by the capacity-admission tranche.

---

## 31. Unique F prevents duplicate Journal roots

A unique `physicalOperationId` index on `journalFinalizations` prevents a stale path from creating `F2` while `F1` still exists.

This strengthens the seal until F detail is eventually GC'd.

---

## 32. Late F creation after F detail GC

There is an unavoidable cross-database fact:

```text
P and F are not in one atomic database
```

Therefore a stale caller that somehow survives long enough to:

1. read P before terminal/GC;
2. wait beyond terminal F retention;
3. attempt a brand-new F after old F is gone;

cannot be prevented solely by the deleted F row.

The implementation must rely on **bounded common-operation lifecycle authority**:

- F admission always begins from the current P receipt, never only a cached P object;
- exact P `receiptRevision`/phase is revalidated immediately before F admission;
- normal operation promises/deadlines are far shorter than domain/P retention floors;
- unresolved browser/external late-settlement owners keep their own durable barriers;
- P is never GC'd while domain rows remain;
- future code must not allow an old in-memory request to manufacture F without re-entering the exact P admission/resume protocol.

This is a cross-database handoff boundary, not evidence that IndexedDB can provide an impossible distributed lock.

If implementation review finds an unbounded path capable of creating F from cached P authority after the retention floor, that path must be separately fenced before Wave 1 activation.

---

# Part IX — P GC

## 33. P is deleted last

P common receipt GC requires:

```text
P terminal
terminal summary archived
P retention elapsed
no F for P
no E for P
no other exact domain checkpoint references P
no subsystem late-settlement barrier requires P
```

The domain-absence check is read-only evidence, not a cross-DB atomic delete.

Because P is already terminal and no legitimate new domain admission should occur after terminalization, a later stale-domain appearance is classified as a repair conflict rather than silently accepted.

---

## 34. `not-admitted` after P retention

Once the deliberate P retention window has elapsed and P is correctly GC'd, the product no longer promises exact historical reconciliation forever.

However a later discovery of surviving exact domain rows must **not** be translated to `not-admitted`.

Rule:

```text
P absent + exact domain evidence present
-> evidence-limited / repair-required
```

Only authoritative absence of both common and domain admission evidence may support historical `not-admitted` within the supported discovery boundary.

---

# Part X — capacity and GC composition

## 35. Terminal archive before pressure GC

Quota/count pressure may accelerate deletion of eligible terminal F/E only when:

```text
P terminal summary with exact H already exists
minimum pressure retention floor elapsed
current F/E fingerprint still == H
```

Pressure never bypasses the archive step.

---

## 36. Capacity admission must not perform cross-DB network work

The preceding capacity tranche permits same-Journal-transaction cleanup + admission only for rows whose GC eligibility has already been established with durable evidence.

Do not place:

```text
open/read P database
network reconciliation
hash large external content
```

inside a Journal readwrite capacity transaction.

Instead precompute a bounded GC candidate with expected H, then compare current Journal rows in the short mutation transaction.

---

# Part XI — reconciliation projection

## 37. P + detail present

Preferred authority hierarchy:

```text
exact P identity
+ current exact F/E detail
+ archived terminal H if terminal
```

If P terminal H matches current detail:

```text
terminal exact
```

If mismatch:

```text
conflict/evidence-limited
```

---

## 38. P terminal + detail absent

Use compact terminal archive from P.

This is a normal post-GC state, not degraded merely because detail was intentionally compacted.

The archive must contain enough semantic fields to keep retryDisposition truthful.

---

## 39. P nonterminal + terminal detail

This is the recoverable C1 handoff state:

```text
archive terminal detail into same P
```

Do not start a new physical operation.

---

## 40. P absent + detail present

```text
evidence-limited / repair-required
```

Never:

```text
not-admitted
```

and never destructive auto-GC.

---

# Part XII — source helper contracts

## 41. `readDomainTerminalSnapshot()`

Conceptual:

```js
readDomainTerminalSnapshot({
  physicalOperationId,
  finalizationId
})
```

Returns only after readonly Journal transaction complete:

```js
{
  snapshot,
  domainFingerprint
}
```

Errors:

```text
WEBCLIP_DOMAIN_NOT_SEALED
WEBCLIP_DOMAIN_FINALIZATION_AMBIGUOUS
WEBCLIP_DOMAIN_EFFECT_PENDING
```

---

## 42. `archiveOperationTerminalFromDomain()`

Conceptual:

```js
archiveOperationTerminalFromDomain({
  physicalOperationId,
  expectedReceiptRevision,
  domainSnapshot,
  domainFingerprint
})
```

CAS writes terminal P summary.

Same H is idempotent.
Different H is conflict.

---

## 43. `gcArchivedJournalDomain()`

Conceptual:

```js
gcArchivedJournalDomain({
  physicalOperationId,
  finalizationId,
  expectedDomainFingerprint,
  retentionClass
})
```

Before mutation it requires exact P terminal summary.

Inside Journal transaction it compares current F/E to expected H before delete.

---

## 44. `cleanupTerminalOperationReceipt()`

Must require all relevant domain detail absent and no remaining exact late-settlement dependency.

It is not allowed to treat age alone as sufficient.

---

# Part XIII — source/schema Change Impact

## 45. J0 refinement

Before J0 implementation, reconcile its schema specification with this tranche:

```text
journalFinalizations.physicalOperationId -> unique index
F.recordRevision                         -> additive field
E.recordRevision                         -> additive field
F.terminalOutcome                        -> additive terminal field
```

No additional v9 migration is required because v8 has not been implemented yet.

---

## 46. A0 refinement

The A0 terminal receipt slot must explicitly support:

```text
terminal.summaryVersion
terminal.operationClass
terminal.retryDisposition
terminal.domain.domainFingerprint
terminal.domain.finalizationId
terminal.domain.effectIds
```

within the existing 64 KiB operation-receipt bound.

No new OperationReceipt DB version is required for additive value fields.

---

## 47. D/E refinement

D terminalization must write exact terminal outcome before the common archive step.

E reconciliation must prefer:

```text
P archived compact truth after intentional F/E GC
```

and detect:

```text
P H != current F/E H
```

as conflict rather than choosing whichever source is newer by timestamp.

---

# Part XIV — deterministic evidence

## 48. Model

Research file:

```text
project_tools/test_wave1_cross_db_terminalization_gc_model.js
```

Executed in the research environment:

```text
Node available
```

Observed result:

```text
Wave 1 cross-DB terminalization/GC model: PASS cases=40
```

Covered schedules include:

- exact terminal snapshot;
- stable canonical fingerprint;
- domain revisions captured;
- P terminal archive;
- P archive idempotency;
- terminal conflict rejection;
- crash before P archive;
- crash after P archive;
- crash after domain GC;
- compare-before-delete mismatch;
- unresolved E negative control;
- multiple-F ambiguity;
- missing-F negative control;
- missing-P domain-GC negative control;
- P-GC-before-domain negative control;
- settled-partial preservation;
- manual/evidence-limited preservation;
- exact canceled-before-start preservation;
- deterministic effect ordering;
- domain identity-set change fingerprinting.

This is L2 deterministic architecture evidence only.

---

# Part XV — future physical/source acceptance

## 49. Production source gate

Future production source should prove at least:

1. F physicalOperationId uniqueness or an equivalent exact one-root invariant;
2. F/E exact record revisions;
3. terminal F carries bounded domain terminal outcome;
4. readDomainTerminalSnapshot waits for tx completion;
5. snapshot has deterministic E ordering;
6. terminal fingerprint is exact/canonical;
7. P terminal CAS archives H and retry semantics;
8. same H is idempotent;
9. different H cannot overwrite terminal P;
10. domain GC requires P archived H;
11. domain GC compares current F/E H before delete;
12. missing P blocks F/E GC;
13. P GC blocks while F/E remain;
14. unresolved E blocks terminal archive;
15. OperationLog cannot substitute for terminal authority.

---

## 50. Restart schedule

On exact implementation commit/current target browser, force worker termination at least at:

```text
R1 after F/E terminal commit before P archive
R2 after P terminal archive before domain delete
R3 during/around domain GC transaction
R4 after domain delete before P cleanup wake
```

For every restart prove:

```text
same P recovered
no duplicate external effect
no loss of settled-partial/manual truth
no not-admitted fabrication
```

---

# Part XVI — owner/status impact

## 51. No new P-code

The new detail is composition of existing roots:

```text
P0-072  side effects cannot be canceled by local cleanup
P0-076  Journal authority/CAS
P1-198  worker physical operation identity
P1-210  exact reconciliation / no blind retry
```

with existing recovery/evidence owners.

Therefore:

```text
P1-231 = NOT ALLOCATED
```

---

## 52. Current research state

```text
J0 v8 migration source spec                    = DEFINED / L2 PASS 42
Journal F/E retention + GC                     = DEFINED / L2 PASS
Journal transactional capacity admission       = DEFINED / L2 PASS
Cross-DB terminalization / compact archive      = DEFINED / L2 PASS 40

Production implementation                      = NOT STARTED
P0-072                                          = ACTIVE
P0-076                                          = ACTIVE
P1-198                                          = ACTIVE
P1-210                                          = ACTIVE
Release                                         = NOT READY
```

---

## 53. Project-wide coverage status

Do **not** re-declare:

```text
DEEP-RESEARCH-COVERAGE-COMPLETE
```

from this tranche.

The PD7 exact current-target receipt + fresh Coverage Reconciliation boundary remains separate and still governs project-wide re-declaration.

---

## 54. Next research boundary

The Journal authority chain is now close to saturation at the architecture/model level:

```text
schema
-> retention
-> capacity admission
-> effect-start fencing
-> terminal domain seal
-> cross-DB terminal archive
-> crash-safe detail GC
```

The next high-value research tranche should shift from generic Journal infrastructure to an exact **D1 destructive-move state machine specification for Delete→Trash and Mark Read**, composing:

```text
immutable Yandex context C
exact source object identity
collision-safe target reservation
started-unknown move admission
provider settlement verification
publication outcome where applicable
F/E terminal outcome
P compact terminal archive
```

with explicit same-object-after-move proof and unknown settlement schedules.

That remains research-only until production implementation is explicitly started.
