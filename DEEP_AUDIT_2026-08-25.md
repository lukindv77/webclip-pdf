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

## Continuation at HEAD `b797eef1ceac24d65ce4681ed067c474cae0d7e8` — queue admission and Journal foreground lifecycle

No production source changed in this continuation. The audit re-read the current service-worker late-settlement helpers and current Journal direct IndexedDB/render/apply paths.

### Newly confirmed findings

- **P1-173 OPEN — serialized late-settlement waiters can accumulate.** `runSerializedLateSettlementOperation()` correctly prevents a newer mutation from overtaking an older Chrome Storage/alarm mutation after local timeout, but each retry allocates a fresh `turn` and chains it behind the same unresolved predecessor. Yandex auth/config use analogous manually serialized chains; prepared Save As has its own settlement chain. If Chrome never settles the original promise, repeated callers add unresolved waiters even though no later side effect starts. Preserve actual-settlement ordering but coalesce callers onto one barrier or enforce fail-closed admission so one hung API operation cannot retain an unbounded Promise chain.
- **P1-174 OPEN — page-size bounding does not bound Journal card memory.** The normal page reads up to 20 full entries. `buildEntryCard()` immediately calls `buildJournalComments(entry)` and `buildSelectionDetails(...)`; comment rendering creates text nodes for every active/deleted comment, file comment is rendered in full, and locator groups are fully built even though they are visually collapsed. Current authoritative data limits allow ~2 MiB aggregate journal comments and a 2 MiB selection snapshot per entry, so a valid 20-entry page can hold tens of MiB plus thousands of DOM nodes. Heavy sections should be lazy and ideally point-loaded only when expanded.
- **P1-175 OPEN — Journal source tab is not revalidated at apply time.** `resolveSourceContext()` may update cached `sourceUrl` when it runs, but a `tabs.get` failure is swallowed and leaves the old context; the Journal does not subscribe to tab navigation for this state. `applyEntry()` later directly executes `content.js`, sends the snapshot and activates `sourceTabId` without a fresh current-tab/site check. Revalidate immediately before injection and fail closed if the tab disappeared or its current site is outside the intended same-site template policy.

### Non-finding / OAuth disconnect clarification

Current Yandex documentation explicitly says that for ordinary (non-device) tokens an application can implement account logout by deleting the local token; the token remains active in Yandex access management until revoked by one of Yandex's revocation mechanisms. Therefore current `Отключить` behavior — deleting WebClip's session token — is not classified as a security defect by itself. If the product later adopts Yandex device-specific tokens, explicit server-side revoke can be evaluated under P2-017 together with device identity and OS-backed/persistent credential options.

### Test evidence note

This continuation is audit documentation only. Product deterministic/browser tests were not rerun; the last verified production gate remains unchanged. Release remains blocked on real unmanaged unpacked Chrome and real Yandex OAuth/API/upload/move/backup E2E.

## Continuation at HEAD `9f204576c50b1b7782c7003758985d4ffc7aafd8` — extension-page input and OAuth lifecycle

No production source changed during this continuation.

### Newly confirmed findings

- **P1-176 OPEN — pre-IPC bounds for trusted user inputs.** Worker-side boundaries remain authoritative, but the visible Journal comment editor and several Options inputs accept unbounded strings and send them through `chrome.runtime.sendMessage()` before the worker can reject them. This includes Journal comment text and Yandex client/code/manual-token/root/folder inputs. Match UI/pre-send caps to the existing worker contract so very large pasted values do not allocate a large structured-clone payload first. Sensitive token/code values should be rejected with an explicit message rather than silently truncated.
- **P1-177 OPEN — disconnect does not pause background backup scheduling.** Disconnect removes session credentials but does not change `journalBackupEnabled`, clear periodic/retry alarms, or otherwise tell the scheduler that authorization is intentionally absent. A background failure while enabled schedules another retry, so a deliberate disconnect can create recurring known-failure wakes. Preserve the user's backup preference but pause alarms while unauthenticated, then reinitialize them after successful authorization. A transfer that already owns a signed upload/download URL remains governed by its durable actual-settlement reconciliation; deleting the OAuth token is not cancellation of that already-started side effect.
- **P1-178 OPEN — post-exchange OAuth completion is not reconciled as one operation.** The token POST completes before several separately bounded/non-cancellable storage/config steps. A later local timeout can therefore report authorization failure after the remote exchange already succeeded, or a late `storage.session.set` can make the account connected after the UI showed an error while old pending PKCE state remains. Do not blindly rerun the code exchange. Commit auth and pending/consumed state together as far as Chrome Storage allows, expose unknown local settlement as pending, and let status/startup reconciliation repair ancillary config/cleanup.

### External OAuth note

Current Yandex documentation continues to describe confirmation-code exchange as a separate network step that returns `access_token`, `refresh_token` and lifetime information. The project intentionally stores only the access token in `storage.session`; P1-178 concerns crash/timeout consistency **after** a successful exchange response and does not propose persisting the refresh token.

### Test evidence note

Audit documentation only; production tests were not rerun. The last verified production gate remains 88/88 JavaScript syntax + 74/74 deterministic tests from P0-063, and real unpacked Chrome/Yandex E2E remains a release blocker.

## Continuation at HEAD `a3a10308d060fc9926ff348f19a14dba3d5c91d9` — Yandex backup identity and destructive public-link retention

No production source changed during this continuation.

### Newly confirmed findings

- **P1-179 OPEN — backup state is not namespaced by Yandex account/root identity.** `journalBackupState` combines current config with old global last-success/failure timestamps. A newly selected root/account can therefore appear recently backed up even though no backup exists there. The prepared upload checkpoint likewise lacks account/root identity. `recoverPendingJournalBackup()` first creates/uses the current configured backup tree; if the old pending path is outside it, the checkpoint is removed immediately. If the path string still matches, recovery validates file/type and exact size but does not prove the original Yandex account. The checkpoint and state need immutable accountUid/rootPath and mismatch handling that preserves unknown-settlement evidence instead of discarding it because configuration changed.
- **P1-180 OPEN — bulk local clear/import can orphan public-link management.** Domain/all clear and full import/replace intentionally mutate the local Journal only. With public links enabled by default, entries removed from the Journal may still point to Yandex files whose public access remains active. Once their local `publicUrl`/identity metadata is gone, P1-164 cannot offer per-entry revoke for them. Before bulk confirmation, count affected published Yandex entries using a bounded scan and explicitly warn that these public links remain active and will no longer be manageable from WebClip. Do not silently turn a local clear/import into a large remote unpublish operation.

### P0-069 clarification

The single-entry privacy invariant applies to both Yandex delete choices. Moving to WebClip Trash does not itself revoke a published link, while `keep` intentionally leaves the remote file untouched. Either revoke must be explicitly confirmed and reconciled before the local record disappears, or the user must explicitly confirm that public access will remain after WebClip forgets the entry.

### Test evidence note

Audit documentation only; production tests were not rerun and the release gate remains unchanged.



## Continuation 2026-08-26 — destructive checkpoints and Yandex account fencing

Audit source-of-truth baseline for this continuation: `bbce7543125f3cd58ef6429b868bc8484fe3fc7c`. Production code was inspected only; this sync changes documentation, not runtime behavior.

### P0-072 — destructive Journal reset can erase the only checkpoint while the external side effect is still running

Confirmed flow:

- `uploadCachedRecordToYandex()` persists `pendingRemoteSaves` before starting the signed PDF transfer.
- A normal full Journal clear clears `entries`, `pendingAppends`, `pendingDownloads` and `pendingRemoteSaves` in the same readwrite transaction. Scope clear prunes matching pending records; replace-import clears all three pending stores before replacing entries.
- The remote-save path performs the signed transfer, then (when enabled) `ensureYandexPublicUrl(remotePath)`, then metadata verification, and only afterwards `markPendingRemoteSaveVerified()`. That final step explicitly fails if the durable checkpoint disappeared.
- Therefore clear/import can intentionally prevent stale Journal resurrection yet still race a non-cancellable external side effect. A successful remote file/public link can become an unmanaged orphan. Deleting a durable checkpoint is not equivalent to cancelling `fetch`/Chrome Downloads.

Required direction: destructive Journal operations need a durable side-effect barrier independent from the decision to retain the local Journal entry. User-requested clear/replace may cancel future local append semantics, but must retain enough tombstone/outcome state to reconcile any upload/download that was already started and expose the resulting remote/public state without silently recreating the cleared Journal record.

### P0-073 — remote-save recovery/completion can cross Yandex account identity

Confirmed flow:

- New remote checkpoints already store `accountUid`, `rootPath`, `remotePath`, expected bytes and the eventual Journal data.
- Live upload captures `accountUid` before obtaining/using the signed upload URL. After the signed transfer, public-link creation and metadata verification call Yandex API with whatever OAuth token is current at that later moment; no exact UID revalidation occurs first.
- `recoverPendingRemoteSaves()` checks that some valid OAuth token exists, but does not compare the current account UID with the checkpoint UID before reading `remotePath`. Recovery verifies primarily file type and exact byte size, then can publish and persist `resource_id/public_url`.
- A user can disconnect/re-authorize to account B while an operation from account A is unresolved. If B contains the same managed path and byte size, recovery/completion can act on B and then persist B identifiers into data still tagged with account A. This breaks the identity invariant established for destructive Journal operations and can publish the wrong account's file.

Required direction: all post-signed-transfer and recovery Yandex API calls must be account-fenced by the immutable checkpoint identity. A mismatch is not a retryable 404/error and must not mutate either account. Re-auth to the original account may resume recovery; switching account must leave the checkpoint visibly deferred.


## Continuation 2026-08-26 — local-download ambiguity / Save As active lifecycle / remote retry identity

Audit source-of-truth baseline: `4ec500f684e537a62f1e615f04d7e0be217f29fc`. Runtime code was inspected only; this sync changes documentation.

### P0-048 reopened as PARTIAL — ambiguous filename/size fallback can bind two intents to one download

`reconcilePendingLocalDownloads()` correctly filters candidates to `byExtensionId === chrome.runtime.id` and treats exact Blob URL as primary identity. The compatibility fallback is still unsafe under ambiguity: when the browser no longer exposes the original Blob URL it accepts matching basename + exact expected bytes within a short intent age and calls `.find()`. No uniqueness check or per-pass claimed-download set exists. `bindPendingLocalDownloadIntent()` then deletes the string intent and `put()`s the bound object under numeric `downloadId`; a second intent bound to the same id overwrites that durable key. A physically successful download can therefore lose its own Journal recovery metadata. The fallback must require exactly one unclaimed candidate and must never overwrite an existing numeric checkpoint belonging to another intent.

### P0-073 expanded — manual retry can re-bind an unresolved remote save to another Yandex account

The earlier account-fence finding also affects retry admission, not only later recovery. `checkpointPendingRemoteSaveIntent()` preserves an existing `remote-verified` record, but for an existing ordinary `prepared` record it writes the newly constructed item while retaining only the old `createdAt`. A manual retry after account A→B reauthorization therefore replaces checkpoint `accountUid/rootPath` with B for the same `journalEntryId`. Combined with `allowExisting` path+size reuse, this can erase the evidence that the unresolved operation originated in A. Remote checkpoint identity must be immutable once the first external side effect is admitted; retry under another account/root must stop before lookup/upload/publish.

### P1-156 expanded — active prepared Save As checkpoints have no session GC

`prepared-save-as.js` deliberately leaves native `saveAs:true` without a local timeout. Page-owned terminal cleanup listens to `downloads.onChanged` and sends RELEASE. Worker checkpoints add a session id to `webclipPreparedSaveAsIndex` on PREPARE and remove it on RELEASE. The index has a hard cap of 64, but current worker code has no pass that enumerates/reconciles this index after owner-page loss. Closing an extension page after PREPARE but before STARTED/RELEASE can leave the index/key indefinitely for the current browser session even when the underlying Blob is later reclaimed. STARTED operations also need `downloads.search` fallback if terminal events are missed. This is distinct from P1-169, which concerns accumulation of already-released tombstones.


## Continuation 2026-08-26 — P0-074 operation-scoped Yandex auth/config fence

Audit source-of-truth baseline: `aeac5dbc168df6f641ba6db2873d1796c7769df0`. Production code unchanged by this documentation sync.

### Confirmed mixed-root path

`uploadCachedRecordToYandex()` reads `config = await getYandexConfig()` at entry. It then calls `ensureYandexServiceFolders(...)`; that helper independently executes another `getYandexConfig()` and builds/creates service branches from that later root. The upload target folder/`remotePath` therefore belongs to the later config snapshot, while the durable remote checkpoint stores `rootPath = normalizeDiskPath(config.rootPath)` from the earlier snapshot. There is no generation comparison between the two reads. A concurrent root change can produce a durable identity that does not describe the path actually used.

### Confirmed mixed-account path

`yandexApi()` obtains `getValidYandexAccessToken()` immediately before each network request instead of using an operation-bound auth context. `findYandexFileForJournalEntry()` may compare current UID with a Journal entry at the beginning, but `moveJournalYandexFileToTrash()` and `moveReadLaterEntryToRead()` perform additional folder, target-name, move and verification requests afterwards. Reauthorization in another Options page between these requests changes the bearer token used by later requests without invalidating the in-flight operation. Path equality is insufficient across accounts. Backup chains have the same dynamic-token property and currently lack an account snapshot entirely (also tracked by P1-179).

Required architecture: capture a non-secret auth/config generation plus accountUid/rootPath at operation admission, pass that context through helpers rather than rereading mutable config, and verify generation/identity before every subsequent mutating or identity-sensitive Yandex API request. Changing auth/root should cause an existing operation to become deferred/fail-closed, not continue in the new context. Already-issued signed URLs remain non-cancellable; their eventual settlement must be reconciled against the original durable identity instead of the current UI configuration.


## Continuation 2026-08-26 — corrected Journal CPU / startup refresh / Save As lifetime sync

Source-of-truth baseline tree is the clean product/docs tree at `cb43081c8cb93fb3c069d759ad94948c86c03482`; production runtime files are unchanged by this sync.

### P1-009 returned to PARTIAL
`journal-text-filter.js` bounds filter rows/query length and scans comment strings in 8192-character chunks, but every chunk is sliced and lowercased. Journal view/count cursor paths need exact totals and apply the filter across the candidate population. With admitted 100k records and per-entry comments up to roughly 2 MiB, the implementation is memory-aware but not CPU-scalable to its own valid data envelope. The 20-second deadline is a safety stop, not a scalable search plan. Use rebuildable derived search data or another bounded candidate index; raw Journal remains source of truth.

### P1-181 startup refresh commit ordering
`reloadOpenExtensionPagesAfterVersionChange()` writes the new runtime version marker first, then calls direct `chrome.tabs.query({})` and best-effort `tabs.reload()` for extension tabs. Query failure returns and individual reload errors are swallowed after the marker has already committed. Future worker starts therefore suppress automatic repair. This is independent crash-consistency work on top of P1-158 timeout coverage.

