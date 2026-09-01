# Retired research-delta evidence

This document preserves unique corrections and positive controls from `RESEARCH_DELTA_*` files that have passed a lossless retirement comparison and can therefore leave the current working tree.

It is **not** the current status registry. Current owner/status/acceptance authority remains the research registry/priority layer. Git history preserves the exact original delta text.

## Retirement rule

A delta may be retired only when all of the following are true:

1. it introduces no independent unresolved owner whose only acceptance text lives in that delta; or that owner/acceptance already exists in the canonical registry;
2. any unique correction/retraction is copied here or to `RESEARCH_HISTORY_INDEX.md`;
3. any unique positive source proof/regression guard is copied here or `RESEARCH_EVIDENCE.md`/`TEST_EVIDENCE.md`;
4. current status is not inferred from the delta's historical test note;
5. exact source remains recoverable from Git history.

## 2026-08-29 retirement batch 1

### P1-076 backup lease remote-phase liveness — corrected proof retained

Retired sources:

- `RESEARCH_DELTA_BACKUP_LEASE_REMOTE_PHASE_EXPIRY_2026-08-28.md`
- `RESEARCH_DELTA_BACKUP_LEASE_REMOTE_PHASE_CORRECTION_2026-08-28.md`

The first delta correctly identified a semantic ownership problem: backup A can lose a fixed 10-minute lease while an operation capable of later resuming/publishing side effects remains live; a successor B could then acquire a newer lease, while stale A may later resume and publish state without revalidating ownership.

One supporting argument in the first delta was wrong and is explicitly retired: deep Yandex root traversal is **not** an unbounded proof. Existing P1-034 controls already bound normalized root length to 2048, path segments to 32 and the aggregate folder-tree operation to 90 seconds, with each request receiving only the remaining budget.

The current concrete overlap proof instead composes **P1-076 with P1-158**: `yandexApi()` awaits `getValidYandexAccessToken()`/`readYandexAuthState()`, and the researched P1-158 path contains an unbounded `chrome.storage.local.get('yandexConfig')` before the bounded HTTP fetch deadline is established. That prerequisite can outlive the 10-minute lease.

Preserved semantic acceptance:

- exclusive backup authority must not expire while any stage that can later resume and publish remote/state side effects remains live;
- this may be solved by heartbeat/renewal, one strict whole-operation deadline proven below lease duration, or actual-settlement receipt admission that blocks/supersedes successors safely;
- stale A must not publish current success/coverage after losing ownership;
- lease expiry is not cancellation evidence for an actually unsettled prerequisite/remote attempt;
- preserve P1-034 as a positive control, not a broken dependency;
- regression should hang `chrome.storage.local.get('yandexConfig')` beyond lease TTL and prove B cannot create an unsafe overlap or that A is permanently fenced before it can resume/publish.

No new P-number was created; P1-076 remains lease owner and P1-158 supplies the current unbounded prerequisite proof.

### Context-menu child-frame click origin — positive control

Retired source:

- `RESEARCH_DELTA_CONTEXT_MENU_ORIGIN_FRAME_SEMANTICS_REVALIDATION_2026-08-28.md`

Current context-menu commands are tab/top-document WebClip session commands. Although Chrome `OnClickData` may include child `frameId`/frame URL, `handleContextMenuClick()` deliberately routes ordinary commands to the top-frame content script and does not treat the click-origin frame as implicit authority.

Fresh revalidation found **no new defect** in that omission. Treating `info.frameId` as automatic authority would be unsafe because right-clicking an untrusted child frame must not bypass optional-host-permission/frame-agent admission.

Preserved boundaries:

- `info.frameId` is provenance/diagnostic context unless a future command is explicitly frame-local;
- P0-070 still owns exact top-document save/PDF generation fencing;
- P1-171/P1-004 still own exact child document/permission generation;
- P1-204 still owns browser-owned context-menu rebuild generation across MV3 worker lifetimes;
- a future frame-local command must explicitly bind `{tabId, frameId, documentId/navigation generation, permission generation}`.

### Imported Journal URL-derived scope keys — positive control

Retired source:

- `RESEARCH_DELTA_IMPORTED_URL_DERIVED_SCOPE_KEYS_REVALIDATION_2026-08-28.md`

`normalizeImportedJournalEntry()` normalizes the imported HTTP URL and recomputes authoritative `urlKey` and `siteKey`; it does not trust `raw.urlKey` or `raw.siteKey`. Current view/scoped-clear identity is likewise derived from normalized URLs rather than arbitrary imported derived keys.

Preserved boundary:

- raw imported `hostname`/`siteAddress` may remain bounded descriptive metadata but must not become stronger current scope/destructive authority when a valid URL exists;
- current destructive generation/CAS remains P0-076;
- imported Yandex provenance remains P0-022/P0-073;
- composed Journal view revision remains P1-206.

Regression guard: valid URL A plus forged raw keys for B must store/use A-derived keys; future schema migration must not promote raw derived keys without explicit validation/version semantics.

### Journal export revision-writer coverage — positive control

Retired source:

- `RESEARCH_DELTA_JOURNAL_EXPORT_REVISION_WRITER_COVERAGE_REVALIDATION_2026-08-28.md`

