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
