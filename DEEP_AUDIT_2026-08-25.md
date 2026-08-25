# Deep code and architecture audit — 2026-08-25

Baseline product HEAD: `cd7ec913e256b820033028e5e876260d65331de2` (P1-153 real its.1c.ru verification). The audit was repeated from the current main source, not reconstructed from prior findings.

## Scope and baseline

Runtime/config inventory: 19 JS/HTML/JSON product files. Largest runtime files: `service-worker.js` ~523 KiB, `content.js` ~186 KiB, `journal.js` ~151 KiB, bundled PSL ~167 KiB. Static inventory found 3 network `fetch()` sites and 3 `AbortController` sites, 254 Chrome API call patterns, 70 runtime messages, 11 tab messages, 64 timers, 90 Map/Set constructions, no `eval`/`new Function`. Baseline deterministic gate: 84/84 JS syntax and 71/71 tests PASS.

Permanent OperationLog diagnostics (`pageAnalysis`, `printDiagnostics`, `frameMeasurements`, `flattenedFrames`, `rootLayout`, `page-analysis`, `copy-save`) are product functionality and are explicitly retained.

## Security / external services

- Manifest V3, explicit self-only extension CSP, no remotely hosted/executed code and no eval-like execution.
- Cross-origin page access is optional host permission requested at runtime; no install-time all-sites host permission.
- `chrome.storage.local/session` are restricted to TRUSTED_CONTEXTS; Yandex access token is session-only, legacy persistent token cleanup is awaited/fail-closed.
- OAuth authorization code flow uses PKCE S256. `state` is generated/sent/stored, but the current manual `verification_code` completion receives only a user-entered code and therefore does not compare returned `state`; this is tracked as P1-165. Tokens are sent in Authorization headers, not query strings.
- All three network fetch paths are HTTPS and AbortController-bounded; signed offscreen Disk transfers reject redirects and only accept Yandex Disk signed hosts.
- No new direct token exfiltration, arbitrary remote-code execution, or content-script-to-admin privilege bypass was found in this pass.

## New findings

### P0
- **P0-063 REGRESSION — global offscreen signed-transfer admission/memory budget.** Blob-URL memory is capped, but `activeTransfers` is only a counter and does not reject/queue concurrent large transfers. Multiple trusted tabs/pages can simultaneously materialize up to tens of MiB each in IDB/Blob/fetch bodies. Add global count + actual byte budget; reserve before materialization and release only on actual settlement.
- **P0-064 OPEN — flattened iframe deep-clone preflight budget.** P1-151 limits computed-style copying to 2500 elements, but `cloneNode(true)`, `querySelectorAll('*')` and source/target arrays are created before that limit. A pathological same-origin selected iframe can create an OOM-sized temporary DOM. Add a bounded preflight node/text/estimated-byte budget and fail safely before cloning; then walk source/target incrementally instead of materializing all descendants.

### P1
- **P1-154 OPEN — top-document live selection budget.** `content.js` Include/Exclude Maps have no count cap while every mutation refreshes outlines and later snapshot work is O(N). `frame-agent.js` already caps selections at 250. Add an equivalent top-frame budget and bounded restore behavior.
- **P1-155 REGRESSION — candidate enumeration allocated beyond its declared limit.** Locator restore used `[...querySelectorAll()].slice(0,5000)`, so huge NodeLists were fully copied before slicing. Fixed by indexed bounded tag collections in top/frame-agent paths and bounded link-density enumeration.
- **P1-156 OPEN — prepared Save As page cleanup lifecycle.** The page-owned `downloads.onChanged` listener has no fallback removal/reconciliation if the terminal event is missed, and the best-effort release runtime message can itself remain unsettled. Keep native `saveAs:true` unbounded/page-owned, but add bounded listener lifetime + terminal `downloads.search` reconciliation and bounded/deduplicated release control RPC.
- **P1-157 OPEN — extension-page/content Chrome API deadline coverage.** Popup, Journal, Options and content still contain direct `runtime.sendMessage`, `tabs.sendMessage`, `executeScript`, `tabs.update/query` paths outside their newer bounded helpers. Reads/idempotent calls need local deadlines; non-idempotent calls require operation-id/actual-settlement reconciliation rather than blind retry.
- **P1-158 OPEN — residual service-worker Chrome maintenance/config reads.** Examples include raw `yandexConfig` reads and version-refresh `storage/tabs` maintenance. Audit every remaining direct awaited Chrome call and route it through bounded read or serialized actual-settlement mutation infrastructure where appropriate.
- **P1-159 REGRESSION — large-result UI work blocked the extension-page main thread.** OperationLog could create up to 500 multi-node rows synchronously on every search keystroke and eagerly stringify a multi-MiB detail. Fixed with 120 ms search debounce, 80-row animation-frame batches + DocumentFragment, lazy/cached raw JSON, one-time linked-Journal JSON materialization, and detached Journal domain-tree construction.
- **P1-160 OPEN — auto-content/page discovery scan budget.** Main-content detection and some page/frame discovery paths still run broad `querySelectorAll` scans over arbitrary page DOM without a visited-node/time budget. Add a shared traversal deadline/node cap and fail/degrade to manual selection without freezing the page.

