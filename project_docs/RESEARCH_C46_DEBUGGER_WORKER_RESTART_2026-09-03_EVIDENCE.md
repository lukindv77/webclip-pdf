# C46 accepted evidence — forced MV3 worker restart with live `chrome.debugger` session — 2026-09-03

Canonical production baseline: `fe0da4e8eb1d6658ac84872e7d0505a503ff177d`.

## Classification

**C46 remains `L4-REVALIDATED / PARTIAL/FINDING`.** This tranche adds a bounded **FORCED-WORKER-RESTART / LIVE-PRODUCTION-DEBUGGER / LOST-LOCAL-REGISTRY / SURVIVING-BROWSER-SESSION / SECOND-PRODUCTION-PDF** finding.

No runtime, manifest version, release state or Registry owner/status changes are made. Native permission UI, normal/incognito authority, permission revoke/regrant and full interactive/browser-process restart remain open L5 boundaries.

## Why this tranche exists

The preceding C46 target-close control proved that destroying the *debugged tab* while production guarded print is unresolved fails closed and converges the same worker's debugger registries.

That does not answer the opposite lifecycle question: what happens if the **extension MV3 service worker itself** disappears while Chrome still owns an attached debugger session?

Current production `service-worker.js` keeps debugger ownership only in module memory:

- `debuggerActiveTabs`;
- `debuggerLateAttachCleanupByTab`;
- `debuggerPendingDetachByTab`;
- `debuggerPendingActualSettlements`.

A new service-worker instance therefore starts with those structures empty. Current source has no durable debugger-session ownership record and no startup reconciliation against `chrome.debugger.getTargets()` before admitting another generation.

Chrome's documented lifecycle is relevant to the precision boundary: since Chrome 118 an **active `chrome.debugger` session keeps an extension service worker alive**, while extension service workers must nevertheless be designed to tolerate unexpected termination and global variables are lost when a worker shuts down. This tranche therefore exercises **forced/unexpected worker termination resilience**, not ordinary idle timeout behavior.

## Accepted browser execution

Accepted harness source at evidence time:

- `project_tools/research_c46_worker_restart_v2.mjs`;
- exact evidence head: `886ed316de3c5e7835b29c5a30e1f486d8ec4119`.

Accepted GitHub Actions execution:

- workflow: `Research C46 Worker Restart V2`;
- run: `33749482776`;
- job: `100629495317`;
- conclusion: **SUCCESS**;
- runner: Ubuntu `24.04.4`, runner `2.337.0`, image `20260823.283.1`;
- Node: `22.23.2`;
- Puppeteer: `25.9.0`;
- browser: Chrome for Testing `152.0.7977.54`.

Receipt integrity:

- result text SHA-256: `0d16d066bd6780d3e39996349193ea951c3479fdedb6c473d79adceaae020a40`;
- artifact: `c46-worker-restart-v2-receipt`;
- artifact id: `9890994444`;
- artifact size: `919` bytes;
- artifact ZIP digest: `sha256:e62bd81598b91caa3fe187ef2bd210239c46d69c95f87ccc70343d3026d3c431`.

## Automation-contamination exclusion

An earlier development run reproduced the same stale-session behavior but was retained only as diagnostic provenance because its first fixture could theoretically begin while Puppeteer's TargetManager was still connected.

The accepted v2 harness adds an explicit HTTP start gate:

1. Puppeteer launches only to install/discover the unpacked MV3 extension and capture the browser WebSocket endpoint.
2. Node records `disconnectedAt=1788434672851` and completes `browser.disconnect()`.
3. Only then is the HTTP gate opened at `gateAllowedAt=1788434672853`.
4. The extension cannot create the first product fixture until that gate is open.
5. The first fixture is created at `firstCreateAt=1788434673390`, **537 ms after gate opening and after Puppeteer disconnect**.
6. `chrome.debugger.getTargets()` proves `firstAttachedBefore=false` before production generation.
7. Unchanged production `generatePdfBlob(firstTabId)` then attaches the debugger; at the worker-kill boundary `isAttached=true`.

The accepted finding therefore does not depend on a Puppeteer debugger attachment to the product tab.

## Forced worker replacement

After the production debugger session is established, a raw **browser-level CDP** connection identifies the extension's exact service-worker target and calls `Target.closeTarget` on that worker target only.

Receipt:

- old service-worker target id: `1C7B6217DF28E93D870B1A557BDC10F3`;
- close result: `{success:true}`;
- after a normal tab event wakes the extension, new service-worker target id: `E9D54C7CC569E3DC81B4372A2136A6AC`;
- first worker stamp: `f03c17f0-dd37-4552-b063-656cbd07026f`;
- second worker stamp: `6932875d-2817-4ea7-9107-c5d988755864`;
- `workerStampChanged=true`.

This proves a genuine new MV3 worker instance rather than re-entry into the same module instance.

## Fresh finding — browser debugger session survives while product ownership disappears

Immediately after the new worker starts:

- old debug target still exists: **true**;
- Chrome still reports the old target debugger attached: **true**;
- new worker `debuggerActiveTabs.size`: **0**;
- new worker `debuggerLateAttachCleanupByTab.size`: **0**;
- new worker `debuggerPendingDetachByTab.size`: **0**;
- new worker `debuggerPendingActualSettlements.size`: **0**.

