# Research evidence — P0-080 SPA/application-generation selection authority revalidation — 2026-09-16

Canonical baseline: `main` at `1e257b5ad0c524d3652078394ac9353bd037ebe1`.

Research-only closure-oriented tranche. Production runtime, `manifest.json`, workflows, build/tag/deploy/release state and release-readiness state are unchanged.

## Result

**P0-080 remains ACTIVE / ROOT-CAUSE-REVALIDATED.**

Fresh current source still allows direct selected `Element` references from an older logical SPA route to remain authoritative after those elements have been detached. `totalIncludeCount()` uses `state.includes.size` plus remote counts, while the visible outline path separately skips disconnected elements. `finish`, `download` and `yandex` command admission use that count rather than a generation-bound live-selection receipt.

A same-document SPA/history transition can therefore create a split-brain state:

1. route A has a live selected node;
2. the SPA changes route/current URL and replaces the route DOM without loading a new browser `Document`;
3. the selected node becomes disconnected but remains stored in `state.includes`;
4. WebClip's outline disappears because rendering checks `isConnected`;
5. `totalIncludeCount()` remains non-zero because it counts the map entry;
6. save metadata is rebuilt from the newer `location.href` / title;
7. save admission succeeds under the newer route although the previous selected node is no longer live.

This is not closed by browser `documentId`: Chrome documents `documentId` as a unique identifier for a loaded document and exposes a separate `webNavigation.onHistoryStateUpdated` event for History API URL updates that can occur while the same document remains active.

## Canonical owner / semantic duplicate reconciliation

`RESEARCH_REGISTRY.md` on the baseline already owns this root cause as:

> P0-080 ACTIVE — same-document SPA/application generation and live selected DOM are distinct from browser `documentId`; stale disconnected selection must not authorize save under a newer route/DOM.

No new P-code is created.

Historical provenance in `RESEARCH_FAMILY_PDF_PRINT_OFFSCREEN_EVIDENCE.md` already contains the earlier SPA/application-generation, retry-cache and save-confirmation findings. That material was used only for semantic duplicate/root-cause comparison. Current status remains exclusively the Registry row above.

Adjacent owners stay distinct:

- **P0-080** owns same-document application generation and liveness of selection authority;
- **P0-070** owns broader end-to-end full-document save authority from command admission through print/cache/download/upload/Journal;
- **P0-023** owns PDF retry cache binding to the exact source-document generation;
- **P0-075** owns the host page not becoming a trusted WebClip UI/control plane;
- frame-topology/remote-frame generation owners remain separate where cross-frame identity is involved.

## Fresh exact-source proof

All source statements below were revalidated on exact baseline `1e257b5ad0c524d3652078394ac9353bd037ebe1`.

### 1. Selection authority is still direct object-reference state

`content.js` stores:

- `includes: new Map()`;
- `excludes: new Map()`.

`addInclude(element)` stores the direct `Element` reference in `state.includes`.

There is no application-generation field in the current top-level selection state.

Current `content.js` blob: `f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e`.

### 2. Admission counts map entries, while rendering has a different liveness rule

`totalIncludeCount()` returns:

`state.includes.size + totalRemoteIncludeCount()`.

By contrast, outline rendering calls `appendOutline(element, ...)`, which returns immediately when `!element?.isConnected`.

This means the visible UI can show no outline while a disconnected local include still contributes positive save authority.

### 3. Current command admission still trusts the stale count

The `finish`, `download` and `yandex` handlers each reject only when `!totalIncludeCount()`.

They do not first prune/revalidate all selected elements against the current live DOM and do not compare an application-generation receipt.

### 4. Same-document navigation generation is not tracked in content.js

Fresh source inspection found no `popstate` listener and no `pushState` interception in `content.js`.

The content script therefore has no general same-document route generation fence that would invalidate or revalidate selection after a SPA updates its route while retaining the same browser `Document`.

This negative source result is part of the exact-current revalidation, not a historical inference.

### 5. Save metadata is current even when selection state is old

`buildSaveMeta()` reads current `location.href`, `location.origin`, `document.title` and serializes the current selection maps.

The local PDF path then calls `prepareForPrint(meta)` and sends `WEBCLIP_GENERATE_PDF`.

Thus route metadata is evaluated at save time, while the include map may still contain references selected under an older logical application route.

### 6. Worker admission does not add a top-level application-generation receipt

For `WEBCLIP_GENERATE_PDF`, the service worker resolves the sender tab and calls:

`generatePdfAndDownload(tabId, sanitizeContentSaveMeta(message.meta, sender), operationId)`.

