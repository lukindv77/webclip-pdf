# P1-206 — Journal composed-view exact source revision coherence

Date: 2026-09-07

Status: research / architecture evidence only. Registry owner remains ACTIVE.

Canonical baseline inspected: `main@d4f5b268fa3f7ced5a7bc68da52784863d614138`.

This branch does **not** modify production runtime, `manifest.json`, release state or `RESEARCH_REGISTRY.md`.

## 1. Owner

P1-206 owns the following exact requirement:

> One Journal composed view/page/group boundary must be exact source revision coherent; mixed A/B view cannot be baselined as current.

Keep adjacent owners separate:

- **P0-076** — stale rendered entry / mutation authority; destructive or state-changing actions must use expected Journal/entry generation rather than retargeting by textual id;
- **P1-009** — Journal search/filter/index scalability;
- **P1-032** — bounded cursor/index/aggregate Journal reads;
- **P1-085** — bounded Journal direct-read deadline;
- **P1-127** — polling/timer read fanout;
- **P1-174** — heavy Journal view materialization;
- **P1-175** — exact source-document authority for Journal Apply/open flows;
- **P1-198** — worker-issued physical user-operation identity;
- **P1-205** — OperationLog retention/write generation;
- **P1-207** — backup success/freshness bound to exact Journal source revision;
- **P1-210** — outer user-operation response loss / reconciliation.

P1-206 is specifically about **read-side composition authority**: all metadata, entries, grouped pagination boundaries and child expansions accepted as one visible Journal state must belong to one exact Journal data revision.

## 2. Historical evidence

The Journal view authority family already contains a direct P1-206 proof:

```text
metadata/counts/domains read revision A
Journal mutates to revision B
visible entry page reads revision B
post-render baseline sync reads B
UI generation never changed
```

The result is a mixed A/B screen whose baseline is then set to B. The periodic watcher sees current=B and baseline=B, so it has no evidence that part of the screen came from A.

Historical follow-up evidence proves the same root cause in:

- grouped page continuation boundaries;
- ungrouped numeric-offset pagination;
- group child expansion;
- rendered-revision mutation authority;
- bulk confirmation over observed Journal content.

No new P-number is required.

## 3. Current positive controls

The current implementation already contains safeguards that must remain:

1. `journalLoadGeneration` prevents a late old UI load from overwriting a newer UI load.
2. `renderGeneration` protects rendering work from older render completions.
3. Journal direct reads are bounded by `JOURNAL_VIEW_QUERY_DEADLINE_MS`.
4. Runtime fallback reads are separately bounded.
5. Journal view logic avoids one unbounded all-entry materialization and uses cursor/index based reads.
6. Group child expansion is batch-limited.
7. `urlGroupPageBoundaries` is bounded to page navigation state rather than retaining all groups.
8. The Journal IndexedDB schema already has a `meta` store.
9. Mutations already advance an IndexedDB Journal revision in the same transaction as the data mutation.

These controls solve different problems; none proves that two separate readonly transactions observed the same Journal source revision.

## 4. Two generations currently exist and must not be conflated

### UI load generation

`loadJournal()` begins with:

```text
const generation = ++journalLoadGeneration
```

and drops late results when:

```text
generation !== journalLoadGeneration
```

This means:

```text
newer UI request wins over older UI request
```

It does **not** mean:

```text
all data reads performed by one UI request saw one Journal database revision
```

A single UI load generation can legitimately span several IndexedDB transactions while another tab/worker commits a Journal mutation between them.

### Journal source revision

The service worker already defines:

```text
JOURNAL_META_STORE = 'meta'
JOURNAL_META_REVISION_KEY = 'revision'
```

and `touchJournalDbRevision(tx, reason)` writes a fresh opaque revision in the same readwrite transaction as Journal mutations.

This is the correct source authority to compose P1-206 around.

## 5. Exact atomic revision already exists

Current mutation paths provide a strong architectural primitive:

```text
append -> entries mutation + touchJournalDbRevision(tx, 'append')
update -> entries mutation + touchJournalDbRevision(tx, 'update-entry')
delete -> delete + touchJournalDbRevision(tx, 'delete-entry')
clear -> clear mutation + touchJournalDbRevision(tx, `clear-${scope}`)
import replace -> clear/copy + touchJournalDbRevision(tx, 'import-replace')
```

The important property is not the string format of the revision. It is that:

```text
Journal content mutation and Journal revision advancement share one IndexedDB transaction
```

Therefore an old revision cannot describe newly committed content, and replacement imports that reuse the same textual ids/URLs still receive a distinct revision.

## 6. Chrome Storage revision marker is notification, not source authority

