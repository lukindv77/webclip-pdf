# Audit family evidence — Journal read/view revision / pagination / open/apply / bulk authority

Family from `AUDIT_DELTA_INDEX.md` section 6.

This document is a **lossless consolidation** of the detailed audit deltas listed below. Current status and single-owner authority remain in `AUDIT_REGISTRY.md`; this file preserves source proof, deterministic schedules, corrections, positive controls, acceptance cases and historical test/release interpretation.

Every retired source is embedded verbatim below and identified by its original filename plus SHA-256. Git history remains the secondary recovery path.

Primary owners from the navigation index: P0-076, P0-080, P1-001, P1-009, P1-175, P1-206, P1-210.

Retired source count: **18**.

## P-code coverage

P0-001, P0-010, P0-017, P0-018, P0-023, P0-030, P0-050, P0-070, P0-073, P0-074, P0-076, P0-079, P0-080, P1-001, P1-009, P1-025, P1-030, P1-032, P1-083, P1-085, P1-120, P1-123, P1-124, P1-125, P1-127, P1-157, P1-158, P1-170, P1-171, P1-174, P1-175, P1-184, P1-198, P1-205, P1-206, P1-208, P1-210, P1-211, P1-215

## Source ledger

| Original delta | SHA-256 | P-codes mentioned | Original title |
|---|---|---|---|
| `AUDIT_DELTA_DIRECT_START_BYPASSES_UPLOAD_GENERATION_LOCK_2026-08-28.md` | `8de0721f6d3c3c2862dd0b385d3b29386b7cebcdf86e9ffb07e4cc33449a91fa` | P0-001, P0-017, P0-070, P0-080, P1-198, P1-210 | Audit delta — direct Start Selection bypasses active upload generation lock — 2026-08-28 |
| `AUDIT_DELTA_JOURNAL_APPLY_BYPASSES_UPLOAD_GENERATION_LOCK_2026-08-28.md` | `cf737c8c4d09cf554b00d5dc998a961b6711465581f487840d4e32f15d1329cf` | P0-001, P0-017, P0-070, P0-080, P1-175, P1-198, P1-210 | Audit delta — Journal Apply bypasses active upload generation lock — 2026-08-28 |
| `AUDIT_DELTA_JOURNAL_APPLY_SPA_APPLICATION_GENERATION_2026-08-28.md` | `996cc71b6b35aa501cf0c172182d6ad110c3c499aaf77fc0d4b3a7079389cdd0` | P0-018, P0-070, P0-080, P1-001, P1-175 | Audit delta — Journal Apply must revalidate same-document SPA/application generation — 2026-08-28 |
| `AUDIT_DELTA_JOURNAL_BULK_CONFIRMATION_REVISION_AUTHORITY_2026-08-28.md` | `7b0a41fb70bfbb22c7a86be4cba763b0970e25dad9d53c69da3ce3f43a73fb19` | P0-010, P0-076, P1-206, P1-215 | Audit delta — Journal bulk confirmation must bind the observed revision — 2026-08-28 |
| `AUDIT_DELTA_JOURNAL_BULK_DESTRUCTIVE_TRANSPORT_LOSS_RECONCILIATION_2026-08-28.md` | `44722d9265a8a3a9da4c3d951cde1cf4ec204ca6de07e8112e34afb2caf6e613` | P0-010, P0-076, P1-198, P1-210 | Audit delta — bulk Journal destructive result loss must reconcile before retry — 2026-08-28 |
| `AUDIT_DELTA_JOURNAL_CONTEXT_REPLAY_SEMANTICS_2026-08-28.md` | `ae47f66173e49d96a6a6a49d43c82d1a607a831f0a5bbdd77bd88fd9675b9122` | P0-023, P0-070, P1-123, P1-124, P1-175, P1-211 | Audit delta — Journal `contextId` replay semantics — 2026-08-28 |
| `AUDIT_DELTA_JOURNAL_DOCUMENT_AND_OPEN_TRANSPORT_AUTHORITY_2026-08-28.md` | `b304206762c32a160fae032aee97089b173a181f324ec19ee90ea7cbe57f2923` | P0-023, P0-070, P0-079, P1-124, P1-125, P1-157, P1-171, P1-175, P1-210 | Audit delta — Journal exact-document command and open-URL transport authority — 2026-08-28 |
| `AUDIT_DELTA_JOURNAL_ENTRY_ID_WIDTH_COHERENCE_2026-08-28.md` | `3996674fce955dead1240e8b9a49fe9fe7a9f115c3436828364536f4ca419116` | P1-025, P1-030 | Audit delta — Journal entry-id width coherence — 2026-08-28 |
| `AUDIT_DELTA_JOURNAL_GROUPED_VIEW_LEGACY_INDEX_VISIBILITY_2026-08-28.md` | `39f3afe852ca5afd1ff277e12714c0bf5be32930311efa953521db5a92d52aaa` | P1-009, P1-174, P1-206 | Audit delta — grouped Journal legacy-index visibility — 2026-08-28 |
| `AUDIT_DELTA_JOURNAL_GROUP_BOUNDARY_REVISION_2026-08-28.md` | `6905673f0352dfa6d7abeef673385b7395836ab573d76d1a94dbed29f9d10a91` | P0-050, P1-009, P1-127, P1-174, P1-206, P1-208 | Audit delta — Journal grouped-pagination boundary vs revision — 2026-08-28 |
| `AUDIT_DELTA_JOURNAL_OPEN_SAVED_FILE_RENDERED_GENERATION_2026-08-28.md` | `71c6a5be87603e743806e04cd44057c02a85f400a9ae212ddd853fefd9d05278` | P0-076, P1-206 | Audit delta — Journal Open Saved File rendered-entry generation — 2026-08-28 |
| `AUDIT_DELTA_JOURNAL_OPEN_SOURCE_URL_FRESH_TAB_MISMATCH_2026-08-28.md` | `55c6631e707a9e0b9525947e6077ec5e1745f0c45b5416b40d8c4ab3e72a3db2` | P0-030, P0-070, P1-175, P1-211 | Audit delta — Journal open source URL vs fresh tab mismatch — 2026-08-28 |
| `AUDIT_DELTA_JOURNAL_RENDERED_REVISION_MUTATION_AUTHORITY_2026-08-28.md` | `cab7a68c4c533ee87e9b77805b535dad60aa1cd63a6239c5bf03be20f3fc13d0` | P0-073, P0-074, P0-076, P1-184, P1-198, P1-206, P1-210 | Audit delta — Journal rendered revision as mutation authority — 2026-08-28 |
| `AUDIT_DELTA_JOURNAL_SOURCE_CONTEXT_TAB_CREATE_HANDOFF_2026-08-28.md` | `169a0b5ccc422867cf524f4b74e4be7fba22a8e3aa40bc4b8982297235cdb324` | P1-123, P1-124, P1-175, P1-211 | Audit delta — Journal source-context handoff to tab creation — 2026-08-28 |
| `AUDIT_DELTA_JOURNAL_TEMPLATE_DOCUMENT_IDENTITY_2026-08-27.md` | `402c2819821072df86b7395f5fe10896e029c3bfaa7ce920d3ff756e1d8c63e9` | P0-070, P0-079, P1-125, P1-157, P1-171, P1-175, P1-198 | Audit delta — Journal template apply document identity — 2026-08-27 |
| `AUDIT_DELTA_JOURNAL_UNGROUPED_OFFSET_PAGINATION_REVISION_2026-08-28.md` | `a942e28e2a3fcf33c5cc2f188bfc72360233a8b01f79d3ebf796426eb3aafd1e` | P0-076, P1-009, P1-206 | Audit delta — Journal ungrouped offset pagination must be revision-bound — 2026-08-28 |
| `AUDIT_DELTA_JOURNAL_VIEW_FANOUT_2026-08-27.md` | `41e3269c7971a156dbab8e4afe2af68bb39bc8fbc484a41d5090db94eae91b94` | P1-009, P1-158, P1-170, P1-174 | Audit delta — Journal view materialization and action refresh fan-out — 2026-08-27 |
| `AUDIT_DELTA_JOURNAL_VIEW_REVISION_COHERENCE_2026-08-27.md` | `80c28ab4415f22f6ae95ac3464ecaf8ad12275c534faf215f73a2d74c71cdaa4` | P0-050, P1-009, P1-032, P1-083, P1-085, P1-120, P1-127, P1-174, P1-205, P1-206 | Audit delta — Journal view revision coherence — 2026-08-27 |

## Lossless source transcripts

The sections below preserve the original UTF-8 Markdown text verbatim. Historical statements remain evidence, not independent current status authority; `AUDIT_REGISTRY.md` controls status/ownership.
## Retired source: `AUDIT_DELTA_DIRECT_START_BYPASSES_UPLOAD_GENERATION_LOCK_2026-08-28.md`

SHA-256 of UTF-8 source text: `8de0721f6d3c3c2862dd0b385d3b29386b7cebcdf86e9ffb07e4cc33449a91fa`

# Audit delta — direct Start Selection bypasses active upload generation lock — 2026-08-28

Source-of-truth `main` immediately before this write: `e83546add824ee52b2389872c589f2a67bbddba8`.

Docs-only audit checkpoint. Runtime/tests/configuration/manifest are unchanged.

## Classification

No new P-number is assigned.

Primary existing owners:

- **P0-017** — one shared page-command behavior across popup/context menu;
- **P0-001** — explicit selection state must not be lost unexpectedly;
- **P1-198/P1-210** — operation generation/terminal receipt separation where old and new user operations overlap.

P0-080 remains relevant when a new application generation is the reason selection must be reset, but the race below occurs even without navigation.

## Fresh source proof

`handleExternalCommand()` has a clear operation lock:

```text
if (state.pageUploadActive && command !== 'notify-error')
    return error: wait for current Yandex save
```

So context-menu/page commands cannot start/edit another workflow while a Yandex upload is active.

The direct top-level message handler for `WEBCLIP_START_SELECTION` does **not** use that guard. It calls `startSelection()` immediately.

Popup currently uses exactly this direct message after injection/permission setup.

`startSelection()`:

- restores print state;
- invalidates PDF cache;
- clears existing selection;
- sets `state.phase='selecting'`;
- enables page listeners/UI.

It does not clear `pageUploadActive` or change `pageUploadOperationId`.

Thus the content script can simultaneously be:

- logically inside old upload operation U (`pageUploadActive=true`); and
- visibly inside a new editable selection session S (`phase='selecting'`).

## Deterministic late-terminal UI race

1. User starts Yandex save U from selection A.
2. PDF A is already cached and remote upload U continues; `pageUploadActive=true`.
3. User opens popup and presses Start.
4. Popup sends direct `WEBCLIP_START_SELECTION`.
5. `startSelection()` bypasses the upload lock, clears A and starts editable selection S.
6. User selects new areas B while U is still running.
7. Old U finishes.
8. `sendPdfToYandex()` completion calls `endPageUploadProgress()` and then unconditionally sets `state.phase='review'`, rewrites the modal to U's success/partial result and installs its Close action.
9. The user-visible B selection session is therefore interrupted by the late terminal UI of U; closing U may call `stopSelection(true)` and clear the newer selection.

The remote artifact U itself still uses the earlier cached bytes/meta, so this is not evidence that U uploads B. The defect is **generation ownership of page UI/selection state**: old terminal U can overwrite a newer S because S was allowed to start while U was active.

## Required refinement

### All start paths consume the same lock

Popup Start, context-menu Start and any direct `WEBCLIP_START_SELECTION` compatibility path must go through one semantic command gate.

While `pageUploadActive` is true, ordinary Start/Reset/Apply actions should either:

- reject with the existing “wait for save completion” result; or
- explicitly queue a new operation generation that begins only after U reaches terminal state.

They must not mutate selection/UI immediately underneath U.

### Terminal UI must be generation-owned

Even with admission gating, async completion should verify that the page UI still belongs to its operation generation before replacing modal/phase state.

A terminal event for U may update U's operation receipt/log, but it must not blindly overwrite a later authorized page workflow S.

### Preserve retry artifact independence

The remote upload U remains bound to its already generated PDF/cache receipt. Blocking new selection edits during U must not reinterpret application mutations as cancellation of U's actual remote settlement.

## Required regressions

1. Active upload U -> context Start rejected (current positive behavior).
2. Active upload U -> popup Start receives same rejection; existing selection/UI is not reset.
3. Active upload U -> direct compatibility `WEBCLIP_START_SELECTION` cannot bypass lock.
4. After U terminal -> Start can begin/resume according to the common P0-017 policy.
5. If a queued/new S is explicitly supported, late U progress/terminal messages cannot overwrite S's modal/phase.
6. Remote U success/failure still reconciles normally even if page navigation/application generation changes under P0-070/P0-080.

## Duplicate check

The immediately preceding popup/context Start parity checkpoint covered reset-vs-resume behavior. Repository history did not contain this separate active-upload generation race caused by the direct message bypassing `pageUploadActive`.

No new root-cause number is needed: it strengthens the same shared-command/operation-generation contract.

## Test / release state

Documentation only. Product tests were not rerun. Historical evidence remains **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. Runtime version remains `0.9.8`; no build, tag or GitHub Release was created.

## Retired source: `AUDIT_DELTA_JOURNAL_APPLY_BYPASSES_UPLOAD_GENERATION_LOCK_2026-08-28.md`

SHA-256 of UTF-8 source text: `cf737c8c4d09cf554b00d5dc998a961b6711465581f487840d4e32f15d1329cf`

# Audit delta — Journal Apply bypasses active upload generation lock — 2026-08-28

Source-of-truth `main` immediately before this write: `a56796186da77a04928bbc6ef0693e08dbb8253e`.

Docs-only audit checkpoint. Runtime/tests/configuration/manifest are unchanged.

## Classification

No new P-number is assigned.

Primary existing owners:

- **P1-175/P0-070** — Journal Apply command/source-document authority;
- **P0-001** — explicit selection state preservation;
- **P1-198/P1-210** — operation-generation/terminal receipt separation;
- **P0-017** — shared command semantics on the source page.

## Fresh source proof

The content-script top-level runtime handler has a direct branch:

`WEBCLIP_APPLY_SELECTION_SNAPSHOT` -> `startSelection()` -> `applySelectionSnapshot(...)`.

This branch does not pass through `handleExternalCommand()`.

`handleExternalCommand()` contains the active-upload gate:

- while `state.pageUploadActive` is true, ordinary commands are rejected and told to wait for the Yandex save to finish.

The direct Apply branch does not test `pageUploadActive` before clearing/replacing selection state.

## Deterministic cross-window race

1. Source page has selection A and starts Yandex upload U.
2. PDF/meta for U are already captured; `pageUploadActive=true` while remote work continues.
3. A separate Journal page contains template T and targets the same source tab/document.
4. User presses Apply in Journal.
5. Even after future P1-175 exact-document validation succeeds, the delivered `WEBCLIP_APPLY_SELECTION_SNAPSHOT` currently bypasses U's page-operation lock.
6. `startSelection()` clears current source-page selection/UI and begins a new selection generation.
7. `applySelectionSnapshot(T)` installs template T while U is still active.
8. Old U later reaches terminal state and its completion path sets `phase='review'` and rewrites the modal for U.
9. The newer template/application session is therefore interrupted/overwritten by terminal UI belonging to the older upload generation.

The remote bytes of U remain the earlier artifact; the defect is local page-operation ownership and user-state loss.

## Required refinement

### One source-page operation admission gate

All selection-mutating entry points must consume the same page-operation state machine, including:

- popup/direct Start;
- context-menu Start/Reset/Auto Content;
- Journal `APPLY_SELECTION_SNAPSHOT`;
- future restore/import selection commands.

When upload U is active, Apply must either:

- fail/ask the user to wait; or
- be explicitly queued as a new operation generation that starts after U terminal.

It must not clear/replace selection underneath U.

### Document authority and operation authority are independent

P1-175/P0-070 answers **which document** receives Apply.

This checkpoint answers **whether that exact document is currently available for a new selection mutation**.

Both checks are required. Exact document identity alone does not authorize concurrent mutation of an already-owned page workflow.

### Terminal events are generation-scoped

Old U progress/terminal UI may update U's operation receipt, but it must not overwrite a newer Apply generation if explicit queueing is ever supported.

## Required regressions

1. No active upload -> Journal Apply works normally after exact document/site validation.
2. Active U -> Journal Apply is rejected/deferred; source selection is unchanged.
3. Active U -> direct forged/stale compatibility Apply cannot bypass the same gate.
4. Apply queued after U, if supported -> U terminal UI completes before template mutation begins.
5. Exact source-document replacement still fails under P1-175/P0-070 independently of upload lock.
6. Application generation changed under P0-080 -> stale template decision is revalidated even when upload is idle.

## Duplicate check

Repository history already covered Journal Apply exact document authority and the immediately preceding popup Start upload-lock bypass. No dedicated checkpoint covered the direct `WEBCLIP_APPLY_SELECTION_SNAPSHOT` branch bypassing `pageUploadActive`.

This is a new manifestation of existing owners, not a new P-number.

## Test / release state

Documentation only. Product tests were not rerun. Historical evidence remains **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. Runtime version remains `0.9.8`; no build, tag or GitHub Release was created.

## Retired source: `AUDIT_DELTA_JOURNAL_APPLY_SPA_APPLICATION_GENERATION_2026-08-28.md`

SHA-256 of UTF-8 source text: `996cc71b6b35aa501cf0c172182d6ad110c3c499aaf77fc0d4b3a7079389cdd0`

# Audit delta — Journal Apply must revalidate same-document SPA/application generation — 2026-08-28

Source-of-truth `main` immediately before this write: `27bea6bf84016856da8047dfb8cc83532f1e5f0d`.

Docs-only audit checkpoint. Runtime/tests/configuration/manifest are unchanged. No new P-number is assigned.

## Classification

Primary existing owners:

- **P1-175** — Journal source-context exact target authority;
- **P0-080** — same-document SPA/application-generation selection authority;
- **P0-018** — applying a Journal template to another URL of the same site;
- **P1-001** — locator restore confidence/ambiguity.

P0-070 still owns full browser-document replacement, but is not sufficient for this case because `documentId` may remain unchanged.

## Fresh source proof

`resolveSourceContext()` loads stored `{sourceTabId, sourceUrl}` and performs a bounded `chrome.tabs.get(sourceTabId)` read. If the tab currently has an HTTP(S) URL it overwrites `sourceUrl`.

That refresh is useful, but it is not performed at every Apply click.

Entry rendering computes `sameUrl`, `sameSite` and `canApply` from the page-level variables `sourceTabId/sourceUrl`. The button closure calls `applyEntry(entry)`.

`applyEntry(entry)` currently proceeds directly to:

- `chrome.scripting.executeScript({ target:{tabId:sourceTabId}, files:['content.js'] })`;
- `chrome.tabs.sendMessage(sourceTabId, { type:'WEBCLIP_APPLY_SELECTION_SNAPSHOT', ... })`;
- `chrome.tabs.update(sourceTabId, {active:true})`.

It does not fresh-read current source URL/application generation immediately before admission.

## Deterministic same-document schedule

1. Journal is opened from source tab T while SPA route A is current.
2. `resolveSourceContext()` records/refreshes `sourceUrl=A`.
3. Journal renders an entry E and enables Apply because E is same-site with A.
4. Source tab T remains the same browser document but SPA performs `history.pushState()` / `replaceState()` / `popstate` to route B.
5. Browser `documentId` may remain unchanged.
6. Journal page is not necessarily notified and still holds `sourceUrl=A`.
7. User presses Apply on E.
8. `applyEntry()` targets only tabId T and the current content document receives the snapshot on route B.
9. Any `crossUrl` diagnostics are still computed against stale page-level `sourceUrl=A`, not the actual route B accepted by the command.

Thus a source observation from A becomes live mutation authority for B.

## Why exact documentId alone is insufficient

P1-175/P0-070 require exact browser-document targeting and remain necessary for full reload/navigation. But SPA route changes can keep the same documentId.

The Apply receipt therefore needs both:

- browser document generation;
- same-document application/navigation generation or, at minimum, a fresh URL/application observation immediately before command admission plus a content-side current-generation check.

A textual URL read only at Journal initialization is not a durable command capability.

## Required contract

Before every Apply:

1. re-read the source tab/document through a bounded Chrome API call;
2. prove current browser document generation is the expected one under P1-175;
3. prove current application/route generation is current under P0-080;
4. recompute same-site/cross-URL policy from the **current** route;
5. if route changed, update the Journal UI and require a fresh user decision instead of silently applying;
6. carry expected document/application receipt through script injection and message delivery, not just the page-level `sourceTabId`.

For deliberate cross-URL same-site template use under P0-018, the new target route is allowed only after a fresh explicit decision under the current target receipt. A stale earlier decision cannot be silently reused.

## Interaction with locator restore

Even if the target route is allowed, P1-001 still governs locator quality. Application-generation validation does not convert a low-confidence/ambiguous locator into a valid one.

The intended chain is:

`current source target receipt -> deliberate same-URL/cross-URL policy -> exact application/document command -> locator confidence restore`.

## Required regressions

1. Journal opens on A -> no source change -> Apply succeeds normally.
2. Journal opens on A -> SPA route B before click -> stale Apply is invalidated/reconfirmed before any injection/message.
3. Same browser document, same textual URL but app root replaced -> content-side application-generation/live-DOM check prevents stale authority.
4. Full reload A->A with new documentId -> P1-175 fails closed even though URL is equal.
5. A->B same site and user deliberately reconfirms cross-URL template use -> Apply may proceed under B receipt and P1-001 confidence checks.
6. A->different site -> Apply remains disabled/rejected after fresh revalidation.
7. Late script/message settlement for old target generation cannot become success for newer route.

## Duplicate check

Existing Journal target deltas cover tab/document replacement and stale source context. Repository search found no dedicated checkpoint for **same-document SPA route change between Journal source resolution/render and Apply click**. This is therefore an acceptance refinement of P1-175 + P0-080, not a new item.

## Test / release state

Documentation only. Product tests were not rerun. Historical evidence remains **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. Runtime version remains `0.9.8`; no build/tag/Release was created.

## Retired source: `AUDIT_DELTA_JOURNAL_BULK_CONFIRMATION_REVISION_AUTHORITY_2026-08-28.md`

SHA-256 of UTF-8 source text: `7b0a41fb70bfbb22c7a86be4cba763b0970e25dad9d53c69da3ce3f43a73fb19`

# Audit delta — Journal bulk confirmation must bind the observed revision — 2026-08-28

Source-of-truth `main` before this checkpoint includes `fd581a0b6ed2decf434ce671479878c0652f6ccc`.

Docs-only audit checkpoint. Runtime/config/tests/manifest are unchanged.

## Classification

No new P-number is assigned.

Fresh proof refines **P0-010**, **P0-076** and **P1-206**. It is adjacent to P1-215 staging-lifetime ownership but is a different issue: even perfectly retained staging bytes do not prove that the Journal state the user agreed to destroy is still the current Journal state.

## Current file-import confirmation has no Journal revision receipt

Current `journal.js::importJournalFromSelectedFile()`:

1. starts only a page-local `journalDestructiveOperationInFlight` guard;
2. stages the selected backup;
3. requests `WEBCLIP_JOURNAL_IMPORT_PREVIEW_STAGED`;
4. shows a 9-digit confirmation containing backup filename, entry count and export date;
5. after confirmation sends `WEBCLIP_JOURNAL_IMPORT_REPLACE_STAGED` with `stagingKey`, `operationId`, `source`.

The request does not contain the current Journal revision that existed when the confirmation UI was shown.

Worker `runExclusiveJournalDestructiveMutation()` only rejects another bulk destructive mutation that is *currently running*. It does not prove that the dataset being replaced is the same generation the user observed before entering the confirmation code.

## Deterministic stale bulk-decision schedule

1. Journal page P1 displays Journal generation G1.
2. P1 chooses backup A and receives a valid preview.
3. P1 displays the destructive confirmation: the current local Journal will be fully replaced by A.
4. Before the user enters the 9-digit code, another Journal page P2 commits a new entry, comment, import or other Journal mutation, advancing the store to G2.
5. The storage/runtime notification for P1 is delayed, or a reload is scheduled but the confirmation modal remains the user's active decision surface.
6. User completes the confirmation that was presented while G1 was current.
7. P1 sends only `stagingKey + operationId + source`.
8. Worker acquires the bulk destructive guard and replaces **G2** with A.
9. Data created/changed in G2 is lost even though it was not part of the Journal state visible when the destructive decision was requested.

This is not prevented by the worker being fresh: a fresh replace faithfully destroys G2, but the user's authority was collected against G1.

## The same problem applies to Yandex restore

`importJournalFromYandex()` fetches/stages a selected remote backup, displays its path/count/export date and then calls the same `WEBCLIP_JOURNAL_IMPORT_REPLACE_STAGED` after confirmation.

A long user confirmation creates the same G1 -> G2 window. The exact remote backup may be perfectly identified while the *local destructive target generation* has changed.

Remote backup identity and local Journal revision are therefore two different receipts and both are required.

## Page-local busy state is not cross-tab authority

`journalDestructiveOperationInFlight` prevents the same Journal page from starting another destructive action while its confirmation/workflow is active.

It cannot stop:

- another Journal tab;
- a content save finishing and appending a new entry;
- recovery appending/finalizing an entry;
- another extension page or worker-owned mutation;
- an already admitted single-entry mutation settling later.

P0-076 already requires a store generation fence for these concurrency families. Bulk confirmation must consume that same generation model.

## Required confirmation receipt

When the destructive confirmation is created, capture an immutable receipt containing at least:

- exact Journal database revision/generation being offered for replacement;
- current entry count and other summary values shown to the user where useful;
- staging/import generation identifying backup A;
- operation id;
- source kind (`file` / `yandex`);
- for Yandex restore, exact selected remote backup receipt from its own identity contract.

The final replace request returns the **expected Journal revision**.

Inside the worker's authoritative destructive transaction/admission boundary:

1. compare expected G1 with current G;
2. if `G !== G1`, do not clear/replace anything;
3. return a typed stale/conflict result;
4. refresh the page/current Journal summary;
5. require a new user confirmation for the new target generation.

Do not silently update the expected revision behind the already-open confirmation modal.

## Relationship to P1-206 and rendered action receipts

P1-206/P0-076 already establish that per-entry actions must carry the exact revision/entry generation the user saw.

Bulk replacement is the dataset-level analogue:

- per-entry action: `expected Journal generation + expected entry generation`;
- full import/restore: `expected Journal generation + exact staged backup generation`.

The 9-digit code is evidence of user intent, not evidence that the target generation remained unchanged while the user was deciding.

## Staging lifetime is separate

P1-215 requires staged bytes to remain valid while an active confirmation is open.

Even after P1-215 is fixed, the following are still independent failures:

- staged A exists but target Journal changed G1 -> G2;
- target Journal stayed G1 but staged A expired/disappeared;
- Yandex selected backup object changed while local Journal stayed G1.

Each dimension needs its own receipt/lease.

## Required regressions

