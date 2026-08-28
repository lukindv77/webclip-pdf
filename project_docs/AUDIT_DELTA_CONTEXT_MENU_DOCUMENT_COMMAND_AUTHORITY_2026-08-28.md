# Audit delta — context-menu command authority vs source document — 2026-08-28

Source-of-truth `main` before this checkpoint: `4a20a5399ccd60c4e9fed6d59534a7d1c1a2794c`.

Docs-only audit checkpoint. Runtime/config/tests/manifest are unchanged.

## Classification

No new P-number is assigned.

Fresh source proof refines **P0-017** and **P0-070**, and composes with **P0-023**, **P1-125** and **P1-171** document-generation requirements.

The new result is that the document-identity gap starts earlier than `WEBCLIP_GENERATE_PDF`: browser context-menu commands themselves lose the identity of the document on which the user invoked the menu.

## Current context-menu flow is tab-bound

`chrome.contextMenus.onClicked` calls `handleContextMenuClick(info, tab)`.

For ordinary page commands current code:

1. checks captured `tab.id` and captured `tab.url`;
2. calls `ensureWebClipContentScript(tab.id)`;
3. that helper executes `content.js` with `target: { tabId }`;
4. then the worker calls `chrome.tabs.sendMessage(tab.id, { type: 'WEBCLIP_COMMAND', command })`.

Neither the injection target nor the final message target contains the exact top-document `documentId`/navigation generation that existed when the context-menu action was invoked.

The scripting settlement helper is already capable of including `target.documentIds` in its logical key, but this caller does not supply one and explicitly uses request key `content:<tabId>`.

## Deterministic same-URL retarget schedule

1. Top document A is loaded at `https://example.test/item`.
2. User opens the Chrome context menu on A and selects `Скачать PDF`, `Основной контент`, `Прочитать позже` or another page command.
3. Chrome enters `contextMenus.onClicked` and WebClip receives a `tab` object describing A.
4. Before `ensureWebClipContentScript()` / `tabs.sendMessage()` settles, A performs a full reload to document B at the exact same URL.
5. The worker still sees the same `tab.id`; captured URL comparison cannot distinguish A from B.
6. `scripting.executeScript({ target:{tabId} })` installs/observes WebClip in B.
7. `tabs.sendMessage(tabId, WEBCLIP_COMMAND)` is delivered to B.
8. The command the user invoked on A has silently become a command on B.

For selection commands this changes the page/document the user is manipulating. For save commands it composes with P0-070 and can eventually print/cache/finalize B under command intent that originated on A.

## Cross-URL navigation has a second window

The current `handleContextMenuClick()` checks the captured `tab.url`, not a fresh exact document receipt immediately before delivery.

Therefore a cross-URL navigation after the event but before message delivery can also retarget the command. The new URL may still be HTTP(S), so even adding a fresh protocol-only `tabs.get()` check would not prove that the command still belongs to the clicked document.

A URL equality check would remain insufficient because same-URL full reload is the core failing schedule.

## Context-menu semantics are not just “current tab” semantics

The browser menu invocation is a concrete user action on a concrete rendered document. WebClip should not silently reinterpret that action as “whichever document happens to occupy this tab when asynchronous preparation finishes”.

This matters even before an irreversible side effect:

- `start` / `auto-content` can start selection on a page the user did not invoke the menu on;
- `clear` can clear a newer document's WebClip state;
- `finish` / `download` / `yandex` / `read-later` can act on a newer selection/document generation;
- `retry-yandex` additionally composes with P0-023 cached-PDF document identity;
- error notification sent after a failed old command can also target a replacement document, though that is secondary UX rather than the primary authority defect.

## Required P0-017/P0-070 interface

A context-menu page command needs an immutable source-document receipt at admission.

The receipt should bind at least:

- `tabId`;
- exact top `documentId` or equivalent full-navigation generation;
- canonical URL observed for that document;
- command/request generation;
- operation id where the command can lead to an irreversible save.

All later page-targeting steps must consume the same receipt:

1. content-script presence/injection;
2. `WEBCLIP_COMMAND` delivery;
3. selection/save-dialog state that the command opens;
4. final `WEBCLIP_GENERATE_PDF`/cached-PDF operation receipt when applicable.

If Chrome cannot target the original document because it has navigated away, the command must fail closed with a clear stale-document result. It must not be replayed automatically against the replacement document.

## Injection settlement key must include document generation

`scriptExecutionRequestKey()` already knows how to encode `target.documentIds`, but `ensureWebClipContentScript(tabId)` supplies an explicit `content:<tabId>` logical key.

Consequently an unresolved/late injection belonging to document A is logically shared at tab scope with a later request for document B.

The document-bound design should either:

- target the exact document generation and key the singleton receipt by that generation; or
- invalidate/reconcile the old receipt before admitting injection for a replacement document.

P1-125 continues to own generic `scripting.executeScript()` actual-settlement behavior; this delta adds the required document identity of this caller.

## Journal-opening context-menu commands

`journal-url` / `journal-site` use the captured `tab.url` to create Journal source context. They do not directly mutate the page, so they are less severe than page commands, but they still inherit event-time vs later-document semantics.

The product should define the source receipt consistently: a Journal page opened from document A should either remain explicitly a context for A's captured URL/document, or report that the source document became stale. It must not accidentally mix captured A metadata with live B command authority later when `Apply` is used.

Existing Journal exact-document command work remains the owner for downstream Apply behavior.

## Required regression cases

1. Invoke context-menu `start` on A; same-URL reload to B before injection -> B is not silently selected; stale-document result.
2. Invoke `auto-content` on A; navigate to another HTTP(S) origin before message delivery -> command cannot run on B.
3. Invoke `download`/`yandex` on A; same-URL reload before dialog command -> no save operation for B under A's receipt.
4. Invoke `read-later` on A; replacement document before final save -> no PDF/cache/Journal finalization for B.
5. Late `scripting.executeScript()` success for A after local timeout cannot authorize or suppress the exact-document injection required by B.
6. A fresh context-menu invocation on B receives a new document/command generation and works normally.
7. `retry-yandex` after same-URL reload remains constrained by P0-023 cached-PDF document receipt.
8. `journal-url` captures an explicit source context and later Journal Apply cannot use that old context as authority for a replacement document.

## Duplicate check / numbering

No new item is created.

- **P0-017** owns context-menu parity with the main page handlers.
- **P0-070** already owns exact live-document identity for save/PDF authority; this checkpoint moves the required fence earlier to context-menu command admission.
- **P0-023** remains cached-PDF retry document identity.
- **P1-125** remains generic scripting late-settlement ownership.
- **P1-171** remains cross-origin child-frame registry/command document binding.

## Test / release state

Docs-only audit checkpoint. Product tests were not rerun. Historical **88/88 JavaScript syntax + 74/74 deterministic tests PASS** remains previous evidence only. Real unpacked Chrome same-URL context-menu navigation QA remains required. No build, tag or Release was created.
