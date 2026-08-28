# Audit delta — direct Start Selection bypasses active upload generation lock — 2026-08-28

Source-of-truth `main` immediately before this write: `e83546add824ee52b2389872c589f2a67bbddba8`.

Docs-only audit checkpoint. Runtime/tests/configuration/manifest are unchanged.

## Classification

No new P-number is assigned.

Primary existing owners:

- **P0-017** — one shared page-command behavior across popup/context menu;
- **P0-001** — explicit selection state must not be lost unexpectedly;
- **P1-198/P1-210** — operation generation/terminal receipt separation where old and new user operations overlap.

P0-080 remains relevant when a new application generation is the reason selection must be reset, but the race below occurs even without navigation.

## Fresh source proof

`handleExternalCommand()` has a clear operation lock:

```text
if (state.pageUploadActive && command !== 'notify-error')
    return error: wait for current Yandex save
```

So context-menu/page commands cannot start/edit another workflow while a Yandex upload is active.

The direct top-level message handler for `WEBCLIP_START_SELECTION` does **not** use that guard. It calls `startSelection()` immediately.

Popup currently uses exactly this direct message after injection/permission setup.

`startSelection()`:

- restores print state;
- invalidates PDF cache;
- clears existing selection;
- sets `state.phase='selecting'`;
- enables page listeners/UI.

It does not clear `pageUploadActive` or change `pageUploadOperationId`.

Thus the content script can simultaneously be:

- logically inside old upload operation U (`pageUploadActive=true`); and
- visibly inside a new editable selection session S (`phase='selecting'`).

## Deterministic late-terminal UI race

1. User starts Yandex save U from selection A.
2. PDF A is already cached and remote upload U continues; `pageUploadActive=true`.
3. User opens popup and presses Start.
4. Popup sends direct `WEBCLIP_START_SELECTION`.
5. `startSelection()` bypasses the upload lock, clears A and starts editable selection S.
6. User selects new areas B while U is still running.
7. Old U finishes.
8. `sendPdfToYandex()` completion calls `endPageUploadProgress()` and then unconditionally sets `state.phase='review'`, rewrites the modal to U's success/partial result and installs its Close action.
9. The user-visible B selection session is therefore interrupted by the late terminal UI of U; closing U may call `stopSelection(true)` and clear the newer selection.

The remote artifact U itself still uses the earlier cached bytes/meta, so this is not evidence that U uploads B. The defect is **generation ownership of page UI/selection state**: old terminal U can overwrite a newer S because S was allowed to start while U was active.

## Required refinement

### All start paths consume the same lock

Popup Start, context-menu Start and any direct `WEBCLIP_START_SELECTION` compatibility path must go through one semantic command gate.

While `pageUploadActive` is true, ordinary Start/Reset/Apply actions should either:

- reject with the existing “wait for save completion” result; or
- explicitly queue a new operation generation that begins only after U reaches terminal state.

They must not mutate selection/UI immediately underneath U.

### Terminal UI must be generation-owned

Even with admission gating, async completion should verify that the page UI still belongs to its operation generation before replacing modal/phase state.

A terminal event for U may update U's operation receipt/log, but it must not blindly overwrite a later authorized page workflow S.

### Preserve retry artifact independence

The remote upload U remains bound to its already generated PDF/cache receipt. Blocking new selection edits during U must not reinterpret application mutations as cancellation of U's actual remote settlement.

## Required regressions

1. Active upload U -> context Start rejected (current positive behavior).
2. Active upload U -> popup Start receives same rejection; existing selection/UI is not reset.
3. Active upload U -> direct compatibility `WEBCLIP_START_SELECTION` cannot bypass lock.
4. After U terminal -> Start can begin/resume according to the common P0-017 policy.
5. If a queued/new S is explicitly supported, late U progress/terminal messages cannot overwrite S's modal/phase.
6. Remote U success/failure still reconciles normally even if page navigation/application generation changes under P0-070/P0-080.

## Duplicate check

The immediately preceding popup/context Start parity checkpoint covered reset-vs-resume behavior. Repository history did not contain this separate active-upload generation race caused by the direct message bypassing `pageUploadActive`.

No new root-cause number is needed: it strengthens the same shared-command/operation-generation contract.

## Test / release state

Documentation only. Product tests were not rerun. Historical evidence remains **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. Runtime version remains `0.9.8`; no build, tag or GitHub Release was created.