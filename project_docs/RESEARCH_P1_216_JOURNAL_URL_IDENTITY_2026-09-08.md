# P1-216 — Canonical derived Journal URL identity for legacy and modern rows

Date: 2026-09-08
Research branch: `research/p1-216-journal-url-identity-2026-09-08`
Baseline `main`: `d4f5b268fa3f7ced5a7bc68da52784863d614138`
Registry owner: `P1-216 | ACTIVE | Legacy and modern Journal rows share one derived URL identity domain for view/clear/delete/stats/templates; missing persisted urlKey cannot create ghost scope.`

Research-only checkpoint. Production runtime, `manifest.json`, canonical Registry status and release state are intentionally unchanged.

## 1. Executive result

P1-216 is confirmed against current `main`.

The current Journal has two competing exact-URL identity domains:

1. modern/indexed identity — persisted `entry.urlKey`;
2. derived legacy identity — `normalizeJournalUrl(entry.url || '')` used by several newer read/rebuild paths.

Both identities are intended to describe the same fact, but they are not consumed consistently.

A legacy row with a valid `url` and missing persisted `urlKey` can therefore be:

- visible in an ungrouped current-URL Journal view;
- missing from grouped URL view;
- missing from group-entry reads;
- omitted from `WEBCLIP_JOURNAL_LIST` and therefore from selection-template surfaces;
- left behind by clear-current-URL;
- deleted by id while its derived URL statistics remain stale;
- omitted by a targeted `rebuildUrlStatsForUrl(urlKey)`;
- counted by a full `rebuildAllUrlStats()`.

This is one root cause, not independent defects: URL-scope membership is not represented by one canonical predicate.

The required architectural rule is:

> Persisted `urlKey` is an index/cache representation of canonical URL identity, not a second authority. Every Journal operation that reasons about exact URL membership must converge on one effective identity contract.

## 2. Current canonical normalizer already exists

The runtime already has `normalizeJournalUrl(raw)`.

The existing normalizer is the semantic base for P1-216. It uses URL parsing/canonicalization and removes the fragment/hash. P1-216 must not invent a different normalization algorithm for legacy rows.

Important current semantics to preserve:

- HTTP/HTTPS URL parsing/canonicalization remains browser-URL based;
- host casing/default ports normalize through URL parsing;
- fragment/hash is not part of Journal exact-URL identity;
- query string remains part of exact URL identity;
- exact URL identity is distinct from site identity;
- malformed/unsupported values do not gain exact URL authority by guessing from `hostname`.

`getJournalSiteKey()` remains the separate site/domain primitive. P1-216 must not collapse exact-URL and site scopes into one key.

## 3. Positive controls: modern writes/import already canonicalize

Current new Journal creation stores both:

- `url: meta.url`;
- `urlKey: normalizeJournalUrl(meta.url || '')`.

Current import normalization similarly reconstructs:

- bounded imported `url`;
- `urlKey: normalizeJournalUrl(url)`;
- `siteKey: getJournalSiteKey(url || hostname)`.

Therefore the primary P1-216 compatibility problem is not newly written rows. It is old persisted rows and any corrupted/mismatched historical state that predates the current derived-key discipline.

This is useful because a migration can preserve the semantics of modern rows rather than requiring a new portable schema merely to solve missing legacy keys.

## 4. Current source behavior matrix

