# Индекс документации WebClip PDF

Рекомендуемый порядок чтения текущего проекта:

1. `RESTORE_PROMPT.md` — правила восстановления контекста из свежего GitHub `main`.
2. `AUDIT_REGISTRY.md` — **единый current registry P-кодов, owners и статусов**.
3. `AUDIT_DELTA_INDEX.md` — карта root-cause семейств к оставшимся detailed audit deltas.
4. `TEST_STATUS.md` — текущая правда о тестах/release gate; historical PASS не является current rerun.
5. `PROJECT_OVERVIEW.md` — что это за проект и его инварианты.
6. `USER_REQUIREMENTS.md` — требования пользователя.
7. `ARCHITECTURE.md` — компоненты и потоки.
8. `DECISIONS_AND_RATIONALE.md` — почему архитектура именно такая.
9. `DATA_MODELS.md` — IndexedDB/storage/snapshot/receipt models.
10. `TEST_PLAN.md` — регрессионные проверки.
11. `BUILD_AND_RECOVERY_RULES.md` — Git-first release/recovery architecture.
12. `CHANGELOG_AND_RATIONALE.md` — история функциональных изменений.
13. `ASSISTANT_NOTES_AND_LIMITATIONS.md` — технические ограничения.

Дополнительные evidence/history документы:

- `AUDIT_HISTORY_INDEX.md` — retractions/dedup/product-security decisions;
- `AUDIT_EVIDENCE.md` — historical implementation/browser proof;
- `AUDIT_RETIRED_DELTA_EVIDENCE.md` — losslessly retired audit-delta proof;
- `AUDIT_CROSSCUTTING_REVALIDATION_EVIDENCE.md` — broad revalidation/implementation taxonomy;
- `TEST_EVIDENCE.md` — historical test/browser checkpoints;
- remaining `AUDIT_DELTA_*.md` — detailed source proof/acceptance, пока конкретная family не прошла lossless retirement.

`PRIORITIES_P0_P1_P2.md` оставлен только как compatibility pointer на `AUDIT_REGISTRY.md`; он не является вторым реестром.

`GITHUB_WORKFLOW.md` — canonical private remote и правила синхронизации GitHub/handoff/release artifacts.
