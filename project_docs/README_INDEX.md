# Индекс документации WebClip PDF

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