### P1-156 native Save As backing Blob lifetime
`prepared-save-as.js` correctly has no local timeout around native `saveAs:true`. However `offscreen.js` gives every registered Blob URL a 16-minute fallback timer. The Blob exists before native dialog ownership begins, and STARTED notification is only sent after `downloads.download()` resolves. Thus backing storage can expire while the user is legitimately still interacting with the system dialog. The Blob needs an owner lease/heartbeat or equivalent actual-lifecycle pin whose crash reclamation is separate from a fixed dialog-duration timeout.


## Continuation 2026-08-26 — P0-075 host-page DOM trust boundary

Source-of-truth baseline: `6252ee799e9b6f6eba43f56a7cc0bba20150bfd5`. This sync changes audit documentation only.

### Source evidence

- `content.js` uses the deterministic host id `webclip-pdf-extension-root`, attaches `shadow = host.attachShadow({ mode: 'open' })`, and creates the file-comment textarea inside that shadow tree. An ordinary page script can discover that host and traverse an open shadow root; the isolated JavaScript world is not a private DOM storage mechanism.
- Selection ownership is mirrored into the shared page DOM using `element.setAttribute('data-webclip-pdf-include', id)` / `data-webclip-pdf-exclude`; frame-agent uses analogous remote attributes. They remain present throughout live selection and are removed only when selections are cleared. A page MutationObserver can therefore observe the extension interaction.
- `onPageClick()` consumes page click events while selecting but has no `event.isTrusted` gate. `createUiButton()` registers a click listener that simply stops propagation and invokes the privileged callback, also without checking trusted user input. A host-page script can dispatch/call synthetic clicks. With the open shadow root it can directly reach Save/Yandex controls; selection itself is also steerable through synthetic clicks on host DOM.
- Chrome's content-script isolated world separates JavaScript environments, not the fact that content scripts read and modify the web page DOM. Chrome security guidance explicitly treats hostile pages as able to manipulate DOM used by content scripts.

### Required security model

Treat every host-page DOM node/event/attribute as attacker-controlled input. User-authorizing actions must require trusted physical input and extension-owned state, not merely an event listener attached from an isolated world. Sensitive temporary input such as the file comment must not be readable through a page-accessible open shadow tree. Authoritative selection should live in extension memory/overlay structures; if DOM markers are unavoidable for print CSS, materialize them only for the shortest print preparation window with exact rollback and do not use page-mutated marker values as authority.


## Continuation at HEAD `2e66a580ebbeb998c337fc4b4f613dfd046662cb` — locator confidentiality and surrounding-text minimization

No production source changed in this continuation. Current source review confirmed two confidentiality extensions and one new privacy finding.

### P0-066 scope expands to every durable URL-bearing field

`sanitizeSelectionSnapshot()` currently copies locator `src` and `href` with length limits only. Those locators originate from selected DOM attributes and are persisted inside Journal entries, exports and Yandex backups. Consequently a page-level signed URL, credential-like query value, URL userinfo, `data:` fragment or `blob:` identifier can bypass a future source-URL-only sanitizer. P0-066 therefore requires one reusable canonical sanitizer at every durable URL boundary, with locator-specific scheme restrictions. The existing resource-report redaction does not protect locator fields.

### P0-075 also includes the print-header disclosure window

The content UI uses an open shadow tree, but closing that tree would not fully solve the confidentiality issue. During PDF preparation `fileComment` is rendered into the WebClip print header and that header is inserted into the host document body. A hostile page can observe light-DOM insertion and read the comment before `Page.printToPDF` completes. Sensitive extension input must remain outside host-page-observable DOM across the entire workflow, including the temporary print representation. Chrome documents that content scripts have an isolated JavaScript world while still reading and modifying the page DOM; isolated-world variable separation is not a DOM confidentiality boundary.

### P1-182: locator robustness currently retains unselected surrounding plaintext

Top-frame locator creation records bounded `parentText`, previous-sibling text and next-sibling text as restore fingerprint material. The worker sanitizer retains those strings and the normal Journal/export pipeline retains the selection snapshot. This means the backup data set can include neighboring content never selected for capture. A replacement fingerprint must remain useful for P1-001 confidence/ambiguity scoring but should not reconstruct the original surrounding text. A versioned one-way representation is preferable to raw text; legacy snapshots remain readable for compatibility but new writes should stop expanding this hidden plaintext corpus.

### Evidence and test note

This is a documentation-only audit sync. Product tests are not rerun by this workflow. The last verified product gate remains the P0-063 gate (88/88 syntax, 74/74 deterministic tests); unmanaged unpacked Chrome and real Yandex E2E remain release blockers.


## Continuation at HEAD `363e4b5131033fd892be12c6aa59a4b5f89e9d7d` — Journal mutation generation race

No production source changed in this continuation. The audit compared the runtime dispatcher, single-entry Journal helpers and bulk destructive gate.

### P0-076: stale single-entry operations can target a replacement Journal

`runExclusiveJournalDestructiveMutation()` only serializes the two bulk destructive paths (`WEBCLIP_JOURNAL_CLEAR` and staged replace/import). Single-entry delete, mark-read and comment mutations are dispatched outside that exclusive gate. More importantly, a simple busy flag would not close the race for an operation that started before the bulk replace.

`deleteJournalEntry()` captures an old entry and may spend network time moving its Yandex file. Its final local phase calls `deleteJournalEntryRecordOnly(id)`, which re-reads by ID and deletes the current record. A backup import may legitimately recreate the same ID, so the old operation can delete the replacement record. `moveReadLaterEntryToRead()` has the analogous write form: after the old remote move settles, `updateJournalEntryRecord(id, patch)` performs a fresh get by ID and overlays the old operation's reading/path/resource patch onto whatever record now occupies that ID.

Comment mutation helpers expose the same optimistic-concurrency gap without a remote call: they read the record, derive an entire comments array, then call a separate `updateJournalEntryRecord()` transaction. A concurrent replace/import can land between those phases and receive the stale comments array.

The correct boundary is not only UI locking. Every mutation needs an immutable generation/revision receipt captured before work and checked in the exact commit transaction. Bulk replace needs a generation transition that makes every pre-replace receipt stale. Remote side effects that already settled before a generation mismatch require durable reconciliation/diagnostics rather than applying their result to the replacement Journal or blindly reversing the network operation.

### Evidence note

Documentation-only audit sync. Product tests are not rerun. Last verified product gate remains P0-063 (88/88 JS syntax, 74/74 deterministic tests); unmanaged unpacked Chrome and real Yandex E2E remain release blockers.


## Continuation at HEAD `3f353c9e16a7ec85293e034c0d6c8df6fa9e955f` — delete-to-Trash crash recovery

No production source changed. Audit compared the existing read-move recovery state machine with the ordinary delete-to-Trash path.

### P1-183: Trash move has no durable target receipt

`moveReadLaterEntryToRead()` writes `readMovePendingAt`, exact source and exact target into the Journal entry before issuing `resources/move`; retry can therefore verify where the file actually ended up. Ordinary delete does not have an equivalent pre-move checkpoint.

The existing locator includes a useful fallback for an interrupted deletion: it checks the current and previous month Trash folders using the entry filename. That fallback is not complete. `chooseYandexTrashTarget()` deliberately chooses a unique timestamped `__deleted_...` filename when the plain target name is occupied. If the worker stops after such a move and before the local Journal deletion, the only exact target path lived in transient memory/OperationLog, not in the entry's recovery state. A later retry starts from the old entry and may be unable to identify the already-moved resource safely.

The durable checkpoint must be written before the remote side effect and include original Yandex identity plus exact chosen target. Recovery must verify rather than repeat a move after an unknown settlement. Its local finalization must also obey the P0-076 generation/revision fence so that an old deletion cannot consume a same-ID entry from a later import.

### Evidence note

Documentation-only audit sync; product tests not rerun. Last verified gate remains P0-063 (88/88 syntax and 74/74 deterministic tests). Real unpacked Chrome and real Yandex E2E remain release blockers.


