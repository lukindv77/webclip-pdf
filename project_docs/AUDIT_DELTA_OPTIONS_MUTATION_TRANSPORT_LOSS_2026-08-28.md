# Audit delta — Options/popup privileged mutation transport-loss reconciliation — 2026-08-28

Source-of-truth `main` immediately before this write: `e00c0324a2eb2083b219d95bf9e2b8add78d2997`.

Docs-only audit checkpoint. Production runtime, tests, configuration and `manifest.json` are unchanged. No new P-number is assigned.

## Classification

Fresh source audit extends existing **P1-210 — user-facing outer runtime response loss / durable operation-state reconciliation** from PDF/Save-As/Journal destructive flows into the privileged mutation surface of `options.js` and the popup.

The root cause is the same: a rejected/timed-out page↔worker result means only that the page did not receive authoritative settlement. Current UI commonly turns that into an ordinary error and re-enables the same action, even when the worker may already have committed durable auth/config/log state or admitted browser/remote side effects.

This checkpoint does not replace subsystem owners:

- **P1-178/P1-191** retain OAuth/manual-auth generation and replacement correctness;
- **P0-074/P0-073** retain Yandex auth/account/root operation-generation identity;
- **P0-078** retains privacy-sensitive public-link policy generation;
- **P1-197/P1-205/P1-173** retain OperationLog history epoch, cleanup/write ordering and queued-write admission;
- **P1-008** retains settings-import durable marker/reconciliation generation;
- **P1-124** retains exact `tabs.create()` actual-settlement receipt;
- **P1-198** remains the worker-issued live operation receipt prerequisite.

P1-210 owns the extension-page result boundary: **after response loss, what may the page claim and may it start a new mutation generation before durable state is reconciled?**

## Common Options UI behavior

`options.js::runBusy(button, fn)` disables the control only while `fn()` is awaited. On any thrown/rejected error it calls `showMessage(error, 'error')`; in `finally` it restores the previous `button.disabled` state.

Therefore every mutation below follows the same outer-loss shape unless the handler adds its own reconciliation:

1. user starts mutation A;
2. worker may commit/admit A;
3. page loses the response or its wait rejects;
4. `runBusy` displays ordinary failure and re-enables the control;
5. a new click can issue mutation B without proving what A did.

Structured worker states such as `pending`, `reconciliationPending`, or generation-specific errors help only when the structured response reaches the page. They do not classify an outer `runtime.sendMessage()` rejection.

## OAuth start — pending PKCE + browser tab can exist after page reports failure

### Current worker ordering

`startYandexOAuth()` builds PKCE state, writes `yandexOAuthPending` into `chrome.storage.session`, persists the Client ID/config path, and then opens the authorization URL through `createTabNextTo(...)`. Only after those steps settle does the worker return success to Options.

The existing `createTabNextTo`/`tabs.create()` settlement machinery is a positive control at the browser-side owner boundary, but Options receives no durable OAuth operation receipt that lets it reconcile a lost outer result.

### Current Options behavior

`startAuth` directly awaits `WEBCLIP_YANDEX_START_AUTH` inside `runBusy`. If the outer response is lost, the button is re-enabled and the page renders an error even though:

- `yandexOAuthPending` may already exist;
- the OAuth browser tab may already have opened;
- P1-124 may still have an actual-settlement receipt for the tab creation.

A second click creates a new PKCE state/pending generation and another authorization URL. The first visible OAuth tab may then hold a verification flow bound to obsolete pending state.

### Required composition

- P1-178 must own exact pending-auth generation/CAS/tombstone semantics;
- P1-124 must retain exact browser tab creation reconciliation;
- P1-210 must prevent the Options page from equating lost response with `start did not happen` and blindly starting a new auth generation.

After outer loss the page should refresh/reconcile current pending-auth generation and browser-side receipt. A fresh start is allowed only after the old generation is authoritatively absent/expired/abandoned under explicit policy.

## OAuth finish — auth can be committed while the page still displays the verification code and an error

