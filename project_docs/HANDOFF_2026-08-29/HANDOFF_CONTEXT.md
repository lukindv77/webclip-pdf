# HANDOFF CONTEXT — WebClip PDF, 2026-08-29

Этот файл — переносимый контекст для нового чата. Он не заменяет код, canonical priorities или audit deltas. GitHub `main` всегда важнее.

## Repository/runtime

- Repo: `lukindv77/webclip-pdf`
- Branch: `main`
- Контрольный HEAD до записи handoff: `e42e4bbb08f00b6717b59e3ec94693e03eb1cda6`
- `manifest.json`: version `0.9.8`, Manifest V3, Chrome >=118.
- `PRIORITIES_P0_P1_P2.md` ведёт линию `WebClip 0.9.9 WIP`; это не manifest version.

Runtime components:
- `content.js` — selection/review/print/save, same-origin iframe.
- `frame-agent.js` — cross-origin iframe после optional host permission.
- `service-worker.js` — privileged boundary, Journal IDB, Chrome API, Yandex, recovery, backup, OperationLog.
- `offscreen.js` — bounded signed transfer/materialization/staging.
- `journal.js` — Journal UI, comments, templates, import/restore/backup.
- `options.js` — Yandex auth/root/folder picker, settings, backup, OperationLog.
- `popup.js` — Start/ReadLater/Journal/iframe permission.

Persistence/recovery:
- Journal IndexedDB — local source of truth.
- PDF retry cache.
- pending Journal appends / local downloads / remote saves.
- transfer/import staging.
- backup lease + pending backup checkpoint.
- OAuth/session + Journal contexts in `chrome.storage.session`.
- OperationLog — diagnostics/history, not sole correctness authority.

## Test/release truth

Historical only:
- 88/88 JavaScript syntax PASS.
- 74/74 deterministic tests PASS.

Большой массив последних изменений — docs-only audit commits. Эти тесты после них не перезапускались. Real unpacked Chrome QA и real Yandex E2E остаются отдельными release checks. Последние audit-сессии build/tag/Release не создавали.

## Architecture invariants

1. Generation is authority. `tabId`, `frameId`, textual id, URL, path/current config alone are not capabilities.
2. Caller timeout is not cancellation. Distinguish `not-admitted`, `unknown`, `verified`, `superseded`.
3. Durable correctness receipt is separate from diagnostics/OperationLog.
4. Prefer exact identity: numeric `downloadId`, Yandex `resource_id` + namespace generation, exact Journal revision, exact staged receipt.
5. Fresh-read current row is not CAS; it can retarget stale intent to a replacement generation.
6. Portable backup schema is separate from internal DB/recovery/capability state.
7. A Yandex physical operation needs one conjunctive account/auth/root/config/publication context.
8. Page-owned DOM is not a frozen PDF artifact. Shared markers, synthetic page clicks, live mutable subtree and active clones are insufficient.
9. Same browser document is not necessarily the same SPA/application generation.
10. Partial commit is a first-class state: Save Root, Disconnect, remote move/publish/upload and Chrome side effects may commit before result/ancillary settlement.
11. Popup/context/direct Start/Journal Apply and other selection-mutating commands must obey one source-page operation admission generation.
12. Old async generation never overwrites newer user-visible truth.

## Important newer owners

### P0-080 — SPA / same-document application generation

The same `documentId` can survive `pushState`/route replacement. Stale Element refs can remain counted while route metadata has moved to B. Recent refinements:
- save confirmation opened on A cannot Proceed under B;
- PDF retry cache URL equality is not application-generation equality;
- Journal Apply must revalidate current target route/application immediately before mutation.

### P1-211 — deleted Journal comment lifecycle/capacity

Soft-deleted comments preserve full text, search/export visibility and count/text budget debt. Latest audit proves the capacity debt is portable through official backup/import. Required direction: bounded tombstone retention/compaction and separation of active capacity from historical retention.

### P1-212…P1-217

