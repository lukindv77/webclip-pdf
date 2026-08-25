from pathlib import Path
import subprocess

BASE = "a3a10308d060fc9926ff348f19a14dba3d5c91d9"
TEMP = {"project_tools/_audit_sync_20260826_e.py", ".github/workflows/audit-sync-20260826-e.yml"}
changed = set(filter(None, subprocess.check_output(["git", "diff", "--name-only", f"{BASE}..HEAD"], text=True).splitlines()))
if changed != TEMP:
    raise SystemExit(f"Guard failed: unexpected changes since baseline: {sorted(changed)}")

pp = Path("project_docs/PRIORITIES_P0_P1_P2.md")
ap = Path("DEEP_AUDIT_2026-08-25.md")
priorities = pp.read_text(encoding="utf-8")
audit = ap.read_text(encoding="utf-8")
for code in ("P1-179", "P1-180"):
    if f"| {code} |" in priorities or code in audit:
        raise SystemExit(f"Guard failed: {code} already exists")

lines = priorities.splitlines()
replaced = False
for i, line in enumerate(lines):
    if line.startswith("| P0-069 |"):
        lines[i] = "| P0-069 | P0 | OPEN | Удаление Yandex-записи с действующей публичной ссылкой может тихо оставить файл публично доступным и одновременно уничтожить локальную запись, через которую WebClip умеет управлять этой ссылкой. Это относится и к `trash` (обычный `resources/move` в `<root>/Trash/...` не отзывает публикацию), и к `keep` (файл/public link намеренно остаются). Для любой published entry до удаления локальной записи UI обязан явно показать статус публикации. Если выбран revoke — требуется явное подтверждение пользователя, durable/reconciled `resources/unpublish` без blind retry при unknown settlement и удаление Journal entry только после подтверждённой privacy outcome. Если пользователь сознательно сохраняет public access, требуется отдельное явное подтверждение, что ссылка продолжит работать и после удаления записи WebClip больше не сможет управлять ею из журнала. Success-текст должен точно отражать итог публикации. |"
        replaced = True
        break
if not replaced:
    raise SystemExit("Guard failed: P0-069 row not found")
priorities = "\n".join(lines)

priority_append = r'''

## Продолжение глубокого аудита 2026-08-26 — backup identity / bulk public-link retention

| Код | Приоритет | Статус | Пункт |
|---|---|---|---|
| P1-179 | P1 | OPEN | Journal backup scheduler/state и pending backup checkpoint не scoped к immutable Yandex identity. `journalBackupState` хранит `lastSuccessAt/lastFailureAt/lastRemotePath` без `accountUid/rootPath`, поэтому смена аккаунта, rootPath или импорт настроек наследует старые success/retry timestamps и может отложить первый backup в новом месте. Prepared checkpoint также хранит только `remotePath/expectedBytes/...`; recovery строит **текущий** backup root, удаляет checkpoint сразу при root mismatch, а при совпадающем строковом path подтверждает файл главным образом по path + exact size без account identity. Unknown-settlement upload в старом root/account может стать orphan, а state нового контекста — ложным/устаревшим. Snapshot immutable `accountUid + rootPath` в checkpoint и backup-state; recovery должен проверять исходную identity, не уничтожать unknown checkpoint только из-за смены текущей config и требовать явного resolution/migration при mismatch. Смена account/root должна сбросить/пересчитать due/retry state для нового backup namespace. |
| P1-180 | P1 | OPEN | Bulk local destructive operations (`Очистить домен`, `Очистить весь журнал`, replace/import) могут удалить записи с действующими Yandex `publicUrl`, оставив опубликованные файлы доступными и уничтожив локальные references для будущего точечного P1-164 unpublish. Тексты сейчас говорят о замене/удалении локального журнала, но не показывают количество опубликованных Yandex entries и необратимую потерю управления ссылками через WebClip. Перед подтверждением сделать bounded count published entries в затрагиваемом scope и явное предупреждение: remote files/public links не будут автоматически отозваны этой локальной bulk-операцией. Не запускать массовый unpublish скрыто; если такой режим будет добавлен отдельно, ему нужны собственные durable per-file checkpoints, прогресс и explicit confirmation. |
'''
pp.write_text(priorities.rstrip() + priority_append + "\n", encoding="utf-8")

audit_append = r'''

## Continuation at HEAD `a3a10308d060fc9926ff348f19a14dba3d5c91d9` — Yandex backup identity and destructive public-link retention

No production source changed during this continuation.

### Newly confirmed findings

- **P1-179 OPEN — backup state is not namespaced by Yandex account/root identity.** `journalBackupState` combines current config with old global last-success/failure timestamps. A newly selected root/account can therefore appear recently backed up even though no backup exists there. The prepared upload checkpoint likewise lacks account/root identity. `recoverPendingJournalBackup()` first creates/uses the current configured backup tree; if the old pending path is outside it, the checkpoint is removed immediately. If the path string still matches, recovery validates file/type and exact size but does not prove the original Yandex account. The checkpoint and state need immutable accountUid/rootPath and mismatch handling that preserves unknown-settlement evidence instead of discarding it because configuration changed.
- **P1-180 OPEN — bulk local clear/import can orphan public-link management.** Domain/all clear and full import/replace intentionally mutate the local Journal only. With public links enabled by default, entries removed from the Journal may still point to Yandex files whose public access remains active. Once their local `publicUrl`/identity metadata is gone, P1-164 cannot offer per-entry revoke for them. Before bulk confirmation, count affected published Yandex entries using a bounded scan and explicitly warn that these public links remain active and will no longer be manageable from WebClip. Do not silently turn a local clear/import into a large remote unpublish operation.

### P0-069 clarification

The single-entry privacy invariant applies to both Yandex delete choices. Moving to WebClip Trash does not itself revoke a published link, while `keep` intentionally leaves the remote file untouched. Either revoke must be explicitly confirmed and reconciled before the local record disappears, or the user must explicitly confirm that public access will remain after WebClip forgets the entry.

### Test evidence note

Audit documentation only; production tests were not rerun and the release gate remains unchanged.
'''
ap.write_text(audit.rstrip() + audit_append + "\n", encoding="utf-8")
