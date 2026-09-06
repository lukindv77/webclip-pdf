# P0-045 — Incognito contextual isolation — architecture/source saturation — 2026-09-06

Canonical owner/status authority remains `project_docs/RESEARCH_REGISTRY.md`.

Fresh baseline for this tranche:

- `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`;
- `service-worker.js` Git blob = `6d61ac81befdbf2804ae9dbec425aa08d1194eb1`;
- `popup.js` Git blob = `77e3c9c7a4d06bc303b219f08b981f4089adcbd4`;
- runtime/manifest version remains `0.9.8`;
- this branch changes research docs/tools only.

P0-045 remains **ACTIVE**. This document does not claim implementation, Chrome closure, Registry closure or release readiness.

## Canonical owner

Registry wording:

> Incognito must remain fail-closed across persistent Journal/Action/popup/status surfaces; normal-profile state must not leak into private-tab UI/authority.

Historical family evidence already identified the Action/popup/optional-permission roots. This tranche re-reads the current production source and converts those findings into one current implementation contract plus a deterministic model/source gate. No new P-code is allocated.

## Defensive scope

This work is limited to privacy/confidentiality and extension capability integrity:

- do not project ordinary-profile Journal/backup history into a UI context attached to a private tab;
- do not turn origins observed only in private browsing into shared optional host permissions;
- do not let a stale extension-page request target an Incognito tab merely because the sender is an extension page;
- unknown privacy classification fails closed.

No exploit hunting or offensive browser behavior is required or claimed.

## Current positive controls that must be preserved

### Content-message admission already checks Incognito

`assertRuntimeMessageSender()` permits extension senders normally, but for content senders it checks `sender.tab.incognito` and rejects persistence/data commands except the narrow `WEBCLIP_INVALIDATE_PDF_CACHE` and `WEBCLIP_OPEN_OPTIONS` exceptions.

This is a useful existing boundary. P0-045 is not a claim that ordinary private content messages can currently save into the normal Journal.

### Journal opening reclassifies source and placement

The worker path that opens Journal pages fresh-reads the source tab and blocks `sourceTab.incognito`. It separately fresh-reads the placement/anchor tab and blocks `placementTab.incognito`.

Unknown source/placement classification is also converted to explicit `JOURNAL_*_CONTEXT_UNKNOWN` failure rather than trusting stale caller data.

This is the correct shape: privacy classification is a worker-owned prerequisite, not caller metadata.

### Explicit global Settings is a different product context

Opening an extension-owned global Settings page is not equivalent to rendering contextual state in a popup attached to a private tab. P0-045 must not globally prohibit legitimate user-requested global configuration views.

The owner is contextual disclosure/capability mutation tied to a private source tab.

## Fresh current-source findings

## 1. Chrome Action still loses Incognito classification

`updateActionForTab(tabId, knownUrl = '')` begins an Action generation and obtains a URL.

If `knownUrl` is absent it calls `getChromeTabBounded(tabId, ...)`, but it copies only `tab.url` into the local variable. The `tab.incognito` fact is discarded.

The only neutral/fail-closed branch before Journal access is:

- URL not HTTP(S) -> gray neutral Action state.

For an HTTP(S) URL the function proceeds to `getJournalSummaryForUrl(url)` and derives saved/not-saved age/badge/title state from the ordinary Journal.

Therefore a private HTTP(S) tab and a normal HTTP(S) tab with the same URL enter the same Journal-summary path.

## 2. Event paths make the loss systematic

`tabs.onActivated` calls `updateActionForTab(tabId)`. The function fresh-reads a full tab but discards `incognito`.

`tabs.onUpdated` calls:

`updateActionForTab(tabId, changeInfo.url || tab?.url || '')`

The event already supplies a full `tab`, but only the URL is propagated.

`refreshActionForAllTabs()` calls `chrome.tabs.query({})`, receives full tab objects, then maps them to:

`updateActionForTab(tab.id, tab.url || '')`

Again the privacy bit is discarded.

A repair triggered after a late Action settlement eventually calls `updateActionForTab(id)` and repeats the same lossy classification.

P0-045 therefore has to compose with the existing Action generation/repair machinery. Privacy classification cannot be a one-time client-side decoration that later repair bypasses.

## 3. Popup reads persistent backup state before source-tab classification

At popup bootstrap, after reading manifest/version, current `popup.js` executes:

`loadBackupStatus();`

`loadBackupStatus()` sends `WEBCLIP_JOURNAL_BACKUP_STATUS` and renders:

- backup enabled state;
- interval/retry values;
- last background success time;
- last background failure time;
- last background error;
- current-problem state.

Only later operations call `getActiveSourceTab()`.

Thus a contextual popup attached to an Incognito tab can request ordinary-profile backup history before the popup has classified the source tab at all.

## 4. Backup-status worker RPC is global, not contextual

Current worker case:

`case 'WEBCLIP_JOURNAL_BACKUP_STATUS': return getJournalBackupStatus();`

