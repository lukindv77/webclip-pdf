# Research family evidence — Yandex auth / config / immutable operation context / Settings UI

Family from `RESEARCH_DELTA_INDEX.md` section 2.

This document is a **lossless consolidation** of the detailed research deltas listed below. Current status and single-owner authority remain in `RESEARCH_REGISTRY.md`; this file preserves source proof, deterministic schedules, corrections, positive controls, acceptance cases and historical test/release interpretation.

Every retired source is embedded verbatim below and identified by its original filename plus SHA-256. Git history remains the secondary recovery path.

Primary owners from the navigation index: P0-074, P0-078, P1-157, P1-158, P1-165, P1-175, P1-178, P1-184, P1-195, P1-196, P1-210, P1-222, P1-223.

Retired source count: **24**.

## P-code coverage

P0-034, P0-045, P0-057, P0-063, P0-069, P0-073, P0-074, P0-078, P0-079, P1-008, P1-048, P1-090, P1-121, P1-124, P1-137, P1-138, P1-141, P1-145, P1-157, P1-158, P1-165, P1-173, P1-177, P1-178, P1-183, P1-184, P1-191, P1-194, P1-195, P1-196, P1-197, P1-198, P1-205, P1-206, P1-208, P1-209, P1-210, P1-211, P1-221, P1-222, P1-223, P2-012, P2-017, P2-020

## Source ledger

| Original delta | SHA-256 | P-codes mentioned | Original title |
|---|---|---|---|
| `RESEARCH_DELTA_OAUTH_COMPLETION_PARTIAL_COMMIT_RESULT_2026-08-28.md` | `97182ad5d7f7de58049fbd679a537fdf6bc2beb49735821015f7a1c24d688919` | P1-178, P1-196, P1-210, P1-211 | Research delta — OAuth completion partial-commit result — 2026-08-28 |
| `RESEARCH_DELTA_OAUTH_PRETAB_PENDING_ABORT_2026-08-28.md` | `916472b274f0890baf71a8ad739c2cd542646b923716c211c52b2cf782e09a83` | P1-124, P1-178 | Research delta — OAuth pending attempt when pre-tab preparation aborts — 2026-08-28 |
| `RESEARCH_DELTA_OAUTH_TAB_LATE_SUCCESS_PKCE_ROLLBACK_2026-08-28.md` | `3f80f74bbfc660cf78e23ad79e0be24779aa9f26b04e39d8eb07bde1dc684714` | P1-124, P1-178, P1-211 | Research delta — OAuth tab late success vs PKCE rollback — 2026-08-28 |
| `RESEARCH_DELTA_OPTIONS_CREATE_FOLDER_STALE_BROWSE_COMPLETION_2026-08-29.md` | `13e3a821f974c89880a7ebd10643a0c7021235080345522a69d06c6f14f1f267` | P1-222, P1-223 | Research delta — Create Folder completion must not supersede newer folder browsing — 2026-08-29 |
| `RESEARCH_DELTA_OPTIONS_MUTATION_COMPLETION_DRAFT_GENERATION_2026-08-29.md` | `b4b6a06100a4264c6e8bb07f4b74e5faa3cae668e615b780bf334d001673cfc3` | P1-178, P1-222 | Research delta — P1-222 mutation-completion parity for editable Options drafts — 2026-08-29 |
| `RESEARCH_DELTA_OPTIONS_MUTATION_TRANSPORT_LOSS_2026-08-28.md` | `31f62e55215ebeeb7343a7496510a913c19f1f35a1584be4ca65a26c64cd9ff6` | P0-045, P0-073, P0-074, P0-078, P1-008, P1-124, P1-173, P1-178, P1-191, P1-197, P1-198, P1-205, P1-210, P1-211 | Research delta — Options/popup privileged mutation transport-loss reconciliation — 2026-08-28 |
| `RESEARCH_DELTA_OPTIONS_READ_SINGLEFLIGHT_FRESHNESS_2026-08-28.md` | `a0c46a51df3ab39e9f912a51d27794bfe802f7145a78886cb85d33db9368c3d9` | P1-137, P1-138, P1-141, P1-145, P1-157, P1-158, P1-208, P1-209, P2-012 | Research delta — Options read-only single-flight freshness across mutations — 2026-08-28 |
| `RESEARCH_DELTA_OPTIONS_STATUS_REFRESH_FORM_EDIT_GENERATION_2026-08-29.md` | `894d82905bbaa63b2131aae9074c5312d057145bd5e7caf448ac929da83877cb` | P1-221, P1-222 | Research delta — Options status refresh must not overwrite newer form edits — 2026-08-29 |
| `RESEARCH_DELTA_SETTINGS_IMPORT_DIRECT_PAGE_LATE_SETTLEMENT_2026-08-28.md` | `421b01aaa690afcb7158ef9d36a6b298d2d89251a534d6ddc8fff2bc6bd8fc3b` | P1-008, P1-141, P1-157, P1-210, P1-211 | Research delta — settings import vs direct extension-page late settlement — 2026-08-28 |
| `RESEARCH_DELTA_SHARED_EXTENSION_PAGE_SETTINGS_COHERENCE_2026-08-28.md` | `b35ec5f8e91be9a60135264921d76b4163ff48322d774950bc2d8c81643b36ce` | P0-074, P0-078, P1-008, P1-121, P1-141, P1-157, P1-198, P1-206, P1-209, P1-210, P1-211 | Research delta — shared extension-page settings coherence / stale-form writes — 2026-08-28 |
| `RESEARCH_DELTA_USER_SETTINGS_MARKER_GENERATION_2026-08-27.md` | `71b45bc5b41338ed8ca0d99f20988455c3e97d1c2f32d26974c31adf005e711e` | P0-074, P0-078, P0-079, P1-008, P1-157, P1-198, P2-020 | Research delta — user-settings import marker generation — 2026-08-27 |
| `RESEARCH_DELTA_YANDEX_ACCOUNT_CACHE_GENERATION_2026-08-27.md` | `ea817e76d5f4d589746720b906e12d956fe7e47e81f4f1639f724c8a32c47428` | P0-073, P0-074, P1-178, P1-191, P1-196 | Research delta — Yandex account cache generation |
| `RESEARCH_DELTA_YANDEX_AUTH_CONFIG_WRITES_2026-08-27.md` | `846b838dffb6c946f86e03696e6c035cd24c9345606413aceb04706ca7cc5139` | P0-074, P1-138, P1-178, P1-191, P1-196, P1-197 | Yandex auth / config write research delta — 2026-08-27 |
| `RESEARCH_DELTA_YANDEX_CREATE_FOLDER_TRANSPORT_RECONCILIATION_2026-08-28.md` | `cc6aede917ad0a1f679f7e2fa2010fe3a3a69c88ad4985cd2b97165610043016` | P0-074, P1-157, P1-210 | Research delta — Yandex Create Folder transport-loss reconciliation — 2026-08-28 |
| `RESEARCH_DELTA_YANDEX_DISCONNECT_PARTIAL_COMMIT_2026-08-28.md` | `c7f0a34d9967f8051123c4243659f06572800390229dbab456505bd5532db7f9` | P0-074, P1-177, P1-178, P1-210 | Research delta — Yandex Disconnect is a partial-commit auth transition — 2026-08-28 |
| `RESEARCH_DELTA_YANDEX_FOLDER_PICKER_ACCOUNT_GENERATION_2026-08-28.md` | `81b6ef6cf254043751e5ad98f739557feae88be01773d8f5f2dee1605e35a714` | P0-074, P1-137, P1-157, P1-178, P1-191, P1-210, P1-211 | Research delta — Yandex folder picker account/auth generation authority — 2026-08-28 |
| `RESEARCH_DELTA_YANDEX_FOLDER_TREE_AUTH_GENERATION_2026-08-28.md` | `dd7ee555f96d1a4a9c018f32e3cea9a4c427a00903739375076238bec937ed62` | P0-074, P1-137, P1-157, P1-178, P1-191, P1-210 | Research delta — Yandex folder-tree creation must stay in one auth/account generation — 2026-08-28 |
| `RESEARCH_DELTA_YANDEX_MUTATION_RECOVERY_2026-08-27.md` | `0314b4f62ec491a57c4441b33f14bd0716dfb7ec292348910f73de58f6c0c959` | P0-069, P0-074, P0-078, P1-090, P1-177, P1-178, P1-183, P1-184, P1-194, P1-196, P1-197 | Yandex mutation / recovery research delta — 2026-08-27 |
| `RESEARCH_DELTA_YANDEX_MUTATION_TIMEOUT_UNKNOWN_SETTLEMENT_2026-08-28.md` | `5db4225055fc04aa2d2964f59af948d9cef895a3f67fd13738cb815c6ba34749` | P0-073, P0-074, P1-048, P1-184, P1-198, P1-210 | Research delta — Mutating Yandex API timeout is unknown remote settlement, not proven no-op — 2026-08-28 |
| `RESEARCH_DELTA_YANDEX_OAUTH_2026-08-26.md` | `c004b3157db82240640c699ea3ca17c38b4845e0cc620f2ca1c2ba07b4decf99` | P0-034, P0-057, P0-063, P0-074, P1-165, P1-178, P1-191, P1-194, P1-195, P1-196, P2-017 | Yandex OAuth research delta — 2026-08-26 |
| `RESEARCH_DELTA_YANDEX_ROOT_COMMIT_SCHEDULER_RECONCILIATION_2026-08-28.md` | `1b581db756bb7ae941ea94b75876adbf39fdaf3ef3ac723d02998aa6235dca59` | P0-074, P1-008, P1-177, P1-210 | Research delta — Yandex root commit must durably reconcile scheduler/structure — 2026-08-28 |
| `RESEARCH_DELTA_YANDEX_ROOT_SAVE_CROSS_TAB_RESULT_GENERATION_2026-08-28.md` | `5aa1225b874ff9dfaa85e259af07fd04cdcafbbafa5a1bee8aa528d1d7a453ac` | P0-074, P1-157, P1-177, P1-210 | Research delta — Save Root result can mix concurrent Yandex root generations — 2026-08-28 |
| `RESEARCH_DELTA_YANDEX_SINGLE_OPERATION_CONTEXT_COHERENCE_2026-08-28.md` | `a033a05c705ab7a53d17dd4a4dff7957b284a8393220991602957338c6c222e8` | P0-073, P0-074, P1-158, P1-178, P1-184, P1-191, P1-196 | Research delta — Yandex single-operation auth/root/account context coherence — 2026-08-28 |
| `RESEARCH_DELTA_YANDEX_TEST_CONNECTION_HIDDEN_PROVISIONING_2026-08-28.md` | `e6b295ac433a9118dc1b3b92494dc763d1e16a07b80de3d9a66a2b02d293fd73` | P0-074, P1-177, P1-195, P1-210 | Research delta — Yandex connection test should not hide remote provisioning — 2026-08-28 |

## Lossless source transcripts

The sections below preserve the original UTF-8 Markdown text verbatim. Historical statements remain evidence, not independent current status authority; `RESEARCH_REGISTRY.md` controls status/ownership.
## Retired source: `RESEARCH_DELTA_OAUTH_COMPLETION_PARTIAL_COMMIT_RESULT_2026-08-28.md`

SHA-256 of UTF-8 source text: `97182ad5d7f7de58049fbd679a537fdf6bc2beb49735821015f7a1c24d688919`

# Research delta — OAuth completion partial-commit result — 2026-08-28

## Scope

Docs-only research of `finishYandexOAuth()` after authorization-code exchange. No new P-number.

Refines **P1-178** auth-attempt generation and **P1-210** unknown/partial outer-result truthfulness. P1-196 validity semantics remain separate.

## Finding

A successful authorization-code exchange is followed by several independently fallible local/ancillary steps:

1. `exchangeAuthorizationCode(...)` returns an access token;
2. `updateYandexConfig()` persists Client ID;
3. `writeYandexAuth(yandexAuth)` persists the session auth capability;
4. pending PKCE state is removed;
5. account metadata is fetched and best-effort enriched;
6. `getYandexStatus()` is read for the response.

The current handler has no explicit commit-result state for those boundaries.

### Partial commit A — auth capability committed, pending cleanup fails

If step 3 succeeds but step 4 fails/times out:

- the new access token is already current in `chrome.storage.session`;
- `finishYandexOAuth()` throws instead of returning success;
- `yandexOAuthPending` may remain;
- the UI can present the attempt as failed and encourage the user to submit the same one-time verification code again;
- a second code exchange is not a valid reconciliation mechanism for a code already consumed by the provider.

This is a committed-auth / ancillary-cleanup-pending result, not an all-or-nothing failure.

### Partial commit B — token issued remotely, local commit fails

If the provider successfully issued/returned the token but Client-ID/auth storage cannot be durably committed, the authorization code has already crossed its one-time exchange boundary. Repeating the same code must not be represented as the expected recovery action.

The safe result is explicit local-commit failure requiring a fresh authorization attempt after storage health is restored.

### Unknown token-exchange settlement

A network timeout/lost response during the code exchange can also mean the provider consumed the code even though WebClip never received a usable token. Since WebClip cannot reconstruct an unknown access token, this class is not safely retried with the same code unless the provider's real documented semantics explicitly permit it.

This is analogous to non-cancellable/one-shot side-effect reasoning: lack of a local response is not proof that the remote one-time capability remained unused.

## Required result model

OAuth completion should expose distinct states such as:

- `exchange-not-started / validation-failed`;
- `exchange-outcome-unknown`;
- `token-received-local-commit-failed`;
- `auth-committed-reconciliation-pending`;
- `fully-reconciled`.

Once exact auth generation G is durably committed, later PKCE cleanup/status/account enrichment failure cannot make the UI claim “authorization failed”. It should report connected/auth-committed with a repairable ancillary warning and reconcile exact G.

Conversely, if no token was durably stored, WebClip must not claim connected merely because remote exchange may have succeeded.

## Generation requirements

- PKCE pending removal must compare/remove the exact attempt generation that produced G; a stale cleanup cannot remove a newer attempt.
- Account enrichment remains generation-fenced per P1-178; ancillary success from old G cannot overwrite newer auth H.
- A retry/reopen flow must first read current auth/pending generations before deciding whether another exchange is needed.
- An already committed G must not be overwritten merely because the original Finish RPC response was lost.

## Acceptance cases

1. Exchange + local auth commit + pending cleanup all succeed -> fully reconciled success.
2. Auth G commits, pending remove fails -> UI/status says G is connected with cleanup pending; same code is not blindly re-exchanged.
3. Token response received, auth storage fails -> no connected claim; user is told a fresh authorization attempt is required after local storage recovery.
4. Exchange response is unknown after timeout -> same code is not blindly auto-retried; attempt transitions to explicit unknown/fresh-auth-required policy.
5. Finish response channel is lost after G committed -> reopen/status reconciles G instead of starting another auth mutation.
6. New auth H supersedes G while old cleanup/account work finishes -> old work cannot clear/overwrite H.
7. Stale pending attempt A cannot be removed by cleanup belonging to committed attempt B unless identity proves A is the consumed predecessor.

## Classification

- **P1-178**: exact auth/pending generation and stale completion fencing.
- **P1-210**: truthful outer result after a mutation may already have committed.

No new P1-211 is allocated.

## Validation note

Documentation only. Product tests were not rerun. Historical 88/88 JS syntax + 74/74 deterministic PASS remains prior evidence. No build/tag/release.

## Retired source: `RESEARCH_DELTA_OAUTH_PRETAB_PENDING_ABORT_2026-08-28.md`

SHA-256 of UTF-8 source text: `916472b274f0890baf71a8ad739c2cd542646b923716c211c52b2cf782e09a83`

# Research delta — OAuth pending attempt when pre-tab preparation aborts — 2026-08-28

## Scope

Docs-only research of the `startYandexOAuth()` preparation sequence before browser tab creation. No new P-number.

Refines **P1-178** pending-auth generation ownership and complements the separate late-`tabs.create()` PKCE rollback delta from this session.

## Finding

The current start sequence is:

1. generate OAuth `state` + PKCE verifier/challenge;
2. persist `yandexOAuthPending` in `chrome.storage.session`;
3. `await updateYandexConfig(...clientId...)`;
4. only after that, call `createTabNextTo(...oauthUrl...)`;
5. the existing cleanup catch surrounds the tab-create stage, not the earlier config-write stage.

Therefore a failure/timeout from step 3 leaves the exact pending PKCE attempt alive even though the code path that could open its OAuth tab was never reached.

### Deterministic schedule

1. Attempt A stores pending `{clientId, verifier, state, expiresAt}`.
2. `updateYandexConfig(clientId=A)` rejects or the caller hits its bounded timeout.
3. Control unwinds out of `startYandexOAuth()` before `createTabNextTo()` is invoked.
4. No OAuth tab for A can be created by this invocation, because the browser side-effect call was never admitted.
5. Pending A remains in session storage until its 10-minute expiry or another auth flow changes it.
6. `getYandexStatus()` can report `authPending:true`, while the visible Start Auth action returned an error and no authorization page exists for A.

This is the mirror image of the late-tab case:

- **after tab admission, unknown create settlement must retain PKCE** because the browser tab may exist;
- **before tab admission, a terminated preparation must not leave PKCE classified as an active browser authorization attempt** when the flow is proven unable to continue.

## Timeout nuance

`updateYandexConfig()` is an actual-settlement serialized mutation. A local timeout does not cancel its underlying storage write, but it **does** terminate this `startYandexOAuth()` continuation: the function will not later resume and call `tabs.create()` after the rejected bounded await.

