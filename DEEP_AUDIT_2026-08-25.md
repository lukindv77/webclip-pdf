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


## Continuation at HEAD `3285adac4aa8064eb4bf1f6da20a1bacc3fd30bb` — URL confidentiality and page-side-effect review

No production source changed during this continuation. The audit re-read current `content.js`, `frame-agent.js`, `service-worker.js`, `journal.js`, `popup.js`, `prepared-save-as.js`, and `offscreen.js` from GitHub `main`.

### Newly confirmed findings

- **P0-066 OPEN — durable source-URL confidentiality boundary.** Live metadata uses `location.href`; the PDF header emits it as both text and hyperlink; content metadata sanitization returns the current tab URL with `URL.toString()`. `normalizeJournalUrl()` and imported HTTP URL normalization do not remove URL userinfo and only partly handle fragment. OperationLog already redacts secret query material, but PDF/Journal/backup do not share that sanitizer. Introduce one durable/display URL sanitizer: strip `username/password`, strip fragment, redact/drop known credential query names, preserve ordinary query parameters, and reject userinfo on imported Yandex public URLs.
- **P0-067 OPEN — synthetic host-page click during PDF preparation.** `expandSpoilersInIncludedContent()` calls `control.click()`. The current safety predicate still accepts semantic-toggle submit buttons and links; programmatic `HTMLElement.click()` fires the element click, and submit controls can submit their form. PDF save must never activate host controls. Keep native `<details>` state mutation and inert visual panel unlocking, but require explicit manual user expansion when real page interaction is needed.
- **P0-068 OPEN — flattened iframe proxy is live, not inert.** The clone is built with deep `cloneNode(true)`, only scripts and Exclude nodes are removed, and the proxy is appended to the top document. Nested browsing/plugin elements and custom elements remain. Inserting custom elements can run `connectedCallback`; embedded frames/resources can establish new browsing contexts or loads. Duplicate ids/names can also perturb page selectors while the proxy exists. Build an inert sanitized clone before any live insertion.
- **P1-166 OPEN — unresolved Chrome side-effect registry admission.** `scriptExecutionSettlements` and `tabCreateSettlements` correctly preserve actual settlement after local timeout and dedupe identical requests, but unlike Action/download/PDF pending paths they have no global unresolved-count admission budget. A never-settling Chrome Promise therefore leaves a retained entry and unique operations can accumulate. Add fail-closed global caps while retaining actual-settlement semantics.
- **P1-167 OPEN — unbounded selected-content PDF preprocessing.** Resource prefetch itself is bounded, but link absolutization, image wrapping and disclosure collection call full-subtree `querySelectorAll` and build Sets/rollback arrays without a shared traversal or time budget. This is a separate large-page availability path from P1-160 discovery and P0-064 iframe clone admission.
- **P1-168 OPEN — locator sibling enumeration.** Candidate collection is bounded after P1-155, but locator construction and v3 scoring still allocate whole sibling arrays, sometimes for every candidate. Replace full-array sibling indexing/filtering with bounded traversal/index helpers and degrade positional fingerprint when the sibling budget is exceeded.

### Rejected / non-new hypotheses in this pass

- The suspected `joinDiskPath()` `..` escape through filename components did **not** reproduce: `sanitizeDiskName()` strips trailing dots/spaces and dot-only segments collapse to `_`; destructive Yandex moves also revalidate the source through managed-branch containment before mutation. P0-040/P1-090 controls remain effective for the paths reviewed.
- No new Journal/options DOM-XSS sink was found: dynamic Journal content is built with DOM nodes/`textContent`; Options `innerHTML` uses static extension-owned markup and external errors are inserted as text.
- `prepared-save-as.js` produced no new finding beyond existing P1-156/P1-157: native `saveAs:true` remains page-owned/unbounded, while listener/release/runtime-message cleanup gaps are already registered.

### Standards check for P0-067/P0-068

Current MDN/HTML documentation confirms that `HTMLElement.click()` simulates a click and fires the element click event; submit buttons can submit their associated form. Custom-element `connectedCallback()` runs when an element is added to the document, and custom-element lifecycle is explicitly allowed to perform initialization/resource work. This supports treating live proxy insertion and synthetic page activation as real side-effect boundaries rather than only visual fidelity concerns.

### Evidence / test note

This audit continuation changes documentation only. Product tests were not rerun. The last product gate remains P0-063: JavaScript syntax 88/88 PASS and deterministic tests 74/74 PASS. Browser-level regressions are required when P0-066/P0-067/P0-068 and the new P1 bounds are implemented.

