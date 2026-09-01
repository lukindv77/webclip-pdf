# Durable research evidence — Incognito contextual isolation — 2026-08-30

Canonical P-code owner/status authority remains exclusively in `RESEARCH_REGISTRY.md`. This document preserves a completed **56-block** source-first defensive research of Incognito contextual isolation across Chrome Action, popup, Journal, optional host permissions, frame-agent enablement, cache invalidation and extension-page handoff.

Exact fresh source baseline: `main = eddf3b3ab344a850a81ce23e10a49c5bca2dddd2`.

Security scope follows `CONTEXT_AUTOMATION_POLICY.md`: confidentiality, integrity, storage/retention and safe transfer of extension/user data and credentials only. No exploit development, authorization bypass, attack procedure or offensive-security instruction is part of this tranche.

External platform controls were checked against current Chrome Extensions documentation for the `incognito` manifest key, `chrome.storage`, `chrome.permissions` and `chrome.tabs`. The project manifest does not specify `incognito`, therefore Chrome's documented default **spanning** model is the applicable product assumption until the manifest changes. Platform documentation is used as a browser-contract control; WebClip findings below are still derived from fresh project source.

No runtime source, `manifest.json`, version, build, tag or GitHub Release is changed by this tranche.

## Executive classification

**No new permanent P-code and no canonical status transition.** Fresh source directly revalidates **P0-045 ACTIVE**: Incognito must remain fail-closed across persistent Journal/Action/popup/status surfaces, and normal-profile state must not be projected into private contextual UI/authority.

The current family evidence already owns the root. This tranche adds/revalidates concrete current surfaces:

- Chrome Action startup/event/late-repair paths discard an available `Tab.incognito` classification before the normal Journal summary read;
- private-tab Action state exposes the exact normal-profile `uniqueDays` count in addition to the age bucket of the last save;
- popup requests shared Journal-backup status before resolving/classifying the active tab, and the response contains normal root/folder/remote-path/history fields even when only a subset is rendered;
- popup Start and explicit frame-access paths do not reject a private source before `WEBCLIP_ENABLE_FRAME_AGENTS` / `chrome.permissions.request()`;
- the worker `WEBCLIP_ENABLE_FRAME_AGENTS` handler checks only that the sender is an extension page and does not fresh-check the target tab's Incognito classification;
- context-menu Journal current/site/all routes use the existing worker Incognito fence, while direct export-file/export-Yandex shortcuts open `journal.html` directly and therefore rely on Chrome spanning-mode's platform prohibition against loading extension package pages in an Incognito tab main frame.

Supporting existing owners/boundaries:

- **P1-170 ACTIVE** — global Action refresh must be bounded/coalesced; privacy classification must happen before any per-tab Journal work in that fan-out.
- **P1-193 ACTIVE / P1-157 ACTIVE** — optional permission admission and actual user-owned prompt settlement remain separate; private source classification must precede both.
- **P1-171 / P1-125 ACTIVE** — frame/document and injection generation remain independent from the Incognito privacy classification.
- **P0-079 / P0-023 ACTIVE** — PDF-cache operation/document identity remains independent; this tranche does not reclassify cache-generation defects as Incognito findings.

`P1-230` is deliberately not allocated.

## Fresh source / platform boundary

Fresh `manifest.json` has no `incognito` key. Chrome documents that the default is `spanning`: the extension runs in one shared process and Incognito tab events/messages reach that process with an Incognito flag. Chrome also documents that `storage.local` and `storage.sync` are shared between regular and Incognito contexts, while `storage.session` is in-memory and WebClip explicitly limits local/session access to trusted extension contexts.

Fresh `service-worker.js` has a useful central content-sender fence: `assertRuntimeMessageSender()` rejects Incognito content messages except cache invalidation and opening global Options. Journal opening also fresh-reads both source and placement tabs and rejects Incognito/unknown context. Those controls are positive and must remain.

The gap is extension-page/Action contextual authority: `runtimeSenderKind()` classifies an extension sender only as `extension`; an extension popup message does not automatically carry the active web tab's privacy context. Source-tab-related extension operations therefore must resolve/fresh-check the target tab before reading or changing shared profile state.

