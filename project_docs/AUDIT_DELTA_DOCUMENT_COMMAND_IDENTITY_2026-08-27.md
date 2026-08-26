# Document / command identity audit delta — 2026-08-27

Baseline source HEAD: `1ad02e5f0da6ad0402f23e81c7108720469797a8`.

This checkpoint records fresh evidence against existing document/navigation P-items. It is not a canonical registry replacement and does not assign a new P-number. Production/runtime/config/manifest are unchanged by this commit.

## Existing P1-175 refinement — generic privileged page-command dispatch is not document-bound

P1-175 currently describes stale Journal source-tab application. Fresh review confirms the same admission weakness in ordinary context-menu and popup commands.

### Context menu

`handleContextMenuClick(info, tab)` receives a tab snapshot when the user clicks the menu, but for page commands it subsequently performs asynchronous `ensureWebClipContentScript(tab.id)` and finally `chrome.tabs.sendMessage(tab.id, { type: 'WEBCLIP_COMMAND', command })` using only `tabId`.

Affected commands include at least:

- `start` / `auto-content`;
- `mode-include` / `mode-exclude`;
- `suggest-ads` / `clear` / `finish`;
- `download` / `yandex` / `retry-yandex`.

`content.js` confirms these commands are not inert notifications: they mutate selection state, open save workflows and can trigger cached-PDF retry. Navigation can therefore occur after the context-menu click but before injection/send, causing the user's command to execute in a different current document/site.

Required extension:

- Capture exact source document identity/generation at user-command admission, not merely `tabId` and a URL string.
- Immediately before any injection/send, fresh-check that the same top-document generation is still current; otherwise fail closed with an explicit stale-navigation result.
- Where Chrome supports exact `documentId` targeting, use it for the final message/injection. A tab-level navigation generation remains useful for coordinating code paths that do not expose documentId directly.
- A navigation after user admission must never silently retarget `download/yandex/start/clear/...` to the new document.

This is the same root cause as P1-175's stale source-tab command admission and should be implemented through one shared document-bound command helper rather than separate fixes.

## Existing P0-070 / P0-023 refinement — save/retry commands share the same admission fence

For `download` and `yandex`, the generic command race composes with P0-070: the save command itself can land in a different document before that document asks the worker to generate the PDF. P0-070 must therefore fence the entire save generation from user-command admission through `Page.printToPDF` and post-print cache/download/upload, not only the final debugger call.

For `retry-yandex`, same-URL navigation/reload still composes with P0-023: a cached PDF belongs to the originating document generation, so a new document with the same URL must not inherit retry authority.

Required regression:

1. Context menu `download` on document A → navigate to B before injection/send: B receives no save command and no PDF side effect starts.
2. Same-URL reload between context-menu retry admission and final retry check: old PDF cache is rejected by exact document generation.
3. Navigation after print but before cache/download/upload finalization remains covered by P0-070's post-print generation check.

## Existing P1-125 / P1-171 refinement — script-injection late receipt is keyed too coarsely

`ensureWebClipContentScript(tabId)` calls `executeScriptSingletonBounded({ target: { tabId }, files:['content.js'] }, requestKey=logical content per tab)` without exact document targeting.

`scriptExecutionSettlements` also persists a timed-out late-success receipt under a key derived primarily from tab/target details. `tabs.onUpdated` clears these settlements only when `changeInfo.url` is present, not on a same-URL full-document reload.

Consequences already belonging to P1-125/P1-171:

- an injection started for document A can settle after navigation/reload;
- a same-URL reload does not necessarily clear the logical per-tab late receipt;
- a retry in document B can consume an A-generation late-success receipt and skip a needed B-generation injection, or an old injection can land after the intended command generation has become stale.

Required direction:

- key script-execution receipts by exact top-document generation/documentId where meaningful;
- invalidate per-tab logical injection receipts on every full-document loading/navigation generation, not only URL-string changes;
- a late A-generation success is a receipt for A only and cannot satisfy B-generation admission.

No new P1 number is assigned; this is the already documented scripting/document-lifetime half of P1-125/P1-171.

## Existing P1-193 / P1-171 refinement — optional-permission flow must bind grant candidates to the exact document

Fresh `popup.js` review confirms:

- the grant click obtains `tab = getActiveSourceTab()`;
- discovery injects top `content.js`, sends `frame-access-candidates`, and computes host origins asynchronously;
- `chrome.permissions.request()` is then awaited;
- after grant, `enableGrantedFrameAgents(tab.id)` uses the old tab id without a fresh exact-document check.

P1-193 already requires a two-phase gesture-safe UX and says the candidate set should be bound to source tab/document generation. Fresh evidence shows this is required not only before the permission prompt but **again after the user-owned prompt settles**, because the tab may have navigated while the prompt was open.

Required regression:

- discover candidates on document A → user grants after A navigates to B → permission may remain granted at browser level, but WebClip must not inject/enable A-derived frame agents in B. Candidate generation becomes stale and requires fresh discovery.

## Existing P1-157 refinement — popup still has direct unbounded Chrome operations

Fresh popup review identifies concrete calls outside the existing `readPopupExtensionApiBounded()` helper:

- `startButton`: direct `chrome.tabs.query(...)`;
- `readLaterButton`: direct `chrome.scripting.executeScript(...)` and direct `chrome.tabs.sendMessage(...)`;
- `settingsButton` / `authHelpButton`: direct `chrome.runtime.sendMessage(...)`;
- the user-owned `chrome.permissions.request()` is currently wrapped in an ordinary local deadline helper, which P1-157 already says is incorrect because timeout is not cancellation of a browser permission prompt.

This strengthens P1-157 rather than creating a new item. Reads/idempotent page commands need bounded latest-generation handling; user-owned/non-idempotent prompts need actual-settlement semantics without blind timeout/retry.

## Number allocation

P1-195/P1-196 remain evidence-reserved from the OAuth checkpoint. **P1-197, P0-079 and P2-020 remain unassigned after this block.**

## Test / release evidence

Audit documentation only. No production/runtime/config/manifest change. Product tests were not rerun; the earlier `88/88 syntax + 74/74 deterministic PASS` remains historical release-gate evidence only.
