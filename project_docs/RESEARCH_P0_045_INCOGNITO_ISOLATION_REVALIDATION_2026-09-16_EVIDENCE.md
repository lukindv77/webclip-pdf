# Research evidence — P0-045 Incognito isolation revalidation — 2026-09-16

Canonical baseline: `main` at `a38c3a8ca797f761cbd8c90cb3294e5a0c34dc6e`.

Research-only closure-oriented tranche. Production runtime, `manifest.json`, workflows, build/tag/deploy/release state, `TEST_STATUS.md` and `RELEASE_READINESS.md` are unchanged.

## Owner and result

Canonical `RESEARCH_REGISTRY.md` keeps **P0-045 ACTIVE**:

> Incognito must remain fail-closed across persistent Journal/Action/popup/status surfaces; normal-profile state must not leak into private-tab UI/authority.

Fresh-current-source review reconfirms the owner as one Incognito privacy boundary with three still-open projections/side-effect paths:

1. Chrome Action can read and visibly project ordinary-profile Journal summary for an Incognito tab.
2. Popup initialization reads and renders ordinary persistent backup state before classifying the active tab.
3. Cross-origin frame permission discovery/grant/enable can use an Incognito source/target to create or exercise shared extension capability state.

No new P-code is created.

**Current result: `P0-045 = ACTIVE / ROOT-CAUSE-REVALIDATED`.**

This tranche does **not** claim implementation closure, physical unmanaged-Chrome closure, or release readiness.

## Fresh canonical source receipts

Baseline source was read from exact canonical commit `a38c3a8ca797f761cbd8c90cb3294e5a0c34dc6e`.

- `service-worker.js` Git blob: `6d61ac81befdbf2804ae9dbec425aa08d1194eb1`.
- `popup.js` Git blob: `77e3c9c7a4d06bc303b219f08b981f4089adcbd4`.
- `manifest.json` Git blob: `259a7c3706e78c1a22021db7dc4769e8accdfb3e`.
- `manifest.json` remains version `0.9.8` and contains no explicit `incognito` manifest key.
- Release readiness remains `NOT READY`.

## Semantic duplicate / root-cause reconciliation

Historical evidence was consulted only for provenance and semantic dedup.

`RESEARCH_FAMILY_PRIVACY_TRUST_EVIDENCE.md` already owns this exact root cause under P0-045 and explicitly separates it from P0-033 signed-Yandex capability redaction.

That family preserves the same three acceptance families revalidated here:

- Action disclosure from normal Journal state into private-tab toolbar UI;
- popup projection of normal persistent backup/status state;
- private-origin optional host-permission / frame-agent capability footprint.

Therefore this work extends **P0-045**. It does not allocate a new P-code.

Adjacent owners remain separate:

- **P0-075**: host page is not a trusted WebClip UI/control plane.
- **P0-066**: durable/display URL confidentiality sanitizer.
- **P0-074**: immutable Yandex account/root/config operation context.
- **P1-193 and frame-permission family**: explicit optional-permission behavior for ordinary pages.
- **P0-070/P0-080**: source/application generation, not profile privacy.

## Positive controls already present in current source

Fresh source still has two important fail-closed controls.

### Content-script persistence/data commands

`assertRuntimeMessageSender()` checks `sender.tab.incognito` and rejects ordinary content-originated save/data commands in Incognito, except the explicitly permitted cache invalidation/settings transition.

This prevents the normal content message path from simply persisting a private page into Journal/PDF/OperationLog.

### Journal source/placement checks

Journal-opening code fresh-resolves source/placement tabs and rejects Incognito source/placement contexts, preventing deliberate persistent Journal opening as a normal-history bridge from a private tab.

These controls are necessary, but they do not cover extension-page and Action paths below.

## Fresh current-source proof

### 1. Action state can project normal Journal history into an Incognito tab

Current service worker registers:

```js
chrome.tabs.onActivated.addListener(({ tabId }) => {
  updateActionForTab(tabId).catch(() => {});
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url || changeInfo.status === 'complete') {
    updateActionForTab(tabId, changeInfo.url || tab?.url || '').catch(() => {});
  }
});

refreshActionForAllTabs().catch(() => {});
```

`refreshActionForAllTabs()` queries all tabs and forwards only `tab.id` plus URL:

```js
await Promise.all(tabs.map((tab) => updateActionForTab(tab.id, tab.url || '').catch(() => {})));
```

