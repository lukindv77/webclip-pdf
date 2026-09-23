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

## Current P1-231 release-identity authority boundary

P1-231 remains **ACTIVE**. The current canonical extension package is the 34-member `webclip-extension-package/v1` projection with RPF `sha256:63ba60983ae6cce7df28f775cf64111a2d6a5d20913b22568fafc055c79856ff`. For the current candidate, the 33-member legacy-subset control (the same package minus `application-generation.js`) is `sha256:2dd647a17acd570c42d09ca47f01401b81c9936b23d30f794bb873ea7e81333a`; `sha256:b65c38854c016ce3ea88efd1caf5c3291a3089336ba9d58b01b9f86db73b835a` is the historical predecessor value for that subset before the later package-byte changes.

The current full-RCF authority includes eleven blob roots, including `project_tools/build_public_suffix_js.py` and the canonical research Registry. After the P1-191 Registry transition, the resulting full RCF is `sha256:037cd4b167ed9c6b572b8e74ea8b355be9599c142c68bffce55e0fb386aab9ed`; the prior `sha256:df6709bbe06a91b39828073552c499e307d74c4aebf782b3966fb1163ebdc8ce` is the historical ten-root control. Chrome QCF remains `sha256:3715a3453333d3d679a1c1c00a0bab6a02b77c0153f1a4e8d138aa1e8f5a984c`, Yandex QCF remains `sha256:8d6c9711b4f71b8485b49a6ab68f90bcf62bc74155ae0959dbdc4718648879a1`, and BCF remains `sha256:9eebcc834fa32bd8fe5f03ef14564f0fc1c169d0308dcc2813941b4f913363ff`.

The corrected PSL generator has already reproduced the exact committed `public-suffix.js` bytes on independent Linux and Windows runners. With the generator executable now covered by full-RCF authority, S0-F generation admission can pass for the exact current source. That does **not** supply current physical Chrome/Yandex receipts, governance approval, product-build authorization, or release authority: S0-G remains evidence-missing for the current candidate, while S0-H/S1-C keep current product package loading/building unexecuted. See `RESEARCH_P1_231_GENERATOR_FULL_RCF_BINDING_2026-09-21_EVIDENCE.md`.

S0-I current-authority reconciliation now also aligns the PR-impact research model with the canonical 34-member package (including `application-generation.js`) and the current S0-F `pass` admission state. S1-A explicitly fences on those current S0-I predecessor facts while the production PR checker and permanent Repository Integrity shadow workflow remain unchanged. See `RESEARCH_P1_231_S0I_CURRENT_AUTHORITY_RECONCILIATION_2026-09-21_EVIDENCE.md`.

The P1-231 PSL runtime-profile reconciliation additionally proves the exact corrected generator under current Linux Repository Integrity CPython 3.12.14 while retaining `cpython-3.12.10-v1` as the executable Linux/Windows S0-B portability authority. Python 3.12.14 is a source-only security release with no official Windows installer; hosted Windows exact-version setup therefore cannot be used as a truthful 3.12.14 cross-platform claim. A fresh evidence matrix instead passed Ubuntu 24.04 / CPython 3.12.14 and Windows 2025 / CPython 3.12.10 against the same exact Git generator/input/output blobs and the same committed output SHA-256. The temporary evidence workflow is removed from the mergeable tree. See `RESEARCH_P1_231_PSL_RUNTIME_PROFILE_RECONCILIATION_2026-09-21_EVIDENCE.md`.

S1-A execution semantics are now reconciled with the current hardened Repository Integrity checkout. On pull requests, the primary delivery workspace remains pinned to the literal PR head, while the future S1-A shadow candidate is the GitHub synthetic merge SHA in a separate exact workspace. The deterministic source-spec fails closed if either identity is substituted for the other; the permanent shadow step is still not installed. See `RESEARCH_P1_231_S1A_DUAL_CHECKOUT_RECONCILIATION_2026-09-21_EVIDENCE.md`.

S0-B has a passive production source-generation authority: `release_source_generation_v1.json` declares the single `public-suffix-js` relation and `project_tools/release_source_generation_authority.js` validates strict topology, exact candidate Git blobs, S0-A package-output membership, the exact `cpython-3.12.10-v1` runtime profile and isolated byte-for-byte regeneration. Repository Integrity now executes that authority in a separate read-only `p1-231-source-generation-authority` job under exact CPython 3.12.10 while the generic repository-integrity job remains on CPython 3.12.14. Both jobs preserve exact delivery-SHA checkout; this is still S0-B delivery verification, not the future S1-A synthetic-merge shadow workspace. See `RESEARCH_P1_231_S0B_PASSIVE_PRODUCTION_AUTHORITY_2026-09-21_EVIDENCE.md` and `RESEARCH_P1_231_S0B_PROFILE_SPECIFIC_CI_INTEGRATION_2026-09-21_EVIDENCE.md`.

S0-C now has a passive production release-contract **input** authority. `release_contract_inputs_v1.json` canonically owns the 11 full-RCF blob roots plus the closed unpacked-Chrome and Yandex E2E projection semantics, while `project_tools/release_contract_authority.js` resolves exact candidate Git blobs and emits canonical identity-engine inputs without interpreting receipts or owning the fingerprint algorithm. Exact-head discovery showed that the older S0-C research model still carries pre-S0-E framing; the production witness therefore checks compatibility against the current S0-E `WEBCLIP_RELEASE_IDENTITY_V1` framing instead of promoting that old framing. The manifest is control-plane only and does not change the 34-member extension package. See `RESEARCH_P1_231_S0C_PASSIVE_PRODUCTION_AUTHORITY_2026-09-21_EVIDENCE.md`.

S0-D now has a passive production builder-contract **input** authority. `release_builder_contract_v1.json` canonically owns deterministic staging and classic-ZIP semantics, requires the current S0-A package schema/path profile, and explicitly forbids ZIP64, data descriptors, host filesystem metadata authority and undeclared archive bytes. `project_tools/release_builder_contract_authority.js` exposes only canonical builder identity inputs; the deterministic witness applies S0-E `WEBCLIP_RELEASE_IDENTITY_V1 / BCF_V1` framing test-only and reproduces current BCF `sha256:9eebcc834fa32bd8fe5f03ef14564f0fc1c169d0308dcc2813941b4f913363ff`. No WebClip product ZIP is built. See `RESEARCH_P1_231_S0D_PASSIVE_PRODUCTION_AUTHORITY_2026-09-22_EVIDENCE.md`.

S0-E now has the passive production typed identity engine `project_tools/release_identity.js`. It consumes production S0-A exact package bytes, S0-C canonical QCF/full-RCF inputs and S0-D builder semantics while owning only `WEBCLIP_RELEASE_IDENTITY_V1` framing/domain-separated SHA-256. The composed engine must reproduce the current 34-file RPF, Chrome/Yandex QCFs, 11-root full RCF and BCF exactly; the 33-file `b65c…` RPF remains a legacy negative control. The existing independent Node/Python S0-E predecessor proof remains in the deterministic suite, and no receipt settlement, product build or release authorization is activated. See `RESEARCH_P1_231_S0E_PASSIVE_PRODUCTION_IDENTITY_2026-09-22_EVIDENCE.md`.

S0-F now has the passive production candidate-generation admission `project_tools/release_candidate_generation.js`. It composes one exact candidate SHA across S0-A package admission, S0-B regeneration, S0-C generator/full-RCF binding and S0-E identity computation. Successful `generation_state=pass` carries the current RPF/QCF/RCF/BCF tuple but creates no CGF axis and explicitly performs no receipt interpretation, evidence settlement, artifact build or release authorization. The permanent CPython 3.12.10 Repository Integrity lane runs this gate after S0-B on the same exact delivery SHA. See `RESEARCH_P1_231_S0F_PASSIVE_PRODUCTION_CANDIDATE_ADMISSION_2026-09-22_EVIDENCE.md`.

S0-G now has the passive production typed receipt reader and settlement engine `project_tools/release_evidence_settlement.js`. It reads only exact-Git `webclip-release-evidence/v2` receipts from the dedicated receipt namespace, requires matching independently admitted tested-source generation plus Git ancestry, and applies latest-attempt ordering per kind/RPF/applicable-QCF-or-RCF key. The current canonical receipt namespace is empty, so the exact current candidate truthfully derives `evidence-missing` with all four required slots missing; V1 readiness text is not reinterpreted as machine evidence. The permanent CPython 3.12.10 lane runs this read-only settlement after S0-F. See `RESEARCH_P1_231_S0G_PASSIVE_PRODUCTION_SETTLEMENT_2026-09-22_EVIDENCE.md`.

S0-H now has the passive production builder/verifier library `project_tools/release_passive_builder.js`, but current product construction remains intentionally disabled. The library enforces S0-F admission and canonical BCF before package loading, staged/extracted RPF equality, and strict raw classic-ZIP verification. Repository Integrity executes only the four-member synthetic 510-byte golden fixture; no current 34-file WebClip package is loaded/staged/zipped, no product ZIP is produced, and the module exposes no product-build CLI. See `RESEARCH_P1_231_S0H_FIXTURE_ONLY_PASSIVE_BUILDER_2026-09-22_EVIDENCE.md`.

S0-I has the passive production PR-impact classifier `project_tools/release_pr_impact.js`. It validates exact base/head/two-parent synthetic-merge provenance, reads exact base and candidate S0-A/S0-B authority manifests through the existing production parsers, classifies the exact `base -> candidate` `--no-renames` delta against the base∪candidate package/generation surfaces, and marks protected authority/shadow/workflow self-changes as requiring trusted review with `automaticClassificationTrusted=false`. The legacy delivery PR change checker remains independently active, while the permanent S1-A shadow lane now consumes S0-I on the synthetic-merge candidate. S1-B production implementation is added to the protected S0-I shadow control-plane set in its bootstrap tranche. See `RESEARCH_P1_231_S0I_PASSIVE_PRODUCTION_PR_IMPACT_2026-09-22_EVIDENCE.md`.