The RPC has no source tab id/privacy receipt and no contextual privacy check.

This global RPC may remain useful to extension-owned Settings/Journal surfaces. The repair should therefore not simply break the RPC globally. Instead, contextual popup usage must either:

1. use a source-context-aware worker admission; or
2. classify the source first and avoid the persistent RPC entirely for private/unknown context, with worker defense in depth for any new contextual status endpoint.

Client-side hiding after the RPC is not sufficient because the disclosure has already crossed into the contextual renderer.

## 5. Private iframe origins can still reach shared permission request

`grantFrameAccessButton` currently:

1. calls `getActiveSourceTab()`;
2. checks only that the URL is HTTP(S);
3. calls `collectCrossOriginFrameOrigins(tab.id)`;
4. constructs host permission patterns;
5. calls `chrome.permissions.request({ origins })`;
6. calls `enableGrantedFrameAgents(tab.id)`.

There is no `tab.incognito` admission before discovery/request.

Optional host permission is shared extension capability state. P0-045 therefore treats a private-only origin as data/capability that must not be converted into a persistent normal/shared grant.

Do not attempt to simulate privacy by granting and later auto-removing the permission. The shared side effect has already occurred and removal can race legitimate normal-profile use.

## 6. Existing granted permissions can also be exercised against an Incognito target

`startButton` obtains the active tab, checks only HTTP(S), ensures the top content script, then calls `enableGrantedFrameAgents(tab.id)`.

`enableGrantedFrameAgents()` sends `WEBCLIP_ENABLE_FRAME_AGENTS`.

Worker admission checks only that the sender is an extension context and then calls `enableFrameAgentsForTab(message.tabId)`.

`enableFrameAgentsForTab()` validates tabId and then begins `executeScriptSingletonBounded(... allFrames: true, files: ['frame-agent.js'])`.

The current worker contains no Incognito classification in this function. Global source search finds `incognito` only in content-message admission and Journal source/placement checks, not in frame-agent enabling.

An extension sender plus numeric tabId is therefore not sufficient proof that frame-agent capability may be exercised in that browsing context.

## Required architecture

## A. One bounded fresh contextual tab classification

For every source-tab-related contextual operation define an authoritative structure conceptually equivalent to:

```text
TabPrivacyContext {
  version,
  tabId,
  url/document generation fields required by the operation,
  incognito: true | false,
  classificationGeneration
}
```

The exact object name is implementation detail. Required properties are:

- obtained from a bounded fresh Chrome tab read or directly from a current event only if the operation preserves the full authoritative tab fact;
- `incognito` is never reconstructed from URL/window heuristics;
- missing/timeout/ambiguous classification is `unknown`;
- `unknown` follows the private fail-closed branch for persistent contextual reads and capability mutations.

P1-158 owns bounded prerequisite read coverage; P0-045 owns the privacy consequence of failure.

## B. Action privacy is part of Action generation authority

`updateActionForTab` must not accept a bare known URL as sufficient context.

Allowed designs include:

- always bounded-fresh-read the target tab inside the function; or
- pass a complete authoritative tab/privacy context whose generation is checked before Journal read and before every Action publish/repair stage.

For `incognito=true` or `unknown`:

- zero `getJournalSummaryForUrl` / urlStats / Journal history reads;
- fixed neutral icon;
- empty badge;
- fixed privacy-safe title independent of normal Journal contents.

The neutral result must be value-independent: changing normal Journal history must not change the private/unknown Action representation.

Late Action settlement/repair must retain the same rule. A repair may reclassify fresh, but it cannot fall back to URL-only Journal state.

Normal non-private HTTP(S) behavior remains unchanged.

P1-130/P1-217 own bounded Action convergence/degraded truth; P0-045 owns which data may be read/published for private context.

## C. Popup classifies before persistent contextual reads

Popup startup order must become:

1. boundedly determine active contextual tab;
2. classify privacy;
3. if normal -> fetch/render contextual persistent status as permitted;
4. if private/unknown -> render a fixed neutral/private panel without requesting ordinary backup history.

A private popup must not fetch ordinary backup timestamps/errors and merely hide them afterward.

The displayed private state must be independent of ordinary backup status values.

Global Settings remains allowed to read global backup settings/history because it is not a contextual private-tab popup.

## D. Optional permission request requires normal context at commit admission

Before `chrome.permissions.request()`:

- initial source tab must be classified normal;
- discovered iframe origins must belong to that admitted source/document/gesture generation;
- immediately before the non-cancellable user-owned permission side effect, bounded fresh classification must still be normal and generation-current.

If the tab became private, changed document/application generation, disappeared, or classification became unknown:

- zero permission request;
- discard discovered private/stale origins;
- require a fresh user gesture/discovery if a later normal context wants permission.

P1-157 owns user-owned permission-prompt lifetime semantics; P1-193 owns explicit optional-permission behavior. P0-045 adds the privacy admission requirement.

