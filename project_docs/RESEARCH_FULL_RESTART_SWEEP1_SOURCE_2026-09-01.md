# WebClip — fresh full-project research restart — Coverage Sweep 1 source checkpoint — 2026-09-01

Date: 2026-09-01

Fresh research baseline: canonical `main = 94dd11a312a7e125ba74fa2a49e06938f674e0cd`.

Campaign anchor: `RESEARCH_FULL_RESTART_2026-09-01_BASELINE.md`.

Campaign state: **DEEP-RESEARCH-IN-PROGRESS / FRESH-RESTART**.

This checkpoint is a fresh **L1 source sweep** of the current tree. Historical evidence was used only for duplicate/root-cause reconciliation. No historical PASS was credited as a fresh campaign PASS. No owner/status transition is made here.

## 1. Scope and method

The sweep re-read the execution chain from extension entrypoints through B1…B9:

`manifest / popup / content injection -> selection/admission -> frame authority -> print preparation -> Chromium renderer -> cache/download/Yandex -> Journal/backup/recovery -> later-reading truth`.

For each observation the question was: does current source satisfy the current mission/PDF/security contract, does it refine an already ACTIVE owner, or does it prove a regression of a DONE owner?

Result: **no new P-code is warranted by Sweep 1, and no DONE owner is reopened by source evidence in this checkpoint.** Several ACTIVE owners are freshly re-demonstrated on the exact current source.

## 2. Block 1 — manifest / extension entrypoints / permission boundary

Current `manifest.json` is MV3, version 0.9.8, Chrome >=118, with `activeTab`, `scripting`, `downloads`, `debugger`, `offscreen`, `storage`, `alarms`, `contextMenus`, `tabs`; Yandex hosts are persistent and arbitrary HTTP(S) page hosts are optional.

The manifest points directly to `service-worker.js`. This initially looked as though several later guard files might be dormant. Fresh bootstrap tracing **rejected that hypothesis**:

- `service-worker.js` synchronously imports `journal-text-filter.js` before ordinary worker body execution;
- worker-only code in `journal-text-filter.js` synchronously imports `pdf-print-guard.js`, `content-injection-guard.js`, `operation-log-redaction-guard.js`, then `journal-restore-envelope-guard.js`;
- `popup.html` loads `content-injection-guard.js` before `popup.js`;
- `offscreen.html` loads `offscreen-blob-admission-guard.js` before `offscreen-bootstrap.js`, and bootstrap fails closed before loading `offscreen.js` if guard installation is unavailable.

Therefore the source topology does **not** demonstrate a bootstrap regression of the narrow closures represented by P0-065/P0-067/P0-071/P0-077. Fresh L2/L3/L4 evidence is still required before this new campaign credits their historical behavior as a fresh PASS.

## 3. Block 2 — popup current-tab / private-context authority

Fresh source re-demonstrates **P0-045 ACTIVE**.

Positive control: worker `assertRuntimeMessageSender()` rejects Incognito content-script data/save commands, except explicitly safe cache invalidation/settings transition. Journal opening also contains private placement/source checks.

Unclosed extension-page/Action paths remain:

- popup startup calls `loadBackupStatus()` before classifying the active tab, so a contextual Incognito popup can request normal shared backup state;
- explicit frame-access flow checks HTTP(S) but not `tab.incognito` before discovery / optional host permission request;
- Start injects top content and enables frame agents without an Incognito gate;
- trusted extension-originated `WEBCLIP_ENABLE_FRAME_AGENTS` accepts a tab id without a fresh non-Incognito target receipt;
- `updateActionForTab()` treats HTTP(S) as sufficient for Journal summary lookup and does not carry an Incognito classification into the read.

Fresh root decision: existing P0-045, no new owner.

## 4. Block 3 — content injection/bootstrap ordering

`content-injection-guard.js` rewrites any `chrome.scripting.executeScript` request containing `content.js` so the prefix is:

`frame-proxy-budget-guard.js -> frame-proxy-inert-guard.js -> host-control-activation-guard.js -> content.js`.

Both popup and worker install the rewrite guard before using content injection. Existing deterministic tests also contain repository-binding assertions for this ordering; they are not counted as fresh L2 until exact-head CI for this restart checkpoint executes.

