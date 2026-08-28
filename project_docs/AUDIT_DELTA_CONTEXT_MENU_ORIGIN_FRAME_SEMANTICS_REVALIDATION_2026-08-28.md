# Audit delta — context-menu origin-frame semantics revalidation — 2026-08-28

## Scope

Docs-only audit checkpoint against the current `service-worker.js` context-menu path. No runtime/config/manifest change.

No new P-number is assigned. This checkpoint narrows the relationship between **P0-070**, **P1-171**, **P0-017** and the existing context-menu worker-generation item **P1-204**.

## Revalidation result

Chrome context-menu items are registered for `contexts: ['all']`, so an invocation may originate in a child frame and `OnClickData` may contain `frameId`/frame URL information. `handleContextMenuClick(info, tab)` deliberately ignores that frame locator and routes ordinary WebClip commands through:

1. `ensureWebClipContentScript(tab.id)` with a top-frame target;
2. `chrome.tabs.sendMessage(tab.id, { type: 'WEBCLIP_COMMAND', command })` without a frame target.

Fresh audit does **not** classify that omission by itself as a new defect.

The current command vocabulary (`start`, `auto-content`, include/exclude mode, finish, download, Yandex, retry, etc.) is a **tab/top-document WebClip session command**, not a frame-local browser-context action. Cross-origin child-frame editing is an explicit separate capability mediated by top-frame selection state and frame-agent permission/registry handling. Treating `info.frameId` as implicit authority would actually be unsafe: right-clicking an untrusted child frame must not silently grant or bypass the optional-host-permission/frame-agent contract.

Therefore `info.frameId` is event provenance/diagnostic context unless a future product command is explicitly defined as frame-local.

## Important boundary that remains open

This positive result does not make context-menu initiated save document-safe.

After the browser click, the worker injects/messages the **current** top document. A full-document navigation can still occur across command setup and later PDF generation. Once the current content script emits `WEBCLIP_GENERATE_PDF` / `WEBCLIP_SEND_PDF_TO_YANDEX`, exact save authority remains the existing **P0-070** contract: capture the sender document identity/generation and fence the Chromium print/cache/upload/finalization pipeline against navigation.

Likewise, if top-frame selection state addresses a registered cross-origin child frame, exact child document identity/permission generation remains **P1-171/P1-004**. The browser context-menu `frameId` is not a substitute for that registry receipt.

## Required acceptance semantics

1. Invoking a normal WebClip context-menu item over top-frame content and over child-frame content starts the same top-document WebClip session; no child frame receives authority solely from click origin.
2. A child frame without optional host permission cannot become a frame-agent target merely because the context menu was opened inside it.
3. Frame-local actions, if ever added, must be explicitly typed and bind `{tabId, frameId, documentId/navigation generation, permission generation}` rather than reusing the current tab-wide command path.
4. Context-menu initiated save still satisfies P0-070 before/after print; a navigation cannot retarget authorized PDF output.
5. P1-204 browser-owned context-menu rebuild generation remains independent of click-target semantics.

## Classification

- **P0-017** remains context-menu functional parity.
- **P0-070** remains exact live document identity for save/PDF authority.
- **P1-171/P1-004** remain child-frame registry/document/permission authority.
- **P1-204** remains context-menu browser-state rebuild lifecycle across MV3 generations.

No new blocker is justified by `info.frameId` being ignored for the current tab-wide command vocabulary.

## Validation note

Documentation only. Product tests were not rerun. Historical gate remains 88/88 JavaScript syntax + 74/74 deterministic tests PASS until an actual rerun. No build/tag/release was created.