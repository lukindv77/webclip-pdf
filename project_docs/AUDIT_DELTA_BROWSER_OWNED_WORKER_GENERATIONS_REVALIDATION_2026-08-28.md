# Audit delta — browser-owned state across MV3 worker generations revalidation — 2026-08-28

Source-of-truth `main` immediately before this write: `78145baceefec01990abfb8482731b40ddb40470`.

Docs-only audit checkpoint. Production runtime, tests, configuration and `manifest.json` are unchanged. No new P-number is assigned.

## Result

Fresh current-source revalidation of module-memory receipts/generations did **not** prove a new independent root cause beyond the existing registry. The relevant browser/renderer lifecycles remain correctly partitioned across existing owners:

- **P1-124** — `chrome.tabs.create()` unknown/late settlement receipt must survive MV3 restart; same-worker `tabCreateSettlements` is insufficient;
- **P1-125 / P1-171** — script injection late-success and frame registry must be exact-document generation bound, especially across same-URL reload;
- **P1-203** — already injected cross-origin frame-agent can survive worker restart while the in-memory registry disappears;
- **P1-204** — context-menu destructive rebuild can outlive a worker generation while its in-memory mutation barrier disappears;
- **P1-130 / P1-170** — Chrome Action convergence/admission/fan-out; fresh worker bootstrap refresh is a positive recovery control;
- **P1-156 / P1-169** — prepared Save As durable session survives independently from page/worker in-memory watchers, covered by the new native Save As audit delta;
- **P1-146 / P0-039 / P0-048 / P1-087** — automatic local-download start uses durable intent + DownloadItem recovery; module-memory start settlement is not the sole durable identity.

No P1-211 is allocated.

## `scriptExecutionSettlements` — current code still matches P1-125, not a new restart root

`scriptExecutionSettlements` is module memory and late-success receipts are intentionally one-use/bounded.

Current tab cleanup still does:

- clear on `tabs.onRemoved`;
- clear on `tabs.onUpdated` only when `changeInfo.url` is present.

It does **not** invalidate logical `content:<tab>` / `frame-agent:<tab>:all` receipts on every full-document `status:'loading'` generation. Therefore the known same-URL reload failure remains:

1. executeScript for document A times out locally but later succeeds;
2. same URL reload creates document B without `changeInfo.url` change;
3. A-generation late-success receipt remains under the logical tab key;
4. B-generation admission may consume A's receipt and skip a needed B injection.

This is exactly existing **P1-125/P1-171** and was already documented in `AUDIT_DELTA_DOCUMENT_COMMAND_IDENTITY_2026-08-27.md`.

A worker restart itself clears the module-memory receipt. Fresh review did not prove that this clearing independently authorizes a duplicate irreversible external side effect. Content/frame-agent injection has document-side loaded guards and remains an idempotent capability-installation operation; the correctness requirement is exact document/session generation, not durable persistence of every injection promise.

## `frameAgentsByTab` — worker restart remains P1-203

`frameAgentsByTab` is module memory. Injected child frame agents live in renderer documents and can therefore outlive the worker registry.

Existing P1-203 remains the exact owner because the failure reproduces with the same tab/frame/document and unchanged permission while only the service-worker generation changes. A new worker must re-handshake/reconcile or fail-closed clean old child-local control/print state; it must not infer current authority from frameId/tabId alone.

No additional root was found in this pass.

## Context menus — current source still exhibits P1-204

Current context-menu code retains the useful same-worker barrier:

`contextMenuLateMutationBarrier = actualSettlement.catch(() => {})`

and uses callbacks for Chrome 118 compatibility. It also pre-arms durable repair alarms.

However the mutation barrier and `contextMenuInitializationPromise` are module memory while browser-owned `removeAll()/create()` calls may remain unsettled after the worker disappears. A new worker cannot prove an old generation's destructive remove/create settled before starting a repair generation.

This is the already assigned **P1-204**. Fresh source does not justify a new number.

## Chrome Action — bootstrap reconstruction is a positive control

Unlike the context-menu destructive rebuild, Action state is derived from current extension/Journal/tab state and current module evaluation calls `refreshActionForAllTabs().catch(() => {})` before the context-menu initialization block.

Therefore a recreated worker has an explicit bootstrap convergence path for browser-persisted Action icon/badge/title state.

Residual defects remain existing:

- **P1-130**: admission-cap rejection can skip a tab without creating a bounded repair obligation;
- **P1-170**: all-tabs refresh waves need coalescing/generation and bounded concurrency;
- **P0-045**: Incognito repair must remain neutral/fail-closed without normal-profile Journal reads.

Fresh review did not prove a separate worker-restart receipt blocker for Action state.

## Automatic local download start — module memory is not the sole crash receipt

`automaticDownloadStartSettlements` is module memory and limits same-worker unresolved Chrome start promises to four.

The important difference from current P1-124 tab creation is that the local-download flow writes a durable pending intent before starting the non-cancellable Chrome download, and recovery later searches/binds an own-extension DownloadItem. Existing audit already assigns the remaining exactness gaps to:

- **P1-146** — actual settlement of the non-cancellable start and bounded start admission;
- **P0-048 / P1-087** — exact DownloadItem binding/ownership and ambiguity;
- **P0-039** — unknown physical outcome must not destroy the only recovery evidence;
- **P1-064** — recovery fairness;
- **P1-210** — lost outer response must not invite blind fresh generation.

Fresh review therefore does not extend P1-124 from tabs into downloads merely because both use an in-memory Promise map.

## Prepared Save As — durable state exists, watcher reconstruction remains P1-156

Prepared Save As uses durable `chrome.storage.session` PREPARED/STARTED/RELEASED session keys and an active index, while page/worker DownloadItem listeners live only in their respective JS contexts.

The previous `AUDIT_DELTA_NATIVE_SAVE_AS_LIFECYCLE_2026-08-28.md` already records the exact restart gap: a durable STARTED session can survive while the worker watcher disappears, and current startup/maintenance does not reconstruct it with exact `downloads.search({id})` reconciliation.

This remains P1-156/P1-169 and is not duplicated here.

## Cross-cutting implementation rule

Do **not** persist every module-memory Promise/map mechanically. The required receipt durability depends on the external side effect:

1. If browser/renderer state can outlive the worker **and** a repeated operation can create a second irreversible/non-convergent effect (`tabs.create`, destructive context-menu generation, remote/file operation), retain crash-recoverable exact generation evidence or a proof-based reconciliation protocol.
2. If state is derivable/convergent from authoritative current state (Chrome Action), a bounded bootstrap/repair path can be sufficient.
3. If an installed renderer capability is idempotent but document-bound (`executeScript`), exact document/navigation generation is the primary fence; a stale A receipt cannot satisfy B.
4. If durable subsystem intent already exists (automatic downloads, prepared Save As), recovery should reconstruct from that authoritative intent/receipt instead of treating old worker Promise memory as the durable source of truth.
5. Worker death and local timeout never mean browser cancellation.

## Regression matrix

1. `tabs.create`: worker dies after browser create admission but before same-worker receipt is observed -> retry/reopen reconciles exact durable create generation, never creates a duplicate tab.
2. executeScript: same-URL reload invalidates A-generation late-success; B cannot consume it.
3. executeScript: worker restart with same live document may reinstall/re-register idempotently without assigning an old document receipt to a new generation.
4. frame-agent: same child document survives worker restart -> explicit re-handshake/cleanup, never indefinite orphan state.
5. context menus: old worker remove/create settles after repair worker started -> durable repair generation eventually converges exactly once despite old settlement.
6. Action: worker restart bootstraps current state; no persistent action-generation receipt is required merely to rediscover desired state.
7. Action cap pressure: skipped tab retains bounded repair obligation under P1-130.
8. automatic download: worker dies after `downloads.download()` admission -> durable intent remains and recovery reconciles; no fresh download merely because the in-memory settlement map reset.
9. prepared Save As STARTED survives worker restart -> exact DownloadItem is reconstructed from durable session and terminal cleanup remains idempotent.
10. Across every browser-owned API, timeout/worker death is classified as unknown until an authoritative receipt/reconciliation proves otherwise.

## Duplicate check / numbering

No new P-number is created. P1-201…P1-210 remain occupied; **P1-211 remains unassigned by this block**.

This checkpoint intentionally records a negative duplicate decision so future audits do not re-open the broad but incorrect hypothesis that every worker-memory map requires a new durable-storage item.

## Test / release state

Audit documentation only. Product runtime/configuration and `manifest.json` are unchanged. Product tests were **not** rerun. The last proven product gate remains historical **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. Manifest remains `0.9.8`; no build, tag or GitHub Release was created.