Therefore two facts must be tracked separately:

- config mutation settlement may still be unknown/late;
- OAuth-tab admission for attempt A is definitively **not started** by this invocation.

The pending-attempt state should reflect the latter without pretending the config write was cancelled.

## Required contract

`yandexOAuthPending` needs an explicit attempt generation/phase, for example:

- `preparing`;
- `tab-create-admitted/unknown`;
- `tab-open/reconcilable`;
- `consumed/expired/aborted`.

If a pre-tab prerequisite fails:

- compare-and-retire only exact attempt A;
- do not remove a newer pending B that may have superseded A;
- preserve truthful config mutation settlement separately;
- status must not call A `authPending` as though the user can finish it through a browser page that was never opened.

If product wants to let the user retry opening the same A after config settles, that must be an explicit reconciliation action tied to A's receipt, not accidental retention of an undifferentiated pending object.

## Acceptance cases

1. Pending A stored -> config write succeeds -> tab create begins -> A advances to the tab-admitted lifecycle.
2. Config write proves failure -> exact A is retired; no phantom `authPending:true`.
3. Config write caller times out but actual write later succeeds -> A's tab phase remains not-started; no hidden late `tabs.create()` is possible.
4. Attempt B replaces A before A cleanup -> stale A cleanup cannot remove B.
5. Worker dies after pending A but before/during config prerequisite -> restart sees explicit preparation phase and applies bounded abort/reconcile policy rather than assuming a browser OAuth page exists.
6. Once `tabs.create()` is actually admitted, the separate P1-124/P1-178 late-create rule applies and PKCE is retained until exact create reconciliation/expiry.
7. PKCE verifier remains session-only and is never placed in browser-visible URLs/logs.

## Classification

No new blocker. **P1-178** remains the owner of pending OAuth attempt generation/state transitions. P1-124 begins only when browser tab creation is actually admitted.

## Validation note

Documentation only. Runtime/tests/manifest unchanged. Product tests were not rerun; historical 88/88 JS syntax + 74/74 deterministic PASS remains prior evidence. No build/tag/release.

## Retired source: `RESEARCH_DELTA_OAUTH_TAB_LATE_SUCCESS_PKCE_ROLLBACK_2026-08-28.md`

SHA-256 of UTF-8 source text: `3f80f74bbfc660cf78e23ad79e0be24779aa9f26b04e39d8eb07bde1dc684714`

# Research delta — OAuth tab late success vs PKCE rollback — 2026-08-28

## Scope

Docs-only continuation of the Yandex OAuth / Chrome tab-create lifecycle research on current `main`.

No new P-number is assigned. This delta refines **P1-124** (non-cancellable `tabs.create()` settlement across MV3 lifetime) and the existing Yandex auth-attempt generation contract around **P1-178**.

## Finding

`startYandexOAuth()` creates the authorization attempt in this order:

1. generate `state`, PKCE verifier/challenge and expiry;
2. durably write `yandexOAuthPending` into `chrome.storage.session`;
3. save configured Client ID;
4. call `createTabNextTo(sourceTabId, oauthUrl, true)`;
5. on **any** thrown result from that create call, remove `yandexOAuthPending` and throw an error.

The rollback assumes a rejected bounded wrapper means the browser did not create the tab. That assumption is false for local timeout / unknown settlement.

`createChromeTabBounded()` correctly acknowledges that `chrome.tabs.create()` is non-cancellable: after its 10-second local deadline, the underlying Promise remains alive and a late-success receipt is retained in module memory. But `startYandexOAuth()` catches the local pending/timeout error immediately and deletes the PKCE authority that the possibly-late browser tab requires.

### Deterministic schedule

1. OAuth attempt A persists pending receipt `{clientId, verifier, state, expiresAt}`.
2. `tabs.create(OAuth-A)` is issued.
3. WebClip's bounded caller wait expires before the actual Chrome Promise settles.
4. `startYandexOAuth()` catches the error and removes pending receipt A.
5. Chrome then completes the original non-cancellable create and displays OAuth-A to the user.
6. User finishes authorization and obtains a verification code for A.
7. `finishYandexOAuth()` cannot consume it because `yandexOAuthPending` was rolled back; the verifier/state generation needed for the code exchange is gone.

A worker restart can make the situation worse because P1-124's current late-create receipt is module-memory only, while the browser tab survives.

This is not merely a duplicate-tab problem: the late browser side effect has become **detached from its cryptographic authorization capability**.

## Required contract

### Distinguish proven create failure from unknown settlement

Rollback of `yandexOAuthPending` is allowed only when the exact `tabs.create()` attempt is proven to have failed before creating a usable OAuth tab.

For local timeout / worker loss / unknown actual settlement:

- retain pending PKCE receipt A until reconciliation/expiry;
- mark the create result `unknown/pending` rather than `failed`;
- do not issue a second OAuth-attempt generation merely because the UI lost the create result;
- reconcile exact tab-create generation through the P1-124 durable receipt design.

### Bind tab-create intent to auth-attempt generation

The browser-visible OAuth URL already contains A's random OAuth `state`. The tab-create intent should reference the same locally issued auth generation (without persisting secrets in tab metadata).

A reconciled late tab must prove it belongs to A; an unrelated OAuth tab or old Options tab is not evidence.

### Keep PKCE secrets session-only

This repair must not weaken the existing secret boundary. The code verifier remains in trusted `chrome.storage.session`, not URL/query/OperationLog. Browser-visible `state` may correlate the public tab to the secret-bearing local attempt receipt.

## Acceptance cases

1. Normal create success -> A remains pending and `finishYandexOAuth()` can exchange its code.
2. Proven synchronous/browser create failure -> A may be rolled back.
3. Local create timeout followed by late Chrome success -> A remains consumable; no orphan authorization page.
4. Worker termination after create admission but before result -> new worker reconciles A and cannot blindly start B.
5. User explicitly starts a genuinely new OAuth attempt B -> B supersession of A follows an explicit auth-generation policy; a late A tab cannot consume B's verifier.
6. A expires while create outcome remains unresolved -> expiry cleanup may retire A, but only by the established PKCE expiry policy, not by equating timeout with cancellation.
7. No PKCE verifier/code is added to URLs, logs or durable persistent storage.

## Classification

- **P1-124** owns exact `tabs.create()` unknown-settlement/restart reconciliation.
- **P1-178** owns Yandex auth/config/pending attempt generation and stale completion ordering.

No new P1-211 is needed.

## Validation note

Documentation only. Runtime/tests/manifest are unchanged. Product tests were not rerun; historical gate remains 88/88 JavaScript syntax + 74/74 deterministic tests PASS. No build/tag/release was created.

## Retired source: `RESEARCH_DELTA_OPTIONS_CREATE_FOLDER_STALE_BROWSE_COMPLETION_2026-08-29.md`

SHA-256 of UTF-8 source text: `13e3a821f974c89880a7ebd10643a0c7021235080345522a69d06c6f14f1f267`

# Research delta — Create Folder completion must not supersede newer folder browsing — 2026-08-29

Baseline `main` before this write: `1a38f3b03a682c951f5ee586e2207339278e6ccc`.

Docs-only research checkpoint. Runtime, tests, manifest, build, tag and Release are unchanged.

## Classification

**New P1-223 — late Create Folder completion can start a stale folder reload that supersedes a newer user browse intent.**

Remote mutation target capture is not the problem here: the create request correctly builds `path` before awaiting. The defect is the later UI refresh authority.

## Source proof

`options.js` folder navigation uses `folderBrowseGeneration`; `loadFolders(path)` increments it and rejects late older list responses. This correctly implements latest-navigation-wins for list requests.

Folder-row buttons call:

```js
button.addEventListener('click', () => loadFolders(folder.path));
```

`WEBCLIP_YANDEX_CREATE_FOLDER` captures the target path before await:

```js
const path = joinPath(currentBrowsePath, name);
const response = await chrome.runtime.sendMessage({
  type: 'WEBCLIP_YANDEX_CREATE_FOLDER',
  path
});
requireOk(response);
newFolderName.value = '';
await loadFolders(currentBrowsePath);
```

The post-create reload does not capture/validate the browse generation or the browse path that was current when create began.

## Deterministic race

1. User is viewing folder A; `currentBrowsePath === A`.
2. User starts Create Folder `A/X`; remote mutation is now in flight.
3. User clicks folder B. `loadFolders(B)` starts a newer browse generation, but until its response commits, `currentBrowsePath` may still be A.
4. Create `A/X` settles successfully first.
5. Create handler executes `loadFolders(currentBrowsePath)` and therefore starts a **newer** list generation for A.
6. The pending user navigation B becomes stale by generation and is discarded.
7. UI remains/returns at A even though B was the newer user navigation intent.

The physical create still occurred in A, so this must not be "fixed" by retargeting the create operation to B. Only the post-mutation UI refresh needs proper intent fencing.

## Required contract

Create Folder should capture both:

- immutable mutation target context/path for the remote operation;
- browse generation/path at admission only for deciding whether a post-success refresh is still relevant.

After create settles:

- if the user has not navigated since admission, refresh the admitted parent folder;
- if a newer browse generation exists, do **not** start a stale reload of the old folder;
- optionally refresh/cache the old folder out of band only if it cannot mutate current UI/navigation generation;
- success feedback should identify the actual created path from the operation receipt, not infer success location from current browse state.

Unknown settlement/reconciliation of the Yandex create itself remains governed by the existing Create Folder mutation owner; P1-223 is only the extension-page presentation/navigation race after a verified result.

## Required regressions

1. Create in A, no navigation -> A refreshes and shows new folder.
2. Create in A, user starts B navigation before create settles -> B remains the winning navigation.
3. B list settles before create -> create success does not send UI back to A.
4. Create fails after user navigated -> error may be shown but does not mutate browse path/list generation.
5. Create result is unknown/reconciled later -> no stale navigation reload is injected into current browser state.
6. Two browse requests still retain existing latest-generation semantics.

## Duplicate check / numbering

Repository search for Create Folder + `currentBrowsePath` + browse-generation/stale completion found no existing dedicated research item. Existing folder listing generation protects request-vs-request order; existing Yandex Create Folder reconciliation/auth-generation owners protect the remote mutation. Neither protects newer user navigation from a late mutation-completion refresh.

Current repository search found no `P1-223`; P1-222 is the latest assigned owner on current `main`. Therefore this checkpoint assigns **P1-223**.

## Validation state

Documentation only. Historical 88/88 syntax + 74/74 deterministic PASS were not rerun for this HEAD.

## Retired source: `RESEARCH_DELTA_OPTIONS_MUTATION_COMPLETION_DRAFT_GENERATION_2026-08-29.md`

SHA-256 of UTF-8 source text: `b4b6a06100a4264c6e8bb07f4b74e5faa3cae668e615b780bf334d001673cfc3`

# Research delta — P1-222 mutation-completion parity for editable Options drafts — 2026-08-29

Baseline `main` before this write: `c785b7f1c41f569b45c82512e73606ce8edd70e1`.

Docs-only research checkpoint. Runtime/tests/manifest/build/release are unchanged.

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

This is the same local user-draft generation root cause already assigned to P1-222 in the immediately preceding research. Existing Yandex auth/root owners govern remote/local commit truth, not whether an extension-page input typed later may be overwritten by an older completion.

## Validation state

Documentation only. Historical 88/88 syntax and 74/74 deterministic test results were not rerun for this HEAD.

## Retired source: `RESEARCH_DELTA_OPTIONS_MUTATION_TRANSPORT_LOSS_2026-08-28.md`

SHA-256 of UTF-8 source text: `31f62e55215ebeeb7343a7496510a913c19f1f35a1584be4ca65a26c64cd9ff6`

# Research delta — Options/popup privileged mutation transport-loss reconciliation — 2026-08-28

Source-of-truth `main` immediately before this write: `e00c0324a2eb2083b219d95bf9e2b8add78d2997`.

Docs-only research checkpoint. Production runtime, tests, configuration and `manifest.json` are unchanged. No new P-number is assigned.

## Classification

Fresh source research extends existing **P1-210 — user-facing outer runtime response loss / durable operation-state reconciliation** from PDF/Save-As/Journal destructive flows into the privileged mutation surface of `options.js` and the popup.

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

## Retired source: `RESEARCH_DELTA_OPTIONS_READ_SINGLEFLIGHT_FRESHNESS_2026-08-28.md`

SHA-256 of UTF-8 source text: `a0c46a51df3ab39e9f912a51d27794bfe802f7145a78886cb85d33db9368c3d9`

# Research delta — Options read-only single-flight freshness across mutations — 2026-08-28

Source-of-truth `main` immediately before this write: `4c664fe31a17493d7ce62828d0520cef751e9e14`.

Docs-only research checkpoint. Production runtime, configuration, tests and `manifest.json` are unchanged.

## Classification

No new P-number is assigned.

Fresh source proof **reopens/refines existing P1-141**. P1-141 correctly prevents repeated identical read-only `runtime.sendMessage` calls from accumulating multiple unresolved underlying RPCs after a local UI timeout. However its current assumption that a late read response is safe because logical callers are generation-fenced is incomplete when the same unresolved actual Promise is deliberately reused by a **new post-mutation refresh generation**.

Adjacent owners remain:

- P1-137 — folder-picker out-of-order navigation generation;
- P1-138 — bounded read-only extension-page RPC deadlines;
- P1-145 — OperationLog detail latest-wins queue/admission;
- P1-157 — extension-page Chrome API/mutation centralization;
- P1-158 — service-worker prerequisite Chrome read admission;
- P2-012 — OperationLog visible stale-response fencing.

The root cause here is specific to **single-flight read result freshness across a mutation epoch**.

## Current helper

Options keeps:

`const readOnlyRuntimeInFlight = new Map();`

For a read message it computes a JSON key. `getReadOnlyRuntimeMessageActual(message)`:

1. returns the existing Promise when the same key is already present;
2. otherwise starts exactly one `chrome.runtime.sendMessage(message)`;
3. keeps that Promise in the map until its **actual settlement**, even if one logical caller already timed out;
4. caps distinct unresolved reads at four.

This is valuable resource/admission behavior and must be preserved.

## Existing generation fencing

Visible refresh functions also create logical generations, for example:

`refreshStatus()` -> `const generation = ++yandexStatusGeneration`.

After awaiting the status it applies the result only when:

`generation === yandexStatusGeneration`.

Similar latest-response guards exist for backup status, folder navigation and OperationLog list/detail.

Those guards correctly reject a response belonging to an older **logical caller** when a newer caller started a different actual request.

They do not prove that the actual Promise used by the newer caller observed state after a mutation.

## Deterministic stale-snapshot schedule

### Yandex/status example

1. Options starts status read A (`WEBCLIP_YANDEX_STATUS`). It becomes the in-flight Promise for that message key.
2. Worker begins A and obtains some pre-mutation state A, but the handler/transport remains unresolved because another prerequisite is delayed.
3. User performs a settings mutation/import B that commits newer Yandex/user-settings state.
4. UI now calls `refreshStatus()` after B and increments `yandexStatusGeneration` to a newer logical generation.
5. `getReadOnlyRuntimeMessageActual()` sees A still unresolved and deliberately returns **the same actual A** instead of starting a new read.
6. A eventually settles with the snapshot it observed before B.
7. The original logical refresh that started A is rejected by generation mismatch.
8. The **new post-B refresh**, however, is awaiting the same A and its generation is current, so it accepts the stale pre-B response as though it were a fresh read.

Generation fencing has therefore converted a stale underlying snapshot into the result of the newest logical generation.

### Why this schedule is realistic

`WEBCLIP_YANDEX_STATUS` is not a single synchronous storage read; it composes multiple asynchronous auth/config/session reads. One component can observe old config before B while another component keeps the handler pending long enough for B to settle.

The problem does not require caller timeout; any overlapping unresolved identical read can be reused. Local timeout simply makes the long-lived actual more obvious and was the original reason for P1-141 single-flight retention.

## Broader affected Options reads

The same shared helper is used for:

- `WEBCLIP_YANDEX_STATUS`;
- `WEBCLIP_YANDEX_LIST_FOLDERS`;
- `WEBCLIP_JOURNAL_BACKUP_STATUS`;
- `WEBCLIP_OPERATION_LOG_SETTINGS_GET`;
- `WEBCLIP_OPERATION_LOG_LIST`;
- `WEBCLIP_STORAGE_HEALTH`.

Not every call has an equally strong mutation schedule, but the helper provides no mutation epoch/invalidation contract for any of them.

Examples:

- settings import or Yandex preference/root mutation -> post-mutation status refresh;
- backup settings mutation -> post-mutation backup-status refresh;
- OperationLog retention/clear mutation -> post-mutation list/settings refresh;
- `navigator.storage.persist()` -> post-action storage-health refresh.

Folder navigation already blocks create/save while a folder-list transition is active (P1-137 positive control), reducing this particular schedule there, but the generic helper still lacks a semantic freshness boundary.

## Why logical generation is insufficient

A UI generation number answers:

> Is this response associated with the newest logical request I care about?

It does **not** answer:

> Did the underlying read begin/observe state after the mutation that caused this refresh?

When a new logical request intentionally reuses an old actual Promise, those are different questions.

The current architecture tracks only the first.

## Why this is P1-141, not a new item

P1-141 specifically owns the choice to retain and reuse identical unresolved read RPCs until actual settlement so local timeout cannot create an unbounded stack of message channels/worker reads.

The freshness defect is a direct missing acceptance condition of that reuse policy. Creating a separate item would split one single-flight contract into resource and semantic halves.

The correct refinement is:

**same actual may be reused only while it is valid for the caller's required read epoch.**

## Required P1-141 refinement

### Preserve actual-settlement single-flight

Do not "fix" this by deleting the map entry at local timeout and launching another identical underlying RPC. That would regress the original P1-141 admission guarantee.

The old actual must remain tracked until actual settlement.

### Add read/mutation epoch

Each coalescible read key needs enough semantic versioning to decide whether an existing actual is fresh enough for a new logical caller.

Acceptable shapes include:

- per-domain mutation epochs (`yandexConfig`, backup settings/state, OperationLog, storage persistence);
- a general monotonically increasing Options read epoch incremented on relevant mutation completion/unknown-settlement transition;
- worker-issued state revisions included in responses and required by subsequent refreshes;
- explicit invalidation that marks the old actual **non-reusable** while still keeping it tracked for resource accounting until settlement.

A new post-mutation read may start a second actual only if admission budget permits and the old one remains separately tracked as stale/unresolved. In other words, "do not reuse" must not mean "forget the unresolved channel".

### Unknown mutation settlement

If a mutation times out after its physical write may have started, the UI must not assume either old or new state. A refresh should request/reconcile a state revision after the mutation's actual settlement or expose pending/unknown semantics according to the mutation owner.

Do not assign a fresh epoch merely from a local timeout if the underlying write is still ambiguous.

### Response provenance

Where practical, read responses should include a state/version receipt that allows the UI to know what they observed. A logical generation remains useful for render ordering, but it is not a substitute for state provenance.

## Required deterministic regressions

1. Status actual A observes Yandex config A and remains pending; settings mutation B commits; post-B refresh must not accept A as current status.
2. Old A remains counted in `readOnlyRuntimeInFlight` until actual settlement; fix does not create unbounded retries after timeout.
3. Post-B refresh either waits for/reconciles a sufficiently fresh read or starts a separately budgeted actual B; visible UI eventually reflects B.
4. Original logical caller A cannot repaint after a newer caller, preserving existing generation behavior.
5. Backup status read A overlaps backup-settings mutation B; post-B status does not reuse stale A as fresh.
6. OperationLog list/settings read A overlaps clear/retention mutation B; post-B refresh cannot publish pre-B list/settings solely because the new logical generation reused A.
7. Storage-health A overlaps a successful persistence request; post-action health refresh does not knowingly relabel old A as post-action truth.
8. A mutation whose settlement is unknown does not cause blind read-cache invalidation plus unlimited duplicate RPCs; pending/actual-settlement semantics remain bounded.
9. Four distinct unresolved read keys still enforce the existing global cap.
10. Repeated logical refreshes with no intervening relevant mutation may continue to share one actual safely.
11. Folder-picker P1-137 transition fencing remains intact; this change does not weaken its controls.
12. OperationLog detail P1-145 one-active+one-latest queue remains independently bounded.

## Positive controls retained

- Read-only UI callers have local deadlines (P1-138).
- Actual identical runtime reads remain single-flight across mere UI timeout (P1-141).
- Visible stale caller responses remain logical-generation fenced.
- This research does not require caching read results after settlement; it only constrains reuse of still-unresolved actuals.

## Number allocation

No new number. **P1-141** is reopened/refined by this checkpoint. Evidence-reserved P1-208 and P1-209 remain separate.

## Test / release state

Research documentation only. Runtime/configuration/manifest unchanged. Product tests were not rerun; historical gate remains **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. Runtime version remains `0.9.8`. No build, tag or Release was created.

## Retired source: `RESEARCH_DELTA_OPTIONS_STATUS_REFRESH_FORM_EDIT_GENERATION_2026-08-29.md`

SHA-256 of UTF-8 source text: `894d82905bbaa63b2131aae9074c5312d057145bd5e7caf448ac929da83877cb`

# Research delta — Options status refresh must not overwrite newer form edits — 2026-08-29

Baseline `main` before this write: `34662f2325f2ca9e6029343f8dab45e7c2927d4a`.

Docs-only research checkpoint. Runtime, manifest, tests, build, tag and Release are unchanged.

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

Repository search for Options `refreshStatus`, stale form edit overwrite, `clientId/rootPath/publicLinks` edit generation found no existing dedicated research owner. Existing Yandex config/auth owners govern commit/account generation and partial settlement; existing UI generation fencing governs refresh-vs-refresh ordering. Neither protects a newer local draft from an older read.

Current repository search found no `P1-222`; P1-221 is the latest assigned owner on current `main`. Therefore this checkpoint assigns **P1-222**.

## Validation state

Documentation only. Historical 88/88 syntax + 74/74 deterministic PASS were not rerun for this HEAD.

## Retired source: `RESEARCH_DELTA_SETTINGS_IMPORT_DIRECT_PAGE_LATE_SETTLEMENT_2026-08-28.md`

SHA-256 of UTF-8 source text: `421b01aaa690afcb7158ef9d36a6b298d2d89251a534d6ddc8fff2bc6bd8fc3b`

# Research delta — settings import vs direct extension-page late settlement — 2026-08-28

Source-of-truth `main` immediately before this write: `d360b532c37b70a759b6701a12c6482ae14733dd`.

Docs-only research checkpoint. Runtime/configuration/tests/manifest are unchanged. No new P-number is assigned.

## Classification

Fresh source proof refines existing **P1-157** shared-settings mutation ownership and composes with **P1-008** import atomicity/marker generation and **P1-210** unknown mutation settlement.

Prior shared-settings research already proves stale open pages can overwrite imported values later. This pass proves a stronger physical ordering race: a direct page-owned `chrome.storage.local.set()` can be **started before** the import, remain unresolved while the import commits, and settle afterward, partially rolling back the imported bundle even if the user never performs another post-import edit.

No new root cause is needed.

## Positive control — worker-owned Yandex and OperationLog settings already have cross-import barriers

Current service-worker settings architecture has explicit actual-settlement coordination around import.

`importUserSettings()` calls `waitForUserSettingsMutationBarriers()` before reading previous settings and issuing the bundled import write.

That barrier waits for:

- the prior user-settings import actual settlement;
- `yandexConfigStorageSettlementChain`;
- the current serialized `operationLogSettings` mutation barrier when present.

Conversely:

- `updateYandexConfig(...)` waits for current user-settings import settlement before starting a new Yandex config mutation;
- `saveOperationLogSettings(...)` waits for current import settlement before writing retention settings.

This is a useful physical ordering pattern. It does not solve logical stale-form expected-revision conflicts, but it prevents these worker-owned writes from simply overtaking the bundled import because their Chrome Storage promises settled late.

## `groupByUrl` bypasses that barrier entirely

Journal's grouping checkbox still performs a direct page-context call:

`chrome.storage.local.set({ webclipJournalGroupByUrl: groupByUrl })`

inside a local try/catch.

The write:

- does not enter the service-worker `userSettingsImportStorageSettlement` chain;
- is not visible to `waitForUserSettingsMutationBarriers()`;
- has no shared-settings revision/CAS;
- has no actual-settlement receipt available to the worker import owner.

Chrome Storage mutation itself is non-cancellable from the extension page's perspective. Losing/ignoring the page-side promise does not mean the mutation cannot settle later.

## Deterministic pre-import late-settlement rollback

1. Journal page J displays `groupByUrl=false`.
2. User toggles the checkbox to true; J starts direct Storage write A (`groupByUrl=true`).
3. A's actual Chrome Storage promise remains unresolved/delayed.
4. Another extension page starts user-settings import B whose document specifies `groupByUrl=false` plus Yandex/backup/OperationLog settings.
5. `waitForUserSettingsMutationBarriers()` cannot see A because A is a direct Journal-page write outside worker chains.
6. Import B writes its allowlisted settings bundle + import marker and the actual import mutation commits successfully.
7. Reconciliation may proceed and UI may report imported settings committed.
8. Old page write A settles **after** B and stores `groupByUrl=true`.
9. Durable settings now contain a mixture: imported B for worker-owned fields, but old pre-import A for grouping preference.

The import was internally one bundled `storage.set`, yet its postcondition did not remain true because an older untracked writer was already in flight.

## Why stale-page notification alone cannot close this race

Even if import B immediately broadcasts a new settings revision and J disables its controls:

- A was already physically admitted before B;
- the non-cancellable Storage write can still settle after the notification;
- UI invalidation cannot retract it.

Therefore cross-page refresh is necessary UX but not the correctness primitive.

All writers of an imported/shared key must enter one generation/settlement contract.

## Required P1-157 contract

### Route shared setting mutations through one authoritative owner

`webclipJournalGroupByUrl` should no longer be mutated by a raw extension-page `chrome.storage.local.set` that import cannot observe.

Preferred direction:

- page sends a settings mutation RPC with expected settings revision/edit receipt;
- worker serializes/coordinates the actual Storage mutation with import and other shared writers;
- result returns the new revision/current value;
- unknown outer response reconciles rather than blind retry.

An equivalent page-side protocol is acceptable only if it provides the same global actual-settlement and CAS guarantees; merely adding another local Promise queue per page is insufficient across pages/worker restart.

### One settings revision must cover the imported bundle

Import should atomically advance a durable shared-settings revision alongside its allowlisted values/marker.

All later writers consume expected revision or explicit merge policy. A writer admitted under pre-import revision A cannot settle after B and silently become current merely because Chrome executed its old `set` later.

### Physical ordering + logical CAS are both required

Physical barrier prevents already-started old writer A from landing after import B.

Expected-revision CAS prevents a stale page that starts a **new** mutation after B from intentionally/accidentally writing values based on old UI A.

Neither layer replaces the other.

## Import marker completion

P1-008 marker B must not be removed/declared fully reconciled while a pre-B shared-setting physical mutation can still legally settle afterward and alter the imported generation.

Once every shared writer participates in the global barrier/revision, marker reconciliation can establish:

- bundled values B committed;
- all older admitted shared writes have actually settled before B;
- ancillary scheduler state is reconciled to current generation;
- no old-generation writer remains capable of physically rolling B back.

## Unknown page-write result

The current Journal handler swallows Storage errors and immediately keeps local UI state.

Final design should distinguish:

- confirmed commit/new settings revision;
- conflict/stale expected revision;
- unknown outer/result settlement requiring read reconciliation;
- deterministic failure.

Do not render a durable preference claim solely from the checkbox's local value.

## Required regressions

1. Direct/legacy page write A begins and is delayed -> import B commits -> release A actual settlement: final durable state remains B/current generation; A cannot land after B.
2. Same race with A rejected/unknown: import marker completion remains truthful and bounded.
3. Import B finishes -> stale Journal page starts a new write based on pre-B revision -> explicit conflict/refresh, not overwrite.
4. Two Journal pages have old/new revisions -> only current expected revision can mutate or explicit merge policy applies.
5. Yandex config mutation A and import B remain physically ordered by existing worker barrier.
6. OperationLog retention mutation A and import B remain physically ordered by existing worker barrier.
7. Adding global settings revision does not regress atomic import of the allowlisted bundle + marker.
8. `groupByUrl` write loses runtime response after actual commit -> page reconciles current value/revision before allowing another generation.
9. Import B changes groupByUrl while old Journal page is visible -> page is marked stale/refreshed, but worker CAS remains safe even if notification is missed.
10. Intentional newer settings C after B supersedes B normally and obtains revision C; old A cannot settle afterward and overwrite C.
11. Worker restart during A/B ordering reconstructs enough durable/current revision state; correctness does not rely only on module-memory queues.
12. Settings export after B waits current mutation barrier and reads one coherent committed settings generation.

## Duplicate check

- **P1-157** is primary: every shared settings writer must participate in one versioned mutation/actual-settlement contract.
- **P1-008** owns import bundle + marker/recovery generation.
- **P1-210** owns unknown caller-visible mutation result and reconciliation.
- **P1-141** remains read single-flight freshness after mutations.

No P1-211 is created.

## Test / release state

Documentation only. Product tests were not rerun. Historical gate remains **88/88 syntax + 74/74 deterministic PASS**. No build/tag/Release was created.

## Retired source: `RESEARCH_DELTA_SHARED_EXTENSION_PAGE_SETTINGS_COHERENCE_2026-08-28.md`

SHA-256 of UTF-8 source text: `b35ec5f8e91be9a60135264921d76b4163ff48322d774950bc2d8c81643b36ce`

# Research delta — shared extension-page settings coherence / stale-form writes — 2026-08-28

Source-of-truth `main` immediately before this write: `73e0db08944310ccf7c9660182297df4e937073e`.

Docs-only research checkpoint. Production runtime, tests, configuration and `manifest.json` are unchanged. No new P-number is assigned.

## Classification

Fresh multi-page research refines existing **P1-157 — shared extension-page Chrome API/settings mutation ownership**.

Existing P1-157 already records one concrete shared-key race: `journal.js` writes `webclipJournalGroupByUrl` directly while service-worker user-settings import writes the same key in its bundled settings commit. This pass proves a broader stale-form/lost-update class even when every individual worker mutation is physically serialized correctly.

Adjacent owners:

- **P1-141** — read-only single-flight freshness across mutation epochs;
- **P1-008** — user-settings import marker/generation and bundled commit;
- **P0-074/P0-078** — Yandex config and publication-policy generations used by long/remote operations;
- **P1-209** — old extension-page generation after extension update;
- **P1-206** — coherent Journal data render revision;
- **P1-210** — unknown outer mutation settlement before retry;
- **P1-121** — OperationLog retention setting ordering where applicable.

No new P1-211 item is needed. The root cause is that the worker serializes writes but extension pages do not carry an **expected shared-settings revision/edit receipt**, so a logically stale form can perform a perfectly serialized overwrite of newer fields.

## Physical serialization is not logical concurrency control

`updateYandexConfig(mutator, ...)` provides a valuable actual-settlement serialized mutation chain. Each turn fresh-reads current `yandexConfig`, applies a mutator and writes the result. A later physical Chrome Storage call cannot overtake an earlier unresolved one.

That protects write ordering.

It does **not** prove the mutation payload was based on current UI/state. If a stale Options page sends several fields copied from an old form, the worker's current-state fresh read merely gives that stale payload a clean place to overwrite those fields.

The missing primitive is either:

- an expected config/settings revision; or
- patch-only mutation semantics where the page sends only fields the user actually edited against a known current revision.

## Concrete lost update — backup settings form sends all fields every time

Options `saveBackupSettings` reads and sends all three values together:

- `enabled: backupEnabled.checked`;
- `intervalMinutes`;
- `retryMinutes`.

The worker `saveJournalBackupSettings(settings)` updates every property that is present. Since all three are always present, every Save is a whole-subform overwrite of those three current config fields.

### Deterministic two-Options-tab schedule

1. Options A and Options B both load backup settings:
   - enabled=true;
   - interval=1440;
   - retry=60.
2. B changes interval to 720 and saves. Worker serially commits current config interval=720.
3. A has received no shared-state invalidation and its form still shows interval=1440.
4. A changes only enabled to false from the user's perspective.
5. A clicks Save.
6. A sends `{enabled:false, intervalMinutes:1440, retryMinutes:60}`.
7. Worker fresh-reads current config containing B's 720, then deliberately applies A's payload and writes 1440 back.

B's newer interval change is lost even though Chrome Storage serialization worked perfectly.

This is a logical stale-editor overwrite, not physical write overtaking.

## Options has no `chrome.storage.onChanged` listener

Fresh `options.js` review finds no `chrome.storage.onChanged.addListener(...)`.

Therefore another Options page, Journal page or settings import can change shared settings while the current Options form remains indefinitely stale until some explicit refresh path happens to replace the controls.

For backup settings, `renderBackupStatus(status)` does correctly refresh all three form fields when this page itself obtains a status/result. The problem is **cross-page/background mutation visibility**.

A second tab can remain editable with a historical snapshot and later overwrite newer fields.

## User-settings import makes the stale-page problem systematic

P1-008 user-settings import intentionally writes one bundled allowlisted settings state containing, among other fields:

- Yandex config values;
- backup interval/retry/enabled;
- Journal `groupByUrl`;
- OperationLog retention.

After import commits, already-open extension pages are not automatically required to re-read that exact imported settings revision before allowing edits.

Therefore:

1. Options A loaded settings revision A;
2. user imports settings revision B from another page/tab;
3. B is durable and scheduler reconciliation may already run;
4. Options A still displays A;
5. A later saves a multi-field form;
6. A can overwrite selected parts of imported B with old values from A.

P1-008 ensures import itself is atomic/recoverable. It cannot prevent a later stale page from authoritatively writing old values unless shared writer admission carries revision/CAS semantics.

## Journal `groupByUrl` direct write remains the clearest cross-writer bypass

`journal.js` handles its grouping checkbox by:

1. immediately assigning local `groupByUrl = Boolean(groupByUrlInput.checked)`;
2. resetting pagination state;
3. directly awaiting `chrome.storage.local.set({webclipJournalGroupByUrl: groupByUrl})` inside `try/catch`;
4. swallowing any error;
5. rendering the new local mode regardless.

### Consequence 1 — UI can diverge from durable setting after write failure/unknown result

If the Storage write rejects or has ambiguous late settlement, Journal still renders using the locally chosen value and gives no indication that persistence failed.

On reload/new Journal page the persisted value may differ.

This is P1-157 direct-write settlement plus P1-210-style state truth at a lower-severity preference surface.

### Consequence 2 — import vs stale Journal tab

Journal's storage listener watches only `webclipJournalRevision`, not `webclipJournalGroupByUrl`.

User-settings import can therefore change the durable `groupByUrl` preference without notifying/reconciling an already-open Journal page.

