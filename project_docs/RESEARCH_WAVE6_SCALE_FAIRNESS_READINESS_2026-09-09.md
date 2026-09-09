# WebClip — Wave 6 performance / boundedness / maintenance / scalability readiness — 2026-09-09

Date: 2026-09-09  
Canonical production baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Registry authority: `project_docs/RESEARCH_REGISTRY.md` on canonical `main`  
Research branch: `research/wave6-scale-fairness-readiness-2026-09-09`  
Mode: **RESEARCH-ONLY / IMPLEMENTATION-READINESS / SCALE-AND-FAIRNESS OVERLAY**  
Production implementation: **NOT STARTED**

This tranche does not change production runtime, Registry, manifest/version, build, tag, release or deployment.

Wave 6 does not redefine W1–W5 correctness semantics. It supplies the bounded-computation, global admission and durable-progress contracts required for those semantics to remain true under large DOM/Journal/storage queues, concurrent operations and MV3 service-worker restarts.

---

## 1. Executive result

Wave 6 contains exactly **16 primary ACTIVE owners**:

```text
P1-009  scalable Journal text-search candidate strategy
P1-035  staging cleanup exact live owner/lease/generation
P1-043  global shared-origin storage byte reservation
P1-064  fair local-download recovery progress
P1-158  parent-operation deadline includes prerequisite reads
P1-160  bounded/coalesced discovery budgets
P1-162  incremental generation-fenced Journal domain rendering
P1-163  streaming JSON parser awaits only on refill
P1-166  global unresolved executeScript/tabs.create settlement cap
P1-167  shared PDF-preparation computation budget
P1-168  bounded locator creation/scoring
P1-170  coalesced/bounded global Chrome Action refresh
P1-173  bounded settlement-queue waiting-turn admission/coalescing
P1-174  lightweight Journal summaries + lazy heavy details
P1-192  durable fair progress for long alarm maintenance across wakes
P1-208  pending-remote recovery phase/status fairness
```

No new P-code is required. `P1-231` remains unallocated.

Research result:

```text
owner coverage                         COMPLETE
current-source gap reconciliation      COMPLETE
scale architecture                     DEFINED
cross-wave placement                   DEFINED
L2 deterministic model                 PASS / 45 cases
production source                      RED / NOT IMPLEMENTED
release-scale regression               NOT RUN
```

---

# Part I — why existing timeouts/batches are insufficient

## 2. Bounded output is not bounded computation

Existing source contains many useful local limits:

- resource preparation has task/deadline/count/string limits;
- Journal page size is bounded;
- remote/local recovery uses bounded batch sizes;
- import limits total bytes/chars/entries/depth/container items;
- Chrome Action actual settlements have an explicit cap;
- various IndexedDB operations have timeouts.

These are positive controls and should be preserved.

However they do not establish one of three stronger properties:

```text
A. aggregate operation work is bounded;
B. concurrent scarce-resource admission is bounded;
C. every durable recovery class eventually receives work.
```

Wave 6 separates these properties explicitly.

---

## 3. Timeout is not cancellation

A caller timeout can establish:

```text
WebClip stopped waiting at deadline D
```

but not necessarily:

```text
the underlying browser/network/storage work ceased at D
```

This distinction is already physically demonstrated by P1-003/P1-167 resource evidence: image/font resource work can remain active after a waiting Promise times out.

The same principle applies to browser-owned `executeScript`, `tabs.create`, downloads and other non-cancellable operations.

Therefore:

```text
timeout + retry
```

must not become an unbounded actual-settlement generator.

---

## 4. Batch size is not fairness

Suppose maintenance always reads the first 12 unresolved rows:

```text
A1..A12 remain hot/in-progress
B13 is terminal and trivially resolvable
```

If every wake again selects A1..A12, B13 can starve indefinitely although every individual pass is bounded.

Required property is not merely:

```text
work per pass <= N
```

but:

```text
over bounded successful wakes, every eligible class/row receives an opportunity
```

unless a higher-priority safety rule explicitly suspends it.

---

## 5. MV3 restart makes fairness state durable

Current Chrome alarm semantics allow delayed delivery and missed repeating alarms to collapse to one wake after device sleep. Service workers may be restarted between events.

Therefore fairness cannot depend solely on:

```text
in-memory array index
Map iteration position
which phase happened to run last in this worker lifetime
```

Cursors/credits needed for cross-wake progress belong in durable state or are reconstructible from durable generation/age state.

---

# Part II — five independent scale authority domains

## 6. Do not implement one generic `globalBudget`

Wave 6 requires at least five independent mechanisms:

```text
WorkBudget              WB
StorageReservation      SR
SettlementAdmission     SA
FairRecoveryCursor      FC
CoalescingQueueState    CQ
```

They answer different questions:

```text
WB  how much computation/mutation/string/network-read work may this operation still perform?
SR  may this concurrent operation reserve scarce persistent bytes now?
SA  may another non-cancellable browser-owned actual effect be admitted now?
FC  which eligible recovery class/item must receive the next work opportunity?
CQ  how many waiting turns are retained, and which ones may be coalesced?
```

None can substitute for another.

---

# Part III — WorkBudget

## 7. Shared parent deadline — P1-158

A parent operation receives one absolute deadline:

```text
OperationDeadline {
  startedAt,
  deadlineAt
}
```

Every prerequisite receives the same `deadlineAt` or a bounded child slice that cannot exceed it.

Bad composition:

```text
read config       timeout 10s
read auth         timeout 10s
read account      timeout 10s
read folder       timeout 10s
parent intended   20s
```

Sequential independent timeouts can exceed the intended parent operation.

Required composition:

```text
remaining = deadlineAt - now
subcall timeout <= remaining
```

If no meaningful remaining time exists, fail/degrade before starting another prerequisite.

Current direct `getYandexConfig()` reads in multiple remote flows remain concrete P1-158 source coverage.

---

## 8. Generic operation WorkBudget

Conceptual object:

```text
WorkBudget {
  budgetGeneration,
  deadlineAt,
  nodesRemaining,
  candidateItemsRemaining,
  bytesRemaining,
  stringCharsRemaining,
  mutationsRemaining,
  remoteCallsRemaining?,
  diagnosticSamplesRemaining?,
  degradedReasons[]
}
```

Important rule:

```text
child stages consume the SAME parent budget object/receipt
```

unless there is an explicit reserved sub-budget whose sum is proven <= parent.

This prevents independent stage caps from adding up to unbounded total work.

---

## 9. PDF preparation — P1-167

Current P1-167 evidence proves one save can perform independent DOM scans for:

```text
disclosures/details
resource graph
links
images
frame topology
diagnostics
flattened-frame materialization
```

Some stages are bounded individually; others are not.

Target preparation sequence:

```text
admit Selection/Fidelity generation
→ mint PrepareWorkBudget
→ all discovery/preparation helpers charge WB
→ every page-controlled string is bounded before regex/query parsing
→ every temporary page mutation charges mutation budget
→ resource tasks charge task budget and register unresolved lifetime
→ diagnostic collection charges the same budget
→ result emits PrepareBudgetReceipt
```

Receipt example:

```text
PrepareBudgetReceipt {
  generation,
  consumedNodes,
  consumedStrings,
  consumedMutations,
  resourceTasksAdmitted,
  resourceTasksUnresolved,
  deadlineReached,
  truncatedStages[],
  outcome: full | degraded | failed
}
```

A budget exhaustion is not silent success. It feeds W3 `FidelityReceipt`.

---

## 10. Discovery — P1-160

Auto-content, page/frame discovery and ad suggestions need the same bounded pattern.

Required:

```text
node budget
candidate budget
string budget
time deadline
bounded scoring work
coalesced pointer/mousemove resolution
```

