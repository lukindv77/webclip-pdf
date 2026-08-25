from pathlib import Path
import subprocess

BASE = "b797eef1ceac24d65ce4681ed067c474cae0d7e8"
TEMP = {"project_tools/_audit_sync_20260826_c.py", ".github/workflows/audit-sync-20260826-c.yml"}
changed = set(filter(None, subprocess.check_output(["git", "diff", "--name-only", f"{BASE}..HEAD"], text=True).splitlines()))
if changed != TEMP:
    raise SystemExit(f"Guard failed: unexpected changes since baseline: {sorted(changed)}")

pp = Path("project_docs/PRIORITIES_P0_P1_P2.md")
ap = Path("DEEP_AUDIT_2026-08-25.md")
priorities = pp.read_text(encoding="utf-8")
audit = ap.read_text(encoding="utf-8")
for code in ("P1-173", "P1-174", "P1-175"):
    if f"| {code} |" in priorities or code in audit:
        raise SystemExit(f"Guard failed: {code} already exists")

priority_append = r'''

## Продолжение глубокого аудита 2026-08-26 — settlement queues / heavy Journal cards / source-tab identity

| Код | Приоритет | Статус | Пункт |
|---|---|---|---|
| P1-173 | P1 | OPEN | Serialized actual-settlement queues защищают порядок non-cancellable Chrome Storage/alarms/Yandex auth/config mutations, но не имеют admission/coalescing для **ожидающих queue turns**. Если исходный Chrome promise никогда не settle, каждый повтор после caller timeout создаёт новый unresolved turn/closure, который ждёт предыдущий и сам не запускает side effect. Повторные UI/background обращения способны неограниченно удлинять Promise-chain даже при одном реально зависшем API. Нужен per-key/global cap или coalesced wait-receipt: один hung actual settlement удерживает один barrier; дополнительные callers получают bounded busy/тот же wait без создания новой цепочки. Охватить `runSerializedLateSettlementOperation`, Yandex auth/config chains и prepared Save As settlement chain. |
| P1-174 | P1 | OPEN | Journal `PAGE_SIZE=20` ограничивает число записей, но карточка каждой entry eager-материализует тяжёлые collapsed данные: полный `fileComment`, все `journalComments` (включая deleted text), весь selection locator DOM и resource details. При действующих лимитах комментарии одной entry могут достигать ~2 MiB aggregate, selection snapshot — до 2 MiB; 20 full records могут создать десятки MiB DOM/text и тысячи locator nodes ещё до раскрытия `<details>`. Нужны lightweight summaries/previews и lazy generation тяжёлых sections по первому раскрытию/явному действию, с generation cleanup; при необходимости читать heavy fields отдельным point-read, а не удерживать 20 максимальных full records. |
| P1-175 | P1 | OPEN | Journal action `Применить Включены/Исключены` использует сохранённые `sourceTabId/sourceUrl` без exact revalidation непосредственно перед `chrome.scripting.executeScript`/`tabs.sendMessage`. `resolveSourceContext()` обновляет URL только при отдельных reload paths, а ошибка `tabs.get` оставляет старый context. Если исходная вкладка закрылась/навигацией ушла на другой сайт, stale UI остаётся активным; при наличии host permission injection может попасть в другой document/site. Перед apply сделать bounded fresh `tabs.get`, fail-closed очистить context при missing tab, повторно сравнить current http(s) siteKey с entry/source policy и только затем inject/send; после navigation response дополнительно fenced generation/document identity. |
'''
pp.write_text(priorities.rstrip() + priority_append + "\n", encoding="utf-8")

audit_append = r'''

## Continuation at HEAD `b797eef1ceac24d65ce4681ed067c474cae0d7e8` — queue admission and Journal foreground lifecycle

No production source changed in this continuation. The audit re-read the current service-worker late-settlement helpers and current Journal direct IndexedDB/render/apply paths.

### Newly confirmed findings

- **P1-173 OPEN — serialized late-settlement waiters can accumulate.** `runSerializedLateSettlementOperation()` correctly prevents a newer mutation from overtaking an older Chrome Storage/alarm mutation after local timeout, but each retry allocates a fresh `turn` and chains it behind the same unresolved predecessor. Yandex auth/config use analogous manually serialized chains; prepared Save As has its own settlement chain. If Chrome never settles the original promise, repeated callers add unresolved waiters even though no later side effect starts. Preserve actual-settlement ordering but coalesce callers onto one barrier or enforce fail-closed admission so one hung API operation cannot retain an unbounded Promise chain.
- **P1-174 OPEN — page-size bounding does not bound Journal card memory.** The normal page reads up to 20 full entries. `buildEntryCard()` immediately calls `buildJournalComments(entry)` and `buildSelectionDetails(...)`; comment rendering creates text nodes for every active/deleted comment, file comment is rendered in full, and locator groups are fully built even though they are visually collapsed. Current authoritative data limits allow ~2 MiB aggregate journal comments and a 2 MiB selection snapshot per entry, so a valid 20-entry page can hold tens of MiB plus thousands of DOM nodes. Heavy sections should be lazy and ideally point-loaded only when expanded.
- **P1-175 OPEN — Journal source tab is not revalidated at apply time.** `resolveSourceContext()` may update cached `sourceUrl` when it runs, but a `tabs.get` failure is swallowed and leaves the old context; the Journal does not subscribe to tab navigation for this state. `applyEntry()` later directly executes `content.js`, sends the snapshot and activates `sourceTabId` without a fresh current-tab/site check. Revalidate immediately before injection and fail closed if the tab disappeared or its current site is outside the intended same-site template policy.

### Non-finding / OAuth disconnect clarification

Current Yandex documentation explicitly says that for ordinary (non-device) tokens an application can implement account logout by deleting the local token; the token remains active in Yandex access management until revoked by one of Yandex's revocation mechanisms. Therefore current `Отключить` behavior — deleting WebClip's session token — is not classified as a security defect by itself. If the product later adopts Yandex device-specific tokens, explicit server-side revoke can be evaluated under P2-017 together with device identity and OS-backed/persistent credential options.

### Test evidence note

This continuation is audit documentation only. Product deterministic/browser tests were not rerun; the last verified production gate remains unchanged. Release remains blocked on real unmanaged unpacked Chrome and real Yandex OAuth/API/upload/move/backup E2E.
'''
ap.write_text(audit.rstrip() + audit_append + "\n", encoding="utf-8")