The old Journal tab continues to display/edit its historical preference. A later checkbox change performs a direct write outside the service-worker settings mutation contract and can overwrite the imported preference.

This is exactly the shared-writer race already named by P1-157, now with the missing cross-page invalidation schedule made explicit.

## Journal data revision events do not repair preference revision

Journal does have strong(er) cross-page data invalidation mechanisms:

- runtime `WEBCLIP_JOURNAL_CHANGED` handling;
- `chrome.storage.onChanged` for `webclipJournalRevision`;
- scheduled reload with scroll preservation.

Those are about Journal **data revision**.

They do not imply that `webclipJournalGroupByUrl` or other user-settings state is current. A Journal entry mutation can refresh data while the grouping preference remains a stale local variable from another settings generation.

Do not overload Journal data revision as the settings revision.

## P1-141 read freshness composes but does not solve stale editor admission

P1-141 already requires an Options read single-flight to stop reusing a pre-mutation actual read as though it were a new post-mutation snapshot.

Suppose that is fully fixed and every explicit refresh obtains genuinely current settings. A stale page can still sit idle without refreshing and later submit historical form fields.

Therefore two independent layers are needed:

- **read epoch** — P1-141: a refresh must actually observe state after the mutation it is intended to confirm;
- **write expected revision/edit capability** — P1-157: a form loaded from revision A cannot silently overwrite revision B unless the product explicitly applies conflict/merge policy.

## P1-209 extension-version refresh is another stale-page source, not the shared-setting owner

P1-209 requires open Journal/Options pages to prove they have reloaded into the current extension version before the worker marks refresh complete.

An old-version page that remains alive can obviously make the stale-editor problem worse because it may also use old schema/mutation semantics.

However even two pages running the same current extension version can reproduce the backup-settings lost update above. Therefore P1-157 needs its own shared settings revision regardless of P1-209.

## Publication privacy setting has better patch shape but still needs current-generation truth

`createPublicLinks` is changed by a dedicated preference mutation containing only that field. It therefore does not accidentally overwrite backup interval/retry values from a stale form.

This is a positive pattern: narrow patch minimizes unrelated lost updates.

However P0-078/P1-210 still require:

- exact publication-policy generation;
- after unknown write result, fresh durable state before the checkbox claims enabled/disabled;
- old save generations cannot regain publication authority merely because a stale page later toggles the boolean.

So patch-only is necessary but not sufficient for privacy-critical settings.

## Root save is also narrow, but long-operation generation remains P0-074

Root path save sends a dedicated root value rather than the full Yandex config object. This avoids unrelated stale-field overwrite.

The remaining root problem is long-operation generation: remote service-folder verification must remain tied to the exact root/config generation that was committed. That remains P0-074.

Again, narrow patch is the correct shared-settings foundation.

## Backup settings need dirty-field or revision/CAS semantics

Possible safe models:

### Option A — expected revision + merge

When Options loads backup settings it receives `settingsRevision = R`.

Save sends:

- expected revision R;
- only changed fields or full intended subdocument.

Worker transaction/serialized mutation:

- fresh-reads current revision;
- if still R, applies change and advances revision;
- if changed, returns conflict/current state;
- UI asks user to review/merge rather than silently overwriting.

### Option B — patch only fields touched by this edit session

Track per-control dirty state in Options.

If user only toggled enabled, send only `{enabled:false}`. Worker fresh-read preserves concurrently changed interval/retry.

This significantly reduces lost updates, but still needs a revision when multiple writers edit the **same** field or when grouped settings have cross-field invariants.

### Option C — worker-issued edit receipt

Load returns a short-lived edit receipt bound to the settings generation. Save consumes/compares it. This can align with P1-198-style worker-issued provenance but should remain a settings-specific capability rather than reuse an unrelated operation log id.

## Cross-page invalidation

All current extension pages that display editable shared settings need a way to learn that their snapshot is stale.

Acceptable mechanisms:

- `chrome.storage.onChanged` for versioned settings revision;
- worker runtime broadcast with revision only/small patch;
- visibility/pageshow fresh-read when page returns to foreground;
- explicit stale banner after known other-page/import mutation.

The worker remains authoritative: a missed notification cannot make a stale expected revision valid.

## Unknown mutation settlement

P1-210 applies to shared settings too:

- if the page loses the mutation response after Chrome Storage may have committed, do not immediately reset its expected revision as though the write failed;
- mark editor state pending/unknown;
- reconcile current revision/value from the worker/actual settlement owner;
- only then allow the next edit generation.

Otherwise a lost result can produce both duplicate mutation and stale-revision overwrite.

## Required deterministic regressions

1. Options A/B load backup settings R0; B changes interval and commits R1; A changes only enabled -> interval from B remains 720 or A gets explicit conflict; it never silently returns to stale 1440.
2. Same with retryMinutes changed in B and enabled changed in A.
3. A and B both edit the same field from R0 -> deterministic conflict/latest explicit policy, not invisible lost update.
4. User-settings import commits backup settings B while Options A is open -> A is marked stale/refreshed; a later Save cannot overwrite imported fields from old snapshot without conflict.
5. Journal A is open with `groupByUrl=false`; user-settings import commits true -> Journal A receives/obtains current preference or is marked stale before it can write.
6. Direct Journal group preference Storage write rejects -> local checkbox/render does not silently claim durable success; state is reconciled or visibly unsaved.
7. Journal preference write settles late after import -> old generation cannot overwrite imported new generation without expected-revision match.
8. Two Journal tabs change grouping preference concurrently -> one coherent last-confirmed revision/explicit conflict semantics; no hidden stale physical overwrite.
9. P1-141 stale pre-mutation read A is not accepted as post-B current revision.
10. P1-209 old-version page cannot write shared settings after new worker/page generation declares it stale.
11. Public-link dedicated patch does not overwrite unrelated backup/root fields; P0-078 generation tests remain independent.
12. Root dedicated patch does not overwrite public-link/backup fields; P0-074 remote verification still uses exact committed root generation.
13. OperationLog retention imported while stale Options is open -> later unrelated settings save does not revert retention; direct retention edit uses expected current revision or explicit conflict.
14. Cross-page settings notification may be missed without corrupting state because worker expected-revision CAS remains authoritative.
15. Unknown outer mutation settlement keeps edit state pending until exact current revision is reconciled; no blind retry with stale form.

## Duplicate check / numbering

No new P-number is assigned.

- **P1-157** is the primary shared-settings writer/edit-revision owner.
- **P1-141** remains read single-flight freshness.
- **P1-008** remains atomic user-settings import/reconciliation marker.
- **P1-209** remains extension-page version-generation refresh.
- **P1-206** remains Journal data snapshot coherence.
- **P1-210** remains outer mutation result reconciliation.
- **P0-074/P0-078** remain stronger Yandex config/privacy operation generations.

P1-211 remains unassigned by this block.

## Test / release state

No runtime/config/manifest changes were made. Product tests were not rerun. The last proven product gate remains historical **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. No build, tag or GitHub Release was created.

## Retired source: `RESEARCH_DELTA_USER_SETTINGS_MARKER_GENERATION_2026-08-27.md`

SHA-256 of UTF-8 source text: `71b45bc5b41338ed8ca0d99f20988455c3e97d1c2f32d26974c31adf005e711e`

# Research delta — user-settings import marker generation — 2026-08-27

Baseline HEAD before this research block: `481f8f85751a4076e449b7212df6b0db9cf831c2`.

Docs-only research checkpoint. Production runtime and `manifest.json` are unchanged. Canonical registry synchronization is not claimed.

## Scope

Fresh crash-consistency research of `webclip-user-settings` import, focused on existing `P1-008` and shared-settings ordering dependency `P1-157`.

## Result

`P1-008` needs a generation-owned reconciliation marker. Current bundled settings+marker write is valuable and must be preserved, but the marker has no unique import identity and marker reconciliation is not part of the same actual-settlement barrier as the import write. An older reconciliation pass can therefore consume/delete a newer import's marker.

No new P-number is created.

## Confirmed runtime facts

`importUserSettings()` first waits existing import/yandex-config/OperationLog mutation barriers, reads current settings, constructs a full bundled settings write and writes in one `chrome.storage.local.set`:

- `yandexConfig`;
- OperationLog retention;
- Journal group-by-URL preference;
- `USER_SETTINGS_IMPORT_MARKER_KEY`.

The marker contains only:

- schema version;
- `createdAt`;
- schema name.

It contains no immutable `importId`, generation, expected settings hash or ownership receipt.

`userSettingsImportStorageSettlement` tracks only the actual bundled `storage.set` promise. Its `.finally()` releases that barrier as soon as the bundled write settles.

Only **after** the write does normal success call `reconcileUserSettingsImportMarker('settings-import')`. On caller timeout, a late-success callback calls `reconcileUserSettingsImportMarker('settings-import-late')`.

`reconcileUserSettingsImportMarker()` independently:

1. reads whichever marker currently exists;
2. accepts any object with the current version;
3. runs backup scheduler reconciliation;
4. removes `USER_SETTINGS_IMPORT_MARKER_KEY` through the marker storage queue.

It does not verify that the marker it removes belongs to the import/reconcile invocation that started the work.

## Confirmed race

A deterministic cross-generation schedule exists:

1. import A's bundled `storage.set` settles and writes marker A;
2. `userSettingsImportStorageSettlement` is released immediately;
3. reconcile A starts and issues its marker read, but that read is delayed;
4. import B is now allowed through the import settlement barrier and commits settings B + marker B;
5. reconcile A's delayed read returns the **current marker B**;
6. reconcile A initializes the scheduler using current settings, then removes the marker key without comparing marker identity;
7. marker B is gone even though reconciliation ownership belonged to A.

If B itself later has unknown settlement/reconciliation, or the worker terminates after B's settings commit but before B finishes its own scheduler reconciliation, startup has no marker proving that B still requires reconciliation.

The same ownership problem exists between a worker-start reconciliation and a newly admitted import: marker read and marker removal are not one compare-and-delete transaction/serialized generation receipt.

## Why this is P1-008, not a new item

P1-008 already owns the requirement that settings import uses a durable reconciliation marker and survives unknown settlement/restart. This research shows the existing marker is not generation-safe under overlapping **reconciliation lifecycle**, even though the bundled settings write itself is atomic.

P1-157 remains separate but related: Journal `groupByUrl` still has a direct extension-page storage write outside the shared worker mutation contract, so it can race with the bundled import write. This checkpoint does not duplicate that root cause.

## Required P1-008 refinement

Each import must have an immutable generated `importId` / generation stored inside its bundled marker.

Reconciliation must carry the expected marker id it owns. Marker removal must be compare-and-remove semantics:

- fresh-read the marker inside the serialized marker mutation turn;
- remove only if `current.importId === expectedImportId`;
- if a newer marker exists, do not consume it;
- startup reconciliation may claim the current marker generation, but a newly committed import must establish a newer generation that an older startup task cannot erase.

The actual import settlement barrier should include, or explicitly hand off to, a durable reconciliation ownership receipt so a new import cannot be admitted into an ambiguous gap where the previous generation's marker cleanup still has authority over the same key.

Do not auto-retry a timed-out settings `storage.set`; timeout remains unknown settlement. Reconciliation is scheduler/config-derived repair only.

The marker need not contain secrets or the full imported settings payload because settings+marker already commit atomically. It needs identity/generation and enough non-secret metadata to establish ownership and diagnostics.

P0-074/P0-078 generation rules still apply to consequences of changed Yandex account/root/publication policy; a settings-import marker is not itself an auth or publication authorization receipt.

## Required deterministic regressions

1. A commit → delayed reconcile A → B commit → reconcile A resumes: marker B survives.
2. A times out locally, settles late, late reconcile A overlaps B: A cannot remove B marker.
3. Worker-start reconcile reads A, B commits before old reconcile's remove: compare-and-remove leaves B marker intact.
4. B settings commit followed by worker termination before scheduler reconciliation: startup sees B marker and repairs B generation.
5. Two reconcilers for the same importId are idempotent; one removal does not create an error or affect a newer generation.
6. Import timeout never causes a second bundled settings write automatically.
7. Direct/shared settings mutations remain ordered through the P1-157 worker-owned contract and cannot be overwritten by a late import generation silently.

## Classification

- Extend/reopen existing `P1-008` reconciliation-marker acceptance.
- Preserve `P1-157` as the shared settings writer/order dependency.
- Preserve `P0-074` and `P0-078` for Yandex operation/privacy generations affected by config changes.
- No `P0-079`, `P1-198` or `P2-020` created by this block.

Previous product test gate was not re-run by this docs-only checkpoint.

## Retired source: `RESEARCH_DELTA_YANDEX_ACCOUNT_CACHE_GENERATION_2026-08-27.md`

SHA-256 of UTF-8 source text: `ea817e76d5f4d589746720b906e12d956fe7e47e81f4f1639f724c8a32c47428`

# Research delta — Yandex account cache generation

Date: 2026-08-27
Source-of-truth `main` immediately before write: `4b7c7cb894006bfff6ce60f224216d25aa8969ba`.

Docs-only research checkpoint. Production runtime and `manifest.json` are unchanged. Canonical registry synchronization is not claimed here.

## Existing P0-074 must be refined — account metadata cache commits are not auth-generation fenced

P0-074 already requires immutable operation-scoped Yandex auth/config identity. Fresh research proves that the same generation fence is also required for **account metadata writes after network responses**: a stale `/v1/disk` response can contaminate the newer auth session's cached account UID and thereby weaken P0-073 account fencing in future operations.

### Fresh source proof

`testYandexConnection()` currently performs:

1. `const info = await yandexApi('')`;
2. `const account = extractDiskAccount(info)`;
3. only **after** that network request settles, `const authState = await readYandexAuthState()`;
4. obtains whatever `yandexAuth` is current at that later moment;
5. assigns `yandexAuth.account = account`;
6. writes that object with `writeYandexAuth(yandexAuth)`.

No auth-session generation/token identity captured before the GET is compared before the account metadata write.

`writeYandexAuth()` itself serializes storage operations but has no semantic compare-and-set generation: if the supplied object contains an access token, it writes that object to `chrome.storage.session`.

`getCurrentYandexAccountUid()` then prefers the cache:

- read current `yandexAuth`;
- derive `cachedUid = yandexAuth.account.uid`;
- if non-empty, return it immediately;
- only if cache is empty does it call `/v1/disk` again.

### Concrete A→B race

1. Active OAuth/session is account/token A.
2. `testYandexConnection()` starts and `yandexApi('')` sends `/v1/disk` using A.
3. Before the response/metadata commit finishes, the user disconnects/reauthorizes and current session becomes B.
4. The old request returns account metadata A.
5. `testYandexConnection()` now fresh-reads current auth B, assigns `account=A` into that B object and writes it.
6. Current storage is now logically inconsistent: access token B + cached account UID A.
7. A later destructive Journal operation for an entry whose `expectedAccountUid=A` calls `getCurrentYandexAccountUid()` and receives cached A without verifying `/v1/disk` under token B.
8. The P0-073 account comparison can therefore pass even though subsequent real Yandex API calls use account B.

Path/root/object fences may still stop many concrete mutations, but the account UID fence itself has been made unsound and cannot be treated as proof of current account identity.

### Classification / duplicate check

No new P-number is created.

This is a direct refinement of **P0-074** because the root cause is an async Yandex response committing into a different auth generation. P0-074's immutable `YandexOperationContext` / auth-session generation must cover metadata/cache writers as well as mutating API chains.

Related owners remain:

- **P0-073**: accountUid + rootPath fence for remote save/recovery/destructive identity. This finding explains one way its current cached UID input can become false.
- **P1-178**: OAuth/pending/config completion generation. OAuth completion must not overwrite newer auth/config; this checkpoint additionally covers the ordinary `testYandexConnection()` metadata refresh path even when no OAuth finish is the stale writer.
- **P1-191**: transactional manual-token replacement. Manual validation has its own replacement semantics.
- **P1-196**: token validity state. Validity does not prove account identity.

### Required P0-074 refinement

Every network-derived auth/account metadata write must be conditional on the exact auth generation that authorized the request.

Required invariants:

1. Before `/v1/disk`, capture immutable auth-session generation/fingerprint sufficient to distinguish A from B without persisting plaintext token into logs/checkpoints.
2. After response and before writing `account`, fresh-read current auth state and exact-compare generation.
3. If generation changed, discard the stale account result; never merge account A into auth B.
4. `writeYandexAuth`-style metadata updates should use generation-aware compare/update rather than caller-side read→mutate→blind write.
5. Cached `account.uid` may be used as fast proof only when it is explicitly bound to the same auth generation as the current access token/session.
6. Legacy cached account metadata lacking generation provenance must be treated as unverified and refreshed before it can satisfy P0-073 destructive account fencing.
7. Disconnect/reauth invalidates old account metadata immediately.
8. Account refresh failure must not corrupt/replace a newer valid session.
9. The same rule applies to account-info refresh after OAuth/manual-token/test-connection flows; no async response may write across generations.

### Required regressions

- Token A `testYandexConnection()` delayed → reauth B → A response: final auth remains B and account metadata is B/empty-unverified, never A.
- After that race, destructive entry expectedAccountUid=A must not pass account fence merely from stale cache while token B is current.
- Same auth generation A throughout: account cache update succeeds normally.
- Disconnect while account GET is in flight: late response cannot recreate auth/account state.
- A→B→A with distinct generation ids: old A response from generation 1 cannot be accepted merely because token/account value later resembles generation 3.
- Manual-token and OAuth account-info refresh paths obey the same generation-aware helper.
- Legacy account cache without generation is refreshed/fail-closed before destructive account proof.