Do not run expensive full discovery on every pointer event.

Interactive policy:

```text
latest pointer position wins
routine stale discovery is discardable/coalescible
explicit click/commit is not silently coalesced away
```

If discovery budget is exceeded, manual selection remains available as a truthful fallback.

---

## 11. Locator creation/scoring — P1-168

Current locator creation materializes sibling arrays (`[...parent.children]`) and class arrays before slicing, and selector uniqueness/scoring paths can still traverse broad candidate sets.

Target rules:

1. Bound input string before selector construction/parsing.
2. Iterate siblings incrementally until target/max bound; do not materialize all children merely to find one index.
3. Bound same-tag and class-feature work before allocation.
4. If uniqueness proof exceeds budget, emit a weaker locator feature rather than executing a full unbounded query.
5. Restore/scoring candidate enumeration is bounded independently from locator creation.
6. Budget exhaustion becomes ambiguity/degraded restore, not false exact identity.

This composes with W3 P1-228 geometry and W4/W5 locator schema/privacy.

---

# Part IV — StorageReservation ledger

## 12. Snapshot preflight is insufficient — P1-043

A storage estimate at time T says what was used then. Two concurrent operations can both observe enough free space and then both allocate/write.

Required flow:

```text
estimate/current durable usage
+ global outstanding reservations
+ safety reserve
→ reserve bytes atomically
→ only then materialize/write large resource
```

Conceptual record:

```text
StorageReservation {
  reservationId,
  ownerGeneration,
  resourceClass,
  reservedBytes,
  phase: reserved | committed | releasing,
  createdAt,
  leaseUntil?,
  durableOwnerRef?
}
```

Classes include at least future/active:

```text
PDF generations
transfer staging
Journal import normalized staging
backup/export staging
large detached recovery bodies where retained
```

---

## 13. Reservation recovery

A worker crash after reserve but before release must not leak capacity forever.

But TTL alone cannot reclaim an active visible operation.

Reclaim requires:

```text
reservation generation
owner receipt/lease state
resource existence/commit state
```

Stale cleanup compares exact owner generation before release.

`release resource bytes` still does not mean `external effect did not happen`; W1 compact detached receipt semantics remain separate.

---

## 14. Staging lifetime — P1-035

Temporary transfer/import staging needs explicit owner state:

```text
StagingLease {
  stagingGeneration,
  ownerGeneration,
  ownerKind,
  leaseToken,
  leaseUntil,
  phase,
  expectedBytes
}
```

Cleanup classes:

```text
active lease       preserve
expired lease + resumable checkpoint   preserve/reconcile according to owner
orphan exact generation                reclaim
quota pressure active                  do not blindly delete
```

The existing P1-215 Journal-import lease is a positive pattern, but P1-035 covers the broader staging family.

---

# Part V — actual-settlement admission

## 15. One shared cap for executeScript/tabs.create — P1-166

Current source has separate in-memory maps:

```text
scriptExecutionSettlements
tabCreateSettlements
```

and neither belongs to the existing Action pending-settlement cap.

Required global admission for the relevant Chrome actual-settlement family:

```text
ChromeActualSettlementLedger {
  settlementId,
  kind: executeScript | tabsCreate | ...scoped future kinds,
  exact logical/generation key,
  admittedAt,
  localTimeoutState,
  actualSettlementState
}
```

Global hard cap is checked before admitting another actual effect.

When caller times out:

```text
ledger entry remains live
```

until actual settlement is known/expired under the owning correctness contract. Capacity rejection does not delete existing ownership.

Do not automatically merge Action mutation cap into the same number; different effects may have different risk envelopes. The architecture needs a common admission layer with per-class and aggregate caps where justified.

---

# Part VI — waiting-turn queues and coalescing

## 16. OperationLog / settlement queue — P1-173

Current `queueOperationLogWrite()` is structurally:

```text
previous
  .catch(...)
  .then(task)
```

Every arriving event can therefore allocate another waiting Promise/closure behind a stalled actual write.

