# Current test and release status

This is the compact current status document. Historical per-checkpoint evidence is in `project_docs/TEST_EVIDENCE.md`.

## Runtime identity

Current source manifest:

- Manifest V3
- version `0.9.8`
- minimum Chrome version `118`

The project documentation may refer to `0.9.9 WIP`; that is not the manifest version and is not a released product version.

## Current automated repository gate

GitHub Actions workflow `Repository integrity` is the current automated gate for an exact commit/PR head. It runs:

- repository/research consistency checker;
- release-readiness schema/status validation (`NOT READY` is valid WIP state);
- JavaScript syntax for every tracked `.js` file via `node --check`;
- all current `project_tools/test_*.js` deterministic JavaScript test files;
- Git-first recovery artifact provenance self-test, including clean-clone build/hash/source-commit validation and dirty-tree refusal.

**Do not use a SHA embedded in this document as current CI authority.** CI truth is commit-scoped: before merge/release, query GitHub Actions for the exact candidate/head SHA and require that exact run to be successful.

The repository-hygiene PR immediately preceding this policy change demonstrated the intended process: exact PR head CI PASS, expected-head merge, then a separate post-merge PASS on resulting `main`. That is process evidence, not a permanent current-SHA claim.

## Current P0-080 implementation evidence

P0-080 is being implemented in bounded application-generation tranches while keeping same-document application generation distinct from browser `documentId` identity.