Rejected hypothesis: closure guards being present as files but absent from production injection. Current source does not support that claim.

## 5. Block 4 — manual Include/Exclude authority

Fresh source re-demonstrates **P1-154 ACTIVE**.

Top-document `addInclude()` / `addExclude()` have no aggregate 250-item admission cap. `serializeSelectionSnapshot()` later returns:

- `includes.slice(0, 250)`;
- `excludes.slice(0, 250)`.

Thus a live selected PDF scope can exceed the portable durable SelectionSnapshot representation and be silently truncated after the user's intent already exists. Remote frame agents separately cap local frame selections, but that does not close the aggregate top+remote divergence.

Positive controls: Exclude can only be created within Include; selecting a larger Include preserves nested Exclude; visually overlapping independent Includes are rejected.

Fresh root decision: P1-154, no new owner.

## 6. Block 5 — SelectionSnapshot restore admission

Fresh source re-demonstrates **P1-001 ACTIVE**, with P0-080 supporting stale-generation consequences.

V3 locator resolution has score/margin ambiguity handling and bounded first-5000 tag candidate enumeration. However final rendered admission is `isUsableCandidate()`, which only requires a top-projected bounding box of at least 2x2 CSS pixels.

It does not reject `visibility:hidden`, `opacity:0`, fully occluded/non-rendered cases or otherwise prove that the current target corresponds to a meaningful visible rendered target. Structural matching can therefore still produce an apparently successful restore for a physically absent representation.

Positive controls: ambiguous close V3 candidates fail closed; remote restore returns explicit failure/ambiguity counters.

Fresh root decision: P1-001/P0-080, no new owner.

## 7. Block 6 — Main Content / automatic admission

Fresh source re-demonstrates **P1-160 ACTIVE**.

`detectMainContent()` scores semantic and heuristic candidates. If the best score is below 900 it performs a fallback pass including `main/article/[role=main]` and ultimately `body`, but there is no final minimum-confidence or ambiguity requirement before returning `best`.

Equal-score candidates use first traversal winner because only `score > bestScore` replaces the current candidate. `startReadLater()` then accepts the returned candidate when it merely passes the same bbox-based `isUsableCandidate()` check.

Positive control: clearly hidden `display:none` / `visibility:hidden` candidates and obvious nav/header/footer/aside/form/dialog elements are rejected during candidate scoring.

Fresh root decision: P1-160, with generation/physical consequence owners supporting; no new owner.

## 8. Block 7 — same-origin frame recursion / projection

Current source recursively tracks accessible same-origin frame documents and projects geometry through frame chains. Selected same-origin BODY can be represented through a flattened top-document proxy.

The proxy path remains a transformation with explicit bounded/style-loss diagnostics rather than a proof of full renderer-state fidelity. Canvas/control/composed/resource parity and clipping/layout consequences remain owned by existing representation/fidelity owners such as P1-187/P1-003/P0-004.

No fresh source fact in this sweep independently reopens DONE P0-068. Its inert-clone source guard remains in the injection prefix. Fresh renderer/artifact evidence is required later in the new campaign.

## 9. Block 8 — cross-origin frame registration / command authority

Fresh source re-demonstrates **P1-171 ACTIVE**, with P0-045 supporting private-context authority.

Registration stores `{frameId, documentId, url, registeredAt}`. State messages compare sender documentId to the registry record. However `sendFrameAgentCommand()` retrieves a registry record and targets `chrome.tabs.sendMessage(..., {frameId})` only; the stored exact documentId is not part of command targeting/admission.

A reused frameId/navigation therefore has a stale-authority interval until the new frame's registration/state replaces or invalidates the record. Optional permission presence for the stored URL is checked, but permission is not document-generation identity.

`enableFrameAgentsForTab()` also injects `frame-agent.js` with `{tabId, allFrames:true}` after only tab-id normalization; private target admission is the P0-045 gap described above.

Fresh root decision: P1-171/P0-045; no new owner.

## 10. Block 9 — save metadata / exact document/application generation

Positive control: worker `sanitizeContentSaveMeta()` derives canonical hostname/site/url from `sender.tab.url` rather than trusting content-provided URL text. A hostile content script cannot simply claim another source URL.

Fresh gap: the same authority object does not retain `sender.documentId` or an independent application/SPA generation. The sanitized save meta contains URL/title/timestamps/SelectionSnapshot/resource report/page analysis, but no exact document-generation receipt.