Timeouts on the eventual IDB transaction do not bound the number of waiting turns already accumulated.

Target queue classes:

### Non-coalescible

```text
terminal success/failure
security/audit-significant transition
exact external effect admission/settlement
```

### Coalescible/latest-wins

```text
routine progress percentage
repeated equivalent status
refresh hints
```

Per operation/subsystem retain:

```text
one actual in flight
bounded non-coalescible queue
at most one latest coalescible pending state
explicit overflow/degraded diagnostic
```

Clear/retention must compose with W4 OperationLog `HG`; old queued work cannot publish into a newer history generation.

---

## 17. Chrome Action refresh — P1-170

Current `refreshActionForAllTabs()`:

```text
chrome.tabs.query({})
→ Promise.all(updateActionForTab(...) for every tab)
```

Target:

```text
refreshGeneration
latest global refresh coalescing
bounded tab discovery/result handling
fixed-width worker pool
per-tab latest generation
privacy fence from W5
```

If refresh G2 is requested while G1 is scanning/processing:

```text
G2 replaces one pending global refresh request
```

rather than appending another all-tabs fanout.

A fixed worker pool bounds simultaneous Journal reads/Action mutations.

---

# Part VII — Journal scalable read path

## 18. Search candidates — P1-009

Current text filtering is semantically correct but worst-case cursor scans evaluate text matching against full Journal entries, including heavy comment/history payload where selected.

W4 already introduces revision/generation-coherent views. W6 should extend the same planned Journal v8 package with a **light search projection**, rather than invent an unrelated search database after migration.

Conceptual per-entry summary/index:

```text
JournalSearchSummary {
  entryId,
  JG,
  ER,
  urlKey/siteKey,
  readingMode,
  normalizedTitleSearch,
  normalizedSiteSearch,
  normalizedUrlSearch,
  commentSearchSummary / token structure,
  deleted-history policy version
}
```

Exact physical schema can use IndexedDB indexes/coarse token buckets/compact normalized summaries according to measured trade-offs.

Required two-stage query:

```text
cheap candidate selection
→ bounded candidate ids
→ exact final predicate against required fields
→ heavy detail only for page/card rows actually needed
```

Search projection is derived state and must be generation-fenced like W4 `urlStats`.

---

## 19. Lightweight card summary — P1-174

Journal listing should not move whole heavy entry payload merely to render collapsed cards.

Define explicit DTO layers:

```text
JournalRowSummary
JournalEntryDetail
```

Summary contains only data required for list/card/filter state.

Heavy fields loaded lazily when required:

```text
full SelectionSnapshot
long comment history
resource diagnostics
large reconciliation/detail objects
```

Lazy detail request consumes exact rendered `{JG,ER}`. If the row changed, detail response is stale and must not bind to the replacement card.

---

## 20. Incremental domain tree — P1-162

Current domain model is bounded in count but `renderDomainFilter()` constructs one DOM fragment synchronously for the model.

Target renderer:

```text
renderGeneration RG
chunk size / time slice
append chunk
check RG
yield
repeat
```

If filters/query/mode changes:

```text
RG-next invalidates remaining RG-old chunks
```

No stale chunk may append after generation replacement.

This is presentation boundedness; the underlying domain/count source remains W4 revision-coherent.

---

# Part VIII — streaming import parser

## 21. Await only on refill — P1-163

Current `AsyncJsonCharReader` has strong security bounds:

```text
max total chars
max entry chars
max string chars
max depth
max container items
max entries
deadline
```

Preserve all of them.

The performance defect is narrower: `peek()` and `next()` are async because each calls async `fill()`. Parser loops therefore `await` on nearly every character even while many characters are already present in the current chunk.

Target reader:

```text
async refillIfNeeded()
peekSync()
nextSync()
```

Parser inner loops process the current buffer synchronously in bounded chunks and call `await refill()` only when the buffer is exhausted.

