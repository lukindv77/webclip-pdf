# Audit delta — popup Chrome API settlement / exact-document command lifecycle — 2026-08-28

Source-of-truth `main` immediately before this write: `f662ddedcf976859e2371cc043a779698bc488f2`.

Docs-only audit checkpoint. Production runtime, tests, configuration and `manifest.json` are unchanged. No new P-number is assigned.

## Classification

Fresh source + current Chrome API contract review refines existing:

- **P1-157** — direct extension-page Chrome API/RPC calls need operation-class-specific deadline/actual-settlement handling;
- **P1-193** — optional host permission request requires gesture-safe two-phase admission and exact candidate document generation;
- **P1-125** — `scripting.executeScript()` actual-settlement receipt must be exact-document-bound;
- **P1-175** — privileged page command dispatch must not retarget after navigation;
- **P1-171** — remote-frame/top-document command generation;
- **P0-070/P0-023** — save/retry authority must remain tied to exact source document generation;
- **P1-201** — granted optional permission lifecycle/revocation after admission;
- **P0-045** — Incognito source must not create persistent optional host permission.

No separate P1-211 root cause is required. The fresh value of this pass is that the popup currently uses one generic 10-second `Promise.race` helper for both read-only operations and browser-owned/user-owned side effects, while other popup commands bypass even that helper. Chrome's current API exposes exact document identity primitives that make a stronger design feasible.

## Current generic popup deadline helper is semantically over-broad

`readPopupExtensionApiBounded(start, label, timeoutMs=10000)`:

1. creates the raw `actual = Promise.resolve().then(start)`;
2. creates a timeout Promise;
3. returns `Promise.race([actual, deadline])`;
4. clears only the timer when the race settles.

It does not:

- retain the actual promise in a singleton registry after caller timeout;
- retain/return a late success receipt;
- bind the operation to a tab/document generation;
- schedule a repair/reconciliation path when the actual promise settles late;
- classify whether the wrapped operation is read-only, idempotent, browser-owned or user-owned.

This helper is appropriate as a bounded **caller wait** for pure reads only when late results cannot trigger later side effects. It is not a complete lifecycle owner for `permissions.request()` or `scripting.executeScript()`.

## Optional permission prompt — timeout is not cancellation and the actual grant can be lost from WebClip's state machine

### Current flow

`grantFrameAccessButton` performs:

1. `getActiveSourceTab()`;
2. `collectCrossOriginFrameOrigins(tab.id)`;
3. `ensureTopContentScript(tab.id)`;
4. top-content `frame-access-candidates` RPC;
5. candidate normalization;
6. `readPopupExtensionApiBounded(() => chrome.permissions.request(...), ..., 10s)`;
7. if the returned boolean is true, `enableGrantedFrameAgents(tab.id)`.

P1-193 already owns the pre-prompt user-gesture problem: the request occurs after several asynchronous discovery steps rather than as the immediate activation-sensitive action.

P1-157 already records that a user-owned permission prompt must not be terminated semantically by an arbitrary 10-second local timeout.

### Fresh exact outer-settlement consequence

If the browser permission prompt remains visible longer than 10 seconds:

1. popup caller wait rejects with `WEBCLIP_TIMEOUT`;
2. catch renders an error and `finally` re-enables the Grant control;
3. the real `permissions.request()` promise remains alive in Chrome;
4. the user can still approve that original browser prompt;
5. the actual promise can then resolve `true`, but WebClip has already discarded the promise's result path and therefore does not run `enableGrantedFrameAgents()` for that settlement;
6. the extension can now possess the persistent optional host permission while the popup has reported failure and holds no exact grant/candidate/session transition acknowledging it.

A second click may then rediscover/request the same or another candidate set while the first actual result is still unresolved or already granted.

This is not merely duplicate UI. Permission is durable extension capability state. P1-157 must therefore require an actual-settlement owner for the prompt, while P1-193 owns admission and P1-201 owns later revoke/re-grant lifecycle.

### Required prompt settlement contract

After the second, gesture-safe Grant click required by P1-193:

- `permissions.request()` becomes one actual browser-owned operation bound to a prepared candidate receipt/document generation;
- no artificial terminal timeout while the browser prompt is active;
- popup/page close may lose the visible owner, but the underlying permission settlement must later be reconciled from browser permission state + prepared receipt;
- an unresolved request remains single-flight for that candidate generation;
- after actual settlement, fresh-check current exact top document and exact granted scopes before enabling agents;
- if source document is stale, the browser-level grant may remain according to permission policy, but it must not authorize injection into the replacement document from the stale candidate receipt;
- Incognito P0-045 blocks the persistent grant before this lifecycle starts.