1. Preview A at G1 -> another tab appends entry producing G2 -> confirm A -> replace is rejected stale; G2 remains intact.
2. Preview A at G1 -> another tab edits/deletes/comments -> confirmation requires refresh/re-confirm, not silent G2 destruction.
3. Preview A at G1 -> recovery finalizes a pending append -> old confirmation cannot delete it.
4. Preview A at G1 -> no Journal mutation -> confirmation succeeds normally.
5. Yandex backup A selected at G1 -> local Journal changes -> final restore fails on local revision before destructive replace.
6. Staging remains pinned under P1-215 but Journal revision changes -> still reject; staging lifetime cannot substitute for target generation.
7. Storage/runtime notification arriving before confirmation completion invalidates/refreshes the confirmation UX, but worker CAS remains the authoritative fence if notification is delayed or lost.
8. A stale confirmation cannot be made valid merely by opening another page that happens to render G2; the exact user confirmation must be regenerated.
9. Bulk clear operations using the same 9-digit confirmation family should use the same target-revision contract where they can remain open across concurrent mutations.

## Duplicate check / numbering

No new item is created.

- **P0-010** owns destructive full-Journal import semantics and 9-digit confirmation.
- **P0-076** owns Journal mutation generation/CAS across bulk and single-entry concurrency.
- **P1-206** owns the coherent observed Journal revision used to build action authority.
- **P1-215** remains staging lifetime during active confirmation.

The previous rendered-revision delta primarily covered stale per-entry cards. This checkpoint adds the missing **dataset-level destructive confirmation** handoff.

## Test / release state

Docs-only audit checkpoint. Product tests were not rerun. Historical **88/88 JavaScript syntax + 74/74 deterministic tests PASS** remains previous evidence only. Real multi-tab unpacked-Chrome confirmation QA remains required. No build, tag or Release was created.

## Retired source: `AUDIT_DELTA_JOURNAL_BULK_DESTRUCTIVE_TRANSPORT_LOSS_RECONCILIATION_2026-08-28.md`

SHA-256 of UTF-8 source text: `44722d9265a8a3a9da4c3d951cde1cf4ec204ca6de07e8112e34afb2caf6e613`

# Audit delta — bulk Journal destructive result loss must reconcile before retry — 2026-08-28

Source-of-truth `main` before this checkpoint includes `4333acb79cd01fa8ea587e64a5d5e569a5f7f775`.

Docs-only audit checkpoint. Runtime/config/tests/manifest are unchanged.

## Classification

No new P-number is assigned.

Fresh proof extends **P1-210** outer transport-loss reconciliation to **P0-010/P0-076 bulk destructive Journal replace/clear**. It composes with the same-session target-revision confirmation delta, but the two are distinct:

- target-revision confirmation protects against Journal changing **before the first destructive commit**;
- P1-210 protects against retry when the first destructive commit may already have happened but its response was lost.

## Current import/clear UI treats outer rejection as ordinary failure

Current `journal.js` sends destructive RPCs directly:

- `WEBCLIP_JOURNAL_IMPORT_REPLACE_STAGED`;
- `WEBCLIP_JOURNAL_CLEAR` for a site/domain scope;
- `WEBCLIP_JOURNAL_CLEAR` for the complete Journal.

After `await chrome.runtime.sendMessage(...)`, the page calls `requireOk(result)` and then refreshes the Journal.

If the outer message Promise rejects or the response channel disappears after the worker committed the destructive transaction, the catch path only displays an error. There is no exact durable status read proving whether the operation was:

- never admitted;
- admitted but not committed;
- fully committed;
- committed but post-commit stats/log/UI housekeeping incomplete;
- genuinely unknown because worker lifecycle ended around the commit boundary.

## Deterministic import response-loss schedule

1. Page P previews staged backup A and receives the required user confirmation.
2. P sends import operation C1.
3. Worker enters its exclusive Journal destructive mutation and atomically replaces the entries store with A, advancing Journal generation to G1.
4. Before the successful response reaches P, the runtime response channel is lost / page context disconnects / worker lifecycle breaks the outer result delivery.
5. P reports an error even though C1's destructive commit already occurred.
6. User later sees/reopens Journal. New save R is appended after G1, producing G2.
7. User interprets the old error as “import did not happen” and retries the same backup as C2.
8. C2 again performs a full replace and deletes R.

C2 is not a harmless idempotent replay. The same backup bytes produce a new destructive effect because the **target Journal generation has changed since C1**.

## Full/site clear has the same property

A successful clear C1 followed by lost response can be repeated after new entries appear.

For whole-Journal clear:

- C1 clears G0 -> G1;
- response is lost;
- new entry R appears in G2;
- user retries because UI previously reported failure;
- C2 clears R.

For site/domain clear, the same schedule deletes newly created entries in that scope.

Therefore a destructive bulk command cannot use ordinary “retry the command” semantics after outer result loss.

## Worker exclusivity does not solve result loss

`runExclusiveJournalDestructiveMutation()` prevents two destructive mutations from executing simultaneously in one live worker.

It does not answer, after C1's response disappears, whether C1 committed before the worker lock was released/lost. Nor can a future worker infer exact C1 completion from the absence of an in-memory lock.

A fresh worker therefore needs durable result evidence, not merely a new lock.

## OperationLog alone is insufficient

P1-210 already requires authoritative durable subsystem state instead of OperationLog as sole proof.

For full replace/clear this is especially important:

- logs may be pruned;
- log write can fail after the Journal transaction committed;
- operation id is currently caller-generated and P1-198 still requires stronger worker-issued identity;
- a log event saying “started” is not proof of commit;
- a missing “complete” event is not proof that commit did not occur.

Correctness evidence should live at the Journal transaction/generation boundary.

## Required bulk-operation receipt

A destructive Journal operation should have a worker-issued immutable receipt binding at least:

- operation generation/id;
- command kind (`import-replace`, `clear-all`, `clear-site`, etc.);
- exact expected target Journal revision from the user's confirmation;
- import staging/content generation where applicable;
- normalized clear scope where applicable;
- post-commit Journal revision/generation when commit succeeds;
- commit phase/status.

The authoritative Journal transaction should durably record enough of the receipt/result atomically with, or safely ordered around, the destructive commit so a restarted worker can answer status without replaying the command.

## UI behavior after outer result loss

Do not display transport rejection as proven “ничего не изменилось / импорт не выполнен”.

Instead:

1. enter `result unknown / checking operation` state;
2. perform one bounded read-only reconciliation by exact operation receipt;
3. if `committed`, refresh Journal and report the already-completed result;
4. if `not-admitted` is proven, a fresh destructive attempt may be offered and must receive a fresh target-revision confirmation;
5. if outcome remains unknown, do not offer blind repeat;
6. if the user deliberately chooses a new destructive attempt after unresolved state, require explicit new confirmation against the **current** Journal generation and preserve evidence for the old operation.

## Staging cleanup must not erase commit evidence

The imported bytes can be safely discarded after a proven commit or user cancellation according to their own lifetime contract.

But deleting staging after an outer failure cannot be treated as evidence that import did not commit. Conversely, retaining staging cannot mean it is safe to replay replace.

`staging/content receipt` and `target Journal commit receipt` are separate dimensions.

## Relationship to target-revision confirmation

The sibling `AUDIT_DELTA_JOURNAL_BULK_CONFIRMATION_REVISION_AUTHORITY_2026-08-28.md` requires C1 to prove expected target generation G0 before committing.

P1-210 then requires the result to remain reconcilable after C1:

- C1 expected G0 and committed -> durable result says committed G1;
- new R creates G2;
- an old transport error cannot authorize C2 against G2;
- any intentional C2 must receive a new confirmation for G2.

Together these form one end-to-end destructive operation receipt: observed target -> admitted command -> commit generation -> delivered/reconciled result.

## Required regressions

1. Import C1 commits, response lost, no later mutations -> status reconciliation returns committed; no second replace is issued.
2. C1 commits, response lost, new entry R appears -> old UI/retry cannot delete R; committed C1 is reconciled.
3. C1 proven not admitted -> fresh attempt is allowed only after current target revision is confirmed.
4. C1 outcome remains unknown after bounded reconciliation -> UI remains unknown/manual; no blind replace.
5. Clear-all C1 commits, response lost, new entry appears -> retry cannot clear the new entry without fresh confirmation/new generation.
6. Same for scoped site/domain clear.
7. Worker stops after Journal transaction commit but before OperationLog completion -> durable Journal commit receipt still proves C1.
8. OperationLog is absent/pruned -> reconciliation still works.
9. Import staging has already been cleaned -> committed receipt remains enough to prove C1 happened; no replay is inferred from staging absence.
10. Same staged backup intentionally imported again later -> this is a distinct new destructive generation with a new target-revision confirmation.
11. Caller-supplied operationId collision cannot make one page reconcile/control another destructive operation after P1-198 worker-issued receipts.

## Duplicate check / numbering

No new item is created.

- **P1-210** owns outer transport-loss truth and retry admission.
- **P0-010** owns full Journal import/confirmation behavior.
- **P0-076** owns Journal generation/CAS around destructive mutations.
- **P1-198** remains worker-issued operation identity.
- The target-revision confirmation delta owns pre-commit stale target decisions; this file owns post-commit lost-result replay.

## Test / release state

Docs-only checkpoint. Product tests were not rerun. Historical **88/88 JavaScript syntax + 74/74 deterministic tests PASS** remains previous evidence only. Real multi-tab/MV3 response-loss regression remains required. No build, tag or Release was created.

## Retired source: `AUDIT_DELTA_JOURNAL_CONTEXT_REPLAY_SEMANTICS_2026-08-28.md`

SHA-256 of UTF-8 source text: `ae47f66173e49d96a6a6a49d43c82d1a607a831f0a5bbdd77bd88fd9675b9122`

# Audit delta — Journal `contextId` replay semantics — 2026-08-28

Source-of-truth `main` immediately before this write: `a4306d5913a18c121aa0a6ad1373b63267de76b1`.

Docs-only audit checkpoint. Runtime/configuration/tests/manifest are unchanged. No new P-number is assigned.

## Classification

Fresh source review completes the previously open question about whether `journal.html?contextId=<C>` is currently a one-shot capability.

No new blocker is created. This refines existing **P1-123** (Journal source-context storage lifecycle), **P1-124** (`tabs.create()` exact crash/unknown-settlement receipt) and **P1-175** (exact source-document authority).

## Current source proof — `contextId` is reusable for its TTL

`journal.js::loadStoredJournalContext()`:

1. derives `webclipJournalContext:<contextId>`;
2. reads the record from `chrome.storage.session` through the bounded extension-page read helper;
3. validates only age/URL-length/basic shape;
4. copies `sourceTabId` and `sourceUrl` into the page state.

There is no `chrome.storage.session.remove(key)` or compare-and-consume transition after a successful read. Fresh search of `journal.js` finds no session-storage removal for this key.

Therefore, while the record remains within the 24-hour context TTL, a second Journal page opened with the same `contextId` can load the same source context.

That can happen through an intentional tab duplicate/history reopen/copied extension URL, not only through a worker-created original tab.

## Why replay is not independently a current security defect

The stored context currently contains bounded source navigation metadata (`sourceTabId`, `sourceUrl`, `createdAt`). It is not by itself sufficient authority for the most sensitive action:

- Journal later fresh-reads the source tab;
- existing P1-175 requires exact source-document revalidation for Apply/commands;
- downstream PDF/save authority remains separately fenced by P0-070/P0-023;
- the `contextId` is random extension-internal state, not a host-page-provided token.

A duplicated Journal page obtaining the same source context is therefore not presently proven to bypass a remote destructive, credential, or host-permission boundary.

Do not invent a new P-number solely because the record is reusable.

## Critical composition with P1-124

P1-124 proposes using a unique browser-visible nonce to reconcile an unknown `tabs.create()` across MV3 worker loss. The existing random Journal `contextId` is an attractive candidate because it already appears in the target extension URL.

However the current semantics show that `contextId` cannot silently serve two incompatible roles:

1. **reusable source-context lookup key** for Journal pages during the TTL; and
2. **one exact tab-create/page-consumption receipt** proving that a particular create generation produced/was consumed by a particular page generation.

If P1-124 treats “a page with contextId C exists/loaded” as exact one-time create settlement while C remains replayable, a duplicate/reopened page could be mistaken for the exact created-page acknowledgement.

The fix must therefore make the roles explicit.

## Required design boundary

Acceptable models include either:

### A. Separate ids

Keep a reusable `sourceContextId` if product intentionally wants duplicated Journal pages to inherit the same source context, and introduce a distinct one-shot/random `tabCreateIntentId` for P1-124 reconciliation/ACK.

The create receipt is consumed/finalized by one exact tab/document generation; the source context may remain reusable under its own bounded lifecycle.

### B. Single id with separate generation/consumer receipts

If one physical id is retained, its durable/session record must distinguish:

- source-context data;
- tab-create generation;
- exact created tab/document acknowledgement;
- page-consumer generations;
- retired/create-settled state.

A second page may read reusable context if allowed, but it cannot satisfy or overwrite the already-settled create receipt.

## Source-document authority still must be exact

Even a legitimate second consumer must not inherit stale command authority merely from C.

Each Journal page must independently establish a current source receipt before command mutation:

- current source tab exists;
- current source URL/site policy is valid;
- exact top-document/navigation generation is captured;
- final scripting/message dispatch targets that generation.

Thus reusable context is only a navigation hint/bootstrap, not durable command capability.

## Cleanup semantics

The preceding `AUDIT_DELTA_JOURNAL_SOURCE_CONTEXT_TAB_CREATE_HANDOFF_2026-08-28.md` remains valid:

- proven create failure may promptly retire its exact prepared context when no reusable consumer has been intentionally published;
- unknown create settlement must retain enough state for late-tab reconciliation;
- after create settlement, source-context retention policy and create-receipt retention policy become separate concerns;
- generic 24-hour TTL remains bounded orphan cleanup, not proof that an exact create is still unresolved.

If reusable context is kept, pruning must not accidentally delete an unresolved P1-124 create receipt merely because the user opened/duplicated many Journal pages. Conversely a completed create receipt need not pin source context for 24 hours solely for reconciliation.

## Required regressions