Fresh inventory found no current authoritative `JOURNAL_STORE` writer bypassing the Journal revision contract used by full export/backup. Current append, entry update, delete, clear and replace-import mutations advance `JOURNAL_META_REVISION_KEY` in the same IndexedDB transaction as the source-row change.

Therefore `stageFullJournalExportOnce()` may use before/after revision snapshots as evidence that no committed authoritative source-row mutation occurred between its boundary reads. Derived stats, pending stores and staging data are not source rows and correctly do not independently advance source revision.

This does **not** close P1-206 composed-view revision coherence, backup source-revision binding to remote/account/root generation, or retry/deadline policy.

Regression guard: any future direct authoritative Journal source-row writer or migration must participate atomically in the same revision-generation contract.

### OperationLog detail one-transaction snapshot — positive control

Retired source:

- `RESEARCH_DELTA_OPERATION_LOG_DETAIL_TRANSACTIONAL_SNAPSHOT_REVALIDATION_2026-08-28.md`

`getOperationLog(operationId)` first observes/awaits the current per-operation write tail when present, then reads operation header and exact operation event timeline in **one** bounded readonly IndexedDB transaction and publishes only after transaction completion.

A later writer may validly fall before or after that readonly snapshot; the returned detail itself is coherent rather than a mixed header/events view from separate transactions.

This does not close P1-197 clear/history generation, P1-205 retention-vs-writer ordering, P1-198 receipt authority, post-snapshot writer admission or UI latest-request generation.

Regression guard: future optimization must not split header and timeline into independent transactions without an equivalent shared snapshot/history receipt.

### Exact transfer-group deletion — positive control

Retired source:

- `RESEARCH_DELTA_TRANSFER_GROUP_DELETE_OWNERSHIP_REVALIDATION_2026-08-28.md`

Fresh revalidation did not prove a new correctness blocker in `deleteTransferPayloadGroup()`.

Preserved controls:

- a group key selects exactly `id === key` or `id.startsWith(key + ':chunk:')`, including the delimiter, so group A does not select AB/A2;
- staging/export flows generate fresh random group identities rather than normally reusing a stable physical owner key for successive generations;
- selection and deletion occur inside one readwrite IndexedDB transaction, giving transaction atomicity rather than a readonly-snapshot/later-blind-delete CAS gap;
- cleanup has a bounded deadline and timeout/abort does not prove cross-generation deletion.

This conclusion is deliberately narrower than P1-035. Generic TTL cleanup can still delete a live long-lived import staging generation and remains owned by P1-035. Storage admission remains P1-043; staged import source/content authority remains under the import receipt owners.

If future code introduces user-supplied/reused base ids, this positive conclusion must be re-researched.

### Yandex restore encoded-byte limit — positive control

Retired source:

- `RESEARCH_DELTA_YANDEX_RESTORE_DOWNLOAD_BYTE_LIMIT_REVALIDATION_2026-08-28.md`

Despite a misleading service-worker field name `maxChars`, the signed `text-download` offscreen path converts/clamps the value as **bytes** to `MAX_JOURNAL_IMPORT_BYTES = 50 MiB`.

`stageResponseBodyAsJournalImport()` checks `Content-Length` when available, requires a streaming reader, counts each `Uint8Array.byteLength`, rejects/cancels when total encoded bytes exceed the cap, and stages bounded byte chunks instead of decoding the complete response to one JS string first. Transfer admission/reservation is also expressed in the same physical byte scale and is later resized to actual staged bytes.

Therefore multibyte UTF-8 content cannot bypass the 50 MiB network/materialization bound merely because decoded character count is smaller.

The `maxChars` name is interface debt and should eventually become `maxBytes`, but fresh source proof did not justify a new correctness P-item from naming alone. Parser/schema/per-field/deadline limits remain separate owners.

Regression guard: >50 MiB streamed bodies must fail on encoded bytes even without Content-Length; multibyte bodies are byte-counted; streaming-unavailable response fails closed; reservation remains held through actual settlement.

## Interpretation

All source deltas above were docs-only checkpoints and repeated the historical 88/88 syntax + 74/74 deterministic result without rerunning it. Their retirement does not upgrade that historical gate to a current test result.

## 2026-09-01 final temporary-delta retirement

Retired source: `RESEARCH_DELTA_SELECTION_CAPTURE_FIDELITY_2026-08-29.md`.

Provenance:

- exact source is present on `main` at `feadab448ef05163cee7815b7f7644e3ee4ebf92` before this retirement;
- Git blob hash for the exact UTF-8 source is `438bf6a4b2e3318d0efcfb97ef778da30f2f0faa`;
- original research baseline recorded by the source is `cef798f693ce5a7d4573484baf819389ace079af`;
- current P-code authority remains `RESEARCH_REGISTRY.md` (not the historical text below);
- durable current supporting summary remains `RESEARCH_SELECTION_CAPTURE_FIDELITY_EVIDENCE.md`.

The source text below is preserved **verbatim** so the standalone temporary delta can leave the working tree without losing source proof, browser reproductions, dedup decisions, positive/negative controls or acceptance detail.

Historical source bytes are preserved by Git object identity `438bf6a4b2e3318d0efcfb97ef778da30f2f0faa`. The current research tree intentionally does not reproduce retired historical wording; provenance is verified by hash-addressed Git object existence.