This freshly re-demonstrates **P0-070/P0-080 ACTIVE**: URL equality is not exact document/application generation.

## 11. Block 10 — print preparation mutation / rollback

Fresh source re-demonstrates active live-page/static-representation gaps under P1-212/P0-075/P0-070 and related fidelity owners.

`prepareForPrint()` mutates the live selected page before print: disclosure state, lazy resource attributes, link hrefs, image wrapping, iframe/ancestor styles, print CSS and top-level proxy DOM.

A narrow positive control exists: P0-067's isolated-world click guard prevents page-owned programmatic `.click()` from reaching native host activation while allowing WebClip Shadow UI.

But current code deliberately states that expanded spoilers/accordions are **not closed after PDF**. Native `details.open = true` and static visibility changes are therefore not represented as a fully isolated immutable capture. Temporary resource attributes are restored later from snapshots and remain subject to the separate compare-before-restore/generation owner P1-218.

No DONE owner is reopened here: P0-067 is narrow activation authority; the broader live-state/static representation concerns remain ACTIVE elsewhere.

## 12. Block 11 — resource readiness/materialization

Fresh source re-demonstrates **P1-003 ACTIVE**.

Top/same-origin resource preparation scans at most 5,000 selected elements and 500 tasks under a 15s deadline, promoting common lazy img/source attrs and checking DOM images, computed background images and fonts. This is a useful bounded positive control.

However the selected visual dependency graph is not complete: e.g. pseudo-element resources and broader CSS dependency/resource generations are not comprehensively captured, and the cross-origin `frame-agent.js` resource path is much narrower (primarily selected images, local 100-item/5s envelope) than the top-document path.

Failures/omissions are written to `resourceReport`, OperationLog and the PDF header. But PDF generation itself can still return ordinary `ok:true`; the UI's success classification is not a first-class `degraded/partial` result solely because resourceReport is partial. This remains inside P1-003/P0-004 truthful-fidelity acceptance rather than a new owner.

## 13. Block 12 — Chromium `Page.printToPDF` render cut

Current worker source uses bounded debugger attach/detach and `ReturnAsStream`, caps PDF bytes at 48 MiB and closes the IO stream.

The current worker bootstrap installs `pdf-print-guard.js`, which intercepts actual `Page.printToPDF`, hides WebClip render UI, disables page script execution, scans/removes unsafe printed href schemes within a bound, prints, then restores hrefs/scripts/UI. This is fresh L1 evidence that the narrow P0-071 mechanism is still wired.

It is not a fresh campaign L3/L4 PASS. CSS/WAAPI animation phase, full responsive/environment generation and other browser-owned state remain separate ACTIVE fidelity/generation concerns.

## 14. Block 13 — PDF cache / retry generation identity

Fresh source re-demonstrates **P0-023 and P0-079 ACTIVE**.

The reusable Yandex PDF retry cache key remains `tab:<tabId>`. Search of current worker source finds `documentId` only in cross-origin frame-agent registration, not in PDF cache/save metadata.

A local automatic-download path has improved operation-owned temporary keying (`local-download:<operationId>`), which is a positive control, but the Yandex reusable cache remains tab-slot authority. Same-tab reload/replacement can therefore not be proven to refer to the same source document from the cache key alone.

## 15. Block 14 — automatic local download / native Save As settlement

Current source has substantial bounded/unknown-settlement controls:

- at most four pending automatic download-start actual settlements;
- durable pending-local checkpoints;
- a caller timeout returns an explicit `downloadStartPending` + warning rather than blindly starting a second download;
- content UI has a dedicated "Chrome ещё подтверждает запуск загрузки" state;
- late completion can be reconciled through pending download records.

These are fresh positive L1 controls for truthful unknown settlement.

The fresh campaign does not close P1-146/P1-156/P1-169 from source alone. Actual Chrome DownloadItem/native Save As settlement and restart behavior remain L5/physical requirements, and some actual-settlement ownership remains worker-memory coordinated.

## 16. Block 15 — Yandex auth/account/root/config operation context

Fresh source re-demonstrates **P0-074 ACTIVE**.