1. Normal worker-created Journal tab C loads source context successfully.
2. Duplicate/reopened `journal.html?contextId=C` behavior matches the chosen product policy explicitly: reusable context may load, or one-shot context is visibly expired; it is not accidental.
3. A second page carrying C cannot satisfy the original P1-124 create ACK if that ACK is already owned by another exact tab/document generation.
4. Unknown `tabs.create` A later produces exact tab T -> reconciliation identifies T by create receipt, not merely “some page can read C”.
5. Unrelated duplicate page with C appearing before late T cannot steal the create-settlement receipt.
6. Reusable page consumers independently revalidate P1-175 exact source document before Apply/command.
7. Proven create failure cleanup does not delete source context intentionally retained by an already-acknowledged reusable page generation.
8. Context TTL/pruning and create-receipt TTL/cap remain separately bounded.

## Numbering result

No P1-211 is assigned.

- **P1-123** owns context storage/retention semantics.
- **P1-124** owns exact browser-tab create intent and settlement.
- **P1-175** owns exact source-document command authority.

The architectural acceptance point is: **do not let replayable source context become an implicit one-shot browser-create receipt.**

## Test / release state

Documentation only. Product tests were not rerun. Historical gate remains prior evidence only: **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. No build, tag or GitHub Release was created.

## Retired source: `AUDIT_DELTA_JOURNAL_DOCUMENT_AND_OPEN_TRANSPORT_AUTHORITY_2026-08-28.md`

SHA-256 of UTF-8 source text: `b304206762c32a160fae032aee97089b173a181f324ec19ee90ea7cbe57f2923`

# Audit delta — Journal exact-document command and open-URL transport authority — 2026-08-28

Source-of-truth `main` immediately before this write: `9dce396c8908ca6146428ee11d95c250212cc844`.

Docs-only audit checkpoint. Production runtime, tests, configuration and `manifest.json` are unchanged. Canonical large-table synchronization is not claimed by this file.

## Classification

No new P-number is assigned.

Fresh source proof refines existing:

- **P1-175** — exact source-document admission for Journal/page commands;
- **P1-125 / P1-171** — scripting/frame command receipts must be document-generation bound, including same-URL reload;
- **P1-124** — `tabs.create()` actual-settlement/crash-consistent receipt;
- **P1-210** — outer transport loss is `result unknown`, not permission to launch a second non-idempotent side effect;
- **P0-070 / P0-023** — save/PDF/retry authority must remain bound to the originating document generation.

Two concrete surfaces are confirmed: Journal `Apply selection` still has a tabId-only TOCTOU after its fresh check, and `openSavedUrl()` can deliberately duplicate a browser tab after an unknown worker result.

## Fresh source proof — Journal source context

`resolveSourceContext()` persists/loads only:

- `sourceTabId`;
- `sourceUrl`;
- `createdAt`.

It does not retain an exact `documentId` or a top-document navigation generation.

When possible it fresh-reads `chrome.tabs.get(sourceTabId)` and updates the URL. Failure clears the source context, which is a useful positive control: a definitely missing tab is not silently used.

However a surviving tab with a replacement document is still represented by the same tab id.

## `Apply selection` checks current URL but not exact document

The Journal apply path currently performs useful bounded checks:

1. fresh `chrome.tabs.get(sourceTabId)`;
2. require current `http(s)` URL;
3. compute current target `siteKey` and saved entry `siteKey`;
4. reject a different site;
5. when the exact URL differs but siteKey is the same, require explicit cross-URL confirmation.

Those controls correctly implement the product feature that a saved template may intentionally be applied to another URL of the same site.

After those checks, however, the path performs:

- `chrome.scripting.executeScript({ target: { tabId: sourceTabId }, files: ['content.js'] })`;
- then `chrome.tabs.sendMessage(sourceTabId, { type: 'WEBCLIP_APPLY_SELECTION_SNAPSHOT', ... })`.

Both final operations are tabId-only.

### Deterministic same-URL replacement schedule

1. Journal fresh-reads source tab/document A at URL U and validates U/siteKey.
2. A performs a full reload to document B at the same U before script injection/message.
3. URL and siteKey remain indistinguishable.
4. tabId is unchanged.
5. Journal injects/sends the saved selection to B.

No current check proves that B is the document generation the user authorized when Apply was admitted.

A different-URL same-site navigation can also race after the initial confirmation/check and before final dispatch.

This is exactly the already documented P1-175/P1-125/P1-171 root and does not warrant a new number.

## Required exact-document command contract

For Apply and all privileged page-command helpers:

1. capture an exact top-document receipt at admission, preferably current `documentId` plus a per-tab full-document navigation generation;
2. bind injection receipt to that generation;
3. immediately before the final command, prove the same generation is still current;
4. where the Chrome API supports it, target exact `documentId` rather than only tabId;
5. a late injection success from A cannot satisfy B;
6. a same-URL reload invalidates A just as a cross-URL navigation does;
7. cross-URL same-site Apply remains allowed only after the user's explicit confirmation, and that confirmation itself belongs to one exact target generation.

The exact-document fence should be shared with popup/context-menu page commands rather than creating Journal-specific ad hoc rules.

## Fresh source proof — `openSavedUrl()` blind fallback

Journal `openSavedUrl(url)` currently does:

1. send `WEBCLIP_OPEN_URL` to the worker;
2. if the Promise resolves, return;
3. on **any** rejection, call `window.open(value, '_blank', 'noopener,noreferrer')`.

The worker's `WEBCLIP_OPEN_URL` handler validates the URL and calls:

`createTabNextTo(sourceTabId, url, true)`

before returning `{ ok:true, tabId }`.

`createTabNextTo()` is the P1-124-controlled `tabs.create()` path with bounded actual-settlement tracking.

### Deterministic duplicate-tab schedule

1. Journal sends Open URL A.
2. Worker/P1-124 issues `chrome.tabs.create()`.
3. Chrome creates tab T.
4. The worker/page response channel fails before Journal receives `{ok:true, tabId:T}`.
5. Journal catch cannot distinguish this from a proven pre-admission failure.
6. It immediately executes `window.open()` for the same URL.
7. Browser now has T plus fallback tab T2 for one user action.

The worker's internal P1-124 same-worker/create receipt cannot protect the fallback because the second side effect bypasses the worker entirely.

This is a direct P1-210 outer-transport classification defect composed with P1-124, not a new root cause.

## Required Open URL contract

Outer page logic must distinguish:

- **application success received** — use returned tab result;
- **pre-admission failure proven** — an alternate open path may be allowed if product wants one;
- **result unknown** — do not issue another `window.open()`/`tabs.create()` until the exact P1-124 create receipt is reconciled.

Preferred architecture is one authoritative browser-tab creation owner rather than two independently side-effecting fallbacks.

A caller timeout/runtime rejection is never proof that `tabs.create()` did not occur.

For MV3 restart, P1-124's crash-recoverable create intent remains required; Journal must be able to reconcile the exact logical open, not simply search for any old tab with the same browsing URL.

## Direct `openDiskFolder()` note

Journal's Yandex-folder helper uses `window.open()` directly without first asking the worker to open the same tab. That does not create the same two-owner duplicate schedule by itself.

It still belongs to the broader P1-157 inventory of direct extension-page Chrome/browser operations and should eventually receive explicit bounded/product-consistent ownership, but this checkpoint does not claim a separate correctness blocker for it.

## Save/retry composition

The Apply race matters beyond visual selection:

- after stale Apply lands in replacement document B, B can later initiate PDF/Yandex save using state the user intended for A;
- P0-070 must fence any live save from exact user-command/source generation through print and post-print finalization;
- P0-023/P0-079 must prevent old retry-cache authority from crossing a same-URL document replacement.

Exact command admission therefore cannot be postponed until `Page.printToPDF`; the generation chain begins when the user authorizes the page command.

## Required deterministic regressions

1. Apply on document A at U -> same-URL full reload B before injection -> B receives no apply command.
2. Apply on A -> injection begins -> same-URL reload B -> late injection receipt for A cannot satisfy/send into B.
3. Cross-URL same-site Apply confirmation for target A -> target navigates again before final command -> stale confirmation cannot authorize the new document.
4. Missing/closed source tab continues to fail closed and clears source context.
5. Intentional same-site cross-URL Apply still works when one exact target generation remains stable from confirmation through command settlement.
6. Saved URL Open -> worker creates browser tab -> response channel lost -> Journal does not create a second fallback tab.
7. Open URL proven rejected before `tabs.create()` admission -> product may expose a safe alternate action without treating unknown as failure.
8. Worker restart after browser tab creation but before page result -> P1-124 receipt reconciliation returns/reuses only the exact created tab and no duplicate is opened.
9. Existing unrelated tab with same browsing URL is not accepted as proof of an unknown create unless exact request receipt identifies it.
10. Navigation after Apply but before subsequent PDF save is caught again by P0-070 exact save generation; no stale command state becomes authority for B.

## Duplicate check

No new item is created.

- P1-175 already owns stale source/page command admission.
- P1-125/P1-171 own document-bound script/message receipts and same-URL lifecycle.
- P1-124 owns actual settlement/crash reconciliation of `tabs.create()`.
- P1-210 owns user/page behavior after outer response loss.
- P0-070/P0-023 own downstream save/PDF/cache document binding.

## Test / release state

No product tests were rerun for this docs-only checkpoint. The last proven product gate remains historical **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. Runtime/version remain unchanged (`0.9.8`). No build, tag or Release was created.

## Retired source: `AUDIT_DELTA_JOURNAL_ENTRY_ID_WIDTH_COHERENCE_2026-08-28.md`

SHA-256 of UTF-8 source text: `3996674fce955dead1240e8b9a49fe9fe7a9f115c3436828364536f4ca419116`

# Audit delta — Journal entry-id width coherence — 2026-08-28

Docs-only audit checkpoint. Runtime/config/manifest/tests are unchanged.

## Classification

No new P-number.

Primary existing owner: **P1-025** (`WEBCLIP_OPEN_JOURNAL_SAVED_FILE` / Yandex destination badge). Import/schema ownership remains **P1-030**. This checkpoint adds one deterministic boundary requirement: every Journal-entry RPC must accept the same canonical entry-id width as the persisted/imported schema.

## Source proof

Current persisted/imported Journal schema defines:

- `MAX_IMPORTED_ENTRY_ID_CHARS = 180`;
- `normalizeImportedJournalEntry()` accepts/bounds entry ids to 180 characters;
- `journalViewSummary()` returns `entry.id` sliced to 180 characters.

Most Journal mutation routes preserve the full textual id and delegate validation/lookup downstream:

- `WEBCLIP_JOURNAL_DELETE` -> `deleteJournalEntry(String(message.id || ''))`;
- comment add/edit/delete routes use the full `String(message.id || '')`;
- `WEBCLIP_JOURNAL_MARK_READ` uses the full `String(message.id || '')`;
- `WEBCLIP_JOURNAL_GET_MANY` accepts ids and its helper bounds them to the persisted 180-character domain.

The open-saved-file route is inconsistent:

```js
case 'WEBCLIP_OPEN_JOURNAL_SAVED_FILE': {
  ...
  const id = boundedContentString(message.id, 160).trim();
  ...
  const entry = await getJournalEntryById(id);
```

`journal.js` sends the actual rendered `entry.id` when the Yandex destination badge is clicked.

## Deterministic failure

1. Import a valid Journal backup containing a Yandex entry with an id of 161–180 characters.
2. Import normalization accepts the id and stores it unchanged within the supported 180-character schema.
3. Journal view returns/renders that same id.
4. Delete/comment/Mark Read can still address the exact entry because those routes do not truncate it to 160.
5. User clicks the `Яндекс Диск` badge.
6. `journal.js` sends the exact id.
7. Worker truncates it to 160 and calls `getJournalEntryById()` with a different key.
8. The real entry is not found, so the valid public URL is treated as unavailable.

This is deterministic and does not require a race or malformed IndexedDB state.

## Required contract

1. Define one canonical Journal entry-id normalization helper/shared constant.
2. The worker, Journal page, import normalizer, view summaries, `GET_MANY`, open-file, delete, comments and Mark Read must all use the same supported id domain.
3. A supported id must never be silently truncated into a different valid-looking key at an action boundary.
4. If an id is outside the supported domain, reject it explicitly before lookup rather than retargeting it by truncation.
5. Imported ids of exactly 180 characters remain round-trippable through export/import and every user-visible Journal action.
6. Future versioned schema changes to id width must migrate/validate all RPC consumers together.

## Regression cases

- 160-character imported Yandex id -> destination badge opens the exact entry.
- 161-character id -> same result.
- 180-character id -> same result.
- 181-character source id -> import applies the schema's explicit normalization/rejection rule; no action later performs a second incompatible truncation.
- Two ids sharing the first 160 characters but differing afterward remain distinct; opening either cannot address the other.
- Delete/comment/Mark Read/open-file all resolve the same exact persisted key.

## Duplicate check

This is not a new import-streaming problem and does not require a new stable P-number. It refines **P1-025** because that feature's protected `journalEntryId` transport currently narrows the schema behind the UI, with **P1-030** providing the imported-id domain.

## Validation note

Documentation only. Product tests were not rerun; historical 88/88 JavaScript syntax + 74/74 deterministic PASS remains prior evidence only. No build, tag or Release was created.

## Retired source: `AUDIT_DELTA_JOURNAL_GROUPED_VIEW_LEGACY_INDEX_VISIBILITY_2026-08-28.md`

SHA-256 of UTF-8 source text: `39f3afe852ca5afd1ff277e12714c0bf5be32930311efa953521db5a92d52aaa`

# Audit delta — grouped Journal legacy-index visibility — 2026-08-28

## Scope

Docs-only audit of grouped Journal query/index behavior. No new P-number.

Refines the existing **P1-206 Journal composed-view coherence** contract. The performance/index owners (P1-009/P1-174) remain dependencies but are not renumbered.

## Finding

