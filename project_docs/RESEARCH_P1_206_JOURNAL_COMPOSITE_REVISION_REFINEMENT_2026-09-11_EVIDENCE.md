# WebClip — P1-206 Journal composed-view exact source revision refinement — 2026-09-11

Date: 2026-09-11  
Canonical baseline: `main = d33b5ea2b8103062dfed2805090bbf465fb00ae1`  
Mode: **RESEARCH-ONLY / CURRENT-MAIN ABSORPTION REVIEW**  
Production/runtime modification: **NONE**  
Real unpacked Chrome/Yandex L5: **NOT RUN**  
Release-policy activation: **NONE**  
New P-code: **NO**

This tranche continues existing ACTIVE **P1-206** after canonical P1-205. It rechecks the 2026-09-07 P1-206 branch only as historical provenance, revalidates the read-side race against fresh current `main`, and refines the smallest source-revision coherence contract. No historical branch is imported wholesale.

## 1. Canonical owner and question

Current Registry authority is:

```text
P1-206  One Journal composed view/page/group boundary must be exact source
        revision coherent; mixed A/B view cannot be baselined as current.
```

The substantive question is:

```text
Can one current Journal UI load accept metadata/counts from source revision A,
then accept entries/groups from revision B after a concurrent Journal mutation,
and finally baseline the mixed screen as current B?
```

Current answer: **yes**.

P1-206 owns read-side composition authority. Adjacent ownership remains separate:

```text
P0-076 = state-changing mutation authority from rendered/stale UI
P1-032/P1-085/P1-174 = bounded/scalable Journal reads and materialization
P1-127 = polling/timer read fanout
P1-175 = exact source-document authority for Apply/open flows
P1-207 = backup success/freshness bound to exact Journal source revision
P1-210 = lost outer operation response reconciliation
```

No new P-code is required.

## 2. Fresh current baseline

Fresh GitHub `main` was checked before this tranche and again after external research:

```text
main = d33b5ea2b8103062dfed2805090bbf465fb00ae1
commit = research: refine P1-205 OperationLog selective retirement (#219)
```

The historical provenance branch is:

```text
research/p1-206-journal-composed-view-revision-2026-09-07
head = 09ecca9afd3e4440e813e040b5af1c2d2bf85581
```

Its old baseline was `d4f5b268fa3f7ced5a7bc68da52784863d614138`; source assertions from it are not treated as current without recheck.

## 3. Current positive control: durable Journal source revision already exists

Current `service-worker.js` declares:

```text
JOURNAL_META_STORE = 'meta'
JOURNAL_META_REVISION_KEY = 'revision'
```

and `touchJournalDbRevision(tx, reason)` writes an opaque revision record containing a fresh timestamp plus random component.

The important property is semantic, not the string format: current mutation paths call `touchJournalDbRevision(...)` inside the same Journal readwrite transaction as the associated data mutation.

Current source recheck found this for:

```text
append
update-entry
delete-entry
clear-<scope>
import-replace
```

`updateJournalEntryRecord(...)` is also the shared mutation path for comment changes and several reading/remote checkpoint updates, so those changes inherit the same revision advancement.

This is a strong existing primitive P1-206 should reuse rather than invent a second view-only revision authority.

## 4. Current UI generation is not source revision

Current `loadJournal()` begins with:

```text
const generation = ++journalLoadGeneration
```

and checks the captured generation after asynchronous phases.

Current `renderCurrentEntries()` similarly increments `renderGeneration`.

These are useful same-page scheduling controls:

```text
newer UI request wins over older UI request
```

They do not prove:

```text
all database reads belonging to one UI request observed one Journal source revision
```

A single current UI generation can span multiple IndexedDB transactions while another context commits a Journal mutation between them.

## 5. Current direct reads are separate unlabelled snapshots

Fresh current `journal.js` source contains multiple Journal view transactions of the form:

```text
db.transaction(JOURNAL_STORE, 'readonly')
```

for metadata/lookup/page/group/group-child view work.

