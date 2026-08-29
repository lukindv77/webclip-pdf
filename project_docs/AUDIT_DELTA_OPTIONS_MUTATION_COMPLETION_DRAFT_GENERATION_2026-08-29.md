# Audit delta — P1-222 mutation-completion parity for editable Options drafts — 2026-08-29

Baseline `main` before this write: `c785b7f1c41f569b45c82512e73606ce8edd70e1`.

Docs-only audit checkpoint. Runtime/tests/manifest/build/release are unchanged.

## Classification

**Extend existing P1-222; no new P-number.**

The stale-draft problem is not limited to passive `refreshStatus()`. Several write/auth flows use `runBusy(button, fn)`, which disables only the initiating button while leaving related inputs editable; late successful completion then rewrites or clears those inputs.

## Source proof

`runBusy()` saves and changes only `button.disabled`; it does not lock the form field(s) whose values were captured by the operation.

Examples in current `options.js`:

- Start OAuth captures `clientId.value.trim()`, awaits worker, then calls `refreshStatus(response)` which may rewrite `clientId/rootPath/createPublicLinks`.
- Finish OAuth captures `confirmationCode.value.trim()`, awaits worker, then unconditionally executes `confirmationCode.value = ''` and refreshes status.
- Manual token captures `manualToken.value.trim()`, awaits worker, then unconditionally executes `manualToken.value = ''` and refreshes status.
- `saveRoot(path)` awaits `WEBCLIP_YANDEX_SAVE_ROOT`, then writes `rootPath.value = response.rootPath`.

Therefore a user can type a newer draft after admission while the operation is pending, and late completion of the older admitted draft can clear or replace the newer text.

## Required P1-222 refinement

Each mutation must capture a local draft/edit generation together with the submitted value. On completion:

- clear/rewrite a field only if its current edit generation still equals the submitted generation;
- if the user edited meanwhile, preserve the newer draft and show committed/persisted result separately;
- a successful old submission must not masquerade as confirmation that the newer draft was saved;
- status refresh caused by the mutation must obey the same per-field dirty/edit fence from the base P1-222 delta.

For secret-like temporary fields such as manual token / OAuth code, preservation of a newer draft must still obey product privacy requirements; do not retain old submitted secrets longer merely to implement the generation receipt.

## Regression parity

1. Submit manual token A, type B before A settles -> A success does not clear B.
2. Submit OAuth code A, type replacement B before completion -> late A completion does not erase B unless B is intentionally invalidated by a documented state transition.
3. Save root A, manually edit root input B while request is in flight -> A success is shown as committed but does not replace draft B.
4. Start OAuth with clientId A, edit clientId B -> late status for A does not overwrite B; auth/config generation rules P1-178 still govern whether A remains a valid auth attempt.
5. No intervening edit -> current post-success clearing/refresh behavior remains available.

## Duplicate check

This is the same local user-draft generation root cause already assigned to P1-222 in the immediately preceding audit. Existing Yandex auth/root owners govern remote/local commit truth, not whether an extension-page input typed later may be overwritten by an older completion.

## Validation state

Documentation only. Historical 88/88 syntax and 74/74 deterministic test results were not rerun for this HEAD.