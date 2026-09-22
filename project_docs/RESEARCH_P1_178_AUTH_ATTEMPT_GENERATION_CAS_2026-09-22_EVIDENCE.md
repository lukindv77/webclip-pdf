# WebClip — P1-178 auth-attempt generation CAS — 2026-09-22

Date: 2026-09-22  
Owner: P1-178  
Bounded composition: P1-191  
Baseline main: `02e60e04d7720f80c1b2238657b4a7476b3d01a5`  
Manifest version: `0.9.8`  
Release readiness: **NOT READY**

## 1. Purpose

Implement the source/runtime subset of P1-178 that can be closed without changing the current Yandex authorization transport or executing live provider qualification.

The current fixed verification-code + PKCE flow previously had one mutable `yandexOAuthPending` slot. A finish operation captured whichever pending object was current before token exchange, but after the network boundary it did not re-check whether that same attempt still owned authorization authority.

Concrete stale schedules therefore included:

```text
OAuth A exchange starts
-> OAuth B starts
-> A exchange returns
-> A could write token/config and remove B pending

OAuth A exchange starts
-> manual-token intent starts
-> A exchange returns
-> A could overwrite the newer credential intent

OAuth A exchange starts
-> Disconnect
-> A exchange returns
-> A could repopulate authorization after disconnect
```

Storage-operation serialization is not enough to prevent these schedules because it orders physical storage mutations but does not prove that a long-running network result still belongs to the current logical authorization intent.

## 2. Current product transport remains unchanged

The canonical WebClip requirement remains:

```text
Authorization Code + PKCE
redirect_uri=https://oauth.yandex.ru/verification_code
Client Secret is not embedded in the extension
```

The production worker continues to:

- request `response_type=code`;
- use PKCE `S256`;
- open the Yandex authorization page in a normal Chrome tab;
- receive the confirmation code only through user input in Options;
- exchange the code without an embedded Client Secret.

No `identity` manifest permission, `chrome.identity.getRedirectURL()`, `chrome.identity.launchWebAuthFlow()`, or chromiumapp redirect is introduced.

## 3. P1-165 remains a separate blocker

Yandex documents the screen-code flow with fixed `verification_code` redirect as a flow in which the confirmation code is displayed in the browser and manually supplied to the application. Yandex also documents `state` as a value returned unchanged, while its URL-callback flow exposes `code` and `state` through the redirect URL.

Chrome documents `launchWebAuthFlow()` as completing when the provider redirects to the Chrome-generated `https://<extension-id>.chromiumapp.org/*` URL and returning that final URL to the extension.

Current WebClip product authority fixes the Yandex screen-code redirect, and the extension does not observe the final redirect URL in that transport. Therefore this tranche does **not** claim returned-state equality and does not close P1-165.

Fresh comparison sources:

- https://yandex.com/dev/id/doc/en/codes/screen-code
- https://yandex.com/dev/id/doc/en/codes/code-and-token
- https://www.yandex.com/dev/id/doc/ru/codes/code-url
- https://developer.chrome.com/docs/extensions/reference/api/identity

## 4. Runtime authority introduced

Production source now owns these session control fields:

```text
yandexAuthGeneration
yandexOAuthPending {
  authAttemptId,
  authGeneration,
  clientId,
  codeVerifier,
  state,
  createdAt,
  expiresAt,
  transport: "yandex-verification-code-pkce-v1"
}
```

`authAttemptId` is a worker-minted opaque non-secret identifier. The PKCE verifier and OAuth access token remain private worker/session state and are not returned to Options.

Each OAuth start advances one monotonic session authorization generation and replaces the pending slot with the exact new attempt.

## 5. Exact page-attempt binding

A successful `WEBCLIP_YANDEX_START_AUTH` response returns only the non-secret `authAttemptId` in addition to existing status data.

Options keeps that value in memory and supplies it with:

```text
WEBCLIP_YANDEX_FINISH_AUTH {
  authAttemptId,
  code
}
```

A page reload intentionally loses the in-memory attempt id. A pasted code without an owning page-attempt id is rejected instead of attaching to whichever global pending object happens to exist.

