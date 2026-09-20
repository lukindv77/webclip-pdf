# P1-164 durable publication revoke — 2026-09-19

## Scope

This production tranche is based on exact `main` commit `e66d94991415455329a6472f1266ddf84821a65c`.

P1-164 remains **ACTIVE / IMPLEMENTATION-IN-PROGRESS**. The tranche implements a standalone per-entry Yandex public-link revoke without claiming delete-time composition or real-provider qualification:

- a Journal entry with a known `publicUrl` exposes an explicit “Отозвать публичную ссылку” action;
- the worker resolves and revalidates the exact provider-observed `path + resource_id + public_url` under one immutable account/root/auth context;
- a detached receipt is committed before the non-cancellable `PUT /resources/unpublish` admission;
- the command is sent at most once;
- success is returned only after authoritative resource metadata no longer contains `public_url`;
- the Journal row is updated only under exact reset-generation + row-revision CAS, preserving verified `resourceId` and `remotePath`;
- a reset-superseded receipt cannot mutate replacement Journal state.

The 2026-09-20 follow-ups compose this primitive with both the bounded `keep-file + exact Journal delete` outcome and a distinct two-admission `revoke + Trash` receipt. See `RESEARCH_P1_164_DELETE_KEEP_REVOKE_COMPOSITION_2026-09-20_EVIDENCE.md` and `RESEARCH_P1_164_REVOKE_TRASH_COMPOSITION_2026-09-20_EVIDENCE.md`.

## Durable settlement protocol

`publication-revoke` receipts reuse the bounded `pendingDestructiveMoves` ledger. A prepared receipt binds:

- exact Journal entry id, creation identity, reset generation and entry revision;
- exact provider-observed path, stable resource id and public URL;
- account uid, root path, observation time and immutable-context generation;
- requested terminal publication outcome `private`;
- operation id and source URL/site scope.

Immediately before remote admission the worker re-reads metadata and applies the existing destructive-command identity authority. It then changes the receipt to `admitted-unknown` before issuing one unpublish request.

The HTTP result is not terminal authority. Whether the request succeeds, times out or returns an error, the live path reads exact resource metadata within a bounded deadline. Only an exact matching resource with absent `public_url` advances the receipt to `remote-verified`.

After worker restart, an admitted receipt is never replayed. Reconciliation captures a current authenticated context for the same account/root namespace and performs one observation-only metadata read:

- private exact object: record terminal verification and resume local-only Journal CAS;
- still-public object, unavailable auth, namespace mismatch, missing path or identity conflict: retain durable manual-resolution evidence and do not repeat unpublish.

## UI and truthful boundaries

The dedicated Journal action remains available. The follow-up delete dialog enables revoke only after the user selects “keep file”; selecting Trash disables revoke. It therefore does not represent a file move as privacy revocation or pretend that two independent remote effects are atomic.

The operation log records settlement and the no-retry rule without storing OAuth credentials or expanding public URL capability.

## Deterministic regression

Direct production regression: `project_tools/test_p1_164_durable_publication_revoke.js`.

Local results:

- JavaScript syntax: PASS for changed production scripts;
- P1-164 durable publication revoke: **PASS 66 checks**;
- P0-069 explicit preserve boundary: **PASS 34 checks**;
- P0-069 publication model: **PASS 47 checks**;
- P0-072 destructive restart reconciliation: **PASS 75 checks**;
- P0-022 restart identity binding: **PASS 33 checks**;
- P0-074 Yandex operation context: **PASS 48 checks**;
- all locally materialized non-git-dependent JavaScript regressions: PASS.

Exact candidate runtime production fingerprint (P1-231):

`sha256:70cc0f7ce266ed238106621da106760c0d7520bfc147f00f71b821d0d1dffefd`

## Remaining closure work

- qualify success, timeout/unknown settlement, auth expiry, account switch and root switch against a real Yandex account;
- qualify the new keep-file delete completion against a real Yandex account;
- qualify the implemented two-admission `revoke + Trash` protocol against a real Yandex account, including both admitted-unknown boundaries;
- decide the manual-resolution UI for an admitted receipt that remains public or cannot be observed;
- preserve release gating: this evidence is not a build, tag, deployment or release authorization.

Manifest remains `0.9.8`. Release readiness remains **NOT READY**. No build, tag, deploy or release state is created by this tranche.