| Surface | Current exact-URL identity behavior | Legacy row without `urlKey` | P1-216 result |
|---|---|---:|---|
| `queryJournalViewPage()` | derives `entry.urlKey || normalizeJournalUrl(entry.url || '')` | visible | positive control |
| `queryJournalViewGroups()` | groups through persisted `urlKeyCreatedAt` index | omitted | defect |
| `queryJournalViewGroupEntries()` | reads through persisted `urlKeyCreatedAt` range | omitted | defect |
| `listJournalEntries({url})` | scans `createdAt`, then compares `entry.urlKey === urlKey` | omitted | defect |
| current-URL templates via `WEBCLIP_JOURNAL_LIST` | inherits `listJournalEntries` | omitted | defect |
| site list | derives site key from `entry.url || entry.hostname` | generally visible | positive control / separate scope |
| `clearJournalEntries({url})` | URL branch uses persisted URL-key/index authority | may survive | defect |
| site clear | derives site identity while scanning | generally removed | positive control / separate scope |
| `deleteJournalEntry(id)` | exact row delete works; stats repair is conditioned on persisted `entry.urlKey` | row can delete but stats may remain stale | defect |
| `rebuildUrlStatsForUrl(urlKey)` | uses persisted `urlKey` index | omitted | defect |
| `rebuildAllUrlStats()` | uses persisted key or derives from `entry.url` | counted | positive control |
| modern import | recomputes `urlKey` from `url` | normalized on import | positive control |

The same row can therefore move between “exists” and “does not exist” depending on which API surface asks the question.

## 5. Exact current `WEBCLIP_JOURNAL_LIST` inconsistency

`listJournalEntries()` computes the requested canonical `urlKey`, but per row uses the predicate equivalent to:

```js
const entrySiteKey = getJournalSiteKey(entry.url || entry.hostname || '');
const matches = urlKey
  ? entry.urlKey === urlKey
  : siteKey
    ? entrySiteKey === siteKey
    : true;
```

This is particularly revealing:

- site membership is derived from raw row fields;
- exact URL membership is persisted-key-only.

Thus one legacy row can appear in site template history while being absent from current-URL template history.

P1-216 requires those two observations to be explainable by intentional scope difference, not by persistence-era accident.

## 6. Exact grouped-view ghost

`queryJournalViewPage()` intentionally uses the universal `createdAt` index and derives effective URL identity in JS. This permits old rows without `urlKey` to appear in current-URL view.

By contrast, `queryJournalViewGroups()` and `queryJournalViewGroupEntries()` rely on the compound `urlKeyCreatedAt` index.

IndexedDB does not index a row whose indexed key is absent. Consequently a missing `urlKey` is not just a value mismatch; it removes the row from that physical index domain.

Deterministic schedule:

```text
legacy row L
url = https://example.test/article
urlKey = missing

current URL view
  -> createdAt scan
  -> derive normalizeJournalUrl(L.url)
  -> L is visible

grouped URL view
  -> urlKeyCreatedAt index
  -> L has no index entry
  -> L is invisible
```

A user can therefore change only presentation mode and make an existing Journal record disappear.

## 7. Exact URL-clear ghost

The strongest user-visible schedule is:

```text
modern M: url=U, urlKey=K
legacy L: url=U, urlKey missing

view U
  M visible
  L visible through derived fallback

Clear current URL U
  URL-indexed/persisted-key branch deletes M
  L is outside persisted key/index domain

open view U again
  L becomes visible again
```

The command reported a clear of URL scope, yet the same effective URL still contains a record.

This violates the core UI invariant:

> the membership predicate used to show a scoped set must be the same membership predicate used to clear that set.

## 8. Single-entry delete creates a stats ghost

Direct delete by entry id can locate and remove a legacy row because record identity is independent of `urlKey`.

However current stats invalidation/rebuild logic is conditional on persisted `entry.urlKey`.

Schedule:

```text
legacy row L belongs to derived key K
urlStats[K] says one saved item exists

Delete L by id
  -> L removed
  -> no persisted L.urlKey
  -> targeted stats repair for K not requested

Action/status reads urlStats[K]
  -> stale count/saved truth can remain
```

P1-216 owns deriving the correct affected URL identity. P0-050 remains responsible for generation-safe publication/rebuild ordering of `urlStats` itself.

P1-216 must not claim to close P0-050 merely because it supplies the correct key to that subsystem.

## 9. Per-URL rebuild and full rebuild disagree

Current targeted rebuild:

```text
rebuildUrlStatsForUrl(K)
  -> entries.index('urlKey')
  -> only persisted K rows
```

Current full rebuild already uses a fallback equivalent to:

```text
entry.urlKey || normalizeJournalUrl(entry.url || '')
```