S1-A has the passive production shadow library `project_tools/release_shadow_identity.js` and this tranche installs its permanent read-only Repository Integrity shadow lane. The existing delivery jobs remain literal PR-head checks; the new S1-A job uses a separate exact `github.sha` workspace, which is the GitHub synthetic merge candidate on pull requests and the pushed SHA on main. S1-A runs under CPython 3.12.10 because it executes S0-F/S0-B, verifies exact base/head/candidate provenance through S0-I, and distinguishes ordinary `eligible` from protected `control-plane-review-required` without authorizing release. The activation PR itself must report review-required/ineligible; the post-merge push must report ordinary eligible while keeping `release_authorized=false`. The same permanent read-only shadow job now continues through S1-B settlement, S1-C observation and S1-D rehearsal; none of those stages can authorize product build, S2 or release. See `RESEARCH_P1_231_S1A_PASSIVE_PRODUCTION_SHADOW_2026-09-22_EVIDENCE.md`, `RESEARCH_P1_231_S1A_CONTROL_PLANE_REVIEW_RECONCILIATION_2026-09-22_EVIDENCE.md`, `RESEARCH_P1_231_S1A_PERMANENT_SHADOW_ACTIVATION_2026-09-22_EVIDENCE.md`, and `RESEARCH_P1_231_PERMANENT_S1_PRE_S2_SHADOW_2026-09-22_EVIDENCE.md`.

S1-B now has the passive production shadow-settlement library `project_tools/release_shadow_settlement.js`. It validates the canonical S0-G receipt namespace before the S1-A eligibility short-circuit; review-required/ineligible S1-A state yields `candidate-ineligible` with all four slots `not-evaluated`, while an eligible candidate consumes exact S0-G settlement and maps current empty evidence to `settled-blocked` / `evidence-missing`. Candidate/RPF/QCF/RCF/slot inconsistencies fail structurally. S1-B writes no receipts, readiness, artifact or release state, is protected by S0-I, and now runs permanently inside the existing S1 shadow job. Eligible current candidates still derive `evidence-missing`; protected control-plane PRs remain `candidate-ineligible`. See `RESEARCH_P1_231_S1B_PASSIVE_PRODUCTION_SHADOW_SETTLEMENT_2026-09-22_EVIDENCE.md`.

S1-C now has the passive production builder-equivalence library `project_tools/release_builder_equivalence.js`. The exact current candidate remains observation-only: because product-build authorization is absent, S1-C reports `not-evaluated` without loading the 34-file product projection or creating a WebClip ZIP. Positive physical comparison is hard-bounded to the established four-member synthetic fixture; independent Node raw-ZIP and Python `zipfile` paths must both reproduce the exact 510-byte / `sha256:1db2cd15c7decdd0e380aab31363f12d75268d90573eb6ef46723b5287f740d7` golden archive, extracted RPF equality, and direct raw byte equality. Metadata-only drift fails closed. S1-C is protected by S0-I and now runs permanently inside the existing S1 shadow job only as current-candidate observation: product projection loading/building remains false and `product-build-not-authorized` remains the blocker. See `RESEARCH_P1_231_S1C_PASSIVE_PRODUCTION_BUILDER_EQUIVALENCE_2026-09-22_EVIDENCE.md`.

S1-D now has the passive production migration-rehearsal compositor `project_tools/release_migration_rehearsal.js`. It consumes already-produced S1-A/S1-B/S1-C reports, checks exact candidate/execution freshness and the unchanged V1 rollback blobs, and rehearses stale/mismatched/corrupt combinations without recomputing identities, re-settling receipts or building product bytes. Current main remains `shadow-observed` with identity eligible, settlement `evidence-missing`, builder equivalence `not-evaluated`, `rollback_target=v1-only`, and all release/S2/product-ZIP authority false. A synthetic all-green S1 tuple also remains non-authoritative. S1-D is protected by S0-I and now runs as the final permanent read-only stage in the existing S1 shadow job. It requires the updated exact Repository Integrity workflow rollback anchor and always retains `release_ready=false`, `release_authorized=false`, `s2_authorized=false`, and `product_zip=false`. See `RESEARCH_P1_231_S1D_PASSIVE_PRODUCTION_MIGRATION_REHEARSAL_2026-09-22_EVIDENCE.md` and `RESEARCH_P1_231_PERMANENT_S1_PRE_S2_SHADOW_2026-09-22_EVIDENCE.md`.

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

The current P0-079 retention tranche composes that sealed generation with the durable Yandex remote-save checkpoint. At the only production checkpoint-creation boundary, the worker has already either obtained the signed upload URL or observed an existing remote file. The checkpoint therefore persists the exact `pdfCacheKey`, worker-issued `pdfCacheGeneration` and expected byte length **directly as `admitted-unknown`** before any signed PDF transfer/publication/final verification can continue. There is no separate `prepared -> admitted` durable transition: that split would leave a cross-IndexedDB race in which PDF TTL cleanup could consume a stale pre-admission snapshot while the external effect became admitted.

PDF TTL cleanup reads the durable remote-checkpoint store **before** opening its delete transaction. Exact `admitted-unknown` checkpoints retain only their matching sealed generation; unrelated generations remain eligible for normal TTL cleanup. `remote-verified` and `stale-unverified` rows release local-byte retention. The retention classifier still treats an exact synthetic/pre-admission `prepared` row as non-authoritative, but production no longer emits that phase for new remote PDF checkpoints. For upgrade safety, an older active checkpoint that predates the exact cache receipt is treated as ambiguous and protects only the sealed generation with the same durable `journalEntryId`. If the durable retention scan fails, PDF cleanup fails closed; storage-budget admission may then reject new work rather than erase bytes whose external outcome is unresolved. The retention authority never keys on caller textual `operationId`.

Focused deterministic production witness: `project_tools/test_p0_079_nonterminal_pdf_cache_retention.js`, with the adjacent `project_tools/test_p0_079_operation_owned_pdf_cache_production.js` extended to cover durable checkpoint linkage, pre-transfer admission and TTL protection.

This is still a **partial P0-079 implementation**. The direct worker-restart/TTL race is fenced while the owning durable remote checkpoint survives, and the current P0-072 tranche below now preserves the relevant admitted/stale remote checkpoint across Journal clear/import. P1-198 trusted live operation identity remains separate; no textual `operationId` becomes a cache capability. Authorized Yandex L5 proof and the remaining P0-072/local-download/destructive-move/manual-resolution composition are still required. P0-079, P0-072, P0-023, P0-070 and P0-080 remain **ACTIVE**; release readiness remains **NOT READY**.

## Current P0-072 implementation boundary

P0-072 owns the rule that deleting/replacing Journal presentation is not evidence that an already admitted external effect was cancelled. The current production implementation covers the known reset-sensitive classes: **Yandex remote save**, **automatic local download**, **ReadLater→Upload**, and **Delete→Trash**. Detached destructive receipts now also have a bounded **restart/local-reconciliation** path. P0-072 remains ACTIVE because real browser restart and authorized external late-settlement evidence are still outstanding. The operator path for permanently unknown destructive receipts is now implemented below; P1-090 and P1-198 retain separate ACTIVE authority boundaries, while P0-076 is DONE for local Journal CAS authority.

For Yandex remote save, Journal clear-all, URL/site clear and staged import-replace preserve admitted/stale `pendingRemoteSaves` and mark them `supersededByJournalReset`. Exact pre-admission work remains reset-cancellable, legacy ambiguous rows fail conservatively, and terminal remote verification retires reset-superseded receipts without resurrecting cleared/replaced Journal metadata.

For automatic local download, new `pendingDownloads` intents are explicitly `prepared` and advance durably to `admitted-unknown` immediately before `chrome.downloads.download(...)`. Reset before admission prevents the browser side effect; reset after admission preserves the receipt. Bound DownloadItem rows and P0-039 unknown/manual-resolution receipts survive reset, while terminal completion/interruption retires them without old-generation Journal resurrection. P1-146 continues to own exact Chrome start/late-settlement/restart semantics.

Journal DB v8 provides the bounded independent `pendingDestructiveMoves` store for destructive Yandex moves. Receipts use worker-issued random identities rather than caller `operationId`, capture source Journal id/createdAt plus URL/site scope, source/target paths and known remote/account/root evidence, and separate `prepared`, `admitted-unknown`, `remote-verified` and manual-resolution authority. Journal clear/import reconciles this store in the same reset transaction: prepared work may be dropped; admitted/manual-resolution receipts survive with `supersededByJournalReset`.

For ReadLater→Upload, the entry-co-located checkpoint is written only through a transaction that also re-reads the detached receipt and source Journal identity. Immediately before `POST /resources/move` the receipt advances to `admitted-unknown`. Existing target verification commits `remote-verified` before terminal Journal finalization. The terminal receipt now also persists the verified path/resource id plus filename/folder/public URL needed for a later local-only restart finalization. Journal mutation and receipt consumption are atomic; reset-superseded/missing/source-mismatched authority cannot mutate a same-id replacement.

For Delete→Trash, a separate `trash-move` receipt is created after exact source/target selection and before remote admission. If a move is required, `admitted-unknown` is committed before `POST /resources/move`; if the object is already in managed Trash, the operation remains prepared until target verification because this invocation has not admitted a new destructive side effect. Successful target verification commits `remote-verified`. The subsequent Journal delete and receipt consumption occur atomically in one transaction with source-id/createdAt/known-resource checks. A reset-superseded or source-mismatched old Trash operation completes as external history and cannot delete replacement Journal state. Non-Trash/local-only delete keeps the existing path unchanged. An admitted Trash error/timeout keeps the detached receipt; pre-admission failure removes it.