The current source explicitly recognizes that some legacy Journal rows may not contain newer derived compound-index fields.

`openJournalViewCursor()` therefore deliberately uses the universal `createdAt` index and comments that this keeps legacy entries without newer derived compound-index fields visible; predicates are recomputed from row data.

Grouped mode does not preserve that compatibility boundary:

- `queryJournalViewGroups()` opens `store.index('urlKeyCreatedAt').openCursor(...)` directly;
- `queryJournalViewGroupEntries()` also queries `urlKeyCreatedAt` for the selected `urlKey`.

IndexedDB compound indexes omit records whose indexed key path is missing/invalid. A row that is still readable through the primary/`createdAt` path can therefore disappear from grouped enumeration solely because its stored derived `urlKey`/compound key was never backfilled by an older build.

### Deterministic legacy schedule

1. Profile contains legacy Journal row L that is valid as a Journal record and has recoverable `url`/hostname/createdAt, but lacks the newer persisted `urlKey` field needed by `urlKeyCreatedAt`.
2. Ungrouped page query scans `createdAt`; `journalViewSummary(L)` can derive `urlKey` from L's URL, so L is visible.
3. User enables grouping by URL.
4. Group query enumerates only the compound index; L has no index entry and is absent.
5. Counts/metadata can still include L because other scans use broader indexes/row predicates.
6. UI can therefore report a count that grouped rows cannot enumerate, and toggling grouping appears to make data disappear.

This is a read-model/index compatibility failure, not Journal source corruption.

## Why this matters to P1-206

A coherent composed view requires not only one revision, but also one **membership universe**. Metadata/counts, ungrouped pages, grouped pages and group children cannot each silently define “all Journal entries” through different index-admission rules.

Revision fencing alone would still produce a perfectly consistent revision R in which grouped mode omits L forever.

## Required contract

Choose one explicit strategy:

### Backfill/rebuildable derived index fields

On upgrade/maintenance, version and backfill normalized `urlKey/siteKey` (and any future compound-index fields) for every source row, with a durable rebuild-generation/dirty marker. Grouped/indexed query may use the fast compound index only after the relevant derived-index generation is proven complete.

### Compatibility fallback

Until backfill is complete, grouped mode must include legacy rows through a bounded fallback path and merge them without duplicates. The fallback cannot devolve into an unbounded full-heavy-record scan on every page.

In either design:

- row source data remains authoritative;
- derived index absence is not interpreted as row deletion/filter mismatch;
- import/append/update keeps derived fields consistent for new generations;
- grouped header and child expansion use the same inclusion semantics.

## Acceptance cases

1. Legacy L missing persisted `urlKey` remains visible in ungrouped and grouped views.
2. Counts and grouped membership agree for one stable Journal revision.
3. Backfill interrupted by MV3 termination remains explicitly incomplete and resumes/rebuilds; partially indexed state is not published as complete.
4. Backfill racing with append/import cannot mark a stale derived generation current.
5. Modern rows already carrying valid compound fields retain fast indexed behavior.
6. A malformed/unrecoverable URL follows the product's explicit fallback grouping rule instead of disappearing only because an index key is absent.
7. Group child expansion returns the same legacy row represented by its header.
8. P1-206 pagination continuation remains revision-bound during/after index-generation changes.

## Classification

No new number. **P1-206** remains composed-view revision/membership owner; P1-009/P1-174 constrain any fallback/backfill architecture so the fix does not reintroduce unbounded heavy scans/materialization.

## Validation note

Documentation only. Runtime/tests/manifest unchanged. Product tests were not rerun; historical 88/88 JS syntax + 74/74 deterministic PASS remains prior evidence only. No build/tag/release.

## Retired source: `AUDIT_DELTA_JOURNAL_GROUP_BOUNDARY_REVISION_2026-08-28.md`

SHA-256 of UTF-8 source text: `6905673f0352dfa6d7abeef673385b7395836ab573d76d1a94dbed29f9d10a91`

# Audit delta — Journal grouped-pagination boundary vs revision — 2026-08-28

Source-of-truth `main` immediately before this write: `170d829ff9f8ccfabfa86ca8da02b89780273c92`.

Docs-only audit checkpoint. Production runtime, tests, configuration and `manifest.json` are unchanged. No new P-number is assigned.

## Classification

Fresh source proof refines existing **P1-206 — Journal composed-view revision coherence**.

P1-206 already requires one end-to-end Journal revision receipt for metadata/counts/groups/entries/child expansion. This checkpoint adds a deterministic pagination-specific manifestation: the cached group boundary of page N can belong to Journal revision A while page N+1 is computed from revision B, causing a logical URL group to be skipped or duplicated.

Related but separate:

- **P1-009** remains search/filter CPU/index scalability;
- **P1-127** remains polling/timer read fanout;
- **P1-174** remains eager heavy Journal view materialization;
- **P0-050** remains derived `urlStats` rebuild isolation.

## Fresh source proof

### 1. Group pagination stores a boundary outside IndexedDB

`journal.js::renderCurrentEntries()` keeps page boundaries in module memory:

`urlGroupPageBoundaries`.

After rendering a grouped page, it stores the returned last group as the boundary for the next page. The boundary contains values equivalent to:

- `key` / normalized URL identity;
- `url`;
- `latest` timestamp used by the group sort order.

The boundary does not carry the Journal DB revision from which it was derived.

### 2. The next page is a new database read

A later page request calls the grouped reader again and performs fresh IndexedDB transactions over the current Journal contents.

The grouped reader recomputes logical URL groups, including each group's `latest` timestamp, and orders groups by the current sort comparator (newest group first, then deterministic URL/key tie-breakers).

It then applies `groupComesAfterBoundary(group, boundary)` using the cached boundary from the previous page.

There is no assertion that current Journal revision equals the revision that created that boundary.

### 3. A Journal mutation can move a group across the old boundary

The order key of a group is mutable because adding or removing an entry for that URL changes the group's `latest` timestamp.

Deterministic schedule:

1. Revision A contains groups `G1 ... Gn`; page 1 is rendered and caches boundary `Bn` from the last visible group.
2. Before page 2 is requested, a Journal mutation creates revision B.
3. The mutation changes the newest entry of an existing group G so G moves from one side of `Bn` to the other in the sorted order.
4. Page 2 is read from revision B but filtered with boundary `Bn` from A.
5. Depending on direction of movement, G can be omitted from both pages or appear on both pages across the user's navigation history.

The same issue exists if deletion changes/removes the boundary group itself, or if import/clear replaces the whole Journal between page requests.

### 4. This is stronger than a cosmetic count mismatch

P1-206 was initially proven with metadata/counts from revision A and entries from revision B in one render.

Grouped pagination adds an inter-page consequence:

- a user can fail to see a group that exists in the current Journal;
- a group can be shown twice while another is displaced;
- cached page boundaries no longer describe one coherent ordered snapshot;
- navigating back/forward can produce different membership without an explicit refresh signal.

The underlying Journal source of truth is not corrupted, but the read model does not provide a coherent traversal of it.

### 5. Child expansion has the same revision requirement

When a grouped row is expanded, child entries for that URL are read separately. The group header/count/latest metadata and the expanded child page must also carry/validate the same view revision contract; otherwise a group header from A can expand children from B and then establish B as the polling baseline.

This remains part of P1-206 rather than a separate item.

## Required P1-206 refinement

### Every continuation token must be revision-bound

Grouped pagination must return a continuation/boundary receipt containing at least:

- exact Journal DB revision;
- normalized sort/filter/grouping parameters;
- boundary sort key (`latest`, URL/key tie-breakers) from that revision.

A continuation may be consumed only while that Journal revision is still current.

If revision changed, do not apply the old boundary to the new data. Restart the logical view from a defined page (normally page 1) or obtain a fresh coherent continuation sequence and visibly refresh the UI.

### Metadata, group page and baseline must agree

A successful render should publish only when:

1. metadata/counts/filter domains were derived from revision R;
2. grouped page/entry page was derived from R;
3. any page continuation used also belongs to R;
4. immediate post-read revision validation still says R is current;
5. only then is R stored as the polling baseline.

If any component reports a different revision, discard that composed result and retry/restart within a bounded policy.

### Do not solve with one unbounded long transaction

A single readonly transaction over the entire 100k-entry Journal is not required and may conflict with existing bounded-IDB/lifecycle goals.

Acceptable designs include revision-before/revision-after fences around bounded component reads, versioned continuation receipts, or a versioned read-model/index generation. Any retry loop must be bounded under a high-mutation workload and surface a controlled `view changed, refresh required` state rather than spin indefinitely.

## Required deterministic regressions

1. Page 1 on revision A -> append to a group originally after boundary so it moves before boundary in B -> page 2 cannot silently omit/duplicate groups; old continuation is rejected/restarted.
2. Page 1 on A -> delete newest entry of a group so it moves after boundary in B -> same coherent behavior.
3. Boundary group itself is deleted between page 1 and page 2 -> old boundary is not applied as if still authoritative.
4. Import-replace between pages, including reuse of the same URL strings -> A continuation cannot enumerate replacement Journal B.
5. Clear between pages -> no stale page-2 continuation yields entries after the UI accepted empty/new metadata.
6. Group header from R expands children only under R; revision change forces bounded refresh/re-expansion.
7. Metadata A + group page B is rejected before the polling baseline is advanced to B.
8. A high mutation rate causes bounded retries/explicit refresh state, not an infinite transaction or render loop.
9. Stable Journal with no mutation preserves current deterministic pagination order and page size.
10. Filter/grouping toggle invalidates all prior continuation receipts even if Journal revision itself did not change.

## Duplicate check / numbering

No new number is created.

- **P1-206** remains the owner of coherent Journal view revision receipts and now explicitly includes pagination continuation/boundary tokens.
- **P1-009**, **P1-127**, **P1-174** and **P0-050** remain separate as described above.

This is specifically not a new `P1-208`.

## Test / release state

Audit documentation only. Product tests were not rerun. The last proven product gate remains the historical **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. Runtime/config/manifest are unchanged; version remains `0.9.8`. No build, tag or GitHub Release was created.

## Retired source: `AUDIT_DELTA_JOURNAL_OPEN_SAVED_FILE_RENDERED_GENERATION_2026-08-28.md`

SHA-256 of UTF-8 source text: `71c6a5be87603e743806e04cd44057c02a85f400a9ae212ddd853fefd9d05278`

# Audit delta — Journal Open Saved File rendered-entry generation — 2026-08-28

## Scope

Docs-only audit of the Journal/Yandex saved-file navigation path. No new P-number.

This checkpoint extends the existing **P1-206 coherent Journal render revision** / **P0-076 exact entry-generation** model from mutation buttons to an important non-destructive action.

## Positive control — imported URL is not a raw navigation capability

Current `journal.js` does not render `entry.publicUrl` as an arbitrary anchor.

It first requires `isOpenableYandexPublicUrl()` (`https:` plus `disk.yandex.ru`, subdomains, or `yadi.sk`). The badge click then sends only:

`WEBCLIP_OPEN_JOURNAL_SAVED_FILE { id: entry.id }`

The worker fresh-reads the Journal entry and independently validates destination/public URL/Yandex allowlist before creating a tab.

Therefore an imported `https://evil.example/...` value is not directly navigated from extension-page markup. This defense-in-depth boundary should be preserved.

## Finding — fresh read by textual id can retarget a stale rendered click

The same fresh-read pattern is insufficient for **user action identity** when the row can be replaced under the same id.

The click closure stores only `entry.id`. It does not carry:

- Journal render revision;
- immutable entry generation/revision;
- expected public URL/resource generation.

The worker receives only id J and calls `getJournalEntryById(J)`, so whatever record currently occupies J becomes the target.

### Deterministic schedule

1. Journal page renders entry A with id J and Yandex badge representing A.
2. Another Journal page / staged replace-import commits entry B under the same textual id J.
3. The first page has not yet refreshed and still visibly shows A.
4. User clicks A's “Яндекс Диск” badge.
5. Page sends only `{id:J}`.
6. Worker fresh-reads current B.
7. If B has an allowed Yandex public URL, WebClip opens B's file, not the object the user clicked.

The worker's freshness has become **retargeting**, not protection.

The same logical problem can occur in a content-page Journal template if a previously displayed/current template action identifies its target only by reusable entry id and the worker later resolves a replacement generation.

## Security/risk boundary

This action is not a destructive Yandex mutation, so this audit does not create a new P0 solely for the navigation mismatch. The user already has Journal access to both records in the trusted extension context.

However it is still an exact user-intent and provenance failure: a visible action can open a different saved document than the one represented at click time. It also weakens forensic/debug expectations around same-id import replacement.

## Required contract

Every actionable rendered entry should carry an exact render/entry receipt. For Open Saved File, the request should include enough expected authority to prove:

- page acted on coherent Journal revision R;
- entry id J referred to immutable entry generation E at render/click time;
- current worker row still represents E before opening any URL.

A mismatch should return a stale-view result and refresh/re-render, not silently substitute current B.

The worker remains authoritative for URL allowlisting; expected URL sent by the page is not itself trusted as a destination.

## Acceptance cases

1. Stable A -> click -> worker proves entry generation A and opens A's allowed Yandex URL.
2. A rendered -> import replaces same id with B -> stale A click opens nothing and asks/causes refresh; B is not silently substituted.
3. A URL changes within a newer generation -> stale click does not attach to the newer URL by id alone.
4. Crafted imported non-Yandex HTTPS URL remains disabled on page and rejected by worker.
5. Stale entry receipt never weakens worker Yandex host validation.
6. Ordinary Journal notification refresh remains an optimization; correctness does not depend on refresh racing before the click.

## Classification

No new number.

- **P1-206**: coherent rendered Journal revision/action source.
- **P0-076** supplies the exact entry-generation/CAS principle for same-id replacement; destructive mutation consequences remain P0, while this open action is a P1 correctness extension.

## Validation note