The first tranche (PR #262) added `application-generation.js` as a current package member and proved the standalone application-generation primitive. The next durable tranche (PR #263) wired that primitive into production content bootstrap and save admission: WebClip-selected same-origin DOM carries application-generation receipts; `WEBCLIP_GENERATE_PDF` and `WEBCLIP_SEND_PDF_TO_YANDEX` are revalidated immediately before privileged dispatch; detached, untracked, mixed-generation and stale-generation local selection authority fails closed. PR #263 was expected-head squash-merged as `51838511f8869cb80aaa9199ed00a5a809907637`, and post-merge Repository Integrity run `35239611224` / job `105264352083` completed successfully on that exact `main` SHA.

PR #264 additionally bound manual save confirmation to an exact live selection revision and revalidated that revision at privileged dispatch. External `finish` / `download` / `yandex` commands and the internal WebClip Finish control capture confirmation authority; later selection mutation, detachment, application-generation change, mixed-generation state or an unobserved page-world selected-marker mutation cannot silently inherit that confirmation. Automatic `read-later` remains an immediate-admission path rather than inheriting an old dialog confirmation.

PR #265 composed the same-document application-generation primitive into the permission-gated cross-origin frame-agent path. Remote selected DOM now carries its own application-generation receipt and stale/untracked remote application state fails closed before `get-state` / `prepare-print`; browser frame/document identity, remote selection-session ordering and print-operation generation remain separate adjacent owners rather than being folded into P0-080. PR #265 was expected-head squash-merged as `014210517d5c8b0585b3087840686e375074cd6d`; post-merge Repository Integrity run `35249774298` / job `105298975420` completed successfully on that exact `main` SHA.

This deterministic implementation still does **not** close P0-080. Required real unpacked-Chrome navigation/reload/SPA/frame evidence remains pending, and downstream full-document generation authority is owned by P0-070. P0-080 therefore remains **ACTIVE** and release readiness remains **NOT READY**.

## Current P0-070 implementation boundary

P0-070 owns exact full-document generation from command admission through print/cache/download/upload/Journal finalization.

PR #266 began consuming the already-proven P0-080 save receipt in the worker without merging it with browser document identity. At save-message admission the worker guard retains the exact top-frame `MessageSender.documentId`, tab identity, operation identity and same-document application-generation receipt as separate fields. Before Chromium PDF generation, before and after the provisional render, and around post-print diagnostics, the guard revalidates the admitted document with exact `documentIds` targeting and compares the current isolated-world application-generation receipt. Generation-bound diagnostics are sent to the exact admitted document rather than the tab-wide content-script set. Missing/duplicate/expired admission, subframe admission, same-tab document replacement and same-document application-generation drift fail closed before the guarded stage can be treated as current source authority.

PR #266 was expected-head squash-merged as `9e07186e3696410b765908a173829d15fa1362f0`. Its exact-head Repository Integrity run `35291054911` / job `105433775097` completed successfully before merge, and post-merge run `35291232307` / job `105434297044` completed successfully on that exact `main` SHA.

PR #267 added the next bounded P0-070 render-window fence. After debugger attach, the PDF path installs an operation-local `chrome.debugger.onEvent` listener before Page-domain setup, resolves the exact top CDP frame with `Page.getFrameTree`, replays bounded events observed before the frame identity was armed, and treats `Page.frameStartedNavigating`, `Page.frameNavigated`, and `Page.navigatedWithinDocument` for that main frame as monotonic stale evidence. A navigation start remains stale even if it is cancelled or the page later returns to an A-like state. Other tabs and child-frame transitions are negative controls. Provisional PDF stream bytes are not accepted once the fence is stale, and the listener is removed on every settled render path. PR #267 was expected-head squash-merged as `c5bd25bf61e0cd63e576d704a5eaf6f83ffe4adb`; exact-head Repository Integrity run `35292129762` / job `105437039012` and post-merge run `35292309170` / job `105437581705` both completed successfully.

PR #268 closed the deterministic admission-to-debugger-attach return gap without adding a browser-history permission. The already-admitted exact documentId remains the cross-document identity, while the existing P0-080 application-generation receipt remains a separate same-document axis and already advances on persisted BFCache pageshow. Immediately after debugger attach and after the operation-local navigation listener is installed, the PDF path revalidates the active exact source again before Page-domain setup. A replacement document therefore fails documentId targeting; an A→B→A BFCache return fails the advanced application-generation receipt; and any navigation beginning after listener installation is retained as monotonic stale evidence by the render-window fence. PR #268 was expected-head squash-merged as `4b8b24219b7125f0a03f07f891bf82deea160d89`; exact-head Repository Integrity run `35294867399` / job `105445240941` and post-merge run `35295061513` / job `105445801942` both completed successfully.

PR #269 added the next bounded lineage handoff. A freshly rendered PDF captures a normalized `webclip-pdf-source-receipt/v1` from the still-active P0-070 worker admission and carries that immutable metadata through the PDF cache record/metadata plus local-download and remote-save durable checkpoints. The receipt keeps operation id, tab id, browser document id, application-generation receipt and selection revision as distinct fields. This does **not** change the existing `tab:<id>` cache key and does not use the receipt to authorize retry/cache byte dereference, so P0-079 and P0-023 remain separate owners. PR #269 was expected-head squash-merged as `0609989120283fde385a7b97418c90bac189b420`; exact-head Repository Integrity run `35295655331` / job `105447556210` and post-merge run `35295792153` / job `105447931740` both completed successfully.

PR #270 finalized that receipt into canonical Journal provenance after the physical local-download/remote-save checkpoint settles. `appendJournalEntry` accepts the receipt only as optional, operation-bound metadata; invalid/mismatched receipts are discarded rather than promoted. Export/backup serialize the complete canonical Journal entry, while import normalizes the optional receipt through the same bounded `webclip-pdf-source-receipt/v1` sanitizer and preserves it only when the imported operation identity is valid and matching. Legacy Journal entries/imports without a receipt remain unchanged, Journal grouping/filter summaries do not use it as authority, and the backup envelope/version stays unchanged. PR #270 was expected-head squash-merged as `82eb3e9d4776f003492dd335fe3be42ac600dd95`; exact-head Repository Integrity run `35296345746` / job `105449558469` and post-merge run `35296508779` / job `105450039377` both completed successfully.

P0-070 remains **partial**. Operation-owned PDF byte identity (P0-079), exact retry source authority (P0-023), and required real-browser BFCache/navigation evidence remain separate downstream/physical gates; adjacent P1-171/P1-125/P1-198/P1-199/P1-200/P1-214/P1-227 owners are not claimed closed. P0-070 remains **ACTIVE** until those end-to-end/real-browser boundaries are reconciled. P0-080 also remains **ACTIVE** pending required real unpacked-Chrome navigation/reload/SPA/frame evidence.

## Current P0-079 implementation boundary

P0-079 owns immutable operation-specific PDF byte generations after P0-070 has admitted and rendered the source. The current implementation branch removes the mutable `tab:<id>` alias from Yandex PDF byte-object identity. A fresh remote-save PDF receives a worker-issued `pdf:<generation>` key, stores payload and metadata as one sealed generation with create-once IndexedDB `add()` writes, and publishes a separate `tab:<id>` retry index only after the sealed generation commits.

The retry index is discovery state rather than byte ownership. Retry/download lookup resolves the index to the exact sealed generation; tab URL changes, tab removal and explicit cache invalidation clear only the current pointer. They do not delete an older operation-owned sealed generation. Exact generation cleanup revalidates stored generation metadata, deletes only that generation, and removes the tab pointer only when it still references the same key/generation. TTL cleanup applies the same compare-before-pointer-removal rule.

The Yandex offscreen transfer no longer receives only a cache key. The worker passes the exact immutable key, cache generation and expected PDF byte length; offscreen opens payload and metadata in one readonly transaction and requires matching `pdf:<generation>`, `sealed:true`, generation identity and byte length before materializing the upload Blob. There is no fallback from an absent/mismatched exact generation to `tab:<id>` or the latest retry pointer.

The current P0-079 retention tranche composes that sealed generation with the durable Yandex remote-save checkpoint. A newly created checkpoint now persists the exact `pdfCacheKey`, worker-issued `pdfCacheGeneration` and expected byte length before any signed PDF transfer may start. Immediately before the signed transfer, the checkpoint is durably advanced from `prepared` to `admitted-unknown`; the same transition is used when a retry has already observed an existing remote file, so a crash before final verification cannot incorrectly downgrade that external state to pre-admission.

PDF TTL cleanup now reads the durable remote-checkpoint store **before** opening its delete transaction. Exact `admitted-unknown` checkpoints retain only their matching sealed generation; unrelated generations remain eligible for normal TTL cleanup. New exact `prepared` checkpoints do not gain retention authority before external admission, while `remote-verified` and `stale-unverified` rows release local-byte retention. For upgrade safety, an older active checkpoint that predates the exact cache receipt is treated as ambiguous and protects only the sealed generation with the same durable `journalEntryId`. If the durable retention scan fails, PDF cleanup fails closed; storage-budget admission may then reject new work rather than erase bytes whose external outcome is unresolved. The retention authority never keys on caller textual `operationId`.

Focused deterministic production witness: `project_tools/test_p0_079_nonterminal_pdf_cache_retention.js`, with the adjacent `project_tools/test_p0_079_operation_owned_pdf_cache_production.js` extended to cover durable checkpoint linkage, pre-transfer admission and TTL protection.

This is still a **partial P0-079 implementation**. It closes the direct worker-restart/TTL race only while the owning durable remote checkpoint survives. P0-072 remains the separate owner of Journal clear/import semantics: current reset paths can still delete `pendingRemoteSaves`, so this tranche does **not** claim that admitted external-effect reconciliation survives a bulk Journal reset. P1-198 trusted live operation identity also remains separate; no textual `operationId` becomes a cache capability. Authorized Yandex L5 proof and the remaining P0-072/manual-resolution composition are still required. P0-079, P0-072, P0-023, P0-070 and P0-080 remain **ACTIVE**; release readiness remains **NOT READY**.

## Current P0-023 implementation boundary

P0-023 owns authority for a **live current-page** cached-PDF retry/download to claim an already sealed P0-079 generation. The live retry/download message handler now requires the top content sender's exact Chrome `documentId`, probes that exact document in the isolated world, and reads the current P0-080 application/selection receipt from `WebClipApplicationGeneration.admitSelection()`. The exact-document probe is bounded by the canonical scripting timeout and deliberately does not use the injection late-success cache: a late probe result is not reusable as fresh live authority.

The current live receipt is a separate `webclip-pdf-live-retry-source/v1` comparison receipt. It is not persisted as provenance and it has no caller `operationId`. The cached immutable `webclip-pdf-source-receipt/v1` from P0-070 remains unchanged and continues to retain the owning save operation, browser `documentId`, application generation, selection revision and selected count. P0-023 compares those source dimensions without converting the textual retry `operationId` into an ownership capability; P1-198 remains the owner of trusted worker-issued physical operation identity.

`getValidCachedPdfForTab` continues to treat `tab:<id>` only as retry discovery state. After resolving the pointer to exact sealed metadata, it requires exact source-receipt equality for browser document identity plus the independent P0-080 application/selection dimensions **before** any remote upload or cached-download byte dereference. A same-URL replacement document, a same-document application-generation advance, selection receipt drift, unrelated tab or missing/legacy source receipt therefore fails closed. Failure clears only the compare-matching retry pointer; it does not delete the operation-owned sealed generation. Normal admitted retry still reuses the exact P0-079 generation and does not call `generatePdfBlob` / `Page.printToPDF` again.

Focused deterministic production witness: `project_tools/test_p0_023_exact_live_retry_source_admission.js`. It covers exact-document targeting, P0-080 composition, same-URL replacement rejection, application/selection negative controls, pointer-only invalidation, immutable source provenance and no-render retry. The adjacent P0-079 production witness was updated only for the new live-admission function signature.

This is a **partial P0-023 implementation**, not closure. Durable recovery of already admitted operations remains receipt-driven and is not rebound to the live page. Real unpacked-Chrome evidence for same-URL reload/replacement, browser `documentId`, SPA/application-generation changes and the applicable retry/download scenarios is still required. P0-023 therefore remains **ACTIVE** and release readiness remains **NOT READY**.

## Historical product gate

Before the later research/consolidation stream, the historical documented checkpoint was:

- **88/88 JavaScript syntax PASS**
- **74/74 deterministic tests PASS**

Those counts remain historical evidence. They must not be confused with a current Actions run because the present workflow discovers the current tracked JavaScript/test files rather than claiming historical cardinalities.

## Browser evidence

Historical engineering evidence includes multiple PASS runs on managed Chromium `144.0.7559.96`, covering production selection/print boundaries, selected-only Chromium PDF output, Journal rendering, focused UI regressions and a mocked service-worker Yandex boundary. The exact historical checkpoints and PDF sizes are preserved in `TEST_EVIDENCE.md`.

One specific real Chrome problem-page result is also preserved: the original `its.1c.ru` pagination/clipping reproduction reached a 2-page complete PDF after P1-153.

Current focused C44 evidence adds real unpacked Chrome `152.0.7977.54` local Journal controls. Run `33790752301` proves SHA-256 preview binding, stale-revision fail-closed behavior and clean import. The newer run `33825545613` (job `100877305863`, head `77cbd3bcc325dd57542993f94b85f7a08c8245da`) proves durable renewable lease ownership across two full browser restarts: no automatic destructive resume, explicit token/owner rotation and revalidation, rejection of the previous token without Journal/staging loss, a second confirmation before successful commit, and an explicit cancel that preserves Journal/pending state while removing only checkpoint/staging. This closes P1-215. No remote account, credentials or native Save As UI were used; P0-072 checkpoint reconciliation and native/remote release boundaries remain open.

None of these substitutes for the final release browser/service gate below.

## Release readiness

`project_docs/RELEASE_READINESS.md` is the machine-readable current declaration. Current state is intentionally **NOT READY**.

`.github/workflows/release-gate.yml` is a separate manual, read-only, fail-closed pre-release gate. It evaluates an exact candidate SHA/version and does not create a build/tag/GitHub Release.

Before claiming a `0.9.9` release or raising the manifest version, the project still requires at minimum:

1. real **unpacked Manifest V3** execution in unmanaged Chrome / suitable Chrome for Testing;
2. real Chrome extension permission UI, including cross-origin optional-host permission grant/deny/revoke and frame navigation/reload scenarios;
3. real Chrome `chrome.debugger` / `Page.printToPDF` path under the actual extension, not only managed harness boundaries;
4. real Chrome automatic download / native Save As / terminal DownloadItem behavior and relevant late-settlement/recovery scenarios;
5. real Yandex OAuth/API E2E for the currently required account/auth/root/capability identity contract;
6. real Yandex upload/move/publish/unpublish/delete/backup/restore behavior, including failure/timeout/unknown-settlement and account/root switching scenarios required by open research owners;
7. focused review/regression verification for open P0/P1 owners that affect the release-critical flow;
8. explicit release decision with durable evidence reference.

Enterprise policy in the historical research environment blocked normal unpacked-extension loading; the project intentionally did not bypass that policy and therefore did not count it as a PASS. Exact historical environment details are retained in `TEST_EVIDENCE.md` rather than here.

## Release policy

Until the applicable real release QA is completed and an explicit release decision is made:

- do not bump `manifest.json` from `0.9.8` to `0.9.9` merely because research/docs advanced;
- do not describe `0.9.9` as released;
- do not create a release build/tag/GitHub Release merely because deterministic CI is green;
- do not reinterpret historical gate counts as current reruns;
- `Release gate` must remain manual/read-only and fail closed when readiness evidence is incomplete.

## Retired QA narrative

The former root `QA_STATUS_0_9_9.md` accumulated many sequential WIP notes and duplicated implementation/test history. It was retirement-compared on 2026-08-29 against this document and `TEST_EVIDENCE.md`.

Unique browser/environment observations were copied into `TEST_EVIDENCE.md`; durable current release constraints remain above. The old narrative was then removed from current `main` and remains recoverable from Git history.