Restart reconciliation is deliberately local-only and bounded. The existing startup path schedules a durable maintenance alarm one minute after browser startup and then hourly; one maintenance wake processes at most 12 non-manual destructive receipts oldest-first. A same-worker `activeDestructiveMoveReceipts` set fences receipts still owned by a live ReadLater/Trash operation from maintenance; after worker restart that in-memory set is empty by construction, so only genuinely orphaned durable receipts enter restart reconciliation without relying on an arbitrary age delay. `prepared` receipts are retired because durable remote admission was never committed before the crash. `admitted-unknown` receipts are converted to durable `manual-resolution` without any Yandex read/retry because P1-090 owns exact-object settlement. `remote-verified` Trash receipts may resume only the guarded local Journal delete. `remote-verified` ReadLater receipts may resume only the guarded local Journal patch when the terminal receipt contains the full verified local-finalization metadata; reset-superseded receipts are consumed as history-only, while legacy/incomplete terminal receipts become manual-required. Manual rows are skipped by later recovery batches so they cannot starve newer active work, and the store remains fail-closed at the existing 100-receipt cap.

This restart tranche intentionally performs **no** `yandexApi()`, object lookup, move replay or auth acquisition. It therefore does not claim P1-090 exact-object closure and cannot fabricate settlement for an admitted unknown move. It composes with the now-DONE P0-076 local Journal CAS boundary: P0-072 receipts own external-effect durability, while P0-076 tokens prevent stale local mutation. P1-198 remains the owner of trusted worker-issued live physical operation identity.

The manual-resolution operator tranche makes permanently unknown destructive receipts visible on `journal.html` without attempting provider reconciliation. The worker exposes a bounded, sanitized, Journal-page-only list of receipts whose phase/flag is manual. The panel shows source/target/verified paths and available source/verified resource ids so the user can perform an external check. Dismissal requires the existing 9-digit dangerous confirmation plus exact `receipt id + updatedAt`; the worker re-reads the receipt in one write transaction, rejects missing/changed/non-manual/live-owned state, and deletes only that recovery receipt. It performs no `yandexApi()` call and touches no Journal row. A successful dismissal appends operation-log evidence stating that the user closed the recovery receipt after external manual verification and that WebClip itself changed neither Yandex Disk nor Journal state.

A research-only **real Chrome reset/restart harness** is prepared for the remaining local-download physical evidence. It reuses the current unpacked-Chrome driver without changing production package bytes, installs a real extension-page `chrome.downloads.onCreated` listener to pause the production PDF DownloadItem, waits for the exact bound `admitted-unknown` receipt, executes production Journal clear, and then proves either late physical completion or full-process restart reconciliation. The restart case kills Chromium with `SIGKILL`, reopens the same profile and extension id, verifies the reset-superseded receipt survived, and triggers the existing production maintenance alarm. The harness explicitly performs no Yandex operation and cannot close P1-090. Current GitHub-hosted execution is **BLOCKED / NO PHYSICAL PASS**: on `ubuntu-24.04` with `Google Chrome 152.0.7977.82`, run `35342277067` / job `105590684074` passed the 59-check P0-072 deterministic harness contract but the unchanged existing `browser_p1_007_unpacked_integration.js` prerequisite failed with `Runtime.evaluate: Inspected target navigated or closed` before the P0-072 physical step, which Actions then skipped. See `RESEARCH_P0_072_GITHUB_HOSTED_CHROME_EXECUTION_BLOCKER_2026-09-18_EVIDENCE.md`.

Focused deterministic production witnesses:
- `project_tools/test_p0_072_remote_save_reset_fence.js` — remote-save reset/recovery composition.
- `project_tools/test_p0_072_local_download_reset_fence.js` — automatic local-download admission/reset composition.
- `project_tools/test_p0_072_read_move_reset_receipt.js` — detached ReadLater receipt and guarded terminal update.
- `project_tools/test_p0_072_trash_move_reset_receipt.js` — detached Trash receipt and guarded terminal delete.
- `project_tools/test_p0_072_destructive_restart_reconciliation.js` — bounded startup/alarm recovery, prepared drop, admitted→manual-resolution, terminal local-only finalization and explicit no-Yandex-retry boundary.
- `project_tools/test_p0_072_destructive_manual_resolution_operator.js` — bounded/sanitized manual backlog, Journal-page-only endpoints, exact `id+updatedAt` dismissal authority, 9-digit user confirmation, operation-log evidence, and explicit zero Yandex/Journal side effects.
- `project_tools/test_p0_072_real_chrome_reset_restart_harness.js` — source-level binding for the physical Chrome harness: exact worker bytes, real DownloadItem pause/resume, production clear, SIGKILL/same-profile restart, production maintenance reconciliation, no-resurrection and explicit no-Yandex boundary.
- `project_tools/research_p0_072_real_chrome_reset_restart.js` — physical harness to be executed with an authorized suitable Chrome/Chromium environment; deterministic RI validates the harness contract but does not count as physical PASS.
- `project_docs/RESEARCH_P0_072_GITHUB_HOSTED_CHROME_EXECUTION_BLOCKER_2026-09-18_EVIDENCE.md` — exact hosted-run chronology and current Chrome/CDP prerequisite blocker; it records no physical PASS.
- `project_tools/test_p1_146_download_start_settlement.js` remains the adjacent Chrome late-start-settlement witness.

P0-072 remains **ACTIVE**, not DONE. Production reset-survival, bounded local restart handling, and the explicit operator/manual-resolution path are implemented for the known external-effect classes. The exact-source real-Chrome reset/restart protocol is harness-ready, but physical execution is still required. The current GitHub-hosted runner is not accepted as physical evidence because its unchanged baseline P1-007 real-Chrome integration control fails before the P0-072 scenario; no browser PASS is claimed. Authorized isolated Yandex destructive unknown/late-settlement evidence also remains required and stays under the separate P1-090 exact-object boundary. P1-090, P1-146 and P1-198 remain ACTIVE; P0-076 remains DONE. Release readiness remains **NOT READY**.

## Current P0-076 closure boundary

P0-076 is **DONE** for local Journal authority over delayed single-entry mutations. The implementation uses a dedicated Journal/reset generation plus per-entry revision accounting, atomic CAS patch/delete, receipt-carried restart authority for destructive flows, and fail-closed handling for legacy no-cursor receipts. The closure review on canonical implementation baseline `a439c2b5c782c9c0fe9e7960375d39842c17fd3b` enumerated every production Journal row mutation/finalizer class and mapped all 12 acceptance requirements from the 2026-09-12 revalidation evidence.

`JOURNAL_RESET_GENERATION_KEY = resetGeneration` lives in the existing Journal meta store and is distinct from `JOURNAL_META_REVISION_KEY`. Missing legacy metadata deterministically means generation 1. Every scoped/full `clearJournalEntries()` and every staged import-replace schedules exactly one generation increment inside the same IndexedDB readwrite transaction as the authority-replacing Journal transition. Ordinary append/point update/delete do not advance this dedicated reset generation. The older all-mutations revision remains unchanged for export/import preview and view invalidation semantics.

Every new Journal row and every imported replacement starts with local `entryRevision = 1`. Import normalization does not trust a serialized `raw.entryRevision`, and export deliberately strips `entryRevision` before serializing schema-v1 entries: a restored backup therefore creates fresh local authority even when it reuses the same textual id and visible fields. Legacy rows that predate this tranche are interpreted as revision 1 without a bulk migration.

Every production point write of an existing row currently present in `service-worker.js` advances `entryRevision`: the generic `updateJournalEntryRecord()`, the detached ReadLater checkpoint update, and the detached ReadLater terminal local finalize. Deletes remove the row. This makes any previously captured token stale after a same-entry mutation even before all callers migrate to CAS.

`readJournalEntryWithAuthority()` reads the row and dedicated reset generation in one readonly transaction and returns `{ entry, token }`; `captureJournalEntryAuthority()` returns the exact token `{ entryId, resetGeneration, entryRevision }`. `updateJournalEntryRecordCas()` and `deleteJournalEntryRecordOnlyCas()` compare both authority values and perform the final write/delete in the same readwrite transaction. An exact-current patch increments `entryRevision` exactly once and returns the next token. A reset/import generation mismatch, same-entry revision mismatch, missing row or same-id replacement produces `stale: true` rather than retargeting the old operation. CAS delete preserves the existing URL-stats dirty-marker/rebuild protocol.

The next bounded caller-migration tranche moves the local/keep Journal delete path onto that primitive. `deleteJournalEntry()` now admits the exact row and its CAS token together through `readJournalEntryWithAuthority()`; after operation logging, the final local delete uses `deleteJournalEntryRecordOnlyCas()`. If clear/import replacement or any newer same-entry mutation invalidates either reset generation or entry revision, the late delete is reported as superseded and does not retarget the replacement/newer row. The Yandex Trash path remains on its detached P0-072 destructive receipt and exact receipt guard; the generic P0-076 token is not substituted for remote-effect settlement authority.

The comment caller tranche now moves Journal comment add/edit/delete onto the same generic CAS point-write primitive. Each mutation reads the row and authority atomically, computes the whole-array comment patch from that snapshot, and attempts exactly one `updateJournalEntryRecordCas()`. A concurrent row mutation, clear or import therefore returns a stable `JOURNAL_ENTRY_STALE` conflict instead of silently overwriting the newer comment array. There is deliberately no automatic retry: the Journal UI surfaces the conflict text and leaves its controls retryable so the user can reread current state before trying again. The compatibility `updateJournalComment()` RPC delegates to the CAS add/edit paths. The legacy blind point-update and blind-delete helpers remain defined for compatibility/history but have no production call sites.

The destructive-receipt composition tranche now adds a **separate local Journal CAS cursor** to newly created P0-072 ReadLater/Trash receipts: `sourceJournalResetGeneration` + `sourceJournalEntryRevision`. Receipt creation validates that cursor against the current row and reset generation in the same IndexedDB transaction that creates the worker-issued detached receipt. Before a destructive POST is admitted, the local cursor is checked again in the receipt transaction; it is an additional stale-operation fence, not the external-effect identity. The P0-072 receipt id/phase and P1-090 remote-object evidence remain authoritative for remote settlement.

ReadLater's own pre-move Journal checkpoint increments `entryRevision` and atomically advances the receipt cursor to that committed revision, so the operation does not stale itself. Terminal ReadLater patch and Trash delete require both the existing P0-072 source matcher and the exact P0-076 cursor; stale local authority produces cancellation/non-retargeting rather than mutation of a newer row.