`uploadCachedRecordToYandex()` reads current Yandex config, then calls `ensureYandexServiceFolders()`, which itself reads current config/auth again. Other long flows similarly re-read global configuration during later stages.

An `operationId` is therefore not yet an immutable captured auth/account/root/config/publication context. A settings/account/root change between stages can only be guarded by scattered comparisons/recovery rules, not by one immutable operation object passed through the whole flow.

Fresh root decision: P0-074 and related recovery/config owners; no new owner.

## 17. Block 16 — Journal / exact artifact provenance

Current Journal rows durably retain useful identity: operationId, destination, filename, Yandex remotePath/resourceId/accountUid/rootPath, normalized URL/site identity, SelectionSnapshot and resource report.

Fresh gap: current worker has no PDF content digest path. SHA-256 usage in the worker is for OAuth PKCE; PDF generation records byte size in OperationLog/checkpoints, but Journal rows do not carry a cryptographic/content identity of the exact physical PDF bytes.

For Yandex unknown/reuse/adoption this freshly re-demonstrates **P1-184 ACTIVE**: path + size + metadata cannot by themselves prove exact object/content creation identity. It also leaves later-reading artifact linkage weaker than an immutable content receipt.

## 18. Block 17 — backup / import / restore authority

Fresh positive control: P0-077's shared same-version restore envelope is present in production bootstrap: 50 MiB bytes, 50 MiB chars, 100,000 entries, 8 MiB per serialized entry, with import clamping and staged-export receipt validation.

The new campaign does not treat the historical closure as freshly proven beyond L1 until exact-head tests run. Other restore authority remains nonterminal: selected backup/staging identity, account/root namespace and destructive import generation continue under ACTIVE owners including P0-013/P0-022/P0-073/P0-074 and P1 backup/import owners.

No source regression of P0-077 is established here.

## 19. Block 18 — MV3 restart / late settlement / bounded queues

Current source has many explicit settlement maps/queues and deadlines (`scriptExecutionSettlements`, `tabCreateSettlements`, debugger settlements, Action generations, automatic download settlements, storage/alarm mutation chains) plus durable pending stores for important Journal/download/remote operations.

This is materially better than unbounded fire-and-forget behavior, but source still distinguishes in-memory actual-settlement ownership from durable recovery. A service-worker restart can erase some memory-only generation/settlement knowledge even when the underlying Chrome side effect can settle later.

Fresh root mapping remains existing ACTIVE owners such as P1-124/P1-125/P1-146/P1-166/P1-170/P1-173 and related recovery owners. No new generic "MV3 race" owner is warranted.

## 20. Block 19 — privacy / durable data minimization

Fresh source re-demonstrates **P0-066 and P1-182 ACTIVE**, in addition to P0-045.

Positive control: content save URL is derived from the actual sender tab, and signed Yandex transport logging has a worker bootstrap redaction guard.

Remaining durable-data issues are visible directly in current source:

- `sanitizeContentSaveMeta()` preserves the full HTTP(S) sender URL string (including query/fragment semantics after URL parsing) into save metadata/Journal rather than applying one universal durable/display confidentiality sanitizer;
- SelectionSnapshot locators persist bounded plaintext context such as element text, parent/neighbor text and raw bounded href/src values to improve restore scoring.

These are the already-registered confidentiality/data-minimization roots, not new findings.

## 21. Block 20 — truthful UI / degraded / unknown / later-reading state

Fresh source contains several good truthful-state controls:

- unknown automatic download start is surfaced as pending with a durable checkpoint and explicit no-repeat warning;
- resource failures/limits/deadlines are recorded in OperationLog and embedded in the PDF header;
- restore reports failed/ambiguous locator counts instead of claiming every locator restored.

But truth remains non-uniform. Partial resource readiness does not automatically change the overall PDF response from `ok:true` to a first-class degraded/partial result, and Chrome Action has a separate ACTIVE degraded/unknown owner when current reads fail. Later-reading provenance also lacks a physical PDF digest as noted above.

Fresh root mapping: P1-003/P0-004 for fidelity degradation, P1-217 for Action degraded truth, P1-184 for exact remote artifact identity, plus operation-reconciliation owners for unknown settlement.

## 22. Fresh source-level campaign state after Sweep 1

The fresh campaign can now advance these coordinates from the reset baseline without claiming higher-level evidence:

| Coordinate | Fresh restart state after Sweep 1 | Reason |
|---|---|---|
| C01 Manual Include/Exclude | `SOURCE-REVIEWED / FINDING` | aggregate durable snapshot truncation remains |
| C02 SelectionSnapshot restore | `SOURCE-REVIEWED / FINDING` | rendered admission remains bbox-only |
| C03 Main Content | `SOURCE-REVIEWED / FINDING` | weak/ambiguous fallback authority remains |
| C16 Same-origin iframe | `SOURCE-REVIEWED / PARTIAL` | source topology reviewed; renderer fidelity needs fresh L3/L4 |
| C17 Cross-origin iframe | `SOURCE-REVIEWED / FINDING` | command document generation + private authority gaps |
| C21 Lazy/resources | `SOURCE-REVIEWED / FINDING` | bounded but incomplete visual resource graph |
| C24 Disclosure/static expansion | `SOURCE-REVIEWED / FINDING` | live mutation/static isolation remains nonterminal |
| C35 Render-cut mutation | `SOURCE-REVIEWED / FINDING` | narrow print guard wired; broader admitted-state freeze remains |
| C36 Resource/document generation identity | `SOURCE-REVIEWED / FINDING` | URL/tab identity is not exact generation |
| C37 Failure/retry/convergence | `SOURCE-REVIEWED / FINDING` | durable positives plus memory-only residual owners |
| C38 Budgets | `SOURCE-REVIEWED / FINDING` | many local bounds exist; shared/global budget owners remain |
| C39 Privacy/data minimization | `SOURCE-REVIEWED / FINDING` | private UI/action + durable URL/locator context gaps |
| C40 PDF cache identity | `SOURCE-REVIEWED / FINDING` | Yandex cache remains tab-keyed |
| C41 Local/native settlement | `SOURCE-REVIEWED / FINDING + EXTERNAL-REQUIRED` | source unknown handling exists; actual boundary still L5 |
| C42 Yandex identity | `SOURCE-REVIEWED / FINDING + EXTERNAL-REQUIRED` | mutable operation context / exact object receipt |
| C43 Journal/provenance | `SOURCE-REVIEWED / FINDING` | useful operation identity but no physical PDF digest |
| C44 Backup/import/recovery | `SOURCE-REVIEWED / FINDING + EXTERNAL-REQUIRED` | P0-077 source positive; remaining authority/external owners active |
| C46 Real unpacked Chrome/permission/debugger | `TRIAGED / EXTERNAL-REQUIRED` | cannot be credited from source alone |

All other restart coordinates remain `NOT-TRIAGED / UNKNOWN` until their own fresh sweep/deep-dive work.

## 23. Root-cause reconciliation

No new P-code is admitted by this checkpoint. Fresh source findings map to already current ACTIVE owners. Narrow DONE closures inspected here are not reopened because their production bootstrap/source mechanisms are still present; their prior browser evidence is merely not credited as fresh campaign evidence yet.

The most release-critical source findings at this point remain exact-generation/authority/provenance classes rather than a missing bootstrap:

- private-context authority;
- selected/restore/auto-content admission truth;
- document/frame/application generation;
- PDF cache ownership;
- immutable Yandex operation context and exact object receipt;
- durable privacy minimization;
- truthful fidelity degradation.

## 24. Next fresh evidence tranche

Next step is not implementation yet. The restart campaign should perform fresh deterministic/managed-browser revalidation for the beginning of the user journey, concentrating first on C01/C02/C03 plus exact document/frame generation interactions:

1. manual Include/Exclude positive/negative/overlap controls;
2. >250 aggregate selection divergence;
3. hidden/transparent/occluded restore admission;
4. candidate ambiguity and >5000 candidate boundary;
5. disconnected/replaced selected node between admission and print;
6. same-URL reload / SPA mutation after selection;
7. same-origin frame selection generation;
8. cross-origin frameId reuse/documentId targeting;
9. Main Content weak BODY/equal-score candidates;
10. physical PDF outcome for each material B1→B6 claim.

Only after those fresh L2/L3/L4 results should the restart matrix advance beyond `SOURCE-REVIEWED` for these cells.

`RELEASE_READINESS.md` remains **NOT READY**. This research checkpoint changes no runtime, manifest, Registry status, build, tag or GitHub Release.
