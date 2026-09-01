# Research family evidence — Incognito privacy / signed transport redaction

This document is a lossless family consolidation of three docs-only research deltas that previously lived as separate current files:

- `RESEARCH_DELTA_INCOGNITO_ACTION_DISCLOSURE_2026-08-27.md`;
- `RESEARCH_DELTA_INCOGNITO_POPUP_PERSISTENT_STATE_2026-08-27.md`;
- `RESEARCH_DELTA_SIGNED_URL_OPERATION_LOG_REDACTION_REGRESSION_2026-08-28.md`.

No runtime/test/configuration/manifest change is implied by this consolidation. Historical product gates in the source deltas remain historical evidence only.

## Owner map

The family contains **two separate primary owners** and they must not be merged semantically:

- **P0-045 — Incognito fail-closed privacy boundary.** Current source proof shows normal-profile Journal/backup/capability state can still be projected or persisted from an Incognito source context through Action/popup paths that bypass the content-sender Incognito fence.
- **P0-033 — signed Yandex transport URL redaction.** Current source proof shows the OperationLog summarizer preserves signed-link pathname while redacting only query, contradicting the accepted rule that the signed transport URL is an opaque capability including its path.

Adjacent owners remain dependencies, not replacements: P0-066, P0-074, P0-069/P0-078, P1-157, P1-171, P1-184, P1-193, P1-197, P1-200/P1-201.

# P0-045 — Incognito fail-closed privacy boundary

## Positive controls already present

Current runtime sender admission correctly rejects Incognito content-script persistence/data commands except the explicitly permitted cache invalidation and settings transition. Private content therefore does not enter the normal Journal/PDF/OperationLog save path merely through the ordinary content message surface.

`openJournalPage()` also fresh-reads source/placement tabs and rejects Incognito placement, preventing the normal persistent Journal page from being deliberately opened as a history bridge from a private source.

These controls remain required and are evidence that the primary gap is extension-page/Action source-context classification, not the absence of a central content ACL.

## Action disclosure source proof

`updateActionForTab(tabId, knownUrl='')` obtains or receives a URL but discards/does not carry `tab.incognito` before calling the normal Journal summary path. For an HTTP(S) private tab it can therefore call `getJournalSummaryForUrl(url)` and derive icon/title state from ordinary-profile `lastSavedAt`.

The Action visibly distinguishes at least no saved record, <=7 days, 8–30 days, and >30 days. Visiting URL X in an Incognito window can thus reveal whether/when X exists in the ordinary Journal even though no private record is itself persisted.

Both observed event paths need the same fence:

- `tabs.onActivated` must classify the bounded fresh tab before any Journal read;
- `tabs.onUpdated` must preserve the supplied full tab's `incognito` fact rather than passing URL alone.

Unknown/failed tab classification must fail closed to the neutral Incognito/unknown representation instead of using a stale/known URL for a normal Journal lookup.

Late Action settlement/repair must carry the same privacy classification; a repair generation cannot re-enter normal-profile Journal state for a private tab.

## Popup persistent-state source proof

Popup initialization historically issued `WEBCLIP_JOURNAL_BACKUP_STATUS` before resolving/classifying the active source tab. That returns shared normal-profile backup/configuration/history data such as enabled state, interval/retry, success/failure timestamps, errors and remote/root information. Even when only a subset is rendered, the contextual Incognito popup receives normal shared persistent operational state before applying a privacy fence.

The P0-045 rule is contextual: an intentionally opened global Settings page may legitimately show global configuration, but a popup attached to an Incognito browsing context must not automatically project normal Journal/backup history. It should show a fixed neutral/private-mode state independent of normal-profile values.

## Optional host-permission footprint source proof

The popup cross-origin frame permission path historically:

1. resolved the active source tab;
2. checked HTTP(S) URL but not `tab.incognito`;
3. discovered cross-origin iframe origins from the private document;
4. built host permission patterns;
5. called `chrome.permissions.request()`;
6. enabled frame agents after grant.

In Chrome's spanning Incognito model, optional host permission is extension capability state that can outlive the private page. An origin encountered only during private browsing must not be converted into normal/shared persistent WebClip capability state under P0-045.