Fresh full-source search finds only three `incognito` checks in `service-worker.js`; none is inside `updateActionForTab()`.

`updateActionForTab()` therefore starts from `tabId` / `knownUrl`, resolves URL as needed, and can call the normal `getJournalSummaryForUrl(url)` path without carrying an Incognito privacy classification.

It then projects Journal-derived state through Action icon/badge/title, including a badge based on `summary.uniqueDays`.

For an HTTP(S) private tab visiting URL X, this allows ordinary-profile Journal state for X to affect the private tab's toolbar UI even though the private visit itself is not persisted.

The correct privacy rule is stronger than “do not write private browsing”: **Incognito and unknown privacy classification must perform zero ordinary Journal/urlStats reads for Action rendering and use a fixed neutral representation.**

### 2. Action repair/generation must carry privacy classification too

The current Action late-settlement machinery is generation-aware for Chrome Action mutations, which is a good concurrency control. However, `scheduleActionRepairForTab(tabId)` re-enters `updateActionForTab(id)` by tab id only.

A future privacy fix cannot classify only the first call and then lose that fact in repair. Every repair must either fresh-classify the target tab or carry a receipt whose privacy generation is revalidated before normal Journal reads.

Unknown tab lookup/timeouts must fail closed to neutral UI rather than falling back to known/stale URL data.

### 3. Popup automatically reads ordinary backup state before active-tab privacy classification

Current `popup.js` performs this at module initialization:

```js
versionEl.textContent = `Версия расширения: ${manifest.version}`;
loadBackupStatus();
```

`loadBackupStatus()` immediately sends:

```js
chrome.runtime.sendMessage({ type: 'WEBCLIP_JOURNAL_BACKUP_STATUS' })
```

The worker extension-sender path returns `getJournalBackupStatus()`.

`getJournalBackupStatus()` reads ordinary persistent Yandex configuration and `journalBackupState`. The popup renders fields including:

- enabled state;
- interval/retry;
- last background success;
- last background failure;
- current error/problem state.

Only later do individual user actions call `getActiveSourceTab()`.

Thus a popup contextualized to an Incognito active tab can automatically receive/render normal-profile operational history before the popup has classified the source context.

P0-045 requires contextual popup startup to classify the active tab first. Incognito or unknown privacy context must display a fixed neutral/private-mode state and perform zero automatic normal backup-history reads.

This does not prohibit a deliberately opened global Settings surface from showing global settings; it forbids automatic contextual projection from a private browsing surface.

### 4. Private frame origins can affect optional host-permission capability state

Current popup frame-permission flow:

1. resolves active tab;
2. requires only HTTP(S);
3. discovers cross-origin frame origins;
4. maps them to host permission patterns;
5. calls `chrome.permissions.request({ origins: permissionOrigins })`;
6. calls `WEBCLIP_ENABLE_FRAME_AGENTS`.

There is no `tab.incognito` admission before discovery/request.

`manifest.json` grants broad optional host permission patterns:

```json
"optional_host_permissions": [
  "http://*/*",
  "https://*/*"
]
```

An origin encountered only during private browsing must not become shared/persistent extension capability state merely because the user interacted with WebClip in Incognito.

Do **not** attempt to repair this by granting normally and removing later: the capability grant has already occurred and can race with legitimate ordinary-profile use.

### 5. Worker `WEBCLIP_ENABLE_FRAME_AGENTS` needs target-tab defense in depth

Current worker message handling:

```js
case 'WEBCLIP_ENABLE_FRAME_AGENTS': {
  if (senderKind !== 'extension') throw new Error(...);
  return enableFrameAgentsForTab(message.tabId);
}
```

`enableFrameAgentsForTab(tabId)` validates a numeric tab id and proceeds to script execution. Fresh full-source search shows no Incognito target check in that function.

Trusted extension-page sender identity is not proof that the target tab is non-private. A stale/direct extension-page request can therefore target an Incognito tab unless the worker itself fresh-reads and classifies the target immediately before injection.

The worker must fail closed on `incognito=true` **and on unknown privacy classification**.

### 6. Navigation races require one privacy generation/receipt

A normal page can become Incognito only by changing context/window/tab identity in browser-managed ways, but asynchronous extension work can still observe stale tab/url state across activation/update/discovery/grant/enable stages.

Required authority is therefore not “URL looked normal once”.

The operation must bind at least:

- exact tab id;
- fresh privacy classification;
- a monotonic source/control generation sufficient to invalidate stale async work;
- current URL/document context when the operation semantics require it.