## E. Worker frame-agent enabling has independent privacy defense

`WEBCLIP_ENABLE_FRAME_AGENTS` cannot trust extension sender + caller tabId.

Before any `executeScript`/frame mutation the worker must bounded-fresh-read the target and fail closed for:

- Incognito;
- unknown/timeout;
- stale target generation where generation matters.

This remains required even if popup client code already checks `tab.incognito`.

Previously granted shared host permissions do not authorize exercising cross-origin frame-agent capability in a private target under this owner.

Top-page/private selection policy is a separate product choice. P0-045 specifically forbids persistent/shared capability expansion/exercise that bridges private and normal contexts.

## F. No private URL/title/frame-origin persistence footprint

Private-context use alone must not produce normal durable history/capability footprints such as:

- Journal/urlStats entry;
- PDF cache or pending save metadata;
- OperationLog source metadata outside an explicitly privacy-safe ephemeral class;
- backup history change;
- optional host permission newly derived from a private origin.

This does not duplicate P0-066 URL minimization. P0-066 controls allowed durable URL representation; P0-045 controls whether private contextual data may enter the normal durable surface at all.

## Transition schedules that must be deterministic

### normal -> Incognito while Action update is in flight

An older normal Journal summary cannot publish after the target became private.

Either the existing Action generation becomes stale through tab/privacy generation or the final publish reclassifies and neutralizes. No late normal badge/title may appear on the private tab.

### private -> normal

A normal state can be shown only after fresh normal classification. It is acceptable to perform a new Journal read after that classification.

### normal discovery -> private before permission prompt

Discovered origins and gesture admission become stale. `permissions.request` is not called.

### private discovery -> normal

Do not reuse the private discovery merely because the current tab is now normal. Require fresh discovery under a new gesture/generation.

### worker restart

No in-memory privacy receipt survives as durable authority. The next contextual operation reclassifies from Chrome. Unknown fails closed.

## Owner boundaries

- **P0-045**: Incognito contextual confidentiality/capability isolation.
- **P0-066**: durable/display URL minimization once persistence is allowed.
- **P0-070/P0-080**: exact document/application generation for save authority.
- **P0-075**: host page is not trusted UI/control plane.
- **P1-125/P1-171**: exact executeScript/frame generation receipts.
- **P1-130/P1-217**: Action convergence and degraded state.
- **P1-157**: Chrome API/prompt lifetime semantics.
- **P1-158**: bounded prerequisite reads.
- **P1-193**: explicit optional host-permission product flow.

Do not create a second independent generation system where one of these owners already supplies the necessary authoritative generation. P0-045 must compose with it.

## Deterministic model in this branch

`project_tools/test_p0_045_incognito_context_isolation_model.js`

It covers:

1. normal Action Journal read;
2. Incognito/unknown zero-read neutral Action;
3. normal popup backup read;
4. Incognito/unknown zero-read neutral popup;
5. no private-origin permission request;
6. normal -> Incognito revocation before request;
7. Incognito -> normal requires fresh gesture generation;
8. worker frame-agent fail-closed for private/unknown;
9. preservation of existing content-sender Incognito block.

Local result during research creation:

`P0-045 incognito context isolation model: PASS`

This is architecture/model evidence only.

## Required source-bound gate

A separate branch tool must remain RED until current source implements at least:

- Action reads/classification include Incognito before Journal access;
- URL-only update/refresh cannot bypass that classification;
- popup does not call persistent backup-status RPC before classifying active tab;
- contextual private/unknown popup does not request ordinary backup history;
- permission flow checks/rechecks privacy before `permissions.request`;
- worker frame-agent enabling rechecks target privacy before `executeScript`;
- existing content-sender and Journal-open Incognito fences remain present.

## Chrome verification still required before closure

P0-045 cannot close from source/model only. Real unpacked Chrome evidence is required with **Allow in Incognito enabled**, because spanning-mode extension behavior and actual popup/Action/permissions surfaces are browser boundaries.

Minimum physical matrix:

1. same URL has known ordinary Journal history;
2. open same URL in Incognito -> neutral Action independent of that history;
3. open contextual popup in Incognito -> no ordinary backup timestamps/errors rendered or requested by the contextual path;
4. private page with cross-origin iframe -> no permission prompt and no new host permission;
5. direct/stale frame-agent enable against private tab -> worker rejects before injection;
6. normal -> private transition while Action update is delayed -> no late normal badge/title;
7. normal discovery -> private before permission request -> no request;
8. private -> normal requires fresh user gesture/discovery;
9. ordinary normal-window flows remain functional;
10. global Settings intentionally opened by the user still shows global configuration according to product policy.

## Status

**Architecture-saturated for the current baseline, but ACTIVE.**

The current source still violates the P0-045 contextual isolation contract on Action, popup backup status and optional/frame-agent capability paths. Runtime implementation plus committed-source and unmanaged/real Chrome evidence are still required. No Registry transition is justified by this research branch alone.