## Test / release state

No product tests were rerun for this docs-only checkpoint. No build/tag/release was created.

## Retired source: `RESEARCH_DELTA_YANDEX_AUTH_CONFIG_WRITES_2026-08-27.md`

SHA-256 of UTF-8 source text: `846b838dffb6c946f86e03696e6c035cd24c9345606413aceb04706ca7cc5139`

# Yandex auth / config write research delta — 2026-08-27

Baseline source HEAD: `28afad016a977dbee73bf6d7839b34f7fac09c6d`.

This is a lossless research checkpoint, not a canonical-registry replacement. No production/runtime/config/manifest change is made by this checkpoint. No P1-197 is assigned in this block because the confirmed races belong to existing P1-178/P1-191/P0-074 contracts.

## Whole-object auth write inventory — P1-178 must cover every writer

`writeYandexAuth()` serializes the physical `chrome.storage.session.set/remove` operation and performs legacy persistent-secret cleanup, but it has no expected-generation/CAS argument. Serialization prevents physical write overtaking; it does **not** make a logically stale whole-object write valid.

Fresh inventory of current writers proves several stale-completion classes.

### `finishYandexOAuth()` ancillary account write can overwrite a newer auth

After token exchange, `finishYandexOAuth()` writes the new `yandexAuth`, removes pending PKCE, then performs a separate `yandexApi('')` account-info request. When it returns, the function mutates the original local `yandexAuth.account` and calls `writeYandexAuth(yandexAuth)` again.

If a newer manual auth / OAuth attempt / disconnect commits while this account request is in flight, the late second whole-object write can republish the older auth. The comment that profile-read failure must not destroy authorization is correct but insufficient: profile-read **success** must also not restore an obsolete authorization generation.

Required P1-178 regression: OAuth A token commits -> account-info A remains in flight -> auth B commits -> late A account response must not overwrite B or attach data to B without exact identity proof.

### `setManualYandexToken()` late validation failure can clear a newer auth

The current manual-token path publishes the manual candidate first, then validates it with `yandexApi('')`. Its catch unconditionally executes `writeYandexAuth(null)`.

Beyond the already recorded P1-191 bug (invalid candidate destroys the previously working auth), this has a cross-generation variant:

1. manual candidate A is written and validation starts;
2. another flow commits valid auth B;
3. A's validation later fails;
4. A's stale catch executes `writeYandexAuth(null)` and logs B out.

Likewise, if A validation succeeds after B was committed, the second `writeYandexAuth(yandexAuthA)` can restore A.

Required contract is the composition of **P1-191 candidate->validate->commit** and **P1-178 generation fencing**. A candidate that has not been committed as the exact current generation has no authority to clear or overwrite another generation on either success or failure.

Required regressions:

- working/current B + late failure from obsolete manual A => B remains current;
- working/current B + late success from obsolete manual A => B remains current unless the user initiated a newer explicit replacement that owns the current generation;
- candidate validation must not use the globally published auth slot as a transport mechanism.

### `testYandexConnection()` can attach account A to current auth B

`testYandexConnection()` first executes `const info = await yandexApi('')`, then extracts `account`, and **after the network response** calls `readYandexAuthState()` again. If a reauthorization happens between those phases, the account metadata returned using auth A can be attached to newly current auth B and written as a whole object.

This path is safer than the stale-token resurrection in `getCurrentYandexAccountUid()` because it re-reads the current auth before writing, but it still has no proof that the account response was produced by that same auth generation.

Required P1-178/P0-074 rule: external identity response and the auth object it enriches must share one immutable auth-generation receipt. If generation changed, discard the ancillary result and re-read/re-test under the new generation if needed; never transplant account metadata across sessions.

### `getCurrentYandexAccountUid()` stale snapshot can restore A with B metadata

This stronger case was already checkpointed in `RESEARCH_DELTA_YANDEX_MUTATION_RECOVERY_2026-08-27.md`: the function snapshots A before network, `yandexApi()` may run with B, then `{...A, accountFromB}` can be written back. It remains a mandatory P1-178/P0-074 regression and demonstrates why mere physical write serialization is not a logical authority check.

### Explicit Disconnect must be an auth-generation tombstone

`WEBCLIP_YANDEX_DISCONNECT` calls `writeYandexAuth(null)` and removes pending PKCE. Without a generation/tombstone fence, any already-running OAuth completion, manual validation, account-cache write, or account test can later call `writeYandexAuth(...)` and silently reconnect the user after an explicit disconnect.

Required behavior: Disconnect increments/commits the auth generation (or equivalent immutable tombstone). Every older async completion fails its expected-generation check. An already issued signed transfer may still physically settle and must be reconciled under its operation context; that is not permission to republish the old auth session.

## P1-196 invalid-token demotion must also use exact-generation mutation

P1-196 requires authoritative current-token 401 to demote/invalidate auth. This write inventory shows why the fix cannot call a generic unconditional `writeYandexAuth(null)`: a stale request A can receive 401 after reauth B. Demotion must carry the exact auth generation/token identity used by the failed request and only modify state when it still matches current auth.

A useful centralized model is one logical auth mutation API with an explicit expected generation/attempt identity for `commit`, `enrich account`, `demote invalid`, and `disconnect`. The exact implementation can differ, but every whole-object writer must obey the same authority rule.

## Config/root write inventory — P0-074 generation must cover post-commit verification too

`saveYandexRoot(rootPath)` demonstrates a separate stale-operation problem:

1. it reads the current auth snapshot;
2. `updateYandexConfig()` serially commits requested root B;
3. if the earlier auth snapshot had an access token, it calls `ensureYandexServiceFolders(...)`;
4. that helper calls `getYandexConfig()` again and therefore uses whichever root is current at that later time;
5. if another root change C committed between steps 2 and 3/4, the older B operation can actually verify/create service folders under C;
6. it nevertheless returns `rootPath: B` and `structureVerified: true` to its caller.

Thus storage mutation serialization again does not make the multi-step operation generation-consistent. The UI can be told B was verified while the remote side effect happened under C.

Required P0-074 refinement:

- root/config mutation creates an immutable config generation/receipt;
- any post-save remote verification/creation must use the exact committed root/generation or fail stale before side effect;
- a stale older save must not return `structureVerified:true` for a different newer root;
- scheduler reinitialization must apply to the current generation and must not let a late older operation publish status for B after C is current.

Required regression: save root B -> before remote ensure, save root C -> late B continuation performs no mutation attributed to B under C and cannot render B as verified/current.

## Read-only status classification note

`WEBCLIP_YANDEX_STATUS` is wrapped by Options as a read-only RPC, but `getYandexStatus()` may remove an expired/invalid `yandexOAuthPending`. The already recorded P1-178 compare-and-remove race is therefore another proof that the read-only label describes UI intent, not actual side-effect semantics. P1-138's read-only inventory must classify this cleanup as a mutation and either make it atomic/generation-safe or move cleanup to an explicit repair path.

## Test / release evidence

Research documentation only. Product runtime/configuration and `manifest.json` are unchanged. Product tests were not rerun. The previously proven product gate remains 88/88 JavaScript syntax + 74/74 deterministic tests PASS; real unpacked Chrome and real Yandex auth/root-change concurrency E2E remain release QA blockers.

## Retired source: `RESEARCH_DELTA_YANDEX_CREATE_FOLDER_TRANSPORT_RECONCILIATION_2026-08-28.md`

SHA-256 of UTF-8 source text: `cc6aede917ad0a1f679f7e2fa2010fe3a3a69c88ad4985cd2b97165610043016`

# Research delta — Yandex Create Folder transport-loss reconciliation — 2026-08-28

Source-of-truth `main` immediately before this write: `472153e05e6a846bdae4eebe3d22c0d96c6bc4ac`.

Docs-only research checkpoint. Runtime/tests/configuration/manifest are unchanged.

## Classification

No new P-number is assigned.

Primary existing owners:

- **P1-210** — outer transport failure cannot be interpreted as proof that a side effect did not commit;
- **P1-157** — extension-page non-idempotent/runtime side effects require bounded settlement/reconciliation semantics;
- **P0-074** — the target path must be interpreted in one immutable Yandex account/config generation.

## Existing positive control

`ensureYandexFolderTree()` has a useful same-account retry property.

For each requested directory segment it issues `PUT /resources`. If Yandex returns `409`, WebClip does not blindly treat that as success. It performs an exact `GET /resources` for the same path and requires the object to be a directory.

Therefore a second invocation after a **confirmed first creation in the same account namespace** can safely converge instead of creating a duplicate object.

This is the right building block for reconciliation.

## Fresh transport boundary

Options invokes Create Folder with a direct:

`chrome.runtime.sendMessage({type:'WEBCLIP_YANDEX_CREATE_FOLDER', path})`.

The page does not have a worker-issued mutation receipt for that operation and the call is not expressed as a durable create-folder saga.

The remote `PUT` can settle before the extension page receives a response. A runtime channel/worker/page error can therefore produce:

- remote target exists;
- page shows an error / does not know the result;
- no exact page-visible receipt says `committed`, `not-admitted`, or `unknown`.

## Deterministic same-account schedule

1. Account generation A is current.
2. User explicitly selects target `/Projects/New` under a valid A picker receipt.
3. Worker issues remote `PUT`; Yandex creates the directory.
4. The extension-page response is lost/rejected before Options observes success.
5. UI reports an error.
6. User presses Create Folder again.
7. Second invocation receives `409`, exact-GETs `/Projects/New`, verifies `type=dir`, and can converge to success.

The second invocation is physically safe in this schedule, but the first result was still incorrectly represented as a normal terminal failure rather than `unknown/reconcile`.

## Why account generation is mandatory

The same retry property becomes unsafe as an **interpretation** if auth/root context changes between attempts.

A target path existing in account B does not prove that the first unknown operation in account A committed. Likewise a retry in B must not be called reconciliation of A.

The result identity is at least:

`account/auth generation + normalized target path + create-folder operation generation`.

## Required contract

### Operation receipt

Create Folder should obtain a small worker-issued operation receipt before the first remote mutation. The receipt binds:

- expected account/auth generation;
- normalized target path;
- operation id / physical create generation;
- current phase.

### Outcome states

At minimum distinguish:

- `not-admitted` — no remote request began;
- `unknown` — request may have settled remotely;
- `verified` — exact target exists as directory in the captured account;
- `conflict` — target exists but is not a directory;
- `superseded` — current account/config generation no longer matches the receipt.

### Retry semantics

When the page loses the outer response:

1. re-read/reconcile the exact target in the captured account generation when still authorized;
2. accept `PUT 409 + exact GET type=dir` as evidence of target state, not as proof that a specific earlier request was the creator;
3. only after reconciliation may the UI issue a semantically new create operation;
4. if auth changed, require a fresh picker/new operation instead of silently reusing A's receipt in B.

### UI truth

A lost channel after remote creation should produce wording equivalent to “result not confirmed; checking target” rather than “folder was not created”.

## Required regressions

1. PUT succeeds + response delivered -> verified success.
2. PUT succeeds + outer response lost -> exact same-account reconciliation reports verified without a second uncontrolled mutation.
3. PUT outcome unknown + retry sees 409 + exact target directory -> converge safely.
4. PUT outcome unknown + exact target is file -> fail conflict, never report folder success.
5. Unknown A -> auth changes B -> B path cannot reconcile A operation.
6. Unknown A -> same A target absent -> explicit fresh retry may create once.
7. Multi-segment target retains per-prefix progress under the preceding folder-tree generation research.
8. Page reload after unknown result can discover the receipt and reconcile instead of blind replay.

## Duplicate check

P1-210 owns the generic unknown-result rule; P1-157 owns extension-page mutation transport. The previous folder-tree research owns immutable account generation during the multi-request tree itself.

This checkpoint records the Create Folder-specific convergence/positive-control behavior and therefore does not justify a new P-number.

## Test / release state

Documentation only. Product tests were not rerun. Historical evidence remains **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. Runtime version remains `0.9.8`; no build, tag or GitHub Release was created.

## Retired source: `RESEARCH_DELTA_YANDEX_DISCONNECT_PARTIAL_COMMIT_2026-08-28.md`

SHA-256 of UTF-8 source text: `c7f0a34d9967f8051123c4243659f06572800390229dbab456505bd5532db7f9`

# Research delta — Yandex Disconnect is a partial-commit auth transition — 2026-08-28

Source-of-truth `main` immediately before this write: `3c1b16574b51eec2667194f1d99bd94e73370fff`.

Docs-only research checkpoint. Runtime/tests/configuration/manifest are unchanged.

## Classification

No new P-number is assigned.

Primary existing owners:

- **P1-177** — Disconnect must converge backup scheduler/auth-visible state;
- **P1-178** — PKCE/auth attempt state must be completion-aware and generation-fenced;
- **P1-210** — outer failure after a committed mutation requires reconciliation rather than blind replay;
- **P0-074** — already-started Yandex operations retain their own immutable operation context/settlement.

## Fresh source proof

`WEBCLIP_YANDEX_DISCONNECT` performs three sequential steps:

1. `await writeYandexAuth(null)` — removes the current `yandexAuth` object from `chrome.storage.session`;
2. `await runYandexAuthStorageOperation(() => chrome.storage.session.remove(['yandexOAuthPending']), ...)` — separately removes pending PKCE state;
3. `return {ok:true, ...(await getYandexStatus())}` — separately re-reads status for the response.

The auth removal and pending-attempt removal are serialized, but they are **not one atomic state transition**. The response/status read is another separate stage.

## Deterministic partial-commit schedules

### Current auth removed, pending cleanup fails

1. Current auth generation A is connected.
2. User presses Disconnect.
3. `writeYandexAuth(null)` physically commits: A access token is gone from session storage.
4. The following `yandexOAuthPending` removal times out/errors or the worker stops.
5. Handler rejects before returning success.
6. Options shows an error, but the user is already disconnected.
7. A stale pending PKCE attempt may still exist and can affect later status/finish logic under P1-178.

### Disconnect committed, status response fails

1. Auth and pending cleanup both commit.
2. `getYandexStatus()` fails/hangs.
3. Page sees an error although disconnect is complete.
4. A user retry is not proof of a new logout event; it is first a reconciliation of the already committed transition.

### Old in-flight remote operation

Disconnect removes authorization for new Yandex requests, but a signed upload/download or already-issued remote request may still have an independent actual settlement.

Therefore successful local logout is **not cancellation evidence** for an already admitted external side effect. This is already stated by P1-177/P0-074 and must remain explicit in the disconnect receipt.

## Required contract

### Auth transition receipt

Disconnect should use one immutable auth-transition generation/receipt that can represent:

- current auth A before transition;
- `authRemoved` committed/not committed/unknown;
- `pendingAttemptCleanup` committed/pending/unknown;
- scheduler reconciliation generation under P1-177;
- any known in-flight Yandex operations that continue independently.

The exact storage layout is implementation-specific, but page-visible completion must not depend on all ancillary steps succeeding in one call stack.

### Truthful partial result

If current auth removal is confirmed but PKCE cleanup or status refresh fails, the result is equivalent to:

`disconnected / reconciliation pending`

not “Disconnect failed and nothing changed”.

If the outer response is lost, Options should refresh/reconcile current auth generation before presenting a new destructive/auth mutation.

### Pending PKCE generation

A leftover `yandexOAuthPending` after committed disconnect must never become authority to re-install stale auth automatically.

P1-178 generation rules still apply:

- stale attempt is historical/inert after disconnect generation wins;
- cleanup removes only the exact old attempt generation;
- a newer Start Auth after disconnect cannot be removed by late old cleanup.

### Scheduler convergence

P1-177 remains mandatory: confirmed logout should drive backup scheduler to paused/no-auth without deleting user interval/enabled preferences. Failure of scheduler cleanup is an ancillary reconciliation state, not rollback of the factual logout.

## Required regressions

1. Disconnect all stages succeed -> auth absent, pending attempt absent, scheduler reconciled.
2. Auth removal succeeds -> pending cleanup fails -> status says disconnected + reconciliation pending after refresh.
3. Auth removal succeeds -> worker dies before response -> next status proves logout; UI does not claim A still connected.
4. Auth removal fails before commit -> previous auth A remains current and result says not disconnected.
5. Pending A exists -> disconnect commits -> late A finish cannot reinstall auth.
6. Disconnect A -> Start Auth B -> late old pending cleanup cannot remove B.
7. In-flight signed transfer admitted before logout may settle/reconcile independently; logout never fabricates cancellation.
8. Outer response loss after full disconnect -> retry first reconciles, not interpreted as proof first attempt did nothing.
9. Scheduler alarm cleanup fails after logout -> current auth remains absent and repair is retried separately.

## Duplicate check

P1-177 already owns disconnect-to-scheduler semantics and explicitly notes in-flight transfers. P1-178 owns PKCE generation/cleanup races. P1-210 owns unknown outer results.

This checkpoint connects those existing owners at the exact three-stage Disconnect implementation boundary; no new root-cause number is needed.

## Test / release state

Documentation only. Product tests were not rerun. Historical evidence remains **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. Runtime version remains `0.9.8`; no build, tag or GitHub Release was created.

## Retired source: `RESEARCH_DELTA_YANDEX_FOLDER_PICKER_ACCOUNT_GENERATION_2026-08-28.md`

SHA-256 of UTF-8 source text: `81b6ef6cf254043751e5ad98f739557feae88be01773d8f5f2dee1605e35a714`

# Research delta — Yandex folder picker account/auth generation authority — 2026-08-28