## Continuation at HEAD `e7c4fceebbb5836a0899587f2494fffeea08e0a0` — extension-page settings ordering and PKCE generation

Documentation-only refinement of two existing findings.

### P1-157: direct extension-page writes break the worker mutation ordering domain

The Journal group-by toggle calls `chrome.storage.local.set({webclipJournalGroupByUrl: ...})` directly from `journal.js`. User-settings import writes the same key from the service worker together with Yandex/OperationLog settings and a reconciliation marker. Because the page-side write does not participate in the worker's actual-settlement queue, concurrent operations have no common ordering receipt; a late Chrome settlement can overwrite the value the UI/import believes is authoritative. P1-157 therefore covers mutation consistency in addition to read/RPC deadlines.

The optional iframe permission request remains a separate user-owned prompt case inside P1-157: the popup currently wraps `chrome.permissions.request()` in the generic 10-second read helper. The local timeout is not cancellation and can be followed by a late grant, so retry must remain single-flight until the real browser prompt settles.

### P1-178: pending PKCE cleanup needs compare-and-remove semantics

`runYandexAuthStorageOperation()` serializes individual storage operations, but the semantic sequence `read pending -> decide stale/consumed -> later remove` spans multiple queue turns. Serialization alone does not protect the value between those turns. `getYandexStatus()` can read an old expired attempt, a new START_AUTH can replace the key, and then the status cleanup removes the new attempt. `finishYandexOAuth()` has the same pattern for expired pending and, after a potentially long network token exchange, removes `yandexOAuthPending` without proving that the stored attempt is still the one it exchanged.

A per-attempt generation/state identifier is required. Cleanup/consume must compare exact attempt identity immediately before mutation and no old flow may remove a newer attempt. This integrates with the already-recorded completion-aware post-token state machine rather than adding a duplicate priority.

### Evidence note

No production source changed and no product tests were rerun. Last verified product gate remains P0-063 (88/88 syntax, 74/74 deterministic tests).


## Continuation at HEAD `c0e1ed0c30c628e46d969583025711423b507b9c` — Yandex remote object/content proof

No production source changed. This pass compared the normal PDF upload, allow-existing retry, pending remote-save recovery, Journal backup upload/recovery and filename generation.

### P1-184: path plus byte size is not object identity

The normal upload correctly requests a signed target with `overwrite=false`. However, the retry/reconciliation proof is weaker than the upload creation contract. In allow-existing mode WebClip reads the exact target path and, if it is a file whose byte count equals the cached PDF byte count, treats it as the prior successful upload and skips sending the cached PDF. The first durable `resourceId` is captured only after that decision. Background remote-save recovery follows the same path/type/size proof. Journal backup recovery also uses exact path plus exact size.

This can misattribute an unrelated object. PDF filenames include page title/site plus a timestamp only to the second, so two operations can target the same filename within one second; an external Yandex client can also create or replace content at the expected path. Equal byte length is not a content or creation proof. The consequence is a Journal/backup success state referring to a different object than the bytes WebClip intended to persist.

The fix should be implementation-neutral until real Yandex API verification is available. Store a local content digest/immutable expected fingerprint and an operation-scoped transfer receipt before/through the signed transfer; once a remote object is conclusively verified, persist its `resourceId`. If Yandex exposes a trustworthy checksum or immutable creation identity in the actual API account used by WebClip, adopt it only after real E2E confirmation. Otherwise recovery must remain fail-closed instead of accepting a path-size collision. This finding is distinct from P1-179 (account/root namespace identity) and P0-073/P0-074 (auth/account operation fencing).

### Evidence note

Documentation-only audit sync. Product tests are not rerun. Last verified product gate remains P0-063: 88/88 JS syntax and 74/74 deterministic tests; real unpacked Chrome and real Yandex E2E remain release blockers.


## Continuation 2026-08-26 — self-generated Journal backup must be restorable (P0-077)

Audit source-of-truth baseline: `0b7ae28eb81eb69e3465f571b0edf88a214d15a2`. Documentation-only sync.

### P0-077 OPEN — export envelope is larger than the restore envelope

The current full-Journal exporter tracks two independent ceilings: up to 50 MiB of JavaScript string characters (`MAX_JOURNAL_EXPORT_TEXT_CHARS`) and up to 64 MiB of actual UTF-8 Blob bytes (`MAX_JOURNAL_EXPORT_BYTES`). This means a valid Cyrillic/Unicode export can be larger than 50 MiB on disk while still being accepted and reported as a successful backup. Both restore entry points are narrower: `journal.js` rejects a selected local file when `file.size > 50 MiB`, while service-worker staged import rejects a manifest or accumulated chunks above `MAX_JOURNAL_IMPORT_BYTES = 50 MiB`. A 50–64 MiB self-generated backup is therefore outside the same build's restore contract.

There is a second independent envelope mismatch. Streaming JSON import is configured with `maxEntries: 100000`, while normal Journal append has no global 100k entry admission limit. The exporter batch loop is not capped at 100k entries; a sufficiently compact Journal can remain inside the byte/character ceiling, export successfully with more than 100k entries, and then fail its own import parser.

Backup success is a data-durability promise. Define one versioned restore envelope shared by live admission, local export/import and Yandex backup/import. A successful backup must be provably accepted by the same version's restore path. Existing over-limit profiles must not be truncated or deleted; migration/export handling is required. Boundary regression should include Unicode data where encoded bytes exceed the import ceiling despite legal character count, plus a >100k compact-entry corpus.


### P0-077 additional evidence — valid single entry can exceed export batch ceiling

The self-restore envelope mismatch is also per-entry, not only global. `JOURNAL_EXPORT_BATCH_MEMORY_CHARS` is 4 MiB and `readJournalEntryBatch()` aborts the complete export when one `JSON.stringify()` result exceeds that value. Yet independent live limits allow roughly 2 MiB of SelectionSnapshot plus up to 2 MiB of journal-comment text, a separate file comment and metadata; import parsing itself admits an 8 MiB source entry before field normalization. A valid stored entry can therefore make the whole full-Journal backup fail even when total Journal size is far below the 50/64 MiB global limits. P0-077 acceptance must include a single-entry exportability invariant, not merely total bytes and entry count.


## Continuation 2026-08-26 — imported temporal domain and IndexedDB schema ownership

Audit source-of-truth baseline: `e22d24aef75ff3c669d263ad4010983cf35078c8`. Documentation-only sync.

### P1-185 — imported timestamps are type-converted but not domain-validated

The Journal import normalizer protects strings, URLs, paths, comment counts and SelectionSnapshot size, but numeric time fields have a weaker contract. `createdAt` accepts any finite numeric conversion, including negative or implausibly distant future values. Other persisted timestamps use `Number(...)` without a finite check, so JSON strings such as `"1e309"` become `Infinity`. These values are not merely display metadata: `createdAt` is an IndexedDB sort key and feeds `urlStats.lastSavedAt`; Chrome Action freshness is derived from `Date.now() - lastSavedAt`. `readMovePendingAt` is also a recovery-state signal. Temporal values therefore need the same strict import-domain validation as paths and sizes.

### P2-019 — Journal view can become an accidental migration owner

`journal.js::openJournalDbForView()` is described as a direct view path, yet its `onupgradeneeded` creates the full v7 Journal stores and indexes. The service worker independently owns another copy of the schema definition. The definitions happen to match today. A future version that requires record transformation or migration metadata can fail catastrophically if an already-open/new Journal extension page performs the version bump first: IndexedDB records the new database version, and the service worker's authoritative `onupgradeneeded` for that same version will never run. Avoid two writable migration owners; share one migration module or require the view path to fail/reload until the worker-owned schema is current.