This is fail-closed attempt ownership. It is not a recovery mechanism for an outer response lost after successful OAuth-tab creation; that broader recovery problem remains separately owned.

## 6. Pre-network capture

Before token exchange, the worker requires:

```text
request.authAttemptId == pending.authAttemptId
pending.authGeneration == current yandexAuthGeneration
pending has clientId + codeVerifier
pending.expiresAt > now
```

The worker then captures an immutable copy of that exact pending attempt.

Expired exact attempts are retired. Wrong or stale attempt ids do not delete another current attempt.

Legacy pre-generation pending rows are not promoted to current authority; they may only be retired by exact snapshot identity.

## 7. Post-network CAS

After `exchangeAuthorizationCode(...)` returns, before any token becomes current, production executes an exact compare-and-set:

```text
current yandexAuthGeneration == captured.authGeneration
current pending authAttemptId == captured.authAttemptId
current pending authGeneration == captured.authGeneration
```

Only if all comparisons still hold does one session storage mutation:

- install the new OAuth auth record; and
- consume the matching pending attempt.

The auth record receives its own opaque `authRecordId` and the captured `authGeneration`.

If OAuth B, manual intent or Disconnect advanced authority while A was in flight, A returns `YANDEX_AUTH_ATTEMPT_SUPERSEDED` and cannot publish its token or remove the new pending state.

## 8. Settings-generation composition

The Client ID selected at OAuth start is still written through the existing serialized `updateYandexConfig()` authority.

Finish no longer rewrites the captured Client ID after the network boundary. That removes one stale post-network settings writer: a stale A cannot overwrite a Client ID already selected by a newer B.

Status projection now prefers current configured/pending Client ID over an older still-valid committed auth record. Starting candidate B therefore does not visually revert the selected Client ID to old credential A merely because A remains the last committed credential while B is pending.

## 9. Manual and Disconnect fences

Disconnect now advances the same authorization generation and clears session auth + pending state in the same serialized session mutation before legacy-token cleanup/config settlement. A previously captured OAuth result cannot resurrect authorization after that barrier.

Manual-token replacement now advances the same generation and invalidates old pending OAuth authority before the existing manual candidate path proceeds. That is sufficient for the P1-178 composition rule that old PKCE A cannot later overwrite a newer manual intent.

P1-191 remains **ACTIVE** because this tranche does **not** yet change manual replacement to the stronger required rule:

```text
validate candidate privately
-> generation-fenced commit only after validation
-> preserve last proven auth on invalid/unknown candidate
```

The manual path is only made safe against stale older OAuth settlement here; it is not claimed complete.

## 10. Exact auth-record enrichment/cleanup

New OAuth records and current manual records carry `authRecordId + authGeneration`.

Post-commit account enrichment uses exact-record compare-update. A delayed account read cannot overwrite a different newer auth record.

Manual error cleanup likewise compare-clears only the exact record that was installed by that manual attempt. A delayed failure cannot clear a different newer auth record.

These comparisons do not promote the manual path to P1-191 completion.

## 11. Chrome tab settlement composition

The existing P1-124 Chrome tab authority treats `tabs.create()` as non-cancellable and uses `WEBCLIP_TAB_CREATE_PENDING` when the local timeout wins while the physical browser call may still settle.

OAuth start now distinguishes that state:

- `WEBCLIP_TAB_CREATE_PENDING` -> retain the exact pending OAuth attempt because its tab may appear late;
- proven tab-create error -> compare-remove only the exact attempt;
- a newer attempt/manual/disconnect cannot be removed by stale cleanup.

This avoids turning a local timeout into false proof that the browser side effect did not happen.

## 12. Deterministic coverage

New runtime test:

`project_tools/test_p1_178_auth_attempt_generation_runtime.js`

It covers:

1. OAuth A -> OAuth B advances generation.
2. stale A cleanup cannot remove B.
3. stale A capture/commit cannot publish a token after B.
4. manual intent advances the same generation and blocks A.
5. Disconnect advances generation and prevents A resurrection.
6. exact expiration cleanup.
7. exact current OAuth commit consumes only itself.
8. exact auth-record account update.
9. stale auth-record update/clear rejection.
10. exact auth-record clear.
11. legacy pending exact retirement without promotion.
12. fixed redirect remains unchanged.
13. no hidden Chrome Identity transport.
14. local `tabs.create()` pending state retains attempt authority.
15. Options carries only `authAttemptId`, not `codeVerifier`.

