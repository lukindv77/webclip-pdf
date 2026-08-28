# Audit delta — legacy URL identity parity in `WEBCLIP_JOURNAL_LIST` — 2026-08-28

Docs-only audit checkpoint. Runtime/config/manifest/tests are unchanged.

## Classification

No new P-number. This is a direct extension of **P1-216**.

## Source proof

`listJournalEntries({url})` scans the universal `createdAt` index, but its URL predicate is:

```js
const matches = urlKey ? entry.urlKey === urlKey : ...
```

Unlike the newer direct Journal view predicate, it does not derive/fallback `normalizeJournalUrl(entry.url)` when the persisted `urlKey` field is missing.

`WEBCLIP_JOURNAL_LIST` uses this helper for both extension pages and content scripts. For content scripts, the worker ignores a caller-supplied arbitrary URL and safely derives `currentUrl` from `sender.tab.url`, then requests current-URL entries through this same helper.

## User-visible consequence

A supported legacy row L with a valid matching `url` but no persisted `urlKey` can therefore be in three contradictory states:

- visible in the modern Journal current-URL view;
- absent from `WEBCLIP_JOURNAL_LIST` current-URL results/template candidates;
- not removed by URL-scoped clear before the P1-216 repair.

Site mode does not have this exact gap because `listJournalEntries()` derives site identity row-by-row from `entry.url || entry.hostname`.

## Required P1-216 contract

The common canonical URL-identity helper/migration introduced for P1-216 must be consumed by:

1. Journal direct page view;
2. `WEBCLIP_JOURNAL_LIST`;
3. content current-URL template retrieval;
4. URL-scoped clear;
5. any future URL-keyed Journal action;
6. `urlStats` rebuild/summary semantics.

An index is an optimization only after a durable migration proves every supported row owns the indexed derived field.

## Regression cases

- legacy row without `urlKey` is returned to content for its exact current URL;
- the same row appears in Journal current-URL mode;
- URL clear removes the same row;
- site mode behavior remains unchanged;
- unrelated URL on the same site is not returned in current-URL mode;
- current-format indexed rows retain fast/correct behavior;
- invalid legacy URLs are not guessed into a scope.

## Duplicate check

This is not P1-217. P1-216 owns semantic parity for supported legacy rows whose derived URL index field is absent; list/template and clear are two manifestations of the same identity split.

## Validation note

Documentation only. Product tests were not rerun; historical 88/88 JavaScript syntax + 74/74 deterministic PASS remains prior evidence only. No build, tag or Release was created.