## Continuation 2026-08-26 — imported remote-reference provenance

Audit baseline: `f92130307efad67946fdaecf36870ea940b4852a`. Documentation-only sync.

**P0-022 is PARTIAL.** The earlier fix correctly fences destructive `resources/move` to the currently configured WebClip service branches, but that does not prove that an imported Journal record actually owns the object it names. Import accepts `remotePath`, `resourceId`, `publicUrl`, `accountUid` and `rootPath`; account/root checks are conditional when stored values are present. In `findYandexFileForJournalEntry()`, if neither stable resource id nor public URL is stored, `matchesKnownIdentity()` accepts any file returned at the stored path. A crafted/modified backup can therefore name another existing file under Upload/ReadmeLater/Trash and later cause that object to be moved when the user chooses the destructive file option on the imported record. The import confirmation code authenticates user intent to import, not remote-reference provenance. New remote references need an extension-generated versioned receipt/provenance marker; imported/path-only references must remain unverified until an explicit, fail-closed re-bind proves the exact remote object. This is independent of managed-path containment and composes with P0-073/P0-074/P1-184.


## Continuation 2026-08-26 — imported comment identity and flattened rendered state

Audit baseline: `b44d27f2bd55e2ebe4c40fc052e14cc9fc08d780`. Documentation-only sync.

**P1-186.** Imported comment IDs are length-bounded but not uniqueness-bounded. Two valid comment objects can retain the same non-empty ID; Journal edit/delete and editing-state lookup address by ID with first-match semantics, so the restored data model contains ambiguous identities. Entry IDs already avoid this class through collision-aware staging/re-ID.

**P1-187.** Flattened selected iframe bodies are deep-cloned. The clone helper copies resolved href/src/poster state but has no canvas bitmap transfer. `Node.cloneNode()` does not copy a canvas painted image, so the flattening path can replace visible selected graphics with blank canvas output. Add bounded rendered-state capture and real Chromium regression; evaluate video/form live state separately rather than assuming clone fidelity.


## Continuation 2026-08-26 — imported locator CSS grammar

Audit baseline: `cfa5fca1c6178e4aaf235399040b46f8a4f3b018`. Documentation-only sync.

**P1-188.** Locator serialization only emits a narrow structural CSS form, but the import sanitizer merely truncates `cssPath`. Both legacy and v3 restore feed this string to `querySelector`; legacy restore may return that element directly after a tag check. This makes untrusted backup data executable as arbitrary selector-engine input and enlarges the restore semantics beyond anything WebClip generates. Restrict imported selector syntax to the canonical generated grammar or discard it and use bounded structural fields; do not execute arbitrary selector text from backup.


## Continuation 2026-08-26 — P1-004 frame document identity fence

Audit baseline: `fa1d9e6f2f68f37ccb2416271fd26021b41f65b7`. Documentation-only sync; production runtime and manifest are unchanged, and the previously recorded product test gate was not rerun for this docs-only finding.

**P1-004 remains incomplete.** The worker registry records a child frame `documentId`, but registration accepts an empty value, state forwarding only rejects a document mismatch when both values are present, and outbound `WEBCLIP_FRAME_AGENT_COMMAND` uses `chrome.tabs.sendMessage(..., { frameId })` without the recorded `documentId`. Child-frame navigation does not necessarily produce a top-tab `changeInfo.url`, so an old registry record can survive. A freshly injected frame agent installs its runtime command listener before its asynchronous registration settles; during that interval a stale record keyed only by reused `frameId` can authorize delivery to the new document. Chrome 118 already supports `MessageSender.documentId` and `tabs.sendMessage` targeting by `documentId`. Require non-empty exact document identity at register/state boundaries and target outbound commands to the recorded document (plus a registry generation/settlement fence as needed); absent, changed or stale document identity must fail closed. Add regression that navigates a child frame while keeping the top URL stable and proves a command authorized for the old document cannot reach the replacement document.


## Continuation 2026-08-26 — P1-004 / P1-171 registry deduplication

Audit baseline: `bee0760251f865761827248ce3c4318837aab7ce`. Documentation-only correction. The child-frame reused-`frameId` / missing exact `documentId` finding was already registered as **P1-171**. P1-004 remains the feature-level cross-origin iframe item and is `PARTIAL`; P1-171 is the single detailed audit item for the document-generation/navigation fence. No new P-number is allocated. Production runtime/manifest are unchanged and no product test gate is rerun by this correction.


## Continuation 2026-08-26 — imported site identity controls Yandex routing

Audit baseline: `9490ed82170b4b5489e73e4bd32743b773320732`. Documentation-only sync; production runtime and manifest are unchanged, and the previously recorded product test gate was not rerun for this docs-only finding.

**P1-189.** `normalizeImportedJournalEntry()` accepts an explicit backup `hostname` independently from the normalized `url`. Normal runtime entries derive hostname from sender URL, but imported entries can persist a conflicting pair. Later `moveReadLaterEntryToRead()` prefers `entry.hostname` when deriving the managed Yandex Upload destination, and `findYandexFileForJournalEntry()` prefers it for deterministic Upload/ReadmeLater fallback candidates. Therefore an untrusted backup can influence site routing of a later user-approved remote move even though the URL/siteKey represents another site. Managed-path sanitization contains the result under WebClip folders but does not make the site identity trustworthy. Canonicalize derived site metadata from normalized URL at import and at privileged routing boundaries; inconsistent duplicate hostname/siteAddress fields must not be authoritative. Keep P0-022 remote-object provenance and P0-073/P0-074 account/root fences separate.


## Continuation 2026-08-26 — P0-022 derived locator provenance gap

Audit baseline: `29552bd70166eeb8230f7ce16a99a93a282765e1`. Documentation-only sync; production runtime and manifest are unchanged, and the previous product test gate was not rerun.

**P0-022 is broader than stored `remotePath`.** Import preserves `filename`, `folder`, `readMoveSourcePath` and `readMoveTargetPath` from the backup. `findYandexFileForJournalEntry()` builds deterministic candidate paths from those fields (plus site folders) before global identity search. When both `resourceId` and `publicUrl` are absent, `matchesKnownIdentity()` accepts any file returned at a candidate path. Therefore a crafted imported entry can omit stable remote identity and still bind to an existing managed WebClip file by filename/path hints, after which a user-approved Trash or Read move can destructively affect that object. Treat every imported locator-only reference as unverified provenance; path containment is necessary but insufficient. Require a locally issued object/provenance receipt or an explicit safe re-bind that proves exact identity before destructive use. P1-189 separately canonicalizes the site identity used to derive folders.


## Continuation 2026-08-26 — P1-090 post-move object identity proof

Audit baseline: `62635849953ae4bb8a17b05043742dc59b8d5b88`. Documentation-only sync; production runtime and manifest are unchanged, and the previously recorded product test gate was not rerun for this docs-only finding.

**P1-090 is PARTIAL, not fully regression-closed.** Pre-move Yandex lookup already applies the stronger Journal object identity contract, but both destructive move completion paths weaken it at the target: Trash and `ReadmeLater → Upload` GET the exact `targetPath` including `resource_id`, then stop on `type === file` without proving that target is the same object found before the move. A timeout/unknown settlement or an external-client race can therefore place an unrelated file at the expected target path and make WebClip accept it. Mark-read may then replace the Journal entry's identity with that unrelated target `resourceId/publicUrl`; delete→Trash may proceed to local deletion without proving the original object moved. Snapshot the immutable source object identity before POST and reconcile the exact source/target/object tuple after the operation. Target success requires the same stable `resourceId`; the existing legacy public-URL fallback is only acceptable when the API truly omits resource_id and must never override a conflicting id. For unknown settlement also establish source outcome rather than trusting target path occupancy. Extend P1-183 Trash checkpoint with the same expected identity. Add mocked-Yandex collision/timeout regressions; real Yandex move E2E remains release QA.


