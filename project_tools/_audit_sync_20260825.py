from pathlib import Path
import subprocess

BASE = "3208f927ee330b43e4fd43427fd283668a781dd4"
TEMP = {"project_tools/_audit_sync_20260825.py", ".github/workflows/audit-sync-20260825.yml"}

changed = set(filter(None, subprocess.check_output(["git", "diff", "--name-only", f"{BASE}..HEAD"], text=True).splitlines()))
if changed != TEMP:
    raise SystemExit(f"Guard failed: unexpected changes since baseline: {sorted(changed)}")

priority_path = Path("project_docs/PRIORITIES_P0_P1_P2.md")
audit_path = Path("DEEP_AUDIT_2026-08-25.md")
priorities = priority_path.read_text(encoding="utf-8")
audit = audit_path.read_text(encoding="utf-8")

for forbidden in ("P0-069", "P1-169", "P1-170"):
    if forbidden in priorities:
        raise SystemExit(f"Guard failed: {forbidden} already exists in priority registry")


def replace_row(text: str, code: str, replacement: str) -> str:
    lines = text.splitlines()
    hits = [i for i, line in enumerate(lines) if line.startswith(f"| {code} |")]
    if len(hits) != 1:
        raise SystemExit(f"Guard failed: expected exactly one {code} row, got {len(hits)}")
    lines[hits[0]] = replacement
    return "\n".join(lines) + ("\n" if text.endswith("\n") else "")

priorities = replace_row(
    priorities,
    "P0-023",
    "| P0-023 | P0 | PARTIAL | PDF retry-cache уже имеет URL + TTL и инвалидируется при `changeInfo.url`, но document identity не сохранён/не проверяется. Reload того же URL создаёт новый документ без `changeInfo.url`; context-menu retry может поэтому отправить PDF старого документа. Привязать cache/checkpoint к `MessageSender.documentId` (Chrome >=106; minimum проекта 118) и проверять exact document identity перед retry; same-URL reload/history document replacement должны fail-closed инвалидировать cache. |",
)
priorities = replace_row(
    priorities,
    "P1-157",
    "| P1-157 | P1 | OPEN | В popup/Journal/Options/content остались прямые Chrome API/runtime RPC вне централизованных deadline helpers. Reads/idempotent calls должны быть bounded; non-idempotent side effects — operation-id/actual-settlement reconciled без blind retry. Отдельно `chrome.permissions.request()` нельзя обрывать обычным 10-секундным `Promise.race`: user-owned permission prompt может settle позднее локального timeout; держать request single-flight до actual settlement и не показывать ложную terminal error/не запускать повторный prompt поверх неизвестного результата. |",
)
priorities = replace_row(
    priorities,
    "P1-168",
    "| P1-168 | P1 | OPEN | Locator v3 после P1-155 ограничивает число restore-candidates до 5000, но creation/scoring всё ещё материализует полные sibling arrays (`[...parent.children]`, `.filter(...)`) для structural path/fingerprint и для каждого scored candidate; тот же паттерн есть в `frame-agent.js`. Wide-parent DOM способен вернуть O(candidates × siblings) CPU/memory. Дополнительно page-controlled `id` проходит через `CSS.escape()` до size-bound, а id/class tokens при locator creation ограничены недостаточно рано. Нужны bounded sibling traversal/index helpers и pre-bound всех locator string fields до CSS/querySelector/runtime serialization; при переполнении positional fingerprint следует опускать, а не зависать. |",
)

priority_append = r'''

## Продолжение глубокого аудита 2026-08-25 — document identity / destructive privacy / lifecycle fan-out

| Код | Приоритет | Статус | Пункт |
|---|---|---|---|
| P0-069 | P0 | OPEN | Удаление Yandex-записи с действующей публичной ссылкой может оставить файл публично доступным. Вариант `trash` делает обычный `resources/move` в `<root>/Trash/MM-YYYY/...`, затем удаляет локальную Journal entry; `resources/unpublish` в текущем worker отсутствует, UI сообщает только о переносе. Для published entry перед удалением локальной записи требуется явная privacy-семантика: либо подтверждённый/reconciled unpublish (без blind retry при unknown settlement), либо отдельное явное подтверждение пользователя, что публичная ссылка сохранится. Успех не должен означать «удалено/Trash», если публичный доступ остался неотозванным. |
| P1-169 | P1 | OPEN | Prepared Save As RELEASE создаёт отдельный durable `webclipPreparedSaveAs:<session>:released` tombstone, удаляет `prepared/started`, но released tombstones не входят в active index cap=64 и не имеют TTL/cleanup. За длинную browser session они неограниченно занимают `storage.session` и увеличивают стоимость full-session scans. Нужен bounded released-tombstone retention/GC, достаточный для защиты от late PREPARED/STARTED generations, без преждевременного снятия reconciliation barrier. |
| P1-170 | P1 | OPEN | После append/delete/clear/import Journal вызывается `refreshActionForAllTabs()`: `tabs.query({})` + `Promise.all(updateActionForTab)` на все вкладки; каждый update читает Journal summary и делает несколько Chrome Action mutations. Action pending cap защищает только actual side-effect settlements, но не O(T) IDB/read fan-out и перекрывающиеся refresh waves. Нужны global coalescing/generation и bounded worker pool/concurrency для refresh всех вкладок. |
'''
priorities = priorities.rstrip() + priority_append + "\n"