## Blocks 1–8 — platform model and positive boundaries

### Block 1 — manifest uses Chrome's default spanning Incognito model — platform/current configuration

`manifest.json` contains no `incognito` key. Under Chrome's documented contract the default is `spanning`, not `split` or `not_allowed`.

The research therefore evaluates a single shared extension process receiving regular and private tab events with an explicit privacy flag.

### Block 2 — spanning events carry Incognito context; losing it is application logic — P0-045

Chrome documents that events/messages from an Incognito tab are sent to the shared process with an Incognito flag indicating their source.

Current Action and popup code therefore cannot treat privacy classification as unavailable platform data: `Tab.incognito` exists on the relevant tab/event object and must be preserved as authority.

### Block 3 — shared extension storage makes the contextual fence meaningful — P0-045 positive platform context

Chrome documents `storage.local`/`storage.sync` as shared between regular and Incognito processes. WebClip additionally uses extension-origin IndexedDB in the shared worker for Journal/cache/OperationLog state.

A private contextual UI must consequently be prevented from automatically projecting ordinary-profile history merely because it runs inside the same extension identity.

### Block 4 — central content-message Incognito ACL is a strong positive control — P0-045

`assertRuntimeMessageSender()` rejects an Incognito content sender for ordinary Journal/PDF/Yandex/frame-agent messages. Only `WEBCLIP_INVALIDATE_PDF_CACHE` and `WEBCLIP_OPEN_OPTIONS` are explicit exceptions.

This proves the remaining issue is not absence of any Incognito policy; it is contextual extension/Action paths that do not carry the same source classification.

### Block 5 — Journal source-tab classification fails closed — positive control

`openJournalPage()` bounded-fresh-reads `sourceTabId`; unknown source classification throws `JOURNAL_SOURCE_CONTEXT_UNKNOWN`, and `sourceTab.incognito` is rejected before a Journal page is created.

### Block 6 — Journal placement/anchor classification also fails closed — positive control

The same worker path fresh-reads the placement/anchor tab and rejects an Incognito placement. Thus a normal Journal page is not intentionally opened as a history bridge into a private window through the guarded route.

### Block 7 — storage access is restricted to trusted extension contexts — positive control

`configureStorageAccessLevels()` applies `TRUSTED_CONTEXTS` to both `chrome.storage.local` and `chrome.storage.session`, and message handling awaits initialization fail-closed.

Preserve this data-access boundary; P0-045 is about authorized extension contexts projecting the wrong profile state, not direct host-page storage access.

### Block 8 — extension sender identity is not source-tab privacy identity — P0-045

`runtimeSenderKind()` returns `extension` for extension URLs. `assertRuntimeMessageSender()` therefore has no `sender.tab.incognito` fact for ordinary popup/extension-page messages.

Any extension message that acts “for the current/source tab” needs an explicit fresh source-context receipt; sender trust alone is insufficient privacy context.

## Blocks 9–16 — contextual popup still projects normal backup state

### Block 9 — backup status starts before active-tab classification — P0-045

`popup.js` calls `loadBackupStatus()` immediately after rendering the manifest version. No `getActiveSourceTab()` or `tab.incognito` check precedes it.

### Block 10 — backup status request contains no source-tab receipt — P0-045

The popup sends only `{type:'WEBCLIP_JOURNAL_BACKUP_STATUS'}`. The worker therefore cannot infer whether this read is being requested by a popup attached to a regular or private browsing context.

### Block 11 — worker returns more than a neutral enabled flag — P0-045

`getJournalBackupStatus()` returns shared normal-profile fields including `rootPath`, backup `folderPath`, `remotePath`, interval/retry configuration, success/failure/attempt timestamps, entry count, reason and error state.

Even if the popup renders only a subset, the contextual popup receives normal persistent state before any privacy fence.

### Block 12 — private popup visibly renders ordinary backup history — P0-045

`loadBackupStatus()` renders enabled/interval/retry state, `lastBackgroundSuccessAt`, `lastBackgroundFailureAt` and `lastBackgroundError`.

A private popup can therefore reveal ordinary-profile operational history without any explicit “open global settings/history” action.

### Block 13 — active-tab helper already exposes the fact needed for the fix — control