Source-of-truth `main` immediately before this write: `eb1bc7ba2ff4a396e7a2cec9dd005d119bb5a7a8`.

Docs-only research checkpoint. Runtime/tests/configuration/manifest are unchanged. No new P-number is assigned.

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

## Retired source: `RESEARCH_DELTA_YANDEX_FOLDER_TREE_AUTH_GENERATION_2026-08-28.md`

SHA-256 of UTF-8 source text: `dd7ee555f96d1a4a9c018f32e3cea9a4c427a00903739375076238bec937ed62`

# Research delta — Yandex folder-tree creation must stay in one auth/account generation — 2026-08-28

Source-of-truth `main` immediately before this write: `a40ea6f962da39552a52840c1db67b545b9c6ac7`.

Docs-only research checkpoint. Runtime/tests/configuration/manifest are unchanged.

## Classification

No new P-number is assigned.

Primary owner: **P0-074** — one Yandex operation must use one immutable account/auth/config context.

Adjacent owners:

- **P1-137** — folder-picker path authority must be bound to the account generation in which the path was observed;
- **P1-191/P1-178** — auth replacement / OAuth attempt generation;
- **P1-157/P1-210** — extension-page side-effect settlement and reconciliation after unknown outer result.

## Existing positive control

The immediately preceding folder-picker research already requires `WEBCLIP_YANDEX_CREATE_FOLDER` to carry the account/config generation under which the textual path was selected.

That protects admission of the command. It does not by itself keep the **multi-request folder-tree mutation** in the same generation after admission.

## Fresh source proof

`createYandexFolder(path)` normalizes the requested path and calls:

`ensureYandexFolderTree(normalized)`.

`ensureYandexFolderTree()` then walks every path segment. For a path such as:

`/Projects/WebClip/New`

it issues separate `PUT /resources?path=...` calls for:

1. `/Projects`;
2. `/Projects/WebClip`;
3. `/Projects/WebClip/New`.

A `409` is treated conservatively: the code re-reads the exact path and verifies that the existing object is a directory. This is a useful idempotency control.

However, every individual call goes through `yandexApi()`.

`yandexApi()` obtains its access token by calling `getValidYandexAccessToken()` **for that request**. The folder-tree loop does not carry an immutable token/account UID/auth generation from the command admission.

Therefore an ordinary auth replacement between requests can make one logical tree operation span two accounts.

## Deterministic cross-account schedule

1. User browses account A and selects `/Projects/WebClip/New` under a valid A picker receipt.
2. Worker accepts Create Folder for account generation A.
3. First tree request creates `/Projects` in A.
4. Before the next request, another Options page disconnects/re-authenticates or installs a manual token for account B.
5. Second call to `yandexApi()` fresh-reads the now-current token B.
6. `/Projects/WebClip` is now interpreted in B, not A.
7. The operation either creates a partial hierarchy in B, fails because the parent differs, or produces a mixed remote history in which A and B were both mutated by one user command.
8. The caller receives only success/error for one textual Create Folder action; it has no receipt showing which physical requests settled in which account.

No timeout or malicious input is required.

## Why retry/idempotency is insufficient

The current `409 -> GET -> require type=dir` behavior makes repeating the same path in **one account** reasonably idempotent.

It does not solve generation drift:

- a partial A tree is not equivalent to a full B tree;
- retry under B can leave A side effects behind;
- retry after switching back to A can create a second partial/full tree;
- a generic error cannot tell the user which account was mutated.

Thus “folder creation is idempotent” is only meaningful after the remote namespace/account is fixed.

## Required P0-074 refinement

### Immutable folder-mutation context

Once Create Folder is admitted, capture a bounded context containing at least:

- expected account UID/auth generation;
- config generation relevant to path interpretation;
- normalized target path;
- operation/physical mutation receipt id.

Every `PUT`/verification `GET` in `ensureYandexFolderTree()` must consume that same context or fail closed if it is no longer current/usable.

Do not let later requests silently fresh-bind to a replacement account.

### Partial physical settlement

Folder-tree creation is a saga across multiple remote requests. After each confirmed segment, the operation should retain enough bounded progress evidence to distinguish:

- no remote mutation admitted;
- confirmed prefix created/verified in account A;
- next request outcome unknown;
- full target directory verified in A;
- operation superseded by auth generation B.

A user-facing retry can safely re-read exact segment state in **the captured A namespace** when that namespace is still authorized; otherwise report the historical partial outcome rather than reinterpret the original command in B.

### Auth change is a revocation/supersession boundary

When auth A is replaced by B while a folder mutation is active:

- no not-yet-started segment from A may automatically execute under B;
- already confirmed A segments remain historical remote side effects;
- an unknown A request must be reconciled as A, not guessed from B;
- a new mutation in B requires a new picker/account receipt and new explicit operation generation.

### Result truth

A successful result must mean the full normalized target was verified in one account generation.

A partial/error result should not imply “nothing changed” if a prefix was already created.

## Required regressions

1. Account A, one-segment create -> directory verified in A.
2. Account A, multi-segment create -> all segments use one captured A context.
3. A creates first segment -> auth switches B -> remaining A operation stops/supersedes; no B segment is created by the old command.
4. A request outcome unknown -> auth switches B -> recovery does not inspect B path and claim A settled.
5. Retry in unchanged A with already-created prefix -> `409 + exact GET type=dir` continues safely.
6. Retry in B after A partial side effect -> requires a new B operation receipt and does not relabel A history as B.
7. Disconnect mid-tree -> known A prefix remains reported as historical partial settlement; no later current-account mutation is automatic.
8. Manual-token replacement has the same fence as PKCE account replacement.
9. Concurrent Save Root/config mutation cannot cause folder creation to switch root/account generation halfway through the tree.
10. Outer `runtime.sendMessage` loss after full A creation -> reconciliation confirms target in A before UI launches a semantically new request.

## Duplicate check

The folder-picker account-generation delta protects the **selection/admission** boundary. The root-save generation deltas protect root-setting ancillary verification. Existing P0-074 already owns the invariant that a long Yandex operation cannot mix independently fresh auth/config generations.

This checkpoint applies that existing invariant to the user-visible multi-segment `CREATE_FOLDER` mutation and therefore does not justify a new P-number.

## Test / release state

Documentation only. Product tests were not rerun. Historical evidence remains **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. Runtime version remains `0.9.8`; no build, tag or GitHub Release was created.

## Retired source: `RESEARCH_DELTA_YANDEX_MUTATION_RECOVERY_2026-08-27.md`

SHA-256 of UTF-8 source text: `0314b4f62ec491a57c4441b33f14bd0716dfb7ec292348910f73de58f6c0c959`

# Yandex mutation / recovery research delta — 2026-08-27

Baseline source HEAD: `e0692339f4b480b342a998b5199b637fe7ee3fbc`.

This is a lossless research checkpoint. It does **not** replace the canonical registry. `project_docs/PRIORITIES_P0_P1_P2.md` still formally ends at P1-194 until the late research deltas are merged losslessly into both canonical research documents. No production/runtime/config/manifest change is made by this checkpoint.

## Mutation/outcome matrix — no P1-197 assigned from this sub-block

The Yandex mutating API paths were re-researched using the invariant `side effect -> timeout/unknown outcome -> durable receipt/checkpoint -> exact reconciliation -> retry policy`.

### `resources/move` — existing P1-090 / P1-183, stronger evidence

Both destructive move flows (`Journal delete -> Trash` and `ReadmeLater -> Upload`) perform target verification only **after** `await yandexApi('/resources/move', { method:'POST', ... })` returns successfully. If the local 15 s request timeout/Abort wins, `yandexApi()` throws before the verify loop is entered even though the remote service may already have committed the move.

This is not a new root cause. It strengthens the existing requirements:

- **P1-090**: unknown-settlement move must reconcile the exact source/target pair and prove the same object identity, not merely target path/type.
- **P1-183**: Trash delete requires a durable exact target checkpoint before destructive move so restart/timeout can verify exact target/source without deriving a collision-renamed filename.
- **P0-074**: all reconciliation requests must remain bound to the immutable operation auth/account/root context.

Required regression refinement: inject POST timeout after the remote move has physically settled; the current attempt/recovery must preserve the durable operation evidence and later prove exact source/target identity before local Journal finalization. No blind second move.

### `resources/publish` — immediate reconciliation exists; residual items remain existing P0-078/P0-069/P1-184

`ensureYandexPublicUrl()` first reads current `public_url`, attempts `PUT /resources/publish`, catches the publish error, and continues bounded GET polling for `public_url`. Therefore an immediate PUT error/timeout does not directly cause a blind publish retry in the same helper.

Residual contracts are already tracked:

- **P0-078** publication-policy generation fence before any not-yet-started publish;
- **P0-069** explicit durable unpublish/public-link lifecycle for destructive Journal deletion;
- **P1-184** exact object/content identity must be proved before object-scoped publication/recovery.

No new number is assigned here.

### Yandex folder creation — convergent exact-path retry; no new destructive root cause

`ensureYandexFolderTree()` creates one exact path segment at a time. If `PUT /resources` reports 409, the helper performs an exact-path GET and requires the existing resource to be a directory. A locally unknown create that actually settled therefore converges on the same intended directory rather than creating a second arbitrary object. Existing overall deadline/config-generation requirements still apply.

### Signed PDF/backup upload — irreversible PUT is pre-checkpointed; identity proof remains P1-184

Live PDF upload creates `pendingRemoteSaves` before the signed PUT. Journal backup similarly writes a prepared backup checkpoint before the signed transfer. Offscreen signed upload transport retry is disabled for unknown transport errors. The remaining defect is not missing retry suppression but insufficient exact remote object/content proof after an unknown upload outcome, already P1-184.

## Existing-item refinement — generic Yandex timeout text is false for mutating requests

`yandexApi()` currently maps any fetch Abort/timeout, regardless of HTTP method, to the user-facing error:

`Яндекс Диск не ответил ... Операция остановлена без изменения данных.`

For GET this is a reasonable local-side statement. For an already transmitted PUT/POST it is not provable: local timeout is not remote cancellation and the server can commit after the client stops waiting.

Required refinement across P1-090/P1-183/P0-078/P0-069/P1-184 and operation-log UX:

- mutating timeout must say that the result is **unknown/pending verification**, not "без изменения данных";
- do not present terminal failure when a durable checkpoint/reconciliation path exists;
- retry remains operation-specific and is forbidden when it could duplicate/contradict an unknown non-idempotent side effect;
- read-only GET timeout may keep a non-mutation wording.

No P1-197 is assigned solely for misleading wording because the behavioral root causes and reconciliation acceptance criteria already belong to the existing outcome items above.

## Existing-item refinement — P1-178 / P0-074 lazy account-cache race can resurrect stale auth

Fresh source review found a concrete auth-generation race in `getCurrentYandexAccountUid()`:

1. It calls `readYandexAuthState()` and snapshots `yandexAuth=A`.
2. If A has no cached account UID, it calls `yandexApi('')`.
3. `yandexApi()` independently calls `getValidYandexAccessToken()` / `readYandexAuthState()` again. A concurrent disconnect/reauth can therefore make this network GET execute with newer auth `B`.
4. The returned account belongs to B, but the helper then executes `writeYandexAuth({ ...yandexAuth, account })` using the **old A snapshot**.
5. That stale write can overwrite the newer session B, restoring A's old `accessToken` while attaching B's account metadata.

This is stronger than a cosmetic status race: a read-like lazy cache update can mutate and resurrect authorization state after a newer reauthorization.

Classification: do **not** create P1-197. This is an additional required case for **P1-178** generation-fenced auth writes, composed with **P0-074** operation-scoped identity.

Required acceptance/regressions:

- A without cached UID -> account GET starts -> reauth B commits -> late cache write from A must not overwrite B.
- If the GET actually ran under B, its account data must never be attached to A.
- Lazy account cache write must compare/fence the exact auth generation/token identity before commit, or be eliminated in favor of immutable operation context/non-mutating lookup.
- A stale account-info/cache failure must not change the terminal success/failure of a newer auth session.

## Recovery admission refinement — P1-196 / P1-177

`recoverPendingRemoteSaves()` computes `authAvailable` once before iterating its queue. Each later `yandexApi()` still re-reads the current auth state. Once P1-196 introduces authoritative invalid-current-token demotion, this loop must not keep treating the initial boolean as proof that later items can be attempted. A current-generation 401/known expiry should transition recovery to deferred/no-usable-auth for subsequent work, and P1-177 scheduler behavior should pause retries appropriately without destroying user backup preferences.

This remains a refinement of P1-196/P1-177 rather than a new item.

## Test / release evidence

Research documentation only. Product runtime/configuration and `manifest.json` are unchanged. Product tests were not rerun in this checkpoint. The last previously proven product gate remains 88/88 JavaScript syntax + 74/74 deterministic tests PASS; real unpacked Chrome and real Yandex OAuth/API/upload/move/backup E2E remain release QA blockers.

## Retired source: `RESEARCH_DELTA_YANDEX_MUTATION_TIMEOUT_UNKNOWN_SETTLEMENT_2026-08-28.md`

SHA-256 of UTF-8 source text: `5db4225055fc04aa2d2964f59af948d9cef895a3f67fd13738cb815c6ba34749`

# Research delta — Mutating Yandex API timeout is unknown remote settlement, not proven no-op — 2026-08-28

Source-of-truth `main` immediately before this write: `c6f068f7dfc1aa140887af106463363abd7bbf80`.

Docs-only research checkpoint. Runtime/tests/configuration/manifest are unchanged. No new P-number is assigned.

## Classification

Primary existing owners:

- **P1-210** — truthful result/reconciliation before admitting a new user-side-effect generation after result loss;
- **P0-074** — immutable Yandex operation/account/config generation;
- **P1-048** — unknown signed-transfer settlement must not be blindly retried.

Adjacent remote checkpoint/object owners: P0-073/P1-184/P1-198.

## Fresh source proof

`yandexApi(endpoint, options, allowRetry)` is the common HTTP wrapper for both read-only and mutating Yandex Disk requests.

On AbortController timeout / AbortError it currently constructs:

`YANDEX_TIMEOUT: "Яндекс Диск не ответил за ... с. Операция остановлена без изменения данных."`

That statement is too strong for mutating HTTP requests.

The same helper is used by operations including:

- `PUT /resources` while creating folder trees;
- `POST /resources/move` for ReadLater->Upload and Delete->Trash;
- `PUT /resources/publish`;
- other remote mutations and state transitions.

After a client-side timeout, WebClip knows only that it stopped receiving/waiting for a timely response. It does **not** know that Yandex failed to accept or apply the request.

## Why AbortController is not rollback

Aborting the local fetch/request path does not constitute a remote transactional cancellation receipt.

A deterministic schedule is:

1. WebClip sends mutating request M.
2. Yandex receives M and begins/applies the side effect.
3. Response is delayed, lost or exceeds WebClip timeout.
4. local AbortController fires.
5. `yandexApi()` throws `YANDEX_TIMEOUT` saying the operation stopped without data changes.
6. UI/caller may now treat retry as safe.
7. A retry M2 can duplicate or conflict with the already-settled M.

For folder creation a subsequent exact GET/409 reconciliation may converge safely. For moves, publication and other mutations the required reconciliation is operation-specific and can require exact source/target/object/publication receipts.

## Read-only vs mutating timeout semantics

The transport result should distinguish method/operation class.

### Read-only request

GET timeout can be reported as a read failure/unknown observation. It does not by itself create remote mutation evidence.

### Mutating request admitted to transport

PUT/POST/DELETE (and any semantic mutation regardless of HTTP verb) timeout must be returned/logged as conceptually:

- `remoteSettlement: unknown`;
- operation generation retained;
- no assertion that data was unchanged;
- no automatic or user-visible blind retry until operation-specific reconciliation runs.

A proven failure **before network admission** may still be classified `not-admitted` / no remote change.

## Required reconciliation by mutation type

Examples:

- Create Folder: fresh metadata check for exact target under the accepted account/config generation; existing same-directory result can converge.
- ReadLater/Trash move: reconcile exact source/target and resource identity under the original move generation.
- Publish: fresh metadata/publication state for the exact remote object; never assume timeout means unpublished.
- Upload/signed transfer: existing remote checkpoint/transfer receipt rules apply.

The generic `yandexApi()` layer may classify transport settlement, but it must not invent a generic "safe to retry" policy for all mutations.

## UI/result requirements

Do not expose a mutating `YANDEX_TIMEOUT` as a terminal message equivalent to "nothing changed".

Callers should receive structured error/result data sufficient to distinguish:

- `not-admitted`;
- authoritative remote/application failure;
- `remote-settlement-unknown`;
- reconciled success;
- reconciled terminal failure/conflict.

P1-210 then governs what a page may truthfully display and when a new user operation may be admitted.

## Required regressions

1. GET timeout remains a bounded read failure and does not create mutation state.
2. Folder PUT applied remotely but response times out -> result is unknown; reconciliation finds directory and converges without duplicate mutation.
3. Move POST applied remotely but response times out -> source/target identity reconciliation proves outcome before retry.
4. Publish PUT applied remotely but response times out -> metadata reconciliation detects publication and does not blind-publish/relabel privacy state.
5. Mutating request fails locally before transport admission -> caller may receive proven `not-admitted` rather than unknown.
6. Reconciliation timeout remains unknown; it is not converted to no-op by elapsed time.
7. Account/root generation changes while outcome is unknown -> old operation receipt is quarantined/reconciled in its original context, not replayed under current context.
8. OperationLog records distinguish client timeout from authoritative remote rejection.