Those transactions include only the `entries` store, not `JOURNAL_META_STORE`. Current `journal.js` contains no `sourceRevision` field.

Therefore each direct result can be internally coherent while still being unlabelled with respect to the authoritative Journal DB revision.

The missing property is not transaction isolation inside one read. It is cross-component composition across separate transactions.

## 6. Current service-worker fallback has the same semantic gap

Fresh current `service-worker.js` Journal view handlers likewise open separate readonly transactions on `JOURNAL_STORE` for page/group/group-child and related view queries.

Current `service-worker.js` also contains no `sourceRevision` field in those returned view contracts.

Therefore direct-read failure followed by runtime fallback does not currently strengthen source authority. Both transport paths can return a correct component without identifying which exact Journal source revision produced it.

Required future property:

```text
direct component receipt semantics == service-worker fallback receipt semantics
```

## 7. Current change signal is not the DB revision

Current worker `notifyJournalChanged(reason)` creates a separate notification object and ultimately writes it to:

```text
chrome.storage.local.webclipJournalRevision
```

Current `journal.js` converts that object into a token from fields equivalent to:

```text
changedAt
nonce
reason
```

This marker is useful notification state. It is created and persisted separately from the IndexedDB mutation transaction and is not the `meta/revision` value written by `touchJournalDbRevision(...)`.

Therefore:

```text
JournalDbRevision = authoritative source-state identity
JournalChangedSignal = hint that a recheck/reload may be required
```

P1-206 must not use the Chrome Storage notification token as proof that several IndexedDB reads came from one exact source revision.

## 8. Current baseline can overclaim a mixed screen

Current `loadJournal()` sequence remains conceptually:

```text
meta = await readJournalViewMetaWithFallback(...)
accept/render metadata
await renderCurrentEntries()
await syncJournalRevisionBaseline()
```

Current `syncJournalRevisionBaseline()` does only:

```text
lastJournalRevisionToken = await readJournalRevisionToken()
```

where `readJournalRevisionToken()` reads the newest `chrome.storage.local.webclipJournalRevision` notification.

There is no exact DB revision carried from the metadata/page/group results into this baseline assignment.

## 9. Canonical current-main mixed-view schedule

A deterministic schedule is:

```text
Journal DB = revision A
UI load generation G starts

metadata readonly tx reads A
metadata A is accepted by G

another extension context commits Journal mutation + DB revision B
notification B may also be queued/written

page/group readonly tx starts later and reads B
page/group B is accepted by the same G

syncJournalRevisionBaseline() reads newest notification token B
lastJournalRevisionToken = B-like notification
```

Visible result:

```text
counts/domains/meta = A
entries/groups       = B
baseline bookkeeping = newest notification after mutation
```

Neither `journalLoadGeneration` nor `renderGeneration` fires because there was only one UI request generation. The screen can therefore be mixed A/B while bookkeeping says no newer notification is pending.

This confirms the current P1-206 root cause.

## 10. Grouped continuation is also unbound

Current `urlGroupPageBoundaries` stores a continuation approximately as:

```text
{
  key,
  url,
  latest
}
```

It does not store the Journal source revision from which the ordering boundary was derived.

A boundary from A can therefore be reused after B changes group order or membership. Depending on insertion/deletion/import replacement, page continuation can skip or duplicate groups even though every individual cursor operation is valid.

Required future shape is semantically equivalent to:

```text
JournalGroupContinuation {
  sourceRevision: R,
  key,
  url,
  latest
}
```

The exact field names are implementation details.

## 11. Ungrouped page offsets have the same provenance problem

Numeric page state also has revision meaning. If page N is interpreted through an offset derived from A, then inserts/deletes before that boundary under B can shift rows and cause duplicates/skips.

P1-206 therefore applies to both:

```text
group continuation boundaries
ungrouped page/offset boundaries
```

A revision change should restart/recompute navigation state rather than silently apply A's boundary meaning to B.

## 12. Group child expansion is another composed boundary

A rendered group header/count from revision R describes membership at R.

If child expansion later reads a different revision B and appends B children beneath an R header, the visible group is mixed even if each read was correct by itself.