`sanitizeContentSaveMeta` derives authoritative page URL from `sender.tab.url || sender.url`.

The worker has `documentId` handling for frame-agent registration/forwarding, but current top-level PDF command admission carries no separate content/application-generation token that could distinguish two logical SPA routes inside the same browser document.

Current `service-worker.js` blob: `6d61ac81befdbf2804ae9dbec425aa08d1194eb1`.

### 7. Existing tab URL update cleanup is useful but does not repair selection authority

The worker listens to `chrome.tabs.onUpdated`; when `changeInfo.url` is present it clears script-execution settlements, frame-agent registry state and the PDF cache for that tab.

That is a useful downstream stale-cache control. It does not tell the still-running top-level content selection state to clear/revalidate `state.includes`, so it does not close P0-080.

### 8. Current manifest does not use `webNavigation`

The current Manifest V3 permissions do not include `webNavigation`.

This observation is not itself a requirement to add that permission. It matters only because Chrome's `onHistoryStateUpdated` is one platform signal available to a future implementation; a final design may instead or additionally use an in-page navigation/liveness strategy.

## Fresh external research

External material is used only to validate platform semantics, known failure modes and design options. It is not treated as an automatic WebClip requirement.

### Chrome platform semantics

Chrome's `webNavigation` documentation states that:

- `documentId` is a UUID associated with the loaded document;
- when a frame navigates and opens a **new document**, the identifier changes;
- `onHistoryStateUpdated` fires when frame history is updated to a new URL and includes that document's `documentId`.

Reference checked 2026-09-16:

- https://developer.chrome.com/docs/extensions/reference/api/webNavigation

This directly supports keeping browser document identity and same-document application/history generation as separate concepts.

### Web-platform History API semantics

MDN documents that `history.pushState()` can create and activate another history entry associated with the **current document**, and the browser does not load the URL merely because `pushState()` was called. MDN's SPA guide likewise describes content changes driven by JavaScript while remaining in the same document.

References checked 2026-09-16:

- https://developer.mozilla.org/en-US/docs/Web/API/History/pushState
- https://developer.mozilla.org/en-US/docs/Web/API/History_API/Working_with_the_History_API
- https://developer.mozilla.org/en-US/docs/Web/API/Window/popstate_event

The same documentation also makes an important implementation point: calling `pushState()` or `replaceState()` does not itself fire `popstate`. A solution based only on `popstate` would therefore miss direct History API route updates.

### Public analogue: Hypothesis SPA annotation lifecycle

A public Hypothesis SPA integration note explains that current Hypothesis detects client-side URL changes through the HTML5 History API or Navigation API and updates loaded annotations; it also warns that if logical routes are not distinguished, annotations from different app pages can be merged or not refreshed correctly.

Reference checked 2026-09-16:

- https://gist.github.com/robertknight/b71af79a7dbe25712fad192e44bc6f5f

The analogue is relevant because annotation/highlight state, like WebClip selection state, is DOM/application-route authority that can outlive a browser-level document reload boundary.

### Public SPA failure-mode control: History API is not always a logical route change

single-spa issue #484 documents an important negative control: applications may call `pushState()` / `replaceState()` for state such as scroll restoration, including calls that do not change the URL. The discussion explains why blindly treating every History API call as a reroute has compatibility/performance consequences.

Reference checked 2026-09-16:

- https://github.com/single-spa/single-spa/issues/484

Therefore P0-080 closure should not be reduced to "increment application generation on every History API call". The acceptance boundary needs both navigation/application signals and exact live-selection revalidation.

### User/community relevance

Current Web Clipper discussions continue to call out client-side-rendered sites as a major reason clipping needs browser-side capture, and users report content-specific clipping failures on dynamic sites such as social feeds/threads. These reports are not proof of the WebClip defect, but they confirm that dynamic/CSR pages are a real user-facing operating environment rather than a synthetic corner case.

References checked 2026-09-16:

- https://www.reddit.com/r/ObsidianMD/comments/1qu9dvt/do_you_have_any_cool_web_clipper_templates/
- https://www.reddit.com/r/ObsidianMD/comments/1gou93n/obsidian_web_clipper_is_now_available/

## Deterministic model

Added model:

`project_tools/test_p0_080_spa_application_generation_revalidation_model.js`

Local verification:

- `node --check`: **PASS**;
- deterministic execution: **PASS 39 checks**;
- SHA-256: `4e780180a758972fa1996ca68bafa2c49afeb75cac820216a8f6e8c67da54192`;
- expected Git blob from exact UTF-8 bytes: `cc3eae3bf062c337af607716ba70b4c0112a5559`.

