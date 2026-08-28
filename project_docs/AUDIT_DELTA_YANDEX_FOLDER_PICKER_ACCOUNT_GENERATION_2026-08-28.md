# Audit delta — Yandex folder picker account/auth generation authority — 2026-08-28

Source-of-truth `main` immediately before this write: `eb1bc7ba2ff4a396e7a2cec9dd005d119bb5a7a8`.

Docs-only audit checkpoint. Runtime/tests/configuration/manifest are unchanged. No new P-number is assigned.

## Classification

Primary existing owner: **P1-137** — Options Yandex folder picker stale/out-of-order navigation authority.

Required generation dependencies:

- **P0-074** — immutable Yandex operation/account/config context;
- **P1-178** — PKCE/auth attempt + settings generation;
- **P1-191** — transactional manual-auth replacement;
- **P1-157** — extension-page side-effect transport/settlement contract.

No new P1-211 or other number is created.

## Existing positive control

`loadFolders(path)` already uses `folderBrowseGeneration` and `folderBrowseLoadingGeneration`.

Only the newest list response can update `currentBrowsePath` and the rendered folder list, and Select/Create/Up/Browse actions are blocked while the current navigation request is loading.

This correctly prevents request A from arriving after request B and making the picker visibly jump backward.

## Fresh finding — picker generation is not an account generation

The picker state is page-local:

- `currentBrowsePath`;
- `folderBrowseGeneration`;
- `folderBrowseLoadingGeneration`.

`refreshStatus()` has its own independent `yandexStatusGeneration`. When auth/status changes it updates fields such as `clientId`, `rootPath`, publication policy and connection text, but it does not invalidate/close the already open folder picker or advance `folderBrowseGeneration` merely because authenticated Yandex identity changed.

The user can therefore retain a coherent **old-account folder selection UI** after the global auth context has moved to another account.

## Side-effect commands carry only textual path

When the user presses Create Folder, Options sends:

`WEBCLIP_YANDEX_CREATE_FOLDER { path }`

When the user selects the current directory as root, `saveRoot(currentBrowsePath)` sends:

`WEBCLIP_YANDEX_SAVE_ROOT { rootPath:path }`

Neither message contains the account/auth/list generation under which `path` was observed.

Worker dispatch then simply calls `createYandexFolder(path)` or `saveYandexRoot(rootPath)` under the **current** Yandex auth/config context.

Thus a textual path observed in A can become side-effect/config authority in B.

## Deterministic cross-account schedule

1. User is authenticated to Yandex account A.
2. Options opens folder picker and `loadFolders('/Projects/A')` succeeds; `currentBrowsePath='/Projects/A'` is an observation from A.
3. Picker remains open.
4. In the same Options page the user completes a new PKCE auth or manual-token replacement for account B, or otherwise changes current auth generation.
5. `refreshStatus()` updates connection/root/status controls to B but does not invalidate `folderBrowseGeneration` or clear `currentBrowsePath`.
6. The old folder UI can still display A's path/list.
7. User presses Create Folder. Worker receives only a textual `/Projects/A/New` and executes against current B.
8. Or user presses Select Current. `WEBCLIP_YANDEX_SAVE_ROOT` commits `/Projects/A` as B's current root and may create/verify service folders there.

The path may coincidentally exist in B, may be created there, or may cause a new hierarchy to be established. In all cases the user's selection observation came from A, not B.

## Root/settings import has the same invalidation requirement

Auth replacement is the strongest example, but any external generation change that makes the picker's navigation context stale should invalidate it, including:

- user-settings import changing root/clientId;
- another Options page changing root/auth state;
- Disconnect/re-auth;
- authoritative invalid-token demotion followed by reauth;
- future account switching features.

`folderBrowseGeneration` only orders requests started by this page; it is not a shared settings/account revision.

## Required P1-137 refinement

### Picker selection receipt

Every successful folder LIST result should be associated with a bounded immutable receipt containing at least:

- auth/account generation or exact verified account UID;
- relevant Yandex config/root generation;
- normalized listed path;
- page request generation.

Rendered folder entries and `currentBrowsePath` are valid only while that receipt remains current.

### Invalidate on global context changes

When current auth/account/config generation changes:

- increment/invalidate `folderBrowseGeneration`;
- disable Select/Create immediately;
- clear or mark the rendered list stale;
- require a fresh LIST under the new account before any path becomes mutation authority.

A late old-account response must remain stale even if its page-local generation would otherwise be newest.

### Worker-side expected-generation check

UI invalidation is useful UX but not authoritative enough across multiple pages/races.

`WEBCLIP_YANDEX_CREATE_FOLDER` and `WEBCLIP_YANDEX_SAVE_ROOT` should carry the expected picker/account context. Immediately before remote create or config commit, worker must prove current Yandex generation still matches.

Mismatch returns a stale-context result and requires re-browse. It must not reinterpret the old textual path under the new account.

### Long operation/unknown settlement

Folder create is a remote side effect. If transport outcome becomes unknown after the exact expected generation was accepted, do not blindly repeat it merely because the page saw an error. Reconcile according to P1-157/P1-210 principles before another mutation.

## Required regressions

1. Account A LIST -> same account A Select Current succeeds normally.
2. Account A LIST -> auth switches to B -> stale Select Current is blocked before config mutation.
3. Same schedule -> Create Folder does not create anything in B until a fresh B LIST/reselection.
4. A LIST request resolves late after auth B is current -> response cannot repopulate picker.
5. Manual-token replacement A->B has same invalidation as PKCE replacement.
6. Disconnect while picker open immediately invalidates Create/Select.
7. Settings import changes Yandex client/root generation while picker open -> old path cannot overwrite imported/current settings.
8. Another Options page changes auth/root -> worker expected-generation check rejects old page mutation even if old UI missed notification.
9. Reauth back to A does not automatically resurrect an old picker receipt; require a fresh listing unless an explicitly versioned safe cache is designed.
10. Remote create side effect settles after page transport loss -> reconciliation does not blind-create a duplicate folder.

## Duplicate check

P1-137 already owns folder picker request ordering; this checkpoint extends its authority from page-request generation to the Yandex account/auth/config generation that gives meaning to a path.

P0-074 already requires immutable Yandex operation context, so a new generic account-generation P-item would duplicate that contract. P1-178/P1-191 own how auth changes become current, not how a stale folder picker consumes the result.

No new P-number is justified.

## Test / release state

Documentation only. Product tests were not rerun. Historical evidence remains **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. Runtime version remains `0.9.8`; no build/tag/Release was created.
