# Audit delta — Options status refresh must not overwrite newer form edits — 2026-08-29

Baseline `main` before this write: `34662f2325f2ca9e6029343f8dab45e7c2927d4a`.

Docs-only audit checkpoint. Runtime, manifest, tests, build, tag and Release are unchanged.

## Classification

**New P1-222 — Yandex status refresh is latest-refresh-wins, but not latest-user-edit-wins. A late status response can overwrite newer unsaved Options input.**

This is a user-visible stale async generation bug, not a Yandex remote mutation/account-context bug.

## Source proof

`options.js::refreshStatus()` starts:

```js
const generation = ++yandexStatusGeneration;
const status = ... await WEBCLIP_YANDEX_STATUS ...;
requireOk(status);
if (generation !== yandexStatusGeneration) return;
```

The fence correctly prevents an older **refresh request** from overwriting a newer refresh.

But on success the same generation writes directly into editable controls:

```js
clientId.value = status.clientId || clientId.value || '';
redirectUri.value = status.redirectUri || '';
rootPath.value = status.rootPath || '';
publicLinksEnabled.checked = status.createPublicLinks !== false;
```

There is no edit-generation/dirty check. User input does not increment `yandexStatusGeneration`.

## Deterministic stale-UI schedule

1. Options starts `refreshStatus()` R1 and waits on runtime/storage/network prerequisites.
2. Before R1 returns, user edits `rootPath` from persisted A to intended B, or edits `clientId`, or toggles `createPublicLinks`.
3. No newer refresh starts, so R1 remains the current `yandexStatusGeneration`.
4. R1 returns persisted status A.
5. `refreshStatus()` assigns A into the form controls and silently destroys the newer unsaved edit B.

The same class can occur after an explicit action that triggers refresh while the user begins another edit before the response arrives.

## Required contract

Editable Options state needs a separate local form/edit generation from remote/read refresh generation.

At minimum:

- increment an edit revision on `input/change` for mutable Yandex fields;
- capture that revision when status read starts;
- after await, update a field only if it has not been edited since the captured revision, or update only non-editable status presentation while keeping dirty inputs intact;
- after successful save of a specific form generation, explicitly reconcile/clear dirty state for the values actually committed;
- stale reads may update diagnostic connection/account status if separately generation-fenced, but must not rewrite newer user-entered values.

A robust model separates:

1. persisted/verified server-worker status;
2. editable draft values;
3. dirty fields/revision;
4. save operation receipt/result.

Do not use disabled/enabled UI timing as the correctness boundary unless editing is actually impossible for the full async lifetime and that invariant is tested.

## Required regressions

1. Slow initial status + user edits root path -> late status does not overwrite draft.
2. Slow status + user changes clientId -> draft survives.
3. Slow status + user toggles public-link policy -> draft checkbox survives; persisted status may be shown separately.
4. R1 then R2 without edits -> existing latest-refresh generation remains correct.
5. User edits after R1, then explicitly saves draft B, then older R1 settles -> B remains visible.
6. Save failure does not replace draft with pre-save persisted values unless user explicitly reloads/reverts.
7. Disconnect/reauth/status messages update connection state without silently wiping unrelated dirty fields.

## Duplicate check / numbering

Repository search for Options `refreshStatus`, stale form edit overwrite, `clientId/rootPath/publicLinks` edit generation found no existing dedicated audit owner. Existing Yandex config/auth owners govern commit/account generation and partial settlement; existing UI generation fencing governs refresh-vs-refresh ordering. Neither protects a newer local draft from an older read.

Current repository search found no `P1-222`; P1-221 is the latest assigned owner on current `main`. Therefore this checkpoint assigns **P1-222**.

## Validation state

Documentation only. Historical 88/88 syntax + 74/74 deterministic PASS were not rerun for this HEAD.