- P1-212: print prep must not synthetic-click page-owned controls.
- P1-213: flattened same-origin iframe proxy must be inert.
- P1-214: partial remote-frame prepare/restore needs rollback ownership/receipt until exact settlement.
- P1-215: active import confirmation must lease/pin staged payload against generic TTL.
- P1-216: legacy URL derived-identity parity across view/list/scoped clear/stats.
- P1-217: Chrome Action degraded truth; failed new read cannot leave prior URL badge/title as current.

Do NOT assume the next integer is free. Check current registry before assigning anything.

## Major existing owners repeatedly refined

- P0-022 — imported/legacy Yandex provenance is not destructive authority.
- P0-023 — retry-cache identity/invalidation.
- P0-039/P0-048 — exact local DownloadItem identity; no filename/size heuristic authority.
- P0-070 — exact source top-document generation through debugger PDF.
- P0-074 — immutable Yandex account/auth/root/config/publication context.
- P0-075 — frozen printable representation.
- P0-076 — exact Journal entry/data-set mutation generation/CAS.
- P0-078 — publication authorization generation vs observed public state.
- P1-090/P1-183 — Yandex move target/recovery sagas.
- P1-157/P1-210 — side-effect settlement/result-loss reconciliation.
- P1-171/P1-175 — child/top document command authority.
- P1-177/P1-178/P1-191 — scheduler/auth/PKCE/manual-token generations.
- P1-184 — exact remote object identity.
- P1-198 — worker-issued operation receipt.
- P1-206/P1-207 — coherent Journal view/export/backup source revision.

## Latest high-value findings after the older handoff

- `91848ea1...` — save confirmation must remain bound to P0-080 application generation.
- `27bea6bf...` — retry cache needs explicit historical-artifact vs current-page identity semantics.
- `91e03a69...` — Journal Apply must revalidate current SPA/application generation.
- `6897ffac...` — ReadLater->Upload move must stay in one Yandex account/config generation.
- `9d229698...` — Delete->Trash move must stay in one Yandex account/config generation.
- `ab2aec8d...` — mutating Yandex timeout means remote settlement UNKNOWN, not proof that data did not change.
- `e42e4bbb...` — deleted comment capacity debt survives backup/import.
- `472153e0...` — multi-segment folder tree must not switch account/auth between segments.
- `3c1b1657...` — Create Folder result loss requires reconciliation in captured account context.
- `0baaa84e...` — Disconnect is a partial auth commit.
- `1eeb997a...` — once Chrome returned numeric `downloadId`, failed main bind must not lose that exact identity.

## Recommended next large blocks

1. Complete P0-080 coverage across remaining selection/review/save entry points.
2. Audit Action/browser URL observation vs content SPA application generation.
3. Decide retry-cache product semantics: immutable historical PDF artifact vs current-page retry, and encode the receipt.
4. Roll structured mutating-Yandex timeout/unknown-settlement semantics through every PUT/POST/DELETE caller.
5. Design/commonize immutable `YandexOperationContext` for folder tree/upload/publish/ReadLater/Trash/backup.
6. Pending ReadLater/Trash saga A while account B current: quarantine/reconcile original namespace.
7. P1-211 tombstone retention/compaction and old-backup compatibility.
8. Exact local `downloadId` bind-pending fallback when primary IDB bind fails.
9. Explicit allowlist portable Journal serializer; find remaining internal per-install fields leaking into v1.
10. Destructive Journal receipts after page loss/revision advance/stale confirmation; discover committed generation before retry.
11. Cross-frame exact document+permission generation: stale REGISTER, revoke/regrant, partial prepare/restore.
12. Backup coverage receipt: account/root/sourceRevision/object identity and scheduler current-state semantics.
13. Operation receipt schema convergence across PDF/cache/download/upload/Journal/UI.
14. Cleanup/retention after receipt fixes: dropping expensive bodies must never convert unresolved outcome into “absent”.

## User-requested session protocol

- Begin with at least 10 large blocks.
- Before tools give a short plan/completion/risk estimate.
- Finish taken blocks in the same session where possible.
- Commit every classified delta to GitHub.
- Do semantic duplicate-check before any new P number.
- Do not claim tests/build/release that were not actually executed.