Required rule:

```text
expand group rendered at R
-> child result must carry R
-> if child sourceRevision != R, reject/reload rather than compose
```

## 13. Fresh W3C IndexedDB recheck

Fresh source:

- `https://www.w3.org/TR/IndexedDB/`

Relevant platform properties rechecked on 2026-09-11:

1. every database read/write occurs through a transaction;
2. transaction scope is fixed for its lifetime;
3. requests in one transaction execute in request order;
4. while a readonly transaction remains live, repeated reads of the same data remain constant;
5. overlapping readwrite transactions are serialized against earlier overlapping transactions;
6. a transaction created after an earlier overlapping writer sees the committed changes from that writer;
7. transactions are expected to be short-lived and automatic commit is part of their lifecycle;
8. commit applies a transaction's changes atomically or the transaction aborts.

WebClip inference:

```text
entries result + meta/revision label
can be read in the same bounded readonly transaction
```

and then form one exact component receipt.

The W3C model also explains why two separate readonly transactions are not one source snapshot: a later transaction may legitimately see a writer that committed between them.

## 14. Fresh MDN recheck

Fresh sources:

- `https://developer.mozilla.org/en-US/docs/Web/API/IDBTransaction`
- `https://developer.mozilla.org/en-US/docs/Web/API/IDBDatabase/transaction`
- `https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB`

MDN reinforces that IndexedDB operations are transaction-scoped, transaction scope is selected at creation, multiple readonly transactions may coexist, transactions move active/inactive with event-loop tasks, and auto-commit occurs when no further requests are pending.

WebClip implication:

```text
Do not try to hold one giant IndexedDB transaction across arbitrary DOM rendering,
network/runtime fallback, or unrelated awaits.
```

A bounded read transaction that returns `{result, sourceRevision}` is better aligned with current WebClip bounded-query architecture.

## 15. Fresh Chrome MV3 lifecycle recheck

Fresh source:

- `https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle`

Chrome documents that extension service workers can terminate after inactivity and explicitly recommends persisting state rather than relying on worker globals because globals are lost on shutdown.

P1-206 inference is limited:

```text
A service-worker fallback must derive sourceRevision from durable Journal IndexedDB,
not from a worker-memory revision variable.
```

This does not require keeping the worker alive or changing MV3 lifecycle policy.

## 16. Independent version-stamp comparison

Fresh comparison source:

- `https://www.sqlite.org/pragma.html#pragma_data_version`

SQLite documents `PRAGMA data_version` as a mechanism interactive programs can use to detect that displayed/cached database content may need to be reloaded after another connection changes the database.

This is comparison evidence only. WebClip does not inherit SQLite connection semantics or use SQLite. The useful abstract pattern is:

```text
visible cached/read model + exact data-version identity
-> detect whether the source changed before treating the view as current
```

WebClip already has its own stronger project-specific primitive: an opaque Journal DB revision advanced with Journal mutations.

## 17. Target component receipt

Every bounded Journal view component should return a receipt semantically equivalent to:

```text
JournalViewComponentReceipt {
  sourceRevision: R,
  result,
  queryIdentity
}
```

`queryIdentity` may encode the mode/filter/page/group inputs needed to prevent accidental receipt reuse. P1-206's essential field is `sourceRevision`.

For direct IndexedDB reads, `sourceRevision` must be obtained from `JOURNAL_META_STORE/JOURNAL_META_REVISION_KEY` in the same readonly transaction as the component's entry reads.

Forbidden:

```text
read entries in tx1
await tx1
read revision in tx2
label entries with tx2 revision
```

A mutation between tx1 and tx2 would mislabel the component.

## 18. Direct/fallback parity

Service-worker view replies for metadata/page/groups/group entries must expose the same exact-source receipt semantics as direct reads.

Mixed transport sequences are therefore valid only when their receipts agree:

```text
metadata direct R + page fallback R -> composable
metadata fallback R + page direct R -> composable
```

A direct timeout/failure must not downgrade source coherence merely because the fallback transport is used.

