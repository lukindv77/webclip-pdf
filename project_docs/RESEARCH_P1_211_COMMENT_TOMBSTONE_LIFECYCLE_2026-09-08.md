# P1-211 — Deleted comment tombstone lifecycle, bounded history and portable capacity

Date: 2026-09-08

Status: research / architecture evidence only. Registry owner remains **ACTIVE**.

Branch baseline: `main@d4f5b268fa3f7ced5a7bc68da52784863d614138`.

This checkpoint intentionally does **not** modify runtime, `manifest.json`, Registry status, build/tag/release state or production behavior.

## 1. Canonical owner

`RESEARCH_REGISTRY.md` defines:

> **P1-211 | ACTIVE | Deleted comment tombstones need one lifecycle across retention/search/export/import and portable capacity debt; deleted payload cannot consume active capacity forever.**

The owner must stay distinct from adjacent comment owners:

- **P1-202** — what Delete means for the user and whether deleted body text is privacy-erased or intentionally retained as disclosed history;
- **P0-076** — exact Journal/entry/comment mutation CAS and generation authority;
- **P1-225** — pending Save versus a newer local editor draft;
- imported comment identity owners — uniqueness/normalization of imported comment ids;
- **P0-077** — Journal export/restore envelope;
- **P1-215** — staged import lease/restart authority.

P1-211 owns neither the final product meaning of Delete nor generic comment concurrency. It owns the **bounded lifecycle and accounting of the deleted state once deletion semantics are selected**, and requires that this lifecycle stay coherent across local storage, UI/search, export, Yandex backup and import/restore.

## 2. Executive finding

Current `service-worker.js` and `journal.js` implement deleted comments as full-text soft tombstones:

```text
journalComments[i] = {
  id,
  text,          // preserved verbatim
  createdAt,
  updatedAt,
  deletedAt > 0
}
```

The same tombstone is then:

- normalized with its full text;
- counted by the same per-entry comment-count limit as active comments;
- charged to the same aggregate comment-text limit as active comments;
- exposed by the deleted-comment UI details block;
- matched by ordinary comment search;
- serialized into the full Journal export;
- uploaded through the same full-Journal snapshot used by Yandex backup;
- imported with `text + deletedAt` restored;
- not subject to a dedicated comment-tombstone compaction/retention lifecycle.

Therefore repeated legitimate add/delete cycles can consume the entire active admission budget while leaving zero live comments. Because export/import preserves the tombstones, this is **portable capacity debt**: another installation/session restoring the backup inherits the same inability to add new comments.

This is not fixed by increasing `500` or `~2 MiB`. It is a lifecycle/accounting defect.

## 3. Current-source proof

### 3.1 Current limits are shared by live and deleted comments

Current constants include:

```text
MAX_IMPORTED_COMMENT_CHARS = 100000
MAX_IMPORTED_COMMENTS_PER_ENTRY = 500
MAX_JOURNAL_COMMENTS_TOTAL_CHARS = 2 * 1024 * 1024
```

There is no corresponding current constant family for:

```text
active comment count
active comment text
retained tombstone count
retained tombstone body bytes/chars
tombstone retention age
minimal compact tombstone count
```

The one raw list therefore serves two different logical domains.

### 3.2 Normalization preserves deleted body text

`normalizeJournalComments(entry)` maps every structured comment to a normalized object that contains both:

```text
text

deletedAt
```

A comment with `deletedAt > 0` therefore remains a full comment object rather than becoming a minimal identity tombstone.

Normalization also rejects empty body rows before lifecycle interpretation. That representation decision matters for a future minimal tombstone: a compact deleted record cannot rely on the current "non-empty text means valid comment" assumption.

P1-211 implementation therefore needs an explicit state-aware normalizer rather than simply setting deleted `text=''` and then passing it through a normalizer that drops the tombstone entirely.

### 3.3 Delete only sets `deletedAt`

Current `deleteJournalComment(id, commentId)`:

1. loads current entry;
2. calls `normalizeJournalComments(current)`;
3. locates the first matching textual comment id;
4. rejects if already deleted;
5. replaces the row with `{ ...comments[index], deletedAt: Date.now() }`;
6. writes the whole comments array back.

The text remains unchanged.

