# Audit delta — Journal Open Saved File rendered-entry generation — 2026-08-28

## Scope

Docs-only audit of the Journal/Yandex saved-file navigation path. No new P-number.

This checkpoint extends the existing **P1-206 coherent Journal render revision** / **P0-076 exact entry-generation** model from mutation buttons to an important non-destructive action.

## Positive control — imported URL is not a raw navigation capability

Current `journal.js` does not render `entry.publicUrl` as an arbitrary anchor.

It first requires `isOpenableYandexPublicUrl()` (`https:` plus `disk.yandex.ru`, subdomains, or `yadi.sk`). The badge click then sends only:

`WEBCLIP_OPEN_JOURNAL_SAVED_FILE { id: entry.id }`

The worker fresh-reads the Journal entry and independently validates destination/public URL/Yandex allowlist before creating a tab.

Therefore an imported `https://evil.example/...` value is not directly navigated from extension-page markup. This defense-in-depth boundary should be preserved.

## Finding — fresh read by textual id can retarget a stale rendered click

The same fresh-read pattern is insufficient for **user action identity** when the row can be replaced under the same id.

The click closure stores only `entry.id`. It does not carry:

- Journal render revision;
- immutable entry generation/revision;
- expected public URL/resource generation.

The worker receives only id J and calls `getJournalEntryById(J)`, so whatever record currently occupies J becomes the target.

### Deterministic schedule

1. Journal page renders entry A with id J and Yandex badge representing A.
2. Another Journal page / staged replace-import commits entry B under the same textual id J.
3. The first page has not yet refreshed and still visibly shows A.
4. User clicks A's “Яндекс Диск” badge.
5. Page sends only `{id:J}`.
6. Worker fresh-reads current B.
7. If B has an allowed Yandex public URL, WebClip opens B's file, not the object the user clicked.

The worker's freshness has become **retargeting**, not protection.

The same logical problem can occur in a content-page Journal template if a previously displayed/current template action identifies its target only by reusable entry id and the worker later resolves a replacement generation.

## Security/risk boundary

This action is not a destructive Yandex mutation, so this audit does not create a new P0 solely for the navigation mismatch. The user already has Journal access to both records in the trusted extension context.

However it is still an exact user-intent and provenance failure: a visible action can open a different saved document than the one represented at click time. It also weakens forensic/debug expectations around same-id import replacement.

## Required contract

Every actionable rendered entry should carry an exact render/entry receipt. For Open Saved File, the request should include enough expected authority to prove:

- page acted on coherent Journal revision R;
- entry id J referred to immutable entry generation E at render/click time;
- current worker row still represents E before opening any URL.

A mismatch should return a stale-view result and refresh/re-render, not silently substitute current B.

The worker remains authoritative for URL allowlisting; expected URL sent by the page is not itself trusted as a destination.

## Acceptance cases

1. Stable A -> click -> worker proves entry generation A and opens A's allowed Yandex URL.
2. A rendered -> import replaces same id with B -> stale A click opens nothing and asks/causes refresh; B is not silently substituted.
3. A URL changes within a newer generation -> stale click does not attach to the newer URL by id alone.
4. Crafted imported non-Yandex HTTPS URL remains disabled on page and rejected by worker.
5. Stale entry receipt never weakens worker Yandex host validation.
6. Ordinary Journal notification refresh remains an optimization; correctness does not depend on refresh racing before the click.

## Classification

No new number.

- **P1-206**: coherent rendered Journal revision/action source.
- **P0-076** supplies the exact entry-generation/CAS principle for same-id replacement; destructive mutation consequences remain P0, while this open action is a P1 correctness extension.

## Validation note

Documentation only. Runtime/tests/manifest unchanged. Tests were not rerun; historical 88/88 syntax + 74/74 deterministic PASS remains prior evidence only. No build/tag/release.