Therefore a legacy row can be omitted by targeted repair and restored into counts by a later full rebuild.

That produces non-deterministic-seeming user truth based on which maintenance path happened to run most recently.

P1-216 should make targeted and full rebuild use the same identity domain before P0-050 publication semantics are evaluated.

## 10. Templates are part of the same owner

Content-side selection template surfaces call `WEBCLIP_JOURNAL_LIST` for the current URL or current site.

Because the current URL branch of `listJournalEntries()` compares raw persisted `entry.urlKey`, a legacy template can be:

- visible when listing the entire site;
- absent when listing the exact current URL;
- visible in another Journal view that derives from `entry.url`.

This is why Registry wording explicitly includes `templates` in P1-216.

No separate template P-code is required for this root cause.

## 11. Canonical effective identity contract

The implementation should introduce one explicit primitive. A conceptual form is:

```js
function effectiveJournalUrlIdentity(entry) {
  const persisted = normalizeJournalUrl(entry?.urlKey || '');
  const derived = normalizeJournalUrl(entry?.url || '');

  if (persisted && derived && persisted !== derived) {
    return {
      state: 'mismatch',
      key: '',
      persisted,
      derived
    };
  }

  const key = persisted || derived;
  return key
    ? { state: persisted ? 'persisted' : 'derived', key }
    : { state: 'unavailable', key: '' };
}
```

Names are illustrative; semantics are mandatory.

The important distinction is that the helper returns an identity classification, not merely a convenient string.

## 12. Why `entry.urlKey || normalizeJournalUrl(entry.url)` alone is not the whole contract

Historical research correctly identified the missing fallback. Fresh research adds a corruption/migration boundary:

```text
entry.urlKey = K1
normalizeJournalUrl(entry.url) = K2
K1 != K2
```

Blindly preferring either side silently can split destructive/read authority.

For current modern rows and current imports these values should match. A mismatch therefore signals legacy/corrupt/incomplete migration state and should be explicit.

Recommended policy:

- read-only surfaces may expose the row in an unscoped diagnostic/recovery view;
- destructive exact-URL operations must fail closed for that mismatched row until identity is reconciled;
- migration may deterministically recompute the canonical key from the authoritative bounded `url` field if project policy confirms that field is authoritative;
- the decision must be recorded/tested, not buried in ad-hoc `||` precedence.

This refinement prevents a malicious or corrupted imported/persisted `urlKey` from becoming an independent destructive scope selector.

## 13. Persisted `urlKey` becomes an optimization, not authority

After P1-216:

```text
canonical membership
     ↓
effective Journal URL identity
     ↓
persisted urlKey / compound indexes
     = optimized materialization of that identity
```

Not:

```text
persisted urlKey
     = truth

raw url-derived key
     = different fallback truth
```

This architecture lets optimized index queries remain fast after migration while correctness stays defined independently of whether a historical row was already backfilled.

## 14. Immediate correctness path vs long-term indexed migration

Two complementary mechanisms are appropriate.

### Phase A — correctness compatibility

For bounded operations where old rows may still exist:

- use the shared effective identity helper;
- use a bounded universal `createdAt` scan/fallback when an indexed lookup cannot see unkeyed rows;
- do not call `getAll()` on the entire Journal;
- preserve pagination/work limits.

The current `queryJournalViewPage()` already demonstrates this direction.

### Phase B — canonical backfill/index convergence

Perform an explicit migration/backfill that:

1. reads rows in bounded batches/cursors;
2. derives canonical identity;
3. handles mismatch/unavailable states explicitly;
4. writes missing canonical `urlKey` under current Journal generation/revision authority;
5. advances a durable migration generation/cursor;
6. rebuilds/version-publishes dependent `urlStats` through P0-050's contract;
7. marks canonical-index readiness only after completion.

After proven completion, grouped views and targeted clears can safely use the fast `urlKeyCreatedAt` index without a legacy fallback.

## 15. Read must not silently become migration mutation

A tempting repair is:

```text
read legacy row
→ notice missing urlKey
→ write urlKey immediately
```