The legacy-receipt policy tranche now fails closed for persisted destructive receipts that predate those cursor fields. A non-superseded `remote-verified` legacy receipt retains its terminal P0-072/P1-090 evidence but is marked `manualResolutionRequired`; it cannot automatically patch/delete current Journal state. Recovery disposition treats that manual flag as sticky even while the remote phase remains `remote-verified`, preventing repeated auto-finalize loops. If a verified legacy receipt was already superseded by Journal reset, its finalizer may still retire it as history-only because the superseded branch executes before any local CAS comparison and performs no Journal mutation.

Focused deterministic production witness:
- `project_tools/test_p0_076_journal_cas_authority_primitive.js` — dedicated reset-generation wiring, fresh import revision, export authority stripping, all production point-write revision accounting, atomic row+generation token capture, atomic CAS patch/delete, stale negative controls and explicit primitive boundary.
- `project_tools/test_p0_076_local_delete_cas_migration.js` — atomic delete admission, local/keep CAS finalization, same-id/newer-revision non-retargeting and unchanged Trash receipt authority.
- `project_tools/test_p0_076_comment_cas_conflict.js` — atomic comment authority capture, add/edit/delete CAS writes, explicit stale-conflict/no-auto-retry behavior, retryable UI error handling, zero blind generic callers and unchanged P0-072 Trash receipt ownership.
- `project_tools/test_p0_076_destructive_receipt_cas_composition.js` — new-receipt CAS cursor binding, atomic creation/admission checks, ReadLater cursor advance, terminal non-retargeting, preserved P0-072/P1-090 remote authority and strict no-cursor local fail-closed behavior.
- `project_tools/test_p0_076_legacy_destructive_receipt_fail_closed.js` — legacy no-cursor rejection, sticky manual-resolution disposition, reset-superseded history-only retirement and preservation of verified remote evidence.
- `project_tools/test_p0_076_single_entry_generation_cas_model.js` remains the broader acceptance model for same-id import replacement, concurrent Mark Read, comment lost-update, scoped reset and P0-072 composition.
- `project_tools/test_p0_076_single_entry_generation_cas_closure.js` — closure source-spec binding for the complete mutation surface: atomic authority capture/commit, reset-generation transitions, callers/finalizers, legacy restart policy, blind-helper zero-callers, append non-overwrite, backup authority stripping and adjacent-owner separation.

Closure result: no production delayed single-entry mutation can acquire authority over a newer same-id Journal row merely because the textual id is reused. The historical blind update/delete helpers have zero production callers; delayed append/recovery cannot overwrite an existing same-id replacement; clear/import establish fresh authority atomically; destructive restart finalization either carries exact CAS authority or fails closed. P0-072, P1-090 and P1-198 remain separate **ACTIVE** owners. P0-076 is **DONE**; release readiness remains **NOT READY**.

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


## Current P1-164 manual-resolution boundary

The durable publication-revoke and revoke+Trash protocols preserve at-most-once remote admission semantics: once unpublish or move is durably admitted, automatic recovery observes rather than replaying that command.

The current manual-resolution refinement additionally preserves the exact pre-manual remote phase in bounded `manualResolutionSourcePhase` metadata before the visible receipt phase becomes `manual-resolution`. Journal recovery UI distinguishes an unknown admitted unpublish, a verified-private source before move admission, and an unknown admitted move; legacy receipts without that lineage remain explicit unknown rather than inferring an admission state. The dangerous dismiss flow remains receipt-only and performs no Yandex or Journal mutation.

Deterministic source coverage is in `test_p0_072_destructive_manual_resolution_operator.js` and `test_p1_164_revoke_trash_composition.js`. This is not live Yandex evidence. P1-164 and P1-090 remain ACTIVE, manifest version remains `0.9.8`, and release readiness remains **NOT READY**.

## P1-164 live Yandex observer harness

A repository-side qualification helper now exists at `project_tools/yandex_p1_164_live_observer.js`. It is intentionally GET-only, refuses CI, accepts the OAuth token only from `WEBCLIP_YANDEX_OAUTH_TOKEN`, requires private receipt input outside the repository, binds observation to an exact clean tested SHA plus current P1-231 RPF/Yandex-QCF identity, and emits sanitized digest-based observation output.

Its deterministic contract test is `project_tools/test_p1_164_live_observer.js`. The test covers no-replay phase classification, visibility-watch bounds, auth/account/root conflicts, source/target replacement, immutable-target occupation, secret handling, and absence of mutating provider endpoints. This source-level harness is preparation for authorized real Yandex qualification; it is not itself live-provider evidence and does not advance Yandex QCF.

P1-164 remains **ACTIVE**. Real revoke+move success/unknown settlement, visibility delay, auth expiry, account/root switching, replacement/collision, and real manual-resolution UX still require authorized physical Yandex evidence. Manifest remains `0.9.8`; release readiness remains **NOT READY**.

## P1-164 private observer export bridge

The manual `publication-revoke-trash` recovery path now has an explicit private qualification export. The worker re-reads the exact manual receipt, stale-checks `updatedAt`, requires the existing provider-identity envelope and preserved remote phase, snapshots the current local root separately, and prepares a local Save As file without making a Yandex request or reading an OAuth credential. The private file contains exact account/path/resource/public-link identity and must remain outside the repository.

`project_tools/yandex_p1_164_private_export_adapter.js` validates that private schema, rejects credential fields and repository-local private files, requires a clean tracked checkout, and binds the final GET-only observer input to the exact current Git HEAD. Neither the export nor adapter proves the source SHA of the already-running browser extension; the live observer now states this limitation explicitly.

Deterministic coverage is `project_tools/test_p1_164_private_observer_export.js` plus the extended `project_tools/test_p1_164_live_observer.js`. Runtime changes advance the package RPF to `sha256:b65c38854c016ce3ea88efd1caf5c3291a3089336ba9d58b01b9f86db73b835a`; Chrome/Yandex QCF, full RCF and BCF remain unchanged because their contract projections/roots did not change.

This is qualification infrastructure, not live-provider evidence. The extra manual endpoint is also covered by the existing P0-072 destructive manual-recovery endpoint/owner-page test; export does not change P0-072 dismiss/no-replay semantics. P0-072 and P1-164 remain **ACTIVE**; manifest remains `0.9.8`; release readiness remains **NOT READY**.

## Repository Integrity exact-head checkout

The permanent Repository Integrity workflow now checks out the literal PR head SHA for `pull_request` events instead of GitHub's synthetic merge ref, while push/manual events remain bound to the exact event SHA. A dedicated post-checkout step compares `git rev-parse HEAD` with the expected SHA and fails closed before project scripts run if they differ.

This closes the process ambiguity observed during PR #300: run #899 tested a synthetic merge commit whose tree was byte-identical to the PR head, and post-merge run #900 tested literal `main`. Future PR runs must now be literal exact-head runs rather than exact-tree-equivalent merge simulations.

`project_tools/check_ci_pins.py` and `project_tools/test_ci_pins.py` enforce this workflow contract. Existing reconciliation models are synchronized so the new permanent workflow blob is an explicit P1-231 S1-D rollback anchor and `.github/workflows/` remains delivery/control-plane rather than product runtime in selective-adoption analysis. The change is structural only: runtime RPF, Chrome/Yandex QCF, full RCF and BCF remain unchanged. Manifest remains `0.9.8`; release readiness remains **NOT READY**.

## P1-164 observation-session ledger

A bounded local observation-session ledger now exists at `project_tools/yandex_p1_164_observation_session.js` for sequencing the sanitized outputs of the GET-only live Yandex observer across one exact destructive receipt/session.

The ledger fixes the tested source SHA, package RPF, Yandex QCF and receipt identity digests in an immutable header, then appends numbered private checkpoints outside the repository with predecessor and observation SHA-256 digests. It independently re-runs the observer's pure classification logic, requires final-attempt/classification parity, rejects phase/time regression, credential-shaped fields, raw identity in digest slots, receipt retargeting, unexpected files and predecessor-chain tampering. Current-root digest is checkpoint-local so an actual root switch is visible without mutating the immutable receipt subject.

Operator labels are explicitly non-evidentiary and bounded; the ledger cannot emit a qualification PASS. Its local chain is not signed/authenticated provenance and cannot detect a fully consistent rewrite or tail truncation unless the emitted final digest is preserved independently. These limitations are durable in `RESEARCH_P1_164_OBSERVATION_SESSION_LEDGER_2026-09-20_EVIDENCE.md`.

Deterministic coverage is `project_tools/test_p1_164_observation_session.js`. It is source/local evidence only: no network request, OAuth credential, provider mutation or live Yandex qualification occurs. P1-164 remains **ACTIVE**; manifest remains `0.9.8`; release readiness remains **NOT READY**. Runtime RPF, Chrome/Yandex QCF, full RCF and BCF remain unchanged.

## P1-164 receipt-version / provider-observation binding

The private P1-164 qualification bridge now preserves the exact durable WebClip receipt snapshot through the GET-only observer without exposing raw receipt identity in sanitized evidence. Observer input/output advances to v2: private input carries raw `receiptId` + `receiptUpdatedAt` + `exportedAt`, while sanitized output carries only a domain-separated `receiptIdDigest` plus the exact revision/export time.

The observation-session schemas also advance to v2. The immutable subject now includes the receipt-id digest, and checkpoint admission requires non-regressing receipt export time/revision. A change in effective destructive remote phase requires a strictly newer receipt revision; same-phase re-observation of the same revision remains allowed so auth/account/root/visibility observations do not fabricate a WebClip state transition.

Deterministic coverage remains in `test_p1_164_private_observer_export.js`, `test_p1_164_live_observer.js`, and `test_p1_164_observation_session.js`. The new anchor is explicitly only a snapshot binding: it does not authenticate the private export, prove WebClip command admission, prove the running extension source SHA, close P1-164, or advance Yandex QCF.