The privileged `WEBCLIP_ENABLE_FRAME_AGENTS` endpoint also requires defense in depth: a trusted extension sender carrying a tab id is not proof that the target is non-Incognito. The worker must bounded-fresh-read the target and fail closed before injection/enabling.

Do not attempt to emulate private-scoped permission by granting a normal optional permission and auto-removing it later; the grant is already a shared side effect and can race with legitimate normal-tab users of the same origin.

## Required P0-045 acceptance

1. Every source-tab-related extension-page/Action operation has one fresh bounded context classification including `tabId`, current URL/document generation when needed, and `incognito`.
2. `incognito=true` or unknown privacy classification performs **zero normal Journal/urlStats history reads** for Action state and renders a fixed neutral result.
3. Incognito contextual popup does not automatically issue/render ordinary backup history/status; displayed private-mode state is independent of normal backup success/failure/remote values.
4. Private iframe origins are not used to call `permissions.request()` and do not change the extension's optional host permission set.
5. Direct/stale `WEBCLIP_ENABLE_FRAME_AGENTS` targeting an Incognito tab fails in the worker before injection.
6. Async normal→Incognito/private navigation invalidates discovery/grant/enable authority; Incognito→normal requires fresh discovery and a new valid user gesture.
7. Existing P0-045 content save/Journal-open blocks remain intact.
8. Normal tabs preserve current intended Action, popup and P1-193 explicit optional-permission behavior.
9. No private URL/title/frame-origin becomes Journal/PDF cache/OperationLog/backup/permission footprint solely from Incognito activity.
10. Real unmanaged Chrome with Allow in Incognito enabled remains required release QA for this boundary.

# P0-033 — signed Yandex transport URL is an opaque capability

## Regression source proof

`yandexApi()` stores bounded Yandex response summaries in OperationLog. For `data.href`, the researched `summarizeYandexResponse()` shape constructed a value equivalent to:

`origin + pathname + (query ? '?[REDACTED_QUERY]' : '')`.

Only query is redacted; pathname remains durable in OperationLog. This directly violates the previously accepted P0-033 contract that a temporary signed upload/download URL is secret as a whole, including its path.

The provider-issued signed href is an opaque temporary capability. WebClip cannot safely assume authorization/signature material always resides in query, that pathname is non-sensitive, or that future provider formats preserve today's split.

OperationLog is persistent/exportable diagnostic storage. Expiry of the live signed link does not justify persisting its path: the log can be inspected while valid, provider TTL is external policy, and the path can contain durable resource/account/operation identifiers that diagnostics do not require.

## Required P0-033 acceptance

For any recognized signed upload/download transport href, durable diagnostics may retain only a bounded non-capability summary such as:

- provider/category;
- normalized scheme/host/origin if useful;
- HTTP method;
- boolean indicating a signed href was present;
- explicit `[REDACTED_SIGNED_PATH]` marker.

Durable logs must not retain pathname, query, fragment, userinfo, full href or a reversible encoding intended to reconstruct the capability.

Unknown/new temporary href classes fail closed toward redaction. The actual live transfer still receives the original full signed URL; diagnostics redaction must not mutate the network capability.

Permanent/public links remain governed separately by P0-066/P0-069/P0-078; signed-transport secrecy must not be weakened by public-link handling, and remote object identity under P1-184/P0-074 must not depend on retaining signed transport text.

Existing OperationLog rows that may contain paths require only bounded retention/migration treatment; do not introduce an unbounded historical rewrite at startup.

## Required P0-033 regressions

1. Signed href with unique path and no query -> no pathname in OperationLog detail/JSON/export.
2. Signed href with path + query -> neither component persists.
3. Mocked href with userinfo/fragment -> neither persists.
4. Origin/method/category/redaction marker may remain according to policy.
5. Live upload/download still uses the exact original href.
6. Exception/error serialization cannot reintroduce full signed href.
7. Raw response diagnostics cannot bypass the signed-link summarizer.
8. Malformed/large href is bounded and fail-closed redacted.
9. Public permanent URL policy remains a separate boundary.

## Retirement result

The three source deltas are now represented losslessly at the family level with their separate owners, positive controls, source-proof shape and acceptance/regression requirements. Their exact prose and original research baselines remain in Git history.

After this file is committed, the three source deltas may be removed from the current working tree and family 13 of `RESEARCH_DELTA_INDEX.md` should point here instead of listing them as current deltas.