This is a positive identity/history control because the deleted row does not silently become active after ordinary normalization, but it creates P1-211 capacity debt and P1-202 privacy/disclosure consequences.

### 3.4 Add Comment charges tombstones to active admission

Current `addJournalComment()` checks:

```text
comments.length >= MAX_IMPORTED_COMMENTS_PER_ENTRY
```

where `comments` is the output of `normalizeJournalComments(current)` and therefore includes deleted comments.

It then calls:

```text
assertJournalCommentBudget([...comments, { text }])
```

`assertJournalCommentBudget()` loops over the complete list and sums each comment `text.length` without excluding `deletedAt > 0`.

Consequences:

```text
raw tombstone count -> active Add admission debt
raw tombstone body -> active Add text debt
```

A deleted comment is therefore operationally treated as both history and active-capacity consumption.

### 3.5 Edit budget has the same accounting domain

Current Edit correctly rejects direct editing of a deleted comment, but the prospective edit budget is calculated over the full normalized array. Thus unrelated deleted history can also cause a live comment edit to exceed aggregate text limits.

P1-211 should separate **whether history may exist** from **whether history can prevent ordinary active editing/admission**.

### 3.6 Deleted body is deliberately redisclosed in the current UI

`journal.js` renders deleted comments as a `<details>` element with a deleted badge/date and then places:

```text
comment.text
```

into a deleted-comment text block.

That is a P1-202 semantic/privacy issue, but for P1-211 it proves that current deleted rows are not minimal tombstones: they remain full retained history objects.

### 3.7 Ordinary comment search includes tombstone bodies

`journal-text-filter.js::commentsContain()` checks:

```text
fileComment
journalComment
all journalComments item text
```

It does not inspect `deletedAt` before matching `item.text`.

Thus an ordinary query with the Comments field enabled can match a deleted body.

P1-211 must make search/index behavior use the same lifecycle policy as storage/export/import. A future compactor cannot redact a body in one surface while a stale derived search index continues to match it.

### 3.8 Full Journal export serializes tombstones verbatim

`readJournalEntryBatch()` currently serializes each entry approximately as:

```text
JSON.stringify({
  ...entry,
  journalComments: normalizeJournalComments(entry)
})
```

Because normalization preserves deleted text, the export preserves deleted text.

The export schema is currently:

```text
schema = webclip-journal
schemaVersion = 1
```

No current portable comment-lifecycle policy receipt identifies whether a deleted body is privacy-erased, intentionally retained, compacted, or subject to a retention policy.

### 3.9 File export and Yandex backup use the same snapshot builder

`stageFullJournalExport()` is used by both:

- file export / prepared Save As;
- Journal backup upload to Yandex.

Therefore P1-211 is not a local-only issue. The same full tombstone payload travels into remote backup history.

A fix applied only to `journal.js` rendering or only to a local IndexedDB maintenance pass would leave remote backup semantics inconsistent.

### 3.10 Import restores body plus deletion marker

Current `sanitizeImportedComments()` maps imported comment rows with:

```text
id
text
createdAt
updatedAt
deletedAt
```

then feeds them back through `normalizeJournalComments()`.

The same raw comment-count/text budgets are validated on import.

Thus a backup containing full tombstones reconstructs the same full tombstones and the same capacity debt after restore.

### 3.11 No dedicated tombstone lifecycle is present in current deletedAt paths

Current source occurrences of comment `deletedAt` are concentrated in:

- normalization;
- add/edit/delete checks;
- import normalization;
- page rendering.

There is no current tombstone-specific retention/compaction path comparable to the bounded recovery/checkpoint policies elsewhere in WebClip.

The absence of that lifecycle is exactly the P1-211 owner.

## 4. Deterministic current failure schedule

Let one Journal entry have current raw comment-count limit `N`.

Repeat `N` times:

```text
Add comment Ci
Delete comment Ci
```

After every iteration:

```text
live comments = 0
raw tombstones += 1
```

After `N` iterations:

```text
live comments = 0
raw journalComments.length = N
```

The next legitimate Add is rejected by the same raw count limit.

A similar schedule exists for aggregate text:

```text
add large body
delete it
repeat
```

until the preserved deleted-body text approaches the aggregate per-entry text budget.

The entry may contain almost no currently visible/live authored text but still reject a small live edit/add because historical deleted text owns the same quota.