## Continuation 2026-08-26 — P1-182 locator URL attribute privacy

Audit baseline: `f06b60ab7d3f03357736374eea1a66f82787cb7c`. Documentation-only sync; production runtime and manifest are unchanged, and the previously recorded product test gate was not rerun for this docs-only finding.

**P1-182 also covers hidden URL-attribute retention.** Current `content.js::createElementLocator()` copies raw element `src` and `href` attributes into SelectionSnapshot (bounded to 1000 chars), while the worker/import sanitizer preserves those strings up to 2000 chars. Snapshot is durable Journal state and is included in full local/Yandex backup. A selected anchor/image can therefore persist query/hash tokens, one-time/signed identifiers, tracking/session parameters, or a prefix of a `data:` payload even though those values are not visible in the selected text. This is the same locator-privacy root cause as raw neighbor text: restore should compare privacy-preserving/versioned fingerprints or a minimal sanitized URL classification rather than retaining secret-bearing raw attributes. New exports must not reproduce legacy raw sensitive href/src fields; legacy restore compatibility should consume them only locally as needed for migration. Add regression with a unique secret marker placed only in href/src query/hash/data content and assert it is absent from newly generated Journal export while locator confidence remains acceptable.


## Continuation 2026-08-26 — P1-184 identity proof must precede publish

Audit baseline: `bc259d93aff40d0995157493d836b461fbd92b2e`. Documentation-only sync; production runtime and manifest are unchanged, and the previously recorded product test gate was not rerun for this docs-only finding.

**P1-184 has a publication side effect, not only a reuse/verification weakness.** In live retry, `allowExisting=true` accepts an existing file by exact path + byte size, then the default `createPublicLinks` flow calls `ensureYandexPublicUrl(remotePath)` before the final metadata GET records `resource_id`. Background `pendingRemoteSaves` recovery performs the same logical sequence: GET path, accept `type=file` + exact size, optionally publish, and only afterward mark the checkpoint verified with the returned resource id. Consequently a same-size unrelated object that occupies the expected path can be made public before WebClip has proved that the object is the result of its own operation. Strong object/content proof must therefore be an admission gate for `resources/publish`, not merely a final Journal field. Publication outcome itself becomes durable reconciliation state when its settlement is unknown. Add mocked-Yandex regressions proving an unrelated same-size target receives no publish request and remains unresolved.


## Continuation 2026-08-26 — historical closure evidence reconciliation

Audit baseline: `5f3b53394171de0a64e8b4ff6c687c31be28bc34`. Documentation-only evidence reconciliation; production runtime and manifest are unchanged and no product tests were rerun.

Canonical registry status wins over historical closure snapshots. `P1-009_CLOSURE.md`, `P1-090_CLOSURE.md`, and `P1-125_CLOSURE.md` still labeled their original implementation gates as current `REGRESSION` even though later deep audit reopened each item as `PARTIAL`. The files now preserve the original PASS evidence verbatim while explicitly stating that it proves only the older implemented scope, not the newer CPU/deadline, post-move object-identity, or same-URL document-generation acceptance criteria. This prevents historical gates from being misread as current closure evidence.

## Continuation 2026-08-26 — imported OperationLog provenance

Confirmed a separate diagnostics/provenance gap after duplicate-check against the current registry. `normalizeImportedJournalEntry()` accepts a syntactically valid `raw.operationId` from an unsigned Journal backup and stores it unchanged. `journal.js::buildLinkedOperationLog()` treats the same exact ID as a live local linkage and, on explicit Show/Copy action, reads `WEBCLIP_OPERATION_LOG_GET` for that ID from the current installation. A crafted or foreign backup can therefore make an imported entry appear linked to an unrelated local log. This does not grant a new remote capability, so it is tracked as P1-190 rather than P0-022. Required direction: preserve imported historical operation IDs without treating them as locally proven live-log authority; add a versioned provenance/instance receipt and deterministic regression for collision with an existing local OperationLog.

Audit sync only. Production runtime/configuration and `manifest.json` are unchanged; the previously proven 88/88 syntax + 74/74 deterministic product gate was not rerun for this docs-only commit.

## Continuation 2026-08-26 — shared IndexedDB migration ownership

Storage/repair audit expanded existing **P2-019** rather than creating a new ID. The shared-schema ownership problem is already concrete outside `WebClipJournal`: both the service worker and `offscreen.js` open `WebClipPdfRetryCache` at version 3. The service-worker upgrader performs a real `oldVersion < 2` cursor migration/backfill from legacy PDF records into the `meta` store; the offscreen upgrader only creates missing `pdfs`/`meta` stores. Therefore schema authority and data-migration authority are already context-specific. Current normal PDF flows generally touch the cache in the worker before asking offscreen to materialize/upload it, so this audit does not claim a reproduced normal-flow corruption and P2-019 remains P2 OPEN. The acceptance criterion is broadened to one authoritative/shared migration implementation across Journal, PDF retry cache, transfer DB and future shared IndexedDBs, with opener-order upgrade regressions from prior versions.

Audit sync only. Production runtime/configuration and `manifest.json` are unchanged; the previously proven 88/88 syntax + 74/74 deterministic product gate was not rerun for this docs-only commit.

## Continuation 2026-08-26 — P0-071 print-time URI TOCTOU

PDF/DOM trust-boundary audit expanded existing **P0-071** rather than assigning a new P0. Current `content.js::prepareForPrint()` mutates the live host DOM and calls `absolutizeLinksInIncludedContent()` before sending `WEBCLIP_GENERATE_PDF`. The service worker then calls CDP `Page.printToPDF`. The content script itself relies on `beforeprint/afterprint` firing inside that print pipeline to hide/restore WebClip UI, proving a host-controlled `beforeprint` callback can execute after the one-shot pre-print link processing. A hostile page can therefore replace/add an unsafe `javascript:`, `data:` or `file:` href inside an already Included subtree after the sanitizer and before Chromium renders PDF annotations. The P0-071 acceptance criterion is broadened from “sanitize before print” to an enforceable safe-scheme invariant on the actual printed representation, e.g. inert/frozen sanitized print DOM or another design that cannot be recontaminated by host mutation during `beforeprint`. Add a browser regression with hostile `beforeprint` mutation after prepare.

Audit sync only. Production runtime/configuration and `manifest.json` are unchanged; the previously proven 88/88 syntax + 74/74 deterministic product gate was not rerun for this docs-only commit.

## Continuation 2026-08-26 — P1-191 transactional manual-token auth replacement

OAuth/session audit confirmed a separate auth-transition root cause. `setManualYandexToken()` writes the candidate manual `yandexAuth` before validating it with the Yandex API. On validation/API failure its catch path writes `null`, so an already valid current OAuth session is destroyed by a bad or expired manual token attempt. This is independent of the stale compare/remove races already tracked in P1-178, although the fix must share the same generation contract: validate a candidate without publishing it, commit only after proof, preserve the previous proven auth on failure/unknown outcome, and invalidate incompatible older PKCE attempts only when the manual replacement actually succeeds.

Audit sync only. Production runtime/configuration and `manifest.json` are unchanged; the previously proven 88/88 syntax + 74/74 deterministic product gate was not rerun for this docs-only commit.


## Continuation 2026-08-26 — P1-043 concurrent storage quota admission

Current product source is unchanged; this is a docs-only audit refinement. The existing storage preflight was re-read on current `main`.