This is rejected as the default architecture.

Reasons:

- read-only UI should not unexpectedly become write authority;
- clear/import/replace can race the backfill;
- late lazy writes can resurrect/rewrite replacement rows without P0-076 CAS;
- partial migration can leave a mixed domain indefinitely;
- stats/index readiness would still be ambiguous;
- failures would make behavior depend on which page happened to read which row.

Backfill is a named maintenance/migration operation, not an incidental side effect of viewing.

## 16. Generation/CAS composition

P1-216 defines URL identity. It does not weaken existing mutation authority.

A migration write for row E must be bound to at least the applicable current Journal generation and exact entry revision/identity required by P0-076.

Schedule to prevent:

```text
migration reads legacy E generation A

replace/import installs new E generation B

old migration wakes
  -> writes urlKey into B based on A
```

Old A backfill must be stale/no-op.

Likewise a full identity migration must not publish a fresh-looking `urlStats` snapshot over newer concurrent mutations; that publication is P0-050 territory.

## 17. Exact URL clear must use the same membership predicate as view

Canonical acceptance rule:

```text
ShownInCurrentUrlView(entry, K)
    == ClearCurrentUrlWouldTarget(entry, K)
```

for every normal/legacy canonicalizable row.

The same equivalence should hold for:

```text
TemplateListedForUrl(entry, K)
GroupContains(entry, K)
GroupEntriesContains(entry, K)
StatsCounts(entry, K)
```

This equivalence is the clearest P1-216 invariant.

## 18. Record identity remains separate

Two Journal rows can have the same effective URL key and remain two independent records.

P1-216 does not deduplicate records merely because URLs match.

```text
record id / revision / operation provenance
        ≠
URL scope identity
```

Single-entry delete continues to target exact record identity; P1-216 only supplies the derived URL domain that must be repaired afterward.

## 19. Site scope remains separate

Site clear/list already derives site identity from row URL/hostname more consistently than exact-URL paths.

P1-216 should preserve:

```text
https://example.com/a?q=1
https://example.com/b?q=2
```

as:

```text
same site domain
but different exact URL domains
```

Do not solve exact URL legacy membership by replacing it with hostname/site matching.

That would over-delete and over-group.

## 20. Fragment and query semantics

Because current `normalizeJournalUrl()` removes hash:

```text
https://example.com/a#one
https://example.com/a#two
```

belong to the same exact Journal URL domain.

But:

```text
https://example.com/a?q=1
https://example.com/a?q=2
```

remain distinct.

The migration/helper must reuse this exact policy so historical and modern rows do not acquire a new scope definition merely because P1-216 is implemented.

## 21. Malformed/unavailable URL state

A row with neither:

- a valid canonical persisted `urlKey`, nor
- a valid canonicalizable `url`

has no exact URL identity.

It must not be assigned one using only:

- hostname;
- title;
- siteAddress;
- adjacent rows;
- display group;
- current browser tab URL.

Such a row belongs in unscoped/diagnostic handling and must be excluded from exact-URL destructive operations until repaired explicitly.

## 22. Import behavior

Current import is a positive control because it recomputes `urlKey` from bounded imported `url` rather than trusting an imported raw key.

P1-216 should preserve that behavior.

For old portable backups whose rows omit `urlKey`:

```text
raw legacy row
   ↓ import normalization
canonical bounded url
   ↓
urlKey = normalizeJournalUrl(url)
```

Thus import can naturally heal missing-key portable data before final installation.

But already persisted local legacy rows still need the compatibility/migration path described above.

## 23. Replace/import interaction

A full replace/import can remove the old local legacy population and install normalized rows.

However P1-216 cannot rely on the user eventually performing a destructive replace as its migration strategy.

The current local database may legally contain old rows for years. All supported current operations must behave correctly before any voluntary import/replace happens.

## 24. Grouped view strategy options

Two acceptable implementation families exist.

### Option 1 — migration-gated fast index

Before grouped/indexed URL features are enabled:

```text
ensure canonical URL identity migration complete
        ↓
urlKeyCreatedAt index is complete
        ↓
use fast indexed grouping
```

This is preferred at scale if migration is bounded and durable.

### Option 2 — bounded dual path during transition

```text
indexed modern rows
+
bounded legacy cursor for missing-key rows
        ↓
merge by effective key
```

This avoids blocking the UI on a whole migration but is more complex and must preserve pagination ordering exactly.

A full unbounded scan/materialization is not acceptable for a large Journal.

## 25. URL-clear strategy options

Similarly:

### Migrated database

Use the canonical index after a proven readiness marker.

### Transition database

Delete in bounded batches using effective-key membership, including unkeyed legacy rows, with Journal-generation CAS and resumable progress if needed.

The operation must not report complete while matching legacy rows remain merely because the index could not see them.

## 26. `urlStats` strategy

P1-216 supplies canonical membership to both:

- targeted `rebuildUrlStatsForUrl(K)`;
- full `rebuildAllUrlStats()`.

After identity convergence they must count the same row set for K.

Then P0-050 separately guarantees that the resulting derived state is generation-versioned and not overwritten by stale rebuild publication.

The two contracts compose as:

```text
P1-216: which rows belong to K?
P0-050: which rebuild generation may publish K's derived stats?
```

## 27. Action/status implications

Any Action/badge/status surface that consumes `urlStats` inherits P1-216 indirectly.

P1-216 does not own Chrome Action stale-read truth; P1-217 owns explicit unknown/degraded Action state after failed current reads.

But P1-217 can only display truthful data if P1-216 supplies correct legacy membership to the stats subsystem.

## 28. Failure and diagnostics

Recommended bounded diagnostics for migration/mismatch:

```text
legacyRowsDerived
legacyRowsBackfilled
identityMismatches
identityUnavailable
migrationCursor/progress
statsRebuildRequired
```

Do not log full sensitive URLs beyond the project's existing redaction/bounded diagnostic policy.

Counts and bounded non-secret reason codes are sufficient for most operational evidence.

## 29. Deterministic model included in this branch

`project_tools/test_p1_216_journal_url_identity_model.js` models 22 scenarios.

The model demonstrates both current divergence and target convergence for:

- modern keyed rows;
- legacy missing-key rows;
- grouped/un-grouped membership;
- URL clear;
- single delete + stats repair;
- targeted vs full stats rebuild;
- malformed URLs;
- persisted/derived mismatch;
- import/backfill identity preservation;
- fragment/query semantics;
- site-vs-URL separation;
- record identity separation;
- P0-050 boundary.

The numeric/data examples are illustrative and do not define production retention or pagination constants.

## 30. Source-bound gate direction

`project_tools/test_p1_216_journal_url_identity_source.js` requires future runtime to expose one canonical effective URL identity primitive and to route the major surfaces through it or through a proven canonical migration readiness contract.

The gate intentionally keeps current positive controls:

- `normalizeJournalUrl()`;
- separate `getJournalSiteKey()`;
- import recomputation of `urlKey`;
- existing legacy fallback behavior until centralized.

It rejects a repair that merely raises limits or adds another ad-hoc fallback to one additional screen.

## 31. Required implementation invariants

1. One canonical effective exact-URL identity function/policy exists.
2. Missing persisted `urlKey` does not exclude a canonicalizable legacy row from exact URL scope.
3. Persisted-vs-derived mismatch is explicit, not silently split across APIs.
4. Current URL view/list/templates/group/group-entries use one membership domain.
5. Current-URL clear targets the same canonicalizable rows shown in that domain.
6. Single-entry delete derives affected URL identity before the row disappears.
7. Per-URL and full stats rebuild count the same canonical membership.
8. Persisted `urlKey` remains an optimization/materialized index key, not independent truth.
9. Site identity remains separate and is not substituted for exact URL identity.
10. Migration/backfill is bounded and durable.
11. Migration writes are generation/revision fenced.
12. No unbounded `getAll()` whole-Journal materialization is introduced.
13. New writes/import keep canonicalizing `urlKey` from `url`.
14. Hash/query behavior remains exactly that of `normalizeJournalUrl()`.
15. Malformed/unavailable identity fails closed for exact-scope destructive operations.
16. P0-050 generation-safe derived-stat publication remains independently enforced.