`finishYandexOAuth()` reads the current pending PKCE state, exchanges the verification code, writes completed Yandex config/auth state, removes `yandexOAuthPending`, and then performs ancillary account-info enrichment.

Options only clears `confirmationCode.value` **after** it receives and accepts the worker response.

A deterministic outer-loss schedule exists:

1. finish A exchanges the code successfully;
2. worker commits auth/config and removes pending PKCE;
3. response channel is lost before Options receives success;
4. Options shows an error, leaves the verification code in the input and re-enables `finishAuth`;
5. user retries the same code;
6. the second call sees no matching pending PKCE / may receive a provider-side consumed-code failure, while auth from A may already be current.

This can present a false failed-auth story while durable auth is connected, and it can encourage the user to start a second OAuth generation unnecessarily.

Required P1-210 behavior: outer loss must transition to `authorization result unknown`; immediately reconcile current auth + pending generation before offering `Finish` or `Start again`. P1-178 remains responsible for stale ancillary writes and generation fencing.

## Manual token replacement and Disconnect

`useManualToken` and `disconnect` are also direct `runtime.sendMessage()` mutations under `runBusy`.

For manual token, the worker may have published/validated/replaced auth before the page loses the result. For Disconnect, the worker may already have removed current auth and pending PKCE before the page receives success.

Current UI nevertheless reports generic error and re-enables the same action. The next action can therefore be based on stale page state.

This checkpoint does not duplicate P1-191/P1-178. Their state-machine rules decide which auth generation is valid. P1-210 requires Options to **fresh-read that state after unknown result before it presents a retry/replacement decision**.

## Root/config mutation — remote structure side effects may already have happened

`saveRoot(path)` sends `WEBCLIP_YANDEX_SAVE_ROOT`. The worker config operation is multi-step: root/config state can commit and, when auth is present, service-folder verification/creation can occur remotely.

P0-074 already proves that these multi-step operations need immutable config generation. Outer response loss adds a UI boundary:

- Options may report root save failed and re-enable Save;
- A may already be the durable root or may have created folders;
- retry B can run under a newer current root/config generation.

The page must reconcile current root/config generation and structure-verification result rather than treating response loss as proof that A did nothing.

## Public-link privacy toggle — DOM state can falsely imply a privacy policy commit

The `publicLinksEnabled` checkbox mutates `createPublicLinks` on its `change` event:

`WEBCLIP_YANDEX_SAVE_PREFERENCES { createPublicLinks: publicLinksEnabled.checked }`.

The browser changes the checkbox's visible checked state **before** the async handler runs. On outer rejection `runBusy` reports an error but does not restore or fresh-read the durable value.

Therefore after a transport loss the page can visibly show:

- **unchecked / public link creation disabled**, while durable config may still be enabled; or
- checked while durable config may already have been disabled.

For the `true -> false` privacy case this is stronger than ordinary retry UX: the user can be shown a visual disabled state without a proven P0-078 policy-generation commit.

Required contract:

1. after any unknown save result, mark the control state unverified;
2. fresh-read exact current Yandex config/privacy generation;
3. render the checkbox only from that reconciled durable state;
4. do not authorize/not-authorize publication from the stale Options DOM;
5. an old in-flight save operation still obeys P0-078 publication-generation rules independently.

## Backup scheduler settings

The backup settings action sends `WEBCLIP_JOURNAL_BACKUP_SAVE_SETTINGS` and only after success renders the returned state.

If the outer response is lost, durable Yandex config and Chrome alarm/scheduler reconciliation may already have progressed. Generic error + re-enabled Save allows another settings generation without first determining whether the prior alarm/config mutation settled.

The precise scheduler/alarm ownership remains with the existing backup/settings generation items. P1-210 adds only the page-side settlement rule: read/reconcile current settings/alarm-derived status before another mutation after unknown outer result.

## User-settings import — structured `pending` state is bypassed by outer transport loss

