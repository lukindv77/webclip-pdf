# P1-211 — Deleted-comment tombstone lifecycle refinement

Date: 2026-09-11

Status: research / architecture evidence only. Registry owner remains **ACTIVE**.

Canonical baseline: `main = e030df2f70334f7889f360a86de44be55c988719`.

Canonical `service-worker.js` blob inspected: `6d61ac81befdbf2804ae9dbec425aa08d1194eb1`.

Historical provenance branch inspected only as provenance: `research/p1-211-comment-tombstone-lifecycle-2026-09-08`, merge-base `d4f5b268fa3f7ced5a7bc68da52784863d614138`.

The current `service-worker.js` blob is byte-identical to the historical branch's blob. No historical branch is imported wholesale.

Production/runtime modification: **NONE**.

This research does not change `manifest.json`, runtime source, release policy, release readiness, release receipts, product packaging, tags, GitHub Releases, deployment or publishing.

The release hard fence remains:

`EXPLICIT_USER_APPROVAL_FOR_RELEASE_POLICY_ACTIVATION`

## 1. Current owner and boundary

Current Registry authority is exact:

> P1-211 ACTIVE — Deleted comment tombstones need one lifecycle across retention/search/export/import and portable capacity debt; deleted payload cannot consume active capacity forever.

P1-211 owns the bounded lifecycle and accounting of deleted comment state once product deletion semantics are selected.

It does **not** select the user-facing meaning of Delete. That remains P1-202:

- whether deleted body text is privacy-erased from current authoritative state; or
- whether deleted text is intentionally retained as disclosed history.

P1-211 also does not absorb:

- P0-076 — exact per-entry revision + Journal-generation mutation CAS;
- P0-077 — full-Journal self-export / same-version restore envelope;
- P1-009 — scalable Journal text-search strategy;
- P1-035 — temporary transfer/import staging lifecycle;
- P1-194 — truthful browser-storage durability classification;
- P1-206 — one composed Journal view must be source-revision coherent;
- P1-207 — backup success must carry exact Journal source revision;
- P1-215 — staged import lease/restart authority;
- P1-225 — editor draft preservation while Save is pending.

P1-211 consumes those owners where needed; it does not redefine their authority.

## 2. Fresh current-source proof

### 2.1 Shared raw limits still mix active and deleted domains

Current source still defines:

```text
MAX_IMPORTED_COMMENT_CHARS = 100000
MAX_IMPORTED_COMMENTS_PER_ENTRY = 500
MAX_JOURNAL_COMMENTS_TOTAL_CHARS = 2 * 1024 * 1024
```

There is still no dedicated current constant family for:

```text
active comment count
active comment text
retained deleted-body count
retained deleted-body chars
structural tombstone count
tombstone retention age
bounded tombstone compaction batch
```

The same physical array is therefore still used as both active product state and deleted-history state without distinct capacity semantics.

### 2.2 Normalization still preserves deleted bodies verbatim

`normalizeJournalComments(entry)` still emits rows containing both `text` and `deletedAt`.

For a structured comment it keeps:

```js
{
  id,
  text,
  createdAt,
  updatedAt,
  deletedAt: Math.max(0, Number(item.deletedAt || 0))
}
```

A row with `deletedAt > 0` remains a full-text comment object rather than becoming a first-class minimal tombstone.

This also means that simply replacing deleted text with `''` would be unsafe under the current representation: the existing normalizer's active-body assumptions can cause a minimal deleted record to disappear rather than remain an identity tombstone.

### 2.3 Add still charges deleted rows to active count

Current `addJournalComment()` performs:

```js
const comments = normalizeJournalComments(current);
if (comments.length >= MAX_IMPORTED_COMMENTS_PER_ENTRY) ...
assertJournalCommentBudget([...comments, { text }]);
```

`comments.length` includes rows with `deletedAt > 0`.

Therefore every retained tombstone still consumes the same count budget that admits a new live comment.

### 2.4 Aggregate text budget still spans deleted bodies

`assertJournalCommentBudget()` still operates on the complete normalized comment list. The current architecture does not project active rows before aggregate text accounting.

Thus a deleted body can prevent a future small active Add/Edit even when no live comment is large.

### 2.5 Ordinary search still matches deleted body text

Current `journal-text-filter.js::commentsContain()` still loops over every raw `journalComments` item and matches `item.text` without checking `deletedAt`.

Therefore ordinary Comments search still includes deleted-body history by accidental storage representation rather than by an explicit search mode.

### 2.6 Current Journal UI still rediscloses deleted bodies

Current `journal.js` still renders a deleted comment as a deleted details block and sets:

```js
text.textContent = comment.text;
```

This is direct current evidence that deleted rows remain full retained history objects.

Whether that redisclosure should remain is P1-202. P1-211 must support whichever semantic decision P1-202 eventually fixes, without allowing retained history to own active capacity forever.

### 2.7 Export/import remain lifecycle-coupled to raw rows

The current export/import design still serializes normalized comment rows as part of Journal entries and restores imported `text` plus `deletedAt`.

The same portable snapshot path is used for file export and Yandex Journal backup.

Consequently the capacity debt remains portable:

```text
installation A
  repeated Add/Delete
  -> retained full tombstones
  -> export / Yandex backup

installation B
  restore/import
  -> same tombstones
  -> same active admission debt
```

This is not merely local IndexedDB bloat. It is encoded into portable product state.

## 3. Deterministic current failure schedules

### Schedule A — count debt with zero live comments

Let the per-entry raw limit be `N = MAX_IMPORTED_COMMENTS_PER_ENTRY`.

Repeat N times:

```text
Add Ci
Delete Ci
```

Current result:

```text
live comments = 0
journalComments.length = N
next Add -> rejected as too many comments
```

The active product has no live comments, yet deleted history consumes 100% of active count admission.

### Schedule B — text debt with almost no live text

Repeat:

```text
Add large body
Delete it
```

until deleted-body text approaches `MAX_JOURNAL_COMMENTS_TOTAL_CHARS`.

Then attempt a small live Add/Edit.

Current result can be rejection because historical deleted text is charged to the same aggregate text budget.

### Schedule C — ordinary search rediscovers deleted text

```text
Add body containing unique marker SECRET-X
Delete comment
ordinary Comments search for SECRET-X
```

Current helper can still match the deleted row because it ignores `deletedAt`.

This is not a claim that P1-202 must choose erasure; it proves that search semantics are currently implicit and storage-shape-driven.

### Schedule D — portable debt

```text
A: fill entry with deleted tombstones until active Add is blocked
A: export / backup
B: import same snapshot
B: attempt new active Add
```

The imported tombstones reconstruct the same active-capacity blockade.

## 4. Root cause

The defect is not "too-small limits".

The root cause is that one raw representation is being asked to mean all of these at once:

```text
active authored comments
deleted identity markers
deleted full-text history
ordinary search corpus
portable export state
import validation state
active quota accounting
```

Those meanings have different lifecycle and capacity requirements.

Increasing `500` or `2 MiB` only delays the same failure.

## 5. Required architecture: active projection and history projection

P1-211 requires two logical accounting domains even if implementation keeps one physical array.

### 5.1 Active domain

At minimum:

```text
activeCount
activeTextChars
```

where active means the exact current comment generation is not deleted.

Add/Edit admission uses this domain.

Deleted rows must not consume active count or active text solely because they remain physically present.

### 5.2 Deleted/history domain

At minimum it needs independent hard bounds for the representation actually retained, for example:

```text
structuralTombstoneCount
retainedDeletedBodyCount
retainedDeletedBodyChars
optional retention age/class
bounded compaction batch
```

Exact production numeric limits are intentionally not selected by this research tranche. They are implementation/product policy, not evidence facts.

The key invariant is separation of domains, not a particular number.

## 6. First-class lifecycle state

A deleted record must be valid independently of whether body text exists.

Conceptually:

```text
CommentState = ACTIVE | DELETED_FULL | DELETED_MINIMAL
```

Equivalent representations are acceptable.

Required interpretation:

- `ACTIVE`: bounded non-empty current body required;
- `DELETED_FULL`: deleted identity + optional retained body under the selected P1-202 policy;
- `DELETED_MINIMAL`: deletion identity/history retained but body absent by design.

The normalizer must not infer "valid comment" solely from non-empty text before it determines lifecycle state.

## 7. P1-202 semantic dependency remains explicit

P1-211 must support either final P1-202 decision.

### 7.1 Privacy-delete mode

If Delete means current-authoritative body erasure:

```text
ACTIVE -> DELETED_MINIMAL
```

must remove body from current authoritative state during the exact delete mutation.

Consequences:

- ordinary UI cannot reconstruct the body;
- ordinary search cannot match it;
- later file export cannot contain it;
- later Yandex backup cannot contain it;
- import of a post-delete snapshot cannot restore it;
- deleted body consumes neither active nor retained-body capacity.

This does **not** retroactively erase older backup objects. Historical remote purge is a separate product/remote-history question and must not be implied.

### 7.2 Explicit retained-history mode

If Delete intentionally retains full body history:

```text
ACTIVE -> DELETED_FULL -> DELETED_MINIMAL -> optional expiry
```

The full-history stage must be independently bounded by count/size and, if selected, age.

Ordinary active admission ignores this history domain.

Ordinary search must remain active-only unless the product intentionally exposes a separate deleted-history search scope.

The transition from `DELETED_MINIMAL` to no record is semantically stronger than body compaction because it forgets deletion identity. It therefore requires explicit history semantics and cannot be introduced silently as quota cleanup.

## 8. Exact mutation/compaction authority

P1-211 compaction consumes P0-076's current authority.

A maintenance scan is not mutation authority.

Unsafe schedule:

```text
1. compactor observes deleted comment X under entry revision A
2. import/replace/edit installs newer logical X under revision B
3. old compactor settles late
4. old compactor matches textual id X only
5. newer state is redacted/removed
```

Required final mutation must fresh-validate exact entry/Journal generation and the exact comment identity/generation representation available after P0-076 implementation.

A stale compaction receipt becomes no-op/conflict.

It never retargets a same-textual-id replacement.

## 9. Bounded compaction and MV3 lifecycle

P1-211 must not implement an unbounded full-Journal rewrite in one worker wake.

Maintenance should be bounded by explicit work units such as:

```text
entries per pass
comments per pass
chars inspected/rewritten
time/deadline
```

Progress must be restart-safe under normal MV3 termination if compaction spans wakes.

If a durable maintenance cursor/checkpoint is introduced, that cursor is scheduling/progress state, not mutation authority. Every actual rewrite still needs fresh exact source authority.

## 10. Search contract

Ordinary Comments search should operate on the active projection.

Current behavior that loops over every raw comment body is representation leakage.

If retained-history mode later exposes historical search, make the scope explicit:

```text
active-comments
deleted-history
```

and only enable the latter when bodies are intentionally retained.

Any derived index/cache introduced under P1-009 must be invalidated or versioned across:

- delete;
- body redaction;
- full-to-minimal compaction;
- import/restore;
- lifecycle-policy migration.

A stale search index containing removed text would violate the lifecycle even if IndexedDB state is correct.

## 11. Portable export/import contract

Portable serialization needs an explicit comment projection rather than accidental raw-row spreading.

Conceptually:

```text
projectCommentForPortableState(comment, lifecyclePolicy)
```

The projection must preserve the same lifecycle semantics as current authoritative storage.

Requirements:

1. active comments remain bounded by active limits;
2. deleted full bodies are included only if the selected product policy intentionally retains them;
3. minimal tombstones serialize without requiring fake non-empty text;
4. structural/history bounds are enforced independently of active limits;
5. import validates lifecycle state and cannot reinterpret a minimal tombstone as malformed active comment;
6. export/import round-trip cannot recreate capacity debt by charging deleted history to active admission.

P0-077's 50 MiB/entry envelope remains an outer restore envelope. P1-211 does not weaken it.

## 12. Backup composition

Yandex Journal backup uses the portable full-Journal snapshot path.

P1-211 therefore composes with P1-207:

```text
P1-207 answers: which exact Journal source revision did this backup protect?
P1-211 answers: what comment lifecycle state belongs in that exact source revision's portable representation?
```

Neither owner substitutes for the other.

A backup can be source-revision exact yet still carry undesirable lifecycle semantics if deleted full bodies and capacity debt are serialized accidentally.

## 13. Fresh external research

External systems are comparison points, not imported WebClip requirements.

### 13.1 Apache Cassandra: tombstones require explicit grace and compaction

Official Cassandra documentation describes deletion markers as tombstones, retained for a grace period to prevent resurrection, then eligible for removal during compaction. It also explicitly warns that tombstones accumulate storage/read cost if not reclaimed.

Sources:

- https://cassandra.apache.org/doc/stable/cassandra/managing/operating/compaction/overview.html
- https://cassandra.apache.org/doc/latest/cassandra/reference/cql-commands/create-table.html

Applicable comparison principle:

> deletion identity can be temporarily necessary, but its retention must have an explicit lifecycle and safe removal condition.

Non-applicable details:

- WebClip is not a replicated Cassandra cluster;
- Cassandra's `gc_grace_seconds` is not a proposed WebClip retention duration;
- WebClip does not need repair semantics copied from SSTables.

### 13.2 CouchDB: ordinary deletion and irreversible purge are distinct semantics

CouchDB's official `_purge` documentation distinguishes normal deletion, which leaves a `_deleted=true` revision for replication, from purge, which permanently removes references.

Source:

- https://docs.couchdb.org/en/latest/api/database/misc.html#db-purge

Applicable comparison principle:

> "deleted but identity retained" and "identity permanently forgotten" are different state transitions and should not be conflated.

This directly supports the P1-211 distinction between body compaction and final structural tombstone expiry.

### 13.3 PostgreSQL: dead state needs separate reclamation

PostgreSQL documents that deleted/obsolete tuples are not physically removed immediately; `VACUUM` later reclaims their storage.

Sources:

- https://www.postgresql.org/docs/current/sql-vacuum.html
- https://www.postgresql.org/docs/current/runtime-config-vacuum.html

Applicable comparison principle:

> logical deletion and physical/history reclamation are separate lifecycle phases, and frequently modified data requires bounded regular reclamation.

Again this is a comparison, not a proposal to model WebClip on MVCC tuples.

## 14. Trade-offs

### Option A — immediate privacy erasure

Advantages:

- smallest retained payload;
- strongest current-state privacy semantics;
- ordinary search/export become simpler;
- no retained-body capacity domain required.

Costs:

- deleted body cannot be shown as history;
- existing UI behavior changes;
- migration of existing full tombstones needs an explicit one-way policy.

This option belongs to P1-202 product semantics, not P1-211 alone.

### Option B — bounded disclosed full history

Advantages:

- preserves current deleted-history viewing for a bounded interval/domain;
- supports historical review workflows if that is an explicit product goal.

Costs:

- more storage, search and privacy complexity;
- needs independent body-history bounds and compaction;
- portable schema must encode the lifecycle truthfully.

### Option C — keep current unbounded-within-active-limits coupling

Rejected as P1-211 target because it preserves the demonstrated capacity-debt schedule and portable propagation.

## 15. Migration constraints

Legacy v1 entries may already contain full-text deleted rows.

A future runtime implementation must choose an explicit migration interpretation rather than silently pretending those rows were produced under the new policy.

Safe migration properties:

- bounded batches;
- exact current-entry authority at rewrite;
- no accidental resurrection of deleted rows;
- no fabricated deletion timestamps;
- no silent conversion of retained body to active body;
- portable export during partial migration remains truthful;
- source revision advances for authoritative rewrites;
- old backup objects are not claimed rewritten.

## 16. Deterministic refinement model

This tranche adds:

`project_tools/test_p1_211_comment_tombstone_lifecycle_refinement_model.js`

The model binds itself to fresh current source and proves:

1. current Registry P1-211 owner wording;
2. exact canonical baseline and release fence in this evidence;
3. current full-text tombstone representation;
4. current Add count debt;
5. current ordinary-search deleted-body match;
6. zero-live-comment count starvation witness;
7. deleted-text active-budget starvation witness;
8. active/history capacity separation;
9. minimal tombstone remains valid without body;
10. privacy-delete projection removes body from portable state;
11. retained-history projection keeps body only inside independent history bounds;
12. ordinary search ignores deleted history;
13. explicit history search can include retained bodies when policy allows;
14. full-to-minimal compaction does not consume active capacity;
15. structural tombstone bound remains independent;
16. stale generation compaction is rejected;
17. portable round-trip does not recreate active debt;
18. final structural expiry is distinct from body compaction;
19. P1-202/P0-076/P0-077/P1-207/P1-215 boundaries stay separate;
20. runtime and manifest remain untouched by this research tranche.

## 17. Implementation acceptance target

P1-211 runtime implementation should not be considered closed until deterministic source/runtime evidence proves at least:

- Add/Edit use active projection for active limits;
- deleted bodies do not own active count/text capacity;
- minimal tombstone is a valid first-class state;
- selected P1-202 semantics are implemented consistently in UI/search/export/import;
- retained history, if any, has independent hard bounds;
- structural tombstones also have an explicit bound/lifecycle;
- compaction is bounded and exact-generation safe;
- portable export/import preserves lifecycle state without capacity-debt resurrection;
- Journal revision/source freshness semantics remain intact;
- no release authority is inferred from research completion.

## 18. Current conclusion

P1-211 remains **ACTIVE**.

Fresh `main` still stores deleted comments as full-text rows, charges those rows to active comment count/text admission, exposes them to ordinary Comments search, renders their bodies in deleted UI, and transports the same representation through portable Journal state.

The architecture target is not merely "delete old tombstones". It is:

```text
explicit lifecycle state
+ separate active/history capacity domains
+ bounded exact-generation compaction
+ explicit ordinary-vs-history search semantics
+ portable lifecycle projection
+ product-semantic dependency on P1-202
```

No runtime implementation, manifest/version change, release action or release evidence is authorized by this tranche.