## Direct popup script injection bypasses the worker's P1-125 actual-settlement machinery

### Bounded path used by Start / candidate discovery

`ensureTopContentScript(tabId)` calls:

`readPopupExtensionApiBounded(() => chrome.scripting.executeScript({ target:{tabId}, files:['content.js'] }), ...)`.

This is a separate raw Chrome promise from the worker's `executeScriptSingletonBounded()` registry.

If the 10-second caller deadline wins:

- popup reports injection failure;
- actual injection may still settle later;
- no late-success receipt is stored;
- no global unresolved script count/singleton is shared with worker execution;
- the user can start another popup attempt while the old injection settlement is unknown.

The loaded sentinel in `content.js` is a useful same-document duplicate-execution mitigation, but it is not an exact actual-settlement/document-generation receipt. It cannot prove which document a late injection reached after navigation/reload.

### Completely unbounded Read Later injection

`readLaterButton` bypasses `readPopupExtensionApiBounded()` entirely:

`await chrome.scripting.executeScript({ target:{tabId:tab.id}, files:['content.js'] });`

then:

`await chrome.tabs.sendMessage(tab.id, { type:'WEBCLIP_COMMAND', command:'read-later' });`

A never-settling scripting Promise can therefore hold the popup action indefinitely. A late injection after navigation has no worker P1-125 receipt or document-generation check.

### Required P1-157/P1-125 architecture

All popup content-script admission should route through one worker-owned/document-bound scripting operation or an equivalent shared receipt protocol.

The operation must:

- capture current exact top `documentId`/navigation generation;
- inject the exact intended document generation;
- retain actual Chrome settlement beyond caller deadline;
- reject/ignore late success for a stale document generation;
- deduplicate identical same-generation injection attempts;
- bound actual unresolved scripting operations globally/per-tab;
- return an exact injection/document receipt used by the following page command.

## Chrome platform supports stronger exact-document targeting

Current Chrome documentation confirms:

- `chrome.scripting` `InjectionTarget.documentIds` is available from Chrome 106;
- `InjectionResult.documentId` identifies the document associated with an injection;
- `chrome.tabs.sendMessage(..., {documentId})` can target a specific document from Chrome 106;
- `permissions.request()` is documented to be invoked from within a user gesture.

WebClip's declared minimum Chrome is 118, so these document-targeting primitives are inside the supported platform range.

Therefore the current tabId-only pipeline is not a compatibility necessity.

## Start Selection can retarget after active-tab admission

`startButton` currently:

1. performs a direct unbounded `chrome.tabs.query({active:true,currentWindow:true})`;
2. validates the returned URL;
3. awaits `ensureTopContentScript(tab.id)`;
4. awaits `enableGrantedFrameAgents(tab.id)`;
5. sends `WEBCLIP_START_SELECTION` via `chrome.tabs.sendMessage(tab.id, ...)` with no `documentId`;
6. closes the popup on success.

The initial `tab` object is only a historical snapshot. Navigation/reload can occur during injection or frame-agent enable.

The final command is addressed to whichever top content script occupies `tab.id` at dispatch time. Thus an explicit user Start action admitted on document A can mutate selection state in replacement document B.

This is already the P1-175 generic privileged-command root cause documented for context menus/Journal. Fresh popup source confirms that Start itself still uses the unsafe shape.

Required regression:

- user clicks Start on A;
- A navigates/reloads while injection/agent enable is pending;
- final `WEBCLIP_START_SELECTION` targets exact A document receipt or fails stale;
- B never inherits A's Start action implicitly.

## Read Later has the same retarget plus an irreversible-save consequence

`readLaterButton` obtains active tab A, executes content.js by tabId, then sends `WEBCLIP_COMMAND/read-later` by tabId.

A navigation between any of those steps can deliver the user command to document B. `read-later` is not an inert UI command: it can enter the save/Journal/Yandex workflow for the receiving page.

Therefore this path composes with the stronger provenance rules:

- P1-175 owns command admission retarget;
- P0-070 owns exact document throughout PDF generation;
- P0-023 owns retry authority for cached PDF;
- P1-198/P0-079 own operation/PDF generation after save admission.

A worker-side exact document check at `WEBCLIP_GENERATE_PDF` is necessary but not sufficient UX authority: the original popup user gesture must not silently become authorization for a different document to initiate that save request.

## Candidate discovery command also needs exact-document result validation

`collectCrossOriginFrameOrigins(tabId)` injects top content and sends `frame-access-candidates` by tabId.

Even before the browser permission prompt, navigation can occur after the original active-tab read. A replacement document can answer the candidates request and return origins not present in the document the user intended to authorize.

