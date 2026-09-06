# P1-186 — imported comment ids must be unique/addressable — 2026-09-07

Status: **ACTIVE / architecture-saturated, runtime gate RED**.

Canonical baseline inspected: `main` = `d4f5b268fa3f7ced5a7bc68da52784863d614138`.

Registry owner: imported Journal comment ids must be unique/addressable within an entry; duplicates require rejection or deterministic collision-safe rewrite.

## 1. Current source proof

The current `sanitizeImportedComments()` bounds count/text/id length, then maps imported comment objects approximately as:

```js
id: boundedImportString(item.id || '', MAX_IMPORTED_COMMENT_ID_CHARS)
```

There is no per-entry uniqueness set before the normalized comment list is committed.

Later edit/delete paths address comments with:

```js
comments.findIndex((item) => item.id === commentId)
```

If two imported comments share the same id, only the first matching item is addressable through that id. The second item remains ambiguous and a UI action cannot identify it uniquely.

## 2. Chosen policy: deterministic rewrite

The Registry allows either rejection or deterministic collision-safe rewrite. This research chooses rewrite to preserve import availability and comment content.

Rules, in original comment order:

1. bound/trim the imported id;
2. if empty, derive a deterministic base such as `comment-<ordinal>`;
3. first unseen base keeps the base id;
4. on collision, append a deterministic suffix (`~2`, `~3`, ...);
5. truncate the base as necessary so `base + suffix` never exceeds the existing maximum id length;
6. if a generated candidate itself collides with a pre-existing imported id, continue incrementing until unseen;
7. never use randomness or `Date.now()` for duplicate repair.

Order is part of the deterministic input, so the same staged import normalized after restart produces exactly the same ids.

## 3. Why not first-match semantics

Keeping duplicates and relying on `findIndex()` is not a stable address model. It causes:

- ambiguous edit/delete targets;
- different behavior if comments reorder;
- inability to round-trip a specific second duplicate;
- possible tombstone/edit application to the wrong logical comment.

Therefore uniqueness must be an invariant of the durable normalized entry, not a UI convenience.

## 4. Missing ids

Missing/empty imported ids are the same addressability problem as duplicates. They should receive deterministic ids under the same helper before commit.

The helper must not manufacture ids from mutable wall-clock time on retry/restart.

## 5. Live comment creation

Live comment creation currently uses `crypto.randomUUID()` with a fallback. The practical collision probability is tiny, but the durable invariant is stronger than probability: before commit, a new live id should still be checked against the entry's current normalized id set and regenerated/re-suffixed if necessary.

This prevents future helper changes from weakening uniqueness.

## 6. Legacy rows

Existing local rows may already contain duplicate ids from older imports.

Defensive read/mutation behavior should not silently keep first-match ambiguity. Acceptable strategies include:

- deterministic normalization on read followed by persistence through a generation-fenced repair;
- fail-closed edit/delete with an explicit repair step;
- deterministic repair when the entry is next safely rewritten.

P0-076 owns the per-entry/Journal-generation CAS for such writes. P1-186 owns only the uniqueness transformation.

## 7. Interaction with timestamps and tombstones

P1-185 owns timestamp canonicalization. P1-186 must deduplicate ids without using attacker-controlled timestamps as uniqueness authority.

Deleted comments remain comments and participate in the same id namespace. A tombstoned id cannot be reused by a later active comment in the same entry.

## 8. Import budget and diagnostics

The existing maximum number of comments and total comment-character budget remain positive controls.

A rewrite counter may be retained in import diagnostics, but there is no need to persist every old duplicate id after normalization.

If product requirements need original ids for forensic display, they must be stored as explicitly historical/unverified metadata and never used as mutation keys.

## 9. Deterministic model

`project_tools/test_p1_186_imported_comment_id_uniqueness_model.js` proves:

- duplicates are rewritten deterministically;
- generated suffixes remain collision-safe even when a similar id already exists;
- missing ids get deterministic values;
- maximum id length remains respected after suffixing;
- every normalized id addresses exactly one comment;
- identical input/order produces identical output across retries.

Expected output:

```text
P1-186 imported comment id uniqueness model: PASS
```

## 10. Source-bound acceptance gate

Committed source must eventually prove:

1. a named deterministic comment-id uniqueness helper;
2. import sanitization invokes it before returning/committing comments;
3. uniqueness includes deleted comments;
4. no random/time-based duplicate repair;
5. output ids remain within `MAX_IMPORTED_COMMENT_ID_CHARS`;
6. live add path checks the durable uniqueness invariant;
7. edit/delete can rely on a unique id rather than first-match ambiguity.

## 11. Neighboring owners

- **P1-185** — imported temporal-domain normalization.
- **P0-076** — generation-fenced Journal writes/repairs.
- **P1-215** — staged import lease/restart receipt.

P1-186 does not redefine comment text/count budgets or Journal CAS.

## 12. Closure evidence still required

Architecture/model PASS does not close P1-186.

Closure requires production implementation, source-gate PASS and import regression covering duplicate, empty, maximum-length and pre-colliding suffix ids, followed by edit/delete of each normalized comment independently.

Registry status remains **ACTIVE**. Release remains **NOT READY**.
