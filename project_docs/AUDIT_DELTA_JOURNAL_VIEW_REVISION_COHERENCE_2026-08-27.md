# Audit delta — Journal view revision coherence — 2026-08-27

Source-of-truth `main` immediately before this write: `6ee9985e0a557f265bd876950ef9968fafdad2bc`.

Docs-only audit checkpoint. Production runtime, tests, configuration and `manifest.json` are unchanged. Canonical large-table synchronization is not claimed.

## New confirmed item: P1-206 — one Journal render can combine metadata from revision A with entries from revision B and then baseline B as if the render were coherent

**Classification:** P1 / evidence-reserved / confirmed by fresh source audit.

Repository-wide semantic duplicate-check was performed against current priorities and the existing Journal view/filter/revision items. Adjacent owners are different:

- **P1-009** — CPU/deadline cost of exact multi-field text filtering over heavy payloads;
- **P1-032/P1-083/P1-085** — bounded direct/fallback IndexedDB view transactions;
- **P1-127** — bounded extension-page health/context/revision reads and timer lifecycle;
- **P0-050/P1-120** — `urlStats` rebuild/dirty-marker consistency;
- **P1-174** — eager materialization of heavy Journal cards.

P1-206 is not a timeout or index-staleness issue. Each individual readonly transaction can be internally consistent while the **composed screen** is not, because metadata and page entries are read in separate transactions without one shared Journal revision receipt.

## Fresh source proof

### 1. `loadJournal()` uses a UI generation, but that generation is not a Journal data revision

`journal.js::loadJournal()` starts with:

- `const generation = ++journalLoadGeneration`;
- captures requested mode/source/filter values;
- later ignores results when `generation !== journalLoadGeneration`.

This correctly suppresses stale responses from an older UI request when a **newer UI load** has been started.

It does not prove that multiple data reads inside the same generation observed the same IndexedDB revision.

### 2. Metadata is read first in its own readonly transaction

`loadJournal()` calls `readJournalViewMetaWithFallback(...)`.

The direct path `readJournalViewMetaDirect()` opens its own `WebClipJournal` readonly transaction and scans `entries` to calculate:

- mode/read counts;
- domain aggregate/model;
- text-filter/domain-filter derived metadata.

The service-worker fallback similarly performs a separate view operation.

When this call returns, `loadJournal()` immediately publishes:

- `journalModeCounts = meta.counts`;
- `journalDomainModel = meta.domains`;
- mode/filter controls and domain tree.

### 3. The visible entry page is read afterward in another transaction

After metadata has already been assigned/rendered, `loadJournal()` calls:

`await renderCurrentEntries();`

The direct page path `readJournalPageDirect()` opens a **new** readonly transaction and scans the entries cursor for the requested page/filter.

Grouped-by-URL mode likewise uses separate transactions for groups/children.

Therefore metadata and entries are not one IndexedDB snapshot.

### 4. A Journal mutation can commit between those two transactions

Every normal append/update/delete/clear/import mutation can advance the Journal revision while the page remains open.

A deterministic schedule is:

1. UI load generation G starts.
2. Metadata transaction M reads Journal revision A and returns counts/domains for A.
3. Another tab/worker operation appends/deletes/imports and commits revision B.
4. G has not been superseded; `journalLoadGeneration` is unchanged.
5. `renderCurrentEntries()` starts page transaction P after B committed.
6. P returns entries from B.
7. The page now shows counts/domain model from A and entry cards/total from B.

No individual IDB transaction is broken. The defect is the lack of a composition fence.

### 5. `syncJournalRevisionBaseline()` can hide the mismatch instead of repairing it

After `renderCurrentEntries()` completes, the same `loadJournal()` calls:

`await syncJournalRevisionBaseline();`

That read occurs **after** the A→B mutation in the schedule above, so it observes B and stores B as the current baseline.

The periodic revision watcher then sees “current revision == baseline B” and has no evidence that metadata came from A.