## 5. Why the debt is portable

Current export preserves the full tombstone array.

Current import reconstructs it.

Therefore:

```text
installation A
  repeated add/delete
  -> tombstone capacity debt
  -> export / Yandex backup

installation B
  import/restore
  -> same tombstones
  -> same active admission debt
```

This is stronger than ordinary local-storage pressure. The product's portable schema has encoded historical debt as active product state.

P1-211 therefore requires a portable-schema policy, not merely local garbage collection.

## 6. Required architecture: two logical capacity domains

At minimum the comment subsystem needs distinct accounting for:

```text
ACTIVE DOMAIN
  activeCount
  activeTextChars

DELETED/HISTORY DOMAIN
  tombstoneCount
  fullDeletedBodyCount
  retainedDeletedBodyChars
  optional retention age/class
```

The implementation may store these in one physical array if bounded and efficient, but admission logic must not confuse them.

### 6.1 Active capacity

Active capacity protects ordinary product behavior:

- active comment count;
- active comment body size;
- active aggregate text size.

A tombstone must not consume the active count budget merely because it occupies an array element.

A deleted retained body must not consume active text budget.

### 6.2 History capacity

History capacity protects storage, CPU, export size and privacy boundaries:

- maximum retained full-body tombstones;
- maximum retained deleted-body bytes/chars;
- maximum structural tombstones;
- optional age retention;
- bounded maintenance/compaction batch size.

The exact production numbers are intentionally **not selected by this research checkpoint**. Small constants in the deterministic model exist only to make schedules compact.

## 7. P1-202 is a semantic dependency, not a duplicate

P1-211 must be implementable under either permitted P1-202 product decision.

### 7.1 Mode A — privacy-delete

Delete means body erasure from current authoritative portable state.

Target deleted record is minimal, for example conceptually:

```text
CommentTombstone {
  id,
  commentGeneration,
  createdAt?,
  updatedAt?,
  deletedAt,
  bodyRetained: false
}
```

No body text remains in the active record.

Required consequences:

- ordinary UI cannot reveal deleted text;
- ordinary search cannot match it;
- post-delete file export cannot contain it;
- post-delete Yandex backup cannot contain it;
- post-delete export/import cannot restore it;
- body consumes neither active nor retained-body capacity;
- existing backup objects created before deletion are not falsely claimed erased unless a separate historical purge exists.

P1-211 still needs a bounded structural tombstone lifecycle so repeated deletions do not make metadata grow without bound.

### 7.2 Mode B — intentional research-history

Delete means active removal while full body may remain as explicitly disclosed history.

Then full history must be separately bounded by at least one defensible combination of:

```text
count
bytes/chars
age
```

Older full tombstones must eventually:

```text
full tombstone
   -> minimal tombstone
   -> optional final identity expiry under documented semantics
```

Ordinary active admission still ignores that history domain.

If deleted-history search exists, it must be an explicit history query mode; the ordinary Comments search domain must not accidentally include historical bodies simply because both are stored in one array.

## 8. Minimal tombstone is a first-class state

A crucial implementation detail: current normalization drops rows whose body text is empty.

Therefore a privacy-delete implementation cannot safely do only:

```text
comment.text = ''
```

while keeping the old normalizer.

That would erase the tombstone identity entirely during normalization and could invalidate generation/identity/history invariants.

The normalizer must recognize lifecycle state independently of body presence.

Conceptually:

```text
state = active | deleted
```

or an equivalent invariant derived from `deletedAt` before text validation.

For active comments:

```text
non-empty bounded text is required
```

For deleted minimal tombstones:

```text
text may be absent/empty by design
identity + deletion metadata remains valid
```

## 9. Generation-safe compaction

P1-211 compaction/retention must consume P0-076's exact entry/comment mutation authority.

Unsafe schedule:

```text
1. GC reads old tombstone id X, generation A
2. import/replace or other exact mutation installs newer comment X, generation B
3. old GC wakes late
4. GC finds textual id X only
5. GC redacts/deletes B
```

Required rule:

```text
compaction receipt = exact entry generation + exact comment generation
```

The final write transaction must compare the current exact generation before changing the tombstone.

A stale compaction result becomes a no-op/conflict; it never retargets a same-textual-id replacement.