Deadline checks still occur:

```text
on refill
plus periodic consumed-character checkpoints inside long buffer processing
```

so a very large chunk cannot bypass the time deadline.

Do not replace streaming with `JSON.parse()` of the whole 50 MiB backup; that would regress the memory envelope.

---

# Part IX — fair durable recovery

## 22. Local downloads — P1-064

Recovery needs a durable cursor/order strategy stronger than “first N pending rows”.

Candidate policy:

```text
class priority
+ age
+ durable cursor/tie-break key
+ bounded attempts per wake
```

Terminal/easy-to-settle rows should not be indefinitely starved by old ambiguous rows.

The cursor is advanced durably only after the corresponding bounded pass is committed.

---

## 23. Remote phases — P1-208

Pending remote saves contain materially different phases:

```text
upload/content unknown
object verification
publication unknown
Journal finalization
stale/manual-resolution
```

One repeatedly failing early phase cannot monopolize every maintenance wake.

Use phase credits / weighted round-robin such as conceptual:

```text
per wake budget
  upload unknown       X credits
  publication unknown  Y credits
  Journal finalize     Z credits
  stale transition     W credits
```

Exact numbers require measurement; architecture invariant is cross-phase opportunity.

Within a phase, use durable cursor/age ordering.

---

## 24. Long alarm work — P1-192

Current background maintenance runs multiple phases in one wake. Individual stages are bounded, but durable progress across phases/restarts remains necessary.

Target:

```text
MaintenancePassReceipt {
  maintenanceGeneration,
  phaseCursor,
  perPhaseCursorRefs,
  creditsConsumed,
  startedAt,
  lastCommittedAt,
  incompleteReasons[]
}
```

Each wake does a bounded slice, commits progress, and if work remains ensures the next appropriate alarm/wake obligation exists.

A maintenance pass may truthfully be:

```text
partial / more-work-remains
```

without treating unresolved recovery as a failure of unrelated cleanup.

### Chrome alarm input

Chrome currently documents that alarms can be delayed and missed repeating alarms after sleep fire at most once before the schedule resumes. Therefore code must not rely on one alarm firing once for every missed logical maintenance slice.

Durable cursor + “work remains” obligation is the correct model.

---

# Part X — implementation placement across W1–W5

## 25. Scale is not a final cleanup phase

Although these owners are grouped as Wave 6 for research organization, some minimum bounds must land in the same production tranche that creates the protected queue/store.

Rule:

```text
new queue/store/resource owner introduced by W1–W5
→ minimum admission + retention + restart bounds land with creation
```

Do not intentionally create an unbounded correct subsystem and plan to bound it months later under W6.

W6-only later tranches are appropriate for broader optimization after the correctness foundation exists.

---

## 26. W1 integration

### OperationReceipts / PDF / remote pending stores

When W1 creates new receipt/cache/pending stores, include:

```text
hard active-row caps
byte reservation integration where payload-bearing
retention/compaction rules
indexes required for fair phase/cursor traversal
```

### Parent deadlines

W1 C0/C1 remote operations consume absolute operation deadlines through W5 auth/context acquisition and every pure prerequisite read.

### Remote fairness

PendingRemoteSaveV2 should include fields/indexes needed for P1-208 phase-aware recovery from the beginning.

---

## 27. W2 integration

W2 browser settlement implementation should create P1-166 admission with the first trusted `executeScript/tabs.create` settlement ledger, rather than land unlimited actual-settlement rows first.

Global Action refresh receives P1-170 coalescing/worker pool when W2 Action generation/unknown state is revised.

---

## 28. W3 integration

W3 `FidelityReceipt` consumes W6 prepare/discovery budget receipts.

Budget exhaustion cannot be collapsed into `full` fidelity.

W3 `Reversible Page Mutation Ledger` should also charge mutation count/retained-reference bytes to operation work/resource bounds.

