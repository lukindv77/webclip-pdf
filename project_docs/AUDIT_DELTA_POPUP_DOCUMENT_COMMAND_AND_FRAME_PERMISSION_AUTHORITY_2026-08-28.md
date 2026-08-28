# Audit delta — popup command / iframe activation authority vs active document generation — 2026-08-28

Source-of-truth `main` before this checkpoint includes `debd34721afcd010bdb4ecc86a8ddbcdd5cf37f3`.

Docs-only checkpoint. Runtime/config/tests/manifest are unchanged.

## Classification

No new P-number is assigned.

Fresh proof refines **P0-070**, **P1-004/P1-171** and composes with **P1-157** permission-prompt settlement. The context-menu source-document delta proved the same class for browser-menu commands; this checkpoint confirms an independent command producer with a longer permission-prompt window.

## Popup `start` is tab-bound, not document-bound

Current popup flow:

1. `chrome.tabs.query({active:true,currentWindow:true})` returns tab A;
2. URL is checked as HTTP(S);
3. `ensureTopContentScript(tab.id)` calls `scripting.executeScript({target:{tabId}, files:['content.js']})`;
4. `enableGrantedFrameAgents(tab.id)` asks worker to inject/enable already-granted frame agents;
5. `chrome.tabs.sendMessage(tab.id, {type:'WEBCLIP_START_SELECTION'})` starts selection.

Any full navigation/reload between these asynchronous steps can replace A with B while keeping the same tab id. The final message has no expected `documentId`.

Same-URL reload is invisible to URL-only validation.

## Popup `read-later` has the same admission gap

`readLaterButton`:

1. resolves active tab;
2. checks captured URL scheme;
3. directly executes `content.js` by tab id;
4. sends `WEBCLIP_COMMAND/read-later` by tab id.

A -> B replacement between query and message silently retargets the user command. If B later reaches save/PDF, P0-070 remains the final irreversible fence, but the command was already admitted against the wrong document.

## Cross-origin frame permission flow creates a longer decision window

`grantFrameAccessButton` currently:

1. gets active tab A;
2. injects top content script by tab id;
3. asks A for `frame-access-candidates`;
4. derives up to 16 origin permission patterns;
5. awaits `chrome.permissions.request({origins})`;
6. after the user grants, calls `enableGrantedFrameAgents(tab.id)`.

The Chrome permission prompt is user-owned and may remain open for an arbitrary practical duration. During that time tab A can reload/navigate to B.

The host permission itself is permission for the explicitly shown/requested origins and is not automatically invalid merely because A navigated. The problem is the **page-scoped post-grant activation**: WebClip can enable/inject frame agents into whatever document B now occupies the tab without proving that B is the page for which the popup collected candidates and initiated the request.

This can make one UI decision span two page generations:

- candidate/intent generation A;
- activation/selection generation B.

## Existing permission timeout issue remains separate

The same popup wraps `chrome.permissions.request()` in generic `readPopupExtensionApiBounded()` with the default 10-second deadline.

P1-157 already records that a user-owned permission prompt cannot be treated like a cancellable read: local timeout does not cancel Chrome's actual request and can permit a second prompt/retry over unknown settlement.

This checkpoint does not create another timeout item. It adds the required **document receipt carried across the actual permission settlement**.

## Required popup command receipt

At active-tab resolution, create/capture an exact top-document receipt containing at least:

- tab id;
- exact top document id/navigation generation;
- canonical URL;
- popup command generation.

Every later page-targeted step must consume that receipt:

- top content-script injection;
- frame-candidate collection;
- post-permission frame-agent activation;
- start/read-later command delivery.

If the original document disappears, do not automatically reinterpret the action for replacement B. Return stale-document and require a fresh popup action on B.

## Permission grant vs activation distinction

If Chrome settles the host grant after A has disappeared, WebClip should preserve truthful permission state — the origins may now genuinely be granted in Chrome.

But it must **not** use that late grant as authority to activate a replacement page automatically.

A safe outcome is:

- report/remember that the requested origin permission settled;
- invalidate the old page activation receipt;
- require a fresh command on the current document before frame agents are enabled/selection begins there.

This is the same actual-settlement-vs-authority separation used elsewhere in the project.

## Required regressions

1. Popup Start resolves A -> same-URL reload B before injection -> B does not silently enter selection.
2. A -> B between injection and `WEBCLIP_START_SELECTION` -> stale result; no B command.
3. Read Later resolves A -> same-URL B before final message -> no B save operation.
4. Frame candidates collected from A -> permission prompt remains open -> B replaces A -> user grants -> grant state is truthful but B frame agents are not automatically activated under A's receipt.
5. Fresh popup action on B after the grant can use current permission normally under a new document generation.
6. Cross-URL navigation to another HTTP(S) page is rejected even though tab id is unchanged.
7. Late `scripting.executeScript()` settlement from A cannot satisfy B's exact-document injection request.
8. Permission request local timeout followed by late grant remains single-flight/actual-settlement under P1-157 and still cannot activate stale page generation.
9. Journal-open buttons retain their own explicit source-context semantics and are not treated as page mutation commands.

## Duplicate check / numbering

No new item is created.

- **P0-070** owns exact live top-document identity for the save/command generation.
- **P1-004/P1-171** own cross-origin frame activation/registry/child document binding.
- **P1-157** owns non-cancellable permission prompt settlement.
- The context-menu delta `AUDIT_DELTA_CONTEXT_MENU_DOCUMENT_COMMAND_AUTHORITY_2026-08-28.md` is the sibling producer-path proof, not a replacement for this popup-specific permission window.

## Test / release state

Docs-only checkpoint. Product tests were not rerun. Historical **88/88 JavaScript syntax + 74/74 deterministic tests PASS** remains previous evidence only. Real popup/permission/unpacked-Chrome navigation QA remains required. No build, tag or Release was created.