Durable rationale/evidence is `RESEARCH_P1_164_RECEIPT_OBSERVATION_BINDING_2026-09-20_EVIDENCE.md`. P1-164 remains **ACTIVE**; manifest remains `0.9.8`; release readiness remains **NOT READY**. Runtime RPF, Chrome/Yandex QCF, full RCF and BCF remain unchanged.

## P1-164 destructive admission source-contract witness

`project_tools/yandex_p1_164_admission_contract.js` now derives a machine-readable source-only contract for the existing two-admission `publication-revoke-trash` protocol on one exact clean tracked checkout. It verifies durable admission before each destructive Yandex command, one command site per effect, exact HTTP methods, immutable move target, identity/Journal authority rechecks, and observation-only recovery after admitted-unknown states.

The same tool can bind that source contract to a sanitized P1-164 observer v2 output only when `testedSourceSha` matches exactly. The binding maps effective remote phase to the admissions that source requires to be durable, but permanently reports `commandExecutionProven=false`, `providerMutationCausalityProven=false`, `runningExtensionSourceProven=false`, and `qualificationPass=false`.

Deterministic coverage is `project_tools/test_p1_164_admission_contract.js`, including negative admission-order/method/durable-write/recovery-replay fixtures and source-SHA/contract-tamper binding checks. The witness itself has no network client, OAuth credential access or provider mutation authority.

External comparison research confirms the distinction between WebClip's at-most-once/no-replay protocol and APIs that provide server-recognized idempotency tokens/keys (AWS/Stripe). No equivalent client-token contract is claimed for the current WebClip Yandex unpublish/move path.

Durable rationale/evidence is `RESEARCH_P1_164_ADMISSION_CONTRACT_WITNESS_2026-09-21_EVIDENCE.md`. P1-164 remains **ACTIVE**; manifest remains `0.9.8`; release readiness remains **NOT READY**. Runtime RPF, Chrome/Yandex QCF, full RCF and BCF remain unchanged.

## P1-164 running-extension source attestation tooling

`project_tools/chrome_p1_164_runtime_attestor.js` now prepares the missing browser/runtime provenance layer for future physical P1-164 qualification without changing extension bytes or calling Yandex. A live invocation is restricted to a loopback Chrome DevTools endpoint, refuses CI, requires an exact clean checkout, selects the running MV3 `service-worker.js` target, fetches all 34 package members from the extension's own `chrome-extension://` origin, recomputes the current typed RPF, and separately verifies the currently parsed service-worker/importScripts source digests through DevTools.

The current recursive worker execution graph is ten scripts: `service-worker.js`, `public-suffix.js`, `journal-import-stream.js`, `journal-text-filter.js`, `local-download-identity.js`, `journal-import-digest.js`, `pdf-print-guard.js`, `content-injection-guard.js`, `operation-log-redaction-guard.js`, and `journal-restore-envelope-guard.js`. The latter four are imported by `journal-text-filter.js`; the attestor derives the graph recursively from exact package bytes. Missing, extra, stale or mismatched parsed scripts fail closed.

A successful **future live** invocation may emit `runningExtensionSourceProven=true` for that inspected browser context, but it permanently keeps `commandExecutionProven=false`, `providerMutationCausalityProven=false`, `qualificationPass=false`, and `releaseAuthorized=false`. The deterministic witness `project_tools/test_p1_164_runtime_source_attestor.js` is network-free and proves only the attestor contract; no live Chrome attestation is produced by the current tranche.

Durable rationale/evidence is `RESEARCH_P1_164_RUNTIME_SOURCE_ATTESTATION_2026-09-22_EVIDENCE.md`. P1-164 remains **ACTIVE** pending the authorized physical browser/Yandex matrix; manifest remains `0.9.8`, release readiness remains **NOT READY**, and current RPF/QCF/RCF/BCF identities remain unchanged.

## P1-164 passive browser command-execution observation tooling

`project_tools/chrome_p1_164_command_observer.js` now prepares the next physical qualification layer without issuing a Yandex request itself. A future live invocation attaches only to the same loopback DevTools / exact source-attested MV3 service-worker target, arms CDP Network observation, and passively recognizes the current destructive request shapes: exact `PUT /resources/unpublish` and exact `POST /resources/move` with `overwrite=false` / `force_async=false`.

The retained trace discards request headers, cookies, bodies and raw loading-failure text before retention. Raw provider paths and CDP request IDs are not emitted; source/target paths use the same domain-separated digests as the existing GET-only Yandex observer so later receipt/session evidence can be joined without disclosing paths. Browser `OPTIONS` preflight cannot satisfy command proof, and wrong/duplicate/out-of-order destructive commands fail closed.

Only a **future live** successful trace may emit `commandExecutionProven=true`, and it simultaneously requires `runningExtensionSourceProven=true` for that same service-worker target. It permanently retains `providerStateObserved=false`, `providerMutationCausalityProven=false`, `qualificationPass=false`, and `releaseAuthorized=false`. The deterministic witness `project_tools/test_p1_164_command_observer.js` uses synthetic CDP events only and therefore creates no physical command evidence.

Durable rationale/evidence is `RESEARCH_P1_164_BROWSER_COMMAND_OBSERVATION_2026-09-22_EVIDENCE.md`. P1-164 remains **ACTIVE**: command/provider-state joining and the real authorized browser/Yandex matrix are still required. Manifest remains `0.9.8`; release readiness remains **NOT READY**; release identity axes are unchanged.

## P1-231 S0-A passive package authority

The repository now has a canonical passive package declaration in `release_package_manifest_v1.json` and a strict exact-Git resolver in `project_tools/release_package_authority.js`.

The authority admits the **current 34-file package** under `webclip-extension-package/v1` / `portable-ascii-v1`. Exact-head CI #914 exposed that the older S0-A/S0-E 33-file research census had become stale after `application-generation.js` entered the runtime injection path. The current S0-A model and production manifest now include that file; the authority manifest itself remains known non-package control source.

`project_tools/test_release_package_authority.js` covers strict JSON/path admission, representation-invariant topology digest, exact Git blob/mode/OID resolution, dirty-working-tree independence, missing/non-commit/executable/symlink/tree members, and byte bounds. It also records the bounded downstream drift: historical S0-E `PACKAGE_FILES` still omits exactly `application-generation.js`.

At the S0-A-only checkpoint the recorded S0-E RPF `sha256:b65c38854c016ce3ea88efd1caf5c3291a3089336ba9d58b01b9f86db73b835a` remained reproducible but incomplete for the 34-file package. That bounded drift is now resolved by the later S0-E migration section below; `b65c…` remains only the exact 33-file legacy control.

Exact-head CI #921 also exposed one stale downstream S0-H assertion that still expected S0-A package count 33. S0-H was first made explicit about the 34-vs-33 drift and kept `blocked-before-load`; the later S0-E migration below removes that drift without changing the portability blocker.

This is a passive control only. No release gate, builder, ZIP, tag/deploy, browser QA or Yandex QA is activated. Durable rationale/evidence is `RESEARCH_P1_231_S0A_PACKAGE_AUTHORITY_IMPLEMENTATION_2026-09-21_EVIDENCE.md`.

P1-231 remains **ACTIVE**; manifest remains `0.9.8`; release readiness remains **NOT READY**. Chrome/Yandex QCF, full RCF and BCF recorded projections are not advanced by this tranche and do not repair the incomplete legacy RPF.

## P1-231 S0-E canonical 34-file RPF migration

S0-E now consumes the canonical S0-A package topology instead of owning a second hard-coded package list. The current package remains `webclip-extension-package/v1` / `portable-ascii-v1`, with 34 exact Git blob members and topology SHA-256 `7804ab54cff64ae40c16f348c747381b3e13af7f8d36a22da1a48ad839d9dc69`.

The historical 33-file subset is retained only as a negative/control identity. It omits exactly `application-generation.js` and must still reproduce legacy RPF `sha256:b65c38854c016ce3ea88efd1caf5c3291a3089336ba9d58b01b9f86db73b835a`.

The corrected **current 34-file RPF** is `sha256:feab25126c9d686062f8ed0da8c9d7ad39f468ebc819342bb34fbd2c47e0e843`. It was independently recomputed from exact GitHub package blobs with the existing typed `WEBCLIP_RELEASE_IDENTITY_V1 / RPF_V1` framing and is pinned only in S0-E; exact-head CI must reproduce it through the existing Node/Python cross-language check.

S0-F now consumes the same S0-A membership authority and the current RPF only from S0-E predecessor output. S0-G/S0-H likewise consume the new current RPF dynamically while keeping the legacy 33-file digest explicit. S0-H real product build remains `blocked-before-load` because the existing S0-F source-generation portability blocker is unchanged.

Chrome QCF remains `sha256:3715a3453333d3d679a1c1c00a0bab6a02b77c0153f1a4e8d138aa1e8f5a984c`; Yandex QCF remains `sha256:8d6c9711b4f71b8485b49a6ab68f90bcf62bc74155ae0959dbdc4718648879a1`; full RCF remains `sha256:df6709bbe06a91b39828073552c499e307d74c4aebf782b3966fb1163ebdc8ce`; BCF remains `sha256:9eebcc834fa32bd8fe5f03ef14564f0fc1c169d0308dcc2813941b4f913363ff`. Their projections/contracts did not change.

Durable rationale/evidence is `RESEARCH_P1_231_S0E_RPF_AUTHORITY_MIGRATION_2026-09-21_EVIDENCE.md`. P1-231 remains **ACTIVE**; manifest remains `0.9.8`; release readiness remains **NOT READY**. No product ZIP, physical QA advance, release-gate activation, tag, deployment or GitHub Release is created by this migration.

### P1-231 S0-E migration exact-head CI #926

Exact-head run #926 confirmed the new S0-E identity engine itself: 34-file current package, explicit
33-file legacy control, `feab…` current RPF, `b65c…` legacy RPF, and Node/Python agreement.