`getActiveSourceTab()` returns the full Chrome `Tab`, which includes `incognito`. The popup already uses this helper for source-sensitive actions.

The missing design is sequencing/centralization: resolve the contextual tab once before automatic persistent-state reads.

### Block 14 — explicit global Settings is a different product boundary — duplicate/product control

P0-045 family evidence intentionally allows a user to open a global Settings page that represents global extension configuration.

The defect is automatic projection in a contextual private popup, not the existence of shared extension settings.

### Block 15 — popup Journal current/site routes preserve the source context for worker rejection — positive control

`openJournal()` obtains the active tab and passes `sourceTabId`, `sourceUrl` and `anchorTabId` to `WEBCLIP_OPEN_JOURNAL_PAGE`. The worker's fresh Incognito fence then rejects the private source/placement.

### Block 16 — Journal all-mode also reaches the guarded worker route — positive control

Although mode `all` does not need a URL filter, popup still forwards the private source/anchor context. `openJournalPage()` treats source identity and view mode separately and blocks the private source.

This is the correct pattern for contextual global-looking operations: “all data” is not permission to discard where the request came from.

## Blocks 17–30 — Chrome Action loses privacy context before normal Journal reads

### Block 17 — `tabs.onActivated` fresh-reads the tab but keeps only URL — P0-045

`tabs.onActivated` calls `updateActionForTab(tabId)`. That function bounded-fresh-reads the tab, then stores only `tab.url` and discards `tab.incognito`.

The fresh read is therefore not a privacy fence even though it had the required fact.

### Block 18 — `tabs.onUpdated` receives the full `tab` and discards its Incognito flag — P0-045

The listener receives `(tabId, changeInfo, tab)` but calls `updateActionForTab(tabId, changeInfo.url || tab?.url || '')`.

Passing a string URL as the “known” fast path actively removes privacy classification that Chrome already supplied.

### Block 19 — startup/global refresh repeats the loss for every tab — P0-045/P1-170

`refreshActionForAllTabs()` calls `chrome.tabs.query({})` and then `Promise.all(tabs.map(tab => updateActionForTab(tab.id, tab.url || '')))`. `tab.incognito` is available in each item but discarded.

A worker start/restart can therefore perform normal Journal summary reads for all visible private HTTP(S) tabs without a user Action interaction.

### Block 20 — late Action repair also lacks the privacy dimension — P0-045/P1-170

`runChromeActionMutationBounded()` schedules `scheduleActionRepairForTab()` after timeout/stale settlement. Repair calls `updateActionForTab(id)`, which fresh-reads only URL and again discards `incognito`.

Generation repair cannot be considered privacy repair until the generation state includes privacy classification.

### Block 21 — Action summary is ordinary Journal state — P0-045

For HTTP(S) URLs `updateActionForTab()` calls `getJournalSummaryForUrl(url)`, which reads the normal Journal/urlStats summary (`lastSavedAt`, `uniqueDays`).

There is no private-neutral branch before that call.

### Block 22 — exact `uniqueDays` is exposed in the private tab badge — fresh P0-045 detail

Current code sets badge text to `String(summary.uniqueDays)` whenever it is nonzero.

A source-shaped deterministic model with a private URL whose ordinary Journal has seven distinct saved days produces badge text `7`; the disclosure is more precise than a simple yes/no saved indicator.

### Block 23 — the exact day count is repeated in Action title — fresh P0-045 detail

The title includes `Дней с записями журнала: N`. The badge and tooltip therefore both project ordinary Journal history into the private contextual browser UI.

### Block 24 — icon/title also reveal age bucket of last ordinary save — P0-045 revalidation

Current thresholds remain: no saved record (gray), last save <=7 days (green), 8–30 days (amber), >30 days (red), with corresponding title text.

A source-shaped control with 2-day/7-day-count state yields green icon + badge `7`; 20-day state yields amber; 45-day state yields red.

### Block 25 — Action generation protects ordering, not privacy authorization — boundary

`beginActionUpdateGeneration()` and `isActionUpdateGenerationCurrent()` prevent many stale UI writes. They do not decide whether `getJournalSummaryForUrl()` was authorized for this contextual tab.

