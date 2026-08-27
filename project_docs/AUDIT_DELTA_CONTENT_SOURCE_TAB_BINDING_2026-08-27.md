# Audit delta — content source-tab binding — 2026-08-27

Baseline HEAD before this audit block: `36f2ba4960e1df7a17a9367e80c9e8ef2a1e7900`.

Docs-only audit checkpoint. Production runtime and `manifest.json` are unchanged. Canonical large-table synchronization is not claimed.

## Scope

Fresh confused-deputy audit of content-allowed runtime commands that open a tab/window, focused on existing `P0-030` sender-bound content payload authority and `P0-051` saved-file site binding.

## Result

`P0-030` should be refined to cover caller-provided **tab/frame identifiers**, not only URL/title/meta fields. Three content-allowed navigation handlers accept `message.sourceTabId` ahead of the authoritative `sender.tab.id`. The worker then uses that id with privileged `chrome.tabs.get()` to choose another tab's window/index as placement authority for the new tab.

No new P-number is created. `P1-199` remains free.

## Exact runtime proof

### 1. Content allowlist

The content-script message allowlist includes:

- `WEBCLIP_OPEN_JOURNAL_SAVED_FILE`;
- `WEBCLIP_OPEN_OPTIONS`;
- `WEBCLIP_OPEN_URL`.

`WEBCLIP_OPEN_INTERNAL_PAGE` is not content-allowed, which is a positive control: content cannot use this issue to request an arbitrary extension HTML page.

Incognito content is additionally restricted by `assertRuntimeMessageSender()`; only cache invalidation and `WEBCLIP_OPEN_OPTIONS` remain allowed from an Incognito sender. Those existing privacy rules must remain.

### 2. The three content-allowed open handlers trust caller sourceTabId

Each affected handler computes:

`const sourceTabId = Number(message.sourceTabId || sender.tab?.id || 0);`

This makes an untrusted content payload authoritative whenever it supplies a non-zero `sourceTabId`, even though `sender.tab.id` is already available from Chrome and is the correct source-tab identity for a content sender.

The saved-file handler still performs the valuable `P0-051` siteKey check before opening a Yandex public link, and `WEBCLIP_OPEN_URL` restricts content to allowed Yandex public-link hosts. Those URL/content-authority gates are not bypassed by this finding.

The defect is the independent **placement/tab-context authority**.

### 3. createTabNextTo performs privileged lookup of the supplied tab

`createTabNextTo(sourceTabId, url, active)` calls bounded `chrome.tabs.get(sourceTabId)`.

If that lookup succeeds and exposes an integer index, the worker copies:

- `source.index + 1` into the new tab's index;
- `source.windowId` into the new tab's windowId.

The caller therefore influences which existing browser window/index becomes the placement context for a new privileged extension/Yandex tab.

The worker does not compare the supplied id with `sender.tab.id` for content senders.

### 4. Consequence classification

This pass did **not** find a broad data exfiltration from the chosen source tab:

- source URL/title are not returned to the content caller;
- `createTabNextTo()` uses source metadata only internally for placement;
- the response exposes the id of the newly created tab, not the private metadata of the chosen existing source tab;
- content still cannot request arbitrary `chrome://`, `file:`, `data:` or arbitrary HTTPS targets through these handlers.

Therefore the confirmed issue is a confused-deputy/tab-context integrity problem inside existing `P0-030`, not a new cross-tab confidentiality P0.

It can still cause UI/context confusion and cross-window placement if a content caller knows or guesses another tab id. A compromised content-side caller must not gain additional Chrome tab authority merely by supplying an integer that the background page can resolve with its broader tabs privilege.

### 5. Safer neighboring paths

Other content-authorized control paths already demonstrate the correct pattern:

- PDF generate/upload/retry derive the active tab from `sender.tab.id`;
- frame-agent LIST/TARGET derive the containing tab from `sender.tab.id`, with top-frame/child-frame sender checks;
- `WEBCLIP_ENABLE_FRAME_AGENTS` accepts explicit `message.tabId` only from an extension-page sender, not content.

The open/navigation handlers should follow the same sender-bound rule.

## Required P0-030 refinement

For `senderKind === 'content'`:

- ignore/reject caller-provided `sourceTabId` and use only `sender.tab.id` as placement/source authority;
- more generally, any tabId/frameId/documentId field supplied in a content message must be treated as untrusted unless the worker independently proves it belongs to the exact sender context/capability;
- never perform privileged `tabs.get()`/scripting/navigation against a caller-selected foreign tab solely because the content payload contains its numeric id;
- keep caller-supplied tab ids available only for trusted extension-page flows that genuinely need to address another tab, subject to their own document/generation fences (`P1-157`, `P1-175`, `P1-171`).

`P0-051` siteKey binding and the Yandex public-link host allowlist remain required; sender-tab binding is additional, not a replacement.

For Incognito, preserve `P0-045`: sender Incognito classification must be derived from Chrome's sender/tab context and cannot be bypassed by choosing a different sourceTabId.

## Required deterministic/browser regressions

1. Content sender in tab A sends `WEBCLIP_OPEN_OPTIONS {sourceTabId:B}`: worker ignores/rejects B and places relative only to A.
2. Content sender tries `WEBCLIP_OPEN_URL` with another known tab id: URL host policy still applies and foreign tab/window cannot become placement authority.
3. Content `OPEN_JOURNAL_SAVED_FILE` still requires exact current-site `P0-051` binding and also cannot use another tab as source authority.
4. Extension-page caller that legitimately specifies a target/source tab retains supported behavior under worker-owned exact-document/tab checks.
5. Incognito sender cannot change its privacy classification by passing a normal-profile tab id, and normal sender cannot make a foreign private tab its trusted source context.
6. Invalid/nonexistent source id from content does not trigger a privileged foreign lookup; sender-bound fallback is deterministic rather than caller-controlled.
7. Frame-agent commands remain bound to `sender.tab.id`/sender frame as today.

## Classification

- Extend existing `P0-030`; no new P0/P1 item.
- Preserve `P0-051` for content saved-file site binding.
- Preserve `P0-045` for Incognito privacy context.
- Preserve `P1-157`/`P1-175`/`P1-171` for trusted extension-page cross-tab/document operations.
- `P1-199` remains free.

Previous product test gate was not re-run by this docs-only checkpoint.
