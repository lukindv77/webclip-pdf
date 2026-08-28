# CURRENT STATE — WebClip PDF handoff, 2026-08-28

## Repository

- Repo: `lukindv77/webclip-pdf`
- Branch: `main`
- Handoff audit-baseline HEAD: `53c8b18634cdd5d807363a85c6ff40efc266fa66`
- Baseline message: `docs: keep journal apply behind upload generation lock`
- Runtime manifest: `0.9.8`, MV3, Chrome >=118.
- Canonical priorities document currently labels the development line `WebClip 0.9.9 WIP`; do not confuse that with manifest version.

The handoff files themselves are committed after the baseline and therefore final HEAD is newer. Always fresh-read `main`.

## Current project architecture

Primary runtime pieces:
- `content.js`: top-document selection/review UI, Include/Exclude state, printable representation, PDF/Yandex/local-save commands, same-origin iframe selection.
- `frame-agent.js`: cross-origin iframe selection/prepare-print/resource logic after explicit optional host permission.
- `service-worker.js`: privileged runtime boundary; Chrome scripting/tabs/downloads/debugger/storage/alarms; Journal IndexedDB; Yandex auth/config/API; backups; recovery; OperationLog.
- `offscreen.js`: bounded signed transfer/download/upload materialization and staging.
- `journal.js`: Journal view, filter/grouping, comments, templates, import/restore/backup UI.
- `options.js`: Yandex auth/root/folder picker, settings import/export, backup settings/status, OperationLog UI.
- `popup.js`: Start/ReadLater/Journal/navigation and optional iframe permission request.

Persistence/recovery domains:
- Journal IndexedDB is local source of truth.
- PDF retry cache in IndexedDB.
- pending local downloads / remote saves / Journal appends.
- staged transfer payloads and import staging.
- backup lease + pending backup checkpoint.
- `chrome.storage.session` for OAuth auth/pending state and Journal contexts.
- OperationLog is diagnostics/history, not the sole correctness receipt.

## Test/release truth

Historical only:
- 88/88 JavaScript syntax PASS.
- 74/74 deterministic tests PASS.

Do NOT claim those were rerun for current docs-only HEAD.
No build/tag/Release was created during the recent audit-only sequence.
Real unpacked Chrome QA and real Yandex behavior remain separate release requirements.

## Recent baseline commits that must not be lost

Important recent docs commits include, in approximate progression:
- `1eeb997a...` retain known download id across bind failure.
- `eb1bc7ba...` fence selection across SPA navigation generation (P0-080).
- `e0156a4d...` bind folder picker to Yandex account generation.
- `ebceffe0...` reconcile scheduler after root partial commit.
- `a40ea6f9...` bind Save Root result to verified generation.
- `472153e0...` fence multi-segment folder-tree creation to one auth/account generation.
- `3c1b1657...` reconcile Create Folder after transport loss.
- `0baaa84e...` Yandex Disconnect is a partial-commit auth transition.
- `a2871e2a...` correction: backup lease expiry proof uses unbounded auth/config prerequisite, not deep folder traversal.
- `e83546ad...` align popup/context selection start semantics.
- `a5679618...` direct Start Selection bypasses active upload generation lock.
- `53c8b186...` Journal Apply bypasses active upload generation lock.

This list is intentionally not a replacement for `git log`; always inspect newer commits and all relevant audit delta files.