Documentation only. Runtime/tests/manifest unchanged. Tests were not rerun; historical 88/88 syntax + 74/74 deterministic PASS remains prior evidence only. No build/tag/release.

## Retired source: `AUDIT_DELTA_JOURNAL_OPEN_SOURCE_URL_FRESH_TAB_MISMATCH_2026-08-28.md`

SHA-256 of UTF-8 source text: `55c6631e707a9e0b9525947e6077ec5e1745f0c45b5416b40d8c4ab3e72a3db2`

# Audit delta — Journal open source URL vs fresh tab mismatch — 2026-08-28

## Scope

Docs-only audit of `openJournalPage()` source-context construction. No new P-number.

Refines **P1-175** source-document admission and composes with **P0-070** exact downstream save/document generation. It is distinct from P0-030's content-supplied foreign-tab-id issue: `WEBCLIP_OPEN_JOURNAL_PAGE` is not a content-script-allowed message, and context-menu callers use Chrome-provided tab data.

## Finding

`openJournalPage({ sourceTabId, sourceUrl, ... })` fresh-reads `chrome.tabs.get(sourceTabId)`, but a syntactically valid caller/event `sourceUrl` remains authoritative even when the fresh tab already has a different current URL.

Current logic is equivalent to:

1. `resolvedSourceUrl = String(sourceUrl || '')`;
2. fresh `sourceTab = tabs.get(tabId)`;
3. only when `resolvedSourceUrl` is **not** HTTP(S), replace it with `sourceTab.url`;
4. persist `{sourceTabId: tabId, sourceUrl: resolvedSourceUrl}` into Journal session context.

Therefore the worker can create a context whose tab id and URL never described the same current browser document at the time the context was stored.

### Deterministic browser-event rollover schedule

1. Context-menu click is delivered with Chrome tab snapshot A at URL `UA`.
2. `handleContextMenuClick()` calls `openJournalPage({sourceTabId:T, sourceUrl:UA})`.
3. Before `openJournalPage()` performs its fresh `tabs.get(T)`, T navigates to document B at URL `UB`.
4. Fresh `tabs.get(T)` successfully proves the tab now exists as B/UB.
5. Because supplied `UA` is already a valid HTTP URL, current code does not replace/compare it with UB.
6. Worker stores context `{sourceTabId:T, sourceUrl:UA}` and opens Journal.
7. Initial current-URL/site view can be based on UA while the actionable source tab is B.

The same class applies to a trusted extension-page caller carrying an older URL observation while the tab has already navigated.

## Why fresh `tabs.get()` is not currently providing the intended proof

The worker already pays the cost of a fresh privileged tab read and fails closed when it cannot determine the source tab. That is a useful positive control.

But the read is presently used only to:

- reject Incognito;
- supply a URL when caller URL is absent/non-http.

It is not used as an expected-vs-current precondition when the caller URL is valid. Thus stale caller/event metadata can override fresher browser observation.

## Required source-context contract

When `sourceTabId > 0`:

- the fresh Chrome tab observation is authoritative for current browser URL/window/incognito state;
- caller/event `sourceUrl` is at most an **expected prior observation**, not a newer source of truth;
- if expected URL differs from current URL, either explicitly rebind the requested Journal mode to the current tab/document under product rules or fail/reconfirm; never persist the mixed pair;
- stored Journal context should carry exact current document/navigation generation in addition to tabId/current URL once the P1-175/P0-070 document-receipt design exists;
- same-URL full reload must still invalidate the old document generation even though URL comparison succeeds.

`anchorTabId` remains placement authority only; it must not replace source identity.

## Acceptance cases

1. Event/caller supplies UA and fresh tab is still A/UA -> context stores one coherent A receipt.
2. Event/caller supplies stale UA but fresh tab is B/UB -> no `{T,UA}` mixed context is stored.
3. Current/site mode after navigation either explicitly uses current UB or fails stale according to chosen UX; it never silently filters UA while targeting B.
4. Same-URL reload UA→UA still changes document generation and old source receipt becomes stale.
5. Missing/closed source tab remains fail-closed.
6. Incognito classification continues to come from fresh Chrome tab state, not caller URL.
7. A later Journal Apply/save consumes the exact context generation and cannot retarget through tab-id reuse/navigation.

## Classification

- **P1-175** remains primary source-context/page-command admission owner.
- **P0-070** remains exact document generation through live PDF/save finalization.
- **P0-030** remains content-sender payload/tab authority and is not expanded merely because this extension/context-menu stale-observation schedule exists.

No new P1-211 is allocated.

## Validation note

Documentation only. Runtime/tests/manifest unchanged. Product tests were not rerun; historical 88/88 JS syntax + 74/74 deterministic PASS remains prior evidence. No build/tag/release.

## Retired source: `AUDIT_DELTA_JOURNAL_RENDERED_REVISION_MUTATION_AUTHORITY_2026-08-28.md`

SHA-256 of UTF-8 source text: `cab7a68c4c533ee87e9b77805b535dad60aa1cd63a6239c5bf03be20f3fc13d0`

# Audit delta — Journal rendered revision as mutation authority — 2026-08-28

Source-of-truth `main` immediately before this write: `9f35a1db1bb1d44c3c0ee5b4762ce27585663d14`.

Docs-only audit checkpoint. Production runtime, tests, configuration and `manifest.json` are unchanged. Canonical large-table synchronization is not claimed by this file.

## Classification

No new P-number is assigned.

Fresh source proof connects two already confirmed contracts that must be implemented together:

- **P1-206** — a rendered Journal view must have one coherent Journal revision receipt;
- **P0-076** — every per-entry/local/destructive mutation must require expected entry/Journal generation rather than retargeting by textual id.

Adjacent owners remain P1-210 for outer response loss, P1-198 for operation receipt, and P0-073/P0-074/P1-184 for exact Yandex object context.

The key result is that a background refresh notification is not a correctness fence. **The exact data revision the user saw when authorizing an action must be returned to the worker as mutation authority.**

## Current page refresh machinery is useful but asynchronous

Journal listens to `chrome.storage.onChanged` for `webclipJournalRevision` and schedules a reload when the token changes. Runtime notifications also schedule reloads.

This is valuable eventual UI convergence.

P1-206 already proves, however, that one render can combine different revisions and can even baseline a later revision as if it matched the screen. In addition, a storage/runtime notification can simply arrive after a user interacts with an already rendered card.

Therefore `onChanged` cannot be used as proof that the page is current at action time.

## Current mutation messages carry ids, not observed revisions

Examples from `journal.js`:

- local delete: `{ type:'WEBCLIP_JOURNAL_DELETE', id:entry.id, diskAction:'keep', operationId }`;
- Yandex Trash/delete: same id + diskAction + operationId;
- Mark Read: worker handler accepts only `id` + textual operationId;
- comment edit: `id + commentId + comment`;
- comment delete: `id + commentId`;
- comment add: `id + comment`.

No message carries:

- Journal revision rendered by this page;
- immutable entry generation/revision;
- expected comment revision/generation;
- exact remote-management generation shown to the user.

The worker then fresh-reads the current record by id.

## Fresh read is not authorization

For a read-only UI query, fresh-reading current data is desirable.

For a user-authorized mutation, fresh-reading a replacement object and silently applying an old user decision to it is unsafe.

### Deterministic stale-card destructive schedule

1. Journal page P renders entry J generation A and the user sees A's title/path/status.
2. Another Journal tab or import/replace commits Journal revision B. B contains a replacement entry with the same textual id J but different remote object/path/account or semantic state.
3. P has not yet completed its asynchronous reload, or P1-206 left an incoherent/stale card visible.
4. User clicks Trash on the visible A card and confirms that UI.
5. P sends only `id=J` and diskAction.
6. `deleteJournalEntry()` executes `getJournalEntryById(J)` and obtains **current B**.
7. Remote containment/account/object logic now operates on B.
8. The user's confirmation for A has been retargeted to B without another confirmation.

The worker's fresh read makes the mutation internally current, but it does not prove user authority for that current object.

This is the per-entry generation problem already owned by P0-076.

## Mark Read has the same authority problem

`WEBCLIP_JOURNAL_MARK_READ` dispatches only `id` and `operationId` into `moveReadLaterEntryToRead()`.

A stale page can therefore authorize a remote move based on A while the worker resolves J to a newer B. Page-local busy flags do not help across pages/import generations.

Per-entry remote mutation admission must compare the exact rendered/expected entry generation before any Yandex move side effect begins.

## Comments require finer-grained CAS

Comment edit/delete currently re-read the current entry, construct/normalize the comment array, then later call `updateJournalEntryRecord()` with a whole `journalComments` patch.

The existing concurrency delta already proves two writers can lose updates because the patch was computed before the final transaction.

The rendered-revision angle adds another deterministic case:

1. page P displays comment C revision A;
2. another page edits C to B;
3. P has not refreshed and submits an edit/delete intended for A;
4. worker identifies only `entryId + commentId` and acts on current C/B;
5. P's stale edit can overwrite B, or stale delete can tombstone B, without conflict indication.

Required comment authority is therefore `expected entry generation + expected comment generation/revision`, or an equivalent transactional CAS/merge model.

## Required P1-206 -> P0-076 handoff

A coherent render should expose/store an exact mutation receipt for every actionable entry. Conceptually it should bind:

- Journal database revision/generation;
- immutable entry generation/revision;
- entry id as display/lookup identity, not sole authority;
- remote-management generation/object receipt for Yandex entries where applicable;
- comment generation for individual edit/delete actions.

When the user clicks an action, the page sends the expected receipt it actually rendered.

Inside the same authoritative transaction that admits/commits local mutation, worker verifies the expected generation. For a remote side effect, this check occurs **before** external mutation admission and is backed by a durable per-entry operation lease/generation.

Mismatch means `stale/conflict`: refresh and ask the user again if necessary. It never means "fresh-read the replacement and apply the old decision to it".

## P1-206 remains a view contract, not a substitute for CAS

Even a perfect P1-206 implementation cannot guarantee no mutation occurs after rendering and before a click.

Therefore:

- P1-206 ensures the user saw one coherent accepted revision;
- P0-076 ensures later mutations prove that exact observed entry generation is still current.

Both are mandatory. Fixing only the render still leaves ordinary time-of-check/time-of-use mutation races.

## Notification/reload semantics

Storage/runtime change notifications remain useful for UX and should usually disable/reload stale cards promptly.

But they are advisory optimization:

- missing/delayed notification cannot grant mutation authority;
- a reload scheduled but not yet completed should invalidate existing action receipts where possible;
- a stale page can never bypass worker CAS by racing the refresh timer.

## Required deterministic regressions

1. Page P renders J/A -> import replaces J with J/B -> P clicks Trash before reload -> worker rejects stale A receipt; no remote mutation B occurs.
2. Same schedule for local-only Delete: replacement B is not deleted.
3. Same schedule for Mark Read: B is not moved.
4. Page A and page B concurrently mutate the same unchanged entry generation: one exact lease/CAS winner or deterministic merge; incompatible remote operations never both start.
5. Comment C/A rendered in P -> another tab edits C/B -> stale P edit returns conflict and cannot overwrite B silently.
6. Same for stale comment delete: newer B is not tombstoned using A's confirmation.
7. Two concurrent comment additions can merge transactionally or one retries/conflicts; no silent whole-array lost update.
8. P1-206 mixed-render detection does not baseline a revision that lacks valid action receipts for the published cards.
9. Storage/runtime change notification arriving late cannot let a stale action pass worker CAS.
10. Stable page/revision action succeeds normally without requiring an unnecessary reload.
11. Remote result physically settles after a later local generation conflict: retain exact recovery evidence; do not retarget/rollback blindly.
12. Clear/import advances Journal generation and invalidates every old entry/action receipt even when textual ids are reused.

## Duplicate check

No new item is created.

`AUDIT_DELTA_JOURNAL_CONCURRENCY_SETTLEMENT_2026-08-27.md` already extends P0-076 to cross-tab per-entry mutation fencing and transactional comment updates. `AUDIT_DELTA_JOURNAL_VIEW_REVISION_COHERENCE_2026-08-27.md` owns coherent screen revision P1-206.

This checkpoint defines the missing interface between them: **the revision/entry generation proven for the rendered UI is the expected-generation input to every later mutation.**

## Test / release state

No product tests were rerun for this docs-only checkpoint. Historical product gate remains **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. Runtime/version remain unchanged (`0.9.8`). No build, tag or Release was created.

## Retired source: `AUDIT_DELTA_JOURNAL_SOURCE_CONTEXT_TAB_CREATE_HANDOFF_2026-08-28.md`

SHA-256 of UTF-8 source text: `169a0b5ccc422867cf524f4b74e4be7fba22a8e3aa40bc4b8982297235cdb324`

# Audit delta — Journal source-context handoff to tab creation — 2026-08-28

## Scope

Docs-only audit of the handoff from durable/session Journal source context to browser tab creation. No new P-number.

Refines **P1-123** Journal source-context storage lifecycle and **P1-124** exact `tabs.create()` unknown-settlement receipt.

## Finding

`openJournalPage()` intentionally persists source context **before** creating the Journal tab:

1. generate random `contextId`;
2. `await storeJournalSourceContext(contextId, sourceTabId, sourceUrl)`;
3. create `journal.html?...&contextId=<id>` with `createTabNextTo()`.

This ordering is valuable for crash safety: a Journal tab must never be created first and then discover that its source context was not durable.

However the handoff currently has no explicit state/result link between the stored context and the tab-create outcome.

### Proven create failure leaves an orphan context

If `createTabNextTo()` is proven to fail before a tab exists, `openJournalPage()` throws without removing the newly stored context.

The context remains in `chrome.storage.session` for up to the normal 24-hour TTL/pruning lifecycle even though this invocation has no browser consumer.

Repeated proven tab-create failures can therefore accumulate dead context records and consume the bounded `MAX_JOURNAL_SESSION_CONTEXTS` population, causing useful old/live contexts to be pruned earlier than necessary.