The run then exposed two stale downstream test assumptions: S0-F's unanchored `rpf=` parser matched
the suffix inside `legacy_rpf=`, and the S0-A package-authority witness still interpreted S0-E
`PACKAGE_FILES` as the historical 33-file literal. S0-F now parses exact semicolon-delimited
tokens, and the package-authority witness explicitly validates canonical 34-file current membership
plus the 33-file legacy subset. S0-G/H and S1-A/B/C/D require no separate semantic migration for
this failure because their #926 failures were transitive through S0-F.
### P1-231 S0-E migration exact-head CI #929

Run #929 confirmed the migrated S0-E/F/G/H chain and package-authority witness. Its remaining four
failures were stale predecessor case-count markers only: S1-A expected historical S0-E/S0-F counts
201/224 instead of 249/272, and S1-B expected historical S0-G count 128 instead of 132; S1-C/D
failed transitively through S1-A. Those markers are now synchronized without changing S1 semantics,
identity values, blocked-portability truth or release authorization.
### P1-231 package-authority migrated completeness marker

The package-authority witness PASS summary now reports `s0e_current_package_complete=true`, matching
its migrated 34-file assertions and current `feab…` RPF. This is a truth-marker correction only;
runtime/package bytes, QCF/RCF/BCF and release authorization are unchanged.


## P1-231 S0-B PSL generator byte-portability correction

`project_tools/build_public_suffix_js.py` now writes `code.encode('utf-8')` with `Path.write_bytes` instead of text-mode `Path.write_text`. This removes Python's platform newline translation from the generator output boundary while preserving the generator's explicit LF bytes.

The S0-B source-generation model, S0-B strict parser/composition refinement and S0-F candidate-generation verifier now require that exact byte-write correction and reject regression to the prior text-mode writer. The current Linux isolated-regeneration equality remains part of S0-F deterministic coverage.

This is **not yet** cross-platform S0-B closure. The prior Windows failure remains the current physical baseline until the corrected exact generator/input/output Git blobs are re-run under the pinned CPython 3.12.10 profile on both Linux and Windows and both outputs equal the exact committed `public-suffix.js` blob. Therefore `current_psl_windows_portable=false`, S0-F remains `blocked-portability`, and S0-H remains `blocked-before-load`.

The generator itself is not an extension package member and `public-suffix.js` is not modified by this tranche, so the canonical current 34-file RPF remains `sha256:feab25126c9d686062f8ed0da8c9d7ad39f468ebc819342bb34fbd2c47e0e843`; the old `b65c…` value remains legacy 33-file control only. P1-231 remains **ACTIVE**; manifest remains `0.9.8`; release readiness remains **NOT READY**.

Durable rationale/evidence: `RESEARCH_P1_231_S0B_GENERATOR_BYTE_PORTABILITY_FIX_2026-09-21_EVIDENCE.md`.

### P1-231 S0-B byte-portability exact-head CI discovery #937

Repository Integrity #937 on `09f7bd8f1b8b4dcd200b41c00a3083739258e966` failed only because `test_p1_231_generation_portability_binding_refinement_model.js` still asserted the historical text-mode generator source. S0-B, S0-F, S0-E identity, package authority and downstream blocked-portability models had already passed on that exact head. The stale refinement now treats the pre-fix writer as a historical comparison fixture and the current binary writer as current source, without advancing portability admission or full-RCF generator binding. #937 is not merge evidence; a new exact-head success is required.

## P1-231 S0-B corrected PSL cross-platform portability proof

Temporary PR #309 evidence run #1 (`35566109810`) executed the exact corrected generation roots under CPython `3.12.10` on both `ubuntu-24.04` and `windows-2025`.

Both jobs regenerated the exact committed `public-suffix.js` blob `541a0833e4731e3513d327208904661cc3d3e990` / SHA-256 `72aea4d8a8505ad90d9070bca539dff7d49391f034d0dd41f76d64867efc0b26` from generator blob `79b279fdc90dce39acb671d294dd814357dce380` and input blob `7658ddd3081291afbb4090c1caa136707ff71d25`.

The Windows observation reported platform line separator `0d0a` while the generated/committed output had `crlfCount=0` and exact raw byte equality. This physically closes the historical newline-portability defect for these exact generation roots.

The temporary workflow is evidence-only and is removed before the final mergeable PR head. Current S0-B/S0-F status markers are intentionally not rewritten inside this evidence-collection tranche: a dedicated authority-reconciliation tranche must retire the portability blocker and expose the already-recorded full-RCF generator-binding gap without conflating physical proof with release authority.

Durable evidence: `RESEARCH_P1_231_S0B_PSL_PORTABILITY_REPROOF_2026-09-21_EVIDENCE.md`.

P1-231 remains **ACTIVE**; manifest remains `0.9.8`; release readiness remains **NOT READY**. No product build/ZIP, version bump, release gate, tag, deployment, GitHub Release, Chrome QA or Yandex mutation/qualification is performed.

## P1-231 portability / generator-RCF authority reconciliation

The corrected PSL generation roots are now physically portable across the required Linux/Windows pair under CPython `3.12.10`. Current S0-B therefore records `current_psl_windows_portable=true`; the former false marker is historical only.

This does **not** make the real current candidate S0-F admitted. The existing generation-portability binding refinement separately requires every executable S0-B generator to be covered by current full-RCF authority, while the current ten-root S0-C full-RCF bootstrap still omits `project_tools/build_public_suffix_js.py`.

Current generation state is therefore:

```text
portability=pass
current_gate=blocked-generation
current_blocker=SOURCE_GENERATION_GENERATOR_NOT_RCF_BOUND
```

S0-G remains blocked from real settlement, S0-H remains blocked before product load/build, and S1 current shadow eligibility remains false. No package/runtime bytes or recorded RPF/QCF/RCF/BCF values are advanced by this reconciliation.

Durable rationale/evidence: `RESEARCH_P1_231_PORTABILITY_AUTHORITY_RECONCILIATION_2026-09-21_EVIDENCE.md`; integration PR: `#310`.

P1-231 remains **ACTIVE**; manifest remains `0.9.8`; release readiness remains **NOT READY**. The next bounded P1-231 tranche is explicit generator coverage in full-RCF authority plus the resulting full-RCF/downstream governance reconciliation, not a release/build action.


## P1-164 passive cross-evidence qualification binding

`project_tools/p1_164_qualification_evidence_binder.js` now fail-closes the next passive qualification layer across the existing exact runtime-source attestation, browser destructive-command observation, private destructive-receipt export, GET-only Yandex provider observation, observation-session ledger, and current source admission contract.

The binder requires one exact tested source SHA plus matching current RPF/Yandex QCF, the same sanitized browser service-worker target for runtime/command evidence, receipt/path digest parity between private/provider/command evidence, provider observation after the command watch window, and exact inclusion of that provider observation in the verified session chain. Observed destructive commands must be an ordered subset of the admissions required by the current source phase; the result reports whether required command coverage is complete instead of inventing completeness from a partial trace.

A successful **future live** binding may join the independent evidence axes as `runningExtensionSourceProven=true`, `commandExecutionProven=true`, and `providerStateObserved=true`. It permanently keeps `providerMutationCausalityProven=false`, `qualificationPass=false`, and `releaseAuthorized=false`: the current browser request observation and later Yandex GET observation have no provider-recognized shared correlation token, so matching SHA/receipt/path/time evidence is consistency evidence rather than mutation-causality proof.

Deterministic coverage is `project_tools/test_p1_164_qualification_evidence_binder.js`. It uses synthetic browser/provider artifacts plus a local temporary observation session only; no live Chrome call, Yandex API call, OAuth credential, provider mutation or physical qualification occurs. Durable rationale/evidence is `RESEARCH_P1_164_QUALIFICATION_EVIDENCE_BINDING_2026-09-22_EVIDENCE.md`.

P1-164 remains **ACTIVE** and still requires the authorized physical browser/Yandex matrix. P1-231 remains **ACTIVE**. Manifest remains `0.9.8`; release readiness remains **NOT READY**; product build/version/tag/deploy/release actions remain unauthorized.

## P1-164 passive physical qualification matrix authority

`project_tools/p1_164_qualification_evidence_binder.js` now emits
`webclip-p1-164-qualification-evidence-binding/v2`. The v2 output preserves the prior exact
source/receipt/path/session consistency boundaries while adding only sanitized command network
outcomes, provider wrapper/manual lineage, bounded watch summary and per-attempt classification
history. This makes transport-unknown and visibility-delay schedules machine-readable without
retaining raw provider identity, OAuth material, CDP request ids, request headers/bodies or
loading error detail.

`project_tools/p1_164_qualification_matrix.js` defines ten bounded physical qualification cases:
normal revoke+Trash success, unpublish transport unknown, move transport unknown, target
visibility delay, auth expiry/reauth, account switch, root switch, source/public-link
replacement, target occupation/replacement, and manual resolution. Every case is mapped back to
existing assertions in the canonical `yandex-e2e` release projection; mapping drift fails
closed and `release_contract_inputs_v1.json` is not modified.

The matrix accepts sanitized binder-v2 outputs only when exact source/RPF/Yandex-QCF/contract,
browser target, receipt/path identity and session identity remain coherent. Multi-observation
cases additionally require strictly increasing provider-observation time and session checkpoint
sequence with non-regressing receipt revision.

The matrix is a consistency authority only. It permanently emits
`evidenceOriginAuthenticated=false`, `providerMutationCausalityProven=false`,
`physicalCasePass=false`, `qualificationPass=false`, `yandexQcfAdvanced=false`,
`p1_231ReleaseReceiptCreated=false`, and `releaseAuthorized=false`. Real operator reauth/manual
resolution actions remain external evidence, and P1-231 typed release receipt admission stays
behind the existing S2 / explicit approval boundary.

Deterministic coverage is `project_tools/test_p1_164_qualification_matrix.js` plus the extended
`project_tools/test_p1_164_qualification_evidence_binder.js`. Synthetic fixtures create no
browser call, provider call, OAuth use or provider mutation. Durable rationale/evidence is
`RESEARCH_P1_164_PHYSICAL_QUALIFICATION_MATRIX_2026-09-22_EVIDENCE.md`.