if "P0-069" in audit or "P1-169" in audit or "P1-170" in audit:
    raise SystemExit("Guard failed: continuation findings already present in deep audit")

audit_append = r'''

## Continuation at HEAD `3208f927ee330b43e4fd43427fd283668a781dd4` — document identity, destructive privacy and lifecycle state

No production source changed in this continuation. The audit re-read current `service-worker.js`, `content.js`, `popup.js`, `journal.js`, `options.js`, `prepared-save-as.js`, `offscreen.js`, manifest and the priority registry from GitHub `main`.

### Confirmed findings / status corrections

- **P0-023 PARTIAL — retry cache still lacks document identity.** The implementation stores `tabId`, normalized source URL and TTL, but `getValidCachedPdfForTab()` compares only current URL. Cache invalidation on `tabs.onUpdated` is keyed to `changeInfo.url`; a same-URL reload creates a replacement document without changing the URL. The context-menu command `Повторить отправку сформированного PDF` can therefore reach retry from the new document while the old PDF still matches `tabId + URL + TTL`. Persist and verify exact `MessageSender.documentId` (available before the project's Chrome 118 minimum) and fail closed on same-URL document replacement.
- **P0-069 OPEN — moving a published file to WebClip Trash does not revoke publication.** Journal destructive flow locates the file, performs Yandex `resources/move` to the WebClip-managed Trash folder, verifies the move, deletes the local entry and reports success. No `unpublish` path exists in the current worker. A published URL may therefore remain usable after the Journal record containing `publicUrl` is deleted. Make published-state semantics explicit before local deletion and reconcile remote unpublish without blind retry after unknown settlement.
- **P1-169 OPEN — released prepared-Save-As tombstones have no GC.** RELEASE intentionally writes a distinct session-storage key so a late PREPARED/STARTED write cannot overwrite terminal state, but the released key is never part of the 64-entry active index and has no TTL cleanup. Repeated Save As operations can therefore accumulate session keys until browser restart; GC must preserve the late-generation safety window.
- **P1-170 OPEN — Journal mutation triggers unbounded all-tab action refresh fan-out.** Append/delete/clear/import call `refreshActionForAllTabs()`, which uses `tabs.query({})` and `Promise.all()` over every tab. Per-action settlement caps do not bound the preceding Journal-summary reads or total wave concurrency. Coalesce overlapping global refreshes and process tabs through a bounded pool.

### Existing tasks strengthened

- **P1-157:** `chrome.permissions.request()` is a user-owned non-cancellable prompt and must not be treated like a normal bounded read. The current popup helper can locally time out after 10 seconds while the permission request later settles. Keep the prompt request single-flight through actual settlement and avoid a second prompt/false terminal error on unknown result.
- **P1-168:** bound page-controlled locator `id`/class/string fields before `CSS.escape`, selector construction and runtime serialization in addition to replacing full sibling arrays.
- **P1-154:** its aggregate selection budget must apply before materializing local + remote locators; per-frame 250-item limits do not by themselves bound the top-frame aggregate before the final slice.

### Revalidated / rejected hypotheses

- Progress-port Sets remove ports on disconnect and on posting failure; Journal page timers are cleared on `pagehide`.
- Journal session contexts have TTL, a hard count cap and bounded removal batches; Yandex directory/locate/verify loops reviewed here have deadlines/hard limits.
- Background Journal backup remains explicit opt-in and cannot be enabled without a selected Yandex root.
- The suspected Yandex `..` filename escape remains rejected: dot-only sanitized name components collapse safely and destructive writes re-check managed-branch containment.
- Offscreen dormant `text-payload-upload` has a chars-vs-UTF-8-byte reservation weakness, but the current service-worker call graph uses `pdf-cache-upload`, byte-checked `text-chunks-upload` and `text-download`; no live product caller for `text-payload-upload` was found in this pass, so P0-063 status is not changed solely for that dead/residual branch.

### Test evidence note

This synchronization changes audit documentation only. Product tests were not rerun. The last verified product gate remains the P0-063 gate: JavaScript syntax 88/88 PASS and deterministic `project_tools/test_*.js` 74/74 PASS. Real unmanaged unpacked Chrome and real Yandex OAuth/API/upload/move/backup E2E remain release blockers.
'''
audit = audit.rstrip() + audit_append + "\n"

priority_path.write_text(priorities, encoding="utf-8")
audit_path.write_text(audit, encoding="utf-8")

# Postconditions
updated_priorities = priority_path.read_text(encoding="utf-8")
for required in ("| P0-023 | P0 | PARTIAL |", "| P0-069 |", "| P1-169 |", "| P1-170 |"):
    if required not in updated_priorities:
        raise SystemExit(f"Postcondition failed: missing {required}")
if "createPublicLinks" not in updated_priorities:
    raise SystemExit("Postcondition failed: registry unexpectedly lost createPublicLinks product decision context")
print("audit sync patch PASS")