- `ensureStorageBudget()` computes one `navigator.storage.estimate()` snapshot, compares `free` with `requiredBytes + 32 MiB`, optionally deletes only expired/disposable transfer payloads, expired PDF retry-cache and expired OperationLog records, then re-checks the estimate. Functional Journal entries are explicitly not deleted.
- Large live writers are not serialized by that check and there is no byte reservation/admission registry tied to actual IndexedDB settlement. `putCachedPdf()` performs its own preflight before the cache transaction; Journal file import first asks `WEBCLIP_STORAGE_PREFLIGHT` from the page and then stages chunks directly in the shared transfer DB; import normalization performs another snapshot preflight; chunked Journal export periodically checks free space while adding Blob chunks.
- Therefore concurrent writers can all pass against the same free-space snapshot before any of them has committed its bytes. The 32 MiB reserve is not additive across concurrent operations and can be consumed multiple times. A later IndexedDB write may still fail atomically with quota error, but P1-043's stronger claim that preflight protects large staging under concurrency is not proven.
- This is the same storage-admission root cause as P1-043, so no new P-code is assigned. Status is refined from REGRESSION to PARTIAL.
- Acceptance: add a worker/owner-level global reservation ledger for anticipated persistent bytes across PDF cache/import/export staging, reserve before materialization/write, count only unreserved free budget plus the one global safety reserve, and release only after actual commit/abort plus cleanup. Concurrent-admission regression should demonstrate that N individually admissible large writers cannot overbook one quota snapshot. Journal entries and durable recovery checkpoints must never be evicted automatically to make room.

Docs-only audit sync: production runtime and `manifest.json` are unchanged. The previously proven product gate (88/88 syntax, 74/74 deterministic tests) was not rerun for this documentation-only refinement.

## Continuation 2026-08-26 — P0-078 publication policy generation fence

Current product source is unchanged; this is a docs-only audit finding on the current `main`.

- Live Yandex PDF save snapshots `config.createPublicLinks` at operation start. After the signed upload/checkpoint phase it later executes `ensureYandexPublicUrl(remotePath, operationId)` when that old snapshot is true.
- `checkpointPendingRemoteSaveIntent()` also persists `createPublicLinks` into `pendingRemoteSaves`. `recoverPendingRemoteSaves()` uses the checkpoint value and can execute `ensureYandexPublicUrl()` during later maintenance.
- Options writes the global setting independently through `WEBCLIP_YANDEX_SAVE_PREFERENCES`; the UI describes the switch as whether WebClip creates a permanent link for successfully uploaded PDFs and explicitly warns that such a link makes the file public. The config write does not fence/revoke pending publication authorization.
- Therefore a user can switch public-link creation off after an upload becomes pending/unknown but before the actual publish side effect. A live operation in another tab or a later recovery pass can still create a new public link because it follows the older operation/checkpoint snapshot.
- This is distinct from P0-069 (lifecycle when deleting an already published Journal entry) and P1-164 (explicit per-entry unpublish). P0-078 covers privacy-policy revocation for publication that has not yet been safely settled.
- Acceptance: maintain a durable/current publication-policy generation. Any true→false transition (Options or settings import) invalidates authorization for not-yet-started publish from older generations. Immediately before `resources/publish`, live and recovery paths fresh-check current policy/generation. If publish has already started and its result is unknown, do not call it cancelled and do not blind-retry; keep a durable publication-outcome checkpoint for reconciliation. Already confirmed public links are not automatically unpublished by the global toggle; explicit revoke remains P1-164/P0-069.

Docs-only audit sync: production runtime and `manifest.json` are unchanged. The previously proven product gate (88/88 syntax, 74/74 deterministic tests) was not rerun for this documentation-only finding.


## Continuation 2026-08-26 — P1-086 cross-context readonly transaction completion

Current product source is unchanged; this is a docs-only audit refinement on current `main`.

- P1-086's service-worker Journal export fix remains valid: revision/batch readonly paths defer publication until transaction completion.
- `offscreen.js` still has the same class of early-publication bug in shared IndexedDB reads. `getPdfCacheRecord()` and `getTransferPayload()` call `guard.resolve(resolve, req.result)` directly from `IDBRequest.onsuccess`. `getTransferChunkedBlob()` similarly resolves its collected `values` when the last request succeeds.
- `timeoutIdbTransaction()` marks the external Promise settled at that point. If the readonly transaction subsequently fires `error`/`abort`, the error handler cannot replace the already-returned record. The caller may already materialize a Blob or start the signed transfer from data that was never transaction-complete.
- This is not a new P-code: it is the same completion-publication invariant already tracked by P1-086. Status is refined from REGRESSION to PARTIAL.
- Acceptance: all bounded readonly IDB helpers in worker/offscreen/extension pages must keep request results provisional until `tx.oncomplete`; timeout/error/abort after request success must reject. Add offscreen deterministic regressions for PDF cache, transfer payload and chunk-group reads with request success followed by late transaction abort/error.

Docs-only audit sync: production runtime and `manifest.json` are unchanged. The previously proven product gate (88/88 syntax, 74/74 deterministic tests) was not rerun for this documentation-only refinement.

## Continuation 2026-08-26 — P1-158 auth-critical Chrome config read

- **P1-158 OPEN refined — Yandex prerequisite config read can bypass network deadlines.** Current `readYandexAuthState()` performs three reads in one `Promise.all`: session auth and legacy persistent auth are bounded by `runYandexAuthStorageOperation`, but `chrome.storage.local.get('yandexConfig')` is direct/unbounded. `getValidYandexAccessToken()` calls this before `yandexApi()` creates/uses the network request, so a never-settling Chrome Storage read can hold PDF upload, remote-save recovery, backup and account/status flows indefinitely even though their HTTP requests have timeouts. The fix belongs to existing P1-158: make every prerequisite auth/config read bounded, include it in the operation budget where applicable, and do not let a late read result start a side effect after the caller has already received terminal timeout. P0-074 remains the separate immutable account/root/auth-generation contract.

This continuation is docs-only. Production source and `manifest.json` are unchanged; the previous product test gate was not rerun.

## Continuation 2026-08-26 — P1-192 MV3 background-operation lifecycle ownership

- **P1-192 OPEN — alarm wake-up is not lifecycle ownership of the long Promise.** `chrome.alarms.onAlarm` starts background backup and maintenance with `.catch(...)` and returns immediately. Before an offscreen signed transfer starts, `stageFullJournalExport()` may spend up to five minutes in IndexedDB/JSON staging; maintenance can likewise spend long intervals in pure IndexedDB cleanup or full `urlStats` rebuild. Current Chrome extension-service-worker lifecycle guidance documents a ~30-second inactivity shutdown and explicitly recommends periodic extension API calls only for exceptional long-running service-worker operations; the alarms event callback itself has a `void` callback contract. The signed-transfer heartbeat helps only after offscreen transfer begins, not during the pre-transfer snapshot.
- Backup scheduling amplifies the impact: the periodic backup alarm is one-shot. If the worker is killed after that alarm fires but before success/failure schedules the next periodic/retry alarm, worker-start self-heal can reconstruct scheduling only after some later event wakes the extension. The hourly maintenance alarm is repeating and eventually provides such a wake under normal browser uptime, but this turns backup timeliness into accidental dependence on another subsystem and does not make the interrupted maintenance pass itself reliable.
- Required architecture: explicit lifecycle ownership around the actual long operation, or move heavy work into an offscreen/durable context. Keep all existing deadlines/abort semantics and durable backup/recovery checkpoints; lifecycle keepalive must stop on actual settlement and must not turn a hung operation into an immortal worker. Real unpacked Chrome QA should force/observe >30-second snapshot and maintenance cases.

This continuation is docs-only. Production source and `manifest.json` are unchanged; the previous product test gate was not rerun.

## Continuation 2026-08-26 — P1-193 optional host permission user gesture