## Continuation at HEAD `3208f927ee330b43e4fd43427fd283668a781dd4` — document identity, destructive privacy and lifecycle state

No production source changed in this continuation. The audit re-read current `service-worker.js`, `content.js`, `popup.js`, `journal.js`, `options.js`, `prepared-save-as.js`, `offscreen.js`, manifest and the priority registry from GitHub `main`.

### Confirmed findings / status corrections

- **P0-023 PARTIAL — retry cache still lacks document identity.** The implementation stores `tabId`, normalized source URL and TTL, but `getValidCachedPdfForTab()` compares only current URL. Cache invalidation on `tabs.onUpdated` is keyed to `changeInfo.url`; a same-URL reload creates a replacement document without changing the URL. The context-menu command `Повторить отправку сформированного PDF` can therefore reach retry from the new document while the old PDF still matches `tabId + URL + TTL`. Persist and verify exact `MessageSender.documentId` (available before the project's Chrome 118 minimum) and fail closed on same-URL document replacement.
- **P0-069 OPEN — moving a published file to WebClip Trash does not revoke publication.** Journal destructive flow locates the file, performs Yandex `resources/move` to the WebClip-managed Trash folder, verifies the move, deletes the local entry and reports success. No `unpublish` path exists in the current worker. A published URL may therefore remain usable after the Journal record containing `publicUrl` is deleted. Make published-state semantics explicit before local deletion and reconcile remote unpublish without blind retry after unknown settlement.
- **P1-169 OPEN — released prepared-Save-As tombstones have no GC.** RELEASE intentionally writes a distinct session-storage key so a late PREPARED/STARTED write cannot overwrite terminal state, but the released key is never part of the 64-entry active index and has no TTL cleanup. Repeated Save As operations can therefore accumulate session keys until browser restart; GC must preserve the late-generation safety window.
- **P1-170 OPEN — Journal mutation triggers unbounded all-tab action refresh fan-out.** Append/delete/clear/import call `refreshActionForAllTabs()`, which uses `tabs.query({})` and `Promise.all()` over every tab. Per-action settlement caps do not bound the preceding Journal-summary reads or total wave concurrency. Coalesce overlapping global refreshes and process tabs through a bounded pool.

### Existing tasks strengthened

- **P1-157:** `chrome.permissions.request()` is a user-owned non-cancellable prompt and must not be treated like a normal bounded read. The current popup helper can locally time out after 10 seconds while the permission request later settles. Keep the prompt request single-flight through actual settlement and avoid a second prompt/false terminal error on unknown result.
- **P1-168:** bound page-controlled locator `id`/class/string fields before `CSS.escape`, selector construction and runtime serialization in addition to replacing full sibling arrays.
- **P1-154:** its aggregate selection budget must apply before materializing local + remote locators; per-frame 250-item limits do not by themselves bound the top-frame aggregate before the final slice.

### Revalidated / rejected hypotheses

- Progress-port Sets remove ports on disconnect and on posting failure; Journal page timers are cleared on `pagehide`.
- Journal session contexts have TTL, a hard count cap and bounded removal batches; Yandex directory/locate/verify loops reviewed here have deadlines/hard limits.
- Background Journal backup remains explicit opt-in and cannot be enabled without a selected Yandex root.
- The suspected Yandex `..` filename escape remains rejected: dot-only sanitized name components collapse safely and destructive writes re-check managed-branch containment.
- Offscreen dormant `text-payload-upload` has a chars-vs-UTF-8-byte reservation weakness, but the current service-worker call graph uses `pdf-cache-upload`, byte-checked `text-chunks-upload` and `text-download`; no live product caller for `text-payload-upload` was found in this pass, so P0-063 status is not changed solely for that dead/residual branch.

### Test evidence note

This synchronization changes audit documentation only. Product tests were not rerun. The last verified product gate remains the P0-063 gate: JavaScript syntax 88/88 PASS and deterministic `project_tools/test_*.js` 74/74 PASS. Real unmanaged unpacked Chrome and real Yandex OAuth/API/upload/move/backup E2E remain release blockers.

## Continuation at HEAD `d72ac2f6c23cf3b529b56643781352c8c489ac99` — live document and PDF output security

No production source changed in this continuation. The audit re-read current `content.js`, `frame-agent.js`, `service-worker.js`, `journal.js`, `options.js`, `options.html` and `offscreen.js`, plus a local headless Chromium print-to-PDF reproduction used only as audit evidence.

### Newly confirmed findings

- **P0-070 OPEN — live print is tab-bound, not document-bound.** Content-originated generate/upload messages expose `MessageSender.documentId`, but current handlers retain only `tabId`. Both local and Yandex generation eventually call `generatePdfBlob(tabId)`, which attaches debugger to the current tab and issues `Page.printToPDF`. A full reload/navigation during the gap can therefore print a replacement document while metadata, selection identity and destination naming remain from the previous one. Introduce a per-tab full-document generation plus exact initiating `documentId`; verify before print and after print before any durable/cache/download/upload/Journal finalization. A changed generation discards the Blob and fails closed.
- **P0-071 OPEN — unsafe/non-durable URI schemes survive into PDF annotations.** Top content currently absolutizes arbitrary anchors/areas without a scheme allowlist and additionally wraps unlinked images for `http(s)`, `file:`, `data:` and `blob:` sources. A headless Chromium audit repro printed four anchors and the resulting PDF contained URI annotations for `javascript:alert('x')`, `data:text/html,...`, an external file annotation for `/etc/passwd`, and the normal HTTPS link. Because the PDF is a portable durable artifact, strip clickability for active/local/non-durable schemes before print while preserving visible content; bound copied URI lengths. `http/https` remain safe baseline, with `mailto/tel` requiring an explicit product allowlist decision.
- **P1-171 OPEN — cross-origin frame volatile state survives same-URL document replacement.** The registry records child `documentId`, but tab cleanup occurs only on URL change; LIST does not revalidate records, and `sendFrameAgentCommand` targets only `frameId`. Clean the registry on full-document loading and target exact document identity/generation. The related `executeScriptSingletonBounded` late-success bug belongs to existing P1-125, which is now PARTIAL because its tab-only logical keys can consume a 60-second late-success receipt from the old document after same-URL reload.
- **P1-172 OPEN — content metadata has no pre-header/pre-IPC bounds.** Raw title/source URL/file comment are put into `meta`; the optional comment textarea has no `maxLength`; `prepareForPrint()` builds the visible PDF header before the service-worker sanitizer applies its 8192/4000/100000-character limits. This creates avoidable large-DOM/message allocation and can make PDF metadata differ from Journal/cache metadata. Normalize client-side first using the same shared schema and P0-066 confidentiality rules, then validate again in the worker.
- **P2-018 OPEN — dormant text-payload upload capability.** The worker text-payload put/get helpers are definition-only in the reviewed product call graph, while offscreen still advertises/implements `text-payload-upload`. The dormant branch reserves a byte budget from a character limit and creates the UTF-8 Blob before resizing the reservation, so Unicode can exceed the pre-materialization assumption. Removing unused privileged code is preferred; otherwise make it byte-bounded before reintroducing a live caller.

### Existing tasks strengthened

- **P1-154:** enforce a single aggregate local+remote selection count/byte budget before storing remote snapshots or materializing locators; per-frame 250-item limits plus a final top `.slice(0,250)` are not an aggregate bound.
- **P1-164:** after verified unpublish the Journal entry intentionally becomes path-only. The Yandex badge must still open/download the file through authenticated Yandex API using the saved exact `remotePath`; do not fall back to broad Disk search. If the user manually moves the file afterward, the accepted tradeoff is loss of association.
- **P1-167:** include frame-agent's false prefetch cap (`querySelectorAll('img')` can enqueue a huge single-root result before the 100 check), bounded href copying, and expensive global print `:has([include])` selectors in the shared selected-content budget/refactor.
- **P2-017 / P0-034:** current Yandex refresh documentation lists refresh grant `grant_type` + `refresh_token` as mandatory and `client_id/client_secret` as additional fields. The current code comment that refresh categorically requires Client Secret is therefore too strong. Do not persist a refresh token based on documentation alone; instead add a real Yandex public-client E2E experiment. If it succeeds without secret, a refresh token kept only in `storage.session` could improve long-running-session UX while preserving the current no-restart-persistence default.

### Revalidated boundaries

- Journal/content `WEBCLIP_OPEN_JOURNAL_SAVED_FILE` remains HTTPS/Yandex-domain restricted and reads the entry again by ID; the unsafe URI finding is specifically the PDF artifact construction path.
- External Yandex JSON bodies remain bounded before parsing (`safeJson` uses an 8 MiB bounded text reader), so no new unbounded `response.json()` regression was found.
- `makeMetaRow()` uses Text nodes, so the raw metadata issue is allocation/confidentiality consistency rather than HTML injection.

### Test evidence note

No product code changed and the deterministic product suite was not rerun. The local Chromium reproduction was an audit-only print-to-PDF experiment confirming annotation preservation for unsafe schemes, not a release regression gate. The last verified product gate remains 88/88 JavaScript syntax PASS + 74/74 deterministic tests PASS from P0-063.