This remains true if future import policy remaps duplicate ids or if a historical comment id is reused by malformed legacy data.

## 10. Retention/compaction ordering

For research-history mode, deterministic compaction order should be based on stable lifecycle facts, for example:

```text
deletedAt
then stable comment identity/generation tie-breaker
```

Do not use:

- current array position alone;
- transient page ordering;
- wall-clock scan order;
- mutable rendered text;
- imported source order as mutation authority.

If full-history byte pressure is reached, compaction should select a deterministic bounded set and convert old rows to minimal tombstones rather than rejecting all future active comments.

## 11. Structural tombstone bound

Separating active capacity from history capacity does not permit infinite zero-byte tombstones.

There must also be a hard bound for structural deleted records.

When the structural bound is reached, policy must define whether the oldest generation-safe minimal tombstone may be discarded entirely.

That final expiry is semantically different from body compaction:

```text
full deleted history -> minimal tombstone
```

preserves deletion identity/history.

```text
minimal tombstone -> no record
```

forgets even local deleted-history identity.

The second transition therefore needs explicit product/history semantics and must not be smuggled in as ordinary quota cleanup.

P1-211 requires the lifecycle to be bounded; P1-202 decides what historical promise the product makes.

## 12. Active admission contract

`Add Comment` should be admitted using the active projection only.

Conceptually:

```text
active = comments where deletedAt <= 0

activeCount = active.length
activeChars = sum(active.text.length)
```

Then apply active limits.

The same separation applies to Edit:

```text
edit target must be active exact generation
prospective active text budget uses active domain
history domain is checked/compacted independently
```

Do not count a full history body twice because it happens to share a physical record structure with active comments.

## 13. Delete mutation contract

Delete should perform, in one exact mutation authority domain:

1. verify expected entry/comment generation;
2. establish deleted state;
3. apply selected P1-202 body semantics;
4. update active/history accounting;
5. perform or schedule bounded compaction if history exceeds policy;
6. advance Journal/entry revision;
7. notify views/search/index users.

Under privacy-delete, step 3 redacts body immediately.

Under research-history, step 3 classifies body as retained history, not active text.

## 14. Search contract

### 14.1 Ordinary search

Ordinary `Comments` search should operate on the active projection.

It must not accidentally match deleted bodies because a helper loops over every raw `journalComments[]` element.

### 14.2 Deleted-history search

If research-history mode later exposes search of deleted history, that must be explicit:

```text
search scope = active-comments | deleted-history
```

and supported only when the selected P1-202 semantics actually retains bodies.

### 14.3 Derived index invalidation

Any future/current derived search/index representation must be invalidated or rebuilt after:

- delete;
- body redaction;
- tombstone compaction;
- policy migration;
- import/restore.

A stale index retaining a removed secret marker would violate the selected lifecycle even if IndexedDB storage is correct.

## 15. Journal UI contract

UI must render the state the lifecycle actually stores.

Privacy-delete:

```text
Deleted · timestamp
```

may remain, but no full body can be reconstructed from the current authoritative record.

Research-history:

full historical body may be displayed only under the explicitly disclosed history semantics and only while it is still retained.

After compaction:

```text
Deleted · body expired/compacted
```

or an equivalent truthful state is safer than an empty expandable details block that implies loading failure.

## 16. Export contract

Current raw record spread is not a sufficient lifecycle boundary.

Target export should project each entry through an explicit portable comment serializer.

Conceptually:

```text
projectJournalEntryForPortableExport(entry, commentLifecyclePolicy)
```

rather than:

```text
{ ...entry, journalComments: normalizeJournalComments(entry) }
```

The projection must:

- serialize active comments under active schema;
- serialize deleted rows according to selected lifecycle;
- never export a body that local semantics say has been erased;
- not turn a compact tombstone back into an active comment;
- include enough policy/version information for deterministic restore;
- remain within P0-077 export/restore envelope.

## 17. Yandex backup contract

Because Yandex backup uses the same staged full-Journal export, it must consume exactly the same portable projection.

No separate "backup serializer" may silently reintroduce deleted bodies from raw IndexedDB fields.

Required invariant:

```text
same source revision + same lifecycle policy
  -> file export and Yandex backup agree on deleted-comment representation
```

