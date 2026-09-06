# P1-171 — exact top + child document generation for cross-origin frame registry commands

Date: 2026-09-06
Baseline: `main` = `d4f5b268fa3f7ced5a7bc68da52784863d614138`
Status authority: `project_docs/RESEARCH_REGISTRY.md`
Scope: research only; runtime/manifest/Registry are unchanged by this branch.

## Registry owner

P1-171 remains ACTIVE. Its root cause is command/registry authority for cross-origin frame agents: a reused `frameId` after navigation must not let a stale command intended for document A reach document B. The owner also composes the top-level document generation with the child document generation so stale top-document callers cannot control a newer frame session merely because the tab id is unchanged.

This document does not close P1-171. It defines a source-bound architecture and deterministic acceptance model for later runtime implementation and real Chrome evidence.

## Fresh current-source proof

### Positive control: child registration already records document identity

The service worker keeps `frameAgentsByTab`, a per-tab registry keyed by `frameId`. A child frame registration is accepted only for a positive child `frameId`, and the registry record contains the sender's browser `documentId` along with URL/origin/snapshot/phase metadata.

This is the correct direction: the implementation already knows that child document identity is available and useful.

### Positive control: incoming state is document-bound

`WEBCLIP_FRAME_AGENT_STATE` is forwarded only after comparing the currently registered child record with the message sender's `documentId`. A late message from the previous child document therefore does not overwrite the current record merely because it came from the same `frameId`.

Top content also stores remote records with both `frameId` and `documentId`, and it resets rather than preserves the old snapshot when a frame record changes document identity.

These are important positive controls and must survive the eventual implementation.

### Gap 1: LIST loses top-document authority

`WEBCLIP_FRAME_AGENT_LIST` accepts a top-frame content sender and calls the per-tab registry listing by `sender.tab.id`. The result is therefore scoped to the tab but not to the exact top-level `sender.documentId` that requested the list.

A same-URL top-level reload can keep the same tab id while replacing the physical document. A stale caller from old top document A must not be allowed to consume or target a frame registry owned by new top document B.

### Gap 2: TARGET loses expected child document identity

Top content stores `remote.documentId`, but `targetRemoteFrame()` sends the worker only the child `frameId`.

The worker TARGET handler then calls the frame-command helper with `(tabId, frameId, command, payload)`.

That helper looks up whichever registry record currently occupies that frame id and calls `tabs.sendMessage` using `frameId` targeting only.

Therefore the caller's observed child document identity is discarded before the privileged transport boundary.

### Gap 3: same frameId can legitimately belong to a new document

A frame id identifies a frame/browsing context, not an immutable loaded document. Cross-document navigation or reload can replace child document A with B while preserving the frame id.

Current-shape schedule:

1. top document T-A observes child document C-A in frame F;
2. top records `{frameId:F, documentId:C-A}`;
3. child navigates/reloads and F now hosts C-B;
4. registry becomes or is about to become `{frameId:F, documentId:C-B}`;
5. stale T-A code sends TARGET with only F;
6. worker looks up the current F record and sends to F;
7. C-B can receive a command that was authorized against C-A.

URL/origin equality does not repair this. Same-URL reload is still a new document generation.

### Gap 4: tab cleanup is not a document-generation fence

The worker removes a frame registry on tab removal and on selected tab URL updates. This is useful hygiene but cannot be the authority model:

- a same-URL reload may not provide a new URL string;
- child-only navigation does not require a top tab URL change;
- cleanup can race commands.

Correctness must come from exact document receipts, with cleanup only reducing stale memory.

## Browser primitives available at the existing minimum version

The project minimum is Chrome 118.

Chrome exposes `MessageSender.documentId` from Chrome 106. `tabs.sendMessage()` also supports a `documentId` option from Chrome 106. `chrome.scripting` exposes `documentId` on `InjectionResult` and supports targeting by `documentIds` from Chrome 106.

Therefore P1-171 does not require raising the product's current minimum Chrome version merely to obtain exact document identity/targeting.

No new broad permission is required for these primitives beyond the extension's existing messaging/scripting capabilities.

## Required conceptual receipt

A stale caller must not possess a capability that means only “current frame F”. A command must be bound to the exact observation/admission that produced it.

Conceptually:

```text
FrameAgentReceipt V1
  version
  tabId
  topDocumentId
  topSessionId
  childFrameId
  childDocumentId
```

Optional URL/origin fields may be included for diagnostics or bounded matching hints, but they are not identity fields.

`topSessionId` is worker-issued correlation/ownership for one admitted top-document session. It does not replace browser `documentId`; the two compose:

- `topDocumentId` proves physical top document generation;
- `topSessionId` prevents a stale logical frame registry/list receipt from being silently reused inside that document after explicit invalidation/rebootstrap.

Do not infer a top session from textual URL equality.

## Admission and command rules

### Rule A — exact top caller

LIST/TARGET from content must be accepted only for the exact top document that owns the frame session.

At a minimum, worker authority derives from real `sender.tab.id`, `sender.frameId === 0`, and real `sender.documentId`.

A top document receipt supplied in the message is not self-authenticating; it must be compared with browser sender metadata and worker-owned session state.

### Rule B — exact child observation

Every targetable remote-frame record returned to top content must include an immutable child `documentId` receipt.