The worker import path already has a useful inner-state contract: when the underlying Chrome Storage mutation times out/has unresolved settlement but the response reaches Options, it can return `pending` / `reconciliationPending`; Options then explicitly warns the user not to repeat the import.

However `options.js` wraps the entire `WEBCLIP_USER_SETTINGS_IMPORT` call in an ordinary try/catch. If the **outer** message result is lost after the bundled settings+marker write was admitted or committed:

- the page never sees `pending` or `reconciliationPending`;
- it renders an ordinary error;
- it re-enables Import;
- the same file can be imported again as a new import/reconciliation generation.

This is a direct P1-210 manifestation composing with P1-008. The durable `importId`/marker generation required by P1-008 should also be the authoritative status source used by page reconciliation after response loss.

## OperationLog Clear — repeated clear is not semantically idempotent when new logs appear between attempts

`clearOperationLogs` asks for browser `confirm(...)`, then sends `WEBCLIP_OPERATION_LOG_CLEAR` under `runBusy`.

The current worker clear waits for the snapshot of `operationLogWriteChains`, clears those in-memory chains and clears the OperationLog stores. P1-197 already requires a durable history epoch because old writers can otherwise recreate history.

Outer response loss adds a user-visible destructive race:

1. user confirms clear A;
2. A commits the destructive clear/history transition but its response is lost;
3. Options reports error and re-enables `Clear logs`;
4. new operations/logs are created after A;
5. user, believing A failed, confirms clear B;
6. B deletes the **new logs created after A**.

Thus "retry clear" is not harmless idempotency. The action set changed between generations.

Required composition:

- P1-197: clear returns/advances a durable log history epoch/receipt;
- P1-210: after response loss, Options reads current history epoch/clear settlement and does not offer a blind second destructive clear;
- if the user explicitly chooses to clear the newer epoch too, that is a new separately confirmed action, not an automatic retry of A.

## OperationLog retention setting

`WEBCLIP_OPERATION_LOG_SETTINGS_SAVE` is lower severity because writing the same retention value is mostly convergent, but outer loss still leaves the page without authoritative truth about which value committed and whether cleanup was triggered under that generation.

Required behavior is refresh-before-retry: read current durable settings and current log epoch/cleanup state before rendering success/failure or issuing another value-changing generation.

## Yandex folder creation

`WEBCLIP_YANDEX_CREATE_FOLDER` may issue remote `PUT /resources` before the page receives its response. An outer rejection causes the UI to preserve the entered name and allows another click.

Creation of the same exact folder path may be provider-convergent when the object is already a folder, but this must not be relied on as a generic transport-loss proof. The page should refresh the parent listing/metadata and reconcile the exact intended path before offering retry; namespace/auth generation remains P0-074/P0-073.

## Popup open-page actions — tabs.create actual settlement exists, but caller does not reconcile it

`popup.js::openJournal()` uses a bounded wait around `WEBCLIP_OPEN_JOURNAL_PAGE`. If the worker/browser creates the Journal tab but the outer popup result is lost, popup remains open with an error and the user can click again, potentially opening another Journal page.

The worker's P1-124 `tabs.create` settlement receipt is the correct physical browser-side building block, but the page-facing operation must expose/reconcile it after an outer result failure.

Settings/Auth-help popup actions close the popup in `finally`, so they do not expose the same immediate retry loop; their result may still be unknown, but duplicate user retry requires reopening the popup.

## Common P1-210 extension-page contract

### Three-state result semantics

Every privileged page mutation should distinguish:

1. authoritative application result received;
2. exact pre-admission failure proven;
3. outer result unknown -> reconcile durable/browser state.

Generic `catch -> error -> enable button` is not sufficient for state 3.

### Reconciliation sources

Use the owning subsystem's durable receipt/state, not page-local DOM and not OperationLog alone:

- auth/pending generation for OAuth/manual/disconnect;
- current Yandex config/root/privacy generation;
- settings-import marker/import generation;
- OperationLog history epoch;
- exact tab-create receipt for open-page actions;
- exact folder/object/namespace evidence where remote mutation is involved.