Privacy admission must happen before the read, not only before `setIcon`/`setBadgeText`/`setTitle`.

### Block 26 — failed/unknown tab lookup already degrades toward neutral — positive control

When the fresh tab read inside `updateActionForTab()` fails, URL becomes empty and the normal summary path is skipped/neutralized.

This supports the required rule: unknown privacy classification should be treated like private for history projection, not like a known normal tab.

### Block 27 — non-HTTP(S) Action state is not a Journal-history query — positive control

The Action has a neutral path for unsupported URLs. The P0-045 defect is specifically HTTP(S) private tabs whose URL is accepted as sufficient normal-Journal lookup authority.

### Block 28 — startup refresh makes the issue passive rather than click-driven — P0-045

Because `refreshActionForAllTabs()` runs on worker initialization, merely having private HTTP(S) tabs open while the extension is allowed in Incognito is enough to trigger the shared summary path.

No save, popup click or context-menu command is required.

### Block 29 — summary read may also invoke shared stats maintenance — P0-045/P1-170 boundary

`getJournalSummaryForUrl()` first calls `ensureJournalStatsHealthy('summary-read')`. Thus the private-context Action path enters normal-profile Journal/urlStats maintenance before resolving the URL summary.

This does **not** prove private URL persistence, and the research does not claim it. It does prove the privacy gate belongs before any shared history/maintenance work, not only before final rendering.

### Block 30 — required Action design is one contextual receipt — acceptance refinement

Action refresh should obtain `{tabId, url/document context as needed, incognito, generation}` once. `incognito===true` or unknown classification must select a fixed neutral Action representation and perform zero normal Journal/urlStats reads.

P1-170's bounded fan-out should filter such tabs before Journal work, preserving ordinary-tab behavior.

## Blocks 31–40 — optional permission and frame-agent authority from a private popup

### Block 31 — explicit frame-access click checks URL but not Incognito — P0-045/P1-193

`grantFrameAccessButton` resolves the active tab and only checks that its URL is HTTP(S). A private HTTP(S) tab proceeds to frame-origin discovery.

### Block 32 — private frame origins are collected before any privacy fence — P0-045

`collectCrossOriginFrameOrigins(tab.id)` injects/contacts the top content script and returns discovered cross-origin frame origins. The popup normalizes/deduplicates up to the request cap.

The data remains inside WebClip in this step; the important boundary is that it becomes input to the next shared capability mutation.

### Block 33 — those origins feed `chrome.permissions.request()` directly — P0-045/P1-193/P1-157

The popup converts discovered origins to host patterns and calls `chrome.permissions.request({origins: permissionOrigins})` without checking `tab.incognito`.

Chrome documents optional permissions as extension capabilities granted at runtime and requires the request to originate in a user gesture.

### Block 34 — private browsing must not create a shared durable capability footprint — P0-045

P0-045 family evidence already owns the rule that an origin encountered only in private browsing must not be converted into normal/shared optional-host permission state.

This tranche revalidates the exact current call path; no new permission P-code is needed.

### Block 35 — grant-then-remove is not an acceptable private-scope emulation — preserved acceptance

Once the shared permission is granted, a later automatic remove would already be a cross-context side effect and could race legitimate normal-tab use. Privacy admission has to reject the private origin **before** `permissions.request()`.

### Block 36 — worker frame-enable endpoint lacks target privacy check — P0-045

`WEBCLIP_ENABLE_FRAME_AGENTS` requires an extension sender, then directly calls `enableFrameAgentsForTab(message.tabId)`. That function validates numeric tab id but does not bounded-fresh-read `Tab.incognito` before `executeScript(... allFrames:true ...)`.

Trusted extension sender identity is not proof that the target tab is normal.

### Block 37 — ordinary popup Start also invokes frame-enable before selection — fresh routine-path proof

`startButton` resolves an HTTP(S) tab, calls `ensureTopContentScript(tab.id)`, then unconditionally calls `enableGrantedFrameAgents(tab.id)` before `WEBCLIP_START_SELECTION`.

A private user does not need to press the separate grant button to reach the unclassified worker endpoint when relevant host permission already exists.

### Block 38 — pre-existing normal permission can therefore drive private injection attempt — P0-045/P1-171 boundary