### Unknown create settlement is the opposite case

A local `tabs.create()` timeout/worker loss is **not** proof that no Journal tab exists. P1-124 already requires retaining/reconciling an exact create intent across MV3 lifetime.

In that class, eagerly deleting the source context would be wrong: Chrome may still open a late Journal tab whose URL contains the exact `contextId`.

Therefore one generic `catch -> remove context` is also insufficient.

The lifecycle must distinguish:

- context prepared + create **proven failed** -> exact context can be retired immediately;
- context prepared + create **unknown/may succeed** -> context remains pinned to the exact P1-124 create intent until reconciliation;
- create success -> context becomes owned by the exact Journal tab/page generation;
- tab closes/never consumes -> bounded owner/orphan cleanup eventually retires it.

## Required handoff receipt

The pre-create source context should be associated with a create-generation receipt containing at least:

- random `contextId`;
- exact tab-create request generation/nonce;
- source tab/document receipt from P1-175;
- phase such as `prepared | create-unknown | tab-created | consumed/retired`;
- bounded created/expiry metadata.

The Journal target URL's random contextId is already a useful browser-visible identity for exact P1-124 reconciliation.

### Cleanup ownership

- proven pre-create failure compare-deletes only the exact context generation;
- late failure/success from old create A cannot delete context for newer create B;
- unknown create keeps the context discoverable until exact tab reconciliation decides;
- once a Journal page consumes/acknowledges the context, lifecycle may transition to page-owned/session policy;
- generic 24h TTL remains a crash/orphan safety net, not normal cleanup for a synchronously failed create.

## Acceptance cases

1. Context C stores -> tab create succeeds -> exact Journal tab receives C.
2. Context C stores -> create is proven failed -> C is promptly retired.
3. Context C stores -> caller timeout but Chrome later creates tab T -> C remains until T/P1-124 reconciliation; late page can resolve its exact context.
4. Worker dies after C store and before create result -> new worker does not classify C as unused solely from worker loss.
5. Repeated proven create failures do not fill the 512-context population for 24 hours.
6. Create A failure cleanup cannot delete newer context B.
7. User closes reconciled Journal tab without consuming/retaining C -> bounded owner/orphan policy eventually releases it.
8. Context pruning never removes a generation still pinned by an unresolved exact tab-create receipt merely because unrelated failed contexts consumed the cap.

## Classification

- **P1-123** owns bounded/source-context session-storage lifecycle.
- **P1-124** owns exact browser `tabs.create()` settlement/crash reconciliation.
- **P1-175** supplies source-document identity carried by the context.

No new P1-211 is allocated.

## Validation note

Documentation only. Runtime/tests/manifest unchanged. Product tests were not rerun; historical 88/88 JS syntax + 74/74 deterministic PASS remains prior evidence. No build/tag/release.

## Retired source: `AUDIT_DELTA_JOURNAL_TEMPLATE_DOCUMENT_IDENTITY_2026-08-27.md`

SHA-256 of UTF-8 source text: `402c2819821072df86b7395f5fe10896e029c3bfaa7ce920d3ff756e1d8c63e9`

# Audit delta — Journal template apply document identity — 2026-08-27

Baseline HEAD before this audit block: `b6422112f67ed82bebd71241b45b1e56e13259de`.

Docs-only audit checkpoint. Production runtime and `manifest.json` are unchanged. Canonical large-table synchronization is not claimed.

## Scope

Fresh audit of Journal source-context storage and `Применить Включены/Исключены` authority, focused on existing `P1-157`, `P1-175`, `P1-125`, with dependencies `P0-070` / exact document generation.

## Confirmed context model

`openJournalPage()` creates a random `contextId` and stores `{ sourceTabId, sourceUrl, createdAt }` in `chrome.storage.session` under `webclipJournalContext:<id>`. Journal reads that random context, validates the 24-hour TTL and bounded URL, then attempts `chrome.tabs.get(sourceTabId)` to refresh `sourceUrl` from the current tab.

This is materially better than putting the source URL/tab id directly into user-controlled query parameters, and this pass found no new cross-extension/runtime sender ACL bypass in that context lookup.

However the context is only a **historical tab/source hint**. It is not an exact document capability.

## Exact stale-document authority

### 1. UI admission is computed from a prior source snapshot

When an entry card is rendered, Journal computes:

- `sameUrl` from `entry.url` vs current stored/resolved `sourceUrl`;
- `sameSite` from those URLs;
- `canApply = sourceTabId > 0 && sameSite`.

The Apply button is then enabled based on that previously observed state.

There is no immutable `documentId` or full-document navigation generation attached to the context/button.

### 2. Apply bypasses the worker scripting settlement/document layer

`journal.js::applyEntry(entry)` directly executes:

1. `chrome.scripting.executeScript({ target: { tabId: sourceTabId }, files: ['content.js'] })`;
2. `chrome.tabs.sendMessage(sourceTabId, { type: 'WEBCLIP_APPLY_SELECTION_SNAPSHOT', snapshot: ... })`;
3. `chrome.tabs.update(sourceTabId, { active: true })`.

These calls are made directly from the extension page rather than through the service-worker bounded/document-aware scripting machinery.

Therefore existing worker protections/repairs around `P1-125` do not protect this Apply path.

### 3. Navigation race

A deterministic schedule exists:

1. Journal resolves source tab A and renders an enabled Apply button for site S;
2. source tab navigates/reloads before the click or while direct scripting starts;
3. Journal does not fresh-compare an exact document receipt immediately before injection;
4. `executeScript(tabId)` and subsequent `sendMessage(tabId)` target whichever document currently owns that tab id.

A same-site navigation is especially dangerous because the previously rendered `sameSite` policy would still conceptually allow template reuse, yet the user may not have authorized applying the selected snapshot to that exact new document. A cross-site navigation can also race after the last check because there is no worker-side atomic/fresh document admission at dispatch.

This is the same root cause class as current document-generation findings; no new P-number is required.

## Required refinement of existing items

### P1-157 — centralize extension-page Chrome API side effects

Journal template Apply must stop being an ad-hoc direct `executeScript + sendMessage` chain. Route it through one worker-owned operation contract that provides:

- bounded Chrome reads/scripting actual-settlement semantics;
- exact source tab/document receipt;
- generation invalidation;
- one operationId/diagnostic timeline where appropriate;
- no blind second injection if first scripting settlement is unknown.

### P1-175 / P0-070 family — exact document authority

At the moment the user clicks Apply, capture/revalidate the **current exact source document**, not only tab id/site URL.

Immediately before injection/command and before accepting the response:

- verify tab still exists;
- verify full-document generation/documentId matches the admitted receipt;
- fail closed on reload/navigation, including same-URL replacement;
- never allow a stale Apply response from the old document to mutate/update UI as though it applied to the new one.

If product intent permits applying a template to a newly navigated page of the same site, require a new explicit admission for that current document rather than silently inheriting an old 24-hour context.

### P1-125 — scripting late-success receipts

The Apply path must use the same document-generation-aware scripting settlement model. A late successful injection into an old document must not satisfy a subsequent Apply attempt for a replacement document.

## Session context lifecycle

The random 24-hour session context can remain a navigation/UX hint, but it must not itself be treated as a durable capability to mutate whichever future document happens to reuse the tab.

A useful split is:

- context: `sourceTabId/sourceUrl` for display/filter/navigation only;
- short-lived exact document receipt: generated/refreshed at the actual user Apply action and invalidated by any full-document navigation.

## Required deterministic regressions

1. Render Apply on document A; navigate to different origin B before click: no injection/message reaches B.
2. Render on A; same-URL reload before click: old context cannot authorize replacement document.
3. Same-site navigation after render: requires fresh current-document admission; old receipt is rejected.
4. Navigation after `executeScript` starts but before it settles: late injection/response is stale and cannot satisfy the new document generation.
5. Two rapid Apply actions do not start overlapping unknown scripting operations against one tab generation.
6. Closed source tab produces a bounded clear error and never re-targets another tab.
7. Normal same-document Apply still restores the requested snapshot and activates the source tab.
8. Existing site-template product behavior remains available after explicit fresh admission for the current document.

## Classification

No new P-number created. Extend `P1-157`, `P1-175`, `P1-125`; preserve exact-document dependencies in `P0-070`/`P1-171` where shared infrastructure is used.

`P0-079` remains the newly evidence-reserved PDF cache operation-isolation defect. `P1-198` remains free at this checkpoint.

Previous product test gate was not re-run by this docs-only audit checkpoint.

## Retired source: `AUDIT_DELTA_JOURNAL_UNGROUPED_OFFSET_PAGINATION_REVISION_2026-08-28.md`

SHA-256 of UTF-8 source text: `a942e28e2a3fcf33c5cc2f188bfc72360233a8b01f79d3ebf796426eb3aafd1e`

# Audit delta — Journal ungrouped offset pagination must be revision-bound — 2026-08-28

Source-of-truth `main` immediately before this write: `d2844c626fcef4a381dee4242a9425fa48591ec7`.

Docs-only audit checkpoint. Runtime/configuration/tests/manifest are unchanged. No new P-number is assigned.

## Classification

Fresh source proof refines existing **P1-206 — coherent Journal view revision**.

The earlier grouped-pagination audit already proved that a group continuation boundary from revision A cannot be applied to revision B. This pass confirms the same class exists in the ordinary ungrouped page-number path through numeric offset, even though it uses a different algorithm and does not consume the grouped boundary token.

## Current ungrouped pagination

`queryJournalViewPage(...)` computes:

`offset = (page - 1) * pageSize`

and opens the universal `createdAt` index newest-first. Inside one readonly IndexedDB transaction it:

- scans matching entries;
- skips matches until `total >= offset`;
- collects at most `pageSize` summaries;
- returns `{ total, entries }`.

One individual page is therefore internally a coherent IndexedDB transaction snapshot. Preserve that positive property.

However the response carries no Journal revision, and `journal.js::readJournalPageViaServiceWorker()` keeps only `total` + `entries`.

A later page number is a new transaction over whichever Journal revision is current at that time.

## Deterministic inter-page schedules

### Newer insert duplicates an older boundary row

1. Revision A is ordered newest-first as E1…E40.
2. Page 1 (`offset=0`, size 20) shows E1…E20.
3. A new entry N is inserted ahead of E1, producing revision B.
4. User opens page 2; B's offset 20 now starts at former E20 rather than E21.
5. E20 appears on both the historical page 1 and current page 2 while another row is displaced farther back.

### Delete ahead of offset skips a row

1. Page 1 from A shows E1…E20.
2. One of E1…E20 is deleted before page 2.
3. Current B sequence shifts left.
4. Offset 20 starts after former E21.
5. E21 can be absent from both pages the user traversed.

### Filter-relevant mutation has the same effect

Changing reading mode/comment/filter-relevant metadata can move a row into/out of the match set without changing `createdAt`. Numeric offset over the newly filtered B set no longer corresponds to the A page boundary.

Import/clear can of course replace the entire set between pages.

## Why per-page transaction consistency is not enough

The defect is not an internally mixed page. Each page may be perfectly coherent on its own.

The user is traversing a logical ordered view across multiple requests. Numeric page number/offset is meaningful only relative to the same ordered revision or an explicitly refreshed traversal.

Without a revision receipt, page 2 cannot know that page 1's offset semantics are stale.

## Required P1-206 refinement

### Page response carries exact view revision

Every ungrouped page response should carry at least:

- Journal DB revision R;
- normalized view/filter/sort parameters;
- page/continuation identity.

The UI retains R for the current traversal.

### Continuation/page navigation validates R

Before consuming page 2+ from traversal R:

- request may include expected revision R;
- worker/read model must reject/restart if current revision differs;
- UI normally resets to page 1 or explicitly shows that the Journal changed and refresh is required.

Do not silently apply numeric offset from A to B.

### Prefer continuation semantics over naked offset where useful

An exact sort-key continuation bound to R can avoid rescanning skipped rows and make ordering intent explicit. If page numbers remain a UX requirement, map them through revision-bound continuations/cache rather than treating `(page-1)*N` as timeless authority.

Any continuation must include tie-breaker identity for equal `createdAt` rows and cannot cross filter/group mode changes.

### High mutation rate remains bounded

Do not retry indefinitely waiting for a quiescent Journal. After a bounded number of revision conflicts, render a controlled `Журнал изменился — обновите список` state or restart to the current page-1 view.

## Composition with rendered mutation authority

P1-206 coherent traversal does not replace P0-076.

Even on a stable page revision, a later button click must carry expected entry/comment generation because the Journal can change after render but before action.

Conversely P0-076 mutation CAS does not make a cross-revision page traversal coherent. Both layers are required.

## Required regressions

1. Page 1 on A -> newer insert before page 2 -> old traversal is invalidated/restarted; no silent duplicate boundary row.
2. Page 1 A -> delete ahead of offset -> page 2 does not silently skip the shifted row.
3. Row changes filter membership between pages -> old offset is rejected.
4. Import-replace between pages, including same textual ids/timestamps -> A traversal cannot enumerate B as page 2.
5. Clear between pages -> page 2 old continuation is invalid.
6. Stable revision -> ordinary page navigation preserves current deterministic order and counts.
7. Equal-createdAt rows have a stable tie-breaker in any continuation design.
8. Filter/sort/group toggle invalidates old pagination receipt even if DB revision is unchanged.
9. High mutation rate produces bounded refresh conflict, not infinite retries.
10. One page remains read in one readonly transaction; fixing inter-page coherence must not regress per-page snapshot consistency.

## Duplicate check / numbering

No new P-number is created.

- **P1-206** remains the owner of coherent Journal view/read revision and now explicitly includes ungrouped numeric offset traversal in addition to grouped boundary tokens.
- **P0-076** remains rendered action/mutation generation authority.
- **P1-009** remains filter scalability rather than pagination revision semantics.

## Test / release state

Documentation only. Product tests were not rerun. Historical gate remains prior evidence only: **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. No build, tag or GitHub Release was created.

## Retired source: `AUDIT_DELTA_JOURNAL_VIEW_FANOUT_2026-08-27.md`

SHA-256 of UTF-8 source text: `41e3269c7971a156dbab8e4afe2af68bb39bc8fbc484a41d5090db94eae91b94`

# Audit delta — Journal view materialization and action refresh fan-out — 2026-08-27

Baseline HEAD before this audit block: `20fc5362a6678763b02f2b1cc4326d177c75674f`.

Docs-only audit checkpoint. Production runtime and `manifest.json` are unchanged by this commit. Canonical registry synchronization is not claimed.

## Scope

Fresh audit of Journal rendering/scanning and Chrome Action refresh behavior, focused on existing `P1-009`, `P1-170`, `P1-174`.

## P1-174 — fresh exact proof

The service-worker page query itself is lightweight: `WEBCLIP_JOURNAL_VIEW_PAGE` returns view summaries. However the extension page immediately defeats that saving:

1. `journal.js` receives the summaries.
2. It immediately calls `readJournalEntriesByIdsForView(summaries.map(entry => entry.id))` for the whole visible page.
3. It then calls `renderEntries(fullEntries)`.

Therefore up to the current page size are again materialized as complete Journal records before cards are rendered.

The card builder eagerly materializes heavy fields:

- full `fileComment` is assigned to a DOM text node;
- `buildJournalComments(entry)` iterates all comments and assigns each `comment.text` to DOM, including deleted comments inside collapsed `<details>`;
- `buildSelectionDetails(entry.selectionSnapshot || {}, ...)` is constructed for each card;
- resource-report details are also constructed eagerly.

A collapsed `<details>` element is only visually collapsed; its child DOM/text is already allocated. Therefore a page with 20 maximally sized valid entries can still create the previously identified tens-of-MiB text/DOM footprint.

### Required P1-174 acceptance

- Keep the summary page genuinely lightweight end-to-end.
- Do not point-read all full entries immediately after receiving summaries.
- Heavy fields (`fileComment`, complete comments/deleted-comment text, selection locators, full resource diagnostics) should be loaded/materialized only on explicit expansion/action and only for that entry/section.
- Summary must carry only bounded small previews/counts/status fields required to render the closed card.
- Expanded heavy point-read must be generation-fenced; closing/superseding a card must prevent stale late data from mutating the current DOM.
- A single entry can still approach existing multi-MiB limits, so heavy expansion needs its own rendering/text budget and graceful truncation/secondary view rather than a large synchronous DOM burst.

## P1-170 — fresh exact caller/fan-out inventory

`refreshActionForAllTabs()` currently does:

- direct `chrome.tabs.query({})`;
- `Promise.all(tabs.map(updateActionForTab(...)))` across every open tab.

`updateActionForTab()` reads per-URL Journal statistics and performs several Chrome Action mutations. Existing action settlement caps cover the Chrome Action mutation promises, but they do not bound the preceding O(number-of-tabs) reads/tasks or overlapping refresh waves.

Confirmed production callers that start a new fire-and-forget all-tab wave:

- Journal append;
- single-entry delete;
- bulk clear;
- replace import;
- initial worker load/start refresh.

Comment add/edit/delete do **not** call `refreshActionForAllTabs()` in the current runtime, so P1-170 implementation/tests can focus on the real fan-out callers rather than every Journal mutation.

There is no global coalescing/generation owner around these waves. Rapid successive saves/import/clear events can therefore overlap multiple all-tab `Promise.all` traversals. Per-tab Chrome Action generation prevents an older action write from winning visually, but does not cancel or coalesce the expensive old reads/task fan-out.

### Required P1-170 acceptance

- One global refresh generation/coalescer for all-tab refresh requests.
- At most one bounded worker pool over tabs, not `Promise.all` over the entire browser tab set.
- If a refresh arrives while one is running, coalesce to one latest pending generation; do not create a wave per event.
- Skip stale generation before expensive per-tab Journal read where possible, not only before final action writes.
- Keep direct single-tab refreshes (`onActivated`, relevant `onUpdated`) separate from all-tab invalidation, but coordinate per-tab generations so they cannot be overwritten by stale bulk work.
- `tabs.query` itself should use the bounded Chrome-read contract from P1-158 rather than an unbounded direct await.
- Preserve correctness of badge/title/icon after append/delete/clear/import and after same-url/tab navigation fixes.

## P1-009 relation

Fresh review confirms the heavy full-Journal scan remains conditional on the text-filter path: `journalViewSummaryMatches(..., { entry })` calls `WebClipJournalTextFilter.matches(entry, ...)`, so comment-text filtering still evaluates the complete entry payload while scanning candidates. That remains the root cause already recorded in P1-009.

Do not “solve” P1-174 by removing full point-reads while leaving P1-009 to synchronously rescan multi-MiB comments across up to 100k entries. They are distinct costs:

- P1-009: query CPU/deadline and full-payload scanning;
- P1-174: visible-page full-record/DOM materialization;
- P1-170: all-tab action refresh fan-out.

## Required regressions

1. Normal page view of 20 heavy entries does not fetch/materialize their full comments/snapshots until expansion.
2. Deleted comment text is not inserted into DOM merely because its collapsed details exists.
3. Expanding one card loads only that card's heavy fields; stale late point-read after collapse/page change is ignored.
4. 100 rapid appends coalesce all-tab Action refresh work instead of producing 100 `tabs.query + all-tabs` waves.
5. Large tab count uses bounded concurrency and latest-generation semantics.
6. Comment add/edit/delete do not unnecessarily trigger an all-tab wave unless a future badge requirement explicitly needs it.
7. P1-009 filtered query semantics remain exact while moving toward a bounded index/summary architecture.

## Classification

No new P-number created. Fresh proof extends existing `P1-170` and `P1-174`; `P1-009` remains a separate OPEN query-cost item.

Previous product test gate was not re-run by this docs-only audit checkpoint.

## Retired source: `AUDIT_DELTA_JOURNAL_VIEW_REVISION_COHERENCE_2026-08-27.md`

SHA-256 of UTF-8 source text: `80c28ab4415f22f6ae95ac3464ecaf8ad12275c534faf215f73a2d74c71cdaa4`

# Audit delta — Journal view revision coherence — 2026-08-27

Source-of-truth `main` immediately before this write: `6ee9985e0a557f265bd876950ef9968fafdad2bc`.

Docs-only audit checkpoint. Production runtime, tests, configuration and `manifest.json` are unchanged. Canonical large-table synchronization is not claimed.

## New confirmed item: P1-206 — one Journal render can combine metadata from revision A with entries from revision B and then baseline B as if the render were coherent

**Classification:** P1 / evidence-reserved / confirmed by fresh source audit.

Repository-wide semantic duplicate-check was performed against current priorities and the existing Journal view/filter/revision items. Adjacent owners are different:

- **P1-009** — CPU/deadline cost of exact multi-field text filtering over heavy payloads;
- **P1-032/P1-083/P1-085** — bounded direct/fallback IndexedDB view transactions;
- **P1-127** — bounded extension-page health/context/revision reads and timer lifecycle;
- **P0-050/P1-120** — `urlStats` rebuild/dirty-marker consistency;
- **P1-174** — eager materialization of heavy Journal cards.

P1-206 is not a timeout or index-staleness issue. Each individual readonly transaction can be internally consistent while the **composed screen** is not, because metadata and page entries are read in separate transactions without one shared Journal revision receipt.

## Fresh source proof

### 1. `loadJournal()` uses a UI generation, but that generation is not a Journal data revision

`journal.js::loadJournal()` starts with:

- `const generation = ++journalLoadGeneration`;
- captures requested mode/source/filter values;
- later ignores results when `generation !== journalLoadGeneration`.

This correctly suppresses stale responses from an older UI request when a **newer UI load** has been started.

It does not prove that multiple data reads inside the same generation observed the same IndexedDB revision.

### 2. Metadata is read first in its own readonly transaction

`loadJournal()` calls `readJournalViewMetaWithFallback(...)`.

The direct path `readJournalViewMetaDirect()` opens its own `WebClipJournal` readonly transaction and scans `entries` to calculate:

- mode/read counts;
- domain aggregate/model;
- text-filter/domain-filter derived metadata.

The service-worker fallback similarly performs a separate view operation.

When this call returns, `loadJournal()` immediately publishes:

- `journalModeCounts = meta.counts`;
- `journalDomainModel = meta.domains`;
- mode/filter controls and domain tree.

### 3. The visible entry page is read afterward in another transaction

After metadata has already been assigned/rendered, `loadJournal()` calls:

`await renderCurrentEntries();`

The direct page path `readJournalPageDirect()` opens a **new** readonly transaction and scans the entries cursor for the requested page/filter.

Grouped-by-URL mode likewise uses separate transactions for groups/children.

Therefore metadata and entries are not one IndexedDB snapshot.

### 4. A Journal mutation can commit between those two transactions

Every normal append/update/delete/clear/import mutation can advance the Journal revision while the page remains open.

A deterministic schedule is:

1. UI load generation G starts.
2. Metadata transaction M reads Journal revision A and returns counts/domains for A.
3. Another tab/worker operation appends/deletes/imports and commits revision B.
4. G has not been superseded; `journalLoadGeneration` is unchanged.
5. `renderCurrentEntries()` starts page transaction P after B committed.
6. P returns entries from B.
7. The page now shows counts/domain model from A and entry cards/total from B.

No individual IDB transaction is broken. The defect is the lack of a composition fence.

### 5. `syncJournalRevisionBaseline()` can hide the mismatch instead of repairing it

After `renderCurrentEntries()` completes, the same `loadJournal()` calls:

`await syncJournalRevisionBaseline();`

That read occurs **after** the A→B mutation in the schedule above, so it observes B and stores B as the current baseline.

The periodic revision watcher then sees “current revision == baseline B” and has no evidence that metadata came from A.

Thus the mixed screen is not guaranteed to self-heal on the next revision poll. It can remain until another mutation, filter/mode action, or explicit reload starts a new complete load.

This is the strongest concrete distinction from a harmless transient race.

## User-visible effects

Depending on the mutation between M and P, one render can show:

- count badges that do not match the visible page/total;
- domain tree totals/groups inconsistent with the displayed entries;
- pagination based on a newer page result while mode/domain summaries remain older;
- a newly imported/replaced Journal page with metadata from the pre-import Journal;
- after delete/clear, a domain/count summary for entries no longer present.

This is primarily view correctness/UX rather than source-of-truth corruption, so P1 is appropriate.

## Required P1-206 contract

### One end-to-end Journal revision receipt per render

A complete visible render must prove that its metadata and entry/group reads belong to one accepted Journal revision.

Implementation options include:

1. read revision before the composed load, perform metadata + page reads, read revision after, and retry the **entire** load if it changed; or
2. return an exact revision receipt from each worker/direct view query and publish UI only if all receipts match; or
3. restructure the relevant metadata/page reads into one logical snapshot where practical.

Exact mechanism is implementation choice. Publishing A/B mixed state and then baselining B is not acceptable.

### Do not reuse UI generation as data generation

`journalLoadGeneration` / `renderGeneration` remain useful for latest-request-wins UI ordering, but they are not substitutes for the durable Journal revision.

Both dimensions are required:

- UI generation: “is this still the user's latest requested view?”
- Journal revision: “did all data components come from one accepted source state?”

### Baseline only the revision actually rendered

`lastJournalRevisionToken` must be set to the revision proven for the published screen.

Do not read a later revision after rendering and silently adopt it as baseline unless the screen was revalidated against that revision.

### Retry remains bounded

A busy Journal can change repeatedly. Avoid an infinite retry loop:

- use a small bounded retry count / existing view deadline;
- if coherence cannot be obtained, show a controlled “Journal changed during loading, refresh” state;
- stale partial metadata must not remain presented as authoritative while claiming the newer revision baseline.

### Direct and service-worker fallback paths use the same contract

A fallback from direct IDB to worker RPC must not weaken coherence. Revision receipts must have the same semantics regardless of execution context.

### Grouped URL view and child expansion

Grouped view has additional separate group/child transactions. A group expansion result must be fenced against the render/group revision it belongs to, or explicitly refresh/reject when the Journal changed.

## Required deterministic regressions

1. Meta reads A → append commits B → page reads B → revision baseline reads B: implementation must retry/reconcile; it must not publish A metadata + B entries as coherent.
2. Meta reads A → delete/clear commits B → page reads B: old count/domain state is not left with new empty/reduced page.
3. Meta reads A → import-replace commits B → page reads B: no mixed pre-import/post-import screen.
4. UI generation changes during retry: older Journal load never overwrites newer requested filters/mode.
5. Revision changes repeatedly: bounded error/retry rather than infinite scan loop.
6. Direct IDB success path and service-worker fallback both return/enforce equivalent revision receipts.
7. Grouped URL page + child expansion is rejected/refreshed if the underlying Journal revision changed.
8. `syncJournalRevisionBaseline()` records only a revision proven to match the displayed data.
9. No regression to P1-009 bounded filtering/deadline behavior.
10. No reliance on `urlStats` as Journal source-of-truth; the durable Journal revision remains authoritative.

## Number allocation

- New evidence-reserved **P1-206** assigned.
- **P1-205** remains OperationLog destructive cleanup/write linearization.
- **P1-009/P1-127** remain their existing filter/deadline/lifecycle owners.

No new P0 or P2 number is created by this checkpoint.

## Test / release state

No runtime/config/manifest change was made. Product tests were not rerun for this docs-only checkpoint. The last established product gate remains the historical **88/88 JavaScript syntax + 74/74 deterministic tests PASS** unless superseded by a newer independently recorded gate. No build, tag or GitHub Release was created.