The Journal page currently watches `webclipJournalRevision` in `chrome.storage.local`.

`notifyJournalChanged(reason)` constructs a separate object containing:

```text
changedAt
reason
nonce
```

and queues it through a serialized/coalesced Chrome Storage write.

That marker is useful for cross-context notification and polling.

It is **not** the exact IndexedDB source revision because:

- it is generated separately from `touchJournalDbRevision()`;
- it is written after the database mutation path;
- writes may be coalesced;
- it is in another storage system;
- it cannot identify which exact IndexedDB snapshot a metadata/page transaction observed.

P1-206 should therefore distinguish:

```text
JournalDbRevision       = authoritative data snapshot identity
JournalChangedSignal    = notification that a recheck/reload may be needed
```

Do not build coherence on the notification nonce.

## 7. Current metadata read is a separate snapshot

`loadJournal()` first calls `readJournalViewMetaWithFallback(...)`.

The direct implementation opens a Journal readonly transaction and scans entries for:

- mode counts;
- reading counts;
- domain totals/tree;
- text/domain filtered metadata.

Current direct transactions use only `JOURNAL_STORE` and do not return the `meta/revision` value alongside the data.

So metadata is currently an unlabelled snapshot.

The service-worker fallback has the same semantic issue unless it returns an exact source revision from the same read transaction.

## 8. Current page read is another snapshot

After accepting and rendering metadata, `loadJournal()` calls `renderCurrentEntries()`.

The ungrouped direct page query opens another readonly transaction over `JOURNAL_STORE`.

The grouped page query opens another readonly transaction and computes the page using the URL/time index.

Expanded group children are read in further bounded transactions.

Each transaction can be correct in isolation while the visible composed state is inconsistent.

## 9. Canonical mixed-view race

```text
Journal = revision A
UI load generation G starts

M = metadata transaction
M reads entries from A
M returns counts/domains for A
G still current
UI accepts M

another context commits Journal mutation
Journal = revision B

P = page transaction
P reads entries from B
P returns page B
G still current
UI accepts P

syncJournalRevisionBaseline()
reads current notification/baseline after mutation
sets baseline to B
```

Visible state:

```text
counts/domains = A
entry cards = B
baseline = B
```

The UI-generation fence never fires because there was only one UI request G.

## 10. Why the current baseline step is especially dangerous

After `renderCurrentEntries()` current `loadJournal()` executes:

```text
await syncJournalRevisionBaseline()
```

which simply reads the newest `webclipJournalRevision` notification token and assigns it to `lastJournalRevisionToken`.

This can convert:

```text
screen partially A, partially B
```

into the bookkeeping statement:

```text
screen baseline = B
```

without ever rendering one coherent B view.

The watcher then compares B to B and may not reload.

The baseline must instead represent the revision of the **actually accepted rendered view**.

## 11. Target read receipt

Every bounded Journal view component should return an exact source receipt.

Conceptually:

```text
JournalViewComponentReceipt {
    sourceRevision
    queryIdentity
    result
}
```

`queryIdentity` may include the semantic parameters needed to avoid accidental cross-query reuse:

```text
mode
source URL/site context
reading filter
text filter
selected domain filter
groupByUrl
page/continuation identity
```

The critical field for P1-206 is `sourceRevision`.

## 12. Reading revision in the same readonly transaction

A direct component transaction should include both stores:

```text
[JOURNAL_STORE, JOURNAL_META_STORE]
```

and read `JOURNAL_META_REVISION_KEY` from the same IndexedDB transaction that enumerates the entries/groups.

IndexedDB transaction snapshot semantics then give one component result labelled with the exact revision belonging to that transaction.

Do not:

```text
read entries transaction
await
open separate revision transaction
```

because a mutation could commit between those reads and mislabel the component.

## 13. Service-worker fallback must return the same contract

Direct reads and runtime fallbacks must be semantically interchangeable.

For each of:

```text
WEBCLIP_JOURNAL_VIEW_META
WEBCLIP_JOURNAL_VIEW_PAGE
WEBCLIP_JOURNAL_VIEW_GROUPS
WEBCLIP_JOURNAL_VIEW_GROUP_ENTRIES
```

the returned object should carry the exact IndexedDB source revision captured in the same transaction as that result.

A direct-read failure followed by fallback must not silently change from revision-aware to revision-unaware semantics.

## 14. Composition rule

A visible composed page may be accepted only if required components agree:

```text
meta.sourceRevision == page.sourceRevision == R
```

For grouped views:

```text
meta.sourceRevision == groupPage.sourceRevision == R
```

For an expanded group:

```text
renderedGroup.sourceRevision == children.sourceRevision == R
```