Normal → private transition invalidates prior ordinary authority.

Private → normal does **not** revive old private discovery/grant authority; it requires fresh discovery under a new valid user gesture/receipt.

ABA-style changes must not be accepted merely because the final URL/profile class resembles the initial one.

## External vendor/standards revalidation

### Chrome user-privacy guidance

Chrome explicitly states that Incognito promises that a window leaves no tracks and that an extension which normally saves browsing history should not save history from Incognito windows. Chrome instructs extensions to classify context using `tabs.Tab.incognito` / `windows.Window.incognito`.

Source:

- https://developer.chrome.com/docs/extensions/develop/security-privacy/user-privacy

This directly supports the WebClip rule that private browsing must not enter normal durable history or expose normal browsing-history state back into private contextual UI.

### Chrome Incognito access is an explicit user-controlled capability

Chrome documents that Incognito execution requires the user-controlled “Allow in Incognito” setting and exposes `extension.isAllowedIncognitoAccess()` to inspect it.

Sources:

- https://developer.chrome.com/docs/extensions/develop/concepts/declare-permissions
- https://developer.chrome.com/docs/extensions/reference/api/extension

This setting is permission to operate in private browsing, not permission to mix normal-profile history into private UI.

### Extension contexts carry an Incognito fact

Chrome's runtime context model exposes `ExtensionContext.incognito`, and tab/window objects expose their own Incognito fact.

Source:

- https://developer.chrome.com/docs/extensions/reference/api/runtime

This provides browser-owned inputs for fail-closed context classification rather than URL inference.

### Persistent extension state requires deliberate privacy handling

Chrome documents extension storage as shared by extension-origin contexts including service worker, extension pages and offscreen documents. Chrome's storage documentation also distinguishes durable storage from session-only storage.

Sources:

- https://developer.chrome.com/docs/extensions/develop/concepts/storage-and-cookies
- https://developer.chrome.com/docs/extensions/reference/api/storage

WebClip's Journal is IndexedDB-backed persistent extension state. The architectural implication is that private-context code must not assume browser process separation automatically protects normal Journal/backup data.

### Manifest Incognito behavior is a first-class architecture choice

Chrome's manifest reference defines `"incognito"` behaviors (`spanning`, `split`, `not_allowed`). Current WebClip manifest contains no explicit `incognito` key.

Source:

- https://developer.chrome.com/docs/extensions/mv3/manifest

P0-045 closure should make the privacy contract explicit in implementation/tests regardless of whether the final product keeps spanning behavior, selects split behavior, or chooses another supported policy.

## Public-project / ecosystem evidence

Public evidence is used as control/experience evidence, not proof of the WebClip defect.

1. W3C WebExtensions issue #534 documents cross-browser differences for extension IndexedDB in private browsing and specifically discusses Chrome Incognito IndexedDB lifecycle:
   - https://github.com/w3c/webextensions/issues/534
2. Chromium Extensions discussion (2023) with Chrome Extensions DevRel notes that behavior differs with spanning Incognito context and that IndexedDB context/lifecycle needs explicit consideration:
   - https://groups.google.com/a/chromium.org/g/chromium-extensions/c/wdiKamQkapY
3. Chromium Extensions discussion (2026) reports a concrete spanning-vs-split offscreen/service-worker context difference:
   - https://groups.google.com/a/chromium.org/g/chromium-extensions/c/RiZrVY1-Y5o

These support treating Incognito process/storage context as a real architecture dimension rather than assuming ordinary extension state is automatically isolated.

## User/community relevance

A July 2026 ActivityWatch discussion asks how to avoid tracking Chrome Incognito activity. The maintainer's answer is to not allow the tracking extension to run in Incognito.

- https://github.com/orgs/ActivityWatch/discussions/1342

This is not proof of a WebClip defect and is not the chosen WebClip policy. It is user-facing evidence that people expect Incognito activity not to silently enter ordinary tracking/history surfaces.

WebClip intentionally supports a fail-closed Incognito boundary when Chrome access is enabled, so the correct response is not necessarily to disable all functionality; it is to prevent persistent/history projection and shared capability side effects.

## Deterministic failure / acceptance model

Added model:

`project_tools/test_p0_045_incognito_isolation_revalidation_model.js`

Local execution:

- `node --check`: PASS
- execution: **P0-045 incognito isolation model: PASS 53 checks**
- SHA-256: `7cf009d932aa0d36fe937800b9ba544a5a4540f5cdfb01a51ebeab4eb6350c52`
- expected Git blob: `9969d4e2928b09d52effa6c02f85070548e3a4c6`