Top content must return that expected child identity when asking the worker to command the frame.

### Rule C — compare before transport

Before any child command, the worker must compare:

- current/admitted top session versus the real top sender;
- expected child `documentId` versus the current registry record for `childFrameId`;
- the receipt/session generation if one is used.

Mismatch is terminal for that command. It must not be repaired by updating the stale request to the current record.

### Rule D — exact Chrome targeting

After the comparisons, the actual Chrome transport must target the specific child document, not only the frame browsing context.

Use the exact browser-supported document targeting primitive. There must be no fallback of the form:

```text
send expected C-A
-> C-A missing/stale
-> retry current frameId F
-> accidentally command C-B
```

A stale-document failure causes resync/reselection, not retargeting.

### Rule E — registration/session ownership

Child records should be associated with one admitted top-frame session rather than floating globally under only `tabId`.

The implementation may realize this through an explicit top-session bootstrap plus child injection/registration receipts. The important invariant is not a particular data structure; it is that an old top document cannot acquire command authority over a new top document's child registry merely because both used the same tab.

Where `chrome.scripting.executeScript()` is used to bootstrap child agents, its returned `InjectionResult.documentId` can serve as browser evidence for the exact child documents into which bootstrap succeeded. The eventual implementation must still account for races between injection result, self-registration and later navigation; browser evidence must be compared, not merely logged.

## No URL/origin authority

URL and origin remain useful for:

- mapping a remote agent record to a visible iframe element;
- diagnostics;
- permission/UI presentation;
- bounded re-discovery after explicit resync.

They cannot authorize TARGET, PRINT, RESTORE or selection mutation.

Regression examples:

- child reloads the same URL: old receipt fails;
- child A -> B -> A: old A receipt still fails if the physical document id differs;
- two same-origin/same-URL sibling frames: only exact frame/document receipt may be targeted.

## Command classes covered

The exact-document transport invariant applies to every privileged frame-agent command, including at least:

- selection start/mode/clear/restore;
- get-state/snapshot reads whose result becomes authority;
- prepare-print / restore-print;
- any future per-frame resource/readiness or print-height command.

A read result from the wrong document can be as harmful as a mutation if later code uses it as authorization to print or restore.

## Restart and stale registry semantics

Worker restart or registry loss is not permission to reconstruct identity from URL/origin.

Safe outcomes are:

- exact re-registration/rebootstrap under the current top document;
- explicit resync;
- fail closed until current child document identity is re-established.

Stale records may be retained briefly for diagnostics or cleaned eagerly; neither choice changes the authorization rule.

## Composition with neighboring owners

### P1-150

P1-150 owns whether a *selected iframe/reference* is still live after in-frame navigation at selection/print admission. P1-171 supplies exact command transport; it does not by itself decide whether old user selection should remain valid on the new child document.

### P1-125

P1-125 owns extension-page/source-tab commands binding the exact top-level source document generation. P1-171 uses the same browser top document identity concept for frame registry commands, but does not absorb Journal/Open/Apply source-tab command semantics.

### P0-080

P0-080 owns same-document SPA/application generation. Browser `documentId` deliberately does not replace that owner. P1-171 is primarily cross-document top/child replacement and frame-command transport.

### P0-070

P0-070 owns end-to-end source document authority through the PDF render cut. When selected cross-origin frames contribute to that render, P1-171 exact child targeting is one prerequisite receipt in the larger P0-070 provenance chain.

### P1-003 / P1-187

Resource readiness and flattened-frame rendered-state completeness remain separate. Correctly targeting C-A does not prove that C-A's resources/canvas/rendered state are complete.

## Deterministic acceptance schedules

1. T-A/C-A/F registered -> exact receipt -> command reaches C-A.
2. C-A -> C-B navigation with same F -> stale C-A command is rejected before transport.
3. Same-URL child reload -> stale receipt rejected.
4. T-A same-URL reloads to T-B -> stale T-A LIST/TARGET rejected.
5. T-A -> T-B -> textual URL A again -> old physical document/session receipt never revives.
6. URL/origin identical but child document id differs -> reject.
7. New T-B/C-B receipt -> command succeeds with exact document targeting.
8. Late C-A state event after C-B registration -> existing inbound document-id guard continues to reject it.
9. Worker restart -> URL-only registry reconstruction cannot authorize command; explicit resync is required.
10. Chrome transport reports target document missing -> no frameId-only retry.

## Required real Chrome evidence before closure

Research/model PASS is insufficient.

Real unpacked Chrome acceptance should include:

- nested cross-origin iframe navigation while selection mode is active;
- same-URL child reload with frameId reuse;
- top same-URL reload while a stale frame command is queued;
- multiple same-origin/same-URL child frames;
- navigation during `prepare-print`;
- worker suspension/restart between LIST and TARGET;
- explicit proof from recorded browser sender/target document IDs that no stale command was delivered to the replacement document.

## Source-bound implementation gate

`project_tools/test_p1_171_frame_registry_document_generation_source.js` is intentionally RED on the current runtime. It should turn green only when the committed source makes the exact top+child document contract mechanically visible and preserves the current inbound-state positive controls.

## Status

Architecture-saturated for the current baseline, but P1-171 remains ACTIVE.

No runtime change, manifest change, Registry status change, PR, merge, build, tag or release is performed by this research branch.