Virtualized user-history retention P1-230 requires explicit node/text/byte limits; those limits belong with W3 implementation, informed by the W6 vocabulary.

---

## 29. W4 integration

The planned W1/W4 Journal v8 package should include from the start:

```text
search summary/index support        P1-009
light row-summary access path       P1-174
derived generation metadata         W4
indexes for JG/ER/cursor queries     W1/W4/W6
```

P1-162 incremental rendering is mostly page/UI code and can follow schema foundation, but its generation receipt must align with W4 JournalViewReceipt.

P1-163 can be implemented independently in `journal-import-stream.js` so long as all current safety limits remain intact.

OperationLog v3 planned by W4 should include bounded queue/coalescing semantics from P1-173 at activation.

---

## 30. W5 integration

W5 auth/config/permission reads consume W6 parent deadlines.

Credential/user-input bounds from W5 and computation/string budget from W6 should share exact protocol constants where appropriate but remain semantically different:

```text
field validity/security bound != total operation computation budget
```

---

# Part XI — source acceptance and deterministic evidence

## 31. Current SOURCE RED examples

Current source still demonstrates:

```text
scriptExecutionSettlements = new Map()
tabCreateSettlements       = new Map()
```

without one shared admission cap for those unresolved actual settlements.

`queueOperationLogWrite()` chains each later task behind the previous Promise without bounded waiting-turn admission.

`refreshActionForAllTabs()` performs:

```text
chrome.tabs.query({})
Promise.all(all tabs -> updateActionForTab)
```

without coalesced global generation + fixed worker pool.

Journal text filter evaluates `WebClipJournalTextFilter.matches(entry, ...)` during cursor scan over full rows.

`AsyncJsonCharReader.peek()/next()` are async per character even when the current chunk has remaining data.

Current `content.js` locator creation materializes sibling arrays and the PDF-preparation evidence shows multiple independent selector/query passes outside one shared prepare budget.

These source facts are sufficient to keep W6 owners RED.

---

## 32. SOURCE acceptance gate

Target source gate:

```text
project_tools/test_wave6_scale_fairness_source.js
```

It is intentionally RED on current `main` and was not executed as a passing product test.

It checks for target source signatures around:

```text
shared parent WorkBudget/deadline
storage reservation ledger
actual-settlement admission cap
fair durable recovery cursors/phase credits
bounded/coalesced queue waiting turns
coalesced Action refresh worker pool
Journal search summary candidate layer
incremental domain rendering
refill-only streaming parser
bounded locator creation
shared discovery/preparation budgets
staging owner/lease/generation
maintenance cursor
remote phase fairness
lazy Journal detail
```

---

## 33. L2 deterministic model

Durable model:

```text
project_tools/test_wave6_scale_fairness_model.js
```

Execution receipt:

```text
run       34357729223
job       102486562200
commit    b3fb9a33d888e82968891f38ce27c84861fef63b
runner    ubuntu-24.04 / Ubuntu 24.04.4
Node      v22.23.2
result    Wave 6 scale/fairness model: PASS; cases=45
```

Temporary workflow used solely for the receipt was deleted immediately after successful execution.

Model proves at architecture level:

1. sequential prerequisites cannot exceed one parent deadline;
2. child stage consumes the same WorkBudget;
3. concurrent storage reservations cannot oversubscribe capacity;
4. stale owner cannot release another generation's reservation;
5. one settlement cap spans script+tab classes in the model;
6. capacity returns only on actual settlement/release;
7. routine latest-wins progress coalesces to one pending item;
8. terminal event survives coalescing;
9. fair class scheduler services remote/maintenance under hot local queue;
10. durable cursor moves across batches/wakes;
11. Journal candidate stage selects ids before loading heavy payload;
12. stale incremental-render generation cannot append;
13. parser refills per chunk rather than per character;
14. locator sibling work can stop at a configured bound;
15. Action-style fanout respects fixed worker width;
16. remote phase credits service later phases;
17. PDF budget exhaustion returns degraded rather than full;
18. scale domains remain independent.