The existing W5 fixed-redirect refinement model is updated so its current-source assertions now require the implemented P1-178 attempt/generation/CAS subset while retaining unresolved P1-191/P1-195/P1-196 controls.

## 13. Identity impact

`service-worker.js` and `options.js` are members of the canonical 34-file extension package. Their byte changes therefore advance the current RPF.

The dedicated P1-231 source-generation/candidate-admission job in Repository Integrity #1059 ran on exact head `8ef5af8202e571e060b55c9db5d00414738bccfa` and independently derived current RPF `sha256:cb04a3cb5dc684c3e4804f63847c4b4f00d93df2db47475091b91701a04727ee`. The same identity model now derives current 33-file legacy-subset control `sha256:7bb37622f1ead5ba477116afb53ca5f35d57b918350525aa62d966ad493a730f`; historical `sha256:b65c38854c016ce3ea88efd1caf5c3291a3089336ba9d58b01b9f86db73b835a` remains predecessor evidence, not the current subset fingerprint. Chrome QCF remains `sha256:3715a3453333d3d679a1c1c00a0bab6a02b77c0153f1a4e8d138aa1e8f5a984c`, Yandex QCF remains `sha256:8d6c9711b4f71b8485b49a6ab68f90bcf62bc74155ae0959dbdc4718648879a1`, full RCF remains `sha256:cb34076d37c8dbe99392fac120fb21b03d192e4b53bc7a40650b5cd277311ffb`, and BCF remains `sha256:9eebcc834fa32bd8fe5f03ef14564f0fc1c169d0308dcc2813941b4f913363ff` because their canonical input projections did not change.

The overall #1059 workflow is not merge evidence: its repository-integrity job failed earlier at the PR change-contract gate and therefore skipped syntax/deterministic tests. The successful source-generation lane is used here only as exact-head identity computation; a later complete exact-head SUCCESS is still required.

Manifest version remains `0.9.8`.

## 14. Evidence boundary

This tranche is source/runtime + deterministic evidence only.

It does not provide:

- live Yandex OAuth execution;
- returned OAuth `state` verification;
- live provider mutation evidence;
- real unpacked-Chrome qualification;
- P1-191 validate-before-commit closure;
- P1-195 capability closure;
- P1-196 exact-current 401-demotion closure;
- physical release evidence admission;
- product ZIP/build;
- version bump;
- release-policy activation;
- tag/deployment/GitHub Release;
- release authorization.

Release readiness remains **NOT READY**.

## 15. Current decision

```text
P1-178 exact OAuth attempt identity      = IMPLEMENTED IN THIS TRANCHE
P1-178 post-network OAuth commit CAS     = IMPLEMENTED IN THIS TRANCHE
new OAuth supersedes old OAuth attempt   = YES
manual intent fences old OAuth           = YES
Disconnect fences old OAuth              = YES
stale account enrichment overwrite       = BLOCKED BY EXACT AUTH RECORD
fixed Yandex screen-code redirect        = UNCHANGED
returned state authority                 = NOT OBSERVED
P1-165                                   = ACTIVE
P1-191                                   = ACTIVE
live Yandex proof                        = NOT PERFORMED
manifest version                         = 0.9.8
release readiness                        = NOT READY
```


## 16. Exact-head deterministic reconciliation #1061

Repository Integrity #1061 reached the complete deterministic suite after the PR-contract correction. The new P1-178 runtime test and the reconciled P1-178 refinement model passed. The remaining failures were stale source-census assertions and a transitive release-identity predecessor pin: current auth source now legitimately contains `authAttemptId`, `authGeneration` and `authRecordId`, Disconnect routes through the shared-generation helper, and the 33-file subset fingerprint changes whenever shared package members `service-worker.js` or `options.js` change. Those witnesses are synchronized without promoting adjacent unresolved behavior to closure. #1061 remains non-merge evidence because the full generic deterministic suite did not pass.
