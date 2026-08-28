# Audit delta — URL-scoped Journal clear must include supported legacy rows without `urlKey` — 2026-08-28

Docs-only audit checkpoint. Runtime/config/manifest/tests are unchanged.

## Classification

**New P1-216** — read/view compatibility and destructive URL-scoped clear must use the same canonical URL identity domain for supported legacy Journal entries.

This is adjacent to P1-189 imported/legacy site identity and P1-032 direct cursor view compatibility, but it is a distinct false-negative destructive-scope defect.

## Source proof

Current Journal view code explicitly documents legacy support:

> Use the universal `createdAt` index so legacy entries without newer derived compound-index fields remain visible; predicates are evaluated per cursor row.

`journalViewSummary(entry)` derives/falls back to current URL/site semantics for display/filtering.

`clearJournalEntries({ url })` takes a different path. For URL scope it computes canonical `urlKey`, then scans only:

```js
store.index('urlKey').openCursor(IDBKeyRange.only(urlKey))
```

An IndexedDB index does not contain a record whose indexed key-path is missing.

Therefore an otherwise supported legacy row with a valid `entry.url` but no persisted `entry.urlKey` is invisible to this destructive cursor.

Site-scoped clear is different: it scans the primary store and derives `getJournalSiteKey(entry.url || entry.hostname || '')` row-by-row, so this exact gap is URL-scope specific.

## Deterministic failure

1. Database contains legacy entry L with `url=https://example.test/a`, but no `urlKey` field.
2. Current Journal view reads L through `createdAt` and recognizes it as matching the current URL using derived semantics.
3. User chooses clear for that exact URL.
4. Worker computes canonical `urlKey=https://example.test/a`.
5. `urlKey` index cursor returns only newer rows that physically store the derived field.
6. L survives the clear.
7. Reload/view still shows L for the URL the user just cleared.

No race or malformed current-version import is required; this follows from the code's own supported-legacy compatibility comment.

## Required contract

Choose one canonical strategy:

### Migration/backfill before scoped operations

- detect legacy rows lacking required derived keys;
- boundedly backfill canonical `urlKey/siteKey` from trusted normalized URL;
- mark migration complete with a durable schema/revision marker;
- then indexed destructive operations may rely on the derived index.

### Or legacy-aware scoped scan

- URL clear scans a compatible cursor and derives canonical URL identity per row, like the view path;
- use bounded transaction/time policy appropriate to up to 100k Journal rows;
- indexes remain an optimization, not a semantic exclusion of supported rows.

A hybrid indexed path may be used after a proven migration marker, with fallback while migration remains incomplete.

## Pending checkpoint parity

Scoped clear also prunes pending local/remote Journal checkpoints by deriving `pendingMeta.url`. That row-by-row logic already demonstrates the intended semantic model: absence of a persisted derived key must not exempt a matching logical URL from the scope.

## Regression cases

1. New row with canonical `urlKey` -> URL clear removes it.
2. Supported legacy row with URL but no `urlKey` -> same clear removes it.
3. Mixed old/new rows for one URL -> all removed atomically according to clear semantics.
4. Other URL on same site remains untouched.
5. Site-scoped clear retains current behavior and full-PSL semantics.
6. Missing/invalid legacy URL is not guessed into the requested scope.
7. Pending appends/download/remote checkpoints for the exact URL are pruned consistently.
8. Large legacy Journal stays bounded; repair does not introduce an unbounded synchronous full scan on the extension page.
9. Clear/import Journal generation fences under P0-076 remain intact.

## Numbering result

**P1-216 is assigned to this legacy derived-key parity root cause.**

P1-189 remains canonical imported hostname/site-routing provenance. P1-216 specifically owns the mismatch where read compatibility recognizes a legacy URL row but URL-scoped destructive clear excludes it because its derived index field is absent.

## Validation note

Documentation only. Product tests were not rerun; historical 88/88 JavaScript syntax + 74/74 deterministic PASS remains prior evidence only. No build, tag or Release was created.