If an optional host permission was legitimately granted during ordinary browsing, Start on a private tab can use that shared capability to request all-frame injection because neither popup nor worker checks privacy first.

This is a privacy/source-context admission issue; exact frame/document generation remains P1-171/P1-125.

### Block 39 — Incognito frame-agent registration is blocked later by content ACL — positive defense-in-depth control

Injected frame-agent messages still arrive as content senders. `assertRuntimeMessageSender()` rejects Incognito content before `WEBCLIP_FRAME_AGENT_REGISTER/STATE/...` handling.

Thus the research does not claim that current private frame-agent state is durably registered in the worker. The defect is the earlier unauthorized capability/injection path and missing fail-closed target classification.

### Block 40 — injection failure/warning is not an Incognito policy — P0-045

`enableFrameAgentsForTab()` catches `allFrames` execution failure and returns `{ok:true, injectedFrames:0, ..., warning}` so top-page flow can continue.

Browser refusal or lack of permission is useful degradation, but it is not a substitute for an explicit private-tab policy. A future environment where injection succeeds must remain fail-closed by WebClip logic.

## Blocks 41–50 — content commands, cache, Journal shortcuts and platform controls

### Block 41 — private Read Later eventually reaches the central save ACL — positive control

Popup `readLater` does not check `tab.incognito` and can start local selection/preparation logic, but the actual `WEBCLIP_SEND_PDF_TO_YANDEX` runtime message is a content message and is rejected by `assertRuntimeMessageSender()` for Incognito.

The research therefore does not claim private PDF/Journal/Yandex persistence through this path.

### Block 42 — manual Download/Yandex content save messages have the same final fence — positive control

`WEBCLIP_GENERATE_PDF`, `WEBCLIP_SEND_PDF_TO_YANDEX`, retry/download-cache and Journal-list/open-saved-file content messages are not Incognito exceptions. They fail before their persistent/external handlers.

Preserve this central defense even after popup UX is improved.

### Block 43 — cache invalidation is intentionally an Incognito exception — boundary control

`WEBCLIP_INVALIDATE_PDF_CACHE` is allowed from Incognito content and deletes the `tab:<tabId>` cache key.

The operation does not read/project normal Journal state. Cross-generation cache identity remains governed by P0-079/P0-023; this tranche does not create a duplicate Incognito cache owner.

### Block 44 — opening global Options is the other explicit Incognito content exception — product control

`WEBCLIP_OPEN_OPTIONS` is allowed from Incognito content. That matches the preserved product distinction between an explicitly opened global settings surface and an automatic contextual history/status surface.

No private page URL or selection payload is required as authority for global settings content.

### Block 45 — context-menu Journal current/site/all use the guarded worker path — positive control

`handleContextMenuClick()` routes `journal-url`, `journal-site` and `journal-all` through `openJournalPage(...)` with the source tab id/URL. The worker fresh-checks Incognito before opening Journal.

### Block 46 — direct context-menu export-file shortcut bypasses `openJournalPage` — regression-boundary observation

`journal-export-file` directly calls `createTabNextTo(... journal.html?mode=all&autoExportFile=1 ...)` instead of the guarded Journal opener.

There is no explicit `tab.incognito` check in this shortcut.

### Block 47 — direct context-menu Yandex-backup shortcut has the same shape — regression-boundary observation

`journal-export-yandex` directly opens `journal.html?mode=all&autoBackup=1` adjacent to the source tab, again without the worker Journal source-context fence.

### Block 48 — current spanning platform behavior is a real positive control for Blocks 46–47

Chrome's Incognito manifest documentation states that in spanning mode an extension cannot load pages from its extension package into the **main frame** of an Incognito tab.

Because `createTabNextTo()` preserves the source tab's `windowId`/position and does not contain a normal-window fallback in the reviewed path, this platform rule prevents the direct `journal.html` main-frame shortcut from being treated as a reproduced current Journal leak. The research records the bypass shape as a regression guard, not a proven exploit/leak.

### Block 49 — manifest-mode changes must revalidate the shortcut assumption — P0-045 regression contract