The model covers:

1. current Action URL-only normal Journal read in a private tab;
2. candidate Incognito and unknown fixed-neutral Action state with zero Journal reads;
3. regular Action positive control;
4. current eager popup backup-history read;
5. candidate private/unknown popup neutral state with zero backup read;
6. regular popup positive control;
7. current private frame-origin permission request;
8. candidate zero private discovery/request/capability mutation;
9. normal permission positive control;
10. current worker extension-sender-only frame-agent admission;
11. candidate fresh target privacy fence;
12. normal → Incognito and Incognito → normal race invalidation;
13. ABA/generation negative control;
14. existing content-save and Journal-open Incognito fences as positive controls.

## Required implementation acceptance

P0-045 physical implementation closure requires all of the following.

### A. One fail-closed privacy classifier for contextual operations

Every tab-contextual Action/popup/permission/frame-agent operation must establish a fresh bounded classification:

- exact tab/window context;
- `incognito` privacy fact;
- URL/document/generation fields only as needed for that operation.

Lookup timeout/removal/ambiguity is **unknown** and follows the private-neutral path until fresh ordinary classification succeeds.

### B. Action performs zero normal-history reads for private/unknown contexts

For `incognito=true` or unknown privacy:

- zero `getJournalSummaryForUrl()` / urlStats history reads;
- no normal-profile age/day-count state in icon/badge/title;
- fixed neutral/private Action representation.

Late mutation repair must revalidate the same privacy boundary before any normal history read.

### C. Popup classifies before persistent status reads

A contextual popup must classify active-tab privacy before automatic:

- backup-status reads;
- Journal-history reads;
- persistent operational-history/status rendering.

Incognito/unknown popup shows neutral private-mode UI independent of ordinary backup success/failure/root state.

Global Settings remains a separate intentional surface and may expose global configuration according to its own contract.

### D. Private frame origins cannot change shared permissions

Incognito/unknown source context performs:

- zero cross-origin frame discovery for permission acquisition;
- zero `chrome.permissions.request()` from that contextual flow;
- zero shared permission footprint solely from private activity.

Ordinary pages retain the existing explicit user permission flow.

### E. Worker fresh-checks frame-agent targets

`WEBCLIP_ENABLE_FRAME_AGENTS` must not trust only `senderKind === 'extension'`.

Immediately before privileged target injection/enable, worker bounded-fresh-reads the target and rejects:

- Incognito;
- missing/closed tab;
- unknown privacy result;
- stale generation.

### F. Async navigation/context changes invalidate authority

Normal→private invalidates discovery/grant/enable authority.

Private→normal requires fresh ordinary classification, fresh discovery, and a new valid user gesture where permission request semantics require one.

No URL equality or reused tab id substitutes for privacy generation.

### G. Existing positive controls remain intact

Keep current:

- content-originated Incognito save/data command block;
- Incognito Journal source/placement block.

Normal profile behavior and explicit optional host-permission UX must not regress.

## Required real Chrome regressions

With unpacked extension and **Allow in Incognito enabled**, prove at least:

1. private HTTP(S) tab produces zero Journal/urlStats reads when Action updates;
2. private Action badge/title is independent of ordinary Journal history for the same URL;
3. ordinary Action still shows intended state;
4. private contextual popup performs zero automatic backup-history/status read;
5. popup private-neutral display is independent of ordinary backup state/errors;
6. ordinary popup still displays intended backup status;
7. private cross-origin frame discovery never reaches permission request;
8. optional host permission set is unchanged after private flow;
9. direct/stale `WEBCLIP_ENABLE_FRAME_AGENTS` targeting Incognito fails before injection;
10. normal→private race invalidates in-flight discovery/enable;
11. private→normal requires fresh authority/new gesture;
12. existing content-save Incognito block remains PASS;
13. existing Journal-open Incognito block remains PASS;
14. no private URL/title/frame-origin is added to Journal/PDF cache/OperationLog/backup/permission footprint solely through private activity.

## Closure interpretation

This tranche supplies fresh current-source proof, vendor/public/user revalidation and a deterministic acceptance model.

It is **not** implementation closure.

`P0-045` remains **ACTIVE / ROOT-CAUSE-REVALIDATED** until runtime changes and required real unmanaged-Chrome Incognito regressions are durable on current source.

Release readiness remains **NOT READY**.
