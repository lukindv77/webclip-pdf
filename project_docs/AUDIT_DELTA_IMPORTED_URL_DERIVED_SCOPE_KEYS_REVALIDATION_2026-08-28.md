# Audit delta — imported Journal URL-derived scope keys are recomputed — 2026-08-28

Source-of-truth `main` immediately before this write: `223462d4ec7bd8a03a3d3c6591569df2b7b6b758`.

Docs-only positive-control checkpoint. Runtime/configuration/tests/manifest are unchanged. No new P-number is assigned.

## Scope

This block audited whether an imported backup can directly supply forged/stale derived URL identity fields (`urlKey`, `siteKey`) and thereby influence current Journal filtering/grouping/scoped-clear/Apply policy independently of the actual normalized URL.

## Positive result — imported `urlKey` / `siteKey` are not trusted

`normalizeImportedJournalEntry()` first normalizes the source URL with `normalizeImportedHttpUrl(raw.url)`.

When it constructs the imported entry it derives:

- `urlKey = normalizeJournalUrl(url)`;
- `siteKey = getJournalSiteKey(url || hostname)`.

It does not copy `raw.urlKey` or `raw.siteKey` into the authoritative entry.

Because a valid normalized URL is preferred over hostname, a backup cannot claim URL `https://a.example/...` while independently setting `siteKey` to another site and have that stored derived key accepted.

This is an important import trust boundary and should be preserved.

## Current view/scoped operations consume recomputed identities

Current Journal view admission derives source-side filter identities from the current requested URL and compares them to entry summary `urlKey/siteKey`.

Scoped clear likewise computes its target `urlKey/siteKey` from the explicit current URL/site input rather than accepting arbitrary imported scope strings.

Domain hierarchy uses `entry.url || entry.hostname`, so a valid imported URL remains the primary source for PSL/domain classification.

Therefore the audited path does not show a forged imported derived-key capability that can move an entry into a different current-site clear/filter authority merely through stale `raw.siteKey` metadata.

## Raw `hostname` / `siteAddress` remain descriptive metadata

Import does preserve bounded `raw.hostname` when present and bounded `raw.siteAddress`.

That should remain **descriptive only** wherever a valid normalized URL exists. Future code must not start using those preserved legacy/display fields as stronger scope/permission identity than recomputed URL-derived keys.

If UI displays a hostname that disagrees with the URL, product may eventually choose to normalize the display too for truthfulness, but fresh source proof does not show that mismatch currently controls scoped destructive mutation.

No new blocker is assigned from display metadata alone.

## Composition with other open items

- **P0-076** still requires exact entry generation for a destructive/current mutation; recomputed siteKey does not stop stale same-id replacement.
- **P1-206** still requires coherent Journal read revision; correct derived fields from different revisions can still produce mixed traversal.
- **P0-022/P0-073** still govern imported Yandex remote identity/provenance; recomputing URL/site keys does not make imported `resourceId/accountUid` destructive authority.
- **P1-001/P1-175** still govern locator/template confidence and exact target document when Apply is used.

## Regression guard

1. Import backup contains valid URL A plus forged raw `urlKey/siteKey` for B -> stored authoritative keys are derived from A.
2. Import valid URL A plus forged hostname B -> current-site/site filter/scoped-clear identity remains A-derived.
3. Domain filter hierarchy prefers valid entry URL over legacy hostname.
4. Backup roundtrip with correct derived fields remains stable even though import recomputes them.
5. PSL rule changes across extension versions deliberately recompute current site identity from URL rather than preserving obsolete exported derived keys.
6. Future import schema migrations do not promote raw derived keys to authoritative scope identity without explicit validation/version semantics.
7. Invalid/non-http imported URLs remain fail-closed according to import URL normalization; hostname alone must not invent a trusted browsing URL.
8. Correct scope identity still requires P0-076 generation/CAS before destructive action.

## Classification

No new P-item. This is a positive import-trust regression checkpoint adjacent to P0-076/P1-206 and the imported-provenance work.

**P1-211 remains the deleted-comment tombstone lifecycle item and is not affected.**

## Test / release state

Documentation only. Product tests were not rerun. Historical gate remains prior evidence only: **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. No build, tag or GitHub Release was created.