Thus the mixed screen is not guaranteed to self-heal on the next revision poll. It can remain until another mutation, filter/mode action, or explicit reload starts a new complete load.

This is the strongest concrete distinction from a harmless transient race.

## User-visible effects

Depending on the mutation between M and P, one render can show:

- count badges that do not match the visible page/total;
- domain tree totals/groups inconsistent with the displayed entries;
- pagination based on a newer page result while mode/domain summaries remain older;
- a newly imported/replaced Journal page with metadata from the pre-import Journal;
- after delete/clear, a domain/count summary for entries no longer present.

This is primarily view correctness/UX rather than source-of-truth corruption, so P1 is appropriate.

## Required P1-206 contract

### One end-to-end Journal revision receipt per render

A complete visible render must prove that its metadata and entry/group reads belong to one accepted Journal revision.

Implementation options include:

1. read revision before the composed load, perform metadata + page reads, read revision after, and retry the **entire** load if it changed; or
2. return an exact revision receipt from each worker/direct view query and publish UI only if all receipts match; or
3. restructure the relevant metadata/page reads into one logical snapshot where practical.

Exact mechanism is implementation choice. Publishing A/B mixed state and then baselining B is not acceptable.

### Do not reuse UI generation as data generation

`journalLoadGeneration` / `renderGeneration` remain useful for latest-request-wins UI ordering, but they are not substitutes for the durable Journal revision.

Both dimensions are required:

- UI generation: “is this still the user's latest requested view?”
- Journal revision: “did all data components come from one accepted source state?”

### Baseline only the revision actually rendered

`lastJournalRevisionToken` must be set to the revision proven for the published screen.

Do not read a later revision after rendering and silently adopt it as baseline unless the screen was revalidated against that revision.

### Retry remains bounded

A busy Journal can change repeatedly. Avoid an infinite retry loop:

- use a small bounded retry count / existing view deadline;
- if coherence cannot be obtained, show a controlled “Journal changed during loading, refresh” state;
- stale partial metadata must not remain presented as authoritative while claiming the newer revision baseline.

### Direct and service-worker fallback paths use the same contract

A fallback from direct IDB to worker RPC must not weaken coherence. Revision receipts must have the same semantics regardless of execution context.

### Grouped URL view and child expansion

Grouped view has additional separate group/child transactions. A group expansion result must be fenced against the render/group revision it belongs to, or explicitly refresh/reject when the Journal changed.

## Required deterministic regressions

1. Meta reads A → append commits B → page reads B → revision baseline reads B: implementation must retry/reconcile; it must not publish A metadata + B entries as coherent.
2. Meta reads A → delete/clear commits B → page reads B: old count/domain state is not left with new empty/reduced page.
3. Meta reads A → import-replace commits B → page reads B: no mixed pre-import/post-import screen.
4. UI generation changes during retry: older Journal load never overwrites newer requested filters/mode.
5. Revision changes repeatedly: bounded error/retry rather than infinite scan loop.
6. Direct IDB success path and service-worker fallback both return/enforce equivalent revision receipts.
7. Grouped URL page + child expansion is rejected/refreshed if the underlying Journal revision changed.
8. `syncJournalRevisionBaseline()` records only a revision proven to match the displayed data.
9. No regression to P1-009 bounded filtering/deadline behavior.
10. No reliance on `urlStats` as Journal source-of-truth; the durable Journal revision remains authoritative.

## Number allocation

- New evidence-reserved **P1-206** assigned.
- **P1-205** remains OperationLog destructive cleanup/write linearization.
- **P1-009/P1-127** remain their existing filter/deadline/lifecycle owners.

No new P0 or P2 number is created by this checkpoint.

## Test / release state

No runtime/config/manifest change was made. Product tests were not rerun for this docs-only checkpoint. The last established product gate remains the historical **88/88 JavaScript syntax + 74/74 deterministic tests PASS** unless superseded by a newer independently recorded gate. No build, tag or GitHub Release was created.