The old session is not merely a stale `attached` flag: the new worker successfully sends `Runtime.evaluate` through that already-existing session and receives **`42`**.

Therefore a browser-owned `chrome.debugger` capability created by worker generation A can remain live after A is forcibly destroyed, while worker generation B has no local record that it owns or must reconcile that session.

## Second unchanged production generation is admitted

Without first detaching the surviving old session, the new worker creates a fresh admitted fixture and calls unchanged production `generatePdfBlob(secondTabId)`.

Receipt:

- second production content render-state listener: **true**;
- second target debugger attached before generation: **false**;
- second generation outcome: **resolved**;
- physical PDF bytes: **16064**;
- header: **`%PDF-`**;
- second target attached after normal generation: **false**;
- old first target still attached after the second PDF: **true**;
- all four new-worker debugger registries remain empty/clean after the second operation.

This is the core restart-reconciliation failure: generation B's admission fence is based on generation B's empty memory, not on the browser's actual live debugger-session state. A second production PDF operation can therefore complete while an orphaned debugger session created by the prior worker generation remains attached to another target.

The harness performs **test-only cleanup only after these observations**: it explicitly detaches the surviving first session and sends render-state cleanup to the first tab. Product code did not perform that reconciliation before admitting the second operation.

## What this evidence does and does not prove

Proved:

- forced replacement of the MV3 worker can leave an extension-owned browser debugger session alive;
- the replacement worker loses its in-memory debugger ownership/accounting;
- the surviving session is still usable through `chrome.debugger.sendCommand`;
- unchanged production admission does not discover/fence that surviving session;
- another unchanged production PDF generation can succeed while the old session is still attached.

Not proved:

- ordinary Chrome idle timeout will kill a worker while `chrome.debugger` is attached — Chrome explicitly documents the opposite since Chrome 118;
- the user necessarily receives duplicate PDFs for one durable intent;
- the old page necessarily remains visually hidden after every such crash schedule;
- browser-process restart preserves the same debugger session;
- native permission, incognito or revoke/regrant behavior.

Those remain separate evidence boundaries.

## Duplicate/root-cause reconciliation

No new P-code is allocated after family-level reconciliation.

- **P1-157 ACTIVE — direct owner.** Its current Registry contract requires class-correct lifetime semantics for extension/content Chrome calls. A live `chrome.debugger` session is browser-owned state whose lifetime outlasts the worker call stack that created it; restart admission must reconcile actual Chrome state rather than treating the new worker's empty memory as proof of no active session.
- **P1-203 ACTIVE — structural supporting precedent.** It already proves the same MV3 authority pattern for injected frame agents: external state can outlive the worker registry, so the replacement worker must re-handshake/reconcile/clean rather than infer absence from empty module memory. P1-203 remains frame-agent-specific and is not broadened here.
- **P1-192 ACTIVE — lifecycle supporting owner.** It governs explicit MV3 lifecycle ownership/fair progress for long background work across wakes, but does not by itself own browser debugger-session reconciliation.
- **P0-070 ACTIVE — supporting generation authority.** A forced worker death interrupts a production PDF generation, but this tranche deliberately does not claim a duplicate durable-intent/PDF outcome for the first operation.
- **P0-071 DONE** remains DONE; no regression of its narrow render-cut guard contract is shown.

A provisional `P1-231` allocation was considered during duplicate search and rejected before canonical write because it would split the existing Chrome API lifetime/restart-reconciliation family rather than identify an independent root.

## Required contract under existing ownership

Before a replacement worker admits a new debugger-backed PDF generation, it must not infer `no active debugger work` solely from newly empty module-memory sets/maps.

The implementation needs a bounded startup/admission reconciliation model that, at minimum:

1. queries actual browser debugger targets/session attachment state relevant to WebClip;
2. distinguishes WebClip-owned orphanable sessions from unrelated debugger attachments without hijacking third-party/user DevTools state;
3. ties any WebClip debugger session to exact tab/document/operation generation and worker-generation recovery authority;
4. either safely adopts and completes/cleans a proven old WebClip session or detaches it before admitting conflicting new work;
5. treats unknown ownership as fail-closed/degraded rather than as proof that no session exists;
6. keeps cleanup bounded and does not create wake/retry loops;
7. preserves normal successful `attach → print → IO close → detach` behavior already proven by preceding C46 controls.

A repair must not simply detach every attached debugger target returned by Chrome because those targets may belong to DevTools or another extension/user-controlled debugging context.

## Remaining C46 exit evidence

C46 stays OPEN. Remaining L5 work includes:

1. actual native optional-host permission prompt from a real popup gesture: denial, grant and actual settlement;
2. real permission revoke/regrant with already injected frame-agent fencing and non-revival of stale session authority;
3. normal/incognito windows with Chrome incognito access disabled/enabled and fail-closed private-state/UI proof;
4. full interactive service-worker/browser restart validation after a product repair/reconciliation model exists;
5. branded interactive Chrome confirmation for browser-owned UI boundaries that managed fixture automation cannot substitute.

Runtime/manifest version remains `0.9.8`. Release remains **NOT READY**.