Before publication/baselining, R must still be current according to the authoritative IndexedDB revision, or the implementation must use an equivalent transaction/versioned read-model guarantee.

## 15. Baseline rule

Forbidden:

```text
render components
read newest current revision B
baseline = B
```

Required:

```text
render coherent receipt R
baseline = R
```

If the Journal becomes B immediately after coherent A is rendered, that is safe:

```text
visible baseline = A
current Journal = B
watcher/check sees A != B
reload scheduled
```

Alternatively the final pre-publish fence can reject A and immediately retry B.

Both are truthful. Silently assigning B to an A render is not.

## 16. Final current-revision fence

Because component reads can be separate bounded transactions, a final authoritative check is needed before declaring the view current.

Acceptable sequence:

```text
meta R
page R
currentRevision R
publish/baseline R
```

If current revision is now B:

```text
reject R as stale
bounded retry
```

This does not require one long-lived transaction spanning DOM rendering.

## 17. Bounded retry under churn

A busy Journal can mutate repeatedly.

The implementation must not spin indefinitely trying to obtain a stable composite view.

Use a small bounded retry budget, for example a fixed number of attempts or deadline.

If stability is not achieved, surface a controlled state equivalent to:

```text
view changed while loading; refresh required
```

and retain ordinary notification/reload scheduling.

This composes with P1-085/P1-127 rather than replacing their bounded-read requirements.

## 18. Grouped pagination continuation receipt

Current `urlGroupPageBoundaries` stores approximately:

```text
key
url
latest
```

but not the Journal source revision.

A boundary is meaningful only for the ordering from which it was derived.

Target:

```text
JournalGroupContinuation {
    sourceRevision: R
    key
    url
    latest
}
```

Page N+1 may consume the boundary only if the current/read source revision is still R.

If Journal changed to B, old continuation R must be rejected and navigation restarted/recomputed from B.

## 19. Why grouped boundary change matters

Suppose page 1 under A ends at group G.

Before page 2:

- a new entry makes some later group newer than G;
- a deletion makes an earlier group older than G;
- G itself is deleted;
- import-replace creates a new Journal with reused URL strings.

Applying the A boundary to B can skip or duplicate groups even though every individual cursor read is valid.

Revision binding turns the continuation into an exact receipt rather than an approximate lexical cursor.

## 20. Ungrouped numeric-offset pagination

Ordinary page-number pagination has the same problem.

Conceptually page 2 uses:

```text
offset = (page - 1) * PAGE_SIZE
```

If entries are inserted/deleted before that offset between A and B, page 2 may duplicate or skip rows.

Therefore page-number state should also be associated with a source revision receipt.

A revision change should restart/recompute pagination rather than applying A's offset meaning to B.

## 21. Group child expansion

A visible group header rendered from R describes group membership/count/order under R.

If child expansion occurs after the Journal changes to B, returning B children under the old R header produces another mixed view.

Target:

```text
expand(groupKey, expectedSourceRevision=R)
```

If current/read revision differs:

```text
stale -> refresh/re-render group/page
```

Do not append B children beneath an A group header as if coherent.

## 22. Import replacement and identity reuse

Revision identity must be opaque and mutation-generated.

Do not infer coherence from:

- same entry IDs;
- same URLs;
- same counts;
- same sort boundary;
- same timestamps copied from an import.

An import replacement can intentionally contain values identical to the old Journal while still being a distinct source state.

The existing atomic DB revision solves this if propagated correctly.

## 23. Clear semantics

Clear changes the Journal source revision atomically with the clear mutation.

Therefore:

```text
page/continuation A
clear -> B
```

must invalidate A immediately for further composed reads.

A stale page-2 continuation may not repopulate visible content after the UI has accepted empty/new metadata B.

## 24. Mutation authority composition with P0-076

P1-206 produces a rendered source revision receipt.

That receipt can be passed to state-changing actions as an expected revision:

```text
entryId
expectedJournalRevision = renderedView.sourceRevision
```

The worker must still perform the exact mutation-generation/conflict semantics owned by P0-076.

P1-206 should not duplicate or replace P0-076; it supplies trustworthy read-side provenance.

## 25. Backup composition with P1-207

Do not extend P1-206 into backup freshness.

P1-207 owns:

```text
backup artifact/success protects exact Journal source revision R
```

P1-206 merely ensures the UI can truthfully identify R for what it displays.

## 26. Notification watcher composition

`webclipJournalRevision` remains useful as a cheap change signal.

Recommended use:

```text
signal changes
→ schedule/read authoritative DB revision
→ compare to rendered sourceRevision
→ reload if different
```

Do not require the notification token itself to equal the DB revision.

