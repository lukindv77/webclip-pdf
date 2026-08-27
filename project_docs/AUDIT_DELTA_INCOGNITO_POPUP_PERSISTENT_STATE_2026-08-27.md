# Audit delta — Incognito popup persistent-state / permission boundary — 2026-08-27

Source-of-truth `main` immediately before this write: `709d7c12d994b70bf0bd762970f6a6d197478d18`.

Docs-only audit checkpoint. Production runtime, tests, configuration and `manifest.json` are unchanged. Canonical large-table synchronization is not claimed by this file.

## Classification

No new P-number is assigned.

Fresh source proof **extends existing P0-045** (Incognito fail-closed privacy boundary) beyond the already documented Chrome Action disclosure in `AUDIT_DELTA_INCOGNITO_ACTION_DISCLOSURE_2026-08-27.md`.

Adjacent dependencies:

- `P1-193` — optional host-permission user-gesture/admission flow;
- `P1-201` — optional permission revoke/re-grant lifecycle;
- `P1-171/P1-200` — exact remote-frame document/session authority after permission exists;
- `P1-157` — popup Chrome API lifecycle/deadline handling.

The new evidence is not a new permission root cause. It is a missing **Incognito source-context fence around trusted extension-page UI actions**. `assertRuntimeMessageSender()` correctly protects content-script messages, but trusted popup messages/actions can still derive or persist state from a private active tab unless the popup and/or worker explicitly fresh-check `tab.incognito`.

## Existing P0-045 positive controls remain valid

### Content-script persistent operations are centrally blocked

`assertRuntimeMessageSender(type, sender)` rejects Incognito content senders for all content message types except the explicitly allowed:

- `WEBCLIP_INVALIDATE_PDF_CACHE`;
- `WEBCLIP_OPEN_OPTIONS`.

Therefore ordinary private-page save/Yandex/Journal/OperationLog entry requests do not pass the content sender boundary.

### Journal page placement is fail-closed

The Journal-opening worker path fresh-reads source/anchor tabs and rejects `sourceTab.incognito` / `placementTab.incognito`, so normal persistent Journal UI is not intentionally opened as a bridge from a private source tab.

These controls must remain and should be reused conceptually for popup actions instead of assuming `senderKind === 'extension'` proves non-Incognito provenance.

## Previously documented Action disclosure remains open

`AUDIT_DELTA_INCOGNITO_ACTION_DISCLOSURE_2026-08-27.md` already proves that `updateActionForTab()` discards `tab.incognito`, reads ordinary-profile Journal/urlStats for a private tab URL and projects save-history recency into the Chrome Action icon/title.

This checkpoint does not duplicate that finding. It extends P0-045 to two popup paths that bypass the content sender's Incognito flag entirely.

## Fresh source proof — popup backup state is read before source-tab classification

### 1. Popup startup unconditionally reads normal backup state

At popup script initialization:

`loadBackupStatus();`

runs immediately. It sends:

`WEBCLIP_JOURNAL_BACKUP_STATUS`

before calling `getActiveSourceTab()` or checking whether the active tab/window is Incognito.

The popup displays at least:

- backup enabled/disabled state;
- configured interval/retry minutes;
- last background success time;
- last background failure time;
- last background error/current-problem state.

Thus an Incognito popup receives and visibly projects ordinary shared WebClip operational history without any Incognito source fence.

### 2. Worker status response contains even more shared persistent state

`WEBCLIP_JOURNAL_BACKUP_STATUS` directly returns `getJournalBackupStatus()` for a trusted extension sender.

That helper reads normal `yandexConfig` and `journalBackupState` and returns a broad object including fields such as:

- `rootPath`;
- backup `folderPath`;
- `remotePath` / last remote path;
- success/failure/attempt timestamps;
- last error/reason;
- last entry count;
- due/retry state.

The current popup renders only a subset, but the entire response is delivered to the popup execution context. More importantly, the visible subset already proves the missing privacy classification: backup activity from ordinary persistent Journal state is exposed while the active browsing context is private.

This is the same policy class as the Action disclosure: normal-profile history/operational state should not be projected into a private-tab UI under WebClip's fail-closed Incognito model.

## Fresh source proof — Incognito iframe permission request can create persistent extension capability state