P1-164 remains **ACTIVE** pending the authorized real Chrome/Yandex matrix. P1-231 remains
**ACTIVE**. Manifest remains `0.9.8`; release readiness remains **NOT READY**.


## P1-178 auth-attempt generation CAS — 2026-09-22

The bounded P1-178 runtime tranche in PR #338 changes current package members `service-worker.js` and `options.js`. On exact head `8ef5af8202e571e060b55c9db5d00414738bccfa`, the dedicated P1-231 source-generation/candidate-admission job in Repository Integrity #1059 independently derived current RPF `sha256:cb04a3cb5dc684c3e4804f63847c4b4f00d93df2db47475091b91701a04727ee`; Chrome QCF remains `sha256:3715a3453333d3d679a1c1c00a0bab6a02b77c0153f1a4e8d138aa1e8f5a984c`, Yandex QCF remains `sha256:8d6c9711b4f71b8485b49a6ab68f90bcf62bc74155ae0959dbdc4718648879a1`, full RCF remains `sha256:cb34076d37c8dbe99392fac120fb21b03d192e4b53bc7a40650b5cd277311ffb`, and BCF remains `sha256:9eebcc834fa32bd8fe5f03ef14564f0fc1c169d0308dcc2813941b4f913363ff`.

The overall #1059 run is **not** merge evidence because the repository-integrity job stopped at a PR-body change-contract error before JavaScript syntax/deterministic execution. The successful identity lane is used only to synchronize current source identity. P1-178, P1-165 and P1-191 remain **ACTIVE**; manifest remains `0.9.8`; release readiness remains **NOT READY**; no physical Chrome/Yandex evidence, build, release receipt, S2 activation, tag, deployment or release decision is created by this tranche.


### P1-178 exact-head deterministic reconciliation #1061

Repository Integrity #1061 on branch head `b31aec1f2ea163f335c50fe33552db142121cddd` passed the PR change contract and both dedicated release-control jobs. The new P1-178 runtime test and reconciled P1-178 generation model also passed. The generic deterministic suite then exposed stale current-source witnesses plus one identity root: because `service-worker.js` and `options.js` are members of both the canonical 34-file package and the 33-file legacy subset, the current legacy-subset RPF also advanced to `sha256:7bb37622f1ead5ba477116afb53ca5f35d57b918350525aa62d966ad493a730f`. Downstream S0/S1 model failures were transitive through the stale predecessor pin. Adjacent auth research witnesses are being synchronized only to the new source shape; their unresolved owner semantics remain unresolved. #1061 is not merge evidence.


### P1-178 exact-head deterministic reconciliation #1062

Repository Integrity #1062 reduced the deterministic failure set from 17 to three. The remaining direct failure was a single S0-H assertion still pinning the predecessor 33-file subset RPF `b65c…`; the S1-C and S1-D failures were transitive through that S0-H predecessor. S0-E/F/G already passed with current legacy-subset RPF `sha256:7bb37622f1ead5ba477116afb53ca5f35d57b918350525aa62d966ad493a730f` and current 34-file RPF `sha256:cb04a3cb5dc684c3e4804f63847c4b4f00d93df2db47475091b91701a04727ee`. #1062 is not merge evidence; a complete later exact-head SUCCESS is still required.


## P1-191 manual token validate-before-commit — 2026-09-22

PR #339 removes provisional publication of a pasted manual token. The exact candidate is now validated through a read-only Disk-info request before commit; explicit 401 rejects only that candidate, while permission ambiguity, rate limiting, 5xx, timeout/network and missing account identity fail as validation-unknown without clearing the last committed auth. A valid candidate commits only if the shared auth generation captured by the manual intent is still current.

Repository Integrity #1065 on exact preliminary head `aebcad9347ad3bd0093cbe5bbc96c974391c0b1f` passed PR-contract/syntax and both dedicated release-control jobs. Its source-generation lane derived current 34-file RPF `sha256:0bb0e71547169d2f02bed1ee3cbe5dab4db30aa439d053d8fda1ee73ed0bd396` and current 33-file control `sha256:7dc0be48b7b97063c2da2c2680ca0920f00418e8141ded98db442e4bfeffd957`; Chrome QCF remains `sha256:3715a3453333d3d679a1c1c00a0bab6a02b77c0153f1a4e8d138aa1e8f5a984c`, Yandex QCF remains `sha256:8d6c9711b4f71b8485b49a6ab68f90bcf62bc74155ae0959dbdc4718648879a1`, full RCF remains `sha256:cb34076d37c8dbe99392fac120fb21b03d192e4b53bc7a40650b5cd277311ffb`, and BCF remains `sha256:9eebcc834fa32bd8fe5f03ef14564f0fc1c169d0308dcc2813941b4f913363ff`.

#1065 is **not merge evidence**: its generic deterministic suite exposed stale current-RPF/current-33 pins plus one older P1-178 manual-source census. Those witnesses are reconciled in the following exact head. P1-191 remains **ACTIVE** pending full exact-head integration evidence; manifest remains `0.9.8`; release readiness remains **NOT READY**.


### P1-191 exact-head implementation gate #1066

Repository Integrity #1066 / run `35723132459` completed **SUCCESS** on exact head `946cd957cae35dc574aee930e777e0972d5a23a4`: all three required jobs passed, including the complete deterministic suite. The registered manual-token validate-before-commit acceptance contract is therefore implemented at source/runtime level. P1-191 transitions from ACTIVE to the Registry default **IMPLEMENTED / RELEASE-REGRESSION** state; this does not constitute live Yandex qualification or release authorization. Current RPF remains `sha256:0bb0e71547169d2f02bed1ee3cbe5dab4db30aa439d053d8fda1ee73ed0bd396`, current 33-file control remains `sha256:7dc0be48b7b97063c2da2c2680ca0920f00418e8141ded98db442e4bfeffd957`, manifest remains `0.9.8`, and release readiness remains **NOT READY**.


### P1-191 Registry-transition discovery #1067

Repository Integrity #1067 / run `35723534761` on exact head `9af2b0a80224ad6fbd0afa9e83c38529a3004bb0` passed both dedicated release-control jobs but failed the generic deterministic suite on stale witnesses created by the Registry transition. Removing the P1-191 ACTIVE row changed a full-RCF root, so exact authority advanced full RCF from `sha256:cb34076d37c8dbe99392fac120fb21b03d192e4b53bc7a40650b5cd277311ffb` to `sha256:037cd4b167ed9c6b572b8e74ea8b355be9599c142c68bffce55e0fb386aab9ed`. RPF remains `sha256:0bb0e71547169d2f02bed1ee3cbe5dab4db30aa439d053d8fda1ee73ed0bd396`; current 33-file control remains `sha256:7dc0be48b7b97063c2da2c2680ca0920f00418e8141ded98db442e4bfeffd957`; Chrome/Yandex QCF and BCF remain unchanged. The remaining direct failures were stale P1-191 ACTIVE assertions. #1067 is discovery evidence only, not merge evidence.


### P1-191 exact-head reconciliation #1068

Repository Integrity #1068 / run `35740532573` on `abc9330b5113e2bf548d24744a5eaf69760ea5d5` reduced the remaining deterministic failures to two direct stale witnesses: the P1-191 refinement test still required the historical ACTIVE-row wording to live in Registry, and S0-G still pinned the pre-transition full RCF. S1-B/S1-D failures were transitive through S0-G. Runtime, RPF, QCF and BCF were already coherent. #1068 is discovery evidence only; the final reconciliation moves the preserved acceptance wording check to durable P1-191 evidence and updates S0-G to current full RCF `sha256:037cd4b167ed9c6b572b8e74ea8b355be9599c142c68bffce55e0fb386aab9ed`.


## P1-196 exact current-auth 401 demotion — 2026-09-22

A bounded P1-196 runtime tranche adds worker-owned Yandex Authorization headers, an in-memory exact current-auth request authority with a secret-free record/control-generation receipt, and CAS demotion for an exact current-bound HTTP 401. A late A/401 cannot clear newer B; a newer control-generation transition also fences the old response. Generic 403/429/5xx/network failures, unbound legacy auth and immutable P0-074 operation-context responses do not gain global-auth mutation authority.

Deterministic coverage is `project_tools/test_p1_196_exact_auth_401_runtime.js`. Existing P1-196/P0-074/W5/effect-adapter witnesses are reconciled to the new request-header/source shape.

P1-196 remains **ACTIVE**: known local expiry is still not an exact-generation validity transition, token presence/validity/usability are not yet separate runtime/status axes, and `recoverPendingRemoteSaves()` still uses one auth snapshot across the bounded queue instead of rechecking each later auth-required child.

The runtime change modifies a package member, so candidate RPF/current 33-file control must be re-derived by exact-head P1-231 source-generation authority before merge. No live Yandex request/provider mutation/real Chrome qualification/build/version/release action occurs. Manifest remains `0.9.8`; release readiness remains **NOT READY**.


### P1-196 exact-auth 401 identity discovery #1071

Repository Integrity #1071 / run `35742838788` on exact preliminary PR head `c4deb01d4a439bd104d00e700e078394b8bee45d` passed both dedicated release-control jobs and the new P1-196 runtime/model tests. The generic deterministic suite failed only on stale current package identity pins. Exact authority derived current 34-file RPF `sha256:880ad517fda59415bfcfcb476e29139718d386db708bd652b67c3c10aa38ecff` and current 33-file control `sha256:710d9a44279541adb6ef609b9cad4b34beba17610fb585e668fc1376c362b623`; Chrome QCF remains `sha256:3715a3453333d3d679a1c1c00a0bab6a02b77c0153f1a4e8d138aa1e8f5a984c`, Yandex QCF remains `sha256:8d6c9711b4f71b8485b49a6ab68f90bcf62bc74155ae0959dbdc4718648879a1`, full RCF remains `sha256:037cd4b167ed9c6b572b8e74ea8b355be9599c142c68bffce55e0fb386aab9ed`, and BCF remains `sha256:9eebcc834fa32bd8fe5f03ef14564f0fc1c169d0308dcc2813941b4f913363ff`. #1071 is discovery evidence only, not merge evidence. P1-196 remains **ACTIVE**; manifest remains `0.9.8`; release readiness remains **NOT READY**.