### Current-source failure controls reproduced

The model demonstrates:

1. route A selection is live and visible;
2. same-document transition to route B keeps the same browser document identity;
3. replacing route DOM disconnects the selected node;
4. current map-size admission remains non-zero;
5. current visible outline count becomes zero;
6. current save metadata uses route B;
7. save is nevertheless admitted with zero live selected nodes;
8. same-URL DOM replacement is also unsafe, proving URL equality alone is not application-generation proof.

### Candidate acceptance controls

The model intentionally does **not** prescribe the final runtime architecture. It demonstrates a bounded acceptance shape:

- keep browser `documentId` and application generation as separate identities;
- treat a URL-changing same-document route event as requiring selection revalidation before save;
- independently detect selected-node detachment, including same-URL DOM replacement;
- bind the save confirmation to exact document, application and selection generations;
- reject confirmation if route/application generation changes after the dialog was opened;
- reject confirmation if selection changes after the dialog was opened;
- preserve browser-document generation as the stronger cross-document fence;
- do not manufacture a logical route transition from a state-only History API call when URL and selected DOM remain unchanged;
- allow a still-live selection to be explicitly revalidated/rebound to the current application generation;
- reject mixed stale/live include sets until exact live-set reconciliation occurs.

## Required invariant

> A WebClip save must be authorized by a selection receipt that is live in the exact logical application generation being saved. Browser `documentId`, current URL and non-zero historical selection-map size are individually insufficient. A same-document route/DOM transition must not silently carry stale selected-element authority into a later save.

At minimum, an implementation closure should bind and revalidate:

- browser top-document generation where available;
- explicit application/route generation or an equivalent exact logical-generation receipt;
- selection generation;
- current live selected node set, with disconnected entries unable to authorize;
- current source URL/title as metadata after generation validation, not as generation identity by itself;
- save-dialog/confirmation generation so asynchronous user confirmation cannot cross a route change;
- remote-frame selection generation where frame selections participate in the same save;
- downstream PDF/cache operation identity so the validated selection generation cannot be replaced later by broader P0-070/P0-023/P0-079 races.

## Architecture implications for eventual implementation

The research narrows the implementation space but does not select a final design.

A robust design may compose several signals rather than trust one:

1. content-side live-selection pruning/revalidation for disconnected nodes;
2. an application-generation state machine driven by same-document navigation signals;
3. platform navigation observation such as `webNavigation.onHistoryStateUpdated` if adding that permission is accepted;
4. History/Navigation API observation that does not trust page-provided data as WebClip authority;
5. save admission/confirmation receipts compared immediately before print preparation and privileged PDF generation;
6. explicit user revalidation when a route signal occurs while existing selected nodes remain live but their logical page ownership changed.

A pure URL comparison is insufficient because same-URL DOM replacement exists. A pure `documentId` comparison is insufficient because same-document SPA routes share a document. A pure History API hook is insufficient because state-only History API use can be unrelated to logical page replacement and because DOM replacement can occur without a meaningful URL transition.

## Closure evidence still required

P0-080 must remain ACTIVE until an implementation tranche proves at least:

1. exact-source application-generation/liveness fencing for all local selection save entry points;
2. stale disconnected local includes cannot make `finish`, `download`, `yandex` or equivalent save admission succeed;
3. same-document `pushState`, `replaceState`, back/forward traversal and hash/history route changes cannot silently reuse prior route authority;
4. same-URL selected-DOM replacement fails closed;
5. state-only History API activity does not cause destructive false invalidation without a real generation/liveness reason;
6. save confirmation opened before a route/application change cannot commit afterward;
7. selection mutation after confirmation snapshot cannot be ignored;
8. remote-frame selection/application generation composes correctly with frame lifecycle/topology owners;
9. P0-070/P0-023/P0-079 downstream identity controls consume the validated generation rather than widening it;
10. current unpacked Chrome physical evidence covers representative SPA route transitions and DOM replacement;
11. exact-head Repository Integrity plus post-merge Repository Integrity on the implementation commit.

## Classification

- current status: **ACTIVE / ROOT-CAUSE-REVALIDATED**;
- deterministic research coverage: **PASS 39 checks**;
- physical unpacked-Chrome closure: **not claimed**;
- implementation: **not changed by this tranche**;
- build/tag/deploy/GitHub Release: **not authorized and not performed**;
- release readiness: **unchanged / NOT READY**.