### P2
- **P2-014 OPEN — split oversized runtime modules / reduce coupling.** `service-worker.js` (~523 KiB) and `content.js` (~186 KiB) combine many unrelated subsystems. Split by trust boundary and subsystem with explicit interfaces/tests; evaluate cold-start parse cost before/after.
- **P2-015 OPEN — streaming large offscreen upload bodies.** Chunked Journal export is staged safely, but upload reconstruction still forms a complete Blob. After P0-063, investigate bounded streaming request bodies/chunk pipeline to reduce peak memory while preserving Yandex signed-upload semantics.
- **P2-016 OPEN — least-privilege page capability/manifest review.** Introduce an exact extension-page capability matrix for privileged runtime commands and re-evaluate broad `tabs` permission usage. `debugger` remains functionally required for Chromium `Page.printToPDF`; optional site access must remain user-granted.

## Large-result cost assessment

Before P1-159, the OperationLog list could synchronously construct roughly 500 buttons and several thousand child DOM nodes/listeners per refresh, including once per input event. The Journal domain tree can expose up to 500 bases + 1500 child domains. OperationLog records are bounded to 4 MiB, but eager pretty JSON created an additional multi-MiB string and text node immediately on detail selection. The new path yields after each 80 OperationLog rows, coalesces typing for 120 ms, constructs the domain tree detached, and materializes full raw JSON only on an explicit user action. Exact wall-clock improvement depends on device/Chrome and will be measured in real browser QA; the synchronous work and peak duplicate-string count are structurally reduced.

## Existing safeguards revalidated

IDB/import/export size/deadline budgets, OperationLog caps, Blob URL caps/TTL, offscreen idle lifecycle, debugger attach/detach fencing, Chrome Action fencing, late-settlement storage/alarm queues, PDF streaming, Journal recovery markers, full PSL, Yandex path/account/resource identity and backup lease/recovery remain intact under the deterministic regression gate.

## Continuation at product tree `6709f55b70bf45ec7939c916aaa8f219f338f0da`

The audit continued after P0-063 on a byte-identical product tree. Temporary P1-164 patch tooling was removed before this continuation; no production file was changed by that aborted implementation attempt. The current registry source of truth marks P0-063 as REGRESSION.

### Additional confirmed findings

- **P0-065 OPEN — offscreen Blob materialization admission.** `registerBlobUrl()` enforces 12 active URLs / 256 MiB only after a Blob exists. PDF-cache, inline-text, and staged-text creation paths can materialize large transient Blobs concurrently before rejection. Add pre-materialization count/byte reservations with actual-settlement release semantics.
- **P1-161 OPEN — authorization recovery round-trip.** Yandex upload errors preserve the cached PDF and selection and expose Settings/retry actions, but reauthorization lacks a bounded non-secret return context back to the originating upload. Add validated tab/document return context and explicit manual return; never automatically repeat an upload after auth.
- **P1-162 OPEN — Journal domain-tree incremental rendering.** The model is bounded to 500 bases / 1500 children and P1-159 uses a detached fragment, but construction is still one synchronous loop; search forces matching groups open. Batch DOM creation across frames with a generation fence.
- **P1-163 OPEN — chunk-local parser cursor.** Import safety limits remain strong (50 MiB total, 8 MiB entry, 4 MiB string, depth 64, 20k container items, 100k entries, deadline, duplicate-key rejection and null-prototype objects), but character-level async `peek/next` creates avoidable Promise overhead. Await only when the reader needs another chunk.
- **P1-164 OPEN — per-entry public-link revoke.** Product decision: `createPublicLinks` intentionally stays ON by default. Journal must allow revoking one Yandex public link. Explicit user confirmation is mandatory before any remote mutation; cancellation is no-op. After verified unpublish, keep the latest path but remove `publicUrl` and `resourceId`, intentionally accepting path-only association that may break after manual file movement. Use durable checkpoint/reconciliation and OperationLog; no blind network retry after unknown settlement.
- **P1-165 OPEN — effective OAuth state validation.** Current flow sends/stores random state but manual screen-code completion never receives the redirected state value, so state is not actually verified. PKCE S256 remains effective. Prefer Chrome Identity web auth redirect capture so returned state can be compared exactly before exchanging the code.
- **P2-017 OPEN — optional persistent-credential architecture.** Keep session-only access token as the default. Evaluate OS keychain through Native Messaging, passphrase-derived local encryption, backend/BFF, and WebAuthn/PRF separately by security/UX/deployment cost. Ciphertext and its decryption key in the same `storage.local` trust domain is not meaningful at-rest protection.