Coalescing notifications is acceptable because one notification can cause a check that discovers the latest authoritative DB revision.

## 27. No giant read transaction required

P1-206 must preserve P1-032/P1-174 bounded-view design.

A simple but harmful implementation would keep one giant IndexedDB transaction open while computing every metadata structure, page, group children and DOM render.

That is unnecessary.

Preferred pattern:

```text
bounded component read + revision receipt
bounded component read + same revision receipt
final authoritative revision fence
bounded retry if mismatch
```

This provides coherence without unbounded materialization or long UI-held transaction lifetime.

## 28. Direct/fallback parity

Tests must cover mixed transport paths too:

```text
metadata direct + page fallback
metadata fallback + page direct
```

Both must carry the same DB revision semantics.

A direct-path timeout must not weaken authority merely because the fallback is invoked.

## 29. Current positive test to preserve

`project_tools/test_journal_load_generation.js` proves a useful separate invariant:

```text
older mode metadata completion cannot overwrite newer UI mode
```

P1-206 must keep this test meaningful.

Source revision fencing supplements `journalLoadGeneration`; it does not replace latest-UI-request semantics.

`project_tools/test_p1_032_bounded_journal_view.js` likewise proves cursor/index/deadline and bounded-memory properties that must remain.

## 30. Recommended result vocabulary

Internal read/composition results can distinguish:

```text
ok
stale-ui-generation
stale-source-revision
mixed-source-revision
view-changed-refresh-required
read-timeout
read-error
```

A source-revision mismatch is not database corruption. It is a normal concurrency event that requires bounded refresh/retry.

## 31. Security/privacy scope

This is defensive data-integrity and lifecycle architecture.

No vulnerability discovery or exploit work is involved.

The risk is false representation of current Journal state and stale authority, not an offensive security primitive.

## 32. Required deterministic regressions

1. Unsafe A metadata + B page + B baseline is demonstrated as wrong.
2. Coherent A metadata/page/current A is accepted and baselined A.
3. Metadata A + page B is rejected.
4. Metadata/page A + current B before publication is rejected/retried; it is never relabelled B.
5. Coherent A published before B mutation keeps baseline A so B is detectable.
6. Group continuation A cannot enumerate B.
7. Ungrouped numeric-offset continuation A cannot silently enumerate B.
8. Group header A cannot expand B children as coherent.
9. Import replacement A→B with reused IDs/URLs still invalidates A receipts.
10. Clear A→B invalidates old continuation.
11. One mismatch can converge on B via bounded retry.
12. Continuous churn reaches a controlled refresh-required result after a fixed bound.
13. `journalLoadGeneration` latest-wins behavior remains independent and preserved.
14. UI generation and source revision are distinct dimensions.
15. Rendered revision can be forwarded as expected mutation revision for P0-076 composition.
16. Multiple bounded transactions may compose safely when revision receipts and final fence agree.

## 33. Source-bound RED gate expectations

A future runtime implementation should visibly provide:

- exact DB revision read from `JOURNAL_META_STORE/JOURNAL_META_REVISION_KEY`;
- metadata direct/fallback returns `sourceRevision`;
- ordinary page direct/fallback returns `sourceRevision`;
- grouped page direct/fallback returns `sourceRevision`;
- group-child direct/fallback returns `sourceRevision`;
- continuation/page boundary is revision-bound;
- `loadJournal()` compares component revisions;
- final current DB revision fence before accepting/baselining;
- baseline assigned from the rendered source revision, not a fresh unrelated Chrome Storage marker;
- bounded retry / controlled stale state;
- existing UI generation and bounded-read controls retained.

Current runtime is expected RED against these requirements.

## 34. Model evidence

`project_tools/test_p1_206_journal_composed_view_revision_model.js` models the 16 schedules above.

The model is architecture evidence only. It does not establish a production PASS.

## 35. Physical/browser closure evidence

P1-206 should remain ACTIVE until implementation plus real extension evidence demonstrates at least:

1. two open Journal pages; mutate from page/worker between meta and page load; no mixed accepted view;
2. mutation between grouped page 1 and page 2; old continuation rejected/refreshed;
3. mutation between group header render and child expansion; no mixed header/children;
4. clear/import replacement while Journal page remains open; stale pages/continuations cannot survive as current;
5. direct-read and service-worker fallback paths both return exact revision receipts;
6. rapid repeated mutations terminate with bounded controlled refresh behavior rather than an infinite reload loop;
7. existing latest-load-generation and bounded-query regressions remain PASS.

## 36. Release interpretation

This branch is research-only.

It does not change product behavior and does not close P1-206.

No build, tag, release or production-readiness claim follows from this work.
