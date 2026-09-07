# P1-202 — Deleted-comment retention/privacy semantics

Date: 2026-09-07

Status: research / architecture evidence only. Registry owner remains ACTIVE.

Canonical baseline inspected: `main@d4f5b268fa3f7ced5a7bc68da52784863d614138`.

This research does **not** modify production runtime, `manifest.json`, release state, or `RESEARCH_REGISTRY.md`.

## 1. Owner question

P1-202 owns one narrow product/privacy truth problem:

> Deleted-comment retention/privacy semantics must explicitly govern retained text, redisclosure and lifecycle.

Keep adjacent owners distinct:

- **P1-211** — tombstone retention duration, bounded count/bytes, compaction/GC and portable capacity debt;
- **P0-076** — exact Journal/comment mutation generation/CAS;
- **P1-186** — imported comment-id uniqueness;
- **P1-206** — exact composed Journal-view source revision;
- **P1-207** — exact Journal revision protected by backup success;
- **P1-225** — local draft typed after Save admission must not be lost.

P1-202 decides what the user-facing action **Delete** means for the original user-authored body and where that body may be observable or portable after deletion. It does not decide how long a bodyless tombstone is retained.

## 2. Current source representation

Current `service-worker.js` normalizes comments approximately as:

```text
{
  id,
  text,
  createdAt,
  updatedAt,
  deletedAt
}
```

`normalizeJournalComments()` preserves `text` regardless of `deletedAt`.

Current `deleteJournalComment()` performs a soft tombstone mutation:

```text
comments[index] = {
  ...comments[index],
  deletedAt: Date.now()
}
```

The body is not redacted or removed. Therefore a successful Delete currently leaves the complete body in the authoritative current Journal record.

## 3. Current UI is semantically contradictory

The Journal UI confirms deletion with wording equivalent to:

```text
Пометить этот комментарий как удалённый?
После этого его нельзя будет редактировать или восстановить.
```

Yet the deleted branch deliberately renders an expandable `<details>` item and writes `comment.text` into `journal-comment-deleted-text`.

Therefore the current product is neither:

- a privacy-delete model where the body is actually removed from current truth; nor
- an explicitly disclosed historical-retention model where Delete means keeping the body as historical data.

The UI says the comment cannot be restored but still exposes the verbatim body in ordinary current Journal UI.

## 4. Ordinary search rediscloses deleted text

`journal-text-filter.js` checks every comment body in `commentsContain()` without examining `deletedAt`.

Conceptually:

```text
for each journalComments[] item:
    contains(item.text, needle)
```

Thus a unique marker appearing only in a deleted comment still causes an ordinary Journal comment-text filter to match the entry.

Hiding the deleted body only in the card UI would not close P1-202.

## 5. Full export and backup preserve deleted text

`readJournalEntryBatch()` serializes:

```text
JSON.stringify({
  ...entry,
  journalComments: normalizeJournalComments(entry)
})
```

Because current normalization preserves deleted bodies, a full Journal export produced after deletion can contain the deleted text.

The staged full-Journal representation feeds file export and Journal backup flows. Therefore future backups made from the post-delete current revision can redisclose the body as well.

## 6. Import preserves the same full-text tombstone

`sanitizeImportedComments()` accepts and reconstructs:

```text
id
text
createdAt
updatedAt
deletedAt
```

and then applies `normalizeJournalComments()`.

Current roundtrip therefore behaves as:

```text
Delete
→ full-text tombstone
→ export/backup
→ import/restore
→ full-text tombstone again
```

The row does not become editable/live automatically, which is a positive identity property, but the body remains portable current data.

## 7. Capacity behavior is evidence, but owned separately

`assertJournalCommentBudget()` counts text from all comment objects, including deleted ones.

That portable capacity debt is owned by P1-211. For P1-202 it is additional evidence that deleted text remains authoritative data.

Do not “fix” P1-202 only by excluding deleted text from quota while still retaining/searching/exporting it.

## 8. Two historically coherent product models