### OAuth token-preservation strategy

1. **Current default — session-only access token, no persisted refresh token.** Best browser-only secret-at-rest posture and aligned with Chrome guidance for sensitive extension data. Cost: authorization is lost on browser restart, extension reload/update, or disable/enable.
2. **Improve reauth before persisting more secrets.** Use `chrome.identity.launchWebAuthFlow()` with a registered Chrome redirect URL, PKCE S256 and exact returned-state validation. After success, provide an explicit validated return-to-upload action. This preserves current non-idempotent upload safety.
3. **Do not use cosmetic local encryption.** Encrypting a refresh token in `storage.local` while storing the key in the same extension storage does not materially improve compromise resistance.
4. **Browser-only advanced persistence.** A user passphrase-derived key (versioned envelope + salt + strong KDF + AES-GCM, key retained only for the session) can protect against offline profile-file theft, at the cost of unlock UX. It does not protect against compromised extension code while unlocked.
5. **Strongest local persistence.** Native Messaging with Windows DPAPI/Credential Manager, macOS Keychain, or Linux Secret Service keeps the long-lived credential outside the browser profile and lets the extension hold only an opaque identifier/short-lived token. Cost: separate signed native helper and installation/support complexity.
6. **Backend/BFF alternative.** A service can hold the refresh credential and issue short-lived extension capabilities. This improves browser-profile isolation and restart UX but adds server trust, privacy/compliance, availability, and operational cost; it conflicts with a strictly local/private architecture unless explicitly chosen.
7. **R&D.** WebAuthn/passkey PRF-wrapped local secrets and Yandex device-aware tokens are worth evaluating. Device metadata improves revocation visibility but does not itself solve at-rest storage.

### External-standard verification used for this continuation

Chrome documents that `storage.session` is memory-backed, cleared on disable/reload/update/browser restart, and not exposed to content scripts by default; Chrome recommends it for sensitive user data. Chrome Identity documents that `getRedirectURL()` produces `https://<app-id>.chromiumapp.org/*` and `launchWebAuthFlow()` returns the final redirect URL for non-Google identity providers. Yandex documents PKCE S256 as preferred, returns `state` unchanged in URL redirect flows, gives authorization codes a 10-minute lifetime, and permits code exchange with `code_verifier` without `client_secret`. Yandex also cautions that tokens should only be available to the app and recommends not storing them in browser/open configuration. These external facts inform P1-165/P2-017; the project-specific conclusions above come from current source review.

### Product/security decisions revalidated

- `createPublicLinks` ON-by-default is intentional product behavior, not an audit defect. P1-164 adds user-level per-entry revocation control instead.
- No new direct token exfiltration, remote executable-code path, content-script-to-admin bypass, or incognito journal boundary bypass was found in this continuation.
- OperationLog redaction covers Authorization/access/refresh/manual token keys, code verifier/client secret/verification code/signature-like keys, bearer/OAuth strings and signed/query URL details.
- Settings export remains allowlisted and does not export OAuth secrets, PKCE pending state, Journal contents/checkpoints, or OperationLog contents.

### Test evidence note

This continuation changed audit documentation only. It did not rerun product tests. The last verified product gate remains the P0-063 gate: JavaScript syntax 88/88 PASS and deterministic `project_tools/test_*.js` 74/74 PASS. Real unmanaged unpacked Chrome and real Yandex OAuth/API/upload/move/backup E2E remain release blockers.