---

# Part XII — owner acceptance summary

## 34. P1-009

- indexed/light candidate strategy;
- exact predicate retained;
- generation-fenced projection;
- comments/deleted-history semantics follow W4 policy;
- worst-case heavy payload not scanned for every row.

## 35. P1-035

- staging lease/generation for every active temp class;
- cleanup exact-owner compare;
- quota pressure cannot delete visible/active state;
- orphan/expired recovery bounded.

## 36. P1-043

- atomic global byte reservation before large allocation/write;
- reservations included in free-space admission;
- crash recovery generation-safe;
- no false external settlement inference on resource release.

## 37. P1-064

- durable local-download cursor/order;
- bounded per wake;
- later terminal rows cannot starve indefinitely;
- unresolved old row retains truthful state.

## 38. P1-158

- one parent deadline;
- config/auth/Chrome reads consume remaining time;
- no sequential timeout multiplication;
- timeout remains distinct from cancellation.

## 39. P1-160

- shared discovery budget;
- pointer work coalesced;
- candidate/string bounds before expensive parsing;
- graceful manual fallback.

## 40. P1-162

- incremental chunks/yields;
- render generation fence;
- stale chunks cannot append;
- bounded DOM work per slice.

## 41. P1-163

- async only on input refill;
- synchronous bounded chunk parse;
- periodic deadline checks;
- all existing size/depth/count limits retained.

## 42. P1-166

- aggregate unresolved script/tab actual settlement cap;
- existing exact logical ownership retained on local timeout;
- cap rejection creates no new browser effect;
- late receipt still consumable/reconcilable.

## 43. P1-167

- one prepare/diagnostics WorkBudget;
- candidate/string/mutation/node/resource dimensions;
- unresolved resource task lifetime bounded/accounted;
- fidelity outcome receives degraded reason.

## 44. P1-168

- no full sibling array solely for locator index;
- bounded selector strings;
- bounded uniqueness/scoring enumeration;
- budget failure means weaker/ambiguous locator, not false exactness.

## 45. P1-170

- one current/pending global refresh generation;
- bounded tab enumeration processing;
- fixed worker pool;
- per-tab latest-wins and W5 privacy fence retained.

## 46. P1-173

- bounded waiting turns;
- routine progress latest-wins/coalescible;
- terminal/security events preserved;
- OperationLog HG generation fence retained.

## 47. P1-174

- list DTO excludes heavy payload;
- heavy detail lazy and ER/JG-bound;
- filters/search use summary/index where possible;
- detail response cannot retarget replacement card.

## 48. P1-192

- durable maintenance phase/cursor state;
- bounded slice per wake;
- explicit more-work-remains;
- next-wake obligation recreated/verified;
- restart does not reset progress to first phase forever.

## 49. P1-208

- phase-aware remote credits;
- durable cursor within phase;
- early failing phase cannot starve publication/Journal finalization;
- phase priority does not change external truth semantics.

---

# Part XIII — conclusion

For canonical baseline `d4f5b268fa3f7ced5a7bc68da52784863d614138`:

```text
W6 primary owners                 16 / 16 reconciled
W6 implementation architecture   DEFINED
W6 deterministic L2              PASS / 45 cases
W6 production source             RED
new P-code                        NO
P1-231                            NOT ALLOCATED
runtime/manifest change           NO
release readiness change          NO
```

Dominant W6 principle:

> **Bound each admitted operation, reserve shared scarce resources before use, cap non-cancellable actual effects before admission, and persist enough scheduling state that every eligible recovery class can prove forward progress across MV3 restarts.**

With W6 complete, all six primary implementation waves now have research-level implementation-readiness architecture. The next required research action is one final W1–W6 cross-wave reconciliation: collapse overlapping schema/migration proposals into one production dependency graph, prove all 106 ACTIVE owners remain covered, and identify the exact production entry order without claiming implementation or release readiness.