P1-198 should provide an immutable worker-issued operation receipt binding the page request to those subsystem receipts where a generic operation surface is useful.

### Retry policy

While A is unknown:

- ordinary button retry must not silently create B;
- show an explicit `result unknown / refresh current state` presentation;
- status refresh may be automatic once or user-triggered, but must be bounded/coalesced;
- if current state proves A committed, converge UI to that state;
- if current state proves A never crossed admission, fresh retry is safe;
- if the outcome remains unresolved, preserve unknown/manual-resolution semantics rather than inventing failure.

### Privacy/config controls

Controls that visually represent durable privacy/config state must render from reconciled durable generation after unknown writes. The DOM value that initiated a mutation is not evidence that the mutation committed.

## Required deterministic regressions

1. OAuth Start writes pending PKCE + opens authorization tab; outer response rejects -> Options does not start a second PKCE generation on ordinary retry until A is reconciled.
2. OAuth Start `tabs.create()` settles late after caller timeout -> page status resolves from exact P1-124/auth receipt instead of reporting definite failure.
3. OAuth Finish commits auth and removes pending; response lost -> Options detects connected/current generation and clears obsolete code UI; same verification code is not blindly resubmitted.
4. OAuth Finish failed before exchange/admission -> fresh retry remains available.
5. Manual-token replacement commits then response is lost -> Options refreshes current auth generation before another replacement.
6. Disconnect commits then response lost -> page converges to disconnected state instead of treating auth as still connected.
7. Root A commits/remote folder ensure starts, response lost -> Save does not start root generation B solely because the channel failed; current root/config generation is reconciled first.
8. `createPublicLinks true -> false` commit outcome unknown -> checkbox is explicitly unverified/fresh-read; it cannot visually claim disabled solely from local DOM state.
9. Same privacy toggle eventually proves current false -> checkbox renders false and old publication generations remain revoked per P0-078.
10. Backup settings commit/alarm reconciliation after response loss -> page reload/refresh shows actual durable settings and does not blind-repeat scheduler mutation.
11. User-settings import bundled write commits but response is lost -> page discovers exact import marker/generation and warns not to repeat; second import is not started blindly.
12. User-settings import proven pre-write failure -> fresh import remains allowed.
13. OperationLog clear A commits, response lost, new logs appear -> ordinary retry of A does not clear the new epoch; a second clear requires fresh explicit confirmation for the current epoch.
14. Retention-setting response lost -> current durable value is read before another settings mutation.
15. Yandex folder create commits but response lost -> parent refresh identifies existing intended folder before deciding retry; no blind duplicate remote mutation.
16. Journal tab creation succeeds but popup response is lost -> popup reconciles the exact tab-create/open operation rather than opening a duplicate page.
17. Reconciliation request itself times out -> state remains unknown; mutation is not automatically replayed.
18. OperationLog history may be pruned/cleared while subsystem durable reconciliation still works; logs are diagnostic, not correctness authority.
19. Incognito P0-045 boundary remains stricter: no contextual private-source persistent mutation is admitted merely because reconciliation exists.
20. All outstanding reconciliation/status reads remain bounded/coalesced and do not create an MV3 wake loop.

## Duplicate check / numbering

No new P-number is assigned.

- **P1-210** is the primary page-result/retry owner for all surfaces above.
- **P1-178/P1-191** retain auth generation/replacement.
- **P0-074/P0-073** retain Yandex operation namespace/generation.
- **P0-078** retains publication privacy authority.
- **P1-197** retains OperationLog clear/history epoch.
- **P1-008** retains settings-import marker generation.
- **P1-124** retains physical `tabs.create()` actual settlement.
- **P1-198** remains the shared operation receipt dependency.

This checkpoint intentionally does not allocate P1-211.

## Test / release state

No runtime/config/manifest changes were made. Product tests were not rerun. The last proven product gate remains historical **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. No build, tag or GitHub Release was created.