The consolidated comment-family evidence identified two internally coherent choices.

### A. Privacy-delete

Delete removes/redacts the user-authored body from current authoritative Journal state. A minimal non-sensitive tombstone may remain for identity/lifecycle needs.

Consequences:

- ordinary UI cannot display old body;
- ordinary search cannot match old body;
- future post-delete export/backup cannot contain old body;
- later import of those post-delete artifacts cannot restore body;
- legacy full-text tombstones are normalized/redacted before becoming current.

### B. Intentional research-history

Delete means removing active editability while intentionally retaining verbatim historical body.

Then the product must disclose this before mutation and define explicit search/export/backup/history-retention semantics.

The current hybrid behavior is not truthful enough for either model.

## 9. Recommended decision: privacy-delete

For the current WebClip action named **Delete**, the recommended canonical semantic is **privacy-delete**.

Reasons:

1. the current confirmation describes a non-restorable operation;
2. ordinary Journal is a user productivity store, not an immutable compliance archive;
3. there is no separate user-selected “retain deleted comment history” feature;
4. full-text tombstones create unnecessary redisclosure through UI/search/export/backup/import;
5. P1-211 can retain a bounded bodyless tombstone where identity/history requires it.

A future explicit archive/history mode can be added separately; it should not be implicit behavior of Delete.

## 10. Target tombstone

Under privacy-delete, a current deleted comment should normalize to an object equivalent to:

```text
DeletedCommentTombstone {
  id,
  createdAt,
  updatedAt,
  deletedAt,
  deletionVersion
}
```

The exact schema may include additional non-sensitive generation/version metadata needed by P0-076/P1-211.

It must not contain ordinary body derivatives such as:

```text
text
comment
body
preview
excerpt
searchText
normalizedText
```

P1-202 does not require a hash of the deleted body. A digest should not be retained unless a separate technical requirement proves it necessary.

## 11. Winning Delete mutation

The exact winning delete should atomically transform:

```text
{id, text, createdAt, updatedAt, deletedAt: 0}
```

to:

```text
{id, createdAt, updatedAt, deletedAt, deletionVersion}
```

Do not implement privacy-delete as only `text = ''` while another authoritative copy retains the original body.

Legacy `journalComment`, derived search material, export staging and any future comment cache must follow the same semantic boundary.

## 12. Concurrency remains P0-076

Privacy-delete does not replace mutation fencing.

Failure schedule:

```text
Edit A reads body M
Delete B wins and erases M
late Edit A blindly commits stale array
→ M resurrects
```

P0-076 must reject/serialize the stale mutation by exact entry/comment generation/CAS.

Conversely, an old Delete must not redact a newer replacement/imported comment generation with a reused textual id.

P1-202 owns body semantics of the winning delete; P0-076 owns which generation is allowed to win.

## 13. UI contract

Ordinary current Journal UI should render deleted comments as bodyless metadata, for example:

```text
Комментарий удалён · <date>
```

No expand/copy/search path should reveal the old body.

User confirmation should match the implemented guarantee. A truthful shape is:

```text
Удалить комментарий? Текст будет удалён из текущего журнала и не попадёт
в будущие экспорты и резервные копии. Уже созданные ранее резервные копии
этим действием не изменяются.
```

Exact UX wording may be refined later; the data guarantee must stay accurate.

## 14. Search contract

Ordinary comment search must fail closed on semantic deletion state:

```text
if deletedAt > 0:
    do not inspect body
```

This rule must apply even to legacy rows that physically still contain `text` before compaction.

Therefore privacy becomes effective at the query boundary without requiring a giant synchronous migration first.

## 15. Read/view contract

All ordinary read surfaces must publish bodyless tombstones:

- current/site/all Journal views;
- direct IDB page reads;
- worker fallback reads;
- batched get-many;
- URL group reads;
- detail card reads.

`journal.js` directly opens `WebClipJournal`, so worker-only response sanitization is insufficient. Page-side normalization must apply the same privacy rule until there is one shared canonical schema normalizer.