## 19. Composition rule

A composed visible boundary may be accepted only when every required component agrees on one source revision.

Ungrouped example:

```text
meta.sourceRevision == page.sourceRevision == R
```

Grouped example:

```text
meta.sourceRevision == groupPage.sourceRevision == R
```

Expanded group example:

```text
renderedGroup.sourceRevision == children.sourceRevision == R
```

If required receipts disagree, discard the attempted composition and retry/reload within a bounded policy.

## 20. Final current-revision fence

Component equality alone is not enough to call the view current: Journal may mutate after the last component read but before publication/baselining.

Preferred bounded sequence:

```text
read meta -> R
read page/group -> R
read authoritative current DB revision -> R
publish/baseline R
```

If final current revision is B instead:

```text
reject R as stale
bounded retry/reload
```

The final authoritative revision check can be its own small IndexedDB read because it is a freshness fence, not a label for an earlier component. It must never relabel an A component as B.

## 21. Truthful baseline rule

Forbidden:

```text
render coherent A or mixed A/B
read newest change notification B
baseline = B
```

Required:

```text
accepted coherent view revision = R
rendered source baseline = R
```

If the Journal changes immediately after coherent R is published, the next durable-revision or change-signal check sees current != R and schedules reload. This is truthful eventual freshness.

The Chrome Storage notification may still trigger rechecks efficiently; it simply is not the source-state identity itself.

## 22. Bounded retry under churn

A busy Journal may mutate repeatedly while a view loads. P1-206 must not spin indefinitely seeking a stable composition.

Required behavior is a fixed small retry budget or overall deadline that composes with existing bounded-read owners. If stability cannot be obtained, surface a controlled stale/refresh-required state and allow ordinary reload scheduling.

Exact retry count/message is implementation work.

## 23. Why one giant transaction is not required

A single huge readonly transaction covering every metadata scan, page/group query, child expansion, DOM build, and UI interaction would create unnecessary lifetime/coupling and conflict with existing bounded-view design.

The smallest proven architecture is:

```text
bounded component tx + exact revision receipt
bounded component tx + exact same revision receipt
final authoritative revision fence
bounded retry on mismatch
```

This uses IndexedDB transaction consistency where it matters without turning DOM rendering into a database transaction lifetime problem.

## 24. Import/clear identity reuse

Coherence must not be inferred from visible values such as entry IDs, URLs, timestamps, counts, group keys or imported content equality.

`import-replace` and clear already advance the opaque DB revision. Therefore an old continuation/read receipt becomes stale even if replacement data reuses the same textual identifiers.

This is another reason the durable opaque revision is the correct source authority.

## 25. P0-076 composition

P1-206 is read-side provenance. A trustworthy rendered revision can later be supplied to a mutation path as an expected source revision, but P0-076 remains the owner of mutation conflict/authority semantics.

P1-206 does not authorize a stale UI mutation merely because its screen once had a valid read receipt.

## 26. P1-207 boundary

P1-207 separately owns backup truth:

```text
backup success protects exact Journal source revision R
```

P1-206 does not redefine backup scheduling, artifact identity or success receipts. It only establishes what exact source revision a composed UI view represents.

## 27. Worker restart boundary

A service-worker restart may erase worker-local generation variables, but it does not change which durable IndexedDB revision a direct/fallback component read belongs to.

Therefore source receipts must be derived from durable IndexedDB state. `journalLoadGeneration` and `renderGeneration` remain useful UI-local ordering controls but are not restart/durable source authority.

## 28. Deterministic refinement model

Companion test:

```text
project_tools/test_p1_206_journal_composite_revision_refinement_model.js
```

It source-binds at least these current facts:

1. Registry keeps P1-206 ACTIVE;
2. Journal DB meta revision store/key exist;
3. current mutation paths advance the DB revision;
4. current direct Journal view transactions use only `JOURNAL_STORE`;
5. current direct source contains no `sourceRevision`;
6. current fallback source contains no `sourceRevision`;
7. `loadJournal()` reads metadata then renders entries then syncs a separate baseline;
8. baseline reads the Chrome Storage notification token;
9. grouped continuation currently carries key/url/latest without source revision;
10. historical branch is provenance only;
11. a current-shaped A/B mixed view can be modeled;
12. exact component receipts reject A/B composition;
13. final current-revision mismatch rejects an otherwise internally coherent stale view;
14. same-revision direct/fallback composition succeeds;
15. old grouped continuation is rejected after revision change;
16. child expansion with a different revision is rejected;
17. bounded retry terminates under churn;
18. no runtime/release action occurs in this tranche.

Model PASS is research evidence only, not runtime implementation or browser qualification.

## 29. Current gap table

| Surface | Current `main` | Required P1-206 property |
|---|---|---|
| UI load generation | worker/page-memory counter | keep as scheduling fence, not source identity |
| Direct meta/page/group reads | separate readonly `entries` transactions | each returns exact DB `sourceRevision` from same tx |
| Worker fallback | separate readonly `entries` transactions | same exact receipt contract as direct path |
| Notification marker | separate Chrome Storage token | notification only; trigger authoritative revision recheck |
| Final baseline | newest notification after render | accepted rendered DB revision R |
| Group continuation | key/url/latest | bind to source revision R |
| Numeric page meaning | page/offset without source receipt | invalidate/recompute on revision change |
| Group child expansion | later separate read | children must match rendered group revision |
| Churn | generation guards only | bounded coherence retry/reload |

## 30. Historical branch disposition

Retained after current-main recheck:

- one UI load can span several database revisions;
- metadata/page/group receipts need exact DB revision;
- Chrome Storage change notification is not source authority;
- grouped continuation and child expansion are revision-sensitive;
- final baseline must describe the actually accepted view;
- bounded component reads plus final revision fence are preferable to a giant UI-held transaction.

Not imported:

- historical commits;
- historical tests as-is;
- historical baseline assumptions;
- any runtime change.

## 31. Future implementation direction, not performed here

A future implementation tranche would need to:

```text
1. add a shared exact Journal DB revision reader usable inside an existing tx
2. include JOURNAL_META_STORE in bounded direct view transaction scopes
3. return sourceRevision with direct meta/page/group/group-child results
4. give service-worker fallback replies the same receipt contract
5. compose only matching component revisions
6. bind grouped continuation/page meaning to source revision
7. reject stale child expansion
8. replace newest-notification baselining with accepted DB source revision baselining
9. add a final authoritative DB revision fence
10. bound retry/reload under churn
11. preserve journalLoadGeneration/renderGeneration and existing read deadlines
12. run deterministic and real-browser evidence appropriate to P1-206 before closure
```

This research tranche does not perform those runtime changes.

## 32. Release fence

This tranche does **not** authorize or perform:

```text
P1-231 S2 activation
release-policy change
official product ZIP
release candidate
real unpacked Chrome/Yandex L5 as release evidence
release receipt/readiness mutation
manifest/version bump
tag
GitHub Release
deployment/publishing
```

Hard fence remains:

```text
EXPLICIT_USER_APPROVAL_FOR_RELEASE_POLICY_ACTIVATION
```

Current release state remains:

```text
S2 authorized = false
release authorized = false
product ZIP = false
```

## 33. Conclusion

P1-206 is confirmed on fresh current `main`.

The project already has the right durable source-state primitive: an opaque Journal DB revision advanced in the same transaction as current Journal mutations. The current defect is that composed view reads do not carry that authority. Direct and fallback reads use separate unlabelled snapshots, while `loadJournal()` later baselines the screen from a separately persisted notification token.

The smallest proven target is:

```text
same-transaction component revision receipt
+ direct/fallback receipt parity
+ exact-revision composition
+ revision-bound pagination/group continuation/child expansion
+ final authoritative current-revision fence
+ baseline = actually accepted rendered revision
+ bounded retry under churn
```

P1-206 remains **ACTIVE** until runtime implementation and its own required evidence are completed under a separately scoped implementation tranche.