## Duplicate check

P1-210 currently owns **outer runtime response/channel loss** and retry admission. P1-048 owns signed-transfer no-blind-retry semantics. Repository search found no dedicated checkpoint correcting the generic Yandex HTTP wrapper's statement that a timed-out mutating request made no changes.

This is a lower transport-layer manifestation of those existing settlement/reconciliation invariants and does not justify a new number.

## Test / release state

Documentation only. Product tests were not rerun. Historical evidence remains **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. Runtime version remains `0.9.8`; no build/tag/Release was created.

## Retired source: `RESEARCH_DELTA_YANDEX_OAUTH_2026-08-26.md`

SHA-256 of UTF-8 source text: `c004b3157db82240640c699ea3ca17c38b4845e0cc620f2ca1c2ba07b4decf99`

# Yandex OAuth research delta — 2026-08-26

Baseline source HEAD: `8b823bbe1d0a33965d82a835f63e460e8e100735`.

This file is a lossless research checkpoint created because the connected GitHub mutation surface currently exposes complete-file replacement but no server-side text patch/append operation. It is **not** a substitute for the canonical registry. Until the findings below are merged into both `project_docs/PRIORITIES_P0_P1_P2.md` and `DEEP_RESEARCH_2026-08-25.md` in one lossless sync, the canonical registry still formally ends at **P1-194**. No production/runtime/config/manifest change is made by this checkpoint.

## P1-195 — Yandex OAuth capability/scope truthfulness — CONFIRMED, pending canonical sync

Current source conflates possession of an OAuth access token with proof that the token has every Yandex Disk capability required by WebClip.

Evidence from `service-worker.js`:

- `YANDEX_SCOPES` requests `cloud_api:disk.read`, `cloud_api:disk.write`, and `cloud_api:disk.info`.
- Standard PKCE completion persists `token.scope` (or falls back to the requested set only when `scope` is absent), but no later admission path parses or enforces the persisted granted set.
- `getYandexStatus()` declares `connected: Boolean(yandexAuth?.accessToken)` and always returns `scopes: YANDEX_SCOPES`, not the actual granted scope stored with the token.
- `finishYandexOAuth()` stores the token before the account-info read and intentionally ignores failure of the subsequent `GET /v1/disk`, so a token missing an information capability can still finish as a successful connection.
- Manual-token auth persists `scope: ''`, validates primarily with `GET /v1/disk`, and Options then renders ordinary green `Подключено`; that read/status proof does not prove all write/move/publish capabilities.
- All Yandex helpers ultimately use the same `yandexApi()`/`getValidYandexAccessToken()` gate, which currently checks token presence/lifetime only, not operation capability.
- Existing deterministic scalar tests assert only that persisted scope text is bounded; there is no reduced-scope/unknown-capability regression.

Current Yandex OAuth documentation confirms the relevant protocol semantics: the token response has `scope` as an optional field returned when OAuth grants a smaller set than requested. Therefore absence of `scope` on the standard code-exchange response can represent the full requested set, while an explicit reduced `scope` must not be ignored.

Required contract:

- Model authorization capability explicitly, e.g. `requested / granted / missing / unknown` per required Disk capability.
- Standard PKCE must parse the actual granted set; `full-ready` is allowed only when all capabilities required by the intended operation are proved.
- Manual token without a documented reliable scope-introspection mechanism must remain capability `unknown` unless a safe proof is available. Do not silently equate a successful status/read call with write/move/publish permission.
- Centralize capability admission for upload, folder creation/listing, move/delete-related flows, publication, Journal backup, and recovery; do not scatter ad-hoc checks across entry points.
- Do not use hidden destructive permission probes. Explicit user actions may exercise their normal operation, but the research/fix must not create remote side effects merely to infer scopes.
- Options/status must distinguish “token present/connected” from “required capabilities proven”.

Required evidence/regressions:

1. Explicit reduced PKCE scope does not render full-ready and cannot enter operations requiring a missing capability.
2. Omitted `scope` on the documented standard token response is treated consistently with the requested set.
3. Manual token with unknown scope is shown honestly as unknown/partial, not full-ready.
4. Read-only/insufficient token cannot reach write/move/publish admission.
5. Upload/folder/move/publish/backup/recovery share the same capability decision model.

Not duplicates: **P1-178** remains OAuth/config generation and stale-completion ordering; **P1-191** remains transactional manual-token replacement.

## P1-196 — Yandex OAuth validity/lifetime truthfulness — CONFIRMED, pending canonical sync

Current authorization readiness also conflates “token object exists” with “token is currently valid”.

Evidence from `service-worker.js`:

- `getYandexStatus()` ignores `expiresAt` and reports `connected=true` whenever an access token exists, including a locally known expired token.
- `getValidYandexAccessToken()` rejects a known expiry only at operation time and does not transition the stored/status auth state to `expired`.
- Manual-token auth hardcodes `expiresAt: 0`. Current Yandex debug-token flow returns `expires_in`, so token-only input discards known lifetime metadata and the worker subsequently treats zero as “no local expiry check”.
- Standard PKCE uses `normalizeYandexOAuthExpiresIn()`, where an absent/empty or zero lifetime becomes `0`; the saved record then also bypasses the expiry check instead of carrying an explicit unknown/invalid lifetime state.
- `yandexApi()` throws on non-OK HTTP responses but does not invalidate/demote the exact auth session on an authoritative current-token 401. A revoked/expired token can therefore continue to appear connected and be reused on later requests.
- Background/recovery paths can repeatedly encounter the same invalid token; token presence and backup scheduling are not the same thing as a usable authorization state.

Current Yandex OAuth documentation states that `expires_in` is the token lifetime and that tokens can expire or be revoked. This makes an explicit validity model necessary rather than treating missing lifetime as indefinite validity.

Required contract:

- Introduce explicit validity semantics such as `valid / expired / invalid / unknown` alongside P1-195 capability state.
- A locally known expiry must immediately affect status and admission; UI must not remain green/full-ready after the stored expiry boundary.
- Standard OAuth response validation must handle documented lifetime metadata fail-closed or explicitly unknown; malformed/missing fields must not silently become an indefinite token.
- Manual token-only input must not invent an infinite lifetime. Either expose unknown lifetime honestly or accept a safely parsed complete debug-token result that includes lifetime metadata.
- An authoritative invalid-current-token response may demote/invalidate only the **exact current auth generation**. A stale 401 from operation/auth A must not clear a newer reauthorization B; this composes with **P1-178** and **P0-074**.
- Do not classify every 403 as invalid auth: Yandex can use forbidden responses for missing permissions/resource access, which belongs to P1-195 capability/resource handling.
- No blind retry of non-idempotent side effects after an auth error with unknown external settlement.

Required evidence/regressions:

1. Known-expired PKCE token is not reported ready and cannot enter a Yandex operation.
2. Manual token-only lifetime remains explicit `unknown`, not indefinite `valid`.
3. Safely supplied debug-token lifetime is enforced.
4. Current-generation invalid-token/401 demotes that auth state.
5. Stale 401 after A→B reauthorization cannot clear B.
6. 403 insufficient-scope/resource-denial is not blindly treated as token revocation.

## Existing-item refinement — P1-178 active auth identity vs newer configured Client ID

Fresh review adds another instance of the same auth/config authority conflict already tracked by P1-178.

`getYandexStatus()` chooses `yandexAuth.clientId` before `yandexConfig.clientId`. `options.js::refreshStatus()` writes `status.clientId` back into the visible Client ID field. Therefore a newer imported/direct configuration B can be visually replaced by the active session's older Client ID A. If the user starts a new OAuth attempt while A is still active, the Start Auth handler reads that visible field and can actually start A again, defeating the newer configuration without a storage race.

Required P1-178 model should separate at least:

- active-auth identity/clientId for the currently usable token;
- configured clientId for the **next** authorization attempt;
- pending auth-attempt identity/generation.

A newer configured value must remain authoritative for subsequent authorization even while an older valid token is intentionally kept alive until replacement succeeds.

## Existing-item status correction — P0-034 refresh-token minimization is not fully closed

P0-034 says previous versions' unused `refresh_token` persistence was removed and the current session retains only the necessary access token. Fresh migration review shows an uncovered legacy path:

- `readYandexAuthState()` reads a legacy `yandexAuth` object from `chrome.storage.local`.
- When no session token exists, migration performs `chrome.storage.session.set({ [YANDEX_AUTH_KEY]: legacyAuth })` **with the complete legacy object** and then removes the persistent copy.
- Older versions are known by P0-034 itself to have stored a real `refresh_token`; therefore that unused stronger credential can be carried into the new session object instead of being stripped during migration.
- Subsequent account-cache writes spread the existing auth record, so an accidentally migrated refresh token remains for the browser session.
- `project_tools/test_yandex_legacy_token_cleanup.js` verifies awaited deletion of the persistent secret but does not cover sanitizing a legacy object that contains `refreshToken`.

Required direction: P0-034 should be treated as **PARTIAL** until migration/read/write normalization builds a minimal allowlisted auth record and explicitly drops obsolete `refreshToken`/unknown secret-bearing legacy fields. Preserve P0-057 fail-closed persistent cleanup. Add a regression with legacy `{ accessToken, refreshToken }` proving persistent storage is removed and only the accepted minimal session auth fields remain.

## Rejected / non-new hypotheses in this block

- **Scope delimiter:** current official localized Yandex documentation is inconsistent about comma-vs-space presentation. Current WebClip uses the OAuth-standard space-separated representation. No new defect is assigned without a real Yandex reproduction; a robust P1-195 parser may safely tolerate documented representations without changing the authorization request based on speculation.
- **Refresh-token use:** do not create another item. P0-034 intentionally removed the unused refresh secret, while P2-017 already tracks a future real-Yandex public-client/session-only refresh experiment. No `client_secret` is introduced.
- **OAuth state:** no duplicate. Manual screen-code state verification remains P1-165.
- **403 handling:** capability/resource denial and auth invalidation must stay distinguishable; this is handled by P1-195 + P1-196 rather than a new item.

## Test / release evidence

This checkpoint is research documentation only. Product runtime/configuration and `manifest.json` are unchanged. Product tests were **not** rerun. The last proven product gate remains **88/88 JavaScript syntax + 74/74 deterministic tests PASS** from the earlier P0-063 gate. Real unmanaged unpacked Chrome and real Yandex OAuth/API/upload/move/backup E2E remain release blockers.

## Retired source: `RESEARCH_DELTA_YANDEX_ROOT_COMMIT_SCHEDULER_RECONCILIATION_2026-08-28.md`

SHA-256 of UTF-8 source text: `1b581db756bb7ae941ea94b75876adbf39fdaf3ef3ac723d02998aa6235dca59`

# Research delta — Yandex root commit must durably reconcile scheduler/structure — 2026-08-28

Source-of-truth `main` immediately before this write: `e0156a4d27eedb02dc582e83ca45b2c5b5c04ce5`.

Docs-only research checkpoint. Runtime/tests/configuration/manifest are unchanged. No new P-number is assigned.

## Classification

Fresh source proof refines existing:

- **P1-177** — backup scheduler must converge to current settings/root/auth state;
- **P0-074** — Yandex root/config generation must remain coherent through long/partial operations;
- **P1-008** — settings changes that require ancillary scheduler reconciliation need a durable completion marker/generation;
- **P1-210** — an outer error must not be interpreted as proof that a partially committed multi-step operation did not change state.

No new generic configuration-reconciliation number is needed.

## Fresh source proof — root is committed before remote structure and scheduler

`saveYandexRoot(rootPath)` first validates/normalizes the requested root and then calls `updateYandexConfig(...)`.

Inside that config mutation it durably publishes:

- `config.rootPath = normalized`;
- removal of legacy `journalBackupFolder`.

Only **after this current root is committed** does the function perform later work:

1. if current auth exists, `ensureYandexServiceFolders({ includeUpload:true, includeReadLater:true, includeBackup:true })`;
2. if that succeeds, set `structureVerified=true`;
3. call `initializeJournalBackupScheduler('root-change')`;
4. return success to Options.

The source comment explicitly states that when service-folder verification fails, the chosen root intentionally remains saved so the operation can be retried later.

Therefore `saveYandexRoot()` is not an atomic "validate everything, then publish root" operation. Its durable commit point precedes ancillary remote/scheduler reconciliation.

## Deterministic partial-commit schedules

### Remote structure error

1. Current config/root generation is A.
2. User selects new root B.
3. `updateYandexConfig()` durably commits B.
4. `ensureYandexServiceFolders()` encounters an auth/network/Yandex error.
5. Function rejects before `initializeJournalBackupScheduler('root-change')`.
6. Caller sees an error, but durable root is already B.
7. Existing periodic/retry alarms and backup status/reconciliation may still reflect scheduler decisions admitted under A until a later independent repair path runs.

This is an intentional partial config commit but an **unmarked ancillary reconciliation failure**.

### MV3 termination window

Even when remote folder checks are healthy:

1. B config commits.
2. Worker stops unexpectedly before or during later structure/scheduler work.
3. On restart, there is no root-change-specific durable marker saying "config generation B committed; required scheduler/structure reconciliation is incomplete".
4. Startup may run general scheduler initialization, but correctness should not depend on reconstructing the causal transition solely from current values and historical backup state.

The marker/generation pattern already exists for user-settings import because that operation correctly recognizes that durable settings commit and ancillary scheduler reconciliation are separate completion stages.

## Why existing alarm fresh reads are not enough

Alarm handlers fresh-reading current root/auth are a useful safety defense: an old alarm need not blindly upload to root A after B is current.

But durable scheduler state has more semantics than "eventually a handler reads B":

- a new root should normally be treated as a new backup-coverage namespace;
- old root success timestamps must not postpone first B backup (already refined by the backup-state provenance delta);
- disabled/no-auth/root-unverified state must converge to the intended alarm set;
- stale retry/periodic alarm times should not remain authoritative merely until they happen to fire;
- a failed structure verification may require visible deferred state rather than a generic save error that obscures the committed root.

Thus root commit completion and scheduler/structure reconciliation must be modeled separately.

## Required contract

### Durable root mutation generation

A successful config commit of root B must advance a Yandex config/root generation and persist enough tiny reconciliation state to prove:

- B is the current committed root;
- remote service-structure verification for B is `pending / verified / failed-unverified`;
- scheduler reconciliation for B is `pending / applied`;
- historical A backup state remains historical and is not current-B coverage.

Exact field/schema choice is implementation-specific.

### Ancillary failure does not roll back factual root state

If product intentionally preserves B when folder verification fails, UI/runtime must return a structured **partial** result rather than an undifferentiated error that encourages the user to infer no setting changed.

A useful result distinction is:

- root not committed;
- root B committed + structure verified + scheduler reconciled;
- root B committed + structure pending/failed + scheduler reconciliation pending;
- result transport unknown, requiring read-only reconciliation before retry.

Do not silently roll B back after a remote side effect unless that rollback itself is generation-safe and explicitly designed.

### Startup/retry reconciliation

Worker startup and later status reads should detect an incomplete root-generation marker and safely converge:

1. current auth/account/root generation;
2. service-folder structure for that exact generation when authorization is available;
3. backup scheduler generation;
4. backup-status namespace/coverage receipt.

A newer root C supersedes B. A late B reconciler must not create folders/scheduler state and then publish itself as current after C won.

### Outer transport loss

If the page loses the response after B committed, retrying "Save Root B" may be locally idempotent at the config value but remote folder creation/scheduler mutations still need current-generation reconciliation. UI should first read current root/reconciliation status rather than treating channel loss as proof B failed to save.

## Composition with existing findings

- The folder-picker account-generation delta controls whether the requested path was authorized under the current account.
- P0-074 controls immutable account/root/config context for the remote folder operations.
- P1-177 controls actual future alarm state.
- P1-008 already demonstrates a durable reconciliation marker pattern for settings import.
- Backup-state account/root provenance ensures an old success A does not make B appear covered.
- P1-210 governs the page-visible result when the outer RPC result is lost.

## Required regressions

1. Root A -> B, all steps succeed -> B current, structure verified, scheduler applied exactly once.
2. Root B config commits -> first folder check fails -> status explicitly reports B committed + reconciliation pending; old A scheduler state is not presented as current truth.
3. Same schedule followed by worker restart -> B reconciliation resumes safely without user re-entering the root.
4. Worker stops after B commit before scheduler call -> startup detects/reconciles B.
5. B pending -> user commits C -> late B reconciler cannot overwrite C scheduler/root state.
6. B commit response channel is lost -> page refresh/reconcile discovers B before allowing a semantically new mutation.
7. B folder create partially settles remotely with unknown outcome -> no blind duplicate tree mutation; re-read exact B structure.
8. Old root A backup success remains historical and does not postpone required B backup.
9. Disconnect/no-auth after B commit -> structure can remain pending while scheduler converges to paused/no-auth under P1-177.
10. Reauth later resumes B structure/scheduler only if B generation is still current.

## Duplicate check

Repository commit search for `root change scheduler reconciliation` / `root saved scheduler` found no dedicated checkpoint. Existing P1-177 and P0-074 own the relevant scheduler/config generations; P1-008 already owns the generic requirement that durable settings commit and ancillary scheduler reconciliation are distinct stages.

This delta defines the same missing completion contract for direct `saveYandexRoot()` and does not justify a new P-number.

## Test / release state

Documentation only. Product tests were not rerun. Historical evidence remains **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. Runtime version remains `0.9.8`; no build, tag or GitHub Release was created.