If WebClip ever changes to split Incognito behavior, changes extension-page placement semantics, or introduces another UI container capable of hosting `journal.html` in private context, direct export shortcuts must not inherit privacy authority from the old spanning-platform control.

Prefer explicit source classification so privacy does not depend on incidental page-hosting behavior.

### Block 50 — ordinary context-menu page commands still rely on the content save fence — positive control

Non-Journal commands validate HTTP(S), inject `content.js` and send `WEBCLIP_COMMAND` without an explicit `tab.incognito` test. Selection UX can run privately, but persistent save messages are still blocked by the worker content ACL.

This is not classified as private data persistence; it reinforces the architectural rule that UI admission and persistent-data admission are separate layers.

## Blocks 51–56 — duplicate decision and implementation/regression contract

### Block 51 — P0-045 already names the exact root cause — duplicate control

Canonical P0-045 explicitly requires Incognito to fail closed across persistent Journal/Action/popup/status surfaces and forbids normal-profile state leaking into private-tab UI/authority.

Every current defect above is a concrete manifestation or adjacent admission path of that owner. A new P-code would split one privacy-context contract.

### Block 52 — supporting owners remain orthogonal, not replacements

P1-170 owns bounded/coalesced Action fan-out, P1-193 owns user-activation/permission admission, P1-157 owns actual prompt lifetime, P1-171/P1-125 own frame/document/injection generation, and P0-079/P0-023 own PDF-cache generation.

None of those replaces the “is this source/target private?” authority decision owned by P0-045.

### Block 53 — required implementation primitive: contextual tab receipt

Introduce one bounded helper/receipt for source-tab-related extension operations, conceptually:

`{tabId, incognito, url/origin if required, windowId, document/generation where required, resolvedAt}`.

The receipt must be fresh enough for the operation and privacy classification must be checked before shared Journal/history/capability reads or mutations.

### Block 54 — private/unknown Action and popup semantics must be fixed, not data-dependent

For `incognito===true` or unknown classification:

- Action: fixed neutral icon/badge/title, zero Journal/urlStats reads;
- contextual popup: fixed private-mode backup/history presentation, no automatic `WEBCLIP_JOURNAL_BACKUP_STATUS` call;
- Journal contextual open: keep current fail-closed worker behavior;
- explicit global Settings may remain a separate user-invoked surface.

The private UI must not vary with ordinary-profile Journal or backup values.

### Block 55 — permission/frame regression matrix

Deterministic/source + real Chrome acceptance should cover:

1. private popup frame-access click -> zero `permissions.request()` calls;
2. direct `WEBCLIP_ENABLE_FRAME_AGENTS` targeting private tab -> fail before `executeScript`;
3. normal permission already granted, then private Start -> zero frame-agent injection into private target;
4. normal tab retains current explicit grant/deny behavior;
5. private->normal requires fresh discovery/valid user gesture rather than reusing private discovery;
6. unknown tab classification fails closed;
7. frame-agent content ACL remains intact as defense in depth.

### Block 56 — complete P0-045 release regression remains external

A complete closure still requires real unmanaged Chrome with **Allow in Incognito** enabled, because the decisive UI/window/permission behavior belongs to Chrome:

- Action icon/badge/title in private tabs must be constant and independent of ordinary Journal state;
- popup must show fixed private mode without normal backup status/root/error/history;
- current/site/all Journal commands must fail closed from private context;
- optional host permission set must not change because of private-only iframe origins;
- private Start must not inject cross-origin frame agents even when normal permission already exists;
- ordinary windows must preserve intended Action/Journal/popup/permission behavior;
- direct context-menu export shortcuts must be verified against the actual spanning main-frame prohibition and remain explicitly source-fenced if architecture changes.

Managed/source-model evidence is not a substitute for that release boundary.

## Final decision

- **P0-045 remains ACTIVE.**
- No canonical status transition.
- `RESEARCH_REGISTRY.md` wording is already sufficient and should remain unchanged in this docs-only tranche.
- No P1-230 or later P-code is allocated.
- The completed tranche contains **56 researched blocks**.

Implementation should centralize private/unknown contextual classification before any normal-profile Journal/backup/capability work, while preserving the existing content-message and Journal-open fail-closed controls as independent defense in depth.