## 16. Export contract

A full export created after successful Delete must not contain the erased marker.

Regression proof should use a unique body marker `P1-202-SECRET-<nonce>` and assert the raw exported UTF-8/JSON bytes do not contain it.

Export must normalize legacy full-text tombstones before serialization, not simply serialize raw IDB rows.

## 17. Yandex backup contract

A Yandex Journal backup created from a revision after deletion must satisfy the same bodyless contract as local full export.

Important distinction:

```text
backup created after delete commit
→ must not contain erased body

backup created before delete commit
→ remains historical external state unless a separate purge deletes/rewrites it
```

P1-207 separately owns which exact Journal source revision a completed backup protects.

## 18. Import contract

Older backup files can contain historical full-text tombstones.

Under privacy-delete, importing:

```text
{ id, text: M, deletedAt: T }
```

must normalize before current commit to a bodyless tombstone:

```text
{ id, createdAt, updatedAt, deletedAt: T, deletionVersion }
```

Import preview/diagnostics also should not redisclose the old body unless a separately approved migration diagnostic truly requires it.

## 19. Historical backup boundary

A current delete cannot retroactively rewrite arbitrary previously exported files or remote backups.

The precise promise is:

```text
successful Delete removes the body from current Journal
and from exports/backups generated from later current revisions
```

It does **not** mean:

```text
all older files/backups everywhere were destroyed
```

A future “purge historical backups” feature would be a separate destructive remote-data workflow with its own identity, confirmation, settlement and reconciliation requirements.

## 20. Derived indexes/caches

If a future search index/cache stores comment bodies, privacy-delete requires either:

- synchronous exact deletion with the comment transaction; or
- a dirty marker + fail-closed query behavior until repair completes.

Current filtering scans Journal rows directly, but the architecture invariant should not depend on that implementation detail.

## 21. OperationLog and diagnostics

Deletion diagnostics should retain non-sensitive metadata only, e.g.:

```text
entryId
commentId
deletedAt
result/status
```

Do not copy the deleted body, preview, excerpt or mutation payload into OperationLog.

Otherwise a different retention/export surface would undermine Journal privacy-delete.

## 22. Transient/external copies

Privacy-delete governs current authoritative WebClip storage and later WebClip redisclosure.

It cannot erase text that the user already copied to the OS clipboard, pasted into another application, or exported/backed up before deletion.

The product must not claim otherwise.

## 23. P1-211 boundary

P1-202 intentionally does not define:

- tombstone TTL;
- maximum tombstone count;
- tombstone byte budget;
- compaction/GC cadence;
- active-vs-history capacity accounting;
- portable capacity debt migration.

Those are P1-211.

The only P1-202 constraint on P1-211 is that any retained tombstone under privacy-delete remains bodyless/non-sensitive.

## 24. Legacy migration

Existing installations may contain full-text tombstones.

A safe rollout can be lazy:

1. all current read/search/export/import paths immediately treat `deletedAt > 0` as bodyless;
2. background/mutation-time compaction may physically rewrite old rows later;
3. until rewrite, persisted deleted body is legacy privacy debt and must not be redisclosed by current surfaces;
4. physical compaction remains generation-safe under P0-076/P1-211.

## 25. Deleted is not active-empty

The current product rejects empty active comments. Preserve the distinction:

```text
active comment → non-empty body required
bodyless deleted tombstone → deletedAt > 0
```

Do not encode deletion only as an empty active body without explicit deletion state.

## 26. Portable schema/version

Same-version export/import transports `journalComments`, so privacy-delete should be version-explicit through a tombstone/schema version such as `deletionVersion: 1` or equivalent.

P1-211 owns long-term compaction/version lifecycle. P1-202 requires that import never interprets a deleted legacy body as live/current content.

## 27. Defensive privacy boundary

This is defensive privacy/data-lifecycle analysis only.

Core invariant:

> After a current comment deletion successfully commits under privacy-delete, WebClip must not intentionally redisclose the erased body through ordinary current UI, search, future export/backup, import/restore or diagnostics.

