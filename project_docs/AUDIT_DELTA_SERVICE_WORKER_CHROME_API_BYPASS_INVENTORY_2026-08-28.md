# Audit delta — service-worker direct Chrome API bypass inventory — 2026-08-28

Source-of-truth `main` immediately before this write: `4ceb5ab2216a75ac54e9ee2eb9ea1cb4feaa1453`.

Docs-only audit checkpoint. Production runtime, tests, configuration and `manifest.json` are unchanged. No new P-number is assigned.

## Scope and classification

Fresh whole-worker inventory of direct awaited Chrome Extension API operations, focused on distinguishing three classes that must not be conflated:

1. raw calls that are already deliberately contained inside an **actual-settlement mutation owner**;
2. pure reads that should use the bounded-read contract but currently bypass it;
3. browser/document side effects that require operation-specific late-settlement/generation semantics rather than a generic timeout.

Primary existing owners:

- **P1-158** — direct service-worker Chrome reads outside bounded read/prerequisite deadlines;
- **P1-157** — direct extension/page Chrome API/RPC lifetime and side-effect settlement;
- **P1-173** — queued turns behind unresolved serialized actual settlements;
- **P1-170** — all-tab Action refresh fan-out/coalescing;
- **P1-209** — extension-page version refresh generation/ack commit point;
- **P1-125/P1-175/P1-171** — script/page/frame document identity and command dispatch;
- **P1-128/P1-130/P1-131/P1-146/P0-063** — subsystem-specific examples of correct actual-settlement ownership.

No new P-number is required. P1-211 remains unassigned.

## Important audit rule — raw `chrome.*` inside an actual settlement chain is not automatically a defect

Several current functions intentionally place non-cancellable Chrome Storage calls inside one promise representing the **actual operation**, retain that promise to physical settlement, and expose a separate bounded caller wait.

Examples include:

- Journal context session mutation chain;
- Yandex config serialized mutation chain;
- backup state/pending mutation chains;
- Yandex auth storage operation serialization;
- prepared Save As checkpoint mutation chain.

Inside such a turn, the raw `chrome.storage.get/set/remove()` must be allowed to determine actual settlement. Wrapping each individual call in a timeout that simply abandons its real promise would weaken ordering.

The correct open problem there is usually P1-173: limit/coalesce **waiting turns** behind a genuinely unresolved actual operation.

This distinction should be preserved during refactoring. “Replace every raw `chrome.*` with Promise.race” would regress the codebase.

## Positive example — Journal context mutation owns actual Storage settlement

The worker comment and implementation around `journalContextMutationChain` explicitly state the intended model:

- session storage mutations are non-cancellable;
- the serialized chain remains bound to actual `get/remove/set` settlement;
- `waitJournalContextSessionOperation(...)` exposes only a bounded wait to `openJournalPage`;
- a caller timeout does not allow a newer context mutation to overtake the unresolved older one;
- Journal tab creation is not started when context persistence has unresolved settlement.

The internal raw `chrome.storage.session.get/remove/set` calls are therefore **not P1-158 bypasses**. They are part of the actual owner.

The remaining queue-pressure issue is P1-173 if repeated callers can build too many waiting turns.

## Positive example — Yandex config mutation chain

The Yandex config serialized helper creates an `actual` promise whose turn does:

1. raw `chrome.storage.local.get('yandexConfig')`;
2. compute mutation;
3. raw `chrome.storage.local.set({yandexConfig: next})`;
4. release serialized turn only from actual settlement;
5. caller receives a bounded `withOperationTimeout(actual, ...)` view.

Again, raw calls here are semantically correct because they define the actual mutation settlement. P1-173 owns admission of waiting turns; P0-074/P0-078 own whether the logical mutation itself is generation-authorized.

## P1-158 confirmed bypass — `readYandexAuthState()` has one unbounded config leg

`readYandexAuthState()` currently executes a `Promise.all` with:

- direct `chrome.storage.local.get('yandexConfig')`;
- bounded/serialized `chrome.storage.session.get(YANDEX_AUTH_KEY)`;
- bounded/serialized legacy `storage.local.get(YANDEX_AUTH_KEY)`.

The direct config read is the only leg outside the auth storage owner.

If that Chrome read never settles:

- the entire auth-state read never settles;
- no access token/config state is returned;
- callers can block before they even enter their network-side deadline/transfer state machine.

This is the exact canonical P1-158 example and remains unfixed.

Required implementation direction: a bounded read helper for the config leg, but no late result may trigger a later network side effect after the parent operation has already terminated. A parent Yandex operation should carry a deadline/remaining budget that includes auth/config prerequisites.

## P1-158 coverage is broader through `getYandexConfig()`

