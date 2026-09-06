# P1-193 — optional host permission user-activation + document generation — 2026-09-07

Date: 2026-09-07  
Canonical baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Working branch: `research/p1-193-optional-permission-generation-2026-09-07`  
Owner: **P1-193 ACTIVE**.

Research/model only. Runtime and manifest are unchanged.

## 1. Canonical owner

Registry defines P1-193 as:

> Optional host permission flow must preserve transient user activation: discovery first, separate immediate grant click, exact candidate document generation.

P1-193 owns permission UX/admission. It composes with:

- **P1-171** exact top/child document targeting;
- **P1-125** exact document receipt for executeScript settlement;
- **P0-045** Incognito fail-closed context;
- **P1-004** cross-origin iframe feature umbrella.

## 2. Current popup combines discovery and permission request in one async click

Current `grantFrameAccessButton` click handler performs, in order:

```text
getActiveSourceTab()
collectCrossOriginFrameOrigins(tab.id)
  -> ensureTopContentScript(tabId)
  -> tabs.sendMessage(frame-access-candidates)
normalize/dedupe origins
chrome.permissions.request({origins})
enableGrantedFrameAgents(tab.id)
```

The permission request therefore occurs only after several asynchronous extension/page operations.

Chrome's official Permissions API documentation requires `permissions.request()` to be called from inside a user gesture. A flow that relies on a long discovery chain still retaining transient activation is not a robust permission-admission contract.

## 3. Required two-stage UX

### Stage A — discovery, no permission prompt

A first explicit user action performs bounded discovery and produces an immutable candidate receipt:

```text
framePermissionCandidate = {
  version: 1,
  candidateId,
  tabId,
  topDocumentId,
  origins: [...bounded normalized origins...],
  discoveredAt,
  incognito: false/true as applicable,
  popup/session generation
}
```

The UI displays the exact origin set and a separate `Grant access` control.

Discovery may perform asynchronous work because it is not pretending to be the permission gesture.

### Stage B — immediate grant click

The separate grant button's click handler must invoke `chrome.permissions.request()` immediately from the gesture using the already-discovered origin list. No network/content discovery/config reads should precede the permission request in that click path.

## 4. Exact top-document generation

The candidate belongs to one exact top document, not merely `tabId` or URL.

Current code keeps only `tab.id` and later sends `WEBCLIP_ENABLE_FRAME_AGENTS` with that tab id. Worker injection then targets `allFrames` of whichever document is current.

Race:

```text
discover origins in document A
same tab reload/navigate to document B (same URL is possible)
user grants old candidate
worker injects allFrames into B
```

This silently transfers A's discovery authority to B.

Chrome 106+ provides `MessageSender.documentId`, `InjectionResult.documentId`, and `InjectionTarget.documentIds`; project minimum Chrome is 118, so exact-document receipts are available without raising the minimum version.

## 5. Post-grant document check

The permission API grants host origins at extension scope; it does not itself prove that the original candidate document is still current.

After the browser returns `granted=true`, WebClip must compare the current exact top-document generation with the candidate receipt before using the grant to enable frame agents.

```text
if currentTopDocumentId != candidate.topDocumentId:
  -> stale-document
  -> do not inject/enable frame agents for current B
  -> ask user to rediscover on B
```

Do not automatically remove the granted host permission merely because the document became stale; that origin may have been previously granted for other valid uses. The critical invariant is that stale candidate authority is not used to target B.

## 6. Exact worker handoff

`WEBCLIP_ENABLE_FRAME_AGENTS` should receive/reference an exact candidate receipt, not bare tabId.

Worker verifies:

- trusted extension sender;
- candidate/session integrity;
- tab id;
- expected top documentId;
- currently granted origin set;
- P0-045 Incognito rules;
- then injects/commands only under P1-125/P1-171 exact-document semantics.

## 7. Same-URL reload

URL equality is not document identity. Candidate A is stale after same-URL reload B.

This is an explicit deterministic acceptance case because relying on `tab.url` would reproduce the same family of generation bugs already documented in P0-023/P1-125/P1-171.

## 8. Permission denial / partial prior grants

If `permissions.request()` returns false:

```text
-> no frame-agent enablement
-> retain top/same-origin functionality
-> candidate may remain display-only or be discarded
```

If some requested origins were already granted, the request may resolve without a new prompt. Exact document-generation checks still apply.

## 9. Origin set integrity

Existing positive controls remain useful:

- normalize to HTTP(S) origins;
- convert to explicit host permission patterns;
- dedupe;
- maximum 16 origins per request;
- reject mass permission discovery above the bound.

The candidate receipt freezes that exact bounded set. A later page mutation cannot append new origins to the already confirmed candidate.

## 10. Incognito composition

P0-045 owns private-context policy. P1-193 must carry the candidate's private/normal context and fail closed if the grant/use path crosses that boundary.

A candidate discovered in normal document A cannot later authorize injection into Incognito document B even if tab/origin values otherwise match.

## 11. Deterministic model

`project_tools/test_p1_193_optional_permission_generation_model.js` proves:

1. current combined discovery+grant can outlive a transient activation budget;
2. discovery receipt freezes origin set independently of grant gesture;
3. same-tab document B after reload is rejected after grant;
4. exact document A can receive enablement;
5. user denial never enables frame agents.

Model result: `P1-193 optional permission/document generation model: PASS`.

## 12. Runtime acceptance requirements

Future implementation must prove:

1. discovery and grant are separate user actions;
2. grant click calls `chrome.permissions.request()` before asynchronous discovery/config work;
3. candidate receipt stores exact top documentId and bounded origin set;
4. same-URL reload invalidates candidate use;
5. worker does not accept bare tabId as sufficient enablement authority;
6. granted permission is used only after exact candidate-document verification;
7. stale candidate cannot inject into new document B;
8. frame-agent injection then composes with P1-125/P1-171 document receipts;
9. origin set cannot grow between discovery and grant;
10. existing 16-origin and HTTP(S)-only safety bounds remain;
11. Incognito context cannot cross normal/private boundary.

## 13. Status

P1-193 remains **ACTIVE**. Current popup combines long asynchronous discovery and permission request in one click and later enables frame agents by bare tabId.

Runtime/manifest remain `0.9.8`; release remains `NOT READY`.
