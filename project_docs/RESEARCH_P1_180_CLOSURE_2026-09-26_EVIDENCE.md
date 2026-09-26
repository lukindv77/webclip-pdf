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

## Closure CI discovery

Closure head `403ed85fa5d636b70601cc080dac6e8bccdd7d53` Repository Integrity #1184 /
run `36213031260` was **FAILURE** in `repository-integrity` → "Deterministic JavaScript tests" only.
Both dedicated P1-231 lanes (`p1-231-source-generation-authority`, `p1-231-shadow-identity`) were **SUCCESS**.

Classification: stale deterministic witnesses, not a production/runtime defect.

1. `test_p1_180_bulk_public_link_disclosure.js` still required the implementation-phase
   `| P1-180 | ACTIVE |` row. It now requires `IMPLEMENTED / RELEASE-REGRESSION`, while the
   implementation-phase ACTIVE statement in `TEST_STATUS.md` and this transition record are
   checked as retained history.
2. The Registry transition is a full-RCF blob input, so the current full RCF moved from
   `sha256:ce915ba229eec8d61a5527e921e94cbf89bfd096438568af6b91e585bdca646c` to
   `sha256:8a1e77fdd342393afaf9067952b9ea52b7860a4ffa5caae3fec2fc1a9f4f2f3a`
   (value taken from the #1184 exact-head `p1-231-source-generation-authority` output).
   Only current full-RCF witness pins were synchronized: S0-F, S0-G, release candidate generation,
   release contract authority, release evidence settlement and release identity tests.
   The S0-H/S0-I/S1-A..S1-D failures were transitive. Historical identities, RPF, QCF and BCF
   are unchanged.

No production runtime file changes in this closure tranche.

## Release boundary

No real Yandex OAuth/API mutation, real Chrome qualification, physical release receipt,
product ZIP/build, manifest bump, release-policy activation, tag, deploy, GitHub Release
or explicit release decision is performed.

Manifest remains `0.9.8`; target remains `0.9.9`; release readiness remains **NOT READY**.
