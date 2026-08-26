# Yandex OAuth audit delta — 2026-08-26

Baseline source HEAD: `8b823bbe1d0a33965d82a835f63e460e8e100735`.

This file is a lossless audit checkpoint created because the connected GitHub mutation surface currently exposes complete-file replacement but no server-side text patch/append operation. It is **not** a substitute for the canonical registry. Until the findings below are merged into both `project_docs/PRIORITIES_P0_P1_P2.md` and `DEEP_AUDIT_2026-08-25.md` in one lossless sync, the canonical registry still formally ends at **P1-194**. No production/runtime/config/manifest change is made by this checkpoint.

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
- Do not use hidden destructive permission probes. Explicit user actions may exercise their normal operation, but the audit/fix must not create remote side effects merely to infer scopes.
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

This checkpoint is audit documentation only. Product runtime/configuration and `manifest.json` are unchanged. Product tests were **not** rerun. The last proven product gate remains **88/88 JavaScript syntax + 74/74 deterministic tests PASS** from the earlier P0-063 gate. Real unmanaged unpacked Chrome and real Yandex OAuth/API/upload/move/backup E2E remain release blockers.
