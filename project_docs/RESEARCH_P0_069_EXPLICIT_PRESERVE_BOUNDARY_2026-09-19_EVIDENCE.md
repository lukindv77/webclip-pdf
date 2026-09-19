# P0-069 explicit preserve boundary — 2026-09-19

## Scope

This production tranche is based on exact `main` commit `3f1064aad99e915e5b862e889cbb42482e8ef7be`.

P0-069 remains **ACTIVE / IMPLEMENTATION-IN-PROGRESS**. This tranche implements the safe half of the deletion composition:

- a known published Yandex entry cannot be deleted without a separate publication choice;
- explicit `preserve` is admitted and returned as `preserved-by-user`;
- `revoke` fails closed with `WEBCLIP_PUBLICATION_REVOKE_UNAVAILABLE` before OperationLog admission, remote movement, or local Journal deletion;
- unpublished Yandex entries and local-download entries keep their ordinary deletion flow.

It does not claim revoke implementation or physical closure.

## Production contract

`journal.html` and `journal.js` now separate two decisions for an entry carrying a known Yandex `publicUrl`:

1. file placement: keep the file or move it to WebClip Trash;
2. publication outcome: explicitly preserve access or cancel the deletion.

The dialog warns that anyone holding the link can continue to open the file. The revoke option is visible but disabled with a truthful explanation; it is not represented as a file move. Proceed remains disabled until the user deliberately selects preserve.

Retry and the post-error “delete only the Journal record” path retain the same publication action. They cannot silently downgrade a published deletion to an implicit outcome.

`service-worker.js` independently rechecks authoritative Journal state. For a published Yandex entry it rejects missing/`none` publication actions and rejects `revoke` before `startOperationLog`, `moveJournalYandexFileToTrash`, or `deleteJournalEntryRecordOnlyCas`. UI behavior is therefore not the authorization boundary.

On admitted preserve, the OperationLog and response carry:

- `publicationAction: preserve`;
- `publicationOutcome: preserved-by-user`.

No public URL capability is added to logs.

## Deterministic regression

Direct production regression: `project_tools/test_p0_069_explicit_preserve_boundary.js`.

Covered cases:

- published + missing/`none` action fails closed;
- published + revoke fails with the stable unavailable code;
- published + preserve returns an immutable explicit outcome;
- unpublished and local-download positive controls;
- worker admission order precedes every destructive side effect;
- runtime message carries both independent choices;
- UI warning, disabled revoke, proceed gate, retry, record-only fallback, and success disclosure;
- no fabricated unpublish API call.

Local results:

- JavaScript syntax: PASS for all 25 package JavaScript files;
- direct regression: **PASS 34 checks**;
- prior P0-069 publication model: **PASS 47 checks**;
- Journal destructive-operation gate: PASS.

Exact candidate runtime production fingerprint (P1-231):

`sha256:22f5dd62cb84bfa3e860f01b469c503a7c579d1cd4f9914658289fda8af92d4a`

The baseline fingerprint was independently recomputed as `sha256:1b40c128fba4c0f2637f39a6307ad9c377ea4c3a276a6e525dc68661fef4bd67`, matching the previous exact-generation receipt.

## Remaining closure work

P0-069 still requires a separate durable revoke tranche: exact-object authorization, immutable account/root context, checkpoint-before-unpublish, restart/timeout reconciliation, verified private post-state, and final Journal CAS. Real Yandex evidence must cover preserve and revoke outcomes, including unknown settlement and account/root switching.

Manifest remains `0.9.8`. Release readiness remains **NOT READY**. No build, tag, deploy, or release state is created by this tranche.