`getYandexConfig()` itself is a direct unbounded:

`await chrome.storage.local.get('yandexConfig')`.

Fresh caller inventory shows it feeds many high-value operations, including:

- cached PDF upload to Yandex;
- exact Journal/Yandex object locate and root fencing;
- Delete→Trash;
- Read Later→Upload move;
- service-folder creation/verification;
- connection/status flows.

Therefore the P1-158 fix cannot be limited to the one `Promise.all` inside `readYandexAuthState()`.

`getYandexConfig()` must itself be replaced by a bounded/current-generation read primitive or become a read from an immutable `YandexOperationContext` established once at operation admission.

For long destructive/network flows the latter is preferable: repeated mutable `getYandexConfig()` calls are not only a deadline problem, they also compose with P0-074 config-generation consistency.

## P1-158 + P0-074 contract for Yandex prerequisites

A robust Yandex operation should capture one immutable current operation context containing the bounded read result for:

- auth generation/token receipt;
- account UID proof state;
- root/config generation;
- publication-policy generation where applicable.

Then later stages consume that receipt rather than repeatedly performing fresh mutable global reads.

This provides two independent guarantees:

- P1-158: prerequisite read cannot hang outside the operation's bounded lifetime;
- P0-074: a late stage cannot silently switch from configuration generation A to B.

A bounded read alone does not solve generation consistency; an immutable context alone does not solve a never-settling prerequisite read.

## Version refresh direct Chrome API block belongs primarily to P1-209, with P1-158 lifetime requirements

`reloadOpenExtensionPagesAfterVersionChange()` directly performs:

1. `chrome.storage.local.get(WEBCLIP_RUNTIME_VERSION_KEY)`;
2. if different, **writes the version marker immediately**;
3. direct `chrome.tabs.query({})`;
4. `Promise.all` over matching extension pages;
5. direct `chrome.tabs.reload(tab.id)` per page.

Previous P1-209 audit already proves the semantic commit point is wrong: a stored version marker cannot mean “all pages are current” merely because reload was requested/settled; current-page generation/version ACK is required.

This pass adds the P1-158 lifetime view:

- initial Storage read/write can hang worker-start refresh;
- `tabs.query` is unbounded;
- `Promise.all` can wait on an unbounded direct reload;
- a single hung reload can keep the whole refresh promise unresolved;
- no per-page bounded/actual-settlement generation receipt exists.

Do not create a parallel new version-refresh item. Implement P1-209 state machine using P1-158-style bounded reads and operation-specific reload/ACK settlement.

## All-tab Action refresh direct `tabs.query` is existing P1-170 coverage

`refreshActionForAllTabs()` still does:

`tabs = await chrome.tabs.query({})`

then:

`Promise.all(tabs.map(updateActionForTab(...)))`.

Individual Action mutations later use P1-130 bounded generation-aware helpers, but the bulk discovery/fan-out step itself is not bounded/coalesced.

This is already P1-170, whose acceptance explicitly requires:

- bounded `tabs.query` via the P1-158 read contract;
- one global refresh generation/coalescer;
- bounded worker pool rather than all-tab Promise.all;
- stale generation skip before expensive Journal reads.

No new direct-read item is needed.

## Direct page-command send remains P1-175/P1-157 rather than P1-158

Context-menu/page command paths still contain direct:

`await chrome.tabs.sendMessage(tab.id, { type:'WEBCLIP_COMMAND', command })`

or `sendWebClipPageCommand(...)` returning a raw tab message promise.

These are not pure reads. They can mutate the content selection/session and start save/retry workflows.

Therefore merely wrapping them in the P1-158 bounded-read helper would be wrong.

They require the exact-document command contract already owned by P1-175/P1-125/P1-171 and the operation-class settlement rules from P1-157:

- exact source document receipt;
- exact `documentId` target where supported;
- bounded response/late response generation semantics;
- save command cannot silently retarget to a replacement document.

## Frame-agent message timeouts are bounded but not document-exact

Worker REGISTER/STATE forwarding and COMMAND calls already use per-call `withOperationTimeout(..., 5s)`.

That closes infinite caller wait for one message, but existing P1-171/P1-200/P1-201 still apply:

- top forwarding uses frame 0 rather than exact top `documentId`;
- child command uses frameId rather than exact child document generation;
- permission/session/print generation ownership is separate from timeout.

This is an example of why “has a timeout” must not be confused with “has correct authority/settlement”.

## Post-print diagnostics is bounded but document identity remains P0-070/P1-147

`collectPrintDiagnosticsForTab(tabId)` wraps `tabs.sendMessage` in a 5-second timeout, so it is not an infinite P1-158 wait.