### 3. `grantFrameAccess` does not reject an Incognito active tab

The popup's `grantFrameAccessButton` click handler:

1. calls `getActiveSourceTab()`;
2. checks only that `tab.url` is HTTP(S);
3. injects/contacts top `content.js` to discover cross-origin iframe origins;
4. constructs host permission patterns from those origins;
5. calls `chrome.permissions.request({ origins: permissionOrigins })`;
6. on grant calls `enableGrantedFrameAgents(tab.id)`.

There is no `tab.incognito` check before discovery or permission request.

Therefore iframe origins visible only during a private browsing session can be turned into optional host permissions granted to the extension.

### 4. Optional host permission is extension capability state, not page-local selection state

Chrome's Permissions API models optional host permissions as permissions granted to the extension at runtime. The extension can later query whether it currently has them via `permissions.contains()` and explicitly remove them via `permissions.remove()`.

This is materially different from ephemeral Include/Exclude state that disappears with the private document. A grant based on a private-page origin can survive the popup/document action and change what the extension is authorized to do on that origin later until the permission is removed/restricted.

Under WebClip's P0-045 product invariant, a private browsing origin must not become a durable/shared WebClip capability/history footprint merely because the user opened the popup in Incognito.

This does not change the general product requirement that cross-origin iframe access requires explicit user permission. It adds an Incognito admission rule: **do not offer/commit persistent optional host permission derived from an Incognito source page in the spanning shared extension context.**

### 5. Worker-side `WEBCLIP_ENABLE_FRAME_AGENTS` has no Incognito revalidation

The popup sends `WEBCLIP_ENABLE_FRAME_AGENTS` as a trusted extension message with only `tabId`.

The worker handler checks `senderKind === 'extension'` and calls `enableFrameAgentsForTab(message.tabId)`.

Fresh whole-worker search finds Incognito checks only in:

- content sender admission;
- Journal source-tab placement;
- Journal anchor placement.

`enableFrameAgentsForTab()` itself does not fresh-read the tab and reject `incognito` before programmatic frame-agent injection.

Thus even if the popup were later fenced, the privileged worker endpoint also needs source-tab context validation so a stale/other extension page cannot invoke the frame-agent enable path for a private tab merely by supplying its tab id.

This is consistent with the broader rule used elsewhere in the project: trusted extension page is an ACL class, not proof of exact target document/privacy generation.

## Chrome platform/privacy contract relevant to this finding

Chrome's extension privacy guidance explicitly says Incognito windows promise to leave no tracks and extensions that normally save browsing history should not save history from Incognito. It recommends checking the `incognito` property of the relevant `tabs.Tab` / `windows.Window` before saving browsing-related data.

Chrome's extension Incognito model defaults to `spanning` when an extension is allowed in Incognito, so events/messages from Incognito tabs can reach the shared extension process with an Incognito flag. This makes explicit source-context checks necessary; separate process/storage must not be assumed.

Chrome also treats optional host permissions as runtime-granted extension permissions that remain part of the extension's current permission set until removed/restricted. The correct privacy fix is therefore to block private-origin-derived persistent grants, not to rely on the popup closing.

## Required P0-045 refinement

### One source-context classifier for popup/page actions

For any popup or extension-page action that is semantically tied to the active/source tab, resolve a bounded fresh source-tab context containing at least:

- tab id;
- exact current URL/document generation where needed;
- `incognito` classification.

Unknown `incognito` state must fail closed for privacy-sensitive reads/writes; do not fall back to shared normal-profile state merely because URL is known.

### Incognito popup UI

When the active/source tab is Incognito:

- Chrome Action stays neutral as already required by the prior P0-045 delta;
- popup must not automatically read/render ordinary Journal save statistics or backup activity/history merely to populate normal-profile panels;
- Journal open remains blocked by the worker source/anchor checks;
- settings/help navigation may remain available if it does not import private URL/history into durable state;
- page-local selection UI may be allowed only if every later persistent/remote action remains fail-closed and no private metadata is persisted.

A product choice may show a generic text such as "WebClip persistent history is disabled in Incognito", but it must be independent of ordinary Journal/backup contents.

### Optional host permission

For a source tab with `incognito === true`:

- do not discover private iframe origins for the purpose of building a persistent optional host-permission request;
- do not call `chrome.permissions.request()` for origins derived from that private document;
- do not call privileged `WEBCLIP_ENABLE_FRAME_AGENTS` for that private target under the ordinary spanning/shared permission model;
- show a clear Incognito-unavailable state for cross-origin frame permission functionality.

If a future Chrome-supported design can grant truly session/private-scoped capability without normal-profile persistence, it requires separate evidence and product design. Do not simulate it by granting then auto-removing normal optional permissions: that still creates a side-effecting permission lifecycle and races with other normal tabs using the same origin.

### Worker defense in depth

`WEBCLIP_ENABLE_FRAME_AGENTS` must fresh-read the exact target tab and reject Incognito before injection/enabling. A trusted popup message carrying a tab id is not sufficient authority.

Any future extension-page endpoint that receives a source/target tab and can read persistent history or create durable/shared capability must apply the same privacy classification in the worker.

### Backup status

Separate global configuration from ordinary-history diagnostics if necessary:

- a generic settings page may legitimately expose configured backup preference when the user intentionally navigates there;
- the contextual popup attached to an Incognito tab should not automatically expose normal-profile backup success/failure/history timestamps or remote path/account-derived details.

Do not solve this by cloning backup state into a separate Incognito store; P0-045 is a fail-closed/no-private-history boundary, not a requirement to maintain a private Journal.

## Required deterministic / real Chrome regressions

1. Normal tab X: existing Action and popup backup UI work as today.
2. Incognito tab X with ordinary Journal history: Action is neutral and no Journal/urlStats read occurs.
3. Open popup on Incognito: no `WEBCLIP_JOURNAL_BACKUP_STATUS` history read is issued for normal contextual rendering, or the worker returns an explicitly Incognito-neutral result after exact source classification.
4. Ordinary backup has recent success/failure/error: Incognito popup renders the same neutral state regardless of those values.
5. Incognito page containing cross-origin iframe `https://private-origin.example`: clicking frame-access UI does not call `permissions.request()` for that origin.
6. `chrome.permissions.contains({origins:['https://private-origin.example/*']})` remains unchanged after the denied Incognito flow.
7. The same origin in a normal tab may still follow the explicit P1-193 user-gesture permission flow.
8. Direct/stale `WEBCLIP_ENABLE_FRAME_AGENTS` request targeting an Incognito tab fails closed in the worker before script injection.
9. Navigation normal -> Incognito/private target during async discovery/grant flow invalidates the operation; no permission or agent enablement crosses the generation change.
10. Incognito -> normal navigation requires fresh discovery/gesture; private candidate origins are not reused.
11. Existing P1-201 revoke/re-grant lifecycle remains correct for permissions legitimately granted from normal tabs.
12. Journal current/site/all opening from private source remains blocked as already implemented.
13. `WEBCLIP_INVALIDATE_PDF_CACHE` and `WEBCLIP_OPEN_OPTIONS` remain the explicitly allowed content-side Incognito exceptions.
14. No private URL/title/frame-origin appears in Journal, PDF cache metadata, OperationLog, backup state or persistent permission set after Incognito-only activity.
15. Real unmanaged Chrome with "Allow in Incognito" enabled verifies popup/Action neutrality and absence of a host-permission footprint from a private-only origin.

## Duplicate check / numbering

No new number is created.

- Primary owner: **P0-045** — Incognito fail-closed privacy boundary.
- Existing `AUDIT_DELTA_INCOGNITO_ACTION_DISCLOSURE_2026-08-27.md` remains the Action-specific evidence; this file adds popup shared-state and permission-persistence manifestations.
- `P1-193` still owns gesture-safe optional permission request on normal tabs.
- `P1-201` still owns revoke/re-grant lifecycle after a permission legitimately exists.
- `P1-171/P1-200` still own frame/document/control generations.

Stable late numbering is unchanged: P1-199 cross-origin print generation, P1-200 remote frame control generation, P1-201 permission-revocation lifecycle.

## Test / release state

No product tests were rerun for this docs-only audit checkpoint. The last proven product gate remains the historical **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. No runtime/config/manifest change was made. No build, tag or Release was created.