P1-193's prepared candidate receipt therefore must be created from a **proven exact current document**, not merely a tab id, and the returned candidate response must carry/prove that same document generation.

## Post-permission enable is tabId-only

After `permissions.request()` returns `true`, popup calls:

`enableGrantedFrameAgents(tab.id)`

with the old tab id.

The worker endpoint then operates on whatever current document occupies the tab. Existing audit already classifies this under P1-193/P1-171; fresh source confirms there is no post-prompt exact-document ACK/revalidation in popup.

Required sequence:

`prepared candidate receipt(A) -> immediate request under gesture -> actual grant settlement -> fresh prove current document == A -> fresh prove granted exact scope -> inject/enable exact A documents`.

If A changed at any point, candidate generation is stale. Do not transfer A's grant action into B.

## Universal bounded helper should be split by operation class

A robust popup API layer should not have one timeout policy for everything.

### Pure reads

Examples: `tabs.query`, `tabs.get`, `storage.session.get`, read-only status RPC.

- bounded caller wait is appropriate;
- late read result may be ignored;
- if a later side effect depends on the read, generation/freshness must still be revalidated immediately before side effect admission.

### Idempotent/document injection with observable late settlement

`scripting.executeScript` requires:

- bounded caller response if UX demands it;
- actual promise retained to settlement;
- exact document generation receipt;
- duplicate suppression and late-success adoption only by that generation.

### User-owned browser prompt

`permissions.request` requires:

- gesture-safe admission;
- no arbitrary semantic timeout while user owns the prompt;
- one actual settlement owner/reconciliation path;
- exact candidate/scope/document generation.

### Page command

`tabs.sendMessage` that changes selection/save state requires:

- exact admitted document targeting;
- bounded response only after dispatch authority is proven;
- stale response cannot mutate current popup/page generation.

## Required deterministic/browser regressions

1. `permissions.request()` remains pending >10s, then user grants: popup must not have already classified the request as terminal failure; exactly one grant settlement is reconciled.
2. Same case followed by popup close/reopen: browser grant state is reconciled to the prepared permission generation; no blind second request.
3. Timed-out/late `executeScript` on A followed by same-URL reload B: A receipt cannot satisfy B and late A injection cannot authorize B command.
4. Two rapid/retried Start attempts while the first raw injection is unresolved do not create uncontrolled independent scripting promises.
5. Read Later `executeScript` never settles: action has a controlled bounded/busy state rather than holding popup indefinitely.
6. Read Later A -> navigation B before final command: B receives no `read-later` and starts no PDF/Journal/Yandex side effect.
7. Start A -> navigation B during `enableGrantedFrameAgents`: B receives no inherited `WEBCLIP_START_SELECTION`.
8. Candidate discovery A -> navigation B before candidates reply: B candidates cannot become A's permission receipt.
9. Candidate A -> browser prompt -> navigation B -> grant: persistent permission settlement is handled, but no A-derived agent enable occurs in B.
10. `tabs.sendMessage` exact `documentId` mismatch fails closed rather than falling back to frameId/tabId.
11. Direct context-menu and Journal Apply use the same shared document-bound command/injection primitive rather than parallel incompatible fixes.
12. `permissions.request` remains a real user gesture and no implementation attempts to auto-grant/auto-retry after prompt denial.
13. Permission revoke/re-grant still creates fresh P1-201 permission generation.
14. Incognito source never reaches persistent optional-permission admission under P0-045.
15. Chrome 118 unpacked QA proves `scripting`/`tabs.sendMessage` documentId targeting and real permission prompt behavior used by the implementation.

## Duplicate check / numbering

No new P-number is assigned.

- **P1-157** owns popup direct Chrome API lifetime/actual-settlement classification.
- **P1-125** owns script-injection actual settlement + exact document receipt.
- **P1-193** owns prompt admission/candidate generation and gesture.
- **P1-175** owns generic privileged command exact-document authority.
- **P1-171/P1-201** own remote-frame/permission lifecycle after grant.
- **P0-070/P0-023** remain stronger save/retry document provenance owners.

P1-211 remains unassigned by this block.

## External Chrome documentation revalidation

Current Chrome for Developers documentation was rechecked on 2026-08-28:

- `chrome.permissions.request()` is documented as a user-gesture operation and returns the actual grant decision;
- `chrome.scripting.InjectionTarget.documentIds` and `InjectionResult.documentId` are available from Chrome 106;
- `chrome.tabs.sendMessage` accepts `options.documentId` from Chrome 106.

These are platform-support facts only. Real unpacked Chrome 118+ QA remains required before implementation closure.

## Test / release state

No runtime/config/manifest changes were made. Product tests were not rerun. The last proven product gate remains historical **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. No build, tag or GitHub Release was created.
