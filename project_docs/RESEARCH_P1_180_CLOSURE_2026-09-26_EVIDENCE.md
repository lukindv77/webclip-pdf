# P1-180 — source/runtime closure review — 2026-09-26

## Closure baseline

Canonical source baseline:

`main=42ef8010c0ed4a407d6a331c079b4ad77749d1cb`

Merged implementation:

- PR #354 — `Disclose public-link control loss before bulk journal reset`
- exact PR head: `b83ee42de13caea0f055dabc054f0317818a5041`
- exact-head Repository Integrity #1182 / run `36212664240`: **SUCCESS**
- post-merge Repository Integrity #1183 / run `36212838526`: **SUCCESS**

P1-180 Registry contract:

> Bulk local destructive operations must disclose loss of control over existing public Yandex links; no hidden mass unpublish.

This closure review changes no production runtime.

## Source/runtime census

The current Journal UI has two bulk-clear destructive entry points:

1. site/domain clear;
2. clear-all.

Both now obtain a worker-issued destructive disclosure receipt before the existing 9-digit dangerous-operation confirmation.

The current Journal UI has three replace-import commit entry points:

1. local file staged import;
2. selected Yandex backup staged import;
3. resumed pending staged import after restart.

All three bind destructive disclosure to the exact staged-preview Journal revision and submit the receipt with the replace request.

No additional production `WEBCLIP_JOURNAL_CLEAR` or
`WEBCLIP_JOURNAL_IMPORT_REPLACE_STAGED` UI path is admitted outside these covered flows in current deterministic source coverage.

## Disclosure authority

The worker creates a versioned disclosure receipt containing:

- exact destructive scope;
- normalized scope keys;
- exact Journal revision;
- count of known public Yandex links;
- creation time.

The public-link count and Journal revision are read inside the same readonly IndexedDB transaction.

The disclosure text explicitly tells the user:

- the operation changes only the local Journal;
- it does not perform mass unpublish;
- known public links may continue to work;
- removal/replacement of local rows removes those rows as WebClip's local management point for later revoke.

Therefore local destructive intent is not represented as remote publication revocation intent.

## TOCTOU closure

Clear/site-clear:

- receipt is bound to exact scope + Journal revision;
- the destructive readwrite transaction re-reads current Journal revision before any clear mutation;
- revision mismatch fails closed and requires fresh disclosure/confirmation.

Replace-import:

- staged preview already binds import to `expectedJournalRevision`;
- destructive disclosure is required for all-scope and the same preview revision;
- commit transaction requires current revision == preview revision == disclosure revision before replacement.

Thus a newly added public-link row after user confirmation cannot be silently included under stale disclosure.

## No hidden mass unpublish

Neither bulk disclosure preparation, bulk clear nor replace-import issues Yandex
`/resources/unpublish`.

Explicit per-entry publication revoke/delete composition remains owned by its existing publication lifecycle owners and is not widened by P1-180.

## Deterministic evidence

`project_tools/test_p1_180_bulk_public_link_disclosure.js` covers:

- exact-scope public-link counting;
- same-transaction revision + count;
- extension-page-only disclosure route;
- clear receipt requirement and pre-mutation revision gate;
- all-scope replace-import receipt binding;
- commit-time revision equality;
- both clear UI paths;
- all three replace-import UI paths;
- explicit no-mass-unpublish/loss-of-control text;
- stale-revision fail-closed model;
- zero live provider calls.

Existing import restart coverage was synchronized to the new confirmation signature.

## Owner boundaries preserved

P1-180 does not absorb reset-vs-admitted-external-effect recovery, stale same-id
mutation authority, exact publication revoke/delete lifecycle, publication generation
identity, or exact remote object/content identity.

Applicable real browser/provider release regression remains separate.

## Closure decision

Current source/runtime acceptance for P1-180 is complete.

Registry transition:

`ACTIVE -> IMPLEMENTED / RELEASE-REGRESSION`

This means the source/runtime owner is closed. It does not mean release readiness is complete.

## Release boundary

No real Yandex OAuth/API mutation, real Chrome qualification, physical release receipt,
product ZIP/build, manifest bump, release-policy activation, tag, deploy, GitHub Release
or explicit release decision is performed.

Manifest remains `0.9.8`; target remains `0.9.9`; release readiness remains **NOT READY**.