Remote backup objects created before a later deletion remain historical external copies unless a separate destructive retention/purge policy exists. P1-211 must not claim retroactive purge.

## 18. Import/restore contract

Import must classify portable comments **before destructive Journal replace**.

For every imported deleted row:

1. validate identity/schema bounds;
2. preserve deleted state;
3. determine source lifecycle version/format;
4. migrate to the currently selected local policy deterministically;
5. enforce separate history bounds;
6. never charge deleted body to active admission;
7. never resurrect the row as active because body/metadata shape changed.

### 18.1 Legacy v1 full tombstones under privacy-delete

If the selected policy is privacy-delete, a legacy v1 backup containing:

```text
text + deletedAt
```

must be redacted during normalized staging **before** replacement commit.

Preview and final apply must use the same migration rules.

### 18.2 Legacy v1 full tombstones under research-history

If the selected policy is research-history, imported full bodies may be retained only within the current bounded history policy.

Overflow must follow a deterministic migration rule:

- compact oldest bodies to minimal tombstones; or
- fail before replace with an exact compatibility/capacity diagnostic.

Partial arbitrary truncation after Journal replacement is not acceptable.

### 18.3 Policy mismatch is explicit

Portable metadata should distinguish at least:

```text
comment lifecycle policy version
body-retention mode/semantics
```

The exact schema shape/version is an implementation decision coordinated with P0-077. P1-211 requires that the information necessary for deterministic migration not be guessed from accidental field presence forever.

## 19. Portable capacity accounting

A useful portable receipt can expose bounded non-sensitive counts such as:

```text
activeCommentCount
activeCommentChars
tombstoneCount
retainedDeletedBodyCount
retainedDeletedBodyChars
commentLifecyclePolicyVersion
```

These values are not mutation authority; they are validation/diagnostic receipts.

Import should recompute them from normalized content rather than trusting unverified backup counters.

The key invariant is:

```text
portable deleted history may consume history capacity
but cannot silently consume active capacity
```

## 20. Storage-pressure behavior

Storage pressure must not create a privacy or resurrection bug.

Safe ordering is policy-dependent but conceptually:

1. remove/release non-authoritative temporary resources under their own owners;
2. compact eligible retained deleted bodies to minimal tombstones;
3. expire old minimal tombstones only when the selected historical contract allows it;
4. never change active comments merely to reclaim tombstone history capacity;
5. never reinterpret deleted rows as active to save metadata.

Maintenance work must be bounded per pass and resumable across MV3 worker restarts.

## 21. Maintenance progress and fairness

A tombstone GC pass should use bounded cursor/batch work rather than scan the entire Journal synchronously on every comment mutation.

Possible triggers:

- delete admission can perform cheap local compaction for the current entry;
- import staging performs deterministic per-entry normalization;
- periodic maintenance can process bounded batches of old tombstones;
- storage-pressure maintenance may accelerate compaction.

Any cross-entry maintenance cursor needs durable/bounded progress if completion across MV3 restarts matters. Do not create a new unbounded in-memory queue merely to fix an old unbounded data lifecycle.

## 22. Privacy and defensive-security boundary

This research remains defensive architecture/data-integrity/privacy work.

Deleted comment body can contain arbitrary user-authored sensitive text.

Therefore:

- no full deleted body should be added to diagnostics/OperationLog merely to prove compaction;
- validation errors identify entry/comment class/id only when safe, not whole text;
- history counters are preferable to body logging;
- policy migration should avoid copying deleted body into additional temporary stores unless required for atomic import staging;
- temporary staging that must contain legacy bodies remains under P1-215/P0-077 bounded lifecycle and must be discarded according to its owner.

## 23. OperationLog is not a deleted-comment archive

P1-211 must not solve retention by moving deleted text from Journal into OperationLog.

OperationLog has a different diagnostic lifecycle and privacy contract.

If an audit event is needed, record bounded metadata such as:

```text
comment deleted
body redacted/retained-policy class
comment identity receipt
```

not the deleted body itself.

## 24. Duplicate-id / import identity boundary

Historical evidence shows imported duplicate comment ids can create ambiguous targeting. That is a separate import identity/CAS owner.

P1-211 must compose safely with its fix:

- tombstone compaction must preserve/remap exact identity according to import policy;
- compacting one duplicate must never make another duplicate become its accidental target;
- migration cannot manufacture duplicate identities while converting legacy tombstones;
- a P1-211 lifecycle implementation is not a substitute for unique imported comment identity.

## 25. Clear/import generation boundary

Clear/import can replace the entire Journal generation.

A tombstone maintenance task admitted under old Journal generation A must not compact/delete a row in replacement generation B simply because the entry/comment textual ids match.

Required final-write authority therefore includes the relevant Journal/entry/comment generation receipt from P0-076.

## 26. Source revision and backup coherence

A background/manual backup already requires a coherent Journal snapshot under separate owners.

P1-211 adds one requirement to that snapshot semantics:

```text
all comments in one exported revision are projected under one exact comment-lifecycle policy version
```

A policy migration racing export cannot produce a document where early entries use privacy-redacted tombstones and later entries expose old full bodies while the manifest claims one undifferentiated version.

The exact solution can be:

- policy version included in source revision/admission receipt;
- migration commits a new Journal revision before export;
- export checks the same policy generation before/after build.

Do not mix policies inside one claimed coherent portable snapshot.

## 27. Policy change migration

If WebClip ever allows changing between privacy-delete and research-history, directionality matters.

### research-history -> privacy-delete

Current retained deleted bodies must be redacted under an exact Journal migration before the UI claims privacy-delete is active.

A setting flip alone is insufficient.

### privacy-delete -> research-history

Previously erased bodies cannot be recreated. Existing minimal tombstones remain bodyless history.

The UI must not imply that enabling history recovers text that was already privacy-deleted.

This one-way information-loss property should have a deterministic model/test.

## 28. Why increasing current limits is not closure

Suppose current raw count limit changes:

```text
500 -> 5000
```

or text limit:

```text
2 MiB -> 20 MiB
```

Repeated add/delete still eventually reaches the new limit with zero live comments.

The defect remains, only later.

P1-211 closure requires:

```text
separate lifecycle + separate capacity + bounded history + portable migration
```

not larger constants.

## 29. Deterministic model in this branch

`project_tools/test_p1_211_comment_tombstone_lifecycle_model.js` models:

1. current delete preserves body and raw capacity;
2. repeated current add/delete exhausts raw admission with zero live comments;
3. current ordinary search matches deleted text;
4. current portable roundtrip preserves capacity debt;
5. privacy-delete body redaction;
6. privacy tombstones do not consume active capacity;
7. research-history body retention with separate active capacity;
8. bounded full-history compaction;
9. ordinary search excludes deleted history;
10. privacy export does not carry a deleted secret marker;
11. research-history export carries explicit policy/version and bounded history;
12. legacy full tombstone privacy migration;
13. legacy full tombstone research-history bounded migration;
14. roundtrip preserves deleted state without active debt;
15. stale generation compaction cannot redact same-id replacement;
16. exact current tombstone generation may compact;
17. true active growth remains bounded;
18. separate history limits do not justify weakening active limits;
19. portability preserves active-vs-deleted state;
20. policy migration never resurrects deleted rows.

Model constants are illustrative only.

## 30. Required source-bound gate

A future implementation source gate should prove at least:

### Positive/current controls preserved

- `deletedAt` remains represented or an explicit equivalent lifecycle state exists;
- active comments remain bounded individually and in aggregate;
- import remains bounded;
- export remains bounded and revision coherent;
- deleted comments remain non-editable unless an explicit undelete feature is separately designed.

### New P1-211 requirements

- active count/text accounting excludes deleted history;
- a separate tombstone/history bound exists;
- a minimal tombstone is valid without requiring non-empty body text;
- delete applies selected P1-202 body policy;
- tombstone compaction exists and is generation-safe;
- ordinary comment search does not blindly scan deleted body text;
- export uses an explicit portable comment projection rather than raw record spread as lifecycle authority;
- Yandex backup consumes that same projection;
- import migrates legacy tombstones through the same policy;
- policy/version is represented for deterministic portability;
- no deleted body is copied into OperationLog as a workaround;
- structural tombstone growth is bounded;
- no fix consists only of increasing existing limits.

The gate is expected RED against current `main`.

## 31. Physical/real-product acceptance matrix

