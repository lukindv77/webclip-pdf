# P1-164 delete-time revoke + keep-file composition — 2026-09-20

## Scope

This bounded production tranche is based on exact canonical `main` commit `6f79061b13190c27b67bd9ced79f8fd25536fac0` (PR #295).

It composes one remote publication effect with one local Journal effect:

1. resolve and revalidate the exact Yandex `path + resource_id + public_url` under one immutable account/root/auth context;
2. persist a `publication-revoke` receipt with completion `delete-journal-keep-file`;
3. durably advance the receipt to `admitted-unknown` before one `PUT /resources/unpublish`;
4. verify authoritative absence of `public_url` without automatic command replay;
5. delete only the exact Journal row through reset-generation + row-revision CAS while leaving the remote file in place;
6. retire the receipt after local settlement.

P0-069 and P1-164 remain **ACTIVE / IMPLEMENTATION-IN-PROGRESS**. This tranche does not claim real-provider qualification; the later two-admission `revoke + Trash` protocol is documented separately.

## Durable completion and recovery

The completion action is immutable receipt data, not transient UI state. Missing legacy completion defaults only to the reviewed standalone `clear-public-url` behavior. Unknown completion values fail closed.

For `delete-journal-keep-file`:

- terminal exact-object/private verification is rechecked before local deletion;
- the verified receipt, exact Journal row and reset generation are rechecked in one read-write transaction;
- exact row deletion and receipt retirement commit atomically after a Journal stats dirty marker is durable;
- a reset-superseded receipt is retired without touching replacement state;
- a same-id replacement or changed revision causes CAS loss and is not deleted;
- a crash after verified unpublish but before local completion is resumed from the receipt without another unpublish;
- a crash after local deletion but before receipt retirement is idempotent: restart observes lost source authority, retires the receipt and does not touch replacement state.

The live and restart paths contain no second unpublish call site. A still-public or unobservable admitted receipt remains manual-resolution evidence.

## UI and remaining fail-closed boundary

The delete dialog enables “Отозвать публичный доступ” only when “Оставить файл на Яндекс Диске” is selected. Progress separately exposes locate, revoke, verify and exact Journal delete.

The subsequent `RESEARCH_P1_164_REVOKE_TRASH_COMPOSITION_2026-09-20_EVIDENCE.md` replaces this original fail-closed boundary with an explicit composite receipt. The keep-file path remains a one-remote-effect protocol and does not acquire a move command site.

## Deterministic regression

Direct production regression: `project_tools/test_p1_164_delete_keep_revoke_composition.js`.

Local results:

- JavaScript syntax: PASS for changed production and regression scripts;
- P1-164 revoke + keep delete composition: **PASS 49 checks**;
- P1-164 durable publication revoke: **PASS 77 checks**;
- P0-069 explicit publication boundary: **PASS 40 checks**;
- P0-069 publication model: **PASS 47 checks**;
- P0-072 destructive restart reconciliation: **PASS 75 checks**;
- P0-072 Trash reset receipt: **PASS 75 checks**.
- P1-231 S0-E identity engine: **PASS 201 cases**;
- P1-231 S0-F candidate-generation verifier: **PASS 224 cases**;
- P1-231 S0-G evidence settlement: **PASS 128 cases**;
- P1-231 S0-H passive-builder verifier: **PASS 80 cases**.

Exact candidate runtime production fingerprint (P1-231):

`sha256:c0dfdebb9c450f375f51693a24c0f62310464138851676a4946bcad05cbdcd18`

Exact full release-contract fingerprint (P1-231):

`sha256:2329628bc9ef5c12c16d1c22ffdeddef25a36d952db1bdc18e5c7cefb00b25be`

## Remaining closure work

- qualify success, timeout/unknown settlement, auth expiry, account switch and root switch against a real Yandex account;
- qualify the implemented second-remote-effect `revoke + Trash` state machine against a real Yandex account;
- preserve release gating: this evidence is not a build, tag, deployment or release authorization.

Manifest remains `0.9.8`. Release readiness remains **NOT READY**. No build, tag, deploy or release state is created by this tranche.