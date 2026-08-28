# Audit delta — Yandex offset-pagination snapshot coherence — 2026-08-28

Source-of-truth `main` immediately before this write: `7ba2e546fc977f5fa156b5d5fb876d93cd7a2e8c`.

Docs-only audit checkpoint. Runtime/configuration/tests/manifest are unchanged. No new P-number is assigned.

## Classification

Fresh source proof refines existing **P1-133** (bounded Yandex directory/backup pagination) and, for restore selection, composes with **P0-013/P1-184** exact selected-object identity.

P1-133 currently proves memory/result caps. This pass adds a logically separate acceptance condition inside the same pagination owner: offset-based pages fetched from a mutable remote directory are not automatically one coherent listing snapshot.

## Current pagination algorithm

`listYandexDirectoryItems(path, ...)`:

- uses `pageSize = 200`;
- starts `offset = 0`;
- GETs `/resources` with `{path, limit:200, offset}`;
- appends/collects the returned page;
- advances `offset += page.length`;
- repeats until reported total/current page length says the scan is complete.

The implementation has useful hard caps and a total deadline, and filters/projections are applied during traversal rather than retaining all 50k metadata records. Preserve those P1-133 controls.

However each page is a separate network request. No remote snapshot id/version/ETag/generation is captured and compared across pages, and no stable server-side continuation token is used.

## Deterministic mutable-directory schedules

### Deletion before the current offset can skip an item

1. Page 1 returns remote sequence `[A1..A200]`.
2. WebClip sets `offset=200`.
3. Another client deletes A1 before page 2.
4. The server's current sequence shifts left by one.
5. WebClip requests current `offset=200`; the object that was originally at position 201 may now be at position 200.
6. That object can be skipped entirely.

### Insertion before the current offset can duplicate an item

1. Page 1 returns `[A1..A200]`.
2. Another client inserts a newly sorted/ordered object before that range.
3. Existing items shift right.
4. Page 2 from offset 200 can contain an item already returned at the end of page 1.
5. The assembled list contains duplicates and may displace another later item before termination.

The exact server ordering semantics may vary, but offset pagination over a mutable collection cannot be treated as one atomic snapshot without a server consistency primitive or client reconciliation proof.

## Why refreshing `_embedded.total` is insufficient

Current code replaces `total` whenever a later page reports a finite total.

That protects hard-cap accounting but does not identify which records moved across offsets. The same count can describe a different membership/order, and a count change does not reveal exactly which item was skipped or duplicated.

Therefore `total` is size observation, not listing-generation identity.

## Restore picker consequence

`listJournalBackupsOnYandex()` uses this paginator and returns the collected matching backup JSON files to Journal for explicit selection.

The exact-object repair already required by P0-013/P1-184 remains the safety boundary after selection: fetch must prove the exact object the user selected rather than trust path alone.

But pagination coherence still matters before selection:

- a legitimate backup can be omitted from the picker;
- an item can be shown twice;
- the user may believe a month has no/only certain backups when the assembled list crossed remote revisions;
- later exact-object binding cannot repair an object that was never shown.

This is primarily P1 reliability/view integrity, not a new destructive P0.

## Folder-picker consequence

The same helper backs other Yandex directory/folder listing surfaces. A mutable remote directory can produce incomplete/duplicate choices there as well.

Do not fix only the Journal backup mapper while leaving the shared paginator semantically unchanged.

## Required P1-133 refinement

### Prefer a stable server continuation/snapshot primitive if available and E2E-proven

If the real Yandex API exposes a documented stable continuation token, revision/ETag semantics, or another snapshot-consistent listing mechanism for this endpoint, use and validate it in real Yandex E2E before relying on it.

Do not invent snapshot guarantees from offset/total fields.

### Otherwise detect/reconcile remote churn

A client-side design may use a bounded consistency receipt such as:

- directory metadata/version before and after traversal when documented as authoritative;
- stable unique object identity per result plus a bounded second verification pass;
- restart-on-change policy with a strict retry budget;
- explicit `directory changed, refresh required` outcome when coherence cannot be proved.

The exact implementation depends on Yandex API semantics and must be verified against the real service.

### Never silently deduplicate by path alone as a correctness proof

A `Set(path)` could hide visible duplicates but would not recover skipped objects and could merge replacement objects that reused the same path.

Where object identity exists, use the strongest stable remote identity. Path remains location, not immutable identity under P1-184.

### Boundedness remains mandatory

Any consistency retry/reverification must preserve:

- current 45s-ish bounded traversal budget or an explicitly bounded replacement;
- max scanned items;
- max collected relevant results;
- projected fields only;
- no unbounded restart loop under a directory receiving continuous writes.

After retry budget exhaustion, expose a truthful refresh/degraded result rather than silently publishing a list as complete.

## Required regressions / real-service checks

1. Stable directory over multiple pages -> every object appears once, current bounds preserved.
2. Delete an item before current offset between page 1/page 2 -> scan detects/restarts/fails refresh-required; it does not silently claim a complete list with a skipped object.
3. Insert before current offset -> no silently duplicated/complete-claim result.
4. Same total but changed membership/order between pages -> count equality alone is not accepted as snapshot proof.
5. Backup picker with remote churn never binds selection to a path-only replacement; P0-013/P1-184 exact object receipt remains mandatory.
6. Continuous churn -> bounded retries then explicit refresh-required, no infinite scan.
7. Directory > hard limit still fails at P1-133 cap even if consistency mechanism is active.
8. Result projection remains bounded; consistency repair does not restore old 50k metadata retention.
9. Folder picker and backup picker share the same coherent-list primitive.
10. Real Yandex E2E documents whether the API offers any usable revision/continuation guarantee before implementation assumes one.

## Duplicate check / numbering

No new P-number is created.

- **P1-133** remains the shared Yandex directory pagination owner, expanded from memory/result boundedness to coherent traversal semantics.
- **P0-013/P1-184** remain exact selected backup/object identity after the user chooses an item.
- **P0-074** remains account/root/config namespace generation.

**P1-211 is already assigned to deleted Journal comment tombstone lifecycle and is not reused.**

## Test / release state

Documentation only. Product tests were not rerun. Historical gate remains prior evidence only: **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. No build, tag or GitHub Release was created.