## 28. Deterministic model

`project_tools/test_p1_202_deleted_comment_privacy_semantics_model.js` covers:

1. current-shaped soft tombstone preserves body;
2. privacy-delete removes body;
3. deleted marker cannot match ordinary search;
4. live comments remain searchable;
5. post-delete export is bodyless;
6. export/import roundtrip cannot resurrect body;
7. legacy full-text tombstone import is redacted;
8. minimal tombstone preserves identity/timestamps;
9. repeated delete is idempotent;
10. pre-delete backup is outside active purge guarantee;
11. P1-211 retention remains separate;
12. stale edit resurrection remains P0-076 territory;
13. audit metadata does not duplicate body;
14. bodyless deleted UI remains possible.

Model PASS is research evidence only, not production PASS.

## 29. Source-bound RED gate

`project_tools/test_p1_202_deleted_comment_privacy_semantics_source.js` requires future source evidence for:

- explicit privacy-delete/redaction contract;
- body redaction in `deleteJournalComment()`;
- bodyless deleted normalization in worker and Journal page;
- no deleted-body rendering in ordinary UI;
- ordinary search exclusion;
- privacy-normalized export;
- import redaction of legacy deleted bodies;
- explicit pre-delete historical-backup boundary;
- no derivative body copy in tombstone/audit metadata;
- preserved separation from P1-211.

Current production source is expected RED.

## 30. Recommended implementation sequence

1. record privacy-delete in canonical product/architecture documentation;
2. define one shared deleted-comment normalizer/schema;
3. change winning Delete to remove body atomically;
4. bodyless-normalize every worker read;
5. apply the same rule to direct-IDB `journal.js` reads and rendering;
6. skip deleted bodies in text filter, including legacy rows;
7. privacy-normalize export;
8. redact deleted legacy bodies during import before staging/current commit;
9. verify diagnostics never capture body;
10. add migration/compaction hooks with P1-211/P0-076;
11. run deterministic model/source gates;
12. run real unpacked Chrome UI/search/export/import tests;
13. run Yandex backup/restore with unique marker;
14. only then consider closing P1-202.

## 31. Required physical evidence before closure

At minimum real unpacked Chrome must prove:

1. create comment with unique marker M;
2. M is visible/searchable before deletion;
3. confirmation accurately describes semantics;
4. after delete, card shows tombstone metadata but not M;
5. ordinary comment search for M gives no match;
6. reload/reopen cannot show/search M;
7. full file export bytes do not contain M;
8. Yandex backup made after deletion does not contain M;
9. import of post-delete export/backup cannot restore M;
10. import of legacy `{deletedAt>0,text:M}` becomes a bodyless tombstone;
11. a pre-delete backup fixture still contains M and UI/docs do not falsely claim it was purged;
12. stale old Edit cannot restore M after winning Delete under P0-076;
13. repeated delete is idempotent;
14. live comments remain unaffected;
15. P1-211 retention/compaction tests remain separate.

## 32. Closure rule

P1-202 remains ACTIVE until:

- product semantics explicitly choose privacy-delete or an equivalently truthful alternative;
- runtime implements that semantic consistently across mutation/read/UI/search/export/backup/import;
- legacy full-text tombstones cannot be redisclosed as current data;
- deterministic gates pass against exact production source;
- real Chrome evidence proves the deleted unique marker disappears from every post-delete current surface;
- no claim is made that pre-delete historical backups were retroactively erased unless a separate purge proves it.

## 33. Current conclusion

On `main@d4f5b268fa3f7ced5a7bc68da52784863d614138`, P1-202 is confirmed and unsatisfied.

Current implementation uses a full-text soft tombstone and rediscloses the body through deleted-comment UI, ordinary comment search, full Journal export/backup and import roundtrip.

Recommended architecture: **privacy-delete with a bodyless minimal tombstone**. P1-211 remains the separate owner of how long/how many such tombstones are retained and how capacity/compaction works.

No production or release state is changed by this research checkpoint.