- **P1-193 OPEN — asynchronous frame discovery occurs before the gesture-gated permission request.** The current popup click handler awaits active-tab lookup, top content-script injection and a content-script RPC that enumerates cross-origin frame origins before calling `chrome.permissions.request()`. Those steps are individually bounded but can consume much longer than transient user activation. Chrome's current permissions documentation requires `permissions.request()` from a user gesture; Chromium's implementation rejects the extension function when `user_gesture()` is false.
- This is intentionally separate from P1-157. P1-157 already covers the opposite side of the boundary: once a permission request really starts, its user-owned prompt must not be treated as cancelled by a local `Promise.race` timeout. P1-193 is admission: slow prerequisite work can mean the prompt never starts at all.
- Required direction: two-phase UI. First discover and display the bounded origin set. Then require a second explicit grant click whose first activation-sensitive operation is `permissions.request()` over a short-lived, source-bound candidate set. Navigation/document replacement invalidates the candidate generation; post-grant frame injection still revalidates current document and granted host permission.

This continuation is docs-only. Production source and `manifest.json` are unchanged; the previous product test gate was not rerun.

## Continuation 2026-08-26 — P0-039 recovery checkpoint capacity

- **P0-039 PARTIAL — bounded pending append capacity can break the post-side-effect recovery guarantee.** `pendingAppends` has hard limits of 20 records and 4 MiB. A failed recovery attempt only updates `attemptCount/lastError`; unlike remote-save checkpoints there is no stale/dead-letter state that stops an irrecoverable item from occupying active capacity. `checkpointPendingJournalAppend()` refuses a 21st new record without deleting old data.
- `safeAppendJournalEntry()` catches that checkpoint failure and still attempts the normal Journal append. This is fine while IndexedDB is healthy, but if the same sustained IDB/quota failure that created the backlog also rejects the direct append, a local/Yandex file may already have been physically saved while the new metadata has neither a Journal entry nor durable recovery checkpoint. The user sees a warning, but the invariant that post-side-effect metadata is recoverable is no longer true.
- Keep the existing safety property that old unresolved items are never evicted merely to make space. Instead reserve recovery capacity before starting a physical side effect or introduce a separate durable overflow/dead-letter envelope with bounded management/export. Permanently failing items need explicit diagnostics/resolution rather than infinite invisible occupancy.

This continuation is docs-only. Production source and `manifest.json` are unchanged; the previous product test gate was not rerun.

## Correction 2026-08-26 — P0-039 capacity hypothesis rejected

The immediately preceding P0-039 capacity refinement was re-checked against current live callers and is **retracted**. `safeAppendJournalEntry()` / creation of new generic `pendingAppends` no longer has a live save caller in the current product path; the generic store remains for legacy recovery compatibility. Current irreversible save paths use specialized pre-side-effect checkpoints instead: local downloads persist `pendingDownloads` before `chrome.downloads.download()`, and Yandex saves persist `pendingRemoteSaves` before signed PUT/publication. Therefore a full generic `pendingAppends` queue does not currently cause the claimed 21st live download/upload to complete without durable recovery.

P0-039 is restored to `REGRESSION`. This correction is intentionally preserved in the audit trail rather than deleting the rejected hypothesis, so future readers can see why it was not promoted into the active registry. If a future code change reintroduces a live caller of `safeAppendJournalEntry()`, capacity admission must be re-audited before that caller is accepted.

This correction is docs-only. Production source and `manifest.json` are unchanged; product tests were not rerun.



## Continuation 2026-08-26 — unresolved local-download TTL evidence

| Code | Priority | Status | Finding |
|---|---|---|---|
| P0-039 | P0 | PARTIAL | Full recovery audit confirmed a distinct live-path gap after rejecting the earlier generic `pendingAppends` capacity hypothesis. `reconcilePendingLocalDownloads()` removes both unbound intents and bound numeric `pendingDownloads` after `PENDING_LOCAL_DOWNLOAD_TTL_MS = 24h` when Chrome no longer returns a matching `DownloadItem`, revokes the Blob URL and records that the Journal entry was not created. A missing DownloadItem is not proof that the file never settled: after worker death/unknown `downloads.download()` settlement, the file may exist while the user or Chrome has already cleared download history. The checkpoint still contains the only durable Journal metadata; deleting it converts an uncertain external outcome into permanent metadata loss. Keep unresolved evidence in a bounded dead-letter/manual-resolution state instead of TTL deletion. Exact automatic append still requires the existing own-extension/identity proof; unknown outcome must stay fail-closed rather than fabricate success. |

Docs-only audit sync; production runtime and manifest were not changed and the prior product gate was not rerun.


## Continuation 2026-08-26 — P1-178 stale OAuth completion versus newer settings generation

| Code | Priority | Status | Finding |
|---|---|---|---|
| P1-178 | P1 | OPEN | A pending PKCE attempt keeps its original clientId while the token exchange can remain in network I/O outside both the yandexConfig settlement chain and settings-import barrier. User-settings import may therefore commit a newer clientId B while old attempt A is still in flight; when A later returns, `finishYandexOAuth()` calls `updateYandexConfig()` and writes clientId A after the import, silently rolling back the newer setting. Existing storage actual-settlement ordering is insufficient because the stale operation has not entered the storage queue yet. Extend the authAttempt generation contract to config/settings generation: a stale finish may not overwrite a newer imported/direct config generation; incompatible newer config can invalidate the old pending attempt or the late finish must fail closed/reconcile without publishing stale auth/config. |

Docs-only audit sync; production runtime and manifest unchanged; product gate not rerun.


## Continuation 2026-08-26 — IndexedDB eviction / durability class

| Code | Priority | Status | Finding |
|---|---|---|---|
| P1-194 | P1 | OPEN | Journal, recovery checkpoints и служебные IndexedDB WebClip живут в web-platform storage extension origin. Chrome прямо допускает eviction такого storage под сильным storage pressure, если origin не получил persistent storage; `unlimitedStorage` также исключает quota/eviction, но текущий manifest его не запрашивает. WebClip умеет показывать `navigator.storage.persisted()` и имеет ручную кнопку `persist()` в Options, однако persistence не является admission/invariant для Journal или irreversible save flows. При этом код возвращает/логирует `recoveryGuaranteed=true`, когда durable checkpoint лишь успешно committed в обычный IndexedDB. Это переоценивает гарантию: при `persisted=false` Browser способен удалить сам Journal/pending store вместе с единственным recovery evidence после уже физически успешного local/Yandex side effect. Нужен явный durability-class contract: выбрать приемлемую стратегию защиты (например, добиться `navigator.storage.persist()` и контролировать результат; рассмотреть `unlimitedStorage` только как осознанное permission/product решение; либо иной durable layer), показывать состояние пользователю и не маркировать recovery как guaranteed, если eviction protection не доказана. Перед необратимым side effect checkpoint admission должен учитывать не только commit/quota, но и требуемый durability class; если продукт допускает best-effort storage, терминология/UX/OperationLog обязаны это честно отражать. External versioned backup остаётся дополнительной защитой и не заменяет локальный Journal source-of-truth. Regression/real Chrome QA: `persisted=false` не выдаёт ложную `recoveryGuaranteed`; выбранный protected mode подтверждается после restart/storage-pressure simulation настолько, насколько позволяет Chrome test environment. P1-043 остаётся про concurrent quota reservation, P2-008 — про расширенный health-report. |

Evidence: current manifest has no `unlimitedStorage`; Options exposes a user-triggered `navigator.storage.persist()` and health status, but checkpoint creation/finalization does not require persisted storage. Chrome documentation states extension web-platform storage can be evicted under heavy storage pressure and identifies `persist()`/`unlimitedStorage` as protections. Docs-only audit sync; runtime/manifest unchanged and product gate not rerun.