## Retired source: `RESEARCH_DELTA_YANDEX_ROOT_SAVE_CROSS_TAB_RESULT_GENERATION_2026-08-28.md`

SHA-256 of UTF-8 source text: `5aa1225b874ff9dfaa85e259af07fd04cdcafbbafa5a1bee8aa528d1d7a453ac`

# Research delta — Save Root result can mix concurrent Yandex root generations — 2026-08-28

Source-of-truth `main` immediately before this write: `ebceffe03b25dcbbbffcb5ef72d2f6a608fb5459`.

Docs-only research checkpoint. Runtime/tests/configuration/manifest are unchanged. No new P-number is assigned.

## Classification

Primary owner: **P0-074 — immutable Yandex operation/config generation**.

Adjacent:

- **P1-157** shared extension-page/settings mutation ordering;
- **P1-177** scheduler state for the current root generation;
- the immediately preceding root partial-commit reconciliation delta;
- **P1-210** for truthful outer operation result/reconciliation.

## Fresh source proof

`saveYandexRoot(requestedRoot)` normalizes the requested path to local variable `normalized` and first commits it through `updateYandexConfig()`.

After that commit, when auth exists, it calls:

`ensureYandexServiceFolders({ includeUpload:true, includeReadLater:true, includeBackup:true })`

Crucially, `ensureYandexServiceFolders()` does **not** consume the root generation/value that `saveYandexRoot()` just committed. It starts with a fresh independent:

`const config = await getYandexConfig()`

and builds/creates/verifies service folders below `config.rootPath` from that later read.

Finally, `saveYandexRoot()` does not return the root that `ensureYandexServiceFolders()` actually verified. It returns the old local request value:

`rootPath: normalized`

and sets `structureVerified=true` solely because the later helper completed.

Thus one operation response can combine two different config generations.

## Deterministic two-Options-tab schedule

1. Current root is A.
2. Options page P1 invokes Save Root B.
3. P1's `updateYandexConfig()` commits B.
4. Before P1 calls/finishes `ensureYandexServiceFolders()`, Options page P2 invokes Save Root C.
5. P2's config mutation commits newer C.
6. P1 enters `ensureYandexServiceFolders()` and fresh-reads current config C.
7. P1 verifies/creates Upload, ReadmeLater and Backup/Journal under **C**, not B.
8. P1 sets local `structureVerified=true`.
9. P1 calls scheduler reconciliation, which likewise operates against current state and may therefore be C.
10. P1 returns `{ok:true, rootPath:B, structureVerified:true, ...paths derived from B}` to its caller.
11. P1 UI can display "Корневая папка сохранена: B. Служебные папки ... проверены" even though current root is C and the folder verification performed by this call was for C.

This does not require timeout, crash, network failure or account switch. Ordinary concurrent settings tabs are sufficient.

## Why storage serialization is insufficient

`updateYandexConfig()` serializes physical config writes. That prevents B and C storage mutations from overtaking each other at the Chrome Storage layer.

The defect occurs **after** B's serialized write has completed: later steps of B no longer retain B generation authority and independently read current config. Physical storage ordering therefore works exactly as designed while the logical operation receipt becomes mixed-generation.

This is the same general invariant P0-074 already requires for long Yandex uploads, now proven on the direct root-settings workflow itself.

## Required contract

### Root-save receipt

The config mutation that publishes B should return an immutable root/config generation receipt, for example conceptually:

- committed root B;
- config generation GB;
- auth/account generation accepted for ancillary verification;
- operation receipt id.

All later B-specific work must either consume that exact receipt or explicitly discover it has been superseded.

### Structure verification

`ensureYandexServiceFolders()` needs an operation-context form that can verify an expected root/account generation rather than always fresh-binding to whichever config is current at helper entry.

For a Save Root operation admitted as GB:

- if GB is still current, verify/create B structure and return a GB-tagged structure receipt;
- if C/GC superseded it, stop B's ancillary work or return `superseded`, not `structureVerified:true for B`;
- do not reinterpret B's request as authorization to manage C merely because C is now globally current.

### Response truth

A returned `rootPath`, service paths, `structureVerified`, scheduler state and account identity must all describe one coherent accepted generation.

If B was superseded by C before completion, acceptable UX includes:

- "B was saved but has already been superseded by C; current state refreshed"; or
- a stale/conflict result that refreshes current settings.

It must not report B as current/verified when the actual verification occurred for C.

### Scheduler handoff

Scheduler reconciliation after root save should be based on a fresh **current scheduler generation** as required by P1-177, but the root-save result must distinguish:

- B's historical config commit outcome; from
- current C scheduler state.

Do not label current-C scheduler reconciliation as proof that B's structure was verified.

## Required regressions

1. Save B with no concurrent mutation -> B structure verified; response all GB.
2. B commits -> C commits before B structure check -> B call returns superseded/conflict, never `B + verified(C)`.
3. B folder verification begins -> C commits mid-tree -> remaining B work does not silently switch to C.
4. B commits under account X -> auth switches Y before verification -> P0-074 account generation fails closed; no mixed X/B response with Y structure.
5. P1 and P2 Save Root concurrently -> final config C and every individual response truthfully identifies whether its generation won/superseded.
6. B response channel lost, C later commits -> reconciliation reads current GC and does not resurrect B.
7. Scheduler reconciliation may target newest current root, but response fields do not conflate that with B structure proof.
8. Service-folder creation already settled for B just before C wins -> B historical result may be logged, but current root remains C and no B success response overwrites UI without generation check.

## Duplicate check

The prior Yandex single-operation context delta proved the same invariant for PDF upload, where initial config A could mix with later service-folder config C. Repository search found no dedicated Save Root concurrency checkpoint.

This is therefore a new manifestation of **P0-074**, not a new root-cause number.

## Test / release state

Documentation only. Product tests were not rerun. Historical evidence remains **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. Runtime version remains `0.9.8`; no build/tag/Release was created.

## Retired source: `RESEARCH_DELTA_YANDEX_SINGLE_OPERATION_CONTEXT_COHERENCE_2026-08-28.md`

SHA-256 of UTF-8 source text: `a033a05c705ab7a53d17dd4a4dff7957b284a8393220991602957338c6c222e8`

# Research delta — Yandex single-operation auth/root/account context coherence — 2026-08-28

Source-of-truth `main` immediately before this write: `33e9b18a423440e14c538583acb0c5768fdd6fa9`.

Docs-only research checkpoint. Production runtime, tests, configuration and `manifest.json` are unchanged. Canonical large-table synchronization is not claimed by this file.

## Classification

No new P-number is assigned.

Fresh source proof strengthens existing:

- **P0-074** — one immutable Yandex auth/config operation context for the full long-running operation;
- **P0-073** — account/root namespace proof must describe the same remote object attempt;
- **P1-178/P1-191/P1-196** — auth replacement/completion/validity generations;
- **P1-184** — remote object/content proof must be bound to that same operation context;
- **P1-158** — bounded prerequisite config/auth reads, without treating a fresh read as permission to switch semantic generation mid-operation.

The new deterministic proof is a **mixed-root checkpoint inside one ordinary upload**: current code can produce a receipt whose `rootPath` comes from generation A while `remotePath` was built under newer root C and `accountUid` was obtained from another fresh auth read.

## Current upload reads mutable Yandex state more than once

`uploadCachedRecordToYandex()` begins with:

`const config = await getYandexConfig()`

and keeps that object in the local `config` variable.

It later calls:

`ensureYandexServiceFolders(...)`

which itself executes another:

`const config = await getYandexConfig()`

and independently calls `getValidYandexAccessToken()`.

The upload then builds `branchPath`, `targetFolder` and `remotePath` from the **returned structure**, while later computing:

`const accountUid = await getCurrentYandexAccountUid(operationId)`

and separately:

`const rootPath = normalizeDiskPath(config.rootPath || '')`

using the **original first config snapshot**.

Those values are written into the remote-save checkpoint together.

## Deterministic A -> C mixed-root receipt

1. Upload U starts while current root is A; first `getYandexConfig()` returns A.
2. Before `ensureYandexServiceFolders()` reads config, user changes root to C.
3. `ensureYandexServiceFolders()` reads C and creates/verifies C's service branch.
4. Returned `structure.uploadPath`/`readLaterPath` is under C.
5. `targetFolder` and `remotePath` are therefore built under C.
6. `getCurrentYandexAccountUid()` performs another current auth read and may observe the current account/auth generation at that later time.
7. `rootPath` for the checkpoint is nevertheless taken from the original local `config` A.
8. `checkpointPendingRemoteSaveIntent()` can therefore receive `remotePath=C/...` with `rootPath=A`.

No concurrency between two uploads is required. One user/config mutation during one upload is enough.

## Account/auth can be another independent generation

`getCurrentYandexAccountUid()` fresh-reads `readYandexAuthState()` at the moment it is called. If an auth replacement happened after the service-folder work, account identity can belong to a different generation from the token used by an earlier API call.

`yandexApi()` itself obtains `getValidYandexAccessToken()` for each request rather than receiving an immutable operation token/context.

Therefore a multi-request sequence can legitimately perform different network requests under different current auth generations unless every step is fenced externally.

Physical serialization of auth/config storage writes does not solve this. A fresh read is current at one instant; it is not proof that the entire already-started operation has authority to switch to that generation.

## Why this receipt is dangerous

P0-073/P1-184 recovery relies on account/root/path fields as namespace and object evidence.

A checkpoint that internally says:

- expected root A;
- remote path under C;
- account UID from another current generation;

is not a trustworthy operation receipt even if each individual field was correctly read at some point.

Depending on later validation order this can cause:

- recovery to fail permanently after an external object was actually created;
- a false root/account mismatch that loses local finalization authority;
- or future code to accidentally weaken containment checks to accommodate impossible mixed receipts.

The correct fix is not to loosen validation. It is to prevent the impossible receipt from being admitted.

## Destructive/move flows have the same architectural requirement

Journal Trash/ReadLater move paths repeatedly combine:

- current account proof;
- current `getYandexConfig()` root;
- located source path;
- service-folder preparation;
- later `yandexApi()` requests.

Even when individual path containment checks are correct, a root/auth change between these stages must make the old operation stale; it must not silently continue by adopting the newer current config/token.

P0-074 therefore applies symmetrically to uploads, recovery and destructive moves.

## Required immutable `YandexOperationContext`

At operation admission, capture/issue a context receipt that binds at least:

- auth-session generation/token fingerprint without logging the secret;
- proven account UID generation;
- config generation;
- normalized rootPath;
- publication-policy generation where applicable;
- operation/remote-save receipt.

Every remote API/ensure/locate/upload/verify step must either:

1. execute using that exact context; or
2. fresh-check current state only to prove the context is still current, failing stale before a new side effect if it changed.

A helper must not silently substitute a later current root/token into an older operation and still report success for the older operation.

## API/helper consequence

`ensureYandexServiceFolders()` should not internally choose a different root generation for a caller that already owns an operation context. It should accept the exact context/root or validate an expected generation.

Likewise `yandexApi()` in a long operation should not independently choose whichever token is current on every call. The request should be attributable to the exact operation auth generation; a 401/demotion must also be generation-specific under P1-196.

P1-158 bounded-read work remains necessary, but replacing direct reads with bounded fresh reads alone is insufficient: bounded A/C/B reads can still create a logically mixed receipt.

## Required deterministic regressions

1. Upload starts under root A -> root changes to C before service-folder ensure -> old upload fails stale before external mutation under C, or continues entirely under immutable A; it never checkpoints `root=A, remotePath=C/...`.
2. Root changes after service-folder ensure but before checkpoint -> old context remains internally consistent or fails stale; no mixed receipt.
3. Auth A starts upload -> auth B replaces it between two Yandex API requests -> old operation cannot silently perform later requests under B and finalize them as A.
4. A -> B -> A with distinct auth/config generations does not pass equality merely because values later look identical; generation receipt distinguishes them.
5. Account UID obtained under auth B cannot be combined with root/path/object proof from operation A without explicit same-context validation.
6. Remote checkpoint stores one coherent account/root/path/auth/config generation and recovery verifies the same tuple after restart.
7. ReadLater -> Upload move root changes between locate and target-folder ensure -> no move occurs under a root generation not authorized by the operation.
8. Trash move auth changes after source object proof -> late old operation does not use the newer token to mutate the object.
9. `saveYandexRoot(B)` racing `saveYandexRoot(C)` continues to obey the previously recorded rule: B cannot report `structureVerified:true` for C.
10. A stale 401 from auth A cannot demote current auth B; P1-196 uses exact auth generation.
11. P1-158 timeout of a prerequisite config/auth read fails boundedly without causing a later read result to start an old operation under a new context.
12. Normal stable auth/root operation still completes with one coherent receipt and no extra user-visible prompts.

## Duplicate check

No new item is created.

Existing auth/config-write and account-cache deltas already establish stale async writer races. Existing remote-checkpoint-generation delta establishes cross-attempt row ownership. This checkpoint adds a complementary within-one-operation proof: **independent fresh reads can create a mixed semantic generation even when no stale write or concurrent upload row overwrite occurs.**

The root invariant is still P0-074/P0-073/P1-184: one immutable operation context from admission through external side effects and recovery.

## Test / release state

No product tests were rerun for this docs-only checkpoint. Historical product gate remains **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. Runtime/version remain unchanged (`0.9.8`). No build, tag or Release was created.

## Retired source: `RESEARCH_DELTA_YANDEX_TEST_CONNECTION_HIDDEN_PROVISIONING_2026-08-28.md`

SHA-256 of UTF-8 source text: `e6b295ac433a9118dc1b3b92494dc763d1e16a07b80de3d9a66a2b02d293fd73`

# Research delta — Yandex connection test should not hide remote provisioning — 2026-08-28

Source-of-truth `main` immediately before this write: `51235adf507c2117fb4d7bc0b3d38c1dda3f6757`.

Docs-only research checkpoint. Runtime/tests/configuration/manifest are unchanged.

## Classification

No new P-number is assigned.

Primary existing owner: **P1-195** — Yandex capability admission must be operation-specific; read/browse operations should not silently perform write/provisioning side effects.

Adjacent owners:

- **P0-074** — one Yandex operation context/account generation;
- **P1-210** — partial/unknown result after a side effect;
- **P1-177** — auth/status/scheduler state remains distinct from ancillary remote setup.

## Fresh source proof

`testYandexConnection()` starts as a read-like diagnostic:

1. `yandexApi('')` reads Disk/account info;
2. extracts account identity;
3. stores that account into the current auth state when available.

However, when `config.rootPath` is configured, the same command then calls:

`ensureYandexServiceFolders({ includeUpload: true, includeReadLater: true, includeBackup: true })`.

That helper verifies **or creates** the managed directory hierarchy for:

- Upload;
- ReadmeLater;
- Backup/Journal.

Therefore pressing a UI control labeled as checking/testing access can mutate the user's remote Disk before any save/backup operation actually requires those folders.

## Why this is more than wording

The distinction matters for capability and result semantics.

### Read capability becomes write capability

A user may reasonably expect “Проверить доступ” to prove:

- token/account validity;
- disk read/info access;
- optionally whether configured root exists/is accessible.

Creating service directories consumes `disk.write` and changes remote state. It should be explicit provisioning or a prerequisite of the first operation that actually needs the branch.

### Partial result is ambiguous

Deterministic schedule:

1. account read succeeds; token is valid and account A is proven;
2. account metadata is written locally;
3. service-folder creation fails on the second/third branch or its outer response is unknown;
4. `testYandexConnection()` rejects.

The UI can now report “connection test failed” even though authentication/account access was successfully proven and one or more remote directories may already have been created.

Retrying the test can perform more writes, and auth/account truth is conflated with ancillary provisioning truth.

### Multi-request generation rules still apply

If provisioning is retained anywhere, the folder-tree P0-074 research applies: a multi-segment tree cannot switch accounts/auth generations halfway through.

## Required P1-195 refinement

### Separate diagnostic read from provisioning

A connection-test operation should return a structured diagnostic result using only the minimum required capabilities, for example:

- auth valid/invalid;
- account identity;
- quota/basic Disk info;
- configured root existence/accessibility if requested as a read.

It should not create Upload/ReadmeLater/Backup folders as an undocumented consequence.

### Provision folders at explicit write boundaries

Managed folders may be created when required by:

- Save to Yandex;
- Read Later;
- background/manual backup;
- explicit “create/repair WebClip folders” action if such UI exists.

Each such write operation has its own account/config/operation receipt.

### Preserve truthful partial diagnostics

If account validation succeeds but an optional follow-up check fails, the result should preserve the proven auth/account fact rather than collapse the entire command into a generic “connection failed”.

No remote side-effect uncertainty should be hidden inside a read-looking status response.

## Required regressions

1. Valid token + configured root + missing service folders -> Test Connection does not create directories.
2. Test Connection succeeds using read/info capability only and reports account A.
3. Missing/invalid token -> test fails without any remote write.
4. Save/Read Later/Backup still explicitly create only their required managed branches.
5. Explicit provisioning, if retained, reports partial/unknown side effects separately from auth validity.
6. Root/account changes between test and later write require a fresh operation context; test receipt does not authorize provisioning in a different generation.

## Duplicate check

The earlier restore-list research already established P1-195 for hidden folder creation during a read/browse operation. This checkpoint applies the same existing rule to the separate `WEBCLIP_YANDEX_TEST`/`testYandexConnection()` path; no new root-cause number is needed.

## Test / release state

Documentation only. Product tests were not rerun. Historical evidence remains **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. Runtime version remains `0.9.8`; no build, tag or GitHub Release was created.