P1-211 must not be closed from architecture/model/source-gate evidence alone.

A runtime implementation should be tested in unpacked Chrome with exact source revision and at least these cases.

### Active capacity

1. Add and keep active comments until the intended active count limit; next Add is rejected truthfully.
2. Add/delete substantially more comments than the active count limit; after compaction there are zero/few live comments and a new small active comment is still admitted.
3. Add/delete large bodies repeatedly; deleted history does not consume active aggregate text budget.
4. Editing one live comment is not rejected merely because retained tombstone history is large.

### Privacy-delete mode, if selected

5. Create a comment containing a unique secret marker; delete it.
6. Marker is absent from ordinary Journal UI after deletion.
7. Marker is absent from ordinary Comments search.
8. Post-delete file export does not contain the marker.
9. Post-delete Yandex backup does not contain the marker.
10. Restore that post-delete backup and verify the marker is not restored.
11. A historical backup created before deletion is not falsely reported as purged.

### Research-history mode, if selected

12. Delete body remains available only in explicitly disclosed history UI/search.
13. Exceed full-history count/byte/age policy and verify deterministic oldest-body compaction.
14. Compacted tombstone still cannot become active/editable.
15. Active admission remains available after full-history pressure.

### Portable migration

16. Import legacy v1 full tombstones under selected policy.
17. Preview and final commit report the same normalized counts/policy outcome.
18. Overflow migration is deterministic and all-or-nothing.
19. Export restored Journal again and verify no tombstone resurrection/capacity-domain drift.
20. Restore the same backup on another clean profile and obtain the same normalized lifecycle state.

### Generation races

21. Start tombstone compaction for generation A; replace/import same textual entry/comment id as generation B; late A compaction must not touch B.
22. Edit vs Delete race linearizes under P0-076; losing Edit never restores deleted body.
23. Clear/import during tombstone maintenance invalidates old maintenance authority.
24. Policy migration racing export does not create mixed-policy backup.

### Bounded maintenance

25. Large Journal with many tombstones processes maintenance in bounded batches.
26. MV3 worker restart between batches resumes or safely restarts bounded maintenance without duplicating/resurrecting history.
27. Storage pressure can compact eligible history without deleting live comments.

### Search/index

28. Delete/compaction invalidates any derived comments search state.
29. A unique deleted marker does not remain matchable through stale index after privacy redaction.
30. Research-history explicit search mode, if present, stops matching body after body compaction.

## 32. Implementation order

Recommended implementation sequence after P1-202 semantics are explicitly selected:

1. introduce explicit comment lifecycle helpers and active/history projections;
2. make minimal tombstones normalize correctly;
3. split active and history capacity accounting;
4. update Add/Edit/Delete transaction logic under P0-076 exact authority;
5. update ordinary search projection;
6. add bounded generation-safe compaction;
7. add explicit portable projection + policy/version receipt;
8. update file export and confirm Yandex backup uses the same serializer;
9. migrate import preview/staging/final apply under one deterministic rule;
10. add source/model/runtime regressions;
11. run unpacked Chrome migration/backup/restore tests;
12. only then consider Registry closure.

This order prevents a UI-only privacy claim from preceding storage/export migration and prevents a quota-only fix from preceding portable semantics.

## 33. Release interpretation

This branch is **research evidence**, not product closure.

No statement in this document means:

- P1-211 is DONE;
- P1-202 is resolved;
- production Delete semantics have changed;
- existing remote backups were purged;
- import schema compatibility has been physically proven;
- real Chrome/Yandex E2E has passed;
- release is ready.

The product remains governed by current `main` until a separately reviewed runtime implementation is merged and physically validated.

## 34. Final architecture invariant

The minimal P1-211 invariant is:

```text
DELETE STATE IS HISTORY, NOT ACTIVE CAPACITY.

active comment admission
    != raw journalComments array length

active comment text budget
    != sum of retained deleted bodies

retained deleted history
    has its own explicit bounded lifecycle

portable export/import
    preserves the same lifecycle semantics
    without resurrecting deleted content
    and without carrying active capacity debt forever
```

P1-202 decides **what deleted body retention means**.

P1-211 ensures that whichever meaning is selected is **bounded, portable, searchable/exportable consistently, and cannot permanently disable active comment use**.
