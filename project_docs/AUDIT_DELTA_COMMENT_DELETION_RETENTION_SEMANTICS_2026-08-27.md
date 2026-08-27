# Audit delta — Journal comment deletion retention semantics — 2026-08-27

Source-of-truth `main` immediately before this write: `a98f746eae4cae76a4d2c1670bf436a8b4124463`.

Docs-only audit checkpoint. Production runtime, tests, configuration and `manifest.json` are unchanged. Canonical large-table synchronization is not claimed by this file.

## New confirmed item: P1-202 — deleting a Journal comment retains and rediscloses its text without an explicit retention contract

**Classification:** P1 / evidence-reserved / confirmed by fresh runtime audit.

Repository-wide semantic duplicate-check was performed against the canonical priorities/deep-audit material and current late audit deltas. Existing `P1-174` mentions deleted comment text only as a heavy-rendering/memory contributor; it does not define the user-visible deletion/privacy semantics. Existing `P1-186` concerns duplicate imported comment IDs. Neither owns this root cause.

The new invariant is user-action semantics: an action presented as deleting a comment must either actually remove/redact the comment body from future ordinary use/export, or explicitly disclose that it is only a historical tombstone operation whose text remains retained/searchable/backed up.

## Fresh source proof

### 1. UI presents a destructive delete action

For every live Journal comment, `journal.js` exposes a button labelled:

`Удалить`

The confirmation says:

`Пометить этот комментарий как удалённый? После этого его нельзя будет редактировать или восстановить.`

After worker success the status says:

`Комментарий помечен как удалённый.`

The wording distinguishes a tombstone internally, but from the ordinary user perspective the action is still named Delete and says the comment cannot be restored. It does not disclose that the original body will remain readable, searchable and included in future exports/backups.

### 2. Worker keeps the full body

`deleteJournalComment(id, commentId)` reads the current normalized comments, finds the exact ID and replaces only:

`deletedAt`

with `Date.now()`.

The existing `text`, `createdAt`, `updatedAt` and ID remain unchanged. The updated full `journalComments` array is written back into the Journal entry.

Therefore deletion currently means metadata tombstoning, not deletion or redaction of the user-authored body.

### 3. Deleted text remains visibly rendered in Journal

`buildJournalComments()` has a dedicated branch for `deletedAt > 0`.

It creates a badge `Удалён`, but also creates a text node and assigns:

`text.textContent = comment.text`.

Thus the text is not merely retained for hidden audit history. It remains directly readable in the ordinary Journal UI after the user chose Delete.

### 4. Universal comment search still matches deleted bodies

`journal-text-filter.js::commentsContain(entry, needle)` iterates every `entry.journalComments` item and searches:

`item?.text ?? item?.comment ?? ''`

without inspecting `deletedAt`.

Therefore a deleted comment can continue to make an entry match the `Комментарии` filter. The product presents the deleted text as live searchable content even though it is no longer editable/restorable.

### 5. Full Journal export preserves deleted bodies

The chunked export path serializes each Journal entry as:

`JSON.stringify({ ...entry, journalComments: normalizeJournalComments(entry) })`.

`normalizeJournalComments()` preserves both `text` and `deletedAt` for tombstoned comments.

Consequently every later full JSON export still contains the deleted body.

Because Yandex Journal backup is built from the same full staged export representation, future backups can continue copying that body to Yandex Disk after the user deleted the comment locally.

Import likewise accepts/preserves `text + deletedAt`, so a deleted comment body survives export/import round trips.

### 6. Deleted bodies also consume the live comment quota indefinitely

`addJournalComment()` first calls `normalizeJournalComments(current)` and then applies both live admission checks to that complete array:

- `comments.length >= MAX_IMPORTED_COMMENTS_PER_ENTRY`;
- `assertJournalCommentBudget([...comments, { text }])`.

Neither check excludes `deletedAt > 0` comments. Because delete preserves every tombstoned body, a deleted comment continues consuming both:

- one slot in the per-entry comment-count limit;
- its complete text length in the aggregate comment-text budget.

This makes the semantic mismatch operational, not merely archival. A user can repeatedly add and delete comments and eventually be unable to add a new comment to the entry even though the UI describes the old comments as deleted and non-restorable.

Under the preferred privacy-delete model, a minimal tombstone may intentionally consume a bounded identity slot if the product needs stable history, but erased body text must not keep consuming the live text quota. The count policy must also be explicit: either deleted tombstones have a separate bounded history cap/GC policy, or ordinary active-comment capacity must not be permanently exhausted by tombstones.

Under an intentional audit-history model, retaining deleted bodies/count slots is still possible, but the UI and limits must disclose that archived history consumes storage/capacity and provide a bounded history policy so a finite sequence of deletes cannot permanently disable future commenting.

### 7. Existing backup versions are a separate retention question

Even if future runtime is changed to redact a deleted body in the active Journal, historical backup files that were already created may still contain earlier comment text. P1-202 must not falsely promise retroactive erasure from immutable/previous backup versions unless the product explicitly implements such a remote destructive policy.

This distinction must be communicated accurately:

- active/current Journal deletion semantics;
- future exports/backups after deletion;
- already existing historical backup versions.

No automatic deletion of historical backup files is proposed by this audit finding.

## Why P1 rather than P0

The source proves misleading retention/privacy semantics, but not an untrusted-context exfiltration or immediate confidentiality-boundary bypass:

- Journal is extension-owned storage/UI;
- Yandex backup is an explicitly configured user destination;
- no hostile page gains this data through the comment delete path itself.

However comments may contain user-authored sensitive notes, and the current Delete action can leave those notes visible/searchable and copied into future backups contrary to ordinary deletion expectations. This is significant correctness/privacy UX and therefore P1.

If later evidence demonstrates that a hostile/untrusted context can access retained deleted text, that separate trust-boundary exposure should be classified under the relevant P0 confidentiality item rather than inflating P1-202.

## Required product decision / P1-202 contract

Choose one explicit semantic model. Do not retain the current ambiguous hybrid.

### Preferred privacy-delete model

Delete keeps only a minimal tombstone needed for stable comment/history identity, for example:

- comment ID;
- created/updated timestamps if genuinely needed;
- `deletedAt`;
- optionally a fixed non-sensitive deletion marker.

The user-authored `text` is removed/redacted from the active Journal record in the same generation-fenced/CAS mutation required by P0-076.

Under this model:

- ordinary Journal UI shows only `Удалён` + non-sensitive metadata;
- text filter cannot match the old body;
- future full exports/Yandex backups do not contain the old body;
- re-import cannot restore the body from a post-delete export;
- erased body text no longer consumes the live aggregate comment-text quota;
- deleted tombstone count has an explicit bounded history/GC policy and cannot permanently exhaust ordinary active-comment capacity;
- historical backups created before deletion are explicitly outside this active-record guarantee unless a separate user-selected purge feature exists.

A tombstone can therefore preserve identity without preserving content.

### Acceptable audit-history model

If product intentionally wants immutable comment history including deleted bodies, that is a materially different feature and must be explicit before confirmation.

At minimum:

- rename/reword the action so it does not imply content erasure;
- confirmation must state that the original text remains stored and may remain searchable/exported/backed up;
- ordinary UI should distinguish historical retained text from active comment content;
- search behavior must be deliberate (for example an explicit include-deleted-history option), not accidental because every comment is scanned;
- export schema/documentation must state that tombstoned bodies are retained;
- retained-history count/text capacity and bounded GC/retention must be explicit so history cannot silently make the entry unable to accept future comments;
- privacy-sensitive purge, if offered, must be a distinct irreversible action with accurate historical-backup limitations.

Do not describe a retained body as unrecoverable while simultaneously rendering it verbatim.

## Generation/concurrency composition

P1-202 must compose with existing **P0-076**.

Current comment mutations use stale read -> separate update and therefore already need Journal generation/per-entry revision fencing. When deletion is changed to redact body or set history state:

- exact comment ID + expected entry revision + Journal generation must be atomically checked;
- a late delete cannot redact a replacement/imported comment that reused the same textual IDs;
- duplicate imported comment IDs remain P1-186 and must be resolved independently;
- a concurrent edit and delete must linearize predictably: once a delete generation wins, a late edit cannot restore the old text.

## Search/export composition

- **P1-174**: lazy rendering must not accidentally reintroduce deleted body retrieval under privacy-delete semantics.
- **P1-009**: universal filter/indexing must follow the chosen deleted-content policy; an optimized search index cannot retain stale deleted text after active-record redaction.
- **P0-010/P0-012**: full export/backup fidelity means faithfully exporting the chosen current Journal state, not resurrecting pre-delete content from a cache/index.
- **P0-050/P0-026/P1-057**: derived stats/search repair must not treat deletion tombstone content as live data if privacy-delete is chosen.
- **P0-055**: comment-count/text budgets remain hard safety boundaries, but their active-vs-deleted accounting must match the chosen P1-202 retention semantics.

## Required deterministic/browser regressions

1. Create comment with unique secret marker, Delete it, reload Journal: under privacy-delete the marker is no longer rendered anywhere in the active comment card.
2. Search `Комментарии` for the unique marker after deletion: no match under privacy-delete.
3. Full JSON export after deletion contains the tombstone identity/state but not the old marker under privacy-delete.
4. Yandex backup staged/exported after deletion likewise does not contain the old marker under privacy-delete.
5. Export -> import round trip after deletion does not restore the body.
6. Existing pre-delete historical backup is not falsely claimed to be erased; UI/docs accurately distinguish that retained historical version.
7. Concurrent edit A vs delete B: exactly one generation wins; a late edit cannot repopulate a redacted tombstone.
8. Clear/import replacement during delete composes with P0-076 and cannot redact a replacement entry/comment from an obsolete operation generation.
9. Duplicate imported comment IDs remain fail-closed/collision-safe per P1-186.
10. If audit-history model is intentionally selected instead, UI confirmation explicitly states retained/searchable/exported backup semantics and deterministic tests verify that disclosure text is present before the mutation.
11. Search/index rebuild after delete cannot continue matching body text from a stale derived index under privacy-delete.
12. Journal card lazy-loading work from P1-174 cannot fetch/display an erased body from an old cached summary after a deletion generation commits.
13. Fill an entry near the aggregate text budget, delete a large comment, then add a new comment: privacy-delete frees the erased body's text budget and the new comment is admitted when otherwise valid.
14. Repeated add/delete cycles cannot permanently exhaust active-comment capacity solely through invisible/non-restorable tombstones; chosen tombstone count/history policy is deterministically bounded.
15. Import of legacy tombstones containing retained text follows an explicit migration policy: either preserve them as disclosed audit history or redact their bodies when upgrading to privacy-delete, without silently changing semantics per opener/context.

## Duplicate check / numbering

- New evidence-reserved **P1-202** assigned.
- **P1-174** remains heavy Journal-card materialization/performance; it incidentally observed deleted text but does not own deletion semantics.
- **P1-186** remains imported duplicate comment identity.
- **P0-076** remains Journal generation/CAS fencing for concurrent mutations.
- **P0-055/P1-176** remain comment size/pre-IPC bounds.
- No new P0 or P2 number is created.

Canonical `PRIORITIES_P0_P1_P2.md` / `DEEP_AUDIT_2026-08-25.md` synchronization remains pending as a separate lossless registry-reconciliation step.

## Test / release state

No runtime/config/manifest change was made. Product tests were not rerun for this docs-only checkpoint. The historical product gate remains **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. No build, tag or Release was created.