## 32. Physical/real-data acceptance matrix

P1-216 must not close from deterministic model/source proof alone.

Prepare a real unpacked-Chrome profile/database containing controlled legacy rows.

### Case A — missing-key legacy current URL

Insert/migrate a row with:

```text
url = U
urlKey absent
```

Verify it appears identically in:

- current URL Journal view;
- grouped URL view;
- expanded group entries;
- current URL selection-template list.

### Case B — clear current URL

Have both modern and legacy rows for U.

Run clear-current-URL.

Verify neither remains in any view/template and derived stats become zero/current under P0-050 semantics.

### Case C — single delete

Delete one legacy row by id.

Verify exact row disappears and the derived U stats repair is requested/applied for U.

### Case D — targeted/full rebuild convergence

Create mixed legacy/modern rows for the same U.

Run targeted and full stats rebuilds separately.

Verify both produce the same membership/count before publication-generation concerns.

### Case E — site scope

Create rows U1/U2 on the same site.

Verify exact URL operations remain separate while site list/clear includes both.

### Case F — fragment/query semantics

Verify hash variants share identity and query variants remain distinct according to current normalizer.

### Case G — malformed row

A row without a valid URL must not be silently attached to the current tab/hostname exact URL scope.

### Case H — mismatch

Create a controlled row where persisted key contradicts normalized `url`.

Verify read diagnostics expose mismatch and exact-scope destructive operations do not silently choose conflicting authorities.

### Case I — restart during migration

Interrupt a bounded backfill, restart MV3 worker/browser, resume, and prove no duplicate/dropped row and no false readiness marker.

### Case J — concurrent replace/import

Interrupt migration while a Journal replace/import supersedes old rows. Old migration writes must be stale/no-op under generation/revision fencing.

## 33. Closure criteria

P1-216 may move from ACTIVE only after all of the following are true:

- production implementation exists;
- source-bound gate is PASS on exact source;
- deterministic model remains PASS;
- broader Journal tests remain PASS;
- mixed legacy/modern physical Chrome database test is PASS;
- clear/delete/stats/template convergence is demonstrated;
- migration restart/concurrency behavior is proven;
- P0-050/P0-076 boundaries are not weakened;
- Registry is updated only after that evidence exists.

## 34. Non-goals

P1-216 does not by itself solve:

- generation-safe publication of `urlStats` — P0-050;
- general Journal per-entry mutation CAS/replace races — P0-076;
- Chrome Action stale/degraded read truth — P1-217;
- general scalable full-text Journal search — P1-009;
- record deduplication;
- URL privacy/redaction policy beyond using the canonical durable URL normalizer.

## 35. Recommended implementation order

1. Add/test canonical effective URL identity helper with mismatch classification.
2. Route read-only list/current-view/template membership through it.
3. Add bounded canonical URL-key migration/readiness state.
4. Make grouped view/group-entry index use conditional on proven migration readiness or add bounded transition fallback.
5. Make URL clear use the same canonical membership.
6. Derive the affected key before single-entry delete and feed stats repair.
7. Make targeted/full stats rebuild share identity helper.
8. Add migration generation/revision fencing and restart tests.
9. Run mixed legacy/modern physical Chrome fixtures.
10. Only then consider P1-216 closure.

## 36. Final architecture statement

The durable design rule from P1-216 is:

```text
Journal record identity
        = exact row id/revision/provenance

Journal URL-scope identity
        = normalizeJournalUrl(canonical row URL)
          materialized as urlKey when valid

Persisted urlKey
        = indexed representation of that identity
        != independent authority
```

Every view, template, clear, delete-side stats repair and derived-stat rebuild must answer URL membership through that one domain.

A legacy row must never become a “ghost” merely because it was written before `urlKey` existed.
