# P1-180 — bulk public-link loss-of-control disclosure — 2026-09-26

## Scope

This is a bounded implementation tranche for existing **P1-180**.

Canonical baseline:

`main=70137820eda381163bf10a485e7e8dc80e580f53`

Post-merge Repository Integrity on that baseline:

`#1172 / run 36212083150 — SUCCESS`

Registry contract:

> Bulk local destructive operations must disclose loss of control over existing public Yandex links; no hidden mass unpublish.

## Current-source defect

Before this tranche:

- site clear warned only that local Journal entries would be deleted;
- clear-all warned only that local Journal entries would be deleted;
- file/Yandex/resumed replace-import warned only that the local Journal would be replaced.

Those confirmations did not tell the user that known public Yandex links can remain live after the local rows carrying `publicUrl` are deleted/replaced.

The destructive worker paths do not perform a mass `/resources/unpublish`, so the missing warning creates a control-truth gap: local deletion can remove WebClip's local management record while the public URL remains usable.

## Implemented contract

A versioned worker-issued destructive disclosure receipt is added.

It is bound to:

- destructive scope: `all`, `site`, or `url`;
- normalized scope keys;
- exact current Journal revision;
- worker-counted known public Yandex links in that scope.

The count and Journal revision are read inside one readonly IndexedDB transaction, so the receipt describes one consistent local snapshot.

The UI obtains this receipt before showing the existing 9-digit dangerous-operation confirmation.

When known public links are present, the confirmation explicitly says:

- how many known public Yandex links are in the local destructive scope;
- the operation changes only the local Journal;
- it does **not** perform mass unpublish;
- public links may continue to work;
- deleting/replacing the local Journal rows removes those rows as WebClip's local control point for later revoke operations.

The same no-hidden-unpublish statement is shown when the count is zero.

## TOCTOU boundary

Disclosure is not merely informational text.

For clear/site-clear:

1. worker creates receipt for exact scope + Journal revision;
2. user sees the receipt-derived warning and confirms;
3. worker opens the destructive readwrite transaction;
4. current Journal revision is read inside that transaction;
5. only an exact revision match admits local deletion.

If Journal changed after disclosure, clear fails closed with
`JOURNAL_DESTRUCTIVE_DISCLOSURE_STALE` and requires a fresh disclosure/confirmation.

For replace-import:

- staged preview already binds import to `expectedJournalRevision`;
- destructive disclosure must be `all` scope and bind to that exact same revision;
- the existing import commit transaction now requires current revision == preview revision == disclosure revision before `beginReplace()`.

Therefore a newly added public-link row after user confirmation cannot be silently swept into a bulk local destructive commit.

## No hidden provider mutation

Neither disclosure preparation nor accepted local clear/import calls Yandex unpublish.

P1-180 does not convert clear/import into a bulk remote revoke operation.

Single-entry explicit revoke/delete publication flows remain separate and unchanged.

## Owner boundaries

This tranche does not absorb:

- P0-072 admitted external-effect/reset recovery authority;
- P0-076 stale same-id entry mutation authority;
- P0-069 / P1-164 explicit public-link revoke/delete lifecycle;
- P0-078 publication generation/revocation identity;
- P1-184 exact remote-object/content identity.

## Deterministic coverage

Added:

- `project_tools/test_p1_180_bulk_public_link_disclosure.js`

Coverage asserts:

- worker-side exact-scope public-link counting;
- count + revision in one readonly IDB transaction;
- extension journal page is the only disclosure caller;
- clear requires exact-scope receipt;
- clear revision recheck precedes mutation;
- import disclosure revision equals preview revision;
- import commit rechecks both in the readwrite transaction;
- all three replace-import UI paths submit disclosure receipts;
- site/all clear request disclosure before confirmation;
- explicit no-mass-unpublish/loss-of-control text;
- stale revision fails closed;
- deterministic live provider calls = zero.

## Closure boundary

P1-180 remains **ACTIVE** until exact-head CI succeeds and a source/runtime closure review confirms every registered P1-180 bulk-local destructive entry point is covered.

## Release boundary

No live Yandex OAuth/API mutation, real Chrome qualification, physical release receipt, product ZIP/build, manifest bump, release-policy activation, tag, deployment, GitHub Release or release decision is performed.

Manifest remains `0.9.8`; target remains `0.9.9`; release readiness remains **NOT READY**.


## Exact-head CI discovery #1173

Repository Integrity #1173 / run `36212530803` on exact implementation head
`028235ff2b4f08a685dbc913f324ea1b1b7147a8` passed PR metadata,
JavaScript syntax, and both dedicated P1-231 authority lanes.

The new P1-180 deterministic test was not in the failure set. Direct generic-suite
failures were bounded to:

- a C44 import-restart source witness that still expected the pre-disclosure
  `journalImportReplaceConfirmationText(preview, sourceLabel)` call;
- current package/release identity witnesses pinned to the pre-P1-180 runtime bytes.

Exact-head source-generation authority derived:

- 34-file RPF: `sha256:31126569c4b1a80d7c93c15d5c99581bf7d4e22e5b39d7a09e195b6c977ccaab`
- 33-file control: `sha256:cfce0548cc066dac586b1a9325d7ad8185fe84ed3c8a70ceb5cc571248dc6625`
- full RCF: `sha256:ce915ba229eec8d61a5527e921e94cbf89bfd096438568af6b91e585bdca646c`
- Yandex QCF remains `sha256:8d6c9711b4f71b8485b49a6ab68f90bcf62bc74155ae0959dbdc4718648879a1`
- BCF remains `sha256:9eebcc834fa32bd8fe5f03ef14564f0fc1c169d0308dcc2813941b4f913363ff`.

#1173 is not merge evidence because the generic deterministic suite failed.
Follow-up commits synchronize only source/current-identity witnesses. Production
runtime remains unchanged from the P1-180 disclosure implementation.
