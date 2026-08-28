# Audit delta — Yandex global locate pagination coherence — 2026-08-28

Source-of-truth `main` immediately before this write: `1132703be3e1232824f697d7f83312e24a65178d`.

Docs-only audit checkpoint. Runtime/configuration/tests/manifest are unchanged. No new P-number is assigned.

## Classification

Fresh source proof refines **P1-090** exact Yandex source-object locate/move reconciliation and composes with **P1-133** pagination coherence.

The shared directory paginator audited earlier is not the only offset-based remote traversal. `findYandexFileForJournalEntry()` has a separate global `/resources/files` scan used specifically when known paths no longer locate the object.

## Current fallback locate algorithm

After safer known-path checks fail, the worker can search globally by the strongest available identity:

- expected `resourceId`; or
- legacy public URL.

It uses:

- `limit = 200`;
- `offset = 0, 200, 400...`;
- up to 250 pages;
- a shared 45-second locate deadline;
- `/resources/files` requests projecting name/path/type/public_url/resource_id/total/limit/offset.

Each page is a separate current remote-list observation. There is no stable snapshot/revision/continuation receipt binding all pages.

## Mutable global list can skip the exact target

Offset pagination over a changing global file set has the same fundamental shift problem as directory pagination.

Deterministic schedule:

1. exact target object R is currently at logical position 201 in the server's ordered `/resources/files` result;
2. page 1 returns positions 1–200; R is not present yet;
3. another client deletes/moves one object ahead of R before page 2;
4. R shifts from position 201 to 200;
5. WebClip requests `offset=200` against the new collection;
6. R lies immediately before that new offset and is skipped;
7. later pages do not contain R;
8. WebClip eventually reports that the file was not found by resourceId/public URL even though exact R still exists.

Insertion before the offset can symmetrically duplicate records and consume bounded scan time without proving complete coverage.

## Safety boundary is currently fail-closed

This audit does **not** prove that the pagination gap directly moves the wrong object.

The current locate code searches each returned page for exact resource identity/public URL and, if no match is found, throws with the Journal entry left unchanged.

That is an important positive control: absence from an incoherent traversal is currently used as “cannot safely locate”, not as permission to guess another file by name.

Therefore classification remains P1 reliability/management availability inside P1-090 rather than a new destructive P0.

## Why the problem still matters

For a legitimately moved/renamed WebClip file whose stored path is stale, global exact-identity search is the recovery path that makes Delete→Trash / Mark Read management possible.

A false negative caused by traversal churn can:

- make a real saved file appear unmanageable from Journal;
- leave ReadLater→Upload or Trash action failing repeatedly on a busy shared Disk;
- produce misleading “not found / possibly another account” diagnostics;
- consume most/all of the 45-second locate budget and retries while the object actually exists.

Exact post-move identity verification cannot help if the correct source object is never found before the move.

## Required P1-090 refinement

### Treat global scan completeness as a proof obligation

A full negative result “R not found” may be authoritative only when the traversal used a remote consistency mechanism that proves complete coverage for one relevant remote generation.

If real Yandex API offers a documented stable continuation/snapshot primitive for `/resources/files`, validate it in real-service E2E and use it.

Do not infer snapshot semantics from `total` + offset alone.

### If coherence cannot be proved, distinguish `not found` from `scan changed/inconclusive`

After bounded retries/revalidation:

- exact strong positive match R can still be accepted when identity matches;
- a negative result from a traversal known/suspected to cross revisions should remain `locate inconclusive / retry later` rather than authoritative object absence;
- no destructive side effect begins from an inconclusive scan.

### Strong identity remains mandatory

Pagination repair must not weaken the locate policy into filename/size guessing.

`resource_id` equality remains the strongest normal proof. Legacy public URL stays an explicitly weaker migration path under existing provenance rules.

### Boundedness remains mandatory

Do not solve churn by infinite scan restarts. Preserve an overall operation deadline/retry cap and surface a controlled “Disk changed during search; repeat later” result after exhaustion.

## Composition with P1-133

The same abstract pagination primitive may eventually serve directory and global-file listing, but endpoint semantics can differ.

P1-133 owns coherent bounded pagination generally; P1-090 must still state how an **inconclusive negative locate** affects destructive management admission.

A duplicate-free UI list and an authoritative exact-object negative proof are not identical requirements.

## Required regressions / real Yandex checks

1. Stable multi-page global file set -> exact R after page 1 is found.
2. Delete before current offset moves R backward across boundary -> traversal does not return authoritative “R absent”.
3. Insert before current offset -> duplicate page records do not falsely prove complete coverage.
4. Same reported total but changed membership/order -> total equality alone is insufficient.
5. Exact R appears on any coherent page -> positive resourceId match is accepted once.
6. No exact identity match -> no filename-only destructive fallback is introduced.
7. Continuous remote churn -> bounded inconclusive result, Journal remains unchanged.
8. Known-path exact R still works without expensive global scan.
9. Account/root/auth generation changes mid-locate -> P0-074 invalidates the scan rather than combining namespaces.
10. Real Yandex E2E records whether `/resources/files` order/snapshot behavior offers a usable stronger primitive.

## Duplicate check / numbering

No new P-number is created.

- **P1-090** remains exact source locate and source→target move reconciliation owner.
- **P1-133** supplies shared pagination-coherence requirements.
- **P0-073/P0-074** remain account/root/auth namespace fences.
- **P1-184** remains exact remote object/content proof in save/restore contexts.

P1-211 remains the Journal deleted-comment lifecycle item.

## Test / release state

Documentation only. Product tests were not rerun. Historical gate remains prior evidence only: **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. No build, tag or GitHub Release was created.
