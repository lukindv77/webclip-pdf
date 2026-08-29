#!/usr/bin/env python3
"""One-shot documentation normalization after audit-family consolidation.

The script intentionally edits documentation only. Every targeted stale section or
sentence must be found exactly once; otherwise it aborts before writing anything.
It also replaces the accumulated root README with a concise current entry point.
"""
from __future__ import annotations

import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
DOCS = ROOT / "project_docs"


def read(rel: str) -> str:
    return (ROOT / rel).read_text(encoding="utf-8")


def write(rel: str, text: str) -> None:
    (ROOT / rel).write_text(text, encoding="utf-8")


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected exactly one match, found {count}")
    return text.replace(old, new, 1)


def replace_section(text: str, heading: str, replacement: str, label: str) -> str:
    level = len(heading) - len(heading.lstrip('#'))
    if level < 1:
        raise RuntimeError(f"{label}: heading must start with #")
    pattern = re.compile(
        rf"(?ms)^{re.escape(heading)}\n.*?(?=^#{{1,{level}}}\s|\Z)"
    )
    matches = list(pattern.finditer(text))
    if len(matches) != 1:
        raise RuntimeError(f"{label}: expected exactly one section, found {len(matches)}")
    return pattern.sub(replacement.rstrip() + "\n\n", text, count=1)


def normalize_registry() -> None:
    rel = "project_docs/AUDIT_REGISTRY.md"
    text = read(rel)
    text = replace_once(
        text,
        "This file is the **single current authority for P-code ownership and status**. Detailed source proof, deterministic race schedules and implementation acceptance remain in the referenced `AUDIT_DELTA_*` families / consolidated evidence until each family is losslessly retired.",
        "This file is the **single current authority for P-code ownership and status**. Detailed source proof, deterministic race schedules, corrections, positive controls and implementation acceptance are retained in consolidated `AUDIT_FAMILY_*_EVIDENCE.md`, cross-cutting/history evidence and Git history.",
        "registry intro",
    )
    text = text.replace("remaining owner-specific audit deltas", "consolidated family evidence")
    text = text.replace("remaining detailed deltas", "consolidated family evidence")
    text = text.replace("remaining `AUDIT_DELTA_*.md`", "consolidated `AUDIT_FAMILY_*_EVIDENCE.md`")
    text = text.replace("remaining `AUDIT_DELTA_*`", "consolidated `AUDIT_FAMILY_*_EVIDENCE.md`")
    text = text.replace("family/deltas", "family evidence")
    text = text.replace("family and remaining detailed deltas", "family evidence")
    forbidden = [
        "remaining owner-specific audit deltas",
        "remaining detailed deltas",
        "remaining `AUDIT_DELTA_",
        "referenced `AUDIT_DELTA_*` families",
    ]
    for needle in forbidden:
        if needle in text:
            raise RuntimeError(f"registry still contains stale delta wording: {needle}")
    write(rel, text)


def normalize_architecture() -> None:
    rel = "project_docs/ARCHITECTURE.md"
    text = read(rel)
    text = replace_once(
        text,
        "Service worker принимает frame-agent только при `sender.frameId > 0`, проверяет действующий host permission и `documentId`, хранит bounded in-memory registry и после MV3 restart получает повторную регистрацию при reinjection.",
        "Service worker принимает frame-agent только при `sender.frameId > 0`, проверяет действующий host permission и `documentId` и хранит bounded in-memory registry. Этот registry не переживает MV3 worker restart: текущая архитектурная граница P1-203/P1-171/P1-200 требует явного re-handshake/reconcile-or-cleanup с точной child-document/permission/session generation; автоматическое self-healing через одну лишь reinjection не считается доказанной гарантией.",
        "architecture frame restart",
    )
    text = replace_once(
        text,
        "После print стили/temporary attrs откатываются.",
        "После print WebClip очищает только те стили/temporary attrs, которыми всё ещё владеет текущая print-generation: rollback выполняется compare-before-restore/по private receipt и не должен перезаписывать более новое состояние host page.",
        "architecture remote-frame rollback",
    )
    text = replace_once(
        text,
        "Во время PDF: раскрываются поддерживаемые disclosure-блоки, добавляется информационная шапка, ссылки абсолютизируются, обычные изображения временно оборачиваются ссылкой на исходный URL, frame-chain раскрывается для печати. После печати служебные изменения откатываются, раскрытые спойлеры могут остаться раскрытыми.",
        "Во время PDF WebClip формирует печатное представление выбранного контента: добавляет информационную шапку, безопасно нормализует ссылки/изображения и готовит frame-chain. Disclosure-контент раскрывается только если это можно сделать без выполнения произвольного page-owned поведения; synthetic click/submit/navigation/business logic ради печати не разрешены (P0-067/P1-212). Временные DOM-изменения принадлежат конкретной print-generation и снимаются только compare-before-restore/по точному generated-node receipt, чтобы stale cleanup не затирал более новые изменения страницы (P1-218…P1-224).",
        "architecture print preparation",
    )
    text = replace_once(
        text,
        "Для диагностики список читается напрямую из IndexedDB и параллельно через service worker; используется более полная выборка.",
        "Обычные представления Journal используют bounded/paged/streamed read-пути текущей реализации; параллельная материализация двух полных Journal-массивов не является текущей архитектурой. Публикуемый составной view обязан соответствовать одной доказанной Journal revision (P1-206).",
        "architecture journal read",
    )
    text = replace_once(
        text,
        "- изменения атрибутов checkpointed in-memory и откатываются в `restoreAfterPrint()`;",
        "- изменения атрибутов checkpointed per print-generation; `restoreAfterPrint()` восстанавливает старое значение только если текущее значение всё ещё соответствует WebClip-временной записи, иначе host-page mutation сохраняется;",
        "architecture resource rollback",
    )
    forbidden = [
        "после MV3 restart получает повторную регистрацию при reinjection",
        "параллельно через service worker; используется более полная выборка",
        "После print стили/temporary attrs откатываются.",
        "Во время PDF: раскрываются поддерживаемые disclosure-блоки",
    ]
    for needle in forbidden:
        if needle in text:
            raise RuntimeError(f"architecture still contains stale wording: {needle}")
    write(rel, text)


def normalize_decisions() -> None:
    rel = "project_docs/DECISIONS_AND_RATIONALE.md"
    text = read(rel)
    text = replace_section(
        text,
        "## Временная нормализация ссылок",
        """## Временная нормализация ссылок

Относительные `href` могут переводиться в безопасное абсолютное печатное представление. Временная запись принадлежит конкретной print-generation: после печати исходное значение восстанавливается только если host page не изменила тот же атрибут после WebClip. Stale rollback не имеет права перезаписывать более новое состояние страницы (P1-221).""",
        "decision links",
    )
    text = replace_section(
        text,
        "## Изображения как ссылки на оригинал",
        """## Изображения как ссылки на оригинал

Если `<img>` не находится внутри `<a>`, печатное представление должно сохранять возможность открыть исходный URL изображения. Реализация не должна полагаться на blind structural rollback: generated wrapper/marker имеет точную print-generation/ownership и удаляется только если всё ещё является объектом, созданным WebClip; более новая host-page структура не заменяется старым snapshot (P1-219).""",
        "decision image links",
    )
    text = replace_section(
        text,
        "## Спойлеры раскрываются до печати",
        """## Disclosure-контент в печатном представлении

Полезный скрытый контент желательно включать в PDF, но это требование не даёт WebClip права выполнять произвольные page-owned controls. Допустимы inert/static representation и нативное состояние, которое можно безопасно представить без synthetic click/submit/navigation/business logic; если для раскрытия требуется реальное действие приложения, нужен явный пользовательский шаг или безопасная альтернативная репрезентация (P0-067/P1-212).""",
        "decision disclosure",
    )
    text = replace_section(
        text,
        "## Recovery archive хранится как обычный файл внутри сборки",
        """## Recovery architecture — Git-first (SUPERSEDED old nested-archive rule)

Старое решение вкладывать полный recovery ZIP внутрь каждой пользовательской сборки отменено P0-019. Текущий WIP source snapshot — exact Git commit SHA; released source state определяется exact release commit + annotated tag. Пользовательский extension ZIP не обязан содержать nested source/recovery ZIP. Отдельный recovery ZIP допускается как offline/disaster artifact только из clean exact commit и содержит metadata + SHA-256 manifest. Текущая authority: `BUILD_AND_RECOVERY_RULES.md`.""",
        "decision recovery",
    )
    text = replace_section(
        text,
        "### Retry page upload идемпотентен после частичного успеха",
        """### Retry page upload после неизвестного/частичного settlement

Историческая стратегия «существующий `remotePath` + совпадающий byte-size = ранее загруженный объект» признана недостаточной и не является current correctness authority. По P1-184 path+size не доказывают object/content identity: retry/recovery должен использовать immutable operation-owned bytes/content fingerprint и точный remote object/proven-transfer receipt. Неизвестный settlement остаётся `unknown` до reconciliation; совпадение пути и размера не разрешает adoption/publication/final success.""",
        "decision yandex retry",
    )
    text = replace_section(
        text,
        "### Page progress не должен попадать в PDF",
        """### Page progress не должен попадать в PDF

Progress UI остаётся видимым во время подготовки и сетевых этапов. Непосредственно перед `Page.printToPDF` extension-owned progress root может быть временно скрыт и затем восстановлен. Любые временные изменения host DOM/атрибутов/обёрток очищаются только при доказанном ownership текущей print-generation; compare-before-restore не позволяет late cleanup перезаписать новое состояние страницы (P1-218…P1-224).""",
        "decision progress rollback",
    )
    forbidden = [
        "Recovery archive хранится как обычный файл внутри сборки",
        "При совпадающем размере готовый remote file переиспользуется",
        "## Спойлеры раскрываются до печати",
    ]
    for needle in forbidden:
        if needle in text:
            raise RuntimeError(f"decisions still contains stale wording: {needle}")
    write(rel, text)


def normalize_requirements() -> None:
    rel = "project_docs/USER_REQUIREMENTS.md"
    text = read(rel)
    text = replace_section(
        text,
        "## Спойлеры и сворачиваемые блоки",
        """## Спойлеры и сворачиваемые блоки

1. Полезный скрытый контент желательно включать в PDF там, где его можно безопасно представить без выполнения произвольной бизнес-логики страницы.
2. WebClip не должен synthetic-click произвольные accordion/toggle/link/submit controls и не получает authority на navigation/submit/application side effects ради печати.
3. Допустимы inert/static print representation и безопасное изменение нативного состояния, которым владеет текущая print-generation. Если для раскрытия требуется реальное действие приложения, используется явное действие пользователя или безопасная альтернативная репрезентация.
4. Cleanup временного состояния не должен перезаписывать более новые изменения host page.""",
        "requirements disclosure",
    )
    text = replace_once(
        text,
        "4. Временные изменения lazy-атрибутов должны быть восстановлены после формирования PDF.",
        "4. Временные изменения lazy-атрибутов принадлежат конкретной print-generation и после PDF восстанавливаются только compare-before-restore: если host page уже изменила тот же атрибут, WebClip не перезаписывает новое значение старым snapshot.",
        "requirements resource rollback",
    )
    text = replace_section(
        text,
        "## Recovery-архив — обязательное постоянное правило",
        """## Recovery / восстановление проекта — актуальное Git-first правило

1. Canonical WIP snapshot проекта — точный commit SHA в GitHub `main`; dated handoff/embedded archive не является источником истины.
2. Перед анализом или записью всегда fresh-fetch текущего `main`.
3. Для релиза точный tested commit фиксируется annotated release tag; пользовательский extension ZIP строится из этого commit/tag.
4. Вкладывать полный recovery/source ZIP внутрь каждой пользовательской сборки **не требуется** — прежнее правило superseded как P0-019.
5. При необходимости offline/disaster recovery создаётся отдельный recovery ZIP только из clean exact commit. Его metadata фиксирует source commit/tag, а manifest — SHA-256 файлов; dirty tree должен быть отвергнут builder-ом.
6. Актуальные audit/status/evidence документы хранятся в Git и остаются синхронизированы с текущим `main`; исторические версии сохраняет Git history.""",
        "requirements recovery",
    )
    forbidden = [
        "Recovery-архив — обязательное постоянное правило",
        "внутрь этой сборки должен включаться recovery-архив",
        "Временные изменения lazy-атрибутов должны быть восстановлены после формирования PDF",
    ]
    for needle in forbidden:
        if needle in text:
            raise RuntimeError(f"requirements still contains stale wording: {needle}")
    write(rel, text)


def normalize_test_plan() -> None:
    rel = "project_docs/TEST_PLAN.md"
    text = read(rel)
    text = replace_section(
        text,
        "### Manifest / recovery",
        """### Manifest / recovery
- Manifest V3; runtime version берётся из `manifest.json` и не повышается из-за docs/audit-only изменений.
- `contextMenus`, `alarms`, `debugger`, `offscreen`, `storage`, `downloads`, `scripting` присутствуют согласно current manifest.
- Все tracked JS проходят syntax check.
- `python project_tools/test_recovery_archive.py` подтверждает Git-first recovery: build только из clean exact commit, exact `source_commit` metadata, обязательные файлы, SHA-256/CRC и отказ на dirty tree.
- Пользовательский extension ZIP не обязан содержать nested recovery ZIP; P0-019 superseded old rule.""",
        "test plan recovery",
    )
    text = replace_once(
        text,
        "- В Console журнала не должно быть необработанных ошибок; если прямой IDB и worker расходятся, допускается только диагностический warning, интерфейс показывает более полную выборку.",
        "- В Console журнала не должно быть необработанных ошибок; ordinary Journal view не материализует параллельно два полных списка. Публикуемый URL/site/all view должен соответствовать одной coherent Journal revision (P1-206).",
        "test plan journal dual read",
    )
    text = replace_section(
        text,
        "### PDF",
        """### PDF
- header содержит адрес сайта, clickable full URL, «Название страницы», local datetime;
- обычные ссылки/relative links кликабельны;
- linked image сохраняет исходную ссылку; unlinked image сохраняет безопасную ссылку на image URL;
- disclosure/details-контент попадает в PDF только через безопасную inert/static representation или допустимое состояние; arbitrary synthetic click/submit/navigation не выполняются (P0-067/P1-212);
- временные link/image/frame/resource изменения не blind-rollback поверх более новой host mutation: cleanup использует compare-before-restore/exact ownership (P1-218…P1-224);
- имя ≤100 символов и только одна точка перед `.pdf`.""",
        "test plan pdf",
    )
    forbidden = [
        "Внешний ZIP содержит recovery ZIP той же версии",
        "интерфейс показывает более полную выборку",
        "spoiler/details раскрываются и содержимое печатается",
    ]
    for needle in forbidden:
        if needle in text:
            raise RuntimeError(f"test plan still contains stale wording: {needle}")
    write(rel, text)


def rewrite_readme_index() -> None:
    content = """# Индекс документации WebClip PDF

Рекомендуемый порядок чтения текущего проекта:

1. `RESTORE_PROMPT.md` — восстановление контекста только из свежего GitHub `main`.
2. `AUDIT_REGISTRY.md` — **единый current registry P-кодов, owners и статусов**.
3. `AUDIT_DELTA_INDEX.md` — навигация по полностью консолидированным audit families.
4. `TEST_STATUS.md` — текущая правда о тестах/release gate; historical PASS не является current rerun.
5. `PROJECT_OVERVIEW.md` — назначение проекта и основные инварианты.
6. `USER_REQUIREMENTS.md` — актуальные требования и явно отмеченные superseded правила.
7. `ARCHITECTURE.md` — компоненты, current implemented behavior и явно обозначенные open audit boundaries.
8. `DECISIONS_AND_RATIONALE.md` — архитектурные решения, включая помеченные superseded historical decisions.
9. `DATA_MODELS.md` — IndexedDB/storage/snapshot/receipt models.
10. `TEST_PLAN.md` — regression plan и Git-first recovery gate.
11. `BUILD_AND_RECOVERY_RULES.md` — release/recovery/provenance architecture.
12. `CHANGELOG_AND_RATIONALE.md` — история функциональных изменений.
13. `ASSISTANT_NOTES_AND_LIMITATIONS.md` — технические ограничения.

## Audit evidence

Standalone `AUDIT_DELTA_*.md` больше не являются рабочим слоем current tree. Все ранее существовавшие delta прошли lossless family retirement; исходный Markdown сохранён в family evidence с исходным именем и SHA-256, а полный historical state дополнительно остаётся в Git history.

Основные evidence/history документы:

- `AUDIT_HISTORY_INDEX.md` — corrections, retractions, dedup/product-security decisions;
- `AUDIT_EVIDENCE.md` — historical implementation/browser proof;
- `AUDIT_RETIRED_DELTA_EVIDENCE.md` — ранее свёрнутые correction/positive-control deltas;
- `AUDIT_CROSSCUTTING_REVALIDATION_EVIDENCE.md` — broad revalidation/implementation taxonomy;
- `AUDIT_FAMILY_*_EVIDENCE.md` — consolidated family source proof, schedules, corrections, positive controls and acceptance boundaries;
- `TEST_EVIDENCE.md` — historical test/browser checkpoints.

`AUDIT_DELTA_INDEX.md` — только навигация по consolidated families, не status registry.
`PRIORITIES_P0_P1_P2.md` — compatibility pointer на `AUDIT_REGISTRY.md`.
`GITHUB_WORKFLOW.md` — canonical private remote, automated integrity gate и release provenance rules.
"""
    write("project_docs/README_INDEX.md", content)


def rewrite_root_readme() -> None:
    content = """# WebClip PDF Prototype

Chrome Manifest V3 extension для сохранения выбранного содержимого веб-страницы в PDF с локальным Journal и опциональной интеграцией с Яндекс Диском.

## Текущий runtime

- Manifest V3
- версия `0.9.8`
- минимальный Chrome `118`
- `0.9.9` остаётся WIP и **не является выпущенной версией**

Номер runtime определяется `manifest.json`. Audit/docs progress сам по себе не меняет version/build/tag/Release.

## Основные возможности

- выбор нескольких областей «Включены» и «Исключены»;
- same-origin iframe и permission-gated cross-origin frame architecture;
- печатный PDF через `chrome.debugger` / `Page.printToPDF`;
- локальное скачивание и native Save As flows;
- локальный Journal в IndexedDB с URL/site/all views, экспортом/импортом и шаблонами selection snapshot;
- опциональная загрузка PDF и резервных копий Journal на Яндекс Диск;
- OperationLog/receipts и recovery/reconciliation механизмы для асинхронных операций.

Часть архитектурных границ остаётся открытым audit backlog. `AUDIT_REGISTRY.md`, а не этот README, является authority по их статусам.

## Установка для разработки/QA

1. Получить exact нужный Git commit.
2. Открыть `chrome://extensions`.
3. Включить **Режим разработчика**.
4. Нажать **Загрузить распакованное расширение**.
5. Выбрать каталог checkout с `manifest.json`.

Release QA отдельно требует реальное unpacked MV3 поведение Chrome и реальные Yandex OAuth/API сценарии; deterministic CI не заменяет эти проверки.

## Проверки репозитория

GitHub Actions workflow `Repository integrity` запускает:

- `project_tools/check_repository_consistency.py`;
- `node --check` для tracked JavaScript;
- все `project_tools/test_*.js`;
- `project_tools/test_recovery_archive.py`.

Workflow имеет read-only доступ к repository contents. Build/tag/GitHub Release создаются только после применимого QA gate и явного release decision.

## Документация и аудит

Начинать с `project_docs/README_INDEX.md`.

Ключевые документы:

- `project_docs/AUDIT_REGISTRY.md` — единый current P-code/status/owner registry;
- `project_docs/AUDIT_DELTA_INDEX.md` — навигация по consolidated audit families;
- `project_docs/AUDIT_FAMILY_*_EVIDENCE.md` — подробные family evidence;
- `project_docs/ARCHITECTURE.md` — архитектура;
- `project_docs/USER_REQUIREMENTS.md` — требования;
- `project_docs/TEST_STATUS.md` — current test/release truth;
- `project_docs/TEST_PLAN.md` — regression plan;
- `project_docs/BUILD_AND_RECOVERY_RULES.md` — Git-first recovery/release provenance;
- `project_docs/RESTORE_PROMPT.md` — восстановление проектного контекста из свежего `main`.

Исторические closure/static-check/delta документы не дублируются в working tree после lossless consolidation: их доказательства сохранены в evidence-файлах, а точные предыдущие состояния — в Git history.

## Source-of-truth policy

`lukindv77/webclip-pdf` / `main` — canonical working source. Перед анализом или записью нужно fresh-fetch `main`. Exact commit SHA идентифицирует WIP snapshot; release source должен быть привязан к exact tested commit и annotated release tag.
"""
    write("README.md", content)


def final_validation() -> None:
    checks = {
        "project_docs/AUDIT_REGISTRY.md": ["single current authority", "AUDIT_FAMILY"],
        "project_docs/ARCHITECTURE.md": ["P1-203", "compare-before-restore", "P1-206"],
        "project_docs/DECISIONS_AND_RATIONALE.md": ["P1-184", "Git-first", "P0-067"],
        "project_docs/USER_REQUIREMENTS.md": ["Git-first", "P0-019", "synthetic-click"],
        "project_docs/TEST_PLAN.md": ["test_recovery_archive.py", "P1-206", "P1-218"],
        "README.md": ["Manifest V3", "AUDIT_REGISTRY.md", "0.9.8"],
    }
    for rel, needles in checks.items():
        text = read(rel)
        for needle in needles:
            if needle not in text:
                raise RuntimeError(f"{rel}: expected normalized marker missing: {needle}")

    if (DOCS / "DOCUMENTATION_CONSISTENCY_AUDIT.md").exists():
        (DOCS / "DOCUMENTATION_CONSISTENCY_AUDIT.md").unlink()
    stale_consolidator = ROOT / "project_tools" / "consolidate_audit_families.py"
    if stale_consolidator.exists():
        stale_consolidator.unlink()

    # This script is intentionally one-shot; remove it from the normalized tree.
    pathlib.Path(__file__).unlink()


def main() -> int:
    try:
        normalize_registry()
        normalize_architecture()
        normalize_decisions()
        normalize_requirements()
        normalize_test_plan()
        rewrite_readme_index()
        rewrite_root_readme()
        final_validation()
    except Exception as exc:
        print(f"Documentation normalization FAILED: {exc}", file=sys.stderr)
        return 2
    print("Documentation normalization PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
