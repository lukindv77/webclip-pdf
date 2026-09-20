# P1-164 revoke + Trash two-remote-effect composition — 2026-09-20

## Scope

This bounded production tranche is based on exact canonical `main` commit `58d05c8af57b496087300851e1f6fe9596fbcb7c` (PR #296).

It implements the previously fail-closed delete-time composition for one published Yandex file:

1. bind the exact Journal generation/revision and provider-observed `source path + resource_id + public_url`;
2. prepare one immutable `Trash/MM-YYYY` target before either destructive command is admitted;
3. durably admit one `PUT /resources/unpublish` and prove that the exact source is private;
4. durably admit one `POST /resources/move` only after the revoke proof;
5. prove that the same stable resource is private at the immutable Trash target;
6. atomically delete the exact Journal row and retire the composite receipt.

P0-069 and P1-164 remain **ACTIVE / IMPLEMENTATION-IN-PROGRESS**. This tranche is deterministic production/source evidence, not real-provider qualification or release authorization.

## Composite receipt and phase order

The completion action `delete-journal-trash-file` selects a distinct `publication-revoke-trash` receipt. It durably binds the requested private outcome, source and target paths, stable resource id, initial public URL, account/root context, operation id, Journal reset generation and row revision.

The allowed phase order is:

`prepared → revoke-admitted-unknown → revoke-verified → move-admitted-unknown → remote-verified → local finalize`

There is one production command site for unpublish and one for move. An admitted command is never replayed:

- `revoke-admitted-unknown`: restart observes the exact source. Private settles the first effect; public/unobservable becomes manual resolution without another unpublish.
- `revoke-verified`: the move has not been admitted, so restart may revalidate source, target and Journal authority, durably admit the second effect, and issue the move once.
- `move-admitted-unknown`: restart observes only the immutable target. Exact private target settles the second effect; missing/conflicting/public target becomes manual resolution without another move.
- `remote-verified`: restart performs local-only Journal CAS finalization.

The move request uses `overwrite=false`. An occupied immutable target is not silently retargeted after revoke. The receipt is retained for manual resolution.

## Reset, replacement and already-private behavior

- A prepared receipt is reset-cancellable because no destructive command was admitted.
- Unknown revoke or move admission survives reset as superseded evidence and cannot mutate replacement Journal state.
- A reset after `revoke-verified` but before move admission cancels the not-yet-admitted second effect.
- Terminal local deletion requires exact reset-generation + row-revision CAS and exact terminal remote identity/private binding.
- Same-id replacement, changed revision or reset generation cannot be deleted by the old operation.
- If provider metadata already proves the exact stable resource private before any revoke receipt exists, the flow uses the existing single-effect Trash receipt; it does not fabricate an unpublish command.

## UI boundary

The delete dialog permits revoke after either explicit file outcome. `revoke + Trash` receives its own progress stages for locate, target preparation, revoke admission/verification, move admission/verification and exact Journal deletion.

The record-only fallback is hidden after a composite error because an admitted remote effect may still require reconciliation. Manual recovery surfaces `publication-revoke-trash` as a distinct operation kind.

## Deterministic regression

Direct production regression: `project_tools/test_p1_164_revoke_trash_composition.js`.

Local focused results:

- JavaScript syntax: PASS;
- P1-164 revoke + Trash two-effect composition: **PASS 116 checks**;
- P1-164 revoke + keep delete composition: **PASS 52 checks**;
- P1-164 durable publication revoke: **PASS 77 checks**;
- P0-069 explicit publication boundary: **PASS 42 checks**;
- P0-072 Trash reset receipt: **PASS 76 checks**;
- P0-022 restart identity binding: **PASS 33 checks**.

Exact candidate runtime production fingerprint (P1-231):

`sha256:9fc5df31057a62f50a57dfdd03dbe51ed024f696c2063323e69326a10ffce1e6`

Exact full release-contract fingerprint (P1-231):

`sha256:0e8b3e0b7e2b07b7419c9cb2ffe4f83535dec63e8a4a18b8d0abfd8277118e84`

Chrome/Yandex qualification fingerprints are not advanced by deterministic source evidence.

## Remaining closure work

- qualify successful revoke + move against a real Yandex account;
- qualify timeout/unknown settlement before and after each admission, including target visibility delay;
- qualify auth expiry, account switch, root switch, source replacement and target collision;
- verify manual-resolution UX with real admitted-unknown receipts;
- preserve the release gate until all required physical evidence is attached.

Manifest remains `0.9.8`. Release readiness remains **NOT READY**. No build, tag, deploy or release state is created by this tranche.