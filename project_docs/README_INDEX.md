# Индекс документации WebClip PDF

Рекомендуемый порядок чтения текущего проекта:

1. `RESTORE_PROMPT.md` — восстановление контекста только из свежего GitHub `main`.
2. `AUDIT_REGISTRY.md` — **единый current registry P-кодов, owners и статусов**.
3. `AUDIT_DELTA_INDEX.md` — навигация по полностью консолидированным audit families.
4. `TEST_STATUS.md` — текущая правда о тестах/release gate; historical PASS не является current rerun.
5. `DOCUMENTATION_CONSISTENCY_AUDIT.md` — current-authority overrides для stale sections больших исторических документов.
6. `PROJECT_OVERVIEW.md` — назначение проекта и основные инварианты.
7. `USER_REQUIREMENTS.md` — требования; superseded wording читать с consistency override.
8. `ARCHITECTURE.md` — компоненты и потоки; open-owner guarantees не выводить из stale historical paragraphs.
9. `DECISIONS_AND_RATIONALE.md` — решения и причины; superseded decisions не являются current authority.
10. `DATA_MODELS.md` — IndexedDB/storage/snapshot/receipt models.
11. `TEST_PLAN.md` — regression plan; recovery gate определяется Git-first policy и recovery self-test.
12. `BUILD_AND_RECOVERY_RULES.md` — Git-first release/recovery/provenance architecture.
13. `CHANGELOG_AND_RATIONALE.md` — история функциональных изменений.
14. `ASSISTANT_NOTES_AND_LIMITATIONS.md` — технические ограничения.

## Audit evidence

Standalone `AUDIT_DELTA_*.md` больше не являются рабочим слоем current tree. Все ранее существовавшие delta прошли lossless family retirement; их исходный Markdown сохранён в family evidence с исходным именем и SHA-256, а полный historical state дополнительно остаётся в Git history.

Основные evidence/history документы:

- `AUDIT_HISTORY_INDEX.md` — corrections, retractions, dedup/product-security decisions;
- `AUDIT_EVIDENCE.md` — historical implementation/browser proof;
- `AUDIT_RETIRED_DELTA_EVIDENCE.md` — ранее свёрнутые correction/positive-control deltas;
- `AUDIT_CROSSCUTTING_REVALIDATION_EVIDENCE.md` — broad revalidation/implementation taxonomy;
- `AUDIT_FAMILY_BACKUP_RECOVERY_GENERATION_EVIDENCE.md`;
- `AUDIT_FAMILY_YANDEX_AUTH_CONFIG_EVIDENCE.md`;
- `AUDIT_FAMILY_YANDEX_REMOTE_IDENTITY_EVIDENCE.md`;
- `AUDIT_FAMILY_BACKUP_RESTORE_EVIDENCE.md`;
- `AUDIT_FAMILY_JOURNAL_IMPORT_PROVENANCE_EVIDENCE.md`;
- `AUDIT_FAMILY_JOURNAL_VIEW_AUTHORITY_EVIDENCE.md`;
- `AUDIT_FAMILY_JOURNAL_COMMENTS_EVIDENCE.md`;
- `AUDIT_FAMILY_OPERATION_RECEIPTS_EVIDENCE.md`;
- `AUDIT_FAMILY_LOCAL_DOWNLOAD_SAVEAS_EVIDENCE.md`;
- `AUDIT_FAMILY_CHROME_MV3_SETTLEMENT_EVIDENCE.md`;
- `AUDIT_FAMILY_FRAME_PERMISSION_IDENTITY_EVIDENCE.md`;
- `AUDIT_FAMILY_PDF_PRINT_OFFSCREEN_EVIDENCE.md`;
- `AUDIT_FAMILY_PRIVACY_TRUST_EVIDENCE.md`;
- `AUDIT_FAMILY_URLSTATS_EVIDENCE.md`;
- `TEST_EVIDENCE.md` — historical test/browser checkpoints.

`AUDIT_DELTA_INDEX.md` является навигационной таблицей по этим семействам, а не вторым status registry.

`PRIORITIES_P0_P1_P2.md` оставлен только как compatibility pointer на `AUDIT_REGISTRY.md`.

`GITHUB_WORKFLOW.md` описывает canonical private remote, automated integrity gate и release provenance rules.