However it targets only tabId. Previous PDF provenance audit proves a replacement document B can answer diagnostics for PDF A.

That remains P0-070/P1-147 exact-document truth, not P1-158.

## Journal stats marker raw calls are inside a serialized mutation owner

`beginJournalStatsMutation()`, `completeJournalStatsMutation()` and the final marker compare/remove inside stats repair perform raw `chrome.storage.local.get/set/remove()` **inside** `queueJournalStatsMarkerMutation(...)`.

Those raw calls define the actual serialized marker transition and should not be replaced by abandon-on-timeout wrappers independently.

P0-050 still owns the higher-level derived-index generation/isolation race; P1-173 owns waiting-turn admission if the serialized Chrome operation hangs.

## Backup state raw calls are also inside actual serialized turns

`journalBackupState` mutation fresh-reads current state inside `mutateChromeStorageSerialized(...)`, then writes the new state within the same actual turn.

This is a positive ordering pattern: queued update observes the physical settlement of older write.

The relevant open items are generation semantics of scheduler/pending backup and P1-173 queue admission, not P1-158 read bypass.

## Recommended shared API taxonomy

### A. Bounded pure reads

Use one common helper for:

- `tabs.get/query` when they are observation only;
- `storage.get` used only to read current state;
- permission contains/read checks;
- other Chrome read-only APIs.

The helper can abandon a late result, but the parent operation must not start a later side effect from that abandoned result.

### B. Serialized non-cancellable mutations

Use an actual-settlement chain/receipt:

- raw Chrome mutation promise remains owned to settlement;
- caller may get bounded `pending/unknown` result;
- new conflicting turn is capped/coalesced per P1-173;
- logical generation/CAS checked separately.

### C. Browser-owned side effects with observable receipts

Examples:

- tabs.create;
- scripting.executeScript;
- downloads.download;
- debugger attach/detach;
- Action mutations.

Use subsystem-specific actual settlement + late receipt/repair, not generic Storage serialization.

### D. User-owned browser prompts

Examples: permissions.request, native Save As.

Do not impose arbitrary semantic caller timeout while the user owns the browser prompt. Preserve owner/liveness/reconciliation separately.

## Required deterministic regression matrix

1. `chrome.storage.local.get('yandexConfig')` never settles inside `readYandexAuthState` -> controlled bounded failure; upload/recovery does not hang before network deadline.
2. Same never-settling read through direct `getYandexConfig()` caller in upload -> controlled failure and no remote side effect.
3. Same through destructive Delete/Mark Read prerequisite -> fail closed before remote mutation.
4. Config read settles after caller operation deadline -> late value does not resume/start network mutation.
5. Serialized Yandex config mutation raw `get/set` remains bound to actual settlement; caller timeout cannot let B overtake A.
6. Repeated callers behind hung serialized mutation are capped/coalesced per P1-173 rather than each getting independent raw mutation.
7. Version refresh Storage read never settles -> worker start remains otherwise functional; refresh is bounded/retryable and no false completed version marker is written.
8. Version refresh `tabs.query` never settles -> P1-209 pending generation remains pending, not completed.
9. One extension-page `tabs.reload` never settles -> other page refreshes/ACK processing are bounded; completed marker still waits for exact required ACK policy.
10. `refreshActionForAllTabs` tabs query hangs -> one coalesced P1-170 refresh fails/defer boundedly, without unbounded all-tab wave.
11. Direct page-command send to A while navigation B occurs -> exact P1-175 document targeting fails stale; adding a timeout alone is not accepted as a fix.
12. Frame-agent command times out but later child result arrives -> stale session/document generation cannot become current simply because the caller deadline existed.
13. Journal-context Storage mutation caller times out -> later new context cannot overtake actual A settlement; preserve current positive chain behavior.
14. Stats/backup serialized mutations preserve actual-settlement ordering while P1-173 prevents unbounded queued turns.
15. Real Chrome tests deliberately stall/mimic never-resolving read/mutation promises and distinguish pure-read abandon from mutation actual ownership.

## Duplicate check / numbering

No new P-number is assigned.

- **P1-158** remains the bounded pure Chrome read owner; implementation must cover `getYandexConfig()` broadly, not only the one auth `Promise.all` leg.
- **P1-170** owns all-tab Action query/fan-out.
- **P1-209** owns version refresh completion/ACK state machine, consuming bounded read/reload primitives.
- **P1-157/P1-175/P1-125/P1-171** own direct page/browser side-effect/command classes.
- **P1-173** owns queue-turn admission behind actual mutation settlement.

P1-211 remains unassigned by this block.

## Test / release state

No runtime/config/manifest changes were made. Product tests were not rerun. The last proven product gate remains historical **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. No build, tag or GitHub Release was created.