## P1-196 exact account-enrichment CAS — 2026-09-22

A second bounded P1-196 runtime tranche removes unconditional post-read `writeYandexAuth(...)` account enrichment from `testYandexConnection()` and `getCurrentYandexAccountUid()`. Those callers now opt in to the secret-free exact current-auth request receipt and update account metadata only through record/auth/control-generation CAS. A late successful A response cannot overwrite B, and a superseded connection-test response stops before service-folder continuation.

Deterministic coverage is `project_tools/test_p1_196_account_enrichment_runtime.js`. The existing P1-196 refinement model is updated only to mark positive enrichment as implemented; known-expiry transition, explicit presence/validity/usability status axes, and per-child recovery auth recheck remain current gaps.

P1-196 remains **ACTIVE**. The runtime change modifies `service-worker.js`, so current RPF/current 33-file control must be re-derived by exact-head P1-231 authority before merge. No live Yandex call, provider mutation, real Chrome qualification, product build/ZIP, manifest bump, release-policy activation, tag, deployment or release decision is performed. Manifest remains `0.9.8`; release readiness remains **NOT READY**.


### P1-196 account-enrichment CI discovery #1074

Repository Integrity #1074 / run `35747481769` on exact preliminary head `dc6ec0150a3b58e7d0adf0fc718e28a240410296` stopped at the PR change-contract metadata gate before syntax/deterministic execution. The independent source-generation lane succeeded and derived current 34-file RPF `sha256:363e8df53233e035a079f5e2a26b124de8cf2b623749d6e4f457d5a94e0f8368`; Chrome/Yandex QCF and full RCF remain unchanged. The 33-file control is intentionally not guessed because the deterministic identity engine did not run. #1074 is discovery evidence only; a new exact-head run is required.


### P1-196 account-enrichment identity discovery #1075

Repository Integrity #1075 / run `35756002237` on exact head `9bb60173da21cd789e1cbd9a6f13572ce8aaadde` passed PR-contract/syntax and both dedicated release-control jobs. The generic deterministic suite derived current 34-file RPF `sha256:363e8df53233e035a079f5e2a26b124de8cf2b623749d6e4f457d5a94e0f8368` and current 33-file control `sha256:650ed8d7b3cdff640ca70550122edc9f714c6984e97c4f78f212f819b24d890e`, while QCF/full-RCF/BCF remain unchanged. It also exposed one stale P1-138 connection-test source census, now reconciled to the exact-auth receipt call shape. #1075 is discovery evidence only; a complete later exact-head SUCCESS is required.


## P1-196 explicit auth status axes — 2026-09-22

A bounded P1-196 tranche adds explicit auth truth to `getYandexStatus()`: `authPresent`, `authValidity`, `authUsable`, `expiryKnowledge`, shared `authGeneration`, record generation, exact expiry timestamp and admission-skew state. Compatibility `connected` now means current auth is usable for a new request rather than merely that token bytes are present.

Fresh OAuth records carry `validity=valid` plus known/unknown lifetime from `expires_in`; successfully validated manual tokens carry `validity=valid` with `expiryKnowledge=unknown`. A zero expiry is not interpreted as infinite lifetime. A token inside the existing 60-second admission skew is present and temporally valid but explicitly unusable; a timestamp already in the past is classified expired.

Deterministic coverage is `project_tools/test_p1_196_auth_status_axes_runtime.js`. Options UI now distinguishes connected/usable, expired, admission-skew, present-but-unusable and absent auth.

P1-196 remains **ACTIVE**: exact-generation persistent expiry transition, durable invalid/expired tombstone semantics, and recovery per-child auth recheck remain open. This tranche performs no live provider call, real Chrome qualification, build, release receipt or release action.

Because `service-worker.js` and `options.js` are canonical package members, current RPF and current 33-file control must be re-derived by exact-head P1-231 authority before merge. No QA-contract, Registry/full-RCF root or builder-contract input is intentionally changed. Manifest remains `0.9.8`; release readiness remains **NOT READY**.


### P1-196 auth-status identity discovery #1078

Repository Integrity #1078 / run `35757954047` on exact preliminary head `72b71bcdd56aa5304df862274607360f30565856` passed the PR contract, JavaScript syntax and both dedicated P1-231 release-control jobs. Exact authority derived current 34-file RPF `sha256:37768ce6929adc01d8042fc728c898e5500c932eb12a657d042277ac67816d15` and current 33-file control `sha256:293be1d3c4f8fdea2978a07d147ea43972e41d806e7c4fd69c9841adbbccddb6`; Chrome QCF remains `sha256:3715a3453333d3d679a1c1c00a0bab6a02b77c0153f1a4e8d138aa1e8f5a984c`, Yandex QCF remains `sha256:8d6c9711b4f71b8485b49a6ab68f90bcf62bc74155ae0959dbdc4718648879a1`, full RCF remains `sha256:037cd4b167ed9c6b572b8e74ea8b355be9599c142c68bffce55e0fb386aab9ed`, and BCF remains `sha256:9eebcc834fa32bd8fe5f03ef14564f0fc1c169d0308dcc2813941b4f913363ff`.

The generic deterministic suite failed on stale current identity pins plus two direct source-witness defects: the P1-195 capability model still expected compatibility `connected` to mean token presence, and the new P1-196 Options-status regression used an end marker that occurs earlier in the file than `refreshStatus()`. Both are witness corrections only; runtime bytes are unchanged after the preliminary head. #1078 is discovery evidence, not merge evidence. P1-196 remains **ACTIVE**; manifest remains `0.9.8`; release readiness remains **NOT READY**.


## P1-196 exact-generation validity tombstones — 2026-09-23

A bounded P1-196 tranche converts exact current-auth HTTP 401 and exact known local expiry into one shared generation-fenced validity transition. Instead of deleting current auth to an untyped absence, the transition stores a non-secret session tombstone with the same `authRecordId`, advanced shared P1-178 auth generation, bounded source/account/lifetime metadata, explicit `validity=invalid|expired`, and no access token / refresh token / scope.

`readYandexAuthState()` treats this tombstone as authoritative session state and cleans any stale legacy persistent OAuth secret rather than migrating it back, preventing invalid/expired credential resurrection. Exact provider expiry (`expiresAt <= now`) may publish an expired tombstone only under record/control-generation CAS; the existing future 60-second admission skew remains a non-transition block and is not mislabeled expired.

Deterministic coverage includes new `project_tools/test_p1_196_validity_tombstone_runtime.js`, reconciled `test_p1_196_exact_auth_401_runtime.js`, `test_p1_196_auth_status_axes_runtime.js`, `test_p1_196_auth_validity_generation_refinement_model.js`, and `test_yandex_legacy_token_cleanup.js`.

P1-196 remains **ACTIVE** after this tranche: bounded restart/maintenance recovery still needs per-child current-auth usability/generation recheck after a preceding child can invalidate or supersede auth. No live Yandex request, real Chrome qualification, product build/ZIP, release receipt, manifest bump, S2 activation, tag, deployment or release decision is performed.

`service-worker.js` changes package bytes, so exact current RPF/current 33-file control must be re-derived by P1-231 authority on the PR head before merge. Manifest remains `0.9.8`; release readiness remains **NOT READY**.


### P1-196 validity-tombstone identity discovery #1081

Repository Integrity #1081 / run `35805481196` on preliminary head `ce218c40bd35d27567a3df8ee8a1a511a82d542f` stopped the generic repository-integrity job at a PR-body change-contract metadata error before syntax/deterministic execution. Both independent release-control jobs completed successfully. The exact source-generation authority derived current 34-file RPF `sha256:63ba60983ae6cce7df28f775cf64111a2d6a5d20913b22568fafc055c79856ff`; Chrome QCF remains `sha256:3715a3453333d3d679a1c1c00a0bab6a02b77c0153f1a4e8d138aa1e8f5a984c`, Yandex QCF remains `sha256:8d6c9711b4f71b8485b49a6ab68f90bcf62bc74155ae0959dbdc4718648879a1`, full RCF remains `sha256:037cd4b167ed9c6b572b8e74ea8b355be9599c142c68bffce55e0fb386aab9ed`, and BCF remains `sha256:9eebcc834fa32bd8fe5f03ef14564f0fc1c169d0308dcc2813941b4f913363ff`.

The source-generation lane does not emit the current 33-file negative/control digest, so that value is intentionally left at its predecessor pin until a complete deterministic identity run derives the exact new value. #1081 is discovery evidence only, not merge evidence. P1-196 remains **ACTIVE**; manifest remains `0.9.8`; release readiness remains **NOT READY**.


### P1-196 validity-tombstone identity discovery #1082

Repository Integrity #1082 / run `35805776775` on exact head `e183d84fb2a5d243caec67738f26b26a24c84705` passed both dedicated release-control jobs and the P1-196 runtime/tombstone regressions. The generic deterministic suite failed only because current 33-file control assertions still pinned the predecessor `sha256:293be1d3c4f8fdea2978a07d147ea43972e41d806e7c4fd69c9841adbbccddb6`. Exact identity execution derived current 33-file control `sha256:2dd647a17acd570c42d09ca47f01401b81c9936b23d30f794bb873ea7e81333a`; current 34-file RPF remains `sha256:63ba60983ae6cce7df28f775cf64111a2d6a5d20913b22568fafc055c79856ff`, Chrome/Yandex QCF remain unchanged, full RCF remains `sha256:037cd4b167ed9c6b572b8e74ea8b355be9599c142c68bffce55e0fb386aab9ed`, and BCF remains `sha256:9eebcc834fa32bd8fe5f03ef14564f0fc1c169d0308dcc2813941b4f913363ff`. The downstream S0/S1 failures were transitive through that stale current-control pin. #1082 is discovery evidence only, not merge evidence; a later complete exact-head SUCCESS is required. P1-196 remains **ACTIVE**; manifest remains `0.9.8`; release readiness remains **